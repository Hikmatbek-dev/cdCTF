import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE_MS, generateToken, authenticateToken, optionalAuth } from "../middleware/auth";
import { createRateLimiter } from "../middleware/security";
import { sendVerificationEmail, verifyTurnstileToken, sendPasswordResetEmail } from "../lib/integrations";
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

const router = Router();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "auth" });
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

function validateRegister(body: Record<string, unknown>) {
  const { nickname, email, password } = body;
  if (typeof nickname !== "string") return "Nickname must be 3-32 chars";
  const normalizedNickname = normalizeNickname(nickname);
  if (normalizedNickname.length < 3 || normalizedNickname.length > 32 || !/^[A-Za-z0-9_]+$/.test(normalizedNickname)) {
    return "Nickname must be 3-32 chars and use only letters, numbers, or underscores";
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) return "Invalid email";
  if (typeof password !== "string" || !isStrongPassword(password)) {
    return "Password must be at least 10 chars and include uppercase, lowercase, number, and symbol";
  }
  return null;
}

function validateLogin(body: Record<string, unknown>) {
  const { nickname, password } = body;
  if (typeof nickname !== "string" || !normalizeNickname(nickname)) return "Login required";
  if (typeof password !== "string" || !password) return "Password required";
  return null;
}

router.post("/register", authRateLimit, async (req, res) => {
  const err = validateRegister(req.body);
  if (err) return res.status(400).json({ error: err });

  const body = req.body as { nickname: string; email: string; password: string; captchaToken?: string };
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

router.post("/login", authRateLimit, async (req, res) => {
  const err = validateLogin(req.body);
  if (err) return res.status(400).json({ error: err });

  const body = req.body as { nickname: string; password: string };
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

  // Must run before this login is recorded, otherwise the new IP/device it is
  // checking for would already be in the history and never look new.
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
  const token = generateToken(user.id, user.role, tokenId);

  await recordLoginAttempt({
    userId: user.id, identifier, ipAddress, userAgent, deviceLabel,
    success: true, suspiciousReasons: suspicious,
  });

  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  res.json({
    token,
    user: { id: user.id, nickname: user.nickname, email: user.email, avatarUrl: user.avatarUrl, points: user.points, role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked, createdAt: user.createdAt },
    suspiciousLogin: suspicious.length > 0 ? { reasons: suspicious } : null,
  });
});

router.post("/logout", authenticateToken, async (req, res) => {
  await revokeSessionByTokenId(req.user!.tokenId, "logout");
  res.clearCookie(AUTH_COOKIE_NAME, authCookieClearOptions());
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/sessions — device management: every live session for the caller.
router.get("/sessions", authenticateToken, async (req, res) => {
  const sessions = await listSessions(req.user!.userId);
  res.json({
    sessions: sessions.map(s => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      isCurrent: s.tokenId === req.user!.tokenId,
    })),
  });
});

// DELETE /api/auth/sessions/:id — sign a single device out.
router.delete("/sessions/:id", authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid session id" });

  const revoked = await revokeSessionById(id, req.user!.userId, "revoked_by_user");
  if (!revoked) return res.status(404).json({ error: "Session not found" });

  if (id === req.user!.sessionId) res.clearCookie(AUTH_COOKIE_NAME, authCookieClearOptions());
  res.json({ success: true });
});

// POST /api/auth/sessions/revoke-all — sign out everywhere except this device.
router.post("/sessions/revoke-all", authenticateToken, async (req, res) => {
  const count = await revokeAllSessions(req.user!.userId, "revoked_by_user", req.user!.tokenId);
  res.json({ success: true, revokedCount: count });
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
    user: {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      avatarUrl: user.avatarUrl,
      points: user.points,
      role: user.role,
      emailVerified: user.emailVerified,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    },
  });
});

router.get("/me", authenticateToken, async (req, res) => {
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

router.post("/change-password", authenticateToken, async (req, res) => {
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
  const revokedCount = await revokeAllSessions(user.id, "password_changed", req.user!.tokenId);

  res.json({ success: true, message: "Password updated", revokedSessionCount: revokedCount });
});

export default router;
