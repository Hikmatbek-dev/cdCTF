import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { learnCategoriesTable, lessonsTable, lessonQuestionsTable, userLessonAttemptsTable, usersTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
const router = Router();

// GET /api/learn/categories
router.get("/categories", optionalAuth, async (req, res) => {
  const categories = await db.select().from(learnCategoriesTable);
  const allLessons = await db.select().from(lessonsTable);
  const userId = req.user?.userId;

  let completedMap = new Map<number, number>();
  if (userId) {
    const attempts = await db.select().from(userLessonAttemptsTable)
      .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed")));
    for (const a of attempts) {
      const lesson = allLessons.find(l => l.id === a.lessonId);
      if (lesson) completedMap.set(lesson.categoryId, (completedMap.get(lesson.categoryId) ?? 0) + 1);
    }
  }

  const result = categories.map(cat => ({
    id: cat.id, name: cat.name, nameUz: cat.nameUz, nameRu: cat.nameRu,
    lessonCount: allLessons.filter(l => l.categoryId === cat.id).length,
    completedCount: completedMap.get(cat.id) ?? 0,
  }));

  res.json(result);
});

// GET /api/learn/lessons
router.get("/lessons", optionalAuth, async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const userId = req.user?.userId;

  let lessons = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu,
    categoryId: lessonsTable.categoryId, points: lessonsTable.points, createdAt: lessonsTable.createdAt,
    categoryName: learnCategoriesTable.name,
  }).from(lessonsTable).leftJoin(learnCategoriesTable, eq(lessonsTable.categoryId, learnCategoriesTable.id));

  if (category) lessons = lessons.filter(l => l.categoryName === category);

  let result;
  if (userId) {
    const attempts = await db.select().from(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.userId, userId));
    const attemptMap = new Map(attempts.map(a => [a.lessonId, a]));
    result = lessons.map(l => {
      const attempt = attemptMap.get(l.id);
      return {
        ...l, categoryName: l.categoryName ?? "General",
        isCompleted: attempt?.status === "completed",
        isBlocked: attempt?.blocked ?? false,
        attemptCount: attempt?.attemptCount ?? 0,
      };
    });
  } else {
    result = lessons.map(l => ({ ...l, categoryName: l.categoryName ?? "General", isCompleted: false, isBlocked: false, attemptCount: 0 }));
  }

  res.json(result);
});

// GET /api/learn/lessons/:id
router.get("/lessons/:id", optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [lesson] = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu,
    content: lessonsTable.content, contentUz: lessonsTable.contentUz, contentRu: lessonsTable.contentRu,
    categoryId: lessonsTable.categoryId, points: lessonsTable.points, createdAt: lessonsTable.createdAt,
    categoryName: learnCategoriesTable.name,
  }).from(lessonsTable).leftJoin(learnCategoriesTable, eq(lessonsTable.categoryId, learnCategoriesTable.id))
    .where(eq(lessonsTable.id, id)).limit(1);

  if (!lesson) return res.status(404).json({ error: "Not found" });

  let userAttempt = null;
  if (req.user) {
    const [att] = await db.select().from(userLessonAttemptsTable)
      .where(and(eq(userLessonAttemptsTable.userId, req.user.userId), eq(userLessonAttemptsTable.lessonId, id))).limit(1);
    userAttempt = att ?? null;
  }

  res.json({
    ...lesson, categoryName: lesson.categoryName ?? "General",
    isCompleted: userAttempt?.status === "completed",
    isBlocked: userAttempt?.blocked ?? false,
    attemptCount: userAttempt?.attemptCount ?? 0,
  });
});

async function startLessonTestHandler(req: Request, res: Response) {
  const lessonId = Number(req.params.id);
  const userId = req.user!.userId;

  if (!Number.isInteger(lessonId) || lessonId <= 0) return res.status(400).json({ error: "Invalid lesson id" });

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
  if (!lesson) return res.status(404).json({ error: "Not found" });

  let [attempt] = await db.select().from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.lessonId, lessonId))).limit(1);

  if (attempt?.blocked) return res.status(403).json({ error: "Lesson is blocked" });
  if (attempt?.attemptCount >= 3) return res.status(400).json({ error: "Maximum attempts reached" });

  const questions = await db.select().from(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, lessonId));
  if (questions.length === 0) return res.status(400).json({ error: "No questions for this lesson" });

  const sessionId = uuidv4();

  if (!attempt) {
    await db.insert(userLessonAttemptsTable).values({
      userId, lessonId, status: "in_progress", attemptCount: 1, testSessionId: sessionId, testStartedAt: new Date(), updatedAt: new Date(),
    });
  } else {
    await db.update(userLessonAttemptsTable).set({
      status: "in_progress", attemptCount: attempt.attemptCount + 1, testSessionId: sessionId, testStartedAt: new Date(), updatedAt: new Date(),
    }).where(eq(userLessonAttemptsTable.id, attempt.id));
  }

  const attemptsLeft = 3 - ((attempt?.attemptCount ?? 0) + 1);

  res.json({
    sessionId,
    attemptsLeft,
    questions: questions.map(q => ({
      id: q.id, question: q.question, options: q.options,
    })),
  });
}

// POST /api/learn/lessons/:id/test/start
router.post("/lessons/:id/test/start", authenticateToken, startLessonTestHandler);

// Backward-compatible alias.
router.post("/lessons/:id/start-test", authenticateToken, startLessonTestHandler);

async function submitLessonTestHandler(req: Request, res: Response) {
  const lessonId = Number(req.params.id);
  const userId = req.user!.userId;
  const { sessionId, answers } = req.body as { sessionId: string; answers: Array<{ questionId: number; selectedOption: number }> };

  if (!Number.isInteger(lessonId) || lessonId <= 0) return res.status(400).json({ error: "Invalid lesson id" });
  if (typeof sessionId !== "string" || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid test payload" });
  }

  const [attempt] = await db.select().from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.lessonId, lessonId))).limit(1);

  if (!attempt || attempt.testSessionId !== sessionId) return res.status(400).json({ error: "Invalid session" });

  const questions = await db.select().from(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, lessonId));
  const questionMap = new Map(questions.map(q => [q.id, q]));

  let correct = 0;
  for (const a of answers) {
    const q = questionMap.get(a.questionId);
    if (q && q.correctOption === a.selectedOption) correct++;
  }

  const score = questions.length > 0 ? correct / questions.length : 0;
  const passed = score >= 0.8;

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
  let pointsEarned = 0;

  if (passed && attempt.status !== "completed") {
    pointsEarned = lesson?.points ?? 0;
    await db.update(userLessonAttemptsTable).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(userLessonAttemptsTable.id, attempt.id));
    
    const [currentUser] = await db.select({ nickname: usersTable.nickname, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (currentUser && currentUser.role !== "admin" && currentUser.nickname !== "bozkurtshadow") {
      await db.update(usersTable).set({ points: sql`${usersTable.points} + ${pointsEarned}` }).where(eq(usersTable.id, userId));
    }
  } else if (!passed) {
    await db.update(userLessonAttemptsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(userLessonAttemptsTable.id, attempt.id));
  }

  res.json({ passed, score, correctCount: correct, totalCount: questions.length, pointsEarned });
}

// POST /api/learn/lessons/:id/test/submit
router.post("/lessons/:id/test/submit", authenticateToken, submitLessonTestHandler);

// Backward-compatible alias.
router.post("/lessons/:id/submit-test", authenticateToken, submitLessonTestHandler);

async function reportTestEscapeHandler(req: Request, res: Response) {
  const lessonId = Number(req.params.id);
  const userId = req.user!.userId;

  if (!Number.isInteger(lessonId) || lessonId <= 0) return res.status(400).json({ error: "Invalid lesson id" });

  let [attempt] = await db.select().from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.lessonId, lessonId))).limit(1);

  if (!attempt) return res.status(400).json({ error: "No active test" });

  const newEscapeCount = (attempt.escapeCount ?? 0) + 1;
  const blocked = newEscapeCount >= 3;

  await db.update(userLessonAttemptsTable).set({
    escapeCount: newEscapeCount,
    blocked,
    blockedAt: blocked ? new Date() : null,
    status: blocked ? "blocked" : attempt.status,
    updatedAt: new Date(),
  }).where(eq(userLessonAttemptsTable.id, attempt.id));

  res.json({ blocked, escapeCount: newEscapeCount, timeoutSeconds: 60 });
}

// POST /api/learn/lessons/:id/test/escape
router.post("/lessons/:id/test/escape", authenticateToken, reportTestEscapeHandler);

// Backward-compatible alias.
router.post("/lessons/:id/escape", authenticateToken, reportTestEscapeHandler);

export default router;
