import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE_NAME, generateToken, authenticateToken, optionalAuth } from "../middleware/auth";
import { createRateLimiter } from "../middleware/security";
import { sendVerificationEmail, verifyTurnstileToken } from "../lib/integrations";

const router = Router();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "auth" });
const emailDeliveryRequired = process.env.EMAIL_VERIFICATION_REQUIRED === "true";

function authCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  };
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
  if (typeof nickname !== "string" || !normalizeNickname(nickname)) return "Nickname required";
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
  const nickname = normalizeNickname(body.nickname);
  const password = body.password;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.nickname, nickname)).limit(1);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (user.isBlocked) return res.status(403).json({ error: "Account blocked" });
  if (!user.emailVerified && user.role !== "admin") return res.status(403).json({ error: "Email not verified" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user.id, user.role);
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  res.json({
    token,
    user: { id: user.id, nickname: user.nickname, email: user.email, avatarUrl: user.avatarUrl, points: user.points, role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked, createdAt: user.createdAt },
  });
});

router.post("/logout", authenticateToken, (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.json({ success: true, message: "Logged out" });
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

export default router;
