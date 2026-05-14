import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ctfTasksTable, ctfAttemptsTable, usersTable, userTitlesTable, titlesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { hashFlag, isHashedFlag, verifyFlag } from "../lib/flags";
import { createRateLimiter } from "../middleware/security";

const router = Router();
const flagRateLimit = createRateLimiter({ windowMs: 1 * 60 * 1000, max: 10, keyPrefix: "flag" });

// GET /api/ctf
router.get("/", optionalAuth, async (req, res) => {
  const { category, difficulty, search, solved } = req.query as Record<string, string>;
  const userId = req.user?.userId;

  let challenges = await db.select().from(ctfTasksTable);

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

  res.json({ challenges: result });
});

// GET /api/ctf/:id
router.get("/:id", optionalAuth, async (req, res) => {
  const ctfId = Number(req.params.id);
  const userId = req.user?.userId;

  if (!Number.isInteger(ctfId) || ctfId <= 0) return res.status(400).json({ error: "Invalid CTF id" });

  const [challenge] = await db.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, ctfId)).limit(1);
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
      const [challenge] = await tx.select().from(ctfTasksTable).where(eq(ctfTasksTable.id, ctfId)).limit(1);
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

        const pointsToAward = challenge.points;

        if (!attempt) {
          await tx.insert(ctfAttemptsTable).values({ userId, ctfId, solved: true, solvedAt: new Date(), wrongAttempts: 0, updatedAt: new Date() });
        } else {
          await tx.update(ctfAttemptsTable).set({ solved: true, solvedAt: new Date(), updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
        }

        await tx.update(usersTable).set({ points: sql`${usersTable.points} + ${pointsToAward}` }).where(eq(usersTable.id, userId));
        
        return { status: 200, data: { correct: true, blocked: false, pointsEarned: pointsToAward } };
      } else {
        const wrongAttempts = (attempt?.wrongAttempts ?? 0) + 1;
        const isBlocked = wrongAttempts >= 5;

        if (!attempt) {
          await tx.insert(ctfAttemptsTable).values({ userId, ctfId, wrongAttempts, blocked: isBlocked, updatedAt: new Date() });
        } else {
          await tx.update(ctfAttemptsTable).set({ wrongAttempts, blocked: isBlocked, updatedAt: new Date() }).where(eq(ctfAttemptsTable.id, attempt.id));
        }

        return { status: 200, data: { correct: false, blocked: isBlocked, wrongAttempts } };
      }
    });

    if (result.data.correct && (result.data as any).pointsEarned) {
      void checkAndAwardTitle(userId, (await db.select({ cat: ctfTasksTable.category }).from(ctfTasksTable).where(eq(ctfTasksTable.id, ctfId)).limit(1))[0].cat);
    }

    res.status(result.status).json(result.data);
  } catch (error) {
    logger.error({ err: error }, "Flag submission error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/ctf/:id/submit
router.post("/:id/submit", authenticateToken, flagRateLimit, submitFlagHandler);

// Backward-compatible alias.
router.post("/:id/flag", authenticateToken, flagRateLimit, submitFlagHandler);

async function checkAndAwardTitle(userId: number, category: string) {
  const categoryTitleMap: Record<string, string> = {
    Crypto: "Kriptograf", Web: "Web Hacker", Reverse: "Reverse Engineer",
    Forensics: "Forensics Analyst", Pwn: "Binary Exploiter", OSINT: "OSINT Hunter",
    Steganography: "Stego Master",
  };

  const titleName = categoryTitleMap[category];
  if (!titleName) return;

  const [title] = await db.select().from(titlesTable).where(eq(titlesTable.category, category)).limit(1);
  if (!title) return;

  const [existing] = await db.select().from(userTitlesTable).where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, title.id))).limit(1);
  if (existing) return;

  // Check if user has solved 3+ CTFs in this category
  const solvedInCategory = await db.select({ ctfId: ctfAttemptsTable.ctfId })
    .from(ctfAttemptsTable)
    .innerJoin(ctfTasksTable, and(eq(ctfAttemptsTable.ctfId, ctfTasksTable.id), eq(ctfTasksTable.category, category)))
    .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.solved, true)));

  if (solvedInCategory.length >= 3) {
    await db.insert(userTitlesTable).values({ userId, titleId: title.id });
    await db.update(usersTable).set({ points: sql`${usersTable.points} + ${title.points}` }).where(eq(usersTable.id, userId));
  }
}

export default router;
