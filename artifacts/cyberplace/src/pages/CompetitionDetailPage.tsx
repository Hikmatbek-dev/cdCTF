import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Trophy, Clock, Users, Flag, Lock, Gift, UserPlus, Copy, Share2, Send, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useSiteConfig } from "@/lib/useSiteConfig";

export default function CompetitionDetailPage() {
  const [, params] = useRoute("/competitions/:id");
  const id = Number(params?.id);
  const { t } = useLang();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { telegramChannelUrl } = useSiteConfig();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      {/* Hero Header */}
      <div className="relative border-b border-border/50 bg-card/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <div className="shell-mid relative py-12">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${comp.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : comp.status === "upcoming" ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-muted text-muted-foreground border-border"}`}>
              {statusLabel(t, comp.status)}
            </span>
            {comp.type === "private" && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-500 uppercase tracking-wider bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20"><Lock className="w-3.5 h-3.5" /> {t("Private", "Yopiq", "Приватный")}</span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> {isTeamMode ? t("Team", "Jamoa", "Командный") : t("Individual", "Yakka", "Индивидуальный")}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" data-testid="text-competition-name">{comp.name}</h1>
          
          {comp.description && <p className="text-lg text-muted-foreground/90 max-w-3xl mb-6 leading-relaxed">{comp.description}</p>}

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground font-medium mb-6">
            <span className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-border/50"><Clock className="w-4 h-4 text-primary" /> {formatDate(comp.startTime)}</span>
            <span className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-border/50"><Clock className="w-4 h-4 opacity-50" /> {formatDate(comp.endTime)}</span>
            <span className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-border/50"><Users className="w-4 h-4 text-primary" /> {comp.participantCount} {t("participants", "qatnashchi", "участников")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/e/${id}`}>
              <Button variant="outline" className="gap-2 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
                <Share2 className="w-4 h-4" />
                {t("Share", "Ulashish", "Поделиться")}
              </Button>
            </Link>
            {((comp as any).telegramUrl || telegramChannelUrl) && (
              <a href={(comp as any).telegramUrl || telegramChannelUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 rounded-full border-sky-500/20 text-sky-500 hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/30 transition-all">
                  <Send className="w-4 h-4" />
                  {t("Telegram", "Telegram", "Telegram")}
                </Button>
              </a>
            )}
            {comp.prize && (
              <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]" data-testid="competition-prize">
                <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{comp.prize}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="shell-mid py-8">
        
        {/* Giant Timer for Upcoming */}
        {comp.status === "upcoming" && (
          <div className="mb-12 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card to-background p-8 md:p-12 text-center shadow-2xl shadow-primary/5">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            
            <h3 className="text-xl md:text-2xl font-bold mb-8 text-foreground/80 uppercase tracking-widest">{t("Competition starts in", "Musobaqa boshlanishiga qoldi", "Соревнование начнется через")}</h3>
            
            <div className="flex justify-center gap-4 md:gap-8 text-4xl md:text-6xl font-black font-mono text-primary">
              {(() => {
                const diff = Math.max(0, new Date(comp.startTime).getTime() - now.getTime());
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                return (
                  <>
                    <div className="flex flex-col items-center group">
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 md:p-6 min-w-[80px] md:min-w-[120px] shadow-lg group-hover:scale-105 transition-transform">{d}</div>
                      <span className="text-xs md:text-sm text-muted-foreground mt-3 uppercase tracking-widest font-sans">{t("Days", "Kun", "Дней")}</span>
                    </div>
                    <span className="py-4 md:py-6 text-primary/50">:</span>
                    <div className="flex flex-col items-center group">
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 md:p-6 min-w-[80px] md:min-w-[120px] shadow-lg group-hover:scale-105 transition-transform">{h.toString().padStart(2, '0')}</div>
                      <span className="text-xs md:text-sm text-muted-foreground mt-3 uppercase tracking-widest font-sans">{t("Hrs", "Soat", "Час")}</span>
                    </div>
                    <span className="py-4 md:py-6 text-primary/50">:</span>
                    <div className="flex flex-col items-center group">
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 md:p-6 min-w-[80px] md:min-w-[120px] shadow-lg group-hover:scale-105 transition-transform">{m.toString().padStart(2, '0')}</div>
                      <span className="text-xs md:text-sm text-muted-foreground mt-3 uppercase tracking-widest font-sans">{t("Min", "Daq", "Мин")}</span>
                    </div>
                    <span className="py-4 md:py-6 text-primary/50">:</span>
                    <div className="flex flex-col items-center group">
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 md:p-6 min-w-[80px] md:min-w-[120px] shadow-lg group-hover:scale-105 transition-transform">{s.toString().padStart(2, '0')}</div>
                      <span className="text-xs md:text-sm text-muted-foreground mt-3 uppercase tracking-widest font-sans">{t("Sec", "Son", "Сек")}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 rounded-none h-auto overflow-x-auto overflow-y-hidden mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 py-3 text-base font-semibold transition-none">
              {t("Overview", "Umumiy", "Обзор")}
            </TabsTrigger>
            {comp.status !== "upcoming" && (
              <TabsTrigger value="challenges" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 py-3 text-base font-semibold transition-none flex items-center gap-2">
                {t("Challenges", "Topshiriqlar", "Задания")} 
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{challenges.length}</span>
              </TabsTrigger>
            )}
            {comp.status !== "upcoming" && (
              <TabsTrigger value="scoreboard" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 py-3 text-base font-semibold transition-none">
                {t("Scoreboard", "Reyting", "Рейтинг")}
              </TabsTrigger>
            )}
            <TabsTrigger value="participants" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 py-3 text-base font-semibold transition-none flex items-center gap-2">
              {isTeamMode ? t("Teams", "Jamoalar", "Команды") : t("Participants", "Ishtirokchilar", "Участники")}
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{isTeamMode ? teams.length : scoreboard.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Card: Join / Team Management */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
              {!isTeamMode && isAuthenticated && !comp.isJoined && comp.status !== "ended" && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {comp.type === "private" && (
                    <input
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      placeholder={t("Invite code", "Taklif kodi", "Код приглашения")}
                      className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-full sm:w-auto min-w-[250px]"
                      data-testid="input-invite-code"
                    />
                  )}
                  <Button onClick={handleJoin} disabled={isJoining || (comp.type === "private" && !inviteCode.trim())} size="lg" className="gap-2 rounded-xl w-full sm:w-auto" data-testid="button-join-competition">
                    <Trophy className="w-5 h-5" /> {t("Join Competition", "Musobaqaga Qo'shilish", "Присоединиться")}
                  </Button>
                </div>
              )}
              {comp.isJoined && (
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full"><CheckCircle className="w-6 h-6 text-green-500" /></div>
                  <div>
                    <h4 className="font-bold">{t("You are participating", "Siz qatnashyapsiz", "Вы участвуете")}</h4>
                    <p className="text-sm text-muted-foreground">{t("Good luck!", "Omad yor bo'lsin!", "Удачи!")}</p>
                  </div>
                </div>
              )}
              
              {canManageTeam && (
                myTeam ? (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" data-testid="my-team">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/20 p-3 rounded-2xl"><Users className="w-6 h-6 text-primary" /></div>
                      <div>
                        <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-0.5">{t("Your team", "Sizning jamoangiz", "Ваша команда")}</div>
                        <div className="text-xl font-black">{myTeam.name} {myTeam.isCaptain && <span className="text-sm font-semibold text-primary ml-2">({t("captain", "kapitan", "капитан")})</span>}</div>
                      </div>
                    </div>
                    {myTeam.isCaptain && (
                      <div className="flex items-center gap-3 bg-background rounded-xl p-2 pr-4 border border-border/50">
                        <div className="text-xs text-muted-foreground uppercase font-bold ml-2">{t("Invite code", "Taklif kodi", "Код приглашения")}:</div>
                        <code className="bg-muted px-3 py-1.5 rounded-lg text-sm font-mono font-bold tracking-widest" data-testid="team-invite-code">{myTeam.inviteCode}</code>
                        <Button variant="ghost" size="icon" onClick={() => copyTeamCode(myTeam.inviteCode)} title={t("Copy", "Nusxalash", "Копировать")}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-primary/20 p-2 rounded-xl"><Users className="w-5 h-5 text-primary" /></div>
                      <div>
                        <h4 className="font-bold">{t("Compete as a team", "Jamoa bo'lib qatnashish", "Участвовать командой")}</h4>
                        <p className="text-sm text-muted-foreground">{t("A challenge solved by one member counts for the whole team.", "Bir a'zo yechgan topshiriq butun jamoa uchun hisoblanadi.", "Задание, решённое одним участником, засчитывается всей команде.")}</p>
                      </div>
                    </div>
                    {comp.type === "private" && (
                      <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder={t("Competition invite code", "Musobaqa taklif kodi", "Код приглашения соревнования")} className="mb-4 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="input-comp-invite-for-team" />
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex gap-2">
                        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t("New team name", "Yangi jamoa nomi", "Название команды")} className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="input-team-name" />
                        <Button size="lg" onClick={handleCreateTeam} disabled={teamBusy || teamName.trim().length < 2} className="gap-2 rounded-xl" data-testid="button-create-team">
                          <UserPlus className="w-4 h-4" /> {t("Create", "Yaratish", "Создать")}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <input value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder={t("Team code", "Jamoa kodi", "Код команды")} className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" data-testid="input-team-code" />
                        <Button size="lg" variant="outline" onClick={handleJoinTeam} disabled={teamBusy || !teamCode.trim()} className="gap-2 rounded-xl" data-testid="button-join-team">
                          {t("Join", "Qo'shilish", "Войти")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {comp.sponsorName && (
              <div className="rounded-2xl border border-border/50 bg-card/40 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 backdrop-blur-sm" data-testid="competition-sponsor">
                {comp.sponsorLogoUrl && (
                  <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm shrink-0">
                    <img src={comp.sponsorLogoUrl} alt={comp.sponsorName} className="h-12 w-auto max-w-[160px] object-contain" loading="lazy" />
                  </div>
                )}
                <div className="text-center sm:text-left">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">{t("Powered by", "Bosh homiy", "Генеральный спонсор")}</div>
                  {comp.sponsorUrl ? (
                    <a href={comp.sponsorUrl} target="_blank" rel="noopener noreferrer sponsored" className="text-xl font-black text-foreground hover:text-primary transition-colors">
                      {comp.sponsorName}
                    </a>
                  ) : (
                    <div className="text-xl font-black text-foreground">{comp.sponsorName}</div>
                  )}
                </div>
              </div>
            )}

            {/* Winners Podium */}
            {(() => {
              const winners = isTeamMode
                ? teams.slice(0, 3).map(tm => ({ key: `team-${tm.teamId}`, name: tm.name, points: tm.points, href: null as string | null }))
                : scoreboard.slice(0, 3).map(e => ({ key: `user-${e.userId}`, name: e.nickname, points: e.points, href: `/profile/${e.userId}` }));
              if (comp.status !== "ended" || winners.length === 0) return null;
              return (
                <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(245,158,11,0.05)] text-center relative overflow-hidden" data-testid="competition-winners">
                  <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
                  <h2 className="text-2xl font-black mb-8 flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8 text-amber-500 drop-shadow-md" /> 
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-400">{t("Winners", "G'oliblar", "Победители")}</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {winners.map((w, i) => {
                      const medal = ["border-amber-400/50 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]", "border-slate-300/40 bg-slate-300/10", "border-orange-500/40 bg-orange-500/10"][i];
                      const textColor = ["text-amber-500", "text-slate-400", "text-orange-500"][i];
                      const card = (
                        <div className={`flex flex-col items-center gap-4 rounded-2xl border ${medal} p-6 ${w.href ? "hover:-translate-y-1 transition-transform cursor-pointer" : ""}`} data-testid={`winner-${i + 1}`}>
                          <div className={`text-4xl font-black ${textColor}`}>#{i + 1}</div>
                          <div className="font-bold text-lg truncate w-full text-center">{w.name}</div>
                          <div className="text-sm font-semibold px-3 py-1 bg-background/50 rounded-full tabular-nums">{w.points} {t("points", "ball", "очки")}</div>
                        </div>
                      );
                      return w.href ? <Link href={w.href} key={w.key} className="block">{card}</Link> : <div key={w.key}>{card}</div>;
                    })}
                  </div>
                </div>
              );
            })()}

            {comp.status === "ended" && comp.sponsorName && (
              <SponsorReport competitionId={id} sponsorName={comp.sponsorName} />
            )}
          </TabsContent>

          {comp.status !== "upcoming" && (
            <TabsContent value="challenges" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {challenges.map(ch => (
                  <Link href={comp.isJoined && comp.status === "active" ? `/competitions/${comp.id}/ctf/${ch.id}` : `/ctf/${ch.id}`} key={ch.id} className="block h-full">
                    <div className={`relative flex flex-col h-full p-6 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${ch.isSolved ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.05)]" : "border-border/50 bg-card/60 hover:bg-card hover:border-primary/50"}`} data-testid={`card-comp-ctf-${ch.id}`}>
                      {ch.isSolved && (
                        <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <DifficultyBadge difficulty={ch.difficulty} />
                        <span className="text-sm font-mono font-black text-primary px-3 py-1 bg-primary/10 rounded-lg">
                          {ch.points} XP
                        </span>
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${ch.isSolved ? "text-emerald-500" : "text-foreground group-hover:text-primary transition-colors"}`}>
                        {ch.name}
                      </h3>
                      <div className="mt-auto pt-6 flex items-center justify-between border-t border-border/50">
                        <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{ch.category}</span>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${ch.isSolved ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"}`}>
                          <ChevronRight className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {challenges.length === 0 && (
                  <div className="col-span-full py-20 text-center border border-dashed rounded-3xl border-border/60 bg-muted/20">
                    <Flag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">{t("No challenges added yet", "Topshiriqlar qo'shilmagan", "Задания ещё не добавлены")}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {comp.status !== "upcoming" && (
            <TabsContent value="scoreboard" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                  <h2 className="text-xl font-black flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-primary" /> {t("Live Scoreboard", "Jonli Reyting", "Рейтинг")}
                  </h2>
                  <span className="text-sm font-bold text-muted-foreground px-3 py-1 bg-background rounded-full border border-border/50">
                    {isTeamMode ? `${teams.length} Teams` : `${scoreboard.length} Players`}
                  </span>
                </div>
                <div className="p-0">
                  {(isTeamMode ? teams : scoreboard).map((entry: any, i: number) => (
                    <div key={entry.userId || entry.teamId} className={`flex items-center gap-4 p-4 sm:p-6 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors ${i < 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""}`}>
                      <div className={`w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center rounded-xl font-black text-lg shrink-0 ${i === 0 ? "bg-amber-400 text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-orange-400 text-orange-950" : "bg-muted text-muted-foreground"}`}>
                        {entry.rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-lg truncate">{entry.nickname || entry.name}</div>
                        {isTeamMode && entry.members && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {entry.members.length} {t("members", "a'zo", "участн.")}
                            {entry.members.length > 0 && ` · ${entry.members.slice(0, 3).join(", ")}${entry.members.length > 3 ? "…" : ""}`}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-xl sm:text-2xl text-primary tabular-nums tracking-tight">{entry.points}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{t("Points", "Ball", "Очки")}</div>
                      </div>
                    </div>
                  ))}
                  {(isTeamMode ? teams : scoreboard).length === 0 && (
                    <div className="py-16 text-center text-muted-foreground font-medium">
                      {t("No participants yet", "Hozircha ishtirokchilar yo'q", "Пока нет участников")}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="participants" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(isTeamMode ? teams : scoreboard).map((entry: any, i: number) => (
                <div key={entry.userId || entry.teamId} className="flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-border/50 bg-card/40 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg w-full truncate px-2">{entry.nickname || entry.name}</h3>
                  {isTeamMode && (
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      {entry.members?.length ?? 0} {t("members", "a'zo", "участн.")}
                    </p>
                  )}
                </div>
              ))}
              {(isTeamMode ? teams : scoreboard).length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed rounded-3xl border-border/60 bg-muted/20">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">{t("No participants joined yet", "Hali hech kim qo'shilmadi", "Никто еще не присоединился")}</p>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};
