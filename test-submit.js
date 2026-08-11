const { verifyFlag, hashFlag } = require("./artifacts/api-server/src/lib/flags");

const stored = hashFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
console.log(verifyFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}", stored));

