import { useState } from "react";
import { useLocation, Link } from "wouter";
import { GraduationCap, Award, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  useGetDiplomaStatus, getGetDiplomaStatusQueryKey, useIssueDiploma,
} from "@workspace/api-client-react";

/** The ApiError carries `status` and `message`. */
function errorMessage(err: unknown, fallback: string) {
  const message = (err as { message?: string })?.message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}

/**
 * The program diploma: earned by passing every module. This page shows a
 * learner's standing across the whole program, and — once every module is
 * done — captures their passport name and issues the headline credential.
 */
export default function DiplomaPage() {
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");

  const { data, isLoading } = useGetDiplomaStatus({ query: { queryKey: getGetDiplomaStatusQueryKey() } });
  const issueDiploma = useIssueDiploma();

  const handleIssue = () => {
    issueDiploma.mutate({ data: { fullName } }, {
      onSuccess: d => setLocation(`/diploma/${d.serial}`),
      onError: err => {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          toast({ title: t("Sign in first", "Avval tizimga kiring", "Сначала войдите") });
          setLocation("/login");
          return;
        }
        toast({
          title: t("Could not issue the diploma", "Diplomni berib bo'lmadi", "Не удалось выдать диплом"),
          description: errorMessage(err, ""),
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-6 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const status = data;
  const total = status?.totalModules ?? 0;
  const passed = status?.passedModules ?? 0;
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <div className="eyebrow mb-3 flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5" />
          {t("cdCTF · Program Diploma", "cdCTF · Dastur diplomi", "cdCTF · Диплом программы")}
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          <span className="gradient-text">{t("Your diploma", "Sizning diplomingiz", "Ваш диплом")}</span>
        </h1>
        <p className="text-muted-foreground mb-10 max-w-xl">
          {t(
            "The headline credential: earned by passing the final exam of every module. One diploma for the whole six-month program.",
            "Asosiy hujjat: har bir modulning yakuniy imtihonidan o'tib olinadi. Butun 6 oylik dastur uchun bitta diplom.",
            "Главный документ: выдаётся за сдачу итогового экзамена каждого модуля. Один диплом за всю 6-месячную программу.",
          )}
        </p>

        {/* Already issued → link to the public diploma. */}
        {status?.serial ? (
          <section className="glass-card p-6" data-testid="section-diploma-issued">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">{t("Diploma earned", "Diplom olindi", "Диплом получен")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {t(
                `Issued to ${status.fullName} with an average score of ${status.averageScore}%.`,
                `${status.fullName} nomiga ${status.averageScore}% o'rtacha ball bilan berildi.`,
                `Выдан на имя ${status.fullName} со средним баллом ${status.averageScore}%.`,
              )}
            </p>
            <Link href={`/diploma/${status.serial}`}>
              <Button data-testid="button-view-diploma">
                <Award className="w-4 h-4 mr-2" />
                {t("View diploma", "Diplomni ko'rish", "Посмотреть диплом")}
              </Button>
            </Link>
          </section>

        /* All modules passed, not yet claimed → the name form. */
        ) : status?.available ? (
          <section className="glass-card p-6" data-testid="section-diploma-claim">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("You finished the program", "Siz dasturni tugatdingiz", "Вы прошли программу")}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                `All ${total} modules passed, average ${status.averageScore}%. Enter your name exactly as it appears on your passport — it is printed on the diploma.`,
                `Barcha ${total} moduldan o'tildi, o'rtacha ${status.averageScore}%. Ismingizni pasportdagidek kiriting — u diplomga chop etiladi.`,
                `Все ${total} модулей сданы, средний ${status.averageScore}%. Введите имя точно как в паспорте — оно печатается на дипломе.`,
              )}
            </p>
            <div className="space-y-2 mb-6">
              <Label htmlFor="fullName">
                {t("Full name (as on passport)", "To'liq ism (pasportdagidek)", "Полное имя (как в паспорте)")}
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t("Aziz Karimov", "Aziz Karimov", "Азиз Каримов")}
                data-testid="input-diploma-name"
              />
            </div>
            <Button
              onClick={handleIssue}
              disabled={fullName.trim().length < 3 || issueDiploma.isPending}
              data-testid="button-issue-diploma"
            >
              {issueDiploma.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("Issue diploma", "Diplomni olish", "Получить диплом")}
            </Button>
          </section>

        /* Still in progress → show the standing and point at the modules. */
        ) : (
          <section className="glass-card p-6" data-testid="section-diploma-progress">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t("Modules passed", "O'tilgan modullar", "Пройдено модулей")}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{passed}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-6">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${percent}%`, boxShadow: percent > 0 ? "0 0 10px hsl(var(--glow))" : "none" }}
              />
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {t(
                "Pass the final exam of every module to unlock the diploma.",
                "Diplomni ochish uchun har bir modulning yakuniy imtihonidan o'ting.",
                "Сдайте итоговый экзамен каждого модуля, чтобы открыть диплом.",
              )}
            </p>
            <Link href="/modules">
              <Button variant="outline" data-testid="button-to-modules">
                {t("Go to modules", "Modullarga o'tish", "К модулям")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
