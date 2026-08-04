import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Download, Flag, AlertTriangle, CheckCircle2, Lock, ExternalLink, Zap, Cpu, GraduationCap, ChevronRight, Lightbulb } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCtfChallenge, getGetCtfChallengeQueryKey, useSubmitCtfFlag, useGetScoreboard, useListModules, getListModulesQueryKey } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { useQueryClient } from "@tanstack/react-query";
import { Writeups } from "@/components/Writeups";
import { motion } from "framer-motion";
import { FadeIn, ScaleIn } from "@/components/PageTransition";
import { errorToast } from "@/lib/error-toast";

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
  const { isAuthenticated, refetchSession } = useAuth();
  const [flag, setFlag] = useState("");
  const [revealedHint, setRevealedHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const { data: challenge, isLoading } = useGetCtfChallenge(id, {
    query: { enabled: !!id, queryKey: getGetCtfChallengeQueryKey(id) },
  });

  const revealHint = async () => {
    if (hintLoading) return;
    setHintLoading(true);
    try {
      const r = await fetch(`/api/ctf/${id}/hint`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d?.error === "string" ? d.error : "Failed");
      setRevealedHint(t(d.hint ?? "", d.hintUz || d.hint || "", d.hintRu || d.hint || ""));
      if (d.pointsSpent > 0) {
        toast({ title: t(`Hint revealed — ${d.pointsSpent} points spent`, `Maslahat ochildi — ${d.pointsSpent} ball sarflandi`, `Подсказка открыта — потрачено ${d.pointsSpent} очк.`) });
      }
      void qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
      void refetchSession();
    } catch (e) {
      toast(errorToast(t, e));
    } finally {
      setHintLoading(false);
    }
  };

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
            toast({ title: t("Correct! Flag accepted!", "To'g'ri! Flag qabul qilindi!", "Верно! Флаг принят!"), description: `+${res.pointsEarned ?? challenge?.points} points` });
            void qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
            void refetchSession();
          } else if (res.blocked) {
            toast({ title: t("You are blocked!", "Bloklandingiz!", "Вы заблокированы!"), description: t("3 wrong attempts. Contact admin.", "3 marta xato. Adminga murojaat qiling.", "3 ошибки. Обратитесь к администратору."), variant: "destructive" });
            void qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
          } else {
            toast({ title: t("Wrong flag", "Noto'g'ri flag", "Неверный флаг"), description: `${t("Attempts left:", "Qolgan urinishlar:", "Осталось попыток:")} ${3 - res.wrongAttempts}`, variant: "destructive" });
          }
          setFlag("");
        },
        onError: (err) => {
          // A 401 here means the session lapsed between loading the page and
          // pressing Submit. Show a plain "sign in again" instead of the raw
          // "HTTP 401: Unauthorized" that users were seeing.
          const status = (err as { status?: number })?.status;
          if (status === 401) {
            toast({
              title: t("Session expired", "Sessiya tugadi", "Сессия истекла"),
              description: t("Please sign in again to submit.", "Topshirish uchun qaytadan tizimga kiring.", "Войдите снова, чтобы отправить."),
              variant: "destructive",
            });
            return;
          }
          toast({ title: (err as { message?: string })?.message || t("Error", "Xato", "Ошибка"), variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background page relative overflow-hidden">
        <div className="fixed inset-0 mono-grid opacity-10 pointer-events-none" />
        <div className="max-w-5xl mx-auto space-y-12">
          <Skeleton className="h-16 w-96 bg-muted rounded-2xl" />
          <div className="grid lg:grid-cols-3 gap-12">
            <Skeleton className="lg:col-span-2 h-[400px] bg-muted rounded-xl" />
            <Skeleton className="h-[400px] bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background page flex items-center justify-center">
        <ScaleIn>
          <div className="text-center">
            <div className="w-20 h-20 bg-muted border border-border rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-10 h-10 text-destructive/50" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">{t("Challenge not found", "Topshiriq topilmadi", "Задание не найдено")}</p>
          </div>
        </ScaleIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 hidden rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 hidden rounded-full animate-pulse delay-1000" />
      </div>

      <div className="shell relative z-10">
        {/* Header Section */}
        <div className="mb-20">
          <FadeIn>
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <DifficultyBadge difficulty={challenge.difficulty} className="rounded-lg px-3 py-1 text-xs font-medium shadow-lg border-border" />
              <div className="px-4 py-1.5 bg-muted border border-border rounded-lg text-xs font-medium text-muted-foreground ">{challenge.category}</div>
              
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
            
            <h1 className="mb-8" data-testid="text-challenge-name">
              <span className="gradient-text">{t(challenge.name, challenge.nameUz ?? undefined, challenge.nameRu ?? undefined)}</span>
            </h1>
            
            {/* Two stats, a divider between. It was a 4-column grid whose two
                dividers were `hidden md:block` grid cells — which left an empty
                cell on mobile and a trailing empty column on desktop. Flex keeps
                the divider out of the flow when it is hidden. */}
            <div className="flex items-center gap-8 sm:gap-12 py-8 sm:py-10 border-y border-border">
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">{t("Points", "Ball", "Очки")}</span>
                <span className="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none tracking-tighter">{challenge.points}</span>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">{t("Solved by", "Yechganlar", "Решили")}</span>
                <span className="text-3xl sm:text-4xl font-black text-primary tabular-nums leading-none tracking-tighter">{challenge.solvedCount}</span>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* Briefing */}
            <FadeIn delay={0.2}>
              <div className="glass-card p-10 rounded-xl relative group overflow-hidden border-border shadow-2xl">
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
                    <div className="glass-card p-8 flex items-center justify-between group hover:border-primary/40 transition-all rounded-xl border-border">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-muted border border-border rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-xl">
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {isUrl
                              ? t("Challenge link", "Topshiriq havolasi", "Ссылка задания")
                              : t("Challenge file", "Topshiriq fayli", "Файл задания")}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isUrl
                              ? t("Opens in a new tab", "Yangi oynada ochiladi", "Откроется в новой вкладке")
                              : t("Download it and analyse it locally", "Yuklab oling va tahlil qiling", "Скачайте и изучите локально")}
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

            {/* The module that teaches this. Someone stuck here was never told
                that the platform has eight lessons on exactly this subject —
                the practice half and the teaching half did not point at each
                other, which is why the lessons went unread. */}
            {(challenge as any).learnModule && (
              <FadeIn delay={0.3}>
                <Link href={`/modules/${(challenge as any).learnModule.id}`}>
                  <div className="glass-card p-5 rounded-xl border-primary/25 flex items-center gap-4 group cursor-pointer" data-testid="ctf-learn-module">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                        {t("Learn this", "Buni o'rganing", "Изучите это")}
                      </div>
                      <div className="font-semibold truncate group-hover:text-primary transition-colors">
                        {t(
                          (challenge as any).learnModule.title,
                          (challenge as any).learnModule.titleUz ?? undefined,
                          (challenge as any).learnModule.titleRu ?? undefined,
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </FadeIn>
            )}

            {/* Hint. Costs points the first time; free to re-read afterwards.
                The text never arrives until it is paid for. */}
            {(challenge as any).hasHint && !challenge.isSolved && (
              <FadeIn delay={0.35}>
                <div className="glass-card p-6 sm:p-8 rounded-xl border-amber-500/25">
                  {revealedHint || (challenge as any).hintUsed ? (
                    <div className="flex items-start gap-4">
                      <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold mb-2">{t("Hint", "Maslahat", "Подсказка")}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="hint-text">
                          {revealedHint ?? t((challenge as any).hint ?? "", (challenge as any).hintUz ?? (challenge as any).hint ?? "", (challenge as any).hintRu ?? (challenge as any).hint ?? "")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold">{t("Stuck?", "Tiqilib qoldingizmi?", "Застряли?")}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t(`Reveal a hint for ${(challenge as any).hintCost} points.`,
                               `${(challenge as any).hintCost} ball evaziga maslahat oling.`,
                               `Открыть подсказку за ${(challenge as any).hintCost} очк.`)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={revealHint}
                        disabled={hintLoading || !isAuthenticated}
                        className="cyber-button-outline h-11 px-6 shrink-0 disabled:opacity-50"
                        data-testid="reveal-hint"
                      >
                        {!isAuthenticated
                          ? t("Sign in for a hint", "Maslahat uchun kiring", "Войдите за подсказкой")
                          : hintLoading ? t("Opening…", "Ochilmoqda…", "Открываем…") : t("Show hint", "Maslahatni ko'rsatish", "Показать подсказку")}
                      </button>
                    </div>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Submission Zone */}
            {!challenge.isSolved && !challenge.isBlocked && (
              <FadeIn delay={0.4}>
                <div className="glass-card p-10 rounded-xl border-primary/20 bg-primary/[0.02]">
                  <h2 className="text-sm font-semibold text-primary mb-6 flex items-center gap-3">
                    <Flag className="w-5 h-5" /> {t("Submit the flag", "Flagni topshirish", "Отправить флаг")}
                  </h2>
                  
                  {challenge.wrongAttempts > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 rounded-2xl"
                    >
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      {/* Was: "IDS_WARN: 2/3 REJECTED_TOKENS. TERMINAL_LOCKOUT
                          IMMINENT." — hardcoded pseudo-jargon, in no language,
                          at the exact moment a learner most needs to understand
                          what is about to happen to them. */}
                      <span>
                        {t(`${challenge.wrongAttempts} of 3 wrong answers. After the third, this challenge locks.`,
                           `3 tadan ${challenge.wrongAttempts} ta javob noto'g'ri. Uchinchisidan keyin bu topshiriq qulflanadi.`,
                           `${challenge.wrongAttempts} из 3 ответов неверны. После третьего задание блокируется.`)}
                      </span>
                    </motion.div>
                  )}

                  {/* The submit path is session-gated on the server, so an
                      anonymous visitor pressing Submit got a raw "HTTP 401:
                      Unauthorized" toast — the exact confusion users reported.
                      Show a sign-in call to action instead of a form that
                      cannot succeed. */}
                  {!isAuthenticated ? (
                    <div className="flex flex-col items-center text-center gap-5 py-4">
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {t("Sign in to submit your flag and earn points.",
                           "Flagni topshirish va ball to'plash uchun tizimga kiring.",
                           "Войдите, чтобы отправить флаг и заработать очки.")}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/login" className="cyber-button h-14 px-10 flex items-center justify-center" data-testid="link-login-to-submit">
                          {t("Sign in", "Kirish", "Войти")}
                        </Link>
                        <Link href="/register" className="h-14 px-10 flex items-center justify-center rounded-xl border border-border text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors" data-testid="link-register-to-submit">
                          {t("Create account", "Hisob yaratish", "Создать аккаунт")}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-6">
                        <div className="relative flex-1">
                          {/* No `uppercase`: the CSS was uppercasing the display
                              while the submitted value kept its case, so a learner
                              checking a case-sensitive flag against the screen was
                              reading something that did not match what they would
                              send. The placeholder now shows the real shape, and
                              the field has a name for screen readers. */}
                          <input
                            value={flag}
                            onChange={e => setFlag(e.target.value)}
                            aria-label={t("Flag", "Flag", "Флаг")}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="flag{...}"
                            className="field font-mono !min-h-[3.5rem] tracking-wide"
                            data-testid="input-flag"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submitFlag.isPending || !flag.trim()}
                          className="cyber-button h-18 px-12 group"
                          data-testid="button-submit-flag"
                        >
                          {/* The button says what it does. It used to read
                              "TRANSMIT" / "SYNCING…", which is set dressing, not a
                              label — and it was the only untranslated control on
                              the page a learner has to press to score. */}
                          <span className="flex items-center gap-3">
                            {submitFlag.isPending
                              ? t("Checking…", "Tekshirilmoqda…", "Проверяем…")
                              : t("Submit", "Topshirish", "Отправить")}
                            <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
                          </span>
                        </button>
                      </form>
                      <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="h-px flex-1 bg-border" />
                        <p className="text-xs text-muted-foreground/60 font-mono">{t("Format:", "Format:", "Формат:")} flag{"{"}...{"}"}</p>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </>
                  )}
                </div>
              </FadeIn>
            )}

            {challenge.isSolved && (
              <ScaleIn>
                <div className="glass-card p-16 text-center border-primary/40 bg-primary/[0.03] rounded-xl shadow-2xl shadow-primary/5">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-10 shadow-xl shadow-primary/20 animate-pulse-glow">
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </div>
                  <h2 className="mb-4">{t("Solved!", "Yechildi!", "Решено!")}</h2>
                  <p className="text-muted-foreground">{t("Points added to your score.", "Ballar hisobingizga qo'shildi.", "Очки добавлены к вашему счёту.")}</p>
                </div>
              </ScaleIn>
            )}

            {/* Writeups unlock only after solving — never a spoiler. */}
            {challenge.isSolved && <Writeups ctfId={id} />}

            {challenge.isBlocked && (
              <ScaleIn>
                <div className="glass-card p-16 text-center border-destructive/40 bg-destructive/[0.03] rounded-xl shadow-2xl shadow-destructive/5">
                  <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-10 shadow-xl shadow-destructive/20">
                    <Lock className="w-12 h-12 text-destructive" />
                  </div>
                  <h2 className="mb-4 text-destructive">{t("Locked", "Bloklandi", "Заблокировано")}</h2>
                  <p className="text-muted-foreground">{t("Too many wrong attempts. Ask on Telegram to unblock.", "Ko'p xato urinish. Blokni ochish uchun Telegramda so'rang.", "Слишком много ошибок. Напишите в Telegram для разблокировки.")}</p>
                </div>
              </ScaleIn>
            )}
          </div>

          <div className="space-y-8">
            <FadeIn delay={0.5}>
              <div className="glass-card p-10 rounded-xl border-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-6">{t("Details", "Tafsilotlar", "Детали")}</h3>
                <div className="space-y-10">
                  <div className="flex justify-between items-end group">
                    <span className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">{t("Points", "Ball", "Очки")}</span>
                    <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">+{challenge.points}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center group">
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t("Difficulty", "Qiyinlik", "Сложность")}</span>
                    <span className="text-sm font-medium text-foreground bg-muted px-3 py-1.5 rounded-xl capitalize">{challenge.difficulty}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center group">
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t("Solved by", "Yechganlar", "Решили")}</span>
                    <span className="text-xs font-black text-foreground bg-muted px-4 py-2 rounded-xl tabular-nums">{((challenge.solvedCount / (total || 1)) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </FadeIn>
            
            {teachingModule && (
              <FadeIn delay={0.6}>
                <Link href={`/modules/${teachingModule.id}`}>
                  <div className="glass-card p-8 rounded-xl border-primary/25 cursor-pointer group hover:border-primary/50 transition-colors">
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
              <div className="glass-card p-8 rounded-xl bg-accent/[0.02] border-accent/20">
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

