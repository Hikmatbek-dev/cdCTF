import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, BookOpen, ChevronRight, Flag, Star, Trophy, Shield, GraduationCap, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeArray } from "@/lib/api-shapes";

type DashboardResponse = {
  user: { id: number; nickname: string; points: number; rank: number };
  progress: { solvedCtfCount: number; completedLessonCount: number; titleCount: number };
  recent: {
    solvedCtf: Array<{ ctfId: number; solvedAt: string | null }>;
    completedLessons: Array<{ lessonId: number; completedAt: string | null }>;
  };
  titles: Array<{ id: number | null; name: string | null; category: string | null; earnedAt: string | null }>;
};

async function fetchDashboard() {
  const response = await fetch("/api/users/me/dashboard", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to load dashboard");
  return response.json() as Promise<DashboardResponse>;
}

export default function DashboardPage() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-dashboard"],
    queryFn: fetchDashboard,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-32 w-full bg-muted rounded-[2.5rem]" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-32 bg-muted rounded-[2rem]" />
            <Skeleton className="h-32 bg-muted rounded-[2rem]" />
            <Skeleton className="h-32 bg-muted rounded-[2rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const solvedCtf = normalizeArray<DashboardResponse["recent"]["solvedCtf"][number]>(data.recent?.solvedCtf, ["solvedCtf", "data", "items"]);
  const completedLessons = normalizeArray<DashboardResponse["recent"]["completedLessons"][number]>(data.recent?.completedLessons, ["completedLessons", "data", "items"]);
  const titles = normalizeArray<DashboardResponse["titles"][number]>(data.titles, ["titles", "data", "items"]);

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-primary" />
              <div className="h-px w-12 bg-border" />
              <span className="eyebrow">{t("cdCTF · Dashboard", "cdCTF · Panel", "cdCTF · Панель")}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
              {t("Dashboard", "Boshqaruv paneli", "Панель управления")}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{data.user.nickname}</span>
              <span>{t("Rank", "O'rin", "Место")} <span className="text-primary tabular-nums">#{data.user.rank}</span></span>
              <span className="tabular-nums">{data.user.points} {t("points", "ball", "очки")}</span>
            </div>
          </div>
          <Link href={`/profile/${data.user.id}`}>
            <Button className="cyber-button h-14 px-10 rounded-2xl shadow-xl shadow-primary/20">
              {t("View profile", "Profilni ko'rish", "Смотреть профиль")}
            </Button>
          </Link>
        </div>

        {/* Onboarding nudge. Almost every account solves challenges and never
            starts a lesson; a returning learner who has completed none gets a
            clear first step toward the curriculum rather than a wall of stats. */}
        {data.progress.completedLessonCount === 0 && (
          <Link href="/modules" className="block mb-10">
            <div className="glass-card !p-8 border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 neon-glow">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="eyebrow mb-1">{t("Get started", "Boshlang", "Начните")}</div>
                  <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {t("Start your first lesson", "Birinchi darsingizni boshlang", "Начните первый урок")}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Eight modules, from your first command to full attack chains.", "Sakkiz modul — birinchi buyruqdan to'liq hujum zanjirigacha.", "Восемь модулей — от первой команды до полных цепочек атаки.")}
                  </p>
                </div>
              </div>
              <button className="cyber-button h-11 px-6 shrink-0">
                {t("Start module 01", "01-moduldan boshlash", "Начать с модуля 01")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Link>
        )}

        {/* Progress metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Flag, label: t("Solved", "Yechilgan", "Решено"), value: data.progress.solvedCtfCount, color: "text-primary" },
            { icon: BookOpen, label: t("Lessons done", "Tugatilgan dars", "Уроков пройдено"), value: data.progress.completedLessonCount, color: "text-foreground" },
            { icon: Star, label: t("Titles", "Unvonlar", "Титулы"), value: data.progress.titleCount, color: "text-foreground" }
          ].map((stat, i) => (
            <div key={i} className="glass-card bg-muted/10 p-10 rounded-[2.5rem] group hover:bg-muted/20 transition-all border-border hover:border-primary/20">
              <div className="flex items-center gap-4 mb-6">
                <stat.icon className={`w-5 h-5 ${stat.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-5xl font-bold tracking-tight leading-none tabular-nums">{String(stat.value).padStart(2, '0')}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Mission Stream */}
          <div className="lg:col-span-3">
            <div className="glass-card bg-muted/10 p-10 rounded-[3rem] border-border h-full">
              <div className="flex items-center gap-4 mb-10">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight">{t("Recent activity", "So'nggi faoliyat", "Недавняя активность")}</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <div className="space-y-4">
                {solvedCtf.map((item) => (
                  <Link key={`ctf-${item.ctfId}`} href={`/ctf/${item.ctfId}`}>
                    <div className="bg-muted/20 p-6 flex items-center justify-between hover:bg-muted/40 transition-all group rounded-2xl cursor-pointer border border-transparent hover:border-primary/20">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Flag className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium group-hover:text-primary transition-colors">{t("Challenge solved", "Topshiriq yechildi", "Задание решено")}</div>
                          <div className="text-xs text-muted-foreground mt-1">#{item.ctfId}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
                
                {completedLessons.map((item) => (
                  <Link key={`lesson-${item.lessonId}`} href={`/learn/${item.lessonId}`}>
                    <div className="bg-muted/20 p-6 flex items-center justify-between hover:bg-muted/40 transition-all group rounded-2xl cursor-pointer border border-transparent hover:border-primary/20">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium group-hover:text-primary transition-colors">{t("Lesson completed", "Dars tugatildi", "Урок пройден")}</div>
                          <div className="text-xs text-muted-foreground mt-1">#{item.lessonId}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
                
                {solvedCtf.length === 0 && completedLessons.length === 0 && (
                  <div className="py-24 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                    <p className="text-sm text-muted-foreground">
                      {t("NO_STREAMS_DETECTED", "FAOLLIK YO'Q", "ПОТОКИ_ДАННЫХ_ОТСУТСТВУЮТ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="lg:col-span-2">
            <div className="glass-card bg-primary/5 p-10 rounded-[3rem] border-primary/20 h-full">
              <div className="flex items-center gap-4 mb-10">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight">{t("Titles", "Unvonlar", "Титулы")}</h2>
                <div className="flex-1 h-px bg-primary/20" />
              </div>
              
              <div className="flex flex-wrap gap-3">
                {titles.length > 0 ? titles.map((title, index) => (
                  <div key={`${title.id ?? "title"}-${index}`} className="px-4 py-2.5 bg-primary/10 border border-primary/30 text-sm font-medium text-primary rounded-xl hover:bg-primary/20 transition-all cursor-default shadow-sm">
                    {title.name ?? t("Untitled", "Nomsiz", "Без названия")}
                  </div>
                )) : (
                  <div className="text-center py-20 w-full border border-dashed border-primary/20 rounded-[2.5rem]">
                    <p className="text-sm leading-relaxed text-muted-foreground px-8">
                      {t("INSUFFICIENT_DATA_FOR_TITLES", "UNVONLAR YO'Q", "НЕДОСТАТОЧНО_ДАННЫХ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
