import { Link } from "wouter";
import { Shield, Trophy, Send } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";

export default function HomePage() {
  const { t } = useLang();
  const { data: scoreboard } = useGetScoreboard({ limit: 5 });
  const scoreboardEntries = normalizeArray<any>(scoreboard?.entries, ["entries", "data", "items"]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Pattern */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-24 sm:pt-48 pb-24">
        {/* Hero Section */}
        <section className="mb-32 text-center relative">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-primary/10 border border-primary/20 mb-8 animate-in fade-in zoom-in duration-700 shadow-xl shadow-primary/5">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-7xl sm:text-9xl font-black tracking-tighter mb-8 animate-in slide-in-from-bottom-8 duration-700">
            <span className="text-primary">cd</span>
            <span className="text-muted-foreground/40">CTF</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-16 font-medium tracking-tight animate-in fade-in duration-1000 delay-200">
            {t(
              "ADVANCED PENETRATION TESTING & CRYPTOGRAPHIC ANALYSIS ENVIRONMENT. RESTRICTED ACCESS.",
              "MURAKKAB PENETRATSION TESTLASH VA KRIPTOGRAFIK TAHLIL MUHITI. FAQAT RUXSAT ETILGANLAR UCHUN.",
              "СРЕДА ДЛЯ ТЕСТИРОВАНИЯ НА ПРОНИКНОВЕНИЕ И КРИПТОГРАФИЧЕСКОГО АНАЛИЗА."
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <Link href="/register">
              <button className="cyber-button h-16 px-12 text-sm shadow-2xl shadow-primary/20 rounded-2xl">
                {t("AUTHENTICATE", "RO'YXATDAN O'TISH", "АУТЕНТИФИКАЦИЯ")}
              </button>
            </Link>
            <Link href="/ctf">
              <button className="cyber-button-outline h-16 px-12 text-sm rounded-2xl">
                {t("VIEW MISSIONS", "TOPSHIRIQLAR", "МИССИИ")}
              </button>
            </Link>
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="mb-32 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-12 px-2">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">TOP_OPERATIVES</h2>
            </div>
            <Link href="/scoreboard" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">
              View All
            </Link>
          </div>
          
          <div className="grid gap-4">
            {scoreboardEntries.map((entry, i) => (
              <div key={entry.userId} className="glass-card p-6 flex items-center justify-between group hover:border-primary/40 transition-all rounded-[2rem]">
                <div className="flex items-center gap-6">
                  <span className="text-xs font-black text-muted-foreground/20 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center font-black text-primary text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                    {entry.nickname[0].toUpperCase()}
                  </div>
                  <span className="text-xl font-black group-hover:text-primary transition-colors">{entry.nickname}</span>
                </div>
                <div className="flex items-center gap-12">
                  <div className="hidden sm:block text-right">
                    <div className="text-[9px] text-muted-foreground/40 font-black tracking-widest mb-1">XP_BALANCE</div>
                    <div className="text-sm font-black">{entry.points}</div>
                  </div>
                  <Link href={`/profile/${entry.userId}`}>
                    <button className="text-[10px] font-black border border-border px-6 py-2.5 rounded-xl hover:border-primary hover:text-primary transition-all uppercase tracking-widest bg-background/50 backdrop-blur-sm">
                      Profile
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Industrial Footer */}
      <footer className="border-t border-border pt-24 pb-12 bg-muted/30 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-16 mb-24">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="text-4xl font-black tracking-tighter">
                  <span className="text-primary">cd</span>
                  <span className="text-muted-foreground/40">CTF</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-8">
                {t(
                  "Technical infrastructure for offensive security research and training.",
                  "Hujumkor xavfsizlik tadqiqotlari va o'qitish uchun texnik infratuzilma.",
                  "Техническая инфраструктура для обучения наступательной безопасности."
                )}
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href="https://t.me/cdctf_uz" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram Channel
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:col-span-2 gap-12">
              <div className="space-y-8">
                <h4 className="text-xs font-black tracking-[0.2em] uppercase text-foreground">Navigation</h4>
                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                  <li><Link href="/ctf" className="hover:text-primary transition-colors">./Missions</Link></li>
                  <li><Link href="/learn" className="hover:text-primary transition-colors">./Academy</Link></li>
                  <li><Link href="/scoreboard" className="hover:text-primary transition-colors">./Ranking</Link></li>
                  <li><Link href="/competitions" className="hover:text-primary transition-colors">./Competitions</Link></li>
                </ul>
              </div>
              <div className="space-y-8">
                <h4 className="text-xs font-black tracking-[0.2em] uppercase text-foreground">System Status</h4>
                <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> 
                    SYSTEM: NOMINAL
                  </li>
                  <li>Uptime: 99.99%</li>
                  <li>Version: 2.1.0_PRO</li>
                  <li>Region: UZ_CORE_01</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.3em]">
            <div>© {new Date().getFullYear()} CDCTF CORE ENGINE. ALL RIGHTS RESERVED.</div>
            <div className="flex items-center gap-8">
              <span>ESTABLISHED BY BOZKURT_SHADOW</span>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
