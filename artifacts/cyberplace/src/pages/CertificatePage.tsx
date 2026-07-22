import { useRoute, Link } from "wouter";
import { ShieldCheck } from "lucide-react";
import { ModuleCertificate, CredentialFrame } from "@/components/Credentials";
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
      <div className="max-w-5xl mx-auto px-6">
        <CredentialFrame>
          <ModuleCertificate
            d={{
              fullName: cert.fullName,
              subject: moduleTitle,
              score: cert.score,
              serial: cert.serial,
              issued,
              verifyUrl: `${window.location.host}/certificate/${cert.serial}`,
              verifyHref: `${window.location.origin}/certificate/${cert.serial}`,
              fingerprint: (cert as { fingerprint?: string }).fingerprint,
            }}
            l={{
              title: t("Certificate", "Sertifikat", "Сертификат"),
              certifies: t("Awarded to", "Kimga berildi", "Выдан"),
              completed: "",
              scoreLabel: t("Final score", "Yakuniy ball", "Итоговый балл"),
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
