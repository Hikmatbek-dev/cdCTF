import { Router } from "express";
import { db } from "@workspace/db";
import {
  competitionsTable, competitionTasksTable, competitionUsersTable,
  competitionSolvesTable, ctfTasksTable, ctfAttemptsTable, usersTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { verifyFlag } from "../lib/flags";

const router = Router();

function getStatus(startTime: Date, endTime: Date): "upcoming" | "active" | "ended" {
  const now = new Date();
  if (now < startTime) return "upcoming";
  if (now > endTime) return "ended";
  return "active";
}

// GET /api/competitions
router.get("/", optionalAuth, async (req, res) => {
  const competitions = await db.select().from(competitionsTable);
  const allTasks = await db.select().from(competitionTasksTable);
  const allUsers = await db.select().from(competitionUsersTable);
  const userId = req.user?.userId;

  const result = competitions.map(comp => ({
    id: comp.id,
    name: comp.name,
    description: comp.description,
    type: comp.type,
    startTime: comp.startTime.toISOString(),
    endTime: comp.endTime.toISOString(),
    status: getStatus(comp.startTime, comp.endTime),
    ctfCount: allTasks.filter(t => t.competitionId === comp.id).length,
    participantCount: allUsers.filter(u => u.competitionId === comp.id).length,
    isJoined: userId ? allUsers.some(u => u.competitionId === comp.id && u.userId === userId) : false,
  }));

  res.json(result);
});

// GET /api/competitions/:id
router.get("/:id", optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
  if (!comp) return res.status(404).json({ error: "Not found" });

  const tasks = await db.select().from(competitionTasksTable).where(eq(competitionTasksTable.competitionId, id));
  const participants = await db.select().from(competitionUsersTable).where(eq(competitionUsersTable.competitionId, id));
  const userId = req.user?.userId;

  const challengeIds = tasks.map(t => t.ctfId);
  const challenges = challengeIds.length > 0
    ? await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, challengeIds[0]))
    : [];

  // Get all challenges for this competition
  const allChallenges = [];
  for (const t of tasks) {
    const [ch] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, t.ctfId)).limit(1);
    if (ch) allChallenges.push({ id: ch.id, name: ch.name, category: ch.category, difficulty: ch.difficulty, points: ch.points });
  }

  res.json({
    id: comp.id,
    name: comp.name,
    description: comp.description,
    type: comp.type,
    startTime: comp.startTime.toISOString(),
    endTime: comp.endTime.toISOString(),
    status: getStatus(comp.startTime, comp.endTime),
    participantCount: participants.length,
    ctfCount: tasks.length,
    isJoined: userId ? participants.some(u => u.userId === userId) : false,
    challenges: allChallenges,
    certificateUrl: null,
  });
});

// POST /api/competitions/:id/join
router.post("/:id/join", authenticateToken, async (req, res) => {
  const compId = Number(req.params.id);
  const userId = req.user!.userId;

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, compId)).limit(1);
  if (!comp) return res.status(404).json({ error: "Not found" });
  if (getStatus(comp.startTime, comp.endTime) === "ended") return res.status(400).json({ error: "Competition already ended" });
  if (comp.type === "private") {
    const inviteCode = String(req.body?.inviteCode ?? req.query.inviteCode ?? "").trim();
    if (!comp.inviteCode || inviteCode !== comp.inviteCode) {
      return res.status(403).json({ error: "Invalid invite code" });
    }
  }

  const [existing] = await db.select().from(competitionUsersTable)
    .where(and(eq(competitionUsersTable.competitionId, compId), eq(competitionUsersTable.userId, userId))).limit(1);

  if (existing) return res.json({ joined: true, message: "Already joined" });

  await db.insert(competitionUsersTable).values({ competitionId: compId, userId });
  res.status(201).json({ joined: true });
});

// POST /api/competitions/:id/ctf/:ctfId/submit
router.post("/:id/ctf/:ctfId/submit", authenticateToken, async (req, res) => {
  const compId = Number(req.params.id);
  const ctfId = Number(req.params.ctfId);
  const userId = req.user!.userId;
  const { flag } = req.body;

  if (!Number.isInteger(compId) || !Number.isInteger(ctfId)) return res.status(400).json({ error: "Invalid id" });
  if (typeof flag !== "string" || flag.trim().length === 0 || flag.length > 512) return res.status(400).json({ error: "Flag is required" });

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, compId)).limit(1);
  if (!comp) return res.status(404).json({ error: "Competition not found" });
  const status = getStatus(comp.startTime, comp.endTime);
  if (status !== "active") return res.status(403).json({ error: "Competition is not active" });

  const [membership] = await db.select().from(competitionUsersTable)
    .where(and(eq(competitionUsersTable.competitionId, compId), eq(competitionUsersTable.userId, userId))).limit(1);
  if (!membership) return res.status(403).json({ error: "Join the competition first" });

  const [task] = await db.select().from(competitionTasksTable)
    .where(and(eq(competitionTasksTable.competitionId, compId), eq(competitionTasksTable.ctfId, ctfId))).limit(1);
  if (!task) return res.status(404).json({ error: "Challenge is not part of this competition" });

  const [existingSolve] = await db.select().from(competitionSolvesTable)
    .where(and(eq(competitionSolvesTable.competitionId, compId), eq(competitionSolvesTable.ctfId, ctfId), eq(competitionSolvesTable.userId, userId))).limit(1);
  if (existingSolve) return res.json({ correct: true, alreadySolved: true, pointsEarned: 0 });

  const [challenge] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, ctfId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  let [attempt] = await db.select().from(ctfAttemptsTable)
    .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.ctfId, ctfId))).limit(1);

  if (attempt?.blocked) return res.json({ correct: false, blocked: true, wrongAttempts: attempt.wrongAttempts });
  if (!verifyFlag(flag, challenge.flag)) {
    const newWrongAttempts = (attempt?.wrongAttempts ?? 0) + 1;
    const blocked = newWrongAttempts >= 3;
    if (!attempt) {
      await db.insert(ctfAttemptsTable).values({ userId, ctfId, wrongAttempts: newWrongAttempts, blocked, blockedAt: blocked ? new Date() : undefined, updatedAt: new Date() });
    } else {
      await db.update(ctfAttemptsTable).set({ wrongAttempts: newWrongAttempts, blocked, blockedAt: blocked ? new Date() : null, updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
    }
    return res.json({ correct: false, blocked, wrongAttempts: newWrongAttempts });
  }

  await db.insert(competitionSolvesTable).values({ competitionId: compId, ctfId, userId, pointsEarned: challenge.points });
  if (!attempt) {
    await db.insert(ctfAttemptsTable).values({ userId, ctfId, solved: true, solvedAt: new Date(), updatedAt: new Date() });
  } else if (!attempt.solved) {
    await db.update(ctfAttemptsTable).set({ solved: true, solvedAt: new Date(), updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
  }

  const [currentUser] = await db.select({ nickname: usersTable.nickname, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (currentUser && currentUser.role !== "admin" && currentUser.nickname !== "bozkurtshadow") {
    await db.update(usersTable).set({ points: sql`${usersTable.points} + ${challenge.points}` }).where(eq(usersTable.id, userId));
  }

  res.json({ correct: true, alreadySolved: false, pointsEarned: challenge.points });
});

// GET /api/competitions/:id/scoreboard
router.get("/:id/scoreboard", async (req, res) => {
  const compId = Number(req.params.id);

  const solves = await db.select().from(competitionSolvesTable).where(eq(competitionSolvesTable.competitionId, compId));
  const participants = await db.select().from(competitionUsersTable).where(eq(competitionUsersTable.competitionId, compId));
  const users = await db.select().from(usersTable);

  const pointsMap = new Map<number, number>();
  for (const s of solves) {
    pointsMap.set(s.userId, (pointsMap.get(s.userId) ?? 0) + s.pointsEarned);
  }

  const board = participants
    .map(p => {
      const user = users.find(u => u.id === p.userId);
      return { userId: p.userId, nickname: user?.nickname ?? "Unknown", points: pointsMap.get(p.userId) ?? 0 };
    })
    .sort((a, b) => b.points - a.points)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  res.json(board);
});

export default router;
