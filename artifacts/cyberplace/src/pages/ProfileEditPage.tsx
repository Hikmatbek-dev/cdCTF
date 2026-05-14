import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Lock, Trash2, Shield, User, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const profileSchema = z.object({
  nickname: z.string().min(3, "Min 3 chars").max(32, "Max 32 chars"),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Required"),
  newPassword: z.string()
    .min(10, "At least 10 chars")
    .regex(/[A-Z]/, "Include uppercase")
    .regex(/[a-z]/, "Include lowercase")
    .regex(/\d/, "Include number")
    .regex(/[^A-Za-z0-9]/, "Include symbol"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfileEditPage() {
  const { user, updateUser, logout } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const updateProfile = useUpdateUserProfile();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: user?.nickname ?? "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onUpdateProfile = (data: ProfileFormData) => {
    if (!user) return;
    if (data.nickname === user.nickname) {
      toast({ title: t("No changes", "O'zgarish yo'q", "Нет изменений") });
      return;
    }
    updateProfile.mutate(
      { id: user.id, data: { nickname: data.nickname } },
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

  const onChangePassword = async (data: PasswordFormData) => {
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update password");
      
      toast({ title: t("Password updated!", "Parol yangilandi!", "Пароль обновлён!") });
      passwordForm.reset();
    } catch (err) {
      toast({ title: t("Error", "Xato", "Ошибка"), description: String(err), variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
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

  const handleDeleteAccount = async () => {
    if (!confirm(t("Are you sure? This action is permanent!", "Ishonchingiz komilmi? Bu amalni ortga qaytarib bo'lmaydi!", "Вы уверены? Это действие необратимо!"))) return;
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        logout();
        setLocation("/");
        toast({ title: t("Account deleted", "Hisob o'chirildi", "Аккаунт удалён") });
      } else {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
    } catch (err) {
      toast({ title: t("Error", "Xato", "Ошибка"), description: String(err), variant: "destructive" });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-14 pb-12">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <User className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">{t("Settings", "Sozlamalar", "Настройки")}</h1>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <section className="p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("Profile Identity", "Profil Shaxsi", "Идентификация профиля")}</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden border-2 border-primary/20 transition-all group-hover:border-primary/50">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.nickname[0].toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  disabled={uploading}
                >
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-lg">{user.nickname}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
                <Button variant="link" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="p-0 h-auto mt-2 text-primary">
                  {uploading ? t("Uploading...", "Yuklanmoqda...", "Загрузка...") : t("Change profile picture", "Profil rasmini o'zgartirish", "Изменить фото")}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>
          </section>

          {/* Profile Form */}
          <section className="p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("Nickname Settings", "Taxallus Sozlamalari", "Настройки никнейма")}</h2>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                <FormField control={profileForm.control} name="nickname" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("New Nickname", "Yangi Taxallus", "Новый никнейм")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={user.nickname} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={updateProfile.isPending} className="px-8">
                  {updateProfile.isPending ? t("Saving...", "Saqlanmoqda...", "Сохранение...") : t("Update Nickname", "Taxallusni Yangilash", "Обновить никнейм")}
                </Button>
              </form>
            </Form>
          </section>

          {/* Password Section */}
          <section className="p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("Security", "Xavfsizlik", "Безопасность")}</h2>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                <FormField control={passwordForm.control} name="oldPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Current Password", "Joriy Parol", "Текущий пароль")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type="password" placeholder="••••••••" className="pl-9" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("New Password", "Yangi Parol", "Новый пароль")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="password" placeholder="••••••••" className="pl-9" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Confirm New Password", "Yangi Parolni Tasdiqlang", "Подтвердите новый пароль")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="password" placeholder="••••••••" className="pl-9" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={changingPassword} variant="secondary" className="px-8">
                  {changingPassword ? t("Updating...", "Yangilanmoqda...", "Обновление...") : t("Change Password", "Parolni O'zgartirish", "Сменить пароль")}
                </Button>
              </form>
            </Form>
          </section>

          {/* Danger Zone */}
          <section className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
            <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t("Danger Zone", "Xavfli Hudud", "Опасная зона")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("Once you delete your account, there is no going back. Please be certain.", "Hisobingizni o'chirganingizdan so'ng, uni qayta tiklab bo'lmaydi. Iltimos, ehtiyot bo'ling.", "После удаления аккаунта пути назад нет. Пожалуйста, будьте уверены.")}
            </p>
            <Button variant="destructive" onClick={handleDeleteAccount} className="gap-2">
              <Trash2 className="w-4 h-4" />
              {t("Delete Account", "Hisobni O'chirish", "Удалить аккаунт")}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
