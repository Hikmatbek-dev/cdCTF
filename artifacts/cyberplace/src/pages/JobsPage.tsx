import { useState } from "react";
import { Briefcase, MapPin, Building2, Plus, ExternalLink, Trash2, EyeOff, Eye, Send, Users, Check, ShieldCheck, ArrowRight, Sparkles, UserCheck } from "lucide-react";
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
import { FadeIn } from "@/components/PageTransition";

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

  const confirmRemove = async () => {
    const job = pendingDelete;
    if (!job) return;
    setPendingDelete(null);
    try { await post(`/api/jobs/${job.id}`, "DELETE"); refresh(); }
    catch (e) { toast(errorToast(t, e)); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground page relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-40" />

      <div className="shell relative z-10 py-8">
        <FadeIn>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
                <Briefcase className="w-7 h-7 text-primary animate-glow" />
              </div>
              <div>
                <div className="eyebrow mb-1 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {t("cdCTF · Cyber Career Network", "cdCTF · Kiber Karyera Tarmog'i", "cdCTF · Сеть Кибер Карьеры")}
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight">
                  <span className="gradient-text">{t("Cybersecurity Job Board", "Kiberxavfsizlik Vakansiyalari", "Вакансии в Кибербезопасности")}</span>
                </h1>
              </div>
            </div>

            <Link href="/verify">
              <Button variant="outline" size="sm" className="cyber-button-outline text-xs h-10 px-4 gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> {t("Verify Credential", "Sertifikatni Tekshirish", "Проверить Сертификат")}
              </Button>
            </Link>
          </div>

          {/* Quick Dual Cards Header */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="glass-card p-6 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card">
              <div className="text-base font-bold mb-1 flex items-center gap-2 text-foreground">
                <Briefcase className="w-4 h-4 text-primary" />
                {t("Job Seekers & Candidates", "Ish Qidiruvchilar Uchun", "Соискателям")}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("Apply directly to verified cybersecurity roles with your cdCTF verified proof-of-skill record.", 
                   "O'z cdCTF profil va yutuqlaringiz bilan to'g'ridan-to'g'ri vakansiyalarga ariza bering.", 
                   "Откликайтесь на вакансии со своим подтверждённым профилем cdCTF.")}
              </p>
            </div>

            <Link href="/talent">
              <div className="glass-card p-6 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card hover:border-emerald-500/60 transition-all cursor-pointer group">
                <div className="text-base font-bold mb-1 flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    {t("Employers & Recruiter Directory", "Ish Beruvchilar Uchun", "Работодателям")}
                  </span>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("Browse verified security talent, ranked by verified solved CTF challenges and code metrics.", 
                     "Yechgan CTF topshiriqlari va bilimlari bo'yicha saralangan mutaxassislarni ko'ring.", 
                     "Смотрите проверенных специалистов, отсортированных по решённым CTF заданиям.")}
                </p>
              </div>
            </Link>
          </div>
        </FadeIn>

        {/* Employer control panel */}
        {isAuthenticated && user?.isEmployer && (
          <FadeIn>
            <div className="mb-8">
              {!showPost ? (
                <Button onClick={() => setShowPost(true)} className="cyber-button h-11 px-6 gap-2 font-bold" data-testid="button-show-post">
                  <Plus className="w-4 h-4" /> {t("Post New Job Opportunity", "Yangi Vakansiya Joylash", "Опубликовать Вакансию")}
                </Button>
              ) : (
                <div className="glass-card p-6 space-y-4 border-primary/30" data-testid="post-form">
                  <h2 className="text-lg font-bold">{t("Publish New Job Listing", "Yangi Vakansiya E'loni", "Публикация Вакансии")}</h2>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t("Job title (e.g. Senior Pentester / Security Engineer)", "Lavozim nomi (masalan: Pentester / Security Engineer)", "Название должности")} className="terminal-input h-11" data-testid="input-job-title" />
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder={t("Role responsibilities, required skills, tools used, compensation…", "Mas'uliyatlar, talab qilinadigan ko'nikmalar, maosh…", "Обязанности, требования, навыки, зарплата…")} className="terminal-input" data-testid="input-job-desc" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={t("Location (e.g. Tashkent / Remote)", "Joylashuv (mas. Toshkent / Remote)", "Локация (напр. Ташкент / Remote)")} className="terminal-input h-11" />
                    <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })} className="terminal-input h-11 rounded-xl px-4 text-sm bg-background border-border" data-testid="select-job-type">
                      <option value="full_time">{employmentLabel("full_time")}</option>
                      <option value="part_time">{employmentLabel("part_time")}</option>
                      <option value="internship">{employmentLabel("internship")}</option>
                      <option value="contract">{employmentLabel("contract")}</option>
                    </select>
                  </div>
                  <Input value={form.applyUrl} onChange={e => setForm({ ...form, applyUrl: e.target.value })} placeholder={t("External apply link (https://…)", "Tashqi havola (https://…)", "Ссылка для отклика (https://…)")} className="terminal-input h-11" />
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPost(false)} className="cyber-button-outline h-10 px-4">{t("Cancel", "Bekor qilish", "Отмена")}</Button>
                    <Button size="sm" onClick={createJob} disabled={busy || form.title.trim().length < 2 || form.description.trim().length < 2} className="cyber-button h-10 px-6 font-bold" data-testid="button-submit-job">{t("Publish Job", "Joylash", "Опубликовать")}</Button>
                  </div>
                </div>
              )}

              {myJobs.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">{t("Your Active Job Postings", "Sizning E'lonlaringiz", "Ваши Вакансии")}</div>
                  <div className="grid gap-3">
                    {myJobs.map(job => (
                      <div key={job.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4" data-testid={`my-job-${job.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${job.isActive ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-muted-foreground/40"}`} />
                          <span className="truncate font-bold text-sm">{job.title}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <button onClick={() => openApplicants(job.id)} className="text-xs font-mono font-semibold text-primary hover:underline flex items-center gap-1.5" data-testid={`view-applicants-${job.id}`}>
                            <Users className="w-4 h-4" /> {job.applicationCount ?? 0} {t("applicants", "arizachi", "заявок")}
                          </button>
                          <button onClick={() => toggleActive(job)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                            {job.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setPendingDelete(job)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {isAuthenticated && !user?.isEmployer && (
          <FadeIn>
            <div className="mb-8 rounded-2xl border border-dashed border-primary/30 p-6 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4" data-testid="become-employer">
              <div>
                <div className="flex items-center gap-2 font-bold text-base mb-1"><Building2 className="w-5 h-5 text-primary" /> {t("Hiring Security Professionals?", "Xodim Izlayapsizmi?", "Нанимаете Специалистов?")}</div>
                <p className="text-xs text-muted-foreground">{t("Register your tech company to post open security roles directly to the community.", "E'lon joylash uchun kompaniyangizni bir zumda ro'yxatdan o'tkazing.", "Зарегистрируйте компанию, чтобы публиковать вакансии.")}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={t("Company name", "Kompaniya nomi", "Компания")} className="terminal-input h-10 text-xs" data-testid="input-company-name" />
                <Button size="sm" className="cyber-button h-10 px-5 text-xs font-bold whitespace-nowrap w-full sm:w-auto" onClick={becomeEmployer} disabled={busy || companyName.trim().length < 2} data-testid="button-become-employer">
                  {t("Register Company", "Ro'yxatdan o'tish", "Зарегистрировать")}
                </Button>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Main Job listings board */}
        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-muted" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 px-8 text-center border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"><Briefcase className="w-8 h-8 text-primary" /></div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No open positions right now", "Hozircha ochiq ish o'rni yo'q", "Пока нет открытых вакансий")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("Verified positions land here. Meanwhile, complete lessons and practice CTFs to boost your public talent profile.",
                 "Vakansiyalar shu yerda ko'rinadi. Shu vaqtda cdCTF profil va natijalaringizni oshiring.",
                 "Вакансии появятся здесь. А пока улучшайте свой профиль cdCTF.")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/modules"><button className="cyber-button h-11 px-6 font-bold">{t("Start learning", "O'rganishni boshlash", "Начать обучение")}</button></Link>
              <Link href="/talent"><button className="cyber-button-outline h-11 px-6 font-bold">{t("Browse talent directory", "Nomzodlarni ko'rish", "Смотреть кандидатов")}</button></Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pageJobs.map((job, idx) => (
              <FadeIn key={job.id} delay={idx * 0.04}>
                <div className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md" data-testid={`job-${job.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono font-medium text-muted-foreground mt-2">
                        <span className="flex items-center gap-1.5 text-foreground font-semibold"><Building2 className="w-3.5 h-3.5 text-primary" /> {job.company}</span>
                        {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400" /> {job.location}</span>}
                        <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 text-primary px-2.5 py-0.5 font-bold uppercase">{employmentLabel(job.employmentType)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isAuthenticated && !user?.isEmployer && (
                        job.hasApplied ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl" data-testid={`applied-${job.id}`}>
                            <Check className="w-4 h-4" /> {t("Applied", "Ariza topshirilgan", "Отклик отправлен")}
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" className="cyber-button-outline text-xs h-10 px-4 gap-2 font-bold" onClick={() => { setApplyFor(applyFor === job.id ? null : job.id); setApplyMsg(""); }} data-testid={`apply-btn-${job.id}`}>
                            <Send className="w-3.5 h-3.5" /> {t("Apply with cdCTF Profile", "Ariza berish", "Откликнуться")}
                          </Button>
                        )
                      )}
                      {job.applyUrl && (
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="cyber-button text-xs h-10 px-4 gap-1.5 font-bold" data-testid={`apply-${job.id}`}>
                            {t("Apply on Website", "Kompaniya saytida", "На сайте")} <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3 mb-2">{job.description}</p>

                  {/* On-platform apply form */}
                  {applyFor === job.id && (
                    <div className="mt-5 space-y-3 border-t border-border pt-5">
                      <Textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} rows={3}
                        placeholder={t("A short note to the employer (optional). Your level, solved challenges, and skills profile will be automatically attached.",
                          "Ish beruvchiga qisqa izoh (ixtiyoriy). Darajangiz, yechgan topshiriqlaringiz va mahoratingiz avtomatik biriktiriladi.",
                          "Короткое сообщение работодателю (необязательно). Ваш уровень и навыки прикрепляются автоматически.")}
                        className="terminal-input"
                        data-testid={`apply-message-${job.id}`} />
                      <div className="flex justify-end gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setApplyFor(null)} className="cyber-button-outline h-9 px-4 text-xs">{t("Cancel", "Bekor qilish", "Отмена")}</Button>
                        <Button size="sm" onClick={() => applyToJob(job.id)} disabled={busy} className="cyber-button h-9 px-5 text-xs font-bold" data-testid={`apply-submit-${job.id}`}>{t("Send Application", "Ariza Yuborish", "Отправить Заявку")}</Button>
                      </div>
                    </div>
                  )}

                  {!isAuthenticated && (
                    <div className="mt-3 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      {t("Sign in to apply with your cdCTF verified profile.", "cdCTF profilingiz bilan ariza berish uchun kiring.", "Войдите, чтобы откликнуться со своим профилем cdCTF.")}
                    </div>
                  )}
                </div>
              </FadeIn>
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

