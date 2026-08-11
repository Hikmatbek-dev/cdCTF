const crypto = require("crypto");
const HASH_PREFIX = "sha256$";
function normalizeFlag(flag) { return flag.trim().replace(/\r\n/g, "\n"); }
function hashFlag(flag) {
  return `${HASH_PREFIX}${crypto.createHash("sha256").update(normalizeFlag(flag), "utf8").digest("hex")}`;
}

function keywordVariants(submitted) {
  // Strip zero-width spaces just in case
  let raw = submitted.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  
  let core = raw;
  const match = /^([A-Za-z][A-Za-z0-9_]*)?(\{)([\s\S]*?)(\})$/.exec(raw);
  if (match) {
    core = match[3];
  }
  
  return [...new Set([
    raw,
    core,
    `cdCTF{${core}}`,
    `cdctf{${core}}`,
    `flag{${core}}`,
    `Flag{${core}}`,
    `FLAG{${core}}`
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

const db = hashFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
console.log(verifyFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db)); // Exact match
console.log(verifyFlag("Flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db)); // Different case keyword
console.log(verifyFlag("cdCTF{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db)); // Different keyword
console.log(verifyFlag("ch1n0r_qu0t3_br34ks_th3_qu3ry", db)); // ONLY CORE
console.log(verifyFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}\u200B", db)); // With invisible char

const db2 = hashFlag("cdCTF{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
console.log(verifyFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", db2)); // DB has cdCTF
console.log(verifyFlag("ch1n0r_qu0t3_br34ks_th3_qu3ry", db2)); // ONLY CORE
