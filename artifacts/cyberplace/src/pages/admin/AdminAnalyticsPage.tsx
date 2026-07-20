import { GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray } from "@/lib/api-shapes";
import { useGetLearnAnalytics, getGetLearnAnalyticsQueryKey } from "@workspace/api-client-react";

type FunnelRow = {
  moduleId: number;
  title: string;
  lessonCount: number;
  learners: number;
  completedAllLessons: number;
  examPassed: number;
  certified: number;
};

/** Percent of `n` against a base, guarded against divide-by-zero. */
function pct(n: number, base: number) {
  return base > 0 ? Math.round((n / base) * 100) : 0;
}

export default function AdminAnalyticsPage() {
  const { t } = useLang();
  const { data, isLoading } = useGetLearnAnalytics({ query: { queryKey: getGetLearnAnalyticsQueryKey() } });
  const modules = normalizeArray<FunnelRow>(data?.modules, ["modules"]);
  const diplomas = data?.diplomasIssued ?? 0;

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6 max-w-5xl">
        <div className="eyebrow mb-2">{t("Learning funnel", "O'rganish varonkasi", "Воронка обучения")}</div>
        <h1 className="text-xl font-bold mb-1">{t("Analytics", "Analitika", "Аналитика")}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t(
            "Where learners progress and where they drop off, per module.",
            "O'quvchilar qayerda o'sadi va qayerda to'xtaydi — har modul bo'yicha.",
            "Где учащиеся продвигаются и где отсеиваются, по каждому модулю.",
          )}
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : modules.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <p className="text-muted-foreground">{t("No modules yet.", "Hozircha modullar yo'q.", "Пока нет модулей.")}</p>
          </div>
        ) : (
          <>
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
              <GraduationCap className="w-4 h-4" />
              {t(`${diplomas} program diplomas issued`, `${diplomas} ta dastur diplomi berildi`, `Выдано дипломов программы: ${diplomas}`)}
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="font-medium py-3 px-4">{t("Module", "Modul", "Модуль")}</th>
                      <th className="font-medium py-3 px-4 text-right">{t("Started", "Boshladi", "Начали")}</th>
                      <th className="font-medium py-3 px-4 text-right">{t("Finished lessons", "Darslarni tugatdi", "Прошли уроки")}</th>
                      <th className="font-medium py-3 px-4 text-right">{t("Passed exam", "Imtihondan o'tdi", "Сдали экзамен")}</th>
                      <th className="font-medium py-3 px-4 text-right">{t("Certified", "Sertifikat", "Сертификат")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(m => (
                      <tr key={m.moduleId} className="border-b border-border/50 last:border-0" data-testid={`analytics-row-${m.moduleId}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium">{m.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {t(`${m.lessonCount} lessons`, `${m.lessonCount} ta dars`, `${m.lessonCount} уроков`)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-medium">{m.learners}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                          {m.completedAllLessons}
                          <span className="text-xs ml-1 opacity-60">({pct(m.completedAllLessons, m.learners)}%)</span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                          {m.examPassed}
                          <span className="text-xs ml-1 opacity-60">({pct(m.examPassed, m.learners)}%)</span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-primary font-medium">
                          {m.certified}
                          <span className="text-xs ml-1 opacity-60">({pct(m.certified, m.learners)}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              {t(
                "Percentages are relative to learners who started the module. A steep drop from one column to the next is where to look.",
                "Foizlar modulni boshlagan o'quvchilarga nisbatan. Bir ustundan keyingisiga keskin tushish — e'tibor beriladigan joy.",
                "Проценты — от начавших модуль. Резкое падение от столбца к столбцу — место для внимания.",
              )}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
