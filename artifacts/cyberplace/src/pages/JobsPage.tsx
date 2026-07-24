import { useState } from "react";
import { Briefcase, MapPin, Building2, Plus, ExternalLink, Trash2, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { normalizeArray } from "@/lib/api-shapes";
import { useQueryClient } from "@tanstack/react-query";
import { useListJobs, getListJobsQueryKey, useListMyJobs, getListMyJobsQueryKey } from "@workspace/api-client-react";

type Job = {
  id: number; title: string; company: string; description: string;
  location?: string | null; employmentType: string; applyUrl?: string | null;
  isActive: boolean; createdAt: string;
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

  const { data: jobsData, isLoading } = useListJobs({ query: { queryKey: getListJobsQueryKey() } });
  const { data: myJobsData } = useListMyJobs({ query: { enabled: !!user?.isEmployer, queryKey: getListMyJobsQueryKey() } });
  const jobs = normalizeArray<Job>(jobsData, ["jobs", "data", "items"]);
  const myJobs = normalizeArray<Job>(myJobsData, ["jobs", "data", "items"]);

  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", employmentType: "full_time", applyUrl: "" });
  const [busy, setBusy] = useState(false);

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
    if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed");
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
      toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally { setBusy(false); }
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
      toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const toggleActive = async (job: Job) => {
    try { await post(`/api/jobs/${job.id}`, "PATCH", { isActive: !job.isActive }); refresh(); }
    catch (e) { toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" }); }
  };

  const removeJob = async (job: Job) => {
    if (!confirm(t("Delete this posting?", "E'lonni o'chirasizmi?", "Удалить эту вакансию?"))) return;
    try { await post(`/api/jobs/${job.id}`, "DELETE"); refresh(); }
    catch (e) { toast({ title: e instanceof Error ? e.message : "Failed", variant: "destructive" }); }
  };

  return (
    <div className="min-h-screen bg-background pt-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Briefcase className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">{t("Jobs", "Ishlar", "Вакансии")}</h1>
            <p className="text-muted-foreground">{t("Cybersecurity roles from companies in the community.", "Hamjamiyatdagi kompaniyalardan kiberxavfsizlik ishlari.", "Роли в кибербезопасности от компаний сообщества.")}</p>
          </div>
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
                    <div key={job.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm" data-testid={`my-job-${job.id}`}>
                      <span className={`w-2 h-2 rounded-full ${job.isActive ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                      <span className="flex-1 truncate font-medium">{job.title}</span>
                      <button onClick={() => toggleActive(job)} className="text-muted-foreground hover:text-primary" title={job.isActive ? t("Hide", "Yashirish", "Скрыть") : t("Show", "Ko'rsatish", "Показать")}>
                        {job.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => removeJob(job)} className="text-muted-foreground hover:text-destructive" title={t("Delete", "O'chirish", "Удалить")}><Trash2 className="w-4 h-4" /></button>
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
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-foreground/5" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="glass-card rounded-[2.5rem] py-24 text-center border-foreground/5">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6"><Briefcase className="w-8 h-8 text-primary/40" /></div>
            <h3 className="text-xl font-display font-bold mb-2">{t("No open positions yet", "Hozircha ochiq ish o'rni yo'q", "Пока нет открытых вакансий")}</h3>
            <p className="text-sm text-muted-foreground">{t("Check back soon.", "Tez orada qayting.", "Загляните позже.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
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
                  {job.applyUrl && (
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button size="sm" className="gap-1.5" data-testid={`apply-${job.id}`}>{t("Apply", "Ariza", "Откликнуться")} <ExternalLink className="w-3.5 h-3.5" /></Button>
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{job.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
