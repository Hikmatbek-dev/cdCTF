import { Link, useRoute } from "wouter";
import { ArrowLeft, CheckCircle2, Circle, Clock, Award, Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetModule, getGetModuleQueryKey } from "@workspace/api-client-react";

type ModuleLesson = {
  id: number;
  title: string; titleUz?: string | null; titleRu?: string | null;
  points: number;
  isCompleted: boolean;
};

type ModuleDetail = {
  id: number;
  title: string; titleUz?: string | null; titleRu?: string | null;
  description: string; descriptionUz?: string | null; descriptionRu?: string | null;
  estimatedHours: number;
  passScore: number;
  examQuestionCount: number;
  lessons: ModuleLesson[];
  completedCount: number;
  lessonCount: number;
  examUnlocked: boolean;
  exam: { bestScore: number; passed: boolean; attemptCount: number };
  certificateSerial?: string | null;
};

export default function ModuleDetailPage() {
  const [, params] = useRoute("/modules/:id");
  const id = Number(params?.id);
  const { t } = useLang();

  const { data, isLoading } = useGetModule(id, {
    query: { queryKey: getGetModuleQueryKey(id), enabled: Number.isInteger(id) && id > 0 },
  });
  const mod = data as ModuleDetail | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6 text-center py-20">
          <p className="text-muted-foreground mb-6">
            {t("Module not found.", "Modul topilmadi.", "Модуль не найден.")}
          </p>
          <Link href="/modules">
            <Button variant="outline">{t("Back to modules", "Modullarga qaytish", "К модулям")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const percent = mod.lessonCount > 0 ? Math.round((mod.completedCount / mod.lessonCount) * 100) : 0;
  const remaining = mod.lessonCount - mod.completedCount;

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Link href="/modules">
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("Modules", "Modullar", "Модули")}
          </button>
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-3" data-testid="text-module-title">
            {t(mod.title, mod.titleUz ?? undefined, mod.titleRu ?? undefined)}
          </h1>
          <p className="text-muted-foreground mb-5">
            {t(mod.description, mod.descriptionUz ?? undefined, mod.descriptionRu ?? undefined)}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {t(`${mod.estimatedHours} hours`, `${mod.estimatedHours} soat`, `${mod.estimatedHours} часов`)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {t(`${mod.lessonCount} lessons`, `${mod.lessonCount} ta dars`, `${mod.lessonCount} уроков`)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              {t(
                `Certificate at ${mod.passScore}%`,
                `${mod.passScore}% dan sertifikat`,
                `Сертификат от ${mod.passScore}%`,
              )}
            </span>
          </div>
        </header>

        <div className="border border-border rounded-xl p-5 bg-card mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t("Your progress", "Sizning natijangiz", "Ваш прогресс")}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {mod.completedCount}/{mod.lessonCount}
            </span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            {t("Lessons", "Darslar", "Уроки")}
          </h2>
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {mod.lessons.map((lesson, i) => (
              <Link href={`/learn/${lesson.id}`} key={lesson.id}>
                <div
                  className="flex items-center gap-4 px-5 py-4 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  data-testid={`row-module-lesson-${lesson.id}`}
                >
                  {lesson.isCompleted
                    ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    : <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />}
                  <span className="text-sm text-muted-foreground tabular-nums w-6 shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">
                    {t(lesson.title, lesson.titleUz ?? undefined, lesson.titleRu ?? undefined)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">+{lesson.points}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-border rounded-xl p-6 bg-card">
          <h2 className="text-lg font-semibold mb-2">
            {t("Final exam", "Yakuniy imtihon", "Итоговый экзамен")}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {t(
              `${mod.examQuestionCount} questions. Score ${mod.passScore}% or higher to earn your certificate.`,
              `${mod.examQuestionCount} ta savol. Sertifikat olish uchun ${mod.passScore}% yoki undan yuqori ball to'plang.`,
              `${mod.examQuestionCount} вопросов. Наберите ${mod.passScore}% или выше, чтобы получить сертификат.`,
            )}
          </p>

          {mod.exam.attemptCount > 0 && (
            <p className="text-sm mb-5">
              {t("Best score:", "Eng yaxshi ball:", "Лучший балл:")}{" "}
              <span className="font-semibold tabular-nums">{mod.exam.bestScore}%</span>
            </p>
          )}

          {mod.certificateSerial ? (
            <Link href={`/certificate/${mod.certificateSerial}`}>
              <Button className="w-full sm:w-auto" data-testid="button-view-certificate">
                <Award className="w-4 h-4 mr-2" />
                {t("View certificate", "Sertifikatni ko'rish", "Посмотреть сертификат")}
              </Button>
            </Link>
          ) : mod.examUnlocked ? (
            <Link href={`/modules/${mod.id}/exam`}>
              <Button className="w-full sm:w-auto" data-testid="button-start-exam">
                {mod.exam.passed
                  ? t("Get certificate", "Sertifikat olish", "Получить сертификат")
                  : mod.exam.attemptCount > 0
                    ? t("Retake exam", "Imtihonni qayta topshirish", "Пересдать экзамен")
                    : t("Start exam", "Imtihonni boshlash", "Начать экзамен")}
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 shrink-0" />
              {t(
                `Finish all lessons first — ${remaining} left.`,
                `Avval barcha darslarni tugating — ${remaining} ta qoldi.`,
                `Сначала пройдите все уроки — осталось ${remaining}.`,
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
