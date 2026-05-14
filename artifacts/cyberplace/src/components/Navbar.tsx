import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { useLang, Language } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { Menu, X, Sun, Moon, ChevronDown, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { href: "/ctf", label: { en: "CTF", uz: "CTF", ru: "CTF" } },
  { href: "/learn", label: { en: "Learn", uz: "O'rgan", ru: "Учиться" } },
  { href: "/scoreboard", label: { en: "Scoreboard", uz: "Reyting", ru: "Рейтинг" } },
  { href: "/competitions", label: { en: "Competitions", uz: "Musobaqalar", ru: "Соревнования" } },
];

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => location.startsWith(href);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center font-display text-2xl font-black tracking-tighter">
              <span className="text-primary">&lt;</span>
              <span className="text-primary">cd</span>
              <span className="text-muted-foreground/60">CTF</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg ${
                  isActive(link.href)
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label[lang]}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg ${
                  isActive("/admin")
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                }`}
              >
                {t("Admin", "Admin", "Админ")}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  {lang} <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border border-border rounded-xl min-w-[120px]">
                {(["en", "uz", "ru"] as Language[]).map(l => (
                  <DropdownMenuItem key={l} onClick={() => setLang(l)} className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-muted ${lang === l ? "text-primary" : "text-muted-foreground"}`}>
                    {l === "en" ? "English" : l === "uz" ? "O'zbek" : "Русский"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-primary transition-colors h-9 w-9 rounded-xl">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

            {/* Auth */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-xs font-black text-primary">
                      {user.nickname[0].toUpperCase()}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-xs font-bold uppercase tracking-tighter leading-none">{user.nickname}</div>
                      <div className="text-[10px] font-bold text-primary mt-0.5">{user.points} XP</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border rounded-xl w-56 p-1 shadow-xl">
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-lg hover:bg-muted focus:bg-muted">
                    <Link href="/dashboard" className="flex items-center gap-3 w-full">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t("Dashboard", "Dashboard", "Панель")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-lg hover:bg-muted focus:bg-muted">
                    <Link href="/profile" className="flex items-center gap-3 w-full">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t("Profile", "Profil", "Профиль")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-lg hover:bg-muted focus:bg-muted">
                    <Link href="/profile/edit" className="flex items-center gap-3 w-full">
                      <Settings className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t("Settings", "Sozlamalar", "Настройки")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border mx-1" />
                  <DropdownMenuItem onClick={logout} className="p-3 cursor-pointer rounded-lg hover:bg-destructive/10 focus:bg-destructive/10 text-destructive">
                    <LogOut className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t("Logout", "Chiqish", "Выйти")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs font-bold uppercase tracking-widest hidden sm:flex">{t("Login", "Kirish", "Войти")}</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="h-9 px-4 sm:px-6 rounded-xl text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20">{t("Join", "Qo'shilish", "Вступить")}</Button>
                </Link>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-background border-b border-border z-40 p-4 animate-in slide-in-from-top-4">
          <div className="space-y-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center h-12 px-4 rounded-xl text-sm font-bold uppercase tracking-widest ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                {link.label[lang]}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center h-12 px-4 rounded-xl text-sm font-bold uppercase tracking-widest text-muted-foreground">
                ADMIN_TERMINAL
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
