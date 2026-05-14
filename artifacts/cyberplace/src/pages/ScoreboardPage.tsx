import { Link } from "wouter";
import { Trophy, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard, getGetScoreboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";

export default function ScoreboardPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const { data, isLoading } = useGetScoreboard({ limit: 100 }, {
    query: { queryKey: getGetScoreboardQueryKey({ limit: 100 }), refetchInterval: 30000 },
  });
  const entries = normalizeArray<any>(data?.entries, ["entries", "data", "items"]);
  const total = typeof data?.total === "number" ? data.total : entries.length;

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-16">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">{t("Global Ranking", "Reyting", "Рейтинг")}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{data ? `${total} ACTIVE OPERATIVES DETECTED` : "INITIALIZING STREAMS..."}</p>
            </div>
          </div>
        </div>

        {/* User Stats Card */}
        {data?.currentUserRank && (
          <div className="mb-12 bg-primary text-primary-foreground p-10 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-primary/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Shield className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{t("YOUR_CURRENT_POSITION", "SIZNING JOYINGIZ", "ВАША_ПОЗИЦИЯ")}</p>
              <h2 className="text-5xl font-black tracking-tighter">RANK #{data.currentUserRank}</h2>
            </div>
            <div className="text-right relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{t("TOTAL_XP", "UMUMIY XP", "ОБЩИЙ_XP")}</p>
              <div className="text-4xl font-black tracking-tighter">{user?.points ?? 0}</div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-20 bg-muted rounded-2xl" />)}
          </div>
        ) : (
          <div className="glass-card p-0 rounded-[2.5rem] overflow-hidden border-border bg-muted/10">
            {entries.map((entry, i) => {
              const isMe = user?.id === entry.userId;
              const rank = entry.rank;
              const titles = normalizeArray<string>(entry.titles, ["titles", "data", "items"]);
              
              const isTop3 = rank <= 3;
              const rankColor = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-600" : "text-muted-foreground/40";

              return (
                <Link href={`/profile/${entry.userId}`} key={entry.userId}>
                  <div
                    className={`group flex items-center gap-6 p-6 transition-all cursor-pointer border-b border-border last:border-0 hover:bg-muted ${
                      isMe ? "bg-primary/5" : ""
                    }`}
                    data-testid={`row-scoreboard-${entry.userId}`}
                  >
                    <div className={`w-12 text-center text-3xl font-black ${rankColor}`}>
                      {String(rank).padStart(2, '0')}
                    </div>
                    
                    <div className="w-12 h-12 bg-muted border border-border rounded-xl flex items-center justify-center text-lg font-black text-primary shrink-0 group-hover:scale-110 transition-transform overflow-hidden shadow-sm">
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt={entry.nickname} className="w-full h-full object-cover" />
                      ) : <span>{entry.nickname[0].toUpperCase()}</span>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4">
                        <span className="font-black text-lg tracking-tight uppercase group-hover:text-primary transition-colors" data-testid={`text-nickname-${entry.userId}`}>
                          {entry.nickname}
                        </span>
                        {isMe && <span className="text-[8px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded">YOU</span>}
                      </div>
                      <div className="flex gap-2 mt-2 overflow-hidden">
                        {titles.slice(0, 1).map(title => (
                          <span key={title} className="text-[8px] font-black uppercase tracking-widest text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded transition-colors group-hover:border-primary/20">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-foreground leading-none" data-testid={`text-points-${entry.userId}`}>{entry.points}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">
                        {entry.solvedCtfCount} SOLVES
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
