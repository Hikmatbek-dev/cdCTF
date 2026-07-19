import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ctfTasksTable = pgTable("ctf_tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameUz: text("name_uz"),
  nameRu: text("name_ru"),
  description: text("description").notNull(),
  descriptionUz: text("description_uz"),
  descriptionRu: text("description_ru"),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("easy"),
  points: integer("points").notNull().default(100),
  hintCost: integer("hint_cost").notNull().default(10),
  hint: text("hint"),
  flag: text("flag").notNull(),
  fileUrl: text("file_url"),
  fileId: integer("file_id").references(() => ctfFilesTable.id),
  // Who wrote it — drives the `ctf.update.own` permission. Null for everything
  // created before authorship existed; only `.any` holders edit those.
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  // Defaults to published so existing rows stay visible; the author create path
  // sets it false explicitly so drafts need an admin to publish them.
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("ctf_tasks_author_id_idx").on(table.authorId),
  index("ctf_tasks_published_idx").on(table.isPublished),
]);

export const ctfFilesTable = pgTable("ctf_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  content: text("content").notNull(), // Base64 encoded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Postgres does not index a foreign key for you. Every column indexed below is
// one the server actually filters on — see the counts in the commit message.
export const ctfAttemptsTable = pgTable("ctf_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  ctfId: integer("ctf_id").notNull().references(() => ctfTasksTable.id),
  wrongAttempts: integer("wrong_attempts").notNull().default(0),
  hintUsed: boolean("hint_used").notNull().default(false),
  solved: boolean("solved").notNull().default(false),
  blocked: boolean("blocked").notNull().default(false),
  solvedAt: timestamp("solved_at", { withTimezone: true }),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // One row per (user, challenge) is the intent everywhere in the code; the
  // unique index makes it true, and serves the lookup both routes do first.
  uniqueIndex("ctf_attempts_user_ctf_idx").on(table.userId, table.ctfId),
  index("ctf_attempts_ctf_id_idx").on(table.ctfId),
  // `solved` is scanned to count solvers on every challenge list and scoreboard.
  // Partial: the false rows are never the ones being counted.
  index("ctf_attempts_solved_idx").on(table.userId).where(sql`solved`),
  index("ctf_attempts_blocked_idx").on(table.ctfId).where(sql`blocked`),
]);

export const insertCtfTaskSchema = createInsertSchema(ctfTasksTable).omit({ id: true, createdAt: true });
export type InsertCtfTask = z.infer<typeof insertCtfTaskSchema>;
export type CtfTask = typeof ctfTasksTable.$inferSelect;
export type CtfAttempt = typeof ctfAttemptsTable.$inferSelect;
