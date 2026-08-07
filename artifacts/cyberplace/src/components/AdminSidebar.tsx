import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Flag, Trophy, BookOpen, GraduationCap, FileText, AlertTriangle, ChevronLeft, ShieldCheck, Terminal, LineChart, Menu, LifeBuoy, Gift } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Each link declares the permission its page actually requires, so an author
// or moderator is never shown a button that answers 403.
const ADMIN_LINKS = [
  { href: "/admin/dashboard", permission: "admin.panel", icon: LayoutDashboard, label: { en: "Overview", uz: "Boshqaruv", ru: "Главная" } },
  { href: "/admin/users", permission: "users.read", icon: Users, label: { en: "Users", uz: "Foydalanuvchilar", ru: "Пользователи" } },
  { href: "/admin/ctf", permission: "ctf.read.all", icon: Flag, label: { en: "Challenges", uz: "CTF Topshiriqlari", ru: "CTF Задания" } },
  { href: "/admin/competitions", permission: "competitions.manage", icon: Trophy, label: { en: "Competitions", uz: "Musobaqalar", ru: "Соревнования" } },
  { href: "/admin/lessons", permission: "lessons.read.all", icon: BookOpen, label: { en: "Lessons", uz: "Darsliklar", ru: "Уроки" } },
  { href: "/admin/curriculum", permission: "lessons.read.all", icon: GraduationCap, label: { en: "Curriculum", uz: "O'quv dasturi", ru: "Программа" } },
  { href: "/admin/writeups", permission: "writeups.moderate", icon: FileText, label: { en: "Writeups", uz: "Writeuplar", ru: "Разборы" } },
  { href: "/admin/support", permission: "support.manage", icon: LifeBuoy, label: { en: "Support", uz: "Support", ru: "Поддержка" } },
  { href: "/admin/gift", permission: "admin.panel", superAdmin: true, icon: Gift, label: { en: "Gift", uz: "Sovg'a", ru: "Награда" } },
  { href: "/admin/analytics", permission: "lessons.read.all", icon: LineChart, label: { en: "Learning Analytics", uz: "Analitika", ru: "Аналитика" } },
  { href: "/admin/blocked", permission: "blocks.manage", icon: AlertTriangle, label: { en: "Blocked", uz: "Bloklanganlar", ru: "Заблокированные" } },
  { href: "/admin/audit", permission: "audit.read", icon: ShieldCheck, label: { en: "Audit log", uz: "Audit", ru: "Аудит" } },
];

type Link = (typeof ADMIN_LINKS)[number];

/** The shared list — rendered into the desktop rail and the mobile drawer. */
function NavList({ links, location, lang, onNavigate }: {
  links: Link[]; location: string; lang: "en" | "uz" | "ru"; onNavigate?: () => void;
}) {
  const { t } = useLang();
  return (
    <>
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 px-2">
        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> {t("Back to the site", "Saytga qaytish", "Вернуться на сайт")}
      </Link>
      <nav className="space-y-1">
        {links.map(link => {
          const Icon = link.icon;
          const active = location.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 min-h-[44px] text-sm font-medium transition-colors rounded-lg ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {link.label[lang]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminSidebar() {
  const [location] = useLocation();
  const { lang, t } = useLang();
  const { can, isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const links = ADMIN_LINKS.filter(link => ("superAdmin" in link && link.superAdmin) ? isSuperAdmin : can(link.permission));

  const current = links.find(l => location.startsWith(l.href));

  return (
    <>
      {/*
        Desktop rail. It was a fixed w-64 with no responsive class at all, which
        is why the whole admin panel was unusable below ~700px: the rail ate
        264px and left <main> a hundred. It is now hidden on small screens and
        replaced by the drawer below.
      */}
      <aside className="hidden md:block w-60 shrink-0 border-r border-border bg-card min-h-screen">
        <div className="sticky top-20 p-5">
          <div className="flex items-center gap-2.5 mb-8 px-2">
            <Terminal className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">{t("Admin", "Admin", "Админ")}</span>
          </div>
          <NavList links={links} location={location} lang={lang} />
        </div>
      </aside>

      {/*
        Mobile bar + drawer. A slim bar under the site header carries the burger
        and the current section's name, so a phone user knows where they are and
        can move. The Sheet is the same nav, full height.
      */}
      <div className="md:hidden fixed top-16 inset-x-0 z-30 h-12 flex items-center gap-2 px-4 border-b border-border bg-background/95 backdrop-blur">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="inline-flex items-center gap-2 h-9 px-3 -ml-1 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            aria-label={t("Open admin menu", "Admin menyuni ochish", "Открыть меню админа")}
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
            <span className="text-muted-foreground">{t("Admin", "Admin", "Админ")}</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-5 overflow-y-auto">
            <SheetTitle className="flex items-center gap-2.5 mb-8">
              <Terminal className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">{t("Admin", "Admin", "Админ")}</span>
            </SheetTitle>
            <NavList links={links} location={location} lang={lang} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        {current && (
          <span className="text-sm font-semibold text-foreground truncate">· {current.label[lang]}</span>
        )}
      </div>
    </>
  );
}
