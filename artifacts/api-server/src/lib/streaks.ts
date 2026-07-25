import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";

/**
 * Daily activity streaks — the "come back tomorrow" hook.
 *
 * A streak counts consecutive UTC days on which the user did something that
 * counts (solved a challenge, finished a lesson). We key off a 'YYYY-MM-DD' UTC
 * string rather than a timestamp so the comparison is a plain equality and the
 * result does not drift with the time of day.
 */

type Executor = Parameters<Parameters<typeof import("@workspace/db").db.transaction>[0]>[0];

/** The UTC calendar day for a moment, as 'YYYY-MM-DD'. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The UTC day exactly one calendar day before `day`. */
function previousUtcDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDay(d);
}

/**
 * Records activity for `userId` and returns the resulting streak.
 *
 * Idempotent within a day: the first activity of a UTC day advances the streak
 * (or resets it to 1 after a gap); later activity the same day changes nothing.
 * Must run inside the caller's transaction so the read-modify-write is atomic
 * against two concurrent solves.
 */
export async function touchStreak(tx: Executor, userId: number, now: Date): Promise<{ current: number; longest: number }> {
  const today = utcDay(now);

  const [user] = await tx.select({
    current: usersTable.currentStreak,
    longest: usersTable.longestStreak,
    last: usersTable.lastActivityDate,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).for("update");

  if (!user) return { current: 0, longest: 0 };
  if (user.last === today) return { current: user.current, longest: user.longest };

  const current = user.last === previousUtcDay(today) ? user.current + 1 : 1;
  const longest = Math.max(user.longest, current);

  await tx.update(usersTable)
    .set({ currentStreak: current, longestStreak: longest, lastActivityDate: today })
    .where(eq(usersTable.id, userId));

  return { current, longest };
}
