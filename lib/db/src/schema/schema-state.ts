import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Which version of the DDL has already been applied to this database.
 *
 * `ensureDatabaseShape()` runs about a hundred idempotent CREATE/ALTER
 * statements on cold start. Harmless to repeat, but a second of round trips
 * against a remote Postgres — and Vercel recycles containers constantly, so it
 * was being paid over and over. Measured on production: /api/healthz touches no
 * database and still answered in ~800ms.
 *
 * One row, id = 1. `version` is a hash of the schema function's own source, so
 * it cannot drift from the statements it describes: editing any DDL changes the
 * hash, which is exactly when the statements should run again.
 *
 * Mirrors artifacts/api-server/src/lib/database.ts — schema-parity.sh fails if
 * they drift.
 */
export const schemaStateTable = pgTable("schema_state", {
  id: integer("id").primaryKey(),
  version: text("version").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});
