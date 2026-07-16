import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, Monitor, History, KeyRound, Trash2, Copy, AlertTriangle, Link2, Fingerprint } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import * as api from "@/lib/security-api";

function Section({ icon: Icon, title, description, children }: {
  icon: typeof ShieldCheck; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <section className="border border-border rounded-2xl bg-card p-6">
      <div className="flex items-start gap-3 mb-5">
        <Icon className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-bold text-lg">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Shown once, on enable or regenerate. There is no way to see them again. */
function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useLang();
  const { toast } = useToast();

  return (
    <div className="border border-amber-500/40 bg-amber-500/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        <span className="font-bold text-sm">
          {t("Save these now", "Bularni hozir saqlang", "Сохраните сейчас")}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {t(
          "Each code works once, if you lose your authenticator. They will never be shown again.",
          "Har bir kod bir marta ishlaydi — authenticator'ni yo'qotsangiz kerak bo'ladi. Ular boshqa ko'rsatilmaydi.",
          "Каждый код работает один раз, если вы потеряете аутентификатор. Больше они не будут показаны.",
        )}
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm mb-3">
        {codes.map(code => <li key={code} className="bg-muted rounded px-2 py-1 text-center">{code}</li>)}
      </ul>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(codes.join("\n"));
            toast({ title: t("Copied", "Nusxalandi", "Скопировано") });
          }}
        >
          <Copy className="w-3 h-3 mr-2" aria-hidden="true" />
          {t("Copy all", "Hammasini nusxalash", "Копировать все")}
        </Button>
        <Button size="sm" onClick={onDone}>
          {t("I saved them", "Saqladim", "Я сохранил")}
        </Button>
      </div>
    </div>
  );
}

function TwoFactorSection() {
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  const status = useQuery({ queryKey: ["2fa-status"], queryFn: api.twoFactorStatus });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["2fa-status"] });

  const fail = (error: unknown) => toast({
    title: t("Failed", "Xato", "Ошибка"),
    description: api.errorMessage(error, t("Something went wrong", "Nimadir xato ketdi", "Что-то пошло не так")),
    variant: "destructive",
  });

  const startSetup = useMutation({ mutationFn: api.twoFactorSetup, onSuccess: setSetup, onError: fail });
  const enable = useMutation({
    mutationFn: () => api.twoFactorEnable(code),
    onSuccess: result => { setCodes(result.backupCodes); setSetup(null); setCode(""); refresh(); },
    onError: fail,
  });
  const disable = useMutation({
    mutationFn: () => api.twoFactorDisable(password, code),
    onSuccess: () => { setPassword(""); setCode(""); refresh(); toast({ title: t("Two-factor disabled", "2FA o'chirildi", "2FA отключена") }); },
    onError: fail,
  });
  const regenerate = useMutation({
    mutationFn: () => api.regenerateBackupCodes(password),
    onSuccess: result => { setCodes(result.backupCodes); setPassword(""); refresh(); },
    onError: fail,
  });

  if (status.isLoading) return <Skeleton className="h-24 w-full" />;

  if (codes) return <BackupCodes codes={codes} onDone={() => setCodes(null)} />;

  const enabled = status.data?.enabled ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        {enabled
          ? <><ShieldCheck className="w-4 h-4 text-green-500" aria-hidden="true" /><span className="font-bold text-green-600 dark:text-green-400">{t("Enabled", "Yoqilgan", "Включена")}</span></>
          : <><ShieldOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" /><span className="text-muted-foreground">{t("Not enabled", "Yoqilmagan", "Не включена")}</span></>}
      </div>

      {enabled && (
        <p className="text-sm text-muted-foreground">
          {t("Backup codes remaining:", "Qolgan backup kodlar:", "Осталось резервных кодов:")}{" "}
          <span className="font-mono font-bold text-foreground">{status.data?.backupCodesRemaining}</span>
        </p>
      )}

      {!enabled && !setup && (
        <Button onClick={() => startSetup.mutate()} disabled={startSetup.isPending}>
          {t("Set up two-factor", "2FA'ni sozlash", "Настроить 2FA")}
        </Button>
      )}

      {!enabled && setup && (
        <div className="space-y-3">
          <p className="text-sm">
            {t(
              "Add this key to your authenticator app, then enter the code it shows.",
              "Bu kalitni authenticator ilovangizga qo'shing, so'ng u ko'rsatgan kodni kiriting.",
              "Добавьте этот ключ в приложение-аутентификатор, затем введите показанный код.",
            )}
          </p>
          <div className="font-mono text-sm bg-muted rounded-lg p-3 break-all select-all">{setup.secret}</div>
          <a href={setup.otpauthUri} className="text-xs text-primary underline block">
            {t("Open in authenticator app", "Authenticator ilovada ochish", "Открыть в аутентификаторе")}
          </a>
          <div className="flex gap-2">
            <label htmlFor="totp-enable" className="sr-only">{t("Code", "Kod", "Код")}</label>
            <input
              id="totp-enable"
              value={code}
              onChange={event => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-32 px-3 py-2 bg-background border border-border rounded-lg font-mono"
            />
            <Button onClick={() => enable.mutate()} disabled={enable.isPending || code.length < 6}>
              {t("Enable", "Yoqish", "Включить")}
            </Button>
            <Button variant="ghost" onClick={() => { setSetup(null); setCode(""); }}>
              {t("Cancel", "Bekor qilish", "Отмена")}
            </Button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="pw" className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {t("Current password", "Joriy parol", "Текущий пароль")}
              </label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="totp-disable" className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                {t("Code from app", "Ilovadagi kod", "Код из приложения")}
              </label>
              <input
                id="totp-disable"
                value={code}
                onChange={event => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => regenerate.mutate()} disabled={regenerate.isPending || !password}>
              {t("New backup codes", "Yangi backup kodlar", "Новые резервные коды")}
            </Button>
            <Button variant="destructive" onClick={() => disable.mutate()} disabled={disable.isPending || !password || !code}>
              {t("Disable two-factor", "2FA'ni o'chirish", "Отключить 2FA")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionsSection() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: api.listSessions });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sessions"] });

  const revoke = useMutation({ mutationFn: api.revokeSession, onSuccess: refresh });
  const revokeOthers = useMutation({
    mutationFn: api.revokeOtherSessions,
    onSuccess: result => {
      refresh();
      toast({ title: t(`Signed out ${result.revokedCount} device(s)`, `${result.revokedCount} ta qurilma chiqarildi`, `Выведено устройств: ${result.revokedCount}`) });
    },
  });

  if (sessions.isLoading) return <Skeleton className="h-24 w-full" />;

  const list = sessions.data?.sessions ?? [];
  const format = (iso: string) => new Date(iso).toLocaleString(lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB");

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {list.map(session => (
          <li key={session.id} className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl">
            <div className="min-w-0">
              <div className="font-bold text-sm flex items-center gap-2">
                <span className="truncate">{session.deviceLabel ?? t("Unknown device", "Noma'lum qurilma", "Неизвестное устройство")}</span>
                {session.isCurrent && (
                  <span className="text-[10px] font-black uppercase bg-primary/15 text-primary px-2 py-0.5 rounded-full shrink-0">
                    {t("This device", "Shu qurilma", "Это устройство")}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {session.ipAddress ?? "—"} · {t("Last seen", "Oxirgi faollik", "Последняя активность")} {format(session.lastSeenAt)}
              </div>
            </div>
            {!session.isCurrent && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => revoke.mutate(session.id)}
                disabled={revoke.isPending}
                aria-label={t("Sign out this device", "Bu qurilmani chiqarish", "Выйти на этом устройстве")}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {list.length > 1 && (
        <Button variant="outline" size="sm" onClick={() => revokeOthers.mutate()} disabled={revokeOthers.isPending}>
          {t("Sign out all other devices", "Boshqa hamma qurilmalarni chiqarish", "Выйти на всех других устройствах")}
        </Button>
      )}
    </div>
  );
}

const FAILURE_LABELS: Record<string, { en: string; uz: string; ru: string }> = {
  bad_password: { en: "Wrong password", uz: "Noto'g'ri parol", ru: "Неверный пароль" },
  bad_totp: { en: "Wrong 2FA code", uz: "Noto'g'ri 2FA kod", ru: "Неверный код 2FA" },
  blocked: { en: "Account blocked", uz: "Hisob bloklangan", ru: "Аккаунт заблокирован" },
  unknown_user: { en: "No such account", uz: "Bunday hisob yo'q", ru: "Аккаунт не найден" },
  email_unverified: { en: "Email not verified", uz: "Email tasdiqlanmagan", ru: "Email не подтверждён" },
};

const SUSPICIOUS_LABELS: Record<string, { en: string; uz: string; ru: string }> = {
  new_ip: { en: "new IP", uz: "yangi IP", ru: "новый IP" },
  new_device: { en: "new device", uz: "yangi qurilma", ru: "новое устройство" },
  recent_failed_attempts: { en: "after failed attempts", uz: "muvaffaqiyatsiz urinishlardan keyin", ru: "после неудачных попыток" },
};

function LoginHistorySection() {
  const { t, lang } = useLang();
  const history = useQuery({ queryKey: ["login-history"], queryFn: () => api.listLoginHistory(25) });

  if (history.isLoading) return <Skeleton className="h-24 w-full" />;

  const entries = history.data?.entries ?? [];
  const format = (iso: string) => new Date(iso).toLocaleString(lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB");

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("Nothing yet.", "Hozircha yo'q.", "Пока ничего.")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <ul className="space-y-2 min-w-[20rem]">
        {entries.map(entry => (
          <li key={entry.id} className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.success ? "bg-green-500" : "bg-red-500"}`} aria-hidden="true" />
                <span className="font-bold">
                  {entry.success
                    ? t("Signed in", "Kirdi", "Вход выполнен")
                    : FAILURE_LABELS[entry.failureReason ?? ""]?.[lang] ?? t("Failed", "Muvaffaqiyatsiz", "Неудача")}
                </span>
                {entry.suspicious && (
                  <span className="text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    {entry.suspiciousReasons.map(reason => SUSPICIOUS_LABELS[reason]?.[lang] ?? reason).join(", ")}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {entry.deviceLabel ?? "—"} · {entry.ipAddress ?? "—"}
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{format(entry.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PasskeysSection() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const passkeys = useQuery({ queryKey: ["passkeys"], queryFn: api.listPasskeys });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["passkeys"] });

  const add = useMutation({
    mutationFn: () => api.registerPasskey(name),
    onSuccess: result => {
      setName("");
      refresh();
      toast({ title: t(`Added "${result.name}"`, `"${result.name}" qo'shildi`, `Добавлен «${result.name}»`) });
    },
    onError: error => {
      // A user closing the platform prompt throws here; that is not a failure
      // worth shouting about.
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError")) return;
      toast({
        title: t("Failed", "Xato", "Ошибка"),
        description: api.errorMessage(error, t("Could not add the passkey", "Passkey qo'shilmadi", "Не удалось добавить passkey")),
        variant: "destructive",
      });
    },
  });
  const remove = useMutation({ mutationFn: api.deletePasskey, onSuccess: refresh });

  if (!api.passkeysSupported()) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("This browser does not support passkeys.", "Bu brauzer passkey'ni qo'llab-quvvatlamaydi.", "Этот браузер не поддерживает passkey.")}
      </p>
    );
  }

  if (passkeys.isLoading) return <Skeleton className="h-20 w-full" />;

  const list = passkeys.data?.passkeys ?? [];
  const format = (iso: string) => new Date(iso).toLocaleDateString(lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB");

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {list.map(passkey => (
          <li key={passkey.id} className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{passkey.name}</div>
              <div className="text-xs text-muted-foreground">
                {passkey.lastUsedAt
                  ? `${t("last used", "oxirgi ishlatilgan", "использован")} ${format(passkey.lastUsedAt)}`
                  : t("never used", "ishlatilmagan", "не использован")}
                {passkey.backedUp && ` · ${t("synced", "sinxronlangan", "синхронизирован")}`}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove.mutate(passkey.id)}
              disabled={remove.isPending}
              aria-label={t("Remove passkey", "Passkey'ni o'chirish", "Удалить passkey")}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 pt-3 border-t border-border">
        <div className="flex-1">
          <label htmlFor="passkey-name" className="sr-only">{t("Name", "Nom", "Название")}</label>
          <input
            id="passkey-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder={t("e.g. My phone", "masalan: Mening telefonim", "напр. Мой телефон")}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
          />
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          {t("Add passkey", "Passkey qo'shish", "Добавить passkey")}
        </Button>
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = { google: "Google", github: "GitHub", discord: "Discord" };

function LinkedAccountsSection() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const providers = useQuery({ queryKey: ["oauth-providers"], queryFn: api.oauthProviders });
  const linked = useQuery({ queryKey: ["oauth-accounts"], queryFn: api.linkedOAuthAccounts });

  const unlink = useMutation({
    mutationFn: api.unlinkOAuth,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["oauth-accounts"] }),
    onError: error => toast({
      title: t("Failed", "Xato", "Ошибка"),
      description: api.errorMessage(error, t("Could not unlink", "Uzib bo'lmadi", "Не удалось отвязать")),
      variant: "destructive",
    }),
  });

  if (providers.isLoading || linked.isLoading) return <Skeleton className="h-20 w-full" />;

  const available = providers.data?.providers ?? [];
  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("No sign-in providers are configured.", "Hech qanday kirish provayderi sozlanmagan.", "Провайдеры входа не настроены.")}
      </p>
    );
  }

  const accounts = linked.data?.accounts ?? [];
  const format = (iso: string) => new Date(iso).toLocaleDateString(lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB");

  return (
    <ul className="space-y-2">
      {available.map(provider => {
        const account = accounts.find(item => item.provider === provider);
        return (
          <li key={provider} className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl">
            <div className="min-w-0">
              <div className="font-bold text-sm">{PROVIDER_LABELS[provider] ?? provider}</div>
              <div className="text-xs text-muted-foreground truncate">
                {account
                  ? `${account.providerEmail ?? t("Linked", "Bog'langan", "Привязан")} · ${format(account.createdAt)}`
                  : t("Not linked", "Bog'lanmagan", "Не привязан")}
              </div>
            </div>
            {account
              ? (
                <Button size="sm" variant="ghost" onClick={() => unlink.mutate(provider)} disabled={unlink.isPending}>
                  {t("Unlink", "Uzish", "Отвязать")}
                </Button>
              )
              : (
                <Button size="sm" variant="outline" onClick={() => api.startOAuth(provider, "link")}>
                  {t("Link", "Bog'lash", "Привязать")}
                </Button>
              )}
          </li>
        );
      })}
    </ul>
  );
}

function ApiTokensSection() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);

  const tokens = useQuery({ queryKey: ["api-tokens"], queryFn: api.listApiTokens });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["api-tokens"] });

  const create = useMutation({
    mutationFn: () => api.createApiToken(name, scopes, null),
    onSuccess: result => { setFresh(result.token); setName(""); setScopes([]); refresh(); },
    onError: error => toast({
      title: t("Failed", "Xato", "Ошибка"),
      description: api.errorMessage(error, t("Could not create token", "Token yaratilmadi", "Не удалось создать токен")),
      variant: "destructive",
    }),
  });
  const revoke = useMutation({ mutationFn: api.revokeApiToken, onSuccess: refresh });

  if (tokens.isLoading) return <Skeleton className="h-24 w-full" />;

  const available = tokens.data?.availableScopes ?? [];
  const format = (iso: string) => new Date(iso).toLocaleDateString(lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB");

  return (
    <div className="space-y-4">
      {fresh && (
        <div className="border border-amber-500/40 bg-amber-500/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <span className="font-bold text-sm">{t("Copy it now", "Hozir nusxalang", "Скопируйте сейчас")}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {t("This is the only time the token is shown.", "Token faqat shu safar ko'rsatiladi.", "Токен показывается только один раз.")}
          </p>
          <div className="font-mono text-xs bg-muted rounded p-2 break-all select-all mb-2">{fresh}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(fresh); toast({ title: t("Copied", "Nusxalandi", "Скопировано") }); }}>
              <Copy className="w-3 h-3 mr-2" aria-hidden="true" />{t("Copy", "Nusxalash", "Копировать")}
            </Button>
            <Button size="sm" onClick={() => setFresh(null)}>{t("Done", "Tayyor", "Готово")}</Button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {(tokens.data?.tokens ?? []).map(token => (
          <li key={token.id} className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{token.name}</div>
              <div className="text-xs text-muted-foreground truncate font-mono">{token.prefix}</div>
              <div className="text-xs text-muted-foreground">
                {token.scopes.join(", ")} · {token.lastUsedAt
                  ? `${t("last used", "oxirgi ishlatilgan", "использован")} ${format(token.lastUsedAt)}`
                  : t("never used", "ishlatilmagan", "не использован")}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => revoke.mutate(token.id)}
              disabled={revoke.isPending}
              aria-label={t("Revoke token", "Tokenni bekor qilish", "Отозвать токен")}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-3 pt-3 border-t border-border">
        <div>
          <label htmlFor="token-name" className="block text-xs font-bold uppercase text-muted-foreground mb-1">
            {t("Token name", "Token nomi", "Название токена")}
          </label>
          <input
            id="token-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder={t("e.g. CI script", "masalan: CI skript", "напр. CI скрипт")}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
          />
        </div>
        <fieldset>
          <legend className="text-xs font-bold uppercase text-muted-foreground mb-1">
            {t("Scopes", "Ruxsatlar", "Разрешения")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {available.map(scope => (
              <label key={scope} className="flex items-center gap-2 text-sm bg-muted/40 px-3 py-1.5 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={event => setScopes(current =>
                    event.target.checked ? [...current, scope] : current.filter(item => item !== scope))}
                />
                <span className="font-mono text-xs">{scope}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button onClick={() => create.mutate()} disabled={create.isPending || !name.trim() || scopes.length === 0}>
          {t("Create token", "Token yaratish", "Создать токен")}
        </Button>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useLang();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-black mb-1">{t("Security", "Xavfsizlik", "Безопасность")}</h1>
          <p className="text-muted-foreground">
            {t("Two-factor, devices, sign-in history and API tokens.", "Ikki bosqichli tasdiq, qurilmalar, kirish tarixi va API tokenlar.", "Двухфакторная защита, устройства, история входов и API-токены.")}
          </p>
        </header>

        <Section
          icon={ShieldCheck}
          title={t("Two-factor authentication", "Ikki bosqichli tasdiq", "Двухфакторная аутентификация")}
          description={t("A code from your phone, on top of your password.", "Parolingiz ustiga telefoningizdagi kod.", "Код с телефона в дополнение к паролю.")}
        >
          <TwoFactorSection />
        </Section>

        <Section
          icon={Fingerprint}
          title={t("Passkeys", "Passkey'lar", "Passkey")}
          description={t("Sign in with your fingerprint, face or a security key — no password.", "Barmoq izi, yuz yoki xavfsizlik kaliti bilan kiring — parolsiz.", "Входите по отпечатку, лицу или ключу безопасности — без пароля.")}
        >
          <PasskeysSection />
        </Section>

        <Section
          icon={Monitor}
          title={t("Devices", "Qurilmalar", "Устройства")}
          description={t("Everywhere you are currently signed in.", "Hozir kirgan barcha joylaringiz.", "Где вы сейчас вошли в систему.")}
        >
          <SessionsSection />
        </Section>

        <Section
          icon={History}
          title={t("Sign-in history", "Kirish tarixi", "История входов")}
          description={t("Recent attempts on your account, successful or not.", "Hisobingizga so'nggi urinishlar — muvaffaqiyatli yoki yo'q.", "Недавние попытки входа в ваш аккаунт.")}
        >
          <LoginHistorySection />
        </Section>

        <Section
          icon={Link2}
          title={t("Linked accounts", "Bog'langan hisoblar", "Привязанные аккаунты")}
          description={t("Sign in with a provider instead of a password.", "Parol o'rniga provayder orqali kiring.", "Входите через провайдера вместо пароля.")}
        >
          <LinkedAccountsSection />
        </Section>

        <Section
          icon={KeyRound}
          title={t("API tokens", "API tokenlar", "API-токены")}
          description={t("For scripts. Cannot change your password or reach the admin panel.", "Skriptlar uchun. Parolni o'zgartira olmaydi va admin panelga kira olmaydi.", "Для скриптов. Не может менять пароль или заходить в админ-панель.")}
        >
          <ApiTokensSection />
        </Section>
      </div>
    </div>
  );
}
