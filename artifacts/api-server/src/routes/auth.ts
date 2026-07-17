import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { usersTable, userBackupCodesTable, apiTokensTable, oauthAccountsTable, passkeysTable } from "@workspace/db/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_MS,
  generateToken,
  generateMfaToken,
  verifyMfaToken,
  authenticateToken,
  optionalAuth,
  requireSession,
  requireScope,
  sessionOf,
  normalizeRole,
  generateOAuthState,
  verifyOAuthState,
  generateWebAuthnChallengeToken,
  verifyWebAuthnChallengeToken,
} from "../middleware/auth";
import { createRateLimiter } from "../middleware/security";
import { validateBody } from "../middleware/validate";
// Generated from the OpenAPI spec, so a rule cannot be stated in two places and
// disagree — which is exactly what happened: the spec allowed a 6-character
// password while this file demanded 10 and four character classes.
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import type { z } from "zod";
import { sendVerificationEmail, verifyTurnstileToken, sendPasswordResetEmail } from "../lib/integrations";
import { writeAuditLog } from "../lib/audit";
import {
  createSession,
  listLoginHistory,
  listSessions,
  parseDeviceLabel,
  recordLoginAttempt,
  revokeAllSessions,
  revokeSessionById,
  revokeSessionByTokenId,
  suspiciousLoginReasons,
  type LoginFailureReason,
} from "../lib/sessions";
import {
  backupCodeMatches,
  createTotpSecret,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  hashBackupCode,
  totpUri,
  verifyTotp,
} from "../lib/mfa";
import {
  API_SCOPES,
  TOKEN_PREFIX,
  generateApiToken,
  isApiScope,
  listApiTokens,
  parseScopes,
  revokeApiToken,
  type ApiScope,
} from "../lib/api-tokens";
import { permissionsForRole } from "../lib/permissions";
import { logger } from "../lib/logger";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
  authorizeUrl,
  configuredProviders,
  exchangeCodeForToken,
  fetchProfile,
  generateStateNonce,
  isOAuthProvider,
  isProviderConfigured,
  suggestNickname,
} from "../lib/oauth";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {
  RP_NAME,
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_TTL_SECONDS,
  defaultPasskeyName,
  deletePasskey,
  expectedOrigin,
  findPasskeyByCredentialId,
  listPasskeys,
  parseTransports,
  recordPasskeyUse,
  rpID,
} from "../lib/passkeys";

const router = Router();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "auth" });
// The login 2FA step is the brute-force target: unauthenticated, and a 6-digit
// space with a ~90s window. It gets a tight budget of its own.
const mfaVerifyRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "mfa_verify" });
// Enrolment and management already require a live session, so they only need to
// stop an authenticated attacker grinding codes — not share the verify budget.
const mfaManageRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "mfa_manage" });
const emailDeliveryRequired = process.env.EMAIL_VERIFICATION_REQUIRED === "true";

function authCookieOptions() {
  const sameSite: "none" | "lax" = process.env.AUTH_COOKIE_SAME_SITE === "none" ? "none" : "lax";
  const secure = process.env.NODE_ENV === "production" || sameSite === "none";
  return {
    httpOnly: true,
    sameSite,
    secure,
    maxAge: AUTH_SESSION_MAX_AGE_MS,
    path: "/",
  };
}

function authCookieClearOptions() {
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  return options;
}

function normalizeNickname(nickname: string) {
  return nickname.trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isStrongPassword(password: string) {
  return password.length >= 10
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}



type PublicUser = {
  id: number; nickname: string; email: string; avatarUrl: string | null;
  points: number; role: string; emailVerified: boolean; isBlocked: boolean; createdAt: Date;
};

/** The only shape of a user that may leave the server. */
function publicUser(user: typeof usersTable.$inferSelect): PublicUser {
  return {
    id: user.id, nickname: user.nickname, email: user.email, avatarUrl: user.avatarUrl,
    points: user.points, role: user.role, emailVerified: user.emailVerified,
    isBlocked: user.isBlocked, createdAt: user.createdAt,
  };
}

type LoginContext = {
  identifier: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string;
};

/** Final step of every successful login, whether or not 2FA was involved. */
async function issueSession(res: Response, user: typeof usersTable.$inferSelect, ctx: LoginContext) {
  // Must run before this login is recorded, otherwise the new IP/device it is
  // checking for would already be in the history and never look new.
  const suspicious = await suspiciousLoginReasons({ userId: user.id, ipAddress: ctx.ipAddress, deviceLabel: ctx.deviceLabel });

  const tokenId = randomUUID();
  await createSession({
    userId: user.id,
    tokenId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    deviceLabel: ctx.deviceLabel,
    expiresAt: new Date(Date.now() + AUTH_SESSION_MAX_AGE_MS),
  });
  const token = generateToken(user.id, user.role, tokenId);

  await recordLoginAttempt({
    userId: user.id, identifier: ctx.identifier, ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent, deviceLabel: ctx.deviceLabel,
    success: true, suspiciousReasons: suspicious,
  });

  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  return res.json({
    token,
    user: publicUser(user),
    suspiciousLogin: suspicious.length > 0 ? { reasons: suspicious } : null,
  });
}



router.post("/register", authRateLimit, validateBody(RegisterBody), async (req, res) => {
  const body = req.body as z.infer<typeof RegisterBody>;
  const bypassLocalCaptcha = process.env.TURNSTILE_BYPASS_LOCALHOST === "true"
    && (req.ip === "::1" || req.ip === "127.0.0.1" || req.ip?.startsWith("::ffff:127.0.0.1"));
  const enforceTurnstile = process.env.TURNSTILE_ENFORCE === "true";

  if (enforceTurnstile && !bypassLocalCaptcha && (typeof body.captchaToken !== "string" || !body.captchaToken.trim())) {
    return res.status(400).json({ error: "Captcha is required" });
  }
  if (!bypassLocalCaptcha && typeof body.captchaToken === "string" && body.captchaToken.trim()) {
    const captchaResult = await verifyTurnstileToken(body.captchaToken!, req.ip);
    if (enforceTurnstile && !captchaResult.ok) return res.status(400).json({ error: "Captcha verification failed" });
  }

  const nickname = normalizeNickname(body.nickname);
  const email = normalizeEmail(body.email);
  const password = body.password;
  const existing = await db.select().from(usersTable).where(eq(usersTable.nickname, nickname)).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Nickname already taken" });

  const emailExists = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (emailExists.length > 0) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = randomUUID();
  const role = "user";

  const [user] = await db.insert(usersTable).values({ nickname, email, passwordHash, role, emailVerificationToken }).returning();
  const emailResult = await sendVerificationEmail(user.email, emailVerificationToken);
  if (!emailResult.ok) {
    if (emailDeliveryRequired) {
      await db.delete(usersTable).where(eq(usersTable.id, user.id));
      return res.status(503).json({ error: emailResult.reason || "Verification email could not be sent" });
    }
    await db.update(usersTable)
      .set({ emailVerified: true, emailVerificationToken: null })
      .where(eq(usersTable.id, user.id));
  }

  res.status(201).json({
    user: {
      id: user.id, nickname: user.nickname, email: user.email, avatarUrl: user.avatarUrl,
      points: user.points, role: user.role, emailVerified: emailResult.ok ? user.emailVerified : true,
      isBlocked: user.isBlocked, createdAt: user.createdAt,
    },
    requiresEmailVerification: emailResult.ok,
  });
});

router.post("/login", authRateLimit, validateBody(LoginBody), async (req, res) => {
  const body = req.body as z.infer<typeof LoginBody>;
  const identifier = normalizeNickname(body.nickname);
  const email = normalizeEmail(identifier);
  const password = body.password;

  const ipAddress = req.ip ?? null;
  const userAgent = req.headers["user-agent"] ?? null;
  const deviceLabel = parseDeviceLabel(userAgent ?? undefined);

  async function rejectLogin(userId: number | null, failureReason: LoginFailureReason, status: number, message: string) {
    await recordLoginAttempt({ userId, identifier, ipAddress, userAgent, deviceLabel, success: false, failureReason });
    return res.status(status).json({ error: message });
  }

  const [user] = await db.select().from(usersTable).where(
    or(
      eq(usersTable.nickname, identifier),
      eq(usersTable.email, email),
    ),
  ).limit(1);
  if (!user) return rejectLogin(null, "unknown_user", 401, "Invalid credentials");
  if (user.isBlocked) return rejectLogin(user.id, "blocked", 403, "Account blocked");
  if (!user.emailVerified && user.role !== "admin") return rejectLogin(user.id, "email_unverified", 403, "Email not verified");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return rejectLogin(user.id, "bad_password", 401, "Invalid credentials");

  // Password is right but not sufficient. Nothing is recorded in login_history
  // yet — the attempt resolves at /2fa/verify, one way or the other.
  if (user.totpEnabled) {
    return res.json({ requires2fa: true, mfaToken: generateMfaToken(user.id) });
  }

  return issueSession(res, user, { identifier, ipAddress, userAgent, deviceLabel });
});

// --- Passkeys (WebAuthn) ---------------------------------------------------

function challengeCookieOptions() {
  const { maxAge: _maxAge, ...base } = authCookieOptions();
  return { ...base, maxAge: WEBAUTHN_CHALLENGE_TTL_SECONDS * 1000 };
}

function takeChallenge(req: Request, res: Response, mode: "register" | "authenticate") {
  const cookie = req.cookies?.[WEBAUTHN_CHALLENGE_COOKIE];
  // One challenge, one attempt: clear it whether or not it turns out valid.
  res.clearCookie(WEBAUTHN_CHALLENGE_COOKIE, { ...challengeCookieOptions(), maxAge: undefined });
  if (typeof cookie !== "string") return null;
  const claims = verifyWebAuthnChallengeToken(cookie);
  return claims && claims.mode === mode ? claims : null;
}

// POST /api/auth/passkeys/register/options
router.post("/passkeys/register/options", authenticateToken, requireSession, mfaManageRateLimit, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const existing = await listPasskeys(user.id);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userName: user.nickname,
    userDisplayName: user.nickname,
    attestationType: "none",
    // Stops the same authenticator being enrolled twice under two entries.
    excludeCredentials: existing.map(passkey => ({
      id: passkey.credentialId,
      transports: parseTransports(passkey.transports),
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });

  res.cookie(
    WEBAUTHN_CHALLENGE_COOKIE,
    generateWebAuthnChallengeToken({ challenge: options.challenge, mode: "register", userId: user.id }, WEBAUTHN_CHALLENGE_TTL_SECONDS),
    challengeCookieOptions(),
  );
  res.json(options);
});

// POST /api/auth/passkeys/register/verify
router.post("/passkeys/register/verify", authenticateToken, requireSession, mfaManageRateLimit, async (req, res) => {
  const claims = takeChallenge(req, res, "register");
  if (!claims) return res.status(400).json({ error: "Challenge expired. Start again." });
  // The challenge is bound to the account that asked for it.
  if (claims.userId !== req.user!.userId) return res.status(400).json({ error: "Challenge does not belong to this session" });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: claims.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
    });
  } catch (err) {
    logger.warn({ err }, "Passkey registration verification failed");
    return res.status(400).json({ error: "Could not verify this passkey" });
  }

  if (!verification.verified) return res.status(400).json({ error: "Could not verify this passkey" });

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const name = typeof req.body?.name === "string" && req.body.name.trim()
    ? req.body.name.trim().slice(0, 64)
    : defaultPasskeyName(credentialDeviceType, req.headers["user-agent"]);

  try {
    await db.insert(passkeysTable).values({
      userId: req.user!.userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports?.join(",") ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name,
    });
  } catch {
    // The unique index on credentialId — this authenticator is already enrolled.
    return res.status(409).json({ error: "This passkey is already registered" });
  }

  await writeAuditLog(req, "passkey.register", "user", req.user!.userId, { name });
  res.status(201).json({ success: true, name });
});

// POST /api/auth/passkeys/login/options — usernameless: the authenticator tells
// us which credential it holds, so no identifier is asked for up front.
router.post("/passkeys/login/options", authRateLimit, async (_req, res) => {
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
  });

  res.cookie(
    WEBAUTHN_CHALLENGE_COOKIE,
    generateWebAuthnChallengeToken({ challenge: options.challenge, mode: "authenticate" }, WEBAUTHN_CHALLENGE_TTL_SECONDS),
    challengeCookieOptions(),
  );
  res.json(options);
});

// POST /api/auth/passkeys/login/verify
router.post("/passkeys/login/verify", authRateLimit, async (req, res) => {
  const claims = takeChallenge(req, res, "authenticate");
  if (!claims) return res.status(400).json({ error: "Challenge expired. Start again." });

  const credentialId = typeof req.body?.id === "string" ? req.body.id : null;
  if (!credentialId) return res.status(400).json({ error: "Invalid passkey response" });

  const passkey = await findPasskeyByCredentialId(credentialId);
  if (!passkey) return res.status(401).json({ error: "Unknown passkey" });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: claims.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: passkey.counter,
        transports: parseTransports(passkey.transports),
      },
      requireUserVerification: false,
    });
  } catch (err) {
    logger.warn({ err }, "Passkey authentication verification failed");
    return res.status(401).json({ error: "Could not verify this passkey" });
  }

  if (!verification.verified) return res.status(401).json({ error: "Could not verify this passkey" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, passkey.userId)).limit(1);
  if (!user) return res.status(401).json({ error: "Unknown passkey" });
  if (user.isBlocked) return res.status(403).json({ error: "Account blocked" });

  await recordPasskeyUse(passkey.id, verification.authenticationInfo.newCounter);

  const ipAddress = req.ip ?? null;
  const userAgent = req.headers["user-agent"] ?? null;
  const ctx = { identifier: user.nickname, ipAddress, userAgent, deviceLabel: parseDeviceLabel(userAgent ?? undefined) };

  // A passkey is already two factors — something you have, plus the device's own
  // user verification. It does not, however, override a TOTP the owner enabled
  // here, so the same rule as OAuth applies.
  if (user.totpEnabled) return res.json({ requires2fa: true, mfaToken: generateMfaToken(user.id) });

  return issueSession(res, user, ctx);
});

// GET /api/auth/passkeys
router.get("/passkeys", authenticateToken, requireSession, async (req, res) => {
  const passkeys = await listPasskeys(req.user!.userId);
  res.json({
    passkeys: passkeys.map(passkey => ({
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp,
      lastUsedAt: passkey.lastUsedAt,
      createdAt: passkey.createdAt,
    })),
  });
});

// DELETE /api/auth/passkeys/:id
router.delete("/passkeys/:id", authenticateToken, requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid passkey id" });

  if (!await deletePasskey(id, req.user!.userId)) return res.status(404).json({ error: "Passkey not found" });

  await writeAuditLog(req, "passkey.delete", "user", req.user!.userId, { passkeyId: id });
  res.json({ success: true });
});

// --- OAuth -----------------------------------------------------------------

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

function oauthStateCookieOptions() {
  const { maxAge: _maxAge, ...base } = authCookieOptions();
  return { ...base, maxAge: OAUTH_STATE_TTL_SECONDS * 1000 };
}

/** Sends the browser back to the app with a code the UI can turn into a message. */
function oauthFailure(res: Response, reason: string) {
  return res.redirect(`${appBaseUrl()}/login?oauth_error=${encodeURIComponent(reason)}`);
}

/** Finds a free nickname near the provider's display name. */
async function allocateNickname(base: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 27)}_${attempt}`;
    const [taken] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.nickname, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `user_${randomUUID().slice(0, 12)}`;
}

// GET /api/auth/oauth/providers — which buttons the login page should show.
router.get("/oauth/providers", (_req, res) => {
  res.json({ providers: configuredProviders() });
});

// GET /api/auth/oauth/accounts — the caller's linked identities.
router.get("/oauth/accounts", authenticateToken, requireSession, async (req, res) => {
  const accounts = await db.select().from(oauthAccountsTable)
    .where(eq(oauthAccountsTable.userId, req.user!.userId));
  res.json({
    accounts: accounts.map(account => ({
      provider: account.provider,
      providerEmail: account.providerEmail,
      createdAt: account.createdAt,
    })),
  });
});

// GET /api/auth/oauth/:provider — start a sign-in, or a link when already signed in.
router.get("/oauth/:provider", optionalAuth, authRateLimit, (req, res) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider)) return oauthFailure(res, "unknown_provider");
  if (!isProviderConfigured(provider)) return oauthFailure(res, "provider_not_configured");

  const linking = req.query.mode === "link";
  if (linking && req.user?.tokenType !== "session") return oauthFailure(res, "sign_in_first");

  const nonce = generateStateNonce();
  const state = generateOAuthState(
    linking ? { nonce, mode: "link", userId: req.user!.userId } : { nonce, mode: "login" },
    OAUTH_STATE_TTL_SECONDS,
  );

  res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  res.redirect(authorizeUrl(provider, nonce));
});

// GET /api/auth/oauth/:provider/callback
router.get("/oauth/:provider/callback", authRateLimit, async (req, res) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider)) return oauthFailure(res, "unknown_provider");
  if (!isProviderConfigured(provider)) return oauthFailure(res, "provider_not_configured");

  // The provider reports a user who declined, or a misconfiguration, here.
  if (typeof req.query.error === "string") return oauthFailure(res, req.query.error);

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const returnedState = typeof req.query.state === "string" ? req.query.state : null;
  if (!code || !returnedState) return oauthFailure(res, "missing_code");

  const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { ...oauthStateCookieOptions(), maxAge: undefined });

  const claims = typeof stateCookie === "string" ? verifyOAuthState(stateCookie) : null;
  // Both halves must agree: the signed cookie proves we issued it, and the
  // nonce match proves this callback belongs to the browser that started.
  if (!claims || claims.nonce !== returnedState) return oauthFailure(res, "invalid_state");

  let profile;
  try {
    profile = await fetchProfile(provider, await exchangeCodeForToken(provider, code));
  } catch (err) {
    logger.error({ err, provider }, "OAuth exchange failed");
    return oauthFailure(res, "provider_error");
  }

  const [existingLink] = await db.select().from(oauthAccountsTable)
    .where(and(
      eq(oauthAccountsTable.provider, provider),
      eq(oauthAccountsTable.providerAccountId, profile.providerAccountId),
    ))
    .limit(1);

  if (claims.mode === "link") {
    if (existingLink && existingLink.userId !== claims.userId) return oauthFailure(res, "already_linked_elsewhere");
    if (!existingLink) {
      await db.insert(oauthAccountsTable).values({
        userId: claims.userId!,
        provider,
        providerAccountId: profile.providerAccountId,
        providerEmail: profile.email,
      });
      await writeAuditLog(req, "oauth.link", "user", claims.userId!, { provider });
    }
    return res.redirect(`${appBaseUrl()}/settings/security`);
  }

  const ipAddress = req.ip ?? null;
  const userAgent = req.headers["user-agent"] ?? null;
  const deviceLabel = parseDeviceLabel(userAgent ?? undefined);

  let user;
  if (existingLink) {
    [user] = await db.select().from(usersTable).where(eq(usersTable.id, existingLink.userId)).limit(1);
    if (!user) return oauthFailure(res, "provider_error");
  } else {
    // A provider identity we have never seen. An unverified address proves
    // nothing — anyone can put someone else's email on a provider account.
    if (!profile.email || !profile.emailVerified) return oauthFailure(res, "email_not_verified");

    const [emailOwner] = await db.select().from(usersTable)
      .where(eq(usersTable.email, normalizeEmail(profile.email))).limit(1);

    // Deliberately no auto-linking on a matching email: it would hand the
    // account to anyone who can get that address onto a provider profile. The
    // owner links it themselves, from Security, while signed in.
    if (emailOwner) return oauthFailure(res, "email_already_registered");

    const nickname = await allocateNickname(suggestNickname(profile, provider));
    [user] = await db.insert(usersTable).values({
      nickname,
      email: normalizeEmail(profile.email),
      // No password: this account signs in through the provider until its owner
      // sets one via the reset flow. A random hash is not a usable password.
      passwordHash: await bcrypt.hash(randomUUID(), 12),
      role: "user",
      emailVerified: true,
    }).returning();

    await db.insert(oauthAccountsTable).values({
      userId: user.id,
      provider,
      providerAccountId: profile.providerAccountId,
      providerEmail: profile.email,
    });
    await writeAuditLog(req, "oauth.register", "user", user.id, { provider });
  }

  if (user.isBlocked) return oauthFailure(res, "account_blocked");

  // 2FA is the account's own setting; signing in through a provider does not
  // satisfy it. Hand the browser the same mfaToken the password flow uses.
  if (user.totpEnabled) {
    return res.redirect(`${appBaseUrl()}/login?mfa=${encodeURIComponent(generateMfaToken(user.id))}`);
  }

  const suspicious = await suspiciousLoginReasons({ userId: user.id, ipAddress, deviceLabel });
  const tokenId = randomUUID();
  await createSession({
    userId: user.id,
    tokenId,
    ipAddress,
    userAgent,
    deviceLabel,
    expiresAt: new Date(Date.now() + AUTH_SESSION_MAX_AGE_MS),
  });
  await recordLoginAttempt({
    userId: user.id, identifier: user.nickname, ipAddress, userAgent, deviceLabel,
    success: true, suspiciousReasons: suspicious,
  });

  res.cookie(AUTH_COOKIE_NAME, generateToken(user.id, user.role, tokenId), authCookieOptions());
  res.redirect(`${appBaseUrl()}/ctf`);
});

// DELETE /api/auth/oauth/:provider — unlink.
router.delete("/oauth/:provider", authenticateToken, requireSession, async (req, res) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider)) return res.status(400).json({ error: "Unknown provider" });

  const removed = await db.delete(oauthAccountsTable)
    .where(and(eq(oauthAccountsTable.userId, req.user!.userId), eq(oauthAccountsTable.provider, provider)))
    .returning({ id: oauthAccountsTable.id });

  if (removed.length === 0) return res.status(404).json({ error: "Not linked" });

  await writeAuditLog(req, "oauth.unlink", "user", req.user!.userId, { provider });
  res.json({ success: true });
});

// POST /api/auth/2fa/verify — exchange an mfaToken plus a code for a session.
// Accepts either a 6-digit TOTP code or a single-use backup code.
router.post("/2fa/verify", mfaVerifyRateLimit, async (req, res) => {
  const { mfaToken, code } = req.body ?? {};
  if (typeof mfaToken !== "string" || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Token and code are required" });
  }

  const userId = verifyMfaToken(mfaToken);
  if (!userId) return res.status(401).json({ error: "Invalid or expired session. Sign in again." });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.totpEnabled || !user.totpSecret) return res.status(401).json({ error: "Invalid or expired session. Sign in again." });
  if (user.isBlocked) return res.status(403).json({ error: "Account blocked" });

  const ipAddress = req.ip ?? null;
  const userAgent = req.headers["user-agent"] ?? null;
  const deviceLabel = parseDeviceLabel(userAgent ?? undefined);
  const ctx = { identifier: user.nickname, ipAddress, userAgent, deviceLabel };

  const secret = decryptSecret(user.totpSecret);
  if (!secret) return res.status(500).json({ error: "Internal server error" });

  const totp = verifyTotp({ secret, token: code, afterTimeStep: user.totpLastUsedStep });
  if (totp.valid) {
    // Record the accepted step so this exact code cannot be replayed.
    await db.update(usersTable).set({ totpLastUsedStep: totp.timeStep }).where(eq(usersTable.id, user.id));
    return issueSession(res, user, ctx);
  }

  // Not a live TOTP code — try the backup codes.
  const unused = await db.select().from(userBackupCodesTable)
    .where(and(eq(userBackupCodesTable.userId, user.id), isNull(userBackupCodesTable.usedAt)));
  const match = unused.find(entry => backupCodeMatches(code, entry.codeHash));

  if (match) {
    // Burn it first: a code that raced two requests must only work once.
    const consumed = await db.update(userBackupCodesTable)
      .set({ usedAt: new Date() })
      .where(and(eq(userBackupCodesTable.id, match.id), isNull(userBackupCodesTable.usedAt)))
      .returning({ id: userBackupCodesTable.id });

    if (consumed.length > 0) {
      const remaining = unused.length - 1;
      await writeAuditLog(req, "2fa.backup_code_used", "user", user.id, { remaining });
      return issueSession(res, user, ctx);
    }
  }

  await recordLoginAttempt({
    userId: user.id, identifier: user.nickname, ipAddress, userAgent, deviceLabel,
    success: false, failureReason: "bad_totp",
  });
  return res.status(401).json({ error: "Invalid code" });
});

// GET /api/auth/2fa/status
router.get("/2fa/status", authenticateToken, async (req, res) => {
  const [user] = await db.select({ totpEnabled: usersTable.totpEnabled })
    .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(userBackupCodesTable)
    .where(and(eq(userBackupCodesTable.userId, req.user!.userId), isNull(userBackupCodesTable.usedAt)));

  res.json({ enabled: user.totpEnabled, backupCodesRemaining: count });
});

// POST /api/auth/2fa/setup — start enrolment. Does nothing until /2fa/enable
// confirms the user can actually produce a code from the secret.
router.post("/2fa/setup", authenticateToken, requireSession, mfaManageRateLimit, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.totpEnabled) return res.status(409).json({ error: "Two-factor authentication is already enabled" });

  const secret = createTotpSecret();
  await db.update(usersTable)
    .set({ totpSecret: encryptSecret(secret), totpLastUsedStep: null })
    .where(eq(usersTable.id, user.id));

  res.json({ secret, otpauthUri: totpUri(secret, user.nickname) });
});

// POST /api/auth/2fa/enable — confirm enrolment and hand back the backup codes.
router.post("/2fa/enable", authenticateToken, requireSession, mfaManageRateLimit, async (req, res) => {
  const { code } = req.body ?? {};
  if (typeof code !== "string" || !code.trim()) return res.status(400).json({ error: "Code is required" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.totpEnabled) return res.status(409).json({ error: "Two-factor authentication is already enabled" });
  if (!user.totpSecret) return res.status(400).json({ error: "Start setup first" });

  const secret = decryptSecret(user.totpSecret);
  if (!secret) return res.status(500).json({ error: "Internal server error" });

  const totp = verifyTotp({ secret, token: code, afterTimeStep: null });
  if (!totp.valid) return res.status(400).json({ error: "Invalid code" });

  const codes = generateBackupCodes();
  await db.transaction(async tx => {
    await tx.update(usersTable)
      .set({ totpEnabled: true, totpLastUsedStep: totp.timeStep })
      .where(eq(usersTable.id, user.id));
    await tx.delete(userBackupCodesTable).where(eq(userBackupCodesTable.userId, user.id));
    await tx.insert(userBackupCodesTable).values(
      codes.map(plain => ({ userId: user.id, codeHash: hashBackupCode(plain) })),
    );
  });

  await writeAuditLog(req, "2fa.enabled", "user", user.id);
  // The only time these are ever readable — they are stored hashed.
  res.json({ success: true, backupCodes: codes });
});

// POST /api/auth/2fa/disable — password plus a live code, because turning the
// protection off is exactly what a session thief would want to do.
router.post("/2fa/disable", authenticateToken, requireSession, mfaManageRateLimit, async (req, res) => {
  const { password, code } = req.body ?? {};
  if (typeof password !== "string" || typeof code !== "string") {
    return res.status(400).json({ error: "Password and code are required" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.totpEnabled || !user.totpSecret) return res.status(400).json({ error: "Two-factor authentication is not enabled" });

  if (!await bcrypt.compare(password, user.passwordHash)) return res.status(400).json({ error: "Current password incorrect" });

  const secret = decryptSecret(user.totpSecret);
  if (!secret) return res.status(500).json({ error: "Internal server error" });
  if (!verifyTotp({ secret, token: code, afterTimeStep: user.totpLastUsedStep }).valid) {
    return res.status(400).json({ error: "Invalid code" });
  }

  await db.transaction(async tx => {
    await tx.update(usersTable)
      .set({ totpEnabled: false, totpSecret: null, totpLastUsedStep: null })
      .where(eq(usersTable.id, user.id));
    await tx.delete(userBackupCodesTable).where(eq(userBackupCodesTable.userId, user.id));
  });

  await writeAuditLog(req, "2fa.disabled", "user", user.id);
  res.json({ success: true });
});

// POST /api/auth/2fa/backup-codes — regenerate, invalidating the old set.
router.post("/2fa/backup-codes", authenticateToken, requireSession, mfaManageRateLimit, async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string") return res.status(400).json({ error: "Password is required" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.totpEnabled) return res.status(400).json({ error: "Two-factor authentication is not enabled" });
  if (!await bcrypt.compare(password, user.passwordHash)) return res.status(400).json({ error: "Current password incorrect" });

  const codes = generateBackupCodes();
  await db.transaction(async tx => {
    await tx.delete(userBackupCodesTable).where(eq(userBackupCodesTable.userId, user.id));
    await tx.insert(userBackupCodesTable).values(
      codes.map(plain => ({ userId: user.id, codeHash: hashBackupCode(plain) })),
    );
  });

  await writeAuditLog(req, "2fa.backup_codes_regenerated", "user", user.id);
  res.json({ success: true, backupCodes: codes });
});

router.post("/logout", authenticateToken, requireSession, async (req, res) => {
  await revokeSessionByTokenId(sessionOf(req).tokenId, "logout");
  res.clearCookie(AUTH_COOKIE_NAME, authCookieClearOptions());
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/sessions — device management: every live session for the caller.
router.get("/sessions", authenticateToken, requireSession, async (req, res) => {
  const sessions = await listSessions(req.user!.userId);
  res.json({
    sessions: sessions.map(s => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      isCurrent: s.tokenId === sessionOf(req).tokenId,
    })),
  });
});

// DELETE /api/auth/sessions/:id — sign a single device out.
router.delete("/sessions/:id", authenticateToken, requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid session id" });

  const revoked = await revokeSessionById(id, req.user!.userId, "revoked_by_user");
  if (!revoked) return res.status(404).json({ error: "Session not found" });

  if (id === sessionOf(req).sessionId) res.clearCookie(AUTH_COOKIE_NAME, authCookieClearOptions());
  res.json({ success: true });
});

// POST /api/auth/sessions/revoke-all — sign out everywhere except this device.
router.post("/sessions/revoke-all", authenticateToken, requireSession, async (req, res) => {
  const count = await revokeAllSessions(req.user!.userId, "revoked_by_user", sessionOf(req).tokenId);
  res.json({ success: true, revokedCount: count });
});

// GET /api/auth/api-tokens — the caller's live tokens. The secret is never
// returned again after creation; `prefix` is what identifies one in a list.
router.get("/api-tokens", authenticateToken, requireSession, async (req, res) => {
  const tokens = await listApiTokens(req.user!.userId);
  res.json({
    tokens: tokens.map(token => ({
      id: token.id,
      name: token.name,
      prefix: `${TOKEN_PREFIX}${token.prefix}…`,
      scopes: parseScopes(token.scopes),
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    })),
    availableScopes: API_SCOPES,
  });
});

// POST /api/auth/api-tokens — mint one. The only time the secret is readable.
router.post("/api-tokens", authenticateToken, requireSession, async (req, res) => {
  const { name, scopes, expiresInDays } = req.body ?? {};

  if (typeof name !== "string" || !name.trim() || name.length > 64) {
    return res.status(400).json({ error: "Name is required (1-64 characters)" });
  }
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return res.status(400).json({ error: "At least one scope is required" });
  }
  const invalid = scopes.filter(scope => !isApiScope(scope));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Unknown scope(s): ${invalid.join(", ")}. Valid: ${API_SCOPES.join(", ")}` });
  }

  let expiresAt: Date | null = null;
  if (expiresInDays !== undefined && expiresInDays !== null) {
    const days = Number(expiresInDays);
    if (!Number.isFinite(days) || days <= 0 || days > 365) {
      return res.status(400).json({ error: "expiresInDays must be between 1 and 365" });
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const existing = await listApiTokens(req.user!.userId);
  if (existing.length >= 20) return res.status(409).json({ error: "Token limit reached (20). Revoke one first." });

  const { token, tokenHash, prefix } = generateApiToken();
  const [created] = await db.insert(apiTokensTable).values({
    userId: req.user!.userId,
    name: name.trim(),
    tokenHash,
    prefix,
    scopes: [...new Set(scopes as ApiScope[])].join(","),
    expiresAt,
  }).returning();

  await writeAuditLog(req, "api_token.create", "api_token", created.id, { name: created.name, scopes });
  res.status(201).json({
    id: created.id,
    name: created.name,
    scopes: parseScopes(created.scopes),
    expiresAt: created.expiresAt,
    // Shown once. There is no way to recover it — only the hash is stored.
    token,
  });
});

// DELETE /api/auth/api-tokens/:id
router.delete("/api-tokens/:id", authenticateToken, requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid token id" });

  if (!await revokeApiToken(id, req.user!.userId)) return res.status(404).json({ error: "Token not found" });

  await writeAuditLog(req, "api_token.revoke", "api_token", id);
  res.json({ success: true });
});

// GET /api/auth/login-history — the caller's own login attempts, newest first.
router.get("/login-history", authenticateToken, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const entries = await listLoginHistory(req.user!.userId, limit);
  res.json({
    entries: entries.map(e => ({
      id: e.id,
      ipAddress: e.ipAddress,
      deviceLabel: e.deviceLabel,
      success: e.success,
      failureReason: e.failureReason,
      suspicious: e.suspicious,
      suspiciousReasons: e.suspiciousReasons ? e.suspiciousReasons.split(",") : [],
      createdAt: e.createdAt,
    })),
  });
});

router.get("/session", optionalAuth, async (req, res) => {
  if (!req.user) return res.json({ user: null });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1);
  if (!user || user.isBlocked) return res.json({ user: null });

  res.json({
    user: publicUser(user),
    // Derived server-side so the client never has to keep its own copy of the
    // permission table — it would drift the first time one changes.
    permissions: permissionsForRole(normalizeRole(user.role)),
  });
});

router.get("/me", authenticateToken, requireScope("profile:read"), async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, nickname: user.nickname, email: user.email, avatarUrl: user.avatarUrl, points: user.points, role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked, createdAt: user.createdAt });
});

router.get("/verify-email", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.status(400).json({ error: "Verification token required" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, token)).limit(1);
  if (!user) return res.status(400).json({ error: "Invalid verification token" });

  await db.update(usersTable)
    .set({ emailVerified: true, emailVerificationToken: null })
    .where(eq(usersTable.id, user.id));

  res.json({ message: "Email verified" });
});

router.post("/resend-verification", authRateLimit, async (req, res) => {
  const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";
  if (!email) return res.status(400).json({ error: "Email required" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) return res.json({ success: true });
  if (user.emailVerified) return res.json({ success: true, message: "Email already verified" });

  const token = randomUUID();
  await db.update(usersTable).set({ emailVerificationToken: token }).where(eq(usersTable.id, user.id));
  const emailResult = await sendVerificationEmail(user.email, token);
  if (!emailResult.ok) {
    return res.status(503).json({ error: emailResult.reason || "Verification email could not be sent" });
  }

  res.json({ success: true, message: "Verification email sent" });
});

router.post("/forgot-password", authRateLimit, async (req, res) => {
  const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";
  if (!email) return res.status(400).json({ error: "Email required" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) return res.json({ success: true, message: "If an account exists, a reset link has been sent" });

  const token = randomUUID();
  const expires = new Date(Date.now() + 3600000); // 1 hour
  await db.update(usersTable).set({ passwordResetToken: token, passwordResetExpires: expires }).where(eq(usersTable.id, user.id));

  const emailResult = await sendPasswordResetEmail(user.email, token);
  if (!emailResult.ok) {
    return res.status(503).json({ error: "Failed to send reset email" });
  }

  res.json({ success: true, message: "If an account exists, a reset link has been sent" });
});

router.post("/reset-password", authRateLimit, async (req, res) => {
  const { token, password } = req.body;
  if (typeof token !== "string" || !token) return res.status(400).json({ error: "Token required" });
  if (typeof password !== "string" || !isStrongPassword(password)) {
    return res.status(400).json({ error: "Password must be at least 10 chars and include uppercase, lowercase, number, and symbol" });
  }

  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.passwordResetToken, token), sql`${usersTable.passwordResetExpires} > now()`))
    .limit(1);
  
  if (!user) return res.status(400).json({ error: "Invalid or expired token" });

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable).set({ passwordHash, passwordResetToken: null, passwordResetExpires: null }).where(eq(usersTable.id, user.id));

  // A reset means the account may have been compromised — drop every session.
  await revokeAllSessions(user.id, "password_reset");

  res.json({ success: true, message: "Password has been reset" });
});

router.post("/change-password", authenticateToken, requireSession, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Passwords required" });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: "New password must be at least 10 chars and include uppercase, lowercase, number, and symbol" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  // Keep the caller signed in, but drop every other device.
  const revokedCount = await revokeAllSessions(user.id, "password_changed", sessionOf(req).tokenId);

  res.json({ success: true, message: "Password updated", revokedSessionCount: revokedCount });
});

export default router;
