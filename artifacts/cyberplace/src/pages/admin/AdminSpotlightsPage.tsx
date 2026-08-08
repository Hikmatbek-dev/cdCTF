import { useEffect, useState, useCallback } from "react";
import { Sparkles, ShieldAlert, Radio, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";

type Spotlight = {
  id: number; section: string; title: string; titleUz?: string | null; titleRu?: string | null;
  description?: string | null; descriptionUz?: string | null; descriptionRu?: string | null;
  tag?: string | null; url?: string | null; startsAt?: string | null; orderIndex: number; isPublished: boolean;
};

const SECTIONS = [
  { key: "threats", icon: ShieldAlert, label: { en: "Recent Threats", uz: "So'nggi tahdidlar", ru: "Угрозы" } },
  { key: "ai", icon: Sparkles, label: { en: "AI Upskilling", uz: "AI ko'nikma", ru: "AI-навыки" } },
  { key: "live", icon: Radio, label: { en: "Live Classes", uz: "Jonli darslar", ru: "Живые уроки" } },
] as const;

const EMPTY = { title: "", titleUz: "", titleRu: "", description: "", descriptionUz: "", descriptionRu: "", tag: "", url: "", startsAt: "", orderIndex: 0, isPublished: true };

export default function AdminSpotlightsPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("threats");
  const [items, setItems] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Spotlight | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/spotlights?section=${section}`, { credentials: "include" });
      const d = await r.json().catch(() => ({}));
      setItems(Array.isArray(d.spotlights) ? d.spotlights : []);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [section]);
  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setForm({ ...EMPTY }); setCreating(true); setEditing(null); };
  const openEdit = (s: Spotlight) => {
    setForm({ title: s.title, titleUz: s.titleUz ?? "", titleRu: s.titleRu ?? "", description: s.description ?? "", descriptionUz: s.descriptionUz ?? "", descriptionRu: s.descriptionRu ?? "", tag: s.tag ?? "", url: s.url ?? "", startsAt: s.startsAt ? s.startsAt.slice(0, 16) : "", orderIndex: s.orderIndex, isPublished: s.isPublished });
    setEditing(s); setCreating(false);
  };
  const close = () => { setEditing(null); setCreating(false); };

  const save = async () => {
    setBusy(true);
    try {
      const body: any = { ...form, section, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null };
      const url = creating ? "/api/admin/spotlights" : `/api/admin/spotlights/${editing!.id}`;
      const r = await fetch(url, { method: creating ? "POST" : "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "failed");
      toast({ title: t("Saved", "Saqlandi", "Сохранено") }); close(); void load();
    } catch (e) { toast({ title: e instanceof Error ? e.message : t("Error", "Xato", "Ошибка"), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const remove = async (s: Spotlight) => {
    if (!confirm(t("Delete this card?", "Bu kartani o'chirish?", "Удалить карточку?"))) return;
    try { const r = await fetch(`/api/admin/spotlights/${s.id}`, { method: "DELETE", credentials: "include" }); if (!r.ok) throw new Error(); toast({ title: t("Deleted", "O'chirildi", "Удалено") }); void load(); }
    catch { toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }); }
  };

  const isLive = section === "live";

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-primary" /><h1 className="text-xl font-bold">{t("Learn spotlights", "O'rganish kartalari", "Карточки обучения")}</h1></div>
          {!creating && !editing && <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> {t("New card", "Yangi karta", "Новая карточка")}</Button>}
        </div>

        <div className="flex gap-2 mb-6">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => { setSection(s.key); close(); }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${section === s.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
              <s.icon className="w-3.5 h-3.5" /> {s.label[lang]}
            </button>
          ))}
        </div>

        {creating || editing ? (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-bold">{creating ? t("New card", "Yangi karta", "Новая карточка") : t("Edit", "Tahrirlash", "Редактировать")}</h2><button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t("Title (EN)", "Sarlavha (EN)", "Заголовок (EN)")} value={form.title} onChange={v => setForm({ ...form, title: v })} />
              <Field label={t("Title (UZ)", "Sarlavha (UZ)", "Заголовок (UZ)")} value={form.titleUz} onChange={v => setForm({ ...form, titleUz: v })} />
              <Field label={isLive ? t("Host", "Ustoz", "Ведущий") : t("Tag (e.g. CVE-2024-…)", "Yorliq (mas. CVE-…)", "Тег (напр. CVE-…)")} value={form.tag} onChange={v => setForm({ ...form, tag: v })} />
              <Field label={isLive ? t("Join link", "Qo'shilish havolasi", "Ссылка")  : t("Link", "Havola", "Ссылка")} value={form.url} onChange={v => setForm({ ...form, url: v })} placeholder="https://…" />
              {isLive && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("Starts at", "Boshlanish vaqti", "Начало")}</label>
                  <Input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} />
                </div>
              )}
              <Field label={t("Order", "Tartib", "Порядок")} value={String(form.orderIndex)} onChange={v => setForm({ ...form, orderIndex: Number(v) || 0 })} />
            </div>
            <Field label={t("Description (EN)", "Tavsif (EN)", "Описание (EN)")} value={form.description} onChange={v => setForm({ ...form, description: v })} />
            <Field label={t("Description (UZ)", "Tavsif (UZ)", "Описание (UZ)")} value={form.descriptionUz} onChange={v => setForm({ ...form, descriptionUz: v })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="accent-primary w-4 h-4" /> {t("Published", "Chop etilgan", "Опубликован")}</label>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={close}>{t("Cancel", "Bekor", "Отмена")}</Button><Button onClick={save} disabled={busy}>{busy ? t("Saving…", "Saqlanmoqda…", "Сохранение…") : t("Save", "Saqlash", "Сохранить")}</Button></div>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4" data-testid={`spotlight-row-${s.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate flex items-center gap-2">{s.title} {s.tag && <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">{s.tag}</span>} {!s.isPublished && <span className="text-[10px] text-muted-foreground">({t("hidden", "yashirin", "скрыт")})</span>}</div>
                  {s.startsAt && <div className="text-xs text-muted-foreground">{new Date(s.startsAt).toLocaleString()}</div>}
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}>{t("Edit", "Tahrir", "Изм.")}</Button>
                <Button size="sm" variant="outline" onClick={() => remove(s)} className="text-destructive border-destructive/30"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">{t("No cards yet.", "Hali karta yo'q.", "Карточек нет.")}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="text-xs font-medium text-muted-foreground">{label}</label><Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}
