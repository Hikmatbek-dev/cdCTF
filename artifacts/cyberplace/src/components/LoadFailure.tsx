import { Link } from "wouter";
import { RotateCcw, WifiOff } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * "The request failed" — said out loud, with a way out.
 *
 * Of 34 pages, five handled a failed request. The rest either rendered their
 * empty state ("No modules yet", "No candidates", "No challenges match") or
 * nothing at all, so a dropped connection was indistinguishable from a platform
 * with no content on it — and both readings lose the visitor. Two pages were
 * worse: the dashboard returned null, and onboarding step three sat on a
 * skeleton for ever.
 *
 * These learners are on mobile networks where a failed fetch is not an edge
 * case. Every one of those states now says what happened and offers a retry.
 */
/**
 * True when the server answered "this does not exist", as opposed to not
 * answering at all.
 *
 * The distinction is the whole point: telling someone their module does not
 * exist because their phone lost signal is both wrong and a dead end. The
 * generated client attaches the HTTP status to the thrown error.
 */
export function isNotFound(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 404 || status === 400;
}

export function LoadFailure({
  onRetry,
  title,
  hint,
  backHref,
  backLabel,
  testId = "load-failure",
}: {
  /** Refetch. Omit only when the caller genuinely cannot retry. */
  onRetry?: () => void;
  title?: string;
  hint?: string;
  backHref?: string;
  backLabel?: string;
  testId?: string;
}) {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-8 text-center" data-testid={testId}>
      <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
        <WifiOff className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="font-semibold mb-1.5">
        {title ?? t("Could not load this", "Buni yuklab bo'lmadi", "Не удалось загрузить")}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {hint ?? t(
          "The connection dropped, or the server did not answer. Nothing is lost — try again.",
          "Aloqa uzildi yoki server javob bermadi. Hech nima yo'qolmadi — qayta urinib ko'ring.",
          "Соединение прервалось или сервер не ответил. Ничего не потеряно — попробуйте снова.",
        )}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="cyber-button h-11 px-6" data-testid={`${testId}-retry`}>
            <RotateCcw className="w-4 h-4" />
            {t("Try again", "Qayta urinish", "Попробовать снова")}
          </button>
        )}
        {backHref && (
          <Link href={backHref}>
            <button className="cyber-button-outline h-11 px-6">
              {backLabel ?? t("Go back", "Orqaga", "Назад")}
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
