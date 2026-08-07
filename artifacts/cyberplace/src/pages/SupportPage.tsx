import { useState } from "react";
import { LifeBuoy, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = ["bug", "question", "suggestion", "other"] as const;

export default function SupportPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const label = (c: string) =>
    c === "bug" ? t("Bug / error", "Xatolik", "Ошибка")
    : c === "question" ? t("Question", "Savol", "Вопрос")
    : c === "suggestion" ? t("Suggestion", "Taklif", "Предложение")
    : t("Other", "Boshqa", "Другое");

  const submit = async () => {
    if (message.trim().length < 5) {
      toast({ title: t("Please describe the problem", "Muammoni yozing", "Опишите проблему"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          category,
          email: email.trim() || undefined,
          // Where they came from, to help reproduce.
          pageUrl: document.referrer || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "failed");
      setSent(true);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t("Error", "Xato", "Ошибка"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background page">
      <div className="shell-narrow py-12 max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">{t("Support", "Yordam", "Поддержка")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          {t("Found a bug or something not working? Tell us — every product has bugs, and yours help us fix them fast.",
             "Xatolik topdingizmi yoki nimadir ishlamayaptimi? Bizga ayting — ish bor joyda xato bor, sizning xabaringiz uni tez tuzatishga yordam beradi.",
             "Нашли баг или что-то не работает? Напишите нам — в любом продукте есть ошибки, и ваше сообщение поможет быстро их исправить.")}
        </p>

        {sent ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center" data-testid="support-sent">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">{t("Thank you!", "Rahmat!", "Спасибо!")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("Your report reached the team. If you left an email, we may follow up.",
                 "Xabaringiz jamoaga yetdi. Email qoldirgan bo'lsangiz, javob berishimiz mumkin.",
                 "Ваше сообщение получено. Если вы оставили email, мы можем ответить.")}
            </p>
            <Button variant="outline" className="mt-6" onClick={() => { setSent(false); setMessage(""); }} data-testid="button-send-another">
              {t("Send another", "Yana yuborish", "Отправить ещё")}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Type", "Turi", "Тип")}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${category === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
                    data-testid={`support-category-${c}`}
                  >
                    {label(c)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Message", "Xabar", "Сообщение")}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                placeholder={t("What happened? What did you expect? Where on the site?",
                               "Nima bo'ldi? Nimani kutgandingiz? Saytning qayerida?",
                               "Что случилось? Что вы ожидали? Где на сайте?")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                data-testid="support-message"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {t("Email (optional — so we can reply)", "Email (ixtiyoriy — javob berishimiz uchun)", "Email (необязательно — для ответа)")}
              </label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" data-testid="support-email" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {t("Or reach us on Telegram:", "Yoki Telegram orqali:", "Или в Telegram:")}{" "}
                <a href="https://t.me/Hikmatdev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@Hikmatdev</a>
              </p>
              <Button onClick={submit} disabled={busy} className="gap-2 shrink-0" data-testid="button-support-submit">
                <Send className="w-4 h-4" /> {busy ? t("Sending...", "Yuborilmoqda...", "Отправка...") : t("Send", "Yuborish", "Отправить")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
