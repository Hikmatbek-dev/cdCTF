import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * A points reward a super-admin hands to someone who helped — reported a bug,
 * made a good suggestion, asked/answered something useful. Each gift is its own
 * row so a learner's profile can list what they were recognised for, and so
 * recalculateUserPoints can fold the total back in (a gift must survive a
 * points recalculation, unlike a one-off nudge to users.points).
 */
export const giftsTable = pgTable("gifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  // bug | suggestion | question | help | other — drives the default amount.
  category: text("category").notNull(),
  points: integer("points").notNull(),
  note: text("note"),
  awardedBy: integer("awarded_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("gifts_user_idx").on(table.userId),
]);
