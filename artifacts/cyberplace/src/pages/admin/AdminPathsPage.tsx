import { useEffect, useState, useCallback } from "react";
import { Route as RouteIcon, Plus, Trash2, ArrowUp, ArrowDown, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";

type AdminPath = {
  id: number; slug: string; title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string; hue: number; badge?: string | null; orderIndex: number; isPublished: boolean;
  moduleIds: number[];
};
type Mod = { id: number; title: string; titleUz?: string | null };

const EMPTY = { slug: "", title: "", titleUz: "", titleRu: "", description: "", descriptionUz: "", descriptionRu: "", difficulty: "beginner", hue: 210, badge: "", isPublished: true };

export default function AdminPathsPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [paths, setPaths] = useState<AdminPath[]>([]);
  const [modules, setModules] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminPath | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [picked, setPicked] = useState<number[]>([]);
  const [modSearch, setModSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        fetch("/api/admin/paths", { credentials: "include" }).then(r => r.json()),
        fetch("/api/learn/modules", { credentials: "include" }).then(r => r.json()),
      ]);
      setPaths(Array.isArray(p.paths) ? p.paths : []);
      setModules(Array.isArray(m) ? m : []);
    } catch { setPaths([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const modTitle = (id: number) => { const m = modules.find(x => x.id === id); return m ? ((lang === "uz" && m.titleUz) || m.title) : `#${id}`; };

  const openCreate = () => { setForm({ ...EMPTY }); setPicked([]); setCreating(true); setEditing(null); };
  const openEdit = (p: AdminPath) => {
    setForm({ slug: p.slug, title: p.title, titleUz: p.titleUz ?? "", titleRu: p.titleRu ?? "", description: p.description, descriptionUz: p.descriptionUz ?? "", descriptionRu: p.descriptionRu ?? "", difficulty: p.difficulty, hue: p.hue, badge: p.badge ?? "", isPublished: p.isPublished });
    setPicked(p.moduleIds); setEditing(p); setCreating(false);
  };
  const close = () => { setEditing(null); setCreating(false); };

  const move = (i: number, dir: -1 | 1) => {
    setPicked(prev => { const n = [...prev]; const j = i + dir; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  const save = async () => {
    setBusy(true);
    try {
      let pathId = editing?.id;
      if (creating) {
        const r = await fetch("/api/admin/paths", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "failed");
        pathId = d.id;
      } else if (editing) {
        const r = await fetch(`/api/admin/paths/${editing.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "failed");
      }
      if (pathId) {
        const r2 = await fetch(`/api/admin/paths/${pathId}/modules`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleIds: picked }) });
        if (!r2.ok) throw new Error((await r2.json().catch(() => ({})))?.error || "failed");
      }
      toast({ title: t("Saved", "Saqlandi", "Сохранено") });
      close(); void load();
    } catch (e) { toast({ title: e instanceof Error ? e.message : t("Error", "Xato", "Ошибка"), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const remove = async (p: AdminPath) => {
    if (!confirm(t(`Delete path "${p.title}"?`, `"${p.title}" yo'nalishini o'chirish?`, `Удалить путь "${p.title}"?`))) return;
    try {
      const r = await fetch(`/api/admin/paths/${p.id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
      toast({ title: t("Deleted", "O'chirildi", "Удалено") }); void load();
    } catch { toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }); }
  };

  const availableModules = modules.filter(m => !picked.includes(m.id) && ((lang === "uz" && m.titleUz) || m.title).toLowerCase().includes(modSearch.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><RouteIcon className="w-5 h-5 text-primary" /><h1 className="text-xl font-bold">{t("Paths", "Yo'nalishlar", "Пути")}</h1></div>
          {!creating && !editing && <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> {t("New path", "Yangi yo'nalish", "Новый путь")}</Button>}
        </div>

        {creating || editing ? (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{creating ? t("New path", "Yangi yo'nalish", "Новый путь") : t("Edit path", "Tahrirlash", "Редактировать")}</h2>
              <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {creating && <Field label={t("Slug", "Slug", "Slug")} value={form.slug} onChange={v => setForm({ ...form, slug: v })} placeholder="pre-security" />}
              <Field label={t("Badge (optional)", "Badge (ixtiyoriy)", "Бейдж")} value={form.badge} onChange={v => setForm({ ...form, badge: v })} placeholder="NEW" />
              <Field label={t("Title (EN)", "Sarlavha (EN)", "Заголовок (EN)")} value={form.title} onChange={v => setForm({ ...form, title: v })} />
              <Field label={t("Title (UZ)", "Sarlavha (UZ)", "Заголовок (UZ)")} value={form.titleUz} onChange={v => setForm({ ...form, titleUz: v })} />
              <Field label={t("Title (RU)", "Sarlavha (RU)", "Заголовок (RU)")} value={form.titleRu} onChange={v => setForm({ ...form, titleRu: v })} />
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("Difficulty", "Qiyinlik", "Сложность")}</label>
                <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="beginner">{t("Beginner", "Boshlang'ich", "Начальный")}</option>
                  <option value="intermediate">{t("Intermediate", "O'rta", "Средний")}</option>
                  <option value="advanced">{t("Advanced", "Yuqori", "Продвинутый")}</option>
                </select>
              </div>
              <Field label={t("Colour hue (0-360)", "Rang (0-360)", "Оттенок (0-360)")} value={String(form.hue)} onChange={v => setForm({ ...form, hue: Number(v) || 0 })} />
            </div>
            <Field label={t("Description (EN)", "Tavsif (EN)", "Описание (EN)")} value={form.description} onChange={v => setForm({ ...form, description: v })} />
            <Field label={t("Description (UZ)", "Tavsif (UZ)", "Описание (UZ)")} value={form.descriptionUz} onChange={v => setForm({ ...form, descriptionUz: v })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="accent-primary w-4 h-4" /> {t("Published", "Chop etilgan", "Опубликован")}</label>

            {/* Module picker */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">{t("Modules in this path (in order)", "Yo'nalish modullari (tartibda)", "Модули пути (по порядку)")}</div>
                <div className="space-y-1.5 min-h-[60px]">
                  {picked.map((id, i) => (
                    <div key={id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                      <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="flex-1 truncate">{modTitle(id)}</span>
                      <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPicked(picked.filter(x => x !== id))} className="text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {picked.length === 0 && <p className="text-xs text-muted-foreground">{t("None yet — add from the right.", "Hali yo'q — o'ngdan qo'shing.", "Пусто — добавьте справа.")}</p>}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">{t("Available modules", "Mavjud modullar", "Доступные модули")}</div>
                <div className="relative mb-2"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input value={modSearch} onChange={e => setModSearch(e.target.value)} placeholder={t("Search…", "Qidirish…", "Поиск…")} className="pl-8 h-9" /></div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {availableModules.map(m => (
                    <button key={m.id} onClick={() => setPicked([...picked, m.id])} className="w-full flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-left hover:border-primary/40">
                      <Plus className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="truncate">{(lang === "uz" && m.titleUz) || m.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={close}>{t("Cancel", "Bekor", "Отмена")}</Button>
              <Button onClick={save} disabled={busy}>{busy ? t("Saving…", "Saqlanmoqda…", "Сохранение…") : t("Save", "Saqlash", "Сохранить")}</Button>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {paths.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4" data-testid={`admin-path-${p.id}`}>
                <span className="w-9 h-9 rounded-lg shrink-0" style={{ background: `hsl(${p.hue} 70% 45%)` }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate flex items-center gap-2">{p.title} {p.badge && <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{p.badge}</span>} {!p.isPublished && <span className="text-[10px] text-muted-foreground">({t("hidden", "yashirin", "скрыт")})</span>}</div>
                  <div className="text-xs text-muted-foreground">{p.slug} · {p.moduleIds.length} {t("modules", "modul", "модулей")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>{t("Edit", "Tahrir", "Изм.")}</Button>
                <Button size="sm" variant="outline" onClick={() => remove(p)} className="text-destructive border-destructive/30"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            {paths.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">{t("No paths yet. Create one.", "Hali yo'nalish yo'q. Yarating.", "Путей нет. Создайте.")}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
