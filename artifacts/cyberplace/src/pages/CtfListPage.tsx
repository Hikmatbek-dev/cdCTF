import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, CheckCircle2, Lock, Shield, Zap, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useListCtfChallenges, getListCtfChallengesQueryKey } from "@workspace/api-client-react";
import { normalizeCtfChallenges } from "@/lib/api-shapes";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, ScaleIn } from "@/components/PageTransition";

const CATEGORIES = [
  "All", "Web", "Crypto", "Reverse", "Forensics", "Pwn", "OSINT", 
  "Steganography", "Miscellaneous", "Mobile", "Hardware", 
  "Networking", "Cloud", "AI", "Scripting", "Others"
];
const DIFFICULTIES = ["All", "easy", "medium", "hard", "insane"];

export default function CtfListPage() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [solved, setSolved] = useState<"all" | "solved" | "unsolved">("all");
  const [page, setPage] = useState(1);
  
  const queryParams = {
    page,
    limit: 24,
    ...(category !== "All" ? { category } : {}),
    ...(difficulty !== "All" ? { difficulty: difficulty as "easy" | "medium" | "hard" | "insane" } : {}),
    ...(solved === "solved" ? { solved: true } : solved === "unsolved" ? { solved: false } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading } = useListCtfChallenges(
    queryParams,
    { query: { queryKey: getListCtfChallengesQueryKey(queryParams) } }
  ) as any;

  const challenges = normalizeCtfChallenges(data?.challenges || []);
  const totalPages = data?.totalPages || 1;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full opacity-30" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-16">
          <FadeIn>
            <div className="flex items-center gap-6 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-accent/20 border border-foreground/10 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/5 backdrop-blur-md">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2">MISSION_DATABASE</h1>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">{t("CONNECTION_ENCRYPTED // ACCESS_LEVEL: OPERATIVE", "TIZIMGA ULANDI // RUXSAT: OPERATIV", "СОЕДИНЕНИЕ ЗАЩИЩЕНО // ДОСТУП: ОПЕРАТИВНИК")}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Filters Panel */}
        <FadeIn delay={0.1}>
          <div className="glass-card p-6 flex flex-wrap items-center gap-6 mb-16 rounded-[2.5rem] border-foreground/10">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                placeholder={t("SEARCH_CHALLENGES...", "MISSIA QIDIRISH...", "ПОИСК_ЗАДАНИЙ...")}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-12 pr-6 h-14 bg-foreground/5 border border-foreground/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm tracking-wide placeholder:text-muted-foreground/30"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-foreground/5 p-1 rounded-2xl border border-foreground/5 backdrop-blur-md">
                {(["all", "solved", "unsolved"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setSolved(v); setPage(1); }}
                    className={`px-8 h-12 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                      solved === v 
                        ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v === "all" ? "ALL" : v === "solved" ? "DONE" : "OPEN"}
                  </button>
                ))}
              </div>

              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="h-14 w-48 bg-foreground/5 border-foreground/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10 transition-all">
                  <SelectValue placeholder="CATEGORY" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer">{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
                <SelectTrigger className="h-14 w-40 bg-foreground/5 border-foreground/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10 transition-all">
                  <SelectValue placeholder="THREAT" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2">
                  {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FadeIn>

        {/* Assets Grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 bg-foreground/5 rounded-[2.5rem]" />
              ))}
            </motion.div>
          ) : challenges.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card py-40 text-center rounded-[3rem] border-foreground/5"
            >
              <div className="w-20 h-20 bg-foreground/5 border border-foreground/5 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float">
                <Target className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-[0.3em] text-muted-foreground/40">{t("NO_MISSIONS_FOUND_IN_SECTOR", "SEKTORDA TOPSHIRIQ YO'Q", "ЗАДАНИЯ_НЕ_НАЙДЕНЫ")}</h3>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-16"
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {challenges.map((ch, i) => (
                  <FadeIn key={ch.id} delay={i * 0.05}>
                    <Link href={`/ctf/${ch.id}`}>
                      <div
                        className={`glass-card p-10 group cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden rounded-[2.5rem] flex flex-col h-full border-foreground/5 hover:border-primary/30 ${
                          ch.isSolved ? "bg-primary/[0.03] border-primary/20 shadow-primary/5" : ch.isBlocked ? "opacity-30 grayscale pointer-events-none" : ""
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex items-start justify-between mb-10">
                          <DifficultyBadge difficulty={ch.difficulty} className="rounded-xl px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-lg border-foreground/5" />
                          {ch.isSolved ? (
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl shadow-primary/10">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center text-foreground/20 group-hover:text-primary group-hover:border-primary/40 transition-all duration-500">
                              <Zap className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Title Section */}
                        <div className="mb-auto">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-3 block">{ch.category}</div>
                          <h3 className="text-3xl font-black tracking-tighter group-hover:text-primary transition-colors leading-none uppercase mb-6 break-words">{ch.name}</h3>
                        </div>
                        
                        {/* Stats Section */}
                        <div className="flex items-center justify-between pt-10 border-t border-foreground/5">
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-2">XP_VALUE</div>
                            <div className="text-3xl font-black tabular-nums leading-none tracking-tighter">{ch.points}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-2">BREACHES</div>
                            <div className="text-xs font-black text-foreground/60 tabular-nums">{ch.solvedCount} USERS</div>
                          </div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      </div>
                    </Link>
                  </FadeIn>
                ))}
              </div>

              <div className="pt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

