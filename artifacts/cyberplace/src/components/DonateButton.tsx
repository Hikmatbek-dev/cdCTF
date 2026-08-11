import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

/**
 * A donate button that integrates with PayX. Shown in
 * the navbar for signed-in users. `variant="block"` renders a full-width row for
 * the mobile menu instead of the compact desktop pill.
 */
export function DonateButton({ variant = "pill", onCopied }: { variant?: "pill" | "block"; onCopied?: () => void }) {
  const { t } = useLang();

  useEffect(() => {
    // Load PayX embed script
    const scriptId = "payx-embed-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://payx.uz/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (variant === "block") {
    return (
      <>
        <button data-payx-pay data-slug="cdctf-tolov" id="hidden-payx-block" className="hidden" aria-hidden="true"></button>
        <button 
          className="flex items-center gap-3 w-full min-h-[48px] px-4 rounded-lg text-[15px] font-medium text-foreground/80 hover:bg-muted" 
          data-testid="button-donate"
          onClick={() => {
            document.getElementById("hidden-payx-block")?.click();
            onCopied?.();
          }}
        >
          <Heart className="w-4 h-4 text-rose-500" aria-hidden="true" />
          {t("Donate", "Xayriya", "Поддержать")}
        </button>
      </>
    );
  }

  return (
    <>
      <button data-payx-pay data-slug="cdctf-tolov" id="hidden-payx-pill" className="hidden" aria-hidden="true"></button>
      <button 
        className="flex items-center gap-2 h-11 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-sm font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer" 
        data-testid="button-donate"
        onClick={() => document.getElementById("hidden-payx-pill")?.click()}
      >
        <Heart className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t("Donate", "Xayriya", "Поддержать")}</span>
      </button>
    </>
  );
}
