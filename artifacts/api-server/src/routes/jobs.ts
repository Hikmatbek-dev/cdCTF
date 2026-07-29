import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { jobsTable, jobApplicationsTable, usersTable, ctfAttemptsTable } from "@workspace/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { writeAuditLog } from "../lib/audit";

const router = Router();

const EMPLOYMENT_TYPES = ["full_time", "part_time", "internship", "contract"] as const;
type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/** Trims an optional text field to a stored value, or null when empty/absent. */
function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The public shape of a job — everything a candidate needs, nothing internal. */
function publicJob(job: typeof jobsTable.$inferSelect) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description,
    location: job.location,
    employmentType: job.employmentType,
    applyUrl: job.applyUrl,
    isActive: job.isActive,
    createdAt: job.createdAt,
  };
}

// POST /api/jobs/become-employer — turn the current account into an employer.
router.post("/become-employer", authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  const companyName = cleanText(req.body?.companyName);
  const companyUrl = cleanText(req.body?.companyUrl);
  if (!companyName) return res.status(400).json({ error: "Company name is required" });
  if (companyName.length > 100) return res.status(400).json({ error: "Company name is too long" });

  const [updated] = await db.update(usersTable)
    .set({ isEmployer: true, companyName, companyUrl })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json({ isEmployer: updated.isEmployer, companyName: updated.companyName, companyUrl: updated.companyUrl });
});

// GET /api/jobs — the public board: active jobs, newest first. When signed in,
// each job carries whether the caller has already applied.
router.get("/", optionalAuth, async (req, res) => {
  const jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.isActive, true))
    .orderBy(desc(jobsTable.createdAt))
    .limit(200);

  let appliedIds = new Set<number>();
  if (req.user && jobs.length > 0) {
    const mine = await db.select({ jobId: jobApplicationsTable.jobId })
      .from(jobApplicationsTable)
      .where(and(eq(jobApplicationsTable.userId, req.user.userId), inArray(jobApplicationsTable.jobId, jobs.map(j => j.id))));
    appliedIds = new Set(mine.map(m => m.jobId));
  }
  res.json(jobs.map(j => ({ ...publicJob(j), hasApplied: appliedIds.has(j.id) })));
});

// GET /api/jobs/mine — the employer's own postings with applicant counts.
router.get("/mine", authenticateToken, async (req, res) => {
  const jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.employerId, req.user!.userId))
    .orderBy(desc(jobsTable.createdAt));

  const counts = new Map<number, number>();
  if (jobs.length > 0) {
    const rows = await db.select({ jobId: jobApplicationsTable.jobId, n: sql<number>`count(*)::int` })
      .from(jobApplicationsTable)
      .where(inArray(jobApplicationsTable.jobId, jobs.map(j => j.id)))
      .groupBy(jobApplicationsTable.jobId);
    for (const r of rows) counts.set(r.jobId, r.n);
  }
  res.json(jobs.map(j => ({ ...publicJob(j), applicationCount: counts.get(j.id) ?? 0 })));
});

// GET /api/jobs/:id — a single active job (or the owner's own inactive one).
router.get("/:id", optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
  if (!job) return res.status(404).json({ error: "Not found" });
  // A deactivated job is visible only to its owner or an admin.
  if (!job.isActive && req.user?.userId !== job.employerId && req.user?.role !== "admin") {
    return res.status(404).json({ error: "Not found" });
  }
  res.json(publicJob(job));
});

// POST /api/jobs — create a listing (employers only).
router.post("/", authenticateToken, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user?.isEmployer) return res.status(403).json({ error: "Register as an employer first" });

  const title = cleanText(req.body?.title);
  const description = cleanText(req.body?.description);
  if (!title || title.length > 120) return res.status(400).json({ error: "Title is required (max 120 chars)" });
  if (!description || description.length > 5000) return res.status(400).json({ error: "Description is required (max 5000 chars)" });

  const rawType = String(req.body?.employmentType ?? "full_time");
  const employmentType: EmploymentType = (EMPLOYMENT_TYPES as readonly string[]).includes(rawType) ? rawType as EmploymentType : "full_time";
  const applyUrl = cleanText(req.body?.applyUrl);
  if (applyUrl && !/^https?:\/\//.test(applyUrl)) return res.status(400).json({ error: "Apply link must be a URL" });

  const [job] = await db.insert(jobsTable).values({
    employerId: user.id,
    title,
    company: user.companyName ?? user.nickname,
    description,
    location: cleanText(req.body?.location),
    employmentType,
    applyUrl,
  }).returning();
  res.status(201).json(publicJob(job));
});

/** Loads a job and confirms the caller may modify it (owner or admin). */
async function loadOwnedJob(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return null; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
  if (!job) { res.status(404).json({ error: "Not found" }); return null; }
  if (job.employerId !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return null;
  }
  return job;
}

// PATCH /api/jobs/:id — edit or (de)activate a listing.
router.patch("/:id", authenticateToken, async (req, res) => {
  const job = await loadOwnedJob(req, res);
  if (!job) return;

  const updates: Partial<typeof jobsTable.$inferInsert> = { updatedAt: new Date() };
  if (req.body?.title !== undefined) {
    const title = cleanText(req.body.title);
    if (!title || title.length > 120) return res.status(400).json({ error: "Title is required (max 120 chars)" });
    updates.title = title;
  }
  if (req.body?.description !== undefined) {
    const description = cleanText(req.body.description);
    if (!description || description.length > 5000) return res.status(400).json({ error: "Description is required (max 5000 chars)" });
    updates.description = description;
  }
  if (req.body?.location !== undefined) updates.location = cleanText(req.body.location);
  if (req.body?.applyUrl !== undefined) {
    const applyUrl = cleanText(req.body.applyUrl);
    if (applyUrl && !/^https?:\/\//.test(applyUrl)) return res.status(400).json({ error: "Apply link must be a URL" });
    updates.applyUrl = applyUrl;
  }
  if (req.body?.employmentType !== undefined && (EMPLOYMENT_TYPES as readonly string[]).includes(String(req.body.employmentType))) {
    updates.employmentType = String(req.body.employmentType);
  }
  if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;

  const [updated] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, job.id)).returning();
  res.json(publicJob(updated));
});

// DELETE /api/jobs/:id — remove a listing (owner or admin), and its applications.
router.delete("/:id", authenticateToken, async (req, res) => {
  const job = await loadOwnedJob(req, res);
  if (!job) return;
  // count(*), not a full row fetch we only take .length of — the same pattern
  // GET /mine and /talent already use.
  const [{ applicantCount }] = await db
    .select({ applicantCount: sql<number>`count(*)::int` })
    .from(jobApplicationsTable).where(eq(jobApplicationsTable.jobId, job.id));
  await db.delete(jobApplicationsTable).where(eq(jobApplicationsTable.jobId, job.id));
  await db.delete(jobsTable).where(eq(jobsTable.id, job.id));
  // Deleting someone else's listing discards every application on it. An admin
  // doing that left no record; the owner doing it to their own listing does now
  // as well, because the applicants have no other trace of where they applied.
  await writeAuditLog(req, "job.delete", "job", job.id, { title: job.title, applicantCount });
  res.json({ success: true });
});

// POST /api/jobs/:id/apply — apply to an active job with your cdCTF record.
router.post("/:id/apply", authenticateToken, async (req, res) => {
  const jobId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(jobId) || jobId <= 0) return res.status(400).json({ error: "Invalid id" });

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job || !job.isActive) return res.status(404).json({ error: "Not found" });
  if (job.employerId === userId) return res.status(400).json({ error: "You cannot apply to your own posting" });

  const message = cleanText(req.body?.message);
  if (message && message.length > 2000) return res.status(400).json({ error: "Message is too long" });

  const [existing] = await db.select({ id: jobApplicationsTable.id }).from(jobApplicationsTable)
    .where(and(eq(jobApplicationsTable.jobId, jobId), eq(jobApplicationsTable.userId, userId))).limit(1);
  if (existing) return res.status(409).json({ error: "You have already applied" });

  await db.insert(jobApplicationsTable).values({ jobId, userId, message });
  res.status(201).json({ applied: true });
});

// GET /api/jobs/:id/applications — the applicants and their cdCTF record.
// Owner employer or admin only: candidates' profiles are not public here.
router.get("/:id/applications", authenticateToken, async (req, res) => {
  const jobId = Number(req.params.id);
  if (!Number.isInteger(jobId) || jobId <= 0) return res.status(400).json({ error: "Invalid id" });

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) return res.status(404).json({ error: "Not found" });
  if (job.employerId !== req.user!.userId && req.user!.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const apps = await db.select({
    userId: jobApplicationsTable.userId,
    message: jobApplicationsTable.message,
    createdAt: jobApplicationsTable.createdAt,
    nickname: usersTable.nickname,
    points: usersTable.points,
    openToWork: usersTable.openToWork,
  })
    .from(jobApplicationsTable)
    .innerJoin(usersTable, eq(jobApplicationsTable.userId, usersTable.id))
    .where(eq(jobApplicationsTable.jobId, jobId))
    .orderBy(desc(jobApplicationsTable.createdAt));

  // Each applicant's solve count — the proof that comes with the application.
  const userIds = apps.map(a => a.userId);
  const solves = new Map<number, number>();
  if (userIds.length > 0) {
    const rows = await db.select({ userId: ctfAttemptsTable.userId, n: sql<number>`count(*)::int` })
      .from(ctfAttemptsTable)
      .where(and(inArray(ctfAttemptsTable.userId, userIds), eq(ctfAttemptsTable.solved, true)))
      .groupBy(ctfAttemptsTable.userId);
    for (const r of rows) solves.set(r.userId, r.n);
  }

  res.json({
    applications: apps.map(a => ({
      userId: a.userId, nickname: a.nickname, points: a.points,
      openToWork: a.openToWork, solvedCtfCount: solves.get(a.userId) ?? 0,
      message: a.message, createdAt: a.createdAt,
    })),
  });
});

export default router;
