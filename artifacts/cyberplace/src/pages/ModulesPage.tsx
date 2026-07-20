import { Link } from "wouter";
import { GraduationCap, Clock, Award, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray } from "@/lib/api-shapes";
import { useListModules, getListModulesQueryKey } from "@workspace/api-client-react";

type ModuleSummary = {
  id: number;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  difficulty: string;
  estimatedHours: number;
  lessonCount: number;
  completedCount: number;
  examPassed: boolean;
  certificateSerial?: string | null;
};

/** The badge wording learners see, rather than the raw enum from the database. */
function difficultyLabel(difficulty: string, t: (en: string, uz?: string, ru?: string) => string) {
  if (difficulty === "advanced") return t("Advanced", "Yuqori", "Продвинутый");
  if (difficulty === "intermediate") return t("Intermediate", "O'rta", "Средний");
  return t("Beginner", "Boshlang'ich", "Начальный");
}

export default function ModulesPage() {
  const { t } = useLang();
  const { data, isLoading } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const modules = normalizeArray<ModuleSummary>(data, ["id", "title"]);

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("Modules", "Modullar", "Модули")}
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {t(
              "Full courses, in order. Finish every lesson, pass the final exam, and get a cdCTF certificate with your score on it.",
              "To'liq kurslar, ketma-ketlikda. Barcha darslarni tugating, yakuniy imtihondan o'ting va balingiz yozilgan cdCTF sertifikatini oling.",
              "Полные курсы по порядку. Пройдите все уроки, сдайте итоговый экзамен и получите сертификат cdCTF с вашим баллом.",
            )}
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : modules.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 text-center">
            <p className="text-muted-foreground">
              {t("No modules yet.", "Hozircha modullar yo'q.", "Пока нет модулей.")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map(m => {
              const percent = m.lessonCount > 0 ? Math.round((m.completedCount / m.lessonCount) * 100) : 0;
              return (
                <Link href={`/modules/${m.id}`} key={m.id}>
                  <article
                    className="border border-border rounded-xl p-6 bg-card hover:border-primary/40 transition-colors cursor-pointer"
                    data-testid={`card-module-${m.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h2 className="text-lg font-semibold" data-testid={`text-module-title-${m.id}`}>
                        {t(m.title, m.titleUz ?? undefined, m.titleRu ?? undefined)}
                      </h2>
                      {m.certificateSerial ? (
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          <Award className="w-3.5 h-3.5" />
                          {t("Certified", "Sertifikatli", "Сертифицирован")}
                        </span>
                      ) : m.examPassed ? (
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t("Passed", "O'tildi", "Сдан")}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {t(m.description, m.descriptionUz ?? undefined, m.descriptionRu ?? undefined)}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="px-2 py-0.5 rounded border border-border">{difficultyLabel(m.difficulty, t)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {t(`${m.estimatedHours} hours`, `${m.estimatedHours} soat`, `${m.estimatedHours} часов`)}
                      </span>
                      <span>
                        {t(`${m.lessonCount} lessons`, `${m.lessonCount} ta dars`, `${m.lessonCount} уроков`)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={percent} className="h-1.5" />
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {m.completedCount}/{m.lessonCount}
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
