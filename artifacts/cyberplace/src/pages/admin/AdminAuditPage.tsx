import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray } from "@/lib/api-shapes";
import { LoadFailure } from "@/components/LoadFailure";
import { Pager, PAGE_SIZE } from "@/components/Pager";

type AuditLog = {
  id: number;
  actorUserId: number | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

async function fetchAuditLogs(offset: number) {
  const response = await fetch(`/api/admin/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to load audit logs");
  return response.json() as Promise<{ logs: AuditLog[]; total?: number }>;
}

export default function AdminAuditPage() {
  const { t } = useLang();
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-audit-logs", offset],
    queryFn: () => fetchAuditLogs(offset),
  });
  const logs = normalizeArray<AuditLog>(data?.logs, ["logs", "data", "items"]);
  const total = typeof data?.total === "number" ? data.total : logs.length;

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">{t("Audit Logs", "Audit jurnali", "Журнал аудита")}</h1>
        </div>

        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Time", "Vaqt", "Время")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Actor", "Bajaruvchi", "Исполнитель")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Action", "Amal", "Действие")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Target", "Nishon", "Цель")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isError && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-destructive">
                  {t("Could not load the audit log — this is NOT the same as it being empty.",
                     "Audit jurnalini yuklab bo'lmadi — bu uning bo'shligini anglatmaydi.",
                     "Не удалось загрузить журнал — это НЕ значит, что он пуст.")}
                  <button onClick={() => refetch()} className="ml-2 underline">{t("Try again", "Qayta urinish", "Повторить")}</button>
                </td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("Loading...", "Yuklanmoqda...", "Загрузка...")}</td></tr>
              )}
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.actorUserId ?? "-"}</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.targetType}{log.targetId ? ` #${log.targetId}` : ""}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.ipAddress ?? "-"}</td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("No audit logs yet", "Hali audit yozuvlari yo'q", "Журнал аудита пока пуст")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />
      </main>
    </div>
  );
}
