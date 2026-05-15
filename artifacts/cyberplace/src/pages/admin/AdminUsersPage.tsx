import { useState } from "react";
import { Link } from "wouter";
import { Search, Shield, ShieldOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useAdminListUsers, getAdminListUsersQueryKey, useAdminBlockUser, useAdminUnblockUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeArray } from "@/lib/api-shapes";

export default function AdminUsersPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminListUsers(
    { search: search || undefined },
    { query: { queryKey: getAdminListUsersQueryKey({ search: search || undefined }) } }
  );
  const users = normalizeArray<any>(data?.users, ["users", "data", "items"]);
  const total = typeof data?.total === "number" ? data.total : users.length;

  const blockUser = useAdminBlockUser();
  const unblockUser = useAdminUnblockUser();

  const handleBlock = (id: number) => {
    blockUser.mutate({ id }, {
      onSuccess: () => { 
        toast({ title: t("User blocked", "Foydalanuvchi bloklandi", "Пользователь заблокирован") }); 
        qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({ search: search || undefined }) }); 
      },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  const handleUnblock = (id: number) => {
    unblockUser.mutate({ id }, {
      onSuccess: () => { 
        toast({ title: t("User unblocked", "Foydalanuvchi blokdan chiqdi", "Пользователь разблокирован") }); 
        qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({ search: search || undefined }) }); 
      },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  const [isRecalculating, setIsRecalculating] = useState(false);
  const handleRecalculate = async () => {
    if (!confirm(t("Recalculate all user points? This will sync points with current solve data.", "Barcha ballarni qayta hisoblash? Bu ballarni joriy ma'lumotlar bilan sinxronlashtiradi.", "Пересчитать все баллы? Это синхронизирует баллы с текущими данными."))) return;
    
    setIsRecalculating(true);
    try {
      const res = await fetch("/api/admin/users/recalculate-points", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error();
      toast({ title: t("Points recalculated", "Ballar qayta hisoblandi", "Баллы пересчитаны") });
      qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({ search: search || undefined }) });
    } catch (err) {
      toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{t("Users", "Foydalanuvchilar", "Пользователи")}</h1>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRecalculate} 
              disabled={isRecalculating}
              className="text-xs h-8"
              data-testid="button-recalculate-points"
            >
              {isRecalculating ? t("Recalculating...", "Hisoblanmoqda...", "Пересчет...") : t("Recalculate Points", "Ballarni qayta hisoblash", "Пересчитать баллы")}
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">{data ? `${total} ${t("total", "jami", "всего")}` : ""}</span>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search users...", "Qidirish...", "Поиск...")} className="pl-9" data-testid="input-search-users" />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("User", "Foydalanuvchi", "Пользователь")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Points", "Ball", "Очки")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Role", "Rol", "Роль")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Status", "Holat", "Статус")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Actions", "Amallar", "Действия")}</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {users.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-user-${user.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/profile/${user.id}`} className="hover:text-primary transition-colors">
                        {user.nickname}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-primary font-bold">{user.points}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.isBlocked ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}`}>
                        {user.isBlocked ? t("Blocked", "Bloklangan", "Заблокирован") : t("Active", "Faol", "Активен")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role !== "admin" && (
                        user.isBlocked ? (
                          <Button size="sm" variant="outline" onClick={() => handleUnblock(user.id)} className="h-7 text-xs gap-1" data-testid={`button-unblock-${user.id}`}>
                            <Shield className="w-3 h-3" /> {t("Unblock", "Blokdan chiqarish", "Разблокировать")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleBlock(user.id)} className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" data-testid={`button-block-${user.id}`}>
                            <ShieldOff className="w-3 h-3" /> {t("Block", "Bloklash", "Заблокировать")}
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
