import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ctfFilesTable = pgTable("ctf_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  content: text("content").notNull(), // Base64 encoded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
});

export const insertCtfTaskSchema = createInsertSchema(ctfTasksTable).omit({ id: true, createdAt: true });
export type InsertCtfTask = z.infer<typeof insertCtfTaskSchema>;
export type CtfTask = typeof ctfTasksTable.$inferSelect;
export type CtfAttempt = typeof ctfAttemptsTable.$inferSelect;
