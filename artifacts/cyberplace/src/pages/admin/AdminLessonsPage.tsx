import { useState } from "react";
import { Plus, Pencil, Trash2, X, PlusCircle, MinusCircle } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { Pager, PAGE_SIZE } from "@/components/Pager";
import { LoadFailure } from "@/components/LoadFailure";
import { errorToast } from "@/lib/error-toast";
import { normalizeLearnCategories, normalizeArray } from "@/lib/api-shapes";
import type { AdminLesson } from "@workspace/api-client-react";
import { useListLearnCategories, getListLearnCategoriesQueryKey, useListModules, getListModulesQueryKey, useAdminCreateLesson, useAdminUpdateLesson, useAdminDeleteLesson , usePublishLesson } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";

/**
 * Drops trailing blanks from an answer list.
 *
 * The form always draws four option inputs. A question stored with two — which
 * is most of them — therefore arrived at the resolver with C and D undefined,
 * and `z.array(z.string().min(1))` failed them as "Required". The lesson could
 * not be saved at all: no request was sent, and the two red "Required" labels
 * sat under boxes an admin was never meant to fill in.
 *
 * Only *trailing* blanks are dropped. A gap in the middle would silently
 * renumber the answers and move the correct one, so that is an error instead.
 */
function trimTrailingBlanks(options: (string | undefined)[]): string[] {
  const trimmed = options.map(o => (o ?? "").trim());
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === "") trimmed.pop();
  return trimmed;
}

const questionSchema = z.object({
  question: z.string().min(1),
  questionUz: z.string().nullish(),
  questionRu: z.string().nullish(),
  options: z.array(z.string().optional()),
  // Nullish, not required: a question may be English-only. But it must be
  // declared — z.object() strips undeclared keys, so leaving these out meant the
  // resolver deleted the translations the edit form had just loaded.
  optionsUz: z.array(z.string().optional()).nullish(),
  optionsRu: z.array(z.string().optional()).nullish(),
  correctOption: z.coerce.number().min(0),
}).superRefine((q, ctx) => {
  const filled = trimTrailingBlanks(q.options);
  if (filled.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options", 1], message: "At least two answers" });
    return;
  }
  const gap = filled.findIndex(o => o === "");
  if (gap !== -1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options", gap], message: "Fill this in or clear the ones after it" });
  }
  if (q.correctOption >= filled.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOption"], message: "That answer is empty" });
  }
});

const schema = z.object({
  title: z.string().min(1),
  titleUz: z.string().optional(),
  titleRu: z.string().optional(),
  content: z.string().min(1),
  contentUz: z.string().optional(),
  contentRu: z.string().optional(),
  categoryId: z.coerce.number().min(1),
  // 0 means "standalone" in the dropdown; converted to null before submit so a
  // lesson can be attached to a module or left on its own.
  moduleId: z.coerce.number().optional(),
  points: z.coerce.number().min(1),
  questions: z.array(questionSchema).min(1),
});

type FormData = z.infer<typeof schema>;

export default function AdminLessonsPage() {
  const { t } = useLang();
  const { can, user: me } = useAuth();
  const { toast } = useToast();

  // `lessons.read.all` opens this page, and a moderator holds it — while holding
  // none of create, update, publish or delete. Every action on the page answered
  // 403 for them, and an author saw a publish toggle that is admin-only.
  const canCreate = can("lessons.create");
  const canPublish = can("lessons.publish");
  const canDelete = can("lessons.delete");
  const canEditAny = can("lessons.update.any");
  // Same rule as the challenge list: an author may edit their own drafts only,
  // so a lesson someone else wrote gets no edit button rather than a 403.
  const canEditThis = (authorId: number | null | undefined) =>
    canEditAny || (can("lessons.update.own") && authorId != null && authorId === me?.id);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [offset, setOffset] = useState(0);
  const { data: lessonsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-lessons", offset],
    queryFn: async () => {
      const res = await fetch(`/api/admin/lessons?limit=${PAGE_SIZE}&offset=${offset}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admin lessons");
      return res.json();
    }
  });
  const { data: categories } = useListLearnCategories({ query: { queryKey: getListLearnCategoriesQueryKey() } });
  const { data: modulesData } = useListModules({ query: { queryKey: getListModulesQueryKey() } });
  const moduleList = normalizeArray<{ id: number; title: string; titleUz?: string | null; titleRu?: string | null }>(modulesData, ["id", "title"]);
  // The admin endpoint returns AdminLesson — same rows plus authorId and
  // isPublished. normalizeLessons types them as the public Lesson, which has
  // neither, so the publish state was invisible to the compiler too.
  const lessonList = normalizeArray<AdminLesson>(lessonsData, ["lessons", "data", "items"]);
  const total = typeof (lessonsData as any)?.total === "number" ? (lessonsData as any).total : lessonList.length;
  const categoryList = normalizeLearnCategories(categories);

  const createLesson = useAdminCreateLesson();
  const updateLesson = useAdminUpdateLesson();
  const deleteLesson = useAdminDeleteLesson();
  const publishLesson = usePublishLesson();

  /**
   * Publishing, which the panel could not do at all.
   *
   * POST /admin/lessons/:id/publish existed and had no caller anywhere in the
   * app, and the list did not even show the state — so a draft written by an
   * author was invisible to learners with no way for anyone to make it live.
   */
  const togglePublish = (id: number, next: boolean) => {
    publishLesson.mutate({ id, data: { isPublished: next } }, {
      onSuccess: () => {
        toast({ title: next
          ? t("Lesson is live", "Dars nashr qilindi", "Урок опубликован")
          : t("Lesson hidden", "Dars yashirildi", "Урок скрыт") });
        void refetch();
      },
      onError: e => toast(errorToast(t, e)),
    });
  };

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", content: "", categoryId: 1, moduleId: 0, points: 50,
      questions: [{ question: "", options: ["", "", "", ""], correctOption: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  const openCreate = () => { setEditingId(null); form.reset({ title: "", content: "", categoryId: categoryList[0]?.id ?? 1, moduleId: 0, points: 50, questions: [{ question: "", options: ["", "", "", ""], correctOption: 0 }] }); setShowForm(true); };

  // Surface the server's actual message instead of a blank "Xato". The client
  // throws an ApiError carrying the reason the request failed (a missing field,
  // a permission, a bad category) — swallowing it left an admin with no idea
  // what to fix.
  const errText = (e: unknown) =>
    (e as { message?: string })?.message || t("Error", "Xato", "Ошибка");

  const onSubmit = (raw: FormData) => {
    // 0 in the dropdown means "no module" — send it as null so the lesson is
    // standalone rather than attached to module id 0.
    const data = {
      ...raw,
      moduleId: raw.moduleId ? raw.moduleId : null,
      questions: raw.questions.map(q => {
        const options = trimTrailingBlanks(q.options);
        // Same length as `options`, so correctOption indexes all three lists.
        const align = (list: (string | undefined)[] | null | undefined) => {
          if (!list) return null;
          const cut = options.map((_, i) => (list[i] ?? "").trim());
          return cut.some(Boolean) ? cut : null;
        };
        return {
          ...q,
          options,
          questionUz: q.questionUz?.trim() || null,
          questionRu: q.questionRu?.trim() || null,
          optionsUz: align(q.optionsUz),
          optionsRu: align(q.optionsRu),
        };
      }),
      contentUz: raw.contentUz?.trim() || null,
      contentRu: raw.contentRu?.trim() || null,
      titleUz: raw.titleUz?.trim() || null,
      titleRu: raw.titleRu?.trim() || null,
    };
    const invalidate = () => { void qc.invalidateQueries({ queryKey: ["admin-lessons"] }); setShowForm(false); };
    if (editingId) {
      updateLesson.mutate({ id: editingId, data }, {
        onSuccess: () => { toast({ title: t("Lesson updated!", "Dars yangilandi!", "Урок обновлён!") }); invalidate(); },
        onError: (e) => toast({ title: errText(e), variant: "destructive" }),
      });
    } else {
      createLesson.mutate({ data }, {
        onSuccess: () => { toast({ title: t("Lesson created!", "Dars yaratildi!", "Урок создан!") }); invalidate(); },
        onError: (e) => toast({ title: errText(e), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm(t("Delete this lesson? Every learner's attempt and progress on it is deleted too.",
        "Bu dars o'chirilsinmi? Har bir o'quvchining urinishi va progressi ham o'chadi.",
        "Удалить урок? Все попытки и прогресс учащихся по нему также удалятся."))) return;
    deleteLesson.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Deleted", "O'chirildi", "Удалено") }); void qc.invalidateQueries({ queryKey: ["admin-lessons"] }); },
      onError: (e) => toast({ title: errText(e), variant: "destructive" }),
    });
  };

  return (
    <div className="flex min-h-screen bg-background pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("Lessons", "Darslar", "Уроки")}</h1>
          {canCreate && (
            <Button size="sm" onClick={openCreate} className="gap-1.5" data-testid="button-create-lesson">
              <Plus className="w-4 h-4" /> {t("Create Lesson", "Dars Yaratish", "Создать урок")}
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editingId ? t("Edit Lesson", "Darsni Tahrirlash", "Редактировать") : t("New Lesson", "Yangi Dars", "Новый урок")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>{t("Title (EN)", "Sarlavha (EN)", "Заголовок (EN)")}</FormLabel><FormControl><Input {...field} data-testid="input-lesson-title" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="titleUz" render={({ field }) => (
                    <FormItem><FormLabel>{t("Title (UZ)", "Sarlavha (UZ)", "Заголовок (UZ)")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="titleRu" render={({ field }) => (
                    <FormItem><FormLabel>{t("Title (RU)", "Sarlavha (RU)", "Заголовок (RU)")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel>{t("Category", "Kategoriya", "Категория")}</FormLabel>
                      <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl><SelectTrigger data-testid="select-lesson-category"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{categoryList.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  {/* Attach the lesson to a module so it appears in that module's
                      list and roadmap. Without this an admin-created lesson had
                      no module and showed up nowhere in the curriculum. */}
                  <FormField control={form.control} name="moduleId" render={({ field }) => (
                    <FormItem><FormLabel>{t("Module", "Modul", "Модуль")}</FormLabel>
                      <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value ?? 0)}>
                        <FormControl><SelectTrigger data-testid="select-lesson-module"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">{t("Standalone (no module)", "Mustaqil (modulsiz)", "Отдельный (без модуля)")}</SelectItem>
                          {moduleList.map(m => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {t(m.title, m.titleUz ?? undefined, m.titleRu ?? undefined)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="points" render={({ field }) => (
                    <FormItem><FormLabel>{t("Points", "Ball", "Очки")}</FormLabel><FormControl><Input {...field} type="number" data-testid="input-lesson-points" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem><FormLabel>{t("Content (EN) - supports markdown + code blocks", "Kontent (EN) - markdown va kod bloklarini qo'llaydi", "Контент (EN) - поддерживает markdown и блоки кода")}</FormLabel><FormControl><Textarea {...field} rows={6} placeholder="## Introduction&#10;&#10;```bash&#10;sudo apt update&#10;```" data-testid="input-lesson-content" /></FormControl><FormMessage /></FormItem>
                )} />
                {/* Most learners here read Uzbek. A lesson with no contentUz
                    falls back to English on the lesson page. */}
                <FormField control={form.control} name="contentUz" render={({ field }) => (
                  <FormItem><FormLabel>{t("Content (UZ)", "Kontent (UZ)", "Контент (UZ)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={6} data-testid="input-lesson-content-uz" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="contentRu" render={({ field }) => (
                  <FormItem><FormLabel>{t("Content (RU)", "Kontent (RU)", "Контент (RU)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={6} data-testid="input-lesson-content-ru" /></FormControl></FormItem>
                )} />

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">{t("Test Questions", "Test savollari", "Тестовые вопросы")}</label>
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ question: "", options: ["", "", "", ""], correctOption: 0 })} className="gap-1 h-7 text-xs">
                      <PlusCircle className="w-3.5 h-3.5" /> {t("Add Question", "Savol qo'shish", "Добавить вопрос")}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {fields.map((field, qi) => (
                      <div key={field.id} className="p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-muted-foreground">{t("Question", "Savol", "Вопрос")} {qi + 1}</span>
                          {fields.length > 1 && <button type="button" onClick={() => remove(qi)}><MinusCircle className="w-4 h-4 text-destructive" /></button>}
                        </div>
                        <FormField control={form.control} name={`questions.${qi}.question`} render={({ field: f }) => (
                          <FormItem className="mb-3"><FormControl><Input {...f} placeholder={t("Question text", "Savol matni", "Текст вопроса")} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {[0, 1, 2, 3].map(oi => (
                            <FormField key={oi} control={form.control} name={`questions.${qi}.options.${oi}`} render={({ field: f }) => (
                              <FormItem><FormControl><Input {...f} placeholder={`${t("Option", "Variant", "Вариант")} ${String.fromCharCode(65 + oi)}`} /></FormControl><FormMessage /></FormItem>
                            )} />
                          ))}
                        </div>
                        {/* Collapsed by default: the columns exist and the lesson
                            test renders them, but nothing could ever write one. */}
                        <details className="mb-2 rounded border border-border/60 bg-background/40 px-3 py-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground select-none">
                            {t("Translations (UZ / RU)", "Tarjimalar (UZ / RU)", "Переводы (UZ / RU)")}
                          </summary>
                          <div className="mt-3 space-y-2">
                            {(["Uz", "Ru"] as const).map(suffix => (
                              <div key={suffix} className="space-y-2">
                                <FormField control={form.control} name={`questions.${qi}.question${suffix}`} render={({ field: f }) => (
                                  <FormItem><FormControl><Input {...f} value={f.value ?? ""} placeholder={`${t("Question", "Savol", "Вопрос")} (${suffix.toUpperCase()})`} data-testid={`input-question-${qi}-${suffix.toLowerCase()}`} /></FormControl></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-2">
                                  {[0, 1, 2, 3].map(oi => (
                                    <FormField key={oi} control={form.control} name={`questions.${qi}.options${suffix}.${oi}`} render={({ field: f }) => (
                                      <FormItem><FormControl><Input {...f} value={f.value ?? ""} placeholder={`${t("Option", "Variant", "Вариант")} ${String.fromCharCode(65 + oi)} (${suffix.toUpperCase()})`} /></FormControl></FormItem>
                                    )} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                        <FormField control={form.control} name={`questions.${qi}.correctOption`} render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">{t("Correct Answer", "To'g'ri javob", "Правильный ответ")}</FormLabel>
                            <Select onValueChange={v => f.onChange(Number(v))} defaultValue={String(f.value)}>
                              <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>{[0, 1, 2, 3].map(i => <SelectItem key={i} value={String(i)}>{t("Option", "Variant", "Вариант")} {String.fromCharCode(65 + i)}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>{t("Cancel", "Bekor", "Отмена")}</Button>
                  <Button type="submit" size="sm" disabled={createLesson.isPending || updateLesson.isPending} data-testid="button-submit-lesson-form">
                    {editingId ? t("Update", "Yangilash", "Обновить") : t("Create", "Yaratish", "Создать")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (
          <>
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Title", "Sarlavha", "Заголовок")}</th>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Category", "Kategoriya", "Категория")}</th>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Points", "Ball", "Очки")}</th>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Status", "Holat", "Статус")}</th>
	                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Actions", "Amallar", "Действия")}</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {lessonList.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-lesson-admin-${lesson.id}`}>
                    <td className="px-4 py-3 font-medium">{lesson.title}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{lesson.categoryName}</td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{lesson.points}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => canPublish && togglePublish(lesson.id, !lesson.isPublished)}
                        disabled={!canPublish}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          lesson.isPublished
                            ? "border-[hsl(var(--neon)/.4)] bg-[hsl(var(--neon)/.1)] text-[hsl(var(--neon))]"
                            : "border-border bg-muted text-muted-foreground"
                        } ${canPublish ? (lesson.isPublished ? "" : "hover:border-primary/40") : "cursor-default"}`}
                        title={!canPublish
                          ? t("Only an admin can publish", "Faqat admin nashr qila oladi", "Публиковать может только админ")
                          : lesson.isPublished
                            ? t("Click to hide from learners", "O'quvchilardan yashirish uchun bosing", "Нажмите, чтобы скрыть")
                            : t("Click to publish", "Nashr qilish uchun bosing", "Нажмите, чтобы опубликовать")}
                        data-testid={`toggle-publish-lesson-${lesson.id}`}
                      >
                        {lesson.isPublished ? t("Live", "Nashrda", "Опубликован") : t("Draft", "Qoralama", "Черновик")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {canEditThis(lesson.authorId) && <Button size="sm" variant="ghost" onClick={async () => { 
                          try {
                            const res = await fetch(`/api/admin/lessons/${lesson.id}`, { credentials: "include" });
                            if (!res.ok) throw new Error();
                            const data = await res.json();
                            setEditingId(lesson.id);
                            form.reset({
                              title: data.title || "",
                              titleUz: data.titleUz || data.title_uz || "",
                              titleRu: data.titleRu || data.title_ru || "",
                              content: data.content || "",
                              contentUz: data.contentUz || data.content_uz || "",
                              contentRu: data.contentRu || data.content_ru || "",
                              categoryId: data.categoryId,
                              moduleId: data.moduleId ?? data.module_id ?? 0,
                              points: data.points,
                              // Carry the translations through the round trip,
                              // into the fields under "Translations (UZ / RU)".
                              questions: data.questions?.map((q: any) => ({
                                question: q.question,
                                questionUz: q.questionUz ?? null,
                                questionRu: q.questionRu ?? null,
                                options: q.options || ["", "", "", ""],
                                optionsUz: q.optionsUz ?? null,
                                optionsRu: q.optionsRu ?? null,
                                correctOption: q.correctOption,
                              })) || [{ question: "", options: ["", "", "", ""], correctOption: 0 }],
                            });
                            setShowForm(true);
                          } catch (e) {
                            toast({ title: t("Failed to load lesson details", "Dars ma'lumotlarini yuklab bo'lmadi", "Не удалось загрузить данные урока"), variant: "destructive" });
                          }
                        }} className="h-7 w-7 p-0" data-testid={`button-edit-lesson-${lesson.id}`}><Pencil className="w-3.5 h-3.5" /></Button>}
                        {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(lesson.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" data-testid={`button-delete-lesson-${lesson.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />
          </>
        )}
      </main>
    </div>
  );
}
