import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  learnCategoriesTable, lessonsTable, lessonQuestionsTable, userLessonAttemptsTable,
  modulesTable, moduleQuestionsTable, moduleExamAttemptsTable, certificatesTable,
  pathsTable, pathModulesTable, spotlightsTable,
  programDiplomasTable, ctfTasksTable, ctfAttemptsTable,
} from "@workspace/db/schema";
import { eq, and, inArray, asc, desc, sql } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { tryActivateReferral } from "../lib/referrals";
import { SubmitLessonTestBody } from "@workspace/api-zod";
import { awardPoints } from "../lib/scoring";
import { touchStreak } from "../lib/streaks";
import { practiceCategoriesFor } from "../lib/practice-map";
const router = Router();

/**
 * How many module-exam attempts fit in one window, and how long the window is.
 * Five is more than a prepared learner needs and far fewer than the ~60 an
 * answer-oracle attack requires against a twenty-question exam.
 */
const EXAM_ATTEMPTS_PER_WINDOW = 5;
const EXAM_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The same shape for the lesson test, and for the same reason.
 *
 * Three attempts used to be a lifetime cap: fail a five-question quiz three
 * times and that lesson could never be completed — and since the module exam
 * requires *every* lesson complete, one bad quiz locked that module's
 * certificate away for good. Nothing in the UI said so. A window resets on its
 * own, so a learner who comes back tomorrow can try again.
 *
 * No new column: `testStartedAt` is already written on every start, so it is
 * the window's beginning and `attemptCount` counts within it.
 */
const LESSON_ATTEMPTS_PER_WINDOW = 3;
const LESSON_WINDOW_MS = 24 * 60 * 60 * 1000;

// GET /api/learn/categories
router.get("/categories", optionalAuth, async (req, res) => {
  // Counted in Postgres, not in JavaScript.
  //
  // This used to `select().from(lessonsTable)` — SELECT *, so all three full
  // markdown bodies of all 165 published lessons, well over a megabyte from the
  // database — and then `.filter()` them in memory to produce ten integers. It
  // also did `allLessons.find(...)` inside a loop over the reader's attempts.
  const categories = await db.select().from(learnCategoriesTable);
  const userId = req.user?.userId;

  const lessonCounts = await db.select({
    categoryId: lessonsTable.categoryId,
    n: sql<number>`count(*)::int`,
  })
    .from(lessonsTable)
    .where(eq(lessonsTable.isPublished, true))
    .groupBy(lessonsTable.categoryId);
  const countMap = new Map(lessonCounts.map(r => [r.categoryId, r.n]));

  const completedMap = new Map<number, number>();
  if (userId) {
    const rows = await db.select({
      categoryId: lessonsTable.categoryId,
      n: sql<number>`count(*)::int`,
    })
      .from(userLessonAttemptsTable)
      .innerJoin(lessonsTable, eq(lessonsTable.id, userLessonAttemptsTable.lessonId))
      .where(and(
        eq(userLessonAttemptsTable.userId, userId),
        eq(userLessonAttemptsTable.status, "completed"),
        eq(lessonsTable.isPublished, true),
      ))
      .groupBy(lessonsTable.categoryId);
    for (const r of rows) completedMap.set(r.categoryId, r.n);
  }

  res.json(categories.map(cat => ({
    id: cat.id, name: cat.name, nameUz: cat.nameUz, nameRu: cat.nameRu,
    lessonCount: countMap.get(cat.id) ?? 0,
    completedCount: completedMap.get(cat.id) ?? 0,
  })));
});

// GET /api/learn/lessons
router.get("/lessons", optionalAuth, async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const userId = req.user?.userId;

  let lessons = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu,
    categoryId: lessonsTable.categoryId, points: lessonsTable.points, createdAt: lessonsTable.createdAt,
    categoryName: learnCategoriesTable.name,
  }).from(lessonsTable).leftJoin(learnCategoriesTable, eq(lessonsTable.categoryId, learnCategoriesTable.id))
    .where(eq(lessonsTable.isPublished, true));

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
    // moduleId lets the reader page fetch its siblings and offer prev/next
    // navigation and a lesson stepper — the module's lessons come back ordered
    // from GET /modules/:id, so no separate endpoint is needed.
    moduleId: lessonsTable.moduleId,
  }).from(lessonsTable).leftJoin(learnCategoriesTable, eq(lessonsTable.categoryId, learnCategoriesTable.id))
    .where(and(eq(lessonsTable.id, id), eq(lessonsTable.isPublished, true))).limit(1);

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

  const [lesson] = await db.select().from(lessonsTable)
    .where(and(eq(lessonsTable.id, lessonId), eq(lessonsTable.isPublished, true))).limit(1);
  if (!lesson) return res.status(404).json({ error: "Not found" });

  const [attempt] = await db.select().from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.lessonId, lessonId))).limit(1);

  if (attempt?.blocked) return res.status(403).json({ error: "Lesson is blocked" });
  if (attempt?.completedAt) return res.status(400).json({ error: "Lesson already completed" });

  const now = new Date();
  const windowOpen = Boolean(attempt?.testStartedAt)
    && now.getTime() - attempt.testStartedAt!.getTime() < LESSON_WINDOW_MS;
  const used = windowOpen ? attempt.attemptCount : 0;

  if (used >= LESSON_ATTEMPTS_PER_WINDOW) {
    const retryAt = new Date(attempt.testStartedAt!.getTime() + LESSON_WINDOW_MS);
    return res.status(429).json({
      error: `Too many attempts. Try again after ${retryAt.toISOString()}`,
      retryAt: retryAt.toISOString(),
      attemptsPerWindow: LESSON_ATTEMPTS_PER_WINDOW,
    });
  }

  const questions = await db.select().from(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, lessonId));

  const sessionId = uuidv4();

  if (!attempt) {
    await db.insert(userLessonAttemptsTable).values({
      userId, lessonId, status: "in_progress", attemptCount: 1, testSessionId: sessionId, testStartedAt: now, updatedAt: now,
    });
  } else {
    await db.update(userLessonAttemptsTable).set({
      // `testStartedAt` restarts the window only when the previous one has
      // expired; inside a window it keeps marking the latest attempt, which is
      // what the retry time above is measured from.
      status: "in_progress", attemptCount: used + 1, testSessionId: sessionId, testStartedAt: windowOpen ? attempt.testStartedAt! : now, updatedAt: now,
    }).where(eq(userLessonAttemptsTable.id, attempt.id));
  }

  // Left in this window, not left for ever — see LESSON_ATTEMPTS_PER_WINDOW.
  const attemptsLeft = LESSON_ATTEMPTS_PER_WINDOW - (used + 1);

  res.json({
    sessionId,
    attemptsLeft,
    // Trilingual: the client shows the question and options in the UI language.
    // correctOption is deliberately NOT sent — the client must not know the answer.
    questions: questions.map(q => ({
      id: q.id,
      question: q.question, questionUz: q.questionUz, questionRu: q.questionRu,
      options: q.options, optionsUz: q.optionsUz, optionsRu: q.optionsRu,
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

  const questions = await db.select().from(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, lessonId));
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Collapse the submission to at most one answer per question BEFORE scoring.
  // Scoring the raw array would let a client send every option for every question
  // and bank one hit per question — a guaranteed 100% that defeats the whole test.
  const answerByQuestion = new Map<number, number>();
  for (const answer of answers) {
    if (typeof answer !== "object" || answer === null) return res.status(400).json({ error: "Invalid answer" });
    const { questionId, selectedOption } = answer;
    if (!Number.isInteger(questionId) || !Number.isInteger(selectedOption)) {
      return res.status(400).json({ error: "Invalid answer" });
    }
    if (!questionMap.has(questionId)) return res.status(400).json({ error: "Answer does not belong to this lesson" });
    if (answerByQuestion.has(questionId)) return res.status(400).json({ error: "Duplicate answer for a question" });
    answerByQuestion.set(questionId, selectedOption);
  }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);

  const outcome = await db.transaction(async tx => {
    // Lock the attempt row so two concurrent submits cannot both observe
    // `status !== "completed"` and both award points.
    const [attempt] = await tx.select().from(userLessonAttemptsTable)
      .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.lessonId, lessonId)))
      .limit(1)
      .for("update");

    if (!attempt || attempt.testSessionId !== sessionId) return { status: 400, data: { error: "Invalid session" } };
    if (attempt.blocked) return { status: 403, data: { error: "Lesson is blocked" } };

    let correct = 0;
    for (const [questionId, selectedOption] of answerByQuestion) {
      if (questionMap.get(questionId)!.correctOption === selectedOption) correct++;
    }

    const score = questions.length === 0 ? 1 : correct / questions.length;
    const passed = score >= 0.8;
    let pointsEarned = 0;

    // Guard on `completedAt`, not `status`: starting a new attempt rewrites
    // `status` back to "in_progress", which would re-open the points award and
    // let a user bank the lesson's points once per allowed attempt.
    // Spend the session, always. It used to survive the submit, so one /start
    // bought unlimited submits: the returned `correctCount` is a per-question
    // oracle, and the three-attempt cap — which only counts /start — was never
    // reached. The module exam already did this (examSessionId: null); the
    // lesson test did not.
    if (passed && !attempt.completedAt) {
      await tx.update(userLessonAttemptsTable)
        .set({ status: "completed", completedAt: new Date(), testSessionId: null, updatedAt: new Date() })
        .where(eq(userLessonAttemptsTable.id, attempt.id));

      pointsEarned = await awardPoints(tx, userId, lesson?.points ?? 0);
      await touchStreak(tx, userId, new Date());
    } else if (!passed) {
      await tx.update(userLessonAttemptsTable)
        .set({ status: "failed", testSessionId: null, updatedAt: new Date() })
        .where(eq(userLessonAttemptsTable.id, attempt.id));
    } else {
      // Already completed and passed again: nothing to award, but the session
      // still has to be burned.
      await tx.update(userLessonAttemptsTable)
        .set({ testSessionId: null, updatedAt: new Date() })
        .where(eq(userLessonAttemptsTable.id, attempt.id));
    }

    return { status: 200, data: { passed, score, correctCount: correct, totalCount: questions.length, pointsEarned }, completed: passed && !attempt.completedAt };
  });

  // Finishing a lesson is one half of what activates the invite that brought
  // this learner in. Fire-and-forget, after the transaction, only on a real
  // first completion.
  if ((outcome as { completed?: boolean }).completed) void tryActivateReferral(userId);

  res.status(outcome.status).json(outcome.data);
}

// POST /api/learn/lessons/:id/test/submit
router.post("/lessons/:id/test/submit", authenticateToken, validateBody(SubmitLessonTestBody), submitLessonTestHandler);

// Backward-compatible alias.
router.post("/lessons/:id/submit-test", authenticateToken, validateBody(SubmitLessonTestBody), submitLessonTestHandler);

async function reportTestEscapeHandler(req: Request, res: Response) {
  const lessonId = Number(req.params.id);
  const userId = req.user!.userId;

  if (!Number.isInteger(lessonId) || lessonId <= 0) return res.status(400).json({ error: "Invalid lesson id" });

  const [attempt] = await db.select().from(userLessonAttemptsTable)
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

// ===========================================================================
// Modules: an ordered course of lessons, a final exam, and a certificate.
// ===========================================================================

/** Progress for one learner across a set of modules, in two queries not N. */
async function moduleProgressFor(userId: number | undefined, moduleIds: number[]) {
  const lessonsByModule = new Map<number, number[]>();
  const completedByModule = new Map<number, number>();
  const examByModule = new Map<number, { bestScore: number; passed: boolean }>();
  const certByModule = new Map<number, string>();
  if (moduleIds.length === 0) return { lessonsByModule, completedByModule, examByModule, certByModule };

  const lessons = await db.select({ id: lessonsTable.id, moduleId: lessonsTable.moduleId })
    .from(lessonsTable)
    .where(and(eq(lessonsTable.isPublished, true), inArray(lessonsTable.moduleId, moduleIds)));
  for (const l of lessons) {
    if (l.moduleId == null) continue;
    const list = lessonsByModule.get(l.moduleId) ?? [];
    list.push(l.id);
    lessonsByModule.set(l.moduleId, list);
  }

  if (userId) {
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length > 0) {
      const attempts = await db.select().from(userLessonAttemptsTable)
        .where(and(eq(userLessonAttemptsTable.userId, userId), inArray(userLessonAttemptsTable.lessonId, lessonIds)));
      const done = new Set(attempts.filter(a => a.completedAt).map(a => a.lessonId));
      for (const [mid, ids] of lessonsByModule) {
        completedByModule.set(mid, ids.filter(id => done.has(id)).length);
      }
    }
    const exams = await db.select().from(moduleExamAttemptsTable)
      .where(and(eq(moduleExamAttemptsTable.userId, userId), inArray(moduleExamAttemptsTable.moduleId, moduleIds)));
    for (const e of exams) examByModule.set(e.moduleId, { bestScore: e.bestScore, passed: e.passed });

    const certs = await db.select().from(certificatesTable)
      .where(and(eq(certificatesTable.userId, userId), inArray(certificatesTable.moduleId, moduleIds)));
    for (const c of certs) certByModule.set(c.moduleId, c.serial);
  }
  return { lessonsByModule, completedByModule, examByModule, certByModule };
}

// GET /api/learn/spotlights?section=threats|ai|live — curated hub cards.
router.get("/spotlights", async (req, res) => {
  const section = typeof req.query.section === "string" ? req.query.section : "";
  if (!["threats", "ai", "live", "networks", "walkthroughs"].includes(section)) return res.status(400).json({ error: "Unknown section" });
  const rows = await db.select().from(spotlightsTable)
    .where(and(eq(spotlightsTable.section, section), eq(spotlightsTable.isPublished, true)))
    .orderBy(asc(spotlightsTable.orderIndex), desc(spotlightsTable.createdAt));
  res.json(rows.map(s => ({
    id: s.id, title: s.title, titleUz: s.titleUz, titleRu: s.titleRu,
    description: s.description, descriptionUz: s.descriptionUz, descriptionRu: s.descriptionRu,
    tag: s.tag, url: s.url, startsAt: s.startsAt ? s.startsAt.toISOString() : null,
  })));
});

// GET /api/learn/paths — learning tracks that group modules.
router.get("/paths", optionalAuth, async (req, res) => {
  const paths = await db.select().from(pathsTable)
    .where(eq(pathsTable.isPublished, true))
    .orderBy(asc(pathsTable.orderIndex));
  if (paths.length === 0) return res.json([]);

  const links = await db.select({ pathId: pathModulesTable.pathId, moduleId: pathModulesTable.moduleId, orderIndex: pathModulesTable.orderIndex })
    .from(pathModulesTable)
    .innerJoin(modulesTable, eq(pathModulesTable.moduleId, modulesTable.id))
    .where(eq(modulesTable.isPublished, true));

  const moduleIds = [...new Set(links.map(l => l.moduleId))];
  // A module counts as "completed" for a path once its exam is passed.
  const { examByModule } = await moduleProgressFor(req.user?.userId, moduleIds);

  const byPath = new Map<number, number[]>();
  for (const l of links) {
    const list = byPath.get(l.pathId) ?? [];
    list.push(l.moduleId);
    byPath.set(l.pathId, list);
  }

  res.json(paths.map(p => {
    const mods = byPath.get(p.id) ?? [];
    return {
      id: p.id, slug: p.slug,
      title: p.title, titleUz: p.titleUz, titleRu: p.titleRu,
      description: p.description, descriptionUz: p.descriptionUz, descriptionRu: p.descriptionRu,
      difficulty: p.difficulty, hue: p.hue, badge: p.badge,
      moduleCount: mods.length,
      completedModules: mods.filter(id => examByModule.get(id)?.passed).length,
    };
  }));
});

// GET /api/learn/paths/:slug — one track and its ordered modules with progress.
router.get("/paths/:slug", optionalAuth, async (req, res) => {
  const [path] = await db.select().from(pathsTable)
    .where(and(eq(pathsTable.slug, String(req.params.slug)), eq(pathsTable.isPublished, true))).limit(1);
  if (!path) return res.status(404).json({ error: "Path not found" });

  const links = await db.select({ moduleId: pathModulesTable.moduleId, orderIndex: pathModulesTable.orderIndex })
    .from(pathModulesTable)
    .where(eq(pathModulesTable.pathId, path.id))
    .orderBy(asc(pathModulesTable.orderIndex));

  const orderedIds = links.map(l => l.moduleId);
  const modules = orderedIds.length === 0 ? [] : await db.select().from(modulesTable)
    .where(and(inArray(modulesTable.id, orderedIds), eq(modulesTable.isPublished, true)));
  const modById = new Map(modules.map(m => [m.id, m]));

  const { lessonsByModule, completedByModule, examByModule, certByModule } =
    await moduleProgressFor(req.user?.userId, modules.map(m => m.id));

  // Preserve the path's own ordering, dropping any unpublished module.
  const orderedModules = orderedIds
    .map(id => modById.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map(m => ({
      id: m.id, slug: m.slug,
      title: m.title, titleUz: m.titleUz, titleRu: m.titleRu,
      description: m.description, descriptionUz: m.descriptionUz, descriptionRu: m.descriptionRu,
      difficulty: m.difficulty, estimatedHours: m.estimatedHours,
      lessonCount: lessonsByModule.get(m.id)?.length ?? 0,
      completedCount: completedByModule.get(m.id) ?? 0,
      examPassed: examByModule.get(m.id)?.passed ?? false,
      certificateSerial: certByModule.get(m.id) ?? null,
    }));

  res.json({
    id: path.id, slug: path.slug,
    title: path.title, titleUz: path.titleUz, titleRu: path.titleRu,
    description: path.description, descriptionUz: path.descriptionUz, descriptionRu: path.descriptionRu,
    difficulty: path.difficulty, hue: path.hue, badge: path.badge,
    modules: orderedModules,
    moduleCount: orderedModules.length,
    completedModules: orderedModules.filter(m => m.examPassed).length,
  });
});

// GET /api/learn/modules
router.get("/modules", optionalAuth, async (req, res) => {
  const modules = await db.select().from(modulesTable)
    .where(eq(modulesTable.isPublished, true))
    .orderBy(asc(modulesTable.orderIndex));
  const userId = req.user?.userId;
  const { lessonsByModule, completedByModule, examByModule, certByModule } =
    await moduleProgressFor(userId, modules.map(m => m.id));

  res.json(modules.map(m => ({
    id: m.id, slug: m.slug,
    title: m.title, titleUz: m.titleUz, titleRu: m.titleRu,
    description: m.description, descriptionUz: m.descriptionUz, descriptionRu: m.descriptionRu,
    difficulty: m.difficulty, estimatedHours: m.estimatedHours, passScore: m.passScore,
    lessonCount: lessonsByModule.get(m.id)?.length ?? 0,
    completedCount: completedByModule.get(m.id) ?? 0,
    examBestScore: examByModule.get(m.id)?.bestScore ?? 0,
    examPassed: examByModule.get(m.id)?.passed ?? false,
    certificateSerial: certByModule.get(m.id) ?? null,
  })));
});

// GET /api/learn/modules/:id
router.get("/modules/:id", optionalAuth, async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });

  const [mod] = await db.select().from(modulesTable)
    .where(and(eq(modulesTable.id, moduleId), eq(modulesTable.isPublished, true))).limit(1);
  if (!mod) return res.status(404).json({ error: "Not found" });

  const lessons = await db.select().from(lessonsTable)
    .where(and(eq(lessonsTable.moduleId, moduleId), eq(lessonsTable.isPublished, true)))
    .orderBy(asc(lessonsTable.orderIndex));

  const userId = req.user?.userId;
  const completed = new Set<number>();
  if (userId && lessons.length > 0) {
    const attempts = await db.select().from(userLessonAttemptsTable)
      .where(and(eq(userLessonAttemptsTable.userId, userId), inArray(userLessonAttemptsTable.lessonId, lessons.map(l => l.id))));
    for (const a of attempts) if (a.completedAt) completed.add(a.lessonId);
  }

  let exam = { bestScore: 0, passed: false, attemptCount: 0 };
  let certificateSerial: string | null = null;
  if (userId) {
    const [e] = await db.select().from(moduleExamAttemptsTable)
      .where(and(eq(moduleExamAttemptsTable.userId, userId), eq(moduleExamAttemptsTable.moduleId, moduleId))).limit(1);
    if (e) exam = { bestScore: e.bestScore, passed: e.passed, attemptCount: e.attemptCount };
    const [c] = await db.select().from(certificatesTable)
      .where(and(eq(certificatesTable.userId, userId), eq(certificatesTable.moduleId, moduleId))).limit(1);
    certificateSerial = c?.serial ?? null;
  }

  const examQuestionCount = (await db.select({ id: moduleQuestionsTable.id }).from(moduleQuestionsTable)
    .where(eq(moduleQuestionsTable.moduleId, moduleId))).length;

  // The practice half. A module that teaches Crypto should hand you the Crypto
  // challenges when you finish it — reading and drilling were two unconnected
  // halves of this platform, which is why the lessons went unused.
  const practiceCategories = practiceCategoriesFor(mod.slug);
  type PracticeChallenge = {
    id: number; name: string; nameUz: string | null; nameRu: string | null;
    category: string; difficulty: string; points: number; isSolved: boolean;
  };
  let practice: {
    categories: string[]; total: number; solved: number; challenges: PracticeChallenge[];
  } | null = null;

  if (practiceCategories.length > 0) {
    const pool = await db.select({
      id: ctfTasksTable.id, name: ctfTasksTable.name,
      nameUz: ctfTasksTable.nameUz, nameRu: ctfTasksTable.nameRu,
      category: ctfTasksTable.category, difficulty: ctfTasksTable.difficulty,
      points: ctfTasksTable.points,
    })
      .from(ctfTasksTable)
      .where(and(eq(ctfTasksTable.isPublished, true), inArray(ctfTasksTable.category, practiceCategories)));

    // Which of them this reader has already solved — so the module can show the
    // unsolved ones first rather than a flat list they have half finished.
    const solvedIds = new Set<number>();
    if (userId && pool.length > 0) {
      const rows = await db.select({ ctfId: ctfAttemptsTable.ctfId })
        .from(ctfAttemptsTable)
        .where(and(
          eq(ctfAttemptsTable.userId, userId),
          eq(ctfAttemptsTable.solved, true),
          inArray(ctfAttemptsTable.ctfId, pool.map(p => p.id)),
        ));
      for (const r of rows) solvedIds.add(r.ctfId);
    }

    const DIFFICULTY_ORDER = ["easy", "medium", "hard", "insane"];
    const challenges = pool
      .map(c => ({ ...c, isSolved: solvedIds.has(c.id) }))
      // Unsolved first, then easiest first: the next thing to attempt is the
      // first thing in the list.
      .sort((a, b) =>
        Number(a.isSolved) - Number(b.isSolved)
        || DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)
        || a.points - b.points)
      .slice(0, 6);

    practice = {
      categories: practiceCategories,
      total: pool.length,
      solved: solvedIds.size,
      challenges,
    };
  }

  res.json({
    id: mod.id, slug: mod.slug,
    title: mod.title, titleUz: mod.titleUz, titleRu: mod.titleRu,
    description: mod.description, descriptionUz: mod.descriptionUz, descriptionRu: mod.descriptionRu,
    difficulty: mod.difficulty, estimatedHours: mod.estimatedHours, passScore: mod.passScore,
    examQuestionCount,
    practice,
    lessons: lessons.map(l => ({
      id: l.id, title: l.title, titleUz: l.titleUz, titleRu: l.titleRu,
      points: l.points, orderIndex: l.orderIndex, isCompleted: completed.has(l.id),
    })),
    completedCount: completed.size,
    lessonCount: lessons.length,
    // Every lesson done is the gate for sitting the exam.
    examUnlocked: lessons.length > 0 && completed.size === lessons.length,
    exam, certificateSerial,
  });
});

// POST /api/learn/modules/:id/exam/start
router.post("/modules/:id/exam/start", authenticateToken, async (req, res) => {
  const moduleId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });

  const [mod] = await db.select().from(modulesTable)
    .where(and(eq(modulesTable.id, moduleId), eq(modulesTable.isPublished, true))).limit(1);
  if (!mod) return res.status(404).json({ error: "Not found" });

  const lessons = await db.select({ id: lessonsTable.id }).from(lessonsTable)
    .where(and(eq(lessonsTable.moduleId, moduleId), eq(lessonsTable.isPublished, true)));
  if (lessons.length === 0) return res.status(400).json({ error: "Module has no lessons yet" });

  // The exam is the end of the course, so it opens only once every lesson in it
  // is finished. Checked on the server: the button being hidden is not a rule.
  const attempts = await db.select().from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, userId), inArray(userLessonAttemptsTable.lessonId, lessons.map(l => l.id))));
  const done = attempts.filter(a => a.completedAt).length;
  if (done < lessons.length) {
    return res.status(403).json({ error: `Finish all ${lessons.length} lessons first (${done} done)` });
  }

  const questions = await db.select().from(moduleQuestionsTable)
    .where(eq(moduleQuestionsTable.moduleId, moduleId))
    .orderBy(asc(moduleQuestionsTable.orderIndex));

  const sessionId = uuidv4();
  const [existing] = await db.select().from(moduleExamAttemptsTable)
    .where(and(eq(moduleExamAttemptsTable.userId, userId), eq(moduleExamAttemptsTable.moduleId, moduleId))).limit(1);

  const now = new Date();
  if (existing) {
    // The window. `attemptCount` was being incremented here and read by nobody,
    // so the exam had no limit at all — and since submitting returns how many
    // answers were right, unlimited retakes are an answer oracle: three probes
    // per question recovers the key and mints a real certificate. Counting
    // inside a window that expires stops that without ever locking a learner
    // out of their own credential.
    const windowOpen = existing.windowStartedAt !== null
      && now.getTime() - existing.windowStartedAt.getTime() < EXAM_WINDOW_MS;
    const used = windowOpen ? existing.windowCount : 0;

    if (used >= EXAM_ATTEMPTS_PER_WINDOW) {
      const retryAt = new Date(existing.windowStartedAt!.getTime() + EXAM_WINDOW_MS);
      return res.status(429).json({
        error: `Too many exam attempts. Try again after ${retryAt.toISOString()}`,
        retryAt: retryAt.toISOString(),
        attemptsPerWindow: EXAM_ATTEMPTS_PER_WINDOW,
      });
    }

    await db.update(moduleExamAttemptsTable).set({
      attemptCount: existing.attemptCount + 1,
      windowStartedAt: windowOpen ? existing.windowStartedAt : now,
      windowCount: used + 1,
      examSessionId: sessionId, examStartedAt: now, updatedAt: now,
    }).where(eq(moduleExamAttemptsTable.id, existing.id));
  } else {
    await db.insert(moduleExamAttemptsTable).values({
      userId, moduleId, attemptCount: 1,
      windowStartedAt: now, windowCount: 1,
      examSessionId: sessionId, examStartedAt: now,
    });
  }

  res.json({
    sessionId,
    passScore: mod.passScore,
    // correctOption is deliberately absent: the client must not hold the answers.
    questions: questions.map(q => ({
      id: q.id,
      question: q.question, questionUz: q.questionUz, questionRu: q.questionRu,
      options: q.options, optionsUz: q.optionsUz, optionsRu: q.optionsRu,
    })),
  });
});

// POST /api/learn/modules/:id/exam/submit
router.post("/modules/:id/exam/submit", authenticateToken, async (req, res) => {
  const moduleId = Number(req.params.id);
  const userId = req.user!.userId;
  const { sessionId, answers } = req.body as { sessionId?: string; answers?: Array<{ questionId: number; selectedOption: number }> };

  if (!Number.isInteger(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });
  if (typeof sessionId !== "string" || !Array.isArray(answers)) return res.status(400).json({ error: "Invalid exam payload" });

  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId)).limit(1);
  if (!mod) return res.status(404).json({ error: "Not found" });

  const questions = await db.select().from(moduleQuestionsTable).where(eq(moduleQuestionsTable.moduleId, moduleId));
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Same rule as the lesson test: collapse to one answer per question before
  // scoring, or a client can send every option for every question and score 100%.
  const answerByQuestion = new Map<number, number>();
  for (const answer of answers) {
    if (typeof answer !== "object" || answer === null) return res.status(400).json({ error: "Invalid answer" });
    const { questionId, selectedOption } = answer;
    if (!Number.isInteger(questionId) || !Number.isInteger(selectedOption)) return res.status(400).json({ error: "Invalid answer" });
    if (!questionMap.has(questionId)) return res.status(400).json({ error: "Answer does not belong to this exam" });
    if (answerByQuestion.has(questionId)) return res.status(400).json({ error: "Duplicate answer for a question" });
    answerByQuestion.set(questionId, selectedOption);
  }

  const outcome = await db.transaction(async tx => {
    const [attempt] = await tx.select().from(moduleExamAttemptsTable)
      .where(and(eq(moduleExamAttemptsTable.userId, userId), eq(moduleExamAttemptsTable.moduleId, moduleId)))
      .limit(1).for("update");
    if (!attempt || attempt.examSessionId !== sessionId) return { status: 400, data: { error: "Invalid session" } };

    let correct = 0;
    for (const [questionId, selectedOption] of answerByQuestion) {
      if (questionMap.get(questionId)!.correctOption === selectedOption) correct++;
    }
    const score = questions.length === 0 ? 100 : Math.round((correct / questions.length) * 100);
    const passed = score >= mod.passScore;

    await tx.update(moduleExamAttemptsTable).set({
      // Best score, so a weaker retake cannot take away a pass already earned.
      bestScore: Math.max(attempt.bestScore, score),
      passed: attempt.passed || passed,
      passedAt: attempt.passedAt ?? (passed ? new Date() : null),
      examSessionId: null,
      updatedAt: new Date(),
    }).where(eq(moduleExamAttemptsTable.id, attempt.id));

    return {
      status: 200,
      data: {
        score, correct, total: questions.length, passScore: mod.passScore, passed,
        certificateAvailable: passed || attempt.passed,
      },
    };
  });

  res.status(outcome.status).json(outcome.data);
});

// POST /api/learn/modules/:id/certificate
router.post("/modules/:id/certificate", authenticateToken, async (req, res) => {
  const moduleId = Number(req.params.id);
  const userId = req.user!.userId;
  const fullNameRaw = (req.body as { fullName?: unknown })?.fullName;

  if (!Number.isInteger(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });
  if (typeof fullNameRaw !== "string") return res.status(400).json({ error: "Full name is required" });
  const fullName = fullNameRaw.trim().replace(/\s+/g, " ");
  // Printed on the certificate, so it has to be a plausible legal name rather
  // than a handle. Letters, spaces, hyphens and apostrophes, any alphabet.
  if (fullName.length < 3 || fullName.length > 80) {
    return res.status(400).json({ error: "Full name must be 3-80 characters" });
  }
  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(fullName)) {
    return res.status(400).json({ error: "Full name may only contain letters, spaces, hyphens and apostrophes" });
  }

  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId)).limit(1);
  if (!mod) return res.status(404).json({ error: "Not found" });

  const [attempt] = await db.select().from(moduleExamAttemptsTable)
    .where(and(eq(moduleExamAttemptsTable.userId, userId), eq(moduleExamAttemptsTable.moduleId, moduleId))).limit(1);
  if (!attempt?.passed) {
    return res.status(403).json({ error: `You need at least ${mod.passScore}% on the exam to earn a certificate` });
  }

  const [existing] = await db.select().from(certificatesTable)
    .where(and(eq(certificatesTable.userId, userId), eq(certificatesTable.moduleId, moduleId))).limit(1);
  if (existing) {
    // Re-issuing only corrects the printed name; the serial and score stand.
    if (existing.fullName !== fullName) {
      await db.update(certificatesTable).set({ fullName }).where(eq(certificatesTable.id, existing.id));
    }
    return res.json({ serial: existing.serial, fullName, score: existing.score, issuedAt: existing.issuedAt });
  }

  const serial = `CDCTF-${randomBytes(5).toString("hex").toUpperCase()}`;
  const [created] = await db.insert(certificatesTable)
    .values({ serial, userId, moduleId, fullName, score: attempt.bestScore })
    .returning();
  res.status(201).json({ serial: created.serial, fullName: created.fullName, score: created.score, issuedAt: created.issuedAt });
});

/**
 * Integrity fingerprint over the fields a credential attests to.
 *
 * What it proves, precisely: that the name, subject, score and date printed on
 * a sheet are the ones this server holds. Someone who edits a screenshot or a
 * printout to raise their score cannot produce a matching fingerprint, because
 * the verifier recomputes it from the record behind the serial.
 *
 * What it does not prove: that we issued it. A hash over public fields is
 * reproducible by anyone, so it is an integrity check and not a signature —
 * the serial lookup is what establishes the credential exists at all. The two
 * together are what make a forgery fail.
 *
 * Fields are joined with a unit separator so a value containing the delimiter
 * cannot be rearranged into a different-but-equal canonical string, and the
 * subject is the module *slug* rather than its title: titles are re-written
 * when curriculum is re-imported, and a fingerprint that drifts is worthless.
 */
function credentialFingerprint(kind: string, parts: (string | number)[]) {
  // A unit separator, written as an escape: a literal control byte in
  // source is invisible and easily mangled by an editor or a copy-paste.
  const canonical = ["cdctf.v1", kind, ...parts.map(String)].join("\u001f");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// GET /api/learn/certificates/:serial — public, so a certificate can be checked
// by anyone the holder shows it to.
router.get("/certificates/:serial", async (req, res) => {
  const serial = String(req.params.serial || "").trim().toUpperCase();
  if (!/^CDCTF-[A-F0-9]{10}$/.test(serial)) return res.status(400).json({ error: "Invalid certificate serial" });

  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.serial, serial)).limit(1);
  if (!cert) return res.status(404).json({ error: "Certificate not found" });

  const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.id, cert.moduleId)).limit(1);
  // Only what a verifier needs — no user id, no email.
  res.json({
    serial: cert.serial,
    fullName: cert.fullName,
    score: cert.score,
    issuedAt: cert.issuedAt,
    moduleTitle: mod?.title ?? "",
    moduleTitleUz: mod?.titleUz ?? null,
    moduleTitleRu: mod?.titleRu ?? null,
    fingerprint: credentialFingerprint("certificate", [
      cert.serial, cert.fullName, mod?.slug ?? "", cert.score,
      new Date(cert.issuedAt).toISOString(),
    ]),
  });
});

// ===========================================================================
// Program diploma: the whole-program credential, earned by passing every
// published module. A certificate proves one course; the diploma proves the
// path.
// ===========================================================================

/** Published modules, and which of them this learner has passed. */
async function programStatusFor(userId: number) {
  const modules = await db.select({ id: modulesTable.id })
    .from(modulesTable).where(eq(modulesTable.isPublished, true));
  const total = modules.length;

  const passedById = new Map<number, number>();
  if (total > 0) {
    const attempts = await db.select().from(moduleExamAttemptsTable)
      .where(and(
        eq(moduleExamAttemptsTable.userId, userId),
        inArray(moduleExamAttemptsTable.moduleId, modules.map(m => m.id)),
      ));
    for (const a of attempts) if (a.passed) passedById.set(a.moduleId, a.bestScore);
  }
  const passed = passedById.size;
  const scores = [...passedById.values()];
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
    : 0;
  // Complete only when there is at least one module and every one is passed.
  const complete = total > 0 && passed === total;
  return { total, passed, averageScore, complete };
}

// GET /api/learn/diploma — the caller's program standing and diploma state.
router.get("/diploma", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const status = await programStatusFor(userId);
  const [diploma] = await db.select().from(programDiplomasTable)
    .where(eq(programDiplomasTable.userId, userId)).limit(1);
  res.json({
    totalModules: status.total,
    passedModules: status.passed,
    averageScore: status.averageScore,
    available: status.complete,
    serial: diploma?.serial ?? null,
    fullName: diploma?.fullName ?? null,
    issuedAt: diploma?.issuedAt ?? null,
  });
});

// POST /api/learn/diploma — issue the diploma once every module is passed.
router.post("/diploma", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const fullNameRaw = (req.body as { fullName?: unknown })?.fullName;

  if (typeof fullNameRaw !== "string") return res.status(400).json({ error: "Full name is required" });
  const fullName = fullNameRaw.trim().replace(/\s+/g, " ");
  // Same rule as a module certificate: a real, printable legal name.
  if (fullName.length < 3 || fullName.length > 80) {
    return res.status(400).json({ error: "Full name must be 3-80 characters" });
  }
  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(fullName)) {
    return res.status(400).json({ error: "Full name may only contain letters, spaces, hyphens and apostrophes" });
  }

  const status = await programStatusFor(userId);
  // The gate: every published module must be passed. Checked on the server, so
  // a hidden button is never the only thing standing between a learner and the
  // headline credential of the platform.
  if (!status.complete) {
    return res.status(403).json({
      error: `Finish all modules first — ${status.passed}/${status.total} passed`,
    });
  }

  const [existing] = await db.select().from(programDiplomasTable)
    .where(eq(programDiplomasTable.userId, userId)).limit(1);
  if (existing) {
    // Re-issuing only corrects the printed name; serial and score stand.
    if (existing.fullName !== fullName) {
      await db.update(programDiplomasTable).set({ fullName }).where(eq(programDiplomasTable.id, existing.id));
    }
    return res.json({
      serial: existing.serial, fullName, averageScore: existing.averageScore,
      moduleCount: existing.moduleCount, issuedAt: existing.issuedAt,
    });
  }

  // -DIP- keeps the diploma serial distinct from a module certificate's
  // CDCTF-<hex>, so the two public verify routes never collide.
  const serial = `CDCTF-DIP-${randomBytes(5).toString("hex").toUpperCase()}`;
  const [created] = await db.insert(programDiplomasTable)
    .values({ serial, userId, fullName, averageScore: status.averageScore, moduleCount: status.total })
    .returning();
  res.status(201).json({
    serial: created.serial, fullName: created.fullName, averageScore: created.averageScore,
    moduleCount: created.moduleCount, issuedAt: created.issuedAt,
  });
});

// GET /api/learn/diploma/:serial — public verification, like a certificate.
router.get("/diploma/:serial", async (req, res) => {
  const serial = String(req.params.serial || "").trim().toUpperCase();
  if (!/^CDCTF-DIP-[A-F0-9]{10}$/.test(serial)) return res.status(400).json({ error: "Invalid diploma serial" });

  const [diploma] = await db.select().from(programDiplomasTable)
    .where(eq(programDiplomasTable.serial, serial)).limit(1);
  if (!diploma) return res.status(404).json({ error: "Diploma not found" });

  // Only what a verifier needs — no user id, no email.
  res.json({
    serial: diploma.serial,
    fullName: diploma.fullName,
    averageScore: diploma.averageScore,
    moduleCount: diploma.moduleCount,
    issuedAt: diploma.issuedAt,
    fingerprint: credentialFingerprint("diploma", [
      diploma.serial, diploma.fullName, diploma.moduleCount, diploma.averageScore,
      new Date(diploma.issuedAt).toISOString(),
    ]),
  });
});

// TEMPORARY SEEDER ENDPOINT FOR PRODUCTION (TO BE REMOVED LATER)
router.get("/seed-hack", async (req, res) => {
const NETWORK_LESSONS: Record<string, any[]> = {
  "IP addresses and ports": [
    {
      q: "Which IPv4 address class is typically reserved for large enterprise networks requiring millions of hosts?",
      quz: "Odatda millionlab xostlarni talab qiladigan yirik korporativ tarmoqlar uchun qaysi IPv4 manzil sinfi ajratilgan?",
      qru: "Какой класс IPv4-адресов обычно резервируется для крупных корпоративных сетей, требующих миллионы хостов?",
      options: ["Class A", "Class B", "Class C", "Class D"],
      optionsuz: ["A sinfi", "B sinfi", "C sinfi", "D sinfi"],
      optionsru: ["Класс A", "Класс B", "Класс C", "Класс D"],
      correct: 0
    },
    {
      q: "What is the primary difference between a well-known port and a dynamic/private port?",
      quz: "Taniqli port (well-known port) va dinamik/xususiy port o'rtasidagi asosiy farq nima?",
      qru: "В чем основное отличие хорошо известного порта от динамического/частного порта?",
      options: ["Well-known ports (0-1023) require root privileges, dynamic ports (49152-65535) are for client connections.", "Dynamic ports are only used for UDP, well-known for TCP.", "Well-known ports are randomly assigned by the OS.", "There is no difference, ports are universally identical."],
      optionsuz: ["Taniqli portlar (0-1023) root huquqlarini talab qiladi, dinamik portlar (49152-65535) mijoz ulanishlari uchundir.", "Dinamik portlar faqat UDP uchun, taniqli portlar TCP uchun ishlatiladi.", "Taniqli portlar OT tomonidan tasodifiy ajratiladi.", "Farqi yo'q, portlar hamma joyda bir xil."],
      optionsru: ["Общеизвестные порты (0-1023) требуют прав root, динамические порты (49152-65535) предназначены для клиентских подключений.", "Динамические порты используются только для UDP, общеизвестные для TCP.", "Общеизвестные порты назначаются ОС случайным образом.", "Разницы нет, порты везде одинаковы."],
      correct: 0
    },
    {
      q: "Which of the following IP addresses represents a non-routable loopback address in IPv6?",
      quz: "Quyidagi IP manzillardan qaysi biri IPv6 da marshrutlanmaydigan loopback manzilini ifodalaydi?",
      qru: "Какой из следующих IP-адресов представляет немаршрутизируемый loopback-адрес в IPv6?",
      options: ["::1", "127.0.0.1", "fe80::1", "::ffff:127.0.0.1"],
      optionsuz: ["::1", "127.0.0.1", "fe80::1", "::ffff:127.0.0.1"],
      optionsru: ["::1", "127.0.0.1", "fe80::1", "::ffff:127.0.0.1"],
      correct: 0
    },
    {
      q: "In NAT (Network Address Translation), what does PAT (Port Address Translation) specifically achieve?",
      quz: "NAT (Network Address Translation) da PAT (Port Address Translation) aniq nimaga erishadi?",
      qru: "В NAT (Network Address Translation) что именно обеспечивает PAT (Port Address Translation)?",
      options: ["Maps multiple private IPs to a single public IP using different source ports.", "Encrypts the port number to hide traffic type.", "Converts IPv4 addresses to IPv6 addresses.", "Blocks unauthorized incoming ports automatically."],
      optionsuz: ["Turli xil manba portlaridan foydalanib, bir nechta xususiy IP-larni bitta ommaviy IP-ga xaritaga tushiradi.", "Trafik turini yashirish uchun port raqamini shifrlaydi.", "IPv4 manzillarini IPv6 manzillariga aylantiradi.", "Ruxsatsiz kirish portlarini avtomatik ravishda bloklaydi."],
      optionsru: ["Сопоставляет несколько частных IP-адресов с одним публичным IP-адресом, используя разные порты источника.", "Шифрует номер порта, чтобы скрыть тип трафика.", "Преобразует адреса IPv4 в адреса IPv6.", "Автоматически блокирует несанкционированные входящие порты."],
      correct: 0
    },
    {
      q: "What is the CIDR notation for a subnet mask of 255.255.255.224?",
      quz: "255.255.255.224 ostki tarmoq maskasi uchun CIDR belgisi qanday?",
      qru: "Какова нотация CIDR для маски подсети 255.255.255.224?",
      options: ["/27", "/24", "/28", "/26"],
      optionsuz: ["/27", "/24", "/28", "/26"],
      optionsru: ["/27", "/24", "/28", "/26"],
      correct: 0
    }
  ],
  "TCP and UDP": [
    {
      q: "During the TCP 3-way handshake, what flag is set by the server in response to the initial client packet?",
      quz: "TCP 3 tomonlama qo'l siqish (handshake) jarayonida mijozning dastlabki paketiga javoban server tomonidan qanday bayroq(flag) o'rnatiladi?",
      qru: "Во время 3-этапного рукопожатия TCP какой флаг устанавливается сервером в ответ на начальный пакет клиента?",
      options: ["SYN-ACK", "ACK", "SYN", "FIN"],
      optionsuz: ["SYN-ACK", "ACK", "SYN", "FIN"],
      optionsru: ["SYN-ACK", "ACK", "SYN", "FIN"],
      correct: 0
    },
    {
      q: "Which characteristic makes UDP highly suitable for real-time VoIP applications?",
      quz: "Qaysi xususiyat UDP ni real vaqt rejimida VoIP ilovalari uchun juda mos qiladi?",
      qru: "Какая характеристика делает UDP очень подходящим для VoIP-приложений в реальном времени?",
      options: ["Lack of retransmission delays.", "Guaranteed packet ordering.", "Built-in encryption.", "Automatic congestion control."],
      optionsuz: ["Qayta uzatish kechikishlarining yo'qligi.", "Paketlarni kafolatlangan tartiblash.", "O'rnatilgan shifrlash.", "Tirbandlikni avtomatik boshqarish."],
      optionsru: ["Отсутствие задержек повторной передачи.", "Гарантированный порядок пакетов.", "Встроенное шифрование.", "Автоматический контроль перегрузок."],
      correct: 0
    },
    {
      q: "In a TCP packet header, what is the Window Size field used for?",
      quz: "TCP paket sarlavhasida Window Size maydoni nima uchun ishlatiladi?",
      qru: "Для чего используется поле Window Size в заголовке пакета TCP?",
      options: ["Flow control, indicating how much data the receiver can currently accept.", "Defining the maximum segment size.", "Setting the TTL (Time To Live).", "Determining the encryption key length."],
      optionsuz: ["Oqimni boshqarish, qabul qiluvchi hozirda qancha ma'lumot qabul qilishi mumkinligini ko'rsatish uchun.", "Maksimal segment hajmini aniqlash uchun.", "TTL (Yashash vaqti) ni o'rnatish uchun.", "Shifrlash kaliti uzunligini aniqlash uchun."],
      optionsru: ["Управление потоком, указывающее, сколько данных в настоящее время может принять получатель.", "Определение максимального размера сегмента.", "Установка TTL (времени жизни).", "Определение длины ключа шифрования."],
      correct: 0
    },
    {
      q: "What happens if a UDP packet is corrupted in transit?",
      quz: "Agar UDP paketi tranzit paytida buzilgan bo'lsa nima bo'ladi?",
      qru: "Что произойдет, если пакет UDP будет поврежден при передаче?",
      options: ["It is dropped silently by the receiver.", "The receiver requests a retransmission.", "The receiver attempts to fix it using parity bits.", "The router returns an ICMP error to the sender."],
      optionsuz: ["Qabul qiluvchi tomonidan jimgina tashlab yuboriladi.", "Qabul qiluvchi uni qayta uzatishni so'raydi.", "Qabul qiluvchi uni parity bitlari yordamida tuzatishga harakat qiladi.", "Router jo'natuvchiga ICMP xatosini qaytaradi."],
      optionsru: ["Он молча отбрасывается получателем.", "Получатель запрашивает повторную передачу.", "Получатель пытается исправить это с помощью битов четности.", "Маршрутизатор возвращает отправителю ошибку ICMP."],
      correct: 0
    },
    {
      q: "Which TCP flag combination is often used in stealth scanning (e.g., Xmas Scan)?",
      quz: "Yashirin skanerlashda (masalan, Xmas Scan) qaysi TCP bayroq birikmasi tez-tez ishlatiladi?",
      qru: "Какая комбинация флагов TCP часто используется при скрытом сканировании (например, Xmas Scan)?",
      options: ["FIN, PSH, URG", "SYN, ACK", "RST, FIN", "SYN, URG"],
      optionsuz: ["FIN, PSH, URG", "SYN, ACK", "RST, FIN", "SYN, URG"],
      optionsru: ["FIN, PSH, URG", "SYN, ACK", "RST, FIN", "SYN, URG"],
      correct: 0
    }
  ],
  "DNS: names to numbers": [
    {
      q: "What type of DNS record is specifically used to map a domain name to an IPv6 address?",
      quz: "Domen nomini IPv6 manziliga xaritalash uchun aniq qaysi turdagi DNS yozuvi ishlatiladi?",
      qru: "Какой тип записи DNS специально используется для сопоставления доменного имени с адресом IPv6?",
      options: ["AAAA", "A", "CNAME", "PTR"],
      optionsuz: ["AAAA", "A", "CNAME", "PTR"],
      optionsru: ["AAAA", "A", "CNAME", "PTR"],
      correct: 0
    },
    {
      q: "Which component of the DNS hierarchy is responsible for knowing the IP addresses of authoritative name servers for the .com domain?",
      quz: "DNS ierarxiyasining qaysi komponenti .com domeni uchun avtoritet nom serverlarining IP manzillarini bilish uchun javobgardir?",
      qru: "Какой компонент иерархии DNS отвечает за знание IP-адресов авторитетных серверов имен для домена .com?",
      options: ["Root Name Servers", "Authoritative DNS Servers", "Local DNS Resolver", "TLD (Top-Level Domain) Servers"],
      optionsuz: ["Ildiz(Root) nom serverlari", "Avtoritet DNS serverlari", "Mahalliy DNS rezolveri", "TLD (Yuqori darajali domen) serverlari"],
      optionsru: ["Корневые серверы имен", "Авторитетные серверы DNS", "Локальный преобразователь DNS", "Серверы TLD (домена верхнего уровня)"],
      correct: 0
    },
    {
      q: "What is a DNS Zone Transfer (AXFR) and why is it a security risk if misconfigured?",
      quz: "DNS Zona Uzatish (AXFR) nima va nima uchun u noto'g'ri sozlangan bo'lsa, xavfsizlikka tahdid soladi?",
      qru: "Что такое передача зоны DNS (AXFR) и почему она представляет собой угрозу безопасности при неправильной настройке?",
      options: ["It replicates the entire DNS database of a domain; attackers can use it to map the entire internal network.", "It encrypts DNS queries; if misconfigured, it exposes queries in plaintext.", "It caches old records; causing users to visit malicious sites.", "It allows dynamic IP updates; attackers can hijack the domain."],
      optionsuz: ["U domenning butun DNS bazasini nusxalaydi; tajovuzkorlar undan butun ichki tarmoq xaritasini chizish uchun foydalanishi mumkin.", "U DNS so'rovlarini shifrlaydi; agar noto'g'ri sozlangan bo'lsa, so'rovlarni ochiq matnda ko'rsatadi.", "U eski yozuvlarni keshlash; foydalanuvchilarni zararli saytlarga tashrif buyurishga majbur qiladi.", "Dinamik IP yangilanishlariga imkon beradi; tajovuzkorlar domenni o'g'irlashi mumkin."],
      optionsru: ["Он реплицирует всю базу данных DNS домена; злоумышленники могут использовать его для составления карты всей внутренней сети.", "Он шифрует DNS-запросы; если он настроен неправильно, он раскрывает запросы в виде простого текста.", "Он кэширует старые записи; заставляя пользователей посещать вредоносные сайты.", "Это позволяет динамически обновлять IP; злоумышленники могут перехватить домен."],
      correct: 0
    },
    {
      q: "How does DNS caching poisoning (DNS Spoofing) work?",
      quz: "DNS keshini zaharlash (DNS Spoofing) qanday ishlaydi?",
      qru: "Как работает отравление кэша DNS (DNS Spoofing)?",
      options: ["An attacker injects fake DNS records into a recursive resolver's cache, redirecting users.", "An attacker changes the host file on the target's computer.", "An attacker floods the DNS server with queries until it crashes.", "An attacker steals the domain's SSL certificate."],
      optionsuz: ["Tajovuzkor rekursiv rezolver keshiga soxta DNS yozuvlarini kiritib, foydalanuvchilarni boshqa tomonga yo'naltiradi.", "Tajovuzkor nishonning kompyuteridagi host faylini o'zgartiradi.", "Tajovuzkor DNS serverini so'rovlar bilan to'ldirib yuboradi.", "Tajovuzkor domenning SSL sertifikatini o'g'irlaydi."],
      optionsru: ["Злоумышленник внедряет поддельные записи DNS в кэш рекурсивного преобразователя, перенаправляя пользователей.", "Злоумышленник изменяет файл хоста на компьютере цели.", "Злоумышленник заполняет DNS-сервер запросами, пока он не выйдет из строя.", "Злоумышленник крадет SSL-сертификат домена."],
      correct: 0
    },
    {
      q: "Which DNS record type is essential for setting up email services and specifying mail servers?",
      quz: "Elektron pochta xizmatlarini o'rnatish va pochta serverlarini ko'rsatish uchun qaysi DNS yozuv turi muhim?",
      qru: "Какой тип записи DNS имеет важное значение для настройки служб электронной почты и указания почтовых серверов?",
      options: ["MX", "TXT", "SRV", "NS"],
      optionsuz: ["MX", "TXT", "SRV", "NS"],
      optionsru: ["MX", "TXT", "SRV", "NS"],
      correct: 0
    }
  ]
};

const EXAM_QUESTIONS = [
  {
    q: "In an enterprise network, you observe abnormal traffic utilizing ICMP tunneling. What is the most likely purpose of this attack?",
    quz: "Korporativ tarmoqda siz ICMP tunneling orqali g'ayritabiiy trafikni kuzatdingiz. Ushbu hujumning eng ehtimoliy maqsadi nima?",
    qru: "В корпоративной сети вы наблюдаете аномальный трафик с использованием ICMP-туннелирования. Какова наиболее вероятная цель этой атаки?",
    options: ["Data exfiltration bypassing standard firewall rules.", "Causing a Denial of Service via Ping of Death.", "Spoofing IP addresses to bypass MAC filtering.", "Automatically updating routing tables via OSPF."],
    optionsuz: ["Standart xavfsizlik devori qoidalarini chetlab o'tib, ma'lumotlarni chiqarib yuborish.", "Ping of Death orqali xizmat ko'rsatishni rad etishni keltirib chiqarish.", "MAC filtrlashni chetlab o'tish uchun IP manzillarni soxtalashtirish.", "OSPF orqali marshrutlash jadvallarini avtomatik yangilash."],
    optionsru: ["Утечка данных в обход стандартных правил брандмауэра.", "Вызов отказа в обслуживании с помощью Ping of Death.", "Подмена IP-адресов для обхода фильтрации MAC.", "Автоматическое обновление таблиц маршрутизации через OSPF."],
    correct: 0
  },
  {
    q: "How does the BGP (Border Gateway Protocol) route hijacking vulnerability manifest?",
    quz: "BGP (Border Gateway Protocol) marshrutini o'g'irlash zaifligi qanday namoyon bo'ladi?",
    qru: "Как проявляется уязвимость перехвата маршрута BGP (Border Gateway Protocol)?",
    options: ["A malicious AS announces a more specific prefix, redirecting global traffic to itself.", "An attacker guesses the TCP sequence numbers of BGP peers.", "The DNS server routes traffic to an incorrect AS number.", "A router runs out of memory processing BGP tables."],
    optionsuz: ["Zararli AS aniqroq prefiksni e'lon qiladi va global trafikni o'ziga yo'naltiradi.", "Tajovuzkor BGP tengdoshlarining TCP ketma-ketlik raqamlarini taxmin qiladi.", "DNS serveri trafikni noto'g'ri AS raqamiga yo'naltiradi.", "BGP jadvallarini qayta ishlashda routerning xotirasi tugaydi."],
    optionsru: ["Вредоносная AS объявляет более конкретный префикс, перенаправляя глобальный трафик на себя.", "Злоумышленник угадывает порядковые номера TCP узлов BGP.", "DNS-сервер направляет трафик на неверный номер AS.", "У маршрутизатора заканчивается память при обработке таблиц BGP."],
    correct: 0
  },
  {
    q: "If an IDS alerts on a 'TCP SYN Flood', what mitigation technique at the firewall or load balancer is most effective?",
    quz: "Agar IDS 'TCP SYN Flood' haqida ogohlantirsa, xavfsizlik devori yoki yuk balanserida qaysi yumshatish texnikasi eng samarali hisoblanadi?",
    qru: "Если IDS предупреждает о 'TCP SYN Flood', какой метод смягчения последствий на брандмауэре или балансировщике нагрузки является наиболее эффективным?",
    options: ["SYN Cookies", "Disabling ICMP replies", "Dropping all UDP packets", "Increasing the TTL value"],
    optionsuz: ["SYN Cookies", "ICMP javoblarini o'chirish", "Barcha UDP paketlarini tashlab yuborish", "TTL qiymatini oshirish"],
    optionsru: ["SYN Cookies", "Отключение ответов ICMP", "Отбрасывание всех UDP-пакетов", "Увеличение значения TTL"],
    correct: 0
  },
  {
    q: "Why is ARP Spoofing highly effective on local area networks (LANs) but ineffective across the wider internet?",
    quz: "Nima uchun ARP Spoofing mahalliy tarmoqlarda (LAN) juda samarali, lekin kengroq internetda samarasiz?",
    qru: "Почему ARP Spoofing очень эффективен в локальных сетях (LAN), но неэффективен в широком Интернете?",
    options: ["ARP is a Layer 2 protocol and does not cross Layer 3 routers.", "ISPs block ARP packets by default.", "ARP relies on TCP, which resets across WANs.", "ARP packets are encrypted on the internet."],
    optionsuz: ["ARP Layer 2 protokoli bo'lib, Layer 3 routerlaridan o'tmaydi.", "ISP provayderlari sukut bo'yicha ARP paketlarini bloklaydi.", "ARP TCP ga tayanadi, u WAN bo'ylab qayta o'rnatiladi.", "Internetda ARP paketlari shifrlangan."],
    optionsru: ["ARP — это протокол уровня 2, который не пересекает маршрутизаторы уровня 3.", "Интернет-провайдеры блокируют ARP-пакеты по умолчанию.", "ARP опирается на TCP, который сбрасывается в сетях WAN.", "Пакеты ARP шифруются в Интернете."],
    correct: 0
  },
  {
    q: "What is the primary function of IPSec Transport Mode compared to Tunnel Mode?",
    quz: "Tunnel rejimiga nisbatan IPSec transport rejimining asosiy vazifasi nima?",
    qru: "Какова основная функция транспортного режима IPSec по сравнению с туннельным режимом?",
    options: ["Transport mode only encrypts the payload, while Tunnel mode encrypts both the payload and the original IP header.", "Transport mode is used for site-to-site VPNs.", "Transport mode does not provide data integrity.", "Tunnel mode operates at Layer 4, Transport operates at Layer 3."],
    optionsuz: ["Transport rejimi faqat yukni shifrlaydi, Tunnel rejimi esa yukni ham, asl IP sarlavhasini ham shifrlaydi.", "Transport rejimi saytdan saytga VPN-lar uchun ishlatiladi.", "Transport rejimi ma'lumotlar yaxlitligini ta'minlamaydi.", "Tunnel rejimi 4-qatlamda, Transport 3-qatlamda ishlaydi."],
    optionsru: ["Транспортный режим шифрует только полезную нагрузку, тогда как туннельный режим шифрует как полезную нагрузку, так и исходный заголовок IP.", "Транспортный режим используется для VPN типа «сеть-сеть».", "Транспортный режим не обеспечивает целостность данных.", "Туннельный режим работает на уровне 4, транспортный — на уровне 3."],
    correct: 0
  },
  {
    q: "In a Distributed Reflection Denial of Service (DRDoS) attack via NTP, what specific command is typically abused?",
    quz: "NTP orqali tarqatilgan ko'zgu xizmatini rad etish (DRDoS) hujumida odatda qaysi o'ziga xos buyruq suiiste'mol qilinadi?",
    qru: "Какая конкретная команда обычно злоупотребляется при атаке типа «распределенный отказ в обслуживании» (DRDoS) через NTP?",
    options: ["monlist", "ntpdate", "ping", "get-status"],
    optionsuz: ["monlist", "ntpdate", "ping", "get-status"],
    optionsru: ["monlist", "ntpdate", "ping", "get-status"],
    correct: 0
  },
  {
    q: "Which IEEE standard is primarily associated with port-based Network Access Control (PNAC)?",
    quz: "Qaysi IEEE standarti asosan portga asoslangan Tarmoqqa kirishni boshqarish (PNAC) bilan bog'liq?",
    qru: "Какой стандарт IEEE в первую очередь связан с управлением доступом к сети на основе портов (PNAC)?",
    options: ["802.1X", "802.11", "802.3", "802.1Q"],
    optionsuz: ["802.1X", "802.11", "802.3", "802.1Q"],
    optionsru: ["802.1X", "802.11", "802.3", "802.1Q"],
    correct: 0
  },
  {
    q: "A subnet has a mask of /29. How many usable host IPs are available?",
    quz: "/29 maskali quyi tarmoqda. Qancha foydalanish mumkin bo'lgan xost IP-lari mavjud?",
    qru: "Подсеть имеет маску /29. Сколько доступно полезных IP-адресов хостов?",
    options: ["6", "8", "14", "30"],
    optionsuz: ["6", "8", "14", "30"],
    optionsru: ["6", "8", "14", "30"],
    correct: 0
  },
  {
    q: "What defines a Split-Tunnel VPN configuration?",
    quz: "Split-Tunnel VPN konfiguratsiyasini nima belgilaydi?",
    qru: "Что определяет конфигурацию Split-Tunnel VPN?",
    options: ["Only traffic destined for the corporate network goes through the VPN, while internet traffic bypasses it.", "Traffic is split across multiple ISPs for redundancy.", "The VPN uses both TCP and UDP simultaneously.", "Encryption and decryption are handled by separate dedicated servers."],
    optionsuz: ["Faqat korporativ tarmoqqa yo'naltirilgan trafik VPN orqali o'tadi, internet trafigi esa uni aylanib o'tadi.", "Qayta ishlash uchun trafik bir nechta ISP lari bo'ylab bo'linadi.", "VPN bir vaqtning o'zida TCP va UDP dan foydalanadi.", "Shifrlash va parolni ochish alohida maxsus serverlar tomonidan amalga oshiriladi."],
    optionsru: ["Через VPN проходит только трафик, предназначенный для корпоративной сети, а интернет-трафик идет в обход него.", "Трафик распределяется между несколькими интернет-провайдерами для обеспечения избыточности.", "VPN использует одновременно TCP и UDP.", "Шифрование и дешифрование обрабатываются отдельными выделенными серверами."],
    correct: 0
  },
  {
    q: "When analyzing a PCAP, what indicates a successful TCP connection establishment?",
    quz: "PCAP-ni tahlil qilayotganda, muvaffaqiyatli TCP ulanishini o'rnatilishini nima ko'rsatadi?",
    qru: "При анализе PCAP что указывает на успешное установление TCP-соединения?",
    options: ["A packet sequence of SYN -> SYN-ACK -> ACK.", "A packet with the PSH flag set.", "A DNS response followed by a TLS Client Hello.", "A continuous stream of ICMP replies."],
    optionsuz: ["SYN -> SYN-ACK -> ACK paketi ketma-ketligi.", "PSH bayrog'i o'rnatilgan paket.", "DNS javobidan so'ng TLS Client Hello.", "ICMP javoblarining uzluksiz oqimi."],
    optionsru: ["Последовательность пакетов SYN -> SYN-ACK -> ACK.", "Пакет с установленным флагом PSH.", "Ответ DNS, за которым следует TLS Client Hello.", "Непрерывный поток ответов ICMP."],
    correct: 0
  },
  {
    q: "Which protocol is utilized to automatically assign IP configurations to clients on a local network?",
    quz: "Mijozlarga mahalliy tarmoqda IP konfiguratsiyalarini avtomatik ravishda belgilash uchun qaysi protokol ishlatiladi?",
    qru: "Какой протокол используется для автоматического назначения IP-конфигураций клиентам в локальной сети?",
    options: ["DHCP", "DNS", "ARP", "BGP"],
    optionsuz: ["DHCP", "DNS", "ARP", "BGP"],
    optionsru: ["DHCP", "DNS", "ARP", "BGP"],
    correct: 0
  },
  {
    q: "During a penetration test, you find an open port 53. If it answers to TCP requests rather than UDP, what might it indicate?",
    quz: "Penetratsiya testi davomida siz ochiq 53 portni topasiz. Agar u UDP emas, balki TCP so'rovlariga javob bersa, bu nimani ko'rsatishi mumkin?",
    qru: "Во время теста на проникновение вы находите открытый порт 53. Если он отвечает на запросы TCP, а не UDP, на что это может указывать?",
    options: ["The server allows DNS Zone Transfers (AXFR) or handles very large responses.", "The server is a web server misconfigured to use port 53.", "The DNS service is corrupted and failing back to TCP.", "The port is being used as a honeypot."],
    optionsuz: ["Server DNS Zone Transfers (AXFR) ga ruxsat beradi yoki juda katta javoblarni qayta ishlaydi.", "Server 53-portdan foydalanish uchun noto'g'ri sozlangan veb-server.", "DNS xizmati buzilgan va TCP-ga qaytmoqda.", "Port asal idishi (honeypot) sifatida ishlatilmoqda."],
    optionsru: ["Сервер разрешает передачу зон DNS (AXFR) или обрабатывает очень большие ответы.", "Сервер — это веб-сервер, неправильно настроенный для использования порта 53.", "Служба DNS повреждена и возвращается к TCP.", "Порт используется как honeypot."],
    correct: 0
  },
  {
    q: "What is the function of the OSPF protocol in large networks?",
    quz: "Katta tarmoqlarda OSPF protokolining vazifasi nima?",
    qru: "Какова функция протокола OSPF в больших сетях?",
    options: ["It dynamically calculates the shortest path for routing using a link-state algorithm.", "It encrypts traffic between remote branch offices.", "It converts domain names to internal IP addresses.", "It manages the allocation of IPv6 addresses."],
    optionsuz: ["U havola holati(link-state) algoritmi yordamida marshrutlash uchun eng qisqa yo'lni dinamik ravishda hisoblab chiqadi.", "Uzoqdagi filiallar orasidagi trafikni shifrlaydi.", "Domen nomlarini ichki IP manzillarga aylantiradi.", "IPv6 manzillarini taqsimlashni boshqaradi."],
    optionsru: ["Он динамически вычисляет кратчайший путь для маршрутизации с использованием алгоритма состояния канала.", "Он шифрует трафик между удаленными филиалами.", "Он преобразует доменные имена во внутренние IP-адреса.", "Он управляет распределением адресов IPv6."],
    correct: 0
  },
  {
    q: "What vulnerability arises if an organization relies solely on MAC address filtering for wireless network security?",
    quz: "Agar tashkilot simsiz tarmoq xavfsizligi uchun faqat MAC-manzillarni filtrlashga tayansa, qanday zaiflik yuzaga keladi?",
    qru: "Какая уязвимость возникает, если организация полагается исключительно на фильтрацию MAC-адресов для обеспечения безопасности беспроводной сети?",
    options: ["MAC addresses can be easily sniffed in plaintext and spoofed by attackers.", "MAC addresses are only 32 bits and easily brute-forced.", "MAC filtering disables WPA3 encryption automatically.", "The router's ARP table overflows rapidly."],
    optionsuz: ["MAC manzillarni oddiy matnda osongina ushlab olish va tajovuzkorlar tomonidan soxtalashtirish mumkin.", "MAC manzillar faqat 32 bit bo'lib, osonlikcha buziladi (brute-force).", "MAC filtrlash WPA3 shifrlashni avtomatik ravishda o'chiradi.", "Routerning ARP jadvali tez to'lib ketadi."],
    optionsru: ["MAC-адреса легко перехватываются открытым текстом и подделываются злоумышленниками.", "MAC-адреса состоят всего из 32 бит, и их легко подобрать (brute-force).", "Фильтрация MAC автоматически отключает шифрование WPA3.", "Таблица ARP маршрутизатора быстро переполняется."],
    correct: 0
  },
  {
    q: "How does the 'Time To Live' (TTL) field in an IP header prevent infinite network loops?",
    quz: "IP sarlavhasidagi 'Time To Live' (TTL) maydoni qanday qilib cheksiz tarmoq ko'chadan(loop) saqlaydi?",
    qru: "Как поле 'Time To Live' (TTL) в заголовке IP предотвращает бесконечные сетевые циклы?",
    options: ["It decrements by 1 at each router hop; if it reaches 0, the packet is discarded.", "It restricts the packet from existing longer than a specified number of seconds.", "It forces the packet to return to the sender if a loop is detected.", "It encrypts the routing path to prevent interception."],
    optionsuz: ["Har bir router xopida(hop) 1 taga kamayadi; agar u 0 ga yetsa, paket bekor qilinadi.", "Paket belgilangan soniyalardan ko'proq yashashini cheklaydi.", "Agar sikl aniqlansa, paketni jo'natuvchiga qaytarishga majbur qiladi.", "Tutib qolishning oldini olish uchun marshrutlash yo'lini shifrlaydi."],
    optionsru: ["Он уменьшается на 1 при каждом прыжке маршрутизатора; если он достигает 0, пакет отбрасывается.", "Он ограничивает существование пакета временем, превышающим указанное количество секунд.", "Он заставляет пакет вернуться отправителю, если обнаружен цикл.", "Он шифрует путь маршрутизации для предотвращения перехвата."],
    correct: 0
  }
];

  const modTitle = "Networking basics";
  const modRes = await db.select().from(modulesTable).where(eq(modulesTable.title, modTitle));
  if (modRes.length === 0) return res.status(404).json({ error: "Module not found" });
  const mid = modRes[0].id;

  // Insert hard exam questions
  await db.delete(moduleQuestionsTable).where(eq(moduleQuestionsTable.moduleId, mid));
  for (let i = 0; i < EXAM_QUESTIONS.length; i++) {
    const q = EXAM_QUESTIONS[i];
    await db.insert(moduleQuestionsTable).values({
      moduleId: mid,
      question: q.q, questionUz: q.quz, questionRu: q.qru,
      options: q.options, optionsUz: q.optionsuz, optionsRu: q.optionsru,
      correctOption: q.correct, orderIndex: i
    });
  }

  // Insert medium lesson questions
  const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, mid));
  let added = 0;
  for (const l of lessons) {
    const qs = NETWORK_LESSONS[l.title];
    if (qs) {
      await db.delete(lessonQuestionsTable).where(eq(lessonQuestionsTable.lessonId, l.id));
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        await db.insert(lessonQuestionsTable).values({
          lessonId: l.id,
          question: q.q, questionUz: q.quz, questionRu: q.qru,
          options: q.options, optionsUz: q.optionsuz, optionsRu: q.optionsru,
          correctOption: q.correct, orderIndex: i
        });
        added++;
      }
    }
  }

  res.json({ success: true, message: "Networking basics fully seeded with hard/medium trilingual questions!" });
});

export default router;
