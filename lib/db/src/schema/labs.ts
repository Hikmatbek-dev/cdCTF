import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ctfTasksTable } from "./ctf";

/**
 * Hands-on labs: a vulnerable machine a learner starts, attacks, and throws
 * away. This is the one thing the platform was missing next to TryHackMe and
 * HackTheBox — static challenges teach the idea, a live target teaches the job.
 *
 * The API cannot run containers itself (it is serverless), so a lab is a
 * *definition* here and the actual container is started by a separate runner
 * service on a host that has Docker. See artifacts/lab-runner.
 */
export const labsTable = pgTable("labs", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameUz: text("name_uz"),
  nameRu: text("name_ru"),
  description: text("description").notNull(),
  descriptionUz: text("description_uz"),
  descriptionRu: text("description_ru"),
  /** Docker image the runner starts, e.g. "vulnerables/web-dvwa". */
  image: text("image").notNull(),
  /** Port inside the container the learner connects to. */
  containerPort: integer("container_port").notNull().default(80),
  /** How long one instance may live before it is reaped, in minutes. */
  ttlMinutes: integer("ttl_minutes").notNull().default(60),
  difficulty: text("difficulty").notNull().default("easy"),
  /** Optional: the challenge this lab belongs to, so the flag is submitted there. */
  ctfId: integer("ctf_id").references(() => ctfTasksTable.id, { onDelete: "set null" }),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("labs_published_idx").on(table.isPublished),
]);

/**
 * One learner's running machine.
 *
 * A user may hold exactly one running instance at a time — enforced by a
 * partial unique index rather than a check in the handler, so two concurrent
 * "Start" clicks cannot both win and strand a container nobody is tracking.
 */
export const labInstancesTable = pgTable("lab_instances", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").notNull().references(() => labsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  /** The runner's own id for the container, used to stop it again. */
  containerId: text("container_id").notNull(),
  /** Where the learner points their tools. */
  host: text("host").notNull(),
  port: integer("port").notNull(),
  /** running | stopped — stopped rows are kept as history. */
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
}, table => [
  index("lab_instances_user_idx").on(table.userId),
  index("lab_instances_status_idx").on(table.status),
]);

export type Lab = typeof labsTable.$inferSelect;
export type LabInstance = typeof labInstancesTable.$inferSelect;
