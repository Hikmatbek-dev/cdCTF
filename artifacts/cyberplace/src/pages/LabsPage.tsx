import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Server, Play, Square, Clock, ExternalLink, Info, Shield, Sparkles, Terminal, ChevronDown, Copy, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeArray } from "@/lib/api-shapes";
import { errorToast } from "@/lib/error-toast";
import { LabBrief } from "@/components/labs/LabBrief";
import { FadeIn } from "@/components/PageTransition";

type Lab = {
  id: number; slug: string;
  name: string; nameUz: string | null; nameRu: string | null;
  description: string; descriptionUz: string | null; descriptionRu: string | null;
  difficulty: string; ttlMinutes: number; ctfId: number | null;
  kind: "container" | "browser"; browserScenario: string | null; startable: boolean;
};
type Running = {
  id: number; labId: number; host: string; port: number; startedAt: string; expiresAt: string;
  targetPath: string | null;
};
type LabsResponse = { labs: Lab[]; running: Running | null; available: boolean };

function useCountdown(expiresAt: string | undefined) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const m = Math.floor(left / 60), s = left % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LabsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [openLab, setOpenLab] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const targetWindow = useRef<Window | null>(null);

  const closeTarget = () => {
    try { targetWindow.current?.close(); } catch { /* already gone */ }
    targetWindow.current = null;
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const r = await fetch("/api/labs");
      if (!r.ok) throw new Error("labs");
      return r.json() as Promise<LabsResponse>;
    },
    refetchInterval: 30_000,
  });

  const labs = normalizeArray<Lab>(data?.labs, ["labs", "data", "items"]);
  const running = data?.running ?? null;
  const available = data?.available ?? false;
  const countdown = useCountdown(running?.expiresAt);
  const runningLab = labs.find(l => l.id === running?.labId) ?? null;

  const act = async (url: string): Promise<Record<string, unknown> | undefined> => {
    if (busy) return undefined;
    setBusy(true);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await r.json().catch(() => ({})) as Record<string, unknown>;
      if (!r.ok) throw new Error(typeof d?.error === "string" ? d.error : t("Something went wrong", "Xatolik yuz berdi", "Что-то пошло не так"));
      void qc.invalidateQueries({ queryKey: ["labs"] });
      return d;
    } catch (e) {
      toast(errorToast(t, e));
      return undefined;
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (running?.labId) setOpenLab(prev => prev ?? running.labId);
  }, [running?.labId]);

  useEffect(() => {
    if (!running?.expiresAt) return;
    const left = new Date(running.expiresAt).getTime() - Date.now();
    const finish = () => {
      closeTarget();
      toast({ title: t("Time is up — the lab has been released.",
                       "Vaqt tugadi — laboratoriya bo'shatildi.",
                       "Время вышло — лаборатория освобождена.") });
      void act(`/api/labs/instances/${running.id}/stop`);
    };
    if (left <= 0) { finish(); return; }
    const id = setTimeout(finish, left);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running?.id, running?.expiresAt]);

  const copyHost = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: t("Target host copied to clipboard!", "Nishon manzili nusxalandi!", "Адрес скопирован!") });
  };

  const label = (l: Lab) => t(l.name, l.nameUz || l.name, l.nameRu || l.name);
  const blurb = (l: Lab) => t(l.description, l.descriptionUz || l.description, l.descriptionRu || l.description);

  return (
    <div className="min-h-screen bg-background text-foreground page relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-40" />

      <div className="shell relative z-10 py-8">
        <FadeIn>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
                <Server className="w-7 h-7 text-primary animate-glow" />
              </div>
              <div>
                <div className="eyebrow mb-1 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  {t("cdCTF · Virtual Labs", "cdCTF · Virtual Laboratoriya", "cdCTF · Виртуальные Лаборатории")}
                </div>
                <h1 className="text-3xl font-display font-black tracking-tight">{t("Cyber Range & Isolated Labs", "Kiber Poligon va Muhitlar", "Кибер-полигон и Изолированные Лабы")}</h1>
              </div>
            </div>

            {/* Cluster Status Badge */}
            <div className="glass-card px-4 py-2.5 rounded-xl border-emerald-500/30 bg-emerald-500/5 inline-flex items-center gap-3 self-start md:self-auto">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div className="text-xs font-mono">
                <span className="text-muted-foreground">{t("Cluster:", "Klaster:", "Кластер:")} </span>
                <span className="text-emerald-400 font-bold uppercase">{t("ONLINE", "FAOL", "ОНЛАЙН")}</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Active Machine Alert Card */}
        {running && (
          <FadeIn>
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-card to-card p-6 mb-8 shadow-xl shadow-emerald-950/10" data-testid="running-machine">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">
                      {t("Live Target Active", "Nishon Ishga Tushdi", "Цель Запущена")}
                    </span>
                    {runningLab && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {label(runningLab)}
                      </span>
                    )}
                  </div>

                  {runningLab?.kind === "browser" ? (
                    <div className="text-sm text-muted-foreground">
                      {running.targetPath ? (
                        <a
                          href={running.targetPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cyber-button-outline text-xs h-9 px-4 inline-flex items-center gap-2"
                          data-testid="running-target-link"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          {t("Open Vulnerable Target", "Zararlangan Nishonni Ochish", "Открыть Уязвимую Цель")} 
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs">{t("The target is open in your active browser window.", "Nishon brauzer oynaingizda ochiq.", "Цель открыта в вашем окне.")}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-black/40 border border-emerald-500/30 px-4 py-2 rounded-xl font-mono text-sm">
                      <span className="text-emerald-400 font-bold">{running.host}:{running.port}</span>
                      <button
                        onClick={() => copyHost(`${running.host}:${running.port}`)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        title={t("Copy connection address", "Nusxalash", "Скопировать")}
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-2 pt-1">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    {t("Session Timeout:", "Sessiya vaqti:", "Таймаут:")}{" "}
                    <span className="text-foreground font-bold">{countdown ? `${countdown} ${t("left", "qoldi", "осталось")}` : "---"}</span>
                  </div>
                </div>

                <button 
                  onClick={() => { closeTarget(); void act(`/api/labs/instances/${running.id}/stop`); }} 
                  disabled={busy}
                  className="cyber-button-outline border-destructive/40 text-destructive hover:bg-destructive/10 h-11 px-6 gap-2 shrink-0 font-semibold" 
                  data-testid="stop-machine"
                >
                  <Square className="w-4 h-4 fill-current" /> {t("Terminate Lab", "Laboratoriyani To'xtatish", "Завершить Лабу")}
                </button>
              </div>
            </div>
          </FadeIn>
        )}

        {!available && (
          <div className="rounded-xl border border-border bg-muted/20 p-5 mb-8 flex items-start gap-3" data-testid="labs-unavailable">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              {t("Machine-based labs are being set up and will open shortly. Everything else — lessons and practice challenges — is already live.",
                 "Laboratoriyalar sozlanmoqda va tez orada ochiladi. Qolgani — darslar va mashq topshiriqlari — allaqachon ishlayapti.",
                 "Лаборатории настраиваются и скоро откроются. Всё остальное — уроки и практика — уже работает.")}
            </p>
          </div>
        )}

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-muted" />)}</div>
        ) : labs.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 px-8 text-center border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><Server className="w-8 h-8 text-primary" /></div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No labs scheduled right now", "Hozircha laboratoriyalar yo'q", "Пока нет лабораторий")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("Vulnerable machines land here. Meanwhile the challenge set is open and needs no setup.",
                 "Zaif mashinalar shu yerda paydo bo'ladi. Shu vaqtda topshiriqlar to'plami ochiq va hech qanday sozlash talab qilmaydi.",
                 "Уязвимые машины появятся здесь. А пока набор заданий открыт и не требует настройки.")}
            </p>
            <Link href="/ctf"><button className="cyber-button h-11 px-6">{t("Go to practice", "Mashqqa o'tish", "Перейти к практике")}</button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {labs.map((lab, idx) => {
              const isThisRunning = running?.labId === lab.id;
              const isOpen = openLab === lab.id;
              return (
                <FadeIn key={lab.id} delay={idx * 0.05}>
                  <div className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 shadow-sm" data-testid={`lab-${lab.id}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <button
                        type="button"
                        onClick={() => setOpenLab(v => (v === lab.id ? null : lab.id))}
                        aria-expanded={isOpen}
                        className="min-w-0 text-left flex-1"
                        data-testid={`lab-toggle-${lab.id}`}
                      >
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold tracking-tight hover:text-primary transition-colors">{label(lab)}</h3>
                          <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg uppercase border ${
                            lab.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                            lab.difficulty === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                            "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}>
                            {lab.difficulty}
                          </span>
                          {lab.kind === "browser" && (
                            <span className="text-xs rounded-lg border border-primary/40 bg-primary/10 text-primary px-2.5 py-0.5 font-semibold shrink-0">
                              {t("In-Browser Scenario", "Brauzer ichida", "В браузере")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{blurb(lab)}</p>
                        
                        <div className="text-xs text-muted-foreground mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono">
                          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> {lab.ttlMinutes} {t("min TTL", "daq TTL", "мин TTL")}</span>
                          {lab.kind === "browser" && (
                            <span className="text-emerald-400 font-semibold">{t("⚡ Zero-setup instant start", "⚡ Sozlashsiz bir zumda boshlash", "⚡ Мгновенный запуск без настройки")}</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-primary hover:underline font-sans font-semibold">
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                            {isOpen ? t("Hide Brief", "Yo'riqnomani yopish", "Свернуть") : t("Lab Brief & Setup", "Laboratoriya yo'riqnomasi", "Инструкция")}
                          </span>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="shrink-0">
                        {isThisRunning ? (
                          <button 
                            onClick={() => { closeTarget(); void act(`/api/labs/instances/${running.id}/stop`); }} 
                            disabled={busy}
                            className="cyber-button-outline border-destructive/40 text-destructive hover:bg-destructive/10 h-11 px-6 gap-2"
                          >
                            <Square className="w-4 h-4 fill-current" /> {t("Stop Lab", "To'xtatish", "Остановить")}
                          </button>
                        ) : lab.kind === "browser" && lab.browserScenario && isAuthenticated && !running ? (
                          <button
                            onClick={() => {
                              const w = window.open("", "_blank", "noopener=no");
                              targetWindow.current = w;
                              setOpenLab(lab.id);
                              void (async () => {
                                const started = await act(`/api/labs/${lab.id}/start`);
                                const path = typeof started?.targetPath === "string" ? started.targetPath : null;
                                if (path && w) w.location.href = path;
                                else w?.close();
                              })();
                            }}
                            className="cyber-button h-11 px-6 gap-2 inline-flex items-center font-bold"
                            data-testid={`start-lab-${lab.id}`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            {t("Launch Lab", "Ishga tushirish", "Запустить")}
                          </button>
                        ) : (
                          <button 
                            onClick={() => act(`/api/labs/${lab.id}/start`)}
                            disabled={busy || !isAuthenticated || !lab.startable || Boolean(running)}
                            className="cyber-button h-11 px-6 gap-2 disabled:opacity-50 font-bold"
                            data-testid={`start-lab-${lab.id}`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            {!isAuthenticated
                              ? t("Sign in to start", "Boshlash uchun kiring", "Войдите, чтобы начать")
                              : !lab.startable ? t("Coming soon", "Tez orada", "Скоро")
                              : running ? t("Stop active lab first", "Avval faol labni to'xtating", "Остановите другую лабу")
                              : t("Start machine", "Mashinani boshlash", "Запустить")}
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && lab.kind === "browser" && lab.browserScenario && (
                      <div className="mt-5 pt-5 border-t border-border">
                        <LabBrief
                          scenarioSlug={lab.browserScenario}
                          ctfId={lab.ctfId}
                          targetPath={isThisRunning ? running?.targetPath ?? null : null}
                        />
                      </div>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

