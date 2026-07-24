import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * The job board — the paid end of the talent pipeline. An employer posts a
 * role; candidates browse them. Applications happen off-platform (an apply URL
 * or contact), so this stores the listing, not an application pipeline.
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
