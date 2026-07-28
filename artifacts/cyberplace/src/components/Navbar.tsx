import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { useLang, Language } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { Menu, X, Sun, Moon, ChevronDown, LogOut, User, LayoutDashboard, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// One learning entry in the primary nav — Modules, the structured curriculum.
// The standalone-lessons library (/learn) stays reachable from the footer and
// from deep links; two competing "learn" buttons in the header only confused
// people about where to start.
// Five items, in the order someone actually moves through the site: learn,
// practise, see where you stand, compete, then find work. It was seven, and two
// of them — "Hire" (employers browsing candidates) and "Jobs" (candidates
// browsing openings) — sat side by side with nothing to tell them apart. Both
// now live under Careers, which opens on the job board and offers the employer
// side there. Impact is a marketing page and moved to the footer.
const NAV_LINKS = [
  { href: "/modules", label: { en: "Learn", uz: "O'rganish", ru: "Обучение" } },
  { href: "/ctf", label: { en: "Practice", uz: "Mashq", ru: "Практика" } },
  { href: "/labs", label: { en: "Labs", uz: "Laboratoriya", ru: "Лаборатории" } },
  { href: "/scoreboard", label: { en: "Ranking", uz: "Reyting", ru: "Рейтинг" } },
  { href: "/competitions", label: { en: "Events", uz: "Tadbirlar", ru: "События" } },
  { href: "/jobs", label: { en: "Careers", uz: "Karyera", ru: "Карьера" } },
];

export function Navbar() {
  const { user, isAuthenticated, isStaff, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => location.startsWith(href);

  return (
    /*
     * A fixed instrument panel, not a floating pill.
     *
     * The old bar was a rounded card hovering in the middle of the page with
     * generous padding — the shape every minimal SaaS template ships. This one
     * spans the full width, sits on a hairline, and gains a blur and a lit
     * bottom edge once you scroll past the hero.
     */
    <div className="fixed top-0 left-0 right-0 z-50">
      <nav className={`transition-all duration-300 border-b ${
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-primary/20 shadow-[0_1px_0_0_hsl(var(--primary)/.25),0_18px_40px_-30px_#000]"
          : "bg-background/40 backdrop-blur-md border-transparent"
      }`}>
       <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyber-blue flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary))] group-hover:shadow-[0_0_28px_-2px_hsl(var(--primary))] transition-shadow">
              <Shield className="w-5 h-5 text-white" />
              {/* The live dot: this thing is a running system. */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[hsl(var(--neon))] shadow-[0_0_8px_hsl(var(--neon))]" />
            </div>
            <div className="flex items-center font-display text-2xl font-black tracking-tighter">
              <span className="gradient-text">cd</span>
              <span className="text-foreground/60 ml-1">CTF</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 font-mono text-[13px] uppercase tracking-wider transition-colors ${
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive(link.href) && (
                  <motion.div
                    layoutId="nav-bg"
                    className="absolute inset-x-2 -bottom-[13px] h-0.5 bg-[hsl(var(--neon))] shadow-[0_0_10px_hsl(var(--neon))]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{link.label[lang]}</span>
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/admin/dashboard"
                className={`px-4 py-2 font-mono text-[13px] uppercase tracking-wider transition-colors ${
                  isActive("/admin")
                    ? "text-accent"
                    : "text-muted-foreground hover:text-accent"
                }`}
              >
                {t("Admin", "Admin", "Админ")}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground rounded-xl hover:bg-foreground/5 border border-transparent hover:border-foreground/5 transition-all">
                    {lang} <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/95 border border-foreground/10 rounded-2xl min-w-[140px] p-2 mt-2 shadow-2xl">
                  {(["en", "uz", "ru"] as Language[]).map(l => (
                    <DropdownMenuItem key={l} onClick={() => setLang(l)} className={`rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-foreground/5 transition-colors ${lang === l ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
                      {l === "en" ? "English" : l === "uz" ? "O'zbek" : "Русский"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* The label says what the button does, not what the icon shows.
                  A sun icon in dark mode means "switch to light" — announcing
                  it as "sun" would leave a screen reader user to guess. */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === "dark"
                  ? t("Switch to light mode", "Yorug' rejimga o'tish", "Переключить на светлую тему")
                  : t("Switch to dark mode", "Qorong'i rejimga o'tish", "Переключить на тёмную тему")}
                className="text-muted-foreground hover:text-primary transition-all h-10 w-10 rounded-xl hover:bg-foreground/5 border border-transparent hover:border-foreground/5"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              </Button>
            </div>

            <div className="h-6 w-px bg-foreground/5 mx-1 hidden sm:block" />

            {/* Auth */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 hover:opacity-80 transition-all p-1 pr-4 bg-foreground/5 rounded-2xl border border-foreground/5">
                    <div className="w-9 h-9 bg-primary/10 border border-foreground/10 rounded-xl flex items-center justify-center text-xs font-black text-primary shadow-lg">
                      {user.nickname[0].toUpperCase()}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-sm font-medium leading-none text-foreground">{user.nickname}</div>
                      <div className="text-xs text-primary mt-1 tabular-nums">{user.points.toLocaleString()} XP</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/95 border border-foreground/10 rounded-xl w-64 p-2 mt-2 shadow-2xl">
                  <div className="p-4 mb-2 bg-foreground/5 rounded-2xl border border-foreground/5">
                    <div className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">{t("Signed in as", "Kirgan foydalanuvchi", "Вы вошли как")}</div>
                    <div className="text-sm font-semibold text-foreground">{user.nickname}</div>
                  </div>
                  <DropdownMenuItem asChild className="p-2.5 cursor-pointer rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 transition-all mb-1">
                    <Link href="/dashboard" className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><LayoutDashboard className="w-4 h-4" /></div>
                      <span className="text-sm font-medium text-foreground/90">{t("Dashboard", "Panel", "Панель")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-2.5 cursor-pointer rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 transition-all mb-1">
                    <Link href="/profile" className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent"><User className="w-4 h-4" /></div>
                      <span className="text-sm font-medium text-foreground/90">{t("Profile", "Profil", "Профиль")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-2.5 cursor-pointer rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 transition-all mb-1">
                    <Link href="/settings/security" className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><ShieldCheck className="w-4 h-4" /></div>
                      <span className="text-sm font-medium text-foreground/90">{t("Security", "Xavfsizlik", "Безопасность")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-foreground/5 mx-2 my-2" />
                  <DropdownMenuItem onClick={logout} className="p-2.5 cursor-pointer rounded-xl hover:bg-destructive/10 focus:bg-destructive/10 text-destructive transition-all flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center"><LogOut className="w-4 h-4" /></div>
                    <span className="text-sm font-medium">{t("Logout", "Chiqish", "Выйти")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl text-sm font-medium hidden sm:flex text-muted-foreground hover:text-foreground transition-all">
                    {t("Login", "Kirish", "Войти")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="cyber-button h-10 px-8">
                    {t("Join", "Qo'shilish", "Вступить")}
                  </Button>
                </Link>
              </div>
            )}

            {/* aria-expanded is what tells a screen reader the menu is open;
                swapping the hamburger for an X only says it to people who can
                see it. aria-controls points at the panel it opens. */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl bg-foreground/5 border border-foreground/5"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen
                ? t("Close menu", "Menyuni yopish", "Закрыть меню")
                : t("Open menu", "Menyuni ochish", "Открыть меню")}
            >
              {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>
       </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            id="mobile-menu"
            className="md:hidden mt-4 bg-card/95 -2xl border border-foreground/10 rounded-xl p-6 shadow-2xl"
          >
            <div className="space-y-2">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center h-13 px-6 py-3.5 rounded-2xl text-[15px] font-medium transition-all ${isActive(link.href) ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-foreground/5"}`}
                >
                  {link.label[lang]}
                </Link>
              ))}
              {isStaff && (
                <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center h-13 px-6 py-3.5 rounded-2xl text-[15px] font-medium text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20">
                  {t("Admin", "Admin", "Админ")}
                </Link>
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-foreground/5 flex items-center justify-between">
              <div className="flex gap-4">
                {(["en", "uz", "ru"] as Language[]).map(l => (
                  // A ~24px tap target for the control that decides whether the
                  // site is readable at all. 44px is the accessible minimum.
                  <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm font-medium uppercase ${lang === l ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === "dark"
                  ? t("Switch to light mode", "Yorug' rejimga o'tish", "Переключить на светлую тему")
                  : t("Switch to dark mode", "Qorong'i rejimga o'tish", "Переключить на тёмную тему")}
                className="text-muted-foreground hover:text-primary transition-all h-10 w-10 rounded-xl bg-foreground/5 border border-foreground/5"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

