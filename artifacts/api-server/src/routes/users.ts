import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { db } from "@workspace/db";
import {
  usersTable, ctfAttemptsTable, ctfTasksTable, ctfWriteupsTable,
  userLessonAttemptsTable, lessonsTable, modulesTable, moduleExamAttemptsTable,
  certificatesTable, programDiplomasTable,
  competitionsTable, competitionUsersTable, competitionSolvesTable, competitionTeamsTable,
  jobsTable, jobApplicationsTable, labInstancesTable,
  auditLogsTable, userTitlesTable, titlesTable, referralsTable, giftsTable,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth, requireSession } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { uploadBufferToStorage } from "../lib/storage";
import { logger } from "../lib/logger";
import { writeAuditLog } from "../lib/audit";
import { ensureReferralCode, ambassadorTier, activeReferralCount, COMPETITION_INVITE_REQUIREMENT } from "../lib/referrals";

const router = Router();

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (Object.hasOwn(AVATAR_EXTENSIONS, file.mimetype)) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

router.get("/me/dashboard", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  // A GET used to repair this user's points here — a non-idempotent read, and
  // unnecessary now that awardPoints simply never pays an excluded account. Use
  // POST /admin/users/recalculate-points to fix historical rows.
  const [solvedCtf, completedLessons, titles, rank] = await Promise.all([
    db.select({ ctfId: ctfAttemptsTable.ctfId, solvedAt: ctfAttemptsTable.solvedAt, name: ctfTasksTable.name })
      .from(ctfAttemptsTable)
      .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
      .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.solved, true))),
    db.select({ lessonId: userLessonAttemptsTable.lessonId, completedAt: userLessonAttemptsTable.completedAt, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu })
      .from(userLessonAttemptsTable)
      .innerJoin(lessonsTable, eq(userLessonAttemptsTable.lessonId, lessonsTable.id))
      .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed"))),
    db.select({ id: titlesTable.id, name: titlesTable.name, category: titlesTable.category, earnedAt: userTitlesTable.earnedAt })
      .from(userTitlesTable)
      .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
      .where(eq(userTitlesTable.userId, userId)),
    // Was: load every non-blocked user, sort in JS, find the index.
    rankOf(user),
  ]);

  // Resume point: the first published lesson, in module then lesson order, that
  // this learner has not completed. Powers the dashboard "Continue" card so the
  // curriculum picks up where they left off instead of dumping them at the top.
  const completedIds = new Set(completedLessons.map(l => l.lessonId));
  const ordered = await db.select({
    id: lessonsTable.id, title: lessonsTable.title, titleUz: lessonsTable.titleUz, titleRu: lessonsTable.titleRu,
    moduleId: lessonsTable.moduleId,
  })
    .from(lessonsTable)
    .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
    .where(and(eq(lessonsTable.isPublished, true), eq(modulesTable.isPublished, true)))
    .orderBy(asc(modulesTable.orderIndex), asc(lessonsTable.orderIndex));
  const nextLesson = ordered.find(l => !completedIds.has(l.id)) ?? null;

  res.json({
    user: { id: user.id, nickname: user.nickname, points: earnsPoints(user) ? user.points : 0, rank },
    progress: {
      solvedCtfCount: solvedCtf.length,
      completedLessonCount: completedLessons.length,
      titleCount: titles.length,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
    },
    nextLesson,
    recent: {
      solvedCtf: solvedCtf.slice(-5).reverse().map(item => ({ ctfId: item.ctfId, solvedAt: item.solvedAt, name: item.name })),
      completedLessons: completedLessons.slice(-5).reverse().map(item => ({ lessonId: item.lessonId, completedAt: item.completedAt, title: item.title, titleUz: item.titleUz, titleRu: item.titleRu })),
    },
    titles: titles.map(item => ({ id: item.id, name: item.name, category: item.category, earnedAt: item.earnedAt })),
  });
});

/**
 * What this learner should be nudged about, right now.
 *
 * There is no mail cron and no push channel here, so a "reminder" is something
 * the site says the next time it is opened. That is the honest version: it
 * cannot chase someone who never comes back, but it does stop a returning
 * learner from landing on a wall of statistics with no next action — which is
 * what the dashboard was.
 *
 * Every reminder is returned as a *kind plus data*, never a sentence: the
 * wording has to exist in three languages and the server has no idea which one
 * the reader has selected.
 */
/**
 * The referral panel: this user's code, who they have brought in, and what it
 * has earned them. One place the profile reads to draw everything.
 *
 * `activeCount` is the number that matters — it opens the competition gate and
 * sets the Ambassador tier. `pending` are signups that have not yet verified
 * their email and done something real, shown so the inviter knows to nudge
 * them, but counting toward nothing.
 */
router.get("/me/referrals", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const code = await ensureReferralCode(userId);

  const rows = await db.select({
    nickname: usersTable.nickname,
    status: referralsTable.status,
    activatedAt: referralsTable.activatedAt,
    createdAt: referralsTable.createdAt,
  })
    .from(referralsTable)
    .innerJoin(usersTable, eq(referralsTable.refereeId, usersTable.id))
    .where(eq(referralsTable.referrerId, userId))
    .orderBy(desc(referralsTable.createdAt));

  const active = rows.filter(r => r.status === "active").length;
  const [me] = await db.select({ credits: usersTable.freeHintCredits })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  res.json({
    code,
    activeCount: active,
    pendingCount: rows.length - active,
    freeHintCredits: me?.credits ?? 0,
    tier: ambassadorTier(active),
    competitionRequirement: COMPETITION_INVITE_REQUIREMENT,
    eligibleForCompetitions: active >= COMPETITION_INVITE_REQUIREMENT,
    invitees: rows.map(r => ({
      nickname: r.nickname,
      status: r.status,
      // Only the day, and only the inviter sees it — enough to recognise a
      // recruit without exposing another learner's activity clock.
      joinedAt: r.createdAt.toISOString().slice(0, 10),
    })),
  });
});

type Reminder = { kind: string; priority: number; data: Record<string, unknown> };

router.get("/me/reminders", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const reminders: Reminder[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // 1. The streak. `lastActivityDate` is the same UTC day string the streak
  //    writer uses, so comparing strings here cannot drift the way a local-time
  //    Date comparison would.
  if (user.currentStreak > 0 && user.lastActivityDate !== today) {
    reminders.push({ kind: "streak_at_risk", priority: 10, data: { currentStreak: user.currentStreak } });
  } else if (user.currentStreak === 0 && user.longestStreak >= 3) {
    reminders.push({ kind: "streak_lost", priority: 40, data: { longestStreak: user.longestStreak } });
  }

  // 2. Curriculum state — one query for the published lessons, one for this
  //    learner's completions, then everything else is arithmetic.
  const publishedLessons = await db.select({ id: lessonsTable.id, moduleId: lessonsTable.moduleId })
    .from(lessonsTable)
    .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
    .where(and(eq(lessonsTable.isPublished, true), eq(modulesTable.isPublished, true)));

  const doneRows = await db.select({ lessonId: userLessonAttemptsTable.lessonId })
    .from(userLessonAttemptsTable)
    .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed")));
  const done = new Set(doneRows.map(r => r.lessonId));

  const totalByModule = new Map<number, number>();
  const doneByModule = new Map<number, number>();
  for (const l of publishedLessons) {
    if (l.moduleId === null) continue;
    totalByModule.set(l.moduleId, (totalByModule.get(l.moduleId) ?? 0) + 1);
    if (done.has(l.id)) doneByModule.set(l.moduleId, (doneByModule.get(l.moduleId) ?? 0) + 1);
  }

  const startedModuleIds = [...doneByModule.keys()];
  if (startedModuleIds.length > 0) {
    const mods = await db.select({
      id: modulesTable.id, title: modulesTable.title,
      titleUz: modulesTable.titleUz, titleRu: modulesTable.titleRu,
      orderIndex: modulesTable.orderIndex,
    }).from(modulesTable).where(inArray(modulesTable.id, startedModuleIds));

    const exams = await db.select().from(moduleExamAttemptsTable)
      .where(and(eq(moduleExamAttemptsTable.userId, userId), inArray(moduleExamAttemptsTable.moduleId, startedModuleIds)));
    const passed = new Map(exams.map(e => [e.moduleId, e.passed]));

    const certs = await db.select({ moduleId: certificatesTable.moduleId }).from(certificatesTable)
      .where(and(eq(certificatesTable.userId, userId), inArray(certificatesTable.moduleId, startedModuleIds)));
    const hasCert = new Set(certs.map(c => c.moduleId));

    // Nearest to the finish line first — a module with one lesson left is a far
    // better thing to point at than one barely begun.
    const ranked = mods
      .map(m => ({
        m,
        total: totalByModule.get(m.id) ?? 0,
        finished: doneByModule.get(m.id) ?? 0,
      }))
      .sort((a, b) => (a.total - a.finished) - (b.total - b.finished) || a.m.orderIndex - b.m.orderIndex);

    // One curriculum reminder, not five: a to-do list of eight modules is the
    // same paralysis the dashboard already had.
    const claimable = ranked.find(({ m, total, finished }) => finished === total && passed.get(m.id) && !hasCert.has(m.id));
    const target = claimable ?? ranked[0];
    if (target) {
      const { m, total, finished } = target;
      const title = { moduleId: m.id, title: m.title, titleUz: m.titleUz, titleRu: m.titleRu };
      if (finished < total) {
        reminders.push({ kind: "module_unfinished", priority: 20, data: { ...title, remaining: total - finished, total } });
      } else if (!passed.get(m.id)) {
        reminders.push({ kind: "exam_ready", priority: 15, data: title });
      } else if (!hasCert.has(m.id)) {
        // Passed the exam and never claimed the certificate — the most wasteful
        // state on the platform, because the credential already exists in
        // everything but name.
        reminders.push({ kind: "certificate_ready", priority: 5, data: title });
      }
    }
  }

  // 3. Events. A competition nobody hears about might as well not run — which
  //    matters most for the sponsored ones.
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // "Already joined" is excluded in SQL, not after the fact: fetching the next
  // three and then filtering meant that three events this learner had already
  // joined hid the one they had not. Found by the test suite once more than one
  // competition existed at a time.
  const [next] = await db.select({
    id: competitionsTable.id, name: competitionsTable.name,
    startTime: competitionsTable.startTime, endTime: competitionsTable.endTime,
    sponsorName: competitionsTable.sponsorName,
  })
    .from(competitionsTable)
    .where(and(
      eq(competitionsTable.type, "public"),
      gt(competitionsTable.endTime, now),
      sql`${competitionsTable.startTime} < ${soon}`,
      sql`not exists (
        select 1 from ${competitionUsersTable}
        where ${competitionUsersTable.competitionId} = ${competitionsTable.id}
          and ${competitionUsersTable.userId} = ${userId}
      )`,
    ))
    .orderBy(asc(competitionsTable.startTime))
    .limit(1);

  if (next) {
    const live = next.startTime <= now;
    reminders.push({
      kind: live ? "competition_live" : "competition_soon",
      priority: live ? 1 : 8,
      data: {
        competitionId: next.id, name: next.name, sponsorName: next.sponsorName,
        startTime: next.startTime, endTime: next.endTime,
      },
    });
  }

  reminders.sort((a, b) => a.priority - b.priority);
  res.json({ reminders: reminders.slice(0, 3) });
});

/** Counts who is ahead instead of loading and sorting the whole user table. */
async function rankOf(user: { id: number; role: string; points: number; excludedFromScoring: boolean; adminEarnsPoints: boolean }) {
  if (!earnsPoints(user)) return 0;

  // Rank is over everyone who is actually scored: learners, plus any admin a
  // super-admin has opted into scoring. Mirrors the scoreboard's own filter.
  const [{ ahead }] = await db.select({ ahead: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(
      eq(usersTable.isBlocked, false),
      eq(usersTable.excludedFromScoring, false),
      or(eq(usersTable.role, "user"), eq(usersTable.adminEarnsPoints, true)),
      or(
        sql`${usersTable.points} > ${user.points}`,
        and(eq(usersTable.points, user.points), sql`${usersTable.id} < ${user.id}`),
      ),
    ));
  return ahead + 1;
}

/**
 * Every competition this user joined, with their score and rank in each — in one
 * query. The old loop ran three queries per competition, one of which read every
 * solve in that competition to work out a single rank.
 */
async function competitionHistoryFor(userId: number) {
  const rows = await db.execute(sql`
    with totals as (
      select cs.competition_id, cs.user_id, sum(cs.points_earned)::int as points
      from competition_solves cs
      where cs.competition_id in (
        select competition_id from competition_users where user_id = ${userId}
      )
      group by cs.competition_id, cs.user_id
    ),
    ranked as (
      select competition_id, user_id, points,
             row_number() over (partition by competition_id order by points desc, user_id asc)::int as rank
      from totals
    )
    select c.id as competition_id, c.name as competition_name,
           coalesce(r.points, 0) as points,
           -- No solves yet means no rank row; last place is the honest answer.
           coalesce(r.rank, (select count(*)::int from competition_users where competition_id = c.id)) as rank
    from competition_users cu
    join competitions c on c.id = cu.competition_id
    left join ranked r on r.competition_id = c.id and r.user_id = cu.user_id
    where cu.user_id = ${userId}
    order by c.start_time desc
  `);

  return (rows.rows as Array<{ competition_id: number; competition_name: string; points: number; rank: number }>)
    .map(row => ({
      competitionId: row.competition_id,
      competitionName: row.competition_name,
      points: Number(row.points),
      rank: Number(row.rank),
    }));
}

/**
 * One profile, in a fixed number of queries.
 *
 * This was a nest of N+1s: every solved challenge, every completed lesson and
 * every competition cost a query of its own, and the competition loop ran a
 * full scan of that competition's solves *inside* it. A user with 50 solves
 * meant 50+ round-trips on every profile view. It is joins now — the row count
 * changes, the query count does not.
 */
async function getProfileData(id: number, requestingUserId?: number, requestingUserRole?: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return null;

  const [solvedCtf, completedLessons, userTitles, competitionHistory, rank] = await Promise.all([
    db.select({
      id: ctfTasksTable.id,
      name: ctfTasksTable.name,
      category: ctfTasksTable.category,
      points: ctfTasksTable.points,
      solvedAt: ctfAttemptsTable.solvedAt,
    })
      .from(ctfAttemptsTable)
      .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
      .where(and(eq(ctfAttemptsTable.userId, id), eq(ctfAttemptsTable.solved, true))),

    db.select({
      id: lessonsTable.id,
      title: lessonsTable.title,
      points: lessonsTable.points,
      completedAt: userLessonAttemptsTable.completedAt,
    })
      .from(userLessonAttemptsTable)
      .innerJoin(lessonsTable, eq(userLessonAttemptsTable.lessonId, lessonsTable.id))
      .where(and(eq(userLessonAttemptsTable.userId, id), eq(userLessonAttemptsTable.status, "completed"))),

    db.select({
      id: titlesTable.id,
      name: titlesTable.name,
      category: titlesTable.category,
      points: titlesTable.points,
      earnedAt: userTitlesTable.earnedAt,
    })
      .from(userTitlesTable)
      .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
      .where(eq(userTitlesTable.userId, id)),

    competitionHistoryFor(id),
    rankOf(user),
  ]);

  // Contribution rewards a super-admin granted (bug reports, suggestions…),
  // shown on the profile as recognition.
  const gifts = await db.select({
    id: giftsTable.id,
    category: giftsTable.category,
    points: giftsTable.points,
    note: giftsTable.note,
    createdAt: giftsTable.createdAt,
  }).from(giftsTable).where(eq(giftsTable.userId, id)).orderBy(desc(giftsTable.createdAt));

  const canViewPrivate = requestingUserId === id || requestingUserRole === "admin";

  return {
    id: user.id, nickname: user.nickname, email: canViewPrivate ? user.email : "", avatarUrl: user.avatarUrl,
    points: earnsPoints(user) ? user.points : 0,
    role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked,
    openToWork: user.openToWork,
    currentStreak: user.currentStreak, longestStreak: user.longestStreak,
    createdAt: user.createdAt, rank,
    titles: userTitles.map(t => ({ id: t.id, name: t.name, category: t.category, points: t.points, earnedAt: t.earnedAt })),
    solvedCtf, completedLessons, competitionHistory,
    gifts: gifts.map(g => ({ id: g.id, category: g.category, points: g.points, note: g.note, createdAt: g.createdAt })),
  };
}

// GET /api/users/me/profile
router.get("/me/profile", authenticateToken, async (req, res) => {
  try {
    const data = await getProfileData(req.user!.userId, req.user!.userId, req.user!.role);
    if (!data) return res.status(404).json({ error: "User not found" });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Error fetching me/profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id/skills — the skill tree: per CTF category, solved vs total.
router.get("/:id/skills", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid ID" });

  const [totals, solved] = await Promise.all([
    db.select({ category: ctfTasksTable.category, total: sql<number>`count(*)::int` })
      .from(ctfTasksTable).where(eq(ctfTasksTable.isPublished, true)).groupBy(ctfTasksTable.category),
    db.select({ category: ctfTasksTable.category, solved: sql<number>`count(*)::int` })
      .from(ctfAttemptsTable)
      .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
      .where(and(eq(ctfAttemptsTable.userId, id), eq(ctfAttemptsTable.solved, true), eq(ctfTasksTable.isPublished, true)))
      .groupBy(ctfTasksTable.category),
  ]);

  const solvedByCat = new Map(solved.map(r => [r.category, r.solved]));
  const skills = totals
    .map(t => {
      const done = solvedByCat.get(t.category) ?? 0;
      return { category: t.category, solved: done, total: t.total, progress: t.total > 0 ? done / t.total : 0 };
    })
    .sort((a, b) => b.progress - a.progress || b.total - a.total);

  res.json({ skills });
});

// GET /api/users/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const data = await getProfileData(id, req.user?.userId, req.user?.role);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Error fetching user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

import { filterAllowedUpdates } from "../lib/rbac";
import { revokeAllSessions } from "../lib/sessions";
import { earnsPoints } from "../lib/scoring";

// PATCH /api/users/:id
/**
 * `requireSession`, not just `authenticateToken`.
 *
 * The role here comes from `req.user.role`, and an API token carries the role
 * of the account that minted it — so an admin's token, however narrowly scoped,
 * reached a branch of `columnPermissions.users.admin` that can write `role`,
 * `isBlocked`, `points` and `email`. One leaked token was a full takeover.
 * requirePermission already refuses API tokens for exactly this reason; this
 * route sat outside the admin router and never got the same treatment.
 *
 * The same gate is on avatar upload and account deletion below: the middleware's
 * own comment says a leaked token must not be able to take over the account it
 * came from, and deleting that account is the clearest case of it.
 */
router.patch("/:id", authenticateToken, requireSession, validateBody(UpdateUserProfileBody), async (req, res) => {
  const id = Number(req.params.id);
  const userRole = req.user!.role;

  if (req.user!.userId !== id && userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Filter updates based on RBAC
  const updates = filterAllowedUpdates(userRole, "users", req.body);

  if (updates.nickname) {
    // filterAllowedUpdates returns Record<string, unknown>, so the type proves
    // nothing here. String() would turn an object into the literal string
    // "[object Object]" and store it as someone's nickname. The validator
    // rejects that before this runs — this says so instead of depending on it
    // quietly.
    if (typeof updates.nickname !== "string") {
      return res.status(400).json({ error: "Nickname must be a string" });
    }
    const normalizedNickname = updates.nickname.trim();
    if (normalizedNickname.length < 3 || normalizedNickname.length > 32 || !/^[A-Za-z0-9_]+$/.test(normalizedNickname)) {
      return res.status(400).json({ error: "Nickname must be 3-32 chars and use only letters, numbers, or underscores" });
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.nickname, normalizedNickname)).limit(1);
    if (existing && existing.id !== id) return res.status(409).json({ error: "Nickname taken" });
    updates.nickname = normalizedNickname;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update or no permission for these fields" });

  try {
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();

    // Role and block changes are enforced per-request from the DB, but a blocked
    // account should not keep listing live sessions either.
    if (updates.isBlocked === true) await revokeAllSessions(id, "user_blocked");

    res.json({
      id: updated.id, 
      nickname: updated.nickname, 
      email: updated.email, 
      avatarUrl: updated.avatarUrl, 
      points: updated.points, 
      role: updated.role, 
      emailVerified: updated.emailVerified,
      isBlocked: updated.isBlocked,
      openToWork: updated.openToWork,
      createdAt: updated.createdAt
    });
  } catch (err) {
    logger.error({ err }, "Error updating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/me/notifications - update notification permission status
router.post("/me/notifications", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { enabled } = req.body;
    await db.update(usersTable)
      .set({ notificationsEnabled: Boolean(enabled) })
      .where(eq(usersTable.id, userId));
    res.json({ success: true, notificationsEnabled: Boolean(enabled) });
  } catch (err) {
    logger.error({ err }, "Error updating notification settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/:id/avatar
router.post("/:id/avatar", authenticateToken, requireSession, upload.single("avatar"), async (req, res) => {
  const id = Number(req.params.id);
  if (req.user!.userId !== id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = AVATAR_EXTENSIONS[req.file.mimetype] ?? ".bin";
  const uploadResult = await uploadBufferToStorage({
    folder: "avatars",
    filename: `${randomUUID()}${ext}`,
    contentType: req.file.mimetype,
    buffer: req.file.buffer,
  });
  const avatarUrl = uploadResult.publicUrl;
  const [updated] = await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, id)).returning();
  res.json({ avatarUrl: updated.avatarUrl });
});

/**
 * DELETE /api/users/:id — erase an account.
 *
 * This used to clear four tables and then delete the user, outside a
 * transaction. Thirteen other tables reference `users(id)` without a cascade,
 * so for anyone who had ever earned a certificate, solved in a competition or
 * written a writeup, the final delete raised a foreign-key violation — *after*
 * their attempts, titles and lesson progress had already been committed. The
 * caller saw "Internal server error", the account survived, and their history
 * was gone. Verified against every `references(() => usersTable.id)` in
 * lib/db/src/schema.
 *
 * Now: one transaction, every dependant handled, in dependency order. Either
 * the account is gone or nothing happened.
 */
router.delete("/:id", authenticateToken, requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (req.user!.userId !== id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Read before the transaction: afterwards there is nothing left to name.
  const [victim] = await db.select({ nickname: usersTable.nickname })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);

  await db.transaction(async tx => {
    // Competition history, then the membership rows those depend on.
    await tx.delete(competitionSolvesTable).where(eq(competitionSolvesTable.userId, id));

    // A captain cannot simply vanish: the team row requires one. Hand the team
    // to another member if there is one, otherwise dissolve it.
    const captained = await tx.select({ id: competitionTeamsTable.id })
      .from(competitionTeamsTable).where(eq(competitionTeamsTable.captainId, id));
    for (const team of captained) {
      const [heir] = await tx.select({ userId: competitionUsersTable.userId })
        .from(competitionUsersTable)
        .where(and(eq(competitionUsersTable.teamId, team.id), ne(competitionUsersTable.userId, id)))
        .limit(1);
      if (heir) {
        await tx.update(competitionTeamsTable).set({ captainId: heir.userId })
          .where(eq(competitionTeamsTable.id, team.id));
      } else {
        await tx.update(competitionUsersTable).set({ teamId: null })
          .where(eq(competitionUsersTable.teamId, team.id));
        await tx.delete(competitionTeamsTable).where(eq(competitionTeamsTable.id, team.id));
      }
    }
    await tx.delete(competitionUsersTable).where(eq(competitionUsersTable.userId, id));

    // Anything they authored or applied to as a candidate.
    await tx.delete(ctfWriteupsTable).where(eq(ctfWriteupsTable.userId, id));
    await tx.delete(jobApplicationsTable).where(eq(jobApplicationsTable.userId, id));

    // Jobs they posted as an employer, and the applications sitting on them —
    // those belong to other people, but the listing cannot outlive its owner.
    const owned = await tx.select({ id: jobsTable.id }).from(jobsTable).where(eq(jobsTable.employerId, id));
    if (owned.length > 0) {
      const jobIds = owned.map(j => j.id);
      await tx.delete(jobApplicationsTable).where(inArray(jobApplicationsTable.jobId, jobIds));
      await tx.delete(jobsTable).where(inArray(jobsTable.id, jobIds));
    }

    await tx.delete(labInstancesTable).where(eq(labInstancesTable.userId, id));

    // Learning record. Credentials go too: a certificate naming a deleted
    // person is exactly the personal data the deletion was asked for.
    await tx.delete(programDiplomasTable).where(eq(programDiplomasTable.userId, id));
    await tx.delete(certificatesTable).where(eq(certificatesTable.userId, id));
    await tx.delete(moduleExamAttemptsTable).where(eq(moduleExamAttemptsTable.userId, id));
    await tx.delete(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.userId, id));

    await tx.delete(ctfAttemptsTable).where(eq(ctfAttemptsTable.userId, id));
    await tx.delete(userTitlesTable).where(eq(userTitlesTable.userId, id));

    // The audit trail is kept — it records what staff did, not who this was —
    // but it stops naming them. The column is nullable for this.
    await tx.update(auditLogsTable).set({ actorUserId: null }).where(eq(auditLogsTable.actorUserId, id));

    // ctf_tasks.author_id and lessons.author_id are ON DELETE SET NULL, and the
    // auth tables (sessions, api tokens, passkeys, OAuth links) cascade.
    await tx.delete(usersTable).where(eq(usersTable.id, id));
  });

  // The most destructive action an admin can take was the only one that left no
  // trace: an account and its whole learning record vanished and the audit page
  // showed nothing. Self-deletion is not logged — the actor is the account that
  // just ceased to exist, and this route already strips their name from the log.
  if (req.user!.userId !== id) {
    await writeAuditLog(req, "user.delete", "user", id, { nickname: victim?.nickname ?? null });
  }

  res.json({ success: true, message: "Account deleted" });
});

export default router;
