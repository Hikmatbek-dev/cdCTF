type SentryConfig = {
  host: string;
  projectId: string;
  publicKey: string;
  secretKey?: string;
};

type FetchResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function parseSentryDsn(dsn: string): SentryConfig | null {
  try {
    const url = new URL(dsn);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];
    if (!projectId || !url.username) return null;
    return {
      host: `${url.protocol}//${url.host}`,
      projectId,
      publicKey: url.username,
      secretKey: url.password || undefined,
    };
  } catch {
    return null;
  }
}

function buildBaseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.NODE_ENV === "production") return null;
  return `http://localhost:${process.env.PORT || 8080}`;
}

/**
 * Whether this request skips the captcha entirely.
 *
 * Exported because /register needs the same answer, and used to decide it with
 * its own inline copy of these conditions — which then drifted from this one.
 * Two places deciding who may skip the captcha is one place too many.
 */
export function shouldBypassTurnstileForRequest(ip?: string) {
  // Never in production, whatever the env says. The check below trusts req.ip,
  // and `trust proxy` is on, so req.ip is only as honest as the proxy in front
  // of us — a misconfigured one turns "localhost only" into "anyone who sends
  // X-Forwarded-For: 127.0.0.1". A convenience switch for local dev is not
  // worth leaving that within reach of a deploy mistake.
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.TURNSTILE_BYPASS_LOCALHOST !== "true") return false;
  return ip === "::1" || ip === "127.0.0.1" || ip?.startsWith("::ffff:127.0.0.1") === true;
}

export async function verifyTurnstileToken(token: string, ip?: string) {
  if (shouldBypassTurnstileForRequest(ip)) {
    return { ok: true, reason: "Turnstile bypass enabled for localhost" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "Turnstile is not configured" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  // An unreachable Cloudflare, a DNS blip or a hang used to throw straight out
  // of the route: registration answered 500 and reported to Sentry, when the
  // honest answer is "could not verify". Failing closed is the right call here
  // — the alternative is an outage at Cloudflare turning the captcha off.
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    }) as unknown as FetchResponseLike;

    if (!response.ok) return { ok: false, reason: "Turnstile verification request failed" };
    const data = await response.json() as { success?: boolean; "error-codes"?: string[] };
    return { ok: data.success === true, reason: data["error-codes"]?.join(", ") };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Turnstile is unreachable" };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, reason: "Resend is not configured" };
  }

  const baseUrl = buildBaseUrl();
  if (!baseUrl) {
    return { ok: false, reason: "APP_BASE_URL is not configured" };
  }

  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your cdCTF account",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Verify your cdCTF account</h2>
          <p>Finish activating your account by clicking the button below.</p>
          <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Verify email</a></p>
          <p>If the button does not work, open this link:</p>
          <p>${verifyUrl}</p>
        </div>
      `,
    }),
  }) as unknown as FetchResponseLike;
  return { ok: response.ok, reason: response.ok ? undefined : `Resend returned ${response.status}` };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, reason: "Resend is not configured" };

  const baseUrl = buildBaseUrl();
  if (!baseUrl) return { ok: false, reason: "APP_BASE_URL is not configured" };

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your cdCTF password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Reset your password</h2>
          <p>We received a request to reset your password. Click the button below to continue.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Reset password</a></p>
          <p>If you did not request this, please ignore this email.</p>
          <p>${resetUrl}</p>
        </div>
      `,
    }),
  }) as unknown as FetchResponseLike;

  return { ok: response.ok, reason: response.ok ? undefined : `Resend returned ${response.status}` };
}

export async function reportErrorToSentry(error: unknown, context: Record<string, unknown> = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const config = parseSentryDsn(dsn);
  if (!config) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: timestamp }),
    JSON.stringify({
      type: "event",
      content_type: "application/json",
    }),
    JSON.stringify({
      event_id: eventId,
      timestamp,
      platform: "node",
      level: "error",
      message,
      exception: {
        values: [
          {
            type: error instanceof Error ? error.name : "Error",
            value: message,
            stacktrace: stack ? { frames: stack.split("\n").map(line => ({ filename: line.trim() })) } : undefined,
          },
        ],
      },
      extra: context,
    }),
  ].join("\n");

  try {
    await fetch(`${config.host}/api/${config.projectId}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${config.publicKey}${config.secretKey ? `, sentry_secret=${config.secretKey}` : ""}`,
      },
      body: envelope,
    });
  } catch {
    // swallow reporting failures
  }
}
