import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, Clock, Award, CheckCircle2, ChevronRight, Route, Layers,
  FileText, Network, Sparkles, ShieldAlert, Radio, Map,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { RoadmapTree } from "@/components/RoadmapTree";
import { normalizeArray } from "@/lib/api-shapes";
import { MODULE_ART } from "@/components/ModuleArt";
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

  const loc = (en: string, uz?: string | null, ru?: string | null) => (lang === "uz" ? uz : lang === "ru" ? ru : en) || en;

  return (
    <div className="min-h-screen bg-background text-foreground page">
      <div className="shell">
        <header className="mb-8">
          <div className="eyebrow mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            {t("cdCTF · Learn", "cdCTF · O'rganish", "cdCTF · Обучение")}
          </div>
          <h1 className="mb-3"><span className="gradient-text">{t("Learn cyber security", "Kiberxavfsizlikni o'rganish", "Изучайте кибербезопасность")}</span></h1>
          <p className="text-muted-foreground max-w-2xl">
            {t("Follow a structured path, work through focused modules, and sharpen your skills — from your first command to a full attack chain.",
               "Tuzilgan yo'nalishni bosib o'ting, fokusli modullarni o'rganing va ko'nikmalaringizni charxlang — birinchi buyruqdan to'liq hujum zanjirigacha.",
               "Идите по структурированному пути, проходите модули и оттачивайте навыки — от первой команды до полной цепочки атаки.")}
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border mb-8 -mx-2 px-2 no-scrollbar">
          {TABS.map(tb => {
            const Icon = tb.icon;
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`learn-tab-${tb.key}`}
              >
                <Icon className="w-4 h-4" /> {tb.label[lang]}
              </button>
            );
          })}
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
                    <div className="group h-full rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors cursor-pointer flex flex-col" data-testid={`path-card-${p.slug}`}>
                      <div className="relative h-28 flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${p.hue} 70% 45%), hsl(${(p.hue + 40) % 360} 70% 35%))` }}>
                        <Route className="w-10 h-10 text-white/90" />
                        {p.badge && <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-black px-2 py-0.5 rounded">{p.badge}</span>}
                        {pct > 0 && <span className="absolute top-3 right-3 text-xs font-bold text-white bg-black/30 rounded-full px-2 py-0.5 tabular-nums">{pct}%</span>}
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
                const Art = m.slug ? MODULE_ART[m.slug] : undefined;
                const done = m.certificateSerial || m.examPassed;
                const pct = m.lessonCount ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
                return (
                  <Link key={m.id} href={`/modules/${m.id}`}>
                    <div className="group h-full rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors cursor-pointer flex flex-col" data-testid={`module-card-${m.id}`}>
                      <div className="relative h-28 bg-muted/30 overflow-hidden flex items-center justify-center">
                        {Art ? <Art className="w-full h-full" /> : <Layers className="w-10 h-10 text-muted-foreground/40" />}
                        {done ? <span className="absolute top-3 right-3 text-primary bg-background/80 rounded-full p-1"><CheckCircle2 className="w-4 h-4" /></span>
                          : pct > 0 && <span className="absolute top-3 right-3 text-xs font-bold bg-background/80 rounded-full px-2 py-0.5 tabular-nums">{pct}%</span>}
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

        {/* WALKTHROUGHS */}
        {tab === "walkthroughs" && (
          wLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : !writeups || writeups.length === 0 ? <Empty text={t("No published walkthroughs yet. Solve a challenge and share yours.", "Hali chop etilgan yechimlar yo'q. Topshiriq yeching va o'zingiznikini ulashing.", "Пока нет разборов. Решите задание и поделитесь своим.")} />
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
          )
        )}

        {/* NETWORKS → labs */}
        {tab === "networks" && (
          <Soon
            icon={Network}
            title={t("Networks & labs", "Tarmoqlar va laboratoriyalar", "Сети и лаборатории")}
            text={t("Hands-on machines you attack in the browser.", "Brauzerda hujum qiladigan amaliy mashinalar.", "Практические машины прямо в браузере.")}
            cta={{ href: "/labs", label: t("Open Labs", "Laboratoriyaga o'tish", "Открыть лаборатории") }}
          />
        )}

        {/* Aspirational tabs — shells for now */}
        {tab === "ai" && <Soon icon={Sparkles} title={t("AI Upskilling", "AI ko'nikma", "AI-навыки")} text={t("Learn to attack and defend AI systems. Coming soon.", "AI tizimlariga hujum va himoyani o'rganing. Tez orada.", "Атака и защита ИИ-систем. Скоро.")} />}
        {tab === "threats" && <Soon icon={ShieldAlert} title={t("Recent Threats", "So'nggi tahdidlar", "Недавние угрозы")} text={t("Practice on rooms based on real, recent CVEs. Coming soon.", "Haqiqiy, so'nggi CVE'lar asosidagi xonalarda mashq qiling. Tez orada.", "Практика на основе свежих CVE. Скоро.")} />}
        {tab === "live" && <Soon icon={Radio} title={t("Live Classes", "Jonli darslar", "Живые уроки")} text={t("Instructor-led sessions and workshops. Coming soon.", "Ustoz boshchiligidagi jonli darslar va vorkshoplar. Tez orada.", "Занятия с преподавателем. Скоро.")} />}
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
