import { useState } from "react";
import { useRoute } from "wouter";
import { Trophy, Clock, Users, Flag, Lock, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCompetition, getGetCompetitionQueryKey, useGetCompetitionScoreboard, getGetCompetitionScoreboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "wouter";
import { normalizeArray } from "@/lib/api-shapes";

export default function CompetitionDetailPage() {
  const [, params] = useRoute("/competitions/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { data: comp, isLoading } = useGetCompetition(id, {
    query: { enabled: !!id, queryKey: getGetCompetitionQueryKey(id) },
  });

  const { data: scoreboardData } = useGetCompetitionScoreboard(id, {
    query: { enabled: !!id && comp?.status !== "upcoming", queryKey: getGetCompetitionScoreboardQueryKey(id) },
  });

  const handleJoin = async () => {
    if (!isAuthenticated) return;
    setIsJoining(true);
    try {
      const response = await fetch(`/api/competitions/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comp?.type === "private" ? { inviteCode: inviteCode.trim() } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Join failed");
      toast({ title: t("Joined competition!", "Musobaqaga qo'shildingiz!", "Вы присоединились к соревнованию!") });
      void qc.invalidateQueries({ queryKey: getGetCompetitionQueryKey(id) });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Join failed", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <p className="text-muted-foreground">{t("Competition not found", "Musobaqa topilmadi", "Соревнование не найдено")}</p>
      </div>
    );
  }

  const challenges = normalizeArray<any>(comp.challenges, ["challenges", "data", "items"]);
  const scoreboard = normalizeArray<any>(scoreboardData, ["scoreboard", "entries", "data", "items"]);

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded border text-xs font-medium capitalize ${comp.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : comp.status === "upcoming" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground border-border"}`}>
              {comp.status}
            </span>
            {comp.type === "private" && (
              <span className="flex items-center gap-1 text-xs text-orange-500"><Lock className="w-3 h-3" /> {t("Private", "Yopiq", "Приватный")}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-competition-name">{comp.name}</h1>
          {comp.description && <p className="text-muted-foreground text-sm mb-4">{comp.description}</p>}

          {/* Prize on offer — the reason a sponsored event pulls a crowd. Shown
              prominently so participants see what they are competing for. */}
          {comp.prize && (
            <div className="mb-4 inline-flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5" data-testid="competition-prize">
              <Gift className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm">
                <span className="text-muted-foreground">{t("Prize", "Sovrin", "Приз")}: </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{comp.prize}</span>
              </span>
            </div>
          )}

          {/* Sponsor credit. A named sponsor with a logo is what a company pays
              for; it renders as a tasteful "Powered by" strip, linked if a URL
              was set. */}
          {comp.sponsorName && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3" data-testid="competition-sponsor">
              {comp.sponsorLogoUrl && (
                <img
                  src={comp.sponsorLogoUrl}
                  alt={comp.sponsorName}
                  className="h-8 w-auto max-w-[140px] object-contain"
                  loading="lazy"
                />
              )}
              <div className="text-xs leading-tight">
                <div className="text-muted-foreground">{t("Powered by", "Homiy", "Спонсор")}</div>
                {comp.sponsorUrl ? (
                  <a href={comp.sponsorUrl} target="_blank" rel="noopener noreferrer sponsored" className="font-semibold text-foreground hover:text-primary transition-colors">
                    {comp.sponsorName}
                  </a>
                ) : (
                  <span className="font-semibold text-foreground">{comp.sponsorName}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {formatDate(comp.startTime)}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 opacity-50" /> {formatDate(comp.endTime)}</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {comp.participantCount} {t("participants", "qatnashchi", "участников")}</span>
          </div>

          {isAuthenticated && !comp.isJoined && comp.status !== "ended" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {comp.type === "private" && (
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder={t("Invite code", "Taklif kodi", "Код приглашения")}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="input-invite-code"
                />
              )}
              <Button onClick={handleJoin} disabled={isJoining || (comp.type === "private" && !inviteCode.trim())} className="gap-2" data-testid="button-join-competition">
                <Trophy className="w-4 h-4" /> {t("Join Competition", "Musobaqaga Qo'shilish", "Присоединиться")}
              </Button>
            </div>
          )}
          {comp.isJoined && (
            <span className="text-sm text-primary font-medium">{t("You are participating", "Siz qatnashyapsiz", "Вы участвуете")}</span>
          )}
          {comp.certificateUrl && comp.status === "ended" && (
            <a href={comp.certificateUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="mt-2">{t("View Certificate", "Sertifikatni Ko'rish", "Посмотреть сертификат")}</Button>
            </a>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* CTF List */}
          <div>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" /> {t("Challenges", "Topshiriqlar", "Задания")} ({challenges.length})
            </h2>
            <div className="space-y-2">
              {challenges.map(ch => (
                <Link href={comp.isJoined && comp.status === "active" ? `/competitions/${comp.id}/ctf/${ch.id}` : `/ctf/${ch.id}`} key={ch.id}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" data-testid={`card-comp-ctf-${ch.id}`}>
                    <DifficultyBadge difficulty={ch.difficulty} />
                    <span className="flex-1 text-sm font-medium truncate">{ch.name}</span>
                    <span className="text-xs font-mono text-primary">{ch.points}pts</span>
                  </div>
                </Link>
              ))}
              {challenges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("No challenges added yet", "Topshiriqlar qo'shilmagan", "Задания ещё не добавлены")}</p>
              )}
            </div>
          </div>

          {/* Scoreboard */}
          {comp.status !== "upcoming" && scoreboard.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> {t("Scoreboard", "Reyting", "Рейтинг")}
              </h2>
              <div className="space-y-1.5">
                {scoreboard.slice(0, 10).map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm" data-testid={`row-comp-scoreboard-${entry.userId}`}>
                    <span className="w-5 font-mono text-muted-foreground">#{entry.rank}</span>
                    <span className="flex-1 font-medium truncate">{entry.nickname}</span>
                    <span className="font-mono font-bold text-primary">{entry.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
