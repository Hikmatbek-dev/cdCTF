import { useRoute, Link } from "wouter";
import { ShieldCheck, Download } from "lucide-react";
import { ProgrammeDiploma, CredentialFrame, printCredential } from "@/components/Credentials";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useVerifyDiploma, getVerifyDiplomaQueryKey } from "@workspace/api-client-react";

/**
 * Public verification of a program diploma — the whole-program credential.
 * Anyone the holder shows a serial to lands here. Mirrors CertificatePage, but
 * grander: the diploma stands for the entire six-month path, not one module.
 */
export default function DiplomaVerifyPage() {
  const [routeMatches, params] = useRoute("/diploma/:serial");
  const serial = String(params?.serial ?? "");
  const { t, lang } = useLang();

  const { data, isLoading, isError } = useVerifyDiploma(serial, {
    query: { queryKey: getVerifyDiplomaQueryKey(serial), enabled: serial.length > 0, retry: false },
  });
  const diploma = data;

  if (!routeMatches || isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-6">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !diploma) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-6 text-center py-20">
          <h1 className="text-2xl font-semibold tracking-tight mb-3">
            {t("Diploma not found", "Diplom topilmadi", "Диплом не найден")}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              "No diploma matches this serial number.",
              "Bu seriya raqamiga mos diplom yo'q.",
              "Диплом с таким номером не найден.",
            )}
          </p>
          <Link href="/modules">
            <Button variant="outline">{t("Browse modules", "Modullarni ko'rish", "Смотреть модули")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const issued = new Date(diploma.issuedAt).toLocaleDateString(
    lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <CredentialFrame>
          <ProgrammeDiploma
            d={{
              fullName: diploma.fullName,
              subject: "cdCTF Cybersecurity Programme",
              score: diploma.averageScore,
              serial: diploma.serial,
              issued,
              verifyUrl: `${window.location.host}/diploma/${diploma.serial}`,
              verifyHref: `${window.location.origin}/diploma/${diploma.serial}`,
              fingerprint: (diploma as { fingerprint?: string }).fingerprint,
            }}
            l={{
              title: t("Diploma", "Diplom", "Диплом"),
              certifies: t("This certifies that", "Ushbu diplom tasdiqlaydi:", "Настоящим удостоверяется, что"),
              completed: t(
                `has completed the full cdCTF programme — all ${diploma.moduleCount} modules`,
                `to'liq cdCTF dasturini — barcha ${diploma.moduleCount} modulni tugatdi`,
                `прошёл(ла) полную программу cdCTF — все ${diploma.moduleCount} модулей`,
              ),
              scoreLabel: t("Programme average", "Dastur o'rtachasi", "Средний балл"),
              issued: t("Issued", "Berilgan", "Выдан"),
              signatoryName: t(
                "Hikmatbek Xudoyberganov Jur'at o'g'li",
                "Hikmatbek Xudoyberganov Jur'at o'g'li",
                "Хикматбек Худойберганов Журъат угли",
              ),
              signatoryRole: t("Founder & Director", "Asoschi va direktor", "Основатель и директор"),
            }}
          />
        </CredentialFrame>

        <div className="flex justify-center mt-6">
          <button onClick={printCredential} className="cyber-button h-11 px-6" data-testid="button-download-diploma">
            <Download className="w-4 h-4" />
            {t("Download PDF", "PDF yuklab olish", "Скачать PDF")}
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          {t(
            "Anyone can verify this diploma at this address.",
            "Bu diplomni istalgan kishi shu manzilda tekshirishi mumkin.",
            "Любой может проверить этот диплом по этому адресу.",
          )}
        </p>
      </div>
    </div>
  );
}
