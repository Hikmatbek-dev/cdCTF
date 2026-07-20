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

/**
 * A module is a course: an ordered set of lessons that ends in an exam, and a
 * certificate if the learner passes it.
 *
 * Lessons alone were a flat list, which is fine for a handful and useless for a
 * six-month curriculum — there was no way to say "these twelve lessons are one
 * course, in this order, and finishing them means something".
 */
export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  // Stable, human-readable id for URLs and for the seed to be idempotent.
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  titleUz: text("title_uz"),
  titleRu: text("title_ru"),
  description: text("description").notNull(),
  descriptionUz: text("description_uz"),
  descriptionRu: text("description_ru"),
  categoryId: integer("category_id").references(() => learnCategoriesTable.id),
  orderIndex: integer("order_index").notNull().default(0),
  // Study time, so a learner can see this is a course and not a five-minute read.
  estimatedHours: integer("estimated_hours").notNull().default(0),
  difficulty: text("difficulty").notNull().default("beginner"),
  // Percentage the final exam needs for a certificate.
  passScore: integer("pass_score").notNull().default(80),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("modules_published_idx").on(table.isPublished),
  index("modules_order_idx").on(table.orderIndex),
]);

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleUz: text("title_uz"),
  titleRu: text("title_ru"),
  content: text("content").notNull(),
  contentUz: text("content_uz"),
  contentRu: text("content_ru"),
  categoryId: integer("category_id").notNull().references(() => learnCategoriesTable.id),
  // Which course this lesson belongs to, and where it sits in that course.
  // Nullable: lessons written before modules existed still work as standalone
  // entries, and the seed assigns them a module as the curriculum is built out.
  moduleId: integer("module_id").references(() => modulesTable.id),
  orderIndex: integer("order_index").notNull().default(0),
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
  index("lessons_module_id_idx").on(table.moduleId),
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

/**
 * The final exam for a module — separate from the per-lesson quizzes, and
 * bigger: it is what a certificate is issued against.
 */
export const moduleQuestionsTable = pgTable("module_questions", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id),
  question: text("question").notNull(),
  questionUz: text("question_uz"),
  questionRu: text("question_ru"),
  options: jsonb("options").notNull().$type<string[]>(),
  optionsUz: jsonb("options_uz").$type<string[]>(),
  optionsRu: jsonb("options_ru").$type<string[]>(),
  correctOption: integer("correct_option").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
}, table => [
  index("module_questions_module_id_idx").on(table.moduleId),
]);

/** One row per learner per module, tracking exam sessions and the best score. */
export const moduleExamAttemptsTable = pgTable("module_exam_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id),
  attemptCount: integer("attempt_count").notNull().default(0),
  examSessionId: text("exam_session_id"),
  examStartedAt: timestamp("exam_started_at", { withTimezone: true }),
  // Percentage, 0-100. Kept as the best result so a retake cannot lose a pass.
  bestScore: integer("best_score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  passedAt: timestamp("passed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("module_exam_attempts_user_module_idx").on(table.userId, table.moduleId),
  index("module_exam_attempts_module_id_idx").on(table.moduleId),
]);

/**
 * A certificate issued after passing a module's exam.
 *
 * `fullName` is what gets printed — the learner supplies the name exactly as it
 * appears on their passport, because a certificate with a nickname on it is not
 * worth anything to them. `serial` is the public code for verifying one.
 */
export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  serial: text("serial").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id),
  fullName: text("full_name").notNull(),
  score: integer("score").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // One certificate per learner per module; a retake updates the score instead
  // of minting a second one.
  uniqueIndex("certificates_user_module_idx").on(table.userId, table.moduleId),
  index("certificates_module_id_idx").on(table.moduleId),
]);

/**
 * A program diploma: issued once a learner has earned a certificate in every
 * published module. Where a certificate proves one course, the diploma proves
 * the whole six-month path — it is the headline credential of the platform, the
 * thing a learner shows an employer.
 *
 * One per learner (there is only one program), so it is keyed on userId alone.
 * `averageScore` is the mean of the module exam scores at issue time, so the
 * diploma carries a single number that stands for the whole journey.
 */
export const programDiplomasTable = pgTable("program_diplomas", {
  id: serial("id").primaryKey(),
  serial: text("serial").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  fullName: text("full_name").notNull(),
  averageScore: integer("average_score").notNull(),
  moduleCount: integer("module_count").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
export type LessonQuestion = typeof lessonQuestionsTable.$inferSelect;
export type UserLessonAttempt = typeof userLessonAttemptsTable.$inferSelect;
export type LearnCategory = typeof learnCategoriesTable.$inferSelect;
export type LearnModule = typeof modulesTable.$inferSelect;
export type ModuleQuestion = typeof moduleQuestionsTable.$inferSelect;
export type ModuleExamAttempt = typeof moduleExamAttemptsTable.$inferSelect;
export type Certificate = typeof certificatesTable.$inferSelect;
export type ProgramDiploma = typeof programDiplomasTable.$inferSelect;
