/**
 * Seeds learning Paths and a set of focused, single-topic modules — the
 * TryHackMe-style "one thing at a time" content on top of the existing
 * curriculum. Idempotent: modules by slug, lessons by title, path links by
 * (path, module). Safe to re-run; updates metadata in place.
 *
 * Run:  DATABASE_URL=… pnpm --filter ./scripts exec tsx ./src/seed-paths.ts
 */
import { Pool } from "pg";

type Lesson = { title: string; titleUz: string; titleRu: string; content: string; contentUz: string };
type Exam = { question: string; questionUz: string; questionRu: string; options: string[]; optionsUz: string[]; optionsRu: string[]; correctOption: number };
type Module = {
  slug: string; title: string; titleUz: string; titleRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  difficulty: string; estimatedHours: number; lessons: Lesson[]; exam: Exam[];
};
type Path = {
  slug: string; title: string; titleUz: string; titleRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  difficulty: string; hue: number; badge: string | null; moduleSlugs: string[];
};

const CATEGORY = { name: "Foundations", nameUz: "Asoslar", nameRu: "Основы" };

const MODULES: Module[] = [
  {
    slug: "intro-to-linux-cli", title: "Linux command line basics", titleUz: "Linux buyruqlar qatori asoslari", titleRu: "Основы командной строки Linux",
    description: "Open a terminal and move around a Linux system with confidence.", descriptionUz: "Terminalni oching va Linux tizimida ishonch bilan harakatlaning.", descriptionRu: "Откройте терминал и уверенно перемещайтесь по Linux.",
    difficulty: "beginner", estimatedHours: 1,
    lessons: [
      { title: "The shell and the prompt", titleUz: "Shell va taklif satri", titleRu: "Оболочка и приглашение",
        content: "## What is a shell?\nThe shell reads the commands you type and asks the system to run them. On Linux the common shell is **bash**.\n\n## The prompt\nThe `$` at the start of a line is the prompt — the shell waiting for you.\n\n```\n$ whoami\nuser\n```\n\n`whoami` prints who you are logged in as.",
        contentUz: "## Shell nima?\nShell siz yozgan buyruqlarni o'qiydi va tizimdan ularni bajarishni so'raydi. Linuxda keng tarqalgan shell — **bash**.\n\n## Taklif satri\nQator boshidagi `$` — taklif satri, shell sizni kutyapti.\n\n```\n$ whoami\nuser\n```\n\n`whoami` kim bo'lib kirganingizni chiqaradi." },
      { title: "Files and navigation", titleUz: "Fayllar va harakatlanish", titleRu: "Файлы и навигация",
        content: "## Where am I?\n`pwd` prints the current directory. `ls` lists what is in it.\n\n```\n$ pwd\n/home/user\n$ ls\nDesktop  notes.txt\n```\n\n## Moving around\n`cd <dir>` changes directory. `cd ..` goes up one level, `cd ~` goes home.",
        contentUz: "## Qayerdaman?\n`pwd` joriy jildni chiqaradi. `ls` uning ichidagilarni ko'rsatadi.\n\n```\n$ pwd\n/home/user\n$ ls\nDesktop  notes.txt\n```\n\n## Harakatlanish\n`cd <jild>` jildni o'zgartiradi. `cd ..` bir pog'ona yuqoriga, `cd ~` uy jildiga qaytaradi." },
      { title: "Reading files and permissions", titleUz: "Fayllarni o'qish va ruxsatlar", titleRu: "Чтение файлов и права",
        content: "## Reading a file\n`cat file.txt` prints a file. `less file.txt` opens it page by page (`q` to quit).\n\n## Permissions\n`ls -l` shows permissions like `-rw-r--r--`: who can read (r), write (w) and execute (x). Understanding these is the first step in privilege escalation.",
        contentUz: "## Faylni o'qish\n`cat file.txt` faylni chiqaradi. `less file.txt` uni sahifalab ochadi (`q` — chiqish).\n\n## Ruxsatlar\n`ls -l` `-rw-r--r--` kabi ruxsatlarni ko'rsatadi: kim o'qiy (r), yoza (w) va ishga tushira (x) oladi. Buni tushunish — imtiyozni oshirishning birinchi qadami." },
    ],
    exam: [
      { question: "Which command prints your current directory?", questionUz: "Qaysi buyruq joriy jildni chiqaradi?", questionRu: "Какая команда печатает текущий каталог?", options: ["pwd", "cd", "ls", "whoami"], optionsUz: ["pwd", "cd", "ls", "whoami"], optionsRu: ["pwd", "cd", "ls", "whoami"], correctOption: 0 },
      { question: "In `-rw-r--r--`, what does the first `w` mean?", questionUz: "`-rw-r--r--` da birinchi `w` nimani anglatadi?", questionRu: "В `-rw-r--r--` что означает первая `w`?", options: ["Owner can write", "Anyone can read", "File is hidden", "Execute allowed"], optionsUz: ["Egasi yoza oladi", "Hamma o'qiy oladi", "Fayl yashirin", "Ishga tushirish mumkin"], optionsRu: ["Владелец может писать", "Все могут читать", "Файл скрыт", "Можно запускать"], correctOption: 0 },
      { question: "How do you go up one directory?", questionUz: "Bir jild yuqoriga qanday chiqasiz?", questionRu: "Как подняться на каталог вверх?", options: ["cd ..", "cd ~", "ls -l", "pwd"], optionsUz: ["cd ..", "cd ~", "ls -l", "pwd"], optionsRu: ["cd ..", "cd ~", "ls -l", "pwd"], correctOption: 0 },
    ],
  },
  {
    slug: "networking-basics", title: "Networking basics", titleUz: "Tarmoq asoslari", titleRu: "Основы сетей",
    description: "IP addresses, ports and how two machines talk to each other.", descriptionUz: "IP manzillar, portlar va ikki mashina qanday gaplashadi.", descriptionRu: "IP-адреса, порты и как машины общаются.",
    difficulty: "beginner", estimatedHours: 1,
    lessons: [
      { title: "IP addresses and ports", titleUz: "IP manzillar va portlar", titleRu: "IP-адреса и порты",
        content: "## IP address\nAn IP address identifies a machine on a network, e.g. `192.168.1.10`.\n\n## Ports\nA port identifies a service on that machine. Web servers usually listen on **80** (HTTP) and **443** (HTTPS). Think of the IP as the building and the port as the flat number.",
        contentUz: "## IP manzil\nIP manzil tarmoqdagi mashinani aniqlaydi, masalan `192.168.1.10`.\n\n## Portlar\nPort o'sha mashinadagi xizmatni aniqlaydi. Veb-serverlar odatda **80** (HTTP) va **443** (HTTPS) portlarini tinglaydi. IP — bino, port — xonadon raqami deb tasavvur qiling." },
      { title: "TCP and UDP", titleUz: "TCP va UDP", titleRu: "TCP и UDP",
        content: "## Two ways to send data\n**TCP** sets up a reliable connection and confirms delivery — used by the web, email, SSH.\n**UDP** just fires packets with no guarantee — faster, used by DNS, video, games.",
        contentUz: "## Ma'lumot yuborishning ikki usuli\n**TCP** ishonchli aloqa o'rnatadi va yetkazilishni tasdiqlaydi — veb, email, SSH shundan foydalanadi.\n**UDP** paketlarni kafolat­siz yuboradi — tezroq, DNS, video, o'yinlar uchun." },
      { title: "DNS: names to numbers", titleUz: "DNS: nomdan raqamga", titleRu: "DNS: имена в числа",
        content: "## Why DNS?\nYou type `cdctf.uz`, but machines need an IP. **DNS** is the phone book that turns a name into an IP address before your request is sent.",
        contentUz: "## Nega DNS?\nSiz `cdctf.uz` deb yozasiz, lekin mashinalarga IP kerak. **DNS** — nomni IP manzilga aylantiruvchi telefon kitobi, so'rovingiz yuborilishidan oldin ishlaydi." },
    ],
    exam: [
      { question: "Which port does HTTPS usually use?", questionUz: "HTTPS odatda qaysi portdan foydalanadi?", questionRu: "Какой порт обычно у HTTPS?", options: ["443", "80", "22", "53"], optionsUz: ["443", "80", "22", "53"], optionsRu: ["443", "80", "22", "53"], correctOption: 0 },
      { question: "Which protocol is reliable and confirms delivery?", questionUz: "Qaysi protokol ishonchli va yetkazishni tasdiqlaydi?", questionRu: "Какой протокол надёжен и подтверждает доставку?", options: ["TCP", "UDP", "DNS", "IP"], optionsUz: ["TCP", "UDP", "DNS", "IP"], optionsRu: ["TCP", "UDP", "DNS", "IP"], correctOption: 0 },
      { question: "What does DNS do?", questionUz: "DNS nima qiladi?", questionRu: "Что делает DNS?", options: ["Turns names into IPs", "Encrypts traffic", "Blocks ports", "Stores passwords"], optionsUz: ["Nomni IP ga aylantiradi", "Trafikni shifrlaydi", "Portlarni bloklaydi", "Parol saqlaydi"], optionsRu: ["Превращает имена в IP", "Шифрует трафик", "Блокирует порты", "Хранит пароли"], correctOption: 0 },
    ],
  },
  {
    slug: "web-requests-101", title: "How the web works", titleUz: "Veb qanday ishlaydi", titleRu: "Как работает веб",
    description: "HTTP requests, responses and the pieces attackers poke at.", descriptionUz: "HTTP so'rovlar, javoblar va hujumchilar tegadigan qismlar.", descriptionRu: "HTTP-запросы, ответы и что трогают атакующие.",
    difficulty: "beginner", estimatedHours: 1,
    lessons: [
      { title: "Requests and methods", titleUz: "So'rovlar va metodlar", titleRu: "Запросы и методы",
        content: "## A request\nYour browser sends an HTTP request: a **method** (GET to read, POST to send data), a path, and headers.\n\n```\nGET /login HTTP/1.1\nHost: cdctf.uz\n```\n\nGET fetches a page; POST submits a form.",
        contentUz: "## So'rov\nBrauzeringiz HTTP so'rov yuboradi: **metod** (o'qish uchun GET, ma'lumot yuborish uchun POST), yo'l va sarlavhalar.\n\n```\nGET /login HTTP/1.1\nHost: cdctf.uz\n```\n\nGET sahifani oladi; POST formani yuboradi." },
      { title: "Status codes", titleUz: "Holat kodlari", titleRu: "Коды состояния",
        content: "## What the server answers\n- **200** OK — success\n- **301/302** — redirect\n- **401/403** — not authorised / forbidden\n- **404** — not found\n- **500** — server error\n\nReading these tells you a lot about how an app behaves.",
        contentUz: "## Server nima javob beradi\n- **200** OK — muvaffaqiyat\n- **301/302** — yo'naltirish\n- **401/403** — ruxsat yo'q / taqiqlangan\n- **404** — topilmadi\n- **500** — server xatosi\n\nBularni o'qish ilova qanday ishlashini ko'p ochib beradi." },
      { title: "Headers and cookies", titleUz: "Sarlavhalar va cookie'lar", titleRu: "Заголовки и cookie",
        content: "## Headers\nHeaders carry extra info: content type, authentication, and **cookies**.\n\n## Cookies\nA cookie is a small value the server sets in your browser to remember you — most often your session. Stealing or forging one is a classic web attack, which is why they must be `HttpOnly` and `Secure`.",
        contentUz: "## Sarlavhalar\nSarlavhalar qo'shimcha ma'lumot tashiydi: kontent turi, autentifikatsiya va **cookie'lar**.\n\n## Cookie'lar\nCookie — server brauzeringizda sizni eslab qolish uchun o'rnatadigan kichik qiymat, ko'pincha sessiyangiz. Uni o'g'irlash yoki soxtalashtirish — klassik veb-hujum, shuning uchun ular `HttpOnly` va `Secure` bo'lishi kerak." },
    ],
    exam: [
      { question: "Which method submits a form with data?", questionUz: "Qaysi metod ma'lumotli formani yuboradi?", questionRu: "Какой метод отправляет форму с данными?", options: ["POST", "GET", "HEAD", "PUT"], optionsUz: ["POST", "GET", "HEAD", "PUT"], optionsRu: ["POST", "GET", "HEAD", "PUT"], correctOption: 0 },
      { question: "What does status 403 mean?", questionUz: "403 holat nimani anglatadi?", questionRu: "Что означает статус 403?", options: ["Forbidden", "OK", "Not found", "Redirect"], optionsUz: ["Taqiqlangan", "OK", "Topilmadi", "Yo'naltirish"], optionsRu: ["Запрещено", "OK", "Не найдено", "Редирект"], correctOption: 0 },
      { question: "Why should a session cookie be HttpOnly?", questionUz: "Nega sessiya cookie'si HttpOnly bo'lishi kerak?", questionRu: "Почему сессионный cookie должен быть HttpOnly?", options: ["So scripts can't read it", "To make it faster", "To store more data", "To skip login"], optionsUz: ["Skriptlar o'qiy olmasligi uchun", "Tezroq bo'lishi uchun", "Ko'proq ma'lumot saqlash uchun", "Loginni o'tkazib yuborish uchun"], optionsRu: ["Чтобы скрипты не читали", "Для скорости", "Больше данных", "Пропустить вход"], correctOption: 0 },
    ],
  },
  {
    slug: "passwords-and-hashing", title: "Passwords and hashing", titleUz: "Parollar va hashlash", titleRu: "Пароли и хеширование",
    description: "How passwords are stored, why hashing matters, and what makes a strong one.", descriptionUz: "Parollar qanday saqlanadi, nega hashlash muhim va kuchli parol nima.", descriptionRu: "Как хранят пароли, зачем хеширование и что делает пароль сильным.",
    difficulty: "beginner", estimatedHours: 1,
    lessons: [
      { title: "Hashing vs encryption", titleUz: "Hashlash va shifrlash", titleRu: "Хеширование и шифрование",
        content: "## Hashing\nA hash is a one-way fingerprint of data: same input → same hash, but you cannot reverse it. Passwords are **hashed**, never stored as plain text.\n\n## Encryption\nEncryption is two-way — with the key you can get the original back. Use it for data you must read later, not for passwords.",
        contentUz: "## Hashlash\nHash — ma'lumotning bir tomonlama barmoq izi: bir xil kirish → bir xil hash, lekin uni ortga qaytarib bo'lmaydi. Parollar **hashlanadi**, hech qachon ochiq matn sifatida saqlanmaydi.\n\n## Shifrlash\nShifrlash ikki tomonlama — kalit bilan asl matnni qaytarib olasiz. Uni keyin o'qish kerak bo'lgan ma'lumot uchun ishlating, parol uchun emas." },
      { title: "Why salts and slow hashes", titleUz: "Nega salt va sekin hashlar", titleRu: "Зачем соль и медленные хеши",
        content: "## The problem\nAttackers precompute hashes of common passwords (rainbow tables). A **salt** — a random value added to each password — makes every hash unique, breaking those tables.\n\n## Slow on purpose\nAlgorithms like **bcrypt** are deliberately slow, so guessing billions of passwords becomes too expensive.",
        contentUz: "## Muammo\nHujumchilar ommabop parollar hashini oldindan hisoblaydi (rainbow jadvallar). **Salt** — har parolga qo'shiladigan tasodifiy qiymat — har bir hashni noyob qiladi va bu jadvallarni buzadi.\n\n## Ataylab sekin\n**bcrypt** kabi algoritmlar ataylab sekin, shuning uchun milliardlab parolni taxmin qilish juda qimmatga tushadi." },
      { title: "Strong passwords", titleUz: "Kuchli parollar", titleRu: "Сильные пароли",
        content: "## What makes a password strong\nLength beats complexity. A long passphrase like `correct-horse-battery-staple` is stronger and easier than `P@ss1`.\n\n## Rules of thumb\n- Long (12+ characters)\n- Unique per site\n- Stored in a password manager\n- Protected by 2FA where possible.",
        contentUz: "## Parolni kuchli qiladigan narsa\nUzunlik murakkablikdan ustun. `correct-horse-battery-staple` kabi uzun ibora `P@ss1` dan kuchliroq va osonroq.\n\n## Oddiy qoidalar\n- Uzun (12+ belgi)\n- Har sayt uchun noyob\n- Parol menejerida saqlangan\n- Iloji bo'lsa 2FA bilan himoyalangan." },
    ],
    exam: [
      { question: "How are passwords meant to be stored?", questionUz: "Parollar qanday saqlanishi kerak?", questionRu: "Как следует хранить пароли?", options: ["Hashed", "Plain text", "Encrypted with one shared key", "In cookies"], optionsUz: ["Hashlangan", "Ochiq matn", "Bitta umumiy kalit bilan shifrlangan", "Cookie'da"], optionsRu: ["Хешированными", "Открытым текстом", "Одним общим ключом", "В cookie"], correctOption: 0 },
      { question: "What does a salt do?", questionUz: "Salt nima qiladi?", questionRu: "Что делает соль?", options: ["Makes each hash unique", "Speeds up hashing", "Encrypts the password", "Stores the password"], optionsUz: ["Har hashni noyob qiladi", "Hashlashni tezlashtiradi", "Parolni shifrlaydi", "Parolni saqlaydi"], optionsRu: ["Делает хеш уникальным", "Ускоряет хеш", "Шифрует пароль", "Хранит пароль"], correctOption: 0 },
      { question: "What matters most for password strength?", questionUz: "Parol kuchi uchun eng muhimi nima?", questionRu: "Что важнее всего для силы пароля?", options: ["Length", "Special characters only", "Changing it daily", "Using your name"], optionsUz: ["Uzunlik", "Faqat maxsus belgilar", "Har kuni o'zgartirish", "Ismdan foydalanish"], optionsRu: ["Длина", "Только спецсимволы", "Менять ежедневно", "Использовать имя"], correctOption: 0 },
    ],
  },
];

const PATHS: Path[] = [
  {
    slug: "pre-security", title: "Pre-Security", titleUz: "Xavfsizlikka tayyorgarlik", titleRu: "Подготовка к безопасности",
    description: "Your first step into cyber. Learn how tech works before you learn to break it.", descriptionUz: "Kiberga birinchi qadam. Buzishni o'rganishdan oldin texnologiya qanday ishlashini biling.", descriptionRu: "Первый шаг в кибер. Сначала как всё работает, потом как ломать.",
    difficulty: "beginner", hue: 150, badge: "NEW",
    moduleSlugs: ["intro-to-linux-cli", "networking-basics", "web-requests-101", "linux-for-security", "networking-for-security"],
  },
  {
    slug: "web-fundamentals", title: "Web fundamentals", titleUz: "Veb asoslari", titleRu: "Основы веба",
    description: "Understand the web deeply enough to find its flaws.", descriptionUz: "Vebni kamchiliklarini topa oladigan darajada chuqur tushuning.", descriptionRu: "Поймите веб достаточно, чтобы находить уязвимости.",
    difficulty: "beginner", hue: 265, badge: null,
    moduleSlugs: ["web-requests-101", "web-security", "web-exploitation"],
  },
  {
    slug: "security-foundations", title: "Security foundations", titleUz: "Xavfsizlik asoslari", titleRu: "Основы безопасности",
    description: "The core ideas every defender and attacker shares.", descriptionUz: "Har bir himoyachi va hujumchi biladigan asosiy g'oyalar.", descriptionRu: "Базовые идеи для защитника и атакующего.",
    difficulty: "beginner", hue: 210, badge: null,
    moduleSlugs: ["intro-to-linux-cli", "networking-basics", "passwords-and-hashing", "cryptography-for-security"],
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url && !process.env.PGHOST) {
    console.error("DATABASE_URL yoki PGHOST/PGUSER/PGPASSWORD kerak");
    process.exit(1);
  }
  const pool = url ? new Pool({ connectionString: url }) : new Pool();

  try {
    // Self-heal the tables this seed writes (no-op when present).
    for (const ddl of [
      `CREATE TABLE IF NOT EXISTS learn_paths (
         id serial PRIMARY KEY, slug text NOT NULL UNIQUE,
         title text NOT NULL, title_uz text, title_ru text,
         description text NOT NULL, description_uz text, description_ru text,
         difficulty text NOT NULL DEFAULT 'beginner', hue integer NOT NULL DEFAULT 210,
         badge text, order_index integer NOT NULL DEFAULT 0,
         is_published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS learn_path_modules (
         id serial PRIMARY KEY,
         path_id integer NOT NULL REFERENCES learn_paths(id),
         module_id integer NOT NULL REFERENCES modules(id),
         order_index integer NOT NULL DEFAULT 0)`,
      "CREATE UNIQUE INDEX IF NOT EXISTS learn_path_modules_unique_idx ON learn_path_modules(path_id, module_id)",
    ]) {
      await pool.query(ddl);
    }

    // Category.
    let catId: number;
    const cat = await pool.query("SELECT id FROM learn_categories WHERE name=$1 LIMIT 1", [CATEGORY.name]);
    if (cat.rowCount) catId = cat.rows[0].id;
    else catId = (await pool.query("INSERT INTO learn_categories (name, name_uz, name_ru) VALUES ($1,$2,$3) RETURNING id", [CATEGORY.name, CATEGORY.nameUz, CATEGORY.nameRu])).rows[0].id;

    // Modules + lessons + exam.
    const moduleIdBySlug = new Map<string, number>();
    let modAdded = 0, lessonAdded = 0;
    for (let mi = 0; mi < MODULES.length; mi++) {
      const m = MODULES[mi];
      const found = await pool.query("SELECT id FROM modules WHERE slug=$1 LIMIT 1", [m.slug]);
      let mid: number;
      if (found.rowCount) {
        mid = found.rows[0].id;
        await pool.query(
          `UPDATE modules SET title=$2, title_uz=$3, title_ru=$4, description=$5, description_uz=$6, description_ru=$7,
             category_id=$8, difficulty=$9, estimated_hours=$10 WHERE id=$1`,
          [mid, m.title, m.titleUz, m.titleRu, m.description, m.descriptionUz, m.descriptionRu, catId, m.difficulty, m.estimatedHours]);
      } else {
        mid = (await pool.query(
          `INSERT INTO modules (slug,title,title_uz,title_ru,description,description_uz,description_ru,category_id,order_index,estimated_hours,difficulty,pass_score,is_published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,80,true) RETURNING id`,
          [m.slug, m.title, m.titleUz, m.titleRu, m.description, m.descriptionUz, m.descriptionRu, catId, 100 + mi, m.estimatedHours, m.difficulty])).rows[0].id;
        modAdded++;
      }
      moduleIdBySlug.set(m.slug, mid);

      // Exam — rebuilt each run.
      await pool.query("DELETE FROM module_questions WHERE module_id=$1", [mid]);
      let eo = 0;
      for (const q of m.exam) {
        await pool.query(
          `INSERT INTO module_questions (module_id,question,question_uz,question_ru,options,options_uz,options_ru,correct_option,order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [mid, q.question, q.questionUz, q.questionRu, JSON.stringify(q.options), JSON.stringify(q.optionsUz), JSON.stringify(q.optionsRu), q.correctOption, eo++]);
      }

      // Lessons — inserted if new (by title), reordered/reassigned if present.
      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li];
        const ex = await pool.query("SELECT id FROM lessons WHERE title=$1 LIMIT 1", [l.title]);
        if (ex.rowCount) {
          await pool.query("UPDATE lessons SET module_id=$2, order_index=$3, category_id=$4 WHERE id=$1", [ex.rows[0].id, mid, li, catId]);
        } else {
          await pool.query(
            `INSERT INTO lessons (title,title_uz,title_ru,content,content_uz,content_ru,category_id,module_id,order_index,points,is_published)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,50,true)`,
            [l.title, l.titleUz, l.titleRu, l.content, l.contentUz, null, catId, mid, li]);
          lessonAdded++;
        }
      }
    }

    // Paths + links. Modules that don't exist (e.g. an existing slug that differs
    // on this install) are simply skipped, so the path still forms from what's there.
    let pathAdded = 0, linkAdded = 0;
    for (let pi = 0; pi < PATHS.length; pi++) {
      const p = PATHS[pi];
      const found = await pool.query("SELECT id FROM learn_paths WHERE slug=$1 LIMIT 1", [p.slug]);
      let pid: number;
      if (found.rowCount) {
        pid = found.rows[0].id;
        await pool.query(
          `UPDATE learn_paths SET title=$2,title_uz=$3,title_ru=$4,description=$5,description_uz=$6,description_ru=$7,difficulty=$8,hue=$9,badge=$10,order_index=$11 WHERE id=$1`,
          [pid, p.title, p.titleUz, p.titleRu, p.description, p.descriptionUz, p.descriptionRu, p.difficulty, p.hue, p.badge, pi]);
      } else {
        pid = (await pool.query(
          `INSERT INTO learn_paths (slug,title,title_uz,title_ru,description,description_uz,description_ru,difficulty,hue,badge,order_index,is_published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING id`,
          [p.slug, p.title, p.titleUz, p.titleRu, p.description, p.descriptionUz, p.descriptionRu, p.difficulty, p.hue, p.badge, pi])).rows[0].id;
        pathAdded++;
      }

      let order = 0;
      for (const slug of p.moduleSlugs) {
        let mid = moduleIdBySlug.get(slug);
        if (!mid) {
          const r = await pool.query("SELECT id FROM modules WHERE slug=$1 LIMIT 1", [slug]);
          if (!r.rowCount) continue; // module not on this install — skip
          mid = r.rows[0].id;
        }
        const res = await pool.query(
          `INSERT INTO learn_path_modules (path_id, module_id, order_index) VALUES ($1,$2,$3)
           ON CONFLICT (path_id, module_id) DO UPDATE SET order_index=excluded.order_index`,
          [pid, mid, order++]);
        if (res.rowCount) linkAdded++;
      }
    }

    console.log(`🎉 Seed done. Modules +${modAdded}, lessons +${lessonAdded}, paths +${pathAdded}, links ${linkAdded}.`);
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
