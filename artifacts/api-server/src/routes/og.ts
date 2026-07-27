import { Router, type RequestHandler } from "express";

type Handler = RequestHandler<{ id: string }>;
import { db } from "@workspace/db";
import { competitionsTable, usersTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

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

const SITE_ORIGIN = (process.env.PUBLIC_ORIGIN || "https://cdctf.uz").replace(/\/$/, "");
const DEFAULT_IMAGE = `${SITE_ORIGIN}/logo.png`;

/** HTML-escapes a value for safe interpolation into attributes and text. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute URL for og:image — only same-origin or https images are trusted. */
function safeImage(url: string | null | undefined): string {
  if (!url) return DEFAULT_IMAGE;
  return /^https:\/\//.test(url) ? url : DEFAULT_IMAGE;
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
  const url = `${SITE_ORIGIN}${basePath}/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendOg(res, { title: "cdCTF", description: "Kiberxavfsizlik musobaqasi", image: DEFAULT_IMAGE, url: `${SITE_ORIGIN}/competitions` });
  }

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
  if (!comp) {
    return sendOg(res, { title: "cdCTF", description: "Musobaqa topilmadi", image: DEFAULT_IMAGE, url });
  }

  // Build a preview that sells the event: sponsor and prize front and centre.
  const parts: string[] = [];
  if (comp.sponsorName) parts.push(`Homiy: ${comp.sponsorName}`);
  if (comp.prize) parts.push(`Sovrin: ${comp.prize}`);
  parts.push("cdCTF musobaqasi — hoziroq qatnashing.");

  sendOg(res, {
    title: `${comp.name} · cdCTF`,
    description: comp.description?.trim() || parts.join(" · "),
    image: safeImage(comp.sponsorLogoUrl),
    url,
  });
};

const profileOg: Handler = async (req, res) => {
  const id = Number(req.params.id);
  const url = `${SITE_ORIGIN}/profile/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendOg(res, { title: "cdCTF", description: "Foydalanuvchi profili", image: DEFAULT_IMAGE, url: `${SITE_ORIGIN}/scoreboard` });
  }

  const [user] = await db
    .select({ nickname: usersTable.nickname, points: usersTable.points, avatarUrl: usersTable.avatarUrl, openToWork: usersTable.openToWork, role: usersTable.role, isBlocked: usersTable.isBlocked })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!user || user.isBlocked) {
    return sendOg(res, { title: "cdCTF", description: "Profil topilmadi", image: DEFAULT_IMAGE, url });
  }

  const bits = [`${user.points} ball`];
  if (user.openToWork) bits.push("Ishga tayyor");
  sendOg(res, {
    title: `${user.nickname} · cdCTF`,
    description: `${bits.join(" · ")} — cdCTF kiberxavfsizlik akademiyasi.`,
    image: safeImage(user.avatarUrl),
    url,
  });
};

const talentOg: Handler = async (_req, res) => {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user"), eq(usersTable.openToWork, true)));

  sendOg(res, {
    title: "cdCTF'dan yollash — kiberxavfsizlik iste'dodlari",
    description: `${total} ta ishga tayyor o'quvchi — haqiqatan yechgani bo'yicha saralangan. Profilni oching va bog'laning.`,
    image: DEFAULT_IMAGE,
    url: `${SITE_ORIGIN}/talent`,
  });
};

// Reachable directly for testing and for anything that wants the preview HTML.
router.get("/competition/:id", competitionOg);
router.get("/profile/:id", profileOg);
router.get("/talent", talentOg);

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

export default router;
