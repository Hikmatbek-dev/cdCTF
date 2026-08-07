import { useEffect, useState, useCallback } from "react";
import { Gift, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";

type UserRow = { id: number; nickname: string; email: string; role: string };
type GiftRow = { id: number; userId: number; nickname: string | null; category: string; points: number; note: string | null; createdAt: string };

const CATEGORIES = ["bug", "suggestion", "help", "question", "other"] as const;
type Category = (typeof CATEGORIES)[number];

export default function AdminGiftPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [category, setCategory] = useState<Category>("bug");
  const [points, setPoints] = useState(40);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [defaults, setDefaults] = useState<Record<string, number>>({ bug: 40, suggestion: 40, help: 20, question: 10, other: 15 });
  const [max, setMax] = useState(40);
  const [recent, setRecent] = useState<GiftRow[]>([]);

  const label = (c: string) =>
    c === "bug" ? t("Reported a bug", "Xatolik haqida xabar berdi", "Сообщил об ошибке")
    : c === "suggestion" ? t("Suggestion", "Taklif", "Предложение")
    : c === "help" ? t("Helped others", "Yordam berdi", "Помог другим")
    : c === "question" ? t("Good question", "Savol", "Вопрос")
    : t("Other", "Boshqa", "Другое");

  const loadRecent = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/gifts", { credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (d.defaults) setDefaults(d.defaults);
      if (typeof d.max === "number") setMax(d.max);
      setRecent(Array.isArray(d.gifts) ? d.gifts : []);
      if (d.defaults?.bug) setPoints(d.defaults.bug);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  // Live user search (debounced).
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch(`/api/admin/users?search=${encodeURIComponent(term)}&limit=8`, { credentials: "include" });
          const d = await r.json().catch(() => ({}));
          setResults(Array.isArray(d.users) ? d.users : []);
        } catch { setResults([]); }
      })();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const pickCategory = (c: Category) => { setCategory(c); setPoints(Math.min(max, defaults[c] ?? 10)); };

  const award = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gifts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, category, points, note: note.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof d?.error === "string" ? d.error : "failed");
      toast({ title: t(`+${d.points} awarded to ${selected.nickname}`, `${selected.nickname}ga +${d.points} berildi`, `+${d.points} начислено ${selected.nickname}`) });
      setNote("");
      setSelected(null);
      setSearch("");
      void loadRecent();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t("Error", "Xato", "Ошибка"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? undefined : lang === "ru" ? "ru-RU" : "uz-UZ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">{t("Gift points", "Sovg'a achko", "Наградные очки")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          {t("Reward a learner who helped — reported a bug, made a suggestion. The points count on their profile and the leaderboard. Max 40 per gift.",
             "Yordam bergan foydalanuvchiga achko bering — xatolik haqida xabar berdi, taklif kiritdi. Achko uning profili va reytingida hisoblanadi. Har sovg'a uchun eng ko'pi 40.",
             "Наградите пользователя, который помог. Очки учитываются в профиле и рейтинге. Максимум 40 за награду.")}
        </p>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 mb-10">
          {/* Pick a user */}
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <div className="font-semibold">{selected.nickname}</div>
                <div className="text-xs text-muted-foreground">{selected.email}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>{t("Change", "O'zgartirish", "Изменить")}</Button>
            </div>
          ) : (
            <div className="relative">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Find a user", "Foydalanuvchini toping", "Найти пользователя")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Nickname or email", "Taxallus yoki email", "Никнейм или email")} className="pl-9" data-testid="gift-user-search" />
              </div>
              {results.length > 0 && (
                <div className="mt-2 rounded-xl border border-border bg-background divide-y divide-border max-h-64 overflow-y-auto">
                  {results.map(u => (
                    <button key={u.id} type="button" onClick={() => { setSelected(u); setResults([]); }} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/40" data-testid={`gift-user-${u.id}`}>
                      <span className="font-medium text-sm">{u.nickname}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">{t("Reason", "Sabab", "Причина")}</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickCategory(c)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${category === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
                  data-testid={`gift-category-${c}`}
                >
                  <span>{label(c)}</span>
                  <span className="text-xs font-bold tabular-nums">+{defaults[c] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Points (adjustable within the cap) + note */}
          <div className="grid sm:grid-cols-[140px_1fr] gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Points", "Achko", "Очки")} (≤ {max})</label>
              <Input
                type="number"
                min={1}
                max={max}
                value={points}
                onChange={e => setPoints(Math.max(1, Math.min(max, Number(e.target.value) || 0)))}
                data-testid="gift-points"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Note (optional)", "Izoh (ixtiyoriy)", "Заметка (необязательно)")}</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder={t("e.g. reported the scroll bug", "mas. scroll xatosini topdi", "напр. сообщил о баге")} data-testid="gift-note" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={award} disabled={!selected || busy} className="gap-2" data-testid="gift-award">
              <Check className="w-4 h-4" /> {busy ? t("Awarding...", "Berilmoqda...", "Начисление...") : t(`Award +${points}`, `+${points} berish`, `Начислить +${points}`)}
            </Button>
          </div>
        </div>

        {/* Recent gifts */}
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">{t("Recent gifts", "So'nggi sovg'alar", "Последние награды")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("None yet.", "Hali yo'q.", "Пока нет.")}</p>
        ) : (
          <div className="space-y-2">
            {recent.map(g => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm" data-testid={`gift-row-${g.id}`}>
                <span className="font-bold text-primary tabular-nums w-12">+{g.points}</span>
                <span className="font-medium flex-1 truncate">{g.nickname ?? `#${g.userId}`}</span>
                <span className="text-xs text-muted-foreground">{label(g.category)}</span>
                <span className="text-xs text-muted-foreground/70 shrink-0">{fmt(g.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
