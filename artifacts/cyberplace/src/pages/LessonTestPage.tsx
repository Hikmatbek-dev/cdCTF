import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { CheckCircle2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/LanguageContext";
import { useStartLessonTest, useSubmitLessonTest } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeArray } from "@/lib/api-shapes";
import { loginWithNext } from "@/lib/next-path";
import { triggerConfetti } from "@/lib/confetti";
import { updateLearningStreak } from "@/lib/learn-storage";

type TestQuestion = {
  id: number;
  question: string; questionUz?: string | null; questionRu?: string | null;
  options: string[]; optionsUz?: string[] | null; optionsRu?: string[] | null;
};

import { useAuth } from "@/lib/AuthContext";

export default function LessonTestPage() {
  const [, params] = useRoute("/learn/:id/test");
  const id = Number(params?.id);
  const { t, lang } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetchSession } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [result, setResult] = useState<{ passed: boolean; score: number; correctCount: number; totalCount: number; pointsEarned: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const startTest = useStartLessonTest();
  const submitTest = useSubmitLessonTest();

  /*
   * No fullscreen proctoring here, deliberately.
   *
   * A five-question lesson quiz was gated behind a fullscreen request, policed
   * for exits, and locked for good after three escapes or three failures — and
   * since the module exam needs every lesson complete, that lock took the
   * module's certificate with it. On a cheap Android inside Telegram's browser
   * this screen was where a lot of people stopped. Four completions across 165
   * lessons is not a content problem; it is a toll gate.
   *
   * The lesson test is formative: it awards its points once (guarded by
   * completedAt) and proves nothing to anyone else. The credential is issued by
   * the module exam, and that is where an attempt limit belongs — it has one.
   * Attempts here are limited per rolling 24-hour window, so a bad day costs a
   * day and not the certificate.
   */
  // Extract questions list safely
  const questionList = normalizeArray<TestQuestion>(questions, ["questions", "data", "items"]);

  // Randomly shuffle options once per question set, preserving originalIndex with true PRNG
  const shuffledQuestions = useMemo(() => {
    return questionList.map(q => {
      const rawOptions =
        lang === "uz" && Array.isArray(q.optionsUz) && q.optionsUz.length > 0
          ? q.optionsUz
          : lang === "ru" && Array.isArray(q.optionsRu) && q.optionsRu.length > 0
            ? q.optionsRu
            : q.options;

      const options = normalizeArray<string>(rawOptions, ["options", "data", "items"]);
      const withIndex = options.map((text, originalIndex) => ({ text, originalIndex }));
      
      // Deterministic PRNG shuffle per question ID
      const list = [...withIndex];
      let seed = (q.id * 15485863) % 2147483647;
      for (let i = list.length - 1; i > 0; i--) {
        seed = (seed * 16807) % 2147483647;
        const j = Math.floor((seed / 2147483647) * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return { q, shuffledOptions: list };
    });
  }, [questionList, lang]);

  // Start test on mount
  useEffect(() => {
    setLoading(true);
    startTest.mutate(
      { id },
      {
        onSuccess: (res) => {
          setSessionId(res.sessionId);
          const qList = normalizeArray<TestQuestion>(res.questions, ["questions", "data", "items"]);
          setQuestions(qList);
          setAttemptsLeft(res.attemptsLeft);
          
          if (qList.length === 0) {
            submitTest.mutate(
              { id, data: { sessionId: res.sessionId, answers: [] } },
              {
                onSuccess: (submitRes) => {
                  setResult(submitRes);
                  void refetchSession();
                  setLoading(false);
                },
                onError: () => {
                  toast({ title: t("Error submitting test", "Testni yuborishda xatolik", "Ошибка при отправке теста"), variant: "destructive" });
                  setLoading(false);
                }
              }
            );
            return;
          }
          
          setLoading(false);
        },
        onError: (err: unknown) => {
          // The client throws an ApiError carrying `status` and a message built
          // from the server's reply. This used to read err.response.data.error —
          // an axios shape this app never produces — so it always fell through
          // to the literal "Error". A signed-out visitor clicking "take test"
          // saw that instead of being told to sign in.
          const status = (err as { status?: number })?.status;
          if (status === 401) {
            toast({
              title: t("Sign in to take the test", "Testni topshirish uchun tizimga kiring", "Войдите, чтобы пройти тест"),
              variant: "destructive",
            });
            // With the destination attached: without it, sign-in dropped a
            // learner who had just finished a lesson onto the challenge list.
            setLocation(loginWithNext(`/learn/${id}/test`));
            return;
          }
          if (status === 429) {
            // Attempts are per rolling day now, so this is a wait, not a wall.
            toast({
              title: t("You have used today's attempts", "Bugungi urinishlar tugadi", "Сегодняшние попытки исчерпаны"),
              description: t(
                "Three tries per day. Re-read the lesson and come back tomorrow — nothing is lost.",
                "Kuniga uchta urinish. Darsni qayta o'qing va ertaga qayting — hech nima yo'qolmaydi.",
                "Три попытки в день. Перечитайте урок и возвращайтесь завтра — ничего не потеряно.",
              ),
            });
            setLocation(`/learn/${id}`);
            return;
          }
          const msg = (err as Error)?.message
            || t("Could not start the test", "Testni boshlab bo'lmadi", "Не удалось начать тест");
          toast({ title: msg, variant: "destructive" });
          setLocation(`/learn/${id}`);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = () => {
    if (!sessionId) return;
    const answersList = Object.entries(answers).map(([qId, opt]) => ({
      questionId: Number(qId),
      selectedOption: opt,
    }));

    submitTest.mutate(
      { id, data: { sessionId, answers: answersList } },
      {
        onSuccess: (res) => {
          setResult(res);
          void refetchSession();
          if (res.passed) {
            triggerConfetti();
            updateLearningStreak();
          }
        },
        onError: () => toast({ title: t("Error submitting test", "Testni yuborishda xatolik", "Ошибка при отправке теста"), variant: "destructive" }),
      }
    );
  };

  // Power-User Hotkeys for Quiz options (A/B/C/D or 1/2/3/4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger inside text inputs
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (result || loading || shuffledQuestions.length === 0) return;

      const key = e.key.toUpperCase();
      let optIdx = -1;
      if (key === "A" || key === "1") optIdx = 0;
      else if (key === "B" || key === "2") optIdx = 1;
      else if (key === "C" || key === "3") optIdx = 2;
      else if (key === "D" || key === "4") optIdx = 3;

      if (optIdx !== -1) {
        // Find the first unanswered question
        const targetQ = shuffledQuestions.find(({ q }) => answers[q.id] === undefined) || shuffledQuestions[0];
        if (targetQ && targetQ.shuffledOptions[optIdx]) {
          setAnswers(prev => ({ ...prev, [targetQ.q.id]: targetQ.shuffledOptions[optIdx].originalIndex }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answers, shuffledQuestions, result, loading]);

  if (result) {
    const percentage = Math.round(result.score * 100);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card text-center max-w-sm w-full">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${result.passed ? "bg-primary/15 border border-primary/25 neon-glow" : "bg-destructive/10 border border-destructive/25"}`}>
            {result.passed
              ? <CheckCircle2 className="w-8 h-8 text-primary" />
              : <XCircle className="w-8 h-8 text-destructive" />}
          </div>
          <h2 className="text-2xl font-bold mb-1">
            {result.passed ? t("Passed!", "O'tdingiz!", "Сдано!") : t("Not this time", "Bu safar emas", "Не в этот раз")}
          </h2>
          <p className={`text-5xl font-mono font-bold mb-2 ${result.passed ? "gradient-text" : "text-destructive"}`}>{percentage}%</p>
          <p className="text-sm text-muted-foreground mb-2">
            {result.correctCount}/{result.totalCount} {t("correct", "to'g'ri", "правильно")}
          </p>
          {result.passed && result.pointsEarned > 0 && (
            <p className="text-sm font-semibold text-primary mb-4">+{result.pointsEarned} {t("points", "ball", "очки")}</p>
          )}
          {!result.passed && (
            <p className="text-xs text-muted-foreground mb-4">
              {attemptsLeft > 0
                ? t(`${attemptsLeft} more tries today`, `bugun yana ${attemptsLeft} urinish`, `сегодня ещё ${attemptsLeft} попыток`)
                : t("That is today's attempts. Come back tomorrow — the lesson stays open.",
                    "Bugungi urinishlar shu. Ertaga qayting — dars ochiq qoladi.",
                    "На сегодня попытки закончились. Возвращайтесь завтра — урок остаётся открытым.")}
            </p>
          )}
          <div className="flex gap-2 justify-center mt-5">
            {result.passed ? (
              <button onClick={() => setLocation(`/learn/${id}`)} className="cyber-button h-11 px-6">
                {t("Continue", "Davom etish", "Продолжить")} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setLocation(`/learn/${id}`)}>
                  {t("Back to lesson", "Darsga qaytish", "К уроку")}
                </Button>
                {attemptsLeft > 0 && (
                  <Button onClick={() => { setResult(null); setAnswers({}); setLoading(true); startTest.mutate({ id }, { onSuccess: (res) => { setSessionId(res.sessionId); setQuestions(normalizeArray<TestQuestion>(res.questions, ["questions", "data", "items"])); setAttemptsLeft(res.attemptsLeft); setLoading(false); } }); }}>
                    {t("Try again", "Qayta urinish", "Ещё раз")}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("Loading test...", "Test yuklanmoqda...", "Загрузка теста...")}</p>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const progress = questionList.length > 0 ? (answered / questionList.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">


      <div className="shell-narrow py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">{t("Lesson Test", "Dars Testi", "Тест урока")}</h1>
          <span className="text-sm text-muted-foreground">{answered}/{questionList.length} {t("answered", "javob berildi", "отвечено")}</span>
        </div>
        {/* The rules, before the first question rather than under the submit
            button: a learner should know the bar and the budget before they
            commit to answering. */}
        <p className="text-xs text-muted-foreground mb-5">
          {t(`${questionList.length} questions · pass at 80% · ${attemptsLeft} more tries today`,
             `${questionList.length} ta savol · 80% dan o'tiladi · bugun yana ${attemptsLeft} urinish`,
             `${questionList.length} вопросов · порог 80% · сегодня ещё ${attemptsLeft} попыток`)}
        </p>
        <Progress value={progress} className="mb-8 h-1.5" />

        {/* Questions */}
        <div className="space-y-6">
          {shuffledQuestions.map(({ q, shuffledOptions }, qi) => {
            const questionText = t(q.question, q.questionUz ?? undefined, q.questionRu ?? undefined);
            return (
            <div key={q.id} className="p-5 rounded-xl border border-border bg-card" data-testid={`card-question-${qi}`}>
              <p className="font-medium mb-4 text-sm">{qi + 1}. {questionText}</p>
              <div className="space-y-2">
                {shuffledOptions.map((opt, displayIndex) => (
                  <button
                    key={displayIndex}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.originalIndex }))}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      answers[q.id] === opt.originalIndex
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                    data-testid={`button-option-${qi}-${displayIndex}`}
                  >
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + displayIndex)}.</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("Pass threshold: 80%", "O'tish chegarasi: 80%", "Порог прохождения: 80%")}</p>
          <Button
            onClick={handleSubmit}
            disabled={answered < questionList.length || submitTest.isPending}
            className="gap-2"
            data-testid="button-submit-test"
          >
            {submitTest.isPending ? t("Submitting...", "Yuborilmoqda...", "Отправка...") : t("Submit Test", "Testni Yuborish", "Отправить тест")}
          </Button>
        </div>
      </div>
    </div>
  );
}
