import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// One row per issued JWT. The token carries the `tokenId` as its `jti` claim, so
// deleting/revoking a row here immediately invalidates that token — without this
// table a JWT stays valid until it expires, even for a blocked user.
export const userSessionsTable = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenId: text("token_id").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceLabel: text("device_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: text("revoked_reason"),
}, table => [
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_expires_at_idx").on(table.expiresAt),
]);

// Append-only log of every login attempt, successful or not. Drives the login
// history UI and the new-IP/new-device heuristics in `suspiciousLoginReasons`.
export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  // Nullable and `set null` on delete: a failed login for an unknown account has
  // no user, and the trail should survive the account it points at.
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  identifier: text("identifier").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceLabel: text("device_label"),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"),
  suspicious: boolean("suspicious").notNull().default(false),
  suspiciousReasons: text("suspicious_reasons"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("login_history_user_id_created_at_idx").on(table.userId, table.createdAt),
  index("login_history_ip_address_idx").on(table.ipAddress),
]);

export type UserSession = typeof userSessionsTable.$inferSelect;
export type LoginHistoryEntry = typeof loginHistoryTable.$inferSelect;
