import { useState, useMemo } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, Lock, ChevronRight, Shield, Search, X, Award, Sparkles, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { normalizeLearnCategories, normalizeLessons } from "@/lib/api-shapes";
import { useListLearnCategories, getListLearnCategoriesQueryKey, useListLessons, getListLessonsQueryKey } from "@workspace/api-client-react";
import { FadeIn } from "@/components/PageTransition";

export default function LearnPage() {
  const { t } = useLang();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "uncompleted">("all");
  const [query, setQuery] = useState("");

  const { data: categories, isLoading: catsLoading } = useListLearnCategories({
    query: { queryKey: getListLearnCategoriesQueryKey() },
  });

  const { data: lessons, isLoading: lessonsLoading } = useListLessons(
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
    <div className="min-h-screen bg-background text-foreground page relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-40" />

      <div className="shell relative z-10 py-8">
        {/* Header section */}
        <FadeIn>
          <div className="mb-8">
            <div className="eyebrow mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {t("cdCTF · Academy & Curriculum", "cdCTF · Akademiya va Darslar", "cdCTF · Академия и Уроки")}
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight mb-3">
              <span className="gradient-text">{t("Interactive Cybersecurity Lessons", "Interaktiv Kiberxavfsizlik Darslari", "Интерактивные Уроки Кибербезопасности")}</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-2xl">
              {t(
                "Master cybersecurity fundamentals, hands-on techniques, and defense strategies step by step.",
                "Kiberxavfsizlik asoslari, amaliy usullar va mudofaa strategiyalarini bosqichma-bosqich o'rganing.",
                "Изучайте основы кибербезопасности, практические методы и стратегии защиты шаг за шагом."
              )}
            </p>
          </div>

          {/* Stats & Progress Overview Banner */}
          <div className="glass-card p-6 mb-10 border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">{t("Total Lessons", "Jami darslar", "Всего уроков")}</div>
                <div className="text-2xl font-mono font-bold text-foreground">{stats.total}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">{t("Completed", "Tugatilgan", "Пройдено")}</div>
                <div className="text-2xl font-mono font-bold text-emerald-500">{stats.completed} <span className="text-xs text-muted-foreground">({stats.progressPercent}%)</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">{t("XP Earned", "To'plangan XP", "Заработано XP")}</div>
                <div className="text-2xl font-mono font-bold text-primary">+{stats.earnedPoints} <span className="text-xs text-muted-foreground">/ {stats.totalPoints}</span></div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Link href="/modules">
                  <button className="w-full cyber-button h-11 px-4 text-xs font-semibold gap-2 inline-flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                    {t("Follow Learning Paths", "O'quv Yo'nalishlari", "Учебные Треки")}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5 pt-4 border-t border-border/50 flex items-center gap-4">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 rounded-full" 
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground font-semibold">{stats.progressPercent}% {t("Completed", "Bajarildi", "Завершено")}</span>
            </div>
          </div>
        </FadeIn>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Category sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="glass-card sticky top-28 p-5">
              <div className="eyebrow mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {t("Categories", "Kategoriyalar", "Категории")}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{categoryList.length}</span>
              </div>

              {catsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      !selectedCategory 
                        ? "bg-primary/15 text-primary border border-primary/40 shadow-sm shadow-primary/10" 
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                    }`}
                    data-testid="button-category-all"
                  >
                    <span className="font-semibold">{t("All Categories", "Barcha kategoriyalar", "Все категории")}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">{allLessons.length}</span>
                  </button>

                  {categoryList.map(cat => {
                    const isSelected = selectedCategory === cat.name;
                    const catPercent = cat.lessonCount > 0 ? Math.round((cat.completedCount / cat.lessonCount) * 100) : 0;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`w-full flex flex-col gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                          isSelected 
                            ? "bg-primary/15 text-primary border border-primary/40 shadow-sm shadow-primary/10" 
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                        }`}
                        data-testid={`button-category-${cat.id}`}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="truncate font-medium">{t(cat.name, cat.nameUz ?? undefined, cat.nameRu ?? undefined)}</span>
                          <span className="text-xs font-mono shrink-0 opacity-75">{cat.completedCount}/{cat.lessonCount}</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-muted/50 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300" 
                            style={{ width: `${catPercent}%` }} 
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Lesson main panel */}
          <div className="flex-1 space-y-6">
            {/* Search & Filter Bar */}
            <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t("Search lessons by title or keyword…", "Darslarni nomi yoki kalit so'z bo'yicha qidirish…", "Поиск уроков по названию…")}
                  aria-label={t("Search lessons", "Darslarni qidirish", "Поиск уроков")}
                  className="terminal-input w-full pl-10 pr-10 h-11 text-sm rounded-xl"
                  data-testid="input-lesson-search"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label={t("Clear search", "Qidiruvni tozalash", "Очистить поиск")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === "all" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("All", "Hammasi", "Все")}
                </button>
                <button
                  onClick={() => setStatusFilter("uncompleted")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === "uncompleted" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("To Do", "Bajarilmagan", "Не пройдены")}
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === "completed" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("Done", "Tugatilgan", "Пройдены")}
                </button>
              </div>
            </div>

            {/* Results counter */}
            {q && !lessonsLoading && (
              <p className="text-xs text-muted-foreground font-mono" aria-live="polite">
                {t(`Found ${filteredLessons.length} of ${allLessons.length} lessons`, `${allLessons.length} tadan ${filteredLessons.length} ta dars topildi`, `Найдено ${filteredLessons.length} из ${allLessons.length} уроков`)}
              </p>
            )}

            {/* Lessons List Grid */}
            {lessonsLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="glass-card rounded-2xl py-16 text-center px-6 border-dashed">
                <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold mb-1">{t("No lessons found", "Darslar topilmadi", "Уроки не найдены")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                  {q
                    ? t(`No topics matching "${query}". Try another search.`, `"${query}" bo'yicha dars yo'q. Qidiruvni o'zgartiring.`, `Нет уроков по запросу "${query}".`)
                    : t("No lessons available in this filter.", "Bu filtrda darslar yo'q.", "Нет уроков в этом фильтре.")}
                </p>
                {(q || statusFilter !== "all" || selectedCategory) && (
                  <button 
                    onClick={() => { setQuery(""); setStatusFilter("all"); setSelectedCategory(null); }} 
                    className="cyber-button-outline h-9 px-4 text-xs font-semibold"
                  >
                    {t("Reset all filters", "Filtrlarni tozalash", "Сбросить фильтры")}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3.5">
                {filteredLessons.map((lesson, idx) => (
                  <FadeIn key={lesson.id} delay={idx * 0.03}>
                    <Link href={`/learn/${lesson.id}`}>
                      <div
                        className={`group relative p-5 rounded-2xl glass-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 ${
                          lesson.isBlocked ? "opacity-50 grayscale pointer-events-none" : ""
                        }`}
                        data-testid={`row-lesson-${lesson.id}`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Status Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-all duration-300 ${
                            lesson.isCompleted 
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 shadow-sm shadow-emerald-500/20" 
                              : lesson.isBlocked 
                              ? "bg-muted border-border text-muted-foreground" 
                              : "bg-primary/10 border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                          }`}>
                            {lesson.isCompleted ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : lesson.isBlocked ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              <BookOpen className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                                {lesson.categoryName}
                              </span>
                              {lesson.isCompleted && (
                                <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t("Completed", "Tugatilgan", "Пройден")}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold truncate group-hover:text-primary transition-colors" data-testid={`text-lesson-title-${lesson.id}`}>
                              {t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined)}
                            </h3>
                          </div>
                        </div>

                        {/* Points badge & arrow */}
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold">
                            <Award className="w-3.5 h-3.5" />
                            +{lesson.points} XP
                          </span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

