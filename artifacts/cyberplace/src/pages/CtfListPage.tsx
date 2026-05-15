import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, CheckCircle2, Lock, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useListCtfChallenges, getListCtfChallengesQueryKey } from "@workspace/api-client-react";
import { normalizeCtfChallenges } from "@/lib/api-shapes";

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
    limit: 25,
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
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20 relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 mono-grid pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Terminal */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/5">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">{t("Mission Control", "Topshiriqlar", "Контроль миссий")}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t("SECURE ACCESS TO LIVE CHALLENGE ASSETS", "HAQIQIY TOPSHIRIQLARGA RUXSAT", "ДОСТУП К ТЕКУЩИМ ЗАДАНИЯМ")}</p>
            </div>
          </div>
        </div>

        {/* Filters Terminal */}
        <div className="glass-card p-4 flex flex-wrap items-center gap-4 mb-12 rounded-[2rem]">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              placeholder={t("QUERY_BY_ID_OR_NAME...", "MISSIA NOMI...", "ПОИСК_ЗАДАНИЯ...")}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-11 h-12 bg-muted/50 border-border rounded-xl focus:border-primary focus:ring-primary/10 transition-all font-medium"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="h-12 w-48 bg-muted/50 border-border rounded-xl text-xs font-bold uppercase tracking-widest">
                <SelectValue placeholder="DOMAIN" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border rounded-xl shadow-xl">
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs font-bold uppercase cursor-pointer">{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
              <SelectTrigger className="h-12 w-40 bg-muted/50 border-border rounded-xl text-xs font-bold uppercase tracking-widest">
                <SelectValue placeholder="THREAT" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border rounded-xl shadow-xl">
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="text-xs font-bold uppercase cursor-pointer">{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
              {(["all", "solved", "unsolved"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setSolved(v); setPage(1); }}
                  className={`px-6 h-10 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${
                    solved === v 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "all" ? "ALL" : v === "solved" ? "DONE" : "OPEN"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              {isLoading ? "Synchronizing Streams..." : `${data?.total || 0} ACTIVE MISSIONS DETECTED`}
            </p>
          </div>
        </div>

        {/* Assets Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 bg-muted rounded-2xl" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="glass-card py-32 text-center rounded-[2rem]">
            <div className="w-16 h-16 bg-muted border border-border rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Filter className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest text-muted-foreground/60">{t("NO_DATA_MATCHES_CRITERIA", "MOS KELUVCHI TOPSHIRIQ YO'Q", "ДАННЫЕ_ОТСУТСТВУЮТ")}</h3>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {challenges.map(ch => (
                <Link href={`/ctf/${ch.id}`} key={ch.id}>
                  <div
                    className={`glass-card p-8 group cursor-pointer transition-all hover:-translate-y-1 relative overflow-hidden rounded-[2rem] ${
                      ch.isSolved ? "border-primary/40 bg-primary/[0.02]" : ch.isBlocked ? "opacity-40 grayscale" : ""
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-all pointer-events-none" />
                    
                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <DifficultyBadge difficulty={ch.difficulty} className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm" />
                      {ch.isSolved ? (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : ch.isBlocked ? (
                        <div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground/40 group-hover:border-primary/30 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>
                      )}
                    </div>

                    <div className="mb-12 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-2">{ch.category}</p>
                      <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors leading-tight uppercase">{ch.name}</h3>
                    </div>
                    
                    <div className="flex items-end justify-between border-t border-border pt-6 relative z-10">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-1">XP_YIELD</span>
                        <span className="text-2xl font-black text-foreground leading-none">{ch.points}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-1">BREACHES</span>
                        <div className="text-xs font-bold text-muted-foreground/80">{ch.solvedCount} USERS</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
