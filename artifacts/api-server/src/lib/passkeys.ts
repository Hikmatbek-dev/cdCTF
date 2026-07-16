import { db } from "@workspace/db";
import { passkeysTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export const WEBAUTHN_CHALLENGE_COOKIE = "cdctf_webauthn";
export const WEBAUTHN_CHALLENGE_TTL_SECONDS = 5 * 60;
export const RP_NAME = "cdCTF";

/**
 * The Relying Party ID: the domain a credential is bound to. A passkey created
 * for one rpID cannot be used on another — which is what makes WebAuthn immune
 * to phishing, and also why this must match the site's real hostname.
 */
export function rpID(): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:5173";
  try {
    return new URL(base).hostname;
  } catch {
    return "localhost";
  }
}

/** Exact origin the browser must report. Checked by the library on verify. */
export function expectedOrigin(): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:5173";
  try {
    return new URL(base).origin;
  } catch {
    return "http://localhost:5173";
  }
}

export function parseTransports(stored: string | null): AuthenticatorTransportFuture[] {
  if (!stored) return [];
  return stored.split(",").filter(Boolean) as AuthenticatorTransportFuture[];
}

export async function listPasskeys(userId: number) {
  return db.select().from(passkeysTable).where(eq(passkeysTable.userId, userId));
}

export async function findPasskeyByCredentialId(credentialId: string) {
  const [passkey] = await db.select().from(passkeysTable)
    .where(eq(passkeysTable.credentialId, credentialId)).limit(1);
  return passkey ?? null;
}

/**
 * Records a successful use. The counter is the clone check: authenticators that
 * implement it only ever increase, so a value that does not move forward is
 * evidence the credential was copied.
 */
export async function recordPasskeyUse(id: number, newCounter: number) {
  await db.update(passkeysTable)
    .set({ counter: newCounter, lastUsedAt: new Date() })
    .where(eq(passkeysTable.id, id));
}

export async function deletePasskey(id: number, userId: number) {
  const removed = await db.delete(passkeysTable)
    .where(and(eq(passkeysTable.id, id), eq(passkeysTable.userId, userId)))
    .returning({ id: passkeysTable.id });
  return removed.length > 0;
}

/** A readable default name, so a list of passkeys is not a list of blobs. */
export function defaultPasskeyName(deviceType: string, userAgent: string | undefined): string {
  if (deviceType === "singleDevice") return "Security key";
  if (!userAgent) return "Passkey";
  if (/iPhone|iPad|Mac OS X/.test(userAgent)) return "Apple passkey";
  if (/Android/.test(userAgent)) return "Android passkey";
  if (/Windows/.test(userAgent)) return "Windows passkey";
  return "Passkey";
}
