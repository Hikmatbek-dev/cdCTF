import { verifyFlag, hashFlag, keywordVariants } from "./src/lib/flags.js";

const dbStored1 = hashFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
const userSubmitted1 = "cdCTF{ch1n0r_qu0t3_br34ks_th3_qu3ry}";
console.log("Test 1 (db: flag, user: cdCTF):", verifyFlag(userSubmitted1, dbStored1));

const dbStored2 = hashFlag("cdCTF{b1rl4r_v4_n0ll4r}");
const userSubmitted2 = "flag{b1rl4r_v4_n0ll4r}";
console.log("Test 2 (db: cdCTF, user: flag):", verifyFlag(userSubmitted2, dbStored2));

const dbStored3 = hashFlag("flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}");
const userSubmitted3 = "flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}";
console.log("Test 3 (db: flag, user: flag):", verifyFlag(userSubmitted3, dbStored3));

