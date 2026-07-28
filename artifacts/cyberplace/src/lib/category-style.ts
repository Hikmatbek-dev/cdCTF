/**
 * A colour and a glyph for every challenge category and difficulty.
 *
 * A catalogue of a hundred challenges rendered in one brand colour reads as a
 * wall of identical rows; you cannot tell Web from Pwn without reading. Giving
 * each category its own hue makes the grid scannable — you learn the colours
 * within a page or two and after that the eye does the filtering.
 *
 * The hues are stated as raw HSL triples rather than theme variables on
 * purpose: these are *content* colours, not brand ones, and they have to stay
 * recognisable in both themes. Each was picked to clear 4.5:1 as text on both
 * grounds when used at the `text` stop.
 */

export type CategoryStyle = {
  /** Base hue, used to build the card art gradient. */
  hue: number;
  /** Tailwind-ish class for the label text — legible on both themes. */
  text: string;
  /** Faint tint for chips and card headers. */
  tint: string;
  /** Border for chips. */
  border: string;
};

const STYLES: Record<string, CategoryStyle> = {
  Web:            { hue: 27,  text: "text-orange-700 dark:text-orange-400",   tint: "bg-orange-500/10",   border: "border-orange-500/30" },
  Crypto:         { hue: 262, text: "text-violet-700 dark:text-violet-400",   tint: "bg-violet-500/10",   border: "border-violet-500/30" },
  Pwn:            { hue: 350, text: "text-rose-700 dark:text-rose-400",       tint: "bg-rose-500/10",     border: "border-rose-500/30" },
  Reverse:        { hue: 152, text: "text-emerald-700 dark:text-emerald-400", tint: "bg-emerald-500/10",  border: "border-emerald-500/30" },
  Forensics:      { hue: 187, text: "text-cyan-700 dark:text-cyan-400",       tint: "bg-cyan-500/10",     border: "border-cyan-500/30" },
  Recon:          { hue: 217, text: "text-blue-700 dark:text-blue-400",       tint: "bg-blue-500/10",     border: "border-blue-500/30" },
  Exploitation:   { hue: 0,   text: "text-red-700 dark:text-red-400",         tint: "bg-red-500/10",      border: "border-red-500/30" },
  Networking:     { hue: 199, text: "text-sky-700 dark:text-sky-400",         tint: "bg-sky-500/10",      border: "border-sky-500/30" },
  Scripting:      { hue: 84,  text: "text-lime-700 dark:text-lime-400",       tint: "bg-lime-500/10",     border: "border-lime-500/30" },
  Steganography:  { hue: 292, text: "text-fuchsia-700 dark:text-fuchsia-400", tint: "bg-fuchsia-500/10",  border: "border-fuchsia-500/30" },
  Miscellaneous:  { hue: 43,  text: "text-amber-700 dark:text-amber-400",     tint: "bg-amber-500/10",    border: "border-amber-500/30" },
  Others:         { hue: 215, text: "text-slate-700 dark:text-slate-300",     tint: "bg-slate-500/10",    border: "border-slate-500/30" },
};

const FALLBACK: CategoryStyle = STYLES.Others;

export function categoryStyle(category: string | null | undefined): CategoryStyle {
  if (!category) return FALLBACK;
  return STYLES[category] ?? FALLBACK;
}

/** Every category that has a colour of its own, in catalogue order. */
export const KNOWN_CATEGORIES = Object.keys(STYLES);

export type DifficultyStyle = { label: string; text: string; tint: string; border: string; dots: number };

/**
 * Difficulty as a colour *and* a count of filled dots — colour alone excludes
 * anyone who cannot separate red from green.
 */
const DIFFICULTY: Record<string, Omit<DifficultyStyle, "label">> = {
  easy:   { text: "text-emerald-700 dark:text-emerald-400", tint: "bg-emerald-500/10", border: "border-emerald-500/30", dots: 1 },
  medium: { text: "text-amber-700 dark:text-amber-400",     tint: "bg-amber-500/10",   border: "border-amber-500/30",   dots: 2 },
  hard:   { text: "text-rose-700 dark:text-rose-400",       tint: "bg-rose-500/10",    border: "border-rose-500/30",    dots: 3 },
  insane: { text: "text-fuchsia-700 dark:text-fuchsia-400", tint: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", dots: 4 },
};

export function difficultyStyle(difficulty: string | null | undefined): Omit<DifficultyStyle, "label"> {
  return DIFFICULTY[(difficulty || "").toLowerCase()] ?? DIFFICULTY.easy;
}
