import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, CheckCircle2, Shield, Zap, Target, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChallengeArt } from "@/components/ChallengeArt";
import { categoryStyle, difficultyStyle } from "@/lib/category-style";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Pagination } from "@/components/Pagination";
import { useLang } from "@/lib/LanguageContext";
import { useListCtfChallenges, getListCtfChallengesQueryKey } from "@workspace/api-client-react";
import { normalizeCtfChallenges } from "@/lib/api-shapes";
import { FadeIn } from "@/components/PageTransition";
import { LoadFailure } from "@/components/LoadFailure";

/** Order difficulties by how hard they are, not by how many exist. */
const DIFFICULTY_ORDER = ["easy", "medium", "hard", "insane"];

export default function CtfListPage() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  // Seed the filters from the URL, so a link like /ctf?category=Web — the one a
  // module or a lesson hands you — actually arrives filtered. Without this the
  // page opened on everything and the hand-off from the teaching half was lost.
  const [category, setCategory] = useState(() => {
    const v = new URLSearchParams(window.location.search).get("category");
    return v && v.trim() ? v : "All";
  });
  const [difficulty, setDifficulty] = useState(() => {
    const v = new URLSearchParams(window.location.search).get("difficulty");
    return v && ["easy", "medium", "hard", "insane"].includes(v) ? v : "All";
  });
  const [solved, setSolved] = useState<"all" | "solved" | "unsolved">("all");
  const [page, setPage] = useState(1);
  
  // Memoised so the query key keeps its identity between renders. Rebuilt
  // inline it was a fresh object every render, which kept React Query
  // restarting the request instead of settling on a result.
  const queryParams = useMemo(() => ({
    page,
    limit: 24,
    ...(category !== "All" ? { category } : {}),
    ...(difficulty !== "All" ? { difficulty: difficulty as "easy" | "medium" | "hard" | "insane" } : {}),
    ...(solved === "solved" ? { solved: true } : solved === "unsolved" ? { solved: false } : {}),
    ...(search ? { search } : {}),
  }), [page, category, difficulty, solved, search]);

  const { data, isLoading, isError, refetch } = useListCtfChallenges(
    queryParams,
    { query: { queryKey: getListCtfChallengesQueryKey(queryParams) } }
  ) as any;

  const challenges = normalizeCtfChallenges(data?.challenges || []);
  const totalPages = data?.totalPages || 1;

  // Only offer filters that lead somewhere. The server counts these across
  // every published challenge, so the options do not shift as you filter.
  type Facet = { value: string; count: number };
  const categoryFacets: Facet[] = data?.facets?.categories ?? [];
  const difficultyFacets: Facet[] = (data?.facets?.difficulties ?? [])
    .slice()
    .sort((a: Facet, b: Facet) => DIFFICULTY_ORDER.indexOf(a.value) - DIFFICULTY_ORDER.indexOf(b.value));

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 sm:pt-32 pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 mono-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-primary/5 hidden rounded-full opacity-30" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] bg-accent/5 hidden rounded-full opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header. The old one said MISSION_DATABASE over
            CONNECTION_ENCRYPTED // ACCESS_LEVEL: OPERATIVE, which tells a
            newcomer nothing about what this page is or how to use it. */}
        <div className="mb-6 sm:mb-10">
          <FadeIn>
            <div className="eyebrow mb-3">
              <Shield className="w-3.5 h-3.5" />
              {t("cdCTF · Practice", "cdCTF · Amaliyot", "cdCTF · Практика")}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3 sm:mb-4">
              <span className="gradient-text">{t("CTF challenges", "CTF topshiriqlar", "CTF задания")}</span>
            </h1>
            {/* The full explainer is desktop-only: on a phone it pushed the
                challenges themselves below the fold. Small screens get the one
                line that actually matters. */}
            <p className="hidden sm:block text-muted-foreground max-w-2xl leading-relaxed mb-6">
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
          <div className="glass-card p-4 sm:p-6 flex flex-wrap items-center gap-3 sm:gap-6 mb-8 sm:mb-16 rounded-xl border-foreground/10">
            {/* min-w-[300px] was wider than a 360px phone leaves after the page
                and card padding, and the parent is overflow-hidden — so the
                search box was clipped, not scrollable. Full width on mobile,
                the old floor from sm up. */}
            <div className="relative flex-1 w-full sm:w-auto sm:min-w-[300px]">
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
              <div className="flex items-center gap-3 bg-foreground/5 p-1 rounded-2xl border border-foreground/5 ">
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
                <SelectContent className="bg-card/95 border border-foreground/10 rounded-2xl shadow-2xl p-2">
                  <SelectItem value="All" className="rounded-xl px-4 py-2.5 text-sm cursor-pointer">
                    {t("All categories", "Barcha kategoriyalar", "Все категории")}
                  </SelectItem>
                  {categoryFacets.map(f => (
                    <SelectItem key={f.value} value={f.value} className="rounded-xl px-4 py-2.5 text-sm cursor-pointer">
                      {f.value} <span className="text-muted-foreground">({f.count})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
                <SelectTrigger className="h-14 w-44 bg-foreground/5 border-foreground/5 rounded-2xl text-sm hover:bg-foreground/10 transition-all">
                  <SelectValue placeholder={t("Difficulty", "Qiyinlik", "Сложность")} />
                </SelectTrigger>
                <SelectContent className="bg-card/95 border border-foreground/10 rounded-2xl shadow-2xl p-2">
                  <SelectItem value="All" className="rounded-xl px-4 py-2.5 text-sm cursor-pointer">
                    {t("Any difficulty", "Har qanday", "Любая")}
                  </SelectItem>
                  {difficultyFacets.map(f => (
                    <SelectItem key={f.value} value={f.value} className="rounded-xl px-4 py-2.5 text-sm cursor-pointer capitalize">
                      {f.value} <span className="text-muted-foreground">({f.count})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FadeIn>

        {/* Challenge grid. Rendered directly — an enter/exit animation wrapper
            here could leave the grid stuck on skeletons if a transition stalled,
            hiding challenges that had already loaded. */}
        <div>
          {isError ? (
            <LoadFailure onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 bg-foreground/5 rounded-xl" />
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="glass-card py-40 text-center rounded-xl border-foreground/5">
              <div className="w-20 h-20 bg-foreground/5 border border-foreground/5 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float">
                <Target className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("Nothing matches these filters", "Bu filtrlarga mos topshiriq yo'q", "По этим фильтрам ничего нет")}</h3>
              <p className="text-sm text-muted-foreground">{t("Try clearing the search or picking another category.", "Qidiruvni tozalang yoki boshqa kategoriya tanlang.", "Очистите поиск или выберите другую категорию.")}</p>
            </div>
          ) : (
            <div className="space-y-16">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Each card leads with generated cover art in its category's
                    colour — a hundred identical rows are unreadable, and the
                    colour is what makes the grid scannable without reading. */}
                {challenges.map((ch, i) => {
                  const cat = categoryStyle(ch.category);
                  const diff = difficultyStyle(ch.difficulty);
                  return (
                  <FadeIn key={ch.id} delay={i * 0.05}>
                    <Link href={`/ctf/${ch.id}`}>
                      {/* A room card, not a list row: a tall cover in the
                          category's colour, a status rail down the left edge,
                          and a hover state that lifts and lights up. The point
                          of the grid is that you can read it without reading
                          it. */}
                      <div
                        className={`group cursor-pointer transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden rounded-xl flex flex-col h-full border bg-card ${
                          ch.isSolved
                            ? "border-[hsl(var(--neon)/.45)] shadow-[0_0_0_1px_hsl(var(--neon)/.15)] hover:shadow-[0_18px_40px_-24px_hsl(var(--neon))]"
                            : "border-border hover:border-primary/50 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary))]"
                        } ${ch.isBlocked ? "opacity-40 grayscale pointer-events-none" : ""}`}
                      >
                        {/* Status rail — solved reads at a glance, from colour
                            and from position, before any text is parsed. */}
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 top-0 bottom-0 w-[3px] z-10 ${ch.isSolved ? "bg-[hsl(var(--neon))]" : "bg-transparent group-hover:bg-primary/70"} transition-colors`}
                        />

                        <div className="relative h-[132px] overflow-hidden">
                          <ChallengeArt name={ch.name} hue={cat.hue} solved={ch.isSolved} className="w-full h-full transition-transform duration-700 group-hover:scale-110" />
                          {/* Darken toward the title so the type below always
                              has something to sit on. */}
                          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
                          <span className="absolute left-3 top-3 chip chip-primary backdrop-blur-sm">
                            {ch.category}
                          </span>
                          {ch.isSolved && (
                            <span className="absolute right-3 top-3 chip chip-neon backdrop-blur-sm">
                              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                              {t("Solved", "Yechilgan", "Решено")}
                            </span>
                          )}
                        </div>

                        <div className="p-5 pt-3 flex flex-col flex-1">
                          <h3 className="text-base font-bold tracking-tight group-hover:text-primary transition-colors leading-snug mb-3 break-words">
                            {t(ch.name, ch.nameUz ?? undefined, ch.nameRu ?? undefined)}
                          </h3>

                          <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-medium capitalize ${diff.text} ${diff.tint} ${diff.border}`}>
                              {/* Dots as well as colour: difficulty must not depend on
                                  telling red from green. */}
                              <span className="flex gap-0.5" aria-hidden="true">
                                {[0, 1, 2, 3].map(d => (
                                  <span key={d} className={`w-1 h-1 rounded-full ${d < diff.dots ? "bg-current" : "bg-current opacity-25"}`} />
                                ))}
                              </span>
                              {ch.difficulty}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-mono tabular-nums font-bold text-[hsl(var(--neon))]">+{ch.points}</span>
                              <span className="tabular-nums">{ch.solvedCount} {t("solves", "yechim", "решений")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                  );
                })}
              </div>

              <div className="pt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

