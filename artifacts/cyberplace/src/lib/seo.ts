import { useEffect } from "react";
import { useLocation } from "wouter";
import { Language, useLang } from "@/lib/LanguageContext";

const SITE_URL = "https://cyberplace.uz";
const SITE_NAME = "cdCTF";
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

type LocalizedText = Record<Language, string>;

interface SeoConfig {
  title: LocalizedText;
  description: LocalizedText;
  path?: string;
  image?: string;
  robots?: string;
  type?: "website" | "profile";
  keywords?: LocalizedText;
  structuredData?: unknown[];
}

const text = (en: string, uz: string, ru: string): LocalizedText => ({ en, uz, ru });

const getBreadcrumbs = (items: { name: LocalizedText; item: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((it, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": it.name.en, // Schema uses primary language name usually
    "item": `${SITE_URL}${it.item}`
  }))
});

const publicRoutes: Array<{ match: (path: string) => boolean; config: SeoConfig }> = [
  {
    match: (path) => path === "/",
    config: {
      title: text(
        "cdCTF | Best CTF Platform and Cybersecurity Training in Uzbekistan",
        "cdCTF | O'zbekistondagi eng yaxshi CTF platformasi va kiberxavfsizlik kurslari",
        "cdCTF | Лучшая платформа CTF и обучение кибербезопасности в Узбекистане"
      ),
      description: text(
        "cdCTF is a premier cybersecurity platform offering hands-on CTF challenges, ethical hacking courses, and real-world security training. Learn Web Security, OSINT, Cryptography and Forensics.",
        "cdCTF - O'zbekistondagi kiberxavfsizlik platformasi. Web Security, OSINT, Kriptografiya va Forensics bo'yicha amaliy CTF topshiriqlari va professional kurslarni o'rganing.",
        "cdCTF - ведущая платформа по кибербезопасности в Узбекистане. Изучайте веб-безопасность, OSINT, криптографию и форензику через практические CTF задания и курсы."
      ),
      keywords: text(
        "ctf uzbekistan, cyber security training uzbekistan, learn hacking uzbekistan, ethical hacking uzbekistan, ctf challenges web, osint labs, crypto challenges, digital forensics training",
        "ctf uzbekistan, kiberxavfsizlik o'rganish, hacking darslari, kiberxavfsizlik kurslari, web xavfsizlik, osint o'zbek tilida, kriptografiya darslari, forensics topshiriqlari",
        "ctf узбекистан, обучение кибербезопасности, курсы хакинга, этичный хакинг, веб-безопасность, осинт, криптография, форензика"
      ),
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          "name": "cdCTF",
          "alternateName": ["cdCTF Platform", "cdCTF Uzbekistan"],
          "url": SITE_URL,
          "logo": DEFAULT_IMAGE,
          "sameAs": ["https://t.me/cdctf_uz", "https://instagram.com/cyberplace"],
          "description": "Leading CTF platform and cybersecurity academy in Uzbekistan focusing on hands-on technical skills.",
          "knowsAbout": ["Web Security", "OSINT", "Cryptography", "Digital Forensics", "Reverse Engineering", "Pwn"]
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "cdCTF",
          "url": SITE_URL,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${SITE_URL}/ctf?search={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        }
      ]
    }
  },
  {
    match: (path) => path === "/ctf",
    config: {
      title: text("CTF Missions & Cybersecurity Labs | cdCTF", "CTF Topshiriqlari va Hacking Lablar | cdCTF", "CTF Миссии и Лаборатории | cdCTF"),
      description: text(
        "Access 100+ CTF challenges across Web, Crypto, Reverse, and Forensics. Level up your hacking skills with our mission control.",
        "Web, Crypto, Reverse va Forensics bo'yicha 100+ CTF topshiriqlarini yeching. Mission control orqali hacking mahoratingizni oshiring.",
        "Доступ к 100+ CTF заданиям по веб-безопасности, криптографии, реверс-инжинирингу и форензике."
      ),
      keywords: text(
        "ctf labs, hacking missions, web vulnerability labs, cryptographic puzzles, reverse engineering challenges, pwnable labs",
        "ctf lablar, hacking topshiriqlari, web zaifliklar, kriptografik jumboqlar, reverse engineering, pwn topshiriqlari",
        "ctf лаборатории, хакинг миссии, веб уязвимости, криптографические задачи, реверс инжиниринг"
      ),
      structuredData: [
        getBreadcrumbs([
          { name: text("Home", "Bosh sahifa", "Главная"), item: "/" },
          { name: text("CTF", "CTF", "CTF"), item: "/ctf" }
        ])
      ]
    }
  },
  {
    match: (path) => path === "/learn",
    config: {
      title: text("Cybersecurity Academy & Courses | cdCTF", "Kiberxavfsizlik Akademiyasi va Kurslar | cdCTF", "Академия Кибербезопасности и Курсы | cdCTF"),
      description: text(
        "Learn ethical hacking with structured courses. Zero to hero paths in OSINT, Web Security, and Cryptography.",
        "Tizimli kurslar orqali ethical hackingni o'rganing. OSINT, Web Security va Kriptografiya bo'yicha noldan professionalgacha.",
        "Изучайте этичный хакинг через структурированные курсы. Путь от новичка до профи в OSINT, веб-безопасности и криптографии."
      ),
      structuredData: [
        getBreadcrumbs([
          { name: text("Home", "Bosh sahifa", "Главная"), item: "/" },
          { name: text("Learn", "O'rganish", "Учиться"), item: "/learn" }
        ])
      ]
    }
  },
  {
    match: (path) => path === "/scoreboard",
    config: {
      title: text("Global Leaderboard & Rankings | cdCTF", "Global Reyting va Top O'yinchilar | cdCTF", "Глобальный Рейтинг и Топ Игроков | cdCTF"),
      description: text(
        "Track your progress against the best hackers in Uzbekistan. See the global cdCTF scoreboard and earned titles.",
        "O'zbekistondagi eng kuchli hackerlar bilan bellashing. Global cdCTF reytingi va unvonlarni ko'ring.",
        "Следите за своим прогрессом среди лучших хакеров Узбекистана. Глобальный рейтинг cdCTF и полученные титулы."
      ),
      structuredData: [
        getBreadcrumbs([
          { name: text("Home", "Bosh sahifa", "Главная"), item: "/" },
          { name: text("Scoreboard", "Reyting", "Рейтинг"), item: "/scoreboard" }
        ])
      ]
    }
  }
];

const privateOrUtilityRoutes: Array<{ match: (path: string) => boolean; config: SeoConfig }> = [
  {
    match: (path) => ["/login", "/register", "/verify-email", "/dashboard", "/profile/edit"].includes(path),
    config: {
      title: text("Authentication | cdCTF", "Hisobga kirish | cdCTF", "Аутентификация | cdCTF"),
      description: text("Manage your cdCTF account and track your progress.", "cdCTF hisobingizni boshqaring va natijalaringizni ko'ring.", "Управляйте своим аккаунтом cdCTF."),
      robots: "noindex, nofollow"
    }
  },
  {
    // Unlisted routes fall through to the 404 config, so a real page ends up
    // titled "404 - Terminal Error" until it is named here.
    match: (path) => path.startsWith("/settings"),
    config: {
      title: text("Security | cdCTF", "Xavfsizlik | cdCTF", "Безопасность | cdCTF"),
      description: text("Two-factor authentication, devices, sign-in history and API tokens.", "Ikki bosqichli tasdiq, qurilmalar, kirish tarixi va API tokenlar.", "Двухфакторная аутентификация, устройства, история входов и API-токены."),
      robots: "noindex, nofollow"
    }
  },
  {
    match: (path) => path.startsWith("/admin"),
    config: {
      title: text("Admin Control Center | cdCTF", "Admin Paneli | cdCTF", "Админ Панель | cdCTF"),
      description: text("Restricted administrative area.", "Faqat adminlar uchun.", "Ограниченная зона для администраторов."),
      robots: "noindex, nofollow"
    }
  }
];

function findConfig(path: string): SeoConfig {
  return (
    privateOrUtilityRoutes.find((route) => route.match(path))?.config ??
    publicRoutes.find((route) => route.match(path))?.config ?? {
      title: text("404 - Terminal Error | cdCTF", "404 - Sahifa Topilmadi | cdCTF", "404 - Ошибка | cdCTF"),
      description: text("The requested data packet could not be located.", "So'ralgan sahifa topilmadi.", "Запрошенная страница не найдена."),
      robots: "noindex, nofollow"
    }
  );
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function upsertLink(rel: string, href: string, otherAttrs: Record<string, string> = {}) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${Object.entries(otherAttrs).map(([k, v]) => `[${k}="${v}"]`).join("")}`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    Object.entries(otherAttrs).forEach(([k, v]) => element?.setAttribute(k, v));
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function upsertStructuredData(dataArray?: unknown[]) {
  const id = "structured-data";
  const existing = document.querySelectorAll(`.${id}`);
  existing.forEach(el => el.remove());

  if (!dataArray || dataArray.length === 0) return;

  dataArray.forEach((data, index) => {
    const script = document.createElement("script");
    script.className = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  });
}

export function SeoManager() {
  const [location] = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    const config = findConfig(location);
    const canonicalPath = config.path ?? location;
    const canonical = `${SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`;
    const pageTitle = config.title[lang];
    const description = config.description[lang];
    const image = config.image ?? DEFAULT_IMAGE;
    const robots = config.robots ?? "index, follow";
    const keywords = config.keywords?.[lang];

    document.documentElement.lang = lang;
    document.title = pageTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    if (keywords) upsertMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
    
    // OG
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: lang === "uz" ? "uz_UZ" : lang === "ru" ? "ru_RU" : "en_US" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: config.type ?? "website" });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    
    // Twitter
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: pageTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });

    // Links
    upsertLink("canonical", canonical);
    upsertLink("alternate", canonical, { hreflang: "x-default" });
    upsertLink("alternate", canonical, { hreflang: "uz" });
    upsertLink("alternate", canonical, { hreflang: "ru" });
    upsertLink("alternate", canonical, { hreflang: "en" });

    upsertStructuredData(config.structuredData as unknown[]);
  }, [lang, location]);

  return null;
}
