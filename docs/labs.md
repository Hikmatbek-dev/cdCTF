# Browser labs — how they work, and why they're built this way

The labs are deliberately vulnerable mini-applications a learner attacks in their
own browser tab: SQL login bypass, reflected XSS, IDOR, client-side authorisation
(cookie role), and path traversal. They need no server to run the target — but
the **flag** is server-authoritative.

## The shape

```
lib/lab-scenarios/
  src/engines.ts   toy SQL parser, path resolver, shared constants
                   → run in the browser AND on the server, one copy
  src/meta.ts      slug, task text, hint (3 languages)  ← the FRONTEND imports this
  src/index.ts     the vulnerable HTML documents, the flags, the verifiers
                   ← SERVER ONLY. Never import this from artifacts/cyberplace.
```

The split is not cosmetic. The frontend imports `@workspace/lab-scenarios/meta`;
the API imports the package root. If a page imports the root, the flags land in a
public JS chunk — which is exactly the bug this structure exists to prevent
(before the split, all five flags were downloadable from the built bundle by
anyone, signed in or not).

## The flow

1. **Start** (`POST /api/labs/:id/start`, authenticated) mints a `lab_instances`
   row. For a browser lab there is no container — the row's `containerId` is
   `browser:<uuid>`, and that random half doubles as the instance's access
   token. The response carries a `targetPath` like
   `/api/labs/target/<slug>?t=<token>`.
2. **The target** (`GET /api/labs/target/:slug?t=…`) is served only when the
   token belongs to a *running, unexpired* instance for *that* scenario. It is
   sandboxed (`Content-Security-Policy: sandbox`), so it runs in an opaque
   origin and can talk to exactly one thing: the solve endpoint.
3. **The document ships no flag.** When the learner exploits the flaw, the
   document posts the payload it actually used to `POST /api/labs/solve`
   (text/plain, so a null-origin sandbox request stays CORS-simple, carrying the
   instance token — no cookie).
4. **The server verifies and issues.** `scenario.verify(payload)` re-runs the
   same engine the document ran and returns the flag only if the exploit really
   worked. Reading the admin password out of "view source" is not an injection,
   and does not earn the flag.
5. **Stop** (`POST /api/labs/instances/:id/stop`) flips the row to `stopped`.
   The token stops working on the next request — so every copy of the target
   (a duplicated tab, a URL pasted into another browser) dies at once. TTL
   expiry does the same.

The paired CTF challenge is where the flag is finally submitted, through the
normal `POST /api/ctf/:id/submit` path (same scoring, same rate limit, same
hashing). That handler additionally requires that the submitter has actually
started the lab at least once.

## Rotating a flag

The flags in `lib/lab-scenarios/src/index.ts` are the source of truth for what
the target hands out. The **challenge** checks a hash of the flag, seeded by the
import script. So to rotate:

```bash
# 1. change the flag in lib/lab-scenarios/src/index.ts
# 2. re-seed the paired challenge's hash
DATABASE_URL=<target-db> pnpm --filter ./scripts run import-labs
```

Run the import **before** deploying a flag change: it stops the old flag being
accepted immediately, at the cost of the lab being unsolvable for the minute
until the deploy lands. Running it *after* the deploy leaves a window where the
target hands out a new flag the challenge still rejects.

Against production this is an **operator-run** step — the same human who runs the
deploy runs the import, with the production `DATABASE_URL`.

## The regression test

`scripts/src/check-labs.ts` loads each target's scripts against a fake DOM,
exploits the flaw, and asserts that (a) no document contains its own flag and
(b) the payload the document posts is exactly what the server's verifier
accepts. It caught a real production-only bug once: esbuild's `keepNames`
transform appends `__name(...)` calls after serialized functions, which threw in
the browser and turned every lab into a dead page. Run it after any change to
`lib/lab-scenarios`:

```bash
corepack pnpm --filter ./scripts run check-labs
```

## Container labs

`kind: "container"` labs need the Docker runner in `artifacts/lab-runner` on a
host that has Docker, wired via `LAB_RUNNER_URL` + `LAB_RUNNER_TOKEN`. Until that
exists, only browser labs are startable — the catalogue says so per lab rather
than showing one platform-wide "not available".
