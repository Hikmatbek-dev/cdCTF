import { Link } from "wouter";
import {
  Trophy, Send, GraduationCap, Terminal, Languages, ArrowRight,
  ChevronRight, ChevronDown, BookOpen, Flag, ShieldCheck, Users, Check,
} from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard, useListModules, getListModulesQueryKey, useListCtfChallenges, getListCtfChallengesQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { HeroTerminal } from "@/components/HeroTerminal";
import { MODULE_ART } from "@/components/ModuleArt";
import { ModuleCertificate, CredentialFrame } from "@/components/Credentials";

type ScoreEntry = { userId: number; nickname: string; points: number };

/** The eight modules, in path order — titles kept short for the preview grid. */
const CURRICULUM = [
  { slug: "linux-command-line", en: "Linux", uz: "Linux", ru: "Linux", lvl: 0, h: 40 },
  { slug: "networking-for-security", en: "Networking", uz: "Tarmoqlar", ru: "Сети", lvl: 0, h: 40 },
  { slug: "web-application-security", en: "Web Security", uz: "Veb xavfsizlik", ru: "Веб-безопасность", lvl: 1, h: 45 },
  { slug: "cryptography-for-security", en: "Cryptography", uz: "Kriptografiya", ru: "Криптография", lvl: 1, h: 45 },
  { slug: "reconnaissance-and-scanning", en: "Recon", uz: "Razvedka", ru: "Разведка", lvl: 1, h: 40 },
  { slug: "exploitation-and-privilege-escalation", en: "Exploitation", uz: "Ekspluatatsiya", ru: "Эксплуатация", lvl: 2, h: 45 },
  { slug: "forensics-and-incident-response", en: "Forensics & IR", uz: "Forenzika", ru: "Форензика", lvl: 2, h: 45 },
  { slug: "ctf-methodology", en: "CTF Methodology", uz: "CTF metodikasi", ru: "Методология CTF", lvl: 2, h: 40 },
] as const;

export default function HomePage() {
  const { t } = useLang();
  const { data: scoreboard } = useGetScoreboard({ limit: 5 });
  const scoreboardEntries = normalizeArray<ScoreEntry>(scoreboard?.entries, ["entries", "data", "items"]);
  const { data: modulesData } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const modules = normalizeArray<{ id: number; lessonCount?: number }>(modulesData, ["id"]);
  const moduleCount = modules.length;
  const lessonCount = modules.reduce((n, m) => n + (m.lessonCount ?? 0), 0);

  // The real published count rather than a hardcoded "40+". It was 79, so the
  // page was underselling the thing by half.
  const { data: ctfData } = useListCtfChallenges({}, {
    query: { queryKey: getListCtfChallengesQueryKey({}) },
  }) as { data?: { publishedTotal?: number; total?: number } };
  const ctfCount = ctfData?.publishedTotal ?? ctfData?.total ?? 0;

  const stats = [
    { value: moduleCount > 0 ? `${moduleCount}` : "8", label: t("modules", "modul", "модулей") },
    { value: lessonCount > 0 ? `${lessonCount}` : "64", label: t("lessons", "dars", "уроков") },
    { value: ctfCount > 0 ? `${ctfCount}` : "40+", label: t("CTF challenges", "CTF topshiriq", "CTF заданий") },
    { value: "3", label: t("languages", "til", "языка") },
  ];

  const levels = [
    { label: t("Beginner", "Boshlang'ich", "Начальный"), cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    { label: t("Intermediate", "O'rta", "Средний"), cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" },
    { label: t("Advanced", "Yuqori", "Продвинутый"), cls: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30" },
  ];

  // The three step images sit on a bright, near-white studio background, which
  // is why this band is one of the two inverted sections — they would look cut
  // out and wrong floating on the dark canvas.
  const steps = [
    {
      icon: BookOpen,
      img: "/images/step-read.webp",
      title: t("Read the lesson", "Darsni o'qing", "Прочитайте урок"),
      desc: t(
        "Every lesson explains one idea properly — no filler, and every command comes with the output it really prints.",
        "Har dars bitta g'oyani tugal tushuntiradi — quruq gap yo'q, va har buyruq o'zi chiqaradigan natija bilan keladi.",
        "Каждый урок объясняет одну идею как следует — без воды, и каждая команда идёт с её реальным выводом.",
      ),
    },
    {
      icon: Terminal,
      img: "/images/step-run.webp",
      title: t("Run it yourself", "O'zingiz bajaring", "Выполните сами"),
      desc: t(
        "Copy the command into your own terminal and watch it work. You learn the tool, not a screenshot of it.",
        "Buyruqni o'z terminalingizga ko'chiring va ishlaganini ko'ring. Vositani o'rganasiz, uning rasmini emas.",
        "Скопируйте команду в свой терминал и посмотрите, как она работает. Вы учите инструмент, а не его скриншот.",
      ),
    },
    {
      icon: Flag,
      img: "/images/step-flag.webp",
      title: t("Capture the flag", "Flagni qo'lga kiriting", "Захватите флаг"),
      desc: t(
        "Pass the lesson test, earn points, then prove the whole module in a final exam and take the certificate.",
        "Dars testidan o'ting, ball to'plang, so'ng butun modulni yakuniy imtihonda isbotlab sertifikat oling.",
        "Сдайте тест урока, получите очки, затем подтвердите модуль на экзамене и заберите сертификат.",
      ),
    },
  ];

  const faq = [
    {
      q: t("Is it really free?", "Rostdan bepulmi?", "Это правда бесплатно?"),
      a: t(
        "Yes — every module, lesson, exam and certificate. cdCTF exists to grow the Uzbek security community, not to sell a subscription.",
        "Ha — har modul, dars, imtihon va sertifikat. cdCTF obuna sotish uchun emas, O'zbek xavfsizlik jamiyatini o'stirish uchun bor.",
        "Да — каждый модуль, урок, экзамен и сертификат. cdCTF существует, чтобы растить узбекское сообщество безопасности, а не продавать подписку.",
      ),
    },
    {
      q: t("Do I need experience?", "Tajriba kerakmi?", "Нужен ли опыт?"),
      a: t(
        "No. The path starts at your first shell command and builds in order. If you can use a computer, you can start today.",
        "Yo'q. Yo'l birinchi shell buyrug'idan boshlanadi va ketma-ket quriladi. Kompyuterdan foydalana olsangiz, bugun boshlashingiz mumkin.",
        "Нет. Путь начинается с первой команды оболочки и строится по порядку. Если вы умеете пользоваться компьютером — можете начать сегодня.",
      ),
    },
    {
      q: t("How long does it take?", "Qancha vaqt oladi?", "Сколько времени займёт?"),
      a: t(
        "About six months at a steady pace — roughly 340 hours across eight modules. It is yours to go faster or slower.",
        "Bir tekis sur'atda taxminan olti oy — sakkiz modulda qariyb 340 soat. Tezroq yoki sekinroq borish o'zingizga bog'liq.",
        "Около шести месяцев в ровном темпе — примерно 340 часов на восемь модулей. Быстрее или медленнее — решать вам.",
      ),
    },
    {
      q: t("What do I need installed?", "Nima o'rnatishim kerak?", "Что нужно установить?"),
      a: t(
        "A Linux machine or a virtual one — Kali or Ubuntu both work. The first module sets it up with you, step by step.",
        "Linux mashina yoki virtuali — Kali ham, Ubuntu ham bo'ladi. Birinchi modul uni siz bilan birga, qadamma-qadam sozlaydi.",
        "Машина с Linux или виртуальная — подойдут и Kali, и Ubuntu. Первый модуль настраивает её вместе с вами, шаг за шагом.",
      ),
    },
    {
      q: t("Is the certificate worth anything?", "Sertifikat biror narsaga arziydimi?", "Сертификат чего-то стоит?"),
      a: t(
        "Each one carries your score and a serial anyone can verify. It is proof of work, and the writeups and CTF profile you build alongside it are what employers actually read.",
        "Har birida balingiz va har kim tekshira oladigan seriya raqami bor. Bu — qilingan ishning isboti, va yonida quradigan writeup'laringiz hamda CTF profilingiz ish beruvchilar aslida o'qiydigan narsa.",
        "На каждом — ваш балл и серийный номер, который может проверить любой. Это доказательство работы, а разборы и CTF-профиль рядом с ним — то, что работодатели действительно читают.",
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Dark: hero ─────────────────────────────────────────────── */}
      <div className="relative">
        <div className="fixed inset-0 mono-grid pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6">
          <section className="pt-28 sm:pt-36 pb-20 grid lg:grid-cols-[1fr_1.05fr] gap-14 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="eyebrow mb-6 mx-auto lg:mx-0">
                {t("cdCTF · Cybersecurity Academy", "cdCTF · Kiberxavfsizlik akademiyasi", "cdCTF · Академия кибербезопасности")}
              </div>
              <h1 className="text-[2.75rem] sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.04] mb-6">
                {t("Learn to hack.", "Hacking'ni o'rganing.", "Учитесь взламывать.")}<br />
                <span className="gradient-text">{t("Learn to defend.", "Himoyani o'rganing.", "Учитесь защищать.")}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed">
                {t(
                  "A hands-on, six-month cybersecurity program in Uzbek, Russian and English — with real terminal commands, CTF practice, and a certificate at the end.",
                  "Amaliy, 6 oylik kiberxavfsizlik dasturi — o'zbek, rus va ingliz tilida, real terminal buyruqlar, CTF mashqlar va oxirida sertifikat bilan.",
                  "Практическая шестимесячная программа по кибербезопасности на узбекском, русском и английском — с реальными командами, CTF и сертификатом.",
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">
                <Link href="/modules" className="w-full sm:w-auto">
                  <button className="cyber-button h-12 px-8 w-full sm:w-auto" data-testid="button-hero-start">
                    <GraduationCap className="w-4 h-4" />
                    {t("Start learning", "O'rganishni boshlash", "Начать обучение")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/ctf" className="w-full sm:w-auto">
                  <button className="cyber-button-outline h-12 px-8 w-full sm:w-auto" data-testid="button-hero-ctf">
                    {t("Try the CTF challenges", "CTF topshiriqlarni sinash", "Попробовать CTF")}
                  </button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mt-6 text-xs text-muted-foreground">
                {[
                  t("Free, forever", "Bepul, doim", "Бесплатно, навсегда"),
                  t("No experience needed", "Tajriba shart emas", "Опыт не нужен"),
                  t("Certificate included", "Sertifikat bilan", "С сертификатом"),
                ].map(x => (
                  <span key={x} className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-primary" /> {x}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:pl-4"><HeroTerminal /></div>
          </section>

          {/* Trust band */}
          <section className="pb-24">
            <div className="glass-card !p-0 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border overflow-hidden">
              {stats.map((s, i) => (
                <div key={i} className="text-center py-7 px-4">
                  <div className="text-3xl sm:text-4xl font-bold gradient-text tabular-nums">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Bright band: how it works + the curriculum ──────────────── */}
      <div className="section-alt relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="eyebrow mb-3">{t("How it works", "Qanday ishlaydi", "Как это работает")}</div>
          <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-3 max-w-2xl leading-tight">
            {t("Read it, run it, capture the flag", "O'qing, bajaring, flagni oling", "Прочитайте, выполните, возьмите флаг")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-12">
            {t(
              "The same loop in every lesson — which is why the skill actually sticks.",
              "Har darsda bir xil aylanma — ko'nikma aynan shuning uchun qoladi.",
              "Один и тот же цикл в каждом уроке — именно поэтому навык закрепляется.",
            )}
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-24">
            {steps.map((s, i) => (
              <div key={i} className="glass-card !p-0 overflow-hidden flex flex-col">
                {/* width/height are set so the row never reflows while the
                    image loads; the first card is eager because it is close
                    to the fold on a phone. */}
                <img
                  src={s.img}
                  alt=""
                  width={900}
                  height={491}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full aspect-[900/491] object-cover border-b border-border"
                />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                      <s.icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Curriculum — the cards TryHackMe leads with, in our own art */}
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <div className="eyebrow mb-3">{t("The curriculum", "O'quv dasturi", "Программа")}</div>
              <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight leading-tight">
                {t("Eight modules, in order", "Sakkiz modul, ketma-ket", "Восемь модулей, по порядку")}
              </h2>
            </div>
            <Link href="/modules" className="hidden sm:inline-flex items-center gap-1 min-h-[24px] py-1 text-sm font-medium text-primary hover:text-accent transition-colors shrink-0">
              {t("See the full path", "To'liq yo'lni ko'rish", "Смотреть весь путь")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CURRICULUM.map((c, i) => {
              const Art = MODULE_ART[c.slug];
              const lvl = levels[c.lvl];
              return (
                <Link key={c.slug} href="/modules">
                  <article className="glass-card !p-0 group cursor-pointer h-full overflow-hidden flex flex-col">
                    {/* The cover is the hero of the card, not a small icon. */}
                    <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/[0.12] to-accent/[0.05] border-b border-border overflow-hidden">
                      <Art className="absolute inset-0 w-full h-full p-3" />
                      <span className="absolute top-3 left-3 font-mono text-[10px] text-muted-foreground bg-background/70 backdrop-blur-sm rounded px-1.5 py-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <span className={`self-start text-[10px] font-medium px-2 py-0.5 rounded-full border mb-2 ${lvl.cls}`}>
                        {lvl.label}
                      </span>
                      <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                        {t(c.en, c.uz, c.ru)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {t(`8 lessons · ${c.h}h`, `8 dars · ${c.h} soat`, `8 уроков · ${c.h} ч`)}
                      </p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>

          <Link href="/modules" className="sm:hidden mt-6 block">
            <button className="cyber-button-outline h-11 px-6 w-full">
              {t("See the full path", "To'liq yo'lni ko'rish", "Смотреть весь путь")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* ── Dark: inside a lesson + practice ────────────────────────── */}
      <div className="relative">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="eyebrow mb-3">{t("Inside a lesson", "Dars ichida", "Внутри урока")}</div>
              <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-4 leading-tight">
                {t("Commands you actually run", "Siz haqiqatan bajaradigan buyruqlar", "Команды, которые вы реально выполняете")}
              </h2>
              <p className="text-muted-foreground mb-7 leading-relaxed">
                {t(
                  "No screenshots of someone else's terminal. Copy the command, run it on your own machine, and compare against the output printed right there in the lesson.",
                  "Birovning terminali rasmi emas. Buyruqni ko'chiring, o'z mashinangizda bajaring va darsda yozib qo'yilgan natija bilan solishtiring.",
                  "Никаких скриншотов чужого терминала. Скопируйте команду, выполните на своей машине и сравните с выводом, приведённым прямо в уроке.",
                )}
              </p>
              <ul className="space-y-3">
                {[
                  t("One-tap copy on every code block", "Har kod blokida bir bosishda nusxa", "Копирование в один тап в каждом блоке"),
                  t("A test after each lesson, with three attempts", "Har darsdan keyin test, uch urinish bilan", "Тест после каждого урока, три попытки"),
                  t("Prev / next navigation so you never lose the thread", "Oldingi / keyingi navigatsiya — ipni yo'qotmaysiz", "Навигация назад / вперёд — не потеряете нить"),
                ].map(x => (
                  <li key={x} className="flex gap-3 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            {/* A live miniature of the reader, rather than a static image. */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--accent) / 0.22), transparent 70%)" }} />
              <div className="relative glass-card !p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  {t("Lesson 4 of 8 · Recon", "Dars 4/8 · Razvedka", "Урок 4 из 8 · Разведка")}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold mb-3">
                    {t("Finding live hosts", "Tirik hostlarni topish", "Поиск живых хостов")}
                  </h3>
                  <div className="h-2 rounded-full bg-muted mb-1.5" />
                  <div className="h-2 rounded-full bg-muted w-4/5 mb-4" />
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-primary/[0.06] border-b border-border">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">shell</span>
                      <span className="font-mono text-[10px] text-primary">{t("Copy", "Nusxa", "Копия")}</span>
                    </div>
                    <pre className="p-3 font-mono text-[11px] leading-5 overflow-x-auto">
<span className="text-primary">$ nmap -sn 10.10.12.0/24</span>{"\n"}
<span className="text-muted-foreground">Nmap scan report for 10.10.12.85</span>{"\n"}
<span className="text-muted-foreground">Host is up (0.0021s latency).</span>{"\n"}
<span className="text-accent">3 hosts up, scanned in 2.14s</span>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Practice */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 grid grid-cols-2 gap-3">
              {[
                { n: "Baby SQLi", pts: 150, cat: "web" },
                { n: "XOR Me", pts: 200, cat: "crypto" },
                { n: "Lost Packet", pts: 300, cat: "forensics" },
                { n: "Root Me", pts: 450, cat: "pwn" },
              ].map((c, i) => (
                <div key={c.n} className={`glass-card !p-4 ${i % 2 ? "translate-y-4" : ""}`}>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{c.cat}</div>
                  <div className="font-semibold text-sm mb-3">{c.n}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-semibold text-sm tabular-nums">{c.pts}</span>
                    <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
            <div className="order-1 lg:order-2">
              <div className="eyebrow mb-3">{t("Practice", "Amaliyot", "Практика")}</div>
              <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-4 leading-tight">
                {t("Then prove it on real challenges", "So'ng buni real topshiriqlarda isbotlang", "Затем докажите это на реальных заданиях")}
              </h2>
              <p className="text-muted-foreground mb-7 leading-relaxed">
                {t(
                  "Dozens of CTF challenges across web, crypto, forensics and more — the same categories the lessons teach. Submit a flag, take the points, climb the board.",
                  "Veb, kripto, forenzika va boshqa yo'nalishlarda o'nlab CTF topshiriq — darslar o'rgatgan o'sha kategoriyalar. Flagni topshiring, ballni oling, reytingda ko'tariling.",
                  "Десятки CTF-заданий по вебу, крипте, форензике и другим — те же категории, что и в уроках. Сдайте флаг, получите очки, поднимитесь в таблице.",
                )}
              </p>
              <Link href="/ctf" className="inline-block">
                <button className="cyber-button h-12 px-7">
                  {t("Browse challenges", "Topshiriqlarni ko'rish", "Смотреть задания")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bright band: the certificate ────────────────────────────── */}
      <div className="section-alt relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12">
            <div className="eyebrow mb-3">{t("Proof of work", "Ish isboti", "Доказательство работы")}</div>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-4 leading-tight">
              {t("A certificate per module — and a diploma at the end", "Har modulga sertifikat — oxirida esa diplom", "Сертификат за модуль — и диплом в конце")}
            </h2>
            <p className="text-muted-foreground mb-7 leading-relaxed">
              {t(
                "Pass a module's final exam at 80% or above and the certificate is issued with your score and a serial number anyone can verify. Finish all eight and the program diploma follows.",
                "Modul yakuniy imtihonidan 80% va undan yuqori o'ting — sertifikat balingiz va har kim tekshira oladigan seriya raqami bilan beriladi. Sakkizalasini tugatsangiz, dastur diplomi keladi.",
                "Сдайте итоговый экзамен модуля на 80% и выше — сертификат выдаётся с вашим баллом и серийным номером, который может проверить любой. Пройдите все восемь — и получите диплом программы.",
              )}
            </p>
            <Link href="/modules" className="inline-block">
              <button className="cyber-button h-12 px-7">
                {t("Start module 01", "01-moduldan boshlash", "Начать с модуля 01")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* The real sheet, not a mock — the landing should show exactly what
              is issued. The recipient reads "Your name" rather than a person's,
              so it is plainly a specimen and invents nobody. */}
          <div className="max-w-3xl mx-auto">
            <CredentialFrame>
              <ModuleCertificate
                d={{
                  fullName: t("Your name", "Sizning ismingiz", "Ваше имя"),
                  subject: t("Linux Command Line for Security", "Xavfsizlik uchun Linux buyruqlar qatori", "Linux для безопасности"),
                  score: 93,
                  serial: "CDCTF-2F9A41C7B0",
                  issued: "21.07.2026",
                  verifyUrl: "cdctf.uz/certificate/…",
                  verifyHref: "https://cdctf.uz/modules",
                  fingerprint: "8deca45f81e1de5d78aa6c1ca47aba2c",
                }}
                l={{
                  title: t("Certificate", "Sertifikat", "Сертификат"),
                  certifies: t("Awarded to", "Kimga berildi", "Выдан"),
                  completed: "",
                  scoreLabel: t("Final score", "Yakuniy ball", "Итоговый балл"),
                  issued: t("Issued", "Berilgan", "Выдан"),
                  signatoryName: "Hikmatbek Xudoyberganov Jur'at o'g'li",
                  signatoryRole: t("Founder & Director", "Asoschi va direktor", "Основатель и директор"),
                }}
              />
            </CredentialFrame>
            <p className="text-xs text-muted-foreground text-center mt-4">
              {t(
                "Specimen. Every issued certificate carries a serial and fingerprint anyone can check.",
                "Namuna. Beriladigan har bir sertifikatda har kim tekshira oladigan seriya va barmoq izi bo'ladi.",
                "Образец. На каждом выданном сертификате — серийный номер и отпечаток, которые может проверить любой.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Dark: leaderboard, community, FAQ, CTA ──────────────────── */}
      <div className="relative">
        <div className="max-w-6xl mx-auto px-6 py-24">
          {scoreboardEntries.length > 0 && (
            <section className="mb-24">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="eyebrow mb-2 flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5" />
                    {t("Leaderboard", "Reyting", "Рейтинг")}
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">{t("Top players", "Eng yaxshilar", "Лучшие игроки")}</h2>
                </div>
                <Link href="/scoreboard" className="inline-flex items-center gap-1 min-h-[24px] py-1 text-sm font-medium text-primary hover:text-accent transition-colors">
                  {t("Full ranking", "To'liq reyting", "Весь рейтинг")}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="glass-card divide-y divide-border !p-0 overflow-hidden">
                {scoreboardEntries.map((entry, i) => (
                  <Link href={`/profile/${entry.userId}`} key={entry.userId}>
                    <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-sm font-semibold tabular-nums w-6 text-center shrink-0 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                          {i + 1}
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center font-semibold text-primary shrink-0">
                          {entry.nickname[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium truncate">{entry.nickname}</span>
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                        {entry.points.toLocaleString()} {t("pts", "ball", "очк.")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Community */}
          <section className="mb-24">
            <div className="glass-card !p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(50% 70% at 50% 0%, hsl(var(--primary) / 0.16), transparent 70%)" }} />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                  {t("Learning is easier together", "Birga o'rganish osonroq", "Вместе учиться легче")}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-7">
                  {t(
                    "Ask questions, share writeups, and find a team for the next CTF — in Uzbek, with people at the same stage as you.",
                    "Savol bering, writeup ulashing va keyingi CTF uchun jamoa toping — o'zbek tilida, siz bilan bir bosqichdagi odamlar bilan.",
                    "Задавайте вопросы, делитесь разборами и находите команду для следующего CTF — на узбекском, с людьми на вашем этапе.",
                  )}
                </p>
                <a href="https://t.me/cdctf" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 h-12 rounded-xl bg-[#0077b0] text-white font-medium hover:bg-[#0088cc] transition-colors">
                  <Send className="w-4 h-4" />
                  {t("Join the Telegram", "Telegramga qo'shilish", "Вступить в Telegram")}
                </a>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-24 max-w-3xl">
            <div className="eyebrow mb-3">FAQ</div>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-10 leading-tight">
              {t("Questions people ask", "Odamlar so'raydigan savollar", "Что обычно спрашивают")}
            </h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <details key={i} className="glass-card !p-0 overflow-hidden group">
                  <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                    <span className="font-medium">{f.q}</span>
                    <span className="shrink-0 text-muted-foreground">
                      <ChevronRight className="chev-closed w-5 h-5" />
                      <ChevronDown className="chev-open w-5 h-5" />
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="pb-8">
            <div className="glass-card !p-12 sm:!p-16 text-center relative overflow-hidden border-primary/30">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(60% 90% at 50% 0%, hsl(var(--primary) / 0.28), transparent 70%)" }} />
              <div className="relative">
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
                  {t("Your first command is", "Birinchi buyrug'ingiz", "Ваша первая команда —")}{" "}
                  <span className="gradient-text">{t("one click away", "bir bosish narida", "в одном клике")}</span>
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-9">
                  {t(
                    "Eight modules, sixty-four lessons, and a certificate at every step. Free, in your language.",
                    "Sakkiz modul, oltmish to'rt dars va har qadamda sertifikat. Bepul, o'z tilingizda.",
                    "Восемь модулей, шестьдесят четыре урока и сертификат на каждом шаге. Бесплатно, на вашем языке.",
                  )}
                </p>
                <Link href="/register" className="inline-block">
                  <button className="cyber-button h-14 px-10 text-base">
                    {t("Create a free account", "Bepul hisob yaratish", "Создать бесплатный аккаунт")}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-14 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-10 sm:grid-cols-3 mb-10">
            <div className="sm:col-span-1">
              <div className="text-2xl font-bold tracking-tight mb-3">
                <span className="gradient-text">cd</span><span className="text-foreground/60">CTF</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-5">
                {t(
                  "The cybersecurity academy for the Uzbek community — learn, practice, and get certified.",
                  "O'zbek jamiyati uchun kiberxavfsizlik akademiyasi — o'rganing, mashq qiling va sertifikat oling.",
                  "Академия кибербезопасности для узбекского сообщества — учитесь, практикуйтесь, получайте сертификат.",
                )}
              </p>
              <a href="https://t.me/cdctf" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0077b0] text-white text-sm font-medium hover:bg-[#0088cc] transition-colors">
                <Send className="w-4 h-4" />
                Telegram
              </a>
            </div>
            <div>
              <div className="eyebrow mb-4">{t("Learn", "O'rganish", "Обучение")}</div>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/modules" className="inline-flex items-center min-h-[24px] py-1 text-muted-foreground hover:text-primary transition-colors">{t("Modules", "Modullar", "Модули")}</Link></li>
                <li><Link href="/learn" className="inline-flex items-center min-h-[24px] py-1 text-muted-foreground hover:text-primary transition-colors">{t("Lessons", "Darslar", "Уроки")}</Link></li>
                <li><Link href="/ctf" className="inline-flex items-center min-h-[24px] py-1 text-muted-foreground hover:text-primary transition-colors">{t("CTF challenges", "CTF topshiriqlar", "CTF задания")}</Link></li>
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-4">{t("Compete", "Bellashuv", "Соревнование")}</div>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/scoreboard" className="inline-flex items-center min-h-[24px] py-1 text-muted-foreground hover:text-primary transition-colors">{t("Leaderboard", "Reyting", "Рейтинг")}</Link></li>
                <li><Link href="/competitions" className="inline-flex items-center min-h-[24px] py-1 text-muted-foreground hover:text-primary transition-colors">{t("Competitions", "Musobaqalar", "Соревнования")}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-sm text-muted-foreground flex items-center gap-2">
            <Languages className="w-4 h-4" />
            © {new Date().getFullYear()} cdCTF
          </div>
        </div>
      </footer>
    </div>
  );
}
