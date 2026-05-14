import { useRoute, Link } from "wouter";
import { Trophy, Flag, BookOpen, Target, Calendar, Star, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { normalizeArray } from "@/lib/api-shapes";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const { t } = useLang();
  const { user: currentUser } = useAuth();
  const id = params?.id ? Number(params.id) : currentUser?.id;

  const { data: profile, isLoading } = useGetUserProfile(id as number, {
    query: { enabled: !!id, queryKey: getGetUserProfileQueryKey(id as number) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("User not found", "Foydalanuvchi topilmadi", "Пользователь не найден")}</p>
          <Link href="/scoreboard">
            <Button variant="outline">{t("Go to Scoreboard", "Reytingga o'tish", "В рейтинг")}</Button>
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

  return (
    <div className="min-h-screen bg-background pt-14 pb-12">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary flex-shrink-0 shadow-inner overflow-hidden border-2 border-primary/20">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.nickname} className="w-full h-full object-cover" />
              ) : (
                profile.nickname[0].toUpperCase()
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{profile.nickname}</h1>
                  <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                    {profile.email}
                    {(profile as any).emailVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </p>
                </div>
                {isOwn && (
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm" className="rounded-full px-5">
                      {t("Edit Profile", "Profilni Tahrirlash", "Редактировать")}
                    </Button>
                  </Link>
                )}
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-6 pt-6 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("Points", "Ballar", "Очки")}</span>
                  <span className="text-xl font-mono font-bold text-primary">{profile.points}</span>
                </div>
                <div className="w-px h-8 bg-border/50 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("Rank", "Reyting", "Место")}</span>
                  <span className="text-xl font-mono font-bold text-foreground">#{profile.rank}</span>
                </div>
                <div className="w-px h-8 bg-border/50 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{t("Solves", "Yechimlar", "Решений")}</span>
                  <span className="text-xl font-mono font-bold text-foreground">{solvedCtf.length}</span>
                </div>
              </div>

              {/* Titles Section (Directly under info) */}
              {titles.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-6">
                  {titles.map(title => (
                    <span 
                      key={title.id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wide"
                    >
                      <Star className="w-3 h-3 fill-primary/20" />
                      {title.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-6 text-xs text-muted-foreground italic">
                  {t("No titles earned yet", "Unvonlar hali yo'q", "Титулов пока нет")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {/* Solved CTF Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Flag className="w-5 h-5 text-primary" />
                {t("Solved CTF Challenges", "Yechilgan CTF Topshiriqlari", "Решённые CTF")}
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {solvedCtf.length} {t("total", "jami", "всего")}
              </span>
            </div>

            {solvedCtf.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
                <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">{t("No challenges solved yet", "Topshiriqlar yechilmagan", "Нет решённых заданий")}</p>
                <Link href="/ctf">
                  <Button variant="link" className="mt-2 text-primary">{t("Browse Challenges", "Topshiriqlarni ko'rish", "Посмотреть задания")}</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {solvedCtf.map(ctf => (
                  <div key={ctf.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Target className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{ctf.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ctf.category}</span>
                        {ctf.solvedAt && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(ctf.solvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-primary">+{ctf.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lessons Section */}
          {completedLessons.length > 0 && (
            <section className="pt-6 border-t border-border/50">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t("Educational Progress", "O'quv Jarayoni", "Образовательный процесс")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {completedLessons.map(lesson => (
                  <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="flex-1 truncate">{lesson.title}</span>
                    <span className="font-mono text-xs text-primary font-bold">+{lesson.points}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Competition History */}
          {competitionHistory.length > 0 && (
            <section className="pt-6 border-t border-border/50">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {t("Competition History", "Musobaqa Tarixi", "История соревнований")}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {competitionHistory.map(comp => (
                  <div key={comp.competitionId} className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between gap-2 shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-bold text-sm truncate">{comp.competitionName}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        Rank #{comp.rank}
                      </div>
                      <span className="font-mono text-xs font-bold text-primary">{comp.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
