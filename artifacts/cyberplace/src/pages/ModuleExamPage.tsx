import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Award, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  useGetModule, getGetModuleQueryKey,
  useStartModuleExam, useSubmitModuleExam, useIssueCertificate,
} from "@workspace/api-client-react";

type ExamQuestion = {
  id: number;
  question: string; questionUz?: string | null; questionRu?: string | null;
  options: string[]; optionsUz?: string[] | null; optionsRu?: string[] | null;
};

type ExamResult = {
  score: number; correct: number; total: number;
  passScore: number; passed: boolean; certificateAvailable: boolean;
};

type ModuleDetail = {
  id: number;
  title: string; titleUz?: string | null; titleRu?: string | null;
  passScore: number;
  examQuestionCount: number;
  examUnlocked: boolean;
  exam: { bestScore: number; passed: boolean; attemptCount: number };
  certificateSerial?: string | null;
};

/** The API client throws an ApiError carrying `status` and `message`. */
function errorMessage(err: unknown, fallback: string) {
  const message = (err as { message?: string })?.message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}

export default function ModuleExamPage() {
  const [, params] = useRoute("/modules/:id/exam");
  const id = Number(params?.id);
  const { t, lang } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [fullName, setFullName] = useState("");

  const { data, isLoading } = useGetModule(id, {
    query: { queryKey: getGetModuleQueryKey(id), enabled: Number.isInteger(id) && id > 0 },
  });
  const mod = data as ModuleDetail | undefined;

  const startExam = useStartModuleExam();
  const submitExam = useSubmitModuleExam();
  const issueCertificate = useIssueCertificate();

  /** Localised text for a question and its options. */
  const localized = (q: ExamQuestion) => ({
    question: t(q.question, q.questionUz ?? undefined, q.questionRu ?? undefined),
    options: (lang === "uz" && q.optionsUz?.length ? q.optionsUz
      : lang === "ru" && q.optionsRu?.length ? q.optionsRu
        : q.options),
  });

  const handleStart = () => {
    startExam.mutate({ id }, {
      onSuccess: res => {
        setSessionId(res.sessionId);
        setQuestions(res.questions);
        setAnswers({});
        setResult(null);
      },
      onError: err => {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          toast({ title: t("Sign in to take the exam", "Imtihon uchun tizimga kiring", "Войдите, чтобы сдать экзамен") });
          setLocation("/login");
          return;
        }
        toast({
          title: t("Could not start the exam", "Imtihonni boshlab bo'lmadi", "Не удалось начать экзамен"),
          description: errorMessage(err, ""),
          variant: "destructive",
        });
      },
    });
  };

  const handleSubmit = () => {
    if (!sessionId) return;
    submitExam.mutate(
      {
        id,
        data: {
          sessionId,
          // One entry per question: the server rejects duplicates outright.
          answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
            questionId: Number(questionId),
            selectedOption,
          })),
        },
      },
      {
        onSuccess: res => {
          setResult(res);
          setSessionId(null);
        },
        onError: err => toast({
          title: t("Could not submit", "Yuborib bo'lmadi", "Не удалось отправить"),
          description: errorMessage(err, ""),
          variant: "destructive",
        }),
      },
    );
  };

  const handleIssue = () => {
    issueCertificate.mutate({ id, data: { fullName } }, {
      onSuccess: cert => setLocation(`/certificate/${cert.serial}`),
      onError: err => toast({
        title: t("Could not issue the certificate", "Sertifikat berib bo'lmadi", "Не удалось выдать сертификат"),
        description: errorMessage(err, ""),
        variant: "destructive",
      }),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-6 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24 text-center">
        <p className="text-muted-foreground mb-6">{t("Module not found.", "Modul topilmadi.", "Модуль не найден.")}</p>
        <Link href="/modules"><Button variant="outline">{t("Back to modules", "Modullarga qaytish", "К модулям")}</Button></Link>
      </div>
    );
  }

  const title = t(mod.title, mod.titleUz ?? undefined, mod.titleRu ?? undefined);
  // The name form is the last step: shown after a passing result, and also on
  // arrival when the exam was already passed but no certificate was issued yet —
  // so passing once is enough, without sitting the exam again.
  const showNameForm = (result?.certificateAvailable ?? false)
    || (!result && mod.exam.passed && !mod.certificateSerial);
  const score = result?.score ?? mod.exam.bestScore;

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <Link href={`/modules/${id}`}>
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {title}
          </button>
        </Link>

        {/* Step 3 — the certificate name. */}
        {showNameForm ? (
          <section className="border border-border rounded-xl p-6 bg-card" data-testid="section-certificate-name">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("You passed", "Siz o'tdingiz", "Вы сдали")}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                `Your score is ${score}%. Enter your name exactly as it appears on your passport — it will be printed on the certificate and cannot be changed casually later.`,
                `Ballingiz ${score}%. Ismingizni pasportdagidek kiriting — u sertifikatga chop etiladi va keyin osongina o'zgartirilmaydi.`,
                `Ваш балл ${score}%. Введите имя точно как в паспорте — оно будет напечатано на сертификате.`,
              )}
            </p>

            <div className="space-y-2 mb-6">
              <Label htmlFor="fullName">
                {t("Full name (as on passport)", "To'liq ism (pasportdagidek)", "Полное имя (как в паспорте)")}
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t("Aziz Karimov", "Aziz Karimov", "Азиз Каримов")}
                data-testid="input-full-name"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "Letters, spaces, hyphens and apostrophes only — not a nickname.",
                  "Faqat harflar, bo'shliq, defis va apostrof — taxallus emas.",
                  "Только буквы, пробелы, дефисы и апострофы — не никнейм.",
                )}
              </p>
            </div>

            <Button
              onClick={handleIssue}
              disabled={fullName.trim().length < 3 || issueCertificate.isPending}
              data-testid="button-issue-certificate"
            >
              {issueCertificate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("Issue certificate", "Sertifikatni olish", "Получить сертификат")}
            </Button>
          </section>

        /* Step 2b — a failing result. */
        ) : result ? (
          <section className="border border-border rounded-xl p-6 bg-card text-center" data-testid="section-exam-result">
            <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              {t("Not this time", "Bu safar bo'lmadi", "В этот раз не вышло")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                `You scored ${result.score}% (${result.correct}/${result.total}). You need ${result.passScore}%.`,
                `Ballingiz ${result.score}% (${result.correct}/${result.total}). Kerak: ${result.passScore}%.`,
                `Ваш балл ${result.score}% (${result.correct}/${result.total}). Нужно ${result.passScore}%.`,
              )}
            </p>
            <Button onClick={handleStart} disabled={startExam.isPending} data-testid="button-retake">
              {startExam.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("Try again", "Qayta urinish", "Попробовать снова")}
            </Button>
          </section>

        /* Step 2a — the questions. */
        ) : sessionId ? (
          <section data-testid="section-exam-questions">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-semibold">{t("Final exam", "Yakuniy imtihon", "Итоговый экзамен")}</h1>
              <span className="text-sm text-muted-foreground tabular-nums">
                {Object.keys(answers).length}/{questions.length}
              </span>
            </div>
            <Progress
              value={questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0}
              className="h-1.5 mb-8"
            />

            <div className="space-y-6">
              {questions.map((q, qi) => {
                const { question, options } = localized(q);
                return (
                  <div key={q.id} className="border border-border rounded-xl p-5 bg-card">
                    <p className="font-medium mb-4">
                      <span className="text-muted-foreground mr-2 tabular-nums">{qi + 1}.</span>
                      {question}
                    </p>
                    <div className="space-y-2">
                      {options.map((option, oi) => (
                        <button
                          key={oi}
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                            answers[q.id] === oi
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border hover:bg-muted/50 text-muted-foreground"
                          }`}
                          data-testid={`option-${q.id}-${oi}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length || submitExam.isPending}
              className="w-full mt-8"
              data-testid="button-submit-exam"
            >
              {submitExam.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("Submit exam", "Imtihonni yakunlash", "Завершить экзамен")}
            </Button>
          </section>

        /* Step 1 — the intro. */
        ) : (
          <section className="border border-border rounded-xl p-6 bg-card" data-testid="section-exam-intro">
            <h1 className="text-2xl font-semibold tracking-tight mb-3">
              {t("Final exam", "Yakuniy imtihon", "Итоговый экзамен")}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                `${mod.examQuestionCount} questions covering the whole module. You need ${mod.passScore}% for a certificate, and you can retake it — your best score is kept.`,
                `Butun modulni qamrab oluvchi ${mod.examQuestionCount} ta savol. Sertifikat uchun ${mod.passScore}% kerak, qayta topshirish mumkin — eng yaxshi ball saqlanadi.`,
                `${mod.examQuestionCount} вопросов по всему модулю. Для сертификата нужно ${mod.passScore}%, пересдать можно — сохраняется лучший балл.`,
              )}
            </p>

            {mod.exam.attemptCount > 0 && (
              <p className="text-sm mb-6 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {t("Best score:", "Eng yaxshi ball:", "Лучший балл:")}{" "}
                <span className="font-semibold tabular-nums">{mod.exam.bestScore}%</span>
              </p>
            )}

            {mod.examUnlocked ? (
              <Button onClick={handleStart} disabled={startExam.isPending} data-testid="button-begin-exam">
                {startExam.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("Begin", "Boshlash", "Начать")}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Finish every lesson in this module first.",
                  "Avval ushbu moduldagi barcha darslarni tugating.",
                  "Сначала пройдите все уроки этого модуля.",
                )}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
