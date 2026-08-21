import { Users, Flag, BookOpen, Trophy, AlertTriangle, TrendingUp, ShieldCheck, Sparkles, Activity, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { LoadFailure } from "@/components/LoadFailure";
import { FadeIn } from "@/components/PageTransition";

export default function AdminDashboardPage() {
  const { t } = useLang();
  const { data, isLoading, isError, refetch } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });
  const mostSolvedCtf = normalizeArray<any>(data?.mostSolvedCtf, ["mostSolvedCtf", "ctf", "data", "items"]);
  const mostActiveUsers = normalizeArray<any>(data?.mostActiveUsers, ["mostActiveUsers", "users", "data", "items"]);
  const registrationHistory = normalizeArray<any>((data as any)?.registrationHistory, ["registrationHistory", "data", "items"]);
  const categoryDistribution = normalizeArray<any>((data as any)?.categoryDistribution, ["categoryDistribution", "data", "items"]);

  const stats = data ? [
    { icon: Users, label: t("Total Users", "Jami Foydalanuvchilar", "Всего пользователей"), value: data.totalUsers, sub: `${data.activeUsers} ${t("active", "faol", "активных")}` },
    { icon: Bell, label: t("Notification Subscribers", "Bildirishnoma A'zolari", "Подписчики Уведомлений"), value: (data as any).notificationSubscribers ?? 0 },
    { icon: Flag, label: t("CTF Challenges", "CTF Topshiriqlari", "CTF Заданий"), value: data.totalCtf },
    { icon: BookOpen, label: t("Lessons & Modules", "Dars va Modullar", "Уроки и Модули"), value: data.totalLessons },
    { icon: Trophy, label: t("Competitions", "Musobaqalar", "Соревнования"), value: data.totalCompetitions },
    { icon: AlertTriangle, label: t("Blocked Tasks", "Bloklangan Topshiriqlar", "Заблокировано"), value: data.blockedTasksCount, danger: true },
  ] : [];

  return (
    <div className="flex min-h-screen bg-background text-foreground pt-28 md:pt-20 relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-30" />
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-8 max-w-6xl relative z-10">
        <FadeIn>
          {/* Dashboard Command Center Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
            <div>
              <div className="eyebrow mb-1 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                {t("CyberRange Admin Command Center", "Boshqaruv Tizimi", "Панель Управления")}
              </div>
              <h1 className="text-3xl font-display font-black tracking-tight">
                <span className="gradient-text">{t("Platform Overview & Telemetry", "Platforma Analitikasi", "Обзор и Телеметрия")}</span>
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-mono font-bold text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" />
              {t("System Status: Operational", "Tizim: Barqaror Ishlamoqda", "Система: Работает")}
            </div>
          </div>
        </FadeIn>

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-muted" />)}
          </div>
        ) : (
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className={`glass-card p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${s.danger ? "border-destructive/40 bg-destructive/5" : "border-primary/20"}`} data-testid={`stat-card-${i}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${s.danger ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/10 border-primary/30 text-primary"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {s.sub && <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{s.sub}</span>}
                    </div>
                    <div className={`text-3xl font-display font-black tracking-tight ${s.danger ? "text-destructive" : "text-foreground"}`}>{s.value}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-1 font-semibold">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        )}

        {data && (
          <FadeIn delay={0.2}>
            <div className="space-y-8">
              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl border-border">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t("Registration Velocity", "Ro'yxatdan O'tish Oqimi", "Динамика Регистраций")}
                    </h2>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={registrationHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => val.split("-").slice(1).join("/")} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--primary)/0.3)", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)" }}
                          itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px", fontWeight: "bold" }}
                        />
                        <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border-border">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t("Category Challenge Volume", "Kategoriyalar Taqsimoti", "Категории Заданий")}
                    </h2>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--primary)/0.3)", borderRadius: "12px" }}
                          cursor={{ fill: "hsl(var(--primary)/0.05)" }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Leader lists */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl border-border">
                  <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-4">{t("Top Solved CTF Challenges", "Eng Ko'p Yechilgan CTFlar", "Популярные Задания")}</h2>
                  <div className="space-y-2.5">
                    {mostSolvedCtf.map((ctf, i) => (
                      <div key={ctf.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-colors text-sm">
                        <span className="w-6 font-mono font-bold text-xs text-primary text-center">#{i + 1}</span>
                        <span className="flex-1 truncate font-semibold">{ctf.name}</span>
                        <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">{ctf.solvedCount} {t("solves", "yechim", "решений")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border-border">
                  <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-4">{t("Most Active Platform Hackers", "Eng Faol Foydalanuvchilar", "Самые Активные")}</h2>
                  <div className="space-y-2.5">
                    {mostActiveUsers.map((u, i) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-colors text-sm">
                        <span className="w-6 font-mono font-bold text-xs text-primary text-center">#{i + 1}</span>
                        <span className="flex-1 truncate font-semibold">{u.nickname}</span>
                        <span className="font-mono text-xs text-primary font-bold bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">{u.points} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  );
}

