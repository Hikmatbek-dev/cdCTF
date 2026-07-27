import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  /**
   * The employer side of the talent pipeline. A user who registers as an
   * employer can post jobs; the company fields are what a candidate sees on a
   * listing. Orthogonal to `role` — an employer is still a normal user.
   */
  isEmployer: boolean("is_employer").notNull().default(false),
  companyName: text("company_name"),
  companyUrl: text("company_url"),
  /**
   * Daily activity streak — the gamification hook that brings learners back.
   * `lastActivityDate` is a 'YYYY-MM-DD' UTC day string; a solve or completed
   * lesson on a new day bumps the streak, a skipped day resets it to 1.
   */
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: text("last_activity_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // The scoreboard's exact filter and sort: non-blocked users, role 'user',
  // ordered by points. One index serves all three.
  index("users_leaderboard_idx").on(table.role, table.isBlocked, table.points),
  // The two unauthenticated lookups. `users` had exactly one index, so
  // verifying an email or redeeming a reset link was a sequential scan of the
  // whole table — on endpoints anyone can call, behind a limiter that fails
  // open. Partial, because both columns are null for nearly every row: the
  // index only holds the handful of tokens actually outstanding.
  index("users_email_verification_token_idx").on(table.emailVerificationToken)
    .where(sql`email_verification_token IS NOT NULL`),
  index("users_password_reset_token_idx").on(table.passwordResetToken)
    .where(sql`password_reset_token IS NOT NULL`),
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
