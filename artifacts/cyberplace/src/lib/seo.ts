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
  structuredData?: Record<string, unknown>;
}

const text = (en: string, uz: string, ru: string): LocalizedText => ({ en, uz, ru });

const publicRoutes: Array<{ match: (path: string) => boolean; config: SeoConfig }> = [
  {
    match: (path) => path === "/",
    config: {
      title: text(
        "Cybersecurity CTF Platform",
        "Kiberxavfsizlik CTF Platformasi",
        "Платформа CTF по кибербезопасности",
      ),
      description: text(
        "Learn cybersecurity with CTF challenges, structured lessons, monthly competitions, and a global scoreboard on cdCTF.",
        "cdCTF platformasida CTF topshiriqlari, tizimli darslar, oylik musobaqalar va reyting orqali kiberxavfsizlikni o'rganing.",
        "Изучайте кибербезопасность на cdCTF через CTF-задания, уроки, соревнования и рейтинг.",
      ),
      structuredData: {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: DEFAULT_IMAGE,
        sameAs: ["https://t.me/cyberplace", "https://instagram.com/cyberplace"],
        description:
          "Cybersecurity learning platform with CTF challenges, lessons, competitions, and scoreboard.",
      },
    },
  },
  {
    match: (path) => path === "/ctf",
    config: {
      title: text("CTF Challenges", "CTF Topshiriqlari", "CTF Задания"),
      description: text(
        "Practice Web, Crypto, Reverse, Forensics, Pwn, OSINT and other cybersecurity challenges on cdCTF.",
        "cdCTFda Web, Crypto, Reverse, Forensics, Pwn, OSINT va boshqa kiberxavfsizlik topshiriqlarini yeching.",
        "Практикуйтесь в Web, Crypto, Reverse, Forensics, Pwn, OSINT и других CTF-заданиях на cdCTF.",
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
      title: text("Cybersecurity Lessons", "Kiberxavfsizlik Darslari", "Уроки по кибербезопасности"),
      description: text(
        "Study structured cybersecurity lessons with practical tests and progress tracking.",
        "Amaliy testlar va progress nazorati bilan tizimli kiberxavfsizlik darslarini o'rganing.",
        "Изучайте структурированные уроки по кибербезопасности с тестами и отслеживанием прогресса.",
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
        "Join public and private CTF competitions, solve timed challenges, and earn certificates.",
        "Ochiq va yopiq CTF musobaqalariga qo'shiling, vaqtli topshiriqlarni yeching va sertifikat oling.",
        "Участвуйте в публичных и приватных CTF-соревнованиях, решайте задания на время и получайте сертификаты.",
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

function upsertStructuredData(data?: Record<string, unknown>) {
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

    document.documentElement.lang = lang;
    document.title = pageTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: config.type ?? "website" });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: pageTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    upsertLink("canonical", canonical);
    upsertStructuredData(config.structuredData);
  }, [lang, location]);

  return null;
}
