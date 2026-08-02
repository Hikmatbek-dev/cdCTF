import { db } from "@workspace/db";
import { usersTable, referralsTable, userLessonAttemptsTable, ctfAttemptsTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "./logger";

/** Active invites needed before a learner may join any competition. */
export const COMPETITION_INVITE_REQUIREMENT = 5;

/** Ambassador tiers, by activated-invite count. Derived, never stored. */
const TIERS = [
  { min: 25, key: "legend" },
  { min: 10, key: "gold" },
  { min: 5, key: "silver" },
  { min: 1, key: "bronze" },
] as const;

export function ambassadorTier(activeCount: number): string | null {
  return TIERS.find(t => activeCount >= t.min)?.key ?? null;
}

/** No 0/O/1/I/L — a code gets read aloud and typed by hand. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * This user's share code, generated on first need and kept thereafter.
 *
 * Racing two calls for the same user is fine: the second insert loses the
 * unique index and we re-read. Collisions across users are retried.
 */
export async function ensureReferralCode(userId: number): Promise<string> {
  const [row] = await db.select({ code: usersTable.referralCode })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (row?.code) return row.code;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    try {
      const [updated] = await db.update(usersTable)
        .set({ referralCode: code })
        .where(and(eq(usersTable.id, userId), sql`${usersTable.referralCode} IS NULL`))
        .returning({ code: usersTable.referralCode });
      if (updated?.code) return updated.code;
      // Someone set it between our read and write — return whatever stuck.
      const [again] = await db.select({ code: usersTable.referralCode })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (again?.code) return again.code;
    } catch (err) {
      // Unique collision on the code itself — try another.
      logger.warn({ err, userId }, "referral code collision, retrying");
    }
  }
  throw new Error("Could not allocate a referral code");
}

/**
 * Claim an invite at signup. Best-effort: a bad or self code simply records
 * nothing, because a broken invite must never block a registration.
 */
export async function recordSignupReferral(refereeId: number, code: string | null | undefined): Promise<void> {
  const trimmed = (code ?? "").trim().toUpperCase();
  if (!trimmed) return;
  try {
    const [referrer] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.referralCode, trimmed)).limit(1);
    if (!referrer || referrer.id === refereeId) return;          // unknown code, or self-invite
    await db.insert(referralsTable)
      .values({ referrerId: referrer.id, refereeId, status: "pending" })
      .onConflictDoNothing({ target: referralsTable.refereeId }); // one inviter per person
  } catch (err) {
    logger.warn({ err, refereeId }, "recordSignupReferral failed (ignored)");
  }
}

/**
 * Flip a pending invite to active once the invited learner is real —
 * email verified AND at least one lesson finished or challenge solved.
 *
 * Called from the email-verify, lesson-complete and challenge-solve paths;
 * whichever happens last is the one that activates. Idempotent, and cheap for
 * the common case (no pending row → one indexed read and return).
 */
export async function tryActivateReferral(refereeId: number): Promise<void> {
  try {
    const [ref] = await db.select().from(referralsTable)
      .where(and(eq(referralsTable.refereeId, refereeId), eq(referralsTable.status, "pending"))).limit(1);
    if (!ref) return;

    const [user] = await db.select({ verified: usersTable.emailVerified })
      .from(usersTable).where(eq(usersTable.id, refereeId)).limit(1);
    if (!user?.verified) return;

    const [{ n: lessons }] = await db.select({ n: sql<number>`count(*)::int` })
      .from(userLessonAttemptsTable)
      .where(and(eq(userLessonAttemptsTable.userId, refereeId), eq(userLessonAttemptsTable.status, "completed")));
    const [{ n: solves }] = await db.select({ n: sql<number>`count(*)::int` })
      .from(ctfAttemptsTable)
      .where(and(eq(ctfAttemptsTable.userId, refereeId), eq(ctfAttemptsTable.solved, true)));
    if (lessons + solves < 1) return;

    // Activate and pay the referrer their hint credit, in one transaction, and
    // only if the row is still pending — so two racing activations pay once.
    await db.transaction(async tx => {
      const flipped = await tx.update(referralsTable)
        .set({ status: "active", activatedAt: new Date() })
        .where(and(eq(referralsTable.id, ref.id), eq(referralsTable.status, "pending")))
        .returning({ referrerId: referralsTable.referrerId });
      if (flipped.length === 0) return;
      await tx.update(usersTable)
        .set({ freeHintCredits: sql`${usersTable.freeHintCredits} + 1` })
        .where(eq(usersTable.id, flipped[0].referrerId));
    });
  } catch (err) {
    logger.warn({ err, refereeId }, "tryActivateReferral failed (ignored)");
  }
}

/** Count of this user's activated invites — the competition-gate number. */
export async function activeReferralCount(userId: number): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` })
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.status, "active")));
  return n;
}
