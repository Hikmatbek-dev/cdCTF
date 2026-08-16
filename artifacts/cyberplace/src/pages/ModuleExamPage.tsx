import { useState, useMemo, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Award, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { loginWithNext } from "@/lib/next-path";
import { normalizeArray } from "@/lib/api-shapes";
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
  const [routeMatches, params] = useRoute("/modules/:id/exam");
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
  const localized = useCallback((q: ExamQuestion) => {
    const rawOpts =
      lang === "uz" && Array.isArray(q.optionsUz) && q.optionsUz.length > 0
        ? q.optionsUz
        : lang === "ru" && Array.isArray(q.optionsRu) && q.optionsRu.length > 0
          ? q.optionsRu
          : q.options;

    return {
      question: t(q.question, q.questionUz ?? undefined, q.questionRu ?? undefined),
      options: normalizeArray<string>(rawOpts, ["options", "data", "items"]),
    };
  }, [lang, t]);

  const shuffledQuestions = useMemo(() => questions.map(q => {
    const { question, options } = localized(q);
    const withIndex = options.map((text: string, originalIndex: number) => ({ text, originalIndex }));
    const list = [...withIndex];
    let seed = (q.id * 15485863) % 2147483647;
    for (let i = list.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = Math.floor((seed / 2147483647) * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return { q, question, shuffledOptions: list };
  }), [questions, localized]);

  const handleStart = () => {
    startExam.mutate({ id }, {
      onSuccess: res => {
        setSessionId(res.sessionId);
        setQuestions(res.questions);
        setAnswers({});
        setResult(null);

        if (res.questions.length === 0) {
          submitExam.mutate(
            { id, data: { sessionId: res.sessionId, answers: [] } },
            {
              onSuccess: submitRes => {
                setResult(submitRes);
                setSessionId(null);
              },
              onError: err => toast({
                title: t("Could not submit", "Yuborib bo'lmadi", "Не удалось отправить"),
                description: errorMessage(err, ""),
                variant: "destructive",
              }),
            }
          );
        }
      },
      onError: err => {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          toast({ title: t("Sign in to take the exam", "Imtihon uchun tizimga kiring", "Войдите, чтобы сдать экзамен") });
          setLocation(loginWithNext(`/modules/${id}/exam`));
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

  // `!routeMatches` means the path moved off this page while it is still
  // mounted. `id` is then NaN, the query is disabled, and `mod` is undefined —
  // so falling through would assert "Module not found" about a module that is
  // fine. A page whose route no longer matches knows nothing; the skeleton says
  // that, and unlike returning null it keeps a child for the transition to
  // animate.
  if (!routeMatches || isLoading) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-background page text-center">
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
    <div className="min-h-screen bg-background text-foreground page relative">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] opacity-40 mix-blend-screen" />
      </div>

      <div className="shell-narrow relative z-10 py-12">
        <Link href={`/modules/${id}`}>
          <button className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-10 transition-all hover:-translate-x-1 group">
            <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            {title}
          </button>
        </Link>

        {/* Step 3 — the certificate name. */}
        {showNameForm ? (
          <section className="glass-card rounded-3xl p-8 sm:p-12 text-center animate-in zoom-in-95 fade-in duration-700 shadow-2xl border-primary/20" data-testid="section-certificate-name">
            <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-emerald-500/20">
              <Award className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              {t("Exam Passed!", "Imtihondan o'tdingiz!", "Экзамен Сдан!")}
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
              {t(
                `Outstanding! Your score is ${score}%. Enter your name exactly as it appears on your passport — it will be permanently engraved on your verifiable certificate.`,
                `Qoyilmaqom! Ballingiz ${score}%. Ismingizni pasportdagidek kiriting — u tekshiriladigan sertifikatingizga abadiy muhrlanadi.`,
                `Отлично! Ваш балл ${score}%. Введите имя точно как в паспорте — оно будет навсегда закреплено на вашем сертификате.`,
              )}
            </p>

            <div className="max-w-md mx-auto space-y-4 mb-8 text-left">
              <Label htmlFor="fullName" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                {t("Full name (as on passport)", "To'liq ism (pasportdagidek)", "Полное имя (как в паспорте)")}
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t("e.g. Aziz Karimov", "masalan, Aziz Karimov", "напр. Азиз Каримов")}
                className="h-14 text-lg bg-background/50 border-primary/30 focus-visible:ring-primary/50 rounded-xl"
                data-testid="input-full-name"
              />
              <p className="text-xs text-muted-foreground/80 ml-1">
                {t(
                  "Letters, spaces, hyphens and apostrophes only — no nicknames allowed.",
                  "Faqat harflar, bo'shliq, defis va apostrof — taxallus yozish mumkin emas.",
                  "Только буквы, пробелы, дефисы и апострофы — без никнеймов.",
                )}
              </p>
            </div>

            <button
              onClick={handleIssue}
              disabled={fullName.trim().length < 3 || issueCertificate.isPending}
              className="cyber-button h-14 px-8 w-full max-w-md text-lg disabled:opacity-50 transition-all shadow-primary/20 shadow-xl"
              data-testid="button-issue-certificate"
            >
              {issueCertificate.isPending && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
              {t("Claim Certificate", "Sertifikatni Olish", "Получить сертификат")}
            </button>
          </section>

        /* Step 2b — a failing result. */
        ) : result ? (
          <section className="glass-card rounded-3xl p-8 sm:p-12 text-center animate-in zoom-in-95 fade-in duration-500 border-rose-500/20" data-testid="section-exam-result">
            <div className="w-20 h-20 mx-auto bg-rose-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-rose-500/20">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-foreground">
              {t("Mission Failed", "Missiya Muvaffaqiyatsiz", "Миссия Провалена")}
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
              {t(
                `You scored ${result.score}% (${result.correct}/${result.total}). You need at least ${result.passScore}% to claim the certificate. Review the module and try again.`,
                `Ballingiz ${result.score}% (${result.correct}/${result.total}). Sertifikat olish uchun kamida ${result.passScore}% kerak. Modulni takrorlang va qayta urinib ko'ring.`,
                `Ваш балл ${result.score}% (${result.correct}/${result.total}). Для получения сертификата нужно минимум ${result.passScore}%. Повторите модуль и попробуйте снова.`,
              )}
            </p>
            <button onClick={handleStart} disabled={startExam.isPending} className="cyber-button-outline h-14 px-10 text-lg mx-auto" data-testid="button-retake">
              {startExam.isPending && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
              {t("Retake Exam", "Qayta Topshirish", "Пересдать Экзамен")}
            </button>
          </section>

        /* Step 2a — the questions. */
        ) : sessionId ? (
          <section data-testid="section-exam-questions" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="glass-card rounded-2xl p-6 mb-8 sticky top-4 z-20 shadow-xl border-primary/20 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {t("Active Exam Session", "Faol Imtihon Sessiyasi", "Активная Экзаменационная Сессия")}
                </h1>
                <div className="px-3 py-1 rounded-full bg-muted border border-border text-sm font-mono font-bold">
                  {Object.keys(answers).length} / {questions.length}
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out relative"
                  style={{ width: `${questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {shuffledQuestions.map(({ q, question, shuffledOptions }, qi) => {
                const isAnswered = answers[q.id] !== undefined;
                return (
                  <div key={q.id} className={`glass-card rounded-3xl p-6 sm:p-8 transition-all duration-500 ${isAnswered ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-border'}`}>
                    <h3 className="text-lg sm:text-xl font-medium mb-6 leading-relaxed">
                      <span className="text-primary font-black mr-3 tabular-nums text-2xl">{qi + 1}.</span>
                      {question}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {shuffledOptions.map((option: { text: string; originalIndex: number }, displayIndex: number) => {
                        const isSelected = answers[q.id] === option.originalIndex;
                        return (
                          <button
                            key={displayIndex}
                            onClick={() => setAnswers(a => ({ ...a, [q.id]: option.originalIndex }))}
                            className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 relative overflow-hidden group ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground shadow-[0_0_15px_rgba(59,70,207,0.15)] scale-[1.02]"
                                : "border-border bg-card/40 hover:bg-card hover:border-primary/40 hover:shadow-md text-muted-foreground hover:text-foreground"
                            }`}
                            data-testid={`option-${q.id}-${displayIndex}`}
                          >
                            {isSelected && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
                            <div className="flex items-start gap-3 relative z-10">
                              <div className={`w-5 h-5 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                isSelected ? "border-primary bg-primary" : "border-muted-foreground/40 group-hover:border-primary/50"
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className="text-sm font-medium leading-tight pt-0.5">{option.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < questions.length || submitExam.isPending}
                className="cyber-button h-14 px-10 text-lg w-full sm:w-auto min-w-[200px]"
                data-testid="button-submit-exam"
              >
                {submitExam.isPending ? (
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                {t("Submit Exam", "Imtihonni Yakunlash", "Завершить Экзамен")}
              </button>
            </div>
          </section>

        /* Step 1 — the intro. */
        ) : (
          <section className="glass-card rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700" data-testid="section-exam-intro">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-sky-500/20 relative">
              <div className="absolute -bottom-10 left-8 w-20 h-20 bg-card rounded-2xl border-2 border-primary/20 shadow-xl flex items-center justify-center rotate-3">
                <Award className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            <div className="pt-16 pb-8 px-8 sm:px-12">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-foreground">
                {t("Final Certification Exam", "Yakuniy Sertifikat Imtihoni", "Финальный Сертификационный Экзамен")}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                {t(
                  `This assessment contains ${mod.examQuestionCount} questions covering the entire module. You must achieve a score of ${mod.passScore}% to earn the official certificate. You can retake the exam if needed — your highest score will be recorded.`,
                  `Ushbu yakuniy sinov modulning barcha mavzularini qamrab oluvchi ${mod.examQuestionCount} ta savoldan iborat. Rasmiy sertifikatni qo'lga kiritish uchun kamida ${mod.passScore}% to'plashingiz zarur. Imtihonni qayta topshirish mumkin — eng yuqori ballingiz saqlanadi.`,
                  `Этот тест содержит ${mod.examQuestionCount} вопросов по всему модулю. Для получения официального сертификата необходимо набрать минимум ${mod.passScore}%. Вы можете пересдать экзамен — сохранится ваш лучший результат.`,
                )}
              </p>

              {mod.exam.attemptCount > 0 && (
                <div className="inline-flex items-center gap-4 bg-muted/50 border border-border rounded-2xl px-5 py-3 mb-10">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {t("Your Best Score", "Sizning Eng Yaxshi Natijangiz", "Ваш Лучший Результат")}
                    </div>
                    <div className="text-xl font-black tabular-nums">{mod.exam.bestScore}%</div>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-8 flex items-center gap-4">
                {mod.examUnlocked ? (
                  <button onClick={handleStart} disabled={startExam.isPending} className="cyber-button h-14 px-10 text-lg shadow-primary/20" data-testid="button-begin-exam">
                    {startExam.isPending && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                    {t("Start Exam Now", "Imtihonni Hozir Boshlash", "Начать Экзамен Сейчас")}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl px-5 py-4 w-full sm:w-auto">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">
                      {t(
                        "You must complete every lesson in this module before taking the final exam.",
                        "Yakuniy imtihonni topshirishdan oldin ushbu moduldagi barcha darslarni to'liq tugatishingiz shart.",
                        "Перед сдачей финального экзамена вы должны пройти все уроки в этом модуле.",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
