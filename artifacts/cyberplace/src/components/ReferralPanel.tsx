import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Gift, Users, Trophy, Sparkles } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

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
 *
 * Two jobs: hand the learner their share link, and show what inviting has
 * bought them — free hints, an Ambassador tier, and the five activated invites
 * that unlock competitions. "Activated" is the honest number here: a friend who
 * signed up but never verified their email and did a lesson sits in `pending`
 * and is shown greyed, because that is exactly what it is worth toward the gate.
 *
 * Own-profile only; the caller gates on that.
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
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — the link is on screen to copy by hand */ }
  };

  const shareText = t(
    `Join me on cdCTF — learn cybersecurity from zero, free: ${link}`,
    `cdCTF'da menga qo'shiling — kiberxavfsizlikni noldan, bepul o'rganing: ${link}`,
    `Присоединяйся ко мне на cdCTF — учись кибербезопасности с нуля, бесплатно: ${link}`,
  );

  return (
    <div className="glass-card rounded-2xl border-primary/20 p-6 mb-12" data-testid="referral-panel">
      <div className="flex items-center gap-2.5 mb-1">
        <Gift className="w-5 h-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">{t("Invite friends", "Do'stlarni taklif qiling", "Пригласите друзей")}</h2>
        {tierLabel && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="w-3 h-3" aria-hidden="true" /> {tierLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {t("Every friend who signs up, verifies their email and finishes one lesson earns you a free hint — and five of them unlock the competitions.",
           "Ro'yxatdan o'tib, emailini tasdiqlab, 1 ta darsni tugatgan har bir do'st sizga bepul hint beradi — 5 tasi musobaqalarni ochadi.",
           "Каждый друг, кто зарегистрируется, подтвердит почту и пройдёт один урок, даёт вам бесплатную подсказку — а пятеро открывают соревнования.")}
      </p>

      {/* Share link */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 p-2 mb-5">
        <code className="flex-1 min-w-0 truncate px-2 text-sm font-mono text-foreground/90" data-testid="referral-link">{link}</code>
        <button onClick={copy} className="cyber-button h-9 px-3 gap-1.5 shrink-0" data-testid="referral-copy">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t("Copied", "Nusxalandi", "Скопировано") : t("Copy", "Nusxalash", "Копировать")}
        </button>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noopener noreferrer"
          className="cyber-button-outline h-9 px-3 shrink-0"
          data-testid="referral-telegram"
        >
          Telegram
        </a>
      </div>

      {/* The three numbers that matter */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat icon={Users} value={data.activeCount} label={t("Active invites", "Faol takliflar", "Активные")} />
        <Stat icon={Gift} value={data.freeHintCredits} label={t("Free hints", "Bepul hintlar", "Подсказки")} />
        <Stat icon={Users} value={data.pendingCount} label={t("Pending", "Kutilmoqda", "Ожидают")} muted />
      </div>

      {/* Progress to competitions */}
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Trophy className="w-4 h-4 text-primary" aria-hidden="true" />
            {t("Competition access", "Musobaqa imkoniyati", "Доступ к соревнованиям")}
          </span>
          <span className="tabular-nums text-muted-foreground">{progress} / {data.competitionRequirement}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${data.eligibleForCompetitions ? "bg-[hsl(var(--neon))]" : "bg-primary"}`}
            style={{ width: `${(progress / data.competitionRequirement) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {data.eligibleForCompetitions
            ? t("Unlocked — you can join any competition.", "Ochildi — istalgan musobaqaga qo'shilishingiz mumkin.", "Открыто — можете участвовать в любом соревновании.")
            : t(`${data.competitionRequirement - data.activeCount} more active invite(s) to join competitions.`,
                `Musobaqalarga qo'shilish uchun yana ${data.competitionRequirement - data.activeCount} ta faol taklif kerak.`,
                `Ещё ${data.competitionRequirement - data.activeCount} активных приглашений для участия.`)}
        </p>
      </div>

      {/* Who you brought in */}
      {data.invitees.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {t("People you invited", "Siz taklif qilganlar", "Приглашённые вами")}
          </div>
          <ul className="space-y-1.5">
            {data.invitees.map((inv, i) => (
              <li key={i} className="flex items-center justify-between text-sm rounded-lg px-3 py-2 bg-muted/20">
                <span className="font-medium truncate">{inv.nickname}</span>
                <span className={`text-xs shrink-0 ${inv.status === "active" ? "text-[hsl(var(--neon))]" : "text-muted-foreground"}`}>
                  {inv.status === "active"
                    ? t("Active", "Faol", "Активен")
                    : t("Not activated yet", "Hali faollashmagan", "Ещё не активен")}
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
    <div className={`rounded-xl border border-border p-3 text-center ${muted ? "opacity-70" : ""}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${muted ? "text-muted-foreground" : "text-primary"}`} aria-hidden="true" />
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
