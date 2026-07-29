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
import { useAuth } from "@/lib/AuthContext";
import { Pager, PAGE_SIZE } from "@/components/Pager";
import { LoadFailure } from "@/components/LoadFailure";
import { errorToast } from "@/lib/error-toast";
import { normalizeCtfChallenges } from "@/lib/api-shapes";
import { useAdminCreateCtf, useAdminUpdateCtf, useAdminDeleteCtf , usePublishCtf } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";

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
  flag: z.string().optional(),
  // The hint the challenge page sells for points. Every one of these columns
  // exists, is in the request body schema and is in the RBAC allowlist — the
  // form simply never rendered a field for any of them, so a hint could only be
  // written by hand in SQL. Same for the uz/ru descriptions below.
  hint: z.string().optional(),
  hintUz: z.string().optional(),
  hintRu: z.string().optional(),
  hintCost: z.coerce.number().min(0).optional(),
  fileUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "Web", "Crypto", "Reverse", "Forensics", "Pwn", "OSINT", 
  "Steganography", "Miscellaneous", "Mobile", "Hardware", 
  "Networking", "Cloud", "AI", "Scripting", "Others"
];
const MAX_CHALLENGE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export default function AdminCtfPage() {
  const { t } = useLang();
  const { can, user: me } = useAuth();
  const { toast } = useToast();

  // The page is reached with `ctf.read.all`, which authors and moderators both
  // hold — but deleting, publishing and creating are separate permissions they
  // do not. Every one of these buttons was rendered for them and answered 403.
  // A button you are not allowed to press should not be there to press.
  const canCreate = can("ctf.create");
  const canPublish = can("ctf.publish");
  const canDelete = can("ctf.delete");
  const canEditAny = can("ctf.update.any");
  // An author holds `ctf.update.own`, so the server refuses an edit to someone
  // else's challenge. Mirroring that here means the button is absent rather
  // than present-and-403 — the same rule canEditResource applies server-side.
  const canEditThis = (authorId: number | null | undefined) =>
    canEditAny || (can("ctf.update.own") && authorId != null && authorId === me?.id);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [offset, setOffset] = useState(0);
  const { data: challengesData, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-ctfs", offset],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ctf?limit=${PAGE_SIZE}&offset=${offset}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admin ctfs");
      return res.json();
    }
  });
  const challengeList = normalizeCtfChallenges(challengesData);
  const total = typeof challengesData?.total === "number" ? challengesData.total : challengeList.length;

  const createCtf = useAdminCreateCtf();
  const updateCtf = useAdminUpdateCtf();
  const deleteCtf = useAdminDeleteCtf();
  const publishCtf = usePublishCtf();

  /**
   * Publishing, which the panel could not do at all.
   *
   * POST /admin/ctf/:id/publish existed with no caller. Authors create drafts
   * by design (`isPublished` is set from the `ctf.publish` permission), so an
   * author's challenge was invisible to learners and there was no way for an
   * admin to make it live — or to pull a broken one down.
   */
  const togglePublish = (id: number, next: boolean) => {
    publishCtf.mutate({ id, data: { isPublished: next } }, {
      onSuccess: () => {
        toast({ title: next
          ? t("Challenge is live", "Topshiriq nashr qilindi", "Задание опубликовано")
          : t("Challenge hidden", "Topshiriq yashirildi", "Задание скрыто") });
        void refetch();
      },
      onError: e => toast(errorToast(t, e)),
    });
  };

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
      flag: "",
      hint: "",
      hintUz: "",
      hintRu: "",
      hintCost: 0,
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
      flag: "",
      hint: "",
      hintUz: "",
      hintRu: "",
      hintCost: 0,
      fileUrl: "",
    });
    setShowForm(true);
  };
  const openEdit = async (ch: any) => {
    try {
      const res = await fetch(`/api/admin/ctf/${ch.id}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      setEditingId(ch.id);
      form.reset({
        name: data.name || "",
        nameUz: data.nameUz || data.name_uz || "",
        nameRu: data.nameRu || data.name_ru || "",
        description: data.description || "",
        descriptionUz: data.descriptionUz || data.description_uz || "",
        descriptionRu: data.descriptionRu || data.description_ru || "",
        category: data.category || "Web",
        difficulty: (data.difficulty) || "easy",
        points: data.points || 100,
        flag: "",
        hint: data.hint || "",
        hintUz: data.hintUz || data.hint_uz || "",
        hintRu: data.hintRu || data.hint_ru || "",
        hintCost: data.hintCost ?? data.hint_cost ?? 0,
        fileUrl: data.fileUrl || data.file_url || "",
      });
      setShowForm(true);
    } catch (e) {
      toast({ title: t("Error loading details", "Tafsilotlarni yuklashda xato", "Ошибка загрузки данных"), variant: "destructive" });
    }
  };

  // Show the server's real reason for a failure, not a blank "Xato".
  const errText = (e: unknown) =>
    (e as { message?: string })?.message || t("Error", "Xato", "Ошибка");

  const onSubmit = (data: FormData) => {
    if (!editingId && (!data.flag || !data.flag.trim())) {
      form.setError("flag", { message: t("Flag is required for new challenges", "Yangi topshiriq uchun flag majburiy", "Флаг обязателен для новых заданий") });
      return;
    }

    const payload: any = {
      ...data,
      nameUz: data.nameUz || null, nameRu: data.nameRu || null,
      descriptionUz: data.descriptionUz || null, descriptionRu: data.descriptionRu || null,
      hint: data.hint || null, hintUz: data.hintUz || null, hintRu: data.hintRu || null,
      fileUrl: data.fileUrl || null,
    };
    if (editingId && (!data.flag || !data.flag.trim())) {
      delete payload.flag;
    }
    
    const invalidate = () => { void qc.invalidateQueries({ queryKey: ["admin-ctfs"] }); setShowForm(false); };
    if (editingId) {
      updateCtf.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast({ title: t("CTF updated!", "CTF yangilandi!", "CTF обновлён!") }); invalidate(); },
        onError: (e) => toast({ title: errText(e), variant: "destructive" }),
      });
    } else {
      createCtf.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: t("CTF created!", "CTF yaratildi!", "CTF создан!") }); invalidate(); },
        onError: (e) => toast({ title: errText(e), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm(t("Delete this challenge? Every solve is deleted with it, and the points of everyone who solved it are recalculated — they will lose score.",
        "Bu topshiriq o'chirilsinmi? Barcha yechimlar ham o'chadi va uni yechganlarning ballari qayta hisoblanadi — ular ball yo'qotadi.",
        "Удалить задание? Все решения удалятся, а баллы решивших будут пересчитаны — они потеряют очки."))) return;
    deleteCtf.mutate({ id }, {
      onSuccess: () => { toast({ title: t("Deleted", "O'chirildi", "Удалено") }); void qc.invalidateQueries({ queryKey: ["admin-ctfs"] }); },
      onError: (e) => toast({ title: errText(e), variant: "destructive" }),
    });
  };

  const handleChallengeFileUpload = async (file: File) => {
    if (file.size > MAX_CHALLENGE_FILE_SIZE_BYTES) {
      toast({
        title: t("File too large (max 25MB)", "Fayl juda katta (maks 25MB)", "Файл слишком большой (макс. 25МБ)"),
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const signResponse = await fetch("/api/uploads/ctf-file/sign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (signResponse.ok) {
        const signed = await signResponse.json();
        const uploadBody = new FormData();
        // Standard Supabase signed upload expectation
        uploadBody.append("", file);

        const uploadResponse = await fetch(String(signed.signedUrl), {
          method: "PUT",
          body: uploadBody,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text().catch(() => "");
          throw new Error(uploadError || t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"));
        }

        form.setValue("fileUrl", signed.publicUrl, { shouldDirty: true, shouldValidate: true });
        toast({ title: t("File uploaded!", "Fayl yuklandi!", "Файл загружен!") });
        return;
      }

      // If signing failed, check if it's because Supabase is not configured
      const signError = await signResponse.json().catch(() => ({}));
      if (signResponse.status !== 501 && !String(signError?.error).includes("not configured")) {
        throw new Error(typeof signError?.error === "string" ? signError.error : t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"));
      }

      // Fallback to direct multipart upload
      const formData = new FormData();
      formData.append("file", file);

      const directResponse = await fetch("/api/uploads/ctf-file", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const directData = await directResponse.json().catch(() => ({}));
      if (!directResponse.ok) {
        throw new Error(typeof directData?.error === "string" ? directData.error : t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"));
      }

      form.setValue("fileUrl", directData.fileUrl, { shouldDirty: true, shouldValidate: true });
      toast({ title: t("File uploaded (local)!", "Fayl yuklandi (lokal)!", "Файл загружен (локально)!") });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"), variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }

  };

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("CTF Challenges", "CTF Topshiriqlari", "CTF Задания")}</h1>
          {canCreate && (
            <Button size="sm" onClick={openCreate} className="gap-1.5" data-testid="button-create-ctf">
              <Plus className="w-4 h-4" /> {t("Create CTF", "CTF Yaratish", "Создать CTF")}
            </Button>
          )}
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
                  <FormItem><FormLabel>{t("Flag", "Flag", "Флаг")}</FormLabel><FormControl><Input {...field} placeholder={editingId ? t("Leave empty to keep current", "Joriy flagni saqlash uchun bo'sh qoldiring", "Оставьте пустым, чтобы сохранить текущий") : "flag{...}"} className="font-mono" data-testid="input-ctf-flag" /></FormControl><FormMessage /></FormItem>
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
                <FormField control={form.control} name="descriptionUz" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("Description (UZ)", "Tavsif (UZ)", "Описание (UZ)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={3} data-testid="input-ctf-description-uz" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="descriptionRu" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("Description (RU)", "Tavsif (RU)", "Описание (RU)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={3} data-testid="input-ctf-description-ru" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>{t("Category", "Kategoriya", "Категория")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-ctf-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>{t("Difficulty", "Qiyinlik", "Сложность")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                {/* Hints are bought with points on the challenge page. Blank hint
                    text means the buy button never appears, whatever the cost says. */}
                <div className="col-span-2 rounded-lg border border-dashed border-border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">{t("Hint (optional)", "Maslahat (ixtiyoriy)", "Подсказка (необязательно)")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Learners spend points to unlock it. Leave the text blank and no hint is offered.",
                         "O'quvchilar uni ochish uchun ball sarflaydi. Matn bo'sh bo'lsa, maslahat taklif qilinmaydi.",
                         "Ученики тратят очки, чтобы открыть её. Пустой текст — подсказки нет.")}
                    </p>
                  </div>
                  <FormField control={form.control} name="hint" render={({ field }) => (
                    <FormItem><FormLabel>{t("Hint (EN)", "Maslahat (EN)", "Подсказка (EN)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={2} data-testid="input-ctf-hint" /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="hintUz" render={({ field }) => (
                      <FormItem><FormLabel>{t("Hint (UZ)", "Maslahat (UZ)", "Подсказка (UZ)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={2} data-testid="input-ctf-hint-uz" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="hintRu" render={({ field }) => (
                      <FormItem><FormLabel>{t("Hint (RU)", "Maslahat (RU)", "Подсказка (RU)")}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={2} data-testid="input-ctf-hint-ru" /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="hintCost" render={({ field }) => (
                    <FormItem className="max-w-[12rem]"><FormLabel>{t("Cost in points", "Narxi (ball)", "Цена в очках")}</FormLabel><FormControl><Input {...field} value={field.value ?? 0} type="number" min={0} data-testid="input-ctf-hint-cost" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Name", "Nomi", "Название")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Category", "Kategoriya", "Категория")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Difficulty", "Qiyinlik", "Сложность")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Points", "Ball", "Очки")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Solves", "Yechimlar", "Решения")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Status", "Holat", "Статус")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("Actions", "Amallar", "Действия")}</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {challengeList.map((ch: any) => (
                  <tr key={ch.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-ctf-${ch.id}`}>
                    <td className="px-4 py-3 font-medium">{ch.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{ch.category}</td>
                    <td className="px-4 py-3"><DifficultyBadge difficulty={ch.difficulty} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{ch.points}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ch.solvedCount}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => canPublish && togglePublish(ch.id, !ch.isPublished)}
                        disabled={!canPublish}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          ch.isPublished
                            ? "border-[hsl(var(--neon)/.4)] bg-[hsl(var(--neon)/.1)] text-[hsl(var(--neon))]"
                            : "border-border bg-muted text-muted-foreground"
                        } ${canPublish ? (ch.isPublished ? "" : "hover:border-primary/40") : "cursor-default"}`}
                        title={!canPublish
                          ? t("Only an admin can publish", "Faqat admin nashr qila oladi", "Публиковать может только админ")
                          : ch.isPublished
                            ? t("Click to hide from learners", "O'quvchilardan yashirish uchun bosing", "Нажмите, чтобы скрыть")
                            : t("Click to publish", "Nashr qilish uchun bosing", "Нажмите, чтобы опубликовать")}
                        data-testid={`toggle-publish-ctf-${ch.id}`}
                      >
                        {ch.isPublished ? t("Live", "Nashrda", "Опубликовано") : t("Draft", "Qoralama", "Черновик")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {canEditThis(ch.authorId) && <Button size="sm" variant="ghost" onClick={() => openEdit(ch)} className="h-7 w-7 p-0" data-testid={`button-edit-ctf-${ch.id}`}><Pencil className="w-3.5 h-3.5" /></Button>}
                        {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(ch.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" data-testid={`button-delete-ctf-${ch.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>}
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
