import { Link } from "wouter";
import { Trophy, Clock, Users, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { normalizeCompetitions } from "@/lib/api-shapes";
import { useListCompetitions, getListCompetitionsQueryKey } from "@workspace/api-client-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    ended: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium capitalize ${styles[status] ?? styles.ended}`}>
      {status}
    </span>
  );
}

export default function CompetitionsPage() {
  const { t } = useLang();
  const { data: competitions, isLoading } = useListCompetitions({
    query: { queryKey: getListCompetitionsQueryKey() },
  });
  const competitionList = normalizeCompetitions(competitions);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("Competitions", "Musobaqalar", "Соревнования")}</h1>
            <p className="text-sm text-muted-foreground">{t("Compete monthly for prizes and certificates.", "Oylik musobaqalarda qatnashing.", "Соревнуйтесь ежемесячно.")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : competitionList.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("No competitions yet", "Musobaqalar yo'q", "Нет соревнований")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitionList.map(comp => (
              <Link href={`/competitions/${comp.id}`} key={comp.id}>
                <div
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer group"
                  data-testid={`card-competition-${comp.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={comp.status} />
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${
                        comp.type === "private"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {comp.type === "private" && <Lock className="w-2.5 h-2.5" />}
                        {comp.type === "public" ? t("Public", "Ochiq", "Публичный") : t("Private", "Yopiq", "Приватный")}
                      </span>
                      {comp.isJoined && (
                        <span className="text-xs text-primary font-medium">{t("Joined", "Qatnashyapsiz", "Участвуете")}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{comp.ctfCount} CTFs</span>
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors" data-testid={`text-competition-name-${comp.id}`}>{comp.name}</h3>
                  {comp.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{comp.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(comp.startTime)} — {formatDate(comp.endTime)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {comp.participantCount} {t("participants", "qatnashchi", "участников")}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
