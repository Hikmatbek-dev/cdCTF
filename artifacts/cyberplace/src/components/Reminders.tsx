import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Award, ArrowRight, BookOpen, Flame, GraduationCap, Radio, RotateCcw, Trophy } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

/**
 * The nudge strip: what this learner should do next, said in one line.
 *
 * The server decides *what* is worth saying (see GET /api/users/me/reminders)
 * and sends a kind plus data; the wording lives here because it has to exist in
 * three languages. Nothing renders when there is nothing to say — an empty
 * reminder box trains people to ignore the real ones.
 */

type Reminder = { kind: string; priority: number; data: Record<string, unknown> };

async function fetchReminders(): Promise<{ reminders: Reminder[] }> {
  const r = await fetch("/api/users/me/reminders", { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load reminders");
  return r.json();
}

type Rendered = {
  icon: typeof Flame;
  tone: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

export function Reminders() {
  const { t } = useLang();
  const { isAuthenticated } = useAuth();
  const { data } = useQuery({ queryKey: ["user-reminders"], queryFn: fetchReminders, enabled: isAuthenticated });

  const reminders = data?.reminders ?? [];
  if (reminders.length === 0) return null;

  /** Local title of a module, whatever language the reader is in. */
  const moduleTitle = (d: Record<string, unknown>) => {
    const title = typeof d.title === "string" ? d.title : "";
    const titleUz = typeof d.titleUz === "string" ? d.titleUz : title;
    const titleRu = typeof d.titleRu === "string" ? d.titleRu : title;
    return t(title, titleUz, titleRu);
  };

  const render = (r: Reminder): Rendered | null => {
    const d = r.data;
    switch (r.kind) {
      case "streak_at_risk":
        return {
          icon: Flame, tone: "amber",
          title: t(`Your ${d.currentStreak}-day streak ends tonight`,
                   `${d.currentStreak} kunlik seriyangiz bugun tugaydi`,
                   `Ваша серия из ${d.currentStreak} дн. закончится сегодня`),
          body: t("One solved challenge or one finished lesson keeps it alive.",
                  "Bitta yechilgan topshiriq yoki bitta tugatilgan dars uni saqlab qoladi.",
                  "Одно решённое задание или один урок сохранят её."),
          cta: t("Keep the streak", "Seriyani saqlash", "Сохранить серию"),
          href: "/ctf",
        };
      case "streak_lost":
        return {
          icon: RotateCcw, tone: "muted",
          title: t(`You once ran ${d.longestStreak} days in a row`,
                   `Bir vaqtlar ${d.longestStreak} kun ketma-ket qilgansiz`,
                   `Когда-то вы держали ${d.longestStreak} дн. подряд`),
          body: t("Start a new one today — the counter only needs one day to begin.",
                  "Bugun yangisini boshlang — hisoblagichga bitta kun kifoya.",
                  "Начните новую сегодня — счётчику нужен всего один день."),
          cta: t("Start again", "Qaytadan boshlash", "Начать заново"),
          href: "/ctf",
        };
      case "module_unfinished":
        return {
          icon: BookOpen, tone: "primary",
          title: t(`${d.remaining} lessons left in ${moduleTitle(d)}`,
                   `${moduleTitle(d)} modulida ${d.remaining} ta dars qoldi`,
                   `Осталось ${d.remaining} уроков в модуле «${moduleTitle(d)}»`),
          body: t("Finish them all to unlock the module exam.",
                  "Modul imtihonini ochish uchun hammasini tugating.",
                  "Пройдите их все, чтобы открыть экзамен модуля."),
          cta: t("Continue", "Davom etish", "Продолжить"),
          href: `/modules/${d.moduleId}`,
        };
      case "exam_ready":
        return {
          icon: GraduationCap, tone: "primary",
          title: t(`You finished every lesson in ${moduleTitle(d)}`,
                   `${moduleTitle(d)} modulidagi barcha darslarni tugatdingiz`,
                   `Вы прошли все уроки модуля «${moduleTitle(d)}»`),
          body: t("The exam is unlocked. Passing it issues your certificate.",
                  "Imtihon ochildi. Uni topshirsangiz sertifikat beriladi.",
                  "Экзамен открыт. Сдав его, вы получите сертификат."),
          cta: t("Take the exam", "Imtihon topshirish", "Сдать экзамен"),
          href: `/modules/${d.moduleId}/exam`,
        };
      case "certificate_ready":
        return {
          icon: Award, tone: "emerald",
          title: t(`Your ${moduleTitle(d)} certificate is waiting`,
                   `${moduleTitle(d)} sertifikatingiz kutmoqda`,
                   `Ваш сертификат «${moduleTitle(d)}» ждёт`),
          body: t("You passed the exam but never claimed it. It takes one click.",
                  "Imtihondan o'tdingiz, lekin uni olmadingiz. Bir bosish kifoya.",
                  "Вы сдали экзамен, но не забрали сертификат. Один клик."),
          cta: t("Claim it", "Olish", "Забрать"),
          href: `/modules/${d.moduleId}`,
        };
      case "competition_live": {
        const sName = typeof d.sponsorName === "string" ? d.sponsorName : "";
        return {
          icon: Radio, tone: "emerald",
          title: t(`${d.name} is running now`, `${d.name} hozir davom etmoqda`, `«${d.name}» идёт прямо сейчас`),
          body: sName
            ? t(`Sponsored by ${sName}. You have not joined yet.`,
                `Homiy: ${sName}. Siz hali qo'shilmadingiz.`,
                `Спонсор: ${sName}. Вы ещё не участвуете.`)
            : t("You have not joined yet.", "Siz hali qo'shilmadiumgiz.", "Вы ещё не участвуете."),
          cta: t("Join now", "Hozir qo'shilish", "Присоединиться"),
          href: `/competitions/${d.competitionId}`,
        };
      }
      case "competition_soon": {
        const days = Math.max(0, Math.ceil((new Date(String(d.startTime)).getTime() - Date.now()) / 86_400_000));
        return {
          icon: Trophy, tone: "amber",
          title: t(`${d.name} starts in ${days} days`, `${d.name} ${days} kundan keyin boshlanadi`, `«${d.name}» начнётся через ${days} дн.`),
          body: t("Register now so you are on the scoreboard from the first minute.",
                  "Hozir ro'yxatdan o'ting — birinchi daqiqadanoq reytingda bo'lasiz.",
                  "Зарегистрируйтесь сейчас, чтобы быть в таблице с первой минуты."),
          cta: t("Register", "Ro'yxatdan o'tish", "Зарегистрироваться"),
          href: `/competitions/${d.competitionId}`,
        };
      }
      default:
        // An unknown kind means the server shipped ahead of the client; show
        // nothing rather than an empty card.
        return null;
    }
  };

  const TONES: Record<string, string> = {
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-500",
    primary: "border-primary/30 bg-primary/5 text-primary",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
    muted: "border-border bg-muted/20 text-muted-foreground",
  };

  const cards = reminders.map(render).filter(Boolean) as Rendered[];
  if (cards.length === 0) return null;

  return (
    <div className="space-y-3 mb-10" data-testid="reminders">
      {cards.map((c, i) => (
        <Link key={i} href={c.href}>
          <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 group cursor-pointer transition-colors ${TONES[c.tone] ?? TONES.muted}`}
               data-testid={`reminder-${i}`}>
            <c.icon className="w-6 h-6 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground leading-snug">{c.title}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{c.body}</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0 group-hover:gap-2.5 transition-all">
              {c.cta} <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
