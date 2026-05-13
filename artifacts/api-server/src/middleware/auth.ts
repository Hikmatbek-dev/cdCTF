import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = "cdctf-api";
const JWT_AUDIENCE = "cdctf-web";
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
  console.warn("JWT_SECRET not set, using development-only fallback.");
} else if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

const effectiveJwtSecret = JWT_SECRET || "cdctf_dev_secret_change_me";

export interface AuthPayload {
  userId: number;
  role: "admin" | "user";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, effectiveJwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as AuthPayload;
    if (!Number.isInteger(payload.userId) || !["admin", "user"].includes(payload.role)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, effectiveJwtSecret, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as AuthPayload;
      if (Number.isInteger(payload.userId) && ["admin", "user"].includes(payload.role)) {
        req.user = payload;
      }
    } catch {
      // ignore
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

export function generateToken(userId: number, role: string): string {
  const normalizedRole = role === "admin" ? "admin" : "user";
  return jwt.sign({ userId, role: normalizedRole }, effectiveJwtSecret, {
    algorithm: "HS256",
    audience: JWT_AUDIENCE,
    expiresIn: Math.floor(AUTH_SESSION_MAX_AGE_MS / 1000),
    issuer: JWT_ISSUER,
  });
}

function getRequestToken(req: Request) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken ? cookieToken : null;
}
