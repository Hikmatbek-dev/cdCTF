import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ctfTasksTable, ctfAttemptsTable, ctfWriteupsTable, titlesTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateToken, optionalAuth, requireScope } from "../middleware/auth";
import { hashFlag, isHashedFlag, verifyFlag } from "../lib/flags";
import { awardCategoryTitle, awardPoints } from "../lib/scoring";
import { touchStreak } from "../lib/streaks";
import { createRateLimiter } from "../middleware/security";
import { validateBody } from "../middleware/validate";
import { SubmitCtfFlagBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();
// "shared": stopping flag grinding is the point, so the budget cannot reset
// each time the platform hands the attacker a different instance.
const flagRateLimit = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 10, keyPrefix: "flag", store: "shared" });

// GET /api/ctf
router.get("/", optionalAuth, requireScope("ctf:read"), async (req, res) => {
  const { category, difficulty, search, solved } = req.query as Record<string, string>;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const userId = req.user?.userId;

  // Drafts are visible only through the admin routes.
  const published = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.isPublished, true));
  let challenges = published;

  // Which categories and difficulties actually have something in them. The
  // filter used a hardcoded list of sixteen categories while only nine were
  // populated, so picking Pwn or OSINT returned an empty page with no
  // explanation. Counted before the filters are applied, so choosing one
  // option does not make the others disappear.
  const countBy = (key: "category" | "difficulty") => {
    const counts = new Map<string, number>();
    for (const c of published) {
      const v = c[key];
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  };
  const facets = { categories: countBy("category"), difficulties: countBy("difficulty") };

  if (category && category !== "All") challenges = challenges.filter(c => c.category === category);
  if (difficulty && difficulty !== "All") challenges = challenges.filter(c => c.difficulty === difficulty);
  if (search) challenges = challenges.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  let result;
  if (userId) {
    const attempts = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.userId, userId));
    const attemptMap = new Map(attempts.map(a => [a.ctfId, a]));
    result = challenges.map(ch => {
      const attempt = attemptMap.get(ch.id);
      return {
        id: ch.id, name: ch.name, nameUz: ch.nameUz, nameRu: ch.nameRu,
        category: ch.category, difficulty: ch.difficulty, points: ch.points,
        solvedCount: 0, isSolved: attempt?.solved ?? false, isBlocked: attempt?.blocked ?? false,
        wrongAttempts: attempt?.wrongAttempts ?? 0, hintUsed: attempt?.hintUsed ?? false,
        fileUrl: ch.fileUrl,
      };
    }).filter(ch => {
      if (solved === "true") return ch.isSolved;
      if (solved === "false") return !ch.isSolved;
      return true;
    });
  } else {
    result = challenges.map(ch => ({
      id: ch.id, name: ch.name, nameUz: ch.nameUz, nameRu: ch.nameRu,
      category: ch.category, difficulty: ch.difficulty, points: ch.points,
      solvedCount: 0, isSolved: false, isBlocked: false, wrongAttempts: 0, hintUsed: false, fileUrl: ch.fileUrl,
    }));
  }

  // Compute solvedCount for each
  const allAttempts = await db.select().from(ctfAttemptsTable).where(eq(ctfAttemptsTable.solved, true));
  const solveMap = new Map<number, number>();
  for (const a of allAttempts) {
    solveMap.set(a.ctfId, (solveMap.get(a.ctfId) ?? 0) + 1);
  }

  result.forEach(ch => {
    ch.solvedCount = solveMap.get(ch.id) ?? 0;
  });

  const total = result.length;
  const paginatedResult = result.slice((page - 1) * limit, page * limit);

  res.json({
    challenges: paginatedResult,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    // Every published challenge, not just this page — the filter needs the
    // whole picture, and the landing quotes the real count instead of "40+".
    publishedTotal: published.length,
    facets,
  });
});

// GET /api/ctf/:id
router.get("/:id", optionalAuth, requireScope("ctf:read"), async (req, res) => {
  const ctfId = Number(req.params.id);
  const userId = req.user?.userId;

  if (!Number.isInteger(ctfId) || ctfId <= 0) return res.status(400).json({ error: "Invalid CTF id" });

  const [challenge] = await db.select().from(ctfTasksTable)
    .where(and(eq(ctfTasksTable.id, ctfId), eq(ctfTasksTable.isPublished, true)))
    .limit(1);
  if (!challenge) return res.status(404).json({ error: "Not found" });

  let userAttempt = null;
  if (userId) {
    [userAttempt] = await db.select().from(ctfAttemptsTable).where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.ctfId, ctfId))).limit(1);
  }

  res.json({
    id: challenge.id,
    name: challenge.name,
    nameUz: challenge.nameUz,
    nameRu: challenge.nameRu,
    description: challenge.description,
    descriptionUz: challenge.descriptionUz,
    descriptionRu: challenge.descriptionRu,
    category: challenge.category,
    difficulty: challenge.difficulty,
    points: challenge.points,
    fileUrl: challenge.fileUrl,
    isSolved: userAttempt?.solved ?? false,
    isBlocked: userAttempt?.blocked ?? false,
    wrongAttempts: userAttempt?.wrongAttempts ?? 0,
    // Hint state, not the hint itself. The text only travels once it has been
    // paid for — otherwise anyone could read it out of the network response and
    // the cost would mean nothing.
    hasHint: Boolean(challenge.hint?.trim()),
    hintCost: challenge.hintCost,
    hintUsed: userAttempt?.hintUsed ?? false,
    hint: userAttempt?.hintUsed ? challenge.hint : null,
    hintUz: userAttempt?.hintUsed ? challenge.hintUz : null,
    hintRu: userAttempt?.hintUsed ? challenge.hintRu : null,
  });
});

// POST /api/ctf/:id/hint — buy the hint with points.
//
// The schema has carried `hint`, `hint_cost` and `hint_used` from the start and
// challenges were imported with hints written, but nothing ever exposed them:
// no endpoint, no UI. The hints existed and no learner could ever read one.
router.post("/:id/hint", authenticateToken, async (req, res) => {
  const ctfId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(ctfId) || ctfId <= 0) return res.status(400).json({ error: "Invalid CTF id" });

  const [challenge] = await db.select().from(ctfTasksTable)
    .where(and(eq(ctfTasksTable.id, ctfId), eq(ctfTasksTable.isPublished, true))).limit(1);
  if (!challenge) return res.status(404).json({ error: "Not found" });
  if (!challenge.hint?.trim()) return res.status(404).json({ error: "This challenge has no hint" });

  const payload = await db.transaction(async tx => {
    const [attempt] = await tx.select().from(ctfAttemptsTable)
      .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.ctfId, ctfId)))
      .limit(1).for("update");

    // Already paid: hand it back for free rather than charging twice.
    if (attempt?.hintUsed) return { charged: 0 };

    if (attempt) {
      await tx.update(ctfAttemptsTable).set({ hintUsed: true, updatedAt: new Date() })
        .where(eq(ctfAttemptsTable.id, attempt.id));
    } else {
      await tx.insert(ctfAttemptsTable).values({ userId, ctfId, hintUsed: true, updatedAt: new Date() });
    }

    // Charge, never below zero. recalculateUserPoints subtracts the same hint
    // costs, so a later repair does not refund this.
    const [user] = await tx.select({ points: usersTable.points }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1).for("update");
    const charged = Math.min(user?.points ?? 0, challenge.hintCost);
    if (charged > 0) {
      await tx.update(usersTable).set({ points: (user!.points) - charged }).where(eq(usersTable.id, userId));
    }
    return { charged };
  });

  res.json({
    hint: challenge.hint,
    hintUz: challenge.hintUz,
    hintRu: challenge.hintRu,
    pointsSpent: payload.charged,
  });
});

async function submitFlagHandler(req: Request, res: Response) {
  const ctfId = Number(req.params.id);
  const userId = req.user!.userId;
  const { flag } = req.body;

  if (!Number.isInteger(ctfId) || ctfId <= 0) return res.status(400).json({ error: "Invalid CTF id" });
  if (typeof flag !== "string" || flag.trim().length === 0 || flag.length > 512) {
    return res.status(400).json({ error: "Flag is required" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Published-only: a draft must not be solvable by anyone who guesses its id.
      const [challenge] = await tx.select().from(ctfTasksTable)
        .where(and(eq(ctfTasksTable.id, ctfId), eq(ctfTasksTable.isPublished, true)))
        .limit(1);
      if (!challenge) return { status: 404, data: { error: "Not found" } };

      const [attempt] = await tx.select().from(ctfAttemptsTable)
        .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.ctfId, ctfId)))
        .limit(1);

      if (attempt?.solved) return { status: 200, data: { correct: true, blocked: false, wrongAttempts: attempt.wrongAttempts } };
      if (attempt?.blocked) return { status: 200, data: { correct: false, blocked: true, wrongAttempts: attempt.wrongAttempts } };

      if (verifyFlag(flag, challenge.flag)) {
        if (!isHashedFlag(challenge.flag)) {
          await tx.update(ctfTasksTable).set({ flag: hashFlag(challenge.flag) }).where(eq(ctfTasksTable.id, ctfId));
        }

        if (!attempt) {
          await tx.insert(ctfAttemptsTable).values({ userId, ctfId, solved: true, solvedAt: new Date(), wrongAttempts: 0, updatedAt: new Date() });
        } else {
          await tx.update(ctfAttemptsTable).set({ solved: true, solvedAt: new Date(), updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
        }

        const pointsEarned = await awardPoints(tx, userId, challenge.points);
        // Inside the transaction, and awaited. This used to be a fire-and-forget
        // `void checkAndAwardTitle(...)` after the commit: it escaped the request
        // entirely, so a failure surfaced as an unhandled rejection, and on
        // serverless the lambda could freeze before it ran and silently drop the
        // title. It also re-read the challenge and indexed [0] on a result that
        // is empty if the challenge was deleted meanwhile.
        const titlePoints = await awardCategoryTitle(tx, userId, challenge.category);
        await touchStreak(tx, userId, new Date());

        return { status: 200, data: { correct: true, blocked: false, pointsEarned: pointsEarned + titlePoints } };
      } else {
        const wrongAttempts = (attempt?.wrongAttempts ?? 0) + 1;
        const isBlocked = wrongAttempts >= 3;

        if (!attempt) {
          await tx.insert(ctfAttemptsTable).values({ userId, ctfId, wrongAttempts, blocked: isBlocked, updatedAt: new Date() });
        } else {
          await tx.update(ctfAttemptsTable).set({ wrongAttempts, blocked: isBlocked, updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
        }

        return { status: 200, data: { correct: false, blocked: isBlocked, wrongAttempts } };
      }
    });

    res.status(result.status).json(result.data);
  } catch (error) {
    logger.error({ err: error }, "Flag submission error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/ctf/:id/submit
router.post("/:id/submit", authenticateToken, requireScope("ctf:submit"), flagRateLimit, validateBody(SubmitCtfFlagBody), submitFlagHandler);

// Backward-compatible alias.
router.post("/:id/flag", authenticateToken, requireScope("ctf:submit"), flagRateLimit, validateBody(SubmitCtfFlagBody), submitFlagHandler);

/** True if `userId` has solved challenge `ctfId`. Writeups are gated on this so
 * they never leak the answer to someone who hasn't solved it yet. */
async function hasSolved(userId: number, ctfId: number): Promise<boolean> {
  const [row] = await db.select({ id: ctfAttemptsTable.id }).from(ctfAttemptsTable)
    .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.ctfId, ctfId), eq(ctfAttemptsTable.solved, true)))
    .limit(1);
  return !!row;
}

// GET /api/ctf/:id/writeups — solvers (and admins) only; a spoiler otherwise.
router.get("/:id/writeups", authenticateToken, async (req, res) => {
  const ctfId = Number(req.params.id);
  if (!Number.isInteger(ctfId) || ctfId <= 0) return res.status(400).json({ error: "Invalid id" });
  const isAdmin = req.user!.role === "admin";
  if (!isAdmin && !await hasSolved(req.user!.userId, ctfId)) {
    return res.status(403).json({ error: "Solve the challenge to read writeups" });
  }

  const rows = await db.select({
    id: ctfWriteupsTable.id,
    content: ctfWriteupsTable.content,
    createdAt: ctfWriteupsTable.createdAt,
    updatedAt: ctfWriteupsTable.updatedAt,
    authorId: ctfWriteupsTable.userId,
    authorNickname: usersTable.nickname,
  })
    .from(ctfWriteupsTable)
    .innerJoin(usersTable, eq(ctfWriteupsTable.userId, usersTable.id))
    .where(and(eq(ctfWriteupsTable.ctfId, ctfId), eq(ctfWriteupsTable.isPublished, true)))
    .orderBy(desc(ctfWriteupsTable.createdAt));

  res.json({ writeups: rows, mine: rows.find(r => r.authorId === req.user!.userId) ?? null });
});

// POST /api/ctf/:id/writeups — create or update your own; must have solved.
router.post("/:id/writeups", authenticateToken, async (req, res) => {
  const ctfId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(ctfId) || ctfId <= 0) return res.status(400).json({ error: "Invalid id" });

  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (content.length < 20) return res.status(400).json({ error: "Writeup is too short (min 20 characters)" });
  if (content.length > 20000) return res.status(400).json({ error: "Writeup is too long" });

  if (!await hasSolved(userId, ctfId)) return res.status(403).json({ error: "Solve the challenge before writing it up" });

  const [existing] = await db.select({ id: ctfWriteupsTable.id }).from(ctfWriteupsTable)
    .where(and(eq(ctfWriteupsTable.ctfId, ctfId), eq(ctfWriteupsTable.userId, userId))).limit(1);

  let saved;
  if (existing) {
    [saved] = await db.update(ctfWriteupsTable).set({ content, updatedAt: new Date() })
      .where(eq(ctfWriteupsTable.id, existing.id)).returning();
  } else {
    [saved] = await db.insert(ctfWriteupsTable).values({ ctfId, userId, content }).returning();
  }
  res.status(existing ? 200 : 201).json({ id: saved.id, content: saved.content, updatedAt: saved.updatedAt });
});

// DELETE /api/ctf/:id/writeups/:writeupId — author or admin.
router.delete("/:id/writeups/:writeupId", authenticateToken, async (req, res) => {
  const writeupId = Number(req.params.writeupId);
  if (!Number.isInteger(writeupId) || writeupId <= 0) return res.status(400).json({ error: "Invalid id" });
  const [w] = await db.select().from(ctfWriteupsTable).where(eq(ctfWriteupsTable.id, writeupId)).limit(1);
  if (!w) return res.status(404).json({ error: "Not found" });
  if (w.userId !== req.user!.userId && req.user!.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await db.delete(ctfWriteupsTable).where(eq(ctfWriteupsTable.id, writeupId));
  res.json({ success: true });
});

export default router;
