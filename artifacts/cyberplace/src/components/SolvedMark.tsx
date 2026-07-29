import { CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * One "solved" language, shared by every surface a challenge appears on.
 *
 * The challenge list had a careful four-cue treatment (a neon border, a left
 * rail, an icon+text badge, and drained cover art), but the module detail page
 * signalled the same state with `border-emerald-500/40` and nothing else — a
 * colour-only cue, in a *different* green than the rest of the product's
 * `--neon`. Two "solved" colours in one app. These helpers are the single
 * source: import them wherever a solved/unsolved challenge renders.
 */

/** Border + ring for a card, keyed on solved. Neon when solved, hover-primary otherwise. */
export function solvedCardBorder(solved: boolean): string {
  return solved
    ? "border-[hsl(var(--neon)/.5)] shadow-[0_0_0_1px_hsl(var(--neon)/.12)]"
    : "border-border hover:border-primary/40";
}

/** The badge itself — icon + word, in the success register. */
export function SolvedBadge({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--neon))] ${className}`}>
      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
      {t("Solved", "Yechilgan", "Решено")}
    </span>
  );
}
