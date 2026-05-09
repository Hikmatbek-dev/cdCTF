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
import { normalizeLearnCategories, normalizeLessons } from "@/lib/api-shapes";
import { useListLessons, getListLessonsQueryKey, useListLearnCategories, getListLearnCategoriesQueryKey, useAdminCreateLesson, useAdminUpdateLesson, useAdminDeleteLesson } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctOption: z.coerce.number().min(0),
});

const schema = z.object({
  title: z.string().min(1),
  titleUz: z.string().optional(),
  titleRu: z.string().optional(),
  content: z.string().min(1),
  contentUz: z.string().optional(),
  contentRu: z.string().optional(),
  categoryId: z.coerce.number().min(1),
  points: z.coerce.number().min(1),
  questions: z.array(questionSchema).min(1),
});

type FormData = z.infer<typeof schema>;

export default function AdminLessonsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: lessons, isLoading } = useListLessons({}, { query: { queryKey: getListLessonsQueryKey({}) } });
  const { data: categories } = useListLearnCategories({ query: { queryKey: getListLearnCategoriesQueryKey() } });
  const lessonList = normalizeLessons(lessons);
  const categoryList = normalizeLearnCategories(categories);

  const createLesson = useAdminCreateLesson();
  const updateLesson = useAdminUpdateLesson();
  const deleteLesson = useAdminDeleteLesson();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", content: "", categoryId: 1, points: 50,
      questions: [{ question: "", options: ["", "", "", ""], correctOption: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  const openCreate = () => { setEditingId(null); form.reset({ title: "", content: "", categoryId: categoryList[0]?.id ?? 1, points: 50, questions: [{ question: "", options: ["", "", "", ""], correctOption: 0 }] }); setShowForm(true); };

  const onSubmit = (data: FormData) => {
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListLessonsQueryKey({}) }); setShowForm(false); };
    if (editingId) {
      updateLesson.mutate({ id: editingId, data }, {
        onSuccess: () => { toast({ title: t("Lesson updated!", "Dars yangilandi!", "Урок обновлён!") }); invalidate(); },
        onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
      });
    } else {
      createLesson.mutate({ data }, {
        onSuccess: () => { toast({ title: t("Lesson created!", "Dars yaratildi!", "Урок создан!") }); invalidate(); },
        onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm(t("Delete this lesson?", "O'chirish?", "Удалить?"))) return;
    deleteLesson.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Deleted", "O'chirildi", "Удалено") }); qc.invalidateQueries({ queryKey: getListLessonsQueryKey({}) }); },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("Lessons", "Darslar", "Уроки")}</h1>
          <Button size="sm" onClick={openCreate} className="gap-1.5" data-testid="button-create-lesson">
            <Plus className="w-4 h-4" /> {t("Create Lesson", "Dars Yaratish", "Создать урок")}
          </Button>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel>{t("Category", "Kategoriya", "Категория")}</FormLabel>
                      <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                        <FormControl><SelectTrigger data-testid="select-lesson-category"><SelectValue /></SelectTrigger></FormControl>
	                        <SelectContent>{categoryList.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
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

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Title", "Sarlavha", "Заголовок")}</th>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Category", "Kategoriya", "Категория")}</th>
	                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Points", "Ball", "Очки")}</th>
	                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Actions", "Amallar", "Действия")}</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {lessonList.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-lesson-admin-${lesson.id}`}>
                    <td className="px-4 py-3 font-medium">{lesson.title}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{lesson.categoryName}</td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{lesson.points}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(lesson.id); form.reset({ title: lesson.title, content: "", categoryId: lesson.categoryId, points: lesson.points, questions: [{ question: "", options: ["", "", "", ""], correctOption: 0 }] }); setShowForm(true); }} className="h-7 w-7 p-0" data-testid={`button-edit-lesson-${lesson.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(lesson.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" data-testid={`button-delete-lesson-${lesson.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
