import { Router, type Request, type RequestHandler } from "express";
import { db } from "@workspace/db";
import { competitionsTable, ctfTasksTable, modulesTable, usersTable } from "@workspace/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { siteOrigin } from "../lib/site-origin";

type Handler = RequestHandler<{ id: string }>;

/**
 * Server-rendered Open Graph tags for social-crawler link previews.
 *
 * The site is a static SPA, so a link shared on Telegram would only ever show
 * the one generic preview baked into index.html — every competition and profile
 * would look identical. Telegram, Facebook, X and the rest do not run
 * JavaScript, so the tags have to exist in the initial HTML.
 *
 * Vercel routes ONLY known crawler user-agents here (see vercel.json); humans
 * keep getting the real SPA. This returns a tiny HTML document that is nothing
 * but the preview a crawler reads, with a canonical link and a redirect so a
 * person who somehow lands here is sent to the real page.
 */
const router = Router();

/**
 * Both are derived per request — see lib/site-origin.ts. They used to be
 * module constants pinned to https://cdctf.uz, a domain that is not connected,
 * so every preview carried a dead click-through *and* a dead og:image.
 */
const defaultImage = (req: Request) => `${siteOrigin(req)}/logo.png`;

/** HTML-escapes a value for safe interpolation into attributes and text. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute URL for og:image — only https images are trusted; anything else
 * (including a relative upload path) falls back to the site logo. */
function safeImage(req: Request, url: string | null | undefined): string {
  if (!url) return defaultImage(req);
  return /^https:\/\//.test(url) ? url : defaultImage(req);
}

type Meta = { title: string; description: string; image: string; url: string };

function renderOgHtml(meta: Meta): string {
  const title = esc(meta.title);
  const description = esc(meta.description);
  const image = esc(meta.image);
  const url = esc(meta.url);
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${url}" />
<meta property="og:site_name" content="cdCTF" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<meta http-equiv="refresh" content="0; url=${url}" />
</head>
<body>
<p>Redirecting to <a href="${url}">${url}</a></p>
</body>
</html>`;
}

function sendOg(res: import("express").Response, meta: Meta) {
  // Short cache so a crawler re-scrape (and Telegram's cache-buster) sees fresh
  // data within a few minutes, without hammering the DB on every scrape.
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300, s-maxage=300");
  res.send(renderOgHtml(meta));
}

const competitionOg: Handler = async (req, res) => {
  const id = Number(req.params.id);
  // The same competition is reachable at two paths: the participant console at
  // /competitions/:id and the shareable poster at /e/:id. The canonical link —
  // and the redirect a human following the preview gets — has to match the one
  // that was actually shared, or a sponsor's audience lands on the console.
  const basePath = req.path.startsWith("/e/") || req.query.p === "e" ? "/e" : "/competitions";
  const url = `${siteOrigin(req)}${basePath}/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendOg(res, { title: "cdCTF", description: "Kiberxavfsizlik musobaqasi", image: defaultImage(req), url: `${siteOrigin(req)}/competitions` });
  }

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
  if (!comp) {
    return sendOg(res, { title: "cdCTF", description: "Musobaqa topilmadi", image: defaultImage(req), url });
  }

  // Build a preview that sells the event: sponsor and prize front and centre.
  const parts: string[] = [];
  if (comp.sponsorName) parts.push(`Homiy: ${comp.sponsorName}`);
  if (comp.prize) parts.push(`Sovrin: ${comp.prize}`);
  parts.push("cdCTF musobaqasi — hoziroq qatnashing.");

  sendOg(res, {
    title: `${comp.name} · cdCTF`,
    description: comp.description?.trim() || parts.join(" · "),
    image: safeImage(req, comp.sponsorLogoUrl),
    url,
  });
};

const profileOg: Handler = async (req, res) => {
  const id = Number(req.params.id);
  const url = `${siteOrigin(req)}/profile/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendOg(res, { title: "cdCTF", description: "Foydalanuvchi profili", image: defaultImage(req), url: `${siteOrigin(req)}/scoreboard` });
  }

  const [user] = await db
    .select({ nickname: usersTable.nickname, points: usersTable.points, avatarUrl: usersTable.avatarUrl, openToWork: usersTable.openToWork, role: usersTable.role, isBlocked: usersTable.isBlocked })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!user || user.isBlocked) {
    return sendOg(res, { title: "cdCTF", description: "Profil topilmadi", image: defaultImage(req), url });
  }

  const bits = [`${user.points} ball`];
  if (user.openToWork) bits.push("Ishga tayyor");
  sendOg(res, {
    title: `${user.nickname} · cdCTF`,
    description: `${bits.join(" · ")} — cdCTF kiberxavfsizlik akademiyasi.`,
    image: safeImage(req, user.avatarUrl),
    url,
  });
};

const talentOg: Handler = async (req, res) => {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user"), eq(usersTable.openToWork, true)));

  sendOg(res, {
    title: "cdCTF'dan yollash — kiberxavfsizlik iste'dodlari",
    description: `${total} ta ishga tayyor o'quvchi — haqiqatan yechgani bo'yicha saralangan. Profilni oching va bog'laning.`,
    image: defaultImage(req),
    url: `${siteOrigin(req)}/talent`,
  });
};

/** Local text with an Uzbek-first fallback — previews are written for Uzbekistan. */
const uz = (base: string, uzbek: string | null) => (uzbek?.trim() ? uzbek : base);

/** Trims a description to something a preview will not truncate mid-word. */
function summarise(text: string | null | undefined, fallback: string): string {
  const clean = String(text ?? "").replace(/[`*#>\[\]]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= 180) return clean;
  return clean.slice(0, 177).replace(/\s+\S*$/, "") + "…";
}

/**
 * The home page preview.
 *
 * index.html carries perfectly good OG tags — but they hardcode
 * https://cdctf.uz for og:url and og:image, so on the host the site actually
 * runs on, a shared home-page link had a broken image and a click-through to
 * nothing. Only *social* crawlers are routed here (see vercel.json); search
 * engines keep index.html, which has the full JSON-LD this stub does not.
 */
const siteOg: Handler = async (req, res) => {
  const [{ learners }] = await db
    .select({ learners: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user")));

  sendOg(res, {
    title: "cdCTF — kiberxavfsizlik akademiyasi va CTF platformasi",
    description: `O'zbek, rus va ingliz tillarida bepul: darslar, CTF topshiriqlari va tekshiriladigan sertifikat. ${learners} ta o'quvchi allaqachon boshlagan.`,
    image: defaultImage(req),
    url: `${siteOrigin(req)}/`,
  });
};

const challengeOg: Handler = async (req, res) => {
  const id = Number(req.params.id);
  const url = `${siteOrigin(req)}/ctf/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendOg(res, { title: "cdCTF", description: "CTF topshiriqlari", image: defaultImage(req), url: `${siteOrigin(req)}/ctf` });
  }

  const [task] = await db.select({
    name: ctfTasksTable.name, nameUz: ctfTasksTable.nameUz,
    description: ctfTasksTable.description, descriptionUz: ctfTasksTable.descriptionUz,
    category: ctfTasksTable.category, difficulty: ctfTasksTable.difficulty, points: ctfTasksTable.points,
  })
    .from(ctfTasksTable)
    .where(and(eq(ctfTasksTable.id, id), eq(ctfTasksTable.isPublished, true)))
    .limit(1);
  if (!task) return sendOg(res, { title: "cdCTF", description: "Topshiriq topilmadi", image: defaultImage(req), url });

  sendOg(res, {
    title: `${uz(task.name, task.nameUz)} · ${task.category} · cdCTF`,
    description: summarise(
      uz(task.description, task.descriptionUz),
      `${task.difficulty} · ${task.points} ball — cdCTF'da bepul yeching.`,
    ),
    image: defaultImage(req),
    url,
  });
};

const moduleOg: Handler = async (req, res) => {
  const id = Number(req.params.id);
  const url = `${siteOrigin(req)}/modules/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendOg(res, { title: "cdCTF", description: "O'quv modullari", image: defaultImage(req), url: `${siteOrigin(req)}/modules` });
  }

  const [mod] = await db.select({
    title: modulesTable.title, titleUz: modulesTable.titleUz,
    description: modulesTable.description, descriptionUz: modulesTable.descriptionUz,
    estimatedHours: modulesTable.estimatedHours,
  })
    .from(modulesTable)
    .where(and(eq(modulesTable.id, id), eq(modulesTable.isPublished, true)))
    .limit(1);
  if (!mod) return sendOg(res, { title: "cdCTF", description: "Modul topilmadi", image: defaultImage(req), url });

  sendOg(res, {
    title: `${uz(mod.title, mod.titleUz)} · cdCTF`,
    description: summarise(
      uz(mod.description, mod.descriptionUz),
      `~${mod.estimatedHours} soatlik modul — darslar, imtihon va sertifikat. Bepul.`,
    ),
    image: defaultImage(req),
    url,
  });
};

// Reachable directly for testing and for anything that wants the preview HTML.
router.get("/competition/:id", competitionOg);
router.get("/profile/:id", profileOg);
router.get("/talent", talentOg);
router.get("/challenge/:id", challengeOg);
router.get("/module/:id", moduleOg);

/**
 * The same handlers, mounted at the *public* paths.
 *
 * A rewrite destination in vercel.json has to be a real filesystem entry.
 * `/api/og/competition/:id` is not one — it only becomes the API function via
 * another rewrite, and Vercel does not chain rewrites — so those rules silently
 * fell through to index.html and every shared link showed the generic site
 * preview. Verified live before and after.
 *
 * So the crawler rules now rewrite to `/api/[...path]`, which preserves the
 * original URL, and these routes answer it. This Express app never serves the
 * SPA, so mounting them at the root cannot shadow a real page; in production
 * only the user-agent-matched rewrite sends traffic here at all.
 */
export const crawlerRouter = Router();
crawlerRouter.get("/competitions/:id", competitionOg);
crawlerRouter.get("/e/:id", competitionOg);
crawlerRouter.get("/profile/:id", profileOg);
crawlerRouter.get("/talent", talentOg);
crawlerRouter.get("/ctf/:id", challengeOg);
crawlerRouter.get("/modules/:id", moduleOg);
crawlerRouter.get("/", siteOg);

/**
 * robots.txt and sitemap.xml, generated rather than checked in.
 *
 * The static versions listed twelve hardcoded `https://cdctf.uz` URLs. That
 * domain is not connected, so the only thing ever submitted to a search engine
 * was a list of dead links — and it named modules 1–6 when there are eight, and
 * no challenges at all.
 *
 * Generated here they carry whichever origin the request came in on and only
 * contain rows that actually exist. No user-agent condition: these two are for
 * everyone.
 */
export const publicSeoRouter = Router();

publicSeoRouter.get("/robots.txt", (req, res) => {
  const origin = siteOrigin(req);
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(
    [
      "User-agent: *",
      "Allow: /",
      "",
      `Sitemap: ${origin}/sitemap.xml`,
      "",
      "# Personal or account-only areas.",
      "Disallow: /admin/",
      "Disallow: /dashboard",
      "Disallow: /settings/",
      "Disallow: /profile/edit",
      "Disallow: /login",
      "Disallow: /register",
      "Disallow: /verify-email",
      "Disallow: /reset-password",
      "# A credential is public so it can be checked, but it carries a real name.",
      "Disallow: /certificate/",
      "Disallow: /diploma/",
      "",
    ].join("\n"),
  );
});

publicSeoRouter.get("/sitemap.xml", async (req, res) => {
  const origin = siteOrigin(req);
  const entry = (path: string, changefreq: string, priority: string) =>
    `  <url>\n    <loc>${esc(origin + path)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const rows: string[] = [
    entry("/", "daily", "1.0"),
    entry("/start", "monthly", "0.9"),
    entry("/modules", "weekly", "0.9"),
    entry("/ctf", "daily", "0.9"),
    entry("/learn", "weekly", "0.8"),
    entry("/scoreboard", "daily", "0.7"),
    entry("/competitions", "weekly", "0.7"),
    entry("/labs", "monthly", "0.6"),
    entry("/talent", "weekly", "0.6"),
    entry("/jobs", "daily", "0.6"),
    entry("/impact", "weekly", "0.5"),
    entry("/verify", "monthly", "0.5"),
  ];

  const [modules, challenges] = await Promise.all([
    db.select({ id: modulesTable.id }).from(modulesTable)
      .where(eq(modulesTable.isPublished, true)).orderBy(asc(modulesTable.orderIndex)),
    db.select({ id: ctfTasksTable.id }).from(ctfTasksTable)
      .where(eq(ctfTasksTable.isPublished, true)).orderBy(asc(ctfTasksTable.id)),
  ]);
  for (const m of modules) rows.push(entry(`/modules/${m.id}`, "weekly", "0.8"));
  for (const c of challenges) rows.push(entry(`/ctf/${c.id}`, "monthly", "0.6"));

  res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`,
  );
});

export default router;
