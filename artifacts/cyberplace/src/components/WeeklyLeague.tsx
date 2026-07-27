import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";

/**
 * This week's league standing.
 *
 * A lifetime point total barely moves once a learner has a few hundred — it
 * stops being feedback. A weekly board resets often enough that a single
 * evening's work visibly changes your position, which is the part that brings
 * someone back on a Tuesday.
 *
 * The standing is computed from timestamps on the server, so there is no reset
 * job to miss and nothing to drift.
 */

type Entry = { userId: number; nickname: string; points: number; rank: number; league: string };
type Weekly = { entries: Entry[]; total: number; me: (Partial<Entry> & { points: number; league: string }) | null };

const TIER: Record<string, { label: [string, string, string]; ring: string; text: string; bg: string }> = {
  bronze:   { label: ["Bronze", "Bronza", "Бронза"],   ring: "ring-amber-700/40",  text: "text-amber-600 dark:text-amber-500",   bg: "bg-amber-700/10" },
  silver:   { label: ["Silver", "Kumush", "Серебро"],  ring: "ring-slate-400/40",  text: "text-slate-500 dark:text-slate-300",   bg: "bg-slate-400/10" },
  gold:     { label: ["Gold", "Oltin", "Золото"],      ring: "ring-yellow-500/40", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  platinum: { label: ["Platinum", "Platina", "Платина"], ring: "ring-cyan-400/40", text: "text-cyan-600 dark:text-cyan-400",     bg: "bg-cyan-500/10" },
};

export function WeeklyLeague() {
  const { t, lang } = useLang();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["weekly-league"],
    queryFn: async () => {
      const r = await fetch("/api/scoreboard/weekly?limit=5");
      if (!r.ok) throw new Error("weekly");
      return r.json() as Promise<Weekly>;
    },
  });

  const entries = normalizeArray<Entry>(data?.entries, ["entries", "data", "items"]);
  const me = data?.me ?? null;
  const tier = TIER[me?.league ?? "bronze"] ?? TIER.bronze;
  const tierLabel = tier.label[lang === "uz" ? 1 : lang === "ru" ? 2 : 0];

  return (
    <div className="glass-card !p-6 mb-10" data-testid="weekly-league">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ring-2 ${tier.ring} ${tier.bg} shrink-0`}>
            <Trophy className={`w-6 h-6 ${tier.text}`} />
          </div>
          <div>
            <div className="eyebrow mb-1">{t("This week", "Shu hafta", "На этой неделе")}</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold ${tier.text}`}>{tierLabel}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {me?.points ?? 0} {t("pts", "ball", "очк")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {me?.rank
                ? t(`You are #${me.rank} of ${data?.total ?? 0} this week`,
                     `Bu hafta ${data?.total ?? 0} kishidan #${me.rank}-o'rindasiz`,
                     `Вы #${me.rank} из ${data?.total ?? 0} на этой неделе`)
                : t("Solve a challenge or finish a lesson to enter this week's board.",
                     "Bu haftalik reytingga kirish uchun topshiriq yeching yoki dars tugating.",
                     "Решите задание или пройдите урок, чтобы попасть в недельный рейтинг.")}
            </p>
          </div>
        </div>
        <Link href="/scoreboard" className="text-xs text-primary hover:text-accent inline-flex items-center gap-1 shrink-0">
          {t("All time", "Umumiy", "За всё время")} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map(e => {
            const isMe = user?.id === e.userId;
            return (
              <Link href={`/profile/${e.userId}`} key={e.userId}>
                <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30"
                }`}>
                  <span className="w-5 font-mono text-xs text-muted-foreground tabular-nums">{e.rank}</span>
                  <span className="flex-1 truncate font-medium">{e.nickname}</span>
                  <span className="tabular-nums font-semibold text-primary">{e.points}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
