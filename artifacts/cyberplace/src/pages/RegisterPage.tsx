import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { TurnstileWidget } from "@/components/TurnstileWidget";

const schema = z.object({
  nickname: z.string().min(3, "Min 3 chars").max(32, "Max 32 chars").regex(/^[A-Za-z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Invalid email"),
  password: z.string()
    .min(10, "Min 10 chars")
    .regex(/[a-z]/, "Add lowercase")
    .regex(/[A-Z]/, "Add uppercase")
    .regex(/\d/, "Add number")
    .regex(/[^A-Za-z0-9]/, "Add symbol"),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, captchaToken }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Registration failed");
      }
      toast({
        title: t("Account created!", "Hisob yaratildi!", "Аккаунт создан!"),
        description: t(
          "Check your email and verify your account before signing in.",
          "Emailingizni tekshirib, kirishdan oldin hisobingizni tasdiqlang.",
          "Проверьте почту и подтвердите аккаунт перед входом."
        ),
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: t("Error", "Xato", "Ошибка"),
        description: error instanceof Error ? error.message : t("Registration failed", "Ro'yxatdan o'tish muvaffaqiyatsiz", "Ошибка регистрации"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background pt-14">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t("Create account", "Hisob yaratish", "Создать аккаунт")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Join the cdCTF community", "cdCTF jamoasiga qo'shiling", "Присоединяйтесь к cdCTF")}</p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nickname" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Nickname", "Taxallus", "Никнейм")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="hacker_name" data-testid="input-nickname" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="you@example.com" data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Password", "Parol", "Пароль")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" data-testid="input-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <TurnstileWidget
                onTokenChange={setCaptchaToken}
                onError={() => {
                  setCaptchaToken("");
                  toast({
                    title: t("Captcha failed", "Captcha ishlamadi", "Ошибка captcha"),
                    variant: "destructive",
                  });
                }}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-submit-register">
                {isSubmitting ? t("Creating...", "Yaratilmoqda...", "Создание...") : t("Create Account", "Hisob Yaratish", "Создать аккаунт")}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {t("Already have an account?", "Hisobingiz bormi?", "Уже есть аккаунт?")}{" "}
          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
            {t("Sign in", "Kirish", "Войти")}
          </Link>
        </p>
      </div>
    </div>
  );
}
