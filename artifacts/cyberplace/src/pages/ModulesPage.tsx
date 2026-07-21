import { Link } from "wouter";
import {
  GraduationCap, Clock, Award, CheckCircle2, ChevronRight, Play,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray } from "@/lib/api-shapes";
import { MODULE_ART, LinuxArt } from "@/components/ModuleArt";
import { useListModules, getListModulesQueryKey } from "@workspace/api-client-react";

type ModuleSummary = {
  id: number; slug?: string;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string;
  estimatedHours: number;
  lessonCount: number;
  completedCount: number;
  examPassed: boolean;
  certificateSerial?: string | null;
};

// Artwork lives in components/ModuleArt.tsx — one illustration per module, so
// the path reads as a varied journey rather than a wall of identical rows.

/** Difficulty label + colour, so the three levels are visually distinct. */
function difficultyMeta(difficulty: string, t: (en: string, uz?: string, ru?: string) => string) {
  if (difficulty === "advanced") return { label: t("Advanced", "Yuqori", "Продвинутый"), cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  if (difficulty === "intermediate") return { label: t("Intermediate", "O'rta", "Средний"), cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  return { label: t("Beginner", "Boshlang'ich", "Начальный"), cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
}

export default function ModulesPage() {
  const { t } = useLang();
  const { data, isLoading } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const modules = normalizeArray<ModuleSummary>(data, ["id", "title"]);

  // The "current" module is the first one not yet finished — highlighted so a
  // returning learner sees exactly where to pick up.
  const currentIndex = modules.findIndex(m => !(m.certificateSerial || m.examPassed) || m.completedCount < m.lessonCount);

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <header className="mb-10">
          <div className="eyebrow mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            {t("cdCTF · Your path", "cdCTF · Sizning yo'lingiz", "cdCTF · Ваш путь")}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            <span className="gradient-text">{t("The learning path", "O'rganish yo'li", "Путь обучения")}</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t(
              "Follow the path from your first command to a full attack chain. Each stop is a course — finish its lessons, pass the exam, earn a certificate.",
              "Birinchi buyruqdan to'liq hujum zanjirigacha yo'lni bosib o'ting. Har bir bekat — kurs: darslarini tugating, imtihondan o'ting, sertifikat oling.",
              "Пройдите путь от первой команды до полной цепочки атаки. Каждая остановка — курс: пройдите уроки, сдайте экзамен, получите сертификат.",
            )}
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : modules.length === 0 ? (
          <div className="glass-card text-center py-20">
            <p className="text-muted-foreground">
              {t("No modules yet.", "Hozircha modullar yo'q.", "Пока нет модулей.")}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* The spine that ties the stops into one journey. */}
            <div className="absolute left-[19px] top-4 bottom-16 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" aria-hidden="true" />

            <div className="space-y-3">
              {modules.map((m, i) => {
                const percent = m.lessonCount > 0 ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
                const done = Boolean(m.certificateSerial || m.examPassed);
                const isCurrent = i === currentIndex;
                const Art = (m.slug && MODULE_ART[m.slug]) || LinuxArt;
                const diff = difficultyMeta(m.difficulty, t);

                return (
                  <div key={m.id} className="relative flex items-stretch gap-4">
                    {/* Node on the spine. */}
                    <div className="relative z-10 shrink-0 pt-5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        done
                          ? "bg-primary border-primary text-white neon-glow"
                          : isCurrent
                            ? "bg-card border-primary text-primary animate-pulse-glow"
                            : "bg-card border-border text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle2 className="w-5 h-5" /> : String(i + 1).padStart(2, "0")}
                      </div>
                    </div>

                    {/* The stop's card. */}
                    <Link href={`/modules/${m.id}`} className="flex-1 min-w-0">
                      <article
                        className={`glass-card cursor-pointer group flex items-center gap-4 !p-4 ${isCurrent ? "border-primary/50" : ""}`}
                        data-testid={`card-module-${m.id}`}
                      >
                        <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl bg-gradient-to-br from-primary/[0.14] to-accent/[0.06] border border-primary/20 overflow-hidden shrink-0 group-hover:border-primary/40 transition-colors">
                          <Art className="w-full h-full" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${diff.cls}`}>{diff.label}</span>
                            {isCurrent && !done && (
                              <span className="text-[10px] font-medium text-primary inline-flex items-center gap-1">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                {percent > 0 ? t("Continue", "Davom eting", "Продолжить") : t("Start here", "Shu yerdan boshlang", "Начните здесь")}
                              </span>
                            )}
                          </div>
                          <h2 className="text-base sm:text-lg font-semibold truncate group-hover:text-primary transition-colors" data-testid={`text-module-title-${m.id}`}>
                            {t(m.title, m.titleUz ?? undefined, m.titleRu ?? undefined)}
                          </h2>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{m.estimatedHours}{t("h", "s", "ч")}</span>
                            <span>{t(`${m.lessonCount} lessons`, `${m.lessonCount} dars`, `${m.lessonCount} уроков`)}</span>
                            {m.completedCount > 0 && (
                              <span className="text-primary tabular-nums">{m.completedCount}/{m.lessonCount}</span>
                            )}
                          </div>
                          {/* A slim progress bar only when there is progress, to keep untouched cards clean. */}
                          {percent > 0 && !done && (
                            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          )}
                        </div>

                        {done
                          ? <Award className="w-5 h-5 text-primary shrink-0" />
                          : <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />}
                      </article>
                    </Link>
                  </div>
                );
              })}

              {/* The destination: the diploma. */}
              <div className="relative flex items-stretch gap-4">
                <div className="relative z-10 shrink-0 pt-5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-dashed border-primary/50 bg-card text-primary">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <Link href="/diploma" className="flex-1 min-w-0">
                  <article className="glass-card cursor-pointer group flex items-center gap-4 !p-4 border-primary/30" data-testid="card-diploma-cta">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 neon-glow">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="eyebrow mb-1">{t("Destination", "Manzil", "Финал")}</div>
                      <h2 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors">
                        {t("The program diploma", "Dastur diplomi", "Диплом программы")}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("Finish every module to earn it.", "Uni olish uchun barcha modullarni tugating.", "Пройдите все модули, чтобы получить.")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </article>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
