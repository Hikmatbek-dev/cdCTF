import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * A lesson, presented as a room: numbered tasks you open one at a time and tick
 * off, instead of one uninterrupted wall of text.
 *
 * A 2,700-character lesson rendered as a single column gives a reader no sense
 * of size, no place to stop, and no evidence of progress — you scroll until it
 * ends. Splitting it at its own `##` headings turns the same content into a
 * short list of tasks with a progress bar, so the shape of the lesson is
 * visible before you start and your position in it is visible throughout.
 *
 * Which tasks you have finished is kept in localStorage, not on the server:
 * it is a reading aid, not an assessment. The lesson test remains the thing
 * that decides completion and points.
 */

export type LessonTask = { heading: string | null; body: string };

/**
 * Splits lesson markdown at its top-level `##` headings.
 *
 * Anything before the first heading becomes an untitled opening task, so a
 * lesson written without headings still renders as one readable task rather
 * than disappearing.
 */
export function splitIntoTasks(content: string): LessonTask[] {
  const lines = (content || "").split("\n");
  const tasks: LessonTask[] = [];
  let heading: string | null = null;
  let buf: string[] = [];
  let inFence = false;

  const flush = () => {
    const body = buf.join("\n").trim();
    if (heading !== null || body) tasks.push({ heading, body });
    buf = [];
  };

  for (const line of lines) {
    // A `##` inside a fenced code block is a comment, not a heading.
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    if (!inFence && line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
      continue;
    }
    buf.push(line);
  }
  flush();
  return tasks.length > 0 ? tasks : [{ heading: null, body: content || "" }];
}

type Props = {
  lessonId: number;
  tasks: LessonTask[];
  /** Renders one task's markdown — supplied by the page so the two stay in sync. */
  renderBody: (body: string, key: string) => ReactNode;
};

export function LessonTasks({ lessonId, tasks, renderBody }: Props) {
  const { t } = useLang();
  const storageKey = `cdctf_lesson_tasks_${lessonId}`;

  const [done, setDone] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number | null>(0);

  // Restore progress, and open the first task that is still outstanding.
  useEffect(() => {
    let saved: number[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch { saved = []; }
    const set = new Set(saved.filter(n => Number.isInteger(n)));
    setDone(set);
    const firstOpen = tasks.findIndex((_, i) => !set.has(i));
    setOpen(firstOpen === -1 ? null : firstOpen);
  }, [storageKey, tasks.length]);

  const persist = (set: Set<number>) => {
    setDone(new Set(set));
    try { localStorage.setItem(storageKey, JSON.stringify([...set])); } catch { /* private mode */ }
  };

  const complete = (i: number) => {
    const set = new Set(done);
    set.add(i);
    persist(set);
    const next = tasks.findIndex((_, j) => !set.has(j));
    setOpen(next === -1 ? null : next);
  };

  const pct = useMemo(
    () => (tasks.length === 0 ? 0 : Math.round((done.size / tasks.length) * 100)),
    [done, tasks.length],
  );

  return (
    <div>
      {/* Progress. Shown above the tasks so the size of the lesson is known
          before the first one is opened.

          Labelled "reading progress", not "lesson progress": these ticks live
          in localStorage and count for nothing on the server. Someone who
          ticked all five sections saw 100% and reasonably concluded the lesson
          was finished — it is not; only the test completes it. Two progress
          bars on one page saying different things is worse than one honest
          one. */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-muted-foreground">
            {t("Reading progress (on this device)", "O'qish jarayoni (shu qurilmada)", "Прогресс чтения (на этом устройстве)")}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {done.size}/{tasks.length} · {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && (
          <p className="text-xs text-muted-foreground mt-2">
            {t("You have read it all. The lesson counts once you pass its test — the button is at the bottom.",
               "Hammasini o'qidingiz. Dars testdan o'tganingizda hisobga olinadi — tugma pastda.",
               "Вы всё прочли. Урок засчитывается после теста — кнопка внизу.")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map((task, i) => {
          const isOpen = open === i;
          const isDone = done.has(i);
          return (
            <div key={i} className={`rounded-xl border overflow-hidden transition-colors ${isDone ? "border-emerald-500/30" : "border-border"}`} data-testid={`lesson-task-${i}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                    {t("Task", "Vazifa", "Задача")} {i + 1}
                  </span>
                  <span className="block font-medium truncate">
                    {task.heading ?? t("Introduction", "Kirish", "Введение")}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="lesson-body pt-3">{renderBody(task.body, `task-${i}`)}</div>
                  {!isDone && (
                    <button
                      type="button"
                      onClick={() => complete(i)}
                      className="cyber-button h-9 px-4 mt-4 text-xs"
                      data-testid={`lesson-task-done-${i}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t("Mark as done", "Bajarildi deb belgilash", "Отметить выполненным")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
