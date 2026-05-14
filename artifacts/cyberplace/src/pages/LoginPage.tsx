import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";

const schema = z.object({
  nickname: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          login(res.user as Parameters<typeof login>[0], res.token);
          if (res.user.role === "admin") {
            setLocation("/admin/dashboard");
          } else {
            setLocation("/ctf");
          }
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t("Invalid credentials", "Noto'g'ri ma'lumotlar", "Неверные данные");
          toast({ title: t("Login failed", "Kirish muvaffaqiyatsiz", "Ошибка входа"), description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background pt-14">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t("Welcome back", "Xush kelibsiz", "С возвращением")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Sign in to your account", "Hisobingizga kiring", "Войдите в аккаунт")}</p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nickname" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Nickname", "Taxallus", "Никнейм")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="your_nickname" data-testid="input-nickname" autoComplete="username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("Password", "Parol", "Пароль")}</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      {t("Forgot Password?", "Parolni unutdingizmi?", "Забыли пароль?")}
                    </Link>
                  </div>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" data-testid="input-password" autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-submit-login">
                {loginMutation.isPending ? t("Signing in...", "Kirish...", "Вход...") : t("Sign In", "Kirish", "Войти")}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {t("Don't have an account?", "Hisobingiz yo'qmi?", "Нет аккаунта?")}{" "}
          <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
            {t("Register", "Ro'yxatdan o'ting", "Зарегистрироваться")}
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {t("New accounts must verify email before login.", "Yangi hisoblar kirishdan oldin emailni tasdiqlashi kerak.", "Новые аккаунты должны подтвердить email перед входом.")}{" "}
          <Link href="/resend-verification" className="text-primary hover:underline">
            {t("Resend email", "Emailni qayta yuborish", "Yuborish")}
          </Link>
        </p>
      </div>
    </div>
  );
}
