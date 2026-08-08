import { Link } from "wouter";
import { Trophy, Clock, Users, Lock, Gift, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { useLang } from "@/lib/LanguageContext";
import { useSiteConfig } from "@/lib/useSiteConfig";
import { normalizeCompetitions } from "@/lib/api-shapes";
import { useListCompetitions, getListCompetitionsQueryKey } from "@workspace/api-client-react";
import { statusLabel } from "@/lib/status-label";

// A dead `StatusBadge` component lived here — it rendered the raw, untranslated
// status string and was shadowed everywhere by statusLabel(t, …), which the
// page actually uses. Removed.

export default function CompetitionsPage() {
  const { t } = useLang();
  const { telegramChannelUrl } = useSiteConfig();
  const { data: competitions, isLoading, isError, refetch } = useListCompetitions({
    query: { queryKey: getListCompetitionsQueryKey() },
  });
  const competitionList = normalizeCompetitions(competitions);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background page relative overflow-hidden">

      <div className="shell-mid py-8 relative z-10">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
            <Trophy className="w-7 h-7 text-primary animate-glow" />
          </div>
          <div>
            <h1>{t("Global Tournaments", "Musobaqalar", "Соревнования")}</h1>
            <p className="text-muted-foreground">{t("Compete in timed events and climb the board", "Vaqtli tadbirlarda bellashing va reytingda ko'tariling", "Участвуйте в событиях и поднимайтесь в рейтинге")}</p>
          </div>
        </div>

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-muted" />)}
          </div>
        ) : competitionList.length === 0 ? (
          /* An empty page that only says "check back later" is a dead end.
              Send people to the 97 challenges that are live right now, and tell
              a company how to put its name on the first event. */
          <div className="glass-card rounded-xl py-16 px-8 text-center border-border">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-7 h-7 text-primary/40" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No competitions scheduled yet", "Hozircha musobaqalar yo'q", "Пока нет соревнований")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-7">
              {t("Timed events run here. In the meantime the full challenge set is open — practise any time.",
                 "Vaqtli tadbirlar shu yerda o'tadi. Shu vaqtda to'liq topshiriqlar to'plami ochiq — istalgan vaqtda mashq qiling.",
                 "Здесь проходят события по времени. А пока весь набор заданий открыт — тренируйтесь в любое время.")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/ctf">
                <button className="cyber-button h-11 px-6">{t("Practise now", "Hozir mashq qilish", "Тренироваться сейчас")}</button>
              </Link>
              <Link href="/modules">
                <button className="cyber-button-outline h-11 px-6">{t("Start learning", "O'rganishni boshlash", "Начать обучение")}</button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-8">
              {t("Want to sponsor the first event? Get in touch — your brand goes on it.",
                 "Birinchi tadbirga homiylik qilmoqchimisiz? Bog'laning — brendingiz unda bo'ladi.",
                 "Хотите стать спонсором первого события? Напишите — ваш бренд будет на нём.")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {competitionList.map(comp => (
              <Link href={`/competitions/${comp.id}`} key={comp.id}>
                <div
                  className="group relative p-8 rounded-xl glass-card border-border hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
                  data-testid={`card-competition-${comp.id}`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex flex-wrap items-center gap-3 mb-6 relative z-10">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                      comp.status === "active" ? "bg-primary/20 text-primary border-primary/30 neon-text" : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {statusLabel(t, comp.status)}
                    </span>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-medium ${
                      comp.type === "private" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {comp.type === "private" && <Lock className="w-3 h-3" />}
                      {comp.type === "public" ? t("Public", "Ochiq", "Публичный") : t("Private", "Yopiq", "Приватный")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs font-medium">
                      <Users className="w-3 h-3" />
                      {(comp as any).format === "team" ? t("Team", "Jamoa", "Командный") : t("Individual", "Yakka", "Индивидуальный")}
                    </span>
                    {((comp as any).telegramUrl || telegramChannelUrl) && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open((comp as any).telegramUrl || telegramChannelUrl, "_blank", "noopener,noreferrer"); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-500 text-xs font-medium hover:bg-sky-500/20 transition-colors"
                        data-testid={`competition-telegram-${comp.id}`}
                      >
                        <Send className="w-3 h-3" /> Telegram
                      </button>
                    )}
                    {comp.isJoined && (
                      <span className="text-xs font-medium text-primary">{t("Joined", "Qatnashyapsiz", "Вы участвуете")}</span>
                    )}
                    {comp.sponsorName && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-muted text-xs font-medium text-muted-foreground">
                        {t("Powered by", "Homiy", "Спонсор")} <span className="text-foreground font-semibold">{comp.sponsorName}</span>
                      </span>
                    )}
                    {comp.prize && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <Gift className="w-3 h-3" /> {comp.prize}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-display font-black mb-3 tracking-tight group-hover:text-primary transition-colors" data-testid={`text-competition-name-${comp.id}`}>{comp.name}</h3>
                  {comp.description && (
                    <p className="text-sm text-muted-foreground font-medium mb-8 line-clamp-2 max-w-2xl">{comp.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground leading-none mb-1">{t("Timeframe", "Muddat", "Срок")}</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Clock className="w-3 h-3 text-primary" />
                          {formatDate(comp.startTime)} <span className="text-muted-foreground/40">—</span> {formatDate(comp.endTime)}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground leading-none mb-1">{t("Players", "Ishtirokchilar", "Игроки")}</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Users className="w-3 h-3 text-primary" />
                          {comp.participantCount} {t("participants", "qatnashchi", "участников")}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-muted-foreground leading-none mb-1">{t("Challenges", "Topshiriqlar", "Задания")}</span>
                      <div className="text-sm font-black text-primary">{comp.ctfCount} {t("challenges", "topshiriq", "заданий")}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
