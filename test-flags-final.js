const crypto = require("crypto");

const HASH_PREFIX = "sha256$";

function normalizeFlag(flag) {
  return flag.trim().replace(/\r\n/g, "\n");
}

function hashFlag(flag) {
  return `${HASH_PREFIX}${crypto.createHash("sha256").update(normalizeFlag(flag), "utf8").digest("hex")}`;
}

function isHashedFlag(flag) {
  return flag.startsWith(HASH_PREFIX);
}

function keywordVariants(submitted) {
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

function matchesExact(submitted, stored) {
  const expected = isHashedFlag(stored) ? stored : normalizeFlag(stored);
  const actual = isHashedFlag(stored) ? hashFlag(submitted) : normalizeFlag(submitted);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function verifyFlag(submitted, stored) {
  return keywordVariants(submitted).some(candidate => matchesExact(candidate, stored));
}

// 1. DB has 'cdCTF', User inputs 'flag'
const db1 = hashFlag("cdCTF{b1rl4r_v4_n0ll4r}");
console.log("DB cdCTF, User flag:", verifyFlag("flag{b1rl4r_v4_n0ll4r}", db1)); // SHOULD BE TRUE NOW

// 2. DB has 'flag', User inputs 'cdCTF'
const db2 = hashFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
console.log("DB flag, User cdCTF:", verifyFlag("cdCTF{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db2)); // SHOULD BE TRUE NOW

// 3. DB has 'flag', User inputs 'flag'
const db3 = hashFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
console.log("DB flag, User flag:", verifyFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db3)); // TRUE

// 4. DB has 'cdctf', User inputs 'cdCTF'
const db4 = hashFlag("cdctf{b1rl4r_v4_n0ll4r}");
console.log("DB cdctf, User cdCTF:", verifyFlag("cdCTF{b1rl4r_v4_n0ll4r}", db4)); // TRUE
