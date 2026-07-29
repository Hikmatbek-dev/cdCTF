import { Router, text } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { labsTable, labInstancesTable } from "@workspace/db/schema";
import { and, desc, eq, gt, lt, or } from "drizzle-orm";
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
 * A browser lab has no container, but it still gets an instance row so that the
 * one-at-a-time rule, the TTL and the history all work exactly as they do for a
 * real machine. The synthetic id is prefixed so nothing ever hands it to Docker.
 *
 * The random half of that id doubles as the instance's access token. It is
 * generated per start, stored only here, and handed to nobody but the learner
 * who started the lab — so it is exactly the credential the target route was
 * missing, without a schema change to carry it.
 */
const BROWSER_PREFIX = "browser:";
const isBrowserInstance = (containerId: string) => containerId.startsWith(BROWSER_PREFIX);
const tokenOf = (containerId: string) =>
  isBrowserInstance(containerId) ? containerId.slice(BROWSER_PREFIX.length) : null;

/** Where a learner sends their browser to reach their own running target. */
function targetPathFor(slug: string, token: string) {
  return `/api/labs/target/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

/**
 * The instance this token belongs to, if it is running and still has time.
 *
 * This is the whole of the access check. Stopping a lab flips `status`, the TTL
 * moves `expiresAt` into the past, and either one makes the token stop working
 * on the next request — which is what "Stop" always claimed to do and never did.
 */
async function liveInstanceFor(token: string) {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ instance: labInstancesTable, lab: labsTable })
    .from(labInstancesTable)
    .innerJoin(labsTable, eq(labInstancesTable.labId, labsTable.id))
    .where(and(
      eq(labInstancesTable.containerId, `${BROWSER_PREFIX}${token}`),
      eq(labInstancesTable.status, "running"),
      gt(labInstancesTable.expiresAt, new Date()),
    ))
    .limit(1);
  return row ?? null;
}

/** Shown instead of a target when the token is missing, wrong, stopped or expired. */
const NOT_RUNNING_PAGE = `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<title>Laboratoriya ishlamayapti</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:-apple-system,"Segoe UI",Roboto,sans-serif; background:#f4f5f7; color:#1b1f27; padding:24px; }
  .box { max-width:420px; background:#fff; border-radius:10px; padding:28px; text-align:center;
         box-shadow:0 1px 3px rgba(0,0,0,.12); }
  h1 { font-size:18px; margin:0 0 10px; }
  p { font-size:14px; line-height:1.6; color:#5b6472; margin:0 0 6px; }
</style></head><body>
<div class="box">
  <h1>Bu laboratoriya ishlamayapti</h1>
  <p>Nishon faqat siz uni ishga tushirgan vaqt davomida ochiq bo'ladi. cdCTF'dagi <b>Laboratoriya</b> sahifasidan qaytadan boshlang.</p>
  <p>The target is only served while you have this lab running. Start it again from the Labs page.</p>
  <p>Цель доступна только пока лаборатория запущена. Запустите её заново на странице «Лаборатории».</p>
</div>
</body></html>`;

/**
 * GET /api/labs/target/:slug?t=… — the vulnerable document itself.
 *
 * It used to be rendered client-side into an iframe's `srcdoc`, and that is
 * exactly why the labs did not work in production: a srcdoc document inherits
 * its parent's Content-Security-Policy, cdCTF's policy has no 'unsafe-inline'
 * in script-src, and every one of these documents *is* an inline script. The
 * labs rendered as static pages with no behaviour at all.
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
 *   connect-src <this origin>
 *     The one thing it may talk to: the solve endpoint that holds its flag.
 *     Spelled absolutely, because 'self' inside an opaque origin means nothing.
 *   default-src 'none' / frame-ancestors 'none'
 *     Everything else, denied. 'none' rather than 'self' so this agrees with the
 *     X-Frame-Options: DENY that securityHeaders sets on every response — the
 *     two used to contradict each other, and the target opens in a tab anyway.
 *
 * It was unauthenticated, with a comment saying so on purpose. That was the
 * hole: anyone could curl it, and pressing "Stop" changed nothing about who
 * could. Now it takes the instance token and refuses everything else.
 */
router.get("/target/:slug", async (req, res) => {
  const token = typeof req.query.t === "string" ? req.query.t : "";
  const live = await liveInstanceFor(token);

  // Also checks that this token belongs to *this* scenario: one running lab
  // must not open the target of another.
  if (!live || live.lab.browserScenario !== req.params.slug) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(403).type("text/html").send(NOT_RUNNING_PAGE);
  }

  const scenario = scenarioFor(req.params.slug);
  if (!scenario) return res.status(404).type("text/plain").send("Bunday laboratoriya yo'q");

  const origin = `${req.protocol}://${req.get("host")}`;
  res.setHeader("Content-Security-Policy", [
    "sandbox allow-scripts allow-forms",
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data:",
    `connect-src ${origin}`,
    "frame-ancestors 'none'",
  ].join("; "));
  // A target that is cached is a target that ignores "Stop".
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.type("text/html").send(scenario.render({ token, solveUrl: `${origin}/api/labs/solve` }));
});

/** A wrong guess is cheap to make and cheap to check; a flood of them is not. */
const solveLimit = createRateLimiter({ windowMs: 60 * 1000, max: 60, keyPrefix: "lab-solve", store: "instance" });

/**
 * POST /api/labs/solve — the flag, in exchange for a working exploit.
 *
 * The flags used to be written into the documents, which meant four of the five
 * labs could be finished with "view source" and the fifth with one line of
 * console. They live on the server now, and this is the only way out of it: the
 * target posts the payload the learner actually used, and the scenario re-runs
 * the same engine the document ran (lib/lab-scenarios/src/engines.ts is the one
 * copy) to decide whether the flaw was really exploited.
 *
 * The body is text/plain so the request stays CORS-simple — the caller is a
 * sandboxed document in an opaque origin, and a preflight from `Origin: null`
 * is a fight not worth having. Nothing here reads a cookie: the token in the
 * body is the entire credential, which is why the route is safe to answer for
 * a null origin at all. See corsDelegate in middleware/security.ts.
 */
router.post("/solve", solveLimit, text({ type: () => true, limit: "32kb" }), async (req, res) => {
  let payload: unknown;
  try {
    payload = JSON.parse(typeof req.body === "string" && req.body ? req.body : "{}");
  } catch {
    return res.status(400).json({ error: "So'rov noto'g'ri." });
  }

  const body = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const token = typeof body.t === "string" ? body.t : "";

  const live = await liveInstanceFor(token);
  if (!live) return res.status(403).json({ error: "Laboratoriya ishlamayapti yoki muddati tugagan." });

  const scenario = scenarioFor(live.lab.browserScenario);
  if (!scenario) return res.status(404).json({ error: "Bunday laboratoriya yo'q" });

  if (!scenario.verify(body.proof)) {
    return res.status(200).json({ error: "Hali emas — zaiflikdan foydalanilmadi." });
  }

  logger.info({ userId: live.instance.userId, lab: live.lab.slug }, "browser lab solved");
  res.setHeader("Cache-Control", "no-store");
  res.json({ flag: scenario.flag });
});

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
      // The token travels with the running instance, not just with the reply to
      // "Start" — otherwise reloading /labs loses the only way back into a lab
      // that is still running, which is how the untracked "Reopen" link came to
      // exist in the first place.
      const lab = labs.find(l => l.id === instance.labId);
      const token = tokenOf(instance.containerId);
      running = {
        id: instance.id, labId: instance.labId,
        host: instance.host, port: instance.port,
        startedAt: instance.startedAt, expiresAt: instance.expiresAt,
        targetPath: lab?.browserScenario && token ? targetPathFor(lab.browserScenario, token) : null,
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

    const token = tokenOf(instance.containerId);
    res.status(201).json({
      id: instance.id, labId: lab.id, kind: lab.kind,
      browserScenario: lab.browserScenario,
      host: instance.host, port: instance.port,
      startedAt: instance.startedAt, expiresAt: instance.expiresAt,
      // The only time this token is minted. Losing it means starting again.
      targetPath: lab.browserScenario && token ? targetPathFor(lab.browserScenario, token) : null,
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
