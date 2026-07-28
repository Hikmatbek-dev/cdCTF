import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, Flag, Trophy, Target } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray } from "@/lib/api-shapes";

/**
 * What a sponsor bought, in numbers.
 *
 * A company that pays to brand an event needs something to take back to the
 * person who approved the spend. Reach (who turned up), engagement (how much
 * work they actually did) and which challenges landed are the three things that
 * answer it, so they are the three things shown — and they are aggregate, which
 * is what makes the page shareable with the sponsor as it is.
 */

type Analytics = {
  participants: number;
  teams: number;
  totalSolves: number;
  activeParticipants: number;
  pointsAwarded: number;
  challengeCount: number;
  challengesWithSolves: number;
  challenges: Array<{ id: number; name: string; category: string; solves: number }>;
  activity: Array<{ date: string; count: number }>;
};

export function SponsorReport({ competitionId, sponsorName }: { competitionId: number; sponsorName?: string | null }) {
  const { t } = useLang();

  const { data } = useQuery({
    queryKey: ["competition-analytics", competitionId],
    queryFn: async () => {
      const r = await fetch(`/api/competitions/${competitionId}/analytics`);
      if (!r.ok) throw new Error("analytics");
      return r.json() as Promise<Analytics>;
    },
    enabled: competitionId > 0,
  });

  if (!data) return null;

  const challenges = normalizeArray<Analytics["challenges"][number]>(data.challenges, ["challenges", "data", "items"]);
  const activity = normalizeArray<Analytics["activity"][number]>(data.activity, ["activity", "data", "items"]);
  const peak = Math.max(1, ...activity.map(a => a.count));

  // Engagement, not attendance: the share of people who joined and then did
  // something. A sponsor cares about the second number, not the first.
  const engagement = data.participants > 0
    ? Math.round((data.activeParticipants / data.participants) * 100)
    : 0;

  const stats = [
    { icon: Users, value: data.participants, label: t("Participants", "Qatnashchilar", "Участников") },
    { icon: Target, value: data.activeParticipants, label: t("Actively solved", "Faol yechganlar", "Активно решали"), note: `${engagement}%` },
    { icon: Flag, value: data.totalSolves, label: t("Total solves", "Jami yechimlar", "Всего решений") },
    { icon: Trophy, value: data.teams, label: t("Teams", "Jamoalar", "Команд") },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-8" data-testid="sponsor-report">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold">{t("Event report", "Tadbir hisoboti", "Отчёт по событию")}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        {sponsorName
          ? t(`Reach and engagement for ${sponsorName}`, `${sponsorName} uchun qamrov va faollik`, `Охват и вовлечённость для ${sponsorName}`)
          : t("Reach and engagement for this event", "Bu tadbir bo'yicha qamrov va faollik", "Охват и вовлечённость по этому событию")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <div className="text-2xl font-bold tabular-nums leading-none">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {s.label}{s.note ? ` · ${s.note}` : ""}
            </div>
          </div>
        ))}
      </div>

      {activity.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-muted-foreground mb-2">
            {t("Solves per day", "Kunlik yechimlar", "Решений в день")}
          </div>
          {/* A bar per day. Enough to show whether the event held attention or
              spiked once and died — which is the question a sponsor asks. */}
          <div className="flex items-end gap-1 h-16">
            {activity.map(a => (
              <div key={a.date} className="flex-1 min-w-[3px] group relative" title={`${a.date}: ${a.count}`}>
                <div
                  className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-colors"
                  style={{ height: `${Math.max(4, (a.count / peak) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground mb-2">
          {t("Challenges by solves", "Topshiriqlar yechimlar bo'yicha", "Задания по числу решений")}
          {" · "}
          <span className="tabular-nums">{data.challengesWithSolves}/{data.challengeCount}</span>
          {" "}{t("were solved at least once", "kamida bir marta yechilgan", "решены хотя бы раз")}
        </div>
        <div className="space-y-1.5">
          {challenges.slice(0, 6).map(c => (
            <div key={c.id} className="flex items-center gap-3 text-sm">
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.category}</span>
              <span className="tabular-nums font-semibold w-8 text-right">{c.solves}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
