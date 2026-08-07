import { useState } from "react";
import { Heart, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";

// The founder's donation card. Static on purpose — cdCTF is free, and this is a
// voluntary "support the project" transfer, not a checkout.
const CARD_NUMBER = "5614 6818 5602 1179";
const CARD_NAME = "H.X";

/**
 * A donate button that reveals the founder's card and copies it on tap. Shown in
 * the navbar for signed-in users. `variant="block"` renders a full-width row for
 * the mobile menu instead of the compact desktop pill.
 */
export function DonateButton({ variant = "pill", onCopied }: { variant?: "pill" | "block"; onCopied?: () => void }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    // Digits only — pastes cleanly into any bank app's card field.
    navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, "")).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: t("Card number copied", "Karta raqami nusxalandi", "Номер карты скопирован") });
        onCopied?.();
      },
      () => toast({ title: CARD_NUMBER, variant: "destructive" }),
    );
  };

  const trigger = variant === "block" ? (
    <button className="flex items-center gap-3 w-full min-h-[48px] px-4 rounded-lg text-[15px] font-medium text-foreground/80 hover:bg-muted" data-testid="button-donate">
      <Heart className="w-4 h-4 text-rose-500" aria-hidden="true" />
      {t("Donate", "Xayriya", "Поддержать")}
    </button>
  ) : (
    <button className="flex items-center gap-2 h-11 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-sm font-semibold hover:bg-rose-500/20 transition-colors" data-testid="button-donate">
      <Heart className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">{t("Donate", "Xayriya", "Поддержать")}</span>
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3 mt-2 rounded-2xl">
        <p className="text-xs text-muted-foreground px-1 mb-3">
          {t("cdCTF is free. Support the project by sending any amount to this card — thank you 💙",
             "cdCTF bepul. Loyihani qo'llab-quvvatlash uchun shu kartaga istalgan miqdorda o'tkazing — rahmat 💙",
             "cdCTF бесплатен. Поддержите проект переводом любой суммы на эту карту — спасибо 💙")}
        </p>
        {/* Tap the card to copy the number. */}
        <button
          type="button"
          onClick={copy}
          className="group w-full text-left rounded-xl p-4 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-lg relative overflow-hidden"
          data-testid="donate-card"
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs uppercase tracking-wider opacity-80">UZCARD</span>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 opacity-80 group-hover:opacity-100" />}
          </div>
          <div className="font-mono text-lg tracking-widest tabular-nums" data-testid="donate-card-number">{CARD_NUMBER}</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium opacity-90">{CARD_NAME}</span>
            <span className="text-[11px] opacity-80">
              {copied ? t("Copied!", "Nusxalandi!", "Скопировано!") : t("Tap to copy", "Nusxalash uchun bosing", "Нажмите, чтобы скопировать")}
            </span>
          </div>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
