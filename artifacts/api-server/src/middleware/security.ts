import type { NextFunction, Request, Response } from "express";
import type { CorsOptions } from "cors";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

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

type MemoryEntry = { count: number; resetAt: number };
const buckets = new Map<string, MemoryEntry>();

// Entries are only ever overwritten when the same IP comes back, so without a
// sweep every one-shot IP leaks a Map entry for the lifetime of the process.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
// Never hold the process open just to sweep an in-memory cache.
sweepTimer.unref?.();

function countRequestInMemory(key: string, windowMs: number): MemoryEntry {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return fresh;
  }
  entry.count += 1;
  return entry;
}

/**
 * Counts a request against its bucket and reports where that leaves it.
 *
 * One statement, so it is atomic without an explicit transaction: concurrent
 * requests for the same key serialise on the row, which is the whole point —
 * a flood is exactly when a read-then-write would lose counts to the race.
 *
 * An expired window is reset in the same statement rather than swept first,
 * so a stale row never spends a request's allowance.
 */
async function countRequest(key: string, windowMs: number) {
  const { rows } = await pool.query<{ count: number; reset_at: Date }>(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES ($1, 1, now() + make_interval(secs => $2))
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= now() THEN now() + make_interval(secs => $2) ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
    [key, windowMs / 1000],
  );
  return rows[0];
}

// Expired rows are dead weight; nothing reads them and every key an attacker
// invents leaves one. There is no timer to sweep them on serverless — the
// process does not outlive the request — so a small share of requests pays for
// the cleanup instead. Rows are kept an hour past expiry so a sweep never
// races a window that is still being counted against.
const SWEEP_PROBABILITY = 0.01;

async function sweepExpired() {
  await pool.query("DELETE FROM rate_limits WHERE reset_at < now() - interval '1 hour'");
}

/**
 * @param store Which counter this bucket keeps, and it is not a tuning knob.
 *
 * "shared" counts in Postgres, across every instance. Use it whenever the limit
 * IS the security control — login, TOTP, password reset. Per-instance counting
 * there is not a weaker limit, it is a broken one: the flood that trips it is
 * also what makes the platform add instances, each with a fresh allowance.
 *
 * "instance" counts in this process's memory. Use it when the limit protects
 * THIS process — its event loop, its connections. Per-instance is the correct
 * meaning there, and it also keeps a blanket limiter from putting a database
 * write in front of every request, including the ones serving static files.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  store: "shared" | "instance";
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${options.keyPrefix}:${ip}`;

    if (options.store === "instance") {
      const entry = countRequestInMemory(key, options.windowMs);
      if (entry.count > options.max) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000)).toString());
        return res.status(429).json({ error: "Too many requests. Try again later." });
      }
      return next();
    }

    let entry;
    try {
      entry = await countRequest(key, options.windowMs);
    } catch (err) {
      // Fail open, deliberately. Every route behind this limiter needs the
      // database to do anything useful — a login cannot succeed without
      // reading the user — so refusing traffic here would turn a database
      // blip into a hard outage while buying an attacker nothing.
      logger.error({ err, key }, "Rate limiter could not reach the database; allowing the request");
      return next();
    }

    if (entry && entry.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.reset_at.getTime() - Date.now()) / 1000));
      res.setHeader("Retry-After", retryAfterSec.toString());
      return res.status(429).json({ error: "Too many requests. Try again later." });
    }

    if (Math.random() < SWEEP_PROBABILITY) {
      void sweepExpired().catch(err => logger.error({ err }, "Rate limit sweep failed"));
    }

    return next();
  };
}
