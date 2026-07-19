import { randomBytes } from "node:crypto";
import { logger } from "./logger";

export const OAUTH_PROVIDERS = ["google", "github", "discord"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export const OAUTH_STATE_COOKIE = "cdctf_oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

/** The profile fields we take from a provider. Everything else is ignored. */
export type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  /**
   * Whether the provider says it verified the address. An unverified address is
   * worthless for identity: anyone can put someone else's email on an account.
   */
  emailVerified: boolean;
  displayName: string | null;
};

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
};

async function getJson(url: string, accessToken: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      // GitHub rejects requests without one.
      "User-Agent": "cdctf",
    },
  });
  if (!response.ok) throw new Error(`Profile request failed: ${response.status}`);
  return response.json();
}

const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const data = await getJson("https://www.googleapis.com/oauth2/v3/userinfo", accessToken) as {
        sub: string; email?: string; email_verified?: boolean; name?: string;
      };
      return {
        providerAccountId: data.sub,
        email: data.email ?? null,
        emailVerified: data.email_verified === true,
        displayName: data.name ?? null,
      };
    },
  },

  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const user = await getJson("https://api.github.com/user", accessToken) as {
        id: number; login: string; name?: string; email?: string | null;
      };

      // GitHub omits the email from /user when the user keeps it private, and
      // never says whether the one it does return is verified. The dedicated
      // endpoint is the only place that answers both.
      let email: string | null = null;
      let emailVerified = false;
      try {
        const emails = await getJson("https://api.github.com/user/emails", accessToken) as Array<{
          email: string; primary: boolean; verified: boolean;
        }>;
        const primary = emails.find(item => item.primary && item.verified)
          ?? emails.find(item => item.verified);
        if (primary) {
          email = primary.email;
          emailVerified = true;
        }
      } catch (err) {
        logger.warn({ err }, "GitHub email lookup failed");
      }

      return {
        providerAccountId: String(user.id),
        email,
        emailVerified,
        displayName: user.name ?? user.login,
      };
    },
  },

  discord: {
    authorizeUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify email",
    clientId: () => process.env.DISCORD_CLIENT_ID,
    clientSecret: () => process.env.DISCORD_CLIENT_SECRET,
    async fetchProfile(accessToken) {
      const data = await getJson("https://discord.com/api/users/@me", accessToken) as {
        id: string; email?: string | null; verified?: boolean; username?: string; global_name?: string | null;
      };
      return {
        providerAccountId: data.id,
        email: data.email ?? null,
        emailVerified: data.verified === true,
        displayName: data.global_name ?? data.username ?? null,
      };
    },
  },
};

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const config = PROVIDERS[provider];
  return Boolean(config.clientId() && config.clientSecret());
}

export function configuredProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter(isProviderConfigured);
}

/**
 * Where the provider sends the browser back to. Derived from APP_BASE_URL so it
 * matches what is registered with the provider — a mismatch is the single most
 * common reason an OAuth setup fails.
 */
export function callbackUrl(provider: OAuthProvider): string {
  const base = (process.env.APP_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
  return `${base}/api/auth/oauth/${provider}/callback`;
}

export function generateStateNonce(): string {
  return randomBytes(32).toString("base64url");
}

export function authorizeUrl(provider: OAuthProvider, stateNonce: string): string {
  const config = PROVIDERS[provider];
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId()!);
  url.searchParams.set("redirect_uri", callbackUrl(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", stateNonce);
  if (provider === "google") {
    // Without this Google skips the account chooser and silently reuses whoever
    // is already signed in, which is confusing when linking a second account.
    url.searchParams.set("prompt", "select_account");
  }
  return url.toString();
}

export async function exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<string> {
  const config = PROVIDERS[provider];
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: config.clientId()!,
      client_secret: config.clientSecret()!,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(provider),
    }),
  });

  if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);

  const data = await response.json() as { access_token?: string; error?: string };
  if (data.error || !data.access_token) throw new Error(`Token exchange rejected: ${data.error ?? "no access_token"}`);
  return data.access_token;
}

export function fetchProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  return PROVIDERS[provider].fetchProfile(accessToken);
}

/**
 * Builds a nickname from a provider display name. Providers allow spaces,
 * punctuation and unicode; the local rule is 3-32 of [A-Za-z0-9_].
 */
export function suggestNickname(profile: OAuthProfile, provider: OAuthProvider): string {
  const source = profile.displayName ?? profile.email?.split("@")[0] ?? provider;
  const cleaned = source.replace(/[^A-Za-z0-9_]/g, "").slice(0, 24);
  return cleaned.length >= 3 ? cleaned : `${provider}user`;
}
