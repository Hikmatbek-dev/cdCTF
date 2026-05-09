import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Flag, Trophy, BookOpen, AlertTriangle, ChevronLeft, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: { en: "Dashboard", uz: "Boshqaruv", ru: "Главная" } },
  { href: "/admin/users", icon: Users, label: { en: "Users", uz: "Foydalanuvchilar", ru: "Пользователи" } },
  { href: "/admin/ctf", icon: Flag, label: { en: "CTF Challenges", uz: "CTF Topshiriqlari", ru: "CTF Задания" } },
  { href: "/admin/competitions", icon: Trophy, label: { en: "Competitions", uz: "Musobaqalar", ru: "Соревнования" } },
  { href: "/admin/lessons", icon: BookOpen, label: { en: "Lessons", uz: "Darsliklar", ru: "Уроки" } },
  { href: "/admin/blocked", icon: AlertTriangle, label: { en: "Blocked Tasks", uz: "Bloklangan", ru: "Заблокированные" } },
  { href: "/admin/audit", icon: ShieldCheck, label: { en: "Audit Logs", uz: "Audit", ru: "Аудит" } },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { lang, t } = useLang();

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border bg-card min-h-screen pt-14">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft className="w-3 h-3" /> {t("Back to site", "Saytga qaytish", "Назад на сайт")}
        </Link>
        <nav className="space-y-0.5">
          {ADMIN_LINKS.map(link => {
            const Icon = link.icon;
            const isActive = location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label[lang]}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
