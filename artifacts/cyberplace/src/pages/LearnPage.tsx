import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  BookOpen, CheckCircle2, Lock, ChevronRight, Shield, Search, X, 
  Award, Sparkles, Filter, Terminal, Cpu, Clock, Flame, Zap, Check, ArrowUpRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { normalizeLearnCategories, normalizeLessons } from "@/lib/api-shapes";
import { useListLearnCategories, getListLearnCategoriesQueryKey, useListLessons, getListLessonsQueryKey } from "@workspace/api-client-react";
import { FadeIn, ScaleIn } from "@/components/PageTransition";
import { LoadFailure } from "@/components/LoadFailure";

const CATEGORY_ICONS: Record<string, any> = {
  "Linux for Security": Terminal,
  "Networking": Cpu,
  "Web Security": Shield,
  "Cryptography": Zap,
  "Recon & Scanning": Search,
  "Exploitation": Flame,
  "Forensics & IR": BookOpen,
  "CTF Methodology": Award,
};

export default function LearnPage() {
  const { t } = useLang();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "uncompleted">("all");
  const [query, setQuery] = useState("");

  const { data: categories, isLoading: catsLoading, isError: catsError, refetch: refetchCats } = useListLearnCategories({
    query: { queryKey: getListLearnCategoriesQueryKey() },
  });

  const { data: lessons, isLoading: lessonsLoading, isError: lessonsError, refetch: refetchLessons } = useListLessons(
    selectedCategory ? { category: selectedCategory } : {},
    { query: { queryKey: getListLessonsQueryKey({ category: selectedCategory ?? undefined }) } }
  );

  const categoryList = normalizeLearnCategories(categories);
  const allLessons = normalizeLessons(lessons);

  // Compute overall stats
  const stats = useMemo(() => {
    const total = allLessons.length;
    const completed = allLessons.filter(l => l.isCompleted).length;
    const totalPoints = allLessons.reduce((sum, l) => sum + (l.points || 0), 0);
    const earnedPoints = allLessons.filter(l => l.isCompleted).reduce((sum, l) => sum + (l.points || 0), 0);
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalPoints, earnedPoints, progressPercent };
  }, [allLessons]);

  // Filter lessons by search query and status filter
  const q = query.trim().toLowerCase();
  const filteredLessons = useMemo(() => {
    return allLessons.filter(l => {
      const matchesSearch = !q || [l.title, l.titleUz, l.titleRu, l.categoryName]
        .some(s => (s ?? "").toLowerCase().includes(q));
      
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "completed" ? l.isCompleted :
        !l.isCompleted;

      return matchesSearch && matchesStatus;
    });
  }, [allLessons, q, statusFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden pb-20">
      {/* Background Cyber Glow & Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="shell relative z-10 py-6">
        {/* Header Hero Section */}
        <FadeIn>
          <div className="glass-card bg-gradient-to-r from-card/90 via-card/70 to-card/90 border-primary/20 p-8 sm:p-10 rounded-3xl mb-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
              <BookOpen className="w-80 h-80 text-primary" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold tracking-wider uppercase">
                  <Terminal className="w-4 h-4" />
                  <span>{t("cdCTF · Academy", "cdCTF · Akademiya", "cdCTF · Академия")}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  {t("Cyber Security ", "Kiber Xavfsizlik ", "Кибербезопасность ")}
                  <span className="gradient-text">{t("Curriculum", "Darsliklari", "Учебный Курс")}</span>
                </h1>

                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t(
                    "Master hands-on offensive & defensive security tools, Linux terminal commands, network analysis, and vulnerability exploitation.",
                    "Kiberxavfsizlik vositalari, Linux terminal buyruqlari, tarmoq tahlili va zaifliklarni topishni amaliy shaklda o'rganing.",
                    "Осваивайте инструменты защиты и атаки, командную строку Linux, анализ сетей и поиск уязвимостей."
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href="/modules">
                    <button className="cyber-button text-xs h-11 px-6 font-bold gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t("View Structured Paths", "Tayyor Yo'nalishlar", "Учебные Треки")}
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/labs">
                    <button className="cyber-button-outline text-xs h-11 px-6 font-bold gap-2">
                      <Cpu className="w-4 h-4" />
                      {t("Hands-on Virtual Labs", "Amaliy Muhitlar", "Практические Лабы")}
                    </button>
                  </Link>
                </div>
              </div>

              {/* Stats Card */}
              <div className="glass-card bg-card/90 border-primary/30 p-6 rounded-2xl w-full lg:w-80 shrink-0 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-muted-foreground">{t("Overall Progress", "Umumiy Bajarilish", "Прогресс")}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {stats.progressPercent}%
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-muted overflow-hidden p-0.5 border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-emerald-400 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${stats.progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <span className="text-[11px] text-muted-foreground font-mono block mb-0.5">{t("Lessons", "Darslar", "Уроки")}</span>
                    <span className="font-mono text-lg font-black text-foreground">{stats.completed} / {stats.total}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <span className="text-[11px] text-muted-foreground font-mono block mb-0.5">{t("Earned XP", "To'plangan XP", "Заработано")}</span>
                    <span className="font-mono text-lg font-black text-primary">+{stats.earnedPoints}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Categories Bar / Grid */}
        <FadeIn delay={0.1}>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <h2 className="text-base font-extrabold tracking-tight">{t("Categories", "Kategoriyalar", "Категории")}</h2>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  {t("Show All", "Barchasini ko'rsatish", "Показать все")}
                </button>
              )}
            </div>

            {catsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-card hover:bg-muted/80 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-xs font-bold truncate max-w-full">{t("All", "Barchasi", "Все")}</span>
                  <span className="text-[10px] font-mono opacity-80">{allLessons.length}</span>
                </button>

                {categoryList.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.name] || BookOpen;
                  const isSelected = selectedCategory === cat.name;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 group ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                          : "bg-card hover:bg-muted/80 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? "text-primary-foreground" : "text-primary group-hover:scale-110 transition-transform"}`} />
                      <span className="text-xs font-bold truncate max-w-full">
                        {t(cat.name, cat.nameUz ?? undefined, cat.nameRu ?? undefined)}
                      </span>
                      <span className="text-[10px] font-mono opacity-80">{cat.completedCount}/{cat.lessonCount}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </FadeIn>

        {/* Filter and Search controls */}
        <FadeIn delay={0.15}>
          <div className="glass-card p-4 rounded-2xl mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between border-border shadow-md">
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search lessons by title, topic or category...", "Darslarni nomi yoki mavzusi bo'yicha qidirish...", "Поиск уроков по названию...")}
                aria-label={t("Search lessons", "Darslarni qidirish", "Поиск уроков")}
                className="field !pl-11 h-11 text-sm bg-card/80 border-border rounded-xl"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <span className="text-xs font-mono font-semibold text-muted-foreground hidden sm:inline flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                {t("Status:", "Holat:", "Статус:")}
              </span>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border w-full sm:w-auto">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === "all" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("All", "Hammasi", "Все")}
                </button>
                <button
                  onClick={() => setStatusFilter("uncompleted")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === "uncompleted" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("To Do", "Bajarilmagan", "Не пройдены")}
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === "completed" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("Done", "Tugatilgan", "Пройдены")}
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Lessons List Grid */}
        <FadeIn delay={0.2}>
          {lessonsError ? (
            <LoadFailure onRetry={() => refetchLessons()} />
          ) : lessonsLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="glass-card rounded-3xl py-20 text-center px-6 border-dashed border-border">
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t("No lessons found", "Darslar topilmadi", "Уроки не найдены")}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                {query
                  ? t(`No topics match "${query}". Try resetting your search filter.`, `"${query}" bo'yicha dars topilmadi. Qidiruvni tozalab ko'ring.`, `Уроки по запросу "${query}" не найдены.`)
                  : t("No lessons available in this status filter.", "Bu filtrda darslar mavjud emas.", "Нет уроков в этом фильтре.")}
              </p>
              <button
                onClick={() => { setQuery(""); setStatusFilter("all"); setSelectedCategory(null); }}
                className="cyber-button h-10 px-6 text-xs font-bold"
              >
                {t("Reset All Filters", "Barcha Filtrlarni Tozalash", "Сбросить фильтры")}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredLessons.map((lesson, idx) => (
                <FadeIn key={lesson.id} delay={idx * 0.02}>
                  <Link href={`/learn/${lesson.id}`}>
                    <div
                      className={`group relative p-5 sm:p-6 rounded-2xl glass-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 ${
                        lesson.isBlocked ? "opacity-50 grayscale pointer-events-none" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                        {/* Status Icon Badge */}
                        <div
                          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-all duration-300 shadow-md ${
                            lesson.isCompleted
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10"
                              : lesson.isBlocked
                              ? "bg-muted border-border text-muted-foreground"
                              : "bg-primary/10 border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                          }`}
                        >
                          {lesson.isCompleted ? (
                            <CheckCircle2 className="w-7 h-7" />
                          ) : lesson.isBlocked ? (
                            <Lock className="w-6 h-6" />
                          ) : (
                            <BookOpen className="w-6 h-6" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[11px] font-mono font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                              {lesson.categoryName}
                            </span>
                            {lesson.isCompleted && (
                              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                {t("Completed", "Bajarildi", "Пройден")}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined)}
                          </h3>
                        </div>
                      </div>

                      {/* XP & Arrow */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-black shadow-sm">
                            <Award className="w-4 h-4" />
                            +{lesson.points} XP
                          </span>
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            ~15m
                          </span>
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border group-hover:border-primary/50 group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
