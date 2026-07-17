import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { db } from "@workspace/db";
import {
  usersTable, ctfAttemptsTable, ctfTasksTable, userLessonAttemptsTable,
  lessonsTable, competitionUsersTable, competitionsTable, competitionSolvesTable,
  userTitlesTable, titlesTable,
} from "@workspace/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { uploadBufferToStorage } from "../lib/storage";
import { logger } from "../lib/logger";

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
    db.select().from(ctfAttemptsTable).where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.solved, true))),
    db.select().from(userLessonAttemptsTable).where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed"))),
    db.select({ id: titlesTable.id, name: titlesTable.name, category: titlesTable.category, earnedAt: userTitlesTable.earnedAt })
      .from(userTitlesTable)
      .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
      .where(eq(userTitlesTable.userId, userId)),
    // Was: load every non-blocked user, sort in JS, find the index.
    rankOf(user),
  ]);

  res.json({
    user: { id: user.id, nickname: user.nickname, points: earnsPoints(user) ? user.points : 0, rank },
    progress: {
      solvedCtfCount: solvedCtf.length,
      completedLessonCount: completedLessons.length,
      titleCount: titles.length,
    },
    recent: {
      solvedCtf: solvedCtf.slice(-5).reverse().map(item => ({ ctfId: item.ctfId, solvedAt: item.solvedAt })),
      completedLessons: completedLessons.slice(-5).reverse().map(item => ({ lessonId: item.lessonId, completedAt: item.completedAt })),
    },
    titles: titles.map(item => ({ id: item.id, name: item.name, category: item.category, earnedAt: item.earnedAt })),
  });
});

/** Counts who is ahead instead of loading and sorting the whole user table. */
async function rankOf(user: { id: number; role: string; points: number; excludedFromScoring: boolean }) {
  if (!earnsPoints(user)) return 0;

  const [{ ahead }] = await db.select({ ahead: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(
      eq(usersTable.isBlocked, false),
      eq(usersTable.role, "user"),
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

  const canViewPrivate = requestingUserId === id || requestingUserRole === "admin";

  return {
    id: user.id, nickname: user.nickname, email: canViewPrivate ? user.email : "", avatarUrl: user.avatarUrl,
    points: earnsPoints(user) ? user.points : 0,
    role: user.role, emailVerified: user.emailVerified, isBlocked: user.isBlocked,
    createdAt: user.createdAt, rank,
    titles: userTitles.map(t => ({ id: t.id, name: t.name, category: t.category, points: t.points, earnedAt: t.earnedAt })),
    solvedCtf, completedLessons, competitionHistory,
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
router.patch("/:id", authenticateToken, validateBody(UpdateUserProfileBody), async (req, res) => {
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
      createdAt: updated.createdAt 
    });
  } catch (err) {
    logger.error({ err }, "Error updating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/:id/avatar
router.post("/:id/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
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

// DELETE /api/users/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (req.user!.userId !== id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Cleanup
  await db.delete(ctfAttemptsTable).where(eq(ctfAttemptsTable.userId, id));
  await db.delete(userLessonAttemptsTable).where(eq(userLessonAttemptsTable.userId, id));
  await db.delete(userTitlesTable).where(eq(userTitlesTable.userId, id));
  await db.delete(competitionUsersTable).where(eq(competitionUsersTable.userId, id));
  
  await db.delete(usersTable).where(eq(usersTable.id, id));

  res.json({ success: true, message: "Account deleted" });
});

export default router;
