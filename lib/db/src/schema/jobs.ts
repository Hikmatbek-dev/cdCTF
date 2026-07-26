import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * The job board — the paid end of the talent pipeline. An employer posts a
 * role; candidates apply on-platform (see jobApplicationsTable) so the employer
 * sees each applicant's proven cdCTF record, or off-platform via an apply URL.
 */
export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  // Snapshotted from the employer at post time so a later company rename does
  // not silently rewrite old listings.
  company: text("company").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  // full_time | part_time | internship | contract — free text, validated at the
  // API boundary rather than as a DB enum so new types don't need a migration.
  employmentType: text("employment_type").notNull().default("full_time"),
  applyUrl: text("apply_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  // The public board's filter and sort: active jobs, newest first.
  index("jobs_active_created_idx").on(table.isActive, table.createdAt),
  index("jobs_employer_id_idx").on(table.employerId),
]);

export type Job = typeof jobsTable.$inferSelect;

/**
 * On-platform job applications — the tight end of the learn→hire loop. A learner
 * applies with a short note and their cdCTF record (level, solves, skills) comes
 * with it, so the employer sees proven ability, not just a CV. One application
 * per learner per job.
 */
export const jobApplicationsTable = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("job_applications_job_user_idx").on(table.jobId, table.userId),
  index("job_applications_job_id_idx").on(table.jobId),
  index("job_applications_user_id_idx").on(table.userId),
]);

export type JobApplication = typeof jobApplicationsTable.$inferSelect;
