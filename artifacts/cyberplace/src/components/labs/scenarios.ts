/**
 * Browser labs: deliberately vulnerable mini-applications, running in the
 * learner's own tab.
 *
 * The container labs need a Docker host that does not exist yet, so /labs told
 * every visitor "not available". These need nothing: each scenario is a small
 * application with a genuine flaw and a real flag, rendered inside a sandboxed
 * iframe on the learner's machine. Instant, free, and impossible to point at
 * anything real.
 *
 * Each scenario is a self-contained HTML document. It is served through
 * `srcdoc` into an iframe with `sandbox="allow-scripts"` and no
 * `allow-same-origin`, so the document runs in an opaque origin: it cannot read
 * cdCTF's cookies, localStorage or DOM even though the code inside it is
 * deliberately unsafe. That is the whole point — the vulnerability has to be
 * real for the exercise to teach anything, so the blast radius is what gets
 * contained.
 *
 * Flags are not secret from a determined reader: the document is on their
 * machine, so "view source" wins eventually. That is fine and true of every
 * client-side lab; the flag is checked against the linked challenge, and the
 * learning is in finding the flaw, not in the flag being unguessable. The
 * harder challenges keep the flag out of the initial HTML so at least the
 * obvious shortcut does not work.
 */

export type Scenario = {
  slug: string;
  /** Rendered inside the iframe. Must be a complete document. */
  html: string;
  /** What the learner is asked to do, in three languages. */
  brief: { en: string; uz: string; ru: string };
  /** Shown on request — one nudge, not the answer. */
  hint: { en: string; uz: string; ru: string };
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

/**
 * 1 — SQL injection.
 *
 * A toy SQL engine, not a regex that looks for the word "OR": the input really
 * is concatenated into a query string, and the query is really parsed. So the
 * classic payloads work for the classic reason, and a payload that would not
 * work against a real database does not work here either.
 */
const sqlInjection: Scenario = {
  slug: "sql-login-bypass",
  brief: {
    en: "The admin panel of a fictional operator. You have no password. The login query is built by pasting your input straight into SQL — get in as `admin`.",
    uz: "Xayoliy operatorning admin paneli. Sizda parol yo'q. Kirish so'rovi kiritganingizni to'g'ridan-to'g'ri SQL ichiga qo'yib quriladi — `admin` bo'lib kiring.",
    ru: "Админ-панель вымышленного оператора. Пароля у вас нет. Запрос входа собирается вставкой вашего ввода прямо в SQL — войдите как `admin`.",
  },
  hint: {
    en: "The query ends with `AND parol='<your input>'`. What could you type so the password test is no longer part of the condition?",
    uz: "So'rov `AND parol='<kiritganingiz>'` bilan tugaydi. Parol tekshiruvi shartdan chiqib ketishi uchun nima yozish mumkin?",
    ru: "Запрос заканчивается на `AND parol='<ваш ввод>'`. Что ввести, чтобы проверка пароля перестала быть частью условия?",
  },
  html: `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
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
<script>
// A tiny SQL engine. Enough of one that injection behaves the way it does
// against a real database, and no more.
var USERS = [
  { login: "admin",   parol: "S3cur3-Ch1nor-2026!" },
  { login: "operator", parol: "operator123" }
];

function tokenize(s) {
  var out = [], i = 0;
  while (i < s.length) {
    var c = s[i];
    if (c === " " || c === "\\t" || c === "\\n") { i++; continue; }
    if (c === "'") {                       // string literal
      var j = i + 1, v = "";
      while (j < s.length && s[j] !== "'") { v += s[j]; j++; }
      out.push({ t: "str", v: v }); i = j + 1; continue;
    }
    if (c === "-" && s[i + 1] === "-") break;   // line comment: rest is dead
    if (c === "=" ) { out.push({ t: "op", v: "=" }); i++; continue; }
    if (c === "(" || c === ")") { out.push({ t: c }); i++; continue; }
    var w = "";
    while (i < s.length && /[^\\s'()=]/.test(s[i])) { w += s[i]; i++; }
    if (w) out.push({ t: "word", v: w });
  }
  return out;
}

// WHERE <expr> with AND / OR / = over column names and string literals.
function evalWhere(tokens, row) {
  var pos = 0;
  function peek() { return tokens[pos]; }
  function value(tok) {
    if (!tok) return "";
    if (tok.t === "str") return tok.v;
    if (tok.t === "word") {
      if (Object.prototype.hasOwnProperty.call(row, tok.v)) return row[tok.v];
      return tok.v;                        // bare word, e.g. the 1 in 1=1
    }
    return "";
  }
  function primary() {
    var tok = peek();
    if (tok && tok.t === "(") { pos++; var v = orExpr(); if (peek() && peek().t === ")") pos++; return v; }
    var left = value(tok); pos++;
    if (peek() && peek().t === "op") {
      pos++;
      var right = value(peek()); pos++;
      return String(left) === String(right);
    }
    return Boolean(left) && left !== "0";
  }
  function andExpr() {
    var v = primary();
    while (peek() && peek().t === "word" && peek().v.toUpperCase() === "AND") { pos++; v = primary() && v; }
    return v;
  }
  function orExpr() {
    var v = andExpr();
    while (peek() && peek().t === "word" && peek().v.toUpperCase() === "OR") { pos++; v = andExpr() || v; }
    return v;
  }
  return orExpr();
}

document.getElementById("go").onclick = function () {
  var u = document.getElementById("u").value;
  var p = document.getElementById("p").value;
  // The flaw, in one line: the input is concatenated, not parameterised.
  var where = "login='" + u + "' AND parol='" + p + "'";
  var sql = "SELECT * FROM users WHERE " + where;
  var out = document.getElementById("out");
  var tokens = tokenize(where);
  var hit = USERS.filter(function (r) { try { return evalWhere(tokens, r); } catch (e) { return false; } });
  if (hit.length && hit[0].login === "admin") {
    out.className = "out ok";
    out.textContent = sql + "\\n\\nXush kelibsiz, admin.\\nflag{sql_1nj3ct10n_ch1n0r}";
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
 * The flag is handed over by a function only reachable from script running in
 * the page, so it cannot be read out of the source: the learner has to actually
 * achieve execution.
 */
const reflectedXss: Scenario = {
  slug: "reflected-xss",
  brief: {
    en: "A search page writes your query back into the page without escaping it. Get JavaScript to run — the page hands the flag to any script that calls `getFlag()`.",
    uz: "Qidiruv sahifasi so'rovingizni ekranga hech qanday himoyasiz qaytaradi. JavaScript ishga tushiring — sahifa `getFlag()` chaqirgan skriptga flagni beradi.",
    ru: "Страница поиска возвращает ваш запрос без экранирования. Добейтесь выполнения JavaScript — страница отдаёт флаг любому скрипту, вызвавшему `getFlag()`.",
  },
  hint: {
    en: "A plain <script> tag inserted with innerHTML does not run. An image that fails to load, on the other hand, fires an error handler.",
    uz: "innerHTML orqali qo'yilgan oddiy <script> ishlamaydi. Yuklana olmaydigan rasm esa xato ishlovchisini ishga tushiradi.",
    ru: "Обычный <script>, вставленный через innerHTML, не выполняется. А картинка, которая не загрузилась, вызывает обработчик ошибки.",
  },
  html: `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Registon Market · Qidiruv</div>
  <div class="body">
    <label for="q">Mahsulot qidirish</label>
    <input id="q" placeholder="masalan: noutbuk" autocomplete="off">
    <button id="go">Qidirish</button>
    <div id="res" class="out">Hech narsa qidirilmadi.</div>
  </div>
</div>
<script>
// Only reachable from code executing inside this document.
window.getFlag = function () {
  var box = document.getElementById("res");
  var p = document.createElement("div");
  p.className = "out ok";
  p.textContent = "flag{xss_r3fl3ct3d_r3g1st0n}";
  box.parentNode.appendChild(p);
  return "flag{xss_r3fl3ct3d_r3g1st0n}";
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
  slug: "idor-invoice",
  brief: {
    en: "A billing portal. You are customer 1042 and can open your own invoices. One invoice belongs to someone else and carries the flag — find it.",
    uz: "Hisob-kitob portali. Siz 1042-mijozsiz va o'z hisoblaringizni ochasiz. Bitta hisob boshqa odamniki va unda flag bor — uni toping.",
    ru: "Биллинг-портал. Вы клиент 1042 и открываете свои счета. Один счёт принадлежит другому, и в нём флаг — найдите его.",
  },
  hint: {
    en: "Your invoices are 1042-01 to 1042-03. The server never checks whose invoice you asked for — only that the number exists.",
    uz: "Sizning hisoblaringiz 1042-01 dan 1042-03 gacha. Server kimning hisobini so'raganingizni umuman tekshirmaydi — faqat raqam bor-yo'qligini.",
    ru: "Ваши счета — с 1042-01 по 1042-03. Сервер не проверяет, чей счёт вы запросили, только существует ли номер.",
  },
  html: `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
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
<script>
// No ownership column anywhere in this lookup — that is the bug.
var INVOICES = {
  "1042-01": "Chinor Telecom · 89 000 so'm · to'langan",
  "1042-02": "Anhor Bank xizmat haqi · 15 000 so'm · to'langan",
  "1042-03": "Internet · 210 000 so'm · kutilmoqda",
  "1043-01": "Zarafshon Logistics · 1 250 000 so'm · to'langan\\n\\nIzoh: flag{1d0r_h1sob_1043}"
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
    out.className = "out ok";
    out.textContent = n + "\\n" + INVOICES[n];
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
  slug: "cookie-role",
  brief: {
    en: "This portal decides what you may see from a cookie your own browser holds. You are signed in as a guest. Become staff.",
    uz: "Bu portal nimani ko'rishingizni brauzeringizdagi cookie asosida hal qiladi. Siz mehmon sifatida kirgansiz. Xodimga aylaning.",
    ru: "Портал решает, что вам показать, по куке, которая хранится в вашем браузере. Вы вошли как гость. Станьте сотрудником.",
  },
  hint: {
    en: "Open the developer tools, find the cookie for this frame, and read what it says. Nothing signs it.",
    uz: "Ishlab chiquvchi vositalarini oching, shu freym cookie'sini toping va nima yozilganini o'qing. Uni hech kim imzolamaydi.",
    ru: "Откройте инструменты разработчика, найдите куку этого фрейма и прочитайте её. Никто её не подписывает.",
  },
  html: `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Sardoba Energy · Ichki portal</div>
  <div class="body">
    <div id="who" class="out"></div>
    <button id="refresh">Sahifani yangilash</button>
    <p class="muted">Sessiya cookie'da saqlanadi: <code id="raw"></code></p>
  </div>
</div>
<script>
// The role is client state. The server (if there were one) would have to be
// told about it, and would believe it.
if (!document.cookie.match(/(^|;\\s*)role=/)) document.cookie = "role=guest; path=/";

function render() {
  var role = (document.cookie.match(/(^|;\\s*)role=([^;]+)/) || [])[2] || "guest";
  document.getElementById("raw").textContent = "role=" + role;
  var who = document.getElementById("who");
  if (role === "staff") {
    who.className = "out ok";
    who.textContent = "Xodim paneli ochildi.\\n\\nIchki eslatma: flag{c00k13_r0l3_s4rd0b4}";
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
  slug: "path-traversal",
  brief: {
    en: "A document viewer serves files from `/var/www/docs`. Something useful is kept one level above it, outside the list.",
    uz: "Hujjat ko'ruvchi fayllarni `/var/www/docs` dan beradi. Ro'yxatda yo'q, bir daraja yuqorida foydali narsa saqlanadi.",
    ru: "Просмотрщик документов отдаёт файлы из `/var/www/docs`. Кое-что полезное лежит уровнем выше, вне списка.",
  },
  hint: {
    en: "The name you type is appended to the base directory and nothing removes `..`. The interesting file is `.env`.",
    uz: "Yozgan nomingiz asosiy katalogga qo'shiladi va `..` ni hech kim olib tashlamaydi. Kerakli fayl — `.env`.",
    ru: "Введённое имя дописывается к базовому каталогу, и `..` никто не убирает. Нужный файл — `.env`.",
  },
  html: `<!doctype html><html lang="uz"><head><meta charset="utf-8">${CHROME}</head><body>
<div class="app">
  <div class="bar">Registon Market · Hujjatlar</div>
  <div class="body">
    <p class="muted">Asosiy katalog: <code>/var/www/docs</code></p>
    <label for="f">Fayl nomi</label>
    <input id="f" value="shartnoma.txt" autocomplete="off">
    <button id="go">Ochish</button>
    <div id="out" class="out">Fayl tanlanmadi.</div>
  </div>
</div>
<script>
var FS = {
  "/var/www/docs/shartnoma.txt": "Xizmat ko'rsatish shartnomasi. 2026-yil.",
  "/var/www/docs/narxlar.txt": "Narxlar ro'yxati — ichki foydalanish uchun.",
  "/var/www/.env": "DB_HOST=127.0.0.1\\nDB_USER=market\\nAPI_KEY=flag{tr4v3rs4l_r3g1st0n_env}"
};

// Naive normalisation of ".." — exactly what a vulnerable server does.
function resolve(base, name) {
  var parts = (base + "/" + name).split("/");
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p === "" || p === ".") continue;
    if (p === "..") { out.pop(); continue; }
    out.push(p);
  }
  return "/" + out.join("/");
}

document.getElementById("go").onclick = function () {
  var name = document.getElementById("f").value;
  var path = resolve("/var/www/docs", name);
  var out = document.getElementById("out");
  if (Object.prototype.hasOwnProperty.call(FS, path)) {
    out.className = "out ok";
    out.textContent = path + "\\n\\n" + FS[path];
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
