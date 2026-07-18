import { Link } from "wouter";
import { Shield, Trophy, Send, Zap, Target, Cpu } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useGetScoreboard } from "@workspace/api-client-react";
import { normalizeArray } from "@/lib/api-shapes";
import { motion } from "framer-motion";
import { FadeIn, ScaleIn } from "@/components/PageTransition";

export default function HomePage() {
  const { t } = useLang();
  const { data: scoreboard } = useGetScoreboard({ limit: 5 });
  const scoreboardEntries = normalizeArray<any>(scoreboard?.entries, ["entries", "data", "items"]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full opacity-50" />
        <div className="absolute bottom-[10%] left-[-10%] w-[60%] h-[60%] bg-accent/5 blur-[120px] rounded-full opacity-50" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-32 sm:pt-48 pb-32">
        {/* Hero Section */}
        <section className="mb-48 text-center relative">
          <ScaleIn>
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-[3rem] bg-gradient-to-br from-primary/20 to-accent/20 border border-foreground/10 mb-12 animate-float shadow-2xl backdrop-blur-md">
              <Shield className="w-14 h-14 text-primary" />
            </div>
          </ScaleIn>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-8xl sm:text-[10rem] font-black tracking-tighter mb-8 leading-none"
          >
            <span className="gradient-text">cd</span>
            <span className="text-foreground/10 ml-2">CTF</span>
          </motion.h1>
          
          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-20 font-medium tracking-tight leading-relaxed">
              {t(
                "THE NEXT GENERATION OF CYBER SECURITY CHALLENGES. REWIRING THE FUTURE OF OFFENSIVE OPERATIONS.",
                "KIBERXAVFSIZLIK CHAQIRIQLARINING YANGI AVLODI. HUJUMKOR OPERATSIYALAR KELAJAGINI QAYTA QURISH.",
                "СЛЕДУЮЩЕЕ ПОКОЛЕНИЕ КИБЕРВЫЗОВОВ. ПЕРЕОСМЫСЛЕНИЕ БУДУЩЕГО НАСТУПАТЕЛЬНЫХ ОПЕРАЦИЙ."
              )}
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link href="/register">
                <button className="cyber-button group h-20 px-16 text-sm">
                  <span className="flex items-center gap-3">
                    <Zap className="w-4 h-4" />
                    {t("INITIATE_PROTOCOL", "TIZIMGA KIRISH", "ЗАПУСТИТЬ ПРОТОКОЛ")}
                  </span>
                </button>
              </Link>
              <Link href="/ctf">
                <button className="cyber-button-outline h-20 px-16 text-sm">
                  {t("EXPLORE_MISSIONS", "MISSIYALARNI KO'RISH", "ИССЛЕДОВАТЬ МИССИИ")}
                </button>
              </Link>
            </div>
          </FadeIn>
        </section>

        {/* Feature Grid */}
        <section className="mb-48 grid md:grid-cols-3 gap-8">
          {[
            // The titles stay in the terminal-style English the whole site uses;
            // the descriptions are prose, and everything else prose is translated.
            { icon: Target, title: "REAL-WORLD OPS", desc: t("Simulate advanced persistent threats in a sandboxed environment.", "Xavfsiz muhitda ilg'or, doimiy tahdidlarni simulyatsiya qiling.", "Моделируйте продвинутые постоянные угрозы в изолированной среде.") },
            { icon: Cpu, title: "CORE_ENGINE", desc: t("Powered by proprietary vulnerability research and analysis tools.", "Maxsus zaiflik tadqiqoti va tahlil vositalari asosida.", "На основе собственных инструментов исследования и анализа уязвимостей.") },
            { icon: Trophy, title: "ELITE_RANKING", desc: t("Compete with the top 0.1% of security researchers globally.", "Dunyodagi eng kuchli 0.1% xavfsizlik tadqiqotchilari bilan bellashing.", "Соревнуйтесь с лучшими 0.1% исследователей безопасности в мире.") }
          ].map((feature, i) => (
            <FadeIn key={i} delay={i * 0.1 + 0.6}>
              <div className="glass-card h-full group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary/20 transition-colors border border-primary/20">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase">{feature.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </section>

        {/* Leaderboard Section */}
        <section className="mb-48 max-w-5xl mx-auto">
          <FadeIn>
            <div className="flex items-center justify-between mb-16 px-4">
              <div className="flex items-center gap-8">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">TOP_OPERATIVES</h2>
                  <div className="text-[10px] font-black text-muted-foreground tracking-[0.4em]">RANKING_SYSTEM_v4.2</div>
                </div>
              </div>
              <Link href="/scoreboard" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors">
                VIEW_FULL_LOGS
                <span className="w-4 h-px bg-primary group-hover:bg-accent transition-all group-hover:w-8" />
              </Link>
            </div>
          </FadeIn>
          
          <div className="grid gap-6">
            {scoreboardEntries.map((entry, i) => (
              <FadeIn key={entry.userId} delay={i * 0.05}>
                <div className="glass-card group flex items-center justify-between hover:bg-foreground/[0.02]">
                  <div className="flex items-center gap-8">
                    <span className="text-xs font-black text-muted-foreground/10 w-8">{ (i + 1).toString().padStart(2, '0') }</span>
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center font-black text-primary text-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 overflow-hidden">
                        {entry.nickname[0].toUpperCase()}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      </div>
                      {i < 3 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center text-[10px] font-bold shadow-lg shadow-accent/20">
                          #{i+1}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-2xl font-black block group-hover:text-primary transition-colors">{entry.nickname}</span>
                      <div className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-1">Status: Active</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-16">
                    <div className="hidden sm:block text-right">
                      <div className="text-[9px] text-muted-foreground/40 font-black tracking-widest mb-1">XP_ACCUMULATED</div>
                      <div className="text-xl font-black tabular-nums">{entry.points.toLocaleString()}</div>
                    </div>
                    <Link href={`/profile/${entry.userId}`}>
                      <button className="text-[10px] font-black border border-foreground/5 bg-foreground/5 px-8 py-4 rounded-2xl hover:border-primary/50 hover:text-primary transition-all uppercase tracking-[0.2em] backdrop-blur-md">
                        PROFILE
                      </button>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      </div>

      {/* Industrial Footer */}
      <footer className="border-t border-foreground/5 pt-32 pb-16 bg-card/30 relative overflow-hidden backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-24 mb-32">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4 mb-10">
                <div className="text-5xl font-black tracking-tighter">
                  <span className="gradient-text">cd</span>
                  <span className="text-foreground/10">CTF</span>
                </div>
              </div>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-12 max-w-xl">
                {t(
                  "Providing the technical infrastructure and challenges required for elite security research and training in the digital age.",
                  "Raqamli asrda elita xavfsizlik tadqiqotlari va o'qitish uchun zarur bo'lgan texnik infratuzilma va vazifalarni taqdim etadi.",
                  "Предоставление технической инфраструктуры и задач, необходимых для элитных исследований в области безопасности."
                )}
              </p>
              <div className="flex items-center gap-6">
                <a 
                  href="https://t.me/cdctf_uz" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-4 px-8 py-4 bg-[#0088cc] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all hover:scale-105 shadow-xl shadow-[#0088cc]/20"
                >
                  <Send className="w-4 h-4" />
                  TELEGRAM_COMMS
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:col-span-2 gap-16">
              <div className="space-y-10">
                <h4 className="text-xs font-black tracking-[0.3em] uppercase text-foreground/70">SITEMAP</h4>
                <ul className="space-y-6 text-sm font-bold">
                  <li><Link href="/ctf" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">./Missions</Link></li>
                  <li><Link href="/learn" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">./Academy</Link></li>
                  <li><Link href="/scoreboard" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">./Ranking</Link></li>
                  <li><Link href="/competitions" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">./Events</Link></li>
                </ul>
              </div>
              <div className="space-y-10">
                <h4 className="text-xs font-black tracking-[0.3em] uppercase text-foreground/70">SYSTEM_INFO</h4>
                <ul className="space-y-6 text-sm font-bold text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,210,255,0.5)]" /> 
                    STATUS: OPTIMAL
                  </li>
                  <li>LATENCY: 14MS</li>
                  <li>VERSION: 3.0.0_ULTRA</li>
                  <li>ENCRYPTION: AES-256</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* muted-foreground is already the subdued colour; the /20 on top of it
              left these two links and the copyright at a 1.34 contrast ratio —
              not subtle, unreadable. */}
          <div className="pt-16 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em]">
            <div>© {new Date().getFullYear()} CDCTF PLATFORM. SECURED BY BOZKURT.</div>
            <div className="flex items-center gap-12">
              <a href="#" className="hover:text-primary transition-colors">SECURITY_POLICY</a>
              <a href="#" className="hover:text-primary transition-colors">TERMS_OF_ENGAGEMENT</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
