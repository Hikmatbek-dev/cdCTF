import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { useLang, Language } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { Shield, Menu, X, Sun, Moon, ChevronDown, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            <Shield className="w-5 h-5 text-primary" />
            <span>cd<span className="text-primary">CTF</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label[lang]}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t("Admin", "Admin", "Админ")}
              </Link>
            )}
            {isAuthenticated && user && (
              <Link
                href={`/profile/${user.id}`}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive("/profile")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t("Profile", "Profil", "Профиль")}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-xs font-mono uppercase">
                  {lang} <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {(["en", "uz", "ru"] as Language[]).map(l => (
                  <DropdownMenuItem key={l} onClick={() => setLang(l)} className={lang === l ? "text-primary font-medium" : ""}>
                    {l.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-8 h-8" data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Auth */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.nickname} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {user.nickname[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium hidden sm:inline">{user.nickname}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{user.points}pts</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> {t("Dashboard", "Dashboard", "Панель")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
                      <User className="w-4 h-4" /> {t("Profile", "Profil", "Профиль")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/edit" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" /> {t("Settings", "Sozlamalar", "Настройки")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> {t("Logout", "Chiqish", "Выйти")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="link-login">{t("Login", "Kirish", "Войти")}</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" data-testid="link-register">{t("Register", "Ro'yxatdan o'tish", "Регистрация")}</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button variant="ghost" size="icon" className="md:hidden w-8 h-8" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded text-sm font-medium ${
                  isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label[lang]}
              </Link>
            ))}
            {isAuthenticated && user && (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded text-sm font-medium text-muted-foreground hover:text-foreground">
                {t("Dashboard", "Dashboard", "Панель")}
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded text-sm font-medium text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
