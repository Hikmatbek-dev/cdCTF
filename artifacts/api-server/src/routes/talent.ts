import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ctfAttemptsTable, userLessonAttemptsTable, userTitlesTable, titlesTable } from "@workspace/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

const router = Router();

/**
 * The employer-facing side of the talent pipeline: a directory of the learners
 * who have flagged themselves open to work, ranked by points, with the signal a
 * recruiter actually reads — how much they have solved, how many lessons they
 * have finished, and what titles they hold.
 *
 * Public and read-only. It exposes nothing a profile page does not already show
 * to a logged-in visitor; it only gathers the opted-in users into one place.
 */
router.get("/", async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 100);
  const offset = (page - 1) * limit;

  const filter = and(
    eq(usersTable.isBlocked, false),
    eq(usersTable.role, "user"),
    eq(usersTable.openToWork, true),
  );

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: usersTable.id,
      nickname: usersTable.nickname,
      avatarUrl: usersTable.avatarUrl,
      points: usersTable.points,
    })
      .from(usersTable)
      .where(filter)
      .orderBy(desc(usersTable.points), usersTable.id)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(usersTable).where(filter),
  ]);

  const userIds = rows.map(row => row.id);

  // Counted per user in SQL, and only for the users on this page — the same
  // shape the scoreboard uses, so a big talent table never loads in memory.
  const [solveCounts, lessonCounts, titles] = userIds.length === 0
    ? [[], [], []]
    : await Promise.all([
      db.select({ userId: ctfAttemptsTable.userId, count: sql<number>`count(*)::int` })
        .from(ctfAttemptsTable)
        .where(and(inArray(ctfAttemptsTable.userId, userIds), eq(ctfAttemptsTable.solved, true)))
        .groupBy(ctfAttemptsTable.userId),
      db.select({ userId: userLessonAttemptsTable.userId, count: sql<number>`count(*)::int` })
        .from(userLessonAttemptsTable)
        .where(and(inArray(userLessonAttemptsTable.userId, userIds), eq(userLessonAttemptsTable.status, "completed")))
        .groupBy(userLessonAttemptsTable.userId),
      db.select({ userId: userTitlesTable.userId, titleName: titlesTable.name })
        .from(userTitlesTable)
        .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
        .where(inArray(userTitlesTable.userId, userIds)),
    ]);

  const solvesByUser = new Map(solveCounts.map(row => [row.userId, row.count]));
  const lessonsByUser = new Map(lessonCounts.map(row => [row.userId, row.count]));
  const titlesByUser = new Map<number, string[]>();
  for (const title of titles) {
    const list = titlesByUser.get(title.userId) ?? [];
    list.push(title.titleName);
    titlesByUser.set(title.userId, list);
  }

  const entries = rows.map(row => ({
    userId: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    points: row.points,
    solvedCtfCount: solvesByUser.get(row.id) ?? 0,
    completedLessonsCount: lessonsByUser.get(row.id) ?? 0,
    titles: titlesByUser.get(row.id) ?? [],
  }));

  res.json({ entries, total, page, limit });
});

export default router;
