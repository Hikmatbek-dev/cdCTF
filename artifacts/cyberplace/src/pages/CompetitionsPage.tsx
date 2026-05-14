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
    <div className="min-h-screen bg-background pt-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
            <Trophy className="w-7 h-7 text-primary animate-glow" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black tracking-tighter uppercase">{t("Global Tournaments", "Musobaqalar", "Соревнования")}</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t("BATTLE FOR SUPREMACY AND EXCLUSIVE REWARDS", "OYLIK MUSOBAQALARDA QATNASHING", "СОРЕВНУЙТЕСЬ ЗА ПРЕВОСХОДСТВО")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[2.5rem] bg-white/5" />)}
          </div>
        ) : competitionList.length === 0 ? (
          <div className="glass-card rounded-[2.5rem] py-24 text-center border-white/5">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2 uppercase tracking-widest">{t("NO TOURNAMENTS SCHEDULED", "MUSOBAQALAR YO'Q", "НЕТ ТУРНИРОВ")}</h3>
            <p className="text-sm text-muted-foreground">{t("Check back later for upcoming elite events.", "Yangi musobaqalarni kuting.", "Следите за новыми событиями.")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {competitionList.map(comp => (
              <Link href={`/competitions/${comp.id}`} key={comp.id}>
                <div
                  className="group relative p-8 rounded-[2.5rem] glass-card border-white/5 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
                  data-testid={`card-competition-${comp.id}`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex flex-wrap items-center gap-3 mb-6 relative z-10">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                      comp.status === "active" ? "bg-primary/20 text-primary border-primary/30 neon-text" : "bg-white/5 text-muted-foreground border-white/10"
                    }`}>
                      {comp.status}
                    </span>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                      comp.type === "private" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-white/5 text-muted-foreground border-white/10"
                    }`}>
                      {comp.type === "private" && <Lock className="w-3 h-3" />}
                      {comp.type === "public" ? t("Public Access", "Ochiq", "Публичный") : t("Classified", "Yopiq", "Приватный")}
                    </span>
                    {comp.isJoined && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">{t("MISSION ACCEPTED", "QATNASHYAPSIZ", "ВЫ УЧАСТВУЕТЕ")}</span>
                    )}
                  </div>

                  <h3 className="text-2xl font-display font-black mb-3 tracking-tight group-hover:text-primary transition-colors" data-testid={`text-competition-name-${comp.id}`}>{comp.name}</h3>
                  {comp.description && (
                    <p className="text-sm text-muted-foreground font-medium mb-8 line-clamp-2 max-w-2xl">{comp.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Timeframe</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Clock className="w-3 h-3 text-primary" />
                          {formatDate(comp.startTime)} <span className="text-muted-foreground/40">—</span> {formatDate(comp.endTime)}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Operatives</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Users className="w-3 h-3 text-primary" />
                          {comp.participantCount} {t("ENGAGED", "QATNASHCHI", "УЧАСТНИКОВ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Assets</span>
                      <div className="text-sm font-black text-primary">{comp.ctfCount} TARGETS</div>
                    </div>
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
