import { useRoute, useLocation } from "wouter";
import { BookOpen, CheckCircle2, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetLesson, getGetLessonQueryKey } from "@workspace/api-client-react";

/**
 * Renders **bold**, *italic* and `code` inside one line.
 *
 * Without this the lesson body showed its markdown raw — readers saw
 * "**Capture The Flag (CTF)**", asterisks and all. Hand-rolled for these three
 * cases rather than pulling in a markdown library for a handful of lessons.
 */
function renderInline(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return <strong key={key} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return <code key={key} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.9em]">{tok.slice(1, -1)}</code>;
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
 * Renders one run of non-code lines.
 *
 * Written as a loop rather than a map because a table spans several lines and
 * has to be consumed as a unit. Lessons use tables for things that genuinely
 * are tables — port numbers, status codes, DNS record types — and before this
 * they rendered as raw pipes, separator row and all.
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
        <div key={`t-${blockKey}-${j}`} className="my-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {header.map((cell, c) => (
                  <th key={c} className="text-left font-medium py-2 pr-4 align-top">
                    {renderInline(cell, `th-${blockKey}-${j}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-border/50">
                  {row.map((cell, c) => (
                    <td key={c} className="py-2 pr-4 align-top text-muted-foreground">
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

    if (line.startsWith("## ")) {
      out.push(<h2 key={j} className="text-lg font-semibold mt-6 mb-2">{renderInline(line.slice(3), `h2-${blockKey}-${j}`)}</h2>);
    } else if (line.startsWith("# ")) {
      out.push(<h1 key={j} className="text-xl font-bold mt-4 mb-2">{renderInline(line.slice(2), `h1-${blockKey}-${j}`)}</h1>);
    } else if (line.startsWith("- ")) {
      out.push(<li key={j} className="ml-4 text-sm">{renderInline(line.slice(2), `li-${blockKey}-${j}`)}</li>);
    } else if (line.trim() === "") {
      out.push(<br key={j} />);
    } else {
      out.push(<p key={j} className="text-sm leading-relaxed">{renderInline(line, `p-${blockKey}-${j}`)}</p>);
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
      return (
        <div key={i} className="my-4 rounded-lg overflow-hidden border border-border">
          {lang && (
            <div className="px-4 py-1.5 bg-muted text-xs font-mono text-muted-foreground border-b border-border">{lang}</div>
          )}
          <pre className="p-4 overflow-x-auto bg-card text-sm font-mono leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    return (
      <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
        {renderLines(part.split("\n"), i)}
      </div>
    );
  });
}

export default function LessonDetailPage() {
  const [, params] = useRoute("/learn/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const [, setLocation] = useLocation();

  const { data: lesson, isLoading } = useGetLesson(id, {
    query: { enabled: !!id, queryKey: getGetLessonQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <p className="text-muted-foreground">{t("Lesson not found", "Dars topilmadi", "Урок не найден")}</p>
      </div>
    );
  }

  // The lesson is stored in three languages; show the one that matches the UI,
  // falling back to English. t() already picks by language and falls back, so
  // reusing it keeps this consistent with every other translated string.
  const localizedTitle = t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined);
  const localizedContent = t(lesson.content, lesson.contentUz ?? undefined, lesson.contentRu ?? undefined);

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <span className="hover:text-foreground cursor-pointer" onClick={() => setLocation("/modules")}>{t("Learn", "O'rganish", "Учиться")}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{lesson.categoryName}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{localizedTitle}</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground font-mono">{lesson.categoryName}</span>
            {lesson.isCompleted && (
              <span className="flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Completed", "Tugatilgan", "Завершено")}</span>
            )}
            {lesson.isBlocked && (
              <span className="flex items-center gap-1 text-xs text-destructive"><Lock className="w-3.5 h-3.5" /> {t("Blocked", "Bloklangan", "Заблокировано")}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-lesson-title">{localizedTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{lesson.points} pts &bull; {lesson.attemptCount} {t("attempts", "urinish", "попыток")}</p>
        </div>

        {/* Content */}
        <div className="p-6 rounded-xl border border-border bg-card mb-8">
          {renderContent(localizedContent)}
        </div>

        {/* Action */}
        {lesson.isBlocked ? (
          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive text-sm">{t("This lesson is blocked", "Bu dars bloklangan", "Этот урок заблокирован")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("Contact admin to unblock.", "Blokni ochish uchun adminga murojaat qiling.", "Обратитесь к администратору.")}</p>
            </div>
          </div>
        ) : lesson.isCompleted ? (
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <p className="font-medium text-primary text-sm">{t("Lesson completed!", "Dars tugatildi!", "Урок завершён!")}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setLocation(`/learn/${id}/test`)} data-testid="button-retake-test">
              {t("Retake Test", "Testni qayta topshirish", "Пересдать тест")}
            </Button>
          </div>
        ) : lesson.attemptCount >= 3 ? (
          <div className="p-4 rounded-lg border border-border bg-card text-center">
            <p className="text-sm text-muted-foreground">{t("Maximum test attempts reached (3/3)", "Maksimal urinishlar soni tugadi (3/3)", "Максимум попыток достигнут (3/3)")}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div>
              <p className="font-medium text-sm">{t("Ready to test your knowledge?", "Bilimingizni tekshirishga tayyormisiz?", "Готовы проверить знания?")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(`${3 - lesson.attemptCount} attempts remaining`, `${3 - lesson.attemptCount} urinish qoldi`, `Осталось ${3 - lesson.attemptCount} попытки`)}
              </p>
            </div>
            <Button onClick={() => setLocation(`/learn/${id}/test`)} className="gap-2" data-testid="button-start-test">
              {t("I'm Done - Take Test", "Tugatdim - Test", "Я закончил - Тест")} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
