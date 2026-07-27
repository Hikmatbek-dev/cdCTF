import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, BookOpen, Briefcase, Check, Flag, GraduationCap,
  Mail, Map, Rocket, Terminal, Trophy, Wrench,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { useLang } from "@/lib/LanguageContext";
import { useListModules, getListModulesQueryKey, useGetModule, getGetModuleQueryKey } from "@workspace/api-client-react";

/**
 * The first five minutes.
 *
 * Registration used to end at /login with "check your email" — and that was the
 * whole welcome. The measured result: 165 lessons finished four times against
 * 221 challenge solves. People arrived, found the challenge list, and never
 * discovered a curriculum existed.
 *
 * This page answers two questions before anything else can go wrong — where do
 * I start, and what happens after — and then puts one button on the screen that
 * opens an actual lesson. Lessons are readable without a session, so a learner
 * who has not yet clicked the verification email still gets to start now rather
 * than being parked on a "check your inbox" screen.
 */

type Level = "new" | "some" | "pro";
type Goal = "job" | "ctf" | "curious";

/** Where each starting level is dropped into the curriculum. */
const LEVEL_MODULE: Record<Level, string> = {
  new: "linux-command-line",
  some: "web-application-security",
  pro: "exploitation-and-privilege-escalation",
};

const STORAGE_KEY = "cdctf_start_plan";

type Module = {
  id: number; slug: string;
  title: string; titleUz: string | null; titleRu: string | null;
  description: string; descriptionUz: string | null; descriptionRu: string | null;
  difficulty: string; estimatedHours: number; lessonCount: number;
};

export default function StartPage() {
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const [level, setLevel] = useState<Level | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  // A learner who just registered still has an unverified account; say so once,
  // here, instead of blocking the page behind it.
  const justRegistered = new URLSearchParams(window.location.search).get("new") === "1";

  const { data: modulesData, isLoading, isError, refetch } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const modules = (Array.isArray(modulesData) ? modulesData : []) as Module[];

  // Slug lookup with a positional fallback: if the curriculum is ever renamed,
  // a beginner should still land on the first module rather than nowhere.
  const chosen = level
    ? modules.find(m => m.slug === LEVEL_MODULE[level])
      ?? modules[level === "new" ? 0 : level === "some" ? Math.min(2, modules.length - 1) : modules.length - 1]
    : undefined;

  const { data: moduleDetail } = useGetModule(chosen?.id ?? 0, {
    query: { queryKey: getGetModuleQueryKey(chosen?.id ?? 0), enabled: Boolean(chosen?.id) },
  });
  const lessons = (moduleDetail as { lessons?: Array<{ id: number; title: string; titleUz: string | null; titleRu: string | null }> } | undefined)?.lessons ?? [];
  const firstLesson = lessons[0];

  const begin = () => {
    if (!chosen || !firstLesson) return;
    // Remembering the plan lets the dashboard keep pointing at the same module
    // instead of re-asking on every visit.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ level, goal, moduleId: chosen.id, lessonId: firstLesson.id }));
    } catch {
      // Private-mode storage can throw; the redirect is what matters.
    }
    setLocation(`/learn/${firstLesson.id}`);
  };

  const levels: Array<{ key: Level; icon: typeof Terminal; title: string; body: string }> = [
    {
      key: "new", icon: Terminal,
      title: t("Complete beginner", "Mutlaqo yangiman", "Совсем новичок"),
      body: t("I have never opened a terminal.", "Terminalni hech qachon ochmaganman.", "Я никогда не открывал терминал."),
    },
    {
      key: "some", icon: Wrench,
      title: t("I know the basics", "Asoslarni bilaman", "Знаю основы"),
      body: t("Linux and networking are familiar; security is not.", "Linux va tarmoq tanish, xavfsizlik esa yo'q.", "Linux и сети знакомы, безопасность — нет."),
    },
    {
      key: "pro", icon: Rocket,
      title: t("I have done this before", "Tajribam bor", "У меня есть опыт"),
      body: t("I have solved CTFs and want the harder half.", "CTF yechganman, qiyinrog'ini istayman.", "Решал CTF, хочу что-то посложнее."),
    },
  ];

  const goals: Array<{ key: Goal; icon: typeof Briefcase; title: string; body: string }> = [
    {
      key: "job", icon: Briefcase,
      title: t("A first job in security", "Xavfsizlik sohasida birinchi ish", "Первая работа в безопасности"),
      body: t("Certificates employers can verify, and a profile they can find.", "Ish beruvchi tekshira oladigan sertifikat va topa oladigan profil.", "Проверяемые сертификаты и профиль, который найдут."),
    },
    {
      key: "ctf", icon: Flag,
      title: t("Win CTF competitions", "CTF musobaqalarida g'olib bo'lish", "Побеждать в CTF"),
      body: t("Drill categories, climb the weekly league.", "Kategoriyalarni mashq qiling, haftalik ligada ko'tariling.", "Тренируйте категории, растите в недельной лиге."),
    },
    {
      key: "curious", icon: Map,
      title: t("Just curious", "Shunchaki qiziqyapman", "Просто интересно"),
      body: t("See what this field actually is, one lesson at a time.", "Bu soha aslida nima ekanini bir darsdan ko'ring.", "Узнайте, что это за сфера, урок за уроком."),
    },
  ];

  /** What the learner is promised will happen after the first lesson. */
  const afterFirstLesson = goal === "job"
    ? [
        t("Finish the module and pass its exam", "Modulni tugatib, imtihonini toping", "Пройдите модуль и сдайте экзамен"),
        t("Get a certificate with a serial anyone can verify", "Istalgan kishi tekshira oladigan seriyali sertifikat oling", "Получите сертификат с проверяемым номером"),
        t("Turn on \"open to work\" so employers find you", "\"Ishga tayyorman\"ni yoqing — ish beruvchilar sizni topsin", "Включите «открыт к работе», чтобы вас нашли"),
      ]
    : goal === "ctf"
    ? [
        t("Each lesson hands you the challenges that drill it", "Har dars uni mashq qiladigan topshiriqlarni beradi", "Каждый урок выдаёт задания по теме"),
        t("Solve them to earn points and titles", "Ularni yechib ball va unvon to'plang", "Решайте их ради очков и титулов"),
        t("Climb this week's league — it resets every Monday", "Haftalik ligada ko'tariling — har dushanba yangilanadi", "Растите в недельной лиге — обновляется по понедельникам"),
      ]
    : [
        t("Lessons are short and end with a practical task", "Darslar qisqa va amaliy topshiriq bilan tugaydi", "Уроки короткие и заканчиваются практикой"),
        t("The roadmap shows the whole path from here", "Yo'l xaritasi bundan keyingi butun yo'lni ko'rsatadi", "Дорожная карта показывает весь путь"),
        t("Nothing is paid — the whole curriculum is free", "Hech nima pullik emas — butun kurs bepul", "Ничего не платно — весь курс бесплатный"),
      ];

  const step = level === null ? 1 : goal === null ? 2 : 3;

  return (
    <div className="min-h-screen bg-background pt-24 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {justRegistered && (
          <div className="mb-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 flex items-start gap-3" data-testid="start-verify-note">
            <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">{t("Your account is created", "Hisobingiz yaratildi", "Аккаунт создан")}</p>
              <p className="text-muted-foreground">
                {t("Confirm the email we sent when you get a moment. You can start reading right now — verification is only needed to save progress.",
                   "Yuborilgan emailni imkoningiz bo'lganda tasdiqlang. Hozircha o'qishni boshlayvering — tasdiqlash faqat progressni saqlash uchun kerak.",
                   "Подтвердите письмо, когда будет удобно. Читать можно уже сейчас — подтверждение нужно только для сохранения прогресса.")}
              </p>
            </div>
          </div>
        )}

        {/* Progress rail — three questions, and the learner can see there are
            only three. */}
        <div className="flex items-center gap-2 mb-8" data-testid="start-progress">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3">
          {t("Let's find your first lesson", "Birinchi darsingizni topamiz", "Найдём ваш первый урок")}
        </h1>
        <p className="text-muted-foreground mb-10">
          {t("Two questions, then you start. About five minutes to your first finished lesson.",
             "Ikkita savol — so'ng boshlaysiz. Birinchi darsni tugatishga taxminan besh daqiqa.",
             "Два вопроса — и вы начинаете. Примерно пять минут до первого пройденного урока.")}
        </p>

        {/* Step 1 — level */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {t("1 · Where are you starting from?", "1 · Qayerdan boshlayapsiz?", "1 · С чего вы начинаете?")}
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {levels.map(o => (
              <button
                key={o.key}
                onClick={() => { setLevel(o.key); setGoal(null); }}
                className={`text-left rounded-2xl border p-5 transition-all ${
                  level === o.key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40"
                }`}
                data-testid={`start-level-${o.key}`}
              >
                <o.icon className={`w-5 h-5 mb-3 ${level === o.key ? "text-primary" : "text-muted-foreground"}`} />
                <div className="font-semibold mb-1 text-sm">{o.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{o.body}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2 — goal */}
        {level && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("2 · What are you here for?", "2 · Nima uchun keldingiz?", "2 · Зачем вы здесь?")}
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {goals.map(o => (
                <button
                  key={o.key}
                  onClick={() => setGoal(o.key)}
                  className={`text-left rounded-2xl border p-5 transition-all ${
                    goal === o.key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40"
                  }`}
                  data-testid={`start-goal-${o.key}`}
                >
                  <o.icon className={`w-5 h-5 mb-3 ${goal === o.key ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="font-semibold mb-1 text-sm">{o.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{o.body}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3 — the plan, and the one button that matters */}
        {level && goal && (
          <section data-testid="start-plan">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {t("3 · Your starting point", "3 · Boshlanish nuqtangiz", "3 · Ваша точка старта")}
            </h2>

            {isError ? (
              // Without this the first-run page answered a failed request with a
              // skeleton that never resolved: two questions answered, no answer.
              <LoadFailure
                onRetry={() => refetch()}
                title={t("Could not load the modules", "Modullarni yuklab bo'lmadi", "Не удалось загрузить модули")}
              />
            ) : isLoading || !chosen ? (
              <Skeleton className="h-52 w-full rounded-2xl bg-foreground/5" />
            ) : (
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-7">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">
                      {t("Start here", "Shu yerdan boshlang", "Начните отсюда")}
                    </div>
                    <h3 className="text-xl font-bold leading-tight">
                      {t(chosen.title, chosen.titleUz || chosen.title, chosen.titleRu || chosen.title)}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {t(chosen.description, chosen.descriptionUz || chosen.description, chosen.descriptionRu || chosen.description)}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground tabular-nums">
                      <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {chosen.lessonCount} {t("lessons", "dars", "уроков")}</span>
                      <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> ~{chosen.estimatedHours} {t("hours", "soat", "часов")}</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 border-t border-primary/15 pt-5">
                  {afterFirstLesson.map((line, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={begin}
                    disabled={!firstLesson}
                    className="cyber-button h-12 px-7 disabled:opacity-50"
                    data-testid="start-begin"
                  >
                    {firstLesson
                      ? t("Open the first lesson", "Birinchi darsni ochish", "Открыть первый урок")
                      : t("Loading…", "Yuklanmoqda…", "Загрузка…")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link href={`/modules/${chosen.id}`}>
                    <button className="cyber-button-outline h-12 px-6" data-testid="start-see-module">
                      {t("See the whole module", "Butun modulni ko'rish", "Смотреть весь модуль")}
                    </button>
                  </Link>
                </div>

                {firstLesson && (
                  <p className="text-xs text-muted-foreground mt-4">
                    {t("First lesson:", "Birinchi dars:", "Первый урок:")}{" "}
                    <span className="text-foreground">
                      {t(firstLesson.title, firstLesson.titleUz || firstLesson.title, firstLesson.titleRu || firstLesson.title)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {!level && (
          <p className="text-sm text-muted-foreground">
            {t("Already know your way around?", "Yo'lingizni bilasizmi?", "Уже знаете, куда идти?")}{" "}
            <Link href="/modules"><span className="text-primary hover:underline">{t("Browse all modules", "Barcha modullarni ko'rish", "Все модули")}</span></Link>
            {" · "}
            <Link href="/ctf"><span className="text-primary hover:underline">{t("Jump into practice", "To'g'ridan mashqqa", "Сразу к практике")}</span></Link>
          </p>
        )}
      </div>
    </div>
  );
}
