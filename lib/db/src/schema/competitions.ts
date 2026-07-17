import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ctfTasksTable } from "./ctf";

export const competitionsTable = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("public"),
  inviteCode: text("invite_code"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // Declared here at last. ensureDatabaseShape() created this index while the
  // schema knew nothing about it, so every `drizzle-kit push` dropped it again
  // and the next cold start recreated it — with a window in between where two
  // competitions could take the same invite code.
  uniqueIndex("competitions_invite_code_idx").on(table.inviteCode).where(sql`invite_code IS NOT NULL`),
]);

export const competitionTasksTable = pgTable("competition_tasks", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  ctfId: integer("ctf_id").notNull().references(() => ctfTasksTable.id),
}, table => [
  uniqueIndex("competition_tasks_competition_ctf_idx").on(table.competitionId, table.ctfId),
]);

export const competitionUsersTable = pgTable("competition_users", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // Membership is checked on every competition flag submit.
  uniqueIndex("competition_users_competition_user_idx").on(table.competitionId, table.userId),
  index("competition_users_user_id_idx").on(table.userId),
]);

export const competitionSolvesTable = pgTable("competition_solves", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitionsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  ctfId: integer("ctf_id").notNull().references(() => ctfTasksTable.id),
  pointsEarned: integer("points_earned").notNull().default(0),
  solvedAt: timestamp("solved_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // The already-solved check the submit path locks on. Unique because a second
  // row for the same (competition, challenge, user) is the double-score bug.
  uniqueIndex("competition_solves_competition_ctf_user_idx").on(table.competitionId, table.ctfId, table.userId),
  index("competition_solves_competition_id_idx").on(table.competitionId),
]);

export const insertCompetitionSchema = createInsertSchema(competitionsTable).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitionsTable.$inferSelect;
export type CompetitionTask = typeof competitionTasksTable.$inferSelect;
export type CompetitionUser = typeof competitionUsersTable.$inferSelect;
