import { useState } from "react";
import { Link } from "wouter";
import { Search, CheckCircle2, Shield, Zap, Target, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useListCtfChallenges, getListCtfChallengesQueryKey } from "@workspace/api-client-react";
import { normalizeCtfChallenges } from "@/lib/api-shapes";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/PageTransition";

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
        {/* Header. The old one said MISSION_DATABASE over
            CONNECTION_ENCRYPTED // ACCESS_LEVEL: OPERATIVE, which tells a
            newcomer nothing about what this page is or how to use it. */}
        <div className="mb-10">
          <FadeIn>
            <div className="eyebrow mb-3">
              <Shield className="w-3.5 h-3.5" />
              {t("cdCTF · Practice", "cdCTF · Amaliyot", "cdCTF · Практика")}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              <span className="gradient-text">{t("CTF challenges", "CTF topshiriqlar", "CTF задания")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-relaxed mb-6">
              {t(
                "Each challenge hides a secret string — the flag. Break in however you can, then submit the flag to score. Points go to the leaderboard.",
                "Har topshiriqda yashirin satr — flag bor. Uni istalgan yo'l bilan toping va topshiring, ball olasiz. Ballar reytingga qo'shiladi.",
                "В каждом задании спрятана секретная строка — флаг. Найдите её любым способом и сдайте, чтобы получить очки. Очки идут в рейтинг.",
              )}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-primary">flag&#123;...&#125;</span>
                {t("is what you are looking for", "— siz izlayotgan narsa", "— то, что вы ищете")}
              </span>
              <Link href="/modules" className="inline-flex items-center gap-1 min-h-[24px] py-1 text-primary hover:text-accent transition-colors">
                {t("New to this? Start with the lessons", "Yangimisiz? Darslardan boshlang", "Впервые? Начните с уроков")}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Filters Panel */}
        <FadeIn delay={0.1}>
          <div className="glass-card p-6 flex flex-wrap items-center gap-6 mb-16 rounded-[2.5rem] border-foreground/10">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-hidden="true" />
              {/* A placeholder is not a label: it vanishes as soon as you type,
                  and screen readers are not required to announce it. */}
              <input
                type="search"
                aria-label={t("Search challenges", "Missiyalarni qidirish", "Поиск заданий")}
                placeholder={t("Search challenges…", "Topshiriqlarni qidirish…", "Поиск заданий…")}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-12 pr-6 h-14 bg-foreground/5 border border-foreground/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm placeholder:text-muted-foreground/60"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-foreground/5 p-1 rounded-2xl border border-foreground/5 backdrop-blur-md">
                {(["all", "solved", "unsolved"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setSolved(v); setPage(1); }}
                    // The active chip fills with --btn-from, not --primary:
                    // --primary is tuned to be legible *as text* on the page and
                    // is too light to carry white text as a *fill* (3.9:1).
                    style={solved === v ? { backgroundColor: "hsl(var(--btn-from))" } : undefined}
                    className={`px-6 h-12 text-sm font-medium transition-all rounded-xl ${
                      solved === v
                        ? "text-white shadow-xl shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v === "all"
                      ? t("All", "Hammasi", "Все")
                      : v === "solved"
                        ? t("Solved", "Yechilgan", "Решённые")
                        : t("Unsolved", "Yechilmagan", "Нерешённые")}
                  </button>
                ))}
              </div>

              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="h-14 w-48 bg-foreground/5 border-foreground/5 rounded-2xl text-sm hover:bg-foreground/10 transition-all">
                  <SelectValue placeholder={t("Category", "Kategoriya", "Категория")} />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="rounded-xl px-4 py-2.5 text-sm cursor-pointer">{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
                <SelectTrigger className="h-14 w-44 bg-foreground/5 border-foreground/5 rounded-2xl text-sm hover:bg-foreground/10 transition-all">
                  <SelectValue placeholder={t("Difficulty", "Qiyinlik", "Сложность")} />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl p-2">
                  {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="rounded-xl px-4 py-2.5 text-sm cursor-pointer">{d}</SelectItem>)}
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
              <h3 className="text-lg font-semibold mb-2">{t("Nothing matches these filters", "Bu filtrlarga mos topshiriq yo'q", "По этим фильтрам ничего нет")}</h3>
              <p className="text-sm text-muted-foreground">{t("Try clearing the search or picking another category.", "Qidiruvni tozalang yoki boshqa kategoriya tanlang.", "Очистите поиск или выберите другую категорию.")}</p>
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
                        className={`glass-card p-6 group cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden rounded-[2.5rem] flex flex-col h-full border-foreground/5 hover:border-primary/30 ${
                          ch.isSolved ? "bg-primary/[0.03] border-primary/20 shadow-primary/5" : ch.isBlocked ? "opacity-30 grayscale pointer-events-none" : ""
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex items-start justify-between mb-5">
                          <DifficultyBadge difficulty={ch.difficulty} className="rounded-lg px-3 py-1 text-[11px] font-medium" />
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
                          <div className="text-xs font-medium uppercase tracking-wider text-primary/80 mb-2">{ch.category}</div>
                          <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors leading-snug mb-4 break-words">{t(ch.name, ch.nameUz ?? undefined, ch.nameRu ?? undefined)}</h3>
                        </div>
                        
                        {/* Stats Section */}
                        <div className="flex items-center justify-between pt-5 border-t border-foreground/10">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t("Points", "Ball", "Очки")}</div>
                            <div className="text-2xl font-bold tabular-nums leading-none text-primary">{ch.points}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">{t("Solved by", "Yechganlar", "Решили")}</div>
                            <div className="text-sm font-medium tabular-nums">{ch.solvedCount}</div>
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

