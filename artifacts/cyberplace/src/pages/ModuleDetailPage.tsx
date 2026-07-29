import { Link, useRoute } from "wouter";
import { ArrowLeft, CheckCircle2, Circle, Clock, Award, Lock, FileText, Play, ArrowRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure, isNotFound } from "@/components/LoadFailure";
import { useLang } from "@/lib/LanguageContext";
import { useGetModule, getGetModuleQueryKey } from "@workspace/api-client-react";
import { ChallengeArt } from "@/components/ChallengeArt";
import { SolvedBadge, solvedCardBorder } from "@/components/SolvedMark";
import { categoryStyle, difficultyStyle } from "@/lib/category-style";

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
  /** The challenges that drill this module, and how many the reader has solved. */
  practice?: {
    categories: string[]; total: number; solved: number;
    challenges?: Array<{
      id: number; name: string; nameUz?: string | null; nameRu?: string | null;
      category: string; difficulty: string; points: number; isSolved: boolean;
    }>;
  } | null;
  lessons: ModuleLesson[];
  completedCount: number;
  lessonCount: number;
  examUnlocked: boolean;
  exam: { bestScore: number; passed: boolean; attemptCount: number };
  certificateSerial?: string | null;
};

export default function ModuleDetailPage() {
  const [routeMatches, params] = useRoute("/modules/:id");
  const id = Number(params?.id);
  const { t } = useLang();

  const { data, isLoading, isError, error, refetch } = useGetModule(id, {
    query: { queryKey: getGetModuleQueryKey(id), enabled: Number.isInteger(id) && id > 0 },
  });
  const mod = data as ModuleDetail | undefined;

  // See ModuleExamPage: the outgoing page outlives the route match, and neither
  // the not-found state nor null is safe to draw then.
  if (!routeMatches || isLoading) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // A dropped connection is not a missing module. Saying "Module not found."
  // to someone whose phone lost signal is wrong and leaves them nowhere to go.
  if (isError && !isNotFound(error)) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow">
          <LoadFailure onRetry={() => refetch()} backHref="/modules" backLabel={t("All modules", "Barcha modullar", "Все модули")} />
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow text-center py-20">
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
  // Resume target: the first lesson not yet completed, else the first lesson.
  const resumeLesson = mod.lessons.find(l => !l.isCompleted) ?? mod.lessons[0];
  const started = mod.completedCount > 0;

  return (
    <div className="min-h-screen bg-background text-foreground page">
      <div className="shell-narrow">
        <Link href="/modules">
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("Modules", "Modullar", "Модули")}
          </button>
        </Link>

        <header className="mb-8">
          <h1 className="font-semibold mb-3" data-testid="text-module-title">
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

        <div className="glass-card mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t("Your progress", "Sizning natijangiz", "Ваш прогресс")}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {mod.completedCount}/{mod.lessonCount} · {percent}%
            </span>
          </div>
          <Progress value={percent} className="h-2 mb-5" />
          {resumeLesson && !mod.certificateSerial && (
            <Link href={`/learn/${resumeLesson.id}`}>
              <button className="cyber-button h-11 px-6 w-full sm:w-auto" data-testid="button-resume-module">
                <Play className="w-4 h-4 fill-current" />
                {started
                  ? t("Continue learning", "O'rganishni davom ettirish", "Продолжить обучение")
                  : t("Start the first lesson", "Birinchi darsni boshlash", "Начать первый урок")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          )}
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

        {/* Practice. Reading the module and drilling it were two unconnected
            halves of this platform; this is the hand-off from one to the other. */}
        {mod.practice && mod.practice.total > 0 && (
          <section className="border border-primary/25 rounded-xl p-6 bg-card mb-6" data-testid="module-practice">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              {t("Practise what you learned", "O'rganganingizni mashq qiling", "Практика по модулю")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                `${mod.practice.total} challenges use this module's material. Reading it is half the work — breaking something with it is the other half.`,
                `${mod.practice.total} ta topshiriq shu modul materialiga tayanadi. O'qish — ishning yarmi, uni qo'llab biror narsani buzish — ikkinchi yarmi.`,
                `${mod.practice.total} заданий опираются на материал этого модуля. Прочитать — половина дела, применить — вторая.`,
              )}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{t("Solved", "Yechilgan", "Решено")}</span>
              <span className="tabular-nums">{mod.practice.solved}/{mod.practice.total}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden mb-5">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((mod.practice.solved / mod.practice.total) * 100)}%` }}
              />
            </div>

            {/* The challenges themselves, unsolved and easiest first, so the
                next thing to attempt is the first thing on the list — a count
                and a link left the reader to go and find them. */}
            {mod.practice.challenges && mod.practice.challenges.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                {mod.practice.challenges.map(c => {
                  const cat = categoryStyle(c.category);
                  const diff = difficultyStyle(c.difficulty);
                  return (
                    <Link href={`/ctf/${c.id}`} key={c.id}>
                      <div
                        className={`group flex items-center gap-3 rounded-lg border overflow-hidden bg-card hover:-translate-y-0.5 transition-all cursor-pointer ${solvedCardBorder(c.isSolved)}`}
                        data-testid={`module-practice-${c.id}`}
                      >
                        <ChallengeArt name={c.name} category={c.category} hue={cat.hue} solved={c.isSolved} className="w-16 h-14 shrink-0" />
                        <div className="min-w-0 flex-1 py-2">
                          <div className={`text-sm font-medium truncate transition-colors ${c.isSolved ? "text-muted-foreground group-hover:text-foreground" : "group-hover:text-primary"}`}>
                            {t(c.name, c.nameUz ?? undefined, c.nameRu ?? undefined)}
                          </div>
                          {/* Same badge as the challenge list, in place of the
                              bare difficulty text when a challenge is done. */}
                          {c.isSolved ? <SolvedBadge className="mt-0.5" /> : <div className={`text-xs capitalize ${diff.text}`}>{c.difficulty}</div>}
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground pr-3 shrink-0">{c.points}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <Link href={`/ctf?category=${encodeURIComponent(mod.practice.categories[0])}`}>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-module-practice">
                <Flag className="w-4 h-4 mr-2" />
                {mod.practice.total > (mod.practice.challenges?.length ?? 0)
                  ? t(`See all ${mod.practice.total} challenges`, `Barcha ${mod.practice.total} topshiriqni ko'rish`, `Все ${mod.practice.total} заданий`)
                  : t("Open the challenges", "Topshiriqlarni ochish", "Открыть задания")}
              </Button>
            </Link>
          </section>
        )}

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
