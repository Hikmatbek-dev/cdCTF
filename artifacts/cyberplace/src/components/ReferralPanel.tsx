import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Gift, Users, Trophy, Sparkles, Send } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";

type Referral = {
  code: string;
  activeCount: number;
  pendingCount: number;
  freeHintCredits: number;
  tier: string | null;
  competitionRequirement: number;
  eligibleForCompetitions: boolean;
  invitees: { nickname: string; status: string; joinedAt: string }[];
};

const TIER_LABEL: Record<string, [string, string, string]> = {
  bronze: ["Bronze Ambassador", "Bronza elchi", "Бронзовый амбассадор"],
  silver: ["Silver Ambassador", "Kumush elchi", "Серебряный амбассадор"],
  gold: ["Gold Ambassador", "Oltin elchi", "Золотой амбассадор"],
  legend: ["Legend", "Afsona", "Легенда"],
};

/**
 * The referral programme on the profile.
 */
export function ReferralPanel() {
  const { t, lang } = useLang();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const r = await fetch("/api/users/me/referrals", { credentials: "include" });
      if (!r.ok) throw new Error("referrals");
      return r.json() as Promise<Referral>;
    },
  });

  if (isLoading || !data) return null;

  const link = `${window.location.origin}/register?ref=${data.code}`;
  const progress = Math.min(data.activeCount, data.competitionRequirement);
  const tierLabel = data.tier ? TIER_LABEL[data.tier]?.[lang === "uz" ? 1 : lang === "ru" ? 2 : 0] : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  const shareText = t(
    `Join me on cdCTF — learn cybersecurity from zero, free: ${link}`,
    `cdCTF'da menga qo'shiling — kiberxavfsizlikni noldan, bepul o'rganing: ${link}`,
    `Присоединяйся ко мне на cdCTF — учись кибербезопасности с нуля, бесплатно: ${link}`,
  );

  return (
    <div className="glass-card bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 md:p-8 mb-12 shadow-lg shadow-black/5" data-testid="referral-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Gift className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              {t("Invite friends", "Do'stlarni taklif qiling", "Пригласите друзей")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
              {t("Every verified friend earns you a hint.",
                "Har bir tasdiqlangan do'st uchun bepul hint.",
                "Каждый друг даёт вам бесплатную подсказку.")}
            </p>
          </div>
        </div>
        {tierLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-sm shadow-primary/10 shrink-0">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" /> {tierLabel}
          </span>
        )}
      </div>

      {/* Share link */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-2 mb-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
        <code className="flex-1 w-full sm:w-auto min-w-0 truncate px-4 py-2 text-sm font-mono text-primary font-medium" data-testid="referral-link">
          {link}
        </code>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button onClick={copy} variant="secondary" className="flex-1 sm:flex-none rounded-xl h-10 px-4 gap-2 border border-border/50 bg-background hover:border-primary/40 hover:text-primary transition-all">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span className="text-sm font-medium">{copied ? t("Copied", "Nusxalandi", "Скопировано") : t("Copy", "Nusxalash", "Копировать")}</span>
          </Button>
          <Button
            asChild
            className="flex-1 sm:flex-none cyber-button rounded-xl h-10 px-4"
          >
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noopener noreferrer"
              data-testid="referral-telegram"
            >
              <Send className="w-4 h-4 mr-2" />
              Telegram
            </a>
          </Button>
        </div>
      </div>

      {/* The three numbers that matter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={Users} value={data.activeCount} label={t("Active invites", "Faol takliflar", "Активные")} />
        <Stat icon={Gift} value={data.freeHintCredits} label={t("Free hints", "Bepul hintlar", "Подсказки")} />
        <Stat icon={Users} value={data.pendingCount} label={t("Pending", "Kutilmoqda", "Ожидают")} muted />
      </div>

      {/* Progress to competitions */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-5 mb-8 hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Trophy className={`w-4 h-4 ${data.eligibleForCompetitions ? 'text-[hsl(var(--neon))]' : 'text-primary'}`} aria-hidden="true" />
            {t("Competition access", "Musobaqa imkoniyati", "Доступ к соревнованиям")}
          </span>
          <span className="tabular-nums text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{progress} / {data.competitionRequirement}</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-1000 relative ${data.eligibleForCompetitions ? "bg-[hsl(var(--neon))] shadow-[0_0_10px_hsl(var(--neon))]" : "bg-gradient-to-r from-primary/60 to-primary"}`}
            style={{ width: `${(progress / data.competitionRequirement) * 100}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_infinite]"></div>
          </div>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground mt-3 uppercase tracking-wider">
          {data.eligibleForCompetitions
            ? <span className="text-[hsl(var(--neon))]">{t("Unlocked — you can join any competition.", "Ochildi — istalgan musobaqaga qo'shilishingiz mumkin.", "Открыто — можете участвовать в любом соревновании.")}</span>
            : t(`${data.competitionRequirement - data.activeCount} more active invite(s) to join competitions.`,
                `Musobaqalarga qo'shilish uchun yana ${data.competitionRequirement - data.activeCount} ta faol taklif kerak.`,
                `Ещё ${data.competitionRequirement - data.activeCount} активных приглашений для участия.`)}
        </p>
      </div>

      {/* Who you brought in */}
      {data.invitees.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            {t("People you invited", "Siz taklif qilganlar", "Приглашённые вами")}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.invitees.map((inv, i) => (
              <li key={i} className="flex items-center justify-between text-sm rounded-xl px-4 py-3 bg-background/50 border border-border/40 hover:border-primary/30 transition-colors group">
                <span className="font-semibold truncate group-hover:text-primary transition-colors">{inv.nickname}</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md shrink-0 ml-3 ${inv.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {inv.status === "active"
                    ? t("Active", "Faol", "Активен")
                    : t("Pending", "Kutiladi", "Ожидает")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label, muted }: {
  icon: typeof Users; value: number; label: string; muted?: boolean;
}) {
  return (
    <div className={`glass-card bg-card/40 border border-border/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 group ${muted ? 'opacity-70 hover:opacity-100' : 'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${muted ? 'bg-muted/50 text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="text-3xl font-black tabular-nums mb-1 tracking-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}
