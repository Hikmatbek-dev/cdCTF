import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { AlertTriangle, Timer, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/LanguageContext";
import { useStartLessonTest, useSubmitLessonTest, useReportTestEscape } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeArray } from "@/lib/api-shapes";

type TestQuestion = {
  id: number;
  question: string; questionUz?: string | null; questionRu?: string | null;
  options: string[]; optionsUz?: string[] | null; optionsRu?: string[] | null;
};

export default function LessonTestPage() {
  const [, params] = useRoute("/learn/:id/test");
  const id = Number(params?.id);
  const { t, lang } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [result, setResult] = useState<{ passed: boolean; score: number; correctCount: number; totalCount: number; pointsEarned: number } | null>(null);
  const [escapeWarning, setEscapeWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreenActive, setFullscreenActive] = useState(Boolean(document.fullscreenElement));
  const [fullscreenStarted, setFullscreenStarted] = useState(false);
  /** False once we learn this browser has no Fullscreen API — then the test
      runs without it rather than locking the reader out. */
  const [fullscreenSupported, setFullscreenSupported] = useState(true);
  /** The API exists but the request was refused; recoverable, so we say how. */
  const [fullscreenRefused, setFullscreenRefused] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTest = useStartLessonTest();
  const submitTest = useSubmitLessonTest();
  const reportEscape = useReportTestEscape();

  /**
   * Puts the candidate back in fullscreen, and only stands down the warning if
   * that actually happened. The browser can refuse — permission, no user
   * gesture — and clearing the warning regardless would end the enforcement
   * while leaving the test out of fullscreen, which is the thing it exists to
   * prevent.
   */
  const returnToFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      toast({
        title: t("Could not return to fullscreen", "To'liq ekranga qaytib bo'lmadi", "Не удалось вернуться в полноэкранный режим"),
        description: t(
          "Allow fullscreen for this site, then try again.",
          "Ushbu saytga to'liq ekranga ruxsat bering va qayta urinib ko'ring.",
          "Разрешите полноэкранный режим для сайта и попробуйте снова.",
        ),
        variant: "destructive",
      });
      return;
    }
    setEscapeWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreenActive(isFullscreen);
      // Only police an exit where fullscreen was genuinely entered. Without the
      // support guard a browser that never had the API could still be reported
      // as having "escaped" and get the lesson blocked.
      if (fullscreenSupported && !isFullscreen && fullscreenStarted && sessionId && !result) {
        handleEscape();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) void document.exitFullscreen?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, result, fullscreenStarted, fullscreenSupported]);

  const enterFullscreen = () => {
    // A browser with no Fullscreen API at all — iOS Safari, and most in-app
    // browsers. Blocking here made the test impossible to take rather than
    // harder to cheat at, and the button appeared to do nothing: it set
    // `started` while `active` stayed false, so the gate below never opened.
    // Proctoring that excludes whole platforms is worse than proctoring that
    // degrades, so the test runs without it and says so.
    if (!document.documentElement.requestFullscreen) {
      setFullscreenSupported(false);
      setFullscreenStarted(true);
      return;
    }
    document.documentElement.requestFullscreen()
      .then(() => {
        setFullscreenStarted(true);
        setFullscreenActive(true);
        setFullscreenRefused(false);
      })
      .catch(() => {
        // The API exists but the request was refused — a denied permission, or
        // no user gesture. Unlike the case above this is fixable by the reader,
        // so keep the gate closed and tell them precisely what to do.
        setFullscreenRefused(true);
      });
  };

  const handleEscape = useCallback(() => {
    if (!sessionId) return;
    reportEscape.mutate(
      { id },
      {
        onSuccess: (res) => {
          if (res.blocked) {
            setBlocked(true);
            setEscapeWarning(false);
          } else {
            setEscapeWarning(true);
            const secs = res.timeoutSeconds ?? 60;
            setCountdown(secs);
            countdownRef.current = setInterval(() => {
              setCountdown(c => {
                if (c <= 1) {
                  clearInterval(countdownRef.current!);
                  setEscapeWarning(false);
                  return 0;
                }
                return c - 1;
              });
            }, 1000);
          }
        },
      }
    );
  }, [sessionId, id, reportEscape]);

  // Start test on mount
  useEffect(() => {
    setLoading(true);
    startTest.mutate(
      { id },
      {
        onSuccess: (res) => {
          setSessionId(res.sessionId);
          setQuestions(normalizeArray<TestQuestion>(res.questions, ["questions", "data", "items"]));
          setAttemptsLeft(res.attemptsLeft);
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
            setLocation("/login");
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
          if (document.fullscreenElement) void document.exitFullscreen?.();
        },
        onError: () => toast({ title: t("Error submitting test", "Testni yuborishda xatolik", "Ошибка при отправке теста"), variant: "destructive" }),
      }
    );
  };

  if (blocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("Lesson Blocked", "Dars Bloklangan", "Урок заблокирован")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t("You exited fullscreen 3 times. Contact admin to unblock.", "3 marta to'liq ekrandan chiqdingiz. Blokni ochish uchun adminga murojaat qiling.", "Вы вышли из полноэкранного режима 3 раза.")}</p>
          <Button onClick={() => setLocation(`/learn/${id}`)}>
            {t("Back to Lesson", "Darsga Qaytish", "Вернуться к уроку")}
          </Button>
        </div>
      </div>
    );
  }

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
            <p className="text-sm font-semibold text-primary mb-4">+{result.pointsEarned} {t("pts", "ball", "очков")}</p>
          )}
          {!result.passed && attemptsLeft > 0 && (
            <p className="text-xs text-muted-foreground mb-4">{attemptsLeft} {t("attempts remaining", "urinish qoldi", "попыток осталось")}</p>
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

  const questionList = normalizeArray<TestQuestion>(questions, ["questions", "data", "items"]);
  const answered = Object.keys(answers).length;
  const progress = questionList.length > 0 ? (answered / questionList.length) * 100 : 0;

  // The gate only applies where fullscreen is actually available. Where it is
  // not, `fullscreenActive` can never become true and this screen would be a
  // dead end.
  if (!fullscreenStarted || (fullscreenSupported && !fullscreenActive)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card text-center max-w-sm w-full">
          <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${fullscreenRefused ? "text-destructive" : "text-primary"}`} />
          <h2 className="text-xl font-bold mb-2">
            {fullscreenRefused
              ? t("Fullscreen was blocked", "To'liq ekran bloklandi", "Полноэкранный режим заблокирован")
              : t("Fullscreen required", "To'liq ekran kerak", "Нужен полноэкранный режим")}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {fullscreenRefused
              ? t(
                  "Your browser refused the request. Allow fullscreen for this site in the address-bar permissions, then try again.",
                  "Brauzeringiz so'rovni rad etdi. Manzil qatoridagi ruxsatlardan bu saytga to'liq ekranga ruxsat bering va qayta urining.",
                  "Браузер отклонил запрос. Разрешите полноэкранный режим для сайта в настройках адресной строки и попробуйте снова.",
                )
              : t(
                  "The test runs in fullscreen so the questions stay on screen. Leaving it during the test is recorded.",
                  "Test to'liq ekranda o'tadi, shunda savollar ekrandan chiqmaydi. Test davomida undan chiqish qayd etiladi.",
                  "Тест проходит в полноэкранном режиме. Выход из него во время теста фиксируется.",
                )}
          </p>
          <Button onClick={enterFullscreen} className="w-full">
            {fullscreenRefused
              ? t("Try again", "Qayta urinish", "Попробовать снова")
              : t("Start the test", "Testni boshlash", "Начать тест")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Escape Warning */}
      {escapeWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{t("You exited fullscreen!", "To'liq ekrandan chiqdingiz!", "Вы вышли из полноэкранного режима!")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {countdown}s</span>
            {/* Only clear the warning if fullscreen actually came back.
                requestFullscreen rejects — denied permission, no user gesture —
                and this used to ignore that: the warning cleared and the
                countdown stopped either way, so a refused request left the
                candidate out of fullscreen with the enforcement switched off. */}
            <Button size="sm" variant="secondary" onClick={() => { void returnToFullscreen(); }}>
              {t("Return to Fullscreen", "Qaytish", "Вернуться")}
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 pt-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("Lesson Test", "Dars Testi", "Тест урока")}</h1>
          <span className="text-sm text-muted-foreground">{answered}/{questionList.length} {t("answered", "javob berildi", "отвечено")}</span>
        </div>
        <Progress value={progress} className="mb-8 h-1.5" />

        {/* Questions */}
        <div className="space-y-6">
          {questionList.map((q, qi) => {
            // Questions and their options are stored per language; pick the set
            // matching the UI, falling back to English when a translation is absent.
            const rawOptions = lang === "uz" && q.optionsUz ? q.optionsUz : lang === "ru" && q.optionsRu ? q.optionsRu : q.options;
            const options = normalizeArray<string>(rawOptions, ["options", "data", "items"]);
            const questionText = t(q.question, q.questionUz ?? undefined, q.questionRu ?? undefined);
            return (
            <div key={q.id} className="p-5 rounded-xl border border-border bg-card" data-testid={`card-question-${qi}`}>
              <p className="font-medium mb-4 text-sm">{qi + 1}. {questionText}</p>
              <div className="space-y-2">
                {options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      answers[q.id] === oi
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                    data-testid={`button-option-${qi}-${oi}`}
                  >
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
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
