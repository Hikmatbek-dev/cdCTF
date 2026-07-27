import { difficultyStyle } from "@/lib/category-style";
import { useLang } from "@/lib/LanguageContext";

interface DifficultyBadgeProps {
  difficulty: string;
  className?: string;
}

/**
 * Difficulty as a translated word, a colour, and a count of filled dots.
 *
 * It used to be colour alone, and the raw English enum — so `hard` read as
 * "hard" in every language, and green/yellow/orange/red was the only signal for
 * how hard a challenge is. `difficultyStyle` has carried a `dots` count for
 * exactly this reason since the colour system was built; the challenge grid
 * used it and this badge, used in four other places, did not.
 */
export function DifficultyBadge({ difficulty, className = "" }: DifficultyBadgeProps) {
  const { t } = useLang();
  const key = (difficulty || "").toLowerCase();
  const s = difficultyStyle(key);

  const label = key === "insane"
    ? t("Insane", "Juda og'ir", "Безумно")
    : key === "hard"
    ? t("Hard", "Qiyin", "Сложно")
    : key === "medium"
    ? t("Medium", "O'rta", "Средне")
    : t("Easy", "Oson", "Легко");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${s.text} ${s.tint} ${s.border} ${className}`}
      title={label}
    >
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            className={`w-1 h-1 rounded-full ${i < s.dots ? "bg-current" : "bg-current opacity-25"}`}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
