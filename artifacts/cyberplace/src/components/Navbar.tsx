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
import { DonateButton } from "@/components/DonateButton";

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
//
// `also` lists the other routes an item owns. Reading a lesson at /learn/12 used
// to highlight nothing at all, so the one place people spend most of their time
// was the one place the header stopped telling them where they were.
const NAV_LINKS = [
  { href: "/modules", also: ["/learn"], label: { en: "Learn", uz: "O'rganish", ru: "Обучение" } },
  { href: "/ctf", also: [], label: { en: "Practice", uz: "Mashq", ru: "Практика" } },
  { href: "/labs", also: [], label: { en: "Labs", uz: "Laboratoriya", ru: "Лаборатории" } },
  { href: "/scoreboard", also: [], label: { en: "Ranking", uz: "Reyting", ru: "Рейтинг" } },
  { href: "/chat", also: [], label: { en: "Chat", uz: "Chat", ru: "Чат" } },
  { href: "/competitions", also: [], label: { en: "Events", uz: "Tadbirlar", ru: "События" } },
  { href: "/jobs", also: ["/talent"], label: { en: "Careers", uz: "Karyera", ru: "Карьера" } },
];

export function Navbar() {
  const { user, isAuthenticated, isStaff, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (link: { href: string; also: string[] }) =>
    [link.href, ...link.also].some(path => location === path || location.startsWith(path + "/"));

  return (
    /*
     * A quiet header on paper.
     *
     * It was a dark instrument panel: translucent, blurred, with a violet lit
     * edge on scroll and monospace uppercase labels. Every one of those choices
     * said "tool for people who already know". This one is the page's own
     * background with a hairline under it, and it gains only a shadow when you
     * scroll — enough to separate, not enough to look at.
     */
    <div className="fixed top-0 left-0 right-0 z-50">
      <nav
        className={`border-b transition-shadow duration-300 bg-background/90 backdrop-blur-md ${
          scrolled ? "border-border shadow-[0_1px_3px_hsl(var(--foreground)/.06)]" : "border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="cdCTF">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-[18px] h-[18px] text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              <span className="text-primary">cd</span>
              <span className="text-foreground">CTF</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const active = isActive(link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                  <span className="relative">{link.label[lang]}</span>
                </Link>
              );
            })}
            {isStaff && (
              <Link
                href="/admin/dashboard"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.startsWith("/admin") ? "text-accent-foreground bg-accent/20" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("Admin", "Admin", "Админ")}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg uppercase">
                    {lang} <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-60" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[150px] p-1.5 mt-2 rounded-xl">
                  {(["en", "uz", "ru"] as Language[]).map(l => (
                    <DropdownMenuItem
                      key={l}
                      onClick={() => setLang(l)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${lang === l ? "text-primary bg-primary/8" : ""}`}
                    >
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
                className="h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="w-[18px] h-[18px]" aria-hidden="true" /> : <Moon className="w-[18px] h-[18px]" aria-hidden="true" />}
              </Button>
            </div>

            {/* Donate — signed-in users can support the project. */}
            {isAuthenticated && <DonateButton />}

            {/* Auth */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 h-11 pl-1.5 pr-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {user.nickname[0].toUpperCase()}
                    </span>
                    <span className="text-left hidden lg:block">
                      <span className="block text-sm font-semibold leading-tight text-foreground">{user.nickname}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {user.points.toLocaleString()} {t("points", "ball", "баллов")}
                      </span>
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 p-1.5 mt-2 rounded-xl">
                  <div className="px-3 py-2.5 mb-1">
                    <div className="text-xs text-muted-foreground">{t("Signed in as", "Kirgan foydalanuvchi", "Вы вошли как")}</div>
                    <div className="text-sm font-semibold text-foreground">{user.nickname}</div>
                  </div>
                  <DropdownMenuSeparator />
                  {[
                    { href: "/dashboard", icon: LayoutDashboard, label: t("Dashboard", "Panel", "Панель") },
                    { href: "/profile", icon: User, label: t("Profile", "Profil", "Профиль") },
                    { href: "/settings/security", icon: ShieldCheck, label: t("Security", "Xavfsizlik", "Безопасность") },
                  ].map(item => (
                    <DropdownMenuItem key={item.href} asChild className="rounded-lg p-2.5 cursor-pointer">
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <item.icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="rounded-lg p-2.5 cursor-pointer text-destructive focus:text-destructive flex items-center gap-3">
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-medium">{t("Logout", "Chiqish", "Выйти")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="hidden sm:block">
                  <button className="h-11 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {t("Log in", "Kirish", "Войти")}
                  </button>
                </Link>
                <Link href="/register">
                  <button className="cyber-button px-5" data-testid="button-nav-join">
                    {t("Join free", "Bepul qo'shilish", "Бесплатно")}
                  </button>
                </Link>
              </div>
            )}

            {/* aria-expanded is what tells a screen reader the menu is open;
                swapping the hamburger for an X only says it to people who can
                see it. aria-controls points at the panel it opens. */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 rounded-lg text-muted-foreground hover:text-foreground"
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
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            id="mobile-menu"
            className="md:hidden mx-4 mt-2 bg-card border border-border rounded-xl p-3 shadow-lg"
          >
            <div className="space-y-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center min-h-[48px] px-4 rounded-lg text-[15px] font-medium transition-colors ${
                    isActive(link) ? "bg-primary/8 text-primary" : "text-foreground/80 hover:bg-muted"
                  }`}
                >
                  {link.label[lang]}
                </Link>
              ))}
              {isStaff && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center min-h-[48px] px-4 rounded-lg text-[15px] font-medium text-foreground/80 hover:bg-muted"
                >
                  {t("Admin", "Admin", "Админ")}
                </Link>
              )}
              {isAuthenticated && <DonateButton variant="block" />}
              {!isAuthenticated && (
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center min-h-[48px] px-4 rounded-lg text-[15px] font-medium text-foreground/80 hover:bg-muted">
                  {t("Log in", "Kirish", "Войти")}
                </Link>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex gap-1">
                {(["en", "uz", "ru"] as Language[]).map(l => (
                  // A ~24px tap target for the control that decides whether the
                  // site is readable at all. 44px is the accessible minimum.
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`min-h-[44px] min-w-[44px] px-3 rounded-lg text-sm font-semibold uppercase ${
                      lang === l ? "text-primary bg-primary/8" : "text-muted-foreground"
                    }`}
                  >
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
                className="h-11 w-11 rounded-lg text-muted-foreground"
              >
                {theme === "dark" ? <Sun className="w-[18px] h-[18px]" aria-hidden="true" /> : <Moon className="w-[18px] h-[18px]" aria-hidden="true" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
