import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import { logger } from "./logger";

const TOTP_ISSUER = "cdCTF";
// One 30-second step of slack either side, for clock drift between the phone
// and the server. otplib defaults to zero tolerance, which is unusable in practice.
const TOTP_EPOCH_TOLERANCE_SECONDS = 30;

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_GROUP = 5;
// Crockford-style alphabet: no 0/O/1/I/L, so a code read off a screen and typed
// back cannot be ambiguous.
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const ENCRYPTION_PREFIX = "v1:";
const encryptionKeySource = process.env.TOTP_ENCRYPTION_KEY;

if (!encryptionKeySource) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("TOTP_ENCRYPTION_KEY environment variable is required in production.");
  }
  logger.warn("TOTP_ENCRYPTION_KEY not set, using development-only fallback.");
} else if (process.env.NODE_ENV === "production" && encryptionKeySource.length < 32) {
  throw new Error("TOTP_ENCRYPTION_KEY must be at least 32 characters in production.");
}

// A dedicated key, not JWT_SECRET: rotating the signing key should not brick
// every enrolled authenticator.
const encryptionKey = scryptSync(
  encryptionKeySource || "cdctf_dev_totp_key_change_me",
  "cdctf-totp-v1",
  32,
);

/**
 * TOTP secrets are password-equivalents: anyone holding one can mint valid codes
 * forever. Encrypted at rest so a database leak alone does not defeat 2FA.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENCRYPTION_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(stored: string): string | null {
  if (!stored.startsWith(ENCRYPTION_PREFIX)) return null;
  try {
    const raw = Buffer.from(stored.slice(ENCRYPTION_PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (err) {
    // Wrong key or tampered ciphertext. Never throw into a request.
    logger.error({ err }, "Failed to decrypt TOTP secret");
    return null;
  }
}

export function createTotpSecret(): string {
  return generateSecret({ length: 20 });
}

/** The otpauth:// URI an authenticator app scans. */
export function totpUri(secret: string, accountName: string): string {
  return generateURI({ issuer: TOTP_ISSUER, label: accountName, secret });
}

export type TotpVerification = { valid: true; timeStep: number } | { valid: false };

/**
 * Verifies a TOTP code.
 *
 * `afterTimeStep` is the replay guard: a code stays valid for its whole window,
 * so without rejecting steps at or before the last accepted one, anyone who saw
 * a code could reuse it within ~30 seconds.
 */
export function verifyTotp(input: {
  secret: string;
  token: string;
  afterTimeStep: number | null;
}): TotpVerification {
  const token = input.token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return { valid: false };

  try {
    const result = verifySync({
      strategy: "totp",
      secret: input.secret,
      token,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
      ...(input.afterTimeStep !== null ? { afterTimeStep: input.afterTimeStep } : {}),
    });
    if (!result.valid) return { valid: false };
    // verifySync is typed for both strategies and only the TOTP result carries a
    // time step. Narrowing rather than casting: no time step, no replay guard,
    // so refuse rather than accept a code we cannot pin to a step.
    if (!("timeStep" in result)) return { valid: false };
    return { valid: true, timeStep: result.timeStep };
  } catch (err) {
    logger.warn({ err }, "TOTP verification threw");
    return { valid: false };
  }
}

/** Ten single-use codes, formatted "ABCDE-FGHJK". */
export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = Array.from(
      { length: BACKUP_CODE_GROUP * 2 },
      // randomInt is rejection-sampled, so no modulo bias across the alphabet.
      () => BACKUP_CODE_ALPHABET[randomInt(0, BACKUP_CODE_ALPHABET.length)],
    );
    return `${chars.slice(0, BACKUP_CODE_GROUP).join("")}-${chars.slice(BACKUP_CODE_GROUP).join("")}`;
  });
}

/** Accepts what the user typed however they typed it: case and dashes are noise. */
export function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Plain SHA-256, deliberately: backup codes are 50 bits of uniform randomness,
 * so there is no low-entropy guess to slow down the way there is for a password.
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code), "utf8").digest("hex");
}

export function backupCodeMatches(submitted: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashBackupCode(submitted), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
