/**
 * What a lab looks like from the outside — and the only part of a scenario the
 * browser is allowed to know.
 *
 * The flags used to travel with the scenarios: `LabBrief` imported the whole
 * module, so `SCENARIOS` (documents, flags and all) was bundled into the SPA
 * and every one of the five flags could be read out of a public JS chunk by
 * anyone, signed in or not. Verified against production. The split exists so
 * that cannot happen again by accident: the frontend imports this file, the
 * server imports ./index, and only ./index has the answers.
 */

export type Localized = { en: string; uz: string; ru: string };

export type ScenarioMeta = {
  slug: string;
  /** What the learner is asked to do, in three languages. */
  brief: Localized;
  /** Shown on request — one nudge, not the answer. */
  hint: Localized;
};

export const SCENARIO_META: Record<string, ScenarioMeta> = {
  "sql-login-bypass": {
    slug: "sql-login-bypass",
    brief: {
      en: "The admin panel of a fictional operator. You have no password. The login query is built by pasting your input straight into SQL — get in as `admin`.",
      uz: "Xayoliy operatorning admin paneli. Sizda parol yo'q. Kirish so'rovi kiritganingizni to'g'ridan-to'g'ri SQL ichiga qo'yib quriladi — `admin` bo'lib kiring.",
      ru: "Админ-панель вымышленного оператора. Пароля у вас нет. Запрос входа собирается вставкой вашего ввода прямо в SQL — войдите как `admin`.",
    },
    hint: {
      en: "The query ends with `AND parol='<your input>'`. What could you type so the password test is no longer part of the condition?",
      uz: "So'rov `AND parol='<kiritganingiz>'` bilan tugaydi. Parol tekshiruvi shartdan chiqib ketishi uchun nima yozish mumkin?",
      ru: "Запрос заканчивается на `AND parol='<ваш ввод>'`. Что ввести, чтобы проверка пароля перестала быть частью условия?",
    },
  },

  "reflected-xss": {
    slug: "reflected-xss",
    brief: {
      en: "A search page writes your query back into the page without escaping it. Get JavaScript to run — the page shows the flag once a script calls `getFlag()`.",
      uz: "Qidiruv sahifasi so'rovingizni ekranga hech qanday himoyasiz qaytaradi. JavaScript ishga tushiring — skript `getFlag()` chaqirgach sahifa flagni ko'rsatadi.",
      ru: "Страница поиска возвращает ваш запрос без экранирования. Добейтесь выполнения JavaScript — как только скрипт вызовет `getFlag()`, страница покажет флаг.",
    },
    hint: {
      en: "A plain <script> tag inserted with innerHTML does not run. An image that fails to load, on the other hand, fires an error handler.",
      uz: "innerHTML orqali qo'yilgan oddiy <script> ishlamaydi. Yuklana olmaydigan rasm esa xato ishlovchisini ishga tushiradi.",
      ru: "Обычный <script>, вставленный через innerHTML, не выполняется. А картинка, которая не загрузилась, вызывает обработчик ошибки.",
    },
  },

  "idor-invoice": {
    slug: "idor-invoice",
    brief: {
      en: "A billing portal. You are customer 1042 and can open your own invoices. One invoice belongs to someone else and carries the flag — find it.",
      uz: "Hisob-kitob portali. Siz 1042-mijozsiz va o'z hisoblaringizni ochasiz. Bitta hisob boshqa odamniki va unda flag bor — uni toping.",
      ru: "Биллинг-портал. Вы клиент 1042 и открываете свои счета. Один счёт принадлежит другому, и в нём флаг — найдите его.",
    },
    hint: {
      en: "Your invoices are 1042-01 to 1042-03. The server never checks whose invoice you asked for — only that the number exists.",
      uz: "Sizning hisoblaringiz 1042-01 dan 1042-03 gacha. Server kimning hisobini so'raganingizni umuman tekshirmaydi — faqat raqam bor-yo'qligini.",
      ru: "Ваши счета — с 1042-01 по 1042-03. Сервер не проверяет, чей счёт вы запросили, только существует ли номер.",
    },
  },

  "cookie-role": {
    slug: "cookie-role",
    brief: {
      en: "This portal decides what you may see from a cookie your own browser holds. You are signed in as a guest. Become staff.",
      uz: "Bu portal nimani ko'rishingizni brauzeringizdagi cookie asosida hal qiladi. Siz mehmon sifatida kirgansiz. Xodimga aylaning.",
      ru: "Портал решает, что вам показать, по куке, которая хранится в вашем браузере. Вы вошли как гость. Станьте сотрудником.",
    },
    hint: {
      en: "Open the developer tools, find the cookie for this frame, and read what it says. Nothing signs it.",
      uz: "Ishlab chiquvchi vositalarini oching, shu freym cookie'sini toping va nima yozilganini o'qing. Uni hech kim imzolamaydi.",
      ru: "Откройте инструменты разработчика, найдите куку этого фрейма и прочитайте её. Никто её не подписывает.",
    },
  },

  "path-traversal": {
    slug: "path-traversal",
    brief: {
      en: "A document viewer serves files from `/var/www/docs`. Something useful is kept one level above it, outside the list.",
      uz: "Hujjat ko'ruvchi fayllarni `/var/www/docs` dan beradi. Ro'yxatda yo'q, bir daraja yuqorida foydali narsa saqlanadi.",
      ru: "Просмотрщик документов отдаёт файлы из `/var/www/docs`. Кое-что полезное лежит уровнем выше, вне списка.",
    },
    hint: {
      en: "The name you type is appended to the base directory and nothing removes `..`. The interesting file is `.env`.",
      uz: "Yozgan nomingiz asosiy katalogga qo'shiladi va `..` ni hech kim olib tashlamaydi. Kerakli fayl — `.env`.",
      ru: "Введённое имя дописывается к базовому каталогу, и `..` никто не убирает. Нужный файл — `.env`.",
    },
  },
};

export function metaFor(slug: string | null | undefined): ScenarioMeta | null {
  return (slug && SCENARIO_META[slug]) || null;
}
