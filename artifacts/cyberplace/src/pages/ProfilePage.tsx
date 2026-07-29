import { useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Trophy, BookOpen, Target, Calendar, Share2, Shield, Briefcase, Flame, Flag, Star, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
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
      <div className="min-h-screen bg-background page">
        <div className="max-w-5xl mx-auto space-y-8">
          <Skeleton className="h-64 w-full bg-muted rounded-xl" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96 bg-muted rounded-xl" />
            <Skeleton className="h-96 bg-muted rounded-xl" />
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

  // Badges — milestones computed from the numbers the profile already carries,
  // so there is nothing to award or store. Earned ones show in colour, the rest
  // stay locked as a goal to chase.
  const longestStreak = (profile as any).longestStreak ?? 0;
  const level = levelFromPoints(profile.points).level;
  const badges = [
    { id: "first-solve", icon: Flag, earned: solvedCtf.length >= 1, label: t("First solve", "Ilk yechim", "Первое решение") },
    { id: "first-lesson", icon: BookOpen, earned: completedLessons.length >= 1, label: t("First lesson", "Ilk dars", "Первый урок") },
    { id: "ten-solves", icon: Target, earned: solvedCtf.length >= 10, label: t("10 solves", "10 yechim", "10 решений") },
    { id: "fifty-solves", icon: Award, earned: solvedCtf.length >= 50, label: t("50 solves", "50 yechim", "50 решений") },
    { id: "streak-7", icon: Flame, earned: longestStreak >= 7, label: t("7-day streak", "7 kunlik seriya", "7 дней подряд") },
    { id: "streak-30", icon: Flame, earned: longestStreak >= 30, label: t("30-day streak", "30 kunlik seriya", "30 дней подряд") },
    { id: "level-5", icon: Star, earned: level >= 5, label: t("Level 5", "5-daraja", "Уровень 5") },
    { id: "titled", icon: Trophy, earned: titles.length >= 1, label: t("First title", "Ilk unvon", "Первый титул") },
  ];
  const earnedBadges = badges.filter(b => b.earned).length;

  // No `overflow-hidden` on the root: it clipped the fixed backdrop below, and
  // on a page whose content can exceed the viewport it is a way to lose content
  // rather than a way to tidy it.
  return (
    <div className="min-h-screen bg-background text-foreground page relative">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="shell relative z-10">
        {/* Profile Dossier Header */}
        <div className="glass-card bg-muted/10 border-border p-10 mb-12 relative overflow-hidden rounded-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield className="w-64 h-64 text-primary" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-12 relative z-10">
            <div className="shrink-0 relative group">
              <div className="w-40 h-40 bg-muted border-2 border-border p-1 rounded-xl flex items-center justify-center relative overflow-hidden transition-all group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/20">
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
                  <div className="eyebrow mb-4">
                    {t("Profile", "Profil", "Профиль")}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1>{profile.nickname}</h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 shrink-0" data-testid="profile-level">
                      {t("Lvl", "Dja", "Ур")} {levelFromPoints(profile.points).level}
                    </span>
                  </div>
                  {profile.openToWork && (
                    <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400" data-testid="badge-open-to-work">
                      <Briefcase className="w-3.5 h-3.5" /> {t("Open to work", "Ishga tayyor", "Открыт для работы")}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {profile.email}
                  </p>
                </div>
                <div className="flex items-center gap-4 justify-center md:justify-end">
                  <Button onClick={handleShare} variant="outline" className="h-12 px-6 rounded-xl border-border hover:bg-muted">
                    <Share2 className="w-4 h-4 mr-2" />
                    {t("Share", "Ulashish", "Поделиться")}
                  </Button>
                  {isOwn && (
                    <Link href="/profile/edit">
                      <Button className="cyber-button h-12 px-8">
                        {t("Edit profile", "Profilni tahrirlash", "Редактировать")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 pt-10 border-t border-border">
                <div>
                  <span className="text-xs text-muted-foreground block mb-2">{t("Points", "Ball", "Очки")}</span>
                  <span className="text-4xl font-bold text-foreground leading-none tabular-nums">{profile.points}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-2">{t("Rank", "O'rin", "Место")}</span>
                  <span className="text-4xl font-bold text-primary leading-none tabular-nums">#{profile.rank}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-xs text-muted-foreground block mb-2">{t("Solved", "Yechilgan", "Решено")}</span>
                  <span className="text-4xl font-bold text-foreground leading-none tabular-nums">{solvedCtf.length}</span>
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
                  className="px-4 py-2 bg-muted/50 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-all cursor-default"
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
                  <h2 className="text-lg font-semibold tracking-tight">{t("Solved challenges", "Yechilgan topshiriqlar", "Решённые задания")}</h2>
                </div>
                <span className="text-sm text-muted-foreground">{solvedCtf.length}</span>
              </div>

              {solvedCtf.length === 0 ? (
                <div className="glass-card bg-muted/5 border-dashed border-border py-24 text-center rounded-xl">
                  <p className="text-muted-foreground">{t("Nothing solved yet", "Hali hech narsa yechilmagan", "Пока ничего не решено")}</p>
                  {isOwn && (
                    <Link href="/ctf">
                      <Button variant="link" className="mt-4 text-primary">{t("Solve your first challenge", "Birinchi topshiriqni yeching", "Решите первое задание")}</Button>
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
                          <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">{ctf.name}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">{ctf.category}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(ctf.solvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary tabular-nums">+{ctf.points}</span>
                        <div className="text-xs text-muted-foreground mt-1">{t("points", "ball", "очки")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-12">
            {/* Badges — milestones, earned in colour, locked ones greyed. */}
            <section className="glass-card p-8 border-border rounded-xl" data-testid="badges">
              <h2 className="text-sm font-semibold text-muted-foreground mb-8 flex items-center gap-2">
                <Award className="w-4 h-4" />
                {t("Badges", "Nishonlar", "Значки")}
                <span className="ml-auto text-xs tabular-nums">{earnedBadges}/{badges.length}</span>
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {badges.map(b => (
                  <div key={b.id} className="flex flex-col items-center gap-2 text-center" data-testid={`badge-${b.id}`} title={b.label}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${b.earned ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/30 text-muted-foreground/40"}`}>
                      <b.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs leading-tight ${b.earned ? "text-foreground" : "text-muted-foreground/40"}`}>{b.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Skill tree — mastery per CTF category. */}
            {skills.length > 0 && (
              <section className="glass-card p-8 border-border rounded-xl" data-testid="skill-tree">
                <h2 className="text-sm font-semibold text-muted-foreground mb-8 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t("Skills", "Mahoratlar", "Навыки")}
                </h2>
                <div className="space-y-5">
                  {skills.slice(0, 8).map(skill => (
                    <div key={skill.category}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-foreground">{skill.category}</span>
                        <span className="text-muted-foreground tabular-nums">{skill.solved}/{skill.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((skill.progress || 0) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Academy Logs */}
            {completedLessons.length > 0 && (
              <section className="glass-card p-8 bg-primary/5 border-primary/20 rounded-xl">
                <h2 className="text-sm font-semibold text-primary mb-8 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {t("Completed lessons", "Tugatilgan darslar", "Пройденные уроки")}
                </h2>
                <div className="space-y-8">
                  {completedLessons.slice(0, 5).map(lesson => (
                    <div key={lesson.id} className="relative pl-6 border-l-2 border-primary/20">
                      <div className="text-sm font-medium mb-1 leading-tight hover:text-primary transition-colors cursor-pointer">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">+{lesson.points} {t("points", "ball", "очки")}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tournament Records */}
            {competitionHistory.length > 0 && (
              <section className="glass-card p-8 border-border rounded-xl">
                <h2 className="text-sm font-semibold text-muted-foreground mb-8 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {t("Competitions", "Musobaqalar", "Соревнования")}
                </h2>
                <div className="space-y-8">
                  {competitionHistory.map(comp => (
                    <div key={comp.competitionId} className="group">
                      <div className="text-sm font-medium mb-1 leading-tight group-hover:text-primary transition-colors cursor-pointer">{comp.competitionName}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {t("Place", "O'rin", "Место")} #{comp.rank}
                        </div>
                        <span className="text-xs font-medium text-foreground tabular-nums">+{comp.points}</span>
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
