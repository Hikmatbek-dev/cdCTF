import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, LoaderCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/LanguageContext";

/**
 * The page every registered account lands on, from the link in the
 * verification email.
 *
 * It was written entirely in English — heading, status line and button — on a
 * platform whose default language is Uzbek. It is also the moment a new learner
 * decides whether this is a real product, so it now says what to do next rather
 * than only "go to login".
 */
type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  /** Set only when the server explains a failure we cannot phrase ourselves. */
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "");
        }
        setStatus("success");
      })
      .catch((error: Error) => {
        setStatus("error");
        setServerError(error.message);
      });
  }, []);

  const heading = status === "success"
    ? t("Your email is verified", "Emailingiz tasdiqlandi", "Ваша почта подтверждена")
    : status === "error"
    ? t("We could not verify this link", "Bu havolani tasdiqlab bo'lmadi", "Не удалось подтвердить ссылку")
    : t("Verifying your email…", "Email tekshirilmoqda…", "Проверяем почту…");

  const body = status === "success"
    ? t("You can sign in now — and your progress will be saved from here on.",
        "Endi tizimga kirishingiz mumkin — bundan buyon progressingiz saqlanadi.",
        "Теперь можно войти — с этого момента прогресс сохраняется.")
    : status === "error"
    ? t("The link may have expired or already been used. Ask for a new one and it will arrive in a moment.",
        "Havolaning muddati o'tgan yoki allaqachon ishlatilgan bo'lishi mumkin. Yangisini so'rang — bir zumda keladi.",
        "Ссылка могла истечь или быть уже использована. Запросите новую — она придёт сразу.")
    : t("This takes a second.", "Bu bir soniya oladi.", "Это займёт секунду.");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background pt-14">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <div className="mb-4 flex justify-center">
          {status === "loading" && <LoaderCircle className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />}
          {status === "success" && <CheckCircle2 className="w-8 h-8 text-primary" aria-hidden="true" />}
          {status === "error" && <ShieldAlert className="w-8 h-8 text-destructive" aria-hidden="true" />}
        </div>
        <h1 className="text-xl font-bold mb-2" data-testid="verify-email-heading">{heading}</h1>
        <p className="text-sm text-muted-foreground mb-5">{body}</p>

        {/* The raw server reason, kept but demoted: it is English and technical,
            so it sits under the explanation rather than replacing it. */}
        {status === "error" && serverError && (
          <p className="text-xs text-muted-foreground/70 mb-5 font-mono">{serverError}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {status === "success" ? (
            <>
              <Button onClick={() => setLocation("/login")} data-testid="verify-email-login">
                {t("Sign in", "Kirish", "Войти")} <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setLocation("/start")}>
                {t("Find my first lesson", "Birinchi darsimni topish", "Найти мой первый урок")}
              </Button>
            </>
          ) : status === "error" ? (
            <>
              <Button onClick={() => setLocation("/resend-verification")} data-testid="verify-email-resend">
                {t("Send a new link", "Yangi havola yuborish", "Отправить новую ссылку")}
              </Button>
              <Button variant="outline" onClick={() => setLocation("/login")}>
                {t("Go to sign in", "Kirish sahifasiga", "На страницу входа")}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
