import { useState } from "react";
import { useRoute } from "wouter";
import { Trophy, Clock, Users, Flag, Lock, Gift, UserPlus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCompetition, getGetCompetitionQueryKey, useGetCompetitionScoreboard, getGetCompetitionScoreboardQueryKey, useGetCompetitionTeams, getGetCompetitionTeamsQueryKey } from "@workspace/api-client-react";
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
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);

  const { data: comp, isLoading } = useGetCompetition(id, {
    query: { enabled: !!id, queryKey: getGetCompetitionQueryKey(id) },
  });

  const { data: scoreboardData } = useGetCompetitionScoreboard(id, {
    query: { enabled: !!id && comp?.status !== "upcoming", queryKey: getGetCompetitionScoreboardQueryKey(id) },
  });

  const { data: teamsData } = useGetCompetitionTeams(id, {
    query: { enabled: !!id, queryKey: getGetCompetitionTeamsQueryKey(id) },
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

  const refreshTeamState = () => {
    void qc.invalidateQueries({ queryKey: getGetCompetitionQueryKey(id) });
    void qc.invalidateQueries({ queryKey: getGetCompetitionTeamsQueryKey(id) });
  };

  const handleCreateTeam = async () => {
    if (!isAuthenticated || teamBusy) return;
    setTeamBusy(true);
    try {
      const body: Record<string, string> = { name: teamName.trim() };
      if (comp?.type === "private") body.inviteCode = inviteCode.trim();
      const response = await fetch(`/api/competitions/${id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed");
      toast({ title: t("Team created!", "Jamoa yaratildi!", "Команда создана!") });
      setTeamName("");
      refreshTeamState();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setTeamBusy(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!isAuthenticated || teamBusy) return;
    setTeamBusy(true);
    try {
      const response = await fetch(`/api/competitions/${id}/teams/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: teamCode.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed");
      toast({ title: t("Joined the team!", "Jamoaga qo'shildingiz!", "Вы вступили в команду!") });
      setTeamCode("");
      refreshTeamState();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed", variant: "destructive" });
    } finally {
      setTeamBusy(false);
    }
  };

  const copyTeamCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast({ title: t("Code copied!", "Kod nusxalandi!", "Код скопирован!") }),
      () => toast({ title: code, variant: "destructive" }),
    );
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
  const teams = normalizeArray<any>(teamsData, ["teams", "data", "items"]);
  const myTeam = (comp as any).myTeam as { id: number; name: string; inviteCode: string; isCaptain: boolean } | null | undefined;
  const canManageTeam = isAuthenticated && comp.status !== "ended";

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

          {/* Team play. A solved challenge counts once for the whole team, so
              the choice to compete solo or as a team is made here, up front. */}
          {canManageTeam && (
            myTeam ? (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3" data-testid="my-team">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{t("Your team", "Sizning jamoangiz", "Ваша команда")}:</span>
                  <span className="font-semibold">{myTeam.name}</span>
                  {myTeam.isCaptain && <span className="text-xs text-muted-foreground">({t("captain", "kapitan", "капитан")})</span>}
                </div>
                {myTeam.isCaptain && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("Invite code", "Taklif kodi", "Код приглашения")}:</span>
                    <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono" data-testid="team-invite-code">{myTeam.inviteCode}</code>
                    <button onClick={() => copyTeamCode(myTeam.inviteCode)} className="text-muted-foreground hover:text-primary" title={t("Copy", "Nusxalash", "Копировать")}>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                  <Users className="w-4 h-4 text-primary" /> {t("Compete as a team", "Jamoa bo'lib qatnashish", "Участвовать командой")}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("A challenge solved by one member counts for the whole team.",
                     "Bir a'zo yechgan topshiriq butun jamoa uchun hisoblanadi.",
                     "Задание, решённое одним участником, засчитывается всей команде.")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder={t("New team name", "Yangi jamoa nomi", "Название команды")}
                      className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-team-name"
                    />
                    <Button size="sm" variant="outline" onClick={handleCreateTeam} disabled={teamBusy || teamName.trim().length < 2} className="gap-1.5 shrink-0" data-testid="button-create-team">
                      <UserPlus className="w-4 h-4" /> {t("Create", "Yaratish", "Создать")}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      placeholder={t("Team code", "Jamoa kodi", "Код команды")}
                      className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-team-code"
                    />
                    <Button size="sm" variant="outline" onClick={handleJoinTeam} disabled={teamBusy || !teamCode.trim()} className="gap-1.5 shrink-0" data-testid="button-join-team">
                      {t("Join", "Qo'shilish", "Войти")}
                    </Button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Winners — the payoff of a sponsored event. Once it has ended, the top
            three finishers get a podium the sponsor (and the winners) can share.
            Only shown when there is a result to show. */}
        {comp.status === "ended" && scoreboard.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-6" data-testid="competition-winners">
            <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> {t("Winners", "G'oliblar", "Победители")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {scoreboard.slice(0, 3).map((entry, i) => {
                const medal = ["ring-amber-400/50 bg-amber-400/10", "ring-slate-300/40 bg-slate-300/10", "ring-orange-500/40 bg-orange-500/10"][i];
                return (
                  <Link href={`/profile/${entry.userId}`} key={entry.userId}>
                    <div className={`flex items-center gap-3 rounded-xl border border-transparent ring-1 ${medal} p-4 hover:border-amber-500/30 transition-colors cursor-pointer`} data-testid={`winner-${i + 1}`}>
                      <span className="text-2xl font-black tabular-nums w-8 text-center">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{entry.nickname}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{entry.points} {t("points", "ball", "очки")}</div>
                      </div>
                      {i === 0 && <Trophy className="w-5 h-5 text-amber-500 shrink-0" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Team leaderboard — only when teams have registered. Ranks teams by
            their shared score. */}
        {teams.length > 0 && (
          <div className="mb-8" data-testid="team-leaderboard">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> {t("Teams", "Jamoalar", "Команды")} ({teams.length})
            </h2>
            <div className="space-y-2">
              {teams.map((team) => (
                <div key={team.teamId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card" data-testid={`team-row-${team.teamId}`}>
                  <span className="w-6 font-mono text-muted-foreground text-sm">#{team.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{team.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {team.members?.length ?? 0} {t("members", "a'zo", "участн.")}
                      {team.members?.length > 0 && ` · ${team.members.slice(0, 3).join(", ")}${team.members.length > 3 ? "…" : ""}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-primary tabular-nums">{team.points}</div>
                    <div className="text-[11px] text-muted-foreground">{team.solvedCount} {t("solved", "yechim", "решено")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
