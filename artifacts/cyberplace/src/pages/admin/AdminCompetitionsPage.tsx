import { useState } from "react";
import { Plus, X } from "lucide-react";
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
import { useListCompetitions, getListCompetitionsQueryKey, useAdminCreateCompetition, useListCtfChallenges, getListCtfChallengesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["public", "private"]),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  ctfIds: z.array(z.number()).min(1, "Select at least one CTF"),
});

type FormData = z.infer<typeof schema>;

export default function AdminCompetitionsPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedCtfs, setSelectedCtfs] = useState<number[]>([]);

  const { data: competitions, isLoading } = useListCompetitions({ query: { queryKey: getListCompetitionsQueryKey() } });
  const { data: ctfs } = useListCtfChallenges({}, { query: { queryKey: getListCtfChallengesQueryKey({}) } });
  const createComp = useAdminCreateCompetition();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "public", startTime: "", endTime: "", ctfIds: [] },
  });

  const toggleCtf = (id: number) => {
    const next = selectedCtfs.includes(id) ? selectedCtfs.filter(c => c !== id) : [...selectedCtfs, id];
    setSelectedCtfs(next);
    form.setValue("ctfIds", next);
  };

  const onSubmit = (data: FormData) => {
    createComp.mutate({ data: { ...data, ctfIds: selectedCtfs, description: data.description || null, startTime: new Date(data.startTime).toISOString(), endTime: new Date(data.endTime).toISOString() } }, {
      onSuccess: () => { toast({ title: t("Competition created!", "Musobaqa yaratildi!", "Соревнование создано!") }); qc.invalidateQueries({ queryKey: getListCompetitionsQueryKey() }); setShowForm(false); setSelectedCtfs([]); },
      onError: () => toast({ title: t("Error", "Xato", "Ошибка"), variant: "destructive" }),
    });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex min-h-screen bg-background pt-14">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t("Competitions", "Musobaqalar", "Соревнования")}</h1>
          <Button size="sm" onClick={() => { setShowForm(true); setSelectedCtfs([]); form.reset(); }} className="gap-1.5" data-testid="button-create-competition">
            <Plus className="w-4 h-4" /> {t("Create Competition", "Musobaqa Yaratish", "Создать соревнование")}
          </Button>
        </div>

        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{t("New Competition", "Yangi Musobaqa", "Новое соревнование")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("Name", "Nomi", "Название")}</FormLabel><FormControl><Input {...field} data-testid="input-comp-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>{t("Type", "Turi", "Тип")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-comp-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="public">{t("Public", "Ochiq", "Публичный")}</SelectItem>
                        <SelectItem value="private">{t("Private", "Yopiq", "Приватный")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>{t("Description", "Tavsif", "Описание")}</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem><FormLabel>{t("Start Time", "Boshlanish vaqti", "Время начала")}</FormLabel><FormControl><Input {...field} type="datetime-local" data-testid="input-comp-start" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel>{t("End Time", "Tugash vaqti", "Время окончания")}</FormLabel><FormControl><Input {...field} type="datetime-local" data-testid="input-comp-end" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-2 block">
                    {t("CTF Challenges", "CTF topshiriqlari", "CTF задания")} ({selectedCtfs.length} {t("selected", "tanlandi", "выбрано")})
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 bg-muted/20 rounded border border-border">
                    {ctfs?.map(ch => (
                      <button key={ch.id} type="button" onClick={() => toggleCtf(ch.id)} className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${selectedCtfs.includes(ch.id) ? "bg-primary/20 text-primary border border-primary/30" : "hover:bg-muted border border-transparent"}`} data-testid={`button-ctf-select-${ch.id}`}>
                        {ch.name}
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.ctfIds && <p className="text-destructive text-xs mt-1">{form.formState.errors.ctfIds.message}</p>}
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>{t("Cancel", "Bekor", "Отмена")}</Button>
                  <Button type="submit" size="sm" disabled={createComp.isPending} data-testid="button-submit-comp-form">
                    {t("Create", "Yaratish", "Создать")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : (
          <div className="space-y-3">
            {competitions?.map(comp => (
              <div key={comp.id} className="p-4 rounded-xl border border-border bg-card" data-testid={`card-competition-admin-${comp.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{comp.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className={`px-1.5 py-0.5 rounded ${comp.status === "active" ? "bg-green-500/10 text-green-500" : comp.status === "upcoming" ? "bg-blue-500/10 text-blue-500" : "bg-muted"}`}>{comp.status}</span>
                      <span>{comp.type}</span>
                      <span>{formatDate(comp.startTime)} — {formatDate(comp.endTime)}</span>
                      <span>{comp.participantCount} {t("participants", "qatnashchi", "участников")}</span>
                      <span>{comp.ctfCount} CTF</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
