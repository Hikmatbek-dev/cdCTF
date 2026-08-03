import { useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Trophy, BookOpen, Target, Calendar, Share2, Shield, Briefcase, Flame, Flag, Star, Award, Mail, Hexagon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { ReferralPanel } from "@/components/ReferralPanel";
import { Button } from "@/components/ui/button";
import { normalizeArray } from "@/lib/api-shapes";
import { useToast } from "@/hooks/use-toast";
import { levelFromPoints } from "@/lib/level";

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

  const { data: skillsData } = useQuery({
    queryKey: ["user-skills", id],
    queryFn: async () => {
      const r = await fetch(`/api/users/${id}/skills`);
      if (!r.ok) throw new Error("skills");
      return r.json() as Promise<{ skills: Array<{ category: string; solved: number; total: number; progress: number }> }>;
    },
    enabled: typeof id === "number" && !isNaN(id) && id > 0,
  });

  const handleShare = () => {
    const url = window.location.href;
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
      <div className="min-h-screen bg-background page relative pb-20 pt-6">
        <div className="max-w-6xl mx-auto space-y-12 px-4 lg:px-0">
          <Skeleton className="h-64 md:h-80 w-full bg-muted/40 rounded-3xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
             <Skeleton className="h-32 bg-muted/40 rounded-3xl" />
             <Skeleton className="h-32 bg-muted/40 rounded-3xl" />
             <Skeleton className="h-32 bg-muted/40 rounded-3xl" />
             <Skeleton className="h-32 bg-muted/40 rounded-3xl" />
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <Skeleton className="h-64 bg-muted/40 rounded-3xl" />
              <Skeleton className="h-80 bg-muted/40 rounded-3xl" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-[500px] bg-muted/40 rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message;

  if (!profile || isError) {
    return (
      <div className="min-h-screen bg-background page flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-destructive font-semibold text-lg mb-2">{t("Profile error", "Profil xatosi", "Ошибка профиля")}</p>
          <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-sm">
            {errorMessage || t("User not found or data load failed", "Foydalanuvchi topilmadi yoki ma'lumot yuklanmadi", "Пользователь не найден")}
          </p>
          <Link href="/scoreboard">
            <Button variant="outline" className="rounded-xl px-8 h-12 border-primary text-primary hover:bg-primary/5">
              {t("Back to ranking", "Reytingga qaytish", "К рейтингу")}
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
  const skills = normalizeArray<{ category: string; solved: number; total: number; progress: number }>(skillsData?.skills, ["skills", "data", "items"]);

  const longestStreak = (profile as any).longestStreak ?? 0;
  const level = levelFromPoints(profile.points).level;
  const badges = [
    { id: "first-solve", icon: Flag, earned: solvedCtf.length >= 1, label: t("First solve", "Ilk yechim", "Первое решение") },
    { id: "first-lesson", icon: BookOpen, earned: completedLessons.length >= 1, label: t("First lesson", "Ilk dars", "Первый урок") },
    { id: "ten-solves", icon: Target, earned: solvedCtf.length >= 10, label: t("10 solves", "10 yechim", "10 решений") },
    { id: "fifty-solves", icon: Award, earned: solvedCtf.length >= 50, label: t("50 solves", "50 yechim", "50 решений") },
    { id: "streak-7", icon: Flame, earned: longestStreak >= 7, label: t("7-day streak", "7 kunlik seriya", "7 дней подряд") },
    { id: "streak-30", icon: Flame, earned: longestStreak >= 30, label: t("30-day", "30 kunlik", "30 дней") },
    { id: "level-5", icon: Star, earned: level >= 5, label: t("Level 5", "5-daraja", "Уровень 5") },
    { id: "titled", icon: Trophy, earned: titles.length >= 1, label: t("Titled", "Unvonli", "Титулованный") },
  ];
  const earnedBadges = badges.filter(b => b.earned).length;

  return (
    <div className="min-h-screen bg-background text-foreground page relative pb-24">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-30" />

      <div className="shell relative z-10 max-w-6xl mx-auto pt-6">
        
        {/* HERO BANNER SECTION */}
        <div className="relative rounded-3xl overflow-hidden mb-12 shadow-2xl shadow-primary/5 border border-border/50 bg-card/20 backdrop-blur-md">
          {/* Cover Photo Area */}
          <div className="h-40 md:h-56 bg-gradient-to-r from-primary/20 via-primary/5 to-background relative overflow-hidden">
            <div className="absolute inset-0 cyber-dots opacity-40"></div>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-12 opacity-10">
              <Hexagon className="w-48 h-48 md:w-64 md:h-64 text-primary animate-[spin_60s_linear_infinite]" />
            </div>
            {/* Fade to bottom */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card/80 to-transparent"></div>
          </div>
          
          {/* Profile Details (Overlapping the banner) */}
          <div className="px-6 md:px-12 pb-8 pt-0 relative flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            
            {/* Avatar */}
            <div className="-mt-16 md:-mt-24 shrink-0 relative group z-20">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-background border-4 border-background rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:border-primary/50 shadow-2xl shadow-primary/20">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.nickname} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-5xl md:text-7xl font-black text-primary bg-muted w-full h-full flex items-center justify-center">
                    {profile.nickname[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 w-8 h-8 md:w-10 md:h-10 bg-primary border-4 border-background rounded-full flex items-center justify-center text-primary-foreground shadow-lg">
                <Shield className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left mb-2 md:mb-4 w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{profile.nickname}</h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 shadow-lg shadow-primary/20">
                      {t("Lvl", "Dja", "Ур")} {level}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground flex-wrap">
                    {profile.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-muted-foreground/70"/> {profile.email}
                      </span>
                    )}
                    {profile.openToWork && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-500">
                        <Briefcase className="w-3.5 h-3.5" /> {t("Open to work", "Ishga tayyor", "Открыт для работы")}
                      </span>
                    )}
                  </div>

                  {/* Titles */}
                  {titles.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                      {titles.map(title => (
                        <span 
                          key={title.id} 
                          className="px-3 py-1 bg-muted/50 border border-border/50 rounded-lg text-xs font-medium text-foreground cursor-default"
                        >
                          {title.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3 mt-4 md:mt-0 shrink-0">
                  <Button onClick={handleShare} variant="outline" className="rounded-xl border-border/50 hover:bg-muted bg-background/50 backdrop-blur-sm h-11 px-5">
                    <Share2 className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t("Share", "Ulashish", "Поделиться")}</span>
                  </Button>
                  {isOwn && (
                    <Link href="/profile/edit">
                      <Button className="cyber-button rounded-xl h-11 px-6">
                        {t("Edit profile", "Tahrirlash", "Редактировать")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isOwn && <ReferralPanel />}

        {/* BENTO GRID STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 mt-8">
          <div className="glass-card bg-card/40 p-6 rounded-3xl border border-border/50 flex flex-col items-center justify-center text-center hover:bg-card/60 transition-all duration-300 hover:border-primary/30 group">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold text-foreground leading-none tabular-nums mb-1">{profile.points}</span>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("Points", "Ball", "Очки")}</span>
          </div>
          <div className="glass-card bg-card/40 p-6 rounded-3xl border border-border/50 flex flex-col items-center justify-center text-center hover:bg-card/60 transition-all duration-300 hover:border-amber-500/30 group">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold text-amber-500 leading-none tabular-nums mb-1">#{profile.rank}</span>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("Global Rank", "O'rin", "Место")}</span>
          </div>
          <div className="glass-card bg-card/40 p-6 rounded-3xl border border-border/50 flex flex-col items-center justify-center text-center hover:bg-card/60 transition-all duration-300 hover:border-blue-500/30 group">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Flag className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold text-foreground leading-none tabular-nums mb-1">{solvedCtf.length}</span>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("CTFs Solved", "Yechilgan", "Решено")}</span>
          </div>
          <div className="glass-card bg-card/40 p-6 rounded-3xl border border-border/50 flex flex-col items-center justify-center text-center hover:bg-card/60 transition-all duration-300 hover:border-emerald-500/30 group">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold text-foreground leading-none tabular-nums mb-1">{longestStreak}</span>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("Day Streak", "Kunlik seriya", "Серия дней")}</span>
          </div>
        </div>

        {/* CONTENT COLUMNS */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Skills & Badges */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Badges */}
            <section className="glass-card bg-card/40 p-6 md:p-8 border border-border/50 rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  {t("Badges", "Nishonlar", "Значки")}
                </h2>
                <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-md text-muted-foreground">{earnedBadges}/{badges.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {badges.map(b => (
                  <div key={b.id} className="group flex flex-col items-center gap-2.5 text-center" title={b.label}>
                    <div className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 ${b.earned ? "bg-primary/10 text-primary border border-primary/20 group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_rgba(var(--primary),0.2)]" : "bg-muted/30 text-muted-foreground/30 border border-transparent grayscale"}`}>
                      <b.icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider leading-tight ${b.earned ? "text-foreground" : "text-muted-foreground/40"}`}>{b.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills */}
            {skills.length > 0 && (
              <section className="glass-card bg-card/40 p-6 md:p-8 border border-border/50 rounded-3xl">
                <h2 className="text-base font-semibold mb-8 flex items-center gap-2">
                  <Hexagon className="w-5 h-5 text-primary" />
                  {t("Skills Matrix", "Ko'nikmalar", "Навыки")}
                </h2>
                <div className="space-y-5">
                  {skills.slice(0, 8).map(skill => (
                    <div key={skill.category} className="group">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">{skill.category}</span>
                        <span className="text-muted-foreground tabular-nums text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">{skill.solved}/{skill.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden relative">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000 ease-out relative" style={{ width: `${Math.round((skill.progress || 0) * 100)}%` }}>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: Activity & History */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* CTFs */}
            <section className="glass-card bg-card/40 p-6 md:p-8 border border-border/50 rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {t("Recent Solves", "Yechilgan topshiriqlar", "Решённые задания")}
                </h2>
                <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">{solvedCtf.length} {t("Total", "Jami", "Всего")}</span>
              </div>

              {solvedCtf.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-border/50 bg-muted/10">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">{t("Nothing solved yet", "Hali hech narsa yechilmagan", "Пока ничего не решено")}</p>
                  {isOwn && (
                    <Link href="/ctf">
                      <Button variant="link" className="mt-2 text-primary">{t("Solve your first challenge", "Birinchi topshiriqni yeching", "Решите первое задание")}</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {solvedCtf.map(ctf => (
                    <div key={ctf.id} className="group relative flex items-center justify-between p-5 md:p-6 rounded-2xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-300"></div>
                      
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg shadow-primary/5 shrink-0">
                          <Flag className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base md:text-lg leading-tight group-hover:text-primary transition-colors">{ctf.name}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">{ctf.category}</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3 h-3" />
                              {new Date(ctf.solvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end shrink-0 pl-4">
                        <span className="text-xl md:text-2xl font-black text-primary tabular-nums">+{ctf.points}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">{t("points", "ball", "очки")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Lessons & Competitions */}
            {(completedLessons.length > 0 || competitionHistory.length > 0) && (
              <div className="grid md:grid-cols-2 gap-8">
                {completedLessons.length > 0 && (
                  <section className="glass-card bg-card/40 p-6 md:p-8 border border-border/50 rounded-3xl">
                    <h2 className="text-base font-semibold mb-8 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      {t("Academy Progress", "Akademiya", "Академия")}
                    </h2>
                    <div className="space-y-6">
                      {completedLessons.slice(0, 5).map((lesson) => (
                        <div key={lesson.id} className="group relative pl-6">
                          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all"></div>
                          <div className="absolute left-[3px] top-4 bottom-[-16px] w-[2px] bg-border last:hidden"></div>
                          <div className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">{lesson.title}</div>
                          <div className="text-xs text-muted-foreground mt-1.5 font-mono bg-muted/50 inline-block px-2 py-0.5 rounded">+{lesson.points} pts</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {competitionHistory.length > 0 && (
                  <section className="glass-card bg-card/40 p-6 md:p-8 border border-border/50 rounded-3xl">
                    <h2 className="text-base font-semibold mb-8 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      {t("Tournaments", "Musobaqalar", "Турниры")}
                    </h2>
                    <div className="space-y-6">
                      {competitionHistory.map(comp => (
                        <div key={comp.competitionId} className="group relative pl-6">
                          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all"></div>
                          <div className="absolute left-[3px] top-4 bottom-[-16px] w-[2px] bg-border last:hidden"></div>
                          <div className="text-sm font-semibold leading-tight group-hover:text-amber-500 transition-colors">{comp.competitionName}</div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">#{comp.rank}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">+{comp.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
