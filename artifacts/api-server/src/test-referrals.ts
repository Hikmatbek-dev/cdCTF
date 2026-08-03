import { db } from "@workspace/db";
import { usersTable, referralsTable, ctfAttemptsTable, ctfTasksTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ensureReferralCode, recordSignupReferral, tryActivateReferral } from "./lib/referrals";

async function main() {
    console.log("Creating test users...");
    // Create Referrer
    const [referrer] = await db.insert(usersTable).values({
        nickname: "referrer_test_" + Date.now(),
        email: "referrer_" + Date.now() + "@test.com",
        passwordHash: "dummy",
        emailVerified: true
    }).returning();
    
    // Create Referee
    const [referee] = await db.insert(usersTable).values({
        nickname: "referee_test_" + Date.now(),
        email: "referee_" + Date.now() + "@test.com",
        passwordHash: "dummy",
        emailVerified: false
    }).returning();

    // 1. Generate code for referrer
    const code = await ensureReferralCode(referrer.id);
    console.log("Referrer code generated:", code);

    // 2. Referee signs up with code
    await recordSignupReferral(referee.id, code);
    
    // Check pending status
    let [ref] = await db.select().from(referralsTable).where(eq(referralsTable.refereeId, referee.id));
    console.log("Referral status after signup:", ref?.status);

    // 3. Referee verifies email
    await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, referee.id));
    await tryActivateReferral(referee.id);
    
    [ref] = await db.select().from(referralsTable).where(eq(referralsTable.refereeId, referee.id));
    console.log("Referral status after email verification (should be pending):", ref?.status);

    // 4. Referee solves a CTF
    // Need a dummy CTF task first
    const [task] = await db.insert(ctfTasksTable).values({
        name: "Dummy Task " + Date.now(),
        category: "web",
        difficulty: "easy",
        points: 10,
        flag: "dummy",
        description: "dummy"
    }).returning();

    await db.insert(ctfAttemptsTable).values({
        userId: referee.id,
        ctfId: task.id,
        solved: true,
        solvedAt: new Date()
    });

    // Activating referral as in ctf.ts
    await tryActivateReferral(referee.id);

    [ref] = await db.select().from(referralsTable).where(eq(referralsTable.refereeId, referee.id));
    console.log("Referral status after CTF solve (should be active):", ref?.status);

    const [updatedReferrer] = await db.select().from(usersTable).where(eq(usersTable.id, referrer.id));
    console.log("Referrer free hints (should be 1):", updatedReferrer.freeHintCredits);

    process.exit(0);
}
main().catch(console.error);
