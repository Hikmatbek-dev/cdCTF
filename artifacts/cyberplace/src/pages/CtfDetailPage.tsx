import { useState } from "react";
import { useRoute } from "wouter";
import { Download, Flag, AlertTriangle, CheckCircle2, Lock, ExternalLink, Zap, Cpu } from "lucide-react";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCtfChallenge, getGetCtfChallengeQueryKey, useSubmitCtfFlag, useGetScoreboard } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FadeIn, ScaleIn } from "@/components/PageTransition";

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
        onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
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
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">{t("MISSION_NOT_FOUND_IN_SECTOR", "TOPSHIRIQ TOPILMADI", "ЗАДАНИЕ НЕ НАЙДЕНО")}</p>
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
              <DifficultyBadge difficulty={challenge.difficulty} className="rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg border-foreground/5" />
              <div className="px-5 py-2 bg-foreground/5 border border-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 backdrop-blur-md">{challenge.category}</div>
              
              {challenge.isSolved && (
                <div className="flex items-center gap-3 px-5 py-2 bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary shadow-xl shadow-primary/10 animate-pulse-glow rounded-xl">
                  <CheckCircle2 className="w-4 h-4" /> {t("TARGET_BREACHED", "YECHILDI", "ВЗЛОМАНО")}
                </div>
              )}
              {challenge.isBlocked && (
                <div className="flex items-center gap-3 px-5 py-2 bg-destructive/10 border border-destructive/20 text-[10px] font-black uppercase tracking-[0.2em] text-destructive rounded-xl">
                  <Lock className="w-4 h-4" /> {t("TERMINAL_LOCKED", "BLOKLANGAN", "ЗАБЛОКИРОВАНО")}
                </div>
              )}
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-12" data-testid="text-challenge-name">
              <span className="text-foreground/20 mr-4">MISSION:</span>
              <span className="gradient-text">{challenge.name}</span>
            </h1>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-y border-foreground/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 mb-2 block">XP_VALUATION</span>
                <span className="text-4xl font-black text-foreground tabular-nums leading-none tracking-tighter">{challenge.points}</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-foreground/5 mx-auto" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 mb-2 block">SUCCESSFUL_BREACHES</span>
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
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-10 flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  {t("MISSION_BRIEFING", "TAVSIF", "БРИФИНГ_МИССИИ")}
                </h2>
                <p className="text-xl leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium tracking-tight" data-testid="text-description">
                  {challenge.description}
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
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">
                            {isUrl ? t("REMOTE_ACCESS_POINT", "TASHQI HAVOLA", "ТОЧКА_УДАЛЕННОГО_ДОСТУПА") : t("ENCRYPTED_DATA_OBJECT", "MA'LUMOT_PAKETI", "ЗАШИФРОВАННЫЙ_ОБЪЕКТ")}
                          </h3>
                          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-2">
                            {isUrl ? "ESTABLISH_CONNECTION" : "EXTRACT_FOR_LOCAL_ANALYSIS"}
                          </p>
                        </div>
                      </div>
                      <a href={challenge.fileUrl} target={isUrl ? "_blank" : undefined} rel={isUrl ? "noopener noreferrer" : undefined} download={!isUrl}>
                        <button className="cyber-button h-14 px-10">
                          {isUrl ? "INITIATE_SESSION" : "PULL_ASSET"}
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
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-10 flex items-center gap-4">
                    <Flag className="w-5 h-5" /> {t("TRANSMIT_CAPTURE_TOKEN", "FLAG_YUBORISH", "ОТПРАВИТЬ_ТОКЕН")}
                  </h2>
                  
                  {challenge.wrongAttempts > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-10 p-5 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 rounded-2xl"
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
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/20">Standard Format: flag{"{"}md5{"}"}</p>
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
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-6">{t("MISSION_ACCOMPLISHED", "MUVAFFAQIYATLI", "МИССИЯ_ВЫПОЛНЕНА")}</h2>
                  <p className="text-primary/60 font-black uppercase text-[10px] tracking-[0.5em]">{t("ASSET_SECURED // XP_CREDITED_TO_PROFILE", "TOPSHIRIQ YECHILDI // XP QO'SHILDI", "ОБЪЕКТ ЗАЩИЩЕН // XP НАЧИСЛЕНЫ")}</p>
                </div>
              </ScaleIn>
            )}

            {challenge.isBlocked && (
              <ScaleIn>
                <div className="glass-card p-16 text-center border-destructive/40 bg-destructive/[0.03] rounded-[3.5rem] shadow-2xl shadow-destructive/5">
                  <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-10 shadow-xl shadow-destructive/20">
                    <Lock className="w-12 h-12 text-destructive" />
                  </div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-6 text-destructive">{t("TERMINAL_LOCKOUT", "BLOKLANDINGIZ", "ТЕРМИНАЛ_ЗАБЛОКИРОВАН")}</h2>
                  <p className="text-destructive/60 font-black uppercase text-[10px] tracking-[0.5em]">{t("SUSPICIOUS_PATTERN_DETECTED // CONTACT_ADMIN", "KO'P XATO URINISHLAR // ADMINGA YOZING", "ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ // СВЯЖИТЕСЬ С АДМИНИСТРАЦИЕЙ")}</p>
                </div>
              </ScaleIn>
            )}
          </div>

          <div className="space-y-8">
            <FadeIn delay={0.5}>
              <div className="glass-card p-10 rounded-[3rem] border-foreground/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 mb-10">MISSION_METADATA</h3>
                <div className="space-y-10">
                  <div className="flex justify-between items-end group">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/40 group-hover:text-primary/60 transition-colors">XP_YIELD</span>
                    <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">+{challenge.points}</span>
                  </div>
                  <div className="h-px bg-foreground/5" />
                  <div className="flex justify-between items-center group">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/40 group-hover:text-foreground transition-colors">THREAT_LVL</span>
                    <span className="text-xs font-black uppercase text-foreground bg-foreground/5 px-4 py-2 rounded-xl">{challenge.difficulty}</span>
                  </div>
                  <div className="h-px bg-foreground/5" />
                  <div className="flex justify-between items-center group">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/40 group-hover:text-foreground transition-colors">BREACH_PROB</span>
                    <span className="text-xs font-black text-foreground bg-foreground/5 px-4 py-2 rounded-xl tabular-nums">{((challenge.solvedCount / (total || 1)) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn delay={0.6}>
              <div className="glass-card p-10 rounded-[3rem] bg-accent/[0.02] border-accent/20">
                <div className="flex items-center gap-4 mb-6">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">SECURITY_PROTOCOL</h3>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground/60 font-bold italic tracking-wide">
                  "Exposing mission assets or capture tokens outside the cdCTF environment is strictly prohibited. Terminal access will be permanently revoked for violators."
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}

