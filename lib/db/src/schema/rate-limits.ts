import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Request counters for the auth rate limiter, one row per key.
 *
 * In Postgres rather than in memory because the limiter was in memory, and on
 * serverless that means one counter per instance: a login flood spreads across
 * instances and each gets its own fresh allowance. Proven, not assumed — two
 * servers on one database, the first 429s at attempt 21 while the second still
 * answers 401. Worse, the burst that triggers the limit is also what makes
 * Vercel add instances, so the protection thinned exactly under attack.
 *
 * The database is already shared by every instance and already required for the
 * app to serve a request at all, so it costs no new infrastructure.
 */
export const rateLimitsTable = pgTable("rate_limits", {
  // "<prefix>:<ip>" — the prefix separates the buckets, so exhausting login
  // attempts does not also lock the user out of, say, TOTP verification.
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (table) => [
  // For the sweep of expired rows, which would otherwise scan the table.
  index("rate_limits_reset_at_idx").on(table.resetAt),
]);
