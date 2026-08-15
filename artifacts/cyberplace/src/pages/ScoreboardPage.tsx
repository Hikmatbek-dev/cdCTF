import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, Search, Zap, Crown, Target, Briefcase, Award, Sparkles, ShieldCheck, Flame, Filter, ChevronRight, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard, getGetScoreboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";
import { FadeIn, ScaleIn } from "@/components/PageTransition";
import { LoadFailure } from "@/components/LoadFailure";

export default function ScoreboardPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "open_to_work">("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = { 
    page, 
    limit: 25, 
    search: debouncedSearch 
  };

  const { data, isLoading, isError, refetch } = useGetScoreboard(queryParams, {
    query: { queryKey: getGetScoreboardQueryKey(queryParams), refetchInterval: 30000 },
  }) as any;

  const rawEntries = normalizeArray<any>(data?.entries, ["entries", "data", "items"]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Filter client-side if open-to-work is toggled
  const entries = filterMode === "open_to_work" 
    ? rawEntries.filter((e: any) => e.openToWork)
    : rawEntries;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Top 3 Podium logic on page 1 when no search query & all filter mode
  const showPodium = page === 1 && !debouncedSearch && filterMode === "all" && entries.length >= 3;
  const rank1 = showPodium ? entries.find((e: any) => e.rank === 1) || entries[0] : null;
  const rank2 = showPodium ? entries.find((e: any) => e.rank === 2) || entries[1] : null;
  const rank3 = showPodium ? entries.find((e: any) => e.rank === 3) || entries[2] : null;

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden pb-20">
      {/* Dynamic Cyber Grid & Neon Glow Background */}
      <div className="fixed inset-0 mono-grid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-60 right-0 w-[500px] h-[300px] bg-cyber-purple/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="shell relative z-10 py-6">
        {/* Cyber Hero Banner */}
        <FadeIn>
          <div className="glass-card bg-gradient-to-r from-card/90 via-card/70 to-card/90 border-primary/20 p-8 sm:p-10 rounded-3xl mb-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
              <Trophy className="w-80 h-80 text-primary" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold tracking-wider uppercase">
                  <Trophy className="w-4 h-4 animate-bounce" />
                  <span>{t("Global Leaderboard", "Global Reyting", "Глобальный Рейтинг")}</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  {t("Cyber Range ", "Kiber Maydon ", "Кибер-Арена ")}
                  <span className="gradient-text">{t("Champions", "Chempionlari", "Чемпионы")}</span>
                </h1>
                
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t(
                    "Top security researchers, CTF players and ethical hackers ranked by verified challenges and lab achievements.",
                    "Tasdiqlangan topshiriqlar va laboratoriya yutuqlari bo'yicha eng kuchli kiber xavfsizlik mutaxassislari hamda hakerlar reytingi.",
                    "Рейтинг лучших специалистов по безопасности, игроков CTF и этичных хакеров."
                  )}
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{isLoading ? t("Updating...", "Yangilanmoqda...", "Обновление...") : `${total} ${t("Active Operatives", "Faol Hakerlar", "Активных хакеров")}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t("Live Scoring", "Jonli Hisob", "Живой счет")}</span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Group */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-80 shrink-0">
                <div className="relative group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="search"
                    aria-label={t("Search hackers", "Hakerlarni qidirish", "Поиск хакеров")}
                    placeholder={t("Search nickname or title...", "Nikneym yoki unvon...", "Поиск никнейма...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="field !pl-11 bg-card/90 border-border/80 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 rounded-2xl h-12 text-sm shadow-inner"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterMode("all")}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                      filterMode === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card hover:bg-muted/80 text-muted-foreground border-border"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {t("All Hackers", "Barcha Hakerlar", "Все хакеры")}
                  </button>
                  <button
                    onClick={() => setFilterMode("open_to_work")}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                      filterMode === "open_to_work"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                        : "bg-card hover:bg-muted/80 text-muted-foreground border-border"
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    {t("Open to Work", "Ishga Tayyor", "Открыт")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Current User Standings Bar */}
        {data?.currentUserRank && !debouncedSearch && page === 1 && (
          <FadeIn delay={0.1}>
            <div className="mb-10 glass-card bg-gradient-to-r from-primary/20 via-card/90 to-card p-6 sm:p-7 rounded-3xl border border-primary/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_40px_-15px_hsl(var(--primary)/.3)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/50 flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/20">
                  <Award className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                      {t("Your Command Position", "Sizning Maydondagi O'rningiz", "Ваша позиция")}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-foreground font-mono tracking-tight">#{data.currentUserRank}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      / {total} {t("operatives", "operatorlar", "операторов")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto justify-around sm:justify-end relative z-10">
                <div className="text-center sm:text-right">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">{t("Your Points", "Sizning Ballingiz", "Ваши Очки")}</p>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-primary flex items-center justify-center sm:justify-end gap-1.5">
                    <Zap className="w-6 h-6 fill-primary text-primary" />
                    <span>{user?.points ?? 0}</span>
                  </div>
                </div>
                <Link href="/profile">
                  <button className="cyber-button text-xs h-11 px-6 font-bold shadow-lg">
                    {t("View Profile", "Profilni Ko'rish", "Профиль")}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </FadeIn>
        )}

        {/* TOP 3 PODIUM ARENA */}
        {showPodium && (
          <FadeIn delay={0.15}>
            <div className="mb-14">
              <div className="text-center mb-6">
                <span className="eyebrow mx-auto justify-center">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  {t("Hall of Fame", "Shon-sharaf Zali", "Зал Славы")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-end">
                
                {/* 2ND PLACE (SILVER) */}
                {rank2 && (
                  <div className="order-2 md:order-1 flex flex-col items-center">
                    <Link href={`/profile/${rank2.userId}`} className="w-full group cursor-pointer">
                      <div className="glass-card p-6 sm:p-7 rounded-3xl border-slate-400/40 bg-gradient-to-b from-slate-500/10 via-card/90 to-card group-hover:border-slate-300 transition-all text-center relative overflow-hidden flex flex-col items-center shadow-xl group-hover:-translate-y-2 duration-300">
                        <div className="absolute top-3 left-3 px-3.5 py-1 bg-slate-400/20 border border-slate-400/40 rounded-full font-mono text-xs font-black text-slate-300 flex items-center gap-1.5">
                          🥈 #2 {t("Silver", "Kumush", "Серебро")}
                        </div>
                        
                        <div className="relative my-5 pt-3">
                          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-2xl bg-muted border-2 border-slate-300 overflow-hidden shadow-[0_0_25px_-5px_rgba(203,213,225,0.5)] flex items-center justify-center text-2xl font-black text-slate-300">
                            {rank2.avatarUrl ? (
                              <img src={rank2.avatarUrl} alt={rank2.nickname} className="w-full h-full object-cover" />
                            ) : rank2.nickname[0].toUpperCase()}
                          </div>
                        </div>

                        <h3 className="font-extrabold text-xl text-foreground group-hover:text-slate-300 transition-colors truncate max-w-[200px]">
                          {rank2.nickname}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-2 font-mono text-2xl font-black text-slate-300">
                          <Zap className="w-5 h-5 fill-slate-300 text-slate-300" />
                          <span>{rank2.points}</span>
                          <span className="text-xs text-muted-foreground font-sans font-normal">pts</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                          {rank2.solvedCtfCount} {t("solves", "yechilgan", "решено")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* 1ST PLACE (GOLD - CHAMPION) */}
                {rank1 && (
                  <div className="order-1 md:order-2 flex flex-col items-center -mt-4 md:-mt-8">
                    <Link href={`/profile/${rank1.userId}`} className="w-full group cursor-pointer">
                      <div className="glass-card p-8 sm:p-9 rounded-3xl border-yellow-500/70 bg-gradient-to-b from-yellow-500/20 via-card/95 to-card group-hover:border-yellow-400 transition-all text-center relative overflow-hidden flex flex-col items-center shadow-[0_0_50px_-10px_rgba(234,179,8,0.45)] group-hover:-translate-y-3 duration-300">
                        
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-yellow-500/25 border border-yellow-500/60 rounded-full font-mono text-xs font-black text-yellow-400 flex items-center gap-1.5 uppercase tracking-wider shadow-lg">
                          <Crown className="w-4 h-4 fill-yellow-400 text-yellow-400 animate-bounce" /> #1 {t("Champion", "Chempion", "Чемпион")}
                        </div>
                        
                        <div className="relative my-6 pt-4">
                          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-muted border-4 border-yellow-400 overflow-hidden shadow-[0_0_35px_-5px_rgba(234,179,8,0.7)] flex items-center justify-center text-3xl font-black text-yellow-400">
                            {rank1.avatarUrl ? (
                              <img src={rank1.avatarUrl} alt={rank1.nickname} className="w-full h-full object-cover" />
                            ) : rank1.nickname[0].toUpperCase()}
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black p-2 rounded-2xl shadow-xl">
                            <Sparkles className="w-5 h-5 fill-black" />
                          </div>
                        </div>

                        <h3 className="font-black text-2xl text-yellow-400 group-hover:text-yellow-300 transition-colors truncate max-w-[220px]">
                          {rank1.nickname}
                        </h3>

                        <div className="flex items-center gap-2 mt-2 font-mono text-3xl font-black text-yellow-400">
                          <Zap className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                          <span>{rank1.points}</span>
                          <span className="text-xs text-muted-foreground font-sans font-normal">pts</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 font-mono font-semibold">
                          {rank1.solvedCtfCount} {t("solves", "yechilgan", "решено")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* 3RD PLACE (BRONZE) */}
                {rank3 && (
                  <div className="order-3 flex flex-col items-center">
                    <Link href={`/profile/${rank3.userId}`} className="w-full group cursor-pointer">
                      <div className="glass-card p-6 sm:p-7 rounded-3xl border-amber-600/40 bg-gradient-to-b from-amber-600/10 via-card/90 to-card group-hover:border-amber-500 transition-all text-center relative overflow-hidden flex flex-col items-center shadow-xl group-hover:-translate-y-2 duration-300">
                        <div className="absolute top-3 left-3 px-3.5 py-1 bg-amber-600/20 border border-amber-600/40 rounded-full font-mono text-xs font-black text-amber-500 flex items-center gap-1.5">
                          🥉 #3 {t("Bronze", "Bronza", "Бронза")}
                        </div>
                        
                        <div className="relative my-5 pt-3">
                          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-2xl bg-muted border-2 border-amber-600/80 overflow-hidden shadow-[0_0_25px_-5px_rgba(217,119,6,0.5)] flex items-center justify-center text-2xl font-black text-amber-500">
                            {rank3.avatarUrl ? (
                              <img src={rank3.avatarUrl} alt={rank3.nickname} className="w-full h-full object-cover" />
                            ) : rank3.nickname[0].toUpperCase()}
                          </div>
                        </div>

                        <h3 className="font-extrabold text-xl text-foreground group-hover:text-amber-500 transition-colors truncate max-w-[200px]">
                          {rank3.nickname}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-2 font-mono text-2xl font-black text-amber-500">
                          <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
                          <span>{rank3.points}</span>
                          <span className="text-xs text-muted-foreground font-sans font-normal">pts</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                          {rank3.solvedCtfCount} {t("solves", "yechilgan", "решено")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}

              </div>
            </div>
          </FadeIn>
        )}

        {/* LEADERBOARD LIST */}
        <FadeIn delay={0.25}>
          {isError ? (
            <LoadFailure onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 bg-muted/60 rounded-2xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="glass-card py-24 text-center rounded-3xl border-border">
              <div className="w-20 h-20 bg-muted border border-border rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Target className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t("No Operatives Found", "Topilmadi", "Никого не найдено")}</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {debouncedSearch
                  ? t("No hackers match your query", "Qidiruvingizga mos haker topilmadi", "Ни один хакер не найден")
                  : t("Nobody has scored yet — be the first.", "Hali hech kim ball to'plamagan — birinchi bo'ling.", "Пока никто не набрал очков — станьте первым.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="glass-card p-4 rounded-3xl border-border/80 space-y-2.5 shadow-2xl">
                {entries.map((entry: any) => {
                  const isMe = user?.id === entry.userId;
                  const rank = entry.rank;
                  const titles = normalizeArray<string>(entry.titles, ["titles", "data", "items"]);

                  const medal =
                    rank === 1
                      ? "border-yellow-500/70 text-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_-3px_rgba(234,179,8,0.5)]"
                      : rank === 2
                      ? "border-slate-300 text-slate-200 bg-slate-400/10 shadow-[0_0_15px_-3px_rgba(203,213,225,0.4)]"
                      : rank === 3
                      ? "border-amber-600/70 text-amber-500 bg-amber-600/10 shadow-[0_0_15px_-3px_rgba(217,119,6,0.4)]"
                      : rank <= 10
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border-border/80 text-muted-foreground bg-muted/40";

                  return (
                    <div key={entry.userId}>
                      <Link href={`/profile/${entry.userId}`}>
                        <div
                          className={`group relative flex items-center gap-4 sm:gap-6 px-5 py-4 transition-all cursor-pointer rounded-2xl border overflow-hidden ${
                            isMe
                              ? "bg-primary/[0.14] border-primary/60 shadow-[0_0_25px_-5px_hsl(var(--primary)/.4)]"
                              : "border-transparent hover:border-primary/30 hover:bg-card/90"
                          }`}
                        >
                          {/* Rank indicator left margin bar */}
                          <span
                            aria-hidden="true"
                            className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                              isMe
                                ? "bg-primary"
                                : rank === 1
                                ? "bg-yellow-500"
                                : rank === 2
                                ? "bg-slate-300"
                                : rank === 3
                                ? "bg-amber-600"
                                : "bg-transparent group-hover:bg-primary/50"
                            } transition-colors`}
                          />

                          {/* Rank badge */}
                          <div className={`w-11 h-11 shrink-0 rounded-2xl border flex items-center justify-center font-mono text-base font-black tabular-nums shadow-sm ${medal}`}>
                            {rank}
                          </div>

                          {/* Avatar */}
                          <div className={`w-12 h-12 bg-muted border-2 rounded-2xl flex items-center justify-center text-lg font-black text-primary shrink-0 overflow-hidden shadow-inner ${isMe ? "border-primary" : "border-border/70 group-hover:border-primary/50"}`}>
                            {entry.avatarUrl ? (
                              <img src={entry.avatarUrl} alt={entry.nickname} className="w-full h-full object-cover" />
                            ) : (
                              <span>{entry.nickname[0].toUpperCase()}</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-extrabold text-base sm:text-lg group-hover:text-primary transition-colors truncate">
                                {entry.nickname}
                              </span>
                              {isMe && (
                                <span className="px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm">
                                  {t("You", "Siz", "Вы")}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {entry.openToWork && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                                  <Briefcase className="w-3 h-3" /> {t("Open to work", "Ishga tayyor", "Открыт")}
                                </span>
                              )}
                              {titles.slice(0, 2).map((title: string) => (
                                <span key={title} className="text-[11px] font-medium text-muted-foreground bg-muted/80 border border-border/80 px-2.5 py-0.5 rounded-lg">
                                  {title}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Points & Solves */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <Zap className="w-4 h-4 fill-primary text-primary" />
                              <div className="font-mono text-xl font-black tabular-nums leading-none text-foreground">{entry.points}</div>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-1 font-medium">
                              {entry.solvedCtfCount} {t("solves", "yechilgan", "решено")}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="pt-8">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
