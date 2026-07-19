# CyberPlace

A full-stack cybersecurity learning & CTF platform for the Uzbek community — like HackTheBox/TryHackMe, but built locally. Solve CTF challenges, study structured lessons, compete in monthly tournaments, and climb the scoreboard.

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

- **CTF Challenges** — 8 seeded challenges across Web, Crypto, Steganography, Pwn, Forensics, OSINT, Reverse categories
- **Learn** — 5 lessons across 5 categories with 5-question tests; anti-cheat fullscreen enforcement
- **Scoreboard** — ranked by points, shows CTF solves, titles, and lesson completions
- **Competitions** — monthly events; admin creates them and assigns CTF tasks
- **Admin Panel** — `/admin/*` — full CRUD for users, CTFs, lessons, competitions; blocked users management
- **Profile** — avatar upload, edit nickname/email, view earned titles

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
