import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Trophy, Clock, Users, Flag, Lock, Gift, UserPlus, Copy, Share2, Send } from "lucide-react";
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
import { SponsorReport } from "@/components/SponsorReport";
import { errorToast } from "@/lib/error-toast";
import { statusLabel } from "@/lib/status-label";

export default function CompetitionDetailPage() {
  const [, params] = useRoute("/competitions/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
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
      // The invite gate: the server says how many activated invites you have of
      // the five required. Point the learner at their referral panel rather than
      // a dead "Forbidden".
      if (response.status === 403 && data?.error === "invite_requirement") {
        toast({
          variant: "destructive",
          title: t("Invite 5 friends first", "Avval 5 do'st taklif qiling", "Сначала пригласите 5 друзей"),
          description: t(
            `You have ${data.have} of ${data.required} active invites. Share your link from your profile.`,
            `Sizda ${data.required} tadan ${data.have} ta faol taklif bor. Profilingizdagi havolani ulashing.`,
            `У вас ${data.have} из ${data.required} активных приглашений. Поделитесь ссылкой в профиле.`,
          ),
        });
        setLocation("/profile");
        return;
      }
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Join failed");
      toast({ title: t("Joined competition!", "Musobaqaga qo'shildingiz!", "Вы присоединились к соревнованию!") });
      void qc.invalidateQueries({ queryKey: getGetCompetitionQueryKey(id) });
    } catch (error) {
      toast(errorToast(t, error, t("Could not join", "Qo'shilib bo'lmadi", "Не удалось присоединиться")));
    } finally {
      setIsJoining(false);
    }
  };

  const refreshTeamState = () => {
    void qc.invalidateQueries({ queryKey: getGetCompetitionQueryKey(id) });
    void qc.invalidateQueries({ queryKey: getGetCompetitionTeamsQueryKey(id) });
  };

  /** The friendly toasts the team endpoints can return. Returns true when it has
   * handled the response, so the caller stops. */
  const handleTeamError = (response: Response, data: any): boolean => {
    if (response.status === 403 && data?.error === "invite_requirement") {
      toast({
        variant: "destructive",
        title: t("Invite friends first", "Avval do'st taklif qiling", "Сначала пригласите друзей"),
        description: t(
          `You have ${data.have} of ${data.required} active invites. Share your link from your profile.`,
          `Sizda ${data.required} tadan ${data.have} ta faol taklif bor. Profilingizdagi havolani ulashing.`,
          `У вас ${data.have} из ${data.required} активных приглашений. Поделитесь ссылкой в профиле.`,
        ),
      });
      setLocation("/profile");
      return true;
    }
    if (response.status === 409 && data?.error === "team_full") {
      toast({
        variant: "destructive",
        title: t("Team is full", "Jamoa to'la", "Команда заполнена"),
        description: t(`This team already has ${data.max} members.`, `Bu jamoada allaqachon ${data.max} a'zo bor.`, `В этой команде уже ${data.max} участников.`),
      });
      return true;
    }
    return false;
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
      if (handleTeamError(response, data)) return;
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : t("Something went wrong", "Xatolik yuz berdi", "Что-то пошло не так"));
      toast({ title: t("Team created!", "Jamoa yaratildi!", "Команда создана!") });
      setTeamName("");
      refreshTeamState();
    } catch (error) {
      toast(errorToast(t, error));
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
      if (handleTeamError(response, data)) return;
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : t("Something went wrong", "Xatolik yuz berdi", "Что-то пошло не так"));
      toast({ title: t("Joined the team!", "Jamoaga qo'shildingiz!", "Вы вступили в команду!") });
      setTeamCode("");
      refreshTeamState();
    } catch (error) {
      toast(errorToast(t, error));
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
      <div className="min-h-screen bg-background page">
        <div className="shell-mid py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="min-h-screen bg-background page flex items-center justify-center">
        <p className="text-muted-foreground">{t("Competition not found", "Musobaqa topilmadi", "Соревнование не найдено")}</p>
      </div>
    );
  }

  const challenges = normalizeArray<any>(comp.challenges, ["challenges", "data", "items"]);
  const scoreboard = normalizeArray<any>(scoreboardData, ["scoreboard", "entries", "data", "items"]);
  const teams = normalizeArray<any>(teamsData, ["teams", "data", "items"]);
  const myTeam = (comp as any).myTeam as { id: number; name: string; inviteCode: string; isCaptain: boolean } | null | undefined;
  // Team vs individual is a hard mode, set by the admin. Each view below shows
  // only what belongs to the event's mode, so a team event is never played solo
  // and an individual event never sprouts teams.
  const isTeamMode = (comp as any).format === "team";
  const canManageTeam = isAuthenticated && comp.status !== "ended" && isTeamMode;

  return (
    <div className="min-h-screen bg-background page">
      <div className="shell-mid py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded border text-xs font-medium ${comp.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : comp.status === "upcoming" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground border-border"}`}>
              {statusLabel(t, comp.status)}
            </span>
            {comp.type === "private" && (
              <span className="flex items-center gap-1 text-xs text-orange-500"><Lock className="w-3 h-3" /> {t("Private", "Yopiq", "Приватный")}</span>
            )}
            <span className="flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Users className="w-3 h-3" /> {isTeamMode ? t("Team", "Jamoa", "Командный") : t("Individual", "Yakka", "Индивидуальный")}
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-competition-name">{comp.name}</h1>
          {comp.description && <p className="text-muted-foreground text-sm mb-4">{comp.description}</p>}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* This page assumes you already have an account and know what cdCTF
                is. /e/:id assumes neither — it is the link to hand a sponsor. */}
            <Link href={`/e/${id}`}>
              <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-event-poster">
                <Share2 className="w-4 h-4" />
                {t("Open the shareable page for this event", "Bu tadbirning ulashiladigan sahifasini ochish", "Открыть страницу события для репоста")}
              </button>
            </Link>
            {/* The event's own Telegram channel — announcements, hints, Q&A. */}
            {(comp as any).telegramUrl && (
              <a
                href={(comp as any).telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-500 hover:bg-sky-500/20 transition-colors"
                data-testid="link-competition-telegram"
              >
                <Send className="w-4 h-4" />
                {t("Telegram channel", "Telegram kanal", "Telegram-канал")}
              </a>
            )}
          </div>

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

          {/* Individual events join here. Team events are joined by creating or
              joining a team below, so this solo path is hidden for them. */}
          {!isTeamMode && isAuthenticated && !comp.isJoined && comp.status !== "ended" && (
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
                  {comp.maxTeamSize ? " " + t(`Max ${comp.maxTeamSize} per team.`, `Jamoada eng ko'pi ${comp.maxTeamSize} kishi.`, `Макс. ${comp.maxTeamSize} в команде.`) : ""}
                </p>
                {/* A private team event still needs its competition code to enter;
                    it rides along with team create/join. */}
                {comp.type === "private" && (
                  <input
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder={t("Competition invite code", "Musobaqa taklif kodi", "Код приглашения соревнования")}
                    className="mb-3 h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="input-comp-invite-for-team"
                  />
                )}
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
        {(() => {
          // The podium is drawn from the authoritative board for the mode: teams
          // for a team event, individuals for an individual one. Drawing it from
          // the individual board in a team event crowned the member who happened
          // to submit, not the winning team.
          const winners = isTeamMode
            ? teams.slice(0, 3).map(tm => ({ key: `team-${tm.teamId}`, name: tm.name, points: tm.points, href: null as string | null }))
            : scoreboard.slice(0, 3).map(e => ({ key: `user-${e.userId}`, name: e.nickname, points: e.points, href: `/profile/${e.userId}` }));
          if (comp.status !== "ended" || winners.length === 0) return null;
          return (
            <div className="mb-8 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-6" data-testid="competition-winners">
              <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> {t("Winners", "G'oliblar", "Победители")}
                <span className="text-xs font-normal text-muted-foreground">· {isTeamMode ? t("Teams", "Jamoalar", "Команды") : t("Individual", "Yakka", "Индивидуальный")}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {winners.map((w, i) => {
                  const medal = ["ring-amber-400/50 bg-amber-400/10", "ring-slate-300/40 bg-slate-300/10", "ring-orange-500/40 bg-orange-500/10"][i];
                  const card = (
                    <div className={`flex items-center gap-3 rounded-xl border border-transparent ring-1 ${medal} p-4 ${w.href ? "hover:border-amber-500/30 transition-colors cursor-pointer" : ""}`} data-testid={`winner-${i + 1}`}>
                      <span className="text-2xl font-black tabular-nums w-8 text-center">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{w.name}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{w.points} {t("points", "ball", "очки")}</div>
                      </div>
                      {i === 0 && <Trophy className="w-5 h-5 text-amber-500 shrink-0" />}
                    </div>
                  );
                  return w.href ? <Link href={w.href} key={w.key}>{card}</Link> : <div key={w.key}>{card}</div>;
                })}
              </div>
            </div>
          );
        })()}

        {/* The sponsor's report. Shown once the event has ended and only when
            it carried a sponsor — before that the numbers are still moving and
            mean nothing. */}
        {comp.status === "ended" && comp.sponsorName && (
          <SponsorReport competitionId={id} sponsorName={comp.sponsorName} />
        )}

        {/* Team leaderboard — team events only, once teams have registered. */}
        {isTeamMode && teams.length > 0 && (
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
                    <div className="text-xs text-muted-foreground">{team.solvedCount} {t("solved", "yechim", "решено")}</div>
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
                    <span className="text-xs font-mono text-primary">{ch.points} points</span>
                  </div>
                </Link>
              ))}
              {challenges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("No challenges added yet", "Topshiriqlar qo'shilmagan", "Задания ещё не добавлены")}</p>
              )}
            </div>
          </div>

          {/* Individual scoreboard — individual events only. Team events rank by
              team above, so a per-person board here would just confuse. */}
          {!isTeamMode && comp.status !== "upcoming" && scoreboard.length > 0 && (
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
