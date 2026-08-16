import { useParams, Link } from "wouter";
import { Award, Share2, Download, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { FadeIn } from "@/components/PageTransition";
import { PATHS } from "./LearnPage";

export default function PathCertificatePage() {
  const { pathId } = useParams();
  const { t, lang } = useLang();
  
  const path = PATHS.find(p => p.id === pathId) || PATHS[0];
  const loc = (obj: any) => obj[lang] || obj["en"];

  const handleShare = () => {
    // Simulated share
    alert(t("Link copied to clipboard!", "Havola nusxalandi!", "Ссылка скопирована!"));
  };

  return (
    <div className="min-h-screen bg-background text-foreground page relative pb-24">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-br ${path.color} rounded-full blur-[120px] opacity-20 mix-blend-screen`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr ${path.color} rounded-full blur-[100px] opacity-20 mix-blend-screen`} />
        <div className="fixed inset-0 mono-grid opacity-20" />
      </div>

      <div className="shell relative z-10 pt-16">
        <div className="max-w-4xl mx-auto">
          
          <Link href="/learn" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-wider text-sm font-bold mb-10">
            <ArrowLeft className="w-4 h-4" /> {t("Back to Pathways", "Yo'nalishlarga Qaytish", "Вернуться к Путям")}
          </Link>

          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-sm font-bold uppercase tracking-widest mb-6">
                <CheckCircle2 className="w-4 h-4" />
                {t("Path Successfully Completed", "Yo'nalish Muvaffaqiyatli Yakunlandi", "Путь Успешно Завершен")}
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4">
                {t("Official ", "Rasmiy ", "Официальный ")}
                <span className={`bg-gradient-to-r ${path.color} bg-clip-text text-transparent`}>
                  {t("Certificate", "Sertifikat", "Сертификат")}
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t(
                  "You have demonstrated mastery over all modules in this track and passed the final rigorous examination.",
                  "Siz ushbu yo'nalishdagi barcha modullarni mukammal o'zlashtirdingiz va yakuniy jiddiy imtihondan o'tdingiz.",
                  "Вы продемонстрировали мастерство во всех модулях этого трека и сдали итоговый строгий экзамен."
                )}
              </p>
            </div>
          </FadeIn>

          {/* Certificate Render */}
          <FadeIn delay={0.2}>
            <div className={`glass-card p-1 sm:p-2 rounded-[2rem] border-primary/20 shadow-2xl relative overflow-hidden mb-12 ${path.shadow}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
              
              <div className="relative z-10 bg-card rounded-[1.75rem] border border-border p-8 sm:p-16 text-center flex flex-col items-center justify-center min-h-[500px] overflow-hidden">
                {/* Certificate Watermarks & Accents */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                <div className="absolute -right-20 -top-20 w-64 h-64 border-[1px] border-primary/10 rounded-full" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 border-[1px] border-primary/10 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.02] pointer-events-none flex items-center justify-center">
                  <ShieldCheck className="w-full h-full" />
                </div>
                
                <Award className="w-16 h-16 text-primary mb-6 animate-pulse" />
                
                <h3 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-[0.3em] mb-8">
                  {t("Certificate of Completion", "Tugatganlik To'g'risida Sertifikat", "Сертификат об Окончании")}
                </h3>
                
                <h2 className="text-5xl sm:text-6xl font-black tracking-tighter mb-4 text-foreground drop-shadow-sm">
                  {loc(path.title)} {t("Specialist", "Mutaxassisi", "Специалист")}
                </h2>
                
                <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12 font-medium">
                  {t(
                    "This verifies the successful completion of the comprehensive cyber security curriculum for the associated pathway.",
                    "Ushbu hujjat tegishli yo'nalish bo'yicha keng qamrovli kiberxavfsizlik o'quv dasturi muvaffaqiyatli yakunlanganligini tasdiqlaydi.",
                    "Это подтверждает успешное завершение комплексной учебной программы по кибербезопасности для соответствующего направления."
                  )}
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-2xl mt-auto pt-10 border-t border-border/50 gap-6">
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("Issued By", "Berilgan", "Выдан")}</div>
                    <div className="text-xl font-black flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" /> cdCTF Academy
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("Credential ID", "Hujjat ID", "ID Документа")}</div>
                    <div className="text-xl font-mono font-bold">CDCTF-{path.id.toUpperCase().substring(0,4)}-{Math.floor(Math.random()*9000+1000)}</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={handleShare} className="cyber-button-outline h-14 px-8 text-lg gap-2 w-full sm:w-auto">
                <Share2 className="w-5 h-5" /> {t("Share Credential", "Hujjatni Ulashish", "Поделиться Документом")}
              </button>
              <button className="cyber-button h-14 px-8 text-lg gap-2 w-full sm:w-auto shadow-primary/20">
                <Download className="w-5 h-5" /> {t("Download PDF", "PDF Yuklab Olish", "Скачать PDF")}
              </button>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
