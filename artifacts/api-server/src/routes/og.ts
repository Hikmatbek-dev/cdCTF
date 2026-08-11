import { Router, type Request, type RequestHandler } from "express";
import { db } from "@workspace/db";
import { competitionsTable, ctfTasksTable, modulesTable, pathsTable, usersTable } from "@workspace/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { siteOrigin } from "../lib/site-origin";

type Handler = RequestHandler<{ id: string }>;

/**
 * Server-rendered pages for crawlers — social link previews AND search engines.
 *
 * The site is a client-rendered SPA, so the only HTML in the initial response
 * for a deep page (a module, a challenge, the CTF hub) is the generic index.html
 * shell. Social crawlers (Telegram, Facebook, X) never run JavaScript, so a
 * shared link showed one identical preview everywhere. Search crawlers are worse
 * off: Googlebot renders JS eventually, but Yandex — the engine that matters for
 * Uzbekistan and the CIS — barely does, so it indexed an empty shell.
 *
 * Vercel routes ONLY known crawler user-agents here (see vercel.json); humans
 * keep getting the real SPA. What we return is a complete, self-contained HTML
 * document: the Open Graph tags a link unfurler reads, AND real, readable body
 * content with a heading, a description, key facts and internal links — the
 * thing a search engine actually indexes and follows. A guarded script bounces
 * any human who somehow lands here to the real page, without ever bouncing a
 * crawler (which would strip the content we just rendered for it).
 */
const router = Router();

/**
 * Both are derived per request — see lib/site-origin.ts. They used to be
 * module constants pinned to https://cdctf.uz, a domain that is not connected,
 * so every preview carried a dead click-through *and* a dead og:image.
 */
const defaultImage = (req: Request) => `${siteOrigin(req)}/og.png`;

/** HTML-escapes a value for safe interpolation into attributes and text. */
function esc(value: unknown): string {
  const str = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute URL for og:image — only https images are trusted; anything else
 * (including a relative upload path) falls back to the site card. */
function safeImage(req: Request, url: string | null | undefined): string {
  if (!url) return defaultImage(req);
  return /^https:\/\//.test(url) ? url : defaultImage(req);
}

type Link = { href: string; label: string };
type Meta = {
  title: string;
  description: string;
  image: string;
  url: string;
  origin: string;
  /** Visible <h1>; defaults to the title with the " · cdCTF" suffix trimmed. */
  heading?: string;
  /** Intro paragraphs rendered above the fold. */
  intro?: string[];
  /** Short fact chips ("Boshlang'ich · 40 soat · Bepul"). */
  facts?: string[];
  /** Internal links a crawler follows to discover the rest of the site. */
  links?: Link[];
  /** Optional schema.org objects merged into the page's JSON-LD graph. */
  jsonLd?: unknown[];
  /** Breadcrumb trail for a BreadcrumbList and a visible nav. */
  breadcrumb?: { name: string; path: string }[];
};

/** Every page links back to the main hubs, so a crawler that lands anywhere can
 * reach the whole site without JavaScript. */
function siteNav(origin: string): Link[] {
  return [
    { href: `${origin}/modules`, label: "Modullar" },
    { href: `${origin}/learn`, label: "Darslar" },
    { href: `${origin}/ctf`, label: "CTF topshiriqlar" },
    { href: `${origin}/competitions`, label: "Musobaqalar" },
    { href: `${origin}/scoreboard`, label: "Reyting" },
    { href: `${origin}/glossary`, label: "Lug'at" },
  ];
}

function renderPage(meta: Meta): string {
  const title = esc(meta.title);
  const description = esc(meta.description);
  const image = esc(meta.image);
  const url = esc(meta.url);
  const heading = esc(meta.heading ?? meta.title.replace(/\s*[·|]\s*cdCTF\s*$/i, ""));

  const graph: unknown[] = [
    {
      "@type": "WebPage",
      "@id": `${meta.url}#webpage`,
      url: meta.url,
      name: meta.title,
      description: meta.description,
      inLanguage: ["uz", "ru", "en"],
      isPartOf: { "@type": "WebSite", name: "cdCTF", url: `${meta.origin}/` },
    },
    ...(meta.breadcrumb && meta.breadcrumb.length
      ? [{
          "@type": "BreadcrumbList",
          itemListElement: meta.breadcrumb.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: b.name,
            item: `${meta.origin}${b.path}`,
          })),
        }]
      : []),
    ...(meta.jsonLd ?? []),
  ];
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });

  const intro = (meta.intro ?? [meta.description])
    .map(p => `<p>${esc(p)}</p>`)
    .join("\n");
  const facts = meta.facts && meta.facts.length
    ? `<ul class="facts">${meta.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>`
    : "";
  const crumbs = meta.breadcrumb && meta.breadcrumb.length
    ? `<nav class="crumbs">${meta.breadcrumb.map(b => `<a href="${esc(meta.origin + b.path)}">${esc(b.name)}</a>`).join(" › ")}</nav>`
    : "";
  const links = (meta.links && meta.links.length ? meta.links : siteNav(meta.origin))
    .map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)
    .join("\n");

  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<link rel="canonical" href="${url}" />
<link rel="alternate" hreflang="uz" href="${url}" />
<link rel="alternate" hreflang="ru" href="${url}" />
<link rel="alternate" hreflang="en" href="${url}" />
<link rel="alternate" hreflang="x-default" href="${url}" />
<meta property="og:site_name" content="cdCTF" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta property="og:locale" content="uz_UZ" />
<meta property="og:locale:alternate" content="ru_RU" />
<meta property="og:locale:alternate" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<main>
${crumbs}
<h1>${heading}</h1>
${intro}
${facts}
<h2>cdCTF bo'ylab</h2>
<ul class="nav">
${links}
</ul>
<p><a href="${url}">cdCTF'da ochish →</a></p>
</main>
<script>
/* Bounce a human who reached this crawler-only page to the real SPA. The
   user-agent guard makes sure a JS-running search crawler (Googlebot) is NEVER
   redirected — it keeps the content above, which is the whole point. */
(function(){try{var u=navigator.userAgent||"";if(!/bot|crawl|spider|slurp|bing|yandex|google|duckduck|baidu|facebook|telegram|twitter|whatsapp|slack|discord|linkedin|embed|preview|petal|bytespider|gptbot|perplexity/i.test(u)){location.replace(${JSON.stringify(meta.url)});}}catch(e){}})();
</script>
</body>
</html>`;
}

function sendPage(res: import("express").Response, meta: Meta, maxAge = 300) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", `public, max-age=${maxAge}, s-maxage=${maxAge}`);
  res.send(renderPage(meta));
}

/** Local text with an Uzbek-first fallback — previews are written for Uzbekistan. */
const uz = (base: string, uzbek: string | null) => (uzbek?.trim() ? uzbek : base);

/** Trims a description to something a preview will not truncate mid-word. */
function summarise(text: string | null | undefined, fallback: string): string {
  const clean = String(text ?? "").replace(/[`*#>\[\]]/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= 180) return clean;
  return clean.slice(0, 177).replace(/\s+\S*$/, "") + "…";
}

// ------------------------------------------------------------------ details

const competitionOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  const id = Number(req.params.id);
  // The same competition is reachable at two paths: the participant console at
  // /competitions/:id and the shareable poster at /e/:id. The canonical link —
  // and the redirect a human following the preview gets — has to match the one
  // that was actually shared, or a sponsor's audience lands on the console.
  const basePath = req.path.startsWith("/e/") || req.query.p === "e" ? "/e" : "/competitions";
  const url = `${origin}${basePath}/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendPage(res, { origin, title: "cdCTF", description: "Kiberxavfsizlik musobaqasi", image: defaultImage(req), url: `${origin}/competitions` });
  }

  const [comp] = await db.select().from(competitionsTable).where(eq(competitionsTable.id, id)).limit(1);
  if (!comp) {
    return sendPage(res, { origin, title: "cdCTF", description: "Musobaqa topilmadi", image: defaultImage(req), url });
  }

  const parts: string[] = [];
  if (comp.sponsorName) parts.push(`Homiy: ${comp.sponsorName}`);
  if (comp.prize) parts.push(`Sovrin: ${comp.prize}`);
  parts.push("cdCTF musobaqasi — hoziroq qatnashing.");
  const description = comp.description?.trim() || parts.join(" · ");

  sendPage(res, {
    origin,
    title: `${comp.name} · cdCTF`,
    description,
    image: safeImage(req, comp.sponsorLogoUrl),
    url,
    facts: parts,
    breadcrumb: [
      { name: "cdCTF", path: "/" },
      { name: "Musobaqalar", path: "/competitions" },
      { name: comp.name, path: `${basePath}/${id}` },
    ],
    links: [
      { href: `${origin}/competitions`, label: "Barcha musobaqalar" },
      { href: `${origin}/ctf`, label: "CTF topshiriqlar" },
    ],
    jsonLd: [{
      "@type": "Event",
      name: comp.name,
      description,
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      organizer: { "@type": "Organization", name: "cdCTF", url: `${origin}/` },
    }],
  });
};

const profileOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  const id = Number(req.params.id);
  const url = `${origin}/profile/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendPage(res, { origin, title: "cdCTF", description: "Foydalanuvchi profili", image: defaultImage(req), url: `${origin}/scoreboard` });
  }

  const [user] = await db
    .select({ nickname: usersTable.nickname, points: usersTable.points, avatarUrl: usersTable.avatarUrl, openToWork: usersTable.openToWork, role: usersTable.role, isBlocked: usersTable.isBlocked })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!user || user.isBlocked) {
    return sendPage(res, { origin, title: "cdCTF", description: "Profil topilmadi", image: defaultImage(req), url });
  }

  const bits = [`${user.points} ball`];
  if (user.openToWork) bits.push("Ishga tayyor");
  sendPage(res, {
    origin,
    title: `${user.nickname} · cdCTF`,
    description: `${bits.join(" · ")} — cdCTF kiberxavfsizlik akademiyasi.`,
    image: safeImage(req, user.avatarUrl),
    url,
    facts: bits,
    links: [{ href: `${origin}/scoreboard`, label: "Reyting" }, { href: `${origin}/talent`, label: "Iste'dodlar" }],
  });
};

const challengeOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  const id = Number(req.params.id);
  const url = `${origin}/ctf/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendPage(res, { origin, title: "cdCTF", description: "CTF topshiriqlari", image: defaultImage(req), url: `${origin}/ctf` });
  }

  const [task] = await db.select({
    name: ctfTasksTable.name, nameUz: ctfTasksTable.nameUz,
    description: ctfTasksTable.description, descriptionUz: ctfTasksTable.descriptionUz,
    category: ctfTasksTable.category, difficulty: ctfTasksTable.difficulty, points: ctfTasksTable.points,
  })
    .from(ctfTasksTable)
    .where(and(eq(ctfTasksTable.id, id), eq(ctfTasksTable.isPublished, true)))
    .limit(1);
  if (!task) return sendPage(res, { origin, title: "cdCTF", description: "Topshiriq topilmadi", image: defaultImage(req), url });

  const name = uz(task.name, task.nameUz);
  const description = summarise(uz(task.description, task.descriptionUz), `${task.difficulty} · ${task.points} ball — cdCTF'da bepul yeching.`);
  sendPage(res, {
    origin,
    title: `${name} · ${task.category} · cdCTF`,
    description,
    image: defaultImage(req),
    url,
    heading: name,
    facts: [`Kategoriya: ${task.category}`, `Daraja: ${task.difficulty}`, `${task.points} ball`, "Bepul"],
    breadcrumb: [
      { name: "cdCTF", path: "/" },
      { name: "CTF", path: "/ctf" },
      { name, path: `/ctf/${id}` },
    ],
    links: [{ href: `${origin}/ctf`, label: "Barcha topshiriqlar" }, { href: `${origin}/modules`, label: "O'quv modullari" }],
    jsonLd: [{
      "@type": "LearningResource",
      name,
      description,
      learningResourceType: "CTF challenge",
      educationalLevel: task.difficulty,
      inLanguage: ["uz", "ru", "en"],
      isAccessibleForFree: true,
      provider: { "@type": "Organization", name: "cdCTF", url: `${origin}/` },
    }],
  });
};

const moduleOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  const id = Number(req.params.id);
  const url = `${origin}/modules/${Number.isInteger(id) ? id : ""}`;
  if (!Number.isInteger(id) || id <= 0) {
    return sendPage(res, { origin, title: "cdCTF", description: "O'quv modullari", image: defaultImage(req), url: `${origin}/modules` });
  }

  const [mod] = await db.select({
    title: modulesTable.title, titleUz: modulesTable.titleUz,
    description: modulesTable.description, descriptionUz: modulesTable.descriptionUz,
    estimatedHours: modulesTable.estimatedHours, difficulty: modulesTable.difficulty,
  })
    .from(modulesTable)
    .where(and(eq(modulesTable.id, id), eq(modulesTable.isPublished, true)))
    .limit(1);
  if (!mod) return sendPage(res, { origin, title: "cdCTF", description: "Modul topilmadi", image: defaultImage(req), url });

  const name = uz(mod.title, mod.titleUz);
  const description = summarise(uz(mod.description, mod.descriptionUz), `~${mod.estimatedHours} soatlik modul — darslar, imtihon va sertifikat. Bepul.`);
  sendPage(res, {
    origin,
    title: `${name} · cdCTF`,
    description,
    image: defaultImage(req),
    url,
    heading: name,
    facts: [`Daraja: ${mod.difficulty}`, `~${mod.estimatedHours} soat`, "Darslar + imtihon", "Sertifikat", "Bepul"],
    breadcrumb: [
      { name: "cdCTF", path: "/" },
      { name: "Modullar", path: "/modules" },
      { name, path: `/modules/${id}` },
    ],
    links: [{ href: `${origin}/modules`, label: "Barcha modullar" }, { href: `${origin}/learn`, label: "Darslar" }],
    jsonLd: [{
      "@type": "Course",
      name,
      description,
      inLanguage: ["uz", "ru", "en"],
      isAccessibleForFree: true,
      educationalLevel: mod.difficulty,
      provider: { "@type": "Organization", name: "cdCTF", url: `${origin}/` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", category: "Free" },
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${mod.estimatedHours || 40}H` },
    }],
  });
};

// -------------------------------------------------------------------- hubs

const talentOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  let total = 0;
  try {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user"), eq(usersTable.openToWork, true)));
    total = row?.total ?? 0;
  } catch { /* fall back to generic copy */ }

  sendPage(res, {
    origin,
    title: "cdCTF'dan yollash — kiberxavfsizlik iste'dodlari",
    description: `${total} ta ishga tayyor o'quvchi — haqiqatan yechgani bo'yicha saralangan. Profilni oching va bog'laning.`,
    image: defaultImage(req),
    url: `${origin}/talent`,
    heading: "Kiberxavfsizlik iste'dodlarini yollash",
    intro: ["cdCTF o'quvchilari — CV emas, haqiqatan yechgan topshiriqlari bo'yicha saralangan. Ish beruvchilar shu yerdan mos nomzod topadi."],
    facts: [`${total} ta ishga tayyor nomzod`],
    breadcrumb: [{ name: "cdCTF", path: "/" }, { name: "Yollash", path: "/talent" }],
    links: [{ href: `${origin}/jobs`, label: "Vakansiyalar" }, { href: `${origin}/scoreboard`, label: "Reyting" }],
  });
};

const ctfHubOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  let links: Link[] = [];
  try {
    const rows = await db.select({ id: ctfTasksTable.id, name: ctfTasksTable.name, nameUz: ctfTasksTable.nameUz, category: ctfTasksTable.category })
      .from(ctfTasksTable).where(eq(ctfTasksTable.isPublished, true)).orderBy(desc(ctfTasksTable.id)).limit(60);
    links = rows.map(r => ({ href: `${origin}/ctf/${r.id}`, label: `${uz(r.name, r.nameUz)} · ${r.category}` }));
  } catch { /* generic */ }
  sendPage(res, {
    origin,
    title: "CTF topshiriqlari va kiberxavfsizlik lablar | cdCTF",
    description: "cdCTF'dagi CTF topshiriqlarini bepul yeching — Web, Crypto, Forensics, OSINT, Pwn va boshqalar. Hakkerlik mahoratingizni amaliyotda oshiring.",
    image: defaultImage(req),
    url: `${origin}/ctf`,
    heading: "CTF topshiriqlari",
    intro: ["Web xavfsizlik, kriptografiya, forensika, OSINT va ekspluatatsiya bo'yicha amaliy CTF topshiriqlar. Har biri jonli tekshiriladi va bepul."],
    breadcrumb: [{ name: "cdCTF", path: "/" }, { name: "CTF", path: "/ctf" }],
    links: links.length ? links : siteNav(origin),
    jsonLd: [{ "@type": "CollectionPage", name: "CTF topshiriqlari", url: `${origin}/ctf` }],
  });
};

const modulesHubOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  let links: Link[] = [];
  try {
    const rows = await db.select({ id: modulesTable.id, title: modulesTable.title, titleUz: modulesTable.titleUz })
      .from(modulesTable).where(eq(modulesTable.isPublished, true)).orderBy(asc(modulesTable.orderIndex)).limit(60);
    links = rows.map(r => ({ href: `${origin}/modules/${r.id}`, label: uz(r.title, r.titleUz) }));
  } catch { /* generic */ }
  sendPage(res, {
    origin,
    title: "Kiberxavfsizlik o'quv modullari va o'quv reja | cdCTF",
    description: "cdCTF'da noldan mutaxassisgacha: Linux, tarmoq, veb xavfsizlik, kriptografiya, razvedka va ekspluatatsiya bo'yicha modullar. Bepul, uch tilda, sertifikat bilan.",
    image: defaultImage(req),
    url: `${origin}/modules`,
    heading: "O'quv modullari",
    intro: ["Bosqichma-bosqich o'quv reja: har modul darslar, imtihon va amaliy topshiriqlardan iborat. O'zbek, rus va ingliz tillarida, o'quvchilar uchun bepul."],
    breadcrumb: [{ name: "cdCTF", path: "/" }, { name: "Modullar", path: "/modules" }],
    links: links.length ? links : siteNav(origin),
    jsonLd: [{ "@type": "CollectionPage", name: "O'quv modullari", url: `${origin}/modules` }],
  });
};

const learnHubOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  const links: Link[] = [];
  try {
    const paths = await db.select({ slug: pathsTable.slug, title: pathsTable.title, titleUz: pathsTable.titleUz })
      .from(pathsTable).where(eq(pathsTable.isPublished, true)).orderBy(asc(pathsTable.orderIndex)).limit(30);
    for (const p of paths) links.push({ href: `${origin}/paths/${p.slug}`, label: uz(p.title, p.titleUz) });
    const mods = await db.select({ id: modulesTable.id, title: modulesTable.title, titleUz: modulesTable.titleUz })
      .from(modulesTable).where(eq(modulesTable.isPublished, true)).orderBy(asc(modulesTable.orderIndex)).limit(40);
    for (const m of mods) links.push({ href: `${origin}/modules/${m.id}`, label: uz(m.title, m.titleUz) });
  } catch { /* generic */ }
  sendPage(res, {
    origin,
    title: "Kiberxavfsizlik darslari va o'quv yo'llari | cdCTF",
    description: "cdCTF o'rganish markazi: o'quv yo'llari (paths), modullar, walkthrough'lar va so'nggi tahdidlar. TryHackMe uslubida, o'zbek tilida, bepul.",
    image: defaultImage(req),
    url: `${origin}/learn`,
    heading: "O'rganish markazi",
    intro: ["O'quv yo'llari, modullar va amaliy darslar — birma-bir tanlab yoki tayyor yo'l bo'yicha o'rganing. Barchasi bepul va uch tilda."],
    breadcrumb: [{ name: "cdCTF", path: "/" }, { name: "O'rganish", path: "/learn" }],
    links: links.length ? links : siteNav(origin),
    jsonLd: [{ "@type": "CollectionPage", name: "O'rganish markazi", url: `${origin}/learn` }],
  });
};

const competitionsHubOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  sendPage(res, {
    origin,
    title: "CTF musobaqalari va hackathonlar | cdCTF",
    description: "cdCTF'dagi vaqtli CTF musobaqalari — jamoaviy va yakka. Ro'yxatdan o'ting, yeching va jonli reytingda ko'tariling. Homiyli tadbirlar.",
    image: defaultImage(req),
    url: `${origin}/competitions`,
    heading: "Musobaqalar",
    intro: ["Vaqtli CTF musobaqalari — jamoaviy va yakka rejimlar, jonli reyting, sovrinlar. Kelayotgan tadbirlar uchun kuzatib boring."],
    breadcrumb: [{ name: "cdCTF", path: "/" }, { name: "Musobaqalar", path: "/competitions" }],
  });
};

const scoreboardHubOg: Handler = async (req, res) => {
  const origin = siteOrigin(req);
  let links: Link[] = [];
  try {
    const top = await db.select({ id: usersTable.id, nickname: usersTable.nickname, points: usersTable.points })
      .from(usersTable).where(and(eq(usersTable.isBlocked, false), eq(usersTable.role, "user")))
      .orderBy(desc(usersTable.points)).limit(30);
    links = top.map(u => ({ href: `${origin}/profile/${u.id}`, label: `${u.nickname} — ${u.points} ball` }));
  } catch { /* generic */ }
  sendPage(res, {
    origin,
    title: "Reyting — O'zbekistonning eng kuchli hackerlari | cdCTF",
    description: "cdCTF global reytingi: eng ko'p ball to'plagan o'quvchilar va unvonlar. O'zbekistondagi kiberxavfsizlik iste'dodlari bir joyda.",
    image: defaultImage(req),
    url: `${origin}/scoreboard`,
    heading: "Reyting",
    intro: ["Yechilgan topshiriqlar bo'yicha to'plangan ball asosidagi jonli reyting. Eng kuchli o'quvchilarni ko'ring va o'zingizni sinang."],
    breadcrumb: [{ name: "cdCTF", path: "/" }, { name: "Reyting", path: "/scoreboard" }],
    links: links.length ? links : siteNav(origin),
  });
};

/** Simple content pages that have no per-row list to enumerate. */
function staticHub(path: string, title: string, description: string, heading: string, intro: string, crumb: string): Handler {
  return (req, res) => {
    const origin = siteOrigin(req);
    sendPage(res, {
      origin, title, description, image: defaultImage(req), url: `${origin}${path}`,
      heading, intro: [intro],
      breadcrumb: [{ name: "cdCTF", path: "/" }, { name: crumb, path }],
    });
  };
}

const labsOg = staticHub("/labs", "Amaliy laboratoriyalar | cdCTF",
  "Bir bosishda ishga tushadigan izolyatsiyalangan mashinalar — xavfsiz muhitda amaliy hujum va himoya mashqlari.",
  "Amaliy laboratoriyalar", "Bir bosishda ishga tushadigan izolyatsiyalangan mashinalar. Real muhitda, xavfsiz tarzda hujum va himoyani mashq qiling.", "Laboratoriyalar");

const jobsOg = staticHub("/jobs", "O'zbekistonda kiberxavfsizlik vakansiyalari | cdCTF",
  "Ish beruvchilar joylagan ochiq kiberxavfsizlik vakansiyalari va ularga mos o'quvchilar. Iste'dod va ish bir platformada.",
  "Kiberxavfsizlik vakansiyalari", "Ochiq vakansiyalar va ularga mos, isbotlangan ko'nikmali nomzodlar. cdCTF learn-to-hire ko'prigi.", "Vakansiyalar");

const impactOg = staticHub("/impact", "cdCTF raqamlarda — ta'sir | cdCTF",
  "Jonli statistika: o'quvchilar, darslar, yechilgan topshiriqlar va berilgan sertifikatlar. Hech narsa taxminiy emas.",
  "cdCTF raqamlarda", "O'quvchilar soni, tugatilgan darslar, yechilgan topshiriqlar va berilgan sertifikatlar — barchasi jonli va haqiqiy.", "Ta'sir");

const startOg = staticHub("/start", "Shu yerdan boshlang — birinchi darsingiz | cdCTF",
  "Ikki savol va o'rganish boshlanadi: qayerdan boshlayotganingiz va maqsadingizni ayting, cdCTF kerakli birinchi darsni ochadi.",
  "Shu yerdan boshlang", "Kiberxavfsizlikni noldan boshlaysizmi? Ikki savolga javob bering — cdCTF sizga mos birinchi darsni tanlab beradi.", "Boshlash");

const glossaryOg = staticHub("/glossary", "Kiberxavfsizlik lug'ati | cdCTF",
  "Kiberxavfsizlik va hakkerlik atamalarining o'zbekcha izohli lug'ati — XSS, SQL injection, reverse shell, nmap va boshqalar.",
  "Kiberxavfsizlik lug'ati", "Kiberxavfsizlik va hakkerlik atamalari o'zbek tilida izohlangan — yangi boshlovchilar uchun ham, tajribalilar uchun ham.", "Lug'at");

// Reachable directly for testing.
router.get("/competition/:id", competitionOg);
router.get("/profile/:id", profileOg);
router.get("/talent", talentOg);
router.get("/challenge/:id", challengeOg);
router.get("/module/:id", moduleOg);

/**
 * The same handlers, mounted at the *public* paths.
 *
 * A rewrite destination in vercel.json has to be a real filesystem entry.
 * `/api/og/…` is not one, and Vercel does not chain rewrites, so the crawler
 * rules rewrite to `/api/[...path]`, which preserves the original URL, and these
 * routes answer it. This Express app never serves the SPA, so mounting them at
 * the root cannot shadow a real page; in production only the user-agent-matched
 * rewrite sends traffic here at all.
 */
export const crawlerRouter = Router();
// Detail pages.
crawlerRouter.get("/competitions/:id", competitionOg);
crawlerRouter.get("/e/:id", competitionOg);
crawlerRouter.get("/profile/:id", profileOg);
crawlerRouter.get("/ctf/:id", challengeOg);
crawlerRouter.get("/modules/:id", moduleOg);
// Hubs — real content + internal links, so JS-less crawlers (Yandex) index them
// and every engine gets a crawl path to the detail pages.
crawlerRouter.get("/talent", talentOg);
crawlerRouter.get("/ctf", ctfHubOg);
crawlerRouter.get("/modules", modulesHubOg);
crawlerRouter.get("/learn", learnHubOg);
crawlerRouter.get("/competitions", competitionsHubOg);
crawlerRouter.get("/scoreboard", scoreboardHubOg);
crawlerRouter.get("/labs", labsOg);
crawlerRouter.get("/jobs", jobsOg);
crawlerRouter.get("/impact", impactOg);
crawlerRouter.get("/start", startOg);
crawlerRouter.get("/glossary", glossaryOg);

/**
 * robots.txt and sitemap.xml, generated rather than checked in, so they carry
 * whichever origin the request came in on and only contain rows that exist.
 * No user-agent condition: these two are for everyone.
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

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

publicSeoRouter.get("/sitemap.xml", async (req, res) => {
  const origin = siteOrigin(req);
  const entry = (path: string, changefreq: string, priority: string, lastmod?: string | null) =>
    `  <url>\n    <loc>${esc(origin + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const rows: string[] = [
    entry("/", "daily", "1.0"),
    entry("/start", "monthly", "0.9"),
    entry("/modules", "weekly", "0.9"),
    entry("/ctf", "daily", "0.9"),
    entry("/learn", "weekly", "0.8"),
    entry("/glossary", "weekly", "0.7"),
    entry("/scoreboard", "daily", "0.7"),
    entry("/competitions", "weekly", "0.7"),
    entry("/labs", "monthly", "0.6"),
    entry("/talent", "weekly", "0.6"),
    entry("/jobs", "daily", "0.6"),
    entry("/impact", "weekly", "0.5"),
    entry("/verify", "monthly", "0.5"),
  ];

  try {
    const [modules, challenges, paths] = await Promise.all([
      db.select({ id: modulesTable.id, createdAt: modulesTable.createdAt }).from(modulesTable)
        .where(eq(modulesTable.isPublished, true)).orderBy(asc(modulesTable.orderIndex)),
      db.select({ id: ctfTasksTable.id, createdAt: ctfTasksTable.createdAt }).from(ctfTasksTable)
        .where(eq(ctfTasksTable.isPublished, true)).orderBy(asc(ctfTasksTable.id)),
      db.select({ slug: pathsTable.slug, createdAt: pathsTable.createdAt }).from(pathsTable)
        .where(eq(pathsTable.isPublished, true)).orderBy(asc(pathsTable.orderIndex)),
    ]);
    for (const p of paths) rows.push(entry(`/paths/${p.slug}`, "weekly", "0.8", iso(p.createdAt)));
    for (const m of modules) rows.push(entry(`/modules/${m.id}`, "weekly", "0.8", iso(m.createdAt)));
    for (const c of challenges) rows.push(entry(`/ctf/${c.id}`, "monthly", "0.6", iso(c.createdAt)));
  } catch { /* still return the static rows if the DB is unreachable */ }

  res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`,
  );
});

export default router;
