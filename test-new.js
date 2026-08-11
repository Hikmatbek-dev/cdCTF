const crypto = require("crypto");
const HASH_PREFIX = "sha256$";
function normalizeFlag(flag) { return flag.trim().replace(/\r\n/g, "\n"); }
function hashFlag(flag) {
  return `${HASH_PREFIX}${crypto.createHash("sha256").update(normalizeFlag(flag), "utf8").digest("hex")}`;
}
function keywordVariants(submitted) {
  const trimmed = submitted.trim();
  const match = /^([A-Za-z][A-Za-z0-9_]*)(\{[\s\S]*)$/.exec(trimmed);
  if (!match) return [trimmed];
  const [, , rest] = match;
  return [...new Set([
    trimmed,
    "cdCTF" + rest,
    "cdctf" + rest,
    "flag" + rest,
    "Flag" + rest,
    "FLAG" + rest,
  ])];
}
function matchesExact(submitted, stored) {
  const expected = stored.startsWith(HASH_PREFIX) ? stored : normalizeFlag(stored);
  const actual = stored.startsWith(HASH_PREFIX) ? hashFlag(submitted) : normalizeFlag(submitted);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
function verifyFlag(submitted, stored) {
  return keywordVariants(submitted).some(candidate => matchesExact(candidate, stored));
}

const db = hashFlag("cdCTF{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
console.log(verifyFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db));
console.log(verifyFlag("Flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db));
