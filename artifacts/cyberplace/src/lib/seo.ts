import { useEffect } from "react";
import { useLocation } from "wouter";
import { Language, useLang } from "@/lib/LanguageContext";

/**
 * The origin this page is actually being served from.
 *
 * This was pinned to https://cdctf.uz, which is not connected yet — so every
 * canonical link and every structured-data URL the app emitted pointed at a
 * host that answers nothing. Reading it from the browser is both correct today
 * and correct the day the domain is connected, with no redeploy.
 */
const SITE_URL = typeof window === "undefined" ? "https://cdctf.uz" : window.location.origin;
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
  },
  {
    // The first page a new account sees. It was falling through to the 404
    // config, so the browser tab of a working page read "404 - Terminal Error".
    match: (path) => path === "/start",
    config: {
      title: text("Start here — find your first lesson | cdCTF", "Shu yerdan boshlang — birinchi darsingiz | cdCTF", "Начните здесь — ваш первый урок | cdCTF"),
      description: text(
        "Two questions and you are learning: tell us where you are starting from and what you are here for, and cdCTF opens the right first lesson.",
        "Ikki savol — va o'rganish boshlanadi: qayerdan boshlayotganingiz va maqsadingizni ayting, cdCTF kerakli birinchi darsni ochadi.",
        "Два вопроса — и вы учитесь: скажите, с чего начинаете и зачем, и cdCTF откроет нужный первый урок."
      ),
      structuredData: [
        getBreadcrumbs([
          { name: text("Home", "Bosh sahifa", "Главная"), item: "/" },
          { name: text("Start", "Boshlash", "Начать"), item: "/start" }
        ])
      ]
    }
  },
  {
    // Sponsor-facing event posters. The per-event title comes from the crawler
    // preview (see the API's og routes); this is the in-browser tab title.
    match: (path) => /^\/e\/\d+$/.test(path),
    config: {
      title: text("CTF event | cdCTF", "CTF tadbiri | cdCTF", "CTF-событие | cdCTF"),
      description: text(
        "A free CTF competition on cdCTF — register, solve, and climb the scoreboard.",
        "cdCTF'dagi bepul CTF musobaqasi — ro'yxatdan o'ting, yeching va reytingda ko'tariling.",
        "Бесплатное CTF-соревнование на cdCTF — регистрируйтесь, решайте, поднимайтесь в рейтинге."
      )
    }
  },

  /*
   * Everything below was falling through to the 404 config — measured on the
   * live site, where /start rendered perfectly under a tab reading "404 -
   * Terminal Error". Only the five landing pages above had ever been named, so
   * every detail page, and every page added since, was telling search engines
   * and link previews that it did not exist.
   */
  {
    match: (path) => path === "/talent",
    config: {
      title: text("Hire from cdCTF — security talent in Uzbekistan | cdCTF", "cdCTF'dan yollash — O'zbekistondagi kiberxavfsizlik iste'dodlari | cdCTF", "Наём с cdCTF — специалисты по кибербезопасности | cdCTF"),
      description: text(
        "Learners who opted in to be found, ranked by what they have actually solved — not by what a CV claims.",
        "Topilishga rozilik bergan o'quvchilar — CV emas, haqiqatan yechgani bo'yicha saralangan.",
        "Соискатели, давшие согласие, отсортированные по решённым заданиям, а не по резюме."
      )
    }
  },
  {
    match: (path) => path === "/jobs",
    config: {
      title: text("Cybersecurity jobs in Uzbekistan | cdCTF", "O'zbekistonda kiberxavfsizlik ishlari | cdCTF", "Вакансии по кибербезопасности в Узбекистане | cdCTF"),
      description: text(
        "Open security roles posted by employers, alongside the learners qualified to fill them.",
        "Ish beruvchilar joylagan ochiq vakansiyalar va ularga mos o'quvchilar.",
        "Открытые вакансии от работодателей и специалисты, готовые их занять."
      )
    }
  },
  {
    match: (path) => path === "/impact",
    config: {
      title: text("Impact — cdCTF in numbers | cdCTF", "Ta'sir — raqamlarda cdCTF | cdCTF", "Влияние — cdCTF в цифрах | cdCTF"),
      description: text(
        "Live platform statistics: learners, lessons, challenges solved and credentials issued. Nothing here is estimated.",
        "Jonli statistika: o'quvchilar, darslar, yechilgan topshiriqlar va berilgan sertifikatlar. Bu yerda taxmin yo'q.",
        "Живая статистика: учащиеся, уроки, решённые задания и выданные сертификаты. Ничего не оценочного."
      )
    }
  },
  {
    match: (path) => path === "/labs",
    config: {
      title: text("Hands-on labs | cdCTF", "Amaliy laboratoriyalar | cdCTF", "Практические лаборатории | cdCTF"),
      description: text(
        "Isolated machines you can start in one click and attack safely.",
        "Bir bosishda ishga tushadigan va xavfsiz hujum qilinadigan izolyatsiyalangan mashinalar.",
        "Изолированные машины, запускаемые в один клик, для безопасной атаки."
      )
    }
  },
  {
    match: (path) => path === "/competitions" || /^\/competitions\/\d+/.test(path),
    config: {
      title: text("CTF competitions | cdCTF", "CTF musobaqalari | cdCTF", "CTF-соревнования | cdCTF"),
      description: text(
        "Timed CTF events, team registration and live scoreboards — free to enter.",
        "Vaqtli CTF tadbirlari, jamoaviy ro'yxat va jonli reyting — kirish bepul.",
        "CTF-события на время, командная регистрация и живой рейтинг — вход бесплатный."
      )
    }
  },
  {
    match: (path) => /^\/ctf\/\d+/.test(path),
    config: {
      title: text("CTF challenge | cdCTF", "CTF topshirig'i | cdCTF", "CTF-задание | cdCTF"),
      description: text(
        "A hands-on security challenge with hints, a writeup section, and the lesson that teaches it.",
        "Maslahat, writeup bo'limi va uni o'rgatadigan dars bilan amaliy topshiriq.",
        "Практическое задание с подсказками, разделом writeup и уроком по теме."
      )
    }
  },
  {
    match: (path) => /^\/modules\/\d+/.test(path),
    config: {
      title: text("Module | cdCTF", "Modul | cdCTF", "Модуль | cdCTF"),
      description: text(
        "Lessons, a final exam and the practice challenges that drill what the module teaches.",
        "Darslar, yakuniy imtihon va modul o'rgatgan narsani mashq qiladigan topshiriqlar.",
        "Уроки, итоговый экзамен и задания, закрепляющие материал модуля."
      )
    }
  },
  {
    match: (path) => /^\/learn\/\d+/.test(path),
    config: {
      title: text("Lesson | cdCTF", "Dars | cdCTF", "Урок | cdCTF"),
      description: text(
        "A short lesson that ends with a practical task and hands you the challenges that use it.",
        "Amaliy topshiriq bilan tugaydigan va uni ishlatadigan topshiriqlarni beradigan qisqa dars.",
        "Короткий урок, который заканчивается практикой и ведёт к заданиям по теме."
      )
    }
  },
  {
    match: (path) => path === "/verify",
    config: {
      title: text("Verify a cdCTF credential | cdCTF", "cdCTF sertifikatini tekshirish | cdCTF", "Проверка сертификата cdCTF | cdCTF"),
      description: text(
        "Enter a serial number to confirm a cdCTF certificate or diploma is genuine.",
        "cdCTF sertifikati yoki diplomi haqiqiyligini tasdiqlash uchun seriya raqamini kiriting.",
        "Введите серийный номер, чтобы подтвердить подлинность сертификата или диплома cdCTF."
      )
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
    // A credential carries someone's real name and score. It has to be public
    // — that is what makes it verifiable — but it should not be indexed, and it
    // certainly should not be titled "404" for the employer who opens it.
    match: (path) => /^\/(certificate|diploma)\//.test(path) || path === "/diploma",
    config: {
      title: text("Credential | cdCTF", "Sertifikat | cdCTF", "Сертификат | cdCTF"),
      description: text(
        "A cdCTF credential, verifiable by its serial number and fingerprint.",
        "Seriya raqami va barmoq izi orqali tekshiriladigan cdCTF sertifikati.",
        "Сертификат cdCTF, проверяемый по серийному номеру и отпечатку."
      ),
      robots: "noindex, nofollow"
    }
  },
  {
    match: (path) => /^\/profile\/\d+/.test(path) || path === "/profile",
    config: {
      title: text("Learner profile | cdCTF", "O'quvchi profili | cdCTF", "Профиль учащегося | cdCTF"),
      description: text(
        "Solved challenges, finished modules and earned titles.",
        "Yechilgan topshiriqlar, tugatilgan modullar va olingan unvonlar.",
        "Решённые задания, пройденные модули и полученные титулы."
      ),
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
