import { useRoute, Link } from "wouter";
import { Award, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/LanguageContext";
import { useVerifyCertificate, getVerifyCertificateQueryKey } from "@workspace/api-client-react";

/**
 * A certificate, and the page anyone can use to check one — an employer given a
 * serial lands here. Public on purpose: a certificate nobody can verify is not
 * worth issuing.
 */
export default function CertificatePage() {
  const [routeMatches, params] = useRoute("/certificate/:serial");
  const serial = String(params?.serial ?? "");
  const { t, lang } = useLang();

  const { data, isLoading, isError } = useVerifyCertificate(serial, {
    query: { queryKey: getVerifyCertificateQueryKey(serial), enabled: serial.length > 0, retry: false },
  });
  const cert = data;

  // See ModuleExamPage: the outgoing page outlives the route match.
  if (!routeMatches || isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-6">
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-6 text-center py-20">
          <h1 className="text-2xl font-semibold tracking-tight mb-3">
            {t("Certificate not found", "Sertifikat topilmadi", "Сертификат не найден")}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              "No certificate matches this serial number.",
              "Bu seriya raqamiga mos sertifikat yo'q.",
              "Сертификат с таким номером не найден.",
            )}
          </p>
          <Link href="/modules">
            <Button variant="outline">{t("Browse modules", "Modullarni ko'rish", "Смотреть модули")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const moduleTitle = t(cert.moduleTitle, cert.moduleTitleUz ?? undefined, cert.moduleTitleRu ?? undefined);
  const issued = new Date(cert.issuedAt).toLocaleDateString(
    lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <article
          className="border border-border rounded-xl bg-card p-10 sm:p-14 text-center"
          data-testid="card-certificate"
        >
          <Award className="w-12 h-12 text-primary mx-auto mb-6" />

          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8">
            {t("Certificate of completion", "Tugatganlik sertifikati", "Сертификат о прохождении")}
          </p>

          <p className="text-sm text-muted-foreground mb-2">
            {t("This certifies that", "Ushbu sertifikat tasdiqlaydi:", "Настоящим удостоверяется, что")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6" data-testid="text-certificate-name">
            {cert.fullName}
          </h1>

          <p className="text-sm text-muted-foreground mb-2">
            {t("has completed the module", "quyidagi modulni tugatdi", "прошёл(ла) модуль")}
          </p>
          <h2 className="text-xl font-medium mb-8" data-testid="text-certificate-module">{moduleTitle}</h2>

          <div className="inline-flex items-baseline gap-2 mb-10">
            <span className="text-4xl font-semibold tabular-nums text-primary" data-testid="text-certificate-score">
              {cert.score}%
            </span>
            <span className="text-sm text-muted-foreground">{t("final score", "yakuniy ball", "итоговый балл")}</span>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{issued}</span>
            <span className="font-medium text-foreground">cdCTF</span>
            <span className="font-mono text-xs" data-testid="text-certificate-serial">{cert.serial}</span>
          </div>
        </article>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          {t(
            "Anyone can verify this certificate at this address.",
            "Bu sertifikatni istalgan kishi shu manzilda tekshirishi mumkin.",
            "Любой может проверить этот сертификат по этому адресу.",
          )}
        </p>
      </div>
    </div>
  );
}
