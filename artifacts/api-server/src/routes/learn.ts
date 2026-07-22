import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  learnCategoriesTable, lessonsTable, lessonQuestionsTable, userLessonAttemptsTable,
  modulesTable, moduleQuestionsTable, moduleExamAttemptsTable, certificatesTable,
  programDiplomasTable,
} from "@workspace/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { SubmitLessonTestBody } from "@workspace/api-zod";
import { awardPoints } from "../lib/scoring";
const router = Router();

// GET /api/learn/categories
router.get("/categories", optionalAuth, async (req, res) => {
  const categories = await db.select().from(learnCategoriesTable);
  const allLessons = await db.select().from(lessonsTable).where(eq(lessonsTable.isPublished, true));
  const userId = req.user?.userId;

  const completedMap = new Map<number, number>();
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
  if (questions.length === 0) return res.status(400).json({ error: "No questions for this lesson" });
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

    const score = correct / questions.length;
    const passed = score >= 0.8;
    let pointsEarned = 0;

    // Guard on `completedAt`, not `status`: starting a new attempt rewrites
    // `status` back to "in_progress", which would re-open the points award and
    // let a user bank the lesson's points once per allowed attempt.
    if (passed && !attempt.completedAt) {
      await tx.update(userLessonAttemptsTable)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(userLessonAttemptsTable.id, attempt.id));

      pointsEarned = await awardPoints(tx, userId, lesson?.points ?? 0);
    } else if (!passed) {
      await tx.update(userLessonAttemptsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(userLessonAttemptsTable.id, attempt.id));
    }

    return { status: 200, data: { passed, score, correctCount: correct, totalCount: questions.length, pointsEarned } };
  });

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

  res.json({
    id: mod.id, slug: mod.slug,
    title: mod.title, titleUz: mod.titleUz, titleRu: mod.titleRu,
    description: mod.description, descriptionUz: mod.descriptionUz, descriptionRu: mod.descriptionRu,
    difficulty: mod.difficulty, estimatedHours: mod.estimatedHours, passScore: mod.passScore,
    examQuestionCount,
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
  if (questions.length === 0) return res.status(400).json({ error: "Module has no exam yet" });

  const sessionId = uuidv4();
  const [existing] = await db.select().from(moduleExamAttemptsTable)
    .where(and(eq(moduleExamAttemptsTable.userId, userId), eq(moduleExamAttemptsTable.moduleId, moduleId))).limit(1);

  if (existing) {
    await db.update(moduleExamAttemptsTable).set({
      attemptCount: existing.attemptCount + 1, examSessionId: sessionId, examStartedAt: new Date(), updatedAt: new Date(),
    }).where(eq(moduleExamAttemptsTable.id, existing.id));
  } else {
    await db.insert(moduleExamAttemptsTable).values({
      userId, moduleId, attemptCount: 1, examSessionId: sessionId, examStartedAt: new Date(),
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
  if (questions.length === 0) return res.status(400).json({ error: "Module has no exam" });
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
    const score = Math.round((correct / questions.length) * 100);
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

export default router;
