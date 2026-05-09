import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { useLang } from "@/lib/LanguageContext";
import { useListCtfChallenges, getListCtfChallengesQueryKey, useAdminCreateCtf, useAdminUpdateCtf, useAdminDeleteCtf } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(1),
  nameUz: z.string().optional(),
  nameRu: z.string().optional(),
  description: z.string().min(1),
  descriptionUz: z.string().optional(),
  descriptionRu: z.string().optional(),
  category: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard", "insane"]),
  points: z.coerce.number().min(1),
  hint: z.string().optional(),
  flag: z.string().min(1),
  fileUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = ["Web", "Crypto", "Reverse", "Forensics", "Pwn", "OSINT", "Steganography", "Others"];

export default function AdminCtfPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: challenges, isLoading } = useListCtfChallenges({}, {
    query: { queryKey: getListCtfChallengesQueryKey({}) },
  });

  const createCtf = useAdminCreateCtf();
  const updateCtf = useAdminUpdateCtf();
  const deleteCtf = useAdminDeleteCtf();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      nameUz: "",
      nameRu: "",
      description: "",
      descriptionUz: "",
      descriptionRu: "",
      category: "Web",
      difficulty: "easy",
      points: 100,
      hint: "",
      flag: "",
      fileUrl: "",
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      name: "",
      nameUz: "",
      nameRu: "",
      description: "",
      descriptionUz: "",
      descriptionRu: "",
      category: "Web",
      difficulty: "easy",
      points: 100,
      hint: "",
      flag: "",
      fileUrl: "",
    });
    setShowForm(true);
  };
  const openEdit = (ch: NonNullable<typeof challenges>[0] & { description?: string; flag?: string }) => {
    setEditingId(ch.id);
    form.reset({
      name: ch.name,
      nameUz: "",
      nameRu: "",
      description: (ch as { description?: string }).description ?? "",
      descriptionUz: "",
      descriptionRu: "",
      category: ch.category,
      difficulty: ch.difficulty as "easy" | "medium" | "hard" | "insane",
      points: ch.points,
      hint: "",
      flag: "",
      fileUrl: "",
    });
    setShowForm(true);
  };

  const onSubmit = (data: FormData) => {
    const payload = { ...data, nameUz: data.nameUz || null, nameRu: data.nameRu || null, descriptionUz: data.descriptionUz || null, descriptionRu: data.descriptionRu || null, hint: data.hint || null, fileUrl: data.fileUrl || null };
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListCtfChallengesQueryKey({}) }); setShowForm(false); };
    if (editingId) {
      updateCtf.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast({ title: t("CTF updated!", "CTF yangilandi!", "CTF обновлён!") }); invalidate(); },
        onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
      });
    } else {
      createCtf.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: t("CTF created!", "CTF yaratildi!", "CTF создан!") }); invalidate(); },
        onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm(t("Delete this challenge?", "O'chirish?", "Удалить?"))) return;
    deleteCtf.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Deleted", "O'chirildi", "Удалено") }); qc.invalidateQueries({ queryKey: getListCtfChallengesQueryKey({}) }); },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  const handleChallengeFileUpload = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    setUploadingFile(true);
    try {
      const response = await fetch("/api/uploads/ctf-file", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"));
      form.setValue("fileUrl", data.fileUrl, { shouldDirty: true, shouldValidate: true });
      toast({ title: t("File uploaded!", "Fayl yuklandi!", "Файл загружен!") });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"), variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("CTF Challenges", "CTF Topshiriqlari", "CTF Задания")}</h1>
          <Button size="sm" onClick={openCreate} className="gap-1.5" data-testid="button-create-ctf">
            <Plus className="w-4 h-4" /> {t("Create CTF", "CTF Yaratish", "Создать CTF")}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editingId ? t("Edit CTF", "CTFni Tahrirlash", "Редактировать CTF") : t("New CTF", "Yangi CTF", "Новый CTF")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name (EN)", "Nomi (EN)", "Название (EN)")}</FormLabel><FormControl><Input {...field} data-testid="input-ctf-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="flag" render={({ field }) => (
                  <FormItem><FormLabel>{t("Flag", "Flag", "Флаг")}</FormLabel><FormControl><Input {...field} placeholder="Flag{...}" className="font-mono" data-testid="input-ctf-flag" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nameUz" render={({ field }) => (
	                  <FormItem><FormLabel>{t("Name (UZ)", "Nomi (UZ)", "Название (UZ)")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="nameRu" render={({ field }) => (
	                  <FormItem><FormLabel>{t("Name (RU)", "Nomi (RU)", "Название (RU)")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("Description (EN)", "Tavsif (EN)", "Описание (EN)")}</FormLabel><FormControl><Textarea {...field} rows={3} data-testid="input-ctf-description" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>{t("Category", "Kategoriya", "Категория")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-ctf-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>{t("Difficulty", "Qiyinlik", "Сложность")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-ctf-difficulty"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["easy", "medium", "hard", "insane"].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="points" render={({ field }) => (
                  <FormItem><FormLabel>{t("Points", "Ball", "Очки")}</FormLabel><FormControl><Input {...field} type="number" data-testid="input-ctf-points" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="hint" render={({ field }) => (
	                  <FormItem><FormLabel>{t("Hint (optional)", "Yordam (ixtiyoriy)", "Подсказка (необязательно)")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="fileUrl" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("File URL (optional)", "Fayl URL (ixtiyoriy)", "URL файла (необязательно)")}</FormLabel>
	                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://..." /></FormControl>
                    <div className="flex items-center gap-2 pt-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingFile}>
                        <Upload className="w-4 h-4" /> {uploadingFile ? t("Uploading...", "Yuklanmoqda...", "Загрузка...") : t("Upload challenge file", "Topshiriq faylini yuklash", "Загрузить файл задания")}
                      </Button>
                      <span className="text-xs text-muted-foreground">{t("Max 25MB", "Maks 25MB", "Макс. 25МБ")}</span>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleChallengeFileUpload(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </FormItem>
                )} />
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>{t("Cancel", "Bekor", "Отмена")}</Button>
                  <Button type="submit" size="sm" disabled={createCtf.isPending || updateCtf.isPending} data-testid="button-submit-ctf-form">
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Name", "Nomi", "Название")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Category", "Kategoriya", "Категория")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Difficulty", "Qiyinlik", "Сложность")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Points", "Ball", "Очки")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Solves", "Yechimlar", "Решения")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Actions", "Amallar", "Действия")}</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {challenges?.map(ch => (
                  <tr key={ch.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-ctf-${ch.id}`}>
                    <td className="px-4 py-3 font-medium">{ch.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{ch.category}</td>
                    <td className="px-4 py-3"><DifficultyBadge difficulty={ch.difficulty} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{ch.points}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ch.solvedCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(ch as Parameters<typeof openEdit>[0])} className="h-7 w-7 p-0" data-testid={`button-edit-ctf-${ch.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(ch.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" data-testid={`button-delete-ctf-${ch.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
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
