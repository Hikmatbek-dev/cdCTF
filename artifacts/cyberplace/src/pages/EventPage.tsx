import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowRight, Award, CalendarClock, Check, Flag, Link2, Linkedin,
  Radio, Send, ShieldCheck, Trophy, Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { categoryStyle } from "@/lib/category-style";
import { absoluteUrl, copyText, linkedInShareUrl, telegramShareUrl } from "@/lib/share";
import { useGetCompetition, getGetCompetitionQueryKey } from "@workspace/api-client-react";

/**
 * The page a sponsor puts on their own channel.
 *
 * /competitions/:id is the participant's console — team panel, scoreboard,
 * challenge list, all of it assuming you already know what cdCTF is. This is
 * the opposite audience: someone who followed a company's Telegram post and has
 * never heard of the platform. So it leads with the sponsor's brand and the
 * prize, states the date in words, and ends by explaining what cdCTF is at all.
 *
 * It is deliberately a short URL (/e/:id) because it gets pasted into posts,
 * printed on slides and read aloud.
 */

type Competition = {
  id: number; name: string; description: string | null;
  startTime: string; endTime: string; status: string;
  participantCount: number; ctfCount: number; isJoined: boolean;
  challenges: Array<{ id: number; name: string; category: string; difficulty: string; points: number }>;
  sponsorName: string | null; sponsorLogoUrl: string | null; sponsorUrl: string | null;
  prize: string | null;
};

/** Live countdown to a moment, or null once it has passed. */
function useCountdown(target: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
  };
}

export default function EventPage() {
  const [routeMatches, params] = useRoute("/e/:id");
  const id = Number(params?.id ?? 0);
  const { t, lang } = useLang();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useGetCompetition(id, {
    query: { queryKey: getGetCompetitionQueryKey(id), enabled: Number.isInteger(id) && id > 0, retry: false },
  });
  const c = data as Competition | undefined;

  const isUpcoming = c?.status === "upcoming";
  const countdown = useCountdown(isUpcoming ? c?.startTime : c?.status === "active" ? c?.endTime : undefined);

  const url = absoluteUrl(`/e/${id}`);
  const caption = c
    ? t(`${c.name} — a free CTF competition on cdCTF. ${c.prize ? `Prize: ${c.prize}. ` : ""}Register now.`,
        `${c.name} — cdCTF'dagi bepul CTF musobaqasi. ${c.prize ? `Sovrin: ${c.prize}. ` : ""}Hoziroq ro'yxatdan o'ting.`,
        `${c.name} — бесплатное CTF-соревнование на cdCTF. ${c.prize ? `Приз: ${c.prize}. ` : ""}Регистрируйтесь.`)
    : "";

  const doCopy = async () => {
    const ok = await copyText(url, t("Copy this link", "Bu havolani nusxalang", "Скопируйте ссылку"));
    if (ok) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
  };

  if (!routeMatches || isLoading) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow"><Skeleton className="h-96 w-full rounded-2xl bg-muted" /></div>
      </div>
    );
  }

  if (isError || !c) {
    return (
      <div className="min-h-screen bg-background page">
        <div className="shell-narrow text-center py-20">
          <h1 className="text-2xl font-bold mb-3">{t("Event not found", "Tadbir topilmadi", "Событие не найдено")}</h1>
          <Link href="/competitions">
            <button className="cyber-button-outline h-11 px-6">{t("All events", "Barcha tadbirlar", "Все события")}</button>
          </Link>
        </div>
      </div>
    );
  }

  const locale = lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB";
  const dateLine = `${new Date(c.startTime).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} — ${new Date(c.endTime).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;

  const statusChip = c.status === "active"
    ? { icon: Radio, label: t("Live now", "Hozir jonli", "Идёт сейчас"), cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" }
    : c.status === "upcoming"
    ? { icon: CalendarClock, label: t("Registration open", "Ro'yxat ochiq", "Регистрация открыта"), cls: "border-primary/40 bg-primary/10 text-primary" }
    : { icon: Trophy, label: t("Finished", "Yakunlandi", "Завершено"), cls: "border-border bg-muted/30 text-muted-foreground" };

  const categories = [...new Set(c.challenges.map(ch => ch.category))];

  return (
    <div className="min-h-screen bg-background page">
      <div className="shell-narrow py-8">

        {/* Sponsor first. This is their poster — if it opens with cdCTF's logo
            they will not share it. */}
        {c.sponsorName && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-6 flex items-center gap-5" data-testid="event-sponsor">
            {c.sponsorLogoUrl && (
              <img src={c.sponsorLogoUrl} alt={c.sponsorName} className="h-14 w-auto max-w-[160px] object-contain shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {t("Presented by", "Homiy", "Организатор")}
              </div>
              {c.sponsorUrl ? (
                <a href={c.sponsorUrl} target="_blank" rel="noopener noreferrer nofollow"
                   className="text-lg font-bold hover:text-primary transition-colors">{c.sponsorName}</a>
              ) : (
                <div className="text-lg font-bold">{c.sponsorName}</div>
              )}
            </div>
          </div>
        )}

        <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium mb-5 ${statusChip.cls}`} data-testid="event-status">
          <statusChip.icon className="w-3.5 h-3.5" /> {statusChip.label}
        </div>

        <h1 className="mb-4" data-testid="event-name">
          {c.name}
        </h1>

        {c.description && (
          <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">{c.description}</p>
        )}

        <div className="text-sm text-muted-foreground mb-8 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 shrink-0" /> {dateLine}
        </div>

        {/* Countdown — the one element that makes a poster feel urgent. */}
        {countdown && (
          <div className="grid grid-cols-4 gap-3 mb-8" data-testid="event-countdown">
            {[
              { v: countdown.days, l: t("days", "kun", "дн.") },
              { v: countdown.hours, l: t("hours", "soat", "час.") },
              { v: countdown.minutes, l: t("min", "daq", "мин") },
              { v: countdown.seconds, l: t("sec", "son", "сек") },
            ].map((u, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card py-4 text-center">
                <div className="text-3xl font-black tabular-nums leading-none">{String(u.v).padStart(2, "0")}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1.5">{u.l}</div>
              </div>
            ))}
            <div className="col-span-4 text-center text-xs text-muted-foreground -mt-1">
              {c.status === "active"
                ? t("until it closes", "yakunlanishiga", "до завершения")
                : t("until it starts", "boshlanishiga", "до старта")}
            </div>
          </div>
        )}

        {/* Prize — the reason a stranger clicks. */}
        {c.prize && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-start gap-4" data-testid="event-prize">
            <Award className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wide text-amber-500 font-semibold mb-1">{t("Prize", "Sovrin", "Приз")}</div>
              <div className="font-semibold leading-snug whitespace-pre-line">{c.prize}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Users, v: c.participantCount, l: t("registered", "ro'yxatdan o'tgan", "зарегистрировано") },
            { icon: Flag, v: c.ctfCount, l: t("challenges", "topshiriq", "заданий") },
            { icon: Trophy, v: categories.length, l: t("categories", "kategoriya", "категорий") },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/60 p-5 text-center" data-testid={`event-stat-${i}`}>
              <s.icon className="w-4 h-4 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold tabular-nums leading-none">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1.5">{s.l}</div>
            </div>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(cat => {
              const s = categoryStyle(cat);
              return (
                <span key={cat} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${s.text} ${s.tint} ${s.border}`}>{cat}</span>
              );
            })}
          </div>
        )}

        {/* The action. Logged out, the honest first step is an account. */}
        <div className="flex flex-wrap gap-3 mb-10">
          {c.status === "ended" ? (
            <Link href={`/competitions/${c.id}`}>
              <button className="cyber-button h-13 px-8 py-3.5" data-testid="event-results">
                {t("See the results", "Natijalarni ko'rish", "Смотреть результаты")} <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          ) : isAuthenticated ? (
            <Link href={`/competitions/${c.id}`}>
              <button className="cyber-button h-13 px-8 py-3.5" data-testid="event-join">
                {c.isJoined
                  ? t("Open the event", "Tadbirni ochish", "Открыть событие")
                  : t("Register for this event", "Bu tadbirga ro'yxatdan o'tish", "Зарегистрироваться")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <button className="cyber-button h-13 px-8 py-3.5" data-testid="event-register">
                  {t("Create a free account", "Bepul hisob ochish", "Создать бесплатный аккаунт")} <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button className="cyber-button-outline h-13 px-6 py-3.5">{t("I already have one", "Hisobim bor", "У меня есть аккаунт")}</button>
              </Link>
            </>
          )}
        </div>

        {/* Share row — the whole point of this page existing separately. */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 mb-10">
          <h2 className="font-semibold mb-1.5">{t("Spread the word", "Xabarni tarqating", "Расскажите другим")}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {t("This short link is safe to post anywhere — it opens for people who have no account yet.",
               "Bu qisqa havolani istalgan joyga joylashtirish mumkin — hisobi yo'q odamlarga ham ochiladi.",
               "Эту короткую ссылку можно публиковать где угодно — она открывается и без аккаунта.")}
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={telegramShareUrl(url, caption)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#229ED9] text-white font-medium text-sm hover:brightness-110 transition"
               data-testid="event-share-telegram">
              <Send className="w-4 h-4" /> {t("Telegram", "Telegram", "Telegram")}
            </a>
            <a href={linkedInShareUrl(url)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0A66C2] text-white font-medium text-sm hover:brightness-110 transition"
               data-testid="event-share-linkedin">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
            <button onClick={doCopy}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-background font-medium text-sm hover:border-primary/40 transition"
                    data-testid="event-share-copy">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
              {copied ? t("Copied", "Nusxalandi", "Скопировано") : url.replace(/^https?:\/\//, "")}
            </button>
          </div>
        </div>

        {/* For the stranger who arrived from the sponsor's channel. */}
        <div className="rounded-2xl border border-border bg-muted/20 p-6" data-testid="event-about">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">{t("What is cdCTF?", "cdCTF nima?", "Что такое cdCTF?")}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {t("A free cybersecurity academy and CTF platform built for Uzbekistan, in Uzbek, Russian and English. Learn from the lessons, prove it on the challenges, earn a certificate anyone can verify.",
               "O'zbekiston uchun qurilgan bepul kiberxavfsizlik akademiyasi va CTF platformasi — o'zbek, rus va ingliz tillarida. Darslardan o'rganing, topshiriqlarda isbotlang, istalgan kishi tekshira oladigan sertifikat oling.",
               "Бесплатная академия кибербезопасности и CTF-платформа для Узбекистана на трёх языках. Учитесь по урокам, доказывайте на заданиях, получайте проверяемый сертификат.")}
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/start"><span className="text-primary hover:underline">{t("Start learning", "O'rganishni boshlash", "Начать обучение")}</span></Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/impact"><span className="text-primary hover:underline">{t("See the numbers", "Raqamlarni ko'rish", "Смотреть цифры")}</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
