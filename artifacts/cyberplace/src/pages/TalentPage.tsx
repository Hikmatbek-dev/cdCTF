import { Link } from "wouter";
import { Briefcase, Flag, BookOpen, Trophy, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data, isLoading } = useGetTalentDirectory(undefined, {
    query: { queryKey: getGetTalentDirectoryQueryKey() },
  });

  const entries = normalizeArray<TalentEntry>(data?.entries, ["entries", "data", "items"]);
  const total = data?.total ?? entries.length;

  return (
    <div className="min-h-screen bg-background pt-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Briefcase className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">{t("Hire from cdCTF", "cdCTF'dan yollash", "Наём с cdCTF")}</h1>
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

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[2rem] bg-foreground/5" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-card rounded-[2.5rem] py-24 text-center border-foreground/5">
            <div className="w-20 h-20 rounded-full bg-emerald-500/5 flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-emerald-500/40" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No one is open to work yet", "Hozircha ishga tayyor odam yo'q", "Пока никто не открыт для работы")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("Learners can switch this on in their settings.", "O'quvchilar buni sozlamalarda yoqishlari mumkin.", "Соискатели могут включить это в настройках.")}
            </p>
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
                    className="group h-full p-6 rounded-[2rem] glass-card border-foreground/5 hover:border-emerald-500/30 transition-all cursor-pointer"
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
                        <Trophy className="w-4 h-4 text-primary" /> <span className="tabular-nums font-semibold">{entry.points}</span> <span className="text-muted-foreground">{t("pts", "ball", "очк")}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Flag className="w-4 h-4 text-primary" /> <span className="tabular-nums font-semibold">{entry.solvedCtfCount}</span> <span className="text-muted-foreground">{t("solved", "yechim", "решено")}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-foreground">
                        <BookOpen className="w-4 h-4 text-primary" /> <span className="tabular-nums font-semibold">{entry.completedLessonsCount}</span> <span className="text-muted-foreground">{t("lessons", "dars", "уроков")}</span>
                      </span>
                    </div>

                    {entry.titles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-foreground/5">
                        {entry.titles.slice(0, 3).map(title => (
                          <span key={title} className="text-xs font-medium text-muted-foreground bg-foreground/5 border border-foreground/5 px-3 py-1 rounded-xl">
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
