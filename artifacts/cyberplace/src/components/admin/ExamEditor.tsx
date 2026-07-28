import { useEffect, useState } from "react";
import { AlertTriangle, MinusCircle, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { LoadFailure } from "@/components/LoadFailure";
import { errorToast } from "@/lib/error-toast";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

type ExamQuestion = {
  question: string;
  questionUz: string | null;
  questionRu: string | null;
  options: string[];
  optionsUz: string[] | null;
  optionsRu: string[] | null;
  correctOption: number;
};

type ExamResponse = {
  passScore: number;
  certificateCount: number;
  activeSessions: number;
  questions: ExamQuestion[];
};

const BLANK: ExamQuestion = {
  question: "", questionUz: null, questionRu: null,
  options: ["", "", "", ""], optionsUz: null, optionsRu: null, correctOption: 0,
};

/** Grows a translation list to match the English one, so indexes line up. */
function padTo(list: string[] | null, length: number): string[] {
  const out = (list ?? []).slice(0, length);
  while (out.length < length) out.push("");
  return out;
}

/**
 * The module exam, which could only be written in SQL.
 *
 * Fifteen questions per module decide who earns a certificate. The lesson
 * editor has had a question form since it was built; the exam — the
 * higher-stakes half of the same system — had no surface at all, so a typo in a
 * question, or a wrong correct-answer index, was a database job.
 *
 * The whole set is saved at once, which replaces the rows. The server refuses
 * while anyone is actually sitting the exam, because new row ids would get
 * their submission rejected outright.
 */
export function ExamEditor({ moduleId, moduleTitle, onClose }: {
  moduleId: number;
  moduleTitle: string;
  onClose: () => void;
}) {
  const { t } = useLang();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ExamQuestion[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [openTranslations, setOpenTranslations] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-exam", moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load the exam");
      return res.json() as Promise<ExamResponse>;
    },
  });

  useEffect(() => {
    if (data && draft === null) setDraft(data.questions.length > 0 ? data.questions : [{ ...BLANK }]);
  }, [data, draft]);

  const edit = (i: number, patch: Partial<ExamQuestion>) =>
    setDraft(d => d && d.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const editOption = (i: number, oi: number, value: string, list: "options" | "optionsUz" | "optionsRu") =>
    setDraft(d => d && d.map((q, j) => {
      if (j !== i) return q;
      if (list === "options") {
        const next = [...q.options];
        next[oi] = value;
        return { ...q, options: next };
      }
      const next = padTo(q[list], Math.max(q.options.length, oi + 1));
      next[oi] = value;
      return { ...q, [list]: next.some(Boolean) ? next : null };
    }));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/questions`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      toast({ title: t(`Exam saved — ${body.questionCount} questions`,
                       `Imtihon saqlandi — ${body.questionCount} ta savol`,
                       `Экзамен сохранён — ${body.questionCount} вопросов`) });
      void refetch();
    } catch (err) {
      toast(errorToast(t, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-background/40 p-4" data-testid={`exam-editor-${moduleId}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-sm">{t("Exam", "Imtihon", "Экзамен")} — {moduleTitle}</h3>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(`Pass mark ${data.passScore}%. Every question counts the same.`,
                 `O'tish bali ${data.passScore}%. Har bir savol teng hisoblanadi.`,
                 `Проходной балл ${data.passScore}%. Все вопросы равнозначны.`)}
            </p>
          )}
        </div>
        <button onClick={onClose} aria-label={t("Close", "Yopish", "Закрыть")}>
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Changing the exam does not revoke a certificate already earned, and
          saying so beats letting an admin discover it afterwards. */}
      {data && data.certificateCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {t(`${data.certificateCount} certificate(s) were already awarded for this module. Editing the exam does not take them back — they record the score that was earned at the time.`,
               `Bu modul uchun ${data.certificateCount} ta sertifikat berilgan. Imtihonni tahrirlash ularni qaytarib olmaydi — ular o'sha paytdagi natijani qayd etadi.`,
               `По этому модулю выдано ${data.certificateCount} сертификат(ов). Правка экзамена их не отзывает — они фиксируют результат на тот момент.`)}
          </span>
        </div>
      )}
      {data && data.activeSessions > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {t(`${data.activeSessions} learner(s) are sitting this exam right now. Saving is refused until they finish.`,
               `Hozir ${data.activeSessions} o'quvchi bu imtihonni topshirmoqda. Ular tugatmaguncha saqlash rad etiladi.`,
               `Сейчас ${data.activeSessions} учащ. сдают этот экзамен. Сохранение будет отклонено, пока они не закончат.`)}
          </span>
        </div>
      )}

      {isError ? (
        <LoadFailure onRetry={() => refetch()} />
      ) : isLoading || !draft ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (
        <>
          <div className="space-y-4">
            {draft.map((q, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3" data-testid={`exam-question-${i}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("Question", "Savol", "Вопрос")} {i + 1}
                  </span>
                  {draft.length > 1 && (
                    <button
                      onClick={() => setDraft(d => d && d.filter((_, j) => j !== i))}
                      aria-label={t("Remove", "O'chirish", "Удалить")}
                      data-testid={`exam-remove-${i}`}
                    >
                      <MinusCircle className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>

                <Input
                  value={q.question}
                  onChange={e => edit(i, { question: e.target.value })}
                  placeholder={t("Question text", "Savol matni", "Текст вопроса")}
                  className="mb-2"
                  data-testid={`exam-q-${i}`}
                />

                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map(oi => (
                    <Input
                      key={oi}
                      value={q.options[oi] ?? ""}
                      onChange={e => editOption(i, oi, e.target.value, "options")}
                      placeholder={`${t("Option", "Variant", "Вариант")} ${String.fromCharCode(65 + oi)}`}
                      data-testid={`exam-o-${i}-${oi}`}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <label className="text-xs text-muted-foreground inline-flex items-center gap-2">
                    {t("Correct answer", "To'g'ri javob", "Правильный ответ")}
                    <select
                      value={q.correctOption}
                      onChange={e => edit(i, { correctOption: Number(e.target.value) })}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:border-primary"
                      data-testid={`exam-correct-${i}`}
                    >
                      {q.options.map((_, oi) => (
                        <option key={oi} value={oi}>{String.fromCharCode(65 + oi)}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() => setOpenTranslations(v => (v === i ? null : i))}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    data-testid={`exam-translations-${i}`}
                  >
                    {t("Translations (UZ / RU)", "Tarjimalar (UZ / RU)", "Переводы (UZ / RU)")}
                  </button>
                </div>

                {openTranslations === i && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {(["Uz", "Ru"] as const).map(suffix => {
                      const qKey = `question${suffix}` as "questionUz" | "questionRu";
                      const oKey = `options${suffix}` as "optionsUz" | "optionsRu";
                      return (
                        <div key={suffix} className="space-y-2">
                          <Input
                            value={q[qKey] ?? ""}
                            onChange={e => edit(i, { [qKey]: e.target.value || null } as Partial<ExamQuestion>)}
                            placeholder={`${t("Question", "Savol", "Вопрос")} (${suffix.toUpperCase()})`}
                            data-testid={`exam-q-${i}-${suffix.toLowerCase()}`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {[0, 1, 2, 3].map(oi => (
                              <Input
                                key={oi}
                                value={q[oKey]?.[oi] ?? ""}
                                onChange={e => editOption(i, oi, e.target.value, oKey)}
                                placeholder={`${t("Option", "Variant", "Вариант")} ${String.fromCharCode(65 + oi)} (${suffix.toUpperCase()})`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => setDraft(d => d && [...d, { ...BLANK }])}
              data-testid="exam-add-question"
            >
              <PlusCircle className="w-3.5 h-3.5" /> {t("Add question", "Savol qo'shish", "Добавить вопрос")}
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {draft.length} {t("questions", "savol", "вопросов")}
              </span>
              <Button size="sm" disabled={saving} onClick={save} data-testid="exam-save">
                {t("Save the exam", "Imtihonni saqlash", "Сохранить экзамен")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
