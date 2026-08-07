import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  /**
   * The super-admin flag. A super-admin is a normal `admin` that may also create
   * other admins and toggle each of their permissions on and off. It always has
   * every permission and cannot be locked out by an override. There is no UI to
   * set this — it is granted at boot from SUPER_ADMIN_EMAILS, so the crown can
   * never be handed out through the admin panel itself.
   */
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  /**
   * Per-user permission override. Null means "use this role's defaults"; a
   * non-null array (including an empty one) is the exact set this user holds,
   * ignoring the role defaults. Set only by a super-admin through the dedicated
   * endpoint — never a mass-assignable column — so a normal update cannot be used
   * to self-elevate. A super-admin ignores this entirely and holds everything.
   */
  permissions: text("permissions").array(),
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
   * Whether an admin's solves count toward points and the scoreboard.
   *
   * Admins are unscored by default so staff testing content never tops the
   * board. A super-admin can flip this on for a specific admin who should
   * compete for real. It only matters for the admin role — a normal learner
   * always earns (unless `excludedFromScoring`).
   */
  adminEarnsPoints: boolean("admin_earns_points").notNull().default(false),
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
  /**
   * The referral programme.
   *
   * `referralCode` is this user's own share code — generated the first time they
   * open the invite panel, unique, and the thing that goes in `?ref=…`. Null
   * until then, so the column stays empty for the accounts that never look.
   *
   * `freeHintCredits` is a referral reward spent before points: the hint
   * endpoint draws down a credit if one exists and only charges points
   * otherwise. One credit is granted per *activated* referral (see the
   * referrals table) — a signup alone earns nothing, which is what keeps the
   * five-invite competition gate from being farmed with throwaway accounts.
   *
   * Referral rewards deliberately do NOT touch `points`. Points are the skill
   * leaderboard, and letting an invite climb it would let someone top the board
   * having solved nothing.
   */
  // Uniqueness is a partial index below, not a column constraint — it matches
  // applySchema, and only the handful of allocated codes sit in the index.
  referralCode: text("referral_code"),
  freeHintCredits: integer("free_hint_credits").notNull().default(0),
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
  // Unique share code, but only over rows that have one.
  uniqueIndex("users_referral_code_idx").on(table.referralCode)
    .where(sql`referral_code IS NOT NULL`),
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
