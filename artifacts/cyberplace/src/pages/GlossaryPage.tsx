import { BookA } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function GlossaryPage() {
  const { t } = useLang();

  const terms = [
    {
      term: t("points", "ball", "очки"),
      def: t(
        "The score you earn by completing lessons and solving CTF challenges.",
        "Darslarni tugatish va CTF topshiriqlarini yechish orqali olinadigan baho.",
        "Баллы, получаемые за прохождение уроков и решение CTF-заданий."
      ),
    },
    {
      term: "CTF",
      def: t(
        "Capture The Flag. Practical cybersecurity challenges where the goal is to find a hidden string ('flag').",
        "Capture The Flag. Amaliy kiberxavfsizlik topshiriqlari, maqsad - yashiringan qatorni ('flag'ni) topish.",
        "Capture The Flag. Практические задания по кибербезопасности, цель которых — найти скрытую строку ('флаг')."
      ),
    },
    {
      term: "Flag",
      def: t(
        "A hidden string of text formatted as cdctf{...} that proves you solved a challenge.",
        "Siz topshiriqni yechganingizni isbotlovchi cdctf{...} ko'rinishidagi yashirin matn.",
        "Скрытая строка текста в формате cdctf{...}, доказывающая, что вы решили задание."
      ),
    },
    {
      term: "Writeup",
      def: t(
        "A detailed explanation of how a challenge was solved.",
        "Topshiriq qanday yechilganligini batafsil tushuntirib beruvchi qo'llanma.",
        "Подробное объяснение того, как было решено задание."
      ),
    },
    {
      term: "Module",
      def: t(
        "A collection of lessons focused on a specific cybersecurity domain.",
        "Muayyan kiberxavfsizlik sohasiga qaratilgan darslar to'plami.",
        "Набор уроков, посвященных определенной области кибербезопасности."
      ),
    },
    {
      term: "Rank",
      def: t(
        "Your position on the global leaderboard based on your points.",
        "Balingizga asoslangan holda global reytingdagi o'rningiz.",
        "Ваша позиция в глобальной таблице лидеров на основе ваших очков."
      ),
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground page relative overflow-hidden">
      <div className="fixed inset-0 mono-grid pointer-events-none" />
      <div className="shell relative z-10 py-16">
        <div className="flex items-center gap-4 mb-8">
          <BookA className="w-8 h-8 text-primary" />
          <h1>{t("Glossary", "Lug'at", "Словарь")}</h1>
        </div>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          {t(
            "Common terms and definitions used across the cdCTF platform.",
            "cdCTF platformasida ishlatiladigan umumiy atamalar va ularning ma'nolari.",
            "Общие термины и определения, используемые на платформе cdCTF."
          )}
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {terms.map((item, i) => (
            <div key={i} className="glass-card !p-6 border-border hover:border-primary/20 transition-colors">
              <h3 className="font-semibold text-lg text-primary mb-2">{item.term}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.def}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
