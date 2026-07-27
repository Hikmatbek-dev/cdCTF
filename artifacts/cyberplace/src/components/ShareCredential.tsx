import { useState } from "react";
import { Check, Link2, Linkedin, Send, Share2 } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { absoluteUrl, copyText, telegramShareUrl } from "@/lib/share";

/**
 * Sharing a credential is the only free distribution this platform has.
 *
 * A certificate that lives on one tab and is never seen again teaches nobody
 * that cdCTF exists. Every share here points at the *public verification page*,
 * not a screenshot — so whoever clicks it lands on a page that proves the
 * credential is real and, incidentally, shows them the platform.
 *
 * The LinkedIn button is deliberately "Add to profile" rather than "post":
 * a certification section entry is permanent and carries the verify URL with
 * it, where a feed post scrolls away in a day.
 */
export type CredentialShare = {
  /** Public verify path, e.g. `/certificate/CDCTF-AB12CD34EF`. */
  path: string;
  /** What the credential is for — module title, or the programme name. */
  subject: string;
  serial: string;
  issuedAt: string | Date;
  holder: string;
};

export function ShareCredential({ credential }: { credential: CredentialShare }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const url = absoluteUrl(credential.path);
  const issued = new Date(credential.issuedAt);

  const caption = t(
    `I earned "${credential.subject}" on cdCTF — verifiable at ${url}`,
    `cdCTF'da "${credential.subject}" sertifikatini oldim — tekshirish: ${url}`,
    `Я получил(а) сертификат «${credential.subject}» на cdCTF — проверить: ${url}`,
  );

  // LinkedIn's "add to profile" deep link. name/organizationName fill the
  // certification entry; certUrl + certId make it checkable by a recruiter.
  const linkedIn = new URL("https://www.linkedin.com/profile/add");
  linkedIn.searchParams.set("startTask", "CERTIFICATION_NAME");
  linkedIn.searchParams.set("name", `${credential.subject} — cdCTF`);
  linkedIn.searchParams.set("organizationName", "cdCTF");
  linkedIn.searchParams.set("issueYear", String(issued.getFullYear()));
  linkedIn.searchParams.set("issueMonth", String(issued.getMonth() + 1));
  linkedIn.searchParams.set("certUrl", url);
  linkedIn.searchParams.set("certId", credential.serial);

  const telegram = telegramShareUrl(url, caption);

  const copy = async () => {
    const ok = await copyText(url, t("Copy this link", "Bu havolani nusxalang", "Скопируйте эту ссылку"));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-10 rounded-2xl border border-border bg-card/60 p-6" data-testid="share-credential">
      <div className="flex items-center gap-2 mb-1.5">
        <Share2 className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">{t("Show it to the world", "Buni dunyoga ko'rsating", "Покажите это миру")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {t(
          "Every link points at this verification page, so anyone who opens it can confirm the credential is genuine.",
          "Har bir havola shu tekshiruv sahifasiga olib boradi — ochgan har kim sertifikat haqiqiyligini tasdiqlay oladi.",
          "Каждая ссылка ведёт на эту страницу проверки — любой сможет убедиться в подлинности.",
        )}
      </p>

      <div className="flex flex-wrap gap-3">
        <a
          href={linkedIn.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0A66C2] text-white font-medium text-sm hover:brightness-110 transition"
          data-testid="share-linkedin"
        >
          <Linkedin className="w-4 h-4" />
          {t("Add to LinkedIn", "LinkedIn profiliga qo'shish", "Добавить в LinkedIn")}
        </a>

        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#229ED9] text-white font-medium text-sm hover:brightness-110 transition"
          data-testid="share-telegram"
        >
          <Send className="w-4 h-4" />
          {t("Share on Telegram", "Telegramda ulashish", "Поделиться в Telegram")}
        </a>

        <button
          onClick={copy}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-background font-medium text-sm hover:border-primary/40 transition"
          data-testid="share-copy"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
          {copied
            ? t("Copied", "Nusxalandi", "Скопировано")
            : t("Copy link", "Havolani nusxalash", "Копировать ссылку")}
        </button>
      </div>
    </div>
  );
}
