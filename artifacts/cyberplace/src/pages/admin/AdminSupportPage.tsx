import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { LifeBuoy, CheckCircle2, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";

type Ticket = {
  id: number;
  userId: number | null;
  nickname: string | null;
  email: string | null;
  category: string;
  message: string;
  pageUrl: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
};

export default function AdminSupportPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = tab === "all" ? "" : `?status=${tab}`;
      const res = await fetch(`/api/admin/support${q}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setOpenCount(typeof data.open === "number" ? data.open : 0);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: number, status: "open" | "resolved") => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({ title: status === "resolved" ? t("Marked resolved", "Hal qilindi", "Решено") : t("Reopened", "Qayta ochildi", "Переоткрыто") });
      void load();
    } catch {
      toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const catLabel = (c: string) =>
    c === "bug" ? t("Bug", "Xatolik", "Ошибка")
    : c === "question" ? t("Question", "Savol", "Вопрос")
    : c === "suggestion" ? t("Suggestion", "Taklif", "Предложение")
    : t("Other", "Boshqa", "Другое");

  const fmt = (iso: string) => new Date(iso).toLocaleString(lang === "en" ? undefined : lang === "ru" ? "ru-RU" : "uz-UZ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const TABS: Array<{ key: typeof tab; label: string }> = [
    { key: "open", label: t("Open", "Ochiq", "Открытые") },
    { key: "resolved", label: t("Resolved", "Hal qilingan", "Решённые") },
    { key: "all", label: t("All", "Hammasi", "Все") },
  ];

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center gap-3 mb-6">
          <LifeBuoy className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">{t("Support", "Yordam", "Поддержка")}</h1>
          {openCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{openCount} {t("open", "ochiq", "открыто")}</span>
          )}
        </div>

        <div className="flex gap-2 mb-5">
          {TABS.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${tab === tb.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
              data-testid={`support-tab-${tb.key}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{t("No tickets here.", "Bu yerda murojaat yo'q.", "Обращений нет.")}</p>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <div key={ticket.id} className="rounded-xl border border-border bg-card p-4" data-testid={`ticket-${ticket.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-muted font-medium">{catLabel(ticket.category)}</span>
                    <span className={`px-2 py-0.5 rounded font-medium ${ticket.status === "open" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                      {ticket.status === "open" ? t("Open", "Ochiq", "Открыт") : t("Resolved", "Hal qilingan", "Решён")}
                    </span>
                    <span className="text-muted-foreground">#{ticket.id} · {fmt(ticket.createdAt)}</span>
                  </div>
                  {ticket.status === "open" ? (
                    <Button size="sm" variant="outline" disabled={busyId === ticket.id} onClick={() => setStatus(ticket.id, "resolved")} className="h-7 text-xs gap-1 shrink-0" data-testid={`resolve-${ticket.id}`}>
                      <CheckCircle2 className="w-3 h-3" /> {t("Resolve", "Hal qilish", "Решить")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busyId === ticket.id} onClick={() => setStatus(ticket.id, "open")} className="h-7 text-xs gap-1 shrink-0" data-testid={`reopen-${ticket.id}`}>
                      <RotateCcw className="w-3 h-3" /> {t("Reopen", "Qayta ochish", "Переоткрыть")}
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap mb-2">{ticket.message}</p>
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  <span>
                    {ticket.userId ? (
                      <Link href={`/profile/${ticket.userId}`} className="hover:text-primary">{ticket.nickname ?? `#${ticket.userId}`}</Link>
                    ) : t("anonymous", "anonim", "аноним")}
                  </span>
                  {ticket.email && <a href={`mailto:${ticket.email}`} className="hover:text-primary">{ticket.email}</a>}
                  {ticket.pageUrl && (
                    <a href={ticket.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary truncate max-w-[220px]">
                      <ExternalLink className="w-3 h-3 shrink-0" /> {ticket.pageUrl}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
