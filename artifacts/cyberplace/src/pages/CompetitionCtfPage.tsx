import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, CheckCircle2, Flag, Lock, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import {
  getGetCompetitionQueryKey,
  getGetCompetitionScoreboardQueryKey,
  getGetCtfChallengeQueryKey,
  useGetCompetition,
  useGetCtfChallenge,
} from "@workspace/api-client-react";

export default function CompetitionCtfPage() {
  const [, params] = useRoute("/competitions/:competitionId/ctf/:ctfId");
  const competitionId = Number(params?.competitionId);
  const ctfId = Number(params?.ctfId);
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [flag, setFlag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: competition, isLoading: competitionLoading } = useGetCompetition(competitionId, {
    query: { enabled: !!competitionId, queryKey: getGetCompetitionQueryKey(competitionId) },
  });
  const { data: challenge, isLoading: challengeLoading } = useGetCtfChallenge(ctfId, {
    query: { enabled: !!ctfId, queryKey: getGetCtfChallengeQueryKey(ctfId) },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated || !flag.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/competitions/${competitionId}/ctf/${ctfId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag: flag.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Submit failed");

      if (data.correct) {
        toast({ title: t("Competition solve accepted!", "Competition yechimi qabul qilindi!", "Решение в соревновании принято!"), description: `+${data.pointsEarned ?? challenge?.points ?? 0} pts` });
      } else if (data.blocked) {
        toast({ title: t("Challenge blocked", "Topshiriq bloklandi", "Задание заблокировано"), description: t("You used all attempts for this challenge.", "Bu topshiriqda barcha urinishlar tugadi.", "Вы исчерпали попытки для этого задания."), variant: "destructive" });
      } else {
        toast({ title: t("Wrong flag", "Noto'g'ri flag", "Неверный флаг"), description: `${t("Attempts used:", "Ishlatilgan urinishlar:", "Использовано попыток:")} ${data.wrongAttempts}`, variant: "destructive" });
      }
      setFlag("");
      qc.invalidateQueries({ queryKey: getGetCompetitionScoreboardQueryKey(competitionId) });
      qc.invalidateQueries({ queryKey: getGetCtfChallengeQueryKey(ctfId) });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Submit failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (competitionLoading || challengeLoading) {
    return (
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!competition || !challenge) return null;

  const canSubmit = competition.isJoined && competition.status === "active" && !challenge.isSolved && !challenge.isBlocked;

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/competitions/${competitionId}`} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          {t("Back to competition", "Competition ga qaytish", "Назад к соревнованию")}
        </Link>

        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{competition.name}</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <DifficultyBadge difficulty={challenge.difficulty} />
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">{challenge.category}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{challenge.name}</h1>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{challenge.description}</p>
        </div>

        {!competition.isJoined && (
          <div className="mb-4 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 text-sm text-orange-600">
            {t("Join this competition first to submit flags.", "Flag yuborish uchun avval competition ga qo'shiling.", "Сначала присоединитесь к соревнованию, чтобы отправлять флаги.")}
          </div>
        )}

        {competition.status !== "active" && (
          <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {t("Competition submissions are only open while the competition is active.", "Competition faol paytda flag yuborish mumkin.", "Отправка флагов доступна только пока соревнование активно.")}
          </div>
        )}

        {challenge.isSolved && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-primary">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">{t("Already solved in your main challenge record.", "Asosiy challenge yozuvida allaqachon yechilgan.", "Уже решено в вашей основной записи задания.")}</span>
          </div>
        )}

        {challenge.isBlocked && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <Lock className="w-5 h-5" />
            <span className="font-medium">{t("This challenge is blocked for your account.", "Bu challenge siz uchun bloklangan.", "Это задание заблокировано для вашего аккаунта.")}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Flag className="w-4 h-4 text-primary" />
            {t("Submit Competition Flag", "Competition flag yuborish", "Отправить флаг соревнования")}
          </h2>
          <div className="flex gap-2">
            <Input
              value={flag}
              onChange={(event) => setFlag(event.target.value)}
              placeholder="Flag{...}"
              className="font-mono"
            />
            <Button type="submit" disabled={!canSubmit || isSubmitting || !flag.trim()}>
              {isSubmitting ? "..." : t("Submit", "Yuborish", "Отправить")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("This submit goes to the competition scoreboard route.", "Bu yuborish competition scoreboard route'iga ketadi.", "Эта отправка идёт в маршрут таблицы соревнования.")}
          </p>
        </form>
      </div>
    </div>
  );
}
