import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Route as RouteIcon, Layers, Clock, CheckCircle2, ChevronRight, ArrowLeft, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";

type PathModule = {
  id: number; slug?: string;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string; estimatedHours: number;
  lessonCount: number; completedCount: number; examPassed: boolean; certificateSerial?: string | null;
};
type PathDetail = {
  slug: string; title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string; hue: number; badge?: string | null;
  modules: PathModule[]; moduleCount: number; completedModules: number;
};

export default function PathDetailPage() {
  const [, params] = useRoute("/paths/:slug");
  const slug = params?.slug;
  const { t, lang } = useLang();
  const loc = (en: string, uz?: string | null, ru?: string | null) => (lang === "uz" ? uz : lang === "ru" ? ru : en) || en;

  const { data: path, isLoading } = useQuery({
    queryKey: ["path", slug],
    queryFn: async () => {
      const r = await fetch(`/api/learn/paths/${slug}`, { credentials: "include" });
      if (!r.ok) throw new Error("path");
      return r.json() as Promise<PathDetail>;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background page"><div className="shell-narrow py-10 space-y-4"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div></div>;
  }
  if (!path) {
    return <div className="min-h-screen bg-background page flex items-center justify-center"><p className="text-muted-foreground">{t("Path not found", "Yo'nalish topilmadi", "Путь не найден")}</p></div>;
  }

  const pct = path.moduleCount ? Math.round((path.completedModules / path.moduleCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground page">
      <div className="shell-narrow">
        <Link href="/modules" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> {t("All learning", "Barcha o'rganish", "Всё обучение")}
        </Link>

        {/* Hero */}
        <div className="rounded-3xl p-8 mb-8 text-white relative overflow-hidden border border-border">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
            style={{ 
              backgroundImage: `url(https://images.unsplash.com/photo-${[
                "1550751827-4bd374c3f58b", "1526374965328-7f61d4dc18c5", 
                "1558494949-ef010cbdcc31", "1563206767-5b18f218e8de"
              ][(path.slug.length) % 4]}?w=1200&q=80)` 
            }}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${path.hue} 70% 25% / 0.8), hsl(${(path.hue + 40) % 360} 70% 15% / 0.9))` }} />
          
          <div className="relative z-10">
            <RouteIcon className="w-10 h-10 mb-4 opacity-90" />
            {path.badge && <span className="absolute top-0 right-0 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-black px-2 py-0.5 rounded">{path.badge}</span>}
            <h1 className="text-3xl font-bold mb-2 drop-shadow-md">{loc(path.title, path.titleUz, path.titleRu)}</h1>
            <p className="text-white/90 max-w-2xl">{loc(path.description, path.descriptionUz, path.descriptionRu)}</p>
            <div className="flex items-center gap-4 mt-5 text-sm">
              <span className="inline-flex items-center gap-1.5"><Layers className="w-4 h-4" /> {path.moduleCount} {t("modules", "modul", "модулей")}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {path.completedModules}/{path.moduleCount} {t("done", "tugatilgan", "готово")}</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-black/40 overflow-hidden max-w-md shadow-inner">
              <div className="h-full rounded-full bg-white/90" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Modules in order */}
        <div className="space-y-3">
          {path.modules.map((m, i) => {
            const done = m.certificateSerial || m.examPassed;
            const lpct = m.lessonCount ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
            return (
              <Link key={m.id} href={`/modules/${m.id}`}>
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors cursor-pointer" data-testid={`path-module-${m.id}`}>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{loc(m.title, m.titleUz, m.titleRu)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {m.completedCount}/{m.lessonCount} {t("lessons", "dars", "уроков")}</span>
                      {m.estimatedHours > 0 && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.estimatedHours}h</span>}
                      {lpct > 0 && !done && <span className="tabular-nums">{lpct}%</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Link>
            );
          })}
          {path.modules.length === 0 && (
            <div className="glass-card text-center py-16"><p className="text-muted-foreground">{t("No modules in this path yet.", "Bu yo'nalishda hali modul yo'q.", "В этом пути пока нет модулей.")}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
