import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Server, Play, Square, Clock, ExternalLink, Info, Flag, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeArray } from "@/lib/api-shapes";
import { errorToast } from "@/lib/error-toast";
import { LabBrief, targetUrl } from "@/components/labs/LabBrief";

type Lab = {
  id: number; slug: string;
  name: string; nameUz: string | null; nameRu: string | null;
  description: string; descriptionUz: string | null; descriptionRu: string | null;
  difficulty: string; ttlMinutes: number; ctfId: number | null;
  kind: "container" | "browser"; browserScenario: string | null; startable: boolean;
};
type Running = { id: number; labId: number; host: string; port: number; startedAt: string; expiresAt: string };
type LabsResponse = { labs: Lab[]; running: Running | null; available: boolean };

/** Minutes:seconds left, recomputed every second. */
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
  /** Which lab's brief is open. Clicking a card is how you find out what it is. */
  const [openLab, setOpenLab] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const r = await fetch("/api/labs");
      if (!r.ok) throw new Error("labs");
      return r.json() as Promise<LabsResponse>;
    },
    // A running machine has a clock on it; keep the page honest.
    refetchInterval: 30_000,
  });

  const labs = normalizeArray<Lab>(data?.labs, ["labs", "data", "items"]);
  const running = data?.running ?? null;
  const available = data?.available ?? false;
  const countdown = useCountdown(running?.expiresAt);
  const runningLab = labs.find(l => l.id === running?.labId) ?? null;

  const act = async (url: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d?.error === "string" ? d.error : "Failed");
      void qc.invalidateQueries({ queryKey: ["labs"] });
      return d;
    } catch (e) {
      toast(errorToast(t, e));
    } finally { setBusy(false); }
  };

  const label = (l: Lab) => t(l.name, l.nameUz || l.name, l.nameRu || l.name);
  const blurb = (l: Lab) => t(l.description, l.descriptionUz || l.description, l.descriptionRu || l.description);

  return (
    <div className="min-h-screen bg-background pt-24 sm:pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Server className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{t("Labs", "Laboratoriya", "Лаборатории")}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("Start a real vulnerable machine, break into it, submit the flag.",
                 "Haqiqiy zaif mashinani ishga tushiring, ichiga kiring va flagni topshiring.",
                 "Запустите настоящую уязвимую машину, взломайте её и отправьте флаг.")}
            </p>
          </div>
        </div>

        {/* The machine you have right now, with its clock. */}
        {running && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 mb-8" data-testid="running-machine">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-500 mb-1.5">{t("Your machine is running", "Mashinangiz ishlayapti", "Ваша машина запущена")}</div>
                {runningLab?.kind === "browser" ? (
                  <div className="text-sm text-muted-foreground">
                    {t("The target is open below.", "Nishon quyida ochiq.", "Цель открыта ниже.")}
                  </div>
                ) : (
                  <div className="font-mono text-sm">
                    <a href={`http://${running.host}:${running.port}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary inline-flex items-center gap-1.5">
                      {running.host}:{running.port} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {countdown ? t(`${countdown} left`, `${countdown} qoldi`, `осталось ${countdown}`) : ""}
                </div>
              </div>
              <button onClick={() => act(`/api/labs/instances/${running.id}/stop`)} disabled={busy}
                className="cyber-button-outline h-11 px-6 gap-2 shrink-0" data-testid="stop-machine">
                <Square className="w-4 h-4" /> {t("Stop", "To'xtatish", "Остановить")}
              </button>
            </div>
          </div>
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
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-foreground/5" />)}</div>
        ) : labs.length === 0 ? (
          <div className="glass-card rounded-xl py-16 px-8 text-center border-foreground/5">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-5"><Server className="w-7 h-7 text-primary/40" /></div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No machines yet", "Hozircha mashinalar yo'q", "Пока нет машин")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("Vulnerable machines land here. Meanwhile the challenge set is open and needs no setup.",
                 "Zaif mashinalar shu yerda paydo bo'ladi. Shu vaqtda topshiriqlar to'plami ochiq va hech qanday sozlash talab qilmaydi.",
                 "Уязвимые машины появятся здесь. А пока набор заданий открыт и не требует настройки.")}
            </p>
            <Link href="/ctf"><button className="cyber-button h-11 px-6">{t("Go to practice", "Mashqqa o'tish", "Перейти к практике")}</button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {labs.map(lab => {
              const isThisRunning = running?.labId === lab.id;
              const isOpen = openLab === lab.id;
              return (
                <div key={lab.id} className="rounded-xl border border-border bg-card p-5" data-testid={`lab-${lab.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setOpenLab(v => (v === lab.id ? null : lab.id))}
                      aria-expanded={isOpen}
                      className="min-w-0 text-left"
                      data-testid={`lab-toggle-${lab.id}`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3 className="text-lg font-semibold truncate">{label(lab)}</h3>
                        <span className="text-xs rounded-lg border border-border bg-muted/40 px-2 py-0.5 capitalize shrink-0">{lab.difficulty}</span>
                        {lab.kind === "browser" && (
                          <span className="text-xs rounded-lg border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 shrink-0">
                            {t("In your browser", "Brauzeringizda", "В браузере")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{blurb(lab)}</p>
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {lab.ttlMinutes} {t("min", "daqiqa", "мин")}</span>
                        {lab.kind === "browser" && (
                          <span>{t("Starts instantly · no setup", "Bir zumda ochiladi · sozlash kerak emas", "Открывается мгновенно · без настройки")}</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-primary">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                          {isOpen ? t("Less", "Yopish", "Свернуть") : t("What is this?", "Bu nima?", "Что это?")}
                        </span>
                      </div>
                    </button>
                    <div className="shrink-0">
                      {isThisRunning ? (
                        <button onClick={() => act(`/api/labs/instances/${running!.id}/stop`)} disabled={busy}
                          className="cyber-button-outline h-11 px-6 gap-2">
                          <Square className="w-4 h-4" /> {t("Stop", "To'xtatish", "Остановить")}
                        </button>
                      ) : lab.kind === "browser" && lab.browserScenario && isAuthenticated && !running ? (
                        // An anchor, not window.open() after an await: the popup
                        // blocker only trusts a navigation that comes straight
                        // out of the click.
                        <a
                          href={targetUrl(lab.browserScenario)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { setOpenLab(lab.id); void act(`/api/labs/${lab.id}/start`); }}
                          className="cyber-button h-11 px-6 gap-2 inline-flex items-center"
                          data-testid={`start-lab-${lab.id}`}
                        >
                          <Play className="w-4 h-4" />
                          {t("Start", "Boshlash", "Начать")}
                        </a>
                      ) : (
                        <button onClick={() => act(`/api/labs/${lab.id}/start`)}
                          disabled={busy || !isAuthenticated || !lab.startable || Boolean(running)}
                          className="cyber-button h-11 px-6 gap-2 disabled:opacity-50"
                          data-testid={`start-lab-${lab.id}`}>
                          <Play className="w-4 h-4" />
                          {!isAuthenticated
                            ? t("Sign in to start", "Boshlash uchun kiring", "Войдите, чтобы начать")
                            : !lab.startable ? t("Coming soon", "Tez orada", "Скоро")
                            : running ? t("Stop the other one first", "Avval boshqasini to'xtating", "Сначала остановите другую")
                            : t("Start machine", "Mashinani ishga tushirish", "Запустить машину")}
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && lab.kind === "browser" && lab.browserScenario && (
                    <LabBrief scenarioSlug={lab.browserScenario} ctfId={lab.ctfId} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
