/**
 * Runs the five browser labs the way a learner's tab does, and checks the two
 * things that must never stop being true:
 *
 *   1. No document contains its own flag. They all did once, and all five
 *      flags were downloadable from a public JS chunk.
 *   2. Exploiting the flaw in the document produces exactly the payload the
 *      server's verifier accepts. The engines are shared source serialised with
 *      String(fn) (lib/lab-scenarios/src/engines.ts), so a bundler that rewrites
 *      a function — esbuild's keepNames does, by inserting __name() calls —
 *      would otherwise ship a target that throws on load, silently, in
 *      production only.
 *
 * Parsing the scripts is not enough for (2); this executes them against a small
 * fake DOM and asserts on what they send.
 *
 * Usage:  pnpm --filter ./scripts run check-labs
 */
import { SCENARIOS } from "@workspace/lab-scenarios";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? "  — " + detail : ""}`);
}

const CTX = { token: "instance-token-under-test", solveUrl: "https://cdctf.test/api/labs/solve" };
const SERVER_FLAG = "flag{issued-by-the-server}";

type FakeEl = {
  value: string; textContent: string; className: string; innerHTML: string;
  onclick: (() => void) | null;
  appendChild: () => void; parentNode: { appendChild: () => void };
};

/** Loads a target's scripts against a fake DOM and records what it posts. */
function runTarget(html: string, cookie = "") {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n;\n");
  const posted: { url: string; body: Record<string, unknown> }[] = [];
  const elements = new Map<string, FakeEl>();

  const makeEl = (): FakeEl => ({
    value: "", textContent: "", className: "", innerHTML: "",
    onclick: null, appendChild: () => undefined, parentNode: { appendChild: () => undefined },
  });

  const doc = {
    cookie,
    getElementById(id: string) {
      if (!elements.has(id)) elements.set(id, makeEl());
      return elements.get(id) as FakeEl;
    },
    createElement: () => makeEl(),
  };

  const win: Record<string, unknown> = {};

  const fetchStub = (url: string, init: { body: string }) => {
    posted.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
    return Promise.resolve({ json: () => Promise.resolve({ flag: SERVER_FLAG }) });
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function("document", "window", "fetch", scripts)(doc, win, fetchStub);

  return {
    el: (id: string) => doc.getElementById(id),
    win,
    posted,
    /** Lets the claimFlag promise chain settle before assertions run. */
    settle: () => new Promise(resolve => setTimeout(resolve, 0)),
  };
}

async function main() {
  console.log("\nNo document carries its own flag");
  for (const s of Object.values(SCENARIOS)) {
    const html = s.render(CTX);
    check(`${s.slug}: no flag{…} anywhere in the document`, !/flag\{/.test(html));
    check(`${s.slug}: carries this instance's token`, html.includes(CTX.token));
    check(`${s.slug}: knows where to redeem it`, html.includes(CTX.solveUrl));
  }

  console.log("\nExploiting the document posts what the server accepts");

  {
    const s = SCENARIOS["sql-login-bypass"];
    const t = runTarget(s.render(CTX));
    t.el("u").value = "admin";
    t.el("p").value = "' OR '1'='1";
    t.el("go").onclick?.();
    await t.settle();
    check("sql: the injection logs in as admin", t.el("out").textContent.includes("Xush kelibsiz, admin."));
    check("sql: it asks the server", t.posted.length === 1, `posted ${t.posted.length}`);
    check("sql: with this instance's token", t.posted[0]?.body.t === CTX.token);
    check("sql: the server accepts that payload", s.verify(t.posted[0]?.body.proof));
    check("sql: the flag reaches the page", t.el("out").textContent.includes(SERVER_FLAG));

    const wrong = runTarget(s.render(CTX));
    wrong.el("u").value = "admin";
    wrong.el("p").value = "hunter2";
    wrong.el("go").onclick?.();
    await wrong.settle();
    check("sql: a wrong password asks for nothing", wrong.posted.length === 0);

    // The accounts have to ship with the document — the engine runs there — so
    // the shortcut is real and the server is what closes it.
    const peeked = runTarget(s.render(CTX));
    peeked.el("u").value = "admin";
    peeked.el("p").value = "S3cur3-Ch1nor-2026!";
    peeked.el("go").onclick?.();
    await peeked.settle();
    check("sql: reading the password from source still asks", peeked.posted.length === 1);
    check("sql: …and the server refuses it", !s.verify(peeked.posted[0]?.body.proof));
  }

  {
    const s = SCENARIOS["reflected-xss"];
    const t = runTarget(s.render(CTX));
    t.el("q").value = "<img src=x onerror=getFlag()>";
    (t.win.getFlag as () => void)();
    await t.settle();
    check("xss: getFlag asks the server", t.posted.length === 1);
    check("xss: the server accepts the payload", s.verify(t.posted[0]?.body.proof));

    const inert = runTarget(s.render(CTX));
    inert.el("q").value = "<script>getFlag()</script>";
    check("xss: a bare <script> is not execution", !s.verify({ q: inert.el("q").value }));
  }

  {
    const s = SCENARIOS["idor-invoice"];
    const t = runTarget(s.render(CTX));
    t.el("n").value = "1043-01";
    t.el("go").onclick?.();
    await t.settle();
    check("idor: someone else's invoice asks the server", t.posted.length === 1);
    check("idor: the server accepts it", s.verify(t.posted[0]?.body.proof));
    check("idor: the flag reaches the page", t.el("out").textContent.includes(SERVER_FLAG));

    const own = runTarget(s.render(CTX));
    own.el("n").value = "1042-01";
    own.el("go").onclick?.();
    await own.settle();
    check("idor: your own invoice asks for nothing", own.posted.length === 0);
  }

  {
    const s = SCENARIOS["cookie-role"];
    const t = runTarget(s.render(CTX), "role=staff");
    await t.settle();
    check("cookie: forging the role asks the server", t.posted.length === 1);
    check("cookie: the server accepts it", s.verify(t.posted[0]?.body.proof));
    check("cookie: the flag reaches the page", t.el("who").textContent.includes(SERVER_FLAG));

    const guest = runTarget(s.render(CTX), "role=guest");
    await guest.settle();
    check("cookie: a guest asks for nothing", guest.posted.length === 0);
  }

  {
    const s = SCENARIOS["path-traversal"];
    const t = runTarget(s.render(CTX));
    t.el("f").value = "../.env";
    t.el("go").onclick?.();
    await t.settle();
    check("traversal: climbing out asks the server", t.posted.length === 1);
    check("traversal: the server accepts it", s.verify(t.posted[0]?.body.proof));
    check("traversal: the flag reaches the page", t.el("out").textContent.includes(SERVER_FLAG));

    const listed = runTarget(s.render(CTX));
    listed.el("f").value = "shartnoma.txt";
    listed.el("go").onclick?.();
    await listed.settle();
    check("traversal: a listed file asks for nothing", listed.posted.length === 0);
  }

  console.log("\nVerifiers reject what they should");
  const sql = SCENARIOS["sql-login-bypass"];
  check("sql: rejects a non-object", !sql.verify("admin"));
  check("sql: rejects non-string fields", !sql.verify({ login: 1, parol: null }));
  // Not a rejection: an always-true tail makes the whole condition true, so the
  // query returns admin whatever the login field said. That is the flaw working.
  check("sql: accepts the injection from either field", sql.verify({ login: "operator", parol: "' OR '1'='1" }));
  check("sql: rejects an honest non-admin login", !sql.verify({ login: "operator", parol: "operator123" }));
  const xss = SCENARIOS["reflected-xss"];
  check("xss: rejects markup that never calls getFlag", !xss.verify({ q: "<img src=x onerror=alert(1)>" }));
  check("xss: rejects plain text", !xss.verify({ q: "getFlag()" }));
  const idor = SCENARIOS["idor-invoice"];
  check("idor: rejects your own invoice", !idor.verify({ n: "1042-03" }));
  const cookie = SCENARIOS["cookie-role"];
  check("cookie: rejects guest", !cookie.verify({ role: "guest" }));
  const trav = SCENARIOS["path-traversal"];
  check("traversal: rejects overshooting the target", !trav.verify({ name: "../../.env" }));

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
