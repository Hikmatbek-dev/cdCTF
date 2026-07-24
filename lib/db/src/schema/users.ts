import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  points: integer("points").notNull().default(0),
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  // TOTP shared secret, encrypted at rest. Present but with `totpEnabled` false
  // means an enrolment was started and never confirmed.
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  // Time-step of the last accepted code. A TOTP code stays valid for its whole
  // window, so without this an observer could replay one within ~30 seconds.
  totpLastUsedStep: integer("totp_last_used_step"),
  /**
   * Staff and demo accounts that solve challenges without appearing on the
   * scoreboard. Replaces a hardcoded nickname comparison that was repeated in
   * six files — a rename would have silently started paying that account.
   */
  excludedFromScoring: boolean("excluded_from_scoring").notNull().default(false),
  /**
   * The seed of the talent pipeline: a learner who flips this on is telling
   * recruiters they are available. It surfaces as a badge on their profile and
   * scoreboard row, turning the leaderboard into a hiring signal — the thing an
   * employer sponsor actually pays to reach.
   */
  openToWork: boolean("open_to_work").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // The scoreboard's exact filter and sort: non-blocked users, role 'user',
  // ordered by points. One index serves all three.
  index("users_leaderboard_idx").on(table.role, table.isBlocked, table.points),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  points: true,
  role: true,
  emailVerified: true,
  isBlocked: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
