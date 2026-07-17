import { Users, Flag, BookOpen, Trophy, AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminDashboardPage() {
  const { t } = useLang();
  const { data, isLoading } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });
  const mostSolvedCtf = normalizeArray<any>(data?.mostSolvedCtf, ["mostSolvedCtf", "ctf", "data", "items"]);
  const mostActiveUsers = normalizeArray<any>(data?.mostActiveUsers, ["mostActiveUsers", "users", "data", "items"]);
  const registrationHistory = normalizeArray<any>((data as any)?.registrationHistory, ["registrationHistory", "data", "items"]);
  const categoryDistribution = normalizeArray<any>((data as any)?.categoryDistribution, ["categoryDistribution", "data", "items"]);

  const stats = data ? [
    { icon: Users, label: t("Total Users", "Jami Foydalanuvchilar", "Всего пользователей"), value: data.totalUsers, sub: `${data.activeUsers} ${t("active", "faol", "активных")}` },
    { icon: Flag, label: t("CTF Challenges", "CTF Topshiriqlari", "CTF Заданий"), value: data.totalCtf },
    { icon: BookOpen, label: t("Lessons", "Darslar", "Уроков"), value: data.totalLessons },
    { icon: Trophy, label: t("Competitions", "Musobaqalar", "Соревнований"), value: data.totalCompetitions },
    { icon: TrendingUp, label: t("Avg Test Score", "O'rtacha Test", "Ср. баoll теста"), value: `${Math.round(data.averageTestResult * 100)}%` },
    { icon: AlertTriangle, label: t("Blocked Tasks", "Bloklangan", "Заблокировано"), value: data.blockedTasksCount, danger: true },
  ] : [];

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-5xl">
        <h1 className="text-xl font-bold mb-6">{t("Dashboard", "Boshqaruv Paneli", "Панель управления")}</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`p-4 rounded-xl border bg-card ${s.danger ? "border-destructive/30" : "border-border"}`} data-testid={`stat-card-${i}`}>
                  <Icon className={`w-4 h-4 mb-2 ${s.danger ? "text-destructive" : "text-primary"}`} />
                  <div className={`text-2xl font-mono font-bold ${s.danger ? "text-destructive" : "text-primary"}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  {s.sub && <div className="text-xs text-muted-foreground">{s.sub}</div>}
                </div>
              );
            })}
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">{t("Registration Growth", "Ro'yxatdan o'tish", "Регистрации")}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={registrationHistory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.split("-").slice(1).join("/")} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">{t("Challenge Distribution", "Topshiriqlar taqsimoti", "Распределение заданий")}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        cursor={{ fill: "hsl(var(--muted)/0.1)" }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Most Solved CTF */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">{t("Most Solved CTFs", "Ko'p Yechilgan CTFlar", "Самые решаемые CTF")}</h2>
                <div className="space-y-2">
                  {mostSolvedCtf.map((ctf, i) => (
                    <div key={ctf.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                      <span className="w-5 font-mono text-muted-foreground text-xs">#{i + 1}</span>
                      <span className="flex-1 truncate font-medium">{ctf.name}</span>
                      <span className="font-mono text-xs text-primary font-bold">{ctf.solvedCount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Active Users */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">{t("Most Active Users", "Faol Foydalanuvchilar", "Самые активные")}</h2>
                <div className="space-y-2">
                  {mostActiveUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                      <span className="w-5 font-mono text-muted-foreground text-xs">#{i + 1}</span>
                      <span className="flex-1 truncate font-medium">{u.nickname}</span>
                      <span className="font-mono text-xs text-primary font-bold">{u.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
