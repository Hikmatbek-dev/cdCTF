import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, Lock, ChevronRight, Shield, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { normalizeLearnCategories, normalizeLessons } from "@/lib/api-shapes";
import { useListLearnCategories, getListLearnCategoriesQueryKey, useListLessons, getListLessonsQueryKey } from "@workspace/api-client-react";

export default function LearnPage() {
  const { t } = useLang();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Client-side title search. With 60+ lessons in the library, scanning the
  // whole list to find one topic was the slowest thing on this page.
  const q = query.trim().toLowerCase();
  const lessonList = q
    ? allLessons.filter(l =>
        [l.title, l.titleUz, l.titleRu, l.categoryName]
          .some(s => (s ?? "").toLowerCase().includes(q)))
    : allLessons;

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 relative">
      {/* Faint signature grid, fixed behind the content. */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <header className="mb-12">
          <div className="eyebrow mb-3 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            {t("cdCTF · Lessons", "cdCTF · Darslar", "cdCTF · Уроки")}
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            <span className="gradient-text">{t("Academy", "O'rganish", "Академия")}</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t(
              "Individual lessons across every domain. For the structured six-month path, follow the Modules.",
              "Har bir yo'nalish bo'yicha alohida darslar. Tuzilgan 6 oylik yo'l uchun Modullarni kuzating.",
              "Отдельные уроки по всем направлениям. Для структурированного 6-месячного пути смотрите Модули.",
            )}
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Category sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="glass-card sticky top-28">
              <div className="eyebrow mb-5 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                {t("Categories", "Kategoriyalar", "Категории")}
              </div>

              {catsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : (
                <div className="grid gap-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${!selectedCategory ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    data-testid="button-category-all"
                  >
                    {t("All categories", "Barcha kategoriyalar", "Все категории")}
                  </button>
                  {categoryList.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.name ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <span className="truncate">{t(cat.name, cat.nameUz ?? undefined, cat.nameRu ?? undefined)}</span>
                      <span className="text-xs tabular-nums opacity-50 shrink-0">{cat.completedCount}/{cat.lessonCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Lesson list */}
          <div className="flex-1">
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("Search lessons…", "Darslarni qidirish…", "Поиск уроков…")}
                aria-label={t("Search lessons", "Darslarni qidirish", "Поиск уроков")}
                className="terminal-input w-full pl-10 pr-10 h-11"
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
            {q && !lessonsLoading && (
              <p className="text-xs text-muted-foreground mb-3" aria-live="polite">
                {t(`${lessonList.length} of ${allLessons.length} lessons`, `${allLessons.length} tadan ${lessonList.length} ta dars`, `${lessonList.length} из ${allLessons.length} уроков`)}
              </p>
            )}
            {lessonsLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : lessonList.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl py-20 text-center px-6">
                <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {q
                    ? t(`Nothing matches "${query}".`, `"${query}" bo'yicha hech narsa topilmadi.`, `Ничего не найдено по "${query}".`)
                    : t("No lessons here yet.", "Bu yerda hozircha darslar yo'q.", "Здесь пока нет уроков.")}
                </p>
                {q && (
                  <button onClick={() => setQuery("")} className="cyber-button-outline h-9 px-4 text-xs mt-4">
                    {t("Clear search", "Qidiruvni tozalash", "Очистить поиск")}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {lessonList.map(lesson => (
                  <Link href={`/learn/${lesson.id}`} key={lesson.id}>
                    <div
                      className={`glass-card cursor-pointer group flex items-center justify-between gap-4 ${lesson.isBlocked ? "opacity-50" : ""}`}
                      data-testid={`row-lesson-${lesson.id}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                          lesson.isCompleted ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground group-hover:border-primary/40"
                        }`}>
                          {lesson.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : lesson.isBlocked ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="eyebrow mb-1 flex items-center gap-2">
                            <span className="truncate">{lesson.categoryName}</span>
                            {lesson.isCompleted && (
                              <span className="normal-case tracking-normal text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                                {t("Done", "Tugatilgan", "Пройден")}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-semibold truncate group-hover:text-primary transition-colors" data-testid={`text-lesson-title-${lesson.id}`}>
                            {t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined)}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-medium text-primary tabular-nums">+{lesson.points}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
