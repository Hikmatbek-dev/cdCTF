import { Link } from "wouter";
import { Shield, Target, BookOpen, Trophy, Users, Zap, ChevronRight, Lock, Code, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/LanguageContext";
import { useGetCtfStats, useGetScoreboard } from "@workspace/api-client-react";

export default function HomePage() {
  const { t } = useLang();
  const { data: stats } = useGetCtfStats();
  const { data: scoreboard } = useGetScoreboard({ limit: 5 });
  const categoryCounts = stats?.categoryCounts ?? [];
  const mostSolved = stats?.mostSolved ?? [];
  const scoreboardEntries = scoreboard?.entries ?? [];

  const features = [
    {
      icon: Target,
      title: t("CTF Challenges", "CTF Topshiriqlari", "CTF Задания"),
      desc: t("Solve real-world cybersecurity challenges across Web, Crypto, Reverse, Forensics, Pwn, OSINT and more.", "Haqiqiy kiberhavfsizlik topshiriqlarini hal qiling.", "Решайте реальные задачи по кибербезопасности."),
    },
    {
      icon: BookOpen,
      title: t("Structured Learning", "Tizimli Ta'lim", "Структурированное обучение"),
      desc: t("Learn cybersecurity with written guides, code examples, and interactive tests.", "Yozma qo'llanmalar, kod misollari va testlar bilan o'rganing.", "Учитесь с письменными руководствами и тестами."),
    },
    {
      icon: Trophy,
      title: t("Monthly Competitions", "Oylik Musobaqalar", "Ежемесячные соревнования"),
      desc: t("Compete with others in time-limited CTF competitions and earn certificates.", "Boshqalar bilan raqobatlashing va sertifikatlar oling.", "Соревнуйтесь и получайте сертификаты."),
    },
    {
      icon: Users,
      title: t("Global Scoreboard", "Global Reyting", "Глобальный рейтинг"),
      desc: t("Earn points, unlock titles, and climb the global leaderboard.", "Ball to'plang, unvonlar oching va reytingda yuksaling.", "Зарабатывайте очки и поднимайтесь в рейтинге."),
    },
  ];

  const categories = [
    { icon: Code, name: "Web Hacking" },
    { icon: Lock, name: "Cryptography" },
    { icon: Search, name: "OSINT" },
    { icon: Zap, name: "Binary Exploitation" },
    { icon: Shield, name: "Forensics" },
    { icon: Target, name: "Steganography" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("Cybersecurity Learning Platform", "Kiberhavfsizlik Ta'lim Platformasi", "Платформа обучения кибербезопасности")}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            {t("Master Cybersecurity.", "Kiberhavfsizlikni", "Освойте")} <span className="text-primary">{t("One Challenge at a Time.", "O'rganing.", "Кибербезопасность.")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            {t(
              "cdCTF means entering CTF like typing cd in a terminal: solve challenges, study structured content, and compete with others.",
              "cdCTF terminaldagi cd kabi CTFga kirish degani: topshiriqlarni yeching, darslarni o'rganing va musobaqalarda qatnashing.",
              "cdCTF означает вход в CTF как команда cd в терминале: решайте задания, учитесь и соревнуйтесь."
            )}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-get-started">
                {t("Get Started", "Boshlash", "Начать")} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/ctf">
              <Button size="lg" variant="outline" data-testid="button-browse-ctf">
                {t("Browse CTFs", "CTFlarni Ko'rish", "Смотреть CTF")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="py-8 border-y border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold font-mono text-primary" data-testid="stat-total-challenges">{stats.totalChallenges}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("CTF Challenges", "CTF Topshiriqlari", "CTF Задания")}</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-primary" data-testid="stat-categories">{categoryCounts.length}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("Categories", "Kategoriyalar", "Категории")}</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-primary" data-testid="stat-scoreboard">{scoreboard?.total ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("Players", "O'yinchilar", "Игроков")}</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-primary" data-testid="stat-most-solved">{mostSolved.length > 0 ? mostSolved[0].solvedCount : 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("Most Solved", "Ko'p Yechilgan", "Наибольшее решений")}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">{t("Everything You Need to Level Up", "Rivojlanish uchun hamma narsa", "Всё необходимое для роста")}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group" data-testid={`card-feature-${i}`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8">{t("Challenge Categories", "Topshiriq Kategoriyalari", "Категории заданий")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map((c, i) => {
              const Icon = c.icon;
              return (
                <Link href="/ctf" key={i}>
                  <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-center cursor-pointer" data-testid={`card-category-${i}`}>
                    <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <div className="text-xs font-medium">{c.name}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Players */}
      {scoreboard && scoreboardEntries.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("Top Players", "Eng Yaxshi O'yinchilar", "Лучшие игроки")}</h2>
              <Link href="/scoreboard">
                <Button variant="ghost" size="sm" className="text-primary gap-1">
                  {t("View all", "Hammasini ko'rish", "Все")} <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {scoreboardEntries.map((entry, i) => (
                <Link href={`/profile/${entry.userId}`} key={entry.userId}>
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" data-testid={`row-top-player-${i}`}>
                    <span className="w-6 text-center font-mono text-sm font-bold text-muted-foreground">
                      {entry.rank === 1 ? "1st" : entry.rank === 2 ? "2nd" : entry.rank === 3 ? "3rd" : `${entry.rank}`}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {entry.nickname[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{entry.nickname}</div>
                      <div className="flex gap-2 mt-0.5">
                        {entry.titles.map(title => (
                          <span key={title} className="text-xs text-primary/70 font-mono">{title}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-primary text-sm">{entry.points}</div>
                      <div className="text-xs text-muted-foreground">{t("pts", "ball", "очк")}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">{t("Ready to start your journey?", "Sayohatingizni boshlashga tayyormisiz?", "Готовы начать?")}</h2>
          <p className="text-muted-foreground mb-8">{t("Join thousands of cybersecurity learners on cdCTF.", "cdCTFdagi minglab o'quvchilarga qo'shiling.", "Присоединяйтесь к тысячам специалистов на cdCTF.")}</p>
          <Link href="/register">
            <Button size="lg" className="gap-2" data-testid="button-cta-register">
              {t("Create Free Account", "Bepul Hisob Yaratish", "Создать аккаунт")} <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-bold">cd<span className="text-primary">CTF</span></span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t("Founders: ", "Asoschilari: ", "Основатели: ")}<span className="text-foreground font-medium">Bozkurtuzb &amp; Shadow</span>
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="https://t.me/cyberplace" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Telegram</a>
          <a href="https://instagram.com/cyberplace" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Instagram</a>
        </div>
      </footer>
    </div>
  );
}
