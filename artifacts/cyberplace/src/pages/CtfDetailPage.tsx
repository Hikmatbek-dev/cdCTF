import { useState } from "react";
import { useRoute } from "wouter";
import { Download, Flag, AlertTriangle, CheckCircle2, Lock, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCtfChallenge, getGetCtfChallengeQueryKey, useSubmitCtfFlag, useGetScoreboard } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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
            qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
          } else if (res.blocked) {
            toast({ title: t("You are blocked!", "Bloklandingiz!", "Вы заблокированы!"), description: t("3 wrong attempts. Contact admin.", "3 marta xato. Adminga murojaat qiling.", "3 ошибки. Обратитесь к администратору."), variant: "destructive" });
            qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(id) });
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
      <div className="min-h-screen bg-background pt-24 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64 bg-muted rounded-xl" />
          <Skeleton className="h-64 w-full bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{t("Challenge not found", "Topshiriq topilmadi", "Задание не найдено")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Mission Header */}
        <div className="mb-12">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <DifficultyBadge difficulty={challenge.difficulty} className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest" />
            <div className="px-3 py-1 bg-muted/50 border border-border rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">{challenge.category}</div>
            
            {challenge.isSolved && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary animate-in zoom-in-50">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t("BREACHED", "YECHILDI", "ВЗЛОМАНО")}
              </div>
            )}
            {challenge.isBlocked && (
              <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/20 text-[10px] font-black uppercase tracking-widest text-destructive">
                <Lock className="w-3.5 h-3.5" /> {t("LOCKED", "BLOKLANGAN", "ЗАБЛОКИРОВАНО")}
              </div>
            )}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-8" data-testid="text-challenge-name">
            {t("MISSION:", "MISSIYA:", "МИССИЯ:")} <span className="text-primary">{challenge.name}</span>
          </h1>
          
          <div className="flex items-center gap-10 py-8 border-y border-border">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">XP_VALUATION</span>
              <span className="text-3xl font-black text-foreground leading-none">{challenge.points}</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">BREACH_COUNT</span>
              <span className="text-2xl font-black text-primary/80 leading-none">{challenge.solvedCount}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* Briefing */}
            <div className="glass-card bg-muted/20 border-border p-8 rounded-[2.5rem] relative group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Shield className="w-48 h-48 text-primary" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-8 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {t("MISSION_BRIEFING", "TAVSIF", "БРИФИНГ_МИССИИ")}
              </h2>
              <p className="text-lg leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium" data-testid="text-description">
                {challenge.description}
              </p>
            </div>

            {/* Asset Link */}
            {challenge.fileUrl && (
              (() => {
                const isUrl = challenge.fileUrl.startsWith("http://") || challenge.fileUrl.startsWith("https://");
                const Icon = isUrl ? ExternalLink : Download;
                return (
                  <div className="glass-card p-6 flex items-center justify-between group hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest">
                          {isUrl ? t("EXTERNAL_VECTOR", "TASHQI HAVOLA", "ВНЕШНИЙ_ВЕКТОР") : t("SECURE_DATA_PACKET", "MA'LUMOT_PAKETI", "ПАКЕТ_ДАННЫХ")}
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          {isUrl ? "VISIT_REMOTE_HOST" : "DOWNLOAD_FOR_ANALYSIS"}
                        </p>
                      </div>
                    </div>
                    <a href={challenge.fileUrl} target={isUrl ? "_blank" : undefined} rel={isUrl ? "noopener noreferrer" : undefined} download={!isUrl}>
                      <button className="cyber-button h-12 px-8 text-[10px] shadow-lg shadow-primary/20" data-testid="button-download-file">
                        {isUrl ? "OPEN_HOST" : "EXTRACT_DATA"}
                      </button>
                    </a>
                  </div>
                );
              })()
            )}

            {/* Infiltration Zone */}
            {!challenge.isSolved && !challenge.isBlocked && (
              <div className="glass-card p-8 rounded-[2.5rem]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-8 flex items-center gap-3">
                  <Flag className="w-4 h-4" /> {t("TRANSMIT_CAPTURE_TOKEN", "FLAG_YUBORISH", "ОТПРАВИТЬ_ТОКЕН")}
                </h2>
                
                {challenge.wrongAttempts > 0 && (
                  <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-widest flex items-center gap-3 rounded-xl animate-in shake-in">
                    <AlertTriangle className="w-4 h-4" />
                    IDS_ALERT: {challenge.wrongAttempts}/3 FAILED_ATTEMPTS detected. ACCESS TERMINATION imminent.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Input
                      value={flag}
                      onChange={e => setFlag(e.target.value)}
                      placeholder="ENTER_TOKEN{...}"
                      className="h-16 px-6 bg-muted/50 border-border rounded-2xl font-mono text-sm uppercase tracking-widest focus:ring-primary/20"
                      data-testid="input-flag"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitFlag.isPending || !flag.trim()} 
                    className="h-16 px-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                    data-testid="button-submit-flag"
                  >
                    {submitFlag.isPending ? "SYNCING..." : "TRANSMIT"}
                  </button>
                </form>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 mt-6 text-center">Standard Format: FLAG{"{"}&bull;&bull;&bull;&bull;{"}"}</p>
              </div>
            )}

            {challenge.isSolved && (
              <div className="glass-card p-12 text-center border-primary/50 bg-primary/5 rounded-[2.5rem] animate-in zoom-in-95">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6 animate-glow" />
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">{t("ACCESS_GRANTED", "MUVAFFAQIYATLI", "ДОСТУП_РАЗРЕШЕН")}</h2>
                <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t("MISSION COMPLETED. ASSET SECURED.", "TOPSHIRIQ YECHILDI.", "МИССИЯ ВЫПОЛНЕНА. ОБЪЕКТ ЗАЩИЩЕН.")}</p>
              </div>
            )}

            {challenge.isBlocked && (
              <div className="glass-card p-12 text-center border-destructive/50 bg-destructive/5 rounded-[2.5rem] animate-in zoom-in-95">
                <Lock className="w-16 h-16 text-destructive mx-auto mb-6" />
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 text-destructive">{t("ACCOUNT_LOCKED", "BLOKLANDINGIZ", "АККАУНТ_ЗАБЛОКИРОВАН")}</h2>
                <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t("SUSPICIOUS ACTIVITY DETECTED. ACCESS TERMINATED.", "KO'P XATO URINISHLAR. KIRISH TO'XTATILDI.", "ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ. ДОСТУП ПРЕКРАЩЕН.")}</p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="glass-card p-8 rounded-[2.5rem]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-8">MISSION_METADATA</h3>
              <div className="space-y-8">
                <div className="flex justify-between items-end pb-4 border-b border-border">
                  <span className="text-[9px] font-black uppercase text-muted-foreground/40">XP_YIELD</span>
                  <span className="text-2xl font-black text-primary">+{challenge.points}</span>
                </div>
                <div className="flex justify-between items-end pb-4 border-b border-border">
                  <span className="text-[9px] font-black uppercase text-muted-foreground/40">THREAT_LEVEL</span>
                  <span className="text-xs font-black uppercase text-foreground">{challenge.difficulty}</span>
                </div>
                <div className="flex justify-between items-end pb-4 border-b border-border">
                  <span className="text-[9px] font-black uppercase text-muted-foreground/40">BREACH_PROB</span>
                  <span className="text-xs font-black text-foreground">{((challenge.solvedCount / (total || 1)) * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-8 rounded-[2.5rem] bg-primary/5 border-primary/20">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">SECURITY_NOTICE</h3>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-bold italic">
                "Sharing active mission data or capture tokens is a violation of the cdCTF Conduct. Violators face permanent terminal exclusion."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
