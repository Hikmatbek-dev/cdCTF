import { useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Flag, Lightbulb, Target } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { scenarioFor } from "@workspace/lab-scenarios";

/** Where the API serves the vulnerable document, under its own policy. */
export function targetUrl(slug: string) {
  return `/api/labs/target/${encodeURIComponent(slug)}`;
}

/**
 * What a lab is, before you commit to it.
 *
 * The page used to go straight from a one-line blurb to a full-width embedded
 * target — you found out what the exercise was by being dropped into it. This
 * is the step in between: the task in full, the hint on request, and where the
 * flag goes.
 *
 * The target itself opens in its own tab rather than an iframe here. It is
 * served from /api/labs/target/:slug under `sandbox allow-scripts`, so it sits
 * in an opaque origin either way — and a top-level document is what devtools
 * are actually usable against, which is most of what a learner needs while
 * attacking one.
 */
export function LabBrief({ scenarioSlug, ctfId }: { scenarioSlug: string; ctfId: number | null }) {
  const { t, lang } = useLang();
  const [showHint, setShowHint] = useState(false);
  const scenario = scenarioFor(scenarioSlug);

  if (!scenario) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        {t("This lab's scenario is missing. Please report it.",
           "Bu laboratoriyaning stsenariysi topilmadi. Iltimos, xabar bering.",
           "Сценарий этой лаборатории не найден. Сообщите нам, пожалуйста.")}
      </div>
    );
  }

  const pick = (v: { en: string; uz: string; ru: string }) => (lang === "uz" ? v.uz : lang === "ru" ? v.ru : v.en);

  return (
    <div className="mt-4 rounded-xl border border-border bg-background/40 p-4" data-testid={`lab-brief-${scenarioSlug}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Target className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("Your task", "Sizning vazifangiz", "Ваша задача")}
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{pick(scenario.brief)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          onClick={() => setShowHint(v => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium hover:border-primary/40 transition-colors"
          data-testid={`lab-hint-${scenarioSlug}`}
        >
          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
          {showHint ? t("Hide the hint", "Maslahatni yashirish", "Скрыть подсказку")
                    : t("Show a hint", "Maslahat", "Подсказка")}
        </button>
        {ctfId && (
          <Link
            href={`/ctf/${ctfId}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium hover:border-primary/40 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" aria-hidden="true" />
            {t("Submit the flag", "Flagni topshirish", "Отправить флаг")}
          </Link>
        )}
        <a
          href={targetUrl(scenario.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          data-testid={`lab-reopen-${scenarioSlug}`}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          {t("Reopen the target", "Nishonni qayta ochish", "Открыть цель снова")}
        </a>
      </div>

      {showHint && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm leading-relaxed" data-testid={`lab-hint-text-${scenarioSlug}`}>
          {pick(scenario.hint)}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {t("The target opens in its own tab, isolated from cdCTF and from the internet. Attack it freely.",
           "Nishon alohida oynada ochiladi — cdCTF'dan va internetdan ajratilgan. Bemalol hujum qiling.",
           "Цель откроется в отдельной вкладке, изолированно от cdCTF и от интернета. Атакуйте свободно.")}
      </p>
    </div>
  );
}
