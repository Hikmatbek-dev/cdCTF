import { db } from "@workspace/db";
import { userSessionsTable, loginHistoryTable } from "@workspace/db/schema";
import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { logger } from "./logger";

// How stale `lastSeenAt` may get before a request bothers to refresh it. Without
// this every authenticated request would issue a write.
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;

const FAILED_LOGIN_LOOKBACK_MS = 15 * 60 * 1000;
const FAILED_LOGIN_SUSPICIOUS_THRESHOLD = 3;

export type LoginFailureReason =
  | "unknown_user"
  | "bad_password"
  | "blocked"
  | "email_unverified";

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
  [/curl\//, "curl"],
];

const PLATFORMS: Array<[RegExp, string]> = [
  [/Windows NT/, "Windows"],
  [/iPhone|iPad/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

function matchFirst(candidates: Array<[RegExp, string]>, value: string) {
  for (const [pattern, label] of candidates) {
    if (pattern.test(value)) return label;
  }
  return null;
}

/** "Chrome on Windows" — a stable, human-readable device name for the sessions UI. */
export function parseDeviceLabel(userAgent: string | undefined) {
  if (!userAgent) return "Unknown device";
  const browser = matchFirst(BROWSERS, userAgent);
  const platform = matchFirst(PLATFORMS, userAgent);
  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? "Unknown device";
}

export async function createSession(input: {
  userId: number;
  tokenId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string;
  expiresAt: Date;
}) {
  const [session] = await db.insert(userSessionsTable).values(input).returning();
  return session;
}

/**
 * Loads a live session by its `jti`. Returns null when the token is unknown,
 * revoked, or past its expiry — the three cases that must fail authentication.
 */
export async function findActiveSession(tokenId: string) {
  const [session] = await db.select().from(userSessionsTable)
    .where(and(
      eq(userSessionsTable.tokenId, tokenId),
      isNull(userSessionsTable.revokedAt),
      gt(userSessionsTable.expiresAt, new Date()),
    ))
    .limit(1);
  return session ?? null;
}

export async function touchSession(session: { id: number; lastSeenAt: Date }) {
  if (Date.now() - session.lastSeenAt.getTime() < LAST_SEEN_REFRESH_MS) return;
  try {
    await db.update(userSessionsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(userSessionsTable.id, session.id));
  } catch (err) {
    // A failed heartbeat must never reject an otherwise valid request.
    logger.warn({ err, sessionId: session.id }, "Failed to refresh session lastSeenAt");
  }
}

export async function revokeSessionByTokenId(tokenId: string, reason: string) {
  await db.update(userSessionsTable)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(userSessionsTable.tokenId, tokenId), isNull(userSessionsTable.revokedAt)));
}

export async function revokeSessionById(id: number, userId: number, reason: string) {
  const result = await db.update(userSessionsTable)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(
      eq(userSessionsTable.id, id),
      eq(userSessionsTable.userId, userId),
      isNull(userSessionsTable.revokedAt),
    ))
    .returning();
  return result.length > 0;
}

/**
 * Kills every live session for a user. `exceptTokenId` keeps the caller's own
 * session alive — used by "sign out everywhere else" and password changes.
 */
export async function revokeAllSessions(userId: number, reason: string, exceptTokenId?: string) {
  const conditions = [
    eq(userSessionsTable.userId, userId),
    isNull(userSessionsTable.revokedAt),
  ];
  if (exceptTokenId) conditions.push(ne(userSessionsTable.tokenId, exceptTokenId));

  const revoked = await db.update(userSessionsTable)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(...conditions))
    .returning({ id: userSessionsTable.id });
  return revoked.length;
}

export async function listSessions(userId: number) {
  return db.select().from(userSessionsTable)
    .where(and(
      eq(userSessionsTable.userId, userId),
      isNull(userSessionsTable.revokedAt),
      gt(userSessionsTable.expiresAt, new Date()),
    ))
    .orderBy(desc(userSessionsTable.lastSeenAt));
}

export async function listLoginHistory(userId: number, limit: number) {
  return db.select().from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, userId))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(limit);
}

/**
 * Flags a successful login that does not look like the user's usual pattern.
 * Deliberately quiet for a user's very first login, when everything is new by
 * definition and flagging would be noise.
 */
export async function suspiciousLoginReasons(input: {
  userId: number;
  ipAddress: string | null;
  deviceLabel: string;
}) {
  const [{ count: priorSuccesses }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(loginHistoryTable)
    .where(and(eq(loginHistoryTable.userId, input.userId), eq(loginHistoryTable.success, true)));

  if (priorSuccesses === 0) return [];

  const reasons: string[] = [];

  if (input.ipAddress) {
    const [seenIp] = await db.select({ id: loginHistoryTable.id })
      .from(loginHistoryTable)
      .where(and(
        eq(loginHistoryTable.userId, input.userId),
        eq(loginHistoryTable.success, true),
        eq(loginHistoryTable.ipAddress, input.ipAddress),
      ))
      .limit(1);
    if (!seenIp) reasons.push("new_ip");
  }

  const [seenDevice] = await db.select({ id: loginHistoryTable.id })
    .from(loginHistoryTable)
    .where(and(
      eq(loginHistoryTable.userId, input.userId),
      eq(loginHistoryTable.success, true),
      eq(loginHistoryTable.deviceLabel, input.deviceLabel),
    ))
    .limit(1);
  if (!seenDevice) reasons.push("new_device");

  const since = new Date(Date.now() - FAILED_LOGIN_LOOKBACK_MS);
  const [{ count: recentFailures }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(loginHistoryTable)
    .where(and(
      eq(loginHistoryTable.userId, input.userId),
      eq(loginHistoryTable.success, false),
      gt(loginHistoryTable.createdAt, since),
    ));
  if (recentFailures >= FAILED_LOGIN_SUSPICIOUS_THRESHOLD) reasons.push("recent_failed_attempts");

  return reasons;
}

export async function recordLoginAttempt(input: {
  userId: number | null;
  identifier: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string;
  success: boolean;
  failureReason?: LoginFailureReason;
  suspiciousReasons?: string[];
}) {
  try {
    await db.insert(loginHistoryTable).values({
      userId: input.userId,
      identifier: input.identifier,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceLabel: input.deviceLabel,
      success: input.success,
      failureReason: input.failureReason ?? null,
      suspicious: (input.suspiciousReasons?.length ?? 0) > 0,
      suspiciousReasons: input.suspiciousReasons?.length ? input.suspiciousReasons.join(",") : null,
    });
  } catch (err) {
    // Audit-style writes must never break the login itself.
    logger.warn({ err, userId: input.userId }, "Failed to record login attempt");
  }
}
