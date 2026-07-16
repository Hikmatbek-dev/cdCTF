import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { findActiveSession, touchSession } from "../lib/sessions";
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

export interface AuthPayload {
  userId: number;
  role: UserRole;
  /** `jti` of the backing row in `user_sessions`. */
  tokenId: string;
  sessionId: number;
}

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
async function resolveSession(token: string): Promise<AuthPayload | null> {
  const claims = verifyClaims(token);
  if (!claims) return null;

  const session = await findActiveSession(claims.jti);
  if (!session || session.userId !== claims.userId) return null;

  const [user] = await db.select({
    id: usersTable.id,
    role: usersTable.role,
    isBlocked: usersTable.isBlocked,
  }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

  if (!user || user.isBlocked) return null;

  await touchSession(session);

  return {
    userId: user.id,
    role: normalizeRole(user.role),
    tokenId: session.tokenId,
    sessionId: session.id,
  };
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const auth = await resolveSession(token);
  if (!auth) return res.status(401).json({ error: "Invalid token" });

  req.user = auth;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (token) {
    const auth = await resolveSession(token);
    if (auth) req.user = auth;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
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

function getRequestToken(req: Request) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken ? cookieToken : null;
}
