import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowRight, Award, CalendarClock, Check, Flag, Link2, Linkedin,
  Radio, Send, ShieldCheck, Trophy, Users, Sparkles, Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { categoryStyle } from "@/lib/category-style";
import { absoluteUrl, copyText, linkedInShareUrl, telegramShareUrl } from "@/lib/share";
import { useGetCompetition, getGetCompetitionQueryKey } from "@workspace/api-client-react";
import { FadeIn } from "@/components/PageTransition";

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
      <div className="min-h-screen bg-background page flex items-center justify-center">
        <div className="shell-narrow w-full"><Skeleton className="h-[480px] w-full rounded-3xl bg-muted" /></div>
      </div>
    );
  }

  if (isError || !c) {
    return (
      <div className="min-h-screen bg-background page flex items-center justify-center">
        <div className="shell-narrow text-center py-20">
          <h1 className="text-3xl font-bold mb-4 gradient-text">{t("Event Not Found", "Tadbir Topilmadi", "Событие Не Найдено")}</h1>
          <Link href="/competitions">
            <button className="cyber-button h-11 px-6 font-bold">{t("Explore All Events", "Barcha Tadbirlar", "Все События")}</button>
          </Link>
        </div>
      </div>
    );
  }

  const locale = lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB";
  const dateLine = `${new Date(c.startTime).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} — ${new Date(c.endTime).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;

  const statusChip = c.status === "active"
    ? { icon: Radio, label: t("Live Now", "Hozir Jonli", "Идёт сейчас"), cls: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/20" }
    : c.status === "upcoming"
    ? { icon: CalendarClock, label: t("Registration Open", "Ro'yxat Ochiq", "Регистрация открыта"), cls: "border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/20" }
    : { icon: Trophy, label: t("Completed", "Yakunlandi", "Завершено"), cls: "border-border bg-muted/40 text-muted-foreground" };

  const categories = [...new Set(c.challenges.map(ch => ch.category))];

  return (
    <div className="min-h-screen bg-background text-foreground page relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-40" />

      <div className="shell-narrow relative z-10 py-10">
        <FadeIn>
          {/* Sponsor card header */}
          {c.sponsorName && (
            <div className="mb-8 rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-md p-6 flex items-center gap-6 shadow-lg shadow-primary/5" data-testid="event-sponsor">
              {c.sponsorLogoUrl && (
                <img src={c.sponsorLogoUrl} alt={c.sponsorName} className="h-14 w-auto max-w-[160px] object-contain shrink-0 filter drop-shadow" />
              )}
              <div className="min-w-0">
                <div className="eyebrow mb-1 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {t("Official Organizer & Sponsor", "Rasmiy Homiy", "Организатор")}
                </div>
                {c.sponsorUrl ? (
                  <a href={c.sponsorUrl} target="_blank" rel="noopener noreferrer nofollow"
                     className="text-xl font-black hover:text-primary transition-colors">{c.sponsorName}</a>
                ) : (
                  <div className="text-xl font-black">{c.sponsorName}</div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider ${statusChip.cls}`} data-testid="event-status">
              <statusChip.icon className="w-4 h-4 animate-pulse" /> {statusChip.label}
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mb-4 leading-tight" data-testid="event-name">
            <span className="gradient-text">{c.name}</span>
          </h1>

          {c.description && (
            <p className="text-base text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">{c.description}</p>
          )}

          <div className="text-sm font-mono font-medium text-muted-foreground mb-8 flex items-center gap-2 bg-card/50 border border-border/50 rounded-xl px-4 py-2.5 w-fit">
            <CalendarClock className="w-4 h-4 text-primary shrink-0" /> {dateLine}
          </div>

          {/* Live countdown */}
          {countdown && (
            <div className="glass-card p-6 mb-8 border-primary/30" data-testid="event-countdown">
              <div className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {c.status === "active"
                  ? t("Event Closes In", "Tadbir Tugashiga Qoldi", "До завершения осталось")
                  : t("Event Starts In", "Tadbir Boshlanishiga Qoldi", "До старта осталось")}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { v: countdown.days, l: t("Days", "Kun", "Дн.") },
                  { v: countdown.hours, l: t("Hours", "Soat", "Час.") },
                  { v: countdown.minutes, l: t("Mins", "Daq", "Мин.") },
                  { v: countdown.seconds, l: t("Secs", "Son", "Сек.") },
                ].map((u, i) => (
                  <div key={i} className="rounded-xl border border-primary/20 bg-background/80 py-4 text-center">
                    <div className="text-3xl sm:text-4xl font-black font-display text-foreground tabular-nums leading-none">{String(u.v).padStart(2, "0")}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-2">{u.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prize block */}
          {c.prize && (
            <div className="mb-8 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-card p-6 flex items-start gap-4 shadow-lg shadow-amber-500/5" data-testid="event-prize">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 shrink-0">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold mb-1">{t("Grand Prize & Rewards", "Musobaqa Sovrini", "Приз и Награды")}</div>
                <div className="font-bold text-lg leading-snug whitespace-pre-line">{c.prize}</div>
              </div>
            </div>
          )}

          {/* Event stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: Users, v: c.participantCount, l: t("Registered", "Ro'yxatdan O'tgan", "Участников") },
              { icon: Flag, v: c.ctfCount, l: t("Challenges", "Topshiriqlar", "Заданий") },
              { icon: Trophy, v: categories.length, l: t("Categories", "Kategoriyalar", "Категорий") },
            ].map((s, i) => (
              <div key={i} className="glass-card p-5 text-center" data-testid={`event-stat-${i}`}>
                <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-3xl font-black font-display tabular-nums leading-none">{s.v}</div>
                <div className="text-xs font-mono text-muted-foreground mt-2">{s.l}</div>
              </div>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map(cat => {
                const s = categoryStyle(cat);
                return (
                  <span key={cat} className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg border ${s.text} ${s.tint} ${s.border}`}>{cat}</span>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 mb-10">
            {c.status === "ended" ? (
              <Link href={`/competitions/${c.id}`}>
                <button className="cyber-button h-13 px-8 text-sm font-bold gap-2" data-testid="event-results">
                  {t("See Scoreboard & Solves", "Natijalarni Ko'rish", "Смотреть результаты")} <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            ) : isAuthenticated ? (
              <Link href={`/competitions/${c.id}`}>
                <button className="cyber-button h-13 px-8 text-sm font-bold gap-2" data-testid="event-join">
                  {c.isJoined
                    ? t("Enter Arena Console", "Musobaqani Ochish", "Открыть событие")
                    : t("Register for Tournament", "Ro'yxatdan O'tish", "Зарегистрироваться")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <button className="cyber-button h-13 px-8 text-sm font-bold gap-2" data-testid="event-register">
                    {t("Create Account & Join", "Bepul Hisob Ochish", "Создать бесплатный аккаунт")} <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="cyber-button-outline h-13 px-6 text-sm font-bold">{t("Existing User Login", "Hisobga Kirish", "Войти в аккаунт")}</button>
                </Link>
              </>
            )}
          </div>

          {/* Share widget */}
          <div className="glass-card p-6 mb-10 border-border">
            <h2 className="font-bold text-base mb-1">{t("Share Event Link", "Havolani Tarqating", "Поделиться Событием")}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {t("Direct share link for social networks and security team chats.",
                 "Ijtimoiy tarmoqlar va jamoalar uchun tayyor havola.",
                 "Прямая ссылка для социальных сетей и командных чатов.")}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={telegramShareUrl(url, caption)} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#229ED9] text-white font-bold text-xs hover:brightness-110 transition shadow-sm"
                 data-testid="event-share-telegram">
                <Send className="w-4 h-4" /> {t("Telegram", "Telegram", "Telegram")}
              </a>
              <a href={linkedInShareUrl(url)} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0A66C2] text-white font-bold text-xs hover:brightness-110 transition shadow-sm"
                 data-testid="event-share-linkedin">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
              <button onClick={doCopy}
                      className="cyber-button-outline h-11 px-5 text-xs font-mono font-semibold gap-2"
                      data-testid="event-share-copy">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                {copied ? t("Copied", "Nusxalandi", "Скопировано") : url.replace(/^https?:\/\//, "")}
              </button>
            </div>
          </div>

          {/* About cdCTF */}
          <div className="glass-card p-6 border-border" data-testid="event-about">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">{t("About cdCTF Cyber Range", "cdCTF Nima?", "О платформе cdCTF")}</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {t("National cybersecurity academy and battle ground for Uzbekistan, supporting Uzbek, Russian and English. Solve interactive CTF challenges, gain verified credentials, and accelerate your tech career.",
                 "O'zbekiston uchun bepul kiberxavfsizlik akademiyasi va CTF platformasi. Topshiriqlarni yeching, sertifikat oling va karyerangizni oshiring.",
                 "Национальная академия кибербезопасности Узбекистана. Решайте задания, получайте проверяемые сертификаты и развивайтесь.")}
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-mono font-semibold">
              <Link href="/start"><span className="text-primary hover:underline flex items-center gap-1">{t("Start Learning", "O'rganishni Boshlash", "Начать Обучение")} <ArrowRight className="w-3 h-3" /></span></Link>
              <Link href="/impact"><span className="text-primary hover:underline flex items-center gap-1">{t("Platform Stats", "Statistika", "Статистика")} <ArrowRight className="w-3 h-3" /></span></Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

