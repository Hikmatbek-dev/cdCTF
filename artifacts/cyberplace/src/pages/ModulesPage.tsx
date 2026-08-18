import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, Clock, Award, CheckCircle2, ChevronRight, Route, Layers,
  FileText, Network, Sparkles, ShieldAlert, Radio, Map, Code, Hexagon, Terminal
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { RoadmapTree } from "@/components/RoadmapTree";
import { normalizeArray } from "@/lib/api-shapes";
import { moduleArtFor } from "@/components/ModuleArt";
import { LoadFailure } from "@/components/LoadFailure";
import { useListModules, getListModulesQueryKey } from "@workspace/api-client-react";

type ModuleSummary = {
  id: number; slug?: string;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string; estimatedHours: number;
  lessonCount: number; completedCount: number;
  examPassed: boolean; certificateSerial?: string | null;
};

type PathSummary = {
  id: number; slug: string;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string; hue: number; badge?: string | null;
  moduleCount: number; completedModules: number;
};

type Writeup = { id: number; ctfId: number; ctfName: string; category: string; difficulty: string; authorNickname: string; createdAt: string };
type Spotlight = { id: number; title: string; titleUz?: string | null; titleRu?: string | null; description?: string | null; descriptionUz?: string | null; descriptionRu?: string | null; tag?: string | null; url?: string | null; startsAt?: string | null };

const TABS = [
  { key: "paths", icon: Route, label: { en: "Paths", uz: "Yo'nalishlar", ru: "Пути" } },
  { key: "roadmap", icon: Map, label: { en: "Roadmap", uz: "Yo'l xaritasi", ru: "Карта" } },
  { key: "modules", icon: Layers, label: { en: "Modules", uz: "Modullar", ru: "Модули" } },
  { key: "walkthroughs", icon: FileText, label: { en: "Walkthroughs", uz: "Yechimlar", ru: "Разборы" } },
  { key: "networks", icon: Network, label: { en: "Networks", uz: "Tarmoqlar", ru: "Сети" } },
  { key: "ai", icon: Sparkles, label: { en: "AI Upskilling", uz: "AI ko'nikma", ru: "AI-навыки" } },
  { key: "threats", icon: ShieldAlert, label: { en: "Recent Threats", uz: "So'nggi tahdidlar", ru: "Угрозы" } },
  { key: "live", icon: Radio, label: { en: "Live Classes", uz: "Jonli darslar", ru: "Живые уроки" } },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function difficultyMeta(difficulty: string, t: (en: string, uz?: string, ru?: string) => string) {
  if (difficulty === "advanced") return { label: t("Hard", "Qiyin", "Сложный"), cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  if (difficulty === "intermediate") return { label: t("Medium", "O'rta", "Средний"), cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  return { label: t("Easy", "Oson", "Лёгкий"), cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
}

export default function ModulesPage() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<TabKey>("paths");
  const [detail, setDetail] = useState<Spotlight | null>(null);

  const { data: modData, isLoading: modLoading, isError: modError, refetch } =
    useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const modules = normalizeArray<ModuleSummary>(modData, ["id", "title"]);

  const { data: paths, isLoading: pathsLoading } = useQuery({
    queryKey: ["learn-paths"],
    queryFn: async () => {
      const r = await fetch("/api/learn/paths", { credentials: "include" });
      if (!r.ok) throw new Error("paths");
      return r.json() as Promise<PathSummary[]>;
    },
  });

  const { data: writeups, isLoading: wLoading } = useQuery({
    queryKey: ["walkthroughs"],
    queryFn: async () => {
      const r = await fetch("/api/ctf/writeups", { credentials: "include" });
      if (!r.ok) throw new Error("writeups");
      return r.json() as Promise<Writeup[]>;
    },
    enabled: tab === "walkthroughs",
  });

  const spotlightSection = tab === "threats" ? "threats" : tab === "ai" ? "ai" : tab === "live" ? "live" : tab === "networks" ? "networks" : null;
  const { data: spotlights, isLoading: sLoading } = useQuery({
    queryKey: ["spotlights", spotlightSection],
    queryFn: async () => {
      const r = await fetch(`/api/learn/spotlights?section=${spotlightSection}`);
      if (!r.ok) throw new Error("spotlights");
      return r.json() as Promise<Spotlight[]>;
    },
    enabled: !!spotlightSection,
  });

  // Curated walkthrough guides, shown above the community write-ups.
  const { data: guideCards } = useQuery({
    queryKey: ["spotlights", "walkthroughs"],
    queryFn: async () => {
      const r = await fetch("/api/learn/spotlights?section=walkthroughs");
      if (!r.ok) throw new Error("guides");
      return r.json() as Promise<Spotlight[]>;
    },
    enabled: tab === "walkthroughs",
  });

  const loc = (en: string, uz?: string | null, ru?: string | null) => (lang === "uz" ? uz : lang === "ru" ? ru : en) || en;

  return (
    <div className="min-h-screen bg-background text-foreground page relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-40" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      
      <div className="shell relative z-10 py-8">
        <header className="mb-10 relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.15)]">
              <GraduationCap className="w-7 h-7 text-primary animate-glow" />
            </div>
            <div>
              <div className="eyebrow flex items-center gap-2 mb-1">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                {t("cdCTF · Learn", "cdCTF · O'rganish", "cdCTF · Обучение")}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight"><span className="gradient-text">{t("Learn cyber security", "Kiberxavfsizlikni o'rganish", "Изучайте кибербезопасность")}</span></h1>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
            {t("Follow a structured path, work through focused modules, and sharpen your skills — from your first command to a full attack chain.",
               "Tuzilgan yo'nalishni bosib o'ting, fokusli modullarni o'rganing va ko'nikmalaringizni charxlang — birinchi buyruqdan to'liq hujum zanjirigacha.",
               "Идите по структурированному пути, проходите модули и оттачивайте навыки — от первой команды до полной цепочки атаки.")}
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto mb-10 pb-2 no-scrollbar">
          <div className="flex bg-card/60 backdrop-blur-md border border-border/50 p-1.5 rounded-xl shadow-inner">
            {TABS.map(tb => {
              const Icon = tb.icon;
              const active = tab === tb.key;
              return (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                    active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-100" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted scale-95 hover:scale-100"
                  }`}
                  data-testid={`learn-tab-${tb.key}`}
                >
                  <Icon className="w-4 h-4" /> {tb.label[lang]}
                </button>
              );
            })}
          </div>
        </div>

        {/* PATHS */}
        {tab === "paths" && (
          pathsLoading ? (
            <Grid><CardsSkeleton n={4} /></Grid>
          ) : !paths || paths.length === 0 ? (
            <Empty text={t("Paths are being prepared.", "Yo'nalishlar tayyorlanmoqda.", "Пути готовятся.")} />
          ) : (
            <Grid>
              {paths.map(p => {
                const d = difficultyMeta(p.difficulty, t);
                const pct = p.moduleCount ? Math.round((p.completedModules / p.moduleCount) * 100) : 0;
                return (
                  <Link key={p.id} href={`/paths/${p.slug}`}>
                    <div className="group h-full rounded-3xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col shadow-lg shadow-black/5" data-testid={`path-card-${p.slug}`}>
                      <div className="relative h-32 flex items-center justify-center overflow-hidden border-b border-border/30">
                        {/* Dynamic Background Pattern */}
                        <div 
                          className="absolute inset-0 opacity-20 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                          }}
                        />
                        {/* Accent Gradient */}
                        <div className="absolute inset-0 opacity-80" style={{ background: `linear-gradient(135deg, hsl(${p.hue} 80% 20%), hsl(${(p.hue + 40) % 360} 90% 8%))` }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                        
                        <div className="relative z-10 w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-xl group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-shadow duration-300">
                          <Route className="w-6 h-6 text-white" />
                        </div>
                        {p.badge && <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md text-white border border-white/20 px-2.5 py-0.5 rounded shadow-sm z-10">{p.badge}</span>}
                        {pct > 0 && <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 tabular-nums z-10 border border-white/10">{pct}%</span>}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-lg mb-1.5 group-hover:text-primary transition-colors">{loc(p.title, p.titleUz, p.titleRu)}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{loc(p.description, p.descriptionUz, p.descriptionRu)}</p>
                        <div className="flex items-center gap-3 mt-4 text-xs">
                          <span className={`px-2 py-0.5 rounded border font-medium ${d.cls}`}>{d.label}</span>
                          <span className="text-muted-foreground inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {p.moduleCount} {t("modules", "modul", "модулей")}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </Grid>
          )
        )}

        {/* ROADMAP */}
        {tab === "roadmap" && (
          modError ? <LoadFailure onRetry={() => refetch()} />
          : modLoading ? <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          : modules.length === 0 ? <Empty text={t("No modules yet.", "Hozircha modullar yo'q.", "Пока нет модулей.")} />
          : <RoadmapTree modules={modules} />
        )}

        {/* MODULES */}
        {tab === "modules" && (
          modError ? <LoadFailure onRetry={() => refetch()} />
          : modLoading ? <Grid><CardsSkeleton n={6} /></Grid>
          : modules.length === 0 ? <Empty text={t("No modules yet.", "Hozircha modullar yo'q.", "Пока нет модулей.")} />
          : (
            <Grid>
              {modules.map(m => {
                const d = difficultyMeta(m.difficulty, t);
                const Art = moduleArtFor(m.slug);
                const done = m.certificateSerial || m.examPassed;
                const pct = m.lessonCount ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
                return (
                  <Link key={m.id} href={`/modules/${m.id}`}>
                    <div className="group h-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col shadow-lg shadow-black/5" data-testid={`module-card-${m.id}`}>
                      <div className="relative h-32 bg-muted/20 overflow-hidden flex items-center justify-center border-b border-border/30">
                        {/* Cyber grid lines */}
                        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:20px_20px] transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                        
                        {/* Glow effect based on completion */}
                        <div className={`absolute -bottom-10 w-32 h-32 rounded-full blur-[40px] opacity-20 transition-colors duration-500 ${done ? 'bg-primary' : 'bg-primary group-hover:bg-primary/50'}`} />
                        
                        <div className="relative z-10 w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors duration-300 drop-shadow-md">
                          <Art className="w-full h-full" />
                        </div>
                        
                        {done ? <span className="absolute top-3 right-3 text-primary bg-primary/10 backdrop-blur-md rounded-md px-2 py-1.5 shadow-sm border border-primary/30 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></span>
                          : pct > 0 && <span className="absolute top-3 right-3 text-[10px] font-bold bg-background/80 backdrop-blur-md shadow-sm border border-border/50 rounded-md px-2 py-1 tabular-nums">{pct}%</span>}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-base mb-1.5 group-hover:text-primary transition-colors">{loc(m.title, m.titleUz, m.titleRu)}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{loc(m.description, m.descriptionUz, m.descriptionRu)}</p>
                        <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                          <span className={`px-2 py-0.5 rounded border font-medium ${d.cls}`}>{d.label}</span>
                          <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {m.lessonCount}</span>
                          {m.estimatedHours > 0 && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.estimatedHours}h</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </Grid>
          )
        )}

        {/* WALKTHROUGHS — curated guides + community write-ups */}
        {tab === "walkthroughs" && (
          <div className="space-y-8">
            {guideCards && guideCards.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">{t("Guides & methodology", "Qo'llanma va metodologiya", "Гайды и методология")}</h2>
                <Grid>
                  {guideCards.map(s => (
                    <button key={s.id} type="button" onClick={() => setDetail(s)} className="text-left" data-testid={`guide-${s.id}`}>
                      <div className="group h-full rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors flex flex-col">
                        <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-primary" />{s.tag && <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded">{s.tag}</span>}</div>
                        <h3 className="font-bold text-base mb-1.5 group-hover:text-primary transition-colors">{loc(s.title, s.titleUz, s.titleRu)}</h3>
                        {s.description && <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{loc(s.description, s.descriptionUz, s.descriptionRu)}</p>}
                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">{t("Details", "Batafsil", "Подробнее")} <ChevronRight className="w-4 h-4" /></span>
                      </div>
                    </button>
                  ))}
                </Grid>
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">{t("Community write-ups", "Jamoa yechimlari", "Разборы сообщества")}</h2>
              {wLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              : !writeups || writeups.length === 0 ? <p className="text-sm text-muted-foreground">{t("No community write-ups yet. Solve a challenge and share yours.", "Hali jamoa yechimlari yo'q. Topshiriq yeching va o'zingiznikini ulashing.", "Пока нет разборов. Решите задание и поделитесь.")}</p>
              : (
            <div className="space-y-2">
              {writeups.map(w => (
                <Link key={w.id} href={`/ctf/${w.ctfId}`}>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" data-testid={`walkthrough-${w.id}`}>
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{w.ctfName}</div>
                      <div className="text-xs text-muted-foreground">{t("by", "muallif", "автор")} {w.authorNickname} · {w.category}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
              )}
            </div>
          </div>
        )}

        {/* Curated tabs — Networks / Recent Threats / AI Upskilling / Live Classes */}
        {spotlightSection && (
          sLoading ? <Grid><CardsSkeleton n={3} /></Grid>
          : spotlights && spotlights.length > 0 ? (
            <Grid>
              {spotlights.map(s => {
                const isLive = spotlightSection === "live";
                const when = s.startsAt ? new Date(s.startsAt) : null;
                return (
                  <button key={s.id} type="button" onClick={() => setDetail(s)} className="text-left" data-testid={`spotlight-${s.id}`}>
                    <div className="group h-full rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        {spotlightSection === "threats" && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                        {spotlightSection === "ai" && <Sparkles className="w-4 h-4 text-primary" />}
                        {spotlightSection === "networks" && <Network className="w-4 h-4 text-sky-500" />}
                        {isLive && <Radio className="w-4 h-4 text-emerald-500" />}
                        {s.tag && <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded">{s.tag}</span>}
                      </div>
                      <h3 className="font-bold text-base mb-1.5 group-hover:text-primary transition-colors">{loc(s.title, s.titleUz, s.titleRu)}</h3>
                      {s.description && <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{loc(s.description, s.descriptionUz, s.descriptionRu)}</p>}
                      {isLive && when && (
                        <div className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {when.toLocaleString(lang === "en" ? undefined : lang === "ru" ? "ru-RU" : "uz-UZ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                      <div className="mt-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                          {t("Details", "Batafsil", "Подробнее")} <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </Grid>
          ) : (
            spotlightSection === "ai" ? <Soon icon={Sparkles} title={t("AI Upskilling", "AI ko'nikma", "AI-навыки")} text={t("Attack and defend AI systems. Content is on the way.", "AI tizimlariga hujum va himoya. Kontent tez orada.", "Атака и защита ИИ. Контент скоро.")} />
            : spotlightSection === "threats" ? <Soon icon={ShieldAlert} title={t("Recent Threats", "So'nggi tahdidlar", "Недавние угрозы")} text={t("Rooms based on real, recent CVEs. Content is on the way.", "Haqiqiy, so'nggi CVE'lar asosidagi xonalar. Kontent tez orada.", "Комнаты на основе свежих CVE. Скоро.")} />
            : spotlightSection === "networks" ? <Soon icon={Network} title={t("Networks & labs", "Tarmoqlar va laboratoriyalar", "Сети и лаборатории")} text={t("Hands-on machines you attack in the browser.", "Brauzerda hujum qiladigan amaliy mashinalar.", "Практические машины в браузере.")} cta={{ href: "/labs", label: t("Open Labs", "Laboratoriyaga o'tish", "Открыть лаборатории") }} />
            : <Soon icon={Radio} title={t("Live Classes", "Jonli darslar", "Живые уроки")} text={t("Instructor-led sessions. None scheduled right now.", "Ustoz bilan jonli darslar. Hozircha rejalashtirilmagan.", "Занятия с преподавателем. Пока не запланированы.")} />
          )
        )}
      </div>

      {detail && <SpotlightDetail spotlight={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/** A focused detail view for a spotlight card, with links to authoritative
 * sources (the card's own link, an auto NVD link for CVE tags, and a search
 * fallback) so "Details" always leads somewhere useful. */
function SpotlightDetail({ spotlight: s, onClose }: { spotlight: Spotlight; onClose: () => void }) {
  const { t, lang } = useLang();
  const loc = (en: string, uz?: string | null, ru?: string | null) => (lang === "uz" ? uz : lang === "ru" ? ru : en) || en;
  const cve = s.tag && /^CVE-\d{4}-\d{4,}$/i.test(s.tag) ? s.tag.toUpperCase() : null;
  const title = loc(s.title, s.titleUz, s.titleRu);
  const when = s.startsAt ? new Date(s.startsAt) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {s.tag && <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded">{s.tag}</span>}
          <h2 className="text-xl font-bold mt-3 mb-3">{title}</h2>
          {s.description && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{loc(s.description, s.descriptionUz, s.descriptionRu)}</p>}
          {when && (
            <div className="text-sm text-muted-foreground mt-4 inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {when.toLocaleString(lang === "en" ? undefined : lang === "ru" ? "ru-RU" : "uz-UZ", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-6">
            {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="cyber-button px-4 h-10 inline-flex items-center gap-2 text-sm"><ChevronRight className="w-4 h-4" /> {t("Read more", "Batafsil o'qish", "Читать далее")}</a>}
            {cve && <a href={`https://nvd.nist.gov/vuln/detail/${cve}`} target="_blank" rel="noopener noreferrer" className="h-10 px-4 inline-flex items-center gap-2 text-sm rounded-lg border border-border hover:border-primary/40"><ShieldAlert className="w-4 h-4" /> NVD</a>}
            {!s.url && !cve && <a href={`https://www.google.com/search?q=${encodeURIComponent(title + " cybersecurity")}`} target="_blank" rel="noopener noreferrer" className="h-10 px-4 inline-flex items-center gap-2 text-sm rounded-lg border border-border hover:border-primary/40"><ChevronRight className="w-4 h-4" /> {t("Search the web", "Internetdan qidirish", "Искать в интернете")}</a>}
            <button onClick={onClose} className="h-10 px-4 inline-flex items-center text-sm rounded-lg border border-border hover:bg-muted ml-auto">{t("Close", "Yopish", "Закрыть")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
function CardsSkeleton({ n }: { n: number }) {
  return <>{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</>;
}
function Empty({ text }: { text: string }) {
  return <div className="glass-card text-center py-20"><p className="text-muted-foreground">{text}</p></div>;
}
function Soon({ icon: Icon, title, text, cta }: { icon: typeof Network; title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className="glass-card text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5"><Icon className="w-7 h-7" /></div>
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{text}</p>
      {cta && <Link href={cta.href}><button className="cyber-button px-6"><span className="inline-flex items-center gap-2"><Award className="w-4 h-4" /> {cta.label}</span></button></Link>}
    </div>
  );
}
