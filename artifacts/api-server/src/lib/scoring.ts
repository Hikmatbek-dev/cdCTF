import { db } from "@workspace/db";
import {
  usersTable,
  ctfTasksTable,
  ctfAttemptsTable,
  lessonsTable,
  userLessonAttemptsTable,
  titlesTable,
  userTitlesTable,
  giftsTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

/** Category solves needed before its title is awarded. */
export const TITLE_SOLVE_THRESHOLD = 3;

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

type ScoringUser = { role: string; excludedFromScoring: boolean; adminEarnsPoints: boolean };

/**
 * Whether a user's solves count toward their score.
 *
 * Admins are unscored by default so staff testing content does not top the
 * board — but a super-admin can grant a specific admin `adminEarnsPoints`, and
 * then that admin competes for real. `excludedFromScoring` still hides anyone
 * (admin or not) who should never appear, and always wins. This was previously
 * `role !== "admin" && nickname !== "bozkurtshadow"`, copied into six files — so
 * a rename would have silently started paying that account.
 */
export function earnsPoints(user: ScoringUser): boolean {
  if (user.excludedFromScoring) return false;
  if (user.role === "admin") return user.adminEarnsPoints;
  return true;
}

async function loadScoringUser(tx: Executor, userId: number): Promise<ScoringUser | null> {
  const [user] = await tx.select({
    role: usersTable.role,
    excludedFromScoring: usersTable.excludedFromScoring,
    adminEarnsPoints: usersTable.adminEarnsPoints,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user ?? null;
}

/**
 * Adds points, unless this user does not earn them. The single place that
 * decides — callers no longer each repeat the rule.
 */
export async function awardPoints(tx: Executor, userId: number, points: number): Promise<number> {
  if (points === 0) return 0;
  const user = await loadScoringUser(tx, userId);
  if (!user || !earnsPoints(user)) return 0;

  await tx.update(usersTable)
    .set({ points: sql`${usersTable.points} + ${points}` })
    .where(eq(usersTable.id, userId));
  return points;
}

/**
 * Awards the title for a category once the user has enough solves in it.
 * Returns the points granted, or 0 if there was nothing to grant.
 */
export async function awardCategoryTitle(tx: Executor, userId: number, category: string): Promise<number> {
  const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
    .from(ctfAttemptsTable)
    .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
    .where(and(
      eq(ctfAttemptsTable.userId, userId),
      eq(ctfAttemptsTable.solved, true),
      eq(ctfTasksTable.category, category),
    ));

  if (count < TITLE_SOLVE_THRESHOLD) return 0;

  const [title] = await tx.select().from(titlesTable).where(eq(titlesTable.category, category)).limit(1);
  if (!title) return 0;

  const [already] = await tx.select({ id: userTitlesTable.id }).from(userTitlesTable)
    .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, title.id)))
    .limit(1);
  if (already) return 0;

  await tx.insert(userTitlesTable).values({ userId, titleId: title.id });
  return awardPoints(tx, userId, title.points);
}

/**
 * Recomputes one user's score from scratch: CTF solves + completed lessons +
 * titles, with titles rebuilt from the current solves.
 *
 * This existed twice, ~40 lines each — and the copy inside DELETE /admin/ctf/:id
 * had lost the rule that excluded accounts score zero, so deleting a challenge
 * gave every admin a non-zero score. One copy, one rule.
 */
export async function recalculateUserPoints(tx: Executor, userId: number): Promise<number> {
  const user = await loadScoringUser(tx, userId);
  if (!user) return 0;

  const solves = await tx.select({ points: ctfTasksTable.points, category: ctfTasksTable.category })
    .from(ctfAttemptsTable)
    .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
    .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.solved, true)));

  const lessons = await tx.select({ points: lessonsTable.points })
    .from(userLessonAttemptsTable)
    .innerJoin(lessonsTable, eq(userLessonAttemptsTable.lessonId, lessonsTable.id))
    .where(and(eq(userLessonAttemptsTable.userId, userId), eq(userLessonAttemptsTable.status, "completed")));

  const allTitles = await tx.select().from(titlesTable);

  // Titles are derived state: rebuild rather than reconcile.
  await tx.delete(userTitlesTable).where(eq(userTitlesTable.userId, userId));

  const solvesPerCategory = new Map<string, number>();
  for (const solve of solves) {
    solvesPerCategory.set(solve.category, (solvesPerCategory.get(solve.category) ?? 0) + 1);
  }

  let titlePoints = 0;
  for (const [category, count] of solvesPerCategory) {
    if (count < TITLE_SOLVE_THRESHOLD) continue;
    const title = allTitles.find(item => item.category === category);
    if (!title) continue;
    await tx.insert(userTitlesTable).values({ userId, titleId: title.id });
    titlePoints += title.points;
  }

  // Hints are bought with points, so the charge has to be part of the formula —
  // not a one-off subtraction from users.points. Otherwise the next
  // recalculation (a challenge edit, an admin repair) silently refunds every
  // hint the user ever revealed.
  const hints = await tx.select({ cost: ctfTasksTable.hintCost })
    .from(ctfAttemptsTable)
    .innerJoin(ctfTasksTable, eq(ctfAttemptsTable.ctfId, ctfTasksTable.id))
    .where(and(eq(ctfAttemptsTable.userId, userId), eq(ctfAttemptsTable.hintUsed, true)));
  const hintPenalty = hints.reduce((sum, hint) => sum + hint.cost, 0);

  // Gift points — a super-admin's reward for helping (bug reports, suggestions…).
  // Summed here so a recalculation folds them back in rather than wiping them.
  const [{ giftPoints }] = await tx.select({ giftPoints: sql<number>`coalesce(sum(${giftsTable.points}), 0)::int` })
    .from(giftsTable).where(eq(giftsTable.userId, userId));

  const ctfPoints = solves.reduce((sum, solve) => sum + solve.points, 0);
  const lessonPoints = lessons.reduce((sum, lesson) => sum + lesson.points, 0);
  const total = earnsPoints(user)
    ? Math.max(0, ctfPoints + lessonPoints + titlePoints + giftPoints - hintPenalty)
    : 0;

  await tx.update(usersTable).set({ points: total }).where(eq(usersTable.id, userId));
  return total;
}

/**
 * How many recalculations run at once.
 *
 * Each one is its own transaction — they have to be, because recalculating also
 * *inserts* earned titles, so a shared transaction would make one bad row roll
 * back everyone. But running them strictly one after another meant
 * `POST /admin/users/recalculate-points` was one transaction per account, each
 * about seven queries: at a hundred thousand users that is far past any function
 * timeout, and `DELETE /admin/ctf/:id` runs the same loop inline over everyone
 * who solved that challenge.
 *
 * Five keeps well inside the connection pool while cutting the wall clock by
 * most of an order of magnitude.
 */
const RECALC_CONCURRENCY = 5;

export async function recalculateUsers(userIds: number[]): Promise<number> {
  for (let i = 0; i < userIds.length; i += RECALC_CONCURRENCY) {
    const batch = userIds.slice(i, i + RECALC_CONCURRENCY);
    await Promise.all(batch.map(userId => db.transaction(tx => recalculateUserPoints(tx, userId))));
  }
  return userIds.length;
}

export async function recalculateAllUsers(): Promise<number> {
  const users = await db.select({ id: usersTable.id }).from(usersTable);
  return recalculateUsers(users.map(user => user.id));
}
