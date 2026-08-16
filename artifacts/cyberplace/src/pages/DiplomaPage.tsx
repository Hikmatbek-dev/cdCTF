import { useState } from "react";
import { useLocation, Link } from "wouter";
import { GraduationCap, Award, Loader2, ArrowRight, Lock } from "lucide-react";
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
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow space-y-4">
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
    <div className="min-h-screen bg-background text-foreground page relative">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-60 mix-blend-screen" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] opacity-40 mix-blend-screen" />
      </div>

      <div className="shell-narrow relative z-10 py-16">
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-700">
            <GraduationCap className="w-4 h-4" />
            {t("cdCTF · Program Diploma", "cdCTF · Dastur diplomi", "cdCTF · Диплом программы")}
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-center mb-6 tracking-tight animate-in zoom-in-95 fade-in duration-700 delay-150">
          <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent">
            {t("Your Ultimate Achievement", "Sizning Yakuniy Yutug'ingiz", "Ваше Главное Достижение")}
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground text-center mb-16 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          {t(
            "The headline credential: earned by mastering every module in the program. One definitive diploma representing your complete journey.",
            "Asosiy hujjat: dasturdagi har bir modulni mukammal o'zlashtirish orqali olinadi. Butun sayohatingizni ifodalovchi yakuniy diplom.",
            "Главный документ: выдаётся за освоение каждого модуля программы. Один окончательный диплом, представляющий весь ваш путь.",
          )}
        </p>

        <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          {/* Already issued → link to the public diploma. */}
          {status?.serial ? (
            <section className="glass-card rounded-3xl p-8 sm:p-12 text-center shadow-2xl border-primary/30 relative overflow-hidden" data-testid="section-diploma-issued">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
              <div className="relative z-10">
                <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-primary/20">
                  <Award className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-black mb-4">{t("Diploma Earned", "Diplom Olingan", "Диплом Получен")}</h2>
                <p className="text-base text-muted-foreground mb-8">
                  {t(
                    `Issued to ${status.fullName} with a remarkable average score of ${status.averageScore}%.`,
                    `${status.fullName} nomiga ajoyib ${status.averageScore}% o'rtacha ball bilan berildi.`,
                    `Выдан на имя ${status.fullName} с выдающимся средним баллом ${status.averageScore}%.`,
                  )}
                </p>
                <Link href={`/diploma/${status.serial}`}>
                  <button className="cyber-button h-14 px-10 text-lg w-full sm:w-auto shadow-primary/20" data-testid="button-view-diploma">
                    <Award className="w-5 h-5 mr-3" />
                    {t("View Your Diploma", "Diplomni Ko'rish", "Посмотреть Свой Диплом")}
                  </button>
                </Link>
              </div>
            </section>

          /* All modules passed, not yet claimed → the name form. */
          ) : status?.available ? (
            <section className="glass-card rounded-3xl p-8 sm:p-12 shadow-2xl border-emerald-500/30 text-center relative overflow-hidden" data-testid="section-diploma-claim">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent z-0" />
              <div className="relative z-10">
                <div className="w-24 h-24 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-emerald-500/20">
                  <GraduationCap className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-foreground">
                  {t("You Conquered the Program!", "Siz Dasturni Zapt Etdingiz!", "Вы Покорили Программу!")}
                </h2>
                <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
                  {t(
                    `All ${total} modules completed brilliantly with an average of ${status.averageScore}%. Enter your name exactly as it appears on your passport to claim your ultimate reward.`,
                    `Barcha ${total} modul o'rtacha ${status.averageScore}% bilan ajoyib tarzda yakunlandi. Yakuniy mukofotingizni olish uchun ismingizni pasportdagidek kiriting.`,
                    `Все ${total} модулей блестяще завершены со средним ${status.averageScore}%. Введите имя точно как в паспорте, чтобы получить вашу главную награду.`,
                  )}
                </p>
                
                <div className="space-y-4 mb-8 text-left max-w-sm mx-auto">
                  <Label htmlFor="fullName" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    {t("Full name (as on passport)", "To'liq ism (pasportdagidek)", "Полное имя (как в паспорте)")}
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={t("e.g. Aziz Karimov", "masalan, Aziz Karimov", "напр. Азиз Каримов")}
                    className="h-14 text-lg bg-background/50 border-emerald-500/30 focus-visible:ring-emerald-500/50 rounded-xl"
                    data-testid="input-diploma-name"
                  />
                </div>
                
                <button
                  onClick={handleIssue}
                  disabled={fullName.trim().length < 3 || issueDiploma.isPending}
                  className="cyber-button h-14 px-10 text-lg w-full max-w-sm shadow-emerald-500/20 disabled:opacity-50 transition-all"
                  style={{ '--btn-primary': '16, 185, 129' } as React.CSSProperties} // Emerald color hack
                  data-testid="button-issue-diploma"
                >
                  {issueDiploma.isPending && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                  {t("Claim Official Diploma", "Rasmiy Diplomni Olish", "Получить Официальный Диплом")}
                </button>
              </div>
            </section>

          /* Still in progress → show the standing and point at the modules. */
          ) : (
            <section className="glass-card rounded-3xl p-8 sm:p-12 shadow-xl border-border/50 text-center" data-testid="section-diploma-progress">
              <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-8">{t("Diploma Locked", "Diplom Qulflangan", "Диплом Заблокирован")}</h2>
              
              <div className="mb-10">
                <div className="flex items-end justify-between mb-3 px-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Global Progress", "Umumiy Holat", "Общий Прогресс")}</span>
                  <span className="text-2xl font-black tabular-nums">{passed} / {total}</span>
                </div>
                <div className="h-4 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary relative overflow-hidden transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%`, boxShadow: percent > 0 ? "0 0 20px hsl(var(--glow))" : "none" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
              
              <p className="text-base text-muted-foreground mb-8">
                {t(
                  "Conquer the final exam of every module in the path to unlock this ultimate credential.",
                  "Ushbu yakuniy hujjatni ochish uchun yo'nalishdagi har bir modulning yakuniy imtihonini zapt eting.",
                  "Покорите итоговый экзамен каждого модуля на пути, чтобы открыть этот главный документ.",
                )}
              </p>
              
              <Link href="/modules">
                <button className="cyber-button-outline h-14 px-8 text-lg w-full sm:w-auto mx-auto group" data-testid="button-to-modules">
                  {t("Return to Training", "Mashg'ulotlarga Qaytish", "Вернуться к Обучению")}
                  <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" />
                </button>
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
