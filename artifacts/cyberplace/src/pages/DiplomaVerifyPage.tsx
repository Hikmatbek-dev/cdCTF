import { useRoute, Link } from "wouter";
import { GraduationCap, ShieldCheck } from "lucide-react";
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
      <div className="max-w-2xl mx-auto px-6">
        <article
          className="glass-card p-10 sm:p-14 text-center"
          data-testid="card-diploma"
        >
          <GraduationCap className="w-14 h-14 text-primary mx-auto mb-6 neon-glow rounded-full p-2" />

          <div className="eyebrow justify-center flex mb-8">
            {t("cdCTF · Program Diploma", "cdCTF · Dastur diplomi", "cdCTF · Диплом программы")}
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {t("This certifies that", "Ushbu diplom tasdiqlaydi:", "Настоящим удостоверяется, что")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6" data-testid="text-diploma-name">
            {diploma.fullName}
          </h1>

          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            {t(
              `has completed the full cdCTF cybersecurity program — all ${diploma.moduleCount} modules.`,
              `to'liq cdCTF kiberxavfsizlik dasturini — barcha ${diploma.moduleCount} modulni tugatdi.`,
              `прошёл(ла) полную программу кибербезопасности cdCTF — все ${diploma.moduleCount} модулей.`,
            )}
          </p>

          <div className="inline-flex items-baseline gap-2 mb-10">
            <span className="text-4xl font-bold tabular-nums text-primary" data-testid="text-diploma-score">
              {diploma.averageScore}%
            </span>
            <span className="text-sm text-muted-foreground">{t("average score", "o'rtacha ball", "средний балл")}</span>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{issued}</span>
            <span className="font-semibold text-foreground">cdCTF</span>
            <span className="font-mono text-xs" data-testid="text-diploma-serial">{diploma.serial}</span>
          </div>
        </article>

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
