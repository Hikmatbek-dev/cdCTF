import { useEffect, useRef, useState } from "react";
import { Users, BookOpen, Flag, Target, GraduationCap, Trophy, Briefcase, Globe, ShieldCheck, Layers, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useGetPlatformStats, getGetPlatformStatsQueryKey } from "@workspace/api-client-react";
import { motion, useInView } from "framer-motion";

type Stats = {
  learners: number; modules: number; lessons: number; challenges: number;
  challengesSolved: number; lessonsCompleted: number; certificatesIssued: number;
  competitions: number; openToWork: number; languages: number;
};

function CountUp({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      const start = 0;
      const end = value;
      if (start === end) {
        setCount(end);
        return;
      }
      let startTime: number | null = null;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * (end - start) + start));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setCount(end);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [value, isInView, duration]);

  return <span ref={ref}>{count.toLocaleString("en-US")}</span>;
}

export default function ImpactPage() {
  const { t } = useLang();
  const { data, isLoading } = useGetPlatformStats({ query: { queryKey: getGetPlatformStatsQueryKey() } });
  const s = (data ?? {}) as Partial<Stats>;

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  } as any;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as any;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium glowing background */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none overflow-hidden flex justify-center z-0">
        <div className="absolute top-[-200px] w-[800px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] opacity-40"></div>
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="shell py-16 md:py-24 relative z-10">
        {/* Mission */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6 shadow-[0_0_20px_rgba(var(--primary),0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5" /> cdCTF · {t("Impact", "Ta'sir", "Влияние")}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-6 tracking-tight"
          >
            {t("Free cybersecurity education for Uzbekistan",
               "O'zbekiston uchun bepul kiberxavfsizlik ta'limi",
               "Бесплатное обучение кибербезопасности для Узбекистана")}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
          >
            {t("A hands-on academy and CTF platform in Uzbek, Russian and English — real terminal skills, verifiable credentials, and a bridge from learning to a first job in security.",
               "Uch tilli amaliy akademiya va CTF platformasi — real terminal ko'nikmalari, tekshiriladigan sertifikatlar va o'rganishdan birinchi ishgacha ko'prik.",
               "Практическая академия и CTF-платформа на трёх языках — реальные навыки, проверяемые сертификаты и мост от обучения к первой работе.")}
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Skeleton className="h-64 rounded-3xl bg-muted md:col-span-2" />
            <Skeleton className="h-64 rounded-3xl bg-muted md:col-span-1" />
            <Skeleton className="h-48 rounded-3xl bg-muted md:col-span-1" />
            <Skeleton className="h-48 rounded-3xl bg-muted md:col-span-2" />
          </div>
        ) : (
          <motion.div 
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Bento Grid Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Learners - Large Hero Card */}
              <motion.div variants={itemVariants} className="md:col-span-2 relative group overflow-hidden rounded-3xl border border-primary/20 bg-card p-8 md:p-10 shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors"></div>
                <Users className="w-10 h-10 text-primary mb-6" />
                <div className="relative z-10">
                  <div className="text-6xl md:text-7xl font-black tracking-tight tabular-nums mb-2 text-foreground">
                    <CountUp value={s.learners ?? 0} />
                  </div>
                  <div className="text-lg md:text-xl font-medium text-muted-foreground">
                    {t("Active learners from across the region", "Butun mintaqadan faol o'quvchilar", "Активные учащиеся со всего региона")}
                  </div>
                </div>
              </motion.div>

              {/* Solved Challenges */}
              <motion.div variants={itemVariants} className="md:col-span-1 relative group overflow-hidden rounded-3xl border border-emerald-500/20 bg-card p-8 md:p-10 shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                <Target className="w-10 h-10 text-emerald-500 mb-6" />
                <div className="relative z-10 mt-auto">
                  <div className="text-5xl md:text-6xl font-black tracking-tight tabular-nums mb-2 text-foreground">
                    <CountUp value={s.challengesSolved ?? 0} />
                  </div>
                  <div className="text-md font-medium text-muted-foreground">
                    {t("Challenges solved", "Yechilgan topshiriqlar", "Решено заданий")}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bento Grid Middle Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Certificates */}
              <motion.div variants={itemVariants} className="md:col-span-1 relative group overflow-hidden rounded-3xl border border-amber-500/20 bg-card p-8 md:p-10 shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
                <GraduationCap className="w-10 h-10 text-amber-500 mb-6" />
                <div className="relative z-10">
                  <div className="text-5xl md:text-6xl font-black tracking-tight tabular-nums mb-2 text-foreground">
                    <CountUp value={s.certificatesIssued ?? 0} />
                  </div>
                  <div className="text-md font-medium text-muted-foreground">
                    {t("Credentials issued", "Berilgan sertifikatlar", "Выдано сертификатов")}
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid 2x3 inside a Bento Box */}
              <motion.div variants={itemVariants} className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-px bg-border rounded-3xl overflow-hidden border border-border shadow-lg">
                {[
                  { icon: Layers, value: s.modules, label: t("Modules", "Modullar", "Модулей") },
                  { icon: BookOpen, value: s.lessons, label: t("Lessons", "Darslar", "Уроков") },
                  { icon: Flag, value: s.challenges, label: t("CTF challenges", "CTF topshiriqlari", "CTF заданий") },
                  { icon: BookOpen, value: s.lessonsCompleted, label: t("Lessons completed", "Tugatilgan darslar", "Пройдено уроков") },
                  { icon: Trophy, value: s.competitions, label: t("Competitions", "Musobaqalar", "Соревнований") },
                  { icon: Briefcase, value: s.openToWork, label: t("Open to work", "Ishga tayyor", "Открыты к работе") },
                ].map((m, i) => (
                  <div key={i} className="bg-card p-6 md:p-8 flex flex-col items-start justify-center hover:bg-muted/30 transition-colors">
                    <m.icon className="w-6 h-6 text-primary mb-4" />
                    <div className="text-3xl font-bold tabular-nums leading-none mb-1 text-foreground">
                      <CountUp value={m.value ?? 0} duration={1.5} />
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">{m.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Differentiators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
              {[
                { icon: Globe, title: t("Trilingual", "Uch tilli", "Трёхъязычный"), body: t("Every lesson in Uzbek, Russian and English.", "Har bir dars o'zbek, rus va ingliz tilida.", "Каждый урок на трёх языках.") },
                { icon: ShieldCheck, title: t("Verifiable credentials", "Tekshiriladigan sertifikat", "Проверяемые сертификаты"), body: t("Each certificate carries a fingerprint and a scannable QR.", "Har sertifikatda barmoq izi va skanerlanadigan QR.", "У каждого сертификата отпечаток и QR-код.") },
                { icon: Briefcase, title: t("Learning to hire", "O'rganishdan ishga", "От учёбы к найму"), body: t("A talent directory and job board connect learners with employers.", "Talent directory va ish taxtasi o'quvchini ish beruvchi bilan bog'laydi.", "Каталог талантов и доска вакансий связывают с работодателями.") },
              ].map((d, i) => (
                <motion.div variants={itemVariants} key={i} className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-8 shadow-sm hover:bg-card hover:border-border/80 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                    <d.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{d.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{d.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
