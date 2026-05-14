import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { db } from "@workspace/db";
import {
  usersTable, ctfAttemptsTable, ctfTasksTable, userLessonAttemptsTable,
  lessonsTable, competitionUsersTable, competitionsTable, competitionSolvesTable,
  userTitlesTable, titlesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { uploadBufferToStorage } from "../lib/storage";
import { logger } from "../lib/logger";

const router = Router();

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (Object.hasOwn(AVATAR_EXTENSIONS, file.mimetype)) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

router.get("/me/dashboard", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [solvedCtf, completedLessons, allUsers, titles] = await Promise.all([
    db.select().from(ctfAttemptsTable).where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.solved, true))),
    db.select().from(userLessonAttemptsTable).where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed"))),
    db.select().from(usersTable).where(eq(usersTable.isBlocked, false)),
    db.select({ id: titlesTable.id, name: titlesTable.name, category: titlesTable.category, earnedAt: userTitlesTable.earnedAt })
      .from(userTitlesTable)
      .leftJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
      .where(eq(userTitlesTable.userId, userId)),
  ]);

  const rank = [...allUsers].sort((a, b) => b.points - a.points).findIndex(item => item.id === userId) + 1;

  res.json({
    user: { id: user.id, nickname: user.nickname, points: user.points, rank },
    progress: {
      solvedCtfCount: solvedCtf.length,
      completedLessonCount: completedLessons.length,
      titleCount: titles.length,
    },
    recent: {
      solvedCtf: solvedCtf.slice(-5).reverse().map(item => ({ ctfId: item.ctfId, solvedAt: item.solvedAt })),
      completedLessons: completedLessons.slice(-5).reverse().map(item => ({ lessonId: item.lessonId, completedAt: item.completedAt })),
    },
    titles: titles.map(item => ({ id: item.id, name: item.name, category: item.category, earnedAt: item.earnedAt })),
  });
});

// Shared profile fetching logic
async function getProfileData(id: number, requestingUserId?: number, requestingUserRole?: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return null;

  // Get rank
  const allUsers = await db.select().from(usersTable).where(eq(usersTable.isBlocked, false));
  const sorted = allUsers.sort((a, b) => b.points - a.points);
  const rank = sorted.findIndex(u => u.id === id) + 1;

  // Solved CTF
  const solvedAttempts = await db.select().from(ctfAttemptsTable).where(and(eq(ctfAttemptsTable.userId, id), eq(ctfAttemptsTable.solved, true)));
  const solvedCtf = [];
  for (const a of solvedAttempts) {
    const [ch] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, a.ctfId)).limit(1);
    if (ch) solvedCtf.push({ id: ch.id, name: ch.name, category: ch.category, points: ch.points, solvedAt: a.solvedAt });
  }

  // Completed lessons
  const completedAttempts = await db.select().from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, id), eq(userLessonAttemptsTable.status, "completed")));
  const completedLessons = [];
  for (const a of completedAttempts) {
    const [l] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, a.lessonId)).limit(1);
    if (l) completedLessons.push({ id: l.id, title: l.title, points: l.points, completedAt: a.completedAt });
  }

  // Titles
  const userTitles = await db.select({ id: titlesTable.id, name: titlesTable.name, category: titlesTable.category, points: titlesTable.points, earnedAt: userTitlesTable.earnedAt })
    .from(userTitlesTable).leftJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
    .where(eq(userTitlesTable.userId, id));

  // Competition history
  const compParticipations = await db.select().from(competitionUsersTable).where(eq(competitionUsersTable.userId, id));
  const competitionHistory = [];
  for (const p of compParticipations) {
    const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, p.competitionId)).limit(1);
    if (!comp) continue;
    const solves = await db.select().from(competitionSolvesTable)
      .where(and(eq(competitionSolvesTable.competitionId, p.competitionId), eq(competitionSolvesTable.userId, id)));
    const points = solves.reduce((s, solve) => s + solve.pointsEarned, 0);

    // Get rank in competition
    const allSolves = await db.select().from(competitionSolvesTable).where(eq(competitionSolvesTable.competitionId, p.competitionId));
    const userPoints = new Map<number, number>();
    for (const s of allSolves) userPoints.set(s.userId, (userPoints.get(s.userId) ?? 0) + s.pointsEarned);
    const sortedPoints = [...userPoints.entries()].sort((a, b) => b[1] - a[1]);
    const compRank = sortedPoints.findIndex(e => e[0] === id) + 1;

    competitionHistory.push({ competitionId: comp.id, competitionName: comp.name, points, rank: compRank || compParticipations.length });
  }

  const canViewPrivate = requestingUserId === id || requestingUserRole === "admin";

  return {
    id: user.id, nickname: user.nickname, email: canViewPrivate ? user.email : "", avatarUrl: user.avatarUrl,
    points: user.points, role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked,
    createdAt: user.createdAt, rank,
    titles: userTitles.map(t => ({ id: t.id ?? 0, name: t.name ?? "Title", category: t.category ?? "Misc", points: t.points ?? 0, earnedAt: t.earnedAt })),
    solvedCtf, completedLessons, competitionHistory,
  };
}

// GET /api/users/me/profile
router.get("/me/profile", authenticateToken, async (req, res) => {
  try {
    const data = await getProfileData(req.user!.userId, req.user!.userId, req.user!.role);
    if (!data) return res.status(404).json({ error: "User not found" });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Error fetching me/profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const data = await getProfileData(id, req.user?.userId, req.user?.role);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Error fetching user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/:id
router.patch("/:id", authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (req.user!.userId !== id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { nickname } = req.body;
  const updates: { nickname?: string } = {};
  if (typeof nickname === "string") {
    const normalizedNickname = nickname.trim();
    if (normalizedNickname.length < 3 || normalizedNickname.length > 32 || !/^[A-Za-z0-9_]+$/.test(normalizedNickname)) {
      return res.status(400).json({ error: "Nickname must be 3-32 chars and use only letters, numbers, or underscores" });
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.nickname, normalizedNickname)).limit(1);
    if (existing && existing.id !== id) return res.status(409).json({ error: "Nickname taken" });
    updates.nickname = normalizedNickname;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json({ id: updated.id, nickname: updated.nickname, email: updated.email, avatarUrl: updated.avatarUrl, points: updated.points, role: updated.role, emailVerified: updated.emailVerified, isBlocked: updated.isBlocked, createdAt: updated.createdAt });
});

// POST /api/users/:id/avatar
router.post("/:id/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
  const id = Number(req.params.id);
  if (req.user!.userId !== id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = AVATAR_EXTENSIONS[req.file.mimetype] ?? ".bin";
  const uploadResult = await uploadBufferToStorage({
    folder: "avatars",
    filename: `${randomUUID()}${ext}`,
    contentType: req.file.mimetype,
    buffer: req.file.buffer,
  });
  const avatarUrl = uploadResult.publicUrl;
  const [updated] = await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, id)).returning();
  res.json({ avatarUrl: updated.avatarUrl });
});

// DELETE /api/users/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (req.user!.userId !== id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Cleanup
  await db.delete(ctfAttemptsTable).where(eq(ctfAttemptsTable.userId, id));
  await db.delete(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.userId, id));
  await db.delete(userTitlesTable).where(eq(userTitlesTable.userId, id));
  await db.delete(competitionUsersTable).where(eq(competitionUsersTable.userId, id));
  
  await db.delete(usersTable).where(eq(usersTable.id, id));

  res.json({ success: true, message: "Account deleted" });
});

export default router;
