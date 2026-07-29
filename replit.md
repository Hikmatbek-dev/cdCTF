# cdCTF

A full-stack cybersecurity learning & CTF platform for the Uzbek community — like HackTheBox/TryHackMe, but built locally and free. Solve CTF challenges, study structured lessons, break into hands-on labs, compete in timed events, and climb the scoreboard.

Brand: **cdCTF**. Canonical domain: **cdctf.uz** (the repo folder is named "CyberPlace.uz" for historical reasons — the product is cdCTF everywhere).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/cyberplace run dev` — run the frontend (proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: see `.env.example`. `DATABASE_URL`, `JWT_SECRET` and `TOTP_ENCRYPTION_KEY`
  are required in production; the server refuses to start without them.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken + bcryptjs)
- File upload: multer (avatar uploads)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- i18n: 3 languages — EN / UZ / RU (LanguageContext)
- Theme: dark/light (ThemeContext)

## Where things live

- `artifacts/cyberplace/` — React frontend (Vite)
- `artifacts/api-server/` — Express API server
- `artifacts/api-server/src/routes/` — all route files (auth, ctf, learn, scoreboard, competitions, users, admin)
- `artifacts/api-server/src/middleware/auth.ts` — JWT middleware (authenticateToken, requireAdmin, optionalAuth)
- `lib/db/src/schema/` — Drizzle schema: users, ctf, learn, titles, competitions
- `lib/api-spec/` — OpenAPI spec + Orval codegen
- `lib/api-client-react/` — generated React Query hooks (import from `@workspace/api-client-react`)
- `artifacts/cyberplace/src/context/` — AuthContext, LanguageContext, ThemeContext
- `artifacts/cyberplace/src/components/` — Navbar, AdminSidebar, DifficultyBadge

## Architecture decisions

- **No zod/v4 in backend** — esbuild cannot resolve the `zod/v4` subpath; use plain JS validation or `zod` (not `/v4`) in Express routes.
- **Contract-first API** — OpenAPI spec drives codegen; frontend uses generated React Query hooks everywhere.
- **JWT auth** — httpOnly cookie, signed with `JWT_SECRET`. Each token carries a `jti`
  backed by a `user_sessions` row, so tokens can actually be revoked; the role and
  blocked flag are re-read from the database on every request.
- **Roles** — `user` / `author` / `moderator` / `admin`, set via `PATCH /api/admin/users/:id/role`.
  Routes ask for a named permission, not a role — see `artifacts/api-server/src/lib/permissions.ts`.
- **Anti-cheat** — Lesson tests require fullscreen; 3 ESC key presses = lesson blocked (admin must unblock).
  Submissions are deduplicated per question server-side — scoring the raw answer array
  let a client send every option and score 100%.
- **Flag validation** — 3 wrong CTF flag attempts = user blocked from that challenge (admin unblocks).
- **Titles** — Awarded after 3 CTF solves in a category (Kriptograf, Web Hacker, etc.).
  All scoring goes through `artifacts/api-server/src/lib/scoring.ts` — one implementation.
- **Scoring exclusions** — `users.excluded_from_scoring`, not a hardcoded nickname.

## Product

- **Learn** — 8 modules / ~165 lessons, each with a copy-runnable command and a short test; a final module exam issues a verifiable certificate at 80%+
- **CTF Challenges** — dozens across Web, Crypto, Steganography, Pwn, Forensics, OSINT, Reverse and more, each with generated category cover art
- **Labs** — deliberately vulnerable browser targets (SQLi, XSS, IDOR, cookie-role, path traversal). Each runs in the learner's own tab under a per-instance token; the flag is issued by the server only once the exploit is proven. See `lib/lab-scenarios` and `docs/labs.md`.
- **Scoreboard** — ranked by points; shows CTF solves, titles, and lesson completions
- **Competitions** — timed events; an admin creates them and assigns CTF tasks
- **Careers** — a job board and an opt-in talent directory (learners who turn on "Open to work")
- **Admin Panel** — `/admin/*` — full CRUD for users, CTFs, lessons, competitions; blocked-user management
- **Profile** — avatar upload, edit nickname/email, view earned titles

> Content counts move as the catalogue grows — the numbers rendered in the app come from the live API, not from this file. Treat any count here as illustrative.

## User preferences

- Admin sign-in redirects to /admin/dashboard. Credentials live in your password
  manager, never in this file — anything written here is in the git history forever.
- Footer: Telegram + Instagram links, "Founders: Bozkurtuzb & Shadow"
- Flag format: `Flag{...}`
- 3 languages: EN / UZ / RU (toggleable in navbar)
- Dark/light mode toggle in navbar

## Gotchas

- **Do NOT use `zod/v4` in backend routes** — use plain validation or regular `zod`.
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec.
- Seed script: run SQL directly with `psql "$DATABASE_URL"` or call admin API endpoints.
- The `scripts/` package cannot import `@workspace/*` packages without adding them as dependencies first.
- API routes must handle their full base path (`/api/...`) — the proxy does NOT rewrite paths.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- API server uses pino logger — never use `console.log` in routes; use `req.log` or the `logger` singleton
