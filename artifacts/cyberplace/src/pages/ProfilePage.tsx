import { useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Trophy, BookOpen, Target, Calendar, Share2, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { normalizeArray } from "@/lib/api-shapes";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [match, params] = useRoute("/profile/:id");
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!match && currentUser?.id) {
      setLocation(`/profile/${currentUser.id}`, { replace: true });
    }
  }, [match, currentUser, setLocation]);

  const id = match && params?.id ? Number(params.id) : currentUser?.id;

  const { data: profile, isLoading, error, isError } = useGetUserProfile(id as number, {
    query: { 
      enabled: typeof id === "number" && !isNaN(id) && id > 0, 
      queryKey: getGetUserProfileQueryKey(id as number) 
    },
  });

  const handleShare = () => {
    const url = window.location.href;
    // The clipboard API rejects on a denied permission or a non-secure context,
    // and this had no catch: the copy failed, the success toast never fired, and
    // the user was told nothing at all.
    navigator.clipboard.writeText(url).then(
      () => toast({ title: t("Link copied!", "Havola nusxalandi!", "Ссылка скопирована!") }),
      () => toast({
        title: t("Could not copy the link", "Havolani nusxalab bo'lmadi", "Не удалось скопировать ссылку"),
        description: url,
        variant: "destructive",
      }),
    );
  };

  if (isLoading || (isAuthenticated && !id)) {
    return (
      <div className="min-h-screen bg-background pt-24 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <Skeleton className="h-64 w-full bg-muted rounded-[2.5rem]" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96 bg-muted rounded-[2.5rem]" />
            <Skeleton className="h-96 bg-muted rounded-[2.5rem]" />
          </div>
        </div>
      </div>
    );
  }

  const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message;

  if (!profile || isError) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-destructive font-black uppercase text-xs tracking-widest mb-4">{t("ACCESS_DENIED", "PROFIL XATOSI", "ОШИБКА_ДОСТУПА")}</p>
          <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-[10px] font-black uppercase tracking-widest">
            {errorMessage || t("User not found or data load failed", "Foydalanuvchi topilmadi yoki ma'lumot yuklanmadi", "Пользователь не найден")}
          </p>
          <Link href="/scoreboard">
            <Button variant="outline" className="rounded-xl px-8 h-12 border-primary text-primary hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest">
              {t("BACK_TO_RANKING", "REYTINGGA O'TISH", "В_РЕЙТИНГ")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwn = currentUser?.id === profile.id;
  const titles = normalizeArray<any>(profile.titles, ["titles", "data", "items"]);
  const solvedCtf = normalizeArray<any>(profile.solvedCtf, ["solvedCtf", "data", "items"]);
  const completedLessons = normalizeArray<any>(profile.completedLessons, ["completedLessons", "data", "items"]);
  const competitionHistory = normalizeArray<any>(profile.competitionHistory, ["competitionHistory", "competitions", "data", "items"]);

  // No `overflow-hidden` on the root: it clipped the fixed backdrop below, and
  // on a page whose content can exceed the viewport it is a way to lose content
  // rather than a way to tidy it.
  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 relative">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Profile Dossier Header */}
        <div className="glass-card bg-muted/10 border-border p-10 mb-12 relative overflow-hidden rounded-[3rem]">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield className="w-64 h-64 text-primary" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-12 relative z-10">
            <div className="shrink-0 relative group">
              <div className="w-40 h-40 bg-muted border-2 border-border p-1 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden transition-all group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/20">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.nickname} className="w-full h-full object-cover rounded-[2.2rem]" />
                ) : (
                  <div className="text-7xl font-black text-primary">
                    {profile.nickname[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary border-4 border-background rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-4">
                    OPERATIVE_PROFILE
                  </div>
                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-2 leading-none">{profile.nickname}</h1>
                  <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase mt-2">
                    {profile.email}
                  </p>
                </div>
                <div className="flex items-center gap-4 justify-center md:justify-end">
                  <Button onClick={handleShare} variant="outline" className="h-12 px-6 rounded-xl border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted">
                    <Share2 className="w-4 h-4 mr-2" />
                    SHARE
                  </Button>
                  {isOwn && (
                    <Link href="/profile/edit">
                      <Button className="cyber-button h-12 px-8">
                        EDIT_DOSSIER
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 pt-10 border-t border-border">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 block mb-2">XP_ACCUMULATED</span>
                  <span className="text-4xl font-black text-foreground leading-none">{profile.points}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 block mb-2">GLOBAL_RANKING</span>
                  <span className="text-4xl font-black text-primary leading-none">#{profile.rank}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 block mb-2">CONFIRMED_BREACHES</span>
                  <span className="text-4xl font-black text-foreground leading-none">{solvedCtf.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Titles */}
          {titles.length > 0 && (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-12">
              {titles.map(title => (
                <span 
                  key={title.id} 
                  className="px-5 py-2.5 bg-muted/50 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 transition-all cursor-default"
                >
                  {title.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tactical Feed */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="text-lg font-black uppercase tracking-tighter">MISSION_HISTORY</h2>
                </div>
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{solvedCtf.length} ENTRIES</span>
              </div>

              {solvedCtf.length === 0 ? (
                <div className="glass-card bg-muted/5 border-dashed border-border py-24 text-center rounded-[2.5rem]">
                  <p className="text-muted-foreground/40 font-black uppercase text-[10px] tracking-widest">NO DATA IN FEED</p>
                  {isOwn && (
                    <Link href="/ctf">
                      <Button variant="link" className="mt-4 text-primary font-black uppercase text-[10px] tracking-[0.2em] decoration-2">Initialize First Breach</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {solvedCtf.map(ctf => (
                    <div key={ctf.id} className="glass-card bg-muted/10 p-6 flex items-center justify-between hover:bg-muted/30 transition-all group rounded-2xl border-border">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg leading-tight uppercase group-hover:text-primary transition-colors">{ctf.name}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{ctf.category}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(ctf.solvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-primary">+{ctf.points}</span>
                        <div className="text-[9px] font-black uppercase text-muted-foreground/40 mt-1">XP_YIELD</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-12">
            {/* Academy Logs */}
            {completedLessons.length > 0 && (
              <section className="glass-card p-8 bg-primary/5 border-primary/20 rounded-[2.5rem]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-10 flex items-center gap-3">
                  <BookOpen className="w-4 h-4" />
                  ACADEMY_LOGS
                </h2>
                <div className="space-y-8">
                  {completedLessons.slice(0, 5).map(lesson => (
                    <div key={lesson.id} className="relative pl-6 border-l-2 border-primary/20">
                      <div className="text-xs font-black uppercase tracking-tight mb-2 leading-tight hover:text-primary transition-colors cursor-pointer">{lesson.title}</div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CERTIFIED // +{lesson.points} XP</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tournament Records */}
            {competitionHistory.length > 0 && (
              <section className="glass-card p-8 border-border rounded-[2.5rem]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-10 flex items-center gap-3">
                  <Trophy className="w-4 h-4" />
                  TOURNAMENT_STATS
                </h2>
                <div className="space-y-8">
                  {competitionHistory.map(comp => (
                    <div key={comp.competitionId} className="group">
                      <div className="text-xs font-black uppercase tracking-tight mb-2 leading-tight group-hover:text-primary transition-colors cursor-pointer">{comp.competitionName}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          PLACEMENT: #{comp.rank}
                        </div>
                        <span className="text-[9px] font-black text-foreground">+{comp.points} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
