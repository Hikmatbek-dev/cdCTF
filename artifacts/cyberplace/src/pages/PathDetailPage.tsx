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
        <div className="rounded-3xl p-8 mb-10 text-white relative overflow-hidden border border-border shadow-2xl shadow-black/20">
          {/* Dynamic Background Pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 31.5V27H0v-2h30v-2H0v-2h30v-2H0V12h30v-2H0V8h30V6H0V4h30V2H0V0h33v30h3V0h3v30h3V0h3v30h3V0h3v30h3V0h3v30h3V0h3v30h3v3H30v-1.5zM0 30h3v30H0V30zm6 0h3v30H6V30zm6 0h3v30h-3V30zm6 0h3v30h-3V30zm6 0h3v30h-3V30zm6 6h30v3H30v-3zm0 6h30v3H30v-3zm0 6h30v3H30v-3zm0 6h30v3H30v-3z' fill='%23ffffff' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${path.hue} 80% 20% / 0.9), hsl(${(path.hue + 40) % 360} 90% 10% / 0.95))` }} />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="w-20 h-20 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.15)] relative">
              <RouteIcon className="w-10 h-10 text-white" />
              {path.badge && <span className="absolute -top-3 -right-3 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded shadow-lg border border-primary/50">{path.badge}</span>}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black mb-3 drop-shadow-md tracking-tight">{loc(path.title, path.titleUz, path.titleRu)}</h1>
              <p className="text-white/80 max-w-2xl text-base leading-relaxed">{loc(path.description, path.descriptionUz, path.descriptionRu)}</p>
              
              <div className="flex flex-wrap items-center gap-6 mt-6">
                <div className="flex items-center gap-4 text-sm font-medium bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                  <span className="inline-flex items-center gap-2"><Layers className="w-4 h-4 text-white/70" /> {path.moduleCount} {t("modules", "modul", "модулей")}</span>
                  <div className="w-px h-4 bg-white/20" />
                  <span className="inline-flex items-center gap-2 text-white"><CheckCircle2 className="w-4 h-4 text-primary" /> {path.completedModules}/{path.moduleCount} {t("done", "tugatilgan", "готово")}</span>
                </div>
                
                <div className="flex-1 min-w-[200px] max-w-sm">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5 px-1">
                    <span>{t("Progress", "Jarayon", "Прогресс")}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/50 overflow-hidden shadow-inner border border-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
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
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md" data-testid={`path-module-${m.id}`}>
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors shadow-inner border ${done ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/50 text-muted-foreground border-border/50"}`}>
                    {done ? <CheckCircle2 className="w-6 h-6 drop-shadow-sm" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-base truncate mb-1">{loc(m.title, m.titleUz, m.titleRu)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-4 mt-0.5">
                      <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary/70" /> {m.completedCount}/{m.lessonCount} {t("lessons", "dars", "уроков")}</span>
                      {m.estimatedHours > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary/70" /> {m.estimatedHours}h</span>}
                      {lpct > 0 && !done && <span className="tabular-nums font-mono font-medium text-foreground">{lpct}%</span>}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
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
