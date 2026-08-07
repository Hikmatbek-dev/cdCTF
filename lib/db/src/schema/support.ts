import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * A support / bug report from a learner. Anyone may file one (userId is null for
 * a logged-out visitor); a contact email is optional so we can reply. Each ticket
 * is mirrored to the Telegram log the moment it lands and shows up in the admin
 * panel's Support section, where staff move it open → resolved.
 */
export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  // A contact address to reply to; the logged-in user's own email is prefilled
  // by the client, but a visitor can type any.
  email: text("email"),
  category: text("category").notNull().default("bug"),
  message: text("message").notNull(),
  // Where they were when they hit the problem — invaluable for reproducing.
  pageUrl: text("page_url"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: integer("resolved_by").references(() => usersTable.id),
}, table => [
  // The admin list: open tickets first, newest first.
  index("support_tickets_status_idx").on(table.status, table.createdAt),
]);
