import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { LoadFailure } from "@/components/LoadFailure";

export default function AdminStatisticsPage() {
  const { t } = useLang();
  const { data, isLoading, isError, refetch } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });

  const dailyVisits = normalizeArray<any>((data as any)?.dailyVisits, ["dailyVisits", "data", "items"]);
  const activeUsersDuration = normalizeArray<any>((data as any)?.activeUsersDuration, ["activeUsersDuration", "data", "items"]);
  const mostEngagedActivities = normalizeArray<any>((data as any)?.mostEngagedActivities, ["mostEngagedActivities", "data", "items"]);

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-5xl">
        <h1 className="text-xl font-bold mb-6">{t("Statistics", "Umumiy Statistika", "Общая статистика")}</h1>

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-xl w-full" />
            <Skeleton className="h-64 rounded-xl w-full" />
            <Skeleton className="h-64 rounded-xl w-full" />
          </div>
        ) : data && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Daily Visits */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                  {t("Daily Visits", "Kunlik Kirishlar", "Дневные визиты")}
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyVisits}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.split("-").slice(1).join("/")} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px" }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Most Engaged Activities */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                  {t("Most Engaged Activities", "Eng ko'p qilingan amallar", "Самые популярные действия")}
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostEngagedActivities} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="action" type="category" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        cursor={{ fill: "hsl(var(--muted)/0.1)" }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Active Users Duration */}
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  {t("User Activity Duration", "Foydalanuvchi faollik vaqti", "Время активности пользователей")}
                </h2>
                <div className="space-y-2">
                  {activeUsersDuration.map((u: any, i: number) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                      <span className="w-5 font-mono text-muted-foreground text-xs">#{i + 1}</span>
                      <span className="flex-1 truncate font-medium">{u.nickname}</span>
                      <span className="font-mono text-xs text-emerald-500 font-bold">{u.durationMinutes} min</span>
                    </div>
                  ))}
                  {activeUsersDuration.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {t("No activity duration data.", "Faollik vaqti ma'lumotlari yo'q.", "Нет данных об активности.")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
