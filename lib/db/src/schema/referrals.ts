import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Who invited whom, and whether it counts yet.
 *
 * One row per invited person. `refereeId` is unique, so a learner can be
 * referred by exactly one other — the invite is claimed at signup and never
 * reassigned, which stops two people both counting the same recruit.
 *
 * `status` starts 'pending' and flips to 'active' only when the invited person
 * both verifies their email and does one real thing (finishes a lesson or
 * solves a challenge). The whole programme rewards `active`, never `pending`:
 * the five-invite competition gate and the free-hint credits are counted from
 * activated rows alone, so a pile of throwaway signups buys nothing.
 *
 * The referrer's rewards are not stored here. The Ambassador tier is derived
 * from the count of active rows, and the hint credit is granted on the users
 * row at the moment of activation — this table is the ledger, not the balance.
 */
export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => usersTable.id),
  refereeId: integer("referee_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
}, table => [
  // One inviter per invited person.
  uniqueIndex("referrals_referee_idx").on(table.refereeId),
  // "How many people have I activated?" — the hot query, run on every
  // competition-join attempt and every profile view.
  index("referrals_referrer_status_idx").on(table.referrerId, table.status),
]);

export type Referral = typeof referralsTable.$inferSelect;
