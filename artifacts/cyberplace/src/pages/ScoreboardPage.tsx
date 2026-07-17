import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, Shield, Search, Zap, Star, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard, getGetScoreboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, ScaleIn } from "@/components/PageTransition";

export default function ScoreboardPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = { 
    page, 
    limit: 25, 
    search: debouncedSearch 
  };

  const { data, isLoading } = useGetScoreboard(queryParams, {
    query: { queryKey: getGetScoreboardQueryKey(queryParams), refetchInterval: 30000 },
  }) as any;

  const entries = normalizeArray<any>(data?.entries, ["entries", "data", "items"]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full opacity-30" />
        <div className="absolute bottom-[15%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full opacity-30" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-20">
          <FadeIn>
            <div className="flex items-center gap-8 mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 border border-foreground/10 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/10 backdrop-blur-md animate-float">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-4">{t("LEADERBOARD", "REYTING", "РЕЙТИНГ")}</h1>
                <div className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">
                    {isLoading ? "SYNCHRONIZING_GLOBAL_STREAMS..." : `${total} ACTIVE_OPERATIVES_DETECTED`}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" aria-hidden="true" />
              {/* A placeholder is not a label: it vanishes as soon as you type,
                  and screen readers are not required to announce it. */}
              <input
                type="search"
                aria-label={t("Search users", "Foydalanuvchilarni qidirish", "Поиск пользователей")}
                placeholder={t("QUERY_OPERATIVE_ID...", "FOYDALANUVCHILARNI QIDIRING...", "ПОИСК_ОПЕРАТИВНИКОВ...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-20 pl-16 pr-8 bg-foreground/5 border border-foreground/5 rounded-[2rem] font-bold uppercase tracking-[0.2em] focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all text-sm placeholder:text-muted-foreground/20"
              />
            </div>
          </FadeIn>
        </div>

        {/* User Stats Card */}
        {data?.currentUserRank && !debouncedSearch && page === 1 && (
          <FadeIn delay={0.2}>
            <div className="mb-20 glass-card bg-primary/10 p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between border-primary/20 shadow-2xl shadow-primary/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                <Shield className="w-80 h-80 text-primary" />
              </div>
              <div className="relative z-10 text-center md:text-left mb-8 md:mb-0">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4">{t("YOUR_OPERATIVE_STATUS", "SIZNING JOYINGIZ", "ВАША_ПОЗИЦИЯ")}</p>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter gradient-text">#{data.currentUserRank}</h2>
              </div>
              <div className="text-center md:text-right relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4">{t("TOTAL_XP_ACCUMULATED", "UMUMIY XP", "ОБЩИЙ_XP")}</p>
                <div className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums">{user?.points ?? 0}</div>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Leaderboard Table */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 bg-foreground/5 rounded-[2rem]" />)}
            </motion.div>
          ) : entries.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card py-40 text-center rounded-[3rem] border-foreground/5"
            >
               <div className="w-20 h-20 bg-foreground/5 border border-foreground/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Target className="w-10 h-10 text-muted-foreground/20" />
               </div>
               <p className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/30">{t("ZERO_RECORDS_MATCH_QUERY", "NATIJALAR TOPILMADI", "РЕЗУЛЬТАТЫ_НЕ_НАЙДЕНЫ")}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="glass-card p-2 rounded-[3.5rem] border-foreground/5 bg-foreground/[0.01] mb-16 shadow-2xl">
                {entries.map((entry, i) => {
                  const isMe = user?.id === entry.userId;
                  const rank = entry.rank;
                  const titles = normalizeArray<string>(entry.titles, ["titles", "data", "items"]);
                  
                  const isTop3 = rank <= 3;
                  const rankColor = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-600" : "text-foreground/20";
                  const rankGlow = rank === 1 ? "shadow-yellow-500/20" : rank === 2 ? "shadow-slate-400/20" : rank === 3 ? "shadow-amber-600/20" : "";

                  return (
                    <FadeIn key={entry.userId} delay={i * 0.03}>
                      <Link href={`/profile/${entry.userId}`}>
                        <div
                          className={`group flex items-center gap-8 p-6 md:p-8 transition-all duration-500 cursor-pointer rounded-[2.5rem] mb-2 last:mb-0 hover:bg-foreground/5 hover:scale-[1.01] active:scale-[0.99] border border-transparent ${
                            isMe ? "bg-primary/[0.08] border-primary/20 shadow-xl shadow-primary/5" : ""
                          }`}
                        >
                          {/* Rank */}
                          <div className={`w-16 md:w-20 text-center text-4xl md:text-5xl font-black tabular-nums tracking-tighter ${rankColor} ${isTop3 ? "animate-pulse" : ""}`}>
                            {rank}
                          </div>
                          
                          {/* Avatar */}
                          <div className={`w-16 h-16 md:w-20 md:h-20 bg-foreground/5 border-2 border-foreground/5 rounded-3xl flex items-center justify-center text-2xl font-black text-primary shrink-0 transition-all duration-500 overflow-hidden shadow-2xl ${isMe ? "border-primary/40 shadow-primary/20" : "group-hover:border-primary/40 group-hover:shadow-primary/20"}`}>
                            {entry.avatarUrl ? (
                              <img src={entry.avatarUrl} alt={entry.nickname} className="w-full h-full object-cover" />
                            ) : <span>{entry.nickname[0].toUpperCase()}</span>}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-3">
                              <span className="font-black text-xl md:text-3xl tracking-tighter uppercase group-hover:text-primary transition-colors truncate">
                                {entry.nickname}
                              </span>
                              {isMe && (
                                <div className="px-3 py-1 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-primary/20">
                                  YOU
                                </div>
                              )}
                              {isTop3 && <Star className={`w-5 h-5 fill-current ${rankColor}`} />}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {titles.slice(0, 2).map(title => (
                                <span key={title} className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 bg-foreground/5 border border-foreground/5 px-3 py-1 rounded-xl group-hover:border-primary/30 transition-all">
                                  {title}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-2 text-primary mb-2">
                              <Zap className="w-4 h-4 fill-current" />
                              <div className="text-3xl md:text-5xl font-black tabular-nums leading-none tracking-tighter text-foreground">{entry.points}</div>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/20">
                              {entry.solvedCtfCount} SOLVES_LOGGED
                            </div>
                          </div>
                        </div>
                      </Link>
                    </FadeIn>
                  );
                })}
              </div>

              <div className="pt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

