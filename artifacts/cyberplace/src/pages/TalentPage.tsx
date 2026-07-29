import { Link } from "wouter";
import { Briefcase, Flag, BookOpen, Trophy, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray } from "@/lib/api-shapes";
import { useGetTalentDirectory, getGetTalentDirectoryQueryKey } from "@workspace/api-client-react";

type TalentEntry = {
  userId: number;
  nickname: string;
  avatarUrl?: string | null;
  points: number;
  solvedCtfCount: number;
  completedLessonsCount: number;
  titles: string[];
};

export default function TalentPage() {
  const { t } = useLang();
  const { data, isLoading, isError, refetch } = useGetTalentDirectory(undefined, {
    query: { queryKey: getGetTalentDirectoryQueryKey() },
  });

  const entries = normalizeArray<TalentEntry>(data?.entries, ["entries", "data", "items"]);
  const total = data?.total ?? entries.length;

  return (
    <div className="min-h-screen bg-background page relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full hidden pointer-events-none" />

      <div className="shell py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Briefcase className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h1>{t("Hire from cdCTF", "cdCTF'dan yollash", "Наём с cdCTF")}</h1>
            <p className="text-muted-foreground">
              {t("Learners who are open to work, ranked by what they've actually solved.",
                 "Ishga tayyor o'quvchilar — haqiqatan yechgani bo'yicha saralangan.",
                 "Соискатели, готовые к работе, отсортированные по решённым заданиям.")}
            </p>
          </div>
        </div>

        {/* Employer note — makes the pitch explicit without needing an account. */}
        <div className="mb-10 rounded-2xl border border-border bg-muted/20 px-5 py-4 text-sm text-muted-foreground flex items-start gap-3">
          <Users className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
          <p>
            {t("Recruiting? Every profile here opted in. Open a profile to see their solved challenges, completed modules and titles — then reach out.",
               "Xodim izlayapsizmi? Bu yerdagi har bir profil o'zi rozilik bergan. Profilni oching — yechgan topshiriqlari, tugatgan modullari va unvonlarini ko'ring, so'ng bog'laning.",
               "Ищете сотрудника? Каждый профиль здесь дал согласие. Откройте профиль, чтобы увидеть решённые задания, модули и титулы — затем свяжитесь.")}
          </p>
        </div>

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl bg-muted" />)}
          </div>
        ) : entries.length === 0 ? (
          /* Tell a learner exactly where the switch is — that is the only way
              this directory ever fills up. */
          <div className="glass-card rounded-xl py-16 px-8 text-center border-border">
            <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center mx-auto mb-5">
              <Briefcase className="w-7 h-7 text-emerald-500/40" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No one is open to work yet", "Hozircha ishga tayyor odam yo'q", "Пока никто не открыт для работы")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-7">
              {t("Learning here and want to be found? Turn on \"Open to work\" in your settings and your profile shows up on this page.",
                 "Bu yerda o'rganyapsizmi va topilishni istaysizmi? Sozlamalarda \"Ishga tayyorman\" ni yoqing — profilingiz shu sahifada chiqadi.",
                 "Учитесь здесь и хотите, чтобы вас нашли? Включите «Открыт для работы» в настройках — ваш профиль появится на этой странице.")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/profile/edit">
                <button className="cyber-button h-11 px-6">{t("Open my settings", "Sozlamalarimni ochish", "Открыть настройки")}</button>
              </Link>
              <Link href="/scoreboard">
                <button className="cyber-button-outline h-11 px-6">{t("See the leaderboard", "Reytingni ko'rish", "Смотреть рейтинг")}</button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4 tabular-nums">
              {total} {t("candidates", "nomzod", "кандидатов")}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {entries.map(entry => (
                <Link href={`/profile/${entry.userId}`} key={entry.userId}>
                  <div
                    className="group h-full p-6 rounded-xl glass-card border-border hover:border-emerald-500/30 transition-all cursor-pointer"
                    data-testid={`card-talent-${entry.userId}`}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl font-bold text-emerald-500 overflow-hidden shrink-0">
                        {entry.avatarUrl
                          ? <img src={entry.avatarUrl} alt={entry.nickname} className="w-full h-full object-cover" />
                          : <span>{entry.nickname[0]?.toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-lg truncate group-hover:text-emerald-500 transition-colors">{entry.nickname}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3" /> {t("Open to work", "Ishga tayyor", "Открыт для работы")}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Trophy className="w-4 h-4 text-primary" /> <span className="tabular-nums font-semibold">{entry.points}</span> <span className="text-muted-foreground">{t("points", "ball", "очки")}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Flag className="w-4 h-4 text-primary" /> <span className="tabular-nums font-semibold">{entry.solvedCtfCount}</span> <span className="text-muted-foreground">{t("solved", "yechim", "решено")}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-foreground">
                        <BookOpen className="w-4 h-4 text-primary" /> <span className="tabular-nums font-semibold">{entry.completedLessonsCount}</span> <span className="text-muted-foreground">{t("lessons", "dars", "уроков")}</span>
                      </span>
                    </div>

                    {entry.titles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
                        {entry.titles.slice(0, 3).map(title => (
                          <span key={title} className="text-xs font-medium text-muted-foreground bg-muted border border-border px-3 py-1 rounded-xl">
                            {title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
