import { createHash, randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { apiTokensTable } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { logger } from "./logger";

export const TOKEN_PREFIX = "cdctf_";
const SECRET_BYTES = 32;
const DISPLAY_PREFIX_LENGTH = 8;

const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

/**
 * What a token may do. Deliberately a short, user-level list: an API token is
 * for scripting your own progress, not for administering the platform. Staff
 * permissions are intentionally absent — see `resolveApiToken` in the auth
 * middleware, which refuses staff routes outright.
 */
export const API_SCOPES = [
  "profile:read",
  "ctf:read",
  "ctf:submit",
  "learn:read",
  "scoreboard:read",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export function isApiScope(value: unknown): value is ApiScope {
  return typeof value === "string" && (API_SCOPES as readonly string[]).includes(value);
}

export function looksLikeApiToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX);
}

/**
 * Plain SHA-256, as for backup codes: the secret is 256 bits of uniform
 * randomness, so there is no low-entropy guess for a slow hash to protect.
 */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateApiToken(): { token: string; tokenHash: string; prefix: string } {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const token = `${TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashApiToken(token),
    prefix: secret.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

/** Looks a token up by hash. Returns null when unknown, revoked, or expired. */
export async function findActiveApiToken(token: string) {
  const [row] = await db.select().from(apiTokensTable)
    .where(and(eq(apiTokensTable.tokenHash, hashApiToken(token)), isNull(apiTokensTable.revokedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

export async function touchApiToken(row: { id: number; lastUsedAt: Date | null }) {
  if (row.lastUsedAt && Date.now() - row.lastUsedAt.getTime() < LAST_USED_REFRESH_MS) return;
  try {
    await db.update(apiTokensTable).set({ lastUsedAt: new Date() }).where(eq(apiTokensTable.id, row.id));
  } catch (err) {
    logger.warn({ err, tokenId: row.id }, "Failed to refresh API token lastUsedAt");
  }
}

export async function listApiTokens(userId: number) {
  return db.select().from(apiTokensTable)
    .where(and(eq(apiTokensTable.userId, userId), isNull(apiTokensTable.revokedAt)))
    .orderBy(desc(apiTokensTable.createdAt));
}

export async function revokeApiToken(id: number, userId: number) {
  const revoked = await db.update(apiTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(apiTokensTable.id, id),
      eq(apiTokensTable.userId, userId),
      isNull(apiTokensTable.revokedAt),
    ))
    .returning({ id: apiTokensTable.id });
  return revoked.length > 0;
}

export function parseScopes(stored: string): ApiScope[] {
  return stored.split(",").filter(isApiScope);
}
