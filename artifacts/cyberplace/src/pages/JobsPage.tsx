import { useState } from "react";
import { Briefcase, MapPin, Building2, Plus, ExternalLink, Trash2, EyeOff, Eye, Send, Users, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadFailure } from "@/components/LoadFailure";
import { Pagination } from "@/components/Pagination";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";
import { useQueryClient } from "@tanstack/react-query";
import { useListJobs, getListJobsQueryKey, useListMyJobs, getListMyJobsQueryKey } from "@workspace/api-client-react";
import { errorToast } from "@/lib/error-toast";

const PER_PAGE = 10;

type Job = {
  id: number; title: string; company: string; description: string;
  location?: string | null; employmentType: string; applyUrl?: string | null;
  isActive: boolean; createdAt: string;
  hasApplied?: boolean; applicationCount?: number;
};

type Applicant = {
  userId: number; nickname: string; points: number;
  openToWork: boolean; solvedCtfCount: number; message?: string | null; createdAt: string;
};

function useEmploymentLabel() {
  const { t } = useLang();
  return (type: string) => ({
    full_time: t("Full-time", "To'liq stavka", "Полная занятость"),
    part_time: t("Part-time", "Yarim stavka", "Частичная занятость"),
    internship: t("Internship", "Amaliyot", "Стажировка"),
    contract: t("Contract", "Shartnoma", "Контракт"),
  }[type] ?? type);
}

export default function JobsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const { user, isAuthenticated, updateUser } = useAuth();
  const qc = useQueryClient();
  const employmentLabel = useEmploymentLabel();

  const { data: jobsData, isLoading, isError, refetch } = useListJobs({ query: { queryKey: getListJobsQueryKey() } });
  const { data: myJobsData } = useListMyJobs({ query: { enabled: !!user?.isEmployer, queryKey: getListMyJobsQueryKey() } });
  const jobs = normalizeArray<Job>(jobsData, ["jobs", "data", "items"]);
  const myJobs = normalizeArray<Job>(myJobsData, ["jobs", "data", "items"]);

  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", employmentType: "full_time", applyUrl: "" });
  const [busy, setBusy] = useState(false);
  const [applyFor, setApplyFor] = useState<number | null>(null);
  const [applyMsg, setApplyMsg] = useState("");
  const [viewApplicants, setViewApplicants] = useState<number | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Job | null>(null);
  const [page, setPage] = useState(1);

  // The board is a plain array from the server (capped at 200). Page through it
  // on the client rather than showing a wall of every listing at once.
  const totalPages = Math.max(1, Math.ceil(jobs.length / PER_PAGE));
  const pageJobs = jobs.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const goToPage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
    void qc.invalidateQueries({ queryKey: getListMyJobsQueryKey() });
  };

  const post = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    // A translated fallback rather than a bare English "Failed" — errorToast
    // shows the thrown message verbatim, so this is what a user would have read.
    if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : t("Something went wrong", "Xatolik yuz berdi", "Что-то пошло не так"));
    return data;
  };

  const becomeEmployer = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await post("/api/jobs/become-employer", "POST", { companyName: companyName.trim(), companyUrl: companyUrl.trim() });
      if (user) updateUser({ ...user, isEmployer: true, companyName: data.companyName });
      toast({ title: t("You're now an employer", "Endi ish beruvchisiz", "Вы теперь работодатель") });
    } catch (e) {
      toast(errorToast(t, e));
    } finally { setBusy(false); }
  };

  const applyToJob = async (jobId: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await post(`/api/jobs/${jobId}/apply`, "POST", { message: applyMsg.trim() || null });
      toast({ title: t("Application sent!", "Ariza yuborildi!", "Заявка отправлена!") });
      setApplyFor(null); setApplyMsg("");
      refresh();
    } catch (e) {
      toast(errorToast(t, e));
    } finally { setBusy(false); }
  };

  const openApplicants = async (jobId: number) => {
    if (viewApplicants === jobId) { setViewApplicants(null); return; }
    try {
      const r = await fetch(`/api/jobs/${jobId}/applications`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || t("Something went wrong", "Xatolik yuz berdi", "Что-то пошло не так"));
      setApplicants(normalizeArray<Applicant>(d?.applications, ["applications", "data", "items"]));
      setViewApplicants(jobId);
    } catch (e) {
      toast(errorToast(t, e));
    }
  };

  const createJob = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await post("/api/jobs", "POST", { ...form, title: form.title.trim(), description: form.description.trim() });
      toast({ title: t("Job posted!", "E'lon joylandi!", "Вакансия опубликована!") });
      setForm({ title: "", description: "", location: "", employmentType: "full_time", applyUrl: "" });
      setShowPost(false);
      refresh();
    } catch (e) {
      toast(errorToast(t, e));
    } finally { setBusy(false); }
  };

  const toggleActive = async (job: Job) => {
    try { await post(`/api/jobs/${job.id}`, "PATCH", { isActive: !job.isActive }); refresh(); }
    catch (e) { toast(errorToast(t, e)); }
  };

  // The confirmation is an AlertDialog now, not a blocking native confirm().
  const confirmRemove = async () => {
    const job = pendingDelete;
    if (!job) return;
    setPendingDelete(null);
    try { await post(`/api/jobs/${job.id}`, "DELETE"); refresh(); }
    catch (e) { toast(errorToast(t, e)); }
  };

  return (
    <div className="min-h-screen bg-background page">
      <div className="shell-mid py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Briefcase className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1>{t("Careers", "Karyera", "Карьера")}</h1>
            <p className="text-muted-foreground">{t("Cybersecurity roles from companies in the community.", "Hamjamiyatdagi kompaniyalardan kiberxavfsizlik ishlari.", "Роли в кибербезопасности от компаний сообщества.")}</p>
          </div>
          <Link href="/verify" className="ml-auto hidden sm:block">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ShieldCheck className="w-4 h-4" /> {t("Verify a credential", "Sertifikatni tekshirish", "Проверить сертификат")}
            </Button>
          </Link>
        </div>

        {/* Careers serves two opposite audiences. Say which is which up front,
            rather than making people guess from a nav label. */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
            <div className="text-sm font-semibold mb-1">{t("Looking for a job", "Ish qidiryapsizmi", "Ищете работу")}</div>
            <p className="text-xs text-muted-foreground">{t("Open positions are listed below. Apply with your cdCTF record attached.", "Ochiq ish o'rinlari quyida. cdCTF natijangiz bilan ariza bering.", "Открытые вакансии — ниже. Откликайтесь вместе со своим профилем cdCTF.")}</p>
          </div>
          <Link href="/talent">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4 h-full hover:border-emerald-500/50 transition-colors cursor-pointer">
              <div className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                {t("Hiring", "Xodim izlayapsizmi", "Нанимаете")} <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground">{t("Browse candidates who are open to work, ranked by what they have solved.", "Ishga tayyor nomzodlarni ko'ring — yechgan topshiriqlari bo'yicha saralangan.", "Смотрите кандидатов, открытых к работе, по их решённым заданиям.")}</p>
            </div>
          </Link>
        </div>

        {/* Employer panel. A logged-in employer can post; anyone else logged in
            can become one; a guest is invited to sign in. */}
        {isAuthenticated && user?.isEmployer && (
          <div className="mb-8">
            {!showPost ? (
              <Button onClick={() => setShowPost(true)} className="gap-2" data-testid="button-show-post"><Plus className="w-4 h-4" /> {t("Post a job", "E'lon joylash", "Опубликовать вакансию")}</Button>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3" data-testid="post-form">
                <h2 className="font-semibold">{t("New posting", "Yangi e'lon", "Новая вакансия")}</h2>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t("Job title", "Lavozim nomi", "Название должности")} data-testid="input-job-title" />
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder={t("Describe the role, requirements, how to apply…", "Lavozim, talablar, ariza berish tartibi…", "Опишите роль, требования, как откликнуться…")} data-testid="input-job-desc" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={t("Location (e.g. Tashkent / Remote)", "Joylashuv (mas. Toshkent / Masofaviy)", "Локация (напр. Ташкент / Удалённо)")} />
                  <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })} className="h-9 rounded-md border border-border bg-background px-3 text-sm" data-testid="select-job-type">
                    <option value="full_time">{employmentLabel("full_time")}</option>
                    <option value="part_time">{employmentLabel("part_time")}</option>
                    <option value="internship">{employmentLabel("internship")}</option>
                    <option value="contract">{employmentLabel("contract")}</option>
                  </select>
                </div>
                <Input value={form.applyUrl} onChange={e => setForm({ ...form, applyUrl: e.target.value })} placeholder={t("Apply link (https://…)", "Ariza havolasi (https://…)", "Ссылка для отклика (https://…)")} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowPost(false)}>{t("Cancel", "Bekor", "Отмена")}</Button>
                  <Button size="sm" onClick={createJob} disabled={busy || form.title.trim().length < 2 || form.description.trim().length < 2} data-testid="button-submit-job">{t("Publish", "Joylash", "Опубликовать")}</Button>
                </div>
              </div>
            )}

            {myJobs.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-2">{t("Your postings", "Sizning e'lonlaringiz", "Ваши вакансии")}</div>
                <div className="space-y-2">
                  {myJobs.map(job => (
                    <div key={job.id} data-testid={`my-job-${job.id}`}>
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
                        <span className={`w-2 h-2 rounded-full ${job.isActive ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                        <span className="flex-1 truncate font-medium">{job.title}</span>
                        <button onClick={() => openApplicants(job.id)} className={`flex items-center gap-1.5 text-xs ${(job.applicationCount ?? 0) > 0 ? "text-primary hover:underline" : "text-muted-foreground"}`} data-testid={`view-applicants-${job.id}`}>
                          <Users className="w-3.5 h-3.5" /> {job.applicationCount ?? 0} {t("applicants", "arizachi", "заявок")}
                        </button>
                        <button onClick={() => toggleActive(job)} className="text-muted-foreground hover:text-primary" title={job.isActive ? t("Hide", "Yashirish", "Скрыть") : t("Show", "Ko'rsatish", "Показать")}>
                          {job.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setPendingDelete(job)} className="text-muted-foreground hover:text-destructive" title={t("Delete", "O'chirish", "Удалить")}><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {viewApplicants === job.id && (
                        <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary/20 pl-4" data-testid={`applicants-${job.id}`}>
                          {applicants.length === 0 && <p className="text-xs text-muted-foreground py-2">{t("No applicants yet.", "Hali arizachi yo'q.", "Заявок пока нет.")}</p>}
                          {applicants.map(a => (
                            <div key={a.userId} className="rounded-lg bg-muted/20 p-3 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link href={`/profile/${a.userId}`} className="font-medium hover:text-primary">{a.nickname}</Link>
                                <span className="text-xs text-muted-foreground tabular-nums">{a.points} {t("points", "ball", "очки")}</span>
                                <span className="text-xs text-muted-foreground tabular-nums">· {a.solvedCtfCount} {t("solved", "yechim", "решено")}</span>
                                {a.openToWork && <span className="text-xs text-emerald-500 border border-emerald-500/30 rounded-full px-2">{t("Open to work", "Ishga tayyor", "Открыт")}</span>}
                              </div>
                              {a.message && <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line">{a.message}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isAuthenticated && !user?.isEmployer && (
          <div className="mb-8 rounded-2xl border border-dashed border-border p-5" data-testid="become-employer">
            <div className="flex items-center gap-2 mb-1 font-medium"><Building2 className="w-4 h-4 text-primary" /> {t("Are you hiring?", "Xodim izlayapsizmi?", "Вы нанимаете?")}</div>
            <p className="text-sm text-muted-foreground mb-3">{t("Register your company to post jobs to the community.", "E'lon joylash uchun kompaniyangizni ro'yxatdan o'tkazing.", "Зарегистрируйте компанию, чтобы публиковать вакансии.")}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={t("Company name", "Kompaniya nomi", "Название компании")} data-testid="input-company-name" />
              <Input value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} placeholder={t("Company website (optional)", "Veb-sayt (ixtiyoriy)", "Сайт (необязательно)")} />
            </div>
            <Button size="sm" className="mt-3 gap-2" onClick={becomeEmployer} disabled={busy || companyName.trim().length < 2} data-testid="button-become-employer">
              <Building2 className="w-4 h-4" /> {t("Register as employer", "Ish beruvchi sifatida ro'yxatdan o'tish", "Стать работодателем")}
            </Button>
          </div>
        )}

        {/* The board */}
        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-muted" />)}</div>
        ) : jobs.length === 0 ? (
          /* Both sides of an empty board get a next step: a candidate goes and
              builds a record worth hiring, a company posts the first role. */
          <div className="glass-card rounded-xl py-16 px-8 text-center border-border">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-5"><Briefcase className="w-7 h-7 text-primary/40" /></div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No open positions yet", "Hozircha ochiq ish o'rni yo'q", "Пока нет открытых вакансий")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-7">
              {t("When companies post roles they appear here. Until then, build the record that gets you hired — solved challenges and finished modules are what employers see.",
                 "Kompaniyalar e'lon joylaganda ular shu yerda chiqadi. Shu vaqtgacha ishga olinadigan natijangizni to'plang — ish beruvchilar yechgan topshiriq va tugatgan modullaringizni ko'radi.",
                 "Когда компании опубликуют вакансии, они появятся здесь. А пока копите результат: работодатели смотрят на решённые задания и пройденные модули.")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/modules">
                <button className="cyber-button h-11 px-6">{t("Start learning", "O'rganishni boshlash", "Начать обучение")}</button>
              </Link>
              <Link href="/talent">
                <button className="cyber-button-outline h-11 px-6">{t("See the candidates", "Nomzodlarni ko'rish", "Смотреть кандидатов")}</button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pageJobs.map(job => (
              <div key={job.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors" data-testid={`job-${job.id}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold truncate">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {job.company}</span>
                      {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
                      <span className="inline-flex items-center rounded-lg border border-border bg-muted/40 px-2 py-0.5 text-xs">{employmentLabel(job.employmentType)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAuthenticated && !user?.isEmployer && (
                      job.hasApplied ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-500 font-medium" data-testid={`applied-${job.id}`}><Check className="w-4 h-4" /> {t("Applied", "Ariza berilgan", "Отклик отправлен")}</span>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setApplyFor(applyFor === job.id ? null : job.id); setApplyMsg(""); }} data-testid={`apply-btn-${job.id}`}>
                          <Send className="w-3.5 h-3.5" /> {t("Apply", "Ariza berish", "Откликнуться")}
                        </Button>
                      )
                    )}
                    {job.applyUrl && (
                      <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                        {/* "External" told a user nothing about where the button
                            went; "Apply on site" says it links out to the
                            employer's own page. */}
                        <Button size="sm" className="gap-1.5" data-testid={`apply-${job.id}`}>{t("Apply on site", "Sayt orqali", "На сайте")} <ExternalLink className="w-3.5 h-3.5" /></Button>
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{job.description}</p>

                {/* On-platform apply — your cdCTF record comes with it. */}
                {applyFor === job.id && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    <Textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} rows={3}
                      placeholder={t("A short note to the employer (optional). Your level, solves and skills are attached automatically.",
                        "Ish beruvchiga qisqa izoh (ixtiyoriy). Darajangiz, yechimlaringiz va mahoratlaringiz avtomatik biriktiriladi.",
                        "Короткое сообщение работодателю (необязательно). Ваш уровень, решения и навыки прикрепляются автоматически.")}
                      data-testid={`apply-message-${job.id}`} />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setApplyFor(null)}>{t("Cancel", "Bekor", "Отмена")}</Button>
                      <Button size="sm" onClick={() => applyToJob(job.id)} disabled={busy} data-testid={`apply-submit-${job.id}`}>{t("Send application", "Ariza yuborish", "Отправить заявку")}</Button>
                    </div>
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="mt-3 text-xs text-muted-foreground">{t("Sign in to apply with your cdCTF profile.", "cdCTF profilingiz bilan ariza berish uchun kiring.", "Войдите, чтобы откликнуться со своим профилем cdCTF.")}</div>
                )}
              </div>
            ))}
            <div className="pt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this posting?", "E'lonni o'chirasizmi?", "Удалить эту вакансию?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This removes the listing and every application on it. It cannot be undone.",
                 "Bu e'lonni va undagi barcha arizalarni o'chiradi. Buni qaytarib bo'lmaydi.",
                 "Это удалит вакансию и все отклики на неё. Отменить нельзя.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "Bekor", "Отмена")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("Delete", "O'chirish", "Удалить")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
