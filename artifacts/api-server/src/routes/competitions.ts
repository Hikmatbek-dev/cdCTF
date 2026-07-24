import { Router } from "express";
import { db } from "@workspace/db";
import {
  competitionsTable, competitionTasksTable, competitionUsersTable,
  competitionSolvesTable, competitionTeamsTable, ctfTasksTable, ctfAttemptsTable, usersTable,
} from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { createRateLimiter } from "../middleware/security";
import { validateBody } from "../middleware/validate";
import { SubmitCompetitionFlagBody } from "@workspace/api-zod";
import { verifyFlag } from "../lib/flags";
import { awardPoints } from "../lib/scoring";

const router = Router();
// Same budget as the standalone CTF submit route — without it this endpoint is a
// rate-limit-free path to the very same flag check.
// "shared": stopping flag grinding is the point, so the budget cannot reset
// each time the platform hands the attacker a different instance.
const flagRateLimit = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 10, keyPrefix: "flag", store: "shared" });

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
    sponsorName: comp.sponsorName,
    prize: comp.prize,
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

  // The caller's team in this competition, if any — so the page can show "You're
  // in team X" and hand the captain the invite code to share.
  let myTeam: { id: number; name: string; inviteCode: string; isCaptain: boolean } | null = null;
  if (userId) {
    const [mine] = await db.select({ teamId: competitionUsersTable.teamId })
      .from(competitionUsersTable)
      .where(and(eq(competitionUsersTable.competitionId, id), eq(competitionUsersTable.userId, userId))).limit(1);
    if (mine?.teamId) {
      const [team] = await db.select().from(competitionTeamsTable).where(eq(competitionTeamsTable.id, mine.teamId)).limit(1);
      if (team) myTeam = { id: team.id, name: team.name, inviteCode: team.inviteCode, isCaptain: team.captainId === userId };
    }
  }

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
    sponsorName: comp.sponsorName,
    sponsorLogoUrl: comp.sponsorLogoUrl,
    sponsorUrl: comp.sponsorUrl,
    prize: comp.prize,
    myTeam,
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

/** Postgres unique-violation SQLSTATE — a name or code collision, not a bug.
 * Drizzle wraps the driver error in a DrizzleQueryError, so the real pg error
 * (with its SQLSTATE) sits on `.cause`; walk the chain to find it. */
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object" && "code" in current && (current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

// POST /api/competitions/:id/teams — create a team and join it as captain.
router.post("/:id/teams", authenticateToken, async (req, res) => {
  const compId = Number(req.params.id);
  const userId = req.user!.userId;
  const name = String(req.body?.name ?? "").trim();
  if (!Number.isInteger(compId)) return res.status(400).json({ error: "Invalid id" });
  if (name.length < 2 || name.length > 40) return res.status(400).json({ error: "Team name must be 2-40 characters" });

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, compId)).limit(1);
  if (!comp) return res.status(404).json({ error: "Not found" });
  if (getStatus(comp.startTime, comp.endTime) === "ended") return res.status(400).json({ error: "Competition already ended" });
  // A private competition still gates on its own invite code: the captain must
  // be entitled to be in the competition before they can form a team in it.
  if (comp.type === "private") {
    const inviteCode = String(req.body?.inviteCode ?? "").trim();
    if (!comp.inviteCode || inviteCode !== comp.inviteCode) return res.status(403).json({ error: "Invalid invite code" });
  }

  const [membership] = await db.select().from(competitionUsersTable)
    .where(and(eq(competitionUsersTable.competitionId, compId), eq(competitionUsersTable.userId, userId))).limit(1);
  if (membership?.teamId) return res.status(409).json({ error: "You are already in a team" });

  const teamCode = randomUUID().slice(0, 8);
  try {
    const team = await db.transaction(async tx => {
      const [created] = await tx.insert(competitionTeamsTable)
        .values({ competitionId: compId, name, inviteCode: teamCode, captainId: userId }).returning();
      if (membership) {
        await tx.update(competitionUsersTable).set({ teamId: created.id }).where(eq(competitionUsersTable.id, membership.id));
      } else {
        await tx.insert(competitionUsersTable).values({ competitionId: compId, userId, teamId: created.id });
      }
      return created;
    });
    return res.status(201).json({ id: team.id, name: team.name, inviteCode: team.inviteCode, isCaptain: true });
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: "A team with that name already exists here" });
    throw err;
  }
});

// POST /api/competitions/:id/teams/join — join a team by its code.
router.post("/:id/teams/join", authenticateToken, async (req, res) => {
  const compId = Number(req.params.id);
  const userId = req.user!.userId;
  const teamCode = String(req.body?.inviteCode ?? "").trim();
  if (!Number.isInteger(compId)) return res.status(400).json({ error: "Invalid id" });
  if (!teamCode) return res.status(400).json({ error: "Team code is required" });

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, compId)).limit(1);
  if (!comp) return res.status(404).json({ error: "Not found" });
  if (getStatus(comp.startTime, comp.endTime) === "ended") return res.status(400).json({ error: "Competition already ended" });

  const [team] = await db.select().from(competitionTeamsTable)
    .where(and(eq(competitionTeamsTable.competitionId, compId), eq(competitionTeamsTable.inviteCode, teamCode))).limit(1);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const [membership] = await db.select().from(competitionUsersTable)
    .where(and(eq(competitionUsersTable.competitionId, compId), eq(competitionUsersTable.userId, userId))).limit(1);
  if (membership?.teamId === team.id) return res.json({ joined: true, teamId: team.id, name: team.name });
  if (membership?.teamId) return res.status(409).json({ error: "You are already in another team" });

  // The team code doubles as competition access — the captain vouched for them.
  // Any solo solves made before joining stay individual (they carry no team_id);
  // from here on this member's solves count for the team.
  if (membership) {
    await db.update(competitionUsersTable).set({ teamId: team.id }).where(eq(competitionUsersTable.id, membership.id));
  } else {
    await db.insert(competitionUsersTable).values({ competitionId: compId, userId, teamId: team.id });
  }
  res.status(201).json({ joined: true, teamId: team.id, name: team.name });
});

// GET /api/competitions/:id/teams — ranked team leaderboard.
router.get("/:id/teams", async (req, res) => {
  const compId = Number(req.params.id);
  if (!Number.isInteger(compId)) return res.status(400).json({ error: "Invalid id" });

  const teams = await db.select().from(competitionTeamsTable).where(eq(competitionTeamsTable.competitionId, compId));
  if (teams.length === 0) return res.json([]);

  const [solves, members] = await Promise.all([
    db.select({ teamId: competitionSolvesTable.teamId, points: competitionSolvesTable.pointsEarned })
      .from(competitionSolvesTable).where(eq(competitionSolvesTable.competitionId, compId)),
    db.select({ teamId: competitionUsersTable.teamId, nickname: usersTable.nickname })
      .from(competitionUsersTable)
      .innerJoin(usersTable, eq(competitionUsersTable.userId, usersTable.id))
      .where(eq(competitionUsersTable.competitionId, compId)),
  ]);

  const pointsByTeam = new Map<number, number>();
  const solvedByTeam = new Map<number, number>();
  for (const s of solves) {
    if (s.teamId == null) continue;
    pointsByTeam.set(s.teamId, (pointsByTeam.get(s.teamId) ?? 0) + s.points);
    solvedByTeam.set(s.teamId, (solvedByTeam.get(s.teamId) ?? 0) + 1);
  }
  const membersByTeam = new Map<number, string[]>();
  for (const m of members) {
    if (m.teamId == null) continue;
    const list = membersByTeam.get(m.teamId) ?? [];
    list.push(m.nickname);
    membersByTeam.set(m.teamId, list);
  }

  const board = teams
    .map(t => ({
      teamId: t.id,
      name: t.name,
      points: pointsByTeam.get(t.id) ?? 0,
      solvedCount: solvedByTeam.get(t.id) ?? 0,
      members: membersByTeam.get(t.id) ?? [],
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  res.json(board);
});

// POST /api/competitions/:id/ctf/:ctfId/submit
router.post("/:id/ctf/:ctfId/submit", authenticateToken, flagRateLimit, validateBody(SubmitCompetitionFlagBody), async (req, res) => {
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

  const [challenge] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, ctfId)).limit(1);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  // Everything below runs in one transaction: the solve check, the insert and the
  // points update must be atomic, or two concurrent submits both pass the
  // "already solved?" check and the user is paid twice.
  // The team this member plays under, if any. In the shared-solve model a
  // challenge counts once for the whole team, so the "already solved?" check
  // and the score both key off the team, not the individual.
  const teamId = membership.teamId ?? null;

  const outcome = await db.transaction(async tx => {
    // Already solved — by this user, or (if they are on a team) by any teammate.
    const [existingSolve] = await tx.select().from(competitionSolvesTable)
      .where(and(
        eq(competitionSolvesTable.competitionId, compId),
        eq(competitionSolvesTable.ctfId, ctfId),
        teamId != null
          ? or(eq(competitionSolvesTable.userId, userId), eq(competitionSolvesTable.teamId, teamId))
          : eq(competitionSolvesTable.userId, userId),
      ))
      .limit(1)
      .for("update");
    if (existingSolve) return { status: 200, data: { correct: true, alreadySolved: true, pointsEarned: 0 } };

    const [attempt] = await tx.select().from(ctfAttemptsTable)
      .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.ctfId, ctfId)))
      .limit(1)
      .for("update");

    if (attempt?.blocked) return { status: 200, data: { correct: false, blocked: true, wrongAttempts: attempt.wrongAttempts } };

    if (!verifyFlag(flag, challenge.flag)) {
      const newWrongAttempts = (attempt?.wrongAttempts ?? 0) + 1;
      const blocked = newWrongAttempts >= 3;
      if (!attempt) {
        await tx.insert(ctfAttemptsTable).values({ userId, ctfId, wrongAttempts: newWrongAttempts, blocked, blockedAt: blocked ? new Date() : undefined, updatedAt: new Date() });
      } else {
        await tx.update(ctfAttemptsTable).set({ wrongAttempts: newWrongAttempts, blocked, blockedAt: blocked ? new Date() : null, updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
      }
      return { status: 200, data: { correct: false, blocked, wrongAttempts: newWrongAttempts } };
    }

    // Whether this challenge already counted toward the global score — either
    // through the main CTF list or an earlier competition that shares it. A
    // challenge's points must land in users.points once; without this guard,
    // solving it in the main pool and then again inside a competition paid
    // twice, because the main-pool submit blocks a re-award but this one did
    // not. The competition solve is still recorded either way, so the
    // competition's own leaderboard is unaffected.
    const alreadyCountedGlobally = attempt?.solved === true;

    await tx.insert(competitionSolvesTable).values({ competitionId: compId, ctfId, userId, teamId, pointsEarned: challenge.points });
    if (!attempt) {
      await tx.insert(ctfAttemptsTable).values({ userId, ctfId, solved: true, solvedAt: new Date(), updatedAt: new Date() });
    } else if (!attempt.solved) {
      await tx.update(ctfAttemptsTable).set({ solved: true, solvedAt: new Date(), updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
    }

    const pointsEarned = alreadyCountedGlobally ? 0 : await awardPoints(tx, userId, challenge.points);

    return { status: 200, data: { correct: true, alreadySolved: false, pointsEarned } };
  });

  res.status(outcome.status).json(outcome.data);
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
