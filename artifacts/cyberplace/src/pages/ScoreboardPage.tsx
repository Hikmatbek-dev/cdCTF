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
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] right-[-10%] w-[50%] h-[50%] bg-primary/5 hidden rounded-full opacity-30" />
        <div className="absolute bottom-[15%] left-[-10%] w-[50%] h-[50%] bg-accent/5 hidden rounded-full opacity-30" />
      </div>

      <div className="shell relative z-10">
        {/* Header Section */}
        <div className="mb-8">
          <FadeIn>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="mb-2">{t("Leaderboard", "Reyting", "Рейтинг")}</h1>
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
                className="field !pl-11"
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
                <h2 className="text-primary">#{data.currentUserRank}</h2>
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
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 bg-muted rounded-lg" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="glass-card py-20 text-center rounded-xl border-border">
               <div className="w-20 h-20 bg-muted border border-border rounded-3xl flex items-center justify-center mx-auto mb-8">
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
              <div className="glass-card !p-2 rounded-xl border-border mb-8">
                {entries.map((entry, i) => {
                  const isMe = user?.id === entry.userId;
                  const rank = entry.rank;
                  const titles = normalizeArray<string>(entry.titles, ["titles", "data", "items"]);
                  
                  const isTop3 = rank <= 3;
                  const rankColor = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-600" : "text-foreground/20";
                  const rankGlow = rank === 1 ? "shadow-yellow-500/20" : rank === 2 ? "shadow-slate-400/20" : rank === 3 ? "shadow-amber-600/20" : "";
                  /* A medal, not a number in a column. The top three carry a
                     ring and a glow in their metal, so the podium is legible
                     from across the page — a leaderboard that looks like a
                     spreadsheet is not one anybody wants to climb. */
                  const medal = rank === 1
                    ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/10 shadow-[0_0_18px_-4px_theme(colors.yellow.500)]"
                    : rank === 2
                    ? "border-slate-400/60 text-slate-300 bg-slate-400/10 shadow-[0_0_18px_-6px_theme(colors.slate.400)]"
                    : rank === 3
                    ? "border-amber-600/60 text-amber-500 bg-amber-600/10 shadow-[0_0_18px_-6px_theme(colors.amber.600)]"
                    : "border-border text-muted-foreground bg-foreground/[0.03]";

                  return (
                    <div key={entry.userId}>
                      <Link href={`/profile/${entry.userId}`}>
                        <div
                          className={`group relative flex items-center gap-4 md:gap-5 px-4 py-3.5 transition-all cursor-pointer rounded-lg mb-1.5 last:mb-0 border overflow-hidden ${
                            isMe
                              ? "bg-primary/[0.10] border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/.2),0_14px_36px_-24px_hsl(var(--primary))]"
                              : "border-transparent hover:border-primary/30 hover:bg-foreground/[0.04]"
                          }`}
                        >
                          {/* Rail: your own row, and the podium, are found by
                              colour before the eye reaches the name. */}
                          <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                            isMe ? "bg-[hsl(var(--neon))]"
                            : rank === 1 ? "bg-yellow-500"
                            : rank === 2 ? "bg-slate-400"
                            : rank === 3 ? "bg-amber-600"
                            : "bg-transparent group-hover:bg-primary/60"
                          } transition-colors`} />

                          {/* Rank medallion */}
                          <div className={`w-10 h-10 md:w-11 md:h-11 shrink-0 rounded-xl border flex items-center justify-center font-mono text-base md:text-lg font-bold tabular-nums ${medal}`}>
                            {rank}
                          </div>
                          
                          {/* Avatar */}
                          <div className={`w-11 h-11 bg-muted border rounded-xl flex items-center justify-center text-base font-bold text-primary shrink-0 overflow-hidden ${isMe ? "border-primary/40" : "border-border group-hover:border-primary/30"}`}>
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
                                <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-lg shadow-primary/20">
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
                                <span key={title} className="text-xs font-medium text-muted-foreground bg-muted border border-border px-3 py-1 rounded-xl group-hover:border-primary/30 transition-all">
                                  {title}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5 mb-0.5">
                              <Zap className="w-4 h-4 fill-current text-muted-foreground" aria-hidden="true" />
                              <div className="font-mono text-xl md:text-2xl font-bold tabular-nums leading-none text-foreground">{entry.points}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
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

