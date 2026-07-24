import { Users, BookOpen, Flag, Target, GraduationCap, Trophy, Briefcase, Globe, ShieldCheck, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetPlatformStats, getGetPlatformStatsQueryKey } from "@workspace/api-client-react";

type Stats = {
  learners: number; modules: number; lessons: number; challenges: number;
  challengesSolved: number; lessonsCompleted: number; certificatesIssued: number;
  competitions: number; openToWork: number; languages: number;
};

export default function ImpactPage() {
  const { t } = useLang();
  const { data, isLoading } = useGetPlatformStats({ query: { queryKey: getGetPlatformStatsQueryKey() } });
  const s = (data ?? {}) as Partial<Stats>;

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("en-US");

  const headline = [
    { icon: Users, value: s.learners, label: t("Learners", "O'quvchilar", "Учащихся"), color: "text-primary" },
    { icon: Target, value: s.challengesSolved, label: t("Challenges solved", "Yechilgan topshiriqlar", "Решено заданий"), color: "text-emerald-500" },
    { icon: GraduationCap, value: s.certificatesIssued, label: t("Credentials issued", "Berilgan sertifikatlar", "Выдано сертификатов"), color: "text-amber-500" },
  ];

  const grid = [
    { icon: Layers, value: s.modules, label: t("Modules", "Modullar", "Модулей") },
    { icon: BookOpen, value: s.lessons, label: t("Lessons", "Darslar", "Уроков") },
    { icon: Flag, value: s.challenges, label: t("CTF challenges", "CTF topshiriqlari", "CTF заданий") },
    { icon: BookOpen, value: s.lessonsCompleted, label: t("Lessons completed", "Tugatilgan darslar", "Пройдено уроков") },
    { icon: Trophy, value: s.competitions, label: t("Competitions", "Musobaqalar", "Соревнований") },
    { icon: Briefcase, value: s.openToWork, label: t("Open to work", "Ishga tayyor", "Открыты к работе") },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        {/* Mission */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-6">
            <ShieldCheck className="w-3.5 h-3.5" /> cdCTF · {t("Impact", "Ta'sir", "Влияние")}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-5 leading-tight">
            {t("Free cybersecurity education for Uzbekistan",
               "O'zbekiston uchun bepul kiberxavfsizlik ta'limi",
               "Бесплатное обучение кибербезопасности для Узбекистана")}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("A hands-on academy and CTF platform in Uzbek, Russian and English — real terminal skills, verifiable credentials, and a bridge from learning to a first job in security.",
               "Uch tilli amaliy akademiya va CTF platformasi — real terminal ko'nikmalari, tekshiriladigan sertifikatlar va o'rganishdan birinchi ishgacha ko'prik.",
               "Практическая академия и CTF-платформа на трёх языках — реальные навыки, проверяемые сертификаты и мост от обучения к первой работе.")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[2rem] bg-foreground/5" />)}
          </div>
        ) : (
          <>
            {/* Headline metrics */}
            <div className="grid sm:grid-cols-3 gap-6 mb-6">
              {headline.map((m, i) => (
                <div key={i} className="rounded-[2rem] border border-border bg-card p-8 text-center" data-testid={`stat-headline-${i}`}>
                  <m.icon className={`w-7 h-7 ${m.color} mx-auto mb-4`} />
                  <div className="text-5xl font-black tracking-tight tabular-nums mb-2">{fmt(m.value)}</div>
                  <div className="text-sm text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Secondary grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {grid.map((m, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card/60 p-6 flex items-center gap-4" data-testid={`stat-grid-${i}`}>
                  <m.icon className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <div className="text-2xl font-bold tabular-nums leading-none">{fmt(m.value)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Differentiators */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Globe, title: t("Trilingual", "Uch tilli", "Трёхъязычный"), body: t("Every lesson in Uzbek, Russian and English.", "Har bir dars o'zbek, rus va ingliz tilida.", "Каждый урок на трёх языках.") },
                { icon: ShieldCheck, title: t("Verifiable credentials", "Tekshiriladigan sertifikat", "Проверяемые сертификаты"), body: t("Each certificate carries a fingerprint and a scannable QR.", "Har sertifikatda barmoq izi va skanerlanadigan QR.", "У каждого сертификата отпечаток и QR-код.") },
                { icon: Briefcase, title: t("Learning to hire", "O'rganishdan ishga", "От учёбы к найму"), body: t("A talent directory and job board connect learners with employers.", "Talent directory va ish taxtasi o'quvchini ish beruvchi bilan bog'laydi.", "Каталог талантов и доска вакансий связывают с работодателями.") },
              ].map((d, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6">
                  <d.icon className="w-5 h-5 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.body}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
