import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Shield, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/LanguageContext";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

type FormData = z.infer<typeof schema>;

export default function ResendVerificationPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send request");
      
      setIsSent(true);
      toast({ title: t("Success", "Muvaffaqiyat", "Успех"), description: t("Verification email sent", "Tasdiqlash emaili yuborildi", "Письмо подтверждения отправлено") });
    } catch (err) {
      toast({ title: t("Error", "Xato", "Ошибка"), description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("Check your email", "Emailingizni tekshiring", "Проверьте почту")}</h1>
          <p className="text-muted-foreground mb-8">
            {t("If the email is not verified, we've sent a new link.", "Agar email tasdiqlanmagan bo'lsa, yangi havola yubordik.", "Если почта не подтверждена, мы отправили новую ссылку.")}
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> {t("Back to login", "Kirishga qaytish", "Назад ko входу")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background pt-14">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t("Resend Verification", "Emailni qayta tasdiqlash", "Повторно подтвердить")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Enter your email to receive a new verification link", "Yangi tasdiqlash linkini olish uchun emailni kiriting", "Введите почту для получения новой ссылки")}
          </p>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Email Address", "Email Manzili", "Email адрес")}</FormLabel>
                  <div className="relative">
                    <Mail aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input {...field} placeholder="name@example.com" className="pl-9" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("Sending...", "Yuborilmoqda...", "Отправка...") : t("Send Link", "Havolani yuborish", "Отправить ссылку")}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="hover:text-primary transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> {t("Back to Login", "Kirishga qaytish", "Назад ko входу")}
          </Link>
        </p>
      </div>
    </div>
  );
}
