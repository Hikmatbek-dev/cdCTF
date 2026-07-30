import { useState } from "react";
import { Link } from "wouter";
import { ShieldCheck, Search, BadgeCheck, XCircle, ArrowRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/lib/LanguageContext";

type Result =
  | { kind: "certificate"; serial: string; fullName: string; score: number; issuedAt: string; moduleTitle: string; moduleTitleUz: string | null; moduleTitleRu: string | null; fingerprint: string }
  | { kind: "diploma"; serial: string; fullName: string; averageScore: number; moduleCount: number; issuedAt: string; fingerprint: string };

const CERT_RE = /^CDCTF-[A-F0-9]{10}$/;
const DIP_RE = /^CDCTF-DIP-[A-F0-9]{10}$/;

export default function VerifyPage() {
  const { t, lang } = useLang();
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "invalid" | "notfound" | "ok">("idle");
  const [result, setResult] = useState<Result | null>(null);

  const verify = async () => {
    const s = serial.trim().toUpperCase();
    setResult(null);
    if (!CERT_RE.test(s) && !DIP_RE.test(s)) { setStatus("invalid"); return; }
    setStatus("loading");
    const isDiploma = DIP_RE.test(s);
    const url = isDiploma ? `/api/learn/diploma/${s}` : `/api/learn/certificates/${s}`;
    try {
      const r = await fetch(url);
      if (r.status === 404) { setStatus("notfound"); return; }
      if (!r.ok) { setStatus("invalid"); return; }
      const data = await r.json();
      setResult({ kind: isDiploma ? "diploma" : "certificate", ...data });
      setStatus("ok");
    } catch {
      setStatus("invalid");
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? undefined : lang, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background page relative overflow-hidden">

      <div className="shell-narrow py-8 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-5">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="mb-3">{t("Verify a credential", "Sertifikatni tekshirish", "Проверка сертификата")}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("Enter the serial number from a cdCTF certificate or diploma to confirm it is genuine.",
               "Haqiqiyligini tasdiqlash uchun cdCTF sertifikati yoki diplomidagi seriya raqamini kiriting.",
               "Введите серийный номер сертификата или диплома cdCTF, чтобы подтвердить подлинность.")}
          </p>
        </div>

        <div className="flex gap-2 mb-2">
          <Input
            value={serial}
            onChange={e => setSerial(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { void verify(); } }}
            placeholder="CDCTF-XXXXXXXXXX"
            className="font-mono uppercase"
            data-testid="verify-input"
          />
          <Button onClick={verify} disabled={status === "loading" || !serial.trim()} className="gap-2 shrink-0" data-testid="verify-submit">
            <Search className="w-4 h-4" /> {t("Verify", "Tekshirish", "Проверить")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-8">{t("Certificate: CDCTF-… · Diploma: CDCTF-DIP-…", "Sertifikat: CDCTF-… · Diplom: CDCTF-DIP-…", "Сертификат: CDCTF-… · Диплом: CDCTF-DIP-…")}</p>

        {status === "invalid" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 flex items-center gap-3" data-testid="verify-invalid">
            <XCircle className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm">{t("That is not a valid cdCTF serial number.", "Bu haqiqiy cdCTF seriya raqami emas.", "Это недействительный серийный номер cdCTF.")}</span>
          </div>
        )}
        {status === "notfound" && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 flex items-center gap-3" data-testid="verify-notfound">
            <XCircle className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm">{t("No credential matches this serial number.", "Bu seriya raqamiga mos sertifikat topilmadi.", "По этому номеру сертификат не найден.")}</span>
          </div>
        )}

        {status === "ok" && result && (
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent p-8" data-testid="verify-ok">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-6">
              <BadgeCheck className="w-5 h-5" /> {t("Verified — genuine credential", "Tasdiqlandi — haqiqiy sertifikat", "Подтверждено — подлинный сертификат")}
            </div>
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Holder", "Egasi", "Владелец")}</dt><dd className="font-semibold text-right">{result.fullName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Type", "Turi", "Тип")}</dt><dd className="text-right">{result.kind === "diploma" ? t("Programme diploma", "Dastur diplomi", "Диплом программы") : t("Module certificate", "Modul sertifikati", "Сертификат модуля")}</dd></div>
              {result.kind === "certificate" && (
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Module", "Modul", "Модуль")}</dt><dd className="text-right">{t(result.moduleTitle, result.moduleTitleUz || result.moduleTitle, result.moduleTitleRu || result.moduleTitle)}</dd></div>
              )}
              {result.kind === "diploma" && (
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Modules passed", "O'tilgan modullar", "Модулей пройдено")}</dt><dd className="text-right tabular-nums">{result.moduleCount}</dd></div>
              )}
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Score", "Ball", "Балл")}</dt><dd className="text-right tabular-nums">{result.kind === "diploma" ? result.averageScore : result.score}%</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Issued", "Berilgan", "Выдан")}</dt><dd className="text-right">{fmtDate(result.issuedAt)}</dd></div>
              <div className="flex justify-between gap-4 pt-4 border-t border-emerald-500/15">
                <dt className="text-muted-foreground flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5" /> {t("Fingerprint", "Barmoq izi", "Отпечаток")}</dt>
                <dd className="font-mono text-xs text-muted-foreground text-right break-all max-w-[60%]">{result.fingerprint.slice(0, 24)}…</dd>
              </div>
            </dl>
            <Link href={result.kind === "diploma" ? `/diploma/${result.serial}` : `/certificate/${result.serial}`}>
              <Button variant="outline" size="sm" className="mt-6 gap-1.5" data-testid="verify-view-full">
                {t("View full credential", "To'liq sertifikatni ko'rish", "Смотреть сертификат")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
