import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  BookOpen, CheckCircle2, Lock, ChevronRight, ChevronLeft, ChevronDown, Copy, Check,
  ArrowRight, GraduationCap, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import {
  useGetLesson, getGetLessonQueryKey,
  useGetModule, getGetModuleQueryKey,
} from "@workspace/api-client-react";

/**
 * Renders **bold**, *italic* and `code` inside one line.
 *
 * Hand-rolled for these three cases rather than pulling in a markdown library
 * for a handful of lessons.
 */
function renderInline(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return <strong key={key} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return <code key={key} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[0.85em] border border-primary/15">{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return <em key={key}>{tok.slice(1, -1)}</em>;
    }
    return tok;
  });
}

/** Splits `| a | b |` into its cells, dropping the empty edges. */
function tableCells(line: string) {
  return line.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
}

/** `|---|---|` — the separator row, which carries no content of its own. */
function isTableSeparator(line: string) {
  return /^\|[\s:|-]+\|$/.test(line.trim()) && line.includes("-");
}

/**
 * A fenced code block with a copy button — the platform is built around real
 * terminal commands the reader is meant to run, so one-tap copy is essential.
 */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — silently ignore, the code is still selectable */
    }
  };

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-border bg-[hsl(var(--card))]/60 backdrop-blur-sm group/code">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-primary/[0.04]">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {lang || t("shell", "shell", "shell")}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 min-h-[28px] px-2 -mr-2 rounded-md text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label={t("Copy code", "Nusxa olish", "Копировать")}
        >
          {copied
            ? <><Check className="w-3.5 h-3.5 text-primary" />{t("Copied", "Nusxa olindi", "Скопировано")}</>
            : <><Copy className="w-3.5 h-3.5" />{t("Copy", "Nusxa", "Копия")}</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Renders one run of non-code lines. Written as a loop rather than a map
 * because a table spans several lines and must be consumed as a unit.
 * Blank lines separate paragraphs; consecutive `- ` lines group into one list.
 */
function renderLines(lines: string[], blockKey: number) {
  const out: React.ReactNode[] = [];
  let j = 0;
  while (j < lines.length) {
    const line = lines[j];

    if (line.trim().startsWith("|") && j + 1 < lines.length && isTableSeparator(lines[j + 1])) {
      const header = tableCells(line);
      const rows: string[][] = [];
      let k = j + 2;
      while (k < lines.length && lines[k].trim().startsWith("|")) {
        rows.push(tableCells(lines[k]));
        k++;
      }
      out.push(
        <div key={`t-${blockKey}-${j}`} className="my-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary/[0.05]">
                {header.map((cell, c) => (
                  <th key={c} className="text-left font-semibold py-2.5 px-4 align-top border-b border-border">
                    {renderInline(cell, `th-${blockKey}-${j}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-border/50 last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="py-2.5 px-4 align-top text-muted-foreground">
                      {renderInline(cell, `td-${blockKey}-${j}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      j = k;
      continue;
    }

    // Group a run of "- " lines into a single bulleted list.
    if (line.startsWith("- ")) {
      const items: string[] = [];
      let k = j;
      while (k < lines.length && lines[k].startsWith("- ")) {
        items.push(lines[k].slice(2));
        k++;
      }
      out.push(
        <ul key={`ul-${blockKey}-${j}`} className="my-4 space-y-2">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-3 text-[15px] leading-7 text-muted-foreground">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden="true" />
              <span>{renderInline(it, `li-${blockKey}-${j}-${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      j = k;
      continue;
    }

    if (line.startsWith("## ")) {
      out.push(<h2 key={j} className="text-xl font-semibold tracking-tight mt-8 mb-3 text-foreground scroll-mt-24">{renderInline(line.slice(3), `h2-${blockKey}-${j}`)}</h2>);
    } else if (line.startsWith("# ")) {
      out.push(<h1 key={j} className="text-2xl font-bold tracking-tight mt-8 mb-3">{renderInline(line.slice(2), `h1-${blockKey}-${j}`)}</h1>);
    } else if (line.trim() === "") {
      // Paragraph spacing comes from margins on <p>, not <br> — skip blanks.
    } else {
      out.push(<p key={j} className="text-[15px] leading-7 text-muted-foreground my-3">{renderInline(line, `p-${blockKey}-${j}`)}</p>);
    }
    j++;
  }
  return out;
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines.slice(1, -1).join("\n");
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    return <div key={i}>{renderLines(part.split("\n"), i)}</div>;
  });
}

type SiblingLesson = { id: number; title: string; titleUz?: string | null; titleRu?: string | null; isCompleted: boolean };

export default function LessonDetailPage() {
  const [, params] = useRoute("/learn/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const [readProgress, setReadProgress] = useState(0);

  const { data: lesson, isLoading } = useGetLesson(id, {
    query: { enabled: !!id, queryKey: getGetLessonQueryKey(id) },
  });

  const moduleId = (lesson as { moduleId?: number } | undefined)?.moduleId;
  const { data: moduleData } = useGetModule(moduleId as number, {
    query: { enabled: !!moduleId, queryKey: getGetModuleQueryKey(moduleId as number) },
  });

  const mod = moduleData as { id: number; title: string; titleUz?: string | null; titleRu?: string | null; lessons: SiblingLesson[] } | undefined;
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

  // Jump to top when moving between lessons.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  const localizedTitle = useMemo(
    () => lesson ? t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined) : "",
    [lesson, t],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
        <p className="text-muted-foreground">{t("Lesson not found", "Dars topilmadi", "Урок не найден")}</p>
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
        <div className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-150" style={{ width: `${readProgress}%` }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
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
                        : <span className={`w-4 h-4 shrink-0 flex items-center justify-center text-[10px] tabular-nums rounded-full border ${active ? "border-primary text-primary" : "border-muted-foreground/30"}`}>{i + 1}</span>}
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
                  <span className="block text-[11px] uppercase tracking-wider text-muted-foreground truncate">{moduleTitle}</span>
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
                      : <span className="w-4 h-4 shrink-0 flex items-center justify-center text-[10px] tabular-nums rounded-full border border-muted-foreground/30">{i + 1}</span>}
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
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                <BookOpen className="w-3 h-3" /> {lesson.points} {t("pts", "ball", "очк")}
              </span>
              {lesson.isCompleted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Completed", "Tugatilgan", "Завершено")}</span>
              )}
              {lesson.isBlocked && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive"><Lock className="w-3.5 h-3.5" /> {t("Blocked", "Bloklangan", "Заблокировано")}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8 leading-tight" data-testid="text-lesson-title">{localizedTitle}</h1>

            {/* Content */}
            <div className="lesson-body">
              {renderContent(localizedContent)}
            </div>

            {/* Test CTA */}
            <div className="mt-10">
              {lesson.isBlocked ? (
                <div className="glass-card flex items-center gap-3 border-destructive/30">
                  <Lock className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive text-sm">{t("This lesson is blocked", "Bu dars bloklangan", "Этот урок заблокирован")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("Contact admin to unblock.", "Blokni ochish uchun adminga murojaat qiling.", "Обратитесь к администратору.")}</p>
                  </div>
                </div>
              ) : lesson.isCompleted ? (
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
              ) : lesson.attemptCount >= 3 ? (
                /* Out of attempts is not a dead end: the lesson stays readable,
                   and the rest of the module is still open. Say so, and give
                   somewhere to go. */
                <div className="glass-card">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                      <ListChecks className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{t("You've used all 3 test attempts", "3 ta urinishning hammasini ishlatdingiz", "Вы использовали все 3 попытки")}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {t(
                          "The lesson stays open — re-read it any time. You can carry on with the rest of the module, and the final exam covers this material again.",
                          "Dars ochiq qoladi — istalgan vaqtda qayta o'qing. Modulning qolganini davom ettiraversangiz bo'ladi, yakuniy imtihon bu mavzuni yana qamrab oladi.",
                          "Урок остаётся открытым — перечитайте в любое время. Можно продолжать модуль, а итоговый экзамен снова охватит этот материал.",
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {next && (
                          <Link href={`/learn/${next.id}`}>
                            <button className="cyber-button h-9 px-4 text-xs">
                              {t("Next lesson", "Keyingi dars", "Следующий урок")} <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                        )}
                        {mod && (
                          <Link href={`/modules/${mod.id}`}>
                            <button className="cyber-button-outline h-9 px-4 text-xs">
                              {t("Back to module", "Modulga qaytish", "К модулю")}
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-primary/25">
                  <div>
                    <p className="font-semibold text-sm">{t("Ready to test your knowledge?", "Bilimingizni tekshirishga tayyormisiz?", "Готовы проверить знания?")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`${3 - lesson.attemptCount} attempts remaining`, `${3 - lesson.attemptCount} urinish qoldi`, `Осталось попыток: ${3 - lesson.attemptCount}`)}
                    </p>
                  </div>
                  <button onClick={() => setLocation(`/learn/${id}/test`)} className="cyber-button h-11 px-6 shrink-0" data-testid="button-start-test">
                    {t("I'm done — take the test", "Tugatdim — testni topshirish", "Я закончил — пройти тест")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Prev / Next navigation — the momentum that was missing. */}
            {(prev || next || mod) && (
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {prev ? (
                  <Link href={`/learn/${prev.id}`} className="group glass-card !p-4 flex items-center gap-3 hover:border-primary/40">
                    <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("Previous", "Oldingi", "Назад")}</div>
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t(prev.title, prev.titleUz ?? undefined, prev.titleRu ?? undefined)}</div>
                    </div>
                  </Link>
                ) : <div className="hidden sm:block" />}

                {next ? (
                  <Link href={`/learn/${next.id}`} className="group glass-card !p-4 flex items-center gap-3 text-right hover:border-primary/40 sm:justify-end">
                    <div className="min-w-0 order-1 sm:order-none">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("Next", "Keyingi", "Далее")}</div>
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t(next.title, next.titleUz ?? undefined, next.titleRu ?? undefined)}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 order-2" />
                  </Link>
                ) : mod ? (
                  <Link href={`/modules/${mod.id}`} className="group glass-card !p-4 flex items-center gap-3 hover:border-primary/40 sm:justify-end border-primary/25">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("Finish", "Yakun", "Финал")}</div>
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
