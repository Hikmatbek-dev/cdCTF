/**
 * Browser labs: deliberately vulnerable mini-applications, running in the
 * learner's own tab.
 *
 * The container labs need a Docker host that does not exist yet, so /labs told
 * every visitor "not available". These need nothing: each scenario is a small
 * application with a genuine flaw, served from the API under a policy of its
 * own. Instant, free, and impossible to point at anything real.
 *
 * SERVER ONLY. This module holds the flags and the checks that award them.
 * Anything the browser needs lives in ./meta, which is what the SPA imports —
 * the two used to be one file, `LabBrief` imported it, and all five flags were
 * therefore readable in a public JS chunk by anyone who fetched it. Do not
 * import this module from artifacts/cyberplace.
 *
 * The document no longer contains its flag either. It used to, with a comment
 * conceding that "view source wins eventually" — so four of the five labs could
 * be finished without finding the flaw at all. Now the document ends by posting
 * the payload it was given to POST /api/labs/solve, the server re-runs the same
 * engine (see ./engines — one implementation, two callers) and hands back the
 * flag only if the exploit really worked.
 */

import {
  tokenize, evalWhere, resolvePath, sqlWhereFor,
  SQL_USERS, IDOR_TARGET_INVOICE, TRAVERSAL_BASE_DIR, TRAVERSAL_TARGET_FILE,
  type SqlRow,
} from "./engines";
import { SCENARIO_META, type ScenarioMeta } from "./meta";

export type { Localized, ScenarioMeta } from "./meta";
export { SCENARIO_META, metaFor } from "./meta";

/** What the target needs in order to be able to ask for its own flag. */
export type RenderContext = {
  /** The instance token; the solve endpoint refuses anything else. */
  token: string;
  /** Absolute URL of POST /api/labs/solve, so no CSP 'self' guesswork. */
  solveUrl: string;
};

export type Scenario = ScenarioMeta & {
  /** The complete HTML document, wired to this instance. */
  render(ctx: RenderContext): string;
  /** Handed over only when `verify` accepts the payload. */
  flag: string;
  /** Did the caller actually exploit the flaw? */
  verify(proof: unknown): boolean;
};

/** Shared styling so the targets look like small real apps, not like cdCTF. */
const CHROME = `
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #f4f5f7; color: #1b1f27;
  }
  .app { max-width: 460px; margin: 0 auto; background: #fff; border-radius: 10px;
         box-shadow: 0 1px 3px rgba(0,0,0,.12); overflow: hidden; }
  .bar { background: #24303f; color: #fff; padding: 12px 18px; font-weight: 600; font-size: 15px; }
  .body { padding: 20px 18px; }
  label { display: block; font-size: 12px; color: #5b6472; margin: 12px 0 4px; font-weight: 600; }
  input, select {
    width: 100%; padding: 9px 11px; border: 1px solid #cfd5df; border-radius: 6px;
    font-size: 14px; font-family: inherit; background: #fff; color: #1b1f27;
  }
  button {
    margin-top: 16px; width: 100%; padding: 10px; border: 0; border-radius: 6px;
    background: #2f6df6; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  button:hover { background: #2159d8; }
  .out { margin-top: 16px; padding: 12px; border-radius: 6px; font-size: 13px;
         background: #eef1f6; white-space: pre-wrap; word-break: break-word; }
  .ok { background: #e4f7ec; color: #0f6b3a; }
  .err { background: #fdeceb; color: #9c2620; }
  .muted { color: #6b7280; font-size: 12px; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  td, th { text-align: left; padding: 6px 4px; border-bottom: 1px solid #eceff4; }
  code { background: #eef1f6; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
</style>`;

/** "Asking the server…", in the language every target is written in. */
const ASKING = "Flag so'ralmoqda…";

/**
 * Embeds a value in a <script> without letting it close the element.
 *
 * The values here are a UUID and our own URL, so this is belt and braces — but
 * a document whose entire premise is unescaped output is the last place to
 * hand-wave about escaping.
 */
function js(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * The one thing every target can do that the old ones could not: ask for the
 * flag. `default-src 'none'` with a single `connect-src` for this exact origin
 * is what the route's CSP allows, and nothing else.
 */
function bootstrap(ctx: RenderContext): string {
  return `<script>
// esbuild's keepNames transform appends a call to its own __name helper after
// every named function, and String(fn) copies that call into this document —
// where __name does not exist, so the first engine script throws and the lab is
// a dead page. Whether a build does it depends on the toolchain (tsx does, the
// server build currently does not), so the document carries a shim rather than
// trusting either. scripts/src/check-labs.ts runs the real documents and fails
// loudly if this ever stops being enough.
var __name = function (target) { return target; };

var CDCTF = { t: ${js(ctx.token)}, url: ${js(ctx.solveUrl)} };
function claimFlag(proof, done) {
  fetch(CDCTF.url, {
    method: "POST",
    // text/plain keeps this a "simple" request: no preflight from an opaque origin.
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ t: CDCTF.t, proof: proof })
  }).then(function (r) { return r.json(); })
    .then(function (d) { done(d.flag || d.error || "Flagni olib bo'lmadi."); })
    .catch(function () { done("Serverga ulanib bo'lmadi — laboratoriya muddati tugagan bo'lishi mumkin."); });
}
</script>`;
}

/** The SQL engine, shipped verbatim from the module the server verifies with. */
const SQL_ENGINE_JS = `
var tokenize = ${String(tokenize)};
var evalWhere = ${String(evalWhere)};
var sqlWhereFor = ${String(sqlWhereFor)};
var USERS = ${js(SQL_USERS)};
`;

const PATH_ENGINE_JS = `
var resolvePath = ${String(resolvePath)};
`;

function asRecord(proof: unknown): Record<string, unknown> | null {
  return typeof proof === "object" && proof !== null && !Array.isArray(proof)
    ? (proof as Record<string, unknown>)
    : null;
}

/** A payload field: a string, and short enough that no check is a DoS. */
function field(value: unknown): string | null {
  return typeof value === "string" && value.length <= 2000 ? value : null;
}

/**
 * 1 — SQL injection.
 *
 * A toy SQL engine, not a regex that looks for the word "OR": the input really
 * is concatenated into a query string, and the query is really parsed. So the
 * classic payloads work for the classic reason, and a payload that would not
 * work against a real database does not work here either.
 */
const sqlInjection: Scenario = {
  ...SCENARIO_META["sql-login-bypass"],
  flag: "flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}",

  verify(proof) {
    const p = asRecord(proof);
    if (!p) return false;
    const login = field(p.login), parol = field(p.parol);
    if (login === null || parol === null) return false;
    // The engine runs in the learner's document, so the accounts are in the
    // document too. Typing a password read out of "view source" is not the
    // exercise, and does not earn the flag.
    if (SQL_USERS.some(u => u.parol === parol)) return false;

    const tokens = tokenize(sqlWhereFor(login, parol));
    const hit = SQL_USERS.filter((row: SqlRow) => {
      try { return evalWhere(tokens, row); } catch { return false; }
    });
    return hit.length > 0 && hit[0].login === "admin";
  },

  render: ctx => `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Chinor Telecom · Boshqaruv paneli</div>
  <div class="body">
    <label for="u">Login</label><input id="u" value="admin" autocomplete="off">
    <label for="p">Parol</label><input id="p" type="text" placeholder="parol" autocomplete="off">
    <button id="go">Kirish</button>
    <div id="out" class="out">So'rov shu yerda ko'rsatiladi.</div>
    <p class="muted">Ishlab chiquvchi rejimi: bajarilayotgan SQL ko'rinib turadi.</p>
  </div>
</div>
${bootstrap(ctx)}
<script>
${SQL_ENGINE_JS}

document.getElementById("go").onclick = function () {
  var u = document.getElementById("u").value;
  var p = document.getElementById("p").value;
  // The flaw, in one line: the input is concatenated, not parameterised.
  var where = sqlWhereFor(u, p);
  var sql = "SELECT * FROM users WHERE " + where;
  var out = document.getElementById("out");
  var tokens = tokenize(where);
  var hit = USERS.filter(function (r) { try { return evalWhere(tokens, r); } catch (e) { return false; } });
  if (hit.length && hit[0].login === "admin") {
    var head = sql + "\\n\\nXush kelibsiz, admin.\\n";
    out.className = "out ok";
    out.textContent = head + ${js(ASKING)};
    claimFlag({ login: u, parol: p }, function (msg) { out.textContent = head + msg; });
  } else if (hit.length) {
    out.className = "out";
    out.textContent = sql + "\\n\\nKirdingiz: " + hit[0].login + " — lekin bu admin emas.";
  } else {
    out.className = "out err";
    out.textContent = sql + "\\n\\nLogin yoki parol noto'g'ri.";
  }
};
</script></body></html>`,
};

/**
 * 2 — Reflected XSS.
 *
 * The flag is asked for by a function only reachable from script running in the
 * page, so it cannot be read out of the source: the learner has to actually
 * achieve execution.
 */
const reflectedXss: Scenario = {
  ...SCENARIO_META["reflected-xss"],
  flag: "flag{r3g1st0n_0n3rr0r_w1ns_ag41n}",

  verify(proof) {
    const p = asRecord(proof);
    if (!p) return false;
    const q = field(p.q);
    if (!q) return false;
    // What innerHTML actually executes is an inline event handler or a
    // javascript: URL. A bare <script> element inserted this way never runs,
    // and accepting one would certify the opposite of the lesson.
    const runs = /<[a-z][^>]*\son[a-z]+\s*=/i.test(q) || /javascript:/i.test(q);
    return runs && /getflag\s*\(/i.test(q);
  },

  render: ctx => `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Registon Market · Qidiruv</div>
  <div class="body">
    <label for="q">Mahsulot qidirish</label>
    <input id="q" placeholder="masalan: noutbuk" autocomplete="off">
    <button id="go">Qidirish</button>
    <div id="res" class="out">Hech narsa qidirilmadi.</div>
  </div>
</div>
${bootstrap(ctx)}
<script>
// Only reachable from code executing inside this document.
window.getFlag = function () {
  var q = document.getElementById("q").value;
  var box = document.getElementById("res");
  var p = document.createElement("div");
  p.className = "out ok";
  p.textContent = ${js(ASKING)};
  box.parentNode.appendChild(p);
  claimFlag({ q: q }, function (msg) { p.textContent = msg; });
  return ${js(ASKING)};
};

document.getElementById("go").onclick = function () {
  var q = document.getElementById("q").value;
  // The flaw: the query is written into the DOM as markup.
  document.getElementById("res").innerHTML =
    "<b>" + q + "</b> bo'yicha natija topilmadi.";
};
</script></body></html>`,
};

/**
 * 3 — IDOR.
 *
 * Predictable identifiers plus no ownership check. The interesting record is
 * not linked from anywhere; the learner has to notice the pattern in the URL.
 */
const idor: Scenario = {
  ...SCENARIO_META["idor-invoice"],
  flag: "flag{anh0r_1043_w4s_n0t_y0urs}",

  verify(proof) {
    const p = asRecord(proof);
    if (!p) return false;
    const n = field(p.n);
    return n !== null && n.trim() === IDOR_TARGET_INVOICE;
  },

  render: ctx => `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Anhor Bank · Hisoblar</div>
  <div class="body">
    <p class="muted">Mijoz: <code>1042</code></p>
    <table id="list"></table>
    <label for="n">Hisob raqami bo'yicha ochish</label>
    <input id="n" placeholder="1042-01" autocomplete="off">
    <button id="go">Ochish</button>
    <div id="out" class="out">Hisob tanlanmadi.</div>
  </div>
</div>
${bootstrap(ctx)}
<script>
// No ownership column anywhere in this lookup — that is the bug.
var INVOICES = {
  "1042-01": "Chinor Telecom · 89 000 so'm · to'langan",
  "1042-02": "Anhor Bank xizmat haqi · 15 000 so'm · to'langan",
  "1042-03": "Internet · 210 000 so'm · kutilmoqda",
  "1043-01": "Zarafshon Logistics · 1 250 000 so'm · to'langan"
};

var mine = ["1042-01", "1042-02", "1042-03"];
document.getElementById("list").innerHTML =
  "<tr><th>Hisob</th><th>Holat</th></tr>" +
  mine.map(function (k) {
    return "<tr><td><code>" + k + "</code></td><td>" + INVOICES[k].split("·").pop().trim() + "</td></tr>";
  }).join("");

document.getElementById("go").onclick = function () {
  var n = document.getElementById("n").value.trim();
  var out = document.getElementById("out");
  if (Object.prototype.hasOwnProperty.call(INVOICES, n)) {
    var head = n + "\\n" + INVOICES[n];
    out.className = "out ok";
    out.textContent = head;
    // Someone else's invoice is the point of the exercise, so that is the only
    // one worth asking about.
    if (mine.indexOf(n) === -1) {
      out.textContent = head + "\\n\\n" + ${js(ASKING)};
      claimFlag({ n: n }, function (msg) { out.textContent = head + "\\n\\nIzoh: " + msg; });
    }
  } else {
    out.className = "out err";
    out.textContent = "Bunday hisob topilmadi.";
  }
};
</script></body></html>`,
};

/**
 * 4 — Client-side authorisation.
 *
 * The role lives in a cookie the client owns. Classic, and still shipped.
 */
const cookieRole: Scenario = {
  ...SCENARIO_META["cookie-role"],
  flag: "flag{s4rd0b4_c00k13_s4ys_st4ff}",

  verify(proof) {
    const p = asRecord(proof);
    if (!p) return false;
    return field(p.role) === "staff";
  },

  render: ctx => `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Sardoba Energy · Ichki portal</div>
  <div class="body">
    <div id="who" class="out"></div>
    <button id="refresh">Sahifani yangilash</button>
    <p class="muted">Sessiya cookie'da saqlanadi: <code id="raw"></code></p>
  </div>
</div>
${bootstrap(ctx)}
<script>
// The role is client state. The server (if there were one) would have to be
// told about it, and would believe it.
if (!document.cookie.match(/(^|;\\s*)role=/)) document.cookie = "role=guest; path=/";

function render() {
  var role = (document.cookie.match(/(^|;\\s*)role=([^;]+)/) || [])[2] || "guest";
  document.getElementById("raw").textContent = "role=" + role;
  var who = document.getElementById("who");
  if (role === "staff") {
    var head = "Xodim paneli ochildi.\\n\\n";
    who.className = "out ok";
    who.textContent = head + ${js(ASKING)};
    claimFlag({ role: role }, function (msg) { who.textContent = head + "Ichki eslatma: " + msg; });
  } else {
    who.className = "out";
    who.textContent = "Salom, mehmon. Bu bo'lim faqat xodimlar uchun.";
  }
}
document.getElementById("refresh").onclick = render;
render();
</script></body></html>`,
};

/**
 * 5 — Path traversal.
 *
 * A file viewer that normalises nothing. The flag lives outside the directory
 * the picker offers.
 */
const pathTraversal: Scenario = {
  ...SCENARIO_META["path-traversal"],
  flag: "flag{d0td0t_sl4sh_f0und_th3_env}",

  verify(proof) {
    const p = asRecord(proof);
    if (!p) return false;
    const name = field(p.name);
    if (name === null) return false;
    return resolvePath(TRAVERSAL_BASE_DIR, name) === TRAVERSAL_TARGET_FILE;
  },

  render: ctx => `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Registon Market · Hujjatlar</div>
  <div class="body">
    <p class="muted">Asosiy katalog: <code>${TRAVERSAL_BASE_DIR}</code></p>
    <label for="f">Fayl nomi</label>
    <input id="f" value="shartnoma.txt" autocomplete="off">
    <button id="go">Ochish</button>
    <div id="out" class="out">Fayl tanlanmadi.</div>
  </div>
</div>
${bootstrap(ctx)}
<script>
${PATH_ENGINE_JS}

var FS = {
  "/var/www/docs/shartnoma.txt": "Xizmat ko'rsatish shartnomasi. 2026-yil.",
  "/var/www/docs/narxlar.txt": "Narxlar ro'yxati — ichki foydalanish uchun.",
  ${js(TRAVERSAL_TARGET_FILE)}: "DB_HOST=127.0.0.1\\nDB_USER=market\\nAPI_KEY="
};

document.getElementById("go").onclick = function () {
  var name = document.getElementById("f").value;
  var path = resolvePath(${js(TRAVERSAL_BASE_DIR)}, name);
  var out = document.getElementById("out");
  if (Object.prototype.hasOwnProperty.call(FS, path)) {
    var head = path + "\\n\\n" + FS[path];
    out.className = "out ok";
    out.textContent = head;
    if (path === ${js(TRAVERSAL_TARGET_FILE)}) {
      out.textContent = head + ${js(ASKING)};
      claimFlag({ name: name }, function (msg) { out.textContent = head + msg; });
    }
  } else {
    out.className = "out err";
    out.textContent = path + "\\n\\nBunday fayl yo'q.";
  }
};
</script></body></html>`,
};

export const SCENARIOS: Record<string, Scenario> = {
  [sqlInjection.slug]: sqlInjection,
  [reflectedXss.slug]: reflectedXss,
  [idor.slug]: idor,
  [cookieRole.slug]: cookieRole,
  [pathTraversal.slug]: pathTraversal,
};

export function scenarioFor(slug: string | null | undefined): Scenario | null {
  return (slug && SCENARIOS[slug]) || null;
}
