import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, Search, Zap, Crown, Target, Briefcase, Award, Sparkles, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard, getGetScoreboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";
import { FadeIn } from "@/components/PageTransition";
import { LoadFailure } from "@/components/LoadFailure";

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
    }, 400);
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

  const entries = normalizeArray<any>(data?.entries, ["entries", "data", "items"]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Top 3 Podium logic on page 1 when no search query
  const showPodium = page === 1 && !debouncedSearch && entries.length >= 3;
  const rank1 = showPodium ? entries.find(e => e.rank === 1) || entries[0] : null;
  const rank2 = showPodium ? entries.find(e => e.rank === 2) || entries[1] : null;
  const rank3 = showPodium ? entries.find(e => e.rank === 3) || entries[2] : null;

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden pb-16">
      {/* Background Cyber Grid & Ambient Lights */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="shell relative z-10 py-6">
        {/* Hero Section */}
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_25px_-5px_hsl(var(--primary)/.4)]">
                <Trophy className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {t("Global Leaderboard", "Global Reyting", "Глобальный Рейтинг")}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-xs md:text-sm text-muted-foreground font-mono">
                    {isLoading
                      ? t("Updating scores...", "Reyting yangilanmoqda...", "Обновление рейтинга...")
                      : t(`${total} active hackers competing`, `${total} ta faol haker bellashmoqda`, `${total} активных хакеров`)}
                  </p>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="search"
                aria-label={t("Search users", "Foydalanuvchilarni qidirish", "Поиск пользователей")}
                placeholder={t("Search hacker nickname...", "Nikneym bo'yicha qidirish...", "Поиск по никнейму...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field !pl-11 bg-card/80 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/40 rounded-xl"
              />
            </div>
          </div>
        </FadeIn>

        {/* User Stats Card */}
        {data?.currentUserRank && !debouncedSearch && page === 1 && (
          <FadeIn delay={0.1}>
            <div className="mb-10 glass-card bg-gradient-to-r from-primary/15 via-card/80 to-card/60 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-primary/30 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("Your Current Standing", "Sizning joriy o'rningiz", "Ваш текущий статус")}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl md:text-3xl font-black text-primary font-mono">#{data.currentUserRank}</span>
                    <span className="text-xs text-muted-foreground">
                      / {total} {t("hackers", "hakerlar", "хакеров")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-center sm:text-right relative z-10 border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto justify-around sm:justify-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Your Score", "Balllaringiz", "Очки")}</p>
                  <div className="text-2xl md:text-3xl font-black font-mono text-foreground tracking-tight flex items-center justify-end gap-1.5 mt-0.5">
                    <Zap className="w-5 h-5 fill-primary text-primary" />
                    <span>{user?.points ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        {/* TOP 3 PODIUM DISPLAY */}
        {showPodium && (
          <FadeIn delay={0.2}>
            <div className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                
                {/* 2ND PLACE (SILVER) */}
                {rank2 && (
                  <div className="order-2 md:order-1 flex flex-col items-center">
                    <Link href={`/profile/${rank2.userId}`} className="w-full group cursor-pointer">
                      <div className="glass-card p-6 rounded-2xl border-slate-400/40 bg-slate-500/5 group-hover:bg-slate-500/10 group-hover:border-slate-400 transition-all text-center relative overflow-hidden flex flex-col items-center shadow-lg">
                        <div className="absolute top-2 left-2 px-3 py-1 bg-slate-400/20 border border-slate-400/40 rounded-full font-mono text-xs font-bold text-slate-300">
                          #2 {t("Silver", "Kumush", "Серебро")}
                        </div>
                        
                        <div className="relative my-4">
                          <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-slate-400/60 overflow-hidden shadow-[0_0_20px_-5px_theme(colors.slate.400)] flex items-center justify-center text-xl font-bold text-slate-300">
                            {rank2.avatarUrl ? (
                              <img src={rank2.avatarUrl} alt={rank2.nickname} className="w-full h-full object-cover" />
                            ) : rank2.nickname[0].toUpperCase()}
                          </div>
                        </div>

                        <h3 className="font-bold text-lg text-foreground group-hover:text-slate-300 transition-colors truncate max-w-[180px]">
                          {rank2.nickname}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-2 font-mono text-xl font-bold text-slate-300">
                          <Zap className="w-4 h-4 fill-slate-300" />
                          <span>{rank2.points} {t("pts", "ball", "очков")}</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          {rank2.solvedCtfCount} {t("solves", "yechilgan", "решено")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* 1ST PLACE (GOLD) - ELEVATED */}
                {rank1 && (
                  <div className="order-1 md:order-2 flex flex-col items-center -mt-4 md:-mt-8">
                    <Link href={`/profile/${rank1.userId}`} className="w-full group cursor-pointer">
                      <div className="glass-card p-8 rounded-2xl border-yellow-500/60 bg-gradient-to-b from-yellow-500/15 via-card/90 to-card group-hover:border-yellow-400 transition-all text-center relative overflow-hidden flex flex-col items-center shadow-[0_0_40px_-10px_rgba(234,179,8,0.35)]">
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full font-mono text-xs font-black text-yellow-400 flex items-center gap-1.5 uppercase tracking-wider shadow-sm">
                          <Crown className="w-3.5 h-3.5 fill-yellow-400" /> #1 {t("Champion", "Chempion", "Чемпион")}
                        </div>
                        
                        <div className="relative my-5 pt-3">
                          <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-yellow-400 overflow-hidden shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)] flex items-center justify-center text-2xl font-bold text-yellow-400">
                            {rank1.avatarUrl ? (
                              <img src={rank1.avatarUrl} alt={rank1.nickname} className="w-full h-full object-cover" />
                            ) : rank1.nickname[0].toUpperCase()}
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black p-1.5 rounded-full shadow-lg">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        </div>

                        <h3 className="font-extrabold text-xl text-yellow-400 group-hover:text-yellow-300 transition-colors truncate max-w-[200px]">
                          {rank1.nickname}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-2 font-mono text-2xl font-black text-yellow-400">
                          <Zap className="w-5 h-5 fill-yellow-400" />
                          <span>{rank1.points} {t("pts", "ball", "очков")}</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 font-medium">
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
                      <div className="glass-card p-6 rounded-2xl border-amber-600/40 bg-amber-600/5 group-hover:bg-amber-600/10 group-hover:border-amber-500 transition-all text-center relative overflow-hidden flex flex-col items-center shadow-lg">
                        <div className="absolute top-2 left-2 px-3 py-1 bg-amber-600/20 border border-amber-600/40 rounded-full font-mono text-xs font-bold text-amber-500">
                          #3 {t("Bronze", "Bronza", "Бронза")}
                        </div>
                        
                        <div className="relative my-4">
                          <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-amber-600/60 overflow-hidden shadow-[0_0_20px_-5px_theme(colors.amber.600)] flex items-center justify-center text-xl font-bold text-amber-500">
                            {rank3.avatarUrl ? (
                              <img src={rank3.avatarUrl} alt={rank3.nickname} className="w-full h-full object-cover" />
                            ) : rank3.nickname[0].toUpperCase()}
                          </div>
                        </div>

                        <h3 className="font-bold text-lg text-foreground group-hover:text-amber-500 transition-colors truncate max-w-[180px]">
                          {rank3.nickname}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-2 font-mono text-xl font-bold text-amber-500">
                          <Zap className="w-4 h-4 fill-amber-500" />
                          <span>{rank3.points} {t("pts", "ball", "очков")}</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
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

        {/* LEADERBOARD TABLE */}
        <div>
          {isError ? (
            <LoadFailure onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 bg-muted/60 rounded-xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="glass-card py-20 text-center rounded-2xl border-border">
              <div className="w-16 h-16 bg-muted border border-border rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">
                {debouncedSearch
                  ? t("No hackers match your query", "Qidiruvingizga mos haker topilmadi", "Ни один хакер не найден")
                  : t("Nobody has scored yet — be the first.", "Hali hech kim ball to'plamagan — birinchi bo'ling.", "Пока никто не набрал очков — станьте первым.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="glass-card p-3 rounded-2xl border-border/80 space-y-2">
                {entries.map((entry) => {
                  const isMe = user?.id === entry.userId;
                  const rank = entry.rank;
                  const titles = normalizeArray<string>(entry.titles, ["titles", "data", "items"]);

                  const medal =
                    rank === 1
                      ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_-3px_rgba(234,179,8,0.4)]"
                      : rank === 2
                      ? "border-slate-400/60 text-slate-300 bg-slate-400/10 shadow-[0_0_15px_-3px_rgba(148,163,184,0.4)]"
                      : rank === 3
                      ? "border-amber-600/60 text-amber-500 bg-amber-600/10 shadow-[0_0_15px_-3px_rgba(217,119,6,0.4)]"
                      : "border-border/80 text-muted-foreground bg-muted/40";

                  return (
                    <div key={entry.userId}>
                      <Link href={`/profile/${entry.userId}`}>
                        <div
                          className={`group relative flex items-center gap-4 px-4 py-3.5 transition-all cursor-pointer rounded-xl border overflow-hidden ${
                            isMe
                              ? "bg-primary/[0.12] border-primary/50 shadow-[0_0_20px_-5px_hsl(var(--primary)/.3)]"
                              : "border-transparent hover:border-primary/30 hover:bg-card/90"
                          }`}
                        >
                          {/* Rank indicator bar */}
                          <span
                            aria-hidden="true"
                            className={`absolute left-0 top-0 bottom-0 w-1 ${
                              isMe
                                ? "bg-primary"
                                : rank === 1
                                ? "bg-yellow-500"
                                : rank === 2
                                ? "bg-slate-400"
                                : rank === 3
                                ? "bg-amber-600"
                                : "bg-transparent group-hover:bg-primary/50"
                            } transition-colors`}
                          />

                          {/* Rank badge */}
                          <div className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center font-mono text-base font-bold tabular-nums ${medal}`}>
                            {rank}
                          </div>

                          {/* Avatar */}
                          <div className={`w-11 h-11 bg-muted border rounded-xl flex items-center justify-center text-base font-bold text-primary shrink-0 overflow-hidden ${isMe ? "border-primary/50" : "border-border/60 group-hover:border-primary/40"}`}>
                            {entry.avatarUrl ? (
                              <img src={entry.avatarUrl} alt={entry.nickname} className="w-full h-full object-cover" />
                            ) : (
                              <span>{entry.nickname[0].toUpperCase()}</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-base group-hover:text-primary transition-colors truncate">
                                {entry.nickname}
                              </span>
                              {isMe && (
                                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-md">
                                  {t("You", "Siz", "Вы")}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {entry.openToWork && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                  <Briefcase className="w-3 h-3" /> {t("Open to work", "Ishga tayyor", "Открыт")}
                                </span>
                              )}
                              {titles.slice(0, 2).map((title) => (
                                <span key={title} className="text-[11px] font-medium text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md">
                                  {title}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Points & Solves */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <Zap className="w-4 h-4 fill-primary text-primary" />
                              <div className="font-mono text-lg font-black tabular-nums leading-none text-foreground">{entry.points}</div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
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
              <div className="pt-6">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
