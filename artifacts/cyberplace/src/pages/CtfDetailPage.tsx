import { useState } from "react";
import { useRoute } from "wouter";
import { Download, Flag, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useGetCtfChallenge, getGetCtfChallengeQueryKey, useSubmitCtfFlag, useUseCtfHint } from "@workspace/api-client-react";
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
      <div className="min-h-screen bg-background pt-14">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <p className="text-muted-foreground">{t("Challenge not found", "Topshiriq topilmadi", "Задание не найдено")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <DifficultyBadge difficulty={challenge.difficulty} />
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">{challenge.category}</span>
            {challenge.isSolved && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t("Solved", "Yechilgan", "Решено")}
              </span>
            )}
            {challenge.isBlocked && (
              <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                <Lock className="w-3.5 h-3.5" /> {t("Blocked", "Bloklangan", "Заблокировано")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-challenge-name">{challenge.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-mono font-bold text-primary">{challenge.points} pts</span>
            <span>{challenge.solvedCount} {t("solves", "yechim", "решений")}</span>
          </div>
        </div>

        {/* Description */}
        <div className="p-5 rounded-lg border border-border bg-card mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("Description", "Tavsif", "Описание")}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-description">{challenge.description}</p>
        </div>

        {/* File Download */}
        {challenge.fileUrl && (
          <div className="mb-6">
            <a href={challenge.fileUrl} download>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-file">
                <Download className="w-4 h-4" /> {t("Download File", "Faylni Yuklab Olish", "Скачать файл")}
              </Button>
            </a>
          </div>
        )}


        {/* Wrong attempts warning */}
        {challenge.wrongAttempts > 0 && !challenge.isSolved && !challenge.isBlocked && (
          <div className="mb-4 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{challenge.wrongAttempts}/3 {t("wrong attempts", "noto'g'ri urinish", "неверных попытки")}</span>
          </div>
        )}

        {/* Flag Submit */}
        {!challenge.isSolved && !challenge.isBlocked && (
          <form onSubmit={handleSubmit} className="p-5 rounded-lg border border-border bg-card">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" /> {t("Submit Flag", "Flag Yuborish", "Отправить флаг")}
            </h2>
            <div className="flex gap-2">
              <Input
                value={flag}
                onChange={e => setFlag(e.target.value)}
                placeholder="Flag{...}"
                className="font-mono"
                data-testid="input-flag"
              />
              <Button type="submit" disabled={submitFlag.isPending || !flag.trim()} data-testid="button-submit-flag">
                {submitFlag.isPending ? "..." : t("Submit", "Yuborish", "Отправить")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("Format:", "Format:", "Формат:")} Flag{"{"}&bull;&bull;&bull;&bull;{"}"}</p>
          </form>
        )}

        {challenge.isSolved && (
          <div className="p-5 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <p className="font-medium text-primary">{t("Challenge solved!", "Topshiriq yechildi!", "Задание решено!")}</p>
          </div>
        )}

        {challenge.isBlocked && (
          <div className="p-5 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{t("You are blocked from this challenge", "Ushbu topshiriqdan bloklandingiz", "Вы заблокированы в этом задании")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("Contact an admin to unblock.", "Blokni ochish uchun adminga murojaat qiling.", "Обратитесь к администратору.")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
