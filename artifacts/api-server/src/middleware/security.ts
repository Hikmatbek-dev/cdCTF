import type { NextFunction, Request, Response } from "express";
import type { CorsOptions } from "cors";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:7000",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:7000",
  "http://127.0.0.1:8080",
];

function getAllowedOrigins() {
  const configured = process.env.CORS_ORIGINS?.split(",")
    .map(item => item.trim())
    .filter(Boolean) ?? [];

  const derived = [
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  ].filter((item): item is string => Boolean(item));

  // The localhost defaults must never reach production: combined with
  // `credentials: true` they let any page on a dev port read authenticated
  // responses — and this platform's users run challenge code on those ports.
  const defaults = process.env.NODE_ENV === "production" ? [] : DEFAULT_ALLOWED_ORIGINS;

  return [...new Set([...configured, ...derived, ...defaults])];
}

/** Thrown for a disallowed Origin so the error handler can answer 403, not 500. */
export class CorsOriginError extends Error {
  readonly status = 403;
  constructor(readonly origin: string) {
    super("Origin is not allowed by CORS");
    this.name = "CorsOriginError";
  }
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();

    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new CorsOriginError(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
  maxAge: 600,
};

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

// Entries are only ever overwritten when the same IP comes back, so without a
// sweep every one-shot IP leaks a Map entry for the lifetime of the process.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function sweepExpiredBuckets() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

const sweepTimer = setInterval(sweepExpiredBuckets, SWEEP_INTERVAL_MS);
// Never hold the process open just to sweep an in-memory cache.
sweepTimer.unref?.();

export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${options.keyPrefix}:${ip}`;
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: "Too many requests. Try again later." });
    }

    return next();
  };
}
