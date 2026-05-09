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
  return `http://localhost:${process.env.PORT || 8080}`;
}

function shouldBypassTurnstileForRequest(ip?: string) {
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

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }) as unknown as FetchResponseLike;

  if (!response.ok) return { ok: false, reason: "Turnstile verification request failed" };
  const data = await response.json() as { success?: boolean; "error-codes"?: string[] };
  return { ok: data.success === true, reason: data["error-codes"]?.join(", ") };
}

export async function sendVerificationEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !from) {
    return { ok: false, reason: "Resend is not configured" };
  }

  const verifyUrl = `${buildBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
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
