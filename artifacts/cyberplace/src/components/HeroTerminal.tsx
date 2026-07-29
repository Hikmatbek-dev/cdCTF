import { useEffect, useRef, useState } from "react";
import { Award, Flag } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * The hero's visual: a terminal window that types a real nmap scan, finds a
 * service, and lands on a flag — with a certificate badge and a flag chip
 * beside it.
 *
 * It is built rather than illustrated on purpose: the product of this platform
 * is a terminal, so showing a live one is more honest — and more convincing —
 * than stock art. It weighs nothing and needs no image request.
 *
 * The window keeps its own dark palette while the rest of the page is light.
 * That is the point of it now: a dark terminal *on* a bright page reads as "one
 * of the things you will do here", where a dark terminal on a dark page read as
 * "this entire site is for people who live in one". It is a specimen, framed.
 */

/** The scan, as it will type out. `d` is the delay before the line appears. */
const LINES: { text: string; cls?: string; d: number }[] = [
  { text: "$ nmap -sV -A 10.10.12.85", cls: "text-indigo-300 font-medium", d: 0 },
  { text: "Starting Nmap 7.94 ( https://nmap.org )", cls: "text-slate-500", d: 700 },
  { text: "Nmap scan report for academy-target-01", cls: "text-slate-500", d: 1100 },
  { text: "Host is up (0.0024s latency).", cls: "text-slate-500", d: 1400 },
  { text: "", d: 1600 },
  { text: "PORT     STATE  SERVICE  VERSION", cls: "text-slate-400", d: 1750 },
  { text: "22/tcp   open   ssh      OpenSSH 8.2p1", cls: "text-slate-300", d: 2000 },
  { text: "80/tcp   open   http     Apache 2.4.41", cls: "text-slate-300", d: 2250 },
  { text: "3306/tcp open   mysql    MySQL 8.0.32", cls: "text-slate-300", d: 2500 },
  { text: "", d: 2700 },
  { text: "[+] Weak credentials on 3306 — access granted", cls: "text-amber-300", d: 2900 },
  { text: "[+] flag{uz_c7f_m4st3r}", cls: "text-emerald-300 font-semibold", d: 3400 },
];

export function HeroTerminal({ challengeCount }: { challengeCount?: number } = {}) {
  const { t } = useLang();
  const [shown, setShown] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setShown(LINES.length); return; }

    const run = () => {
      setShown(0);
      timers.current.forEach(clearTimeout);
      timers.current = LINES.map((l, i) => setTimeout(() => setShown(i + 1), l.d));
      // Replay so the hero keeps a pulse without being distracting.
      timers.current.push(setTimeout(run, 11000));
    };
    run();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative">
      <div className="relative rounded-2xl overflow-hidden bg-[#111726] border border-[#243049] shadow-[0_24px_60px_-30px_rgba(15,23,42,.55)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#243049] bg-[#161d30]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
          <span className="ml-2 font-mono text-xs text-slate-400">root@cdctf: ~</span>
        </div>

        {/* Scan */}
        <div className="p-4 sm:p-5 font-mono text-[12px] sm:text-[13px] leading-6 min-h-[268px]">
          {LINES.slice(0, shown).map((l, i) => (
            <div key={i} className={`${l.cls ?? ""} whitespace-pre animate-in fade-in slide-in-from-left-1 duration-300`}>
              {l.text || " "}
            </div>
          ))}
          {shown < LINES.length && (
            <span className="inline-block w-2 h-4 align-middle bg-indigo-300 cd-caret" />
          )}
        </div>
      </div>

      {/* Two paper cards overlapping the window — the reward, next to the work. */}
      <div className="absolute -right-3 sm:-right-6 top-14 hidden sm:flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-lg animate-float">
        <span className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Award className="w-[18px] h-[18px] text-primary-foreground" aria-hidden="true" />
        </span>
        <span className="leading-tight">
          <span className="block text-xs font-semibold text-foreground">{t("Certificate", "Sertifikat", "Сертификат")}</span>
          <span className="block text-xs text-muted-foreground">{t("per module", "har modulga", "за модуль")}</span>
        </span>
      </div>

      <div
        className="absolute -left-3 sm:-left-6 top-full mt-3 hidden sm:flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-lg animate-float"
        style={{ animationDelay: "1.6s" }}
      >
        <span className="w-9 h-9 rounded-lg bg-[hsl(var(--neon)/.12)] border border-[hsl(var(--neon)/.3)] flex items-center justify-center text-[hsl(var(--neon))] shrink-0">
          <Flag className="w-[18px] h-[18px]" aria-hidden="true" />
        </span>
        <span className="leading-tight">
          <span className="block text-xs font-semibold font-mono text-foreground">flag&#123;...&#125;</span>
          {/* The live count. This badge said "40+" while the stat row beside it
              read the real number — two different answers on one screen. */}
          <span className="block text-xs text-muted-foreground">
            {challengeCount && challengeCount > 0
              ? t(`${challengeCount} challenges`, `${challengeCount} topshiriq`, `${challengeCount} заданий`)
              : t("Practice challenges", "Mashq topshiriqlari", "Практические задания")}
          </span>
        </span>
      </div>
    </div>
  );
}
