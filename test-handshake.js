const crypto = require("crypto");
const HASH_PREFIX = "sha256$";
function normalizeFlag(flag) { return flag.trim().replace(/\r\n/g, "\n"); }
function hashFlag(flag) {
  return `${HASH_PREFIX}${crypto.createHash("sha256").update(normalizeFlag(flag), "utf8").digest("hex")}`;
}
function keywordVariants(submitted) {
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

console.log(verifyFlag("Flag{11223344}", hashFlag("11223344")));
console.log(verifyFlag("Flag{11223344}", hashFlag("Flag{11223344}")));
console.log(verifyFlag("Flag{11223344}", "11223344"));
console.log(verifyFlag("Flag{11223344}", "Flag{11223344}"));
