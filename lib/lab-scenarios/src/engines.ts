/**
 * The toy engines the vulnerable targets are built on — written once, run in
 * two places.
 *
 * Each of these functions is shipped into the learner's document by
 * `String(fn)` and *also* called on the server to check the exploit before a
 * flag is handed over. That matters: if the server verified with a second,
 * hand-written copy of the same parser, the two could disagree, and the failure
 * mode is the worst one available — the target says "welcome, admin" and then
 * the platform refuses the flag.
 *
 * So every function here must stay self-contained: no imports, no module-scope
 * references, no TypeScript-only constructs that vanish differently on either
 * side. What esbuild emits is what the browser gets.
 */

export type SqlToken = { t: string; v?: string };
export type SqlRow = Record<string, string>;

/**
 * Splits a WHERE clause into tokens: string literals, `=`, parentheses, words.
 * `--` starts a comment, and the rest of the line is dead — which is the whole
 * reason the classic payload works.
 */
export function tokenize(s: string): SqlToken[] {
  const out: SqlToken[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "'") {
      let j = i + 1, v = "";
      while (j < s.length && s[j] !== "'") { v += s[j]; j++; }
      out.push({ t: "str", v: v }); i = j + 1; continue;
    }
    if (c === "-" && s[i + 1] === "-") break;
    if (c === "=") { out.push({ t: "op", v: "=" }); i++; continue; }
    if (c === "(" || c === ")") { out.push({ t: c }); i++; continue; }
    let w = "";
    while (i < s.length && /[^\s'()=]/.test(s[i])) { w += s[i]; i++; }
    if (w) out.push({ t: "word", v: w });
  }
  return out;
}

/** WHERE <expr> with AND / OR / = over column names and string literals. */
export function evalWhere(tokens: SqlToken[], row: SqlRow): boolean {
  let pos = 0;
  function peek() { return tokens[pos]; }
  function value(tok: SqlToken | undefined): string {
    if (!tok) return "";
    if (tok.t === "str") return tok.v as string;
    if (tok.t === "word") {
      if (Object.prototype.hasOwnProperty.call(row, tok.v as string)) return row[tok.v as string];
      return tok.v as string;
    }
    return "";
  }
  function primary(): boolean {
    const tok = peek();
    if (tok && tok.t === "(") { pos++; const v = orExpr(); if (peek() && peek().t === ")") pos++; return v; }
    const left = value(tok); pos++;
    if (peek() && peek().t === "op") {
      pos++;
      const right = value(peek()); pos++;
      return String(left) === String(right);
    }
    return Boolean(left) && left !== "0";
  }
  function andExpr(): boolean {
    let v = primary();
    while (peek() && peek().t === "word" && (peek().v as string).toUpperCase() === "AND") { pos++; v = primary() && v; }
    return v;
  }
  function orExpr(): boolean {
    let v = andExpr();
    while (peek() && peek().t === "word" && (peek().v as string).toUpperCase() === "OR") { pos++; v = andExpr() || v; }
    return v;
  }
  return orExpr();
}

/** Naive normalisation of "..", exactly as a vulnerable file server does it. */
export function resolvePath(base: string, name: string): string {
  const parts = (base + "/" + name).split("/");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === "" || p === ".") continue;
    if (p === "..") { out.pop(); continue; }
    out.push(p);
  }
  return "/" + out.join("/");
}

/**
 * The accounts the SQL lab's toy database holds.
 *
 * The admin password ships in the document — it has to, the engine runs there —
 * so reading it out of "view source" and typing it in is a shortcut the lab
 * cannot prevent. The server closes it instead: a submission that uses the real
 * password is not an injection, and does not earn the flag. See the
 * sql-login-bypass scenario's verify() in ./index.
 */
export const SQL_USERS: SqlRow[] = [
  { login: "admin", parol: "S3cur3-Ch1nor-2026!" },
  { login: "operator", parol: "operator123" },
];

/** How the login form builds its query. Shared so the server checks the same string. */
export function sqlWhereFor(login: string, parol: string): string {
  return "login='" + login + "' AND parol='" + parol + "'";
}

/** The invoice the IDOR lab hides — it belongs to another customer. */
export const IDOR_TARGET_INVOICE = "1043-01";

/** Where the traversal lab keeps the file that is not in the picker. */
export const TRAVERSAL_BASE_DIR = "/var/www/docs";
export const TRAVERSAL_TARGET_FILE = "/var/www/.env";
