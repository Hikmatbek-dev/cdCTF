import { createHash, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "sha256$";

function normalizeFlag(flag: string) {
  return flag.trim().replace(/\r\n/g, "\n");
}

export function hashFlag(flag: string) {
  return `${HASH_PREFIX}${createHash("sha256").update(normalizeFlag(flag), "utf8").digest("hex")}`;
}

export function isHashedFlag(flag: string) {
  return flag.startsWith(HASH_PREFIX);
}

function matchesExact(submitted: string, stored: string) {
  const expected = isHashedFlag(stored) ? stored : normalizeFlag(stored);
  const actual = isHashedFlag(stored) ? hashFlag(submitted) : normalizeFlag(submitted);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * Case variants of the flag *keyword* — the token before the opening brace, e.g.
 * `flag`, `Flag`, `FLAG`. The content inside the braces is left untouched, so a
 * hex answer stays case-sensitive; only the wrapper is forgiven. This is why a
 * learner who typed `flag{…}` (following the placeholder) against a `Flag{…}`
 * answer was wrongly rejected. Flags with no `{…}` shape get no variants.
 */
function keywordVariants(submitted: string): string[] {
  const trimmed = submitted.trim();
  const match = /^([A-Za-z][A-Za-z0-9_]*)(\{[\s\S]*)$/.exec(trimmed);
  if (!match) return [trimmed];
  const [, keyword, rest] = match;
  const titled = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
  return [...new Set([
    trimmed,
    keyword.toLowerCase() + rest,
    keyword.toUpperCase() + rest,
    titled + rest,
    "cdCTF" + rest,
    "cdctf" + rest,
    "CDCTF" + rest,
    "flag" + rest,
    "Flag" + rest,
    "FLAG" + rest,
  ])];
}

/**
 * True when the submission matches the stored flag. The keyword case (flag /
 * Flag / FLAG) is forgiven; everything inside the braces must match exactly.
 * Every candidate is compared against the same stored value, so a wrong answer
 * can never slip through — only the wrapper's case is relaxed.
 */
export function verifyFlag(submitted: string, stored: string) {
  return keywordVariants(submitted).some(candidate => matchesExact(candidate, stored));
}
