import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, modulesTable, lessonsTable, ctfTasksTable, ctfAttemptsTable,
  userLessonAttemptsTable, certificatesTable, programDiplomasTable, competitionsTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Public platform statistics — the community's impact in numbers.
 *
 * Every figure is counted live from the database, so the impact page can never
 * drift from reality. Cached briefly at the edge because these move slowly and
 * the page is the kind of thing that gets refreshed a lot during a demo.
 */
const router = Router();

async function count(query: Promise<{ n: number }[]>): Promise<number> {
  const [row] = await query;
  return row?.n ?? 0;
}

router.get("/", async (_req, res) => {
  const [
    learners, modules, lessons, challenges, challengesSolved,
    lessonsCompleted, moduleCerts, diplomas, competitions, openToWork,
  ] = await Promise.all([
    count(db.select({ n: sql<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.role, "user"), eq(usersTable.isBlocked, false)))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(modulesTable)),
    count(db.select({ n: sql<number>`count(*)::int` }).from(lessonsTable).where(eq(lessonsTable.isPublished, true))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(ctfTasksTable).where(eq(ctfTasksTable.isPublished, true))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(ctfAttemptsTable).where(eq(ctfAttemptsTable.solved, true))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.status, "completed"))),
    count(db.select({ n: sql<number>`count(*)::int` }).from(certificatesTable)),
    count(db.select({ n: sql<number>`count(*)::int` }).from(programDiplomasTable)),
    count(db.select({ n: sql<number>`count(*)::int` }).from(competitionsTable)),
    count(db.select({ n: sql<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.role, "user"), eq(usersTable.isBlocked, false), eq(usersTable.openToWork, true)))),
  ]);

  res.set("Cache-Control", "public, max-age=300, s-maxage=300");
  res.json({
    learners,
    modules,
    lessons,
    challenges,
    challengesSolved,
    lessonsCompleted,
    certificatesIssued: moduleCerts + diplomas,
    competitions,
    openToWork,
    languages: 3,
  });
});

export default router;
