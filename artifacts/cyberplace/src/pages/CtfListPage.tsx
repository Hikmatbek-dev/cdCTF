import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, CheckCircle2, Circle, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DifficultyBadge } from "@/components/DifficultyBadge";
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
  const queryParams = {
    ...(category !== "All" ? { category } : {}),
    ...(difficulty !== "All" ? { difficulty: difficulty as "easy" | "medium" | "hard" | "insane" } : {}),
    ...(solved === "solved" ? { solved: true } : solved === "unsolved" ? { solved: false } : {}),
    ...(search ? { search } : {}),
  };

  const { data: challenges, isLoading } = useListCtfChallenges(
    queryParams,
    { query: { queryKey: getListCtfChallengesQueryKey(queryParams) } }
  );

  const filtered = normalizeCtfChallenges(challenges);

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">{t("CTF Challenges", "CTF Topshiriqlari", "CTF Задания")}</h1>
          <p className="text-sm text-muted-foreground">{t("Solve challenges to earn points and unlock titles.", "Ball va unvon olish uchun topshiriqlarni yeching.", "Решайте задания для получения очков.")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("Search challenges...", "Topshiriqlarni qidiring...", "Поиск заданий...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-36" data-testid="select-difficulty">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d === "All" ? "All" : d}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["all", "solved", "unsolved"] as const).map(v => (
              <button
                key={v}
                onClick={() => setSolved(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${solved === v ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                data-testid={`button-filter-${v}`}
              >
                {v === "all" ? t("All", "Barchasi", "Все") : v === "solved" ? t("Solved", "Yechilgan", "Решённые") : t("Unsolved", "Yechilmagan", "Нерешённые")}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-muted-foreground mb-4" data-testid="text-challenge-count">
          {isLoading ? "..." : `${filtered.length} ${t("challenges", "topshiriq", "заданий")}`}
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("No challenges found", "Topshiriqlar topilmadi", "Задания не найдены")}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ch => (
              <Link href={`/ctf/${ch.id}`} key={ch.id}>
                <div
                  className={`p-5 rounded-lg border transition-all cursor-pointer group ${
                    ch.isSolved
                      ? "border-primary/30 bg-primary/5"
                      : ch.isBlocked
                      ? "border-destructive/30 bg-destructive/5 opacity-60"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                  data-testid={`card-challenge-${ch.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <DifficultyBadge difficulty={ch.difficulty} />
                    <div className="flex items-center gap-1">
                      {ch.isSolved ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" data-testid={`icon-solved-${ch.id}`} />
                      ) : ch.isBlocked ? (
                        <Lock className="w-4 h-4 text-destructive" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1" data-testid={`text-challenge-name-${ch.id}`}>{ch.name}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">{ch.category}</span>
                    <span className="text-xs font-mono font-bold text-primary" data-testid={`text-challenge-points-${ch.id}`}>{ch.points} pts</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {ch.solvedCount} {t("solves", "yechim", "решений")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
