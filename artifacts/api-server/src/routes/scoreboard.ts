import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ctfAttemptsTable, userLessonAttemptsTable, userTitlesTable, titlesTable } from "@workspace/db/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { optionalAuth, requireScope } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, requireScope("scoreboard:read"), async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const currentUserId = req.user?.userId;

  let query = db.select().from(usersTable).where(
    and(
      eq(usersTable.isBlocked, false),
      eq(usersTable.role, "user"),
      search ? or(
        like(usersTable.nickname, `%${search}%`),
        like(usersTable.email, `%${search}%`)
      ) : undefined
    )
  );

  const allFilteredUsers = await query;
  const total = allFilteredUsers.length;
  
  const users = allFilteredUsers
    .sort((a, b) => b.points - a.points)
    .slice((page - 1) * limit, page * limit);

  const allCtfSolves = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.solved, true));
  const allLessonCompletes = await db.select().from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.status, "completed"));
  const allTitles = await db.select({
    userId: userTitlesTable.userId,
    titleName: titlesTable.name,
  }).from(userTitlesTable).leftJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id));

  const solvesMap = new Map<number, number>();
  for (const a of allCtfSolves) solvesMap.set(a.userId, (solvesMap.get(a.userId) ?? 0) + 1);

  const lessonsMap = new Map<number, number>();
  for (const a of allLessonCompletes) lessonsMap.set(a.userId, (lessonsMap.get(a.userId) ?? 0) + 1);

  const titlesMap = new Map<number, string[]>();
  for (const t of allTitles) {
    if (!titlesMap.has(t.userId)) titlesMap.set(t.userId, []);
    if (t.titleName) titlesMap.get(t.userId)!.push(t.titleName);
  }

  const entries = users.map((u, i) => ({
    rank: (page - 1) * limit + i + 1,
    userId: u.id,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl,
    points: u.points,
    solvedCtfCount: solvesMap.get(u.id) ?? 0,
    completedLessonsCount: lessonsMap.get(u.id) ?? 0,
    titles: titlesMap.get(u.id) ?? [],
  }));

  let currentUserRank: number | undefined;
  if (currentUserId) {
    const allSorted = (await db.select().from(usersTable).where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user"))))
      .sort((a, b) => b.points - a.points);
    const idx = allSorted.findIndex(u => u.id === currentUserId);
    if (idx !== -1) currentUserRank = idx + 1;
  }

  res.json({ 
    entries, 
    total, 
    currentUserRank,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  });
});

export default router;
