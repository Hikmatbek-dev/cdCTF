import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ctfAttemptsTable, userLessonAttemptsTable, userTitlesTable, titlesTable } from "@workspace/db/schema";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { optionalAuth, requireScope } from "../middleware/auth";

const router = Router();

/**
 * The weekly league.
 *
 * Weekly standing is *derived* — summed from the solves and lesson completions
 * that carry a timestamp inside the current week — rather than kept in a column
 * that something has to remember to reset. There is no cron to miss, nothing to
 * drift, and a recalculation cannot corrupt it. The week starts Monday 00:00 UTC.
 */
const LEAGUE_TIERS = [
  { key: "bronze", min: 0 },
  { key: "silver", min: 300 },
  { key: "gold", min: 800 },
  { key: "platinum", min: 1500 },
] as const;

export function leagueFor(weeklyPoints: number): string {
  let tier = LEAGUE_TIERS[0].key as string;
  for (const t of LEAGUE_TIERS) if (weeklyPoints >= t.min) tier = t.key;
  return tier;
}

// GET /api/scoreboard/weekly — this week's standings, and the caller's place.
router.get("/weekly", optionalAuth, requireScope("scoreboard:read"), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const rows = await db.execute(sql`
    with week as (
      -- Back to timestamptz explicitly. Without the second conversion the naive
      -- timestamp is compared against timestamptz columns using the *server's*
      -- timezone, so the week boundary lands hours off UTC and this week's work
      -- falls outside it. Caught by the suite on a box set to America/Anchorage.
      select (date_trunc('week', now() at time zone 'utc') at time zone 'utc') as start
    ),
    earned as (
      select a.user_id, sum(c.points)::int as pts
        from ctf_attempts a
        join ctf_tasks c on c.id = a.ctf_id
       where a.solved = true and a.solved_at >= (select start from week)
       group by a.user_id
      union all
      select l.user_id, sum(le.points)::int as pts
        from user_lesson_attempts l
        join lessons le on le.id = l.lesson_id
       where l.status = 'completed' and l.completed_at >= (select start from week)
       group by l.user_id
    ),
    totals as (select user_id, sum(pts)::int as points from earned group by user_id)
    select u.id as "userId", u.nickname, u.avatar_url as "avatarUrl", t.points,
           rank() over (order by t.points desc, u.id asc)::int as rank
      from totals t
      join users u on u.id = t.user_id
     where u.is_blocked = false and u.role = 'user' and u.excluded_from_scoring = false
     order by t.points desc, u.id asc
  `);

  const all = (rows as unknown as { rows?: unknown[] }).rows ?? (rows as unknown as unknown[]);
  const entries = (all as Array<{ userId: number; nickname: string; avatarUrl: string | null; points: number; rank: number }>)
    .map(e => ({ ...e, points: Number(e.points), rank: Number(e.rank), league: leagueFor(Number(e.points)) }));

  const me = req.user ? entries.find(e => e.userId === req.user!.userId) ?? null : null;

  res.json({
    entries: entries.slice(0, limit),
    total: entries.length,
    me: me ?? (req.user ? { userId: req.user.userId, points: 0, rank: null, league: leagueFor(0) } : null),
  });
});

/**
 * `%` and `_` are wildcards inside LIKE. Without escaping them, a search for
 * "100%" matches everything, and a user's search string quietly becomes a
 * pattern.
 */
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

router.get("/", optionalAuth, requireScope("scoreboard:read"), async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const currentUserId = req.user?.userId;
  const offset = (page - 1) * limit;

  // Search covers nicknames only. Matching on email made this an unauthenticated
  // way to ask "is this address registered?" — the address never appears in the
  // response, but a hit answers the question.
  const nameFilter = search ? ilike(usersTable.nickname, `%${escapeLikePattern(search)}%`) : undefined;
  const filter = and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user"), nameFilter);

  /**
   * Ranks every eligible user, then filters — so a searched-for user shows the
   * rank they actually hold, not their position within the search results. The
   * `rank` field used to be `offset + index + 1`, which is only the real rank
   * when nothing is filtered, and silently disagreed with `currentUserRank`.
   *
   * `id` breaks ties so a rank is stable between requests rather than depending
   * on whatever order equal-point rows happen to come back in.
   */
  const ranked = db.$with("ranked").as(
    db.select({
      id: usersTable.id,
      nickname: usersTable.nickname,
      avatarUrl: usersTable.avatarUrl,
      points: usersTable.points,
      openToWork: usersTable.openToWork,
      rank: sql<number>`row_number() over (order by ${usersTable.points} desc, ${usersTable.id} asc)::int`.as("rank"),
    })
      .from(usersTable)
      .where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user"))),
  );

  // Ordered, limited and counted by Postgres. This used to read every matching
  // user, sort them in JavaScript and slice — so `page` and `limit` saved the
  // client nothing, and the work grew with the user table on every request.
  // The users(role, is_blocked, points) index serves the filter and the sort.
  const [rows, [{ total }]] = await Promise.all([
    db.with(ranked)
      .select()
      .from(ranked)
      .where(search ? ilike(ranked.nickname, `%${escapeLikePattern(search)}%`) : undefined)
      .orderBy(asc(ranked.rank))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(usersTable).where(filter),
  ]);

  const userIds = rows.map(row => row.id);

  // Counted per user in SQL, and only for the users on this page. Previously
  // every solve, every completed lesson and every title in the database was
  // loaded and tallied in memory to fill in one page of 25.
  const [solveCounts, lessonCounts, titles] = userIds.length === 0
    ? [[], [], []]
    : await Promise.all([
      db.select({ userId: ctfAttemptsTable.userId, count: sql<number>`count(*)::int` })
        .from(ctfAttemptsTable)
        .where(and(inArray(ctfAttemptsTable.userId, userIds), eq(ctfAttemptsTable.solved, true)))
        .groupBy(ctfAttemptsTable.userId),
      db.select({ userId: userLessonAttemptsTable.userId, count: sql<number>`count(*)::int` })
        .from(userLessonAttemptsTable)
        .where(and(inArray(userLessonAttemptsTable.userId, userIds), eq(userLessonAttemptsTable.status, "completed")))
        .groupBy(userLessonAttemptsTable.userId),
      db.select({ userId: userTitlesTable.userId, titleName: titlesTable.name })
        .from(userTitlesTable)
        .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
        .where(inArray(userTitlesTable.userId, userIds)),
    ]);

  const solvesByUser = new Map(solveCounts.map(row => [row.userId, row.count]));
  const lessonsByUser = new Map(lessonCounts.map(row => [row.userId, row.count]));
  const titlesByUser = new Map<number, string[]>();
  for (const title of titles) {
    const list = titlesByUser.get(title.userId) ?? [];
    list.push(title.titleName);
    titlesByUser.set(title.userId, list);
  }

  const entries = rows.map(row => ({
    rank: row.rank,
    userId: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    points: row.points,
    openToWork: row.openToWork,
    solvedCtfCount: solvesByUser.get(row.id) ?? 0,
    completedLessonsCount: lessonsByUser.get(row.id) ?? 0,
    titles: titlesByUser.get(row.id) ?? [],
  }));

  let currentUserRank: number | undefined;
  if (currentUserId) {
    const [me] = await db.select({ points: usersTable.points, id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.id, currentUserId), eq(usersTable.isBlocked, false), eq(usersTable.role, "user")))
      .limit(1);

    if (me) {
      // Counts who is ahead rather than sorting everyone. The tiebreak matches
      // the ORDER BY above, so this agrees with the rank shown in the list.
      const [{ ahead }] = await db.select({ ahead: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(and(
          eq(usersTable.isBlocked, false),
          eq(usersTable.role, "user"),
          or(
            sql`${usersTable.points} > ${me.points}`,
            and(eq(usersTable.points, me.points), sql`${usersTable.id} < ${me.id}`),
          ),
        ));
      currentUserRank = ahead + 1;
    }
  }

  res.json({
    entries,
    total,
    currentUserRank,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
