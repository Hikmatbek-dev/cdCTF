import { Link } from "wouter";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/LanguageContext";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-14">
      <div className="text-center">
        <Shield className="w-12 h-12 text-primary/30 mx-auto mb-4" />
        <h1 className="text-6xl font-mono font-bold text-primary mb-2">404</h1>
        <p className="text-muted-foreground mb-6">{t("Page not found", "Sahifa topilmadi", "Страница не найдена")}</p>
        <Link href="/">
          <Button data-testid="button-go-home">{t("Return Home", "Bosh sahifaga qaytish", "На главную")}</Button>
        </Link>
      </div>
    </div>
  );
}
