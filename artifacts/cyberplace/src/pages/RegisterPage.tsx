import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";

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
  const [captchaToken, setCaptchaToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaErrorCode, setCaptchaErrorCode] = useState<string | null>(null);
  const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const hasTurnstileSiteKey = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!captchaToken && !(isLocalDev && captchaUnavailable)) {
      toast({ title: t("Captcha required", "Captcha kerak", "Нужна captcha"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, captchaToken: captchaToken || undefined }),
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
              <div className="space-y-2">
                <TurnstileWidget
                  onTokenChange={(token) => {
                    setCaptchaToken(token);
                    if (token) {
                      setCaptchaUnavailable(false);
                      setCaptchaErrorCode(null);
                    }
                  }}
                  onError={(errorCode) => {
                    setCaptchaUnavailable(true);
                    setCaptchaErrorCode(errorCode ?? null);
                  }}
                  onReadyChange={(ready) => {
                    setCaptchaReady(ready);
                    if (ready) {
                      setCaptchaUnavailable(false);
                    }
                  }}
                />
                {!hasTurnstileSiteKey && (
                  <p className="text-xs text-amber-600">
                    {t(
                      "Turnstile site key is not configured in the frontend environment.",
                      "Frontend muhitida Turnstile site key sozlanmagan.",
                      "В среде frontend не настроен site key Turnstile."
                    )}
                  </p>
                )}
                {hasTurnstileSiteKey && !captchaReady && !captchaUnavailable && (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Loading captcha verification...",
                      "Captcha tekshiruvi yuklanmoqda...",
                      "Загрузка captcha..."
                    )}
                  </p>
                )}
                {!captchaToken && captchaReady && !captchaUnavailable && <p className="text-xs text-muted-foreground">{t("Complete the captcha to continue", "Davom etish uchun captcha ni bajaring", "Пройдите captcha для продолжения")}</p>}
                {captchaUnavailable && isLocalDev && (
                  <p className="text-xs text-amber-600">
                    {t(
                      "Turnstile is unavailable on this local environment. Registration can continue in development mode.",
                      "Bu lokal muhitda Turnstile ishlamayapti. Development rejimida ro'yxatdan o'tish davom etadi.",
                      "Turnstile недоступен в локальной среде. В режиме разработки регистрацию можно продолжить."
                    )}
                  </p>
                )}
                {captchaUnavailable && !isLocalDev && (
                  <p className="text-xs text-amber-600">
                    {t(
                      captchaErrorCode === "110200"
                        ? "Turnstile rejected this hostname. Add your Vercel domain to Cloudflare Turnstile allowed hostnames."
                        : "Captcha verification did not finish. Check the Turnstile site key, allowed domains, and CSP rules on Vercel.",
                      captchaErrorCode === "110200"
                        ? "Turnstile bu domenni rad etdi. Cloudflare Turnstile ichida Vercel domeningizni allowed hostnames ga qo'shing."
                        : "Captcha tekshiruvi tugamadi. Cloudflare ichida Turnstile site key, ruxsat etilgan domenlar va Vercel CSP qoidalarini tekshiring.",
                      captchaErrorCode === "110200"
                        ? "Turnstile отклонил этот домен. Добавьте ваш Vercel домен в allowed hostnames Cloudflare Turnstile."
                        : "Проверка captcha не завершилась. Проверьте site key Turnstile, разрешённые домены и правила CSP в Vercel."
                    )}
                  </p>
                )}
                {captchaErrorCode && !isLocalDev && (
                  <p className="text-xs text-muted-foreground">
                    Turnstile error code: {captchaErrorCode}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || (!captchaToken && !(isLocalDev && captchaUnavailable))} data-testid="button-submit-register">
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
