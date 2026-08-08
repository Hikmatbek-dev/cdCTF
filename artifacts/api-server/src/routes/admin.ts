import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { usersTable, ctfTasksTable, ctfAttemptsTable, ctfWriteupsTable, lessonsTable, lessonQuestionsTable, learnCategoriesTable, competitionsTable, competitionTasksTable, competitionTeamsTable, competitionUsersTable, competitionSolvesTable, userLessonAttemptsTable, titlesTable, auditLogsTable, modulesTable, moduleQuestionsTable, moduleExamAttemptsTable, certificatesTable, programDiplomasTable, supportTicketsTable, giftsTable, pathsTable, pathModulesTable } from "@workspace/db/schema";
import { eq, and, or, desc, inArray, isNotNull, asc, not, count, ilike } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  AdminCreateCompetitionBody,
  AdminCreateCtfBody,
  AdminCreateLessonBody,
  AdminUpdateCompetitionBody,
  AdminUpdateCtfBody,
  AdminUpdateLessonBody,
  PublishCtfBody,
  PublishLessonBody,
  SetUserRoleBody,
  UpdateCompetitionBody,
  UpdateCtfBody,
  UpdateLessonBody,
} from "@workspace/api-zod";
import { writeAuditLog } from "../lib/audit";
import { revokeAllSessions } from "../lib/sessions";
import { recalculateAllUsers, recalculateUsers } from "../lib/scoring";
import { hashFlag } from "../lib/flags";
import { logger } from "../lib/logger";
import { filterAllowedUpdates } from "../lib/rbac";
import {
  canEditResource,
  reqHasPermission,
  isUserRole,
  isPermission,
  effectivePermissions,
  normalizeRole,
  PERMISSIONS,
  requireAnyPermission,
  requirePermission,
  requireStaff,
  requireSuperAdmin,
  USER_ROLES,
  type UserRole,
} from "../lib/permissions";
import bcrypt from "bcryptjs";
import { getTelegramConfig, setTelegramToken, setTelegramChatId, setTelegramChannelUrl, getTelegramChannelUrl, sendTelegram, sendTelegramLog, tgEscape } from "../lib/telegram";

const router = Router();
// Staff-only floor. Every route below additionally declares the specific
// permission it needs — this `use` is the backstop, not the authorisation.
router.use(authenticateToken, requireStaff);

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * The page window for an admin list.
 *
 * Every list on this router used to select its whole table and hand all of it
 * back — users, challenges, lessons — and the users list then filtered the
 * search in JavaScript, so searching for one nickname read every row. The
 * OpenAPI description of /admin/users has advertised `limit` and `offset` for
 * as long as it has existed; the handler simply ignored them.
 *
 * `limit` is capped rather than rejected: a client asking for 10000 rows gets
 * MAX_PAGE_SIZE, which is the honest answer to "give me everything".
 */
function pageWindow(req: Request): { limit: number; offset: number } {
  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  return { limit, offset };
}

// GET /api/admin/dashboard
router.get("/dashboard", requirePermission("admin.panel"), async (_req, res) => {
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
router.get("/users", requirePermission("users.read"), async (req, res) => {
  const { search } = req.query as { search?: string };
  const { limit, offset } = pageWindow(req);

  // The search runs in the database now. It used to load every user and filter
  // the array, so the cost of finding one nickname was the whole table.
  const term = typeof search === "string" ? search.trim() : "";
  const filter = term
    ? or(ilike(usersTable.nickname, `%${term}%`), ilike(usersTable.email, `%${term}%`))
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(usersTable).where(filter);
  const rows = await db.select({
    id: usersTable.id, nickname: usersTable.nickname, email: usersTable.email,
    points: usersTable.points, role: usersTable.role, isBlocked: usersTable.isBlocked,
    isSuperAdmin: usersTable.isSuperAdmin, permissions: usersTable.permissions,
    adminEarnsPoints: usersTable.adminEarnsPoints,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(filter)
    .orderBy(asc(usersTable.createdAt))
    .limit(limit).offset(offset);

  // `permissions` here is the EFFECTIVE set (override, or role defaults, or all
  // for a super-admin) so the admin UI can render the checkbox matrix directly.
  // `hasPermissionOverride` tells the UI whether that set is a bespoke override
  // or just the role's defaults.
  const users = rows.map(u => ({
    ...u,
    permissions: effectivePermissions({ role: normalizeRole(u.role), isSuperAdmin: u.isSuperAdmin, permissions: u.permissions }),
    hasPermissionOverride: u.permissions != null,
  }));

  res.json({ users, total, limit, offset });
});

// GET /api/admin/audit-logs
router.get("/audit-logs", requirePermission("audit.read"), async (req, res) => {
  // Was a hard limit of 200 with no way to reach anything older, which is a
  // strange property for the record of who did what.
  const { limit, offset } = pageWindow(req);
  const [{ total }] = await db.select({ total: count() }).from(auditLogsTable);
  const logs = await db.select().from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit).offset(offset);
  res.json({
    total, limit, offset,
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

// GET /api/admin/learn-analytics
// The learning funnel per module — where learners drop off. Gated by the same
// permission as reading all lessons, since it is the same class of data.
router.get("/learn-analytics", requirePermission("lessons.read.all"), async (_req, res) => {
  const modules = await db.select().from(modulesTable)
    .where(eq(modulesTable.isPublished, true))
    .orderBy(asc(modulesTable.orderIndex));
  const moduleIds = modules.map(m => m.id);

  // Lessons belonging to these modules, and every completed attempt on them.
  const lessons = moduleIds.length
    ? await db.select({ id: lessonsTable.id, moduleId: lessonsTable.moduleId })
        .from(lessonsTable)
        .where(and(eq(lessonsTable.isPublished, true), inArray(lessonsTable.moduleId, moduleIds)))
    : [];
  const lessonsByModule = new Map<number, number[]>();
  for (const l of lessons) {
    if (l.moduleId == null) continue;
    const list = lessonsByModule.get(l.moduleId) ?? [];
    list.push(l.id);
    lessonsByModule.set(l.moduleId, list);
  }

  const lessonIds = lessons.map(l => l.id);
  const completions = lessonIds.length
    ? await db.select({ userId: userLessonAttemptsTable.userId, lessonId: userLessonAttemptsTable.lessonId })
        .from(userLessonAttemptsTable)
        .where(and(inArray(userLessonAttemptsTable.lessonId, lessonIds), isNotNull(userLessonAttemptsTable.completedAt)))
    : [];
  const lessonToModule = new Map(lessons.filter(l => l.moduleId != null).map(l => [l.id, l.moduleId!]));

  // Per module: which users completed how many of its lessons.
  const perModuleUserDone = new Map<number, Map<number, number>>();
  for (const c of completions) {
    const mid = lessonToModule.get(c.lessonId);
    if (mid == null) continue;
    const byUser = perModuleUserDone.get(mid) ?? new Map<number, number>();
    byUser.set(c.userId, (byUser.get(c.userId) ?? 0) + 1);
    perModuleUserDone.set(mid, byUser);
  }

  // Exam passes and certificates per module.
  const exams = moduleIds.length
    ? await db.select().from(moduleExamAttemptsTable).where(inArray(moduleExamAttemptsTable.moduleId, moduleIds))
    : [];
  const passedByModule = new Map<number, number>();
  for (const e of exams) if (e.passed) passedByModule.set(e.moduleId, (passedByModule.get(e.moduleId) ?? 0) + 1);

  const certs = moduleIds.length
    ? await db.select({ moduleId: certificatesTable.moduleId }).from(certificatesTable).where(inArray(certificatesTable.moduleId, moduleIds))
    : [];
  const certByModule = new Map<number, number>();
  for (const c of certs) certByModule.set(c.moduleId, (certByModule.get(c.moduleId) ?? 0) + 1);

  const funnel = modules.map(m => {
    const lessonCount = lessonsByModule.get(m.id)?.length ?? 0;
    const byUser = perModuleUserDone.get(m.id) ?? new Map<number, number>();
    const learners = byUser.size;                                    // completed >= 1 lesson
    const completedAll = lessonCount > 0
      ? [...byUser.values()].filter(n => n >= lessonCount).length     // completed every lesson
      : 0;
    return {
      moduleId: m.id,
      title: m.title,
      lessonCount,
      learners,
      completedAllLessons: completedAll,
      examPassed: passedByModule.get(m.id) ?? 0,
      certified: certByModule.get(m.id) ?? 0,
    };
  });

  const diplomas = await db.select({ id: programDiplomasTable.id }).from(programDiplomasTable);

  res.json({ modules: funnel, diplomasIssued: diplomas.length });
});

// POST /api/admin/users/:id/block
router.post("/users/:id/block", requirePermission("users.block"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });
  await db.update(usersTable).set({ isBlocked: true }).where(eq(usersTable.id, id));
  const revokedCount = await revokeAllSessions(id, "user_blocked");
  await writeAuditLog(req, "user.block", "user", id, { revokedSessionCount: revokedCount });
  res.json({ success: true, message: "User blocked", revokedSessionCount: revokedCount });
});

// POST /api/admin/users/:id/unblock
router.post("/users/:id/unblock", requirePermission("users.block"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });
  await db.update(usersTable).set({ isBlocked: false }).where(eq(usersTable.id, id));
  await writeAuditLog(req, "user.unblock", "user", id);
  res.json({ success: true, message: "User unblocked" });
});

// POST /api/admin/users/recalculate-points
router.post("/users/recalculate-points", requirePermission("system.maintenance"), async (req, res) => {
  const count = await recalculateAllUsers();
  await writeAuditLog(req, "users.recalculate_points", "system", undefined, { userCount: count });
  res.json({ success: true, message: `Recalculated points for ${count} users` });
});

// GET /api/admin/ctf
router.get("/ctf", requirePermission("ctf.read.all"), async (req, res) => {
  const { limit, offset } = pageWindow(req);
  const [{ total }] = await db.select({ total: count() }).from(ctfTasksTable);
  const challenges = await db.select().from(ctfTasksTable)
    .orderBy(desc(ctfTasksTable.id))
    .limit(limit).offset(offset);

  // Solve counts only for the page being returned.
  const ids = challenges.map(c => c.id);
  const solves = ids.length
    ? await db.select({ ctfId: ctfAttemptsTable.ctfId }).from(ctfAttemptsTable)
        .where(and(eq(ctfAttemptsTable.solved, true), inArray(ctfAttemptsTable.ctfId, ids)))
    : [];
  const solveCounts = solves.reduce((acc, s) => {
    acc[s.ctfId] = (acc[s.ctfId] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  res.json({
    total, limit, offset,
    challenges: challenges.map(({ flag: _flag, ...ch }) => ({
      ...ch,
      solvedCount: solveCounts[ch.id] || 0,
    })),
  });
});

// POST /api/admin/ctf
// GET /api/admin/ctf/:id
router.get("/ctf/:id", requirePermission("ctf.read.all"), async (req, res) => {
  const id = Number(req.params.id);
  const [task] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, id)).limit(1);
  if (!task) return res.status(404).json({ error: "Not found" });
  // The edit form shows "leave empty to keep current" — it never needs the hash,
  // and nothing else reads this endpoint.
  const { flag: _flag, ...safe } = task;
  res.json(safe);
});

router.post("/ctf", requirePermission("ctf.create"), validateBody(AdminCreateCtfBody), async (req, res) => {
  const { name, nameUz, nameRu, description, descriptionUz, descriptionRu, category, difficulty, points, hint, hintUz, hintRu, hintCost, flag, fileUrl } = req.body;
  if (!name || !description || !category || !difficulty || !flag) return res.status(400).json({ error: "Missing required fields" });

  const parsedPoints = Number(points);
  if (!Number.isFinite(parsedPoints) || parsedPoints < 0) return res.status(400).json({ error: "Points must be a non-negative number" });

  // Authors submit drafts; only someone with `ctf.publish` makes them live.
  const canPublish = reqHasPermission(req, "ctf.publish");

  const [task] = await db.insert(ctfTasksTable).values({
    name, nameUz: nameUz || null, nameRu: nameRu || null,
    description, descriptionUz: descriptionUz || null, descriptionRu: descriptionRu || null,
    category, difficulty, points: parsedPoints, flag: hashFlag(String(flag)), fileUrl,
    hint: hint || null, hintUz: hintUz || null, hintRu: hintRu || null,
    // Was hardcoded to 10, so the cost field on the form had no effect at all.
    hintCost: Number.isFinite(Number(hintCost)) && Number(hintCost) >= 0 ? Number(hintCost) : 10,
    authorId: req.user!.userId,
    isPublished: canPublish,
  }).returning();
  await writeAuditLog(req, "ctf.create", "ctf", task.id, { name: task.name, category: task.category, difficulty: task.difficulty, isPublished: task.isPublished });
  res.status(201).json(task);
});

// PATCH /api/admin/ctf/:id
async function updateCtfHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid CTF id" });
  const userRole: UserRole = req.user!.role;

  const [existing] = await db.select({ authorId: ctfTasksTable.authorId })
    .from(ctfTasksTable).where(eq(ctfTasksTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "CTF not found" });
  if (!canEditResource(req, "ctf", existing.authorId, req.user!.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

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

router.patch("/ctf/:id", requireAnyPermission("ctf.update.own", "ctf.update.any"), validateBody(UpdateCtfBody), updateCtfHandler);
router.put("/ctf/:id", requireAnyPermission("ctf.update.own", "ctf.update.any"), validateBody(AdminUpdateCtfBody), updateCtfHandler);

// DELETE /api/admin/ctf/:id
router.delete("/ctf/:id", requirePermission("ctf.delete"), async (req, res) => {
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

    // One shared implementation. This block used to be a ~40-line copy of the
    // one above — and had lost the rule that excluded accounts score zero, so
    // deleting a challenge handed every admin a non-zero score.
    if (solverIds.length > 0) await recalculateUsers(solverIds);

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

router.post("/ctf/:id/unblock-user", requirePermission("blocks.manage"), unblockCtfUserHandler);
router.post("/ctf/:id/unblock-user/:userId", requirePermission("blocks.manage"), unblockCtfUserHandler);

// GET /api/admin/blocked
router.get("/blocked", requirePermission("blocks.manage"), async (_req, res) => {
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

router.get("/blocked-tasks", requirePermission("blocks.manage"), async (_req, res) => {
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

router.post("/unblock", requirePermission("blocks.manage"), unblockTaskHandler);
router.post("/blocked-tasks/:type/:taskId/unblock/:userId", requirePermission("blocks.manage"), unblockTaskHandler);

// GET /api/admin/competitions
/**
 * The admin list, which is not the public one.
 *
 * The panel used to render `GET /api/competitions`, and that response has no
 * `inviteCode` — deliberately, because it is public. So a private competition
 * was created with a generated eight-character code that was returned once, in
 * the create response, straight into a `.mutate()` whose `onSuccess` ignored
 * the body. Nothing displayed it and no endpoint returned it again: the event
 * existed, was listed, and could never be joined by anyone.
 *
 * This route exists so the code has somewhere to be read from. It is gated on
 * `competitions.manage`, so no role below admin sees a join code.
 */
router.get("/competitions", requirePermission("competitions.manage"), async (_req, res) => {
  const competitions = await db.select().from(competitionsTable).orderBy(desc(competitionsTable.startTime));
  const tasks = await db.select().from(competitionTasksTable);
  const members = await db.select().from(competitionUsersTable);

  res.json({
    competitions: competitions.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      type: comp.type,
      inviteCode: comp.inviteCode,
      startTime: comp.startTime.toISOString(),
      endTime: comp.endTime.toISOString(),
      sponsorName: comp.sponsorName,
      sponsorLogoUrl: comp.sponsorLogoUrl,
      sponsorUrl: comp.sponsorUrl,
      prize: comp.prize,
      inviteRequirement: comp.inviteRequirement,
      format: comp.format,
      maxTeamSize: comp.maxTeamSize,
      telegramUrl: comp.telegramUrl,
      ctfIds: tasks.filter(t => t.competitionId === comp.id).map(t => t.ctfId),
      ctfCount: tasks.filter(t => t.competitionId === comp.id).length,
      participantCount: members.filter(m => m.competitionId === comp.id).length,
    })),
  });
});

// POST /api/admin/competitions
router.post("/competitions", requirePermission("competitions.manage"), validateBody(AdminCreateCompetitionBody), async (req, res) => {
  const { name, description, type, format, maxTeamSize, startTime, endTime, ctfIds, inviteCode, sponsorName, sponsorLogoUrl, sponsorUrl, prize, inviteRequirement, telegramUrl } = req.body;
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

  const normalizedFormat = format === "team" ? "team" : "individual";
  const [comp] = await db.insert(competitionsTable).values({
    name, description: description || null, type: normalizedType, inviteCode: normalizedInviteCode,
    format: normalizedFormat,
    // A cap only means anything for a team event; store null for individual.
    maxTeamSize: normalizedFormat === "team" ? cleanTeamSize(maxTeamSize) : null,
    startTime: start, endTime: end,
    sponsorName: cleanText(sponsorName), sponsorLogoUrl: cleanText(sponsorLogoUrl),
    sponsorUrl: cleanText(sponsorUrl), prize: cleanText(prize),
    inviteRequirement: cleanRequirement(inviteRequirement),
    telegramUrl: cleanText(telegramUrl),
  }).returning();

  if (ctfIds && Array.isArray(ctfIds)) {
    for (const ctfId of ctfIds) {
      await db.insert(competitionTasksTable).values({ competitionId: comp.id, ctfId: Number(ctfId) });
    }
  }

  await writeAuditLog(req, "competition.create", "competition", comp.id, { type: comp.type, ctfCount: Array.isArray(ctfIds) ? ctfIds.length : 0 });
  res.status(201).json(comp);
});

/** Trims an optional text field to a stored value: a real string, or null for
 * anything empty/absent. Keeps blank sponsor fields out of the column so the
 * event page can test them with a simple truthiness check. */
function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalises the per-competition invite override to a stored value: a
 * non-negative integer, or null to fall back to the global default. Anything
 * absent, blank, negative, or non-numeric becomes null (use the default). */
function cleanRequirement(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Normalises a team-size cap to a positive integer, or null for "no cap". */
function cleanTeamSize(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

// PATCH /api/admin/competitions/:id
/**
 * Parses a client-supplied timestamp, rejecting anything that is not a real date.
 *
 * A Date is the normal case, not the exception: the request body schema declares
 * these as `format: date-time`, which orval generates as `zod.coerce.date()`, so
 * validateBody has already turned the ISO string into a Date before this runs.
 * Only string and number were accepted, so every attempt to change a
 * competition's start or end time answered 400 "Invalid start time" — the dates
 * were the one thing this endpoint could never edit.
 */
function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function updateCompetitionHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid competition id" });
  const userRole: UserRole = req.user!.role;

  // Filter updates based on RBAC
  const updates = filterAllowedUpdates(userRole, "competitions", req.body);

  if (updates.startTime !== undefined) {
    const start = parseTimestamp(updates.startTime);
    if (!start) return res.status(400).json({ error: "Invalid start time" });
    updates.startTime = start;
  }
  if (updates.endTime !== undefined) {
    const end = parseTimestamp(updates.endTime);
    if (!end) return res.status(400).json({ error: "Invalid end time" });
    updates.endTime = end;
  }
  // Create refuses end <= start; the edit path did not, so a competition could
  // be edited into a window that has already closed before it opens. When only
  // one end is being changed, it is compared against the stored other end.
  if (updates.startTime !== undefined || updates.endTime !== undefined) {
    const [stored] = await db.select({ startTime: competitionsTable.startTime, endTime: competitionsTable.endTime })
      .from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
    if (!stored) return res.status(404).json({ error: "Competition not found" });
    const start = (updates.startTime as Date | undefined) ?? stored.startTime;
    const end = (updates.endTime as Date | undefined) ?? stored.endTime;
    if (end <= start) return res.status(400).json({ error: "Invalid competition time range" });
  }
  // Same reason as the nickname in users.ts: updates is Record<string, unknown>,
  // so String() would happily store "[object Object]" as a join code.
  if (updates.inviteCode !== undefined && updates.inviteCode !== null) {
    if (typeof updates.inviteCode !== "string") {
      return res.status(400).json({ error: "inviteCode must be a string" });
    }
    updates.inviteCode = updates.inviteCode.trim() || null;
  }
  // Sponsor fields: a blank string clears the field rather than storing "".
  for (const field of ["sponsorName", "sponsorLogoUrl", "sponsorUrl", "prize", "telegramUrl"] as const) {
    if (updates[field] !== undefined) updates[field] = cleanText(updates[field]);
  }
  // The invite override: normalise to a non-negative int or null (use default).
  if (updates.inviteRequirement !== undefined) {
    updates.inviteRequirement = cleanRequirement(updates.inviteRequirement);
  }
  // Play mode: only the two known values; anything else falls back to individual.
  if (updates.format !== undefined) {
    updates.format = updates.format === "team" ? "team" : "individual";
  }
  // Team-size cap: a positive int or null. Cleared when the event isn't (being
  // set to) a team event, so an individual event never carries a stray cap.
  if (updates.maxTeamSize !== undefined || updates.format === "individual") {
    updates.maxTeamSize = updates.format === "individual" ? null : cleanTeamSize(updates.maxTeamSize);
  }

  // The challenge set is not a column, so filterAllowedUpdates drops it — which
  // meant an edit could rename a competition but never fix which challenges it
  // contains. Handled separately, and only when the caller actually sent it:
  // an absent ctfIds leaves the set alone, an empty array empties it.
  const ctfIds: number[] | null = Array.isArray(req.body?.ctfIds)
    ? [...new Set<number>(req.body.ctfIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
    : null;

  if (Object.keys(updates).length === 0 && ctfIds === null) {
    return res.status(400).json({ error: "Nothing to update or no permission" });
  }

  const updated = await db.transaction(async tx => {
    if (ctfIds !== null) {
      // Solves already recorded against a challenge being removed would be
      // orphaned rows on a scoreboard that no longer lists the challenge.
      await tx.delete(competitionTasksTable).where(eq(competitionTasksTable.competitionId, id));
      for (const ctfId of ctfIds) {
        await tx.insert(competitionTasksTable).values({ competitionId: id, ctfId });
      }
      await tx.delete(competitionSolvesTable).where(and(
        eq(competitionSolvesTable.competitionId, id),
        ctfIds.length > 0 ? not(inArray(competitionSolvesTable.ctfId, ctfIds)) : undefined,
      ));
    }
    if (Object.keys(updates).length === 0) {
      const [row] = await tx.select().from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
      return row;
    }
    const [row] = await tx.update(competitionsTable).set(updates).where(eq(competitionsTable.id, id)).returning();
    return row;
  });

  if (!updated) return res.status(404).json({ error: "Competition not found" });

  await writeAuditLog(req, "competition.update", "competition", id, {
    fields: Object.keys(updates),
    ...(ctfIds !== null ? { ctfCount: ctfIds.length } : {}),
  });
  res.json(updated);
}

router.patch("/competitions/:id", requirePermission("competitions.manage"), validateBody(UpdateCompetitionBody), updateCompetitionHandler);
router.put("/competitions/:id", requirePermission("competitions.manage"), validateBody(AdminUpdateCompetitionBody), updateCompetitionHandler);

// DELETE /api/admin/competitions/:id
/**
 * A competition created with the wrong date, or a sponsor deal that fell
 * through, was permanent: there was no delete route at all, and four tables
 * hold a `references(() => competitionsTable.id)`, so a naive delete would fail
 * on the foreign key anyway. One transaction, children first.
 *
 * Solves are removed with it. That is the point of deleting an event, but it is
 * also why the audit entry records how many were destroyed.
 */
router.delete("/competitions/:id", requirePermission("competitions.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid competition id" });

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
  if (!comp) return res.status(404).json({ error: "Competition not found" });

  const solveCount = (await db.select({ id: competitionSolvesTable.id }).from(competitionSolvesTable)
    .where(eq(competitionSolvesTable.competitionId, id))).length;

  await db.transaction(async tx => {
    await tx.delete(competitionSolvesTable).where(eq(competitionSolvesTable.competitionId, id));
    // Members reference teams, so members lose their team before teams go.
    await tx.update(competitionUsersTable).set({ teamId: null })
      .where(eq(competitionUsersTable.competitionId, id));
    await tx.delete(competitionUsersTable).where(eq(competitionUsersTable.competitionId, id));
    await tx.delete(competitionTeamsTable).where(eq(competitionTeamsTable.competitionId, id));
    await tx.delete(competitionTasksTable).where(eq(competitionTasksTable.competitionId, id));
    await tx.delete(competitionsTable).where(eq(competitionsTable.id, id));
  });

  await writeAuditLog(req, "competition.delete", "competition", id, { name: comp.name, solveCount });
  res.json({ success: true });
});

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

router.post("/competitions/:id/users", requirePermission("competitions.manage"), addCompetitionUserHandler);
router.post("/competitions/:id/users/:userId", requirePermission("competitions.manage"), addCompetitionUserHandler);

// GET /api/admin/lessons
router.get("/lessons", requirePermission("lessons.read.all"), async (req, res) => {
  const { limit, offset } = pageWindow(req);
  const [{ total }] = await db.select({ total: count() }).from(lessonsTable);
  const lessons = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu,
    categoryId: lessonsTable.categoryId, points: lessonsTable.points, createdAt: lessonsTable.createdAt,
    // The panel decides whether to offer an author an edit button, and an author
    // may only edit their own — without this it had to guess, and guessed yes.
    authorId: lessonsTable.authorId,
    // Without this the panel could not even show which lessons are live, let
    // alone publish one. Authors create drafts by design, so an unpublished
    // lesson was invisible in the only place it could be published from.
    isPublished: lessonsTable.isPublished,
    categoryName: learnCategoriesTable.name,
  }).from(lessonsTable).leftJoin(learnCategoriesTable, eq(lessonsTable.categoryId, learnCategoriesTable.id))
    .orderBy(asc(lessonsTable.id))
    .limit(limit).offset(offset);
  res.json({ lessons, total, limit, offset });
});

// GET /api/admin/lessons/:id
router.get("/lessons/:id", requirePermission("lessons.read.all"), async (req, res) => {
  const id = Number(req.params.id);
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  const questions = await db.select().from(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, id)).orderBy(lessonQuestionsTable.orderIndex);
  res.json({ ...lesson, questions });
});

// POST /api/admin/lessons
router.post("/lessons", requirePermission("lessons.create"), validateBody(AdminCreateLessonBody), async (req, res) => {
  const { title, titleUz, titleRu, content, contentUz, contentRu, categoryId, moduleId, points, questions } = req.body;
  if (!title || !content || !categoryId) return res.status(400).json({ error: "Missing fields" });

  // A lesson may be attached to a module (so it shows in that module's list and
  // roadmap) or left standalone. If a module is named, it must be a real one —
  // a dangling moduleId would file the lesson under a module that does not
  // exist, and it would appear nowhere.
  let lessonModuleId: number | null = null;
  if (moduleId != null) {
    const [mod] = await db.select({ id: modulesTable.id }).from(modulesTable)
      .where(eq(modulesTable.id, Number(moduleId))).limit(1);
    if (!mod) return res.status(400).json({ error: "Unknown module" });
    lessonModuleId = mod.id;
  }

  // The categoryId must name a real category. This used to silently create a
  // fresh "General" category for any id it did not recognise, so a typo or a
  // stale id littered the table with junk categories and quietly filed the
  // lesson under the wrong one. Reject it instead — the admin picks from a
  // dropdown of existing categories, so an unknown id is a bug, not a default.
  const [category] = await db.select().from(learnCategoriesTable)
    .where(eq(learnCategoriesTable.id, Number(categoryId))).limit(1);
  if (!category) return res.status(400).json({ error: "Unknown category" });

  // A lesson attached to a module goes to the end of that module's list, so a
  // newly added lesson does not collide with an existing orderIndex.
  let orderIndex = 0;
  if (lessonModuleId != null) {
    const siblings = await db.select({ orderIndex: lessonsTable.orderIndex })
      .from(lessonsTable).where(eq(lessonsTable.moduleId, lessonModuleId));
    orderIndex = siblings.reduce((max, s) => Math.max(max, (s.orderIndex ?? 0) + 1), 0);
  }

  const [lesson] = await db.insert(lessonsTable).values({
    title, titleUz: titleUz || null, titleRu: titleRu || null,
    content, contentUz: contentUz || null, contentRu: contentRu || null,
    categoryId: category.id, moduleId: lessonModuleId, orderIndex,
    points: Number(points) || 50,
    authorId: req.user!.userId,
    // Authors submit drafts; only someone with `lessons.publish` makes them live.
    isPublished: reqHasPermission(req, "lessons.publish"),
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
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid lesson id" });
  const userRole: UserRole = req.user!.role;

  const [existing] = await db.select({ authorId: lessonsTable.authorId })
    .from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Lesson not found" });
  if (!canEditResource(req, "lessons", existing.authorId, req.user!.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Filter updates based on RBAC
  const updates = filterAllowedUpdates(userRole, "lessons", req.body);
  const { questions } = req.body;

  if (updates.categoryId) updates.categoryId = Number(updates.categoryId);
  if (updates.points) updates.points = Number(updates.points);
  // moduleId may be set (attach), changed, or cleared (detach → standalone).
  // A non-null value must name a real module.
  if ("moduleId" in updates) {
    if (updates.moduleId == null) {
      updates.moduleId = null;
    } else {
      const [mod] = await db.select({ id: modulesTable.id }).from(modulesTable)
        .where(eq(modulesTable.id, Number(updates.moduleId))).limit(1);
      if (!mod) return res.status(400).json({ error: "Unknown module" });
      updates.moduleId = mod.id;
    }
  }

  if (Object.keys(updates).length === 0 && !questions) return res.status(400).json({ error: "Nothing to update or no permission" });

  let updated;
  if (Object.keys(updates).length > 0) {
    [updated] = await db.update(lessonsTable).set(updates).where(eq(lessonsTable.id, id)).returning();
  } else {
    [updated] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  }

  if (questions && Array.isArray(questions)) {
    // The translations have to be carried here too.
    //
    // Updating replaces the whole question set — delete, then re-insert — and
    // this insert wrote only `question`, `options` and `correctOption`, while
    // the create handler thirty lines above writes all six columns. So fixing a
    // typo in a lesson title silently destroyed that lesson's Uzbek and Russian
    // quiz, on a platform whose whole point is being trilingual, and reported
    // "Lesson updated!".
    await db.delete(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, id));
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.insert(lessonQuestionsTable).values({
        lessonId: id, question: q.question, questionUz: q.questionUz || null, questionRu: q.questionRu || null,
        options: q.options, optionsUz: q.optionsUz || null, optionsRu: q.optionsRu || null,
        correctOption: Number(q.correctOption), orderIndex: i,
      });
    }
  }

  await writeAuditLog(req, "lesson.update", "lesson", id, { fields: Object.keys(updates), questionsUpdated: Array.isArray(questions) });
  res.json(updated);
}

router.patch("/lessons/:id", requireAnyPermission("lessons.update.own", "lessons.update.any"), validateBody(UpdateLessonBody), updateLessonHandler);
router.put("/lessons/:id", requireAnyPermission("lessons.update.own", "lessons.update.any"), validateBody(AdminUpdateLessonBody), updateLessonHandler);

// POST /api/admin/ctf/:id/publish — flip a draft live, or take it back down.
router.post("/ctf/:id/publish", requirePermission("ctf.publish"), validateBody(PublishCtfBody), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid CTF id" });
  const isPublished = req.body?.isPublished !== false;

  const [updated] = await db.update(ctfTasksTable).set({ isPublished }).where(eq(ctfTasksTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "CTF not found" });

  await writeAuditLog(req, isPublished ? "ctf.publish" : "ctf.unpublish", "ctf", id);
  res.json({ success: true, isPublished: updated.isPublished });
});

// POST /api/admin/lessons/:id/publish
router.post("/lessons/:id/publish", requirePermission("lessons.publish"), validateBody(PublishLessonBody), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid lesson id" });
  const isPublished = req.body?.isPublished !== false;

  const [updated] = await db.update(lessonsTable).set({ isPublished }).where(eq(lessonsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Lesson not found" });

  await writeAuditLog(req, isPublished ? "lesson.publish" : "lesson.unpublish", "lesson", id);
  res.json({ success: true, isPublished: updated.isPublished });
});

// PATCH /api/admin/users/:id/role — assign user / author / moderator / admin.
router.patch("/users/:id/role", requirePermission("users.role"), validateBody(SetUserRoleBody), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });

  const { role } = req.body ?? {};
  if (!isUserRole(role)) {
    return res.status(400).json({ error: `Role must be one of: ${USER_ROLES.join(", ")}` });
  }
  // Removing your own admin rights locks you out of undoing it.
  if (id === req.user!.userId && role !== "admin") {
    return res.status(400).json({ error: "You cannot demote yourself" });
  }

  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "User not found" });

  // The role is read from the database per request, so this takes effect at
  // once; the sessions are dropped so the new role starts from a clean slate.
  const revokedCount = await revokeAllSessions(id, "role_changed");
  await writeAuditLog(req, "user.role_change", "user", id, { role, revokedSessionCount: revokedCount });
  res.json({ success: true, role: updated.role, revokedSessionCount: revokedCount });
});

// ---------------------------------------------------------------------------
// Staff management — super-admin only.
//
// A super-admin creates ordinary admins with a chosen login + password and
// toggles each permission on and off. requireStaff already gates the router; the
// extra requireSuperAdmin here is the flag check that the permission matrix can
// never grant, so only the founder-designated accounts reach these.
// ---------------------------------------------------------------------------

/** Same rules as public registration, kept in step with routes/auth.ts. */
function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 10) return "Password must be at least 10 characters";
  if (!/[a-z]/.test(password)) return "Password needs a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password needs an uppercase letter";
  if (!/\d/.test(password)) return "Password needs a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password needs a symbol";
  return null;
}

/** Validates a permissions payload to a clean, de-duplicated set of real keys. */
function cleanPermissions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const set = new Set<string>();
  for (const p of value) {
    if (!isPermission(p)) return null;   // reject unknown keys rather than dropping them
    set.add(p);
  }
  return [...set];
}

// POST /api/admin/staff — create an ordinary admin.
router.post("/staff", requireSuperAdmin, async (req, res) => {
  const nickname = String(req.body?.nickname ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = req.body?.password;

  if (!/^[A-Za-z0-9_]{3,32}$/.test(nickname)) {
    return res.status(400).json({ error: "Nickname must be 3–32 letters, numbers, or underscores" });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const pwProblem = passwordProblem(password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });

  // Default all-off (least privilege): a new admin holds exactly the permissions
  // ticked at creation, nothing more.
  const permissions = req.body?.permissions === undefined ? [] : cleanPermissions(req.body.permissions);
  if (permissions === null) return res.status(400).json({ error: "permissions must be an array of known permission keys" });

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.nickname, nickname), eq(usersTable.email, email))).limit(1);
  if (existing) return res.status(409).json({ error: "A user with that nickname or email already exists" });

  const passwordHash = await bcrypt.hash(password as string, 12);
  // Admins are unscored by default; the super-admin opts a new one into scoring
  // explicitly (e.g. a content author who should also compete for real).
  const adminEarnsPoints = req.body?.earnsPoints === true;
  const [created] = await db.insert(usersTable).values({
    nickname, email, passwordHash,
    role: "admin",
    // Admin-created, so trusted: verified immediately, or they could never log in
    // (no verification email is sent for this path).
    emailVerified: true,
    permissions,
    adminEarnsPoints,
  }).returning({ id: usersTable.id, nickname: usersTable.nickname, email: usersTable.email, role: usersTable.role });

  await writeAuditLog(req, "admin.create", "user", created.id, { nickname: created.nickname, permissionCount: permissions.length, earnsPoints: adminEarnsPoints });
  res.status(201).json({ ...created, permissions, isSuperAdmin: false, adminEarnsPoints });
});

// PATCH /api/admin/staff/:id/permissions — set an admin's exact permission set.
router.patch("/staff/:id/permissions", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });

  const permissions = cleanPermissions(req.body?.permissions);
  if (permissions === null) return res.status(400).json({ error: "permissions must be an array of known permission keys" });

  const [target] = await db.select({ id: usersTable.id, isSuperAdmin: usersTable.isSuperAdmin })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });
  // A super-admin always holds everything; an override on them is meaningless and
  // editing it here would only mislead.
  if (target.isSuperAdmin) return res.status(400).json({ error: "A super-admin already holds every permission" });

  // The scoring opt-in rides along on the same save, when the caller sends it.
  const updates: { permissions: string[]; adminEarnsPoints?: boolean } = { permissions };
  const earnsPointsChanged = typeof req.body?.earnsPoints === "boolean";
  if (earnsPointsChanged) updates.adminEarnsPoints = req.body.earnsPoints;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, id));

  // If scoring was just toggled, rebuild this admin's points from the solves
  // they already have — turning it on credits every past solve, turning it off
  // zeroes them. recalculateUserPoints honours the flag we just wrote.
  if (earnsPointsChanged) await recalculateUsers([id]);

  // Effect is immediate: permissions are resolved from the DB on every request.
  await writeAuditLog(req, "admin.permissions", "user", id, { permissions, earnsPoints: updates.adminEarnsPoints });
  res.json({ success: true, permissions, adminEarnsPoints: updates.adminEarnsPoints });
});

// POST /api/admin/staff/:id/password — reset an admin's password.
router.post("/staff/:id/password", requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid user id" });

  const pwProblem = passwordProblem(req.body?.password);
  if (pwProblem) return res.status(400).json({ error: pwProblem });

  const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });

  const passwordHash = await bcrypt.hash(req.body.password as string, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
  // Drop every session so the old password stops working everywhere at once.
  const revokedCount = await revokeAllSessions(id, "password_changed");
  await writeAuditLog(req, "admin.password_reset", "user", id, { revokedSessionCount: revokedCount });
  res.json({ success: true, revokedSessionCount: revokedCount });
});

// ---------------------------------------------------------------------------
// Telegram log forwarding — super-admin only. The bot token is a secret: it is
// stored in app_settings and NEVER returned to the client (only whether one is
// set). The chat id is not sensitive and is returned so the field can be shown.
// ---------------------------------------------------------------------------

// GET /api/admin/settings/telegram
router.get("/settings/telegram", requireSuperAdmin, async (_req, res) => {
  const { token, chatId } = await getTelegramConfig();
  const channelUrl = await getTelegramChannelUrl();
  res.json({ hasToken: Boolean(token), chatId: chatId ?? "", channelUrl: channelUrl ?? "" });
});

// PUT /api/admin/settings/telegram — set/clear the bot token and/or chat id.
router.put("/settings/telegram", requireSuperAdmin, async (req, res) => {
  // A key sent as undefined is left untouched; sent as "" it is cleared. This
  // lets the UI save a chat-id change without resending (and re-exposing) the
  // token it never received back.
  if (req.body?.botToken !== undefined) {
    if (req.body.botToken !== null && typeof req.body.botToken !== "string") {
      return res.status(400).json({ error: "botToken must be a string" });
    }
    await setTelegramToken(req.body.botToken);
  }
  if (req.body?.chatId !== undefined) {
    if (req.body.chatId !== null && typeof req.body.chatId !== "string") {
      return res.status(400).json({ error: "chatId must be a string" });
    }
    await setTelegramChatId(req.body.chatId);
  }
  if (req.body?.channelUrl !== undefined) {
    if (req.body.channelUrl !== null && typeof req.body.channelUrl !== "string") {
      return res.status(400).json({ error: "channelUrl must be a string" });
    }
    await setTelegramChannelUrl(req.body.channelUrl);
  }
  // Never log the token itself.
  await writeAuditLog(req, "settings.telegram", "settings", "telegram", {
    tokenChanged: req.body?.botToken !== undefined,
    chatIdChanged: req.body?.chatId !== undefined,
    channelChanged: req.body?.channelUrl !== undefined,
  });
  const { token, chatId } = await getTelegramConfig();
  const channelUrl = await getTelegramChannelUrl();
  res.json({ hasToken: Boolean(token), chatId: chatId ?? "", channelUrl: channelUrl ?? "" });
});

// POST /api/admin/settings/telegram/test — send a test message right now.
router.post("/settings/telegram/test", requireSuperAdmin, async (_req, res) => {
  const result = await sendTelegram("✅ cdCTF test message — logging is wired up.");
  if (!result.ok) {
    return res.status(result.error === "not_configured" ? 400 : 502).json({ ok: false, error: result.error });
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Support tickets — the Support section of the panel.
// ---------------------------------------------------------------------------

// GET /api/admin/support — list tickets, open first, newest first.
router.get("/support", requirePermission("support.manage"), async (req, res) => {
  const { limit, offset } = pageWindow(req);
  const status = req.query.status === "open" || req.query.status === "resolved" ? req.query.status : undefined;
  const filter = status ? eq(supportTicketsTable.status, status) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(supportTicketsTable).where(filter);
  const [{ open }] = await db.select({ open: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "open"));
  const rows = await db.select({
    id: supportTicketsTable.id,
    userId: supportTicketsTable.userId,
    nickname: usersTable.nickname,
    email: supportTicketsTable.email,
    category: supportTicketsTable.category,
    message: supportTicketsTable.message,
    pageUrl: supportTicketsTable.pageUrl,
    status: supportTicketsTable.status,
    createdAt: supportTicketsTable.createdAt,
    resolvedAt: supportTicketsTable.resolvedAt,
  })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(filter)
    // Open before resolved, then newest first.
    .orderBy(asc(supportTicketsTable.status), desc(supportTicketsTable.createdAt))
    .limit(limit).offset(offset);

  res.json({
    total, open, limit, offset,
    tickets: rows.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), resolvedAt: t.resolvedAt?.toISOString() ?? null })),
  });
});

// PATCH /api/admin/support/:id — move a ticket open ⇄ resolved.
router.patch("/support/:id", requirePermission("support.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid ticket id" });
  if (req.body?.status !== "open" && req.body?.status !== "resolved") {
    return res.status(400).json({ error: "status must be 'open' or 'resolved'" });
  }
  const resolved = req.body.status === "resolved";
  const [updated] = await db.update(supportTicketsTable)
    .set({ status: req.body.status, resolvedAt: resolved ? new Date() : null, resolvedBy: resolved ? req.user!.userId : null })
    .where(eq(supportTicketsTable.id, id)).returning({ id: supportTicketsTable.id, status: supportTicketsTable.status });
  if (!updated) return res.status(404).json({ error: "Ticket not found" });

  await writeAuditLog(req, "support.update", "support", id, { status: updated.status });
  res.json({ success: true, status: updated.status });
});

// ---------------------------------------------------------------------------
// Gifts — a super-admin rewards a helpful learner with points. Bug reports and
// suggestions are worth the most; everything is capped at GIFT_MAX.
// ---------------------------------------------------------------------------

const GIFT_MAX = 40;
const GIFT_DEFAULTS: Record<string, number> = {
  bug: 40,          // Xatolik haqida xabar berdi
  suggestion: 40,   // Taklif
  help: 20,         // Yordam berdi
  question: 10,     // Savol
  other: 15,        // Boshqa
};

// GET /api/admin/gifts — the most recent awards, for the Gift page's history.
router.get("/gifts", requireSuperAdmin, async (_req, res) => {
  const rows = await db.select({
    id: giftsTable.id,
    userId: giftsTable.userId,
    nickname: usersTable.nickname,
    category: giftsTable.category,
    points: giftsTable.points,
    note: giftsTable.note,
    createdAt: giftsTable.createdAt,
  })
    .from(giftsTable)
    .leftJoin(usersTable, eq(giftsTable.userId, usersTable.id))
    .orderBy(desc(giftsTable.createdAt))
    .limit(50);
  res.json({ gifts: rows.map(g => ({ ...g, createdAt: g.createdAt.toISOString() })), defaults: GIFT_DEFAULTS, max: GIFT_MAX });
});

// POST /api/admin/gifts — award points to a user.
router.post("/gifts", requireSuperAdmin, async (req, res) => {
  const userId = Number(req.body?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Invalid user id" });

  const category = String(req.body?.category ?? "");
  if (!(category in GIFT_DEFAULTS)) return res.status(400).json({ error: "Unknown category" });

  // Points come from the category by default; a super-admin may adjust within
  // the cap. Never above GIFT_MAX, never below 1.
  const requested = req.body?.points === undefined ? GIFT_DEFAULTS[category] : Number(req.body.points);
  if (!Number.isInteger(requested) || requested < 1) return res.status(400).json({ error: "Points must be a positive integer" });
  const points = Math.min(GIFT_MAX, requested);

  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) || null : null;

  const [target] = await db.select({ id: usersTable.id, nickname: usersTable.nickname }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });

  // Record the gift, then rebuild the recipient's points so the total includes
  // it and stays correct through any later recalculation.
  await db.insert(giftsTable).values({ userId, category, points, note, awardedBy: req.user!.userId });
  await recalculateUsers([userId]);

  await writeAuditLog(req, "gift.award", "user", userId, { category, points });
  sendTelegramLog(`🎁 <b>Gift +${points}</b> → ${tgEscape(target.nickname)}\n📌 ${tgEscape(category)}${note ? "\n💬 " + tgEscape(note) : ""}`);
  res.status(201).json({ success: true, points });
});

// ---------------------------------------------------------------------------
// Learning paths — ordered tracks that group modules. Managed here so the
// founder builds them from real modules without the seed script.
// ---------------------------------------------------------------------------

const PATH_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

// GET /api/admin/paths — every path with its ordered module ids.
router.get("/paths", requirePermission("lessons.publish"), async (_req, res) => {
  const paths = await db.select().from(pathsTable).orderBy(asc(pathsTable.orderIndex), asc(pathsTable.id));
  const links = await db.select().from(pathModulesTable).orderBy(asc(pathModulesTable.orderIndex));
  res.json({
    paths: paths.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      moduleIds: links.filter(l => l.pathId === p.id).map(l => l.moduleId),
    })),
  });
});

// POST /api/admin/paths — create a path.
router.post("/paths", requirePermission("lessons.publish"), async (req, res) => {
  const slug = optionalText(req.body?.slug);
  const title = optionalText(req.body?.title);
  const description = optionalText(req.body?.description);
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: "slug: lowercase letters, digits, hyphens only" });
  if (!title || !description) return res.status(400).json({ error: "title and description are required" });

  const [clash] = await db.select({ id: pathsTable.id }).from(pathsTable).where(eq(pathsTable.slug, slug)).limit(1);
  if (clash) return res.status(409).json({ error: "A path with that slug already exists" });

  const [created] = await db.insert(pathsTable).values({
    slug, title, description,
    titleUz: optionalText(req.body?.titleUz), titleRu: optionalText(req.body?.titleRu),
    descriptionUz: optionalText(req.body?.descriptionUz), descriptionRu: optionalText(req.body?.descriptionRu),
    difficulty: PATH_DIFFICULTIES.includes(String(req.body?.difficulty)) ? String(req.body.difficulty) : "beginner",
    hue: clampInt(req.body?.hue, 210, 0, 360),
    badge: optionalText(req.body?.badge),
    orderIndex: clampInt(req.body?.orderIndex, 0, 0, 9999),
    isPublished: req.body?.isPublished !== false,
  }).returning();
  await writeAuditLog(req, "path.create", "path", created.id, { slug });
  res.status(201).json(created);
});

// PATCH /api/admin/paths/:id — edit a path's fields.
router.patch("/paths/:id", requirePermission("lessons.publish"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid path id" });
  const [existing] = await db.select().from(pathsTable).where(eq(pathsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Path not found" });

  const updates: Record<string, unknown> = {};
  if (req.body?.title !== undefined) { const v = optionalText(req.body.title); if (!v) return res.status(400).json({ error: "title cannot be empty" }); updates.title = v; }
  if (req.body?.description !== undefined) { const v = optionalText(req.body.description); if (!v) return res.status(400).json({ error: "description cannot be empty" }); updates.description = v; }
  for (const f of ["titleUz", "titleRu", "descriptionUz", "descriptionRu", "badge"] as const) {
    if (req.body?.[f] !== undefined) updates[f] = optionalText(req.body[f]);
  }
  if (req.body?.difficulty !== undefined) {
    if (!PATH_DIFFICULTIES.includes(String(req.body.difficulty))) return res.status(400).json({ error: `difficulty must be one of: ${PATH_DIFFICULTIES.join(", ")}` });
    updates.difficulty = String(req.body.difficulty);
  }
  if (req.body?.hue !== undefined) updates.hue = clampInt(req.body.hue, existing.hue, 0, 360);
  if (req.body?.orderIndex !== undefined) updates.orderIndex = clampInt(req.body.orderIndex, existing.orderIndex, 0, 9999);
  if (req.body?.isPublished !== undefined) {
    if (typeof req.body.isPublished !== "boolean") return res.status(400).json({ error: "isPublished must be a boolean" });
    updates.isPublished = req.body.isPublished;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  const [updated] = await db.update(pathsTable).set(updates).where(eq(pathsTable.id, id)).returning();
  await writeAuditLog(req, "path.update", "path", id, { fields: Object.keys(updates) });
  res.json(updated);
});

// PUT /api/admin/paths/:id/modules — set the ordered module list.
router.put("/paths/:id/modules", requirePermission("lessons.publish"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid path id" });
  if (!Array.isArray(req.body?.moduleIds)) return res.status(400).json({ error: "moduleIds must be a list" });
  const [existing] = await db.select({ id: pathsTable.id }).from(pathsTable).where(eq(pathsTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Path not found" });

  const ids = [...new Set(req.body.moduleIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))] as number[];
  // Keep only modules that actually exist.
  const real = ids.length === 0 ? [] : (await db.select({ id: modulesTable.id }).from(modulesTable).where(inArray(modulesTable.id, ids))).map(m => m.id);
  const ordered = ids.filter(i => real.includes(i));

  await db.transaction(async tx => {
    await tx.delete(pathModulesTable).where(eq(pathModulesTable.pathId, id));
    for (let i = 0; i < ordered.length; i++) {
      await tx.insert(pathModulesTable).values({ pathId: id, moduleId: ordered[i], orderIndex: i });
    }
  });
  await writeAuditLog(req, "path.modules", "path", id, { count: ordered.length });
  res.json({ success: true, moduleIds: ordered });
});

// DELETE /api/admin/paths/:id
router.delete("/paths/:id", requirePermission("lessons.publish"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid path id" });
  await db.transaction(async tx => {
    await tx.delete(pathModulesTable).where(eq(pathModulesTable.pathId, id));
    await tx.delete(pathsTable).where(eq(pathsTable.id, id));
  });
  await writeAuditLog(req, "path.delete", "path", id);
  res.json({ success: true });
});

// DELETE /api/admin/lessons/:id
router.delete("/lessons/:id", requirePermission("lessons.delete"), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, id));
  await db.delete(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.lessonId, id));
  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
  await writeAuditLog(req, "lesson.delete", "lesson", id);
  res.json({ success: true, message: "Lesson deleted" });
});

/* ---------------------------------------------------------------------------
 * Curriculum: modules and their categories.
 *
 * Both tables were read-only from the panel's point of view — there was no
 * route to create, edit, reorder, publish or delete either one. The eight
 * production modules exist because a seed script inserted them; fixing a typo
 * in a module title, adding a ninth, or changing an exam pass mark meant
 * writing SQL against the live database.
 *
 * Categories matter more than they look: the lesson form requires a category
 * and the create handler rejects one that does not exist, so on a database with
 * no categories a lesson simply could not be written.
 * ------------------------------------------------------------------------ */

/** Trims to a stored value, or null when the field is blank or absent. */
function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// GET /api/admin/modules
router.get("/modules", requirePermission("lessons.read.all"), async (_req, res) => {
  const modules = await db.select().from(modulesTable).orderBy(asc(modulesTable.orderIndex), asc(modulesTable.id));
  const lessons = await db.select({ id: lessonsTable.id, moduleId: lessonsTable.moduleId }).from(lessonsTable);
  res.json({
    modules: modules.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      lessonCount: lessons.filter(l => l.moduleId === m.id).length,
    })),
  });
});

// POST /api/admin/modules
router.post("/modules", requirePermission("lessons.publish"), async (req, res) => {
  const title = optionalText(req.body?.title);
  const description = optionalText(req.body?.description);
  const slug = optionalText(req.body?.slug);
  if (!title || !description) return res.status(400).json({ error: "title and description are required" });
  if (!slug) return res.status(400).json({ error: "slug is required" });
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: "slug may contain only lowercase letters, digits and hyphens" });
  }

  const [clash] = await db.select({ id: modulesTable.id }).from(modulesTable)
    .where(eq(modulesTable.slug, slug)).limit(1);
  if (clash) return res.status(409).json({ error: "A module with that slug already exists" });

  const [created] = await db.insert(modulesTable).values({
    slug, title, description,
    titleUz: optionalText(req.body?.titleUz), titleRu: optionalText(req.body?.titleRu),
    descriptionUz: optionalText(req.body?.descriptionUz), descriptionRu: optionalText(req.body?.descriptionRu),
    categoryId: Number.isInteger(Number(req.body?.categoryId)) && Number(req.body?.categoryId) > 0
      ? Number(req.body.categoryId) : null,
    orderIndex: clampInt(req.body?.orderIndex, 0, 0, 9999),
    estimatedHours: clampInt(req.body?.estimatedHours, 0, 0, 10000),
    difficulty: MODULE_DIFFICULTIES.includes(String(req.body?.difficulty)) ? String(req.body.difficulty) : "beginner",
    passScore: clampInt(req.body?.passScore, 80, 0, 100),
    // New modules start hidden. A module is a course; publishing one with no
    // lessons in it puts an empty shell on the curriculum page.
    isPublished: false,
  }).returning();

  await writeAuditLog(req, "module.create", "module", created.id, { slug: created.slug });
  res.status(201).json(created);
});

const MODULE_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

/** Reads an integer from a request body, falling back and clamping to a range. */
function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

// PATCH /api/admin/modules/:id
router.patch("/modules/:id", requirePermission("lessons.publish"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid module id" });
  const [existing] = await db.select().from(modulesTable).where(eq(modulesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Module not found" });

  const updates: Record<string, unknown> = {};
  if (req.body?.title !== undefined) {
    const title = optionalText(req.body.title);
    if (!title) return res.status(400).json({ error: "title cannot be empty" });
    updates.title = title;
  }
  if (req.body?.description !== undefined) {
    const description = optionalText(req.body.description);
    if (!description) return res.status(400).json({ error: "description cannot be empty" });
    updates.description = description;
  }
  for (const field of ["titleUz", "titleRu", "descriptionUz", "descriptionRu"] as const) {
    if (req.body?.[field] !== undefined) updates[field] = optionalText(req.body[field]);
  }
  if (req.body?.orderIndex !== undefined) updates.orderIndex = clampInt(req.body.orderIndex, existing.orderIndex, 0, 9999);
  if (req.body?.estimatedHours !== undefined) updates.estimatedHours = clampInt(req.body.estimatedHours, existing.estimatedHours, 0, 10000);
  // The pass mark decides who gets a certificate, so it is bounded rather than
  // trusted: a 0 would hand one to anybody who opened the exam.
  if (req.body?.passScore !== undefined) updates.passScore = clampInt(req.body.passScore, existing.passScore, 1, 100);
  if (req.body?.difficulty !== undefined) {
    if (!MODULE_DIFFICULTIES.includes(String(req.body.difficulty))) {
      return res.status(400).json({ error: `difficulty must be one of: ${MODULE_DIFFICULTIES.join(", ")}` });
    }
    updates.difficulty = String(req.body.difficulty);
  }
  if (req.body?.categoryId !== undefined) {
    const categoryId = Number(req.body.categoryId);
    updates.categoryId = Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
  }
  if (req.body?.isPublished !== undefined) {
    if (typeof req.body.isPublished !== "boolean") {
      return res.status(400).json({ error: "isPublished must be a boolean" });
    }
    updates.isPublished = req.body.isPublished;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  const [updated] = await db.update(modulesTable).set(updates).where(eq(modulesTable.id, id)).returning();
  await writeAuditLog(req, "module.update", "module", id, { fields: Object.keys(updates) });
  res.json(updated);
});

// DELETE /api/admin/modules/:id
/**
 * Refuses while lessons still point at it. Deleting anyway would either break
 * the foreign key or orphan a course's worth of lessons out of the curriculum
 * with no way to find them again — detach or delete them first, deliberately.
 */
router.delete("/modules/:id", requirePermission("lessons.delete"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid module id" });
  const [existing] = await db.select().from(modulesTable).where(eq(modulesTable.id, id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Module not found" });

  const lessons = await db.select({ id: lessonsTable.id }).from(lessonsTable).where(eq(lessonsTable.moduleId, id));
  if (lessons.length > 0) {
    return res.status(409).json({ error: `Move or delete this module's ${lessons.length} lesson(s) first` });
  }
  const certs = await db.select({ id: certificatesTable.id }).from(certificatesTable).where(eq(certificatesTable.moduleId, id));
  if (certs.length > 0) {
    return res.status(409).json({ error: `${certs.length} certificate(s) were awarded for this module` });
  }

  await db.transaction(async tx => {
    await tx.delete(moduleExamAttemptsTable).where(eq(moduleExamAttemptsTable.moduleId, id));
    await tx.delete(modulesTable).where(eq(modulesTable.id, id));
  });
  await writeAuditLog(req, "module.delete", "module", id, { slug: existing.slug });
  res.json({ success: true });
});

// GET /api/admin/learn-categories
router.get("/learn-categories", requirePermission("lessons.read.all"), async (_req, res) => {
  const categories = await db.select().from(learnCategoriesTable).orderBy(asc(learnCategoriesTable.id));
  const lessons = await db.select({ categoryId: lessonsTable.categoryId }).from(lessonsTable);
  res.json({
    categories: categories.map(c => ({
      id: c.id, name: c.name, nameUz: c.nameUz, nameRu: c.nameRu,
      lessonCount: lessons.filter(l => l.categoryId === c.id).length,
    })),
  });
});

// POST /api/admin/learn-categories
router.post("/learn-categories", requirePermission("lessons.publish"), async (req, res) => {
  const name = optionalText(req.body?.name);
  if (!name) return res.status(400).json({ error: "name is required" });
  const [created] = await db.insert(learnCategoriesTable).values({
    name, nameUz: optionalText(req.body?.nameUz), nameRu: optionalText(req.body?.nameRu),
  }).returning();
  await writeAuditLog(req, "learn_category.create", "learn_category", created.id, { name });
  res.status(201).json(created);
});

// PATCH /api/admin/learn-categories/:id
router.patch("/learn-categories/:id", requirePermission("lessons.publish"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid category id" });
  const updates: Record<string, unknown> = {};
  if (req.body?.name !== undefined) {
    const name = optionalText(req.body.name);
    if (!name) return res.status(400).json({ error: "name cannot be empty" });
    updates.name = name;
  }
  for (const field of ["nameUz", "nameRu"] as const) {
    if (req.body?.[field] !== undefined) updates[field] = optionalText(req.body[field]);
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  const [updated] = await db.update(learnCategoriesTable).set(updates).where(eq(learnCategoriesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Category not found" });
  await writeAuditLog(req, "learn_category.update", "learn_category", id, { fields: Object.keys(updates) });
  res.json(updated);
});

// DELETE /api/admin/learn-categories/:id
router.delete("/learn-categories/:id", requirePermission("lessons.delete"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid category id" });
  const lessons = await db.select({ id: lessonsTable.id }).from(lessonsTable).where(eq(lessonsTable.categoryId, id));
  if (lessons.length > 0) {
    return res.status(409).json({ error: `${lessons.length} lesson(s) still use this category` });
  }
  const modules = await db.select({ id: modulesTable.id }).from(modulesTable).where(eq(modulesTable.categoryId, id));
  if (modules.length > 0) {
    return res.status(409).json({ error: `${modules.length} module(s) still use this category` });
  }
  const [deleted] = await db.delete(learnCategoriesTable).where(eq(learnCategoriesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Category not found" });
  await writeAuditLog(req, "learn_category.delete", "learn_category", id, { name: deleted.name });
  res.json({ success: true });
});

/* ---------------------------------------------------------------------------
 * Writeups.
 *
 * `ctf_writeups.is_published` exists, the public read filters on it, and
 * nothing in the codebase ever set it to false — so the column was a moderation
 * switch with no switch attached. The only lever staff had was deleting the
 * writeup outright, which is not a proportionate response to a spoiler in the
 * wrong place or a first draft that leaks a flag.
 *
 * There was also no way to see writeups at all without first solving the
 * challenge they belong to, which is the correct rule for learners and a
 * useless one for whoever has to moderate them.
 * ------------------------------------------------------------------------ */

// GET /api/admin/writeups
router.get("/writeups", requirePermission("writeups.moderate"), async (req, res) => {
  const { limit, offset } = pageWindow(req);
  const [{ total }] = await db.select({ total: count() }).from(ctfWriteupsTable);
  const writeups = await db.select({
    id: ctfWriteupsTable.id,
    ctfId: ctfWriteupsTable.ctfId,
    ctfName: ctfTasksTable.name,
    authorId: ctfWriteupsTable.userId,
    authorNickname: usersTable.nickname,
    content: ctfWriteupsTable.content,
    isPublished: ctfWriteupsTable.isPublished,
    createdAt: ctfWriteupsTable.createdAt,
    updatedAt: ctfWriteupsTable.updatedAt,
  })
    .from(ctfWriteupsTable)
    .innerJoin(usersTable, eq(ctfWriteupsTable.userId, usersTable.id))
    .innerJoin(ctfTasksTable, eq(ctfWriteupsTable.ctfId, ctfTasksTable.id))
    .orderBy(desc(ctfWriteupsTable.updatedAt))
    .limit(limit).offset(offset);

  res.json({
    total, limit, offset,
    writeups: writeups.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
});

// PATCH /api/admin/writeups/:id
router.patch("/writeups/:id", requirePermission("writeups.moderate"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid writeup id" });
  if (typeof req.body?.isPublished !== "boolean") {
    return res.status(400).json({ error: "isPublished must be a boolean" });
  }

  const [updated] = await db.update(ctfWriteupsTable)
    .set({ isPublished: req.body.isPublished })
    .where(eq(ctfWriteupsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Writeup not found" });

  // Hiding someone's work is a moderation decision; it belongs in the record.
  await writeAuditLog(req, "writeup.moderate", "writeup", id, {
    isPublished: updated.isPublished, authorId: updated.userId, ctfId: updated.ctfId,
  });
  res.json({ id: updated.id, isPublished: updated.isPublished });
});

/* ---------------------------------------------------------------------------
 * Module exams.
 *
 * Fifteen questions per module decide who gets a certificate, and until now the
 * only way to write or correct one was SQL against the live database. The
 * lesson editor has had a form for its questions all along; the exam — the
 * higher-stakes half of the same system — had nothing.
 * ------------------------------------------------------------------------ */

/** An exam session with nothing newer than this behind it is abandoned. */
const EXAM_SESSION_STALE_MS = 3 * 60 * 60 * 1000;

type ExamQuestion = {
  question: string;
  questionUz: string | null;
  questionRu: string | null;
  options: string[];
  optionsUz: string[] | null;
  optionsRu: string[] | null;
  correctOption: number;
};

/**
 * Validates one submitted exam question, or explains what is wrong with it.
 *
 * The answer lists are index-aligned: `correctOption` indexes all three of
 * them, so a translation of a different length silently points the Uzbek reader
 * at the wrong answer. Trailing blanks are dropped because a form with four
 * boxes is used to write a two-answer question; a blank in the *middle* is an
 * error rather than a silent renumbering, for the same reason.
 */
function parseExamQuestion(raw: unknown, index: number): { ok: true; value: ExamQuestion } | { ok: false; error: string } {
  const where = `Question ${index + 1}`;
  if (typeof raw !== "object" || raw === null) return { ok: false, error: `${where}: not an object` };
  const q = raw as Record<string, unknown>;

  const text = typeof q.question === "string" ? q.question.trim() : "";
  if (!text) return { ok: false, error: `${where}: text is required` };

  if (!Array.isArray(q.options)) return { ok: false, error: `${where}: options must be a list` };
  const options = q.options.map(o => (typeof o === "string" ? o.trim() : ""));
  while (options.length > 0 && options[options.length - 1] === "") options.pop();
  if (options.length < 2) return { ok: false, error: `${where}: needs at least two answers` };
  if (options.some(o => o === "")) return { ok: false, error: `${where}: an answer in the middle is blank` };

  const correctOption = Number(q.correctOption);
  if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) {
    return { ok: false, error: `${where}: the correct answer is not one of the answers` };
  }

  const align = (value: unknown): string[] | null => {
    if (!Array.isArray(value)) return null;
    const cut = options.map((_, i) => (typeof value[i] === "string" ? (value[i]).trim() : ""));
    return cut.some(Boolean) ? cut : null;
  };

  return {
    ok: true,
    value: {
      question: text,
      questionUz: typeof q.questionUz === "string" && q.questionUz.trim() ? q.questionUz.trim() : null,
      questionRu: typeof q.questionRu === "string" && q.questionRu.trim() ? q.questionRu.trim() : null,
      options,
      optionsUz: align(q.optionsUz),
      optionsRu: align(q.optionsRu),
      correctOption,
    },
  };
}

// GET /api/admin/modules/:id/questions
router.get("/modules/:id/questions", requirePermission("lessons.read.all"), async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });
  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId)).limit(1);
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const questions = await db.select().from(moduleQuestionsTable)
    .where(eq(moduleQuestionsTable.moduleId, moduleId))
    .orderBy(asc(moduleQuestionsTable.orderIndex), asc(moduleQuestionsTable.id));

  // Context the editor needs in order to warn honestly before a change lands.
  const certificates = await db.select({ id: certificatesTable.id }).from(certificatesTable)
    .where(eq(certificatesTable.moduleId, moduleId));
  const attempts = await db.select().from(moduleExamAttemptsTable)
    .where(eq(moduleExamAttemptsTable.moduleId, moduleId));
  const now = Date.now();
  const activeSessions = attempts.filter(a =>
    a.examSessionId !== null && a.examStartedAt !== null
    && now - a.examStartedAt.getTime() < EXAM_SESSION_STALE_MS).length;

  res.json({
    moduleId,
    passScore: mod.passScore,
    certificateCount: certificates.length,
    activeSessions,
    questions,
  });
});

// PUT /api/admin/modules/:id/questions
/**
 * Replaces the whole question set, which is how the lesson editor works too.
 *
 * Replacing means new row ids, and submitting an exam checks every answer
 * against the ids handed out when the session started — so a learner who is
 * sitting the exam right now would have their submission rejected wholesale.
 * That is why an in-flight session refuses the write instead of racing it.
 */
router.put("/modules/:id/questions", requirePermission("lessons.publish"), async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });
  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId)).limit(1);
  if (!mod) return res.status(404).json({ error: "Module not found" });

  if (!Array.isArray(req.body?.questions)) return res.status(400).json({ error: "questions must be a list" });
  if (req.body.questions.length === 0) {
    // An empty exam is not a draft state: start returns "Module has no exam yet"
    // and the module becomes uncompletable. Deliberate deletion, not a typo.
    if (req.body.confirmEmpty !== true) {
      return res.status(400).json({ error: "An exam with no questions makes the module uncompletable. Send confirmEmpty to do it anyway." });
    }
  }

  const parsed: ExamQuestion[] = [];
  for (const [i, raw] of req.body.questions.entries()) {
    const result = parseExamQuestion(raw, i);
    if (!result.ok) return res.status(400).json({ error: result.error });
    parsed.push(result.value);
  }

  const now = Date.now();
  const attempts = await db.select().from(moduleExamAttemptsTable)
    .where(eq(moduleExamAttemptsTable.moduleId, moduleId));
  const inFlight = attempts.filter(a =>
    a.examSessionId !== null && a.examStartedAt !== null
    && now - a.examStartedAt.getTime() < EXAM_SESSION_STALE_MS).length;
  if (inFlight > 0) {
    return res.status(409).json({
      error: `${inFlight} learner(s) are sitting this exam right now. Their answers would be rejected — try again shortly.`,
    });
  }

  await db.transaction(async tx => {
    await tx.delete(moduleQuestionsTable).where(eq(moduleQuestionsTable.moduleId, moduleId));
    for (const [i, q] of parsed.entries()) {
      await tx.insert(moduleQuestionsTable).values({
        moduleId,
        question: q.question, questionUz: q.questionUz, questionRu: q.questionRu,
        options: q.options, optionsUz: q.optionsUz, optionsRu: q.optionsRu,
        correctOption: q.correctOption, orderIndex: i,
      });
    }
  });

  await writeAuditLog(req, "module.exam_update", "module", moduleId, { questionCount: parsed.length });
  res.json({ moduleId, questionCount: parsed.length });
});

export default router;
