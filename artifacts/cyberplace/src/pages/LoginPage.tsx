import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { FadeIn, ScaleIn } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as api from "@/lib/security-api";

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
  // Held between the password step and the 2FA step. Not a session: it proves
  // only that the password was right.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  function finish(result: { token: string; user: Parameters<typeof login>[0]; suspiciousLogin: { reasons: string[] } | null }) {
    login(result.user, result.token);
    if (result.suspiciousLogin) {
      toast({
        title: t("New sign-in location", "Yangi kirish joyi", "Новое место входа"),
        description: t(
          "This sign-in looked unusual. Check your sign-in history if it wasn't you.",
          "Bu kirish odatdagidan farq qildi. Agar bu siz bo'lmasangiz, kirish tarixini tekshiring.",
          "Этот вход выглядел необычно. Проверьте историю входов, если это были не вы.",
        ),
      });
    }
    setLocation(result.user.role === "user" ? "/ctf" : "/admin/dashboard");
  }

  const fail = (error: unknown) => toast({
    title: t("Login failed", "Kirish muvaffaqiyatsiz", "Ошибка входа"),
    description: api.errorMessage(error, t("Invalid credentials", "Noto'g'ri ma'lumotlar", "Неверные данные")),
    variant: "destructive",
  });

  const loginMutation = useMutation({
    mutationFn: (data: FormData) => api.login(data.nickname, data.password),
    onSuccess: result => {
      if (result.requires2fa) setMfaToken(result.mfaToken);
      else finish(result);
    },
    onError: fail,
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyTwoFactor(mfaToken!, code),
    onSuccess: finish,
    onError: fail,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", password: "" },
  });

  const onSubmit = async (data: FormData) => loginMutation.mutate(data);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[30%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[30%] right-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <ScaleIn>
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 mb-8 animate-float shadow-2xl backdrop-blur-md">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-4">{t("AUTHENTICATE", "KIRISH", "АУТЕНТИФИКАЦИЯ")}</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">{t("SECURE GATEWAY_01 // ACCESS REQUIRED", "XAVFSIZLIK DARVOZASI_01 // RUXSAT KERAK", "ЗАЩИЩЕННЫЙ ШЛЮЗ_01")}</p>
          </div>
        </ScaleIn>

        <FadeIn delay={0.2}>
          <div className="glass-card p-10 rounded-[3rem] border-white/10 shadow-2xl">
            {mfaToken ? (
              <form
                className="space-y-8"
                onSubmit={event => { event.preventDefault(); verifyMutation.mutate(); }}
              >
                <div>
                  <label
                    htmlFor="mfa-code"
                    className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 mb-2"
                  >
                    {t("VERIFICATION_CODE", "TASDIQLASH KODI", "КОД ПОДТВЕРЖДЕНИЯ")}
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" aria-hidden="true" />
                    <input
                      id="mfa-code"
                      value={code}
                      onChange={event => setCode(event.target.value)}
                      placeholder="000000"
                      data-testid="input-mfa-code"
                      autoComplete="one-time-code"
                      inputMode="text"
                      autoFocus
                      className="w-full pl-12 pr-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/20"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-3 ml-1 leading-relaxed">
                    {t(
                      "Enter the 6-digit code from your authenticator app, or one of your backup codes.",
                      "Authenticator ilovangizdagi 6 xonali kodni yoki backup kodlaringizdan birini kiriting.",
                      "Введите 6-значный код из приложения-аутентификатора или один из резервных кодов.",
                    )}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={verifyMutation.isPending || !code.trim()}
                  data-testid="button-submit-mfa"
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  {verifyMutation.isPending
                    ? t("VERIFYING...", "TEKSHIRILMOQDA...", "ПРОВЕРКА...")
                    : t("VERIFY", "TASDIQLASH", "ПОДТВЕРДИТЬ")}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>

                <button
                  type="button"
                  onClick={() => { setMfaToken(null); setCode(""); }}
                  className="w-full text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("BACK", "ORQAGA", "НАЗАД")}
                </button>
              </form>
            ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField control={form.control} name="nickname" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">{t("OPERATIVE_ID", "TAXALLUS", "НИКНЕЙМ")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <input 
                          {...field} 
                          placeholder="your_nickname" 
                          data-testid="input-nickname" 
                          autoComplete="username" 
                          className="w-full pl-12 pr-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold uppercase mt-2 ml-1" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between ml-1 mb-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("ACCESS_KEY", "PAROL", "ПАРОЛЬ")}</FormLabel>
                      <Link href="/forgot-password" className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors">
                        {t("LOST_KEY?", "UNUTDINGIZMI?", "ЗАБЫЛИ ПАРОЛЬ?")}
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <input 
                          {...field} 
                          type="password" 
                          placeholder="••••••••" 
                          data-testid="input-password" 
                          autoComplete="current-password" 
                          className="w-full pl-12 pr-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold uppercase mt-2 ml-1" />
                  </FormItem>
                )} />
                
                <Button 
                  type="submit" 
                  className="cyber-button w-full h-16 group" 
                  disabled={loginMutation.isPending} 
                  data-testid="button-submit-login"
                >
                  <span className="flex items-center justify-center gap-3">
                    {loginMutation.isPending ? t("AUTHENTICATING...", "KIRILMOQDA...", "ВХОД...") : t("SIGN_IN", "KIRISH", "ВОЙТИ")}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </form>
            </Form>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 space-y-4">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              {t("NEW_OPERATIVE?", "HISOBINGIZ YO'QMI?", "НЕТ АККАУНТА?")}{" "}
              <Link href="/register" className="text-primary hover:text-accent transition-colors underline underline-offset-8" data-testid="link-register">
                {t("ENLIST_NOW", "RO'YXATDAN O'TING", "ЗАРЕГИСТРИРОВАТЬСЯ")}
              </Link>
            </p>
            <p className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 leading-relaxed max-w-[280px] mx-auto">
              {t("VERIFICATION_REQUIRED_FOR_NEW_RECRUITS.", "YANGI HISOBLAR TASDIQLANISHI KERAK.", "ТРЕБУЕТСЯ ПОДТВЕРЖДЕНИЕ EMAIL.")}{" "}
              <Link href="/resend-verification" className="text-primary hover:text-accent transition-colors">
                {t("RESEND_COMMS", "QAYTA YUBORISH", "ОТПРАВИТЬ")}
              </Link>
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
