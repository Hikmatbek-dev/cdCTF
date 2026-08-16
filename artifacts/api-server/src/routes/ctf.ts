import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ctfTasksTable, ctfAttemptsTable, ctfWriteupsTable, titlesTable, usersTable, modulesTable, labsTable, labInstancesTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth, requireScope } from "../middleware/auth";
import { hashFlag, isHashedFlag, verifyFlag } from "../lib/flags";
import { awardCategoryTitle, awardPoints } from "../lib/scoring";
import { touchStreak } from "../lib/streaks";
import { moduleSlugForCategory } from "../lib/practice-map";
import { createRateLimiter } from "../middleware/security";
import { validateBody } from "../middleware/validate";
import { SubmitCtfFlagBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { tryActivateReferral } from "../lib/referrals";

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
        solvedCount: 0, isSolved: attempt?.solved ?? false, isBlocked: false,
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

  // Solve counts, aggregated by Postgres.
  //
  // This used to `select().from(ctfAttemptsTable)` — every solved attempt in
  // the database, whole rows, on an unauthenticated page — and count them in a
  // JavaScript loop to produce one integer per challenge. At a hundred
  // thousand learners that is millions of rows deserialized per page view. The
  // GROUP BY is served by ctf_attempts_ctf_id_idx and returns one row per
  // challenge.
  const solveRows = await db.select({
    ctfId: ctfAttemptsTable.ctfId,
    n: sql<number>`count(*)::int`,
  })
    .from(ctfAttemptsTable)
    .where(eq(ctfAttemptsTable.solved, true))
    .groupBy(ctfAttemptsTable.ctfId);
  const solveMap = new Map<number, number>(solveRows.map(r => [r.ctfId, r.n]));

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

// GET /api/ctf/writeups — a public browse of published write-ups (the
// Walkthroughs tab). Metadata only: title/author/challenge, never the body —
// the write-up text still opens only after the reader solves the challenge, so
// this discovers walkthroughs without spoiling them. Registered before "/:id"
// so the literal path wins over the id matcher.
router.get("/writeups", optionalAuth, requireScope("ctf:read"), async (_req, res) => {
  const rows = await db.select({
    id: ctfWriteupsTable.id,
    ctfId: ctfWriteupsTable.ctfId,
    ctfName: ctfTasksTable.name,
    category: ctfTasksTable.category,
    difficulty: ctfTasksTable.difficulty,
    authorNickname: usersTable.nickname,
    createdAt: ctfWriteupsTable.createdAt,
  })
    .from(ctfWriteupsTable)
    .innerJoin(ctfTasksTable, eq(ctfWriteupsTable.ctfId, ctfTasksTable.id))
    .innerJoin(usersTable, eq(ctfWriteupsTable.userId, usersTable.id))
    .where(and(eq(ctfWriteupsTable.isPublished, true), eq(ctfTasksTable.isPublished, true)))
    .orderBy(desc(ctfWriteupsTable.createdAt))
    .limit(60);
  res.json(rows.map(w => ({ ...w, createdAt: w.createdAt.toISOString() })));
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

  // How many people have solved this. The schema declares `solvedCount` as a
  // required field of the detail response, but this handler never sent it — so
  // the client read `undefined`, printed a blank solve count, and rendered
  // `solvedCount / total` as "NaN%". One indexed aggregate fills the contract.
  const [{ n: solvedCount }] = await db.select({ n: sql<number>`count(*)::int` })
    .from(ctfAttemptsTable)
    .where(and(eq(ctfAttemptsTable.ctfId, ctfId), eq(ctfAttemptsTable.solved, true)));

  // The module that teaches this. Somebody stuck on a Crypto challenge was
  // never shown that there are eight lessons here about exactly that — the two
  // halves of the platform did not point at each other.
  let teaches: { id: number; slug: string; title: string; titleUz: string | null; titleRu: string | null } | null = null;
  const teachingSlug = moduleSlugForCategory(challenge.category);
  if (teachingSlug) {
    const [mod] = await db.select({
      id: modulesTable.id, slug: modulesTable.slug,
      title: modulesTable.title, titleUz: modulesTable.titleUz, titleRu: modulesTable.titleRu,
    }).from(modulesTable)
      .where(and(eq(modulesTable.slug, teachingSlug), eq(modulesTable.isPublished, true)))
      .limit(1);
    teaches = mod ?? null;
  }

  res.json({
    id: challenge.id,
    name: challenge.name,
    nameUz: challenge.nameUz,
    nameRu: challenge.nameRu,
    learnModule: teaches,
    description: challenge.description,
    descriptionUz: challenge.descriptionUz,
    descriptionRu: challenge.descriptionRu,
    category: challenge.category,
    difficulty: challenge.difficulty,
    points: challenge.points,
    solvedCount,
    fileUrl: challenge.fileUrl,
    isSolved: userAttempt?.solved ?? false,
    isBlocked: false,
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
    if (attempt?.hintUsed) return { charged: 0, affordable: true };

    // The charge used to be `Math.min(points, hintCost)`, which meant an account
    // with zero points paid nothing and still got the hint — so a fresh
    // registration could read every hint on the platform for free before solving
    // anything. It also disagreed with recalculateUserPoints, which subtracts the
    // *full* cost for every hintUsed row: a later "recalculate points" run
    // charged people retroactively for hints they were given free.
    const [user] = await tx.select({ points: usersTable.points, credits: usersTable.freeHintCredits })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1).for("update");
    const points = user?.points ?? 0;
    const credits = user?.credits ?? 0;

    // A referral reward: spend a free-hint credit before touching points. Each
    // credit came from activating one invite, so this is where the referral
    // programme pays out on the challenge page.
    const useCredit = credits > 0;
    if (!useCredit && points < challenge.hintCost) {
      return { charged: 0, affordable: false, points, credits };
    }

    if (attempt) {
      await tx.update(ctfAttemptsTable).set({ hintUsed: true, updatedAt: new Date() })
        .where(eq(ctfAttemptsTable.id, attempt.id));
    } else {
      await tx.insert(ctfAttemptsTable).values({ userId, ctfId, hintUsed: true, updatedAt: new Date() });
    }

    if (useCredit) {
      await tx.update(usersTable).set({ freeHintCredits: credits - 1 })
        .where(eq(usersTable.id, userId));
      return { charged: 0, affordable: true, usedCredit: true };
    }
    await tx.update(usersTable).set({ points: points - challenge.hintCost })
      .where(eq(usersTable.id, userId));
    return { charged: challenge.hintCost, affordable: true };
  });

  if (!payload.affordable) {
    return res.status(402).json({
      error: "Not enough points for this hint",
      hintCost: challenge.hintCost,
      points: payload.points,
    });
  }

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
        const isBlocked = false; // Never block permanently, rely on rate limiter

        if (!attempt) {
          await tx.insert(ctfAttemptsTable).values({ userId, ctfId, wrongAttempts, blocked: false, updatedAt: new Date() });
        } else {
          await tx.update(ctfAttemptsTable).set({ wrongAttempts, blocked: false, updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
        }

        return { status: 200, data: { correct: false, blocked: false, wrongAttempts } };
      }
    });

    // A first solve is one half of what activates the invite that brought this
    // learner in. After the transaction, and only when they actually solved it.
    if ((result.data as { correct?: boolean }).correct) void tryActivateReferral(userId);

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
