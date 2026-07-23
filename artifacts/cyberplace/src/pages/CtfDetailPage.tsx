import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Download, Flag, AlertTriangle, CheckCircle2, Lock, ExternalLink, Zap, Cpu, GraduationCap, ChevronRight } from "lucide-react";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCtfChallenge, getGetCtfChallengeQueryKey, useSubmitCtfFlag, useGetScoreboard, useListModules, getListModulesQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FadeIn, ScaleIn } from "@/components/PageTransition";

/**
 * Which module teaches the skill a challenge category needs.
 *
 * This is the bridge the site was missing. Every user on the leaderboard has
 * solved challenges and not one has finished a lesson, because nothing ever
 * connected the two. The moment someone is stuck on a crypto challenge is the
 * moment the cryptography module is worth showing them.
 */
const CATEGORY_TO_MODULE: Record<string, string> = {
  Web: "web-application-security",
  Crypto: "cryptography-for-security",
  Forensics: "forensics-and-incident-response",
  Steganography: "forensics-and-incident-response",
  Networking: "networking-for-security",
  Scripting: "linux-command-line",
  OSINT: "reconnaissance-and-scanning",
  Recon: "reconnaissance-and-scanning",
  Exploitation: "exploitation-and-privilege-escalation",
  Pwn: "exploitation-and-privilege-escalation",
  Reverse: "ctf-methodology",
  Miscellaneous: "ctf-methodology",
  Others: "ctf-methodology",
};

export default function CtfDetailPage() {
  const [, params] = useRoute("/ctf/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [flag, setFlag] = useState("");

  const { data: challenge, isLoading } = useGetCtfChallenge(id, {
    query: { enabled: !!id, queryKey: getGetCtfChallengeQueryKey(id) },
  });

  const { data: scoreboard } = useGetScoreboard({ limit: 1 });

  // Resolve the category to a real module so the link is a deep one. Modules
  // are keyed by slug in the map but routed by id, so this needs the list.
  type ModuleRow = { id: number; slug?: string; title: string; titleUz?: string | null; titleRu?: string | null; lessonCount: number };
  const { data: modulesData } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const teachingSlug = challenge?.category ? CATEGORY_TO_MODULE[challenge.category] : undefined;
  const teachingModule = teachingSlug
    ? normalizeArray<ModuleRow>(modulesData, ["id", "title"]).find(m => m.slug === teachingSlug)
    : undefined;
  const total = scoreboard?.total ?? 1;

  const submitFlag = useSubmitCtfFlag();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim()) return;
    submitFlag.mutate(
      { id, data: { flag: flag.trim() } },
      {
        onSuccess: (res) => {
          if (res.correct) {
            toast({ title: t("Correct! Flag accepted!", "To'g'ri! Flag qabul qilindi!", "Верно! Флаг принят!"), description: `+${res.pointsEarned ?? challenge?.points} pts` });
            void qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
          } else if (res.blocked) {
            toast({ title: t("You are blocked!", "Bloklandingiz!", "Вы заблокированы!"), description: t("3 wrong attempts. Contact admin.", "3 marta xato. Adminga murojaat qiling.", "3 ошибки. Обратитесь к администратору."), variant: "destructive" });
            void qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
          } else {
            toast({ title: t("Wrong flag", "Noto'g'ri flag", "Неверный флаг"), description: `${t("Attempts left:", "Qolgan urinishlar:", "Осталось попыток:")} ${3 - res.wrongAttempts}`, variant: "destructive" });
          }
          setFlag("");
        },
        onError: (err) => toast({ title: (err as { message?: string })?.message || t("Error", "Xato", "Ошибка"), variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-32 px-6 relative overflow-hidden">
        <div className="fixed inset-0 mono-grid opacity-10 pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-12">
          <Skeleton className="h-16 w-96 bg-foreground/5 rounded-2xl" />
          <div className="grid lg:grid-cols-3 gap-12">
            <Skeleton className="lg:col-span-2 h-[400px] bg-foreground/5 rounded-[3rem]" />
            <Skeleton className="h-[400px] bg-foreground/5 rounded-[3rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background pt-32 flex items-center justify-center">
        <ScaleIn>
          <div className="text-center">
            <div className="w-20 h-20 bg-foreground/5 border border-foreground/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-10 h-10 text-destructive/50" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">{t("Challenge not found", "Topshiriq topilmadi", "Задание не найдено")}</p>
          </div>
        </ScaleIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-20">
          <FadeIn>
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <DifficultyBadge difficulty={challenge.difficulty} className="rounded-lg px-3 py-1 text-[11px] font-medium shadow-lg border-foreground/5" />
              <div className="px-4 py-1.5 bg-foreground/5 border border-foreground/5 rounded-lg text-xs font-medium text-muted-foreground backdrop-blur-md">{challenge.category}</div>
              
              {challenge.isSolved && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 text-sm font-medium text-primary shadow-xl shadow-primary/10 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" /> {t("Solved", "Yechilgan", "Решено")}
                </div>
              )}
              {challenge.isBlocked && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-destructive/10 border border-destructive/20 text-sm font-medium text-destructive rounded-xl">
                  <Lock className="w-4 h-4" /> {t("Locked", "Bloklangan", "Заблокировано")}
                </div>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-8" data-testid="text-challenge-name">
              <span className="gradient-text">{t(challenge.name, challenge.nameUz ?? undefined, challenge.nameRu ?? undefined)}</span>
            </h1>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-y border-foreground/5">
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">{t("Points", "Ball", "Очки")}</span>
                <span className="text-4xl font-black text-foreground tabular-nums leading-none tracking-tighter">{challenge.points}</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-foreground/5 mx-auto" />
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">{t("Solved by", "Yechganlar", "Решили")}</span>
                <span className="text-4xl font-black text-primary tabular-nums leading-none tracking-tighter">{challenge.solvedCount}</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-foreground/5 mx-auto" />
            </div>
          </FadeIn>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* Briefing */}
            <FadeIn delay={0.2}>
              <div className="glass-card p-10 rounded-[3rem] relative group overflow-hidden border-foreground/10 shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                  <Cpu className="w-80 h-80 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-primary mb-6 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  {t("Description", "Tavsif", "Описание")}
                </h2>
                <p className="text-xl leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium tracking-tight" data-testid="text-description">
                  {t(challenge.description, challenge.descriptionUz ?? undefined, challenge.descriptionRu ?? undefined)}
                </p>
              </div>
            </FadeIn>

            {/* Asset Link */}
            {challenge.fileUrl && (
              <FadeIn delay={0.3}>
                {(() => {
                  const isUrl = challenge.fileUrl.startsWith("http://") || challenge.fileUrl.startsWith("https://");
                  const Icon = isUrl ? ExternalLink : Download;
                  return (
                    <div className="glass-card p-8 flex items-center justify-between group hover:border-primary/40 transition-all rounded-[2.5rem] border-foreground/5">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-foreground/5 border border-foreground/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-xl">
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {isUrl ? t("REMOTE_ACCESS_POINT", "TASHQI HAVOLA", "ТОЧКА_УДАЛЕННОГО_ДОСТУПА") : t("ENCRYPTED_DATA_OBJECT", "MA'LUMOT_PAKETI", "ЗАШИФРОВАННЫЙ_ОБЪЕКТ")}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isUrl ? "ESTABLISH_CONNECTION" : "EXTRACT_FOR_LOCAL_ANALYSIS"}
                          </p>
                        </div>
                      </div>
                      <a href={challenge.fileUrl} target={isUrl ? "_blank" : undefined} rel={isUrl ? "noopener noreferrer" : undefined} download={!isUrl}>
                        <button className="cyber-button h-14 px-10">
                          {isUrl ? t("Open", "Ochish", "Открыть") : t("Download", "Yuklab olish", "Скачать")}
                        </button>
                      </a>
                    </div>
                  );
                })()}
              </FadeIn>
            )}

            {/* Submission Zone */}
            {!challenge.isSolved && !challenge.isBlocked && (
              <FadeIn delay={0.4}>
                <div className="glass-card p-10 rounded-[3rem] border-primary/20 bg-primary/[0.02]">
                  <h2 className="text-sm font-semibold text-primary mb-6 flex items-center gap-3">
                    <Flag className="w-5 h-5" /> {t("Submit the flag", "Flagni topshirish", "Отправить флаг")}
                  </h2>
                  
                  {challenge.wrongAttempts > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 rounded-2xl"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      IDS_WARN: {challenge.wrongAttempts}/3 REJECTED_TOKENS. TERMINAL_LOCKOUT IMMINENT.
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-6">
                    <div className="relative flex-1">
                      <input
                        value={flag}
                        onChange={e => setFlag(e.target.value)}
                        placeholder="ENTER_TOKEN{...}"
                        className="w-full h-18 px-8 bg-foreground/5 border border-foreground/5 rounded-2xl font-mono text-sm uppercase tracking-[0.3em] focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/20"
                        data-testid="input-flag"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={submitFlag.isPending || !flag.trim()} 
                      className="cyber-button h-18 px-12 group"
                      data-testid="button-submit-flag"
                    >
                      <span className="flex items-center gap-3">
                        {submitFlag.isPending ? "SYNCING..." : "TRANSMIT"}
                        <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
                      </span>
                    </button>
                  </form>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-foreground/5" />
                    <p className="text-xs text-muted-foreground/60 font-mono">{t("Format:", "Format:", "Формат:")} flag{"{"}...{"}"}</p>
                    <div className="h-px flex-1 bg-foreground/5" />
                  </div>
                </div>
              </FadeIn>
            )}

            {challenge.isSolved && (
              <ScaleIn>
                <div className="glass-card p-16 text-center border-primary/40 bg-primary/[0.03] rounded-[3.5rem] shadow-2xl shadow-primary/5">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-10 shadow-xl shadow-primary/20 animate-pulse-glow">
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mb-4">{t("Solved!", "Yechildi!", "Решено!")}</h2>
                  <p className="text-muted-foreground">{t("Points added to your score.", "Ballar hisobingizga qo'shildi.", "Очки добавлены к вашему счёту.")}</p>
                </div>
              </ScaleIn>
            )}

            {challenge.isBlocked && (
              <ScaleIn>
                <div className="glass-card p-16 text-center border-destructive/40 bg-destructive/[0.03] rounded-[3.5rem] shadow-2xl shadow-destructive/5">
                  <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-10 shadow-xl shadow-destructive/20">
                    <Lock className="w-12 h-12 text-destructive" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mb-4 text-destructive">{t("Locked", "Bloklandi", "Заблокировано")}</h2>
                  <p className="text-muted-foreground">{t("Too many wrong attempts. Ask on Telegram to unblock.", "Ko'p xato urinish. Blokni ochish uchun Telegramda so'rang.", "Слишком много ошибок. Напишите в Telegram для разблокировки.")}</p>
                </div>
              </ScaleIn>
            )}
          </div>

          <div className="space-y-8">
            <FadeIn delay={0.5}>
              <div className="glass-card p-10 rounded-[3rem] border-foreground/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-6">{t("Details", "Tafsilotlar", "Детали")}</h3>
                <div className="space-y-10">
                  <div className="flex justify-between items-end group">
                    <span className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">{t("Points", "Ball", "Очки")}</span>
                    <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">+{challenge.points}</span>
                  </div>
                  <div className="h-px bg-foreground/5" />
                  <div className="flex justify-between items-center group">
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t("Difficulty", "Qiyinlik", "Сложность")}</span>
                    <span className="text-sm font-medium text-foreground bg-foreground/5 px-3 py-1.5 rounded-xl capitalize">{challenge.difficulty}</span>
                  </div>
                  <div className="h-px bg-foreground/5" />
                  <div className="flex justify-between items-center group">
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t("Solved by", "Yechganlar", "Решили")}</span>
                    <span className="text-xs font-black text-foreground bg-foreground/5 px-4 py-2 rounded-xl tabular-nums">{((challenge.solvedCount / (total || 1)) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </FadeIn>
            
            {teachingModule && (
              <FadeIn delay={0.6}>
                <Link href={`/modules/${teachingModule.id}`}>
                  <div className="glass-card p-8 rounded-[3rem] border-primary/25 cursor-pointer group hover:border-primary/50 transition-colors">
                    <div className="eyebrow mb-3">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {t("Stuck?", "Qiynalyapsizmi?", "Застряли?")}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      {t(teachingModule.title, teachingModule.titleUz ?? undefined, teachingModule.titleRu ?? undefined)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {t(
                        `This module teaches ${challenge.category}. ${teachingModule.lessonCount} lessons, with the commands you need.`,
                        `Bu modul ${challenge.category} yo'nalishini o'rgatadi. ${teachingModule.lessonCount} dars, kerakli buyruqlar bilan.`,
                        `Этот модуль обучает направлению ${challenge.category}. ${teachingModule.lessonCount} уроков с нужными командами.`,
                      )}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      {t("Open the module", "Modulni ochish", "Открыть модуль")}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            )}

            <FadeIn delay={0.7}>
              <div className="glass-card p-8 rounded-[3rem] bg-accent/[0.02] border-accent/20">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
                  <h3 className="text-sm font-semibold">{t("One rule", "Bitta qoida", "Одно правило")}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "Do not share flags or challenge files outside cdCTF. Solving it yourself is the whole point — and sharing it takes that away from someone else.",
                    "Flag va topshiriq fayllarini cdCTF tashqarisida ulashmang. Butun gap o'zingiz yechishingizda — ulashsangiz, buni boshqadan tortib olgan bo'lasiz.",
                    "Не делитесь флагами и файлами заданий вне cdCTF. Весь смысл в том, чтобы решить самому — а поделившись, вы лишаете этого другого.",
                  )}
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}

