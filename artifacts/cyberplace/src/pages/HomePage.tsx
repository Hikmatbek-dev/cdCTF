import { Link } from "wouter";
import { Trophy, Send, GraduationCap, Award, Terminal, Languages, ArrowRight, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard, useListModules, getListModulesQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";

type ScoreEntry = { userId: number; nickname: string; points: number };

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
        {/* Hero */}
        <section className="pt-32 sm:pt-40 pb-20 text-center">
          <div className="eyebrow justify-center flex mb-6">
            {t("cdCTF · Cybersecurity Academy", "cdCTF · Kiberxavfsizlik akademiyasi", "cdCTF · Академия кибербезопасности")}
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            {t("Learn to hack.", "Hacking'ni o'rganing.", "Учитесь взламывать.")}<br />
            <span className="gradient-text">{t("Learn to defend.", "Himoyani o'rganing.", "Учитесь защищать.")}</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {t(
              "A hands-on, six-month cybersecurity program in Uzbek, Russian and English — with real terminal commands, CTF practice, and a certificate at the end.",
              "Amaliy, 6 oylik kiberxavfsizlik dasturi — o'zbek, rus va ingliz tilida, real terminal buyruqlar, CTF mashqlar va oxirida sertifikat bilan.",
              "Практическая шестимесячная программа по кибербезопасности на узбекском, русском и английском — с реальными командами, CTF и сертификатом.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/modules">
              <button className="cyber-button h-12 px-8" data-testid="button-hero-start">
                <GraduationCap className="w-4 h-4" />
                {t("Start learning", "O'rganishni boshlash", "Начать обучение")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/ctf">
              <button className="cyber-button-outline h-12 px-8" data-testid="button-hero-ctf">
                {t("Try the CTF challenges", "CTF topshiriqlarni sinash", "Попробовать CTF")}
              </button>
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-24">
          {stats.map((s, i) => (
            <div key={i} className="glass-card text-center py-6">
              <div className="text-3xl font-bold text-primary tabular-nums">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
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

        {/* Path preview → modules */}
        <section className="pb-24">
          <Link href="/modules">
            <div className="glass-card group flex items-center justify-between gap-4 cursor-pointer border-primary/30">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shrink-0 neon-glow">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="eyebrow mb-1">{t("The curriculum", "O'quv dasturi", "Программа")}</div>
                  <h3 className="text-base font-semibold group-hover:text-primary transition-colors">
                    {t("Eight modules, beginner to advanced — start now", "Sakkiz modul, boshlang'ichdan ilg'orgacha — hoziroq boshlang", "Восемь модулей, от новичка до продвинутого — начните сейчас")}
                  </h3>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0088cc] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
                Telegram
              </a>
            </div>
            <div>
              <div className="eyebrow mb-4">{t("Learn", "O'rganish", "Обучение")}</div>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/modules" className="text-muted-foreground hover:text-primary transition-colors">{t("Modules", "Modullar", "Модули")}</Link></li>
                <li><Link href="/learn" className="text-muted-foreground hover:text-primary transition-colors">{t("Lessons", "Darslar", "Уроки")}</Link></li>
                <li><Link href="/ctf" className="text-muted-foreground hover:text-primary transition-colors">{t("CTF challenges", "CTF topshiriqlar", "CTF задания")}</Link></li>
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-4">{t("Compete", "Bellashuv", "Соревнование")}</div>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/scoreboard" className="text-muted-foreground hover:text-primary transition-colors">{t("Leaderboard", "Reyting", "Рейтинг")}</Link></li>
                <li><Link href="/competitions" className="text-muted-foreground hover:text-primary transition-colors">{t("Competitions", "Musobaqalar", "Соревнования")}</Link></li>
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
