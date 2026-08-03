import { useAuth } from "@/lib/AuthContext";
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export function ReferralBanner() {
  const { user } = useAuth();
  const { t } = useLang();

  if (!user || !user.isPendingReferee) {
    return null;
  }

  return (
    <div className="bg-primary/10 border-b border-primary/20 p-3 flex items-center justify-center gap-3 text-sm animate-in slide-in-from-top-2">
      <AlertCircle className="w-5 h-5 text-primary shrink-0" />
      <span className="text-zinc-200">
        {t(
          "You were invited! Solve at least 1 CTF challenge to activate your account and reward your friend.",
          "Siz do'stingiz taklifi bilan kelgansiz! Akkauntingizni to'liq faollashtirish va do'stingizga bonus berish uchun 1 ta CTF yeching.",
          "Вы были приглашены! Решите как минимум 1 CTF задачу, чтобы активировать аккаунт и наградить друга."
        )}
      </span>
      <Link href="/ctf">
        <button className="bg-primary text-black px-4 py-1.5 rounded font-medium text-xs hover:bg-primary/90 transition-colors whitespace-nowrap">
          {t("Solve CTF", "CTF yechish", "Решить CTF")}
        </button>
      </Link>
    </div>
  );
}
