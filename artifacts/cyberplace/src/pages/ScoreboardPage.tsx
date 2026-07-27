import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trophy, Shield, Search, Zap, Star, Target, Briefcase } from "lucide-react";
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
    }, 500);
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

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-28 pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] right-[-10%] w-[50%] h-[50%] bg-primary/5 hidden rounded-full opacity-30" />
        <div className="absolute bottom-[15%] left-[-10%] w-[50%] h-[50%] bg-accent/5 hidden rounded-full opacity-30" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-8">
          <FadeIn>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-none mb-2">{t("Leaderboard", "Reyting", "Рейтинг")}</h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? t("Loading…", "Yuklanmoqda…", "Загрузка…") : t(`${total} players`, `${total} foydalanuvchi`, `${total} игроков`)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
              {/* A placeholder is not a label: it vanishes as soon as you type,
                  and screen readers are not required to announce it. */}
              <input
                type="search"
                aria-label={t("Search users", "Foydalanuvchilarni qidirish", "Поиск пользователей")}
                placeholder={t("Search players…", "Foydalanuvchilarni qidirish…", "Поиск игроков…")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-foreground/5 border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </FadeIn>
        </div>

        {/* User Stats Card */}
        {data?.currentUserRank && !debouncedSearch && page === 1 && (
          <FadeIn delay={0.2}>
            <div className="mb-6 glass-card bg-primary/[0.06] !p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border-primary/20 relative overflow-hidden">
                            <div className="relative z-10 text-center sm:text-left">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("Your position", "Sizning joyingiz", "Ваша позиция")}</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">#{data.currentUserRank}</h2>
              </div>
              <div className="text-center sm:text-right relative z-10">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("Your points", "Sizning ballaringiz", "Ваши очки")}</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums">{user?.points ?? 0}</div>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Leaderboard table. Rendered directly, with no enter/exit animation
            wrapper: the rows are the content people came for, and an animation
            layer here meant a stalled transition could leave the list stuck on
            skeletons even after the data had arrived. */}
        <div>
          {isError ? (
            <LoadFailure onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 bg-foreground/5 rounded-lg" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="glass-card py-20 text-center rounded-xl border-foreground/5">
               <div className="w-20 h-20 bg-foreground/5 border border-foreground/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Target className="w-10 h-10 text-muted-foreground/20" />
               </div>
               {/* Blaming a search the visitor never made is worse than saying
                   nothing: it sends them looking for a filter to clear. */}
               <p className="text-muted-foreground">
                 {debouncedSearch
                   ? t("No players match your search", "Qidiruvingizga mos foydalanuvchi yo'q", "Игроки не найдены")
                   : t("Nobody has scored yet — be the first.", "Hali hech kim ball to'plamagan — birinchi bo'ling.", "Пока никто не набрал очков — станьте первым.")}
               </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card !p-2 rounded-xl border-foreground/5 mb-8">
                {entries.map((entry, i) => {
                  const isMe = user?.id === entry.userId;
                  const rank = entry.rank;
                  const titles = normalizeArray<string>(entry.titles, ["titles", "data", "items"]);
                  
                  const isTop3 = rank <= 3;
                  const rankColor = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-600" : "text-foreground/20";
                  const rankGlow = rank === 1 ? "shadow-yellow-500/20" : rank === 2 ? "shadow-slate-400/20" : rank === 3 ? "shadow-amber-600/20" : "";

                  return (
                    <div key={entry.userId}>
                      <Link href={`/profile/${entry.userId}`}>
                        <div
                          className={`group flex items-center gap-4 md:gap-5 px-4 py-3 transition-colors cursor-pointer rounded-lg mb-1 last:mb-0 hover:bg-foreground/5 border border-transparent ${
                            isMe ? "bg-primary/[0.08] border-primary/20 shadow-xl shadow-primary/5" : ""
                          }`}
                        >
                          {/* Rank */}
                          <div className={`w-8 md:w-10 text-center text-xl md:text-2xl font-bold tabular-nums ${rankColor}`}>
                            {rank}
                          </div>
                          
                          {/* Avatar */}
                          <div className={`w-11 h-11 bg-foreground/5 border rounded-xl flex items-center justify-center text-base font-bold text-primary shrink-0 overflow-hidden ${isMe ? "border-primary/40" : "border-foreground/10 group-hover:border-primary/30"}`}>
                            {entry.avatarUrl ? (
                              <img src={entry.avatarUrl} alt={entry.nickname} className="w-full h-full object-cover" />
                            ) : <span>{entry.nickname[0].toUpperCase()}</span>}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-1">
                              <span className="font-semibold text-base md:text-lg group-hover:text-primary transition-colors truncate">
                                {entry.nickname}
                              </span>
                              {isMe && (
                                <div className="px-3 py-1 bg-primary text-primary-foreground text-[11px] font-semibold rounded-lg shadow-lg shadow-primary/20">
                                  {t("You", "Siz", "Вы")}
                                </div>
                              )}
                              {isTop3 && <Star className={`w-5 h-5 fill-current ${rankColor}`} />}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {entry.openToWork && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl" data-testid={`badge-open-to-work-${entry.userId}`}>
                                  <Briefcase className="w-3 h-3" /> {t("Open to work", "Ishga tayyor", "Открыт для работы")}
                                </span>
                              )}
                              {titles.slice(0, 2).map(title => (
                                <span key={title} className="text-xs font-medium text-muted-foreground bg-foreground/5 border border-foreground/5 px-3 py-1 rounded-xl group-hover:border-primary/30 transition-all">
                                  {title}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5 text-primary mb-0.5">
                              <Zap className="w-4 h-4 fill-current" />
                              <div className="text-xl md:text-2xl font-bold tabular-nums leading-none text-foreground">{entry.points}</div>
                            </div>
                            <div className="text-xs text-muted-foreground/50">
                              {entry.solvedCtfCount} {t("solved", "yechildi", "решено")}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

