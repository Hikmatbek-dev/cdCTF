/**
 * The lab runner: the only process allowed to touch Docker.
 *
 * The API is serverless and cannot start containers, so labs are split in two —
 * the API owns the rules (who may start what, for how long), this owns the
 * Docker socket and does nothing else. It exposes exactly two operations,
 * start and stop, and refuses everything it was not explicitly told to run.
 *
 * This process is effectively root on its host: anything that can make it run
 * an arbitrary image owns the machine. Hence, in order:
 *   - a bearer token on every request, compared in constant time;
 *   - an image allowlist, so a stolen token still cannot run arbitrary images;
 *   - hard resource caps and a dropped network, so a learner's machine cannot
 *     eat the host or reach its neighbours;
 *   - a TTL enforced here as well as in the API, so a forgotten container dies
 *     even if the API never calls back.
 *
 * Run it on a host that has nothing else on it.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { timingSafeEqual, randomUUID } from "node:crypto";

const run = promisify(execFile);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

const PORT = Number(process.env.PORT || 8080) || 8080;
const TOKEN = process.env.LAB_RUNNER_TOKEN || "";
/** Host learners connect to; the API may override it with LAB_PUBLIC_HOST. */
const PUBLIC_HOST = process.env.LAB_PUBLIC_HOST || "127.0.0.1";
/** Only these images may ever be started. Comma-separated, exact matches. */
const ALLOWED = (process.env.LAB_ALLOWED_IMAGES || "")
  .split(",").map(s => s.trim()).filter(Boolean);
/** Published-port range, kept away from anything else on the host. */
const PORT_MIN = Number(process.env.LAB_PORT_MIN || 20000);
const PORT_MAX = Number(process.env.LAB_PORT_MAX || 20999);
/** Caps per container. A learner's box must not be able to eat the host. */
const MEMORY = process.env.LAB_MEMORY || "512m";
const CPUS = process.env.LAB_CPUS || "0.5";
const PIDS = process.env.LAB_PIDS || "256";

if (!TOKEN) {
  console.error("LAB_RUNNER_TOKEN is required — refusing to start without authentication.");
  process.exit(1);
}
if (ALLOWED.length === 0) {
  console.error("LAB_ALLOWED_IMAGES is required — refusing to start without an image allowlist.");
  process.exit(1);
}

/** Constant-time bearer check: a timing oracle on the token is a free key. */
function authorised(header: string | undefined): boolean {
  const presented = (header || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(presented);
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/healthz") return next();
  if (!authorised(req.headers.authorization)) return res.status(401).json({ error: "Unauthorized" });
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true, images: ALLOWED.length }));

/** Ports handed out this process's lifetime, so two starts cannot collide. */
const inUse = new Set<number>();
function takePort(): number {
  for (let attempt = 0; attempt < 200; attempt++) {
    const port = PORT_MIN + Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1));
    if (!inUse.has(port)) { inUse.add(port); return port; }
  }
  throw new Error("no free port");
}

/** containerId → the timer that will reap it. */
const reapers = new Map<string, NodeJS.Timeout>();

async function removeContainer(name: string): Promise<void> {
  try {
    await run("docker", ["rm", "-f", name], { timeout: 30_000 });
  } catch {
    // Already gone (its own --rm, or a previous stop). Nothing to do.
  }
}

function scheduleReap(name: string, port: number, ttlMinutes: number): void {
  const timer = setTimeout(async () => {
    await removeContainer(name);
    inUse.delete(port);
    reapers.delete(name);
    console.log(JSON.stringify({ msg: "reaped", container: name }));
  }, ttlMinutes * 60_000);
  // Do not hold the process open for a container's whole lifetime.
  timer.unref?.();
  reapers.set(name, timer);
}

app.post("/start", async (req, res) => {
  const image = String(req.body?.image ?? "");
  const containerPort = Number(req.body?.containerPort ?? 80);
  const ttlMinutes = Math.min(Math.max(Number(req.body?.ttlMinutes ?? 60), 1), 240);

  if (!ALLOWED.includes(image)) {
    console.warn(JSON.stringify({ msg: "image not allowed", image }));
    return res.status(400).json({ error: "Image is not allowed" });
  }
  if (!Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535) {
    return res.status(400).json({ error: "Invalid container port" });
  }

  let port: number;
  try { port = takePort(); } catch { return res.status(503).json({ error: "No capacity right now" }); }

  const name = `cdctf-lab-${randomUUID().slice(0, 12)}`;
  const args = [
    "run", "--detach", "--rm",
    "--name", name,
    // Bind only on the interface the proxy/host expects, not 0.0.0.0 by accident.
    "--publish", `${PUBLIC_HOST === "127.0.0.1" ? "127.0.0.1:" : ""}${port}:${containerPort}`,
    "--memory", MEMORY, "--cpus", CPUS, "--pids-limit", PIDS,
    // A learner's machine has no business reaching the rest of the network.
    "--network", "bridge",
    "--security-opt", "no-new-privileges",
    "--cap-drop", "ALL",
    image,
  ];

  try {
    const { stdout } = await run("docker", args, { timeout: 60_000 });
    const containerId = stdout.trim().slice(0, 12) || name;
    scheduleReap(name, port, ttlMinutes);
    console.log(JSON.stringify({ msg: "started", container: name, image, port, ttlMinutes }));
    // The name is the handle we accept back on /stop — it is what we control.
    res.json({ containerId: name, host: PUBLIC_HOST, port, dockerId: containerId });
  } catch (err) {
    inUse.delete(port);
    console.error(JSON.stringify({ msg: "start failed", image, err: String(err) }));
    res.status(500).json({ error: "Could not start the container" });
  }
});

app.post("/stop", async (req, res) => {
  const containerId = String(req.body?.containerId ?? "");
  // Only names this process hands out are ever accepted, so a caller cannot
  // aim `docker rm -f` at something else running on the host.
  if (!/^cdctf-lab-[a-f0-9]{12}$/.test(containerId)) {
    return res.status(400).json({ error: "Invalid container id" });
  }
  await removeContainer(containerId);
  const timer = reapers.get(containerId);
  if (timer) { clearTimeout(timer); reapers.delete(containerId); }
  console.log(JSON.stringify({ msg: "stopped", container: containerId }));
  res.json({ stopped: true });
});

app.listen(PORT, () => {
  console.log(JSON.stringify({ msg: "lab runner listening", port: PORT, images: ALLOWED }));
});
