import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { findActiveSession, touchSession } from "../lib/sessions";
import {
  findActiveApiToken,
  looksLikeApiToken,
  parseScopes,
  touchApiToken,
  type ApiScope,
} from "../lib/api-tokens";
import { isUserRole, normalizeRole, type UserRole } from "../lib/permissions";
import { logger } from "../lib/logger";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = "cdctf-api";
const JWT_AUDIENCE = "cdctf-web";
// A distinct audience for the half-authenticated token handed out between a
// correct password and a correct 2FA code. Session verification demands
// `cdctf-web`, so an MFA token can never be presented as a session.
const MFA_JWT_AUDIENCE = "cdctf-mfa";
const MFA_TOKEN_TTL_SECONDS = 5 * 60;
export const AUTH_COOKIE_NAME = "cdctf_session";
const DEFAULT_SESSION_DAYS = 30;

function resolveSessionMaxAgeMs() {
  const raw = process.env.AUTH_SESSION_MAX_AGE_DAYS;
  if (!raw) return DEFAULT_SESSION_DAYS * 24 * 60 * 60 * 1000;

  const days = Number(raw);
  if (!Number.isFinite(days) || days <= 0) return DEFAULT_SESSION_DAYS * 24 * 60 * 60 * 1000;
  return Math.floor(days * 24 * 60 * 60 * 1000);
}

export const AUTH_SESSION_MAX_AGE_MS = resolveSessionMaxAgeMs();

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production.");
  }
  logger.warn("JWT_SECRET not set, using development-only fallback.");
} else if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

const effectiveJwtSecret = JWT_SECRET || "cdctf_dev_secret_change_me";

export type { UserRole };
export { normalizeRole };

/** A real interactive login: cookie or session JWT, backed by `user_sessions`. */
export interface SessionAuth {
  tokenType: "session";
  userId: number;
  role: UserRole;
  /** `jti` of the backing row in `user_sessions`. */
  tokenId: string;
  sessionId: number;
}

/** A personal access token. Always user-level, whatever the account's role. */
export interface ApiTokenAuth {
  tokenType: "api";
  userId: number;
  role: UserRole;
  apiTokenId: number;
  scopes: ApiScope[];
}

// A union rather than optional fields on purpose: a route that needs a real
// session cannot reach for `tokenId` without first proving it has one.
export type AuthPayload = SessionAuth | ApiTokenAuth;

interface TokenClaims {
  userId: number;
  role: string;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

function verifyClaims(token: string): TokenClaims | null {
  try {
    const payload = jwt.verify(token, effectiveJwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as Partial<TokenClaims>;

    if (!Number.isInteger(payload.userId)) return null;
    if (!isUserRole(payload.role)) return null;
    if (typeof payload.jti !== "string" || !payload.jti) return null;

    return payload as TokenClaims;
  } catch {
    return null;
  }
}

/**
 * Resolves a token to a live session AND a live user row.
 *
 * The role and blocked flag are read from the database on every request rather
 * than trusted from the token, so blocking a user or demoting an admin takes
 * effect immediately instead of when their 30-day token happens to expire.
 */
async function resolveSession(token: string): Promise<SessionAuth | null> {
  const claims = verifyClaims(token);
  if (!claims) return null;

  const session = await findActiveSession(claims.jti);
  if (!session || session.userId !== claims.userId) return null;

  const user = await loadLiveUser(session.userId);
  if (!user) return null;

  await touchSession(session);

  return {
    tokenType: "session",
    userId: user.id,
    role: normalizeRole(user.role),
    tokenId: session.tokenId,
    sessionId: session.id,
  };
}

async function resolveApiToken(token: string): Promise<ApiTokenAuth | null> {
  const row = await findActiveApiToken(token);
  if (!row) return null;

  const user = await loadLiveUser(row.userId);
  if (!user) return null;

  await touchApiToken(row);

  return {
    tokenType: "api",
    userId: user.id,
    role: normalizeRole(user.role),
    apiTokenId: row.id,
    scopes: parseScopes(row.scopes),
  };
}

/** The role and blocked flag always come from the database, never the token. */
async function loadLiveUser(userId: number) {
  const [user] = await db.select({
    id: usersTable.id,
    role: usersTable.role,
    isBlocked: usersTable.isBlocked,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  return user && !user.isBlocked ? user : null;
}

async function resolveAuth(token: string): Promise<AuthPayload | null> {
  return looksLikeApiToken(token) ? resolveApiToken(token) : resolveSession(token);
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const auth = await resolveAuth(token);
  if (!auth) return res.status(401).json({ error: "Invalid token" });

  req.user = auth;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (token) {
    const auth = await resolveAuth(token);
    if (auth) req.user = auth;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.tokenType !== "session") return res.status(403).json({ error: "This endpoint requires an interactive session" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

/**
 * Gate for anything an API token must never do: change credentials, manage 2FA,
 * or manage sessions. A leaked token should not be able to take over the account
 * it came from.
 */
export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.tokenType !== "session") {
    return res.status(403).json({ error: "This endpoint requires an interactive session" });
  }
  next();
}

/** Narrows to a session, for routes already behind `requireSession`. */
export function sessionOf(req: Request): SessionAuth {
  if (req.user?.tokenType !== "session") {
    // Unreachable behind requireSession; throwing beats returning a wrong shape.
    throw new Error("sessionOf called on a request without a session");
  }
  return req.user;
}

/**
 * Narrows API tokens only.
 *
 * It deliberately does not authenticate: whether the route is public, optional,
 * or session-gated is decided by the `optionalAuth`/`authenticateToken` in front
 * of it. Rejecting anonymous callers here would silently close every public
 * route this is attached to.
 */
export function requireScope(scope: ApiScope) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.tokenType !== "api") return next();
    if (!req.user.scopes.includes(scope)) {
      return res.status(403).json({ error: `Token is missing the '${scope}' scope` });
    }
    next();
  };
}

export function generateToken(userId: number, role: string, tokenId: string): string {
  return jwt.sign({ userId, role: normalizeRole(role) }, effectiveJwtSecret, {
    algorithm: "HS256",
    audience: JWT_AUDIENCE,
    expiresIn: Math.floor(AUTH_SESSION_MAX_AGE_MS / 1000),
    issuer: JWT_ISSUER,
    jwtid: tokenId,
  });
}

/**
 * Proves only that the password step succeeded. Carries no role and cannot
 * authenticate a request — it is exchanged for a session by POST /auth/2fa/verify.
 */
export function generateMfaToken(userId: number): string {
  return jwt.sign({ userId }, effectiveJwtSecret, {
    algorithm: "HS256",
    audience: MFA_JWT_AUDIENCE,
    expiresIn: MFA_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
  });
}

export function verifyMfaToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, effectiveJwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: MFA_JWT_AUDIENCE,
    }) as { userId?: unknown };
    return Number.isInteger(payload.userId) ? (payload.userId as number) : null;
  } catch {
    return null;
  }
}

const OAUTH_STATE_AUDIENCE = "cdctf-oauth-state";

export type OAuthStateClaims = {
  nonce: string;
  mode: "login" | "link";
  /** Present only for `link`: the account the identity will be attached to. */
  userId?: number;
};

/**
 * Signs the OAuth `state`. Stored in a cookie and compared against the `state`
 * the provider echoes back, which binds the callback to the browser that
 * started the flow — without it, an attacker can hand a victim a callback URL
 * and get their own provider identity linked to the victim's account.
 */
export function generateOAuthState(claims: OAuthStateClaims, ttlSeconds: number): string {
  return jwt.sign(claims, effectiveJwtSecret, {
    algorithm: "HS256",
    audience: OAUTH_STATE_AUDIENCE,
    expiresIn: ttlSeconds,
    issuer: JWT_ISSUER,
  });
}

export function verifyOAuthState(token: string): OAuthStateClaims | null {
  try {
    const payload = jwt.verify(token, effectiveJwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: OAUTH_STATE_AUDIENCE,
    }) as Partial<OAuthStateClaims>;

    if (typeof payload.nonce !== "string" || !payload.nonce) return null;
    if (payload.mode !== "login" && payload.mode !== "link") return null;
    if (payload.mode === "link" && !Number.isInteger(payload.userId)) return null;
    return payload as OAuthStateClaims;
  } catch {
    return null;
  }
}

const WEBAUTHN_CHALLENGE_AUDIENCE = "cdctf-webauthn";

export type WebAuthnChallengeClaims = {
  challenge: string;
  mode: "register" | "authenticate";
  /** Present only for `register`: the account the credential will belong to. */
  userId?: number;
};

/**
 * Signs a WebAuthn challenge into a cookie rather than storing it server-side.
 * The challenge is what makes the authenticator's signature meaningful — accept
 * one we did not issue, or reuse one, and the signature proves nothing.
 */
export function generateWebAuthnChallengeToken(claims: WebAuthnChallengeClaims, ttlSeconds: number): string {
  return jwt.sign(claims, effectiveJwtSecret, {
    algorithm: "HS256",
    audience: WEBAUTHN_CHALLENGE_AUDIENCE,
    expiresIn: ttlSeconds,
    issuer: JWT_ISSUER,
  });
}

export function verifyWebAuthnChallengeToken(token: string): WebAuthnChallengeClaims | null {
  try {
    const payload = jwt.verify(token, effectiveJwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: WEBAUTHN_CHALLENGE_AUDIENCE,
    }) as Partial<WebAuthnChallengeClaims>;

    if (typeof payload.challenge !== "string" || !payload.challenge) return null;
    if (payload.mode !== "register" && payload.mode !== "authenticate") return null;
    if (payload.mode === "register" && !Number.isInteger(payload.userId)) return null;
    return payload as WebAuthnChallengeClaims;
  } catch {
    return null;
  }
}

function getRequestToken(req: Request) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken ? cookieToken : null;
}
