import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, Lock, ChevronRight, Shield } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Academy Header */}
        <div className="mb-16">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">{t("Intel Academy", "O'rganish", "Академия Intel")}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t("STRUCTURED TECHNICAL INTELLIGENCE GATHERING", "TIZIMLI BILIM OLISH", "СИСТЕМНОЕ ОБУЧЕНИЕ")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Domain Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="glass-card bg-muted/10 p-8 rounded-[2.5rem] border-border sticky top-32">
              <div className="flex items-center gap-3 mb-10">
                <Shield className="w-4 h-4 text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">{t("KNOWLEDGE DOMAINS", "KATEGORIYALAR", "ДОМЕНЫ")}</h2>
              </div>
              
              {catsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 bg-muted rounded-xl" />)}
                </div>
              ) : (
                <div className="grid gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedCategory ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "text-muted-foreground hover:bg-muted"}`}
                    data-testid="button-category-all"
                  >
                    ALL_DOMAINS
                  </button>
                  {categoryList.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full flex items-center justify-between px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat.name ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"}`}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[9px] font-black opacity-30">{cat.completedCount}/{cat.lessonCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Module Stream */}
          <div className="flex-1">
            {lessonsLoading ? (
              <div className="grid gap-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 bg-muted rounded-[2.5rem]" />)}
              </div>
            ) : lessonList.length === 0 ? (
              <div className="glass-card bg-muted/5 border-dashed border-border py-32 text-center rounded-[3rem]">
                <p className="text-muted-foreground/40 font-black uppercase text-[10px] tracking-widest">INTEL_STREAM_EMPTY</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {lessonList.map(lesson => (
                  <Link href={`/learn/${lesson.id}`} key={lesson.id}>
                    <div
                      className={`glass-card bg-muted/10 p-8 group flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer relative overflow-hidden rounded-[2.5rem] border-border ${
                        lesson.isCompleted ? "border-primary/20 bg-primary/[0.02]" : lesson.isBlocked ? "opacity-40 grayscale" : ""
                      }`}
                      data-testid={`row-lesson-${lesson.id}`}
                    >
                      <div className="flex items-center gap-8 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                          lesson.isCompleted ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted border-border text-muted-foreground/40 group-hover:border-primary/30"
                        }`}>
                          {lesson.isCompleted ? (
                            <CheckCircle2 className="w-7 h-7" />
                          ) : lesson.isBlocked ? (
                            <Lock className="w-7 h-7" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{lesson.categoryName}</span>
                            {lesson.isCompleted && (
                              <span className="text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary px-3 py-1 rounded-full">CERTIFIED</span>
                            )}
                          </div>
                          <h3 className="text-2xl font-black tracking-tight uppercase group-hover:text-primary transition-colors leading-none" data-testid={`text-lesson-title-${lesson.id}`}>{lesson.title}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-10 relative z-10">
                        <div className="text-right hidden sm:block">
                          <div className="text-2xl font-black text-foreground leading-none">+{lesson.points}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">XP_YIELD</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground/20 group-hover:text-primary group-hover:border-primary/20 transition-all group-hover:translate-x-1">
                          <ChevronRight className="w-6 h-6" />
                        </div>
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
