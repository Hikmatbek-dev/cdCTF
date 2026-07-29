# cdCTF

A free, trilingual (Uzbek / Russian / English) cybersecurity academy and CTF platform for the Uzbek community — structured lessons, hands-on labs, CTF challenges, timed competitions, and publicly verifiable certificates.

Live: **cdctf.vercel.app** · Brand domain: **cdctf.uz**

> The repository folder is named `CyberPlace.uz` for historical reasons. The product is **cdCTF** everywhere in the UI, and the canonical domain is **cdctf.uz** — not cyberplace.uz.

---

## What's inside

| Area | Path | What it is |
|------|------|-----------|
| Web app | `artifacts/cyberplace` | React + Vite + Tailwind v4 SPA |
| API | `artifacts/api-server` | Express 5, bundled with esbuild; also runs serverless on Vercel |
| Lab runner | `artifacts/lab-runner` | Optional Docker runner for container labs (not required for browser labs) |
| Database | `lib/db` | Postgres schema + Drizzle ORM |
| API client | `lib/api-client-react` | Orval-generated TanStack Query hooks (do not hand-edit `src/generated`) |
| API spec / zod | `lib/api-spec`, `lib/api-zod` | OpenAPI source of truth + generated Zod validators |
| Lab scenarios | `lib/lab-scenarios` | The vulnerable browser labs. **Split on purpose** — see [docs/labs.md](docs/labs.md) |
| Scripts | `scripts` | Seeding, content import, the lab check |

---

## Getting started

Prerequisites: Node 20+ and `corepack` (ships with Node), Docker (for local Postgres), and pnpm via corepack.

```bash
# 1. Install
corepack pnpm install

# 2. Start Postgres (docker-compose.yml → postgres:15 on :5432, db "cyberplace")
docker compose up -d

# 3. Configure. Copy .env.example → .env and fill DATABASE_URL, JWT_SECRET,
#    TOTP_ENCRYPTION_KEY. In production the server refuses to start without them.
cp .env.example .env

# 4. Push the schema to the dev database
corepack pnpm --filter @workspace/db run push

# 5. (optional) Seed the browser labs and their paired challenges
DATABASE_URL=postgresql://postgres:password@localhost:5432/cyberplace \
  corepack pnpm --filter ./scripts run import-labs

# 6. Run everything (API on :8080, web on :7000, web proxies /api → :8080)
./run.sh
```

Or run the two halves separately:

```bash
corepack pnpm --filter @workspace/api-server run dev   # API, :8080
corepack pnpm --filter cyberplace run dev              # web, Vite
```

---

## Everyday commands

```bash
corepack pnpm run typecheck                        # every package, must be clean
corepack pnpm run lint                              # eslint on the app source
corepack pnpm run build                             # typecheck + build all packages
corepack pnpm --filter ./scripts run check-labs     # lab-security regression test
corepack pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks + zod from the OpenAPI spec
```

**After changing the OpenAPI spec** (`lib/api-spec`), run `codegen` — the frontend hooks and the server's Zod validators are generated, not hand-written.

---

## Architecture notes worth knowing before you touch things

- **i18n has no translation files.** Strings are inline `t(en, uz, ru)` calls (`artifacts/cyberplace/src/lib/LanguageContext.tsx`). Every user-facing string must be trilingual. Default language is Uzbek.
- **Design system.** Tokens and component classes live in `artifacts/cyberplace/src/index.css`: the palette (light by default, dark counterpart), an `h1`–`h6` type scale, layout classes (`.page`, `.shell`, `.shell-mid`, `.shell-narrow`), and component classes (`.glass-card`, `.cyber-button`, `.field`, `.chip`). Reach for these before hand-rolling Tailwind on a page. There is no `tailwind.config.js` — this is Tailwind v4.
- **Labs are server-authoritative.** The vulnerable document ships no flag; it posts the exploit payload to `POST /api/labs/solve`, the server re-runs the *same* engine the document ran (`lib/lab-scenarios/src/engines.ts`, one copy) and issues the flag only if the flaw was really exploited. The target route requires a per-instance token that stops working the moment the lab is stopped or expires. Full detail in [docs/labs.md](docs/labs.md).
- **Rotating a lab flag:** change it in `lib/lab-scenarios/src/index.ts`, then run `import-labs` so the paired challenge checks the new value.

---

## Deployment & operations

- **Deploy:** `npx vercel --prod`. Output is `artifacts/cyberplace/dist/public`; the API runs as a Vercel function via the `/api/(.*)` rewrite.
- **Never add a sub-daily cron to `vercel.json`.** On the Hobby plan that makes every build fail silently.
- **Vercel rewrites do not chain.** Crawler / OG / SEO rules must target `/api/[...path]`, not a friendlier path.
- **Production database & secrets are operator-run.** Schema pushes, the lab-flag rotation import, and secret changes are done by a human against production — not automatically.

---

## Security posture (short version)

- JWT auth; TOTP secrets encrypted at rest; passkeys/WebAuthn and OAuth supported.
- Rate limiting is Postgres-backed where the limit *is* the control (login, flag submit) and in-memory where it protects the process.
- Lab targets run in an opaque, sandboxed origin with a route-specific CSP; the solve endpoint is the only thing they may talk to.
- The strict CSP is set in `vercel.json` and the API's `securityHeaders` middleware.

See `docs/` for deeper notes.
