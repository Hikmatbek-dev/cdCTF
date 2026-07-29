import { Link } from "wouter";
import {
  GraduationCap, Clock, Award, CheckCircle2, ChevronRight, Play,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { RoadmapTree } from "@/components/RoadmapTree";
import { normalizeArray } from "@/lib/api-shapes";
import { MODULE_ART, LinuxArt } from "@/components/ModuleArt";
import { LoadFailure } from "@/components/LoadFailure";
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
  const { data, isLoading, isError, refetch } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const modules = normalizeArray<ModuleSummary>(data, ["id", "title"]);

  // The "current" module is the first one not yet finished — highlighted so a
  // returning learner sees exactly where to pick up.
  const currentIndex = modules.findIndex(m => !(m.certificateSerial || m.examPassed) || m.completedCount < m.lessonCount);

  return (
    <div className="min-h-screen bg-background text-foreground page">
      <div className="shell-narrow">
        <header className="mb-10">
          <div className="eyebrow mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            {t("cdCTF · Your path", "cdCTF · Sizning yo'lingiz", "cdCTF · Ваш путь")}
          </div>
          <h1 className="mb-3">
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

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
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
          /* The curriculum as a roadmap: three stages on a spine rather than
             eight interchangeable rows. */
          <RoadmapTree modules={modules} />
        )}
      </div>
    </div>
  );
}
