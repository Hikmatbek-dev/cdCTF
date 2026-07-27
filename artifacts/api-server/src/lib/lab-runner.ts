import { logger } from "./logger";

/**
 * Client for the lab runner — the small service that actually starts and stops
 * containers on a host with Docker.
 *
 * The API is serverless and cannot run a container itself, so labs are split in
 * two: this process owns the rules (who may start what, how long it lives), the
 * runner owns the Docker socket and nothing else.
 *
 * Ships dark. With LAB_RUNNER_URL unset the feature reports itself unavailable
 * and every lab route answers 503, so deploying this before a host exists
 * changes nothing for anyone.
 */

const RUNNER_URL = (process.env.LAB_RUNNER_URL || "").replace(/\/$/, "");
const RUNNER_TOKEN = process.env.LAB_RUNNER_TOKEN || "";
/** Public hostname learners point their tools at, if it differs from the API's view. */
const PUBLIC_HOST = process.env.LAB_PUBLIC_HOST || "";

export function labsEnabled(): boolean {
  return Boolean(RUNNER_URL && RUNNER_TOKEN);
}

export type StartedContainer = { containerId: string; host: string; port: number };

async function call<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${RUNNER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RUNNER_TOKEN}`,
    },
    body: JSON.stringify(body),
    // A learner is waiting on this click; fail fast rather than hang the request.
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* runner returned non-JSON */ }
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? `runner responded ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

/** Starts a container for one learner and returns where to reach it. */
export async function startContainer(image: string, containerPort: number, ttlMinutes: number): Promise<StartedContainer> {
  const started = await call<StartedContainer>("/start", { image, containerPort, ttlMinutes });
  return { ...started, host: PUBLIC_HOST || started.host };
}

/** Stops a container. Never throws — a machine the runner already reaped is
 *  still "stopped" as far as the learner is concerned. */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    await call<{ stopped: boolean }>("/stop", { containerId });
  } catch (err) {
    logger.warn({ err, containerId }, "lab runner could not stop container");
  }
}
