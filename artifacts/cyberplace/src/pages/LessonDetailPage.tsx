import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  BookOpen, CheckCircle2, Lock, ChevronRight, ChevronLeft, ChevronDown, Copy, Check,
  ArrowRight, GraduationCap, ListChecks, Flag, Bookmark, BookmarkCheck, PenLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure, isNotFound } from "@/components/LoadFailure";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { loginWithNext } from "@/lib/next-path";
import { Markdown } from "@/components/Markdown";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetLesson, getGetLessonQueryKey,
  useGetModule, getGetModuleQueryKey,
} from "@workspace/api-client-react";
type SiblingLesson = { id: number; title: string; titleUz?: string | null; titleRu?: string | null; isCompleted: boolean };

export default function LessonDetailPage() {
  const [, params] = useRoute("/learn/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [readProgress, setReadProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const { data: lesson, isLoading, isError, error, refetch } = useGetLesson(id, {
    query: { enabled: !!id, queryKey: getGetLessonQueryKey(id) },
  });

  const moduleId = (lesson as { moduleId?: number } | undefined)?.moduleId;
  const { data: moduleData } = useGetModule(moduleId as number, {
    query: { enabled: !!moduleId, queryKey: getGetModuleQueryKey(moduleId as number) },
  });

  const mod = moduleData as {
    id: number; title: string; titleUz?: string | null; titleRu?: string | null;
    lessons: SiblingLesson[];
    /** The challenges that drill this module — the hand-off after the lesson. */
    practice?: { categories: string[]; total: number; solved: number } | null;
  } | undefined;
  const siblings = mod?.lessons ?? [];
  const currentIndex = siblings.findIndex(l => l.id === id);
  const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  // Reading progress: how far the article has scrolled through the viewport.
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setReadProgress(scrollable > 0 ? Math.min(100, (doc.scrollTop / scrollable) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [id]);

  // Load Bookmarks & Notes from localStorage
  useEffect(() => {
    const savedBookmark = localStorage.getItem(`bookmark_lesson_${id}`);
    setIsBookmarked(savedBookmark === "true");
    const savedNotes = localStorage.getItem(`notes_lesson_${id}`);
    if (savedNotes) setNotes(savedNotes);
  }, [id]);

  const toggleBookmark = () => {
    const newVal = !isBookmarked;
    setIsBookmarked(newVal);
    localStorage.setItem(`bookmark_lesson_${id}`, newVal.toString());
  };

  const saveNotes = (val: string) => {
    setNotes(val);
    localStorage.setItem(`notes_lesson_${id}`, val);
  };

  // Keyboard Hotkeys: Alt+Left, Alt+Right, Space/Enter
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in notes
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (e.altKey && e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        setLocation(`/learn/${prev.id}`);
      } else if (e.altKey && e.key === "ArrowRight" && next) {
        e.preventDefault();
        setLocation(`/learn/${next.id}`);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prev, next, setLocation]);

  // Jump to top when moving between lessons.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  const localizedTitle = useMemo(
    () => lesson ? t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined) : "",
    [lesson, t],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // The most-linked route in the product used to answer a network failure with
  // one grey line — "Lesson not found" — and no link, button or retry.
  if (isError && !isNotFound(error)) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow">
          <LoadFailure onRetry={() => refetch()} backHref="/modules" backLabel={t("All modules", "Barcha modullar", "Все модули")} />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow text-center py-20">
          <p className="text-muted-foreground mb-6">{t("Lesson not found", "Dars topilmadi", "Урок не найден")}</p>
          <Link href="/modules">
            <Button variant="outline">{t("Browse modules", "Modullarni ko'rish", "Смотреть модули")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const localizedContent = t(lesson.content, lesson.contentUz ?? undefined, lesson.contentRu ?? undefined);
  const moduleTitle = mod ? t(mod.title, mod.titleUz ?? undefined, mod.titleRu ?? undefined) : lesson.categoryName;
  const sibDone = siblings.filter(l => l.isCompleted).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Reading-progress bar, pinned under the navbar. */}
      <div className="fixed top-0 left-0 right-0 z-40 h-0.5 bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${readProgress}%` }} />
      </div>

      <div className="shell page">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">

          {/* Lesson stepper — the "where am I" context that ties the module
              together. Sticky on wide screens, hidden on mobile. */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              {mod && (
                <Link href={`/modules/${mod.id}`} className="eyebrow mb-4 hover:opacity-80 transition-opacity">
                  <ListChecks className="w-3.5 h-3.5" />
                  {moduleTitle}
                </Link>
              )}
              <div className="text-xs text-muted-foreground mb-3 tabular-nums">
                {sibDone}/{siblings.length} {t("done", "tugatilgan", "готово")}
              </div>
              <nav className="space-y-0.5">
                {siblings.map((l, i) => {
                  const active = l.id === id;
                  return (
                    <Link key={l.id} href={`/learn/${l.id}`}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}>
                      {l.isCompleted
                        ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        : <span className={`w-4 h-4 shrink-0 flex items-center justify-center text-xs tabular-nums rounded-full border ${active ? "border-primary text-primary" : "border-muted-foreground/30"}`}>{i + 1}</span>}
                      <span className="truncate">{t(l.title, l.titleUz ?? undefined, l.titleRu ?? undefined)}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile module navigation — the sidebar stepper is desktop-only, so
              on a phone the module context would otherwise be lost entirely. */}
          {mod && siblings.length > 0 && (
            <details className="lg:hidden glass-card !p-0 mb-6 overflow-hidden group">
              <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none">
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground truncate">{moduleTitle}</span>
                  <span className="block text-sm font-medium mt-0.5">
                    {t("Lesson", "Dars", "Урок")} {currentIndex + 1}/{siblings.length} · {sibDone} {t("done", "tugatilgan", "готово")}
                  </span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  <ChevronRight className="chev-closed w-5 h-5" />
                  <ChevronDown className="chev-open w-5 h-5" />
                </span>
              </summary>
              <nav className="border-t border-border p-2 space-y-0.5">
                {siblings.map((l, i) => (
                  <Link key={l.id} href={`/learn/${l.id}`}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      l.id === id ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"
                    }`}>
                    {l.isCompleted
                      ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      : <span className="w-4 h-4 shrink-0 flex items-center justify-center text-xs tabular-nums rounded-full border border-muted-foreground/30">{i + 1}</span>}
                    <span className="truncate">{t(l.title, l.titleUz ?? undefined, l.titleRu ?? undefined)}</span>
                  </Link>
                ))}
              </nav>
            </details>
          )}

          {/* Article */}
          <article className="min-w-0 max-w-2xl">
            {/* Breadcrumb + position */}
            <div className="flex items-center flex-wrap gap-x-2 text-xs text-muted-foreground mb-5">
              <Link href="/modules" className="inline-flex items-center min-h-[24px] py-1 hover:text-foreground transition-colors">{t("Learn", "O'rganish", "Учиться")}</Link>
              <ChevronRight className="w-3 h-3" />
              {mod
                ? <Link href={`/modules/${mod.id}`} className="inline-flex items-center min-h-[24px] py-1 hover:text-foreground transition-colors">{moduleTitle}</Link>
                : <span>{lesson.categoryName}</span>}
              {currentIndex >= 0 && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-foreground font-medium">{t("Lesson", "Dars", "Урок")} {currentIndex + 1}/{siblings.length}</span>
                </>
              )}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                  <BookOpen className="w-3 h-3" /> {lesson.points} {t("points", "ball", "очки")}
                </span>
                {lesson.isCompleted && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Completed", "Tugatilgan", "Завершено")}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-lg transition-colors border ${showNotes ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"}`} title="Personal Notes">
                  <PenLine className="w-4 h-4" />
                </button>
                <button onClick={toggleBookmark} className={`p-2 rounded-lg transition-colors border ${isBookmarked ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"}`} title="Bookmark Lesson">
                  {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {showNotes && (
              <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="glass-card !p-4 border-primary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold flex items-center gap-2 text-primary">
                      <PenLine className="w-4 h-4" /> {t("Personal Notes", "Shaxsiy qaydlar", "Личные заметки")}
                    </span>
                  </div>
                  <Textarea 
                    value={notes}
                    onChange={(e) => saveNotes(e.target.value)}
                    placeholder={t("Jot down your notes here... They are saved automatically.", "Qaydlaringizni shu yerga yozing... Ular avtomatik saqlanadi.", "Запишите свои заметки здесь... Они сохраняются автоматически.")}
                    className="min-h-[100px] bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                  />
                </div>
              </div>
            )}
            
            <header className="mb-8 relative overflow-hidden rounded-2xl p-6 border border-border bg-card/30">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                style={{ 
                  backgroundImage: `url(https://images.unsplash.com/photo-${[
                    "1526374965328-7f61d4dc18c5", "1550751827-4bd374c3f58b", 
                    "1518770660439-4636190af475", "1558494949-ef010cbdcc31", 
                    "1451187580459-43490279c0fa", "1563206767-5b18f218e8de"
                  ][lesson.id % 6]}?w=1200&q=80)` 
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              
              <div className="relative z-10">
                <h1 className="text-3xl sm:text-4xl font-black drop-shadow-md" data-testid="text-lesson-title">
                  {localizedTitle}
                </h1>
              </div>
            </header>

            {/* Continuous Content */}
            <div className="glass-card !p-6 sm:!p-10 mb-12 relative overflow-hidden border-primary/20 shadow-xl shadow-primary/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 mix-blend-screen pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-[80px] -z-10 mix-blend-screen pointer-events-none" />
              
              <div className="prose prose-sm sm:prose-base dark:prose-invert prose-headings:font-black prose-h2:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none max-w-none">
                <Markdown content={localizedContent} />
              </div>
            </div>

            {/* Test CTA */}
            <div className="mt-10">
              {lesson.isCompleted ? (
                <div className="glass-card flex items-center justify-between gap-4 border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center neon-glow shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t("Lesson completed!", "Dars tugatildi!", "Урок завершён!")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {next ? t("Ready for the next one?", "Keyingisiga tayyormisiz?", "Готовы к следующему?") : t("You finished the module's lessons.", "Modul darslarini tugatdingiz.", "Вы прошли уроки модуля.")}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setLocation(`/learn/${id}/test`)} data-testid="button-retake-test">
                    {t("Retake test", "Qayta topshirish", "Пересдать")}
                  </Button>
                </div>
              ) : (
                <div className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-primary/25">
                  {/* Lessons are readable without an account, so this card is
                      shown to people who cannot actually take the test. Saying
                      "3 attempts remaining" to a signed-out reader was a
                      promise the next screen broke. */}
                  <div>
                    <p className="font-semibold text-sm">
                      {isAuthenticated
                        ? t("Ready to test your knowledge?", "Bilimingizni tekshirishga tayyormisiz?", "Готовы проверить знания?")
                        : t("Sign in to record this lesson", "Bu darsni hisobga olish uchun kiring", "Войдите, чтобы урок засчитался")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAuthenticated
                        ? t(`Unlimited attempts`, `Cheksiz urinishlar`, `Неограниченное количество попыток`)
                        : t("It takes half a minute, and you come straight back here.", "Yarim daqiqa vaqt oladi va shu yerga qaytasiz.", "Это полминуты, и вы вернётесь сюда же.")}
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation(isAuthenticated ? `/learn/${id}/test` : loginWithNext(`/learn/${id}/test`))}
                    className="cyber-button h-11 px-6 shrink-0"
                    data-testid="button-start-test"
                  >
                    {isAuthenticated
                      ? t("I'm done — take the test", "Tugatdim — testni topshirish", "Я закончил — пройти тест")
                      : t("Sign in and take the test", "Kirib, testni topshirish", "Войти и пройти тест")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Practice. Offered once the lesson is finished — the moment the
                material is fresh is the moment to go and use it, and until now
                nothing on this page told a reader that challenges on exactly
                this subject existed. */}
            {lesson.isCompleted && mod?.practice && mod.practice.total > 0 && (
              <Link href={`/ctf?category=${encodeURIComponent(mod.practice.categories[0])}`} className="block mt-6">
                <div className="glass-card !p-5 border-primary/25 flex items-center gap-4 group cursor-pointer" data-testid="lesson-practice">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Flag className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                      {t("Now use it", "Endi qo'llang", "Теперь примените")}
                    </div>
                    <div className="font-semibold group-hover:text-primary transition-colors">
                      {t(
                        `${mod.practice.total} challenges use this material`,
                        `${mod.practice.total} ta topshiriq shu materialga tayanadi`,
                        `${mod.practice.total} заданий опираются на этот материал`,
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            )}

            {/* Prev / Next navigation — the momentum that was missing. */}
            {(prev || next || mod) && (
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {prev ? (
                  <Link href={`/learn/${prev.id}`} className="group glass-card !p-4 flex items-center gap-3 hover:border-primary/40 relative overflow-hidden">
                    <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Previous", "Oldingi", "Назад")}</div>
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t(prev.title, prev.titleUz ?? undefined, prev.titleRu ?? undefined)}</div>
                    </div>
                    <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border text-muted-foreground">Alt + ←</kbd>
                    </div>
                  </Link>
                ) : <div className="hidden sm:block" />}

                {next ? (
                  <Link href={`/learn/${next.id}`} className="group glass-card !p-4 flex items-center gap-3 text-right hover:border-primary/40 sm:justify-end relative overflow-hidden">
                    <div className="min-w-0 order-1 sm:order-none">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Next", "Keyingi", "Далее")}</div>
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t(next.title, next.titleUz ?? undefined, next.titleRu ?? undefined)}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 order-2" />
                    <div className="absolute bottom-1 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border text-muted-foreground">Alt + →</kbd>
                    </div>
                  </Link>
                ) : mod ? (
                  <Link href={`/modules/${mod.id}`} className="group glass-card !p-4 flex items-center gap-3 hover:border-primary/40 sm:justify-end border-primary/25">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Finish", "Yakun", "Финал")}</div>
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t("Back to module & exam", "Modul va imtihonga", "К модулю и экзамену")}</div>
                    </div>
                    <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                  </Link>
                ) : null}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
