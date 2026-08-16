const crypto = require("node:crypto");
const HASH_PREFIX = "sha256$";
function normalizeFlag(flag) { return flag.trim().replace(/\r\n/g, "\n"); }
function hashFlag(flag) { return `${HASH_PREFIX}${crypto.createHash("sha256").update(normalizeFlag(flag), "utf8").digest("hex")}`; }
function keywordVariants(submitted) {
  const raw = submitted.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  let core = raw;
  const match = /^([A-Za-z][A-Za-z0-9_]*)?(\{)([\s\S]*?)(\})$/.exec(raw);
  if (match) { core = match[3]; }
  return [...new Set([
    raw, core, `cdCTF{${core}}`, `cdctf{${core}}`, `flag{${core}}`, `Flag{${core}}`, `FLAG{${core}}`
  ])];
}
function verifyFlag(submitted, stored) {
  return keywordVariants(submitted).some(candidate => {
    const expected = stored.startsWith(HASH_PREFIX) ? stored : normalizeFlag(stored);
    const actual = stored.startsWith(HASH_PREFIX) ? hashFlag(candidate) : normalizeFlag(candidate);
    return actual === expected;
  });
}
console.log("Submitting 'Flag{11223344}' against stored '11223344':", verifyFlag('Flag{11223344}', hashFlag('11223344')));
console.log("Submitting '11223344' against stored 'Flag{11223344}':", verifyFlag('11223344', hashFlag('Flag{11223344}')));
