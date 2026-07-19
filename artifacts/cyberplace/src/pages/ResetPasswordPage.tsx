import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { Shield, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";

const schema = z.object({
  password: z.string()
    .min(10, "At least 10 chars")
    .regex(/[A-Z]/, "Include uppercase")
    .regex(/[a-z]/, "Include lowercase")
    .regex(/\d/, "Include number")
    .regex(/[^A-Za-z0-9]/, "Include symbol"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  const token = query.get("token");

  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({ title: t("Error", "Xato", "Ошибка"), description: "Missing token", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to reset password");
      
      setIsSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err) {
      toast({ title: t("Error", "Xato", "Ошибка"), description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center">
          <h1 className="text-xl font-bold text-destructive mb-2">{t("Invalid Request", "Noto'g'ri so'rov", "Неверный запрос")}</h1>
          <p className="text-muted-foreground mb-4">{t("Missing or invalid reset token.", "Tiklash tokeni yo'q yoki noto'g'ri.", "Отсутствует или неверный токен.")}</p>
          <Link href="/login">
            <Button variant="outline">{t("Back to Login", "Kirishga qaytish", "Назад ko входу")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("Password Reset!", "Parol yangilandi!", "Пароль изменен!")}</h1>
          <p className="text-muted-foreground mb-8">
            {t("Your password has been successfully updated. Redirecting to login...", "Sizning parolingiz muvaffaqiyatli yangilandi. Kirishga yo'naltirilmoqda...", "Ваш пароль успешно обновлен. Перенаправляем на вход...")}
          </p>
          <Link href="/login">
            <Button className="w-full gap-2">
              {t("Login Now", "Hozir kirish", "Войти сейчас")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background pt-14">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t("New Password", "Yangi Parol", "Новый пароль")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Create a strong new password for your account", "Hisobingiz uchun yangi kuchli parol yarating", "Создайте новый надежный пароль")}
          </p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("New Password", "Yangi Parol", "Новый пароль")}</FormLabel>
                  <div className="relative">
                    <Lock aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" className="pl-9" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Confirm Password", "Parolni tasdiqlang", "Подтвердите пароль")}</FormLabel>
                  <div className="relative">
                    <Lock aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" className="pl-9" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("Updating...", "Yangilanmoqda...", "Обновление...") : t("Update Password", "Parolni yangilash", "Обновить пароль")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
