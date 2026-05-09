import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, BookOpen, ChevronRight, Flag, Star, Trophy } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
  const response = await fetch("/api/users/me/dashboard");
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
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-56" />
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">{t("Dashboard", "Dashboard", "Панель")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.user.nickname} • #{data.user.rank} • {data.user.points} pts
            </p>
          </div>
          <Link href={`/profile/${data.user.id}`}>
            <Button variant="outline" size="sm">
              {t("Open Profile", "Profilni ochish", "Открыть профиль")}
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><Flag className="w-4 h-4 text-primary" /><span className="text-sm font-medium">{t("Solved CTFs", "Yechilgan CTFlar", "Решённые CTF")}</span></div>
            <div className="text-3xl font-mono font-bold text-primary">{data.progress.solvedCtfCount}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-primary" /><span className="text-sm font-medium">{t("Completed Lessons", "Tugagan darslar", "Завершённые уроки")}</span></div>
            <div className="text-3xl font-mono font-bold text-primary">{data.progress.completedLessonCount}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-primary" /><span className="text-sm font-medium">{t("Titles", "Unvonlar", "Титулы")}</span></div>
            <div className="text-3xl font-mono font-bold text-primary">{data.progress.titleCount}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">{t("Recent Activity", "So'nggi faollik", "Последняя активность")}</h2>
            </div>
            <div className="space-y-3">
              {data.recent.solvedCtf.map((item) => (
                <Link key={`ctf-${item.ctfId}`} href={`/ctf/${item.ctfId}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{t("Solved challenge", "Yechilgan topshiriq", "Решённое задание")} #{item.ctfId}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
              {data.recent.completedLessons.map((item) => (
                <Link key={`lesson-${item.lessonId}`} href={`/learn/${item.lessonId}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{t("Completed lesson", "Tugatilgan dars", "Завершённый урок")} #{item.lessonId}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
              {data.recent.solvedCtf.length === 0 && data.recent.completedLessons.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("No recent activity yet", "Hali faollik yo'q", "Пока нет активности")}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">{t("Earned Titles", "Olingan unvonlar", "Полученные титулы")}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.titles.length > 0 ? data.titles.map((title, index) => (
                <span key={`${title.id ?? "title"}-${index}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {title.name ?? t("Untitled", "Nomsiz", "Без названия")}
                </span>
              )) : (
                <p className="text-sm text-muted-foreground">{t("Solve more categories to unlock titles", "Ko'proq kategoriyalarni yechib unvon oching", "Решайте больше категорий, чтобы открыть титулы")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
