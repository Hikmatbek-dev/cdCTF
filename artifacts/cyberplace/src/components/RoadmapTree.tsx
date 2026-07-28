import { Link } from "wouter";
import { Check, Lock, Play } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { MODULE_ART } from "@/components/ModuleArt";

/**
 * The curriculum as a roadmap rather than a list.
 *
 * Eight modules stacked in a column read as eight equal, interchangeable rows —
 * nothing shows that Linux and Networking are the ground floor, or that
 * Exploitation sits on top of five other things. Grouping them into the three
 * stages the data already carries (beginner → intermediate → advanced), on a
 * spine, makes the shape of the path legible at a glance and gives a newcomer
 * an obvious place to start.
 *
 * On a phone the spine moves to the left edge and the stages stack; the
 * structure survives, the fan-out does not.
 */

export type RoadmapModule = {
  id: number;
  /** Optional: modules created before slugs existed fall back to a generic mark. */
  slug?: string;
  title: string;
  titleUz?: string | null;
  titleRu?: string | null;
  difficulty: string;
  lessonCount: number;
  completedCount: number;
  examPassed: boolean;
  certificateSerial?: string | null;
  estimatedHours?: number;
};

const STAGES = [
  { key: "beginner", hue: 152 },
  { key: "intermediate", hue: 43 },
  { key: "advanced", hue: 350 },
] as const;

export function RoadmapTree({ modules }: { modules: RoadmapModule[] }) {
  const { t } = useLang();

  const stageLabel = (key: string) =>
    key === "beginner" ? t("Foundations", "Poydevor", "Основы")
      : key === "intermediate" ? t("Core skills", "Asosiy ko'nikmalar", "Ключевые навыки")
        : t("Advanced", "Yuqori daraja", "Продвинутый уровень");

  const stageNote = (key: string) =>
    key === "beginner"
      ? t("Start here — the shell and the network everything else runs on.",
          "Shu yerdan boshlang — hamma narsa ustida ishlaydigan shell va tarmoq.",
          "Начните здесь — оболочка и сеть, на которых работает всё остальное.")
      : key === "intermediate"
        ? t("The three domains most security work actually happens in.",
            "Xavfsizlik ishining ko'p qismi shu uch yo'nalishda kechadi.",
            "Три области, где происходит большая часть работы по безопасности.")
        : t("Putting it together — attack chains, investigation, competition.",
            "Hammasini birlashtirish — hujum zanjiri, tekshiruv, musobaqa.",
            "Собираем вместе — цепочки атак, расследование, соревнования.");

  // The first module that is not finished — the one place a returning learner
  // should be sent, and the boundary after which everything reads as "later".
  const currentIndex = modules.findIndex(
    m => !(m.certificateSerial || m.examPassed) || m.completedCount < m.lessonCount,
  );

  return (
    <div className="relative">
      {/* The spine. Centred on desktop, hugging the left edge on mobile. */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" aria-hidden="true" />

      <div className="space-y-12">
        {STAGES.map((stage, si) => {
          const inStage = modules.filter(m => m.difficulty === stage.key);
          if (inStage.length === 0) return null;

          return (
            <section key={stage.key} className="relative">
              {/* Stage marker on the spine */}
              <div className="relative flex md:justify-center mb-6">
                <div
                  className="relative z-10 inline-flex items-center gap-2.5 rounded-full border px-4 py-2 bg-background ml-0 md:ml-0"
                  style={{ borderColor: `hsl(${stage.hue} 60% 45% / 0.45)` }}
                >
                  {/* 45% lightness put white on a mid-tone green at 2.5:1 — the
                      stage number on the main learning path was the least
                      readable text on the site. 32% clears 4.5:1 for all three
                      stage hues and the marker still reads as its colour. */}
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: `hsl(${stage.hue} 62% 32%)` }}
                  >
                    {si + 1}
                  </span>
                  <span className="font-semibold text-sm">{stageLabel(stage.key)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {inStage.length} {t("modules", "modul", "модулей")}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground max-w-lg mx-auto mb-7 pl-10 md:pl-0">
                {stageNote(stage.key)}
              </p>

              {/* The modules of this stage, fanned out either side of the spine. */}
              <div className="grid md:grid-cols-2 gap-4 pl-10 md:pl-0">
                {inStage.map(m => {
                  const idx = modules.findIndex(x => x.id === m.id);
                  const done = Boolean(m.certificateSerial || m.examPassed);
                  const isCurrent = idx === currentIndex;
                  const pct = m.lessonCount > 0 ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
                  const Art = MODULE_ART[m.slug as keyof typeof MODULE_ART];

                  return (
                    <Link href={`/modules/${m.id}`} key={m.id}>
                      <div
                        className={`group relative rounded-xl border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 cursor-pointer h-full ${
                          done
                            ? "border-[hsl(var(--neon)/.45)] hover:shadow-[0_18px_40px_-24px_hsl(var(--neon))]"
                            : isCurrent
                            ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/.2)] hover:shadow-[0_18px_40px_-24px_hsl(var(--primary))]"
                            : "border-border hover:border-primary/40 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary))]"
                        }`}
                        data-testid={`roadmap-module-${m.id}`}
                      >
                        {/* Status rail, same language as the challenge grid. */}
                        <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-[3px] z-10 ${
                          done ? "bg-[hsl(var(--neon))]" : isCurrent ? "bg-primary" : "bg-transparent group-hover:bg-primary/60"
                        } transition-colors`} />

                        {/* The cover leads, as it does on a challenge card — a
                            56px thumbnail beside a title is a list row, and the
                            curriculum deserves to look like the rooms it is. */}
                        <div
                          className="relative h-24 overflow-hidden"
                          style={{ backgroundColor: `hsl(${stage.hue} 55% 45% / 0.16)` }}
                        >
                          {Art ? <Art className="w-full h-full transition-transform duration-700 group-hover:scale-110" /> : <Play className="w-6 h-6 text-primary m-auto" />}
                          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                        </div>

                        <div className="flex items-start gap-4 p-4 pt-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              {done && (
                                <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--neon))] font-bold">
                                  <Check className="w-3 h-3" /> {t("Done", "Tugatilgan", "Пройден")}
                                </span>
                              )}
                              {isCurrent && !done && (
                                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                                  <Play className="w-3 h-3" /> {t("Start here", "Shu yerdan", "Начать здесь")}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold leading-snug mb-2 group-hover:text-primary transition-colors">
                              {t(m.title, m.titleUz || m.title, m.titleRu || m.title)}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span className="tabular-nums">{m.lessonCount} {t("lessons", "dars", "уроков")}</span>
                              {m.estimatedHours ? <span className="tabular-nums">· {m.estimatedHours}{t("h", "s", "ч")}</span> : null}
                            </div>

                            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: done ? "hsl(152 60% 45%)" : "hsl(var(--primary))" }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* The end of the path. */}
        <div className="relative flex md:justify-center pl-10 md:pl-0">
          <div className="relative z-10 inline-flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-background px-4 py-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
              <Lock className="w-3 h-3 text-white" />
            </span>
            <span className="font-semibold text-sm">{t("Programme diploma", "Dastur diplomi", "Диплом программы")}</span>
            <span className="text-xs text-muted-foreground">
              {t("pass every module", "har modulni o'ting", "пройдите все модули")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
