import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Trophy, Clock, Users, Lock, Gift, Send, Sparkles, Flame, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { useLang } from "@/lib/LanguageContext";
import { useSiteConfig } from "@/lib/useSiteConfig";
import { normalizeCompetitions } from "@/lib/api-shapes";
import { useListCompetitions, getListCompetitionsQueryKey } from "@workspace/api-client-react";
import { statusLabel } from "@/lib/status-label";
import { FadeIn } from "@/components/PageTransition";

export default function CompetitionsPage() {
  const { t } = useLang();
  const { telegramChannelUrl } = useSiteConfig();
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "completed">("all");

  const { data: competitions, isLoading, isError, refetch } = useListCompetitions({
    query: { queryKey: getListCompetitionsQueryKey() },
  });
  const competitionList = normalizeCompetitions(competitions);

  const filteredList = useMemo(() => {
    if (filter === "all") return competitionList;
    return competitionList.filter(c => c.status === filter);
  }, [competitionList, filter]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-40" />

      <div className="shell relative z-10 py-8">
        <FadeIn>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
                <Trophy className="w-7 h-7 text-primary animate-glow" />
              </div>
              <div>
                <div className="eyebrow mb-1 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  {t("cdCTF · Tournaments & Events", "cdCTF · Musobaqalar va Tadbirlar", "cdCTF · Турниры и События")}
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight">
                  <span className="gradient-text">{t("Competitive Cyber Arena", "Kiber Musobaqa Arenasi", "Кибер-Арена Соревнований")}</span>
                </h1>
              </div>
            </div>

            {/* Sponsor callout button */}
            <a href={telegramChannelUrl || "#"} target="_blank" rel="noopener noreferrer">
              <button className="cyber-button-outline text-xs h-10 px-4 gap-2 inline-flex items-center">
                <Gift className="w-4 h-4 text-amber-400" />
                {t("Sponsor an Event", "Musobaqaga Homiy Bo'lish", "Стать Спонсором")}
              </button>
            </a>
          </div>

          {/* Filter tabs */}
          <div className="glass-card p-2 rounded-2xl flex items-center gap-1 mb-8 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === "all" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("All Events", "Barcha Musobaqalar", "Все События")} ({competitionList.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === "active" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {t("Active Now", "Hozir Ketyapti", "Идут Сейчас")}
            </button>
            <button
              onClick={() => setFilter("upcoming")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === "upcoming" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {t("Upcoming", "Kutilayotgan", "Предстоящие")}
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === "completed" ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              {t("Archived", "Tugallangan", "Завершённые")}
            </button>
          </div>
        </FadeIn>

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-muted" />)}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 px-8 text-center border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No events match this filter", "Musobaqalar topilmadi", "Событий не найдено")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("Timed events run here. In the meantime the full challenge set is open — practise any time.",
                 "Vaqtli tadbirlar shu yerda o'tadi. Shu vaqtda to'liq topshiriqlar to'plami ochiq — istalgan vaqtda mashq qiling.",
                 "Здесь проходят события по времени. А пока весь набор заданий открыт — тренируйтесь в любое время.")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/ctf">
                <button className="cyber-button h-11 px-6">{t("Practise now", "Hozir mashq qilish", "Тренироваться сейчас")}</button>
              </Link>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} className="cyber-button-outline h-11 px-6">
                  {t("Show all events", "Barchasini ko'rsatish", "Показать все")}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((comp, idx) => (
              <FadeIn key={comp.id} delay={idx * 0.05}>
                <Link href={`/competitions/${comp.id}`}>
                  <div
                    className="group relative p-8 rounded-2xl glass-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
                    data-testid={`card-competition-${comp.id}`}
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-500" />
                    
                    <div className="flex flex-wrap items-center gap-3 mb-5 relative z-10">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-bold transition-all ${
                        comp.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {comp.status === "active" && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                        {statusLabel(t, comp.status)}
                      </span>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold ${
                        comp.type === "private" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {comp.type === "private" && <Lock className="w-3 h-3" />}
                        {comp.type === "public" ? t("Public", "Ochiq", "Публичный") : t("Private", "Yopiq", "Приватный")}
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        {(comp as any).format === "team" ? t("Team CTF", "Jamoaviy CTF", "Командный CTF") : t("Individual", "Yakka tartibda", "Индивидуальный")}
                      </span>

                      {comp.prize && (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl border border-amber-500/40 bg-amber-500/15 text-xs font-bold text-amber-400 shadow-sm shadow-amber-500/10">
                          <Gift className="w-3.5 h-3.5" /> {comp.prize}
                        </span>
                      )}

                      {comp.sponsorName && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-border bg-muted/60 text-xs font-medium text-muted-foreground">
                          {t("Sponsor:", "Homiy:", "Спонсор:")} <span className="text-foreground font-bold">{comp.sponsorName}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-display font-black mb-3 tracking-tight group-hover:text-primary transition-colors" data-testid={`text-competition-name-${comp.id}`}>
                      {comp.name}
                    </h3>

                    {comp.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-2 max-w-3xl">
                        {comp.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border/60 relative z-10">
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t("Timeframe", "Vaqti", "Время")}</span>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {formatDate(comp.startTime)} <span className="text-muted-foreground">—</span> {formatDate(comp.endTime)}
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t("Participants", "Qatnashchilar", "Участники")}</span>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            {comp.participantCount} {t("registered", "ro'yxatdan o'tgan", "зарегистрировано")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">{t("Challenges", "Topshiriqlar", "Задания")}</span>
                          <span className="text-base font-mono font-black text-primary">{comp.ctfCount} CTFs</span>
                        </div>
                        <button className="cyber-button text-xs h-10 px-5 font-bold">
                          {comp.status === "active" ? t("Enter Arena", "Arenaga Kirish", "Войти в Арену") : t("View Details", "Batafsil", "Подробнее")}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
