import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const learnCategoriesTable = pgTable("learn_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameUz: text("name_uz"),
  nameRu: text("name_ru"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleUz: text("title_uz"),
  titleRu: text("title_ru"),
  content: text("content").notNull(),
  contentUz: text("content_uz"),
  contentRu: text("content_ru"),
  categoryId: integer("category_id").notNull().references(() => learnCategoriesTable.id),
  points: integer("points").notNull().default(50),
  // Who wrote it — drives the `lessons.update.own` permission. Null for
  // everything created before authorship existed; only `.any` holders edit those.
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  // Defaults to published so existing rows stay visible; the author create path
  // sets it false explicitly so drafts need an admin to publish them.
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("lessons_category_id_idx").on(table.categoryId),
  index("lessons_author_id_idx").on(table.authorId),
  index("lessons_published_idx").on(table.isPublished),
]);

export const lessonQuestionsTable = pgTable("lesson_questions", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id),
  question: text("question").notNull(),
  questionUz: text("question_uz"),
  questionRu: text("question_ru"),
  options: jsonb("options").notNull().$type<string[]>(),
  optionsUz: jsonb("options_uz").$type<string[]>(),
  optionsRu: jsonb("options_ru").$type<string[]>(),
  correctOption: integer("correct_option").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
}, table => [
  index("lesson_questions_lesson_id_idx").on(table.lessonId),
]);

export const userLessonAttemptsTable = pgTable("user_lesson_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id),
  status: text("status").notNull().default("not_started"),
  attemptCount: integer("attempt_count").notNull().default(0),
  escapeCount: integer("escape_count").notNull().default(0),
  testSessionId: text("test_session_id"),
  testStartedAt: timestamp("test_started_at", { withTimezone: true }),
  blocked: boolean("blocked").notNull().default(false),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // One attempt row per (user, lesson) — the intent everywhere in learn.ts.
  uniqueIndex("user_lesson_attempts_user_lesson_idx").on(table.userId, table.lessonId),
  index("user_lesson_attempts_lesson_id_idx").on(table.lessonId),
  index("user_lesson_attempts_status_idx").on(table.status),
]);

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
export type LessonQuestion = typeof lessonQuestionsTable.$inferSelect;
export type UserLessonAttempt = typeof userLessonAttemptsTable.$inferSelect;
export type LearnCategory = typeof learnCategoriesTable.$inferSelect;
