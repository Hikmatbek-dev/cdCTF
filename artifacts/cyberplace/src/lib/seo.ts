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
  structuredData?: unknown;
}

const text = (en: string, uz: string, ru: string): LocalizedText => ({ en, uz, ru });

const publicRoutes: Array<{ match: (path: string) => boolean; config: SeoConfig }> = [
  {
    match: (path) => path === "/",
    config: {
      title: text(
        "CTF Platform and Cybersecurity Training",
        "CTF Platforma va Kiberxavfsizlik Kurslari",
        "Платформа CTF по кибербезопасности",
      ),
      description: text(
        "cdCTF is a CTF site and cybersecurity platform for learning ethical hacking, web security, OSINT, cryptography, forensics and competing in CTF challenges.",
        "cdCTF - CTF site, CTF platforma va kiberxavfsizlik kurslari maskani. Ethical hacking, web security, OSINT, kriptografiya, forensics va CTF topshiriqlarini o'rganing.",
        "Изучайте кибербезопасность на cdCTF через CTF-задания, уроки, соревнования и рейтинг.",
      ),
      keywords: text(
        "ctf site, ctf platform, cybersecurity platform, learn cybersecurity, cybersecurity training, ethical hacking, web security, ctf challenges, cyber security course, OSINT, forensics, cryptography",
        "ctf site, ctf platforma, kiberxavfsizlik platformasi, kiberxavfsizlik kurslari, cybersecurity o'rganish, ethical hacking, web hacking, CTF O'zbekiston, OSINT, forensics, kriptografiya",
        "ctf platform, cybersecurity platform, ethical hacking, web security, OSINT, forensics, cryptography",
      ),
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "cdCTF",
          alternateName: ["cdCTF Platform", "cdCTF"],
          url: SITE_URL,
          logo: DEFAULT_IMAGE,
          sameAs: ["https://t.me/cdctf_uz", "https://instagram.com/cyberplace"],
          description:
            "CTF site and cybersecurity learning platform for ethical hacking, web security, OSINT, cryptography, forensics and CTF competitions.",
          knowsAbout: [
            "CTF challenges",
            "cybersecurity training",
            "ethical hacking",
            "web security",
            "OSINT",
            "cryptography",
            "digital forensics",
            "reverse engineering",
            "binary exploitation",
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "cdCTF",
          alternateName: "cdCTF Platform",
          url: SITE_URL,
          inLanguage: ["uz", "en", "ru"],
          description:
            "A CTF platform for learning cybersecurity with lessons, hands-on challenges, competitions and scoreboard.",
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/ctf?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "Course",
          name: "Cybersecurity and CTF Training",
          alternateName: "Kiberxavfsizlik va CTF kurslari",
          description:
            "Learn cybersecurity through structured lessons and practical CTF challenges in web security, OSINT, cryptography and forensics.",
          provider: {
            "@type": "Organization",
            name: "cdCTF",
            sameAs: SITE_URL,
          },
        },
      ],
    },
  },
  {
    match: (path) => path === "/ctf",
    config: {
      title: text("CTF Challenges and Hacking Labs", "CTF Topshiriqlari va Hacking Lablar", "CTF Задания"),
      description: text(
        "Practice CTF challenges and hacking labs in Web, Crypto, Reverse, Forensics, Pwn, OSINT and other cybersecurity categories.",
        "Web, Crypto, Reverse, Forensics, Pwn, OSINT va boshqa yo'nalishlarda CTF topshiriqlari va hacking lablarni yeching.",
        "Практикуйтесь в Web, Crypto, Reverse, Forensics, Pwn, OSINT и других CTF-заданиях на cdCTF.",
      ),
      keywords: text(
        "ctf challenges, hacking labs, web hacking challenges, osint ctf, crypto ctf, forensics ctf, reverse engineering ctf, pwn ctf",
        "ctf topshiriqlari, hacking lablar, web hacking topshiriqlari, osint ctf, crypto ctf, forensics ctf, reverse engineering ctf, pwn ctf",
        "ctf challenges, hacking labs, osint ctf, crypto ctf, forensics ctf",
      ),
    },
  },
  {
    match: (path) => path.startsWith("/ctf/"),
    config: {
      title: text("CTF Challenge", "CTF Topshirig'i", "CTF Задание"),
      description: text(
        "Open a cybersecurity challenge, submit a flag, and earn points on cdCTF.",
        "Kiberxavfsizlik topshirig'ini oching, flag yuboring va cdCTFda ball to'plang.",
        "Откройте CTF-задание, отправьте flag и получите очки на cdCTF.",
      ),
    },
  },
  {
    match: (path) => path === "/learn",
    config: {
      title: text("Learn Cybersecurity and Ethical Hacking", "Kiberxavfsizlik va Ethical Hacking Darslari", "Уроки по кибербезопасности"),
      description: text(
        "Learn cybersecurity, ethical hacking, web security, OSINT, cryptography and forensics with structured lessons and practical tests.",
        "Kiberxavfsizlik, ethical hacking, web security, OSINT, kriptografiya va forensics bo'yicha tizimli darslar va amaliy testlar.",
        "Изучайте структурированные уроки по кибербезопасности с тестами и отслеживанием прогресса.",
      ),
      keywords: text(
        "learn cybersecurity, cybersecurity lessons, cybersecurity training, ethical hacking course, web security course, cyber security course, OSINT training",
        "kiberxavfsizlik darslari, kiberxavfsizlik kurslari, cybersecurity o'rganish, ethical hacking kursi, web security kursi, OSINT darslari",
        "cybersecurity lessons, ethical hacking course, web security course",
      ),
    },
  },
  {
    match: (path) => path.startsWith("/learn/") && !path.endsWith("/test"),
    config: {
      title: text("Cybersecurity Lesson", "Kiberxavfsizlik Darsi", "Урок кибербезопасности"),
      description: text(
        "Read a cybersecurity lesson, complete practice material, and prepare for tests on cdCTF.",
        "Kiberxavfsizlik darsini o'qing, amaliy materiallarni bajaring va cdCTF testlariga tayyorlaning.",
        "Читайте урок, выполняйте практику и готовьтесь к тестам на cdCTF.",
      ),
    },
  },
  {
    match: (path) => path === "/scoreboard",
    config: {
      title: text("Scoreboard", "Reyting", "Рейтинг"),
      description: text(
        "See cdCTF rankings, top players, solved challenges, titles, and points.",
        "cdCTF reytingi, eng yaxshi o'yinchilar, yechilgan topshiriqlar, unvonlar va ballarni ko'ring.",
        "Смотрите рейтинг cdCTF, лучших игроков, решённые задания, титулы и очки.",
      ),
    },
  },
  {
    match: (path) => path === "/competitions",
    config: {
      title: text("Cybersecurity Competitions", "Kiberxavfsizlik Musobaqalari", "Соревнования по кибербезопасности"),
      description: text(
        "Join online CTF competitions, cybersecurity contests and timed hacking challenges to earn points, titles and certificates.",
        "Online CTF musobaqalari, kiberxavfsizlik contestlari va vaqtli hacking topshiriqlarida qatnashing.",
        "Участвуйте в публичных и приватных CTF-соревнованиях, решайте задания на время и получайте сертификаты.",
      ),
      keywords: text(
        "ctf competition, cybersecurity competition, online ctf, hacking competition, cyber contest",
        "ctf musobaqa, kiberxavfsizlik musobaqasi, online ctf, hacking musobaqa, cyber contest",
        "ctf competition, cybersecurity competition, online ctf",
      ),
    },
  },
  {
    match: (path) => path.startsWith("/competitions/"),
    config: {
      title: text("CTF Competition", "CTF Musobaqasi", "CTF Соревнование"),
      description: text(
        "View competition details, participants, rules, and CTF challenges on cdCTF.",
        "cdCTF musobaqasi tafsilotlari, qatnashchilar, qoidalar va CTF topshiriqlarini ko'ring.",
        "Смотрите детали соревнования, участников, правила и CTF-задания на cdCTF.",
      ),
    },
  },
  {
    match: (path) => path.startsWith("/profile/"),
    config: {
      title: text("Player Profile", "O'yinchi Profili", "Профиль игрока"),
      description: text(
        "View a cdCTF player profile, solved challenges, titles, points, and competition activity.",
        "cdCTF o'yinchisi profili, yechilgan topshiriqlar, unvonlar, ballar va musobaqa faolligini ko'ring.",
        "Смотрите профиль игрока cdCTF, решённые задания, титулы, очки и активность.",
      ),
      type: "profile",
    },
  },
];

const privateOrUtilityRoutes: Array<{ match: (path: string) => boolean; config: SeoConfig }> = [
  {
    match: (path) => ["/login", "/register", "/verify-email", "/dashboard", "/profile/edit"].includes(path),
    config: {
      title: text("Account", "Hisob", "Аккаунт"),
      description: text(
        "Access your cdCTF account.",
        "cdCTF hisobingizga kiring.",
        "Войдите в аккаунт cdCTF.",
      ),
      robots: "noindex, nofollow",
    },
  },
  {
    match: (path) => path.startsWith("/admin"),
    config: {
      title: text("Admin Panel", "Admin Panel", "Админ-панель"),
      description: text("cdCTF admin panel.", "cdCTF admin paneli.", "Админ-панель cdCTF."),
      robots: "noindex, nofollow",
    },
  },
  {
    match: (path) => path.endsWith("/test") || (path.startsWith("/competitions/") && path.includes("/ctf/")),
    config: {
      title: text("Practice", "Amaliyot", "Практика"),
      description: text(
        "Practice cybersecurity tasks on cdCTF.",
        "cdCTFda kiberxavfsizlik amaliyotini bajaring.",
        "Практикуйтесь в заданиях по кибербезопасности на cdCTF.",
      ),
      robots: "noindex, nofollow",
    },
  },
];

function findConfig(path: string): SeoConfig {
  return (
    privateOrUtilityRoutes.find((route) => route.match(path))?.config ??
    publicRoutes.find((route) => route.match(path))?.config ?? {
      title: text("Page Not Found", "Sahifa Topilmadi", "Страница не найдена"),
      description: text(
        "The requested cdCTF page could not be found.",
        "So'ralgan cdCTF sahifasi topilmadi.",
        "Запрошенная страница cdCTF не найдена.",
      ),
      robots: "noindex, nofollow",
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

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertAlternate(lang: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${lang}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "alternate");
    element.setAttribute("hreflang", lang);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertStructuredData(data?: unknown) {
  const id = "structured-data";
  let element = document.getElementById(id) as HTMLScriptElement | null;

  if (!data) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

export function SeoManager() {
  const [location] = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    const config = findConfig(location);
    const canonicalPath = config.path ?? location;
    const canonical = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;
    const pageTitle = `${config.title[lang]} | ${SITE_NAME}`;
    const description = config.description[lang];
    const image = config.image ?? DEFAULT_IMAGE;
    const robots = config.robots ?? "index, follow";
    const keywords = config.keywords?.[lang];

    document.documentElement.lang = lang;
    document.title = pageTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    if (keywords) {
      upsertMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
    }
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: lang === "uz" ? "uz_UZ" : lang === "ru" ? "ru_RU" : "en_US" });
    upsertMeta('meta[property="og:locale:alternate"]', { property: "og:locale:alternate", content: lang === "uz" ? "en_US" : "uz_UZ" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: config.type ?? "website" });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: pageTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    upsertLink("canonical", canonical);
    upsertAlternate("uz", canonical);
    upsertAlternate("en", canonical);
    upsertAlternate("x-default", canonical);
    upsertStructuredData(config.structuredData);
  }, [lang, location]);

  return null;
}
