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

const NAV_LINKS = [
  { href: "/ctf", label: { en: "CTF", uz: "CTF", ru: "CTF" } },
  { href: "/modules", label: { en: "Modules", uz: "Modullar", ru: "Модули" } },
  { href: "/learn", label: { en: "Lessons", uz: "Darslar", ru: "Уроки" } },
  { href: "/scoreboard", label: { en: "Ranking", uz: "Reyting", ru: "Рейтинг" } },
  { href: "/competitions", label: { en: "Events", uz: "Tadbirlar", ru: "События" } },
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
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 ${scrolled ? "pt-4" : "pt-8"}`}>
      <nav className={`max-w-7xl mx-auto transition-all duration-500 rounded-[2rem] border ${scrolled ? "bg-card/40 backdrop-blur-2xl border-foreground/10 shadow-2xl py-3 px-8" : "bg-transparent border-transparent py-4 px-8"}`}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center font-display text-2xl font-black tracking-tighter">
              <span className="gradient-text">cd</span>
              <span className="text-foreground/20 ml-1">CTF</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2 bg-foreground/5 p-1.5 rounded-2xl border border-foreground/5 backdrop-blur-md">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl overflow-hidden group ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive(link.href) && (
                  <motion.div layoutId="nav-bg" className="absolute inset-0 bg-primary/10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
                <span className="relative z-10">{link.label[lang]}</span>
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/admin/dashboard"
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl ${
                  isActive("/admin")
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-accent"
                }`}
              >
                ADMIN_TERMINAL
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground rounded-xl hover:bg-foreground/5 border border-transparent hover:border-foreground/5 transition-all">
                    {lang} <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border border-foreground/10 rounded-2xl min-w-[140px] p-2 mt-2 shadow-2xl">
                  {(["en", "uz", "ru"] as Language[]).map(l => (
                    <DropdownMenuItem key={l} onClick={() => setLang(l)} className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-foreground/5 transition-colors ${lang === l ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
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
                    <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-accent/20 border border-foreground/10 rounded-xl flex items-center justify-center text-xs font-black text-primary shadow-lg">
                      {user.nickname[0].toUpperCase()}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-[10px] font-black uppercase tracking-widest leading-none text-foreground">{user.nickname}</div>
                      <div className="text-[9px] font-black text-primary mt-1 tabular-nums">{user.points.toLocaleString()} XP</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border border-foreground/10 rounded-[2rem] w-64 p-2 mt-2 shadow-2xl">
                  <div className="p-4 mb-2 bg-foreground/5 rounded-2xl border border-foreground/5">
                    <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1">OPERATIVE_ID</div>
                    <div className="text-sm font-black text-foreground">{user.nickname}</div>
                  </div>
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 transition-all mb-1">
                    <Link href="/dashboard" className="flex items-center gap-4 w-full">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><LayoutDashboard className="w-4 h-4" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{t("Dashboard", "Panel", "Панель")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 transition-all mb-1">
                    <Link href="/profile" className="flex items-center gap-4 w-full">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent"><User className="w-4 h-4" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{t("Profile", "Profil", "Профиль")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl hover:bg-foreground/5 focus:bg-foreground/5 transition-all mb-1">
                    <Link href="/settings/security" className="flex items-center gap-4 w-full">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><ShieldCheck className="w-4 h-4" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{t("Security", "Xavfsizlik", "Безопасность")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-foreground/5 mx-2 my-2" />
                  <DropdownMenuItem onClick={logout} className="p-3 cursor-pointer rounded-xl hover:bg-destructive/10 focus:bg-destructive/10 text-destructive transition-all">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center"><LogOut className="w-4 h-4" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest ml-4">{t("Logout", "Chiqish", "Выйти")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hidden sm:flex text-muted-foreground hover:text-foreground transition-all">
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
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            id="mobile-menu"
            className="md:hidden mt-4 bg-card/95 backdrop-blur-2xl border border-foreground/10 rounded-[2.5rem] p-6 shadow-2xl"
          >
            <div className="space-y-2">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isActive(link.href) ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-foreground/5"}`}
                >
                  {link.label[lang]}
                </Link>
              ))}
              {isStaff && (
                <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20">
                  ADMIN_TERMINAL
                </Link>
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-foreground/5 flex items-center justify-between">
              <div className="flex gap-4">
                {(["en", "uz", "ru"] as Language[]).map(l => (
                  <button key={l} onClick={() => setLang(l)} className={`text-[10px] font-black uppercase tracking-widest ${lang === l ? "text-primary" : "text-muted-foreground"}`}>
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

