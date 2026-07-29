import { Link } from "wouter";
import { Send, Languages } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border py-14 relative mt-auto">
      <div className="shell">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="text-2xl font-bold tracking-tight mb-3">
              <span className="gradient-text">cd</span><span className="text-foreground/60">CTF</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-5">
              {t(
                "The cybersecurity academy for the Uzbek community — learn, practice, and get certified.",
                "O'zbek jamiyati uchun kiberxavfsizlik akademiyasi — o'rganing, mashq qiling va sertifikat oling.",
                "Академия кибербезопасности для узбекского сообщества — учитесь, практикуйтесь, получайте сертификат.",
              )}
            </p>
            <a href="https://t.me/cdctf" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0077b0] text-white text-sm font-medium hover:bg-[#0088cc] transition-colors">
              <Send className="w-4 h-4" />
              Telegram
            </a>
          </div>
          <div>
            <div className="eyebrow mb-4">{t("Learn", "O'rganish", "Обучение")}</div>
            <ul className="space-y-0.5 text-sm">
              <li><Link href="/start" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Start", "Boshlash", "Начать")}</Link></li>
              <li><Link href="/modules" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Modules", "Modullar", "Модули")}</Link></li>
              <li><Link href="/learn" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Lessons", "Darslar", "Уроки")}</Link></li>
              <li><Link href="/ctf" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("CTF challenges", "CTF topshiriqlar", "CTF задания")}</Link></li>
              <li><Link href="/glossary" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Glossary", "Lug'at", "Словарь")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">{t("Compete", "Bellashuv", "Соревнование")}</div>
            <ul className="space-y-0.5 text-sm">
              <li><Link href="/scoreboard" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Leaderboard", "Reyting", "Рейтинг")}</Link></li>
              <li><Link href="/competitions" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Competitions", "Musobaqalar", "Соревнования")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">{t("More", "Yana", "Ещё")}</div>
            <ul className="space-y-0.5 text-sm">
              <li><Link href="/jobs" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Careers", "Karyera", "Карьера")}</Link></li>
              <li><Link href="/talent" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Hire from cdCTF", "cdCTF'dan yollash", "Наём с cdCTF")}</Link></li>
              <li><Link href="/verify" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Verify a credential", "Sertifikatni tekshirish", "Проверить сертификат")}</Link></li>
              <li><Link href="/impact" className="inline-flex items-center min-h-[40px] py-2 text-muted-foreground hover:text-primary transition-colors">{t("Impact", "Ta'sir", "Влияние")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border text-sm text-muted-foreground flex items-center gap-2">
          <Languages className="w-4 h-4" />
          © {new Date().getFullYear()} cdCTF
        </div>
      </div>
    </footer>
  );
}
