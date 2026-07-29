import { useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Flag, Lightbulb, Target } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { metaFor } from "@workspace/lab-scenarios/meta";

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
 *
 * `targetPath` comes from the API and is null unless *this* lab is running for
 * *this* learner. It used to be built here from the slug, which meant the
 * reopen link was a permanent, unauthenticated door into the target: it
 * rendered for signed-out visitors, on labs nobody had started, and the window
 * it opened was never one LabsPage could close again.
 *
 * This module deliberately imports @workspace/lab-scenarios/meta and not the
 * package root. The root holds the documents, the flags and the checks; it is
 * server-only, and importing it here is what once shipped all five flags in a
 * public JS chunk.
 */
export function LabBrief({
  scenarioSlug,
  ctfId,
  targetPath,
}: {
  scenarioSlug: string;
  ctfId: number | null;
  targetPath: string | null;
}) {
  const { t, lang } = useLang();
  const [showHint, setShowHint] = useState(false);
  const scenario = metaFor(scenarioSlug);

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
        {targetPath && (
          <a
            href={targetPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            data-testid={`lab-reopen-${scenarioSlug}`}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            {t("Reopen the target", "Nishonni qayta ochish", "Открыть цель снова")}
          </a>
        )}
      </div>

      {showHint && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm leading-relaxed" data-testid={`lab-hint-text-${scenarioSlug}`}>
          {pick(scenario.hint)}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {t("The target opens in its own tab, isolated from cdCTF and from the internet. Attack it freely — it stops answering the moment you stop the lab or the clock runs out.",
           "Nishon alohida oynada ochiladi — cdCTF'dan va internetdan ajratilgan. Bemalol hujum qiling: laboratoriyani to'xtatsangiz yoki vaqt tugasa, u javob berishni to'xtatadi.",
           "Цель откроется в отдельной вкладке, изолированно от cdCTF и от интернета. Атакуйте свободно — она перестанет отвечать, как только вы остановите лабораторию или выйдет время.")}
      </p>
    </div>
  );
}
