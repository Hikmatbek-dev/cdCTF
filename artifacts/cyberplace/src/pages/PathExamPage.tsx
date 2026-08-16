import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Shield, CheckCircle2, ChevronRight, XCircle, Terminal, AlertTriangle, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { FadeIn } from "@/components/PageTransition";
import { PATHS } from "./LearnPage";

const PATH_QUESTIONS: Record<string, any[]> = {
  "foundation": [
    { q: { en: "What is the primary function of DNS?", uz: "DNS ning asosiy vazifasi nima?", ru: "Какова основная функция DNS?" }, options: { en: ["Translates names to IPs", "Encrypts data", "Blocks attacks", "Speeds up internet"], uz: ["Nomlarni IP ga o'giradi", "Ma'lumotni shifrlaydi", "Hujumlarni to'sadi", "Internetni tezlashtiradi"], ru: ["Преобразует имена в IP", "Шифрует данные", "Блокирует атаки", "Ускоряет интернет"] }, correct: 0 },
    { q: { en: "Which command lists all files, including hidden ones, in Linux?", uz: "Linuxda yashirin fayllarni ham ko'rsatuvchi buyruq qaysi?", ru: "Какая команда показывает все файлы, включая скрытые, в Linux?" }, options: { en: ["ls -la", "dir -a", "show all", "list -h"], uz: ["ls -la", "dir -a", "show all", "list -h"], ru: ["ls -la", "dir -a", "show all", "list -h"] }, correct: 0 },
    { q: { en: "What does HTTP stand for?", uz: "HTTP qanday ma'noni anglatadi?", ru: "Как расшифровывается HTTP?" }, options: { en: ["HyperText Transfer Protocol", "High Transfer Tech Protocol", "Hyper Transfer Text Program", "Host Text Transfer Protocol"], uz: ["HyperText Transfer Protocol", "High Transfer Tech Protocol", "Hyper Transfer Text Program", "Host Text Transfer Protocol"], ru: ["HyperText Transfer Protocol", "High Transfer Tech Protocol", "Hyper Transfer Text Program", "Host Text Transfer Protocol"] }, correct: 0 }
  ],
  "red-team": [
    { q: { en: "Which port does SSH run on by default?", uz: "SSH standart bo'yicha qaysi portda ishlaydi?", ru: "На каком порту по умолчанию работает SSH?" }, options: { en: ["22", "21", "80", "443"], uz: ["22", "21", "80", "443"], ru: ["22", "21", "80", "443"] }, correct: 0 },
    { q: { en: "What is Nmap primarily used for?", uz: "Nmap asosan nima uchun ishlatiladi?", ru: "Для чего в основном используется Nmap?" }, options: { en: ["Network discovery and security auditing", "Creating viruses", "DDoS attacks", "Password cracking"], uz: ["Tarmoq razvedkasi va xavfsizlik auditi", "Viruslar yaratish", "DDoS hujumlari", "Parollarni buzish"], ru: ["Обнаружение сети и аудит безопасности", "Создание вирусов", "DDoS-атаки", "Взлом паролей"] }, correct: 0 },
    { q: { en: "What is a reverse shell?", uz: "Reverse shell nima?", ru: "Что такое reverse shell?" }, options: { en: ["A shell initiated from the target to the attacker", "A shell initiated from attacker to target", "A firewall bypass tool", "An encryption method"], uz: ["Nishondan hujumchiga ulanadigan qobiq(shell)", "Hujumchidan nishonga ulanadigan qobiq", "Xavfsizlik devorini aylanib o'tish vositasi", "Shifrlash usuli"], ru: ["Оболочка, инициированная от цели к атакующему", "Оболочка, инициированная от атакующего к цели", "Инструмент обхода брандмауэра", "Метод шифрования"] }, correct: 0 }
  ],
  "blue-team": [
    { q: { en: "What does SIEM stand for?", uz: "SIEM qanday ma'noni anglatadi?", ru: "Как расшифровывается SIEM?" }, options: { en: ["Security Information and Event Management", "System Incident Event Monitor", "Secure Internal Enterprise Manager", "Server Information Endpoint Monitor"], uz: ["Security Information and Event Management", "System Incident Event Monitor", "Secure Internal Enterprise Manager", "Server Information Endpoint Monitor"], ru: ["Security Information and Event Management", "System Incident Event Monitor", "Secure Internal Enterprise Manager", "Server Information Endpoint Monitor"] }, correct: 0 },
    { q: { en: "Which tool is best for analyzing network packets?", uz: "Tarmoq paketlarini tahlil qilish uchun qaysi vosita eng yaxshi?", ru: "Какой инструмент лучше всего подходит для анализа сетевых пакетов?" }, options: { en: ["Wireshark", "Metasploit", "Burp Suite", "Hydra"], uz: ["Wireshark", "Metasploit", "Burp Suite", "Hydra"], ru: ["Wireshark", "Metasploit", "Burp Suite", "Hydra"] }, correct: 0 },
    { q: { en: "What is the goal of incident response?", uz: "Insidentlarga javob berishdan maqsad nima?", ru: "Какова цель реагирования на инциденты?" }, options: { en: ["To identify, contain, and recover from an attack", "To hack back the attacker", "To hide the data breach", "To delete all server logs"], uz: ["Hujumni aniqlash, ushlab turish va undan qutulish", "Hujumchiga qarshi hujum qilish", "Ma'lumotlar sizib chiqishini yashirish", "Barcha server jurnallarini o'chirish"], ru: ["Выявить, локализовать и восстановиться после атаки", "Взломать атакующего в ответ", "Скрыть утечку данных", "Удалить все логи сервера"] }, correct: 0 }
  ],
  "web-security": [
    { q: { en: "What is SQL Injection?", uz: "SQL Injection nima?", ru: "Что такое SQL-инъекция?" }, options: { en: ["Injecting malicious SQL queries into user input", "Stealing user cookies", "Overloading the server with traffic", "Encrypting database passwords"], uz: ["Foydalanuvchi ma'lumotlariga zararli SQL so'rovlarini kiritish", "Foydalanuvchi kukilarini o'g'irlash", "Serverni trafik bilan to'ldirish", "Ma'lumotlar bazasi parollarini shifrlash"], ru: ["Внедрение вредоносных SQL-запросов в пользовательский ввод", "Кража пользовательских cookie", "Перегрузка сервера трафиком", "Шифрование паролей базы данных"] }, correct: 0 },
    { q: { en: "What prevents CSRF attacks?", uz: "CSRF hujumlarining oldini nima oladi?", ru: "Что предотвращает атаки CSRF?" }, options: { en: ["Anti-CSRF Tokens", "Firewalls", "Antivirus software", "Strong passwords"], uz: ["Anti-CSRF Tokenlari", "Xavfsizlik devorlari (Firewalls)", "Antivirus dasturlari", "Kuchli parollar"], ru: ["Анти-CSRF токены", "Брандмауэры", "Антивирусное ПО", "Сложные пароли"] }, correct: 0 },
    { q: { en: "Which vulnerability allows executing JavaScript in a victim's browser?", uz: "Qaysi zaiflik qurbon brauzerida JavaScript ishlashiga imkon beradi?", ru: "Какая уязвимость позволяет выполнять JavaScript в браузере жертвы?" }, options: { en: ["XSS (Cross-Site Scripting)", "SQLi", "IDOR", "SSRF"], uz: ["XSS (Cross-Site Scripting)", "SQLi", "IDOR", "SSRF"], ru: ["XSS (Cross-Site Scripting)", "SQLi", "IDOR", "SSRF"] }, correct: 0 }
  ]
};

export default function PathExamPage() {
  const { pathId } = useParams();
  const { t, lang } = useLang();
  const [, setLocation] = useLocation();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const pathQuestions = PATH_QUESTIONS[pathId || "foundation"] || PATH_QUESTIONS["foundation"];
  const currentQ = pathQuestions[currentIdx];

  const loc = (obj: any) => obj[lang] || obj["en"];

  const handleNext = () => {
    if (selected === null) return;
    const isCorrect = selected === currentQ.correct;
    const newAnswers = [...answers, isCorrect];
    setAnswers(newAnswers);
    
    if (currentIdx + 1 < pathQuestions.length) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      setIsFinished(true);
    }
  };

  const handleFinish = () => {
    const passed = answers.filter(Boolean).length === pathQuestions.length;
    if (passed) {
      setLocation(`/path-certificate/${pathId}`);
    } else {
      setLocation("/learn");
    }
  };

  if (isFinished) {
    const passed = answers.filter(Boolean).length === pathQuestions.length;
    return (
      <div className="min-h-screen bg-background text-foreground page flex items-center justify-center p-4">
        <FadeIn>
          <div className="glass-card max-w-lg w-full p-8 rounded-3xl text-center border-primary/20 shadow-2xl relative overflow-hidden">
             {passed ? (
               <>
                 <div className="absolute inset-0 bg-emerald-500/10 z-0 pointer-events-none" />
                 <ShieldCheck className="w-20 h-20 text-emerald-500 mx-auto mb-6 relative z-10 animate-bounce" />
                 <h2 className="text-3xl font-black mb-4 relative z-10">{t("Path Conquered!", "Yo'nalish Zapt Etildi!", "Путь Покорен!")}</h2>
                 <p className="text-muted-foreground mb-8 relative z-10">{t("You have successfully passed the final exam for this path.", "Siz ushbu yo'nalish bo'yicha yakuniy imtihondan muvaffaqiyatli o'tdingiz.", "Вы успешно сдали финальный экзамен для этого пути.")}</p>
                 <button onClick={handleFinish} className="cyber-button w-full h-12 gap-2 relative z-10 shadow-emerald-500/20" style={{ '--btn-primary': '16, 185, 129' } as any}>
                   {t("Claim Certificate", "Sertifikatni Olish", "Получить Сертификат")} <ChevronRight className="w-5 h-5" />
                 </button>
               </>
             ) : (
               <>
                 <div className="absolute inset-0 bg-rose-500/5 z-0 pointer-events-none" />
                 <AlertTriangle className="w-20 h-20 text-rose-500 mx-auto mb-6 relative z-10" />
                 <h2 className="text-3xl font-black mb-4 relative z-10">{t("Exam Failed", "Imtihondan Yiqildingiz", "Экзамен Не Сдан")}</h2>
                 <p className="text-muted-foreground mb-8 relative z-10">{t("You need a perfect score to pass the path exam. Review the modules and try again.", "Imtihondan o'tish uchun barcha savollarga to'g'ri javob berishingiz kerak. Modullarni takrorlang va qayta urining.", "Для сдачи экзамена нужно ответить правильно на все вопросы. Повторите модули и попробуйте снова.")}</p>
                 <button onClick={handleFinish} className="cyber-button-outline w-full h-12 gap-2 relative z-10 text-rose-500 border-rose-500/50 hover:bg-rose-500/10">
                   {t("Return to Path", "Yo'nalishga Qaytish", "Вернуться к Пути")}
                 </button>
               </>
             )}
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground page relative">
      <div className="fixed inset-0 mono-grid pointer-events-none opacity-20" />
      <div className="shell max-w-3xl pt-16 relative z-10">
        
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{t("Final Path Exam", "Yakuniy Yo'nalish Imtihoni", "Финальный Экзамен Пути")}</h1>
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{pathId}</p>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-muted-foreground">
              {t("Question", "Savol", "Вопрос")} <span className="text-foreground text-lg">{currentIdx + 1}</span> / {pathQuestions.length}
            </div>
          </div>
        </FadeIn>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-10 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${((currentIdx) / pathQuestions.length) * 100}%` }} 
          />
        </div>

        {/* Question Area */}
        <FadeIn key={currentIdx}>
          <div className="glass-card p-8 rounded-3xl border-primary/20 shadow-xl mb-8">
            <h2 className="text-xl sm:text-2xl font-bold leading-relaxed mb-8">
              {loc(currentQ.q)}
            </h2>
            
            <div className="space-y-4">
              {loc(currentQ.options).map((opt: string, i: number) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5' 
                        : 'border-border bg-card/50 hover:bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className={`text-base sm:text-lg font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {opt}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleNext} 
              disabled={selected === null}
              className="cyber-button h-14 px-8 text-lg gap-2 shadow-primary/20 disabled:opacity-50"
            >
              {currentIdx === pathQuestions.length - 1 ? t("Finish Exam", "Imtihonni Yakunlash", "Завершить Экзамен") : t("Next Question", "Keyingi Savol", "Следующий Вопрос")}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
