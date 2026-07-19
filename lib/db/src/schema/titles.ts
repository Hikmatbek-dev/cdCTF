import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const titlesTable = pgTable("titles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().unique(),
  points: integer("points").notNull().default(500),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userTitlesTable = pgTable("user_titles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  titleId: integer("title_id").notNull().references(() => titlesTable.id),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // A title is earned once. The recalculation paths delete-then-reinsert, which
  // is only safe if a duplicate cannot slip in between.
  uniqueIndex("user_titles_user_title_idx").on(table.userId, table.titleId),
  index("user_titles_title_id_idx").on(table.titleId),
]);

export const insertTitleSchema = createInsertSchema(titlesTable).omit({ id: true, createdAt: true });
export type InsertTitle = z.infer<typeof insertTitleSchema>;
export type Title = typeof titlesTable.$inferSelect;
export type UserTitle = typeof userTitlesTable.$inferSelect;
