import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable, ctfTasksTable, ctfAttemptsTable,
  lessonsTable, lessonQuestionsTable, learnCategoriesTable,
  competitionsTable, competitionTasksTable, competitionUsersTable, competitionSolvesTable,
  userLessonAttemptsTable, titlesTable, auditLogsTable, userTitlesTable
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { writeAuditLog } from "../lib/audit";
import { hashFlag } from "../lib/flags";
import { logger } from "../lib/logger";
import { filterAllowedUpdates } from "../lib/rbac";

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

  // Registration History (last 7 days)
  const now = new Date();
  const registrationHistory = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = users.filter(u => u.createdAt.toISOString().split("T")[0] === dateStr).length;
    return { date: dateStr, count };
  }).reverse();

  // Category Distribution
  const categoryMap = new Map<string, number>();
  for (const ch of ctfs) categoryMap.set(ch.category, (categoryMap.get(ch.category) ?? 0) + 1);
  const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

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
    registrationHistory,
    categoryDistribution,
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

// POST /api/admin/users/recalculate-points
router.post("/users/recalculate-points", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const titles = await db.select().from(titlesTable);
    const ctfs = await db.select().from(ctfTasksTable);

    for (const user of users) {
      // 1. Recalculate CTF solve points
      const ctfSolves = await db.select({ points: ctfTasksTable.points, category: ctfTasksTable.category })
        .from(ctfAttemptsTable)
        .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
        .where(and(eq(ctfAttemptsTable.userId, user.id), eq(ctfAttemptsTable.solved, true)));
      
      const ctfTotal = ctfSolves.reduce((sum, s) => sum + s.points, 0);

      // 2. Recalculate Lesson points
      const lessonSolves = await db.select({ points: lessonsTable.points })
        .from(userLessonAttemptsTable)
        .innerJoin(lessonsTable, eq(userLessonAttemptsTable.lessonId, lessonsTable.id))
        .where(and(eq(userLessonAttemptsTable.userId, user.id), eq(userLessonAttemptsTable.status, "completed")));
      
      const lessonTotal = lessonSolves.reduce((sum, s) => sum + s.points, 0);

      // 3. Recalculate Titles
      // First, get current titles for this user
      await db.delete(userTitlesTable).where(eq(userTitlesTable.userId, user.id));
      
      let titleTotal = 0;
      const categoryCounts = ctfSolves.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [category, count] of Object.entries(categoryCounts)) {
        if (count >= 3) {
          const title = titles.find(t => t.category === category);
          if (title) {
            await db.insert(userTitlesTable).values({ userId: user.id, titleId: title.id });
            titleTotal += title.points;
          }
        }
      }

      // 4. Update total points
      let total = ctfTotal + lessonTotal + titleTotal;
      if (user.role === "admin" || user.nickname === "bozkurtshadow") {
        total = 0;
      }
      await db.update(usersTable).set({ points: total }).where(eq(usersTable.id, user.id));
    }
    
    await writeAuditLog(req, "users.recalculate_points", "system", 0);
    res.json({ success: true, message: "All user points and titles have been fully synchronized with current data" });
  } catch (error) {
    logger.error({ err: error }, "Error recalculating user points");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/ctf
router.get("/ctf", async (_req, res) => {
  const challenges = await db.select().from(ctfTasksTable);
  const solves = await db.select({ ctfId: ctfAttemptsTable.ctfId }).from(ctfAttemptsTable).where(eq(ctfAttemptsTable.solved, true));
  const solveCounts = solves.reduce((acc, s) => {
    acc[s.ctfId] = (acc[s.ctfId] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  res.json({
    challenges: challenges.map(ch => ({
      ...ch,
      solvedCount: solveCounts[ch.id] || 0,
    })),
  });
});

// POST /api/admin/ctf
// GET /api/admin/ctf/:id
router.get("/ctf/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [task] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, id)).limit(1);
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

router.post("/ctf", async (req, res) => {
  const { name, nameUz, nameRu, description, descriptionUz, descriptionRu, category, difficulty, points, hint, flag, fileUrl } = req.body;
  if (!name || !description || !category || !difficulty || !points || !flag) return res.status(400).json({ error: "Missing required fields" });
  const [task] = await db.insert(ctfTasksTable).values({
    name, nameUz: nameUz || null, nameRu: nameRu || null, 
    description, descriptionUz: descriptionUz || null, descriptionRu: descriptionRu || null, 
    category, difficulty, points: Number(points), hint, flag: hashFlag(String(flag)), fileUrl,
    hintCost: 10,
  }).returning();
  await writeAuditLog(req, "ctf.create", "ctf", task.id, { name: task.name, category: task.category, difficulty: task.difficulty });
  res.status(201).json(task);
});

// PATCH /api/admin/ctf/:id
async function updateCtfHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userRole = (req as any).user?.role || "admin";
  
  // Filter updates based on RBAC
  const updates = filterAllowedUpdates(userRole, "ctf_tasks", req.body);

  if (updates.points !== undefined) updates.points = Number(updates.points);
  if (updates.flag !== undefined) {
    if (typeof updates.flag === "string" && updates.flag.trim()) {
      updates.flag = hashFlag(updates.flag.trim());
    } else {
      delete updates.flag;
    }
  }
  
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update or no permission" });

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
    const [challenge] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, id)).limit(1);
    if (!challenge) return res.status(404).json({ error: "CTF not found" });

    // 1. Get all affected users
    const solvers = await db.select().from(ctfAttemptsTable)
      .where(and(eq(ctfAttemptsTable.ctfId, id), eq(ctfAttemptsTable.solved, true)));
    const solverIds = [...new Set(solvers.map(s => s.userId))];

    // 2. Delete all related data
    await db.delete(ctfAttemptsTable).where(eq(ctfAttemptsTable.ctfId, id));
    await db.delete(competitionSolvesTable).where(eq(competitionSolvesTable.ctfId, id));
    await db.delete(competitionTasksTable).where(eq(competitionTasksTable.ctfId, id));
    await db.delete(ctfTasksTable).where(eq(ctfTasksTable.id, id));

    // 3. Recalculate points for affected users to ensure accuracy (including titles)
    if (solverIds.length > 0) {
      const titles = await db.select().from(titlesTable);
      for (const userId of solverIds) {
        // CTF Points
        const ctfSolves = await db.select({ points: ctfTasksTable.points, category: ctfTasksTable.category })
          .from(ctfAttemptsTable)
          .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
          .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.solved, true)));
        const ctfTotal = ctfSolves.reduce((sum, s) => sum + s.points, 0);

        // Lesson Points
        const lessonSolves = await db.select({ points: lessonsTable.points })
          .from(userLessonAttemptsTable)
          .innerJoin(lessonsTable, eq(userLessonAttemptsTable.lessonId, lessonsTable.id))
          .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed")));
        const lessonTotal = lessonSolves.reduce((sum, s) => sum + s.points, 0);

        // Titles
        await db.delete(userTitlesTable).where(eq(userTitlesTable.userId, userId));
        let titleTotal = 0;
        const categoryCounts = ctfSolves.reduce((acc, s) => {
          acc[s.category] = (acc[s.category] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        for (const [category, count] of Object.entries(categoryCounts)) {
          if (count >= 3) {
            const title = titles.find(t => t.category === category);
            if (title) {
              await db.insert(userTitlesTable).values({ userId, titleId: title.id });
              titleTotal += title.points;
            }
          }
        }

        // Update User
        await db.update(usersTable).set({ points: ctfTotal + lessonTotal + titleTotal }).where(eq(usersTable.id, userId));
      }
    }

    await writeAuditLog(req, "ctf.delete", "ctf", id, { name: challenge.name, affectedUsers: solverIds.length });
    res.json({ success: true, message: "CTF deleted and user points synchronized" });
  } catch (error) {
    logger.error({ err: error }, "Error deleting CTF");
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
  const userRole = (req as any).user?.role || "admin";

  // Filter updates based on RBAC
  const updates = filterAllowedUpdates(userRole, "competitions", req.body);

  if (updates.startTime) {
    const start = new Date(updates.startTime);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start time" });
    updates.startTime = start;
  }
  if (updates.endTime) {
    const end = new Date(updates.endTime);
    if (Number.isNaN(end.getTime())) return res.status(400).json({ error: "Invalid end time" });
    updates.endTime = end;
  }
  if (updates.inviteCode !== undefined) updates.inviteCode = String(updates.inviteCode).trim() || null;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update or no permission" });

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

// GET /api/admin/lessons
router.get("/lessons", async (_req, res) => {
  const lessons = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu,
    categoryId: lessonsTable.categoryId, points: lessonsTable.points, createdAt: lessonsTable.createdAt,
    categoryName: learnCategoriesTable.name,
  }).from(lessonsTable).leftJoin(learnCategoriesTable, eq(lessonsTable.categoryId, learnCategoriesTable.id));
  res.json({ lessons });
});

// GET /api/admin/lessons/:id
router.get("/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  const questions = await db.select().from(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, id)).orderBy(lessonQuestionsTable.orderIndex);
  res.json({ ...lesson, questions });
});

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
  const userRole = (req as any).user?.role || "admin";

  // Filter updates based on RBAC
  const updates = filterAllowedUpdates(userRole, "lessons", req.body);
  const { questions } = req.body;

  if (updates.categoryId) updates.categoryId = Number(updates.categoryId);
  if (updates.points) updates.points = Number(updates.points);

  if (Object.keys(updates).length === 0 && !questions) return res.status(400).json({ error: "Nothing to update or no permission" });

  let updated;
  if (Object.keys(updates).length > 0) {
    [updated] = await db.update(lessonsTable).set(updates).where(eq(lessonsTable.id, id)).returning();
  } else {
    [updated] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  }

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
