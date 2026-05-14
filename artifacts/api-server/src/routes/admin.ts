import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable, ctfTasksTable, ctfAttemptsTable,
  lessonsTable, lessonQuestionsTable, learnCategoriesTable,
  competitionsTable, competitionTasksTable, competitionUsersTable,
  userLessonAttemptsTable, titlesTable, auditLogsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { writeAuditLog } from "../lib/audit";
import { hashFlag } from "../lib/flags";
import { logger } from "../lib/logger";

const router = Router();
router.use(authenticateToken, requireAdmin);

// GET /api/admin/dashboard
router.get("/dashboard", async (_req, res) => {
  const [users, ctfs, lessons, competitions, titles] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(ctfTasksTable),
    db.select().from(lessonsTable),
    db.select().from(competitionsTable),
    db.select().from(titlesTable),
  ]);

  const activeUsers = users.filter(u => !u.isBlocked).length;
  const blockedCtf = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.blocked, true));
  const blockedLessons = await db.select().from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.blocked, true));
  const completedLessons = await db.select().from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.status, "completed"));

  // Average test result (approximate via completion ratio)
  const allAttempts = await db.select().from(userLessonAttemptsTable);
  const avgResult = allAttempts.length > 0 ? completedLessons.length / allAttempts.length : 0;

  // Most solved CTF
  const allSolves = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.solved, true));
  const solveMap = new Map<number, number>();
  for (const s of allSolves) solveMap.set(s.ctfId, (solveMap.get(s.ctfId) ?? 0) + 1);

  const mostSolvedCtf = ctfs
    .map(ch => ({ id: ch.id, name: ch.name, solvedCount: solveMap.get(ch.id) ?? 0 }))
    .sort((a, b) => b.solvedCount - a.solvedCount)
    .slice(0, 5);

  const mostActiveUsers = [...users]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(u => ({ id: u.id, nickname: u.nickname, points: u.points }));

  res.json({
    totalUsers: users.length,
    activeUsers,
    totalCtf: ctfs.length,
    totalLessons: lessons.length,
    totalCompetitions: competitions.length,
    averageTestResult: avgResult,
    blockedTasksCount: blockedCtf.length + blockedLessons.length,
    mostSolvedCtf,
    mostActiveUsers,
  });
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const { search } = req.query as { search?: string };
  let users = await db.select().from(usersTable);
  if (search) users = users.filter(u => u.nickname.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  users = users.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json({ users: users.map(u => ({ id: u.id, nickname: u.nickname, email: u.email, points: u.points, role: u.role, isBlocked: u.isBlocked, createdAt: u.createdAt })), total: users.length });
});

// GET /api/admin/audit-logs
router.get("/audit-logs", async (_req, res) => {
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(200);
  res.json({
    logs: logs.map(log => ({
      id: log.id,
      actorUserId: log.actorUserId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    })),
  });
});

// POST /api/admin/users/:id/block
router.post("/users/:id/block", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });
  await db.update(usersTable).set({ isBlocked: true }).where(eq(usersTable.id, id));
  await writeAuditLog(req, "user.block", "user", id);
  res.json({ success: true, message: "User blocked" });
});

// POST /api/admin/users/:id/unblock
router.post("/users/:id/unblock", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });
  await db.update(usersTable).set({ isBlocked: false }).where(eq(usersTable.id, id));
  await writeAuditLog(req, "user.unblock", "user", id);
  res.json({ success: true, message: "User unblocked" });
});

// POST /api/admin/ctf
router.post("/ctf", async (req, res) => {
  const { name, nameUz, nameRu, description, descriptionUz, descriptionRu, category, difficulty, points, hint, flag, fileUrl } = req.body;
  if (!name || !description || !category || !difficulty || !points || !flag) return res.status(400).json({ error: "Missing required fields" });
  const [task] = await db.insert(ctfTasksTable).values({
    name, nameUz, nameRu, description, descriptionUz, descriptionRu,
    category, difficulty, points: Number(points), hint, flag: hashFlag(String(flag)), fileUrl,
    hintCost: 10,
  }).returning();
  await writeAuditLog(req, "ctf.create", "ctf", task.id, { name: task.name, category: task.category, difficulty: task.difficulty });
  res.status(201).json(task);
});

// PATCH /api/admin/ctf/:id
async function updateCtfHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { name, nameUz, nameRu, description, descriptionUz, descriptionRu, category, difficulty, points, hint, flag, fileUrl } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (nameUz !== undefined) updates.nameUz = nameUz;
  if (nameRu !== undefined) updates.nameRu = nameRu;
  if (description !== undefined) updates.description = description;
  if (descriptionUz !== undefined) updates.descriptionUz = descriptionUz;
  if (descriptionRu !== undefined) updates.descriptionRu = descriptionRu;
  if (category !== undefined) updates.category = category;
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (points !== undefined) updates.points = Number(points);
  if (hint !== undefined) updates.hint = hint;
  if (flag && flag.trim()) updates.flag = hashFlag(String(flag));
  if (fileUrl !== undefined) updates.fileUrl = fileUrl;
  const [updated] = await db.update(ctfTasksTable).set(updates).where(eq(ctfTasksTable.id, id)).returning();
  await writeAuditLog(req, "ctf.update", "ctf", id, { fields: Object.keys(updates).filter(field => field !== "flag") });
  res.json(updated);
}

router.patch("/ctf/:id", updateCtfHandler);
router.put("/ctf/:id", updateCtfHandler);

// DELETE /api/admin/ctf/:id
router.delete("/ctf/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid CTF id" });

  try {
    // 1. Get the challenge to know its points
    const [challenge] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, id)).limit(1);
    if (!challenge) return res.status(404).json({ error: "CTF not found" });

    // 2. Find all users who solved this challenge
    const solvers = await db.select()
      .from(ctfAttemptsTable)
      .where(and(eq(ctfAttemptsTable.ctfId, id), eq(ctfAttemptsTable.solved, true)));

    // 3. Deduct points from each solver
    if (solvers.length > 0) {
      const solverIds = solvers.map(s => s.userId);
      await db.update(usersTable)
        .set({ points: sql`GREATEST(${usersTable.points} - ${challenge.points}, 0)` })
        .where(inArray(usersTable.id, solverIds));
    }

    // 4. Delete related attempts and then the task
    await db.delete(ctfAttemptsTable).where(eq(ctfAttemptsTable.ctfId, id));
    await db.delete(ctfTasksTable).where(eq(ctfTasksTable.id, id));

    await writeAuditLog(req, "ctf.delete", "ctf", id, { 
      name: challenge.name, 
      pointsDeducted: challenge.points, 
      solverCount: solvers.length 
    });

    res.json({ success: true, message: "CTF deleted and user points updated" });
  } catch (error) {
    logger.error({ err: error }, "Error deleting CTF and updating points");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/ctf/:id/unblock-user
async function unblockCtfUserHandler(req: Request, res: Response) {
  const ctfId = Number(req.params.id);
  const userId = Number(req.params.userId ?? req.body.userId);
  if (!Number.isInteger(ctfId) || !Number.isInteger(userId)) return res.status(400).json({ error: "Invalid id" });
  await db.update(ctfAttemptsTable).set({ blocked: false, wrongAttempts: 0, blockedAt: null, updatedAt: new Date() })
    .where(and(eq(ctfAttemptsTable.ctfId, ctfId), eq(ctfAttemptsTable.userId, userId)));
  await writeAuditLog(req, "ctf.unblock_user", "ctf", ctfId, { userId });
  res.json({ success: true, message: "CTF user unblocked" });
}

router.post("/ctf/:id/unblock-user", unblockCtfUserHandler);
router.post("/ctf/:id/unblock-user/:userId", unblockCtfUserHandler);

// GET /api/admin/blocked
router.get("/blocked", async (_req, res) => {
  const blockedCtf = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.blocked, true));
  const users = await db.select().from(usersTable);
  const ctfs = await db.select().from(ctfTasksTable);

  const blockedCtfResult = blockedCtf.map(a => {
    const user = users.find(u => u.id === a.userId);
    const ctf = ctfs.find(c => c.id === a.ctfId);
    return {
      userId: a.userId, ctfId: a.ctfId,
      nickname: user?.nickname ?? "Unknown",
      ctfName: ctf?.name ?? "Unknown",
      reason: "3 wrong flag attempts",
      blockedAt: a.blockedAt?.toISOString() ?? a.updatedAt.toISOString(),
    };
  });

  const blockedLessons = await db.select().from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.blocked, true));
  const lessons = await db.select().from(lessonsTable);

  const blockedLessonResult = blockedLessons.map(a => {
    const user = users.find(u => u.id === a.userId);
    const lesson = lessons.find(l => l.id === a.lessonId);
    return {
      userId: a.userId, lessonId: a.lessonId,
      nickname: user?.nickname ?? "Unknown",
      lessonTitle: lesson?.title ?? "Unknown",
      reason: "3 fullscreen exits during test",
      blockedAt: a.blockedAt?.toISOString() ?? a.updatedAt.toISOString(),
    };
  });

  res.json({ blockedCtf: blockedCtfResult, blockedLessons: blockedLessonResult });
});

router.get("/blocked-tasks", async (_req, res) => {
  const blockedCtf = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.blocked, true));
  const users = await db.select().from(usersTable);
  const ctfs = await db.select().from(ctfTasksTable);
  const blockedLessons = await db.select().from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.blocked, true));
  const lessons = await db.select().from(lessonsTable);

  res.json({
    blockedCtf: blockedCtf.map(a => {
      const user = users.find(u => u.id === a.userId);
      const ctf = ctfs.find(c => c.id === a.ctfId);
      return {
        userId: a.userId,
        ctfId: a.ctfId,
        nickname: user?.nickname ?? "Unknown",
        ctfName: ctf?.name ?? "Unknown",
        reason: "3 wrong flag attempts",
        blockedAt: a.blockedAt?.toISOString() ?? a.updatedAt.toISOString(),
      };
    }),
    blockedLessons: blockedLessons.map(a => {
      const user = users.find(u => u.id === a.userId);
      const lesson = lessons.find(l => l.id === a.lessonId);
      return {
        userId: a.userId,
        lessonId: a.lessonId,
        nickname: user?.nickname ?? "Unknown",
        lessonTitle: lesson?.title ?? "Unknown",
        reason: "3 fullscreen exits during test",
        blockedAt: a.blockedAt?.toISOString() ?? a.updatedAt.toISOString(),
      };
    }),
  });
});

// POST /api/admin/unblock
async function unblockTaskHandler(req: Request, res: Response) {
  const type = String(req.params.type ?? req.body.type);
  const taskId = Number(req.params.taskId ?? req.body.taskId);
  const userId = Number(req.params.userId ?? req.body.userId);

  if (type === "lesson") {
    await db.update(userLessonAttemptsTable).set({ blocked: false, escapeCount: 0, blockedAt: null, status: "not_started", updatedAt: new Date() })
      .where(and(eq(userLessonAttemptsTable.lessonId, taskId), eq(userLessonAttemptsTable.userId, userId)));
  } else if (type === "ctf") {
    await db.update(ctfAttemptsTable).set({ blocked: false, wrongAttempts: 0, blockedAt: null, updatedAt: new Date() })
      .where(and(eq(ctfAttemptsTable.ctfId, taskId), eq(ctfAttemptsTable.userId, userId)));
  } else {
    return res.status(400).json({ error: "Unknown task type" });
  }
  await writeAuditLog(req, "task.unblock", type, taskId, { userId });
  res.json({ success: true, message: "Task unblocked" });
}

router.post("/unblock", unblockTaskHandler);
router.post("/blocked-tasks/:type/:taskId/unblock/:userId", unblockTaskHandler);

// POST /api/admin/competitions
router.post("/competitions", async (req, res) => {
  const { name, description, type, startTime, endTime, ctfIds, inviteCode } = req.body;
  if (!name || !startTime || !endTime) return res.status(400).json({ error: "Missing fields" });
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "Invalid competition time range" });
  }
  const normalizedType = type === "private" ? "private" : "public";
  const normalizedInviteCode = normalizedType === "private"
    ? String(inviteCode || randomUUID().slice(0, 8)).trim()
    : null;

  const [comp] = await db.insert(competitionsTable).values({
    name, description: description || null, type: normalizedType, inviteCode: normalizedInviteCode,
    startTime: start, endTime: end,
  }).returning();

  if (ctfIds && Array.isArray(ctfIds)) {
    for (const ctfId of ctfIds) {
      await db.insert(competitionTasksTable).values({ competitionId: comp.id, ctfId: Number(ctfId) });
    }
  }

  await writeAuditLog(req, "competition.create", "competition", comp.id, { type: comp.type, ctfCount: Array.isArray(ctfIds) ? ctfIds.length : 0 });
  res.status(201).json(comp);
});

// PATCH /api/admin/competitions/:id
async function updateCompetitionHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { name, description, type, startTime, endTime, inviteCode } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (type) updates.type = type === "private" ? "private" : "public";
  if (inviteCode !== undefined) updates.inviteCode = String(inviteCode).trim() || null;
  if (startTime) {
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start time" });
    updates.startTime = start;
  }
  if (endTime) {
    const end = new Date(endTime);
    if (Number.isNaN(end.getTime())) return res.status(400).json({ error: "Invalid end time" });
    updates.endTime = end;
  }
  const [updated] = await db.update(competitionsTable).set(updates).where(eq(competitionsTable.id, id)).returning();
  await writeAuditLog(req, "competition.update", "competition", id, { fields: Object.keys(updates) });
  res.json(updated);
}

router.patch("/competitions/:id", updateCompetitionHandler);
router.put("/competitions/:id", updateCompetitionHandler);

// POST /api/admin/competitions/:id/users
async function addCompetitionUserHandler(req: Request, res: Response) {
  const compId = Number(req.params.id);
  const userId = Number(req.params.userId ?? req.body.userId);
  const [existing] = await db.select().from(competitionUsersTable)
    .where(and(eq(competitionUsersTable.competitionId, compId), eq(competitionUsersTable.userId, userId))).limit(1);
  if (!existing) {
    await db.insert(competitionUsersTable).values({ competitionId: compId, userId });
  }
  await writeAuditLog(req, "competition.add_user", "competition", compId, { userId });
  res.json({ success: true, message: "User added to competition" });
}

router.post("/competitions/:id/users", addCompetitionUserHandler);
router.post("/competitions/:id/users/:userId", addCompetitionUserHandler);

// POST /api/admin/lessons
router.post("/lessons", async (req, res) => {
  const { title, titleUz, titleRu, content, contentUz, contentRu, categoryId, points, questions } = req.body;
  if (!title || !content || !categoryId) return res.status(400).json({ error: "Missing fields" });

  // Ensure category exists
  let [category] = await db.select().from(learnCategoriesTable).where(eq(learnCategoriesTable.id, Number(categoryId))).limit(1);
  if (!category) {
    // Create a default category if none exist
    const [created] = await db.insert(learnCategoriesTable).values({ name: "General" }).returning();
    category = created;
  }

  const [lesson] = await db.insert(lessonsTable).values({
    title, titleUz: titleUz || null, titleRu: titleRu || null,
    content, contentUz: contentUz || null, contentRu: contentRu || null,
    categoryId: category.id, points: Number(points) || 50,
  }).returning();

  if (questions && Array.isArray(questions)) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.insert(lessonQuestionsTable).values({
        lessonId: lesson.id, question: q.question, questionUz: q.questionUz || null, questionRu: q.questionRu || null,
        options: q.options, optionsUz: q.optionsUz || null, optionsRu: q.optionsRu || null,
        correctOption: Number(q.correctOption), orderIndex: i,
      });
    }
  }

  await writeAuditLog(req, "lesson.create", "lesson", lesson.id, { title: lesson.title });
  res.status(201).json(lesson);
});

// PATCH /api/admin/lessons/:id
async function updateLessonHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { title, titleUz, titleRu, content, contentUz, contentRu, categoryId, points, questions } = req.body;
  const updates: Record<string, unknown> = {};
  if (title) updates.title = title;
  if (titleUz !== undefined) updates.titleUz = titleUz || null;
  if (titleRu !== undefined) updates.titleRu = titleRu || null;
  if (content) updates.content = content;
  if (contentUz !== undefined) updates.contentUz = contentUz || null;
  if (contentRu !== undefined) updates.contentRu = contentRu || null;
  if (categoryId) updates.categoryId = Number(categoryId);
  if (points) updates.points = Number(points);
  const [updated] = await db.update(lessonsTable).set(updates).where(eq(lessonsTable.id, id)).returning();

  if (questions && Array.isArray(questions)) {
    await db.delete(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, id));
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.insert(lessonQuestionsTable).values({
        lessonId: id, question: q.question, options: q.options,
        correctOption: Number(q.correctOption), orderIndex: i,
      });
    }
  }

  await writeAuditLog(req, "lesson.update", "lesson", id, { fields: Object.keys(updates), questionsUpdated: Array.isArray(questions) });
  res.json(updated);
}

router.patch("/lessons/:id", updateLessonHandler);
router.put("/lessons/:id", updateLessonHandler);

// DELETE /api/admin/lessons/:id
router.delete("/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, id));
  await db.delete(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.lessonId, id));
  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
  await writeAuditLog(req, "lesson.delete", "lesson", id);
  res.json({ success: true, message: "Lesson deleted" });
});

export default router;
