import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  Shield, Cpu, Zap, Search, ChevronRight, CheckCircle2, Lock, ArrowUpRight, Award, Flame, Play, Check, Clock, Code, FileText, Target, Trophy
} from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useListModules, getListModulesQueryKey } from "@workspace/api-client-react";
import { FadeIn } from "@/components/PageTransition";
import { LoadFailure } from "@/components/LoadFailure";
import { Skeleton } from "@/components/ui/skeleton";
import { moduleArtFor } from "@/components/ModuleArt";
import { normalizeArray } from "@/lib/api-shapes";

// Defined 4 Major Paths as requested by the User
export const PATHS = [
  {
    id: "foundation",
    title: { en: "Foundation", uz: "Foundation", ru: "Foundation" },
    description: {
      en: "The core ideas every defender and attacker shares. Networking, Linux CLI, and how the web works.",
      uz: "Har bir himoyachi va hujumchi bilishi kerak bo'lgan asoslar. Tarmoq, Linux CLI va veb qanday ishlashi.",
      ru: "Базовые знания для защитников и атакующих. Сети, Linux CLI и как работает веб."
    },
    icon: Cpu,
    color: "from-sky-500 to-blue-600",
    shadow: "shadow-blue-500/20",
    imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
    modules: ["intro-to-linux-cli", "networking-basics", "web-requests-101", "passwords-and-hashing", "classical-ciphers"],
  },
  {
    id: "red-team",
    title: { en: "Red Team", uz: "Red Team", ru: "Red Team" },
    description: {
      en: "Learn how to attack. Reconnaissance, exploitation, privilege escalation, and offensive tooling.",
      uz: "Hujum qilishni o'rganing. Razvedka, ekspluatatsiya, imtiyozlarni oshirish va hujum vositalari.",
      ru: "Учитесь атаковать. Разведка, эксплуатация, повышение привилегий и инструменты для атаки."
    },
    icon: Flame,
    color: "from-rose-500 to-red-600",
    shadow: "shadow-red-500/20",
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    modules: ["recon-basics", "linux-privesc-basics", "bash-scripting-basics"],
  },
  {
    id: "blue-team",
    title: { en: "Blue Team", uz: "Blue Team", ru: "Blue Team" },
    description: {
      en: "Defend the fortress. Threat hunting, digital forensics, packet analysis, and incident response.",
      uz: "Qal'ani himoya qiling. Tahdidlarni qidirish, raqamli forenzika, paketlar tahlili va insidentlarga javob.",
      ru: "Защищайте крепость. Поиск угроз, цифровая криминалистика, анализ пакетов и реагирование на инциденты."
    },
    icon: Shield,
    color: "from-indigo-500 to-violet-600",
    shadow: "shadow-violet-500/20",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    modules: ["packet-analysis-wireshark", "osint-fundamentals"],
  },
  {
    id: "web-security",
    title: { en: "Web Security", uz: "Web Security", ru: "Web Security" },
    description: {
      en: "Break and secure web apps. SQL Injection, XSS, CSRF, and modern web vulnerabilities.",
      uz: "Veb-ilovalarni buzing va himoya qiling. SQL Injection, XSS, CSRF va zamonaviy veb-zaifliklar.",
      ru: "Взламывайте и защищайте веб-приложения. SQL-инъекции, XSS, CSRF и современные веб-уязвимости."
    },
    icon: Search,
    color: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/20",
    imageUrl: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800&q=80",
    modules: ["sql-injection-101", "xss-101"],
  }
];

// Enrich modules with skills/topics visually
const MODULE_SKILLS: Record<string, string[]> = {
  "intro-to-linux-cli": ["Bash", "File System", "Permissions"],
  "networking-basics": ["TCP/IP", "Ports", "DNS"],
  "web-requests-101": ["HTTP", "Methods", "Headers"],
  "passwords-and-hashing": ["SHA-256", "Salting", "Cracking"],
  "classical-ciphers": ["Caesar", "XOR", "Base64"],
  "recon-basics": ["Nmap", "Subdomains", "Discovery"],
  "linux-privesc-basics": ["SUID", "Cron Jobs", "Root"],
  "bash-scripting-basics": ["Automation", "Variables", "Loops"],
  "packet-analysis-wireshark": ["PCAP", "Filters", "Traffic"],
  "osint-fundamentals": ["Google Dorks", "Social Media", "Public Records"],
  "sql-injection-101": ["Databases", "Payloads", "Bypass"],
  "xss-101": ["JavaScript", "Payloads", "Sanitization"]
};

type ModuleSummary = {
  id: number; slug: string;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string; estimatedHours: number;
  lessonCount: number; completedCount: number;
  examPassed: boolean; certificateSerial?: string | null;
};

export default function LearnPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  const { data: modData, isLoading, isError, refetch } =
    useListModules({ query: { queryKey: getListModulesQueryKey() } });
  
  const allModules = normalizeArray<ModuleSummary>(modData, ["id", "title"]);

  const loc = (en: string, uz?: string | null, ru?: string | null) => (lang === "uz" ? uz : lang === "ru" ? ru : en) || en;

  const selectedPath = PATHS.find(p => p.id === selectedPathId);

  // Filter modules for the selected path
  const pathModules = useMemo(() => {
    if (!selectedPath) return [];
    return allModules.filter(m => selectedPath.modules.includes(m.slug));
  }, [selectedPath, allModules]);

  // Path Progress
  const pathProgress = useMemo(() => {
    if (!pathModules.length) return { percent: 0, completed: 0, total: 0 };
    const completed = pathModules.filter(m => m.examPassed || m.certificateSerial).length;
    return {
      percent: Math.round((completed / pathModules.length) * 100),
      completed,
      total: pathModules.length
    };
  }, [pathModules]);

  const userXp = user?.points ?? 0;
  const currentLevel = Math.floor(userXp / 1000) + 1;
  const nextLevelXp = currentLevel * 1000;
  const levelProgress = ((userXp % 1000) / 1000) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-[150px] pointer-events-none rounded-full" />

      <div className="shell relative z-10 pt-6">
        
        {/* Gamified User Stats Banner */}
        {user && (
          <FadeIn>
            <div className="mb-10 p-5 rounded-3xl border border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md shadow-lg shadow-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20 neon-glow">
                    {currentLevel}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-background border border-border rounded-full p-1 shadow-sm">
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{t("Welcome back, ", "Xush kelibsiz, ", "С возвращением, ")}<span className="text-primary">{user.nickname}</span>!</h2>
                  <p className="text-sm text-muted-foreground">{t("Keep learning to level up.", "Darajangizni oshirish uchun o'qishda davom eting.", "Продолжайте учиться, чтобы повысить уровень.")}</p>
                </div>
              </div>
              
              <div className="flex-1 w-full md:max-w-xs relative z-10">
                <div className="flex justify-between text-xs font-bold font-mono mb-2">
                  <span className="text-muted-foreground uppercase">{t("Level Progress", "Daraja Holati", "Прогресс Уровня")}</span>
                  <span className="text-primary">{userXp} / {nextLevelXp} XP</span>
                </div>
                <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden border border-border/50">
                  <div 
                    className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
              
              <div className="hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl bg-background/50 border border-border/50 relative z-10">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
                </div>
                <div>
                  <div className="text-sm font-bold">{t("1 Day Streak", "1 Kunlik Seriya", "Серия 1 день")}</div>
                  <div className="text-xs text-muted-foreground">{t("You're on fire!", "Ajoyib ketyapsiz!", "Так держать!")}</div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Main Header */}
        <FadeIn delay={0.1}>
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              {t("Choose Your ", "O'z Yo'nalishingizni ", "Выберите ")}
              <span className="gradient-text">{t("Path", "Tanlang", "Путь")}</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t(
                "Select a specialized cybersecurity track. Complete all modules within the path to unlock the final exam and earn your professional certificate.",
                "Maxsus kiberxavfsizlik yo'nalishini tanlang. Yo'nalishdagi barcha modullarni yakunlang, yakuniy imtihonni topshiring va professional sertifikatga ega bo'ling.",
                "Выберите специализированный трек кибербезопасности. Пройдите все модули, чтобы открыть финальный экзамен и получить профессиональный сертификат."
              )}
            </p>
          </div>
        </FadeIn>

        {/* Path Selection Grid */}
        <FadeIn delay={0.1}>
          <div className={`grid gap-4 sm:gap-6 transition-all duration-500 ${selectedPathId ? 'grid-cols-2 sm:grid-cols-4 mb-10' : 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto mb-16'}`}>
            {PATHS.map((path) => {
              const Icon = path.icon;
              const isSelected = selectedPathId === path.id;
              const isCompact = selectedPathId !== null;
              
              return (
                <button
                  key={path.id}
                  onClick={() => setSelectedPathId(isSelected ? null : path.id)}
                  className={`relative text-left rounded-3xl border transition-all duration-300 overflow-hidden group ${
                    isSelected 
                      ? `border-primary bg-card shadow-2xl ${path.shadow} scale-[1.02]` 
                      : `border-border bg-card/60 hover:bg-card hover:border-primary/50 hover:shadow-xl`
                  } ${isCompact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'}`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity duration-500 mix-blend-overlay"
                    style={{ backgroundImage: `url(${path.imageUrl})` }}
                  />
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${path.color} opacity-20 rounded-bl-full blur-3xl group-hover:opacity-40 transition-opacity`} />
                  
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br ${path.color} ${isCompact ? 'w-10 h-10 shadow-lg' : 'w-14 h-14 shadow-xl'}`}>
                      <Icon className={`text-white ${isCompact ? 'w-5 h-5' : 'w-7 h-7'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black tracking-tight text-foreground group-hover:text-primary transition-colors ${isCompact ? 'text-base sm:text-lg mb-1' : 'text-xl sm:text-2xl mb-2'}`}>
                        {loc(path.title.en, path.title.uz, path.title.ru)}
                      </h3>
                      {!isCompact && (
                        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                          {loc(path.description.en, path.description.uz, path.description.ru)}
                        </p>
                      )}
                      
                      {!isCompact && (
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary uppercase tracking-wider">
                          <span>{path.modules.length} {t("Modules", "Modullar", "Модулей")}</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </FadeIn>

        {/* Active Path Content */}
        {selectedPath && (
          <FadeIn delay={0.2}>
            <div className="border-t border-border pt-10">
              
              {/* Path Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative overflow-hidden rounded-3xl p-8 border border-border bg-card/40">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity"
                  style={{ backgroundImage: `url(${selectedPath.imageUrl})` }}
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${selectedPath.color} opacity-10 blur-xl`} />
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-black mb-3 flex items-center gap-3">
                    <selectedPath.icon className={`w-10 h-10 bg-gradient-to-br ${selectedPath.color} text-transparent bg-clip-text drop-shadow-md`} />
                    {loc(selectedPath.title.en, selectedPath.title.uz, selectedPath.title.ru)} {t("Path", "Yo'nalishi", "Путь")}
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-2xl">
                    {loc(selectedPath.description.en, selectedPath.description.uz, selectedPath.description.ru)}
                  </p>
                </div>
                
                {/* Path Progress & Final Exam Action */}
                <div className="glass-card p-5 rounded-2xl border-primary/20 flex items-center gap-6 shrink-0 shadow-2xl relative z-10 bg-background/80 backdrop-blur-md">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground uppercase mb-1 font-bold">
                      {t("Path Progress", "Yo'nalish Holati", "Прогресс Пути")}
                    </div>
                    <div className="text-xl font-black">{pathProgress.completed} / {pathProgress.total}</div>
                  </div>
                  
                  {pathProgress.completed === pathProgress.total && pathProgress.total > 0 ? (
                    <Link href={`/path-exam/${selectedPath.id}`}>
                      <button className="cyber-button h-11 px-5 gap-2 shadow-primary/20">
                        <Award className="w-5 h-5" />
                        {t("Yakuniy Imtihonni Boshlash", "Yakuniy Imtihonni Boshlash", "Начать Финальный Экзамен")}
                      </button>
                    </Link>
                  ) : (
                    <button disabled className="cyber-button-outline h-11 px-5 gap-2 opacity-50 cursor-not-allowed border-dashed">
                      <Lock className="w-4 h-4" />
                      {t("Yakuniy Imtihon", "Yakuniy Imtihon", "Финальный Экзамен")}
                    </button>
                  )}
                </div>
              </div>

              {/* Modules List */}
              {isError ? (
                <LoadFailure onRetry={() => refetch()} />
              ) : isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}
                </div>
              ) : pathModules.length === 0 ? (
                <div className="glass-card text-center py-20 rounded-3xl border-dashed">
                  <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{t("Modules coming soon", "Modullar tayyorlanmoqda", "Модули в разработке")}</h3>
                  <p className="text-sm text-muted-foreground">{t("We are actively building the curriculum for this path.", "Biz ushbu yo'nalish uchun o'quv dasturini faol tayyorlamoqdamiz.", "Мы активно разрабатываем учебную программу для этого пути.")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pathModules.map((m, idx) => {
                    const Art = moduleArtFor(m.slug);
                    const done = m.certificateSerial || m.examPassed;
                    const pct = m.lessonCount ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
                    const skills = MODULE_SKILLS[m.slug] || ["Security", "Basics"];
                    const xp = m.lessonCount * 150;
                    
                    return (
                      <FadeIn key={m.id} delay={idx * 0.05}>
                        <Link href={`/modules/${m.id}`}>
                          <div className="group h-full rounded-3xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row relative">
                            {done && (
                              <div className="absolute top-3 right-3 z-20 bg-emerald-500/90 text-white p-1.5 rounded-full shadow-lg backdrop-blur-sm">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            )}
                            
                            {/* Left Art Section */}
                            <div className="relative h-48 sm:h-auto sm:w-1/3 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-border/50">
                              <Art className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-card/80 to-transparent" />
                            </div>
                            
                            {/* Right Content Section */}
                            <div className="p-5 sm:p-6 flex flex-col flex-1 relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                  m.difficulty === "beginner" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                                  m.difficulty === "intermediate" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                  "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                }`}>
                                  {m.difficulty}
                                </span>
                                {pct > 0 && !done && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border text-sky-400 bg-sky-500/10 border-sky-500/20">
                                    {pct}% {t("Done", "Bajarildi", "Пройдено")}
                                  </span>
                                )}
                              </div>
                              
                              <h3 className="font-bold text-lg sm:text-xl mb-2 group-hover:text-primary transition-colors line-clamp-1">
                                {loc(m.title, m.titleUz, m.titleRu)}
                              </h3>
                              
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                {loc(m.description, m.descriptionUz, m.descriptionRu)}
                              </p>

                              {/* Skills Tags */}
                              <div className="flex flex-wrap gap-1.5 mb-5">
                                {skills.map((skill, i) => (
                                  <span key={i} className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                              
                              <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground font-semibold">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    {m.completedCount} / {m.lessonCount}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-primary">
                                    <Target className="w-3.5 h-3.5" />
                                    +{xp} XP
                                  </div>
                                  {m.estimatedHours > 0 && (
                                    <div className="flex items-center gap-1.5 hidden sm:flex">
                                      <Clock className="w-3.5 h-3.5" />
                                      {m.estimatedHours}h
                                    </div>
                                  )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </FadeIn>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
