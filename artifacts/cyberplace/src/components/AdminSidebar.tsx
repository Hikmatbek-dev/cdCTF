import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Flag, Trophy, BookOpen, AlertTriangle, ChevronLeft, ShieldCheck, Terminal } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

// Each link declares the permission its page actually requires, so an author
// or moderator is never shown a button that answers 403.
const ADMIN_LINKS = [
  { href: "/admin/dashboard", permission: "admin.panel", icon: LayoutDashboard, label: { en: "Root Dashboard", uz: "Boshqaruv", ru: "Главная" } },
  { href: "/admin/users", permission: "users.read", icon: Users, label: { en: "Operative Registry", uz: "Foydalanuvchilar", ru: "Пользователи" } },
  { href: "/admin/ctf", permission: "ctf.read.all", icon: Flag, label: { en: "Mission Assets", uz: "CTF Topshiriqlari", ru: "CTF Задания" } },
  { href: "/admin/competitions", permission: "competitions.manage", icon: Trophy, label: { en: "Tournament Grid", uz: "Musobaqalar", ru: "Соревнования" } },
  { href: "/admin/lessons", permission: "lessons.read.all", icon: BookOpen, label: { en: "Academic Modules", uz: "Darsliklar", ru: "Уроки" } },
  { href: "/admin/blocked", permission: "blocks.manage", icon: AlertTriangle, label: { en: "Incident Reports", uz: "Bloklanganlar", ru: "Заблокированные" } },
  { href: "/admin/audit", permission: "audit.read", icon: ShieldCheck, label: { en: "Audit Streams", uz: "Audit", ru: "Аудит" } },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { lang, t } = useLang();
  const { can } = useAuth();
  const links = ADMIN_LINKS.filter(link => can(link.permission));

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card min-h-screen pt-20 relative">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Terminal className="w-5 h-5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">ADMIN_CORE</span>
        </div>

        <Link href="/" className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-10 px-2">
          <ChevronLeft className="w-3 h-3" /> {t("EXIT_TO_SITE", "SAYTGA QAYTISH", "ВЫХОД")}
        </Link>
        
        <nav className="space-y-1">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-4 px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-l-2 rounded-r-xl ${
                  isActive 
                    ? "bg-primary/10 text-primary border-l-primary" 
                    : "text-muted-foreground hover:text-foreground border-l-transparent hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label[lang]}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="absolute bottom-8 left-0 right-0 px-8">
        <div className="p-4 bg-muted/50 border border-border rounded-2xl">
          <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">SYSTEM_STATUS</div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-primary animate-pulse rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">NOMINAL_SYNC</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
