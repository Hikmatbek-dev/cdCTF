import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { labsTable, labInstancesTable } from "@workspace/db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { labsEnabled, startContainer, stopContainer } from "../lib/lab-runner";
import { createRateLimiter } from "../middleware/security";
import { logger } from "../lib/logger";
import { scenarioFor } from "@workspace/lab-scenarios";

const router = Router();

/** Starting a machine costs real CPU on someone's host — rate limit it. */
const startLimit = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: "lab-start", store: "shared" });

function publicLab(lab: typeof labsTable.$inferSelect) {
  return {
    id: lab.id, slug: lab.slug,
    name: lab.name, nameUz: lab.nameUz, nameRu: lab.nameRu,
    description: lab.description, descriptionUz: lab.descriptionUz, descriptionRu: lab.descriptionRu,
    difficulty: lab.difficulty, ttlMinutes: lab.ttlMinutes, ctfId: lab.ctfId,
    kind: lab.kind, browserScenario: lab.browserScenario,
    // A container lab is only startable once a runner exists; a browser lab
    // always is. Saying so per lab beats one page-wide "not available".
    startable: lab.kind === "browser" || labsEnabled(),
  };
}

/**
 * GET /api/labs/target/:slug — the vulnerable document itself.
 *
 * It used to be rendered client-side into an iframe's `srcdoc`, and that is
 * exactly why the labs did not work in production: a srcdoc document inherits
 * its parent's Content-Security-Policy, cdCTF's policy has no 'unsafe-inline'
 * in script-src, and every one of these documents *is* an inline script. The
 * labs rendered as static pages with no behaviour at all. Verified: under the
 * production policy the inner script never runs; with the header removed, or
 * with 'unsafe-inline' added, it does.
 *
 * Serving it from here gives the document a policy of its own:
 *
 *   sandbox allow-scripts allow-forms
 *     Puts it in an opaque origin. It cannot read cdCTF's cookies, storage or
 *     DOM even though it is served from the same host — the same isolation the
 *     iframe's sandbox attribute gave, now enforced by the server so it also
 *     holds when the page is opened in its own tab.
 *   script-src / style-src 'unsafe-inline'
 *     The lab is a deliberately vulnerable inline script. That is the content.
 *   default-src 'none'
 *     It has no business talking to anything.
 *
 * Unauthenticated on purpose: the documents ship in every learner's browser
 * anyway, contain no secret beyond a flag that is checked server-side, and
 * gating them would break opening the target in a new tab.
 */
router.get("/target/:slug", (req, res) => {
  const scenario = scenarioFor(req.params.slug);
  if (!scenario) return res.status(404).type("text/plain").send("Bunday laboratoriya yo'q");

  res.setHeader("Content-Security-Policy", [
    "sandbox allow-scripts allow-forms",
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data:",
    // Our own labs page frames this; nobody else's should.
    "frame-ancestors 'self'",
  ].join("; "));
  // A target that is cached is a target that ignores "Reset".
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.type("text/html").send(scenario.html);
});

/**
 * A browser lab has no container, but it still gets an instance row so that the
 * one-at-a-time rule, the TTL and the history all work exactly as they do for a
 * real machine. The synthetic id is prefixed so nothing ever hands it to Docker.
 */
const BROWSER_PREFIX = "browser:";
const isBrowserInstance = (containerId: string) => containerId.startsWith(BROWSER_PREFIX);

/**
 * Expires instances whose time is up.
 *
 * There is no scheduler on this plan, so reaping happens here — every list and
 * every start sweeps first. The runner also enforces its own TTL, so a missed
 * sweep costs bookkeeping accuracy, never a container that runs forever.
 */
async function reapExpired(): Promise<void> {
  const stale = await db.select().from(labInstancesTable)
    .where(and(eq(labInstancesTable.status, "running"), lt(labInstancesTable.expiresAt, new Date())));
  // In parallel, and tolerant of one runner call failing.
  //
  // This was a serial loop with a network call in it, on GET /api/labs — so if
  // twenty machines had expired since the last request, the next learner to open
  // the catalogue waited for twenty sequential HTTP calls to the runner before
  // seeing anything. allSettled because a container that is already gone must
  // not stop the rest from being marked stopped.
  await Promise.allSettled(stale.map(async instance => {
    if (!isBrowserInstance(instance.containerId)) await stopContainer(instance.containerId);
    await db.update(labInstancesTable)
      .set({ status: "stopped", stoppedAt: new Date() })
      .where(eq(labInstancesTable.id, instance.id));
  }));
  if (stale.length > 0) logger.info({ count: stale.length }, "reaped expired lab instances");
}

// GET /api/labs — the catalogue, plus the caller's running machine if any.
router.get("/", optionalAuth, async (req, res) => {
  await reapExpired();

  const labs = await db.select().from(labsTable)
    .where(eq(labsTable.isPublished, true))
    .orderBy(labsTable.id);

  let running = null;
  if (req.user) {
    const [instance] = await db.select().from(labInstancesTable)
      .where(and(eq(labInstancesTable.userId, req.user.userId), eq(labInstancesTable.status, "running")))
      .limit(1);
    if (instance) {
      running = {
        id: instance.id, labId: instance.labId,
        host: instance.host, port: instance.port,
        startedAt: instance.startedAt, expiresAt: instance.expiresAt,
      };
    }
  }

  // "available" now means "there is at least one lab you can actually start",
  // which is true the moment a browser lab is published — the container runner
  // is no longer the only path.
  const available = labsEnabled() || labs.some(lab => lab.kind === "browser");
  res.json({ labs: labs.map(publicLab), running, available });
});

// POST /api/labs/:id/start — bring up this learner's own copy.
router.post("/:id/start", authenticateToken, startLimit, async (req, res) => {
  const labId = Number(req.params.id);
  const userId = req.user!.userId;
  if (!Number.isInteger(labId) || labId <= 0) return res.status(400).json({ error: "Invalid lab id" });

  await reapExpired();

  const [lab] = await db.select().from(labsTable)
    .where(and(eq(labsTable.id, labId), eq(labsTable.isPublished, true))).limit(1);
  if (!lab) return res.status(404).json({ error: "Not found" });

  // Checked per lab, not per page: a browser lab needs no runner.
  if (lab.kind !== "browser" && !labsEnabled()) {
    return res.status(503).json({ error: "Labs are not available yet" });
  }

  // One machine at a time. Tell them which one rather than silently refusing.
  const [existing] = await db.select().from(labInstancesTable)
    .where(and(eq(labInstancesTable.userId, userId), eq(labInstancesTable.status, "running"))).limit(1);
  if (existing) {
    return res.status(409).json({
      error: "You already have a machine running. Stop it before starting another.",
      running: { id: existing.id, labId: existing.labId, host: existing.host, port: existing.port, expiresAt: existing.expiresAt },
    });
  }

  let started;
  if (lab.kind === "browser") {
    // Nothing to boot. The scenario is rendered by the client; this row only
    // records that the learner has one open.
    started = { containerId: `${BROWSER_PREFIX}${randomUUID()}`, host: "browser", port: 0 };
  } else {
    try {
      started = await startContainer(lab.image, lab.containerPort, lab.ttlMinutes);
    } catch (err) {
      logger.error({ err, labId }, "lab runner failed to start a container");
      return res.status(502).json({ error: "Could not start the machine. Try again in a moment." });
    }
  }

  const expiresAt = new Date(Date.now() + lab.ttlMinutes * 60_000);
  try {
    const [instance] = await db.insert(labInstancesTable).values({
      labId: lab.id, userId, containerId: started.containerId,
      host: started.host, port: started.port, expiresAt,
    }).returning();

    res.status(201).json({
      id: instance.id, labId: lab.id, kind: lab.kind,
      browserScenario: lab.browserScenario,
      host: instance.host, port: instance.port,
      startedAt: instance.startedAt, expiresAt: instance.expiresAt,
    });
  } catch (err) {
    // The unique index rejected a second concurrent start. The container we just
    // created has no row pointing at it, so stop it rather than leak it.
    if (!isBrowserInstance(started.containerId)) await stopContainer(started.containerId);
    logger.warn({ err, userId }, "concurrent lab start rejected; container released");
    return res.status(409).json({ error: "You already have a machine running." });
  }
});

// POST /api/labs/instances/:id/stop — give the machine back.
router.post("/instances/:id/stop", authenticateToken, async (req, res) => {
  const instanceId = Number(req.params.id);
  if (!Number.isInteger(instanceId) || instanceId <= 0) return res.status(400).json({ error: "Invalid id" });

  const [instance] = await db.select().from(labInstancesTable)
    .where(eq(labInstancesTable.id, instanceId)).limit(1);
  if (!instance) return res.status(404).json({ error: "Not found" });
  if (instance.userId !== req.user!.userId && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (instance.status !== "running") return res.json({ stopped: true });

  if (!isBrowserInstance(instance.containerId)) await stopContainer(instance.containerId);
  await db.update(labInstancesTable)
    .set({ status: "stopped", stoppedAt: new Date() })
    .where(eq(labInstancesTable.id, instance.id));

  res.json({ stopped: true });
});

// GET /api/labs/instances/mine — this learner's recent machines.
router.get("/instances/mine", authenticateToken, async (req, res) => {
  const rows = await db.select().from(labInstancesTable)
    .where(eq(labInstancesTable.userId, req.user!.userId))
    .orderBy(desc(labInstancesTable.startedAt))
    .limit(20);
  res.json({
    instances: rows.map(i => ({
      id: i.id, labId: i.labId, status: i.status,
      host: i.host, port: i.port, startedAt: i.startedAt, expiresAt: i.expiresAt, stoppedAt: i.stoppedAt,
    })),
  });
});

export default router;
