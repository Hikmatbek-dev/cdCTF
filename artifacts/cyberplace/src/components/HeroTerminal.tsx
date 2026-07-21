import { useEffect, useRef, useState } from "react";
import { Award, Flag } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * The hero's visual: a glass terminal that types a real nmap scan, finds a
 * service, and lands on a flag — with a certificate badge and a flag chip
 * floating beside it.
 *
 * This is the one thing the landing page was missing. It is built rather than
 * illustrated on purpose: the "product" of this platform is a terminal, so
 * showing a live one is more honest — and more convincing — than stock art.
 * It also weighs nothing and re-themes itself.
 */

/** The scan, as it will type out. `d` is the delay before the line appears. */
const LINES: { text: string; cls?: string; d: number }[] = [
  { text: "$ nmap -sV -A 10.10.12.85", cls: "text-primary font-medium", d: 0 },
  { text: "Starting Nmap 7.94 ( https://nmap.org )", cls: "text-muted-foreground", d: 700 },
  { text: "Nmap scan report for academy-target-01", cls: "text-muted-foreground", d: 1100 },
  { text: "Host is up (0.0024s latency).", cls: "text-muted-foreground", d: 1400 },
  { text: "", d: 1600 },
  { text: "PORT    STATE  SERVICE  VERSION", cls: "text-foreground/70", d: 1750 },
  { text: "22/tcp  open   ssh      OpenSSH 8.2p1", cls: "text-foreground/90", d: 2000 },
  { text: "80/tcp  open   http     Apache 2.4.41", cls: "text-foreground/90", d: 2250 },
  { text: "3306/tcp open  mysql    MySQL 8.0.32", cls: "text-foreground/90", d: 2500 },
  { text: "", d: 2700 },
  { text: "[+] Weak credentials on 3306 — access granted", cls: "text-accent", d: 2900 },
  { text: "[+] flag{uz_c7f_m4st3r}", cls: "text-primary font-semibold", d: 3400 },
];

export function HeroTerminal() {
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
      {/* Glow pooled under the window. */}
      <div
        className="absolute -inset-8 rounded-[3rem] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / 0.28), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative glass-card !p-0 overflow-hidden shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/[0.04]">
          <span className="w-3 h-3 rounded-full bg-destructive/70" />
          <span className="w-3 h-3 rounded-full bg-amber-400/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-400/70" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">root@cdctf: ~</span>
        </div>

        {/* Scan */}
        <div className="p-4 sm:p-5 font-mono text-[12px] sm:text-[13px] leading-6 min-h-[268px]">
          {LINES.slice(0, shown).map((l, i) => (
            <div key={i} className={`${l.cls ?? ""} whitespace-pre animate-in fade-in slide-in-from-left-1 duration-300`}>
              {l.text || " "}
            </div>
          ))}
          {shown < LINES.length && (
            <span className="inline-block w-2 h-4 align-middle bg-primary cd-caret" />
          )}
        </div>
      </div>

      {/* Floating badges — depth, and a hint at the reward. */}
      <div className="absolute -right-3 sm:-right-6 top-16 glass-card !p-3 flex items-center gap-2.5 animate-float shadow-xl">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
          <Award className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold">{t("Certificate", "Sertifikat", "Сертификат")}</div>
          <div className="text-[10px] text-muted-foreground">{t("per module", "har modulga", "за модуль")}</div>
        </div>
      </div>

      <div
        className="absolute -left-3 sm:-left-6 bottom-10 glass-card !p-3 flex items-center gap-2.5 animate-float shadow-xl"
        style={{ animationDelay: "1.6s" }}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
          <Flag className="w-4.5 h-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold font-mono">flag&#123;...&#125;</div>
          <div className="text-[10px] text-muted-foreground">{t("40+ challenges", "40+ topshiriq", "40+ заданий")}</div>
        </div>
      </div>
    </div>
  );
}
