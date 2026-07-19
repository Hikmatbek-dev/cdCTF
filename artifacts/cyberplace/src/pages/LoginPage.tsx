import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Shield, Lock, User, ArrowRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { FadeIn, ScaleIn } from "@/components/PageTransition";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as api from "@/lib/security-api";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  discord: "Discord",
};

const OAUTH_ERRORS: Record<string, { en: string; uz: string; ru: string }> = {
  email_already_registered: {
    en: "That email already has an account. Sign in with your password, then link the provider from Security.",
    uz: "Bu email bilan hisob bor. Parol bilan kiring, so'ng Xavfsizlik bo'limidan provayderni bog'lang.",
    ru: "С этим email уже есть аккаунт. Войдите по паролю, затем привяжите провайдера в разделе Безопасность.",
  },
  email_not_verified: {
    en: "Your provider did not share a verified email address.",
    uz: "Provayder tasdiqlangan email ulashmadi.",
    ru: "Провайдер не предоставил подтверждённый email.",
  },
  account_blocked: { en: "This account is blocked.", uz: "Bu hisob bloklangan.", ru: "Этот аккаунт заблокирован." },
  provider_not_configured: { en: "That sign-in method is not available.", uz: "Bu kirish usuli mavjud emas.", ru: "Этот способ входа недоступен." },
  invalid_state: { en: "The sign-in link expired. Please try again.", uz: "Kirish havolasi eskirdi. Qaytadan urinib ko'ring.", ru: "Ссылка для входа устарела. Попробуйте снова." },
  access_denied: { en: "You cancelled the sign-in.", uz: "Kirishni bekor qildingiz.", ru: "Вы отменили вход." },
  provider_error: { en: "The provider could not complete the sign-in.", uz: "Provayder kirishni yakunlay olmadi.", ru: "Провайдер не смог завершить вход." },
  already_linked_elsewhere: { en: "That account is already linked to a different user.", uz: "Bu hisob boshqa foydalanuvchiga bog'langan.", ru: "Этот аккаунт уже привязан к другому пользователю." },
  sign_in_first: { en: "Sign in before linking an account.", uz: "Bog'lashdan oldin kiring.", ru: "Войдите перед привязкой аккаунта." },
};

const schema = z.object({
  nickname: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { t, lang } = useLang();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Held between the password step and the 2FA step. Not a session: it proves
  // only that the password was right.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const providers = useQuery({ queryKey: ["oauth-providers"], queryFn: api.oauthProviders });

  // Read straight out of the URL during the first render, not from an effect.
  // A toast fired from a mount effect is lost: <Toaster /> is a later sibling in
  // App, so its listener is not registered yet when this component's effects run.
  // Rendering the failure inline is both reliable and clearer for a sign-in error.
  const [oauthError] = useState(() => new URLSearchParams(window.location.search).get("oauth_error"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // An account with 2FA comes back from the callback still owing a code.
    const handoff = params.get("mfa");
    if (handoff) setMfaToken(handoff);
    if (handoff || params.get("oauth_error")) window.history.replaceState({}, "", "/login");
    // Runs once: this reads the URL the callback landed on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const passkeyMutation = useMutation({
    mutationFn: api.loginWithPasskey,
    onSuccess: result => {
      if (result.requires2fa) setMfaToken(result.mfaToken);
      else finish(result);
    },
    onError: error => {
      // The user dismissing the platform prompt lands here. Not an error.
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError")) return;
      fail(error);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: "", password: "" },
  });

  // Not async: mutate() is fire-and-forget and returns void, so the promise this
  // used to hand back resolved before the login had done anything.
  const onSubmit = (data: FormData) => loginMutation.mutate(data);

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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 border border-foreground/10 mb-8 animate-float shadow-2xl backdrop-blur-md">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-4">{t("AUTHENTICATE", "KIRISH", "АУТЕНТИФИКАЦИЯ")}</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">{t("SECURE GATEWAY_01 // ACCESS REQUIRED", "XAVFSIZLIK DARVOZASI_01 // RUXSAT KERAK", "ЗАЩИЩЕННЫЙ ШЛЮЗ_01")}</p>
          </div>
        </ScaleIn>

        <FadeIn delay={0.2}>
          <div className="glass-card p-10 rounded-[3rem] border-foreground/10 shadow-2xl">
            {oauthError && (
              <div
                role="alert"
                data-testid="oauth-error"
                className="mb-8 p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-[11px] font-bold leading-relaxed text-destructive"
              >
                {OAUTH_ERRORS[oauthError]?.[lang] ?? oauthError}
              </div>
            )}
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
                      className="w-full pl-12 pr-6 h-14 bg-foreground/5 border border-foreground/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/20"
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
                    <div className="relative">
                      <User aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <FormControl>
                        <input
                          {...field}
                          placeholder="your_nickname"
                          data-testid="input-nickname"
                          autoComplete="username"
                          className="w-full pl-12 pr-6 h-14 bg-foreground/5 border border-foreground/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/20"
                        />
                      </FormControl>
                    </div>
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
                    <div className="relative">
                      <Lock aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <FormControl>
                        <input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-password"
                          autoComplete="current-password"
                          className="w-full pl-12 pr-6 h-14 bg-foreground/5 border border-foreground/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/20"
                        />
                      </FormControl>
                    </div>
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

            {/* Only rendered for providers the server actually has keys for. */}
            {!mfaToken && (api.passkeysSupported() || (providers.data?.providers.length ?? 0) > 0) && (
              <div className="mt-8 pt-8 border-t border-foreground/5">
                <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-4">
                  {t("OR_CONTINUE_WITH", "YOKI DAVOM ETING", "ИЛИ ВОЙДИТЕ ЧЕРЕЗ")}
                </p>

                {/* Hidden entirely on browsers without WebAuthn. */}
                {api.passkeysSupported() && (
                  <button
                    type="button"
                    onClick={() => passkeyMutation.mutate()}
                    disabled={passkeyMutation.isPending}
                    data-testid="button-passkey"
                    className="w-full h-12 mb-3 rounded-2xl bg-foreground/5 border border-foreground/5 hover:border-primary/40 hover:bg-foreground/10 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" aria-hidden="true" />
                    {passkeyMutation.isPending
                      ? t("WAITING...", "KUTILMOQDA...", "ОЖИДАНИЕ...")
                      : t("PASSKEY", "PASSKEY", "PASSKEY")}
                  </button>
                )}
                {(providers.data?.providers.length ?? 0) > 0 && (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${providers.data!.providers.length}, minmax(0, 1fr))` }}>
                  {providers.data!.providers.map(provider => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => api.startOAuth(provider)}
                      data-testid={`button-oauth-${provider}`}
                      className="h-12 rounded-2xl bg-foreground/5 border border-foreground/5 hover:border-primary/40 hover:bg-foreground/10 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    >
                      {PROVIDER_LABELS[provider] ?? provider}
                    </button>
                  ))}
                </div>
                )}
              </div>
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
