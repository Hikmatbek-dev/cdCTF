import { useState } from "react";
import { FileText, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { LoadFailure } from "@/components/LoadFailure";
import { Pager, PAGE_SIZE } from "@/components/Pager";
import { errorToast } from "@/lib/error-toast";
import { normalizeArray } from "@/lib/api-shapes";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type AdminWriteup = {
  id: number;
  ctfId: number;
  ctfName: string;
  authorId: number;
  authorNickname: string;
  content: string;
  isPublished: boolean;
  updatedAt: string;
};

/**
 * Moderation for the one kind of content learners write.
 *
 * `ctf_writeups.is_published` exists and the public read filters on it, but
 * nothing in the codebase ever set it to false — so it was a switch with no
 * switch attached, and the only lever staff had was deleting a writeup
 * outright. Reading them at all required first solving the challenge, which is
 * the right rule for learners and a useless one for a moderator.
 */
export default function AdminWriteupsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-writeups", offset],
    queryFn: async () => {
      const res = await fetch(`/api/admin/writeups?limit=${PAGE_SIZE}&offset=${offset}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load writeups");
      return res.json() as Promise<{ writeups: AdminWriteup[]; total?: number }>;
    },
  });

  const writeups = normalizeArray<AdminWriteup>(data?.writeups, ["writeups", "data", "items"]);
  const total = typeof data?.total === "number" ? data.total : writeups.length;

  const toggle = async (w: AdminWriteup) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/writeups/${w.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !w.isPublished }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      toast({ title: w.isPublished
        ? t("Writeup hidden", "Writeup yashirildi", "Разбор скрыт")
        : t("Writeup is visible again", "Writeup yana ko'rinadi", "Разбор снова виден") });
      void qc.invalidateQueries({ queryKey: ["admin-writeups", offset] });
    } catch (err) {
      toast(errorToast(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">{t("Writeups", "Writeuplar", "Разборы")}</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-6 max-w-2xl">
          {t("Hiding a writeup leaves it in the author's hands but takes it off the challenge page. Deleting is on the challenge itself.",
             "Yashirish writeup'ni muallifda qoldiradi, lekin topshiriq sahifasidan olib tashlaydi. O'chirish topshiriqning o'zida.",
             "Скрытие оставляет разбор автору, но убирает его со страницы задания. Удаление — на самом задании.")}
        </p>

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : writeups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {t("No writeups yet", "Hali writeup yo'q", "Разборов пока нет")}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {writeups.map(w => (
                <div key={w.id} className="p-4 rounded-xl border border-border bg-card" data-testid={`card-writeup-${w.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{w.ctfName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {w.authorNickname} · {new Date(w.updatedAt).toLocaleDateString()}
                        {!w.isPublished && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                            {t("Hidden", "Yashirilgan", "Скрыт")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                        data-testid={`button-read-writeup-${w.id}`}
                      >
                        {expanded === w.id ? t("Collapse", "Yopish", "Свернуть") : t("Read", "O'qish", "Читать")}
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-7 gap-1 text-xs"
                        disabled={busy}
                        onClick={() => toggle(w)}
                        data-testid={`button-toggle-writeup-${w.id}`}
                      >
                        {w.isPublished
                          ? <><EyeOff className="w-3 h-3" /> {t("Hide", "Yashirish", "Скрыть")}</>
                          : <><Eye className="w-3 h-3" /> {t("Show", "Ko'rsatish", "Показать")}</>}
                      </Button>
                    </div>
                  </div>
                  {expanded === w.id && (
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 text-xs font-mono">
                      {w.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
            <Pager total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />
          </>
        )}
      </main>
    </div>
  );
}
