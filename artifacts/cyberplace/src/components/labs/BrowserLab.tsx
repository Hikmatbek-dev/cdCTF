import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Maximize2, RotateCcw, Target, Terminal, X } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { scenarioFor } from "./scenarios";

/**
 * Runs one browser lab.
 *
 * The scenario document goes into an iframe with `sandbox="allow-scripts"` and
 * deliberately WITHOUT `allow-same-origin`. That combination puts the frame in
 * an opaque origin: its scripts run — they have to, the vulnerability is the
 * lesson — but they cannot read this page's DOM, cookies or storage, and they
 * cannot reach the API with the learner's session. The code inside is unsafe on
 * purpose; the sandbox is what makes that safe to ship.
 *
 * One consequence worth knowing: an opaque origin has no cookie jar of its own
 * in some browsers, so the cookie scenario carries its own fallback rather than
 * assuming document.cookie sticks.
 */
export function BrowserLab({
  scenarioSlug,
  onClose,
}: {
  scenarioSlug: string;
  onClose?: () => void;
}) {
  const { t, lang } = useLang();
  const scenario = useMemo(() => scenarioFor(scenarioSlug), [scenarioSlug]);
  const [showHint, setShowHint] = useState(false);
  /** Bumping this remounts the iframe, which is how the target is reset. */
  const [round, setRound] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Esc closes the lab — a full-width target with no visible chrome is easy to
  // feel trapped in.
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!scenario) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        {t("This lab's scenario is missing. Please report it.",
           "Bu laboratoriyaning stsenariysi topilmadi. Iltimos, xabar bering.",
           "Сценарий этой лаборатории не найден. Сообщите нам, пожалуйста.")}
      </div>
    );
  }

  const pick = (v: { en: string; uz: string; ru: string }) => (lang === "uz" ? v.uz : lang === "ru" ? v.ru : v.en);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" data-testid="browser-lab">
      {/* Brief */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">
                {t("Your task", "Sizning vazifangiz", "Ваша задача")}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{pick(scenario.brief)}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
              aria-label={t("Close the lab", "Laboratoriyani yopish", "Закрыть лабораторию")}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setShowHint(v => !v)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium hover:border-primary/40 transition-colors"
            data-testid="browser-lab-hint"
          >
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
            {showHint ? t("Hide the hint", "Maslahatni yashirish", "Скрыть подсказку")
                      : t("Show a hint", "Maslahat", "Подсказка")}
          </button>
          <button
            onClick={() => setRound(r => r + 1)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium hover:border-primary/40 transition-colors"
            data-testid="browser-lab-reset"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            {t("Reset the target", "Nishonni tiklash", "Сбросить цель")}
          </button>
          <button
            onClick={() => frameRef.current?.requestFullscreen?.()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium hover:border-primary/40 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            {t("Full screen", "To'liq ekran", "Во весь экран")}
          </button>
        </div>

        {showHint && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed" data-testid="browser-lab-hint-text">
            {pick(scenario.hint)}
          </div>
        )}
      </div>

      {/* The target itself */}
      <div className="bg-[#f4f5f7]">
        <iframe
          key={round}
          ref={frameRef}
          title={t("Vulnerable target", "Zaif nishon", "Уязвимая цель")}
          srcDoc={scenario.html}
          // allow-scripts WITHOUT allow-same-origin. See the file comment.
          sandbox="allow-scripts allow-forms"
          referrerPolicy="no-referrer"
          className="w-full border-0 block"
          style={{ height: "560px" }}
          data-testid="browser-lab-frame"
        />
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
        <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {t("This target runs in your own browser, isolated from cdCTF and from the internet. Attack it freely.",
           "Bu nishon sizning brauzeringizda, cdCTF'dan va internetdan ajratilgan holda ishlaydi. Bemalol hujum qiling.",
           "Цель работает в вашем браузере, изолированно от cdCTF и от интернета. Атакуйте свободно.")}
      </div>
    </div>
  );
}
