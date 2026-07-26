import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Writeup = {
  id: number; content: string; createdAt: string; updatedAt: string;
  authorId: number; authorNickname: string;
};

/**
 * Community writeups for a solved challenge. Rendered only after the viewer has
 * solved it (the server enforces the same gate), so a writeup is never a
 * spoiler. A solver may post one — and edit or delete their own.
 */
export function Writeups({ ctfId }: { ctfId: number }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = ["ctf-writeups", ctfId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await fetch(`/api/ctf/${ctfId}/writeups`);
      if (!r.ok) throw new Error("writeups");
      return r.json() as Promise<{ writeups: Writeup[]; mine: Writeup | null }>;
    },
  });

  const writeups = data?.writeups ?? [];
  const mine = writeups.find(w => w.authorId === user?.id) ?? null;

  const submit = async () => {
    if (busy || draft.trim().length < 20) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/ctf/${ctfId}/writeups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d?.error === "string" ? d.error : "Failed");
      toast({ title: t("Writeup saved!", "Yechim saqlandi!", "Разбор сохранён!") });
      setEditing(false); setDraft("");
      void qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!confirm(t("Delete your writeup?", "Yechimingizni o'chirasizmi?", "Удалить ваш разбор?"))) return;
    try {
      const r = await fetch(`/api/ctf/${ctfId}/writeups/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("del");
      void qc.invalidateQueries({ queryKey: key });
    } catch { toast({ title: t("Failed", "Xato", "Ошибка"), variant: "destructive" }); }
  };

  return (
    <div className="glass-card p-8 rounded-[2.5rem] border-foreground/5" data-testid="writeups">
      <h3 className="text-lg font-semibold tracking-tight mb-6 flex items-center gap-3">
        <FileText className="w-5 h-5 text-primary" />
        {t("Writeups", "Yechim izohlari", "Разборы")}
        <span className="text-sm text-muted-foreground font-normal">({writeups.length})</span>
      </h3>

      {/* Compose / edit own */}
      {!editing && !mine && (
        <Button variant="outline" size="sm" onClick={() => { setEditing(true); setDraft(""); }} className="mb-6 gap-2" data-testid="button-add-writeup">
          <Pencil className="w-4 h-4" /> {t("Share how you solved it", "Qanday yechganingizni ulashing", "Поделитесь решением")}
        </Button>
      )}
      {(editing || (mine && editing)) && (
        <div className="mb-6 space-y-3">
          <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6}
            placeholder={t("Explain your approach, step by step (Markdown supported)…", "Yondashuvingizni bosqichma-bosqich yozing…", "Опишите ваш подход по шагам…")}
            data-testid="input-writeup" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(""); }}>{t("Cancel", "Bekor", "Отмена")}</Button>
            <Button size="sm" onClick={submit} disabled={busy || draft.trim().length < 20} data-testid="button-save-writeup">{t("Publish", "Joylash", "Опубликовать")}</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {writeups.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("No writeups yet — be the first.", "Hali yechim izohi yo'q — birinchi bo'ling.", "Разборов пока нет — будьте первым.")}</p>
        )}
        {writeups.map(w => (
          <div key={w.id} className="rounded-2xl border border-foreground/5 bg-muted/10 p-5" data-testid={`writeup-${w.id}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{w.authorNickname}</span>
              {w.authorId === user?.id && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(true); setDraft(w.content); }} className="text-muted-foreground hover:text-primary" title={t("Edit", "Tahrir", "Изменить")}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(w.id)} className="text-muted-foreground hover:text-destructive" title={t("Delete", "O'chirish", "Удалить")}><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{w.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
