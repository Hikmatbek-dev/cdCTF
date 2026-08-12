import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./users";

export const communityMessages = pgTable("community_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const communityMessagesRelations = relations(communityMessages, ({ one }) => ({
  user: one(usersTable, {
    fields: [communityMessages.userId],
    references: [usersTable.id],
  }),
}));

