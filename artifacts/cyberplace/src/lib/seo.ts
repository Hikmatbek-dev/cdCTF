import { useEffect } from "react";
import { useLocation } from "wouter";
import { Language, useLang } from "@/lib/LanguageContext";

const SITE_URL = "https://cdctf.uz";
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

// The six-month curriculum as schema.org Course items, so the /modules page is
// eligible for Google's course rich results. Mirrors the static list in
// index.html; kept compact here since the static copy carries the full detail.
const CURRICULUM_COURSES: { name: string; description: string; level: string; hours: number }[] = [
  { name: "Linux Command Line for Security", description: "The shell from first principles — navigation, filesystem, users and sudo, permissions and SUID, find and grep, and pipelines.", level: "Beginner", hours: 40 },
  { name: "Networking for Security", description: "How traffic moves — addressing, packet layers, ports, DNS recon, HTTP by hand, routing, tcpdump, and TLS certificates.", level: "Beginner", hours: 40 },
  { name: "Web Application Security", description: "SQL injection, XSS, broken auth and access control, IDOR, uploads, path traversal, command injection, CSRF and SSRF.", level: "Intermediate", hours: 45 },
  { name: "Cryptography for Security", description: "Encoding vs encryption vs hashing, cracking with John and hashcat, XOR and classical ciphers, AES, RSA, Diffie-Hellman and TLS.", level: "Intermediate", hours: 45 },
  { name: "Reconnaissance and Scanning", description: "Passive OSINT, host discovery, nmap port scanning and version detection, service enumeration, and mapping versions to CVEs.", level: "Intermediate", hours: 40 },
  { name: "Exploitation and Privilege Escalation", description: "Reverse shells, Metasploit, msfvenom, Linux and Windows privilege escalation, post-exploitation, pivoting and reporting.", level: "Advanced", hours: 45 },
];

const getCourseList = () => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "cdCTF cybersecurity curriculum",
  "numberOfItems": CURRICULUM_COURSES.length,
  "itemListElement": CURRICULUM_COURSES.map((c, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "item": {
      "@type": "Course",
      "name": c.name,
      "description": c.description,
      "provider": { "@type": "Organization", "name": SITE_NAME, "sameAs": SITE_URL },
      "inLanguage": ["uz", "ru", "en"],
      "isAccessibleForFree": true,
      "educationalLevel": c.level,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "category": "Free" },
      "hasCourseInstance": { "@type": "CourseInstance", "courseMode": "Online", "courseWorkload": `PT${c.hours}H` },
    },
  })),
});

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
        "A hands-on, six-month cybersecurity program in Uzbek, Russian and English — real terminal commands, CTF challenges, and a cdCTF certificate at the end. Learn Linux, networking, web security, cryptography, recon and exploitation.",
        "Amaliy, 6 oylik kiberxavfsizlik dasturi — o'zbek, rus va ingliz tilida. Real terminal buyruqlar, CTF topshiriqlar va oxirida cdCTF sertifikati. Linux, tarmoq, veb xavfsizlik, kriptografiya, razvedka va ekspluatatsiyani o'rganing.",
        "Практическая шестимесячная программа по кибербезопасности на узбекском, русском и английском — реальные команды, CTF-задания и сертификат cdCTF. Изучайте Linux, сети, веб-безопасность, криптографию, разведку и эксплуатацию."
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
          "sameAs": ["https://t.me/cdctf", "https://instagram.com/cdctf.uz"],
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
    match: (path) => path === "/modules",
    config: {
      title: text(
        "Cybersecurity Curriculum — Six-Month Program | cdCTF",
        "Kiberxavfsizlik dasturi — 6 oylik o'quv reja | cdCTF",
        "Программа по кибербезопасности — 6 месяцев | cdCTF",
      ),
      description: text(
        "A structured six-month cybersecurity program: Linux, networking, web security, cryptography, recon and exploitation. Real terminal commands, a final exam per module, and a certificate. In Uzbek, Russian and English.",
        "Tuzilgan 6 oylik kiberxavfsizlik dasturi: Linux, tarmoq, veb xavfsizlik, kriptografiya, razvedka va ekspluatatsiya. Real terminal buyruqlar, har modulda yakuniy imtihon va sertifikat. O'zbek, rus va ingliz tilida.",
        "Структурированная шестимесячная программа: Linux, сети, веб-безопасность, криптография, разведка и эксплуатация. Реальные команды, итоговый экзамен по каждому модулю и сертификат. На узбекском, русском и английском.",
      ),
      structuredData: [
        getBreadcrumbs([
          { name: text("Home", "Bosh sahifa", "Главная"), item: "/" },
          { name: text("Modules", "Modullar", "Модули"), item: "/modules" },
        ]),
        getCourseList(),
      ],
    },
  },
  {
    match: (path) => path === "/learn",
    config: {
      title: text("Cybersecurity Lessons Library | cdCTF", "Kiberxavfsizlik darslari kutubxonasi | cdCTF", "Библиотека уроков по кибербезопасности | cdCTF"),
      description: text(
        "Standalone cybersecurity lessons across every domain — Linux, networking, web, crypto, forensics and more. For the structured path, follow the six-month Modules.",
        "Har bir yo'nalish bo'yicha alohida kiberxavfsizlik darslari — Linux, tarmoq, veb, kriptografiya, forenzika va boshqalar. Tuzilgan yo'l uchun 6 oylik Modullarni kuzating.",
        "Отдельные уроки по кибербезопасности по всем направлениям — Linux, сети, веб, крипто, форензика и другое. Для структурированного пути смотрите шестимесячные Модули."
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

    upsertStructuredData(config.structuredData);
  }, [lang, location]);

  return null;
}
