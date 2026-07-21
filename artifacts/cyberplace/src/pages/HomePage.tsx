import { Link } from "wouter";
import { Trophy, Send, GraduationCap, Award, Terminal, Languages, ArrowRight, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { HeroTerminal } from "@/components/HeroTerminal";
import { MODULE_ART } from "@/components/ModuleArt";
import { useGetScoreboard, useListModules, getListModulesQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";

type ScoreEntry = { userId: number; nickname: string; points: number };

/** The eight modules, in path order — titles kept short for the preview grid. */
const CURRICULUM = [
  { slug: "linux-command-line", en: "Linux", uz: "Linux", ru: "Linux" },
  { slug: "networking-for-security", en: "Networking", uz: "Tarmoqlar", ru: "Сети" },
  { slug: "web-application-security", en: "Web Security", uz: "Veb xavfsizlik", ru: "Веб-безопасность" },
  { slug: "cryptography-for-security", en: "Cryptography", uz: "Kriptografiya", ru: "Криптография" },
  { slug: "reconnaissance-and-scanning", en: "Recon", uz: "Razvedka", ru: "Разведка" },
  { slug: "exploitation-and-privilege-escalation", en: "Exploitation", uz: "Ekspluatatsiya", ru: "Эксплуатация" },
  { slug: "forensics-and-incident-response", en: "Forensics & IR", uz: "Forenzika", ru: "Форензика" },
  { slug: "ctf-methodology", en: "CTF Methodology", uz: "CTF metodikasi", ru: "Методология CTF" },
] as const;

export default function HomePage() {
  const { t } = useLang();
  const { data: scoreboard } = useGetScoreboard({ limit: 5 });
  const scoreboardEntries = normalizeArray<ScoreEntry>(scoreboard?.entries, ["entries", "data", "items"]);
  const { data: modulesData } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const moduleCount = normalizeArray<{ id: number }>(modulesData, ["id"]).length;

  const stats = [
    { value: moduleCount > 0 ? `${moduleCount}` : "8", label: t("modules", "modul", "модулей") },
    { value: "64+", label: t("lessons", "dars", "уроков") },
    { value: "40+", label: t("CTF challenges", "CTF topshiriq", "CTF заданий") },
    { value: "3", label: t("languages", "til", "языка") },
  ];

  const pillars = [
    {
      icon: GraduationCap,
      title: t("A structured path", "Tuzilgan yo'l", "Структурированный путь"),
      desc: t(
        "Eight modules from the shell to full attack chains, forensics and CTF play — Linux, networking, web, crypto, recon, exploitation, DFIR, competition. In order, one skill at a time.",
        "Shelldan to'liq hujum zanjiri, forenzika va CTF'gacha sakkiz modul — Linux, tarmoq, veb, kriptografiya, razvedka, ekspluatatsiya, forenzika, musobaqa. Ketma-ketlikda.",
        "Восемь модулей от оболочки до полных цепочек атаки, форензики и CTF — Linux, сети, веб, крипто, разведка, эксплуатация, DFIR, соревнования.",
      ),
    },
    {
      icon: Terminal,
      title: t("Real commands", "Haqiqiy buyruqlar", "Настоящие команды"),
      desc: t(
        "Not dry theory. Every lesson has commands you run yourself and the output they really print — learn by doing on your own machine.",
        "Quruq nazariya emas. Har bir darsda o'zingiz bajaradigan buyruqlar va ularning haqiqiy chiqishi bor — qilib o'rganing.",
        "Не сухая теория. В каждом уроке команды, которые вы выполняете сами, и их реальный вывод — учитесь на практике.",
      ),
    },
    {
      icon: Award,
      title: t("Certificates & a diploma", "Sertifikat va diplom", "Сертификаты и диплом"),
      desc: t(
        "Pass a module's exam and earn a cdCTF certificate with your score. Finish the whole program for the diploma — a credential you can show an employer.",
        "Modul imtihonidan o'ting va balingiz yozilgan cdCTF sertifikatini oling. Butun dasturni tugatib diplom oling — ish beruvchiga ko'rsatiladigan hujjat.",
        "Сдайте экзамен модуля и получите сертификат cdCTF с баллом. Пройдите всю программу ради диплома — документа для работодателя.",
      ),
    },
    {
      icon: Languages,
      title: t("In your language, free", "O'z tilingizda, bepul", "На вашем языке, бесплатно"),
      desc: t(
        "Every lesson in Uzbek, Russian and English. The first complete cybersecurity academy for the Uzbek community — no language barrier.",
        "Har bir dars o'zbek, rus va ingliz tilida. O'zbek jamiyati uchun birinchi to'liq kiberxavfsizlik akademiyasi — til to'sig'isiz.",
        "Каждый урок на узбекском, русском и английском. Первая полная академия кибербезопасности для узбекского сообщества.",
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Faint signature grid behind the hero. */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Hero — copy on the left, a live terminal on the right. */}
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
          </div>

          <div className="lg:pl-4">
            <HeroTerminal />
          </div>
        </section>

        {/* Stats — one band rather than four detached boxes. */}
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

        {/* Value pillars */}
        <section className="pb-24">
          <div className="eyebrow mb-3">{t("Why cdCTF", "Nega cdCTF", "Почему cdCTF")}</div>
          <h2 className="text-3xl font-bold tracking-tight mb-10">
            {t("Not another challenge dump", "Shunchaki topshiriqlar to'plami emas", "Не просто набор заданий")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {pillars.map((p, i) => (
              <div key={i} className="glass-card">
                <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The curriculum, shown rather than described. */}
        <section className="pb-24">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <div className="eyebrow mb-2">{t("The curriculum", "O'quv dasturi", "Программа")}</div>
              <h2 className="text-3xl font-bold tracking-tight">
                {t("Eight modules, in order", "Sakkiz modul, ketma-ket", "Восемь модулей, по порядку")}
              </h2>
            </div>
            <Link href="/modules" className="hidden sm:inline-flex items-center gap-1 min-h-[24px] py-1 text-sm font-medium text-primary hover:text-accent transition-colors shrink-0">
              {t("See the path", "Yo'lni ko'rish", "Смотреть путь")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CURRICULUM.map((c, i) => {
              const Art = MODULE_ART[c.slug];
              return (
                <Link key={c.slug} href="/modules">
                  <div className="glass-card !p-4 group cursor-pointer h-full flex flex-col items-center text-center">
                    <div className="w-full aspect-square max-w-[104px] mb-3">
                      <Art className="w-full h-full" />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mb-1">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                      {t(c.en, c.uz, c.ru)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link href="/modules" className="sm:hidden mt-4 flex justify-center">
            <button className="cyber-button-outline h-11 px-6 w-full">
              {t("See the path", "Yo'lni ko'rish", "Смотреть путь")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </section>

        {/* Scoreboard preview */}
        {scoreboardEntries.length > 0 && (
          <section className="pb-24">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="eyebrow mb-1 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5" />
                  {t("Leaderboard", "Reyting", "Рейтинг")}
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{t("Top players", "Eng yaxshilar", "Лучшие игроки")}</h2>
              </div>
              <Link href="/scoreboard" className="text-sm font-medium text-primary hover:text-accent transition-colors inline-flex items-center gap-1">
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
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-10 sm:grid-cols-3 mb-10">
            <div className="sm:col-span-1">
              <div className="text-2xl font-bold tracking-tight mb-3">
                <span className="gradient-text">cd</span><span className="text-muted-foreground">CTF</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-5">
                {t(
                  "The cybersecurity academy for the Uzbek community — learn, practice, and get certified.",
                  "O'zbek jamiyati uchun kiberxavfsizlik akademiyasi — o'rganing, mashq qiling va sertifikat oling.",
                  "Академия кибербезопасности для узбекского сообщества — учитесь, практикуйтесь, получайте сертификат.",
                )}
              </p>
              <a
                href="https://t.me/cdctf_uz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0077b0] text-white text-sm font-medium hover:bg-[#0088cc] transition-colors"
              >
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
          <div className="pt-8 border-t border-border text-sm text-muted-foreground">
            © {new Date().getFullYear()} cdCTF
          </div>
        </div>
      </footer>
    </div>
  );
}
