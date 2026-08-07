import { useState } from "react";
import { Plus, X, Pencil, Trash2, Copy, Check, KeyRound } from "lucide-react";
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
import { useLang } from "@/lib/LanguageContext";
import { normalizeArray, normalizeCtfChallenges } from "@/lib/api-shapes";
import {
  useAdminListCompetitions, getAdminListCompetitionsQueryKey,
  useAdminCreateCompetition, useAdminUpdateCompetition, useAdminDeleteCompetition,
  type AdminCompetition,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { LoadFailure } from "@/components/LoadFailure";
import { errorToast } from "@/lib/error-toast";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["public", "private"]),
  format: z.enum(["individual", "team"]),
  maxTeamSize: z.string().regex(/^\d*$/, "Numbers only").optional(),
  inviteCode: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  ctfIds: z.array(z.number()).min(1, "Select at least one CTF"),
  sponsorName: z.string().optional(),
  sponsorLogoUrl: z.string().url().optional().or(z.literal("")),
  sponsorUrl: z.string().url().optional().or(z.literal("")),
  telegramUrl: z.string().url().optional().or(z.literal("")),
  prize: z.string().optional(),
  // Blank = use the global default; a number overrides it (0 opens the event).
  inviteRequirement: z.string().regex(/^\d*$/, "Numbers only").optional(),
});

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  name: "", description: "", type: "public", format: "individual", maxTeamSize: "", inviteCode: "", startTime: "", endTime: "",
  ctfIds: [], sponsorName: "", sponsorLogoUrl: "", sponsorUrl: "", telegramUrl: "", prize: "", inviteRequirement: "",
};

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time; the API returns UTC ISO. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(comp: AdminCompetition): "upcoming" | "active" | "ended" {
  const now = Date.now();
  if (now < new Date(comp.startTime).getTime()) return "upcoming";
  if (now > new Date(comp.endTime).getTime()) return "ended";
  return "active";
}

/**
 * The join code, which used to exist only in the database.
 *
 * A private competition is created with a generated eight-character code. It
 * was returned once in the create response, into an onSuccess that read nothing
 * from it, and the public list omits it — so the event was listed, was private,
 * and nobody on earth could join it. Now it is on the card, next to a copy
 * button, because handing it out is the entire workflow.
 */
function InviteCode({ code }: { code: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is blocked without https or a user gesture in some browsers.
      // The code is on screen either way, so there is nothing to recover from.
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2">
      <KeyRound className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="text-xs text-muted-foreground">{t("Join code", "Qo'shilish kodi", "Код входа")}</span>
      <code className="font-mono text-sm font-semibold tracking-wider text-primary" data-testid="text-invite-code">{code}</code>
      <button type="button" onClick={copy} className="ml-auto text-muted-foreground hover:text-primary transition-colors" aria-label={t("Copy", "Nusxalash", "Копировать")}>
        {copied ? <Check className="w-3.5 h-3.5 text-neon" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function AdminCompetitionsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminCompetition | null>(null);
  const [selectedCtfs, setSelectedCtfs] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<AdminCompetition | null>(null);

  // The admin list, not the public one — only this response carries inviteCode.
  const { data, isLoading, isError, refetch } = useAdminListCompetitions({ query: { queryKey: getAdminListCompetitionsQueryKey() } });
  const competitionList = normalizeArray<AdminCompetition>(data?.competitions, ["competitions", "data", "items"]);

  // The admin challenge list, not the public one. The picker used to read
  // GET /api/ctf, which returns one page of *published* challenges — so a
  // competition could not include a draft written for that competition, and
  // could only ever be built from the first page of everything else.
  // limit=200 is the server's cap and this picker wants all of them: it is a
  // checklist, not a browsable list. Without it the endpoint's new default page
  // size silently truncated the choice to the 50 most recent challenges.
  const { data: ctfs } = useQuery({
    queryKey: ["admin-ctfs", "picker"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ctf?limit=200", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admin ctfs");
      return res.json();
    },
  });
  const ctfList = normalizeCtfChallenges(ctfs);

  const createComp = useAdminCreateCompetition();
  const updateComp = useAdminUpdateCompetition();
  const deleteComp = useAdminDeleteCompetition();

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const isPrivate = form.watch("type") === "private";
  const isTeam = form.watch("format") === "team";

  const refresh = () => qc.invalidateQueries({ queryKey: getAdminListCompetitionsQueryKey() });

  const openCreate = () => {
    setEditing(null);
    setSelectedCtfs([]);
    form.reset(EMPTY);
    setShowForm(true);
  };

  const openEdit = (comp: AdminCompetition) => {
    setEditing(comp);
    setSelectedCtfs(comp.ctfIds);
    form.reset({
      name: comp.name,
      description: comp.description ?? "",
      type: comp.type,
      inviteCode: comp.inviteCode ?? "",
      startTime: toLocalInput(comp.startTime),
      endTime: toLocalInput(comp.endTime),
      ctfIds: comp.ctfIds,
      sponsorName: comp.sponsorName ?? "",
      sponsorLogoUrl: comp.sponsorLogoUrl ?? "",
      sponsorUrl: comp.sponsorUrl ?? "",
      telegramUrl: (comp as any).telegramUrl ?? "",
      prize: comp.prize ?? "",
      inviteRequirement: comp.inviteRequirement == null ? "" : String(comp.inviteRequirement),
      format: comp.format === "team" ? "team" : "individual",
      maxTeamSize: comp.maxTeamSize == null ? "" : String(comp.maxTeamSize),
    });
    setShowForm(true);
  };

  const toggleCtf = (id: number) => {
    const next = selectedCtfs.includes(id) ? selectedCtfs.filter(c => c !== id) : [...selectedCtfs, id];
    setSelectedCtfs(next);
    form.setValue("ctfIds", next, { shouldValidate: true });
  };

  const onSubmit = (values: FormData) => {
    const body = {
      name: values.name,
      description: values.description || null,
      type: values.type,
      // A public competition has no code. Sending "" would store an empty string
      // into a column with a unique index, so a second public event would collide.
      inviteCode: values.type === "private" ? (values.inviteCode || null) : null,
      startTime: new Date(values.startTime).toISOString(),
      endTime: new Date(values.endTime).toISOString(),
      ctfIds: selectedCtfs,
      sponsorName: values.sponsorName || null,
      sponsorLogoUrl: values.sponsorLogoUrl || null,
      sponsorUrl: values.sponsorUrl || null,
      telegramUrl: values.telegramUrl || null,
      prize: values.prize || null,
      // Blank field → null → the event falls back to the global default.
      inviteRequirement: values.inviteRequirement ? Number(values.inviteRequirement) : null,
      format: values.format,
      // Only meaningful for a team event; sent as null otherwise.
      maxTeamSize: values.format === "team" && values.maxTeamSize ? Number(values.maxTeamSize) : null,
    };

    const done = (title: string) => () => {
      toast({ title });
      void refresh();
      setShowForm(false);
      setEditing(null);
      setSelectedCtfs([]);
    };
    const failed = (err: unknown) => toast(errorToast(t, err));

    if (editing) {
      updateComp.mutate({ id: editing.id, data: body }, {
        onSuccess: done(t("Competition updated", "Musobaqa yangilandi", "Соревнование обновлено")),
        onError: failed,
      });
    } else {
      createComp.mutate({ data: body }, {
        onSuccess: done(t("Competition created!", "Musobaqa yaratildi!", "Соревнование создано!")),
        onError: failed,
      });
    }
  };

  const doDelete = (comp: AdminCompetition) => {
    deleteComp.mutate({ id: comp.id }, {
      onSuccess: () => {
        toast({ title: t("Competition deleted", "Musobaqa o'chirildi", "Соревнование удалено") });
        void refresh();
        setConfirmDelete(null);
      },
      onError: (err) => toast(errorToast(t, err)),
    });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const saving = createComp.isPending || updateComp.isPending;

  return (
    <div className="flex min-h-screen bg-background pt-28 md:pt-20">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("Competitions", "Musobaqalar", "Соревнования")}</h1>
          <Button size="sm" onClick={openCreate} className="gap-1.5" data-testid="button-create-competition">
            <Plus className="w-4 h-4" /> {t("Create Competition", "Musobaqa Yaratish", "Создать соревнование")}
          </Button>
        </div>

        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">
                {editing
                  ? t("Edit competition", "Musobaqani tahrirlash", "Редактировать соревнование")
                  : t("New Competition", "Yangi Musobaqa", "Новое соревнование")}
              </h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} aria-label={t("Close", "Yopish", "Закрыть")}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name", "Nomi", "Название")}</FormLabel><FormControl><Input {...field} data-testid="input-comp-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>{t("Type", "Turi", "Тип")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-comp-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="public">{t("Public", "Ochiq", "Публичный")}</SelectItem>
                        <SelectItem value="private">{t("Private", "Yopiq", "Приватный")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="format" render={({ field }) => (
                  <FormItem><FormLabel>{t("Play mode", "O'yin turi", "Режим")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-comp-format"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="individual">{t("Individual", "Yakka", "Индивидуальный")}</SelectItem>
                        <SelectItem value="team">{t("Team", "Jamoa", "Командный")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {isTeam && (
                  <FormField control={form.control} name="maxTeamSize" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("Max team size", "Jamoadagi maks. a'zo", "Макс. размер команды")}</FormLabel>
                      <FormControl><Input {...field} inputMode="numeric" placeholder={t("Blank = no limit", "Bo'sh = cheksiz", "Пусто = без лимита")} data-testid="input-comp-max-team-size" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                {isPrivate && (
                  <FormField control={form.control} name="inviteCode" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("Join code", "Qo'shilish kodi", "Код входа")}</FormLabel>
                      <FormControl><Input {...field} placeholder={t("leave empty to generate one", "bo'sh qoldirsangiz avtomatik yaratiladi", "оставьте пустым — сгенерируется")} data-testid="input-comp-invite" /></FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("Participants type this to join. It is shown on the card below after saving.",
                           "Qatnashchilar shu kodni kiritib qo'shiladi. Saqlagandan keyin quyidagi kartada ko'rinadi.",
                           "Участники вводят его, чтобы войти. После сохранения он показан на карточке ниже.")}
                      </p>
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("Description", "Tavsif", "Описание")}</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem><FormLabel>{t("Start Time", "Boshlanish vaqti", "Время начала")}</FormLabel><FormControl><Input {...field} type="datetime-local" data-testid="input-comp-start" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel>{t("End Time", "Tugash vaqti", "Время окончания")}</FormLabel><FormControl><Input {...field} type="datetime-local" data-testid="input-comp-end" /></FormControl><FormMessage /></FormItem>
                )} />
                {/* The join gate. Blank uses the global default; 0 opens the event
                    to anyone — the right choice for the first, bootstrap events. */}
                <FormField control={form.control} name="inviteRequirement" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("Required activated invites", "Kerakli faol takliflar", "Требуется активных приглашений")}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" placeholder={t("Blank = default (5). 0 = open to all", "Bo'sh = standart (5). 0 = hammaga ochiq", "Пусто = по умолчанию (5). 0 = для всех")} data-testid="input-comp-invite-requirement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="telegramUrl" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("Telegram channel (optional)", "Telegram kanal (ixtiyoriy)", "Telegram-канал (необязательно)")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://t.me/your_channel" data-testid="input-comp-telegram" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {/* Sponsorship — optional. Filled in when a competition is sold
                    to a sponsor; leaving them blank keeps the event unbranded. */}
                <div className="col-span-2 rounded-lg border border-dashed border-border p-4">
                  <p className="text-sm font-medium mb-1">{t("Sponsorship (optional)", "Homiylik (ixtiyoriy)", "Спонсорство (необязательно)")}</p>
                  <p className="text-xs text-muted-foreground mb-3">{t("Credit a sponsor and show the prize on the event page.", "Homiyni ko'rsating va sovrinni tadbir sahifasida chiqaring.", "Укажите спонсора и приз на странице события.")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="sponsorName" render={({ field }) => (
                      <FormItem><FormLabel>{t("Sponsor name", "Homiy nomi", "Название спонсора")}</FormLabel><FormControl><Input {...field} placeholder="IT Park Uzbekistan" data-testid="input-comp-sponsor-name" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="prize" render={({ field }) => (
                      <FormItem><FormLabel>{t("Prize", "Sovrin", "Приз")}</FormLabel><FormControl><Input {...field} placeholder={t("e.g. 5,000,000 UZS + internship", "mas. 5 000 000 so'm + amaliyot", "напр. 5 000 000 сум + стажировка")} data-testid="input-comp-prize" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="sponsorLogoUrl" render={({ field }) => (
                      <FormItem><FormLabel>{t("Logo URL", "Logo havolasi", "URL логотипа")}</FormLabel><FormControl><Input {...field} placeholder="https://…/logo.png" data-testid="input-comp-sponsor-logo" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sponsorUrl" render={({ field }) => (
                      <FormItem><FormLabel>{t("Sponsor link", "Homiy havolasi", "Ссылка спонсора")}</FormLabel><FormControl><Input {...field} placeholder="https://itpark.uz" data-testid="input-comp-sponsor-url" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium mb-2 block">
                    {t("CTF Challenges", "CTF topshiriqlari", "CTF задания")} ({selectedCtfs.length} {t("selected", "tanlandi", "выбрано")})
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 bg-muted/20 rounded border border-border">
                    {ctfList.map(ch => (
                      <button key={ch.id} type="button" onClick={() => toggleCtf(ch.id)} className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${selectedCtfs.includes(ch.id) ? "bg-primary/20 text-primary border border-primary/30" : "hover:bg-muted border border-transparent"}`} data-testid={`button-ctf-select-${ch.id}`}>
                        {ch.name}
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.ctfIds && <p className="text-destructive text-xs mt-1">{form.formState.errors.ctfIds.message}</p>}
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>{t("Cancel", "Bekor", "Отмена")}</Button>
                  <Button type="submit" size="sm" disabled={saving} data-testid="button-submit-comp-form">
                    {editing ? t("Save", "Saqlash", "Сохранить") : t("Create", "Yaratish", "Создать")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {isError ? (
          <LoadFailure onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : competitionList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {t("No competitions yet.", "Hali musobaqa yo'q.", "Соревнований пока нет.")}
          </p>
        ) : (
          <div className="space-y-3">
            {competitionList.map(comp => {
              const status = statusOf(comp);
              return (
                <div key={comp.id} className="p-4 rounded-xl border border-border bg-card" data-testid={`card-competition-admin-${comp.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium">{comp.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded ${status === "active" ? "bg-green-500/10 text-green-500" : status === "upcoming" ? "bg-blue-500/10 text-blue-500" : "bg-muted"}`}>{status}</span>
                        <span>{comp.type}</span>
                        <span>{formatDate(comp.startTime)} — {formatDate(comp.endTime)}</span>
                        <span>{comp.participantCount} {t("participants", "qatnashchi", "участников")}</span>
                        <span>{comp.ctfCount} CTF</span>
                        {comp.sponsorName && <span className="text-primary">{comp.sponsorName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(comp)} data-testid={`button-edit-comp-${comp.id}`} aria-label={t("Edit", "Tahrirlash", "Редактировать")}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(comp)} className="text-destructive hover:text-destructive" data-testid={`button-delete-comp-${comp.id}`} aria-label={t("Delete", "O'chirish", "Удалить")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {comp.type === "private" && comp.inviteCode && <InviteCode code={comp.inviteCode} />}

                  {confirmDelete?.id === comp.id && (
                    <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                      <p className="text-sm">
                        {t(`Delete "${comp.name}"? Every solve recorded in it is destroyed. This cannot be undone.`,
                           `"${comp.name}" o'chirilsinmi? Undagi barcha yechimlar ham yo'q qilinadi. Buni qaytarib bo'lmaydi.`,
                           `Удалить "${comp.name}"? Все решения в нём будут уничтожены. Отменить нельзя.`)}
                      </p>
                      <div className="flex gap-2 justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>{t("Cancel", "Bekor", "Отмена")}</Button>
                        <Button variant="destructive" size="sm" disabled={deleteComp.isPending} onClick={() => doDelete(comp)} data-testid={`button-confirm-delete-comp-${comp.id}`}>
                          {t("Delete", "O'chirish", "Удалить")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
