import type { User } from "./AuthContext";

/**
 * Typed calls for the auth/security endpoints.
 *
 * These are not in the OpenAPI spec yet, so there are no generated hooks for
 * them. Hand-rolled rather than raw `fetch` at each call site so the server's
 * error message actually reaches the UI: the generated client throws a flat
 * ApiError, and pages elsewhere read `err.response.data.error` — an axios shape
 * that never matches, so every message silently becomes a generic fallback.
 */
export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(response.status, body.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

/** Reads the message off anything thrown by `call`, with a caller-supplied fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

// --- Login -----------------------------------------------------------------

export type LoginResult =
  | { requires2fa: true; mfaToken: string }
  | { requires2fa?: false; token: string; user: User; suspiciousLogin: { reasons: string[] } | null };

export const login = (nickname: string, password: string) =>
  call<LoginResult>("/auth/login", { method: "POST", body: JSON.stringify({ nickname, password }) });

export const verifyTwoFactor = (mfaToken: string, code: string) =>
  call<Extract<LoginResult, { token: string }>>("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ mfaToken, code }),
  });

// --- Two-factor ------------------------------------------------------------

export type TwoFactorStatus = { enabled: boolean; backupCodesRemaining: number };

export const twoFactorStatus = () => call<TwoFactorStatus>("/auth/2fa/status");

export const twoFactorSetup = () =>
  call<{ secret: string; otpauthUri: string }>("/auth/2fa/setup", { method: "POST" });

export const twoFactorEnable = (code: string) =>
  call<{ backupCodes: string[] }>("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) });

export const twoFactorDisable = (password: string, code: string) =>
  call<{ success: true }>("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ password, code }) });

export const regenerateBackupCodes = (password: string) =>
  call<{ backupCodes: string[] }>("/auth/2fa/backup-codes", { method: "POST", body: JSON.stringify({ password }) });

// --- Sessions --------------------------------------------------------------

export type Session = {
  id: number;
  deviceLabel: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export const listSessions = () => call<{ sessions: Session[] }>("/auth/sessions");
export const revokeSession = (id: number) => call<{ success: true }>(`/auth/sessions/${id}`, { method: "DELETE" });
export const revokeOtherSessions = () =>
  call<{ revokedCount: number }>("/auth/sessions/revoke-all", { method: "POST" });

// --- Login history ---------------------------------------------------------

export type LoginHistoryEntry = {
  id: number;
  ipAddress: string | null;
  deviceLabel: string | null;
  success: boolean;
  failureReason: string | null;
  suspicious: boolean;
  suspiciousReasons: string[];
  createdAt: string;
};

export const listLoginHistory = (limit = 25) =>
  call<{ entries: LoginHistoryEntry[] }>(`/auth/login-history?limit=${limit}`);

// --- Passkeys --------------------------------------------------------------

export type Passkey = {
  id: number;
  name: string;
  deviceType: string | null;
  backedUp: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export const listPasskeys = () => call<{ passkeys: Passkey[] }>("/auth/passkeys");
export const deletePasskey = (id: number) => call<{ success: true }>(`/auth/passkeys/${id}`, { method: "DELETE" });

/** Whether this browser can do WebAuthn at all — the UI hides itself if not. */
export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.PublicKeyCredential);
}

export async function registerPasskey(name: string): Promise<{ name: string }> {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const options = await call<Parameters<typeof startRegistration>[0]["optionsJSON"]>(
    "/auth/passkeys/register/options",
    { method: "POST" },
  );
  // Opens the platform's own prompt — Touch ID, Windows Hello, a security key.
  const attestation = await startRegistration({ optionsJSON: options });
  return call<{ name: string }>("/auth/passkeys/register/verify", {
    method: "POST",
    body: JSON.stringify({ ...attestation, name }),
  });
}

export async function loginWithPasskey(): Promise<LoginResult> {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await call<Parameters<typeof startAuthentication>[0]["optionsJSON"]>(
    "/auth/passkeys/login/options",
    { method: "POST" },
  );
  const assertion = await startAuthentication({ optionsJSON: options });
  return call<LoginResult>("/auth/passkeys/login/verify", {
    method: "POST",
    body: JSON.stringify(assertion),
  });
}

// --- OAuth -----------------------------------------------------------------

export type OAuthAccount = { provider: string; providerEmail: string | null; createdAt: string };

export const oauthProviders = () => call<{ providers: string[] }>("/auth/oauth/providers");
export const linkedOAuthAccounts = () => call<{ accounts: OAuthAccount[] }>("/auth/oauth/accounts");
export const unlinkOAuth = (provider: string) =>
  call<{ success: true }>(`/auth/oauth/${provider}`, { method: "DELETE" });

/**
 * OAuth is a browser redirect, not a fetch: the provider needs to render its own
 * consent screen, and the state cookie has to be set on a top-level navigation.
 */
export function startOAuth(provider: string, mode?: "link") {
  window.location.href = `/api/auth/oauth/${provider}${mode ? `?mode=${mode}` : ""}`;
}

// --- API tokens ------------------------------------------------------------

export type ApiToken = {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export const listApiTokens = () =>
  call<{ tokens: ApiToken[]; availableScopes: string[] }>("/auth/api-tokens");

export const createApiToken = (name: string, scopes: string[], expiresInDays: number | null) =>
  call<{ id: number; name: string; scopes: string[]; token: string }>("/auth/api-tokens", {
    method: "POST",
    body: JSON.stringify({ name, scopes, expiresInDays }),
  });

export const revokeApiToken = (id: number) =>
  call<{ success: true }>(`/auth/api-tokens/${id}`, { method: "DELETE" });
