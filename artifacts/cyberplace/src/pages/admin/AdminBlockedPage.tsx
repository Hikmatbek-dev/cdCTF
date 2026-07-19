import { Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useAdminGetBlockedTasks, getAdminGetBlockedTasksQueryKey, useAdminUnblockTask, useAdminUnblockCtfUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeArray } from "@/lib/api-shapes";

export default function AdminBlockedPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useAdminGetBlockedTasks({ query: { queryKey: getAdminGetBlockedTasksQueryKey() } });
  const blockedCtf = normalizeArray<any>(data?.blockedCtf, ["blockedCtf", "ctf", "data", "items"]);
  const blockedLessons = normalizeArray<any>(data?.blockedLessons, ["blockedLessons", "lessons", "data", "items"]);
  const unblockTask = useAdminUnblockTask();
  const unblockCtfUser = useAdminUnblockCtfUser();

  const handleUnblockCtf = (ctfId: number, userId: number) => {
    unblockCtfUser.mutate({ id: ctfId, userId }, {
      onSuccess: () => { toast({ title: t("Unblocked!", "Blokdan chiqdi!", "Разблокировано!") }); void qc.invalidateQueries({ queryKey: getAdminGetBlockedTasksQueryKey() }); },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  const handleUnblockLesson = (lessonId: number, userId: number) => {
    unblockTask.mutate({ type: "lesson", taskId: lessonId, userId }, {
      onSuccess: () => { toast({ title: t("Unblocked!", "Blokdan chiqdi!", "Разблокировано!") }); void qc.invalidateQueries({ queryKey: getAdminGetBlockedTasksQueryKey() }); },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">{t("Blocked Tasks", "Bloklangan Vazifalar", "Заблокированные задачи")}</h1>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (
          <div className="space-y-6">
            {/* Blocked CTFs */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t("Blocked CTF Users", "Bloklangan CTF Foydalanuvchilar", "Заблокированные CTF")} ({blockedCtf.length})
              </h2>
              {blockedCtf.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("No blocked CTF users", "Bloklangan foydalanuvchilar yo'q", "Нет заблокированных")}</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("User", "Foydalanuvchi", "Пользователь")}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">CTF</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Reason", "Sabab", "Причина")}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Date", "Sana", "Дата")}</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Action", "Amal", "Действие")}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {blockedCtf.map((b, i) => (
                        <tr key={i} className="hover:bg-muted/20" data-testid={`row-blocked-ctf-${i}`}>
                          <td className="px-4 py-3 font-medium">{b.nickname}</td>
                          <td className="px-4 py-3 text-muted-foreground">{b.ctfName}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{b.reason}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(b.blockedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => handleUnblockCtf(b.ctfId, b.userId)} className="h-7 text-xs gap-1" data-testid={`button-unblock-ctf-${i}`}>
                              <Shield className="w-3 h-3" /> {t("Unblock", "Blokdan chiqarish", "Разблокировать")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Blocked Lessons */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {t("Blocked Lesson Users", "Bloklangan Dars Foydalanuvchilar", "Заблокированные уроки")} ({blockedLessons.length})
              </h2>
              {blockedLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("No blocked lesson users", "Bloklangan foydalanuvchilar yo'q", "Нет заблокированных")}</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("User", "Foydalanuvchi", "Пользователь")}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Lesson", "Dars", "Урок")}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Reason", "Sabab", "Причина")}</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Date", "Sana", "Дата")}</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Action", "Amal", "Действие")}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {blockedLessons.map((b, i) => (
                        <tr key={i} className="hover:bg-muted/20" data-testid={`row-blocked-lesson-${i}`}>
                          <td className="px-4 py-3 font-medium">{b.nickname}</td>
                          <td className="px-4 py-3 text-muted-foreground">{b.lessonTitle}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{b.reason}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(b.blockedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => handleUnblockLesson(b.lessonId, b.userId)} className="h-7 text-xs gap-1" data-testid={`button-unblock-lesson-${i}`}>
                              <Shield className="w-3 h-3" /> {t("Unblock", "Blokdan chiqarish", "Разблокировать")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
