import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  nickname: z.string().min(3, "Min 3 chars").max(32, "Max 32 chars").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function ProfileEditPage() {
  const { user, updateUser } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const updateProfile = useUpdateUserProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: user?.nickname ?? "" },
  });

  const onSubmit = (data: FormData) => {
    if (!user) return;
    const updates: { nickname?: string } = {};
    if (data.nickname && data.nickname !== user.nickname) updates.nickname = data.nickname;
    if (Object.keys(updates).length === 0) {
      toast({ title: t("No changes", "O'zgarish yo'q", "Нет изменений") });
      return;
    }
    updateProfile.mutate(
      { id: user.id, data: updates },
      {
        onSuccess: (res) => {
          updateUser({ ...user, ...res });
          toast({ title: t("Profile updated!", "Profil yangilandi!", "Профиль обновлён!") });
          qc.invalidateQueries({ queryKey: getGetUserProfileQueryKey(user.id) });
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("File too large (max 2MB)", "Fayl juda katta (maks 2MB)", "Файл слишком большой (макс 2МБ)"), variant: "destructive" });
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append("avatar", file);
    setUploading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        updateUser({ ...user, avatarUrl: data.avatarUrl });
        toast({ title: t("Avatar updated!", "Avatar yangilandi!", "Аватар обновлён!") });
      } else {
        toast({ title: data.error || "Upload failed", variant: "destructive" });
        setAvatarPreview(user.avatarUrl ?? null);
      }
    } catch {
      toast({ title: t("Upload failed", "Yuklash muvaffaqiyatsiz", "Ошибка загрузки"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("Edit Profile", "Profilni Tahrirlash", "Редактировать профиль")}</h1>

        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8 p-5 rounded-xl border border-border bg-card">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" data-testid="img-avatar-preview" />
              ) : (
                user.nickname[0].toUpperCase()
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
              disabled={uploading}
              data-testid="button-change-avatar"
            >
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium">{t("Profile Picture", "Profil Rasmi", "Фото профиля")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("PNG, JPG, WEBP up to 2MB", "PNG, JPG, WEBP 2MB gacha", "PNG, JPG, WEBP до 2МБ")}</p>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline mt-1" disabled={uploading} data-testid="button-upload-avatar">
              {uploading ? t("Uploading...", "Yuklanmoqda...", "Загрузка...") : t("Change photo", "Rasmni o'zgartirish", "Изменить фото")}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} data-testid="input-avatar-file" />
        </div>

        {/* Form */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nickname" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Nickname", "Taxallus", "Никнейм")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={user.nickname} data-testid="input-nickname" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <p className="text-sm text-muted-foreground mt-1 bg-muted px-3 py-2 rounded">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("Email cannot be changed", "Email o'zgartirib bo'lmaydi", "Email изменить нельзя")}</p>
              </div>
              <Button type="submit" disabled={updateProfile.isPending} data-testid="button-save-profile">
                {updateProfile.isPending ? t("Saving...", "Saqlanmoqda...", "Сохранение...") : t("Save Changes", "O'zgarishlarni Saqlash", "Сохранить")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
