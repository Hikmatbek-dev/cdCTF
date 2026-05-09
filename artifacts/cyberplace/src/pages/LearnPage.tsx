import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, Lock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { normalizeLearnCategories, normalizeLessons } from "@/lib/api-shapes";
import { useListLearnCategories, getListLearnCategoriesQueryKey, useListLessons, getListLessonsQueryKey } from "@workspace/api-client-react";

export default function LearnPage() {
  const { t } = useLang();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading: catsLoading } = useListLearnCategories({
    query: { queryKey: getListLearnCategoriesQueryKey() },
  });

  const { data: lessons, isLoading: lessonsLoading } = useListLessons(
    selectedCategory ? { category: selectedCategory } : {},
    { query: { queryKey: getListLessonsQueryKey({ category: selectedCategory ?? undefined }) } }
  );
  const categoryList = normalizeLearnCategories(categories);
  const lessonList = normalizeLessons(lessons);

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">{t("Learn", "O'rganish", "Учиться")}</h1>
          <p className="text-sm text-muted-foreground">{t("Structured cybersecurity lessons with tests.", "Testlar bilan tizimli kiberhavfsizlik darsliklari.", "Структурированные уроки по кибербезопасности с тестами.")}</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar categories */}
          <aside className="w-52 flex-shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("Categories", "Kategoriyalar", "Категории")}</h2>
            {catsLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 rounded" />)}
              </div>
            ) : (
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${!selectedCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
                  data-testid="button-category-all"
                >
                  {t("All", "Barchasi", "Все")}
                </button>
                {categoryList.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${selectedCategory === cat.name ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className={`text-xs ml-1 ${selectedCategory === cat.name ? "text-primary/70" : "text-muted-foreground/60"}`}>
                      {cat.completedCount}/{cat.lessonCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Lessons */}
          <div className="flex-1">
            {lessonsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : lessonList.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{t("No lessons in this category", "Bu kategoriyada darslar yo'q", "В этой категории нет уроков")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lessonList.map(lesson => (
                  <Link href={`/learn/${lesson.id}`} key={lesson.id}>
                    <div
                      className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all group ${
                        lesson.isCompleted
                          ? "border-primary/30 bg-primary/5"
                          : lesson.isBlocked
                          ? "border-destructive/30 bg-destructive/5 opacity-60"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                      data-testid={`row-lesson-${lesson.id}`}
                    >
                      <div className="flex-shrink-0">
                        {lesson.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : lesson.isBlocked ? (
                          <Lock className="w-5 h-5 text-destructive" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors" data-testid={`text-lesson-title-${lesson.id}`}>{lesson.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{lesson.categoryName}</span>
                          {lesson.attemptCount > 0 && (
                            <span className="text-xs text-muted-foreground">{lesson.attemptCount} {t("attempts", "urinish", "попытки")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary">{lesson.points} pts</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
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
