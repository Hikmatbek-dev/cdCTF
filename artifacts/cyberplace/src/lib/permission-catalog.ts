/**
 * The permission keys the admin panel can toggle, with a human label per
 * language and a group for the matrix. Kept in step with the server's PERMISSIONS
 * list in artifacts/api-server/src/lib/permissions.ts — a key here that the
 * server rejects would simply be refused, and a server key missing here would be
 * invisible in the UI, so both lists must move together.
 */
export type PermissionEntry = {
  key: string;
  group: string;
  en: string;
  uz: string;
  ru: string;
};

export const PERMISSION_CATALOG: PermissionEntry[] = [
  { key: "admin.panel", group: "General", en: "Access the admin panel", uz: "Admin panelga kirish", ru: "Доступ к админ-панели" },
  { key: "system.maintenance", group: "General", en: "System maintenance", uz: "Tizim texnik xizmati", ru: "Обслуживание системы" },
  { key: "audit.read", group: "General", en: "View the audit log", uz: "Audit jurnalini ko'rish", ru: "Просмотр журнала аудита" },

  { key: "users.read", group: "Users", en: "View users", uz: "Foydalanuvchilarni ko'rish", ru: "Просмотр пользователей" },
  { key: "users.block", group: "Users", en: "Block / unblock users", uz: "Bloklash / blokdan chiqarish", ru: "Блокировка пользователей" },
  { key: "users.role", group: "Users", en: "Change user roles", uz: "Rollarni o'zgartirish", ru: "Изменение ролей" },
  { key: "blocks.manage", group: "Users", en: "Manage blocked tasks & users", uz: "Bloklarni boshqarish", ru: "Управление блокировками" },

  { key: "ctf.read.all", group: "Challenges", en: "View all challenges", uz: "Barcha topshiriqlarni ko'rish", ru: "Просмотр всех заданий" },
  { key: "ctf.create", group: "Challenges", en: "Create challenges", uz: "Topshiriq yaratish", ru: "Создание заданий" },
  { key: "ctf.update.own", group: "Challenges", en: "Edit own challenges", uz: "O'z topshiriqlarini tahrirlash", ru: "Редактирование своих заданий" },
  { key: "ctf.update.any", group: "Challenges", en: "Edit any challenge", uz: "Har qanday topshiriqni tahrirlash", ru: "Редактирование любых заданий" },
  { key: "ctf.delete", group: "Challenges", en: "Delete challenges", uz: "Topshiriqlarni o'chirish", ru: "Удаление заданий" },
  { key: "ctf.publish", group: "Challenges", en: "Publish challenges", uz: "Topshiriqlarni chop etish", ru: "Публикация заданий" },

  { key: "lessons.read.all", group: "Lessons", en: "View all lessons", uz: "Barcha darslarni ko'rish", ru: "Просмотр всех уроков" },
  { key: "lessons.create", group: "Lessons", en: "Create lessons", uz: "Dars yaratish", ru: "Создание уроков" },
  { key: "lessons.update.own", group: "Lessons", en: "Edit own lessons", uz: "O'z darslarini tahrirlash", ru: "Редактирование своих уроков" },
  { key: "lessons.update.any", group: "Lessons", en: "Edit any lesson", uz: "Har qanday darsni tahrirlash", ru: "Редактирование любых уроков" },
  { key: "lessons.delete", group: "Lessons", en: "Delete lessons", uz: "Darslarni o'chirish", ru: "Удаление уроков" },
  { key: "lessons.publish", group: "Lessons", en: "Publish lessons", uz: "Darslarni chop etish", ru: "Публикация уроков" },

  { key: "competitions.manage", group: "Competitions", en: "Manage competitions", uz: "Musobaqalarni boshqarish", ru: "Управление соревнованиями" },
  { key: "writeups.moderate", group: "Competitions", en: "Moderate writeups", uz: "Writeup'larni moderatsiya qilish", ru: "Модерация разборов" },

  { key: "support.manage", group: "Support", en: "Read & resolve support tickets", uz: "Support murojaatlarini ko'rish/hal qilish", ru: "Просмотр и решение обращений" },
];

/** The distinct groups, in catalog order. */
export const PERMISSION_GROUPS: string[] = [...new Set(PERMISSION_CATALOG.map(p => p.group))];
