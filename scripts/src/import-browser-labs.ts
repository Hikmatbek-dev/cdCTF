/**
 * The five browser labs, and the challenges that receive their flags.
 *
 * Container labs need a Docker host that does not exist yet, so /labs answered
 * "not available" to every visitor. These run in the learner's own tab — see
 * lib/lab-scenarios — so the page works today, for everyone, at no cost.
 *
 * The flags live on the server (lib/lab-scenarios/src/index.ts) and are handed
 * over by POST /api/labs/solve once the exploit is verified. If you rotate one
 * there, run this script so the paired challenge checks the new value.
 *
 * Each lab is paired with a CTF challenge so the flag goes through the normal
 * submit path: same scoring, same rate limit, same hashing. The lab is the
 * target; the challenge is the scoreboard.
 *
 * Idempotent: matched on the lab slug and the challenge name.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts run import-labs
 *         DATABASE_URL=... pnpm --filter ./scripts run import-labs -- --undo
 */
import { Pool } from "pg";
import { createHash } from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const dsn: string = connectionString;
const undo = process.argv.includes("--undo");

/** Identical to the server's hashFlag — artifacts/api-server/src/lib/flags.ts. */
const hashFlag = (flag: string) =>
  `sha256$${createHash("sha256").update(flag.trim().replace(/\r\n/g, "\n"), "utf8").digest("hex")}`;

type BrowserLab = {
  slug: string;
  scenario: string;
  name: string; nameUz: string; nameRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  difficulty: "easy" | "medium" | "hard";
  ttlMinutes: number;
  /** The paired challenge. */
  challenge: {
    name: string; nameUz: string; nameRu: string;
    description: string; descriptionUz: string; descriptionRu: string;
    category: string; points: number;
    hint: string; hintUz: string; hintRu: string;
    flag: string;
  };
};

const LABS: BrowserLab[] = [
  {
    slug: "sql-login-bypass",
    scenario: "sql-login-bypass",
    name: "Chinor Telecom: the admin panel",
    nameUz: "Chinor Telecom: admin paneli",
    nameRu: "Chinor Telecom: админ-панель",
    description: "A login form that pastes your input straight into its SQL query. Get in as admin without the password.",
    descriptionUz: "Kiritganingizni to'g'ridan-to'g'ri SQL so'roviga qo'yadigan kirish formasi. Parolsiz admin bo'lib kiring.",
    descriptionRu: "Форма входа, вставляющая ваш ввод прямо в SQL-запрос. Войдите как admin без пароля.",
    difficulty: "easy",
    ttlMinutes: 20,
    challenge: {
      name: "Lab: Chinor Telecom admin panel",
      nameUz: "Lab: Chinor Telecom admin paneli",
      nameRu: "Лаб: админ-панель Chinor Telecom",
      description: "Solve the **Chinor Telecom: the admin panel** lab and submit the flag it shows.\n\nOpen it from the [Labs](/labs) page — it runs in your browser and starts instantly.",
      descriptionUz: "**Chinor Telecom: admin paneli** laboratoriyasini yeching va u ko'rsatgan flagni topshiring.\n\nUni [Laboratoriya](/labs) sahifasidan oching — brauzeringizda ishlaydi va bir zumda ochiladi.",
      descriptionRu: "Решите лабораторию **Chinor Telecom: админ-панель** и отправьте показанный флаг.\n\nОткройте её на странице [Лаборатории](/labs) — она работает в браузере и запускается мгновенно.",
      category: "Web", points: 150,
      hint: "The password is compared inside the same string as the login. End the login value early and make the rest of the condition always true.",
      hintUz: "Parol login bilan bitta satr ichida solishtiriladi. Login qiymatini erta tugating va shartning qolganini har doim rost qiling.",
      hintRu: "Пароль сравнивается внутри той же строки, что и логин. Закройте значение логина раньше и сделайте остаток условия всегда истинным.",
      flag: "flag{ch1n0r_qu0t3_br34ks_th3_qu3ry}",
    },
  },
  {
    slug: "reflected-xss",
    scenario: "reflected-xss",
    name: "Registon Market: the search box",
    nameUz: "Registon bozori: qidiruv maydoni",
    nameRu: "Registon Market: строка поиска",
    description: "The search page writes your query back as markup. Make the page run your JavaScript.",
    descriptionUz: "Qidiruv sahifasi so'rovingizni razmetka sifatida qaytaradi. Sahifani o'z JavaScript'ingizni bajarishga majburlang.",
    descriptionRu: "Страница поиска возвращает ваш запрос как разметку. Заставьте страницу выполнить ваш JavaScript.",
    difficulty: "easy",
    ttlMinutes: 20,
    challenge: {
      name: "Lab: Registon Market search",
      nameUz: "Lab: Registon bozori qidiruvi",
      nameRu: "Лаб: поиск Registon Market",
      description: "Solve the **Registon Market: the search box** lab. The page shows the flag once a script calls `getFlag()`.\n\nOpen it from the [Labs](/labs) page.",
      descriptionUz: "**Registon bozori: qidiruv maydoni** laboratoriyasini yeching. Skript `getFlag()` chaqirgach sahifa flagni ko'rsatadi.\n\nUni [Laboratoriya](/labs) sahifasidan oching.",
      descriptionRu: "Решите лабораторию **Registon Market: строка поиска**. Как только скрипт вызовет `getFlag()`, страница покажет флаг.\n\nОткройте её на странице [Лаборатории](/labs).",
      category: "Web", points: 150,
      hint: "innerHTML does not execute a <script> tag it inserts. It does, however, attach event handlers — and an image with a broken source fires one immediately.",
      hintUz: "innerHTML qo'ygan <script> tegi bajarilmaydi. Lekin u hodisa ishlovchilarini biriktiradi — manbasi buzuq rasm esa darhol bittasini ishga tushiradi.",
      hintRu: "innerHTML не выполняет вставленный <script>. Но обработчики событий он подключает — а картинка с битым src сразу вызывает один из них.",
      flag: "flag{r3g1st0n_0n3rr0r_w1ns_ag41n}",
    },
  },
  {
    slug: "idor-invoice",
    scenario: "idor-invoice",
    name: "Anhor Bank: someone else's invoice",
    nameUz: "Anhor Bank: birovning hisobi",
    nameRu: "Anhor Bank: чужой счёт",
    description: "A billing portal that checks whether an invoice exists, but never whose it is.",
    descriptionUz: "Hisob bor-yo'qligini tekshiradigan, lekin u kimniki ekanini hech tekshirmaydigan portal.",
    descriptionRu: "Биллинг-портал проверяет, существует ли счёт, но не проверяет, чей он.",
    difficulty: "easy",
    ttlMinutes: 15,
    challenge: {
      name: "Lab: Anhor Bank invoices",
      nameUz: "Lab: Anhor Bank hisoblari",
      nameRu: "Лаб: счета Anhor Bank",
      description: "Solve the **Anhor Bank: someone else's invoice** lab and submit the flag from the invoice that is not yours.\n\nOpen it from the [Labs](/labs) page.",
      descriptionUz: "**Anhor Bank: birovning hisobi** laboratoriyasini yeching va o'zingizniki bo'lmagan hisobdagi flagni topshiring.\n\nUni [Laboratoriya](/labs) sahifasidan oching.",
      descriptionRu: "Решите лабораторию **Anhor Bank: чужой счёт** и отправьте флаг из счёта, который вам не принадлежит.\n\nОткройте её на странице [Лаборатории](/labs).",
      category: "Web", points: 120,
      hint: "Your customer number is in the invoice number. Try the next customer.",
      hintUz: "Mijoz raqamingiz hisob raqami ichida. Keyingi mijozni sinab ko'ring.",
      hintRu: "Ваш номер клиента — часть номера счёта. Попробуйте следующего клиента.",
      flag: "flag{anh0r_1043_w4s_n0t_y0urs}",
    },
  },
  {
    slug: "cookie-role",
    scenario: "cookie-role",
    name: "Sardoba Energy: staff only",
    nameUz: "Sardoba Energy: faqat xodimlar uchun",
    nameRu: "Sardoba Energy: только для сотрудников",
    description: "An internal portal that decides your permissions from a cookie your own browser holds.",
    descriptionUz: "Ruxsatlaringizni brauzeringizdagi cookie asosida hal qiladigan ichki portal.",
    descriptionRu: "Внутренний портал определяет ваши права по куке, которая лежит в вашем браузере.",
    difficulty: "easy",
    ttlMinutes: 15,
    challenge: {
      name: "Lab: Sardoba Energy staff portal",
      nameUz: "Lab: Sardoba Energy xodimlar portali",
      nameRu: "Лаб: портал сотрудников Sardoba Energy",
      description: "Solve the **Sardoba Energy: staff only** lab by becoming staff, and submit the flag behind that panel.\n\nOpen it from the [Labs](/labs) page.",
      descriptionUz: "**Sardoba Energy: faqat xodimlar uchun** laboratoriyasini xodimga aylanib yeching va o'sha paneldagi flagni topshiring.\n\nUni [Laboratoriya](/labs) sahifasidan oching.",
      descriptionRu: "Решите лабораторию **Sardoba Energy: только для сотрудников**, став сотрудником, и отправьте флаг из этой панели.\n\nОткройте её на странице [Лаборатории](/labs).",
      category: "Web", points: 120,
      hint: "The page prints the cookie it reads. Nothing signs it, so nothing stops you writing a different value in the developer tools console.",
      hintUz: "Sahifa o'qigan cookie'ni chop etadi. Uni hech kim imzolamaydi, demak konsoldan boshqa qiymat yozishingizga hech nima to'sqinlik qilmaydi.",
      hintRu: "Страница печатает куку, которую читает. Её никто не подписывает, значит ничто не мешает записать другое значение из консоли.",
      flag: "flag{s4rd0b4_c00k13_s4ys_st4ff}",
    },
  },
  {
    slug: "path-traversal",
    scenario: "path-traversal",
    name: "Registon Market: the document viewer",
    nameUz: "Registon bozori: hujjat ko'ruvchi",
    nameRu: "Registon Market: просмотрщик документов",
    description: "A file viewer that appends your filename to a base directory and normalises nothing.",
    descriptionUz: "Fayl nomingizni asosiy katalogga qo'shadigan va hech narsani normallashtirmaydigan ko'ruvchi.",
    descriptionRu: "Просмотрщик дописывает имя файла к базовому каталогу и ничего не нормализует.",
    difficulty: "medium",
    ttlMinutes: 30,
    challenge: {
      name: "Lab: Registon Market documents",
      nameUz: "Lab: Registon bozori hujjatlari",
      nameRu: "Лаб: документы Registon Market",
      description: "Solve the **Registon Market: the document viewer** lab and read the file kept outside the documents directory.\n\nOpen it from the [Labs](/labs) page.",
      descriptionUz: "**Registon bozori: hujjat ko'ruvchi** laboratoriyasini yeching va hujjatlar katalogidan tashqarida saqlanadigan faylni o'qing.\n\nUni [Laboratoriya](/labs) sahifasidan oching.",
      descriptionRu: "Решите лабораторию **Registon Market: просмотрщик документов** и прочитайте файл, лежащий вне каталога документов.\n\nОткройте её на странице [Лаборатории](/labs).",
      category: "Web", points: 180,
      hint: "`..` climbs one directory. The viewer shows you the path it resolved — use it to check your aim.",
      hintUz: "`..` bir katalog yuqoriga chiqadi. Ko'ruvchi hisoblagan yo'lni ko'rsatadi — nishonni shu bilan tekshiring.",
      hintRu: "`..` поднимает на каталог выше. Просмотрщик показывает вычисленный путь — сверяйтесь по нему.",
      flag: "flag{d0td0t_sl4sh_f0und_th3_env}",
    },
  },
];

async function main() {
  const pool = new Pool({ connectionString: dsn });
  try {
    if (undo) {
      for (const lab of LABS) {
        const { rows } = await pool.query<{ id: number }>("select id from labs where slug = $1", [lab.slug]);
        if (rows.length) {
          await pool.query("delete from lab_instances where lab_id = $1", [rows[0].id]);
          await pool.query("delete from labs where id = $1", [rows[0].id]);
          console.log(`  delete lab ${lab.slug}`);
        }
        const { rows: ch } = await pool.query<{ id: number }>("select id from ctf_tasks where name = $1", [lab.challenge.name]);
        if (ch.length) {
          const solved = await pool.query<{ n: string }>(
            "select count(*)::text as n from ctf_attempts where ctf_id = $1 and solved = true", [ch[0].id]);
          if (Number(solved.rows[0].n) > 0) {
            console.log(`  keep   challenge ${lab.challenge.name} — has ${solved.rows[0].n} solve(s)`);
          } else {
            await pool.query("delete from ctf_attempts where ctf_id = $1", [ch[0].id]);
            await pool.query("delete from ctf_tasks where id = $1", [ch[0].id]);
            console.log(`  delete challenge ${lab.challenge.name}`);
          }
        }
      }
      return;
    }

    let labsAdded = 0, labsUpdated = 0, challengesAdded = 0;
    for (const lab of LABS) {
      const c = lab.challenge;

      // The challenge first — the lab points at it.
      const { rows: existingCh } = await pool.query<{ id: number }>("select id from ctf_tasks where name = $1", [c.name]);
      let ctfId: number;
      if (existingCh.length === 0) {
        const { rows } = await pool.query<{ id: number }>(
          `insert into ctf_tasks
             (name, name_uz, name_ru, description, description_uz, description_ru,
              category, difficulty, points, flag, hint, hint_uz, hint_ru, hint_cost, is_published)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,20,true) returning id`,
          [c.name, c.nameUz, c.nameRu, c.description, c.descriptionUz, c.descriptionRu,
           c.category, lab.difficulty, c.points, hashFlag(c.flag), c.hint, c.hintUz, c.hintRu],
        );
        ctfId = rows[0].id;
        challengesAdded++;
      } else {
        ctfId = existingCh[0].id;
        // The flag is updated too, which it was not before.
        //
        // The five original flags shipped inside the public SPA bundle and were
        // downloadable by anyone, signed in or not; they are burned. Rotating
        // them in lib/lab-scenarios does nothing until the challenge they are
        // checked against is rotated with them, and this is where that happens.
        // Existing solves are kept — the row that records them is untouched.
        await pool.query(
          `update ctf_tasks set description=$2, description_uz=$3, description_ru=$4,
             hint=$5, hint_uz=$6, hint_ru=$7, points=$8, flag=$9 where id=$1`,
          [ctfId, c.description, c.descriptionUz, c.descriptionRu, c.hint, c.hintUz, c.hintRu, c.points, hashFlag(c.flag)],
        );
      }

      const { rows: existingLab } = await pool.query<{ id: number }>("select id from labs where slug = $1", [lab.slug]);
      if (existingLab.length === 0) {
        await pool.query(
          `insert into labs
             (slug, name, name_uz, name_ru, description, description_uz, description_ru,
              kind, browser_scenario, image, container_port, ttl_minutes, difficulty, ctf_id, is_published)
           values ($1,$2,$3,$4,$5,$6,$7,'browser',$8,'',0,$9,$10,$11,true)`,
          [lab.slug, lab.name, lab.nameUz, lab.nameRu, lab.description, lab.descriptionUz, lab.descriptionRu,
           lab.scenario, lab.ttlMinutes, lab.difficulty, ctfId],
        );
        labsAdded++;
      } else {
        await pool.query(
          `update labs set name=$2, name_uz=$3, name_ru=$4, description=$5, description_uz=$6,
             description_ru=$7, kind='browser', browser_scenario=$8, ttl_minutes=$9,
             difficulty=$10, ctf_id=$11, is_published=true where id=$1`,
          [existingLab[0].id, lab.name, lab.nameUz, lab.nameRu, lab.description, lab.descriptionUz,
           lab.descriptionRu, lab.scenario, lab.ttlMinutes, lab.difficulty, ctfId],
        );
        labsUpdated++;
      }
      console.log(`  ${existingLab.length ? "update" : "insert"} ${lab.slug}  →  challenge #${ctfId}`);
    }
    console.log(`\n${labsAdded} labs inserted, ${labsUpdated} updated, ${challengesAdded} challenges created`);
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
