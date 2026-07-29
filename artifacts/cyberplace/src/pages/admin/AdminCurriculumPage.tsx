import { useState } from "react";
import { Plus, Pencil, Trash2, X, GraduationCap, Tag, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { LoadFailure } from "@/components/LoadFailure";
import { errorToast } from "@/lib/error-toast";
import { normalizeArray } from "@/lib/api-shapes";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExamEditor } from "@/components/admin/ExamEditor";

type AdminModule = {
  id: number;
  slug: string;
  title: string; titleUz: string | null; titleRu: string | null;
  description: string; descriptionUz: string | null; descriptionRu: string | null;
  categoryId: number | null;
  orderIndex: number;
  estimatedHours: number;
  difficulty: string;
  passScore: number;
  isPublished: boolean;
  lessonCount: number;
};

type AdminCategory = { id: number; name: string; nameUz: string | null; nameRu: string | null; lessonCount: number };

const DIFFICULTIES = ["beginner", "intermediate", "advanced"];

async function getJson(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

/** Sends a body and throws the server's own message, so a 409 explains itself. */
async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

const EMPTY_MODULE = {
  slug: "", title: "", titleUz: "", titleRu: "",
  description: "", descriptionUz: "", descriptionRu: "",
  orderIndex: 0, estimatedHours: 0, difficulty: "beginner", passScore: 80,
};
type ModuleForm = typeof EMPTY_MODULE;

/**
 * The curriculum, which the panel could not touch.
 *
 * `modules` and `learn_categories` had no admin route of any kind. The eight
 * production modules exist because a seed script inserted them; correcting a
 * module title, adding a ninth, reordering the path or changing an exam pass
 * mark meant opening a SQL client against the live database. Categories are
 * worse than that: the lesson form requires one and the create handler rejects
 * an id that does not exist, so on a database with no categories a lesson could
 * not be written at all.
 */
export default function AdminCurriculumPage() {
  const { t, lang } = useLang();
  const { can } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const canWrite = can("lessons.publish");
  const canDelete = can("lessons.delete");

  const modulesQuery = useQuery({ queryKey: ["admin-modules"], queryFn: () => getJson("/api/admin/modules") });
  const categoriesQuery = useQuery({ queryKey: ["admin-learn-categories"], queryFn: () => getJson("/api/admin/learn-categories") });

  const modules = normalizeArray<AdminModule>(modulesQuery.data?.modules, ["modules", "data", "items"]);
  const categories = normalizeArray<AdminCategory>(categoriesQuery.data?.categories, ["categories", "data", "items"]);

  const [moduleForm, setModuleForm] = useState<ModuleForm | null>(null);
  const [editingModule, setEditingModule] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  /** Which module's exam is open for editing. */
  const [examModule, setExamModule] = useState<AdminModule | null>(null);

  const refreshModules = () => qc.invalidateQueries({ queryKey: ["admin-modules"] });
  const refreshCategories = () => qc.invalidateQueries({ queryKey: ["admin-learn-categories"] });

  const run = async (work: () => Promise<unknown>, okTitle: string, after: () => void) => {
    setBusy(true);
    try {
      await work();
      toast({ title: okTitle });
      after();
    } catch (err) {
      toast(errorToast(t, err));
    } finally {
      setBusy(false);
    }
  };

  const openCreateModule = () => { setEditingModule(null); setModuleForm({ ...EMPTY_MODULE, orderIndex: modules.length }); };
  const openEditModule = (m: AdminModule) => {
    setEditingModule(m.id);
    setModuleForm({
      slug: m.slug,
      title: m.title, titleUz: m.titleUz ?? "", titleRu: m.titleRu ?? "",
      description: m.description, descriptionUz: m.descriptionUz ?? "", descriptionRu: m.descriptionRu ?? "",
      orderIndex: m.orderIndex, estimatedHours: m.estimatedHours,
      difficulty: m.difficulty, passScore: m.passScore,
    });
  };

  const saveModule = () => {
    if (!moduleForm) return;
    const body = { ...moduleForm };
    void run(
      () => editingModule
        ? send(`/api/admin/modules/${editingModule}`, "PATCH", body)
        : send("/api/admin/modules", "POST", body),
      editingModule
        ? t("Module saved", "Modul saqlandi", "Модуль сохранён")
        : t("Module created — it starts hidden", "Modul yaratildi — u yashirin holatda", "Модуль создан — он пока скрыт"),
      () => { setModuleForm(null); setEditingModule(null); void refreshModules(); },
    );
  };

  const togglePublish = (m: AdminModule) => void run(
    () => send(`/api/admin/modules/${m.id}`, "PATCH", { isPublished: !m.isPublished }),
    m.isPublished
      ? t("Module hidden", "Modul yashirildi", "Модуль скрыт")
      : t("Module is live", "Modul nashr qilindi", "Модуль опубликован"),
    refreshModules,
  );

  const deleteModule = (m: AdminModule) => {
    if (!confirm(t(
      `Delete "${m.title}"? Exam attempts on it are deleted too.`,
      `"${m.title}" o'chirilsinmi? Undagi imtihon urinishlari ham o'chadi.`,
      `Удалить «${m.title}»? Попытки экзамена по нему тоже удалятся.`,
    ))) return;
    void run(() => send(`/api/admin/modules/${m.id}`, "DELETE"),
      t("Module deleted", "Modul o'chirildi", "Модуль удалён"), refreshModules);
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    void run(() => send("/api/admin/learn-categories", "POST", { name }),
      t("Category added", "Kategoriya qo'shildi", "Категория добавлена"),
      () => { setNewCategory(""); void refreshCategories(); });
  };

  const deleteCategory = (c: AdminCategory) => {
    if (!confirm(t(`Delete "${c.name}"?`, `"${c.name}" o'chirilsinmi?`, `Удалить «${c.name}»?`))) return;
    void run(() => send(`/api/admin/learn-categories/${c.id}`, "DELETE"),
      t("Category deleted", "Kategoriya o'chirildi", "Категория удалена"), refreshCategories);
  };

  const field = (key: keyof ModuleForm, label: string, opts: { area?: boolean; type?: string } = {}) => (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {opts.area ? (
        <Textarea
          rows={2} className="mt-1"
          value={String(moduleForm?.[key] ?? "")}
          onChange={e => setModuleForm(f => f && { ...f, [key]: e.target.value })}
          data-testid={`input-module-${String(key)}`}
        />
      ) : (
        <Input
          type={opts.type ?? "text"} className="mt-1"
          value={String(moduleForm?.[key] ?? "")}
          onChange={e => setModuleForm(f => f && {
            ...f,
            [key]: opts.type === "number" ? Number(e.target.value) : e.target.value,
          })}
          data-testid={`input-module-${String(key)}`}
        />
      )}
    </label>
  );

  return (
    <div className="flex min-h-screen bg-background pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6 space-y-10">
        {/* ---------------- Modules ---------------- */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold">{t("Modules", "Modullar", "Модули")}</h1>
            </div>
            {canWrite && (
              <Button size="sm" onClick={openCreateModule} className="gap-1.5" data-testid="button-create-module">
                <Plus className="w-4 h-4" /> {t("New module", "Yangi modul", "Новый модуль")}
              </Button>
            )}
          </div>

          {moduleForm && (
            <div className="mb-6 p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">
                  {editingModule
                    ? t("Edit module", "Modulni tahrirlash", "Редактировать модуль")
                    : t("New module", "Yangi modul", "Новый модуль")}
                </h2>
                <button onClick={() => { setModuleForm(null); setEditingModule(null); }} aria-label={t("Close", "Yopish", "Закрыть")}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">{t("Slug (URL)", "Slug (URL)", "Slug (URL)")}</span>
                  <Input
                    className="mt-1 font-mono" value={moduleForm.slug}
                    disabled={editingModule !== null}
                    onChange={e => setModuleForm(f => f && { ...f, slug: e.target.value })}
                    placeholder="web-security"
                    data-testid="input-module-slug"
                  />
                  {editingModule !== null && (
                    <span className="text-xs text-muted-foreground">
                      {/* Changing it would break every link and bookmark to the module. */}
                      {t("Fixed once created", "Yaratilgandan keyin o'zgarmaydi", "Не меняется после создания")}
                    </span>
                  )}
                </label>
                {field("title", t("Title (EN)", "Sarlavha (EN)", "Заголовок (EN)"))}
                {field("titleUz", t("Title (UZ)", "Sarlavha (UZ)", "Заголовок (UZ)"))}
                {field("titleRu", t("Title (RU)", "Sarlavha (RU)", "Заголовок (RU)"))}
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">{t("Difficulty", "Qiyinlik", "Сложность")}</span>
                  <select
                    className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary"
                    value={moduleForm.difficulty}
                    onChange={e => setModuleForm(f => f && { ...f, difficulty: e.target.value })}
                    data-testid="select-module-difficulty"
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                  </select>
                </label>
                {field("orderIndex", t("Order", "Tartib", "Порядок"), { type: "number" })}
                {field("estimatedHours", t("Hours", "Soat", "Часов"), { type: "number" })}
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">{t("Pass score (%)", "O'tish bali (%)", "Проходной балл (%)")}</span>
                  <Input
                    type="number" min={1} max={100} className="mt-1" value={moduleForm.passScore}
                    onChange={e => setModuleForm(f => f && { ...f, passScore: Number(e.target.value) })}
                    data-testid="input-module-passScore"
                  />
                  <span className="text-xs text-muted-foreground">
                    {t("Decides who earns the certificate.", "Sertifikatni kim olishini shu hal qiladi.", "Определяет, кто получит сертификат.")}
                  </span>
                </label>
                <div className="md:col-span-3 grid md:grid-cols-3 gap-4">
                  {field("description", t("Description (EN)", "Tavsif (EN)", "Описание (EN)"), { area: true })}
                  {field("descriptionUz", t("Description (UZ)", "Tavsif (UZ)", "Описание (UZ)"), { area: true })}
                  {field("descriptionRu", t("Description (RU)", "Tavsif (RU)", "Описание (RU)"), { area: true })}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => { setModuleForm(null); setEditingModule(null); }}>
                  {t("Cancel", "Bekor", "Отмена")}
                </Button>
                <Button size="sm" disabled={busy} onClick={saveModule} data-testid="button-submit-module">
                  {editingModule ? t("Save", "Saqlash", "Сохранить") : t("Create", "Yaratish", "Создать")}
                </Button>
              </div>
            </div>
          )}

          {modulesQuery.isError ? (
            <LoadFailure onRetry={() => modulesQuery.refetch()} />
          ) : modulesQuery.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Module", "Modul", "Модуль")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Lessons", "Darslar", "Уроки")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Pass", "O'tish", "Проход")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Status", "Holat", "Статус")}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Actions", "Amallar", "Действия")}</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {modules.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-module-${m.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.orderIndex}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t(m.title, m.titleUz ?? undefined, m.titleRu ?? undefined)}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.slug} · {m.difficulty} · {m.estimatedHours}h</div>
                      </td>
                      <td className="px-4 py-3 font-mono">{m.lessonCount}</td>
                      <td className="px-4 py-3 font-mono">{m.passScore}%</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => canWrite && togglePublish(m)}
                          disabled={!canWrite || busy}
                          className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                            m.isPublished
                              ? "border-[hsl(var(--neon)/.4)] bg-[hsl(var(--neon)/.1)] text-[hsl(var(--neon))]"
                              : "border-border bg-muted text-muted-foreground"
                          } ${canWrite ? "hover:border-primary/40" : "cursor-default"}`}
                          data-testid={`toggle-publish-module-${m.id}`}
                        >
                          {m.isPublished ? t("Live", "Nashrda", "Опубликован") : t("Draft", "Qoralama", "Черновик")}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {/* The exam is the thing that decides certificates, and
                              until now it could only be written in SQL. */}
                          <Button
                            size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                            onClick={() => setExamModule(examModule?.id === m.id ? null : m)}
                            data-testid={`button-exam-module-${m.id}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            {t("Exam", "Imtihon", "Экзамен")}
                          </Button>
                          {canWrite && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditModule(m)} data-testid={`button-edit-module-${m.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteModule(m)} data-testid={`button-delete-module-${m.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {modules.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {t("No modules yet", "Hali modul yo'q", "Модулей пока нет")}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {examModule && (
            <ExamEditor
              key={examModule.id}
              moduleId={examModule.id}
              moduleTitle={t(examModule.title, examModule.titleUz ?? undefined, examModule.titleRu ?? undefined)}
              onClose={() => setExamModule(null)}
            />
          )}
        </section>

        {/* ---------------- Categories ---------------- */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{t("Lesson categories", "Dars kategoriyalari", "Категории уроков")}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
            {t("Every lesson needs one. With no category here, the lesson form has nothing to select and a lesson cannot be created.",
               "Har bir darsga bittasi kerak. Bu yerda kategoriya bo'lmasa, dars formasida tanlash uchun hech narsa yo'q va dars yaratib bo'lmaydi.",
               "Каждому уроку нужна одна. Без категории форме урока нечего выбирать, и урок создать нельзя.")}
          </p>

          {canWrite && (
            <div className="flex gap-2 mb-4 max-w-md">
              <Input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCategory(); }}
                placeholder={t("New category name", "Yangi kategoriya nomi", "Название новой категории")}
                data-testid="input-new-category"
              />
              <Button size="sm" disabled={busy || !newCategory.trim()} onClick={addCategory} data-testid="button-add-category">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          {categoriesQuery.isError ? (
            <LoadFailure onRetry={() => categoriesQuery.refetch()} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <span key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm" data-testid={`chip-category-${c.id}`}>
                  {t(c.name, c.nameUz ?? undefined, c.nameRu ?? undefined)}
                  <span className="text-xs text-muted-foreground font-mono">{c.lessonCount}</span>
                  {canDelete && (
                    <button
                      onClick={() => deleteCategory(c)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={t("Delete", "O'chirish", "Удалить")}
                      data-testid={`button-delete-category-${c.id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {categories.length === 0 && !categoriesQuery.isLoading && (
                <span className="text-sm text-muted-foreground">{t("No categories yet", "Hali kategoriya yo'q", "Категорий пока нет")}</span>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
