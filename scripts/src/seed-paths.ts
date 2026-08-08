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
  {
    slug: "recon-basics", title: "Reconnaissance basics", titleUz: "Razvedka asoslari", titleRu: "Основы разведки",
    description: "Before any attack comes information gathering — do it the right way.", descriptionUz: "Har qanday hujumdan oldin ma'lumot yig'ish keladi — buni to'g'ri qiling.", descriptionRu: "Перед любой атакой — сбор информации.",
    difficulty: "beginner", estimatedHours: 1,
    lessons: [
      { title: "Passive vs active recon", titleUz: "Passiv va aktiv razvedka", titleRu: "Пассивная и активная разведка",
        content: "## Two kinds\n**Passive** recon reads public sources (a website, DNS records, search engines) without touching the target — invisible.\n**Active** recon interacts with the target (scanning ports) — faster, but noisy and often logged. Always stay within scope and permission.",
        contentUz: "## Ikki turi\n**Passiv** razvedka ochiq manbalarni o'qiydi (sayt, DNS yozuvlari, qidiruv tizimlari) — nishonga tegmaydi, ko'rinmas.\n**Aktiv** razvedka nishon bilan aloqa qiladi (portlarni skanerlash) — tezroq, lekin shovqinli va ko'pincha loglanadi. Doim ruxsat va doira ichida ishlang." },
      { title: "Scanning with nmap", titleUz: "nmap bilan skanerlash", titleRu: "Сканирование nmap",
        content: "## Finding open ports\n`nmap` reports which ports are open and what runs on them.\n\n```\n$ nmap -sV 10.10.10.5\n22/tcp open  ssh   OpenSSH 8.2\n80/tcp open  http  nginx 1.18\n```\n\n`-sV` also guesses the service version — the first clue for finding a known vulnerability. Only scan systems you are allowed to.",
        contentUz: "## Ochiq portlarni topish\n`nmap` qaysi portlar ochiq va ularda nima ishlayotganini ko'rsatadi.\n\n```\n$ nmap -sV 10.10.10.5\n22/tcp open  ssh   OpenSSH 8.2\n80/tcp open  http  nginx 1.18\n```\n\n`-sV` xizmat versiyasini ham taxmin qiladi — ma'lum zaiflikni topishning birinchi ipi. Faqat ruxsat berilgan tizimlarni skanerlang." },
    ],
    exam: [
      { question: "Which recon type never touches the target?", questionUz: "Qaysi razvedka nishonga tegmaydi?", questionRu: "Какая разведка не трогает цель?", options: ["Passive", "Active", "Port scanning", "Brute force"], optionsUz: ["Passiv", "Aktiv", "Port skanerlash", "Brute force"], optionsRu: ["Пассивная", "Активная", "Скан портов", "Перебор"], correctOption: 0 },
      { question: "What does nmap -sV add?", questionUz: "nmap -sV nima qo'shadi?", questionRu: "Что добавляет nmap -sV?", options: ["Service version", "A password", "A firewall", "A backdoor"], optionsUz: ["Xizmat versiyasi", "Parol", "Firewall", "Backdoor"], optionsRu: ["Версию сервиса", "Пароль", "Файрвол", "Бэкдор"], correctOption: 0 },
      { question: "Before scanning a system you must have…", questionUz: "Tizimni skanerlashdan oldin sizda… bo'lishi kerak", questionRu: "Перед сканированием нужно иметь…", options: ["Permission", "A fast laptop", "A VPN only", "Nothing"], optionsUz: ["Ruxsat", "Tez noutbuk", "Faqat VPN", "Hech narsa"], optionsRu: ["Разрешение", "Быстрый ноутбук", "Только VPN", "Ничего"], correctOption: 0 },
    ],
  },
  {
    slug: "sql-injection-101", title: "SQL injection 101", titleUz: "SQL injection 101", titleRu: "SQL-инъекции 101",
    description: "Understand the classic web flaw that leaks whole databases.", descriptionUz: "Butun bazalarni sizdiradigan klassik veb-kamchilikni tushuning.", descriptionRu: "Классическая уязвимость, сливающая базы.",
    difficulty: "intermediate", estimatedHours: 1,
    lessons: [
      { title: "What is SQL injection", titleUz: "SQL injection nima", titleRu: "Что такое SQL-инъекция",
        content: "## The bug\nWhen an app builds a database query by pasting user input straight into it, an attacker can change the query's meaning.\n\n```\nSELECT * FROM users WHERE name = 'alice' AND pass = '' OR '1'='1'\n```\n\nThe `' OR '1'='1` turns the check always-true. The fix is **parameterised queries**, which keep data and code separate.",
        contentUz: "## Kamchilik\nIlova foydalanuvchi kiritmasini to'g'ridan-to'g'ri so'rovga yopishtirib qursa, hujumchi so'rov ma'nosini o'zgartira oladi.\n\n```\nSELECT * FROM users WHERE name = 'alice' AND pass = '' OR '1'='1'\n```\n\n`' OR '1'='1` tekshiruvni doim rost qiladi. Yechim — **parametrlangan so'rovlar**: ular ma'lumot va kodni ajratadi." },
      { title: "Finding and preventing it", titleUz: "Topish va oldini olish", titleRu: "Поиск и защита",
        content: "## Spotting it\nA single quote `'` that breaks the page, or input that changes results, is a hint. Automated tools like `sqlmap` confirm it (only with permission).\n\n## Preventing it\n- Parameterised queries / prepared statements\n- Least-privilege database users\n- Input validation as a second layer.",
        contentUz: "## Topish\nSahifani buzadigan bitta qo'shtirnoq `'` yoki natijani o'zgartiruvchi kiritma — ip. `sqlmap` kabi vositalar tasdiqlaydi (faqat ruxsat bilan).\n\n## Oldini olish\n- Parametrlangan so'rovlar / prepared statement\n- Kam-imtiyozli baza foydalanuvchilari\n- Ikkinchi qatlam sifatida kiritmani tekshirish." },
    ],
    exam: [
      { question: "The main fix for SQL injection is…", questionUz: "SQL injection'ning asosiy yechimi…", questionRu: "Главная защита от SQL-инъекций…", options: ["Parameterised queries", "A longer password", "Hiding the URL", "A faster server"], optionsUz: ["Parametrlangan so'rovlar", "Uzunroq parol", "URL'ni yashirish", "Tezroq server"], optionsRu: ["Параметризованные запросы", "Длинный пароль", "Скрыть URL", "Быстрый сервер"], correctOption: 0 },
      { question: "`' OR '1'='1` typically makes a check…", questionUz: "`' OR '1'='1` odatda tekshiruvni…", questionRu: "`' OR '1'='1` обычно делает проверку…", options: ["Always true", "Always false", "Slower", "Encrypted"], optionsUz: ["Doim rost", "Doim yolg'on", "Sekinroq", "Shifrlangan"], optionsRu: ["Всегда истинной", "Всегда ложной", "Медленнее", "Шифрованной"], correctOption: 0 },
      { question: "A database user should have…", questionUz: "Baza foydalanuvchisida… bo'lishi kerak", questionRu: "У пользователя БД должно быть…", options: ["Least privilege", "All privileges", "No password", "Admin always"], optionsUz: ["Kam imtiyoz", "Barcha imtiyozlar", "Parolsiz", "Doim admin"], optionsRu: ["Минимум прав", "Все права", "Без пароля", "Всегда админ"], correctOption: 0 },
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
    moduleSlugs: ["web-requests-101", "sql-injection-101", "web-security", "web-exploitation"],
  },
  {
    slug: "security-foundations", title: "Security foundations", titleUz: "Xavfsizlik asoslari", titleRu: "Основы безопасности",
    description: "The core ideas every defender and attacker shares.", descriptionUz: "Har bir himoyachi va hujumchi biladigan asosiy g'oyalar.", descriptionRu: "Базовые идеи для защитника и атакующего.",
    difficulty: "beginner", hue: 210, badge: null,
    moduleSlugs: ["intro-to-linux-cli", "networking-basics", "passwords-and-hashing", "recon-basics", "cryptography-for-security"],
  },
];

type Spotlight = { section: "threats" | "ai" | "networks" | "walkthroughs" | "live"; title: string; titleUz: string; description: string; descriptionUz: string; tag?: string; url?: string };

const c = (section: Spotlight["section"], title: string, titleUz: string, description: string, descriptionUz: string, tag?: string, url?: string): Spotlight => ({ section, title, titleUz, description, descriptionUz, tag, url });

const SPOTLIGHTS: Spotlight[] = [
  // ---- Recent Threats (real CVEs + threat concepts) ----
  c("threats", "OWASP Top 10 — the web's most common flaws", "OWASP Top 10 — vebning eng keng tarqalgan kamchiliklari", "The ten risks every web app faces, and how to spot them.", "Har bir veb-ilova duch keladigan o'nta xavf va ularni topish.", "OWASP", "https://owasp.org/www-project-top-ten/"),
  c("threats", "Log4Shell", "Log4Shell", "A single log line took over servers worldwide — how JNDI injection worked.", "Bitta log qatori butun dunyoda serverlarni egalladi — JNDI injection qanday ishladi.", "CVE-2021-44228"),
  c("threats", "EternalBlue & WannaCry", "EternalBlue va WannaCry", "The SMB flaw behind the biggest ransomware outbreak. Patch your SMB.", "Eng katta ransomware to'lqini ortidagi SMB kamchiligi. SMB'ni yangilang.", "MS17-010"),
  c("threats", "Heartbleed", "Heartbleed", "An OpenSSL bug that leaked memory — including private keys.", "Xotirani, jumladan maxfiy kalitlarni sizdirgan OpenSSL xatosi.", "CVE-2014-0160"),
  c("threats", "Shellshock", "Shellshock", "Bash parsed environment variables as code — remote command execution.", "Bash muhit o'zgaruvchilarini kod sifatida o'qidi — masofaviy buyruq bajarish.", "CVE-2014-6271"),
  c("threats", "Dirty Pipe", "Dirty Pipe", "A Linux kernel bug that let any user overwrite read-only files.", "Har qanday foydalanuvchiga faqat-o'qish fayllarni yozishga imkon bergan Linux yadro xatosi.", "CVE-2022-0847"),
  c("threats", "PrintNightmare", "PrintNightmare", "The Windows Print Spooler flaw that gave SYSTEM to anyone.", "Har kimga SYSTEM bergan Windows Print Spooler kamchiligi.", "CVE-2021-34527"),
  c("threats", "Follina", "Follina", "A Word document that ran code with no macros, via MSDT.", "Makrossiz kod ishga tushirgan Word hujjati (MSDT orqali).", "CVE-2022-30190"),
  c("threats", "Spring4Shell", "Spring4Shell", "Remote code execution in Spring, weeks after Log4Shell.", "Log4Shell'dan hafta o'tib Spring'da masofaviy kod bajarish.", "CVE-2022-22965"),
  c("threats", "BlueKeep", "BlueKeep", "A wormable RDP vulnerability — why exposed RDP is dangerous.", "Qurt kabi tarqaluvchi RDP zaifligi — ochiq RDP nega xavfli.", "CVE-2019-0708"),
  c("threats", "Citrix Bleed", "Citrix Bleed", "Session tokens leaked straight from Citrix appliances.", "Citrix qurilmalaridan sessiya tokenlari to'g'ridan-to'g'ri sizib chiqdi.", "CVE-2023-4966"),
  c("threats", "MOVEit mass breach", "MOVEit ommaviy buzilishi", "One SQL injection in a file-transfer tool breached hundreds of orgs.", "Fayl-uzatish vositasidagi bitta SQL injection yuzlab tashkilotni buzdi.", "CVE-2023-34362"),
  c("threats", "regreSSHion", "regreSSHion", "A race condition brought RCE back to OpenSSH.", "Race condition OpenSSH'ga RCE'ni qaytardi.", "CVE-2024-6387"),
  c("threats", "The XZ backdoor", "XZ backdoor'i", "A near-miss supply-chain backdoor hidden in a core Linux library.", "Asosiy Linux kutubxonasiga yashiringan, ozgina qolgan supply-chain backdoor.", "CVE-2024-3094"),
  c("threats", "Ransomware, explained", "Ransomware tushuntirildi", "How ransomware gets in, spreads, and how to survive it.", "Ransomware qanday kiradi, tarqaladi va undan qanday omon qolish.", "Concept"),
  c("threats", "Phishing & social engineering", "Fishing va ijtimoiy muhandislik", "The attack that beats every firewall: tricking a human.", "Har qanday firewall'ni yengadigan hujum: insonni aldash.", "Concept"),
  c("threats", "Supply-chain attacks", "Ta'minot zanjiri hujumlari", "Why compromising one dependency can compromise thousands of apps.", "Nega bitta bog'liqlikni buzish minglab ilovani buzishi mumkin.", "Concept"),
  c("threats", "Zero-day vs N-day", "Zero-day va N-day", "The difference between an unknown bug and a known, unpatched one.", "Noma'lum xato va ma'lum, yangilanmagan xato o'rtasidagi farq.", "Concept"),
  c("threats", "Credential stuffing", "Credential stuffing", "Why reused passwords let one breach unlock many accounts.", "Nega takror ishlatilgan parollar bitta buzilishdan ko'p hisobni ochadi.", "Concept"),
  c("threats", "Keeping software patched", "Dasturlarni yangilab turish", "Most breaches use a known bug with a fix already available.", "Ko'p buzilishlar yechimi bor ma'lum xatodan foydalanadi.", "Basics"),

  // ---- AI Upskilling ----
  c("ai", "Prompt injection 101", "Prompt injection 101", "Tricking LLM apps into ignoring their instructions — and defending.", "LLM-ilovalarni ko'rsatmalarini e'tiborsiz qoldirishga aldash — va himoya.", "LLM"),
  c("ai", "OWASP Top 10 for LLMs", "LLM'lar uchun OWASP Top 10", "The industry list of the biggest risks in LLM apps.", "LLM-ilovalaridagi eng katta xavflar ro'yxati.", "OWASP", "https://owasp.org/www-project-top-10-for-large-language-model-applications/"),
  c("ai", "Jailbreaking LLMs", "LLM'larni jailbreak qilish", "How crafted prompts bypass safety filters, and why it matters.", "Maxsus promptlar xavfsizlik filtrlarini qanday aylanib o'tadi.", "LLM"),
  c("ai", "Data poisoning", "Ma'lumotni zaharlash", "Corrupting training data to plant hidden model behaviour.", "Modelga yashirin xatti-harakat joylash uchun o'quv ma'lumotini buzish.", "ML"),
  c("ai", "Adversarial examples", "Adversarial misollar", "Tiny input changes that fool a model into the wrong answer.", "Modelni noto'g'ri javobga aldaydigan kichik kirish o'zgarishlari.", "ML"),
  c("ai", "Prompt leaking", "Prompt sizishi", "Getting a model to reveal its hidden system prompt.", "Modelni yashirin tizim promptini oshkor qilishga majburlash.", "LLM"),
  c("ai", "RAG security", "RAG xavfsizligi", "Securing retrieval-augmented apps against poisoned documents.", "Retrieval ilovalarni zaharlangan hujjatlardan himoyalash.", "LLM"),
  c("ai", "Excessive agency", "Ortiqcha vakolat", "Why giving an AI agent too many tools is a security risk.", "AI agentga juda ko'p vosita berish nega xavf.", "LLM"),
  c("ai", "Insecure plugins & tools", "Xavfsiz bo'lmagan plaginlar", "How an LLM's tools become an attacker's tools.", "LLM vositalari qanday qilib hujumchi vositalariga aylanadi.", "LLM"),
  c("ai", "Output validation", "Chiqishni tekshirish", "Never trust model output blindly — treat it as user input.", "Model chiqishiga ko'r-ko'rona ishonmang — uni kirish deb bilib ishlov bering.", "Defense"),
  c("ai", "Model extraction", "Modelni o'g'irlash", "Stealing a model's behaviour through its own API.", "Model xatti-harakatini uning API'si orqali o'g'irlash.", "ML"),
  c("ai", "Training-data privacy", "O'quv ma'lumoti maxfiyligi", "Models can memorise and leak secrets from their training set.", "Modellar o'quv to'plamidan sirlarni yodlab, sizdirishi mumkin.", "Privacy"),
  c("ai", "Deepfakes & AI phishing", "Deepfake va AI fishing", "How generative AI supercharges social-engineering attacks.", "Generativ AI ijtimoiy muhandislikni qanday kuchaytiradi.", "Threat"),
  c("ai", "Guardrails & moderation", "Guardrail va moderatsiya", "Layered controls that keep an AI app inside its lane.", "AI-ilovani chegarada ushlab turadigan qatlamli nazoratlar.", "Defense"),
  c("ai", "AI red teaming", "AI red teaming", "Systematically probing an AI system for failures.", "AI tizimini nosozliklar uchun tizimli sinash.", "Offense"),
  c("ai", "Securing AI API keys", "AI API kalitlarini himoyalash", "Leaked model keys cost money and leak data — lock them down.", "Sizib chiqqan kalitlar pul va ma'lumot yo'qotadi — ularni himoyalang.", "Basics"),
  c("ai", "Hallucinations & trust", "Gallyutsinatsiya va ishonch", "Why a confident AI answer can still be completely wrong.", "Nega ishonchli AI javobi baribir butunlay noto'g'ri bo'lishi mumkin.", "Concept"),
  c("ai", "Bias in security models", "Xavfsizlik modellarida noxolislik", "How biased training makes detection miss or over-flag.", "Noxolis o'qitish aniqlashni qanday o'tkazib yuboradi yoki ortiqcha belgilaydi.", "Concept"),
  c("ai", "AI for defenders", "Himoyachilar uchun AI", "Using LLMs as a SOC copilot — triage, summarise, hunt.", "LLM'ni SOC yordamchisi sifatida — triaj, xulosa, ov.", "Blue team"),
  c("ai", "Using AI safely while you learn", "O'rganayotib AI'dan xavfsiz foydalanish", "Never paste secrets or a live target's data into an assistant.", "Yordamchiga sirlar yoki jonli nishon ma'lumotini joylashtirmang.", "Guide"),

  // ---- Networks ----
  c("networks", "The OSI model", "OSI modeli", "Seven layers that explain how any network conversation works.", "Har qanday tarmoq muloqotini tushuntiruvchi yetti qatlam.", "Basics"),
  c("networks", "The TCP three-way handshake", "TCP uch-bosqichli qo'l berish", "SYN, SYN-ACK, ACK — how a reliable connection begins.", "SYN, SYN-ACK, ACK — ishonchli aloqa qanday boshlanadi.", "TCP"),
  c("networks", "Subnetting & CIDR", "Subnetlash va CIDR", "Read 192.168.1.0/24 and know exactly which hosts it covers.", "192.168.1.0/24 ni o'qib, qaysi xostlarni qamrashini biling.", "Basics"),
  c("networks", "NAT & private IPs", "NAT va shaxsiy IP'lar", "Why your home devices share one public address.", "Nega uy qurilmalaringiz bitta ommaviy manzilni bo'lishadi.", "Basics"),
  c("networks", "Ports cheat sheet", "Portlar shpargalkasi", "22, 80, 443, 3389 and the other numbers worth memorising.", "22, 80, 443, 3389 va yodlashga arziydigan boshqa raqamlar.", "Reference"),
  c("networks", "DNS deep dive", "DNS chuqur tahlil", "Records, resolvers, and how a name becomes an IP.", "Yozuvlar, resolverlar va nom qanday IP'ga aylanadi.", "DNS"),
  c("networks", "TLS & HTTPS", "TLS va HTTPS", "How the padlock actually protects your traffic.", "Qulf belgisi trafikni aslida qanday himoyalaydi.", "Crypto"),
  c("networks", "Wireshark basics", "Wireshark asoslari", "Capture and read packets to see what's really on the wire.", "Simda aslida nima borligini ko'rish uchun paketlarni o'qing.", "Tool"),
  c("networks", "nmap scanning", "nmap skanerlash", "Find open ports and services — the first step of any attack.", "Ochiq portlar va xizmatlarni toping — har hujumning birinchi qadami.", "Tool"),
  c("networks", "ARP & MITM", "ARP va MITM", "How ARP spoofing puts an attacker in the middle.", "ARP spoofing hujumchini o'rtaga qanday qo'yadi.", "Attack"),
  c("networks", "netcat: the swiss army knife", "netcat: universal vosita", "Connect, listen, transfer, and get shells with one tool.", "Bitta vosita bilan ulanish, tinglash, uzatish va shell olish.", "Tool"),
  c("networks", "Firewalls & rules", "Firewall va qoidalar", "How allow/deny rules shape what can reach a service.", "Ruxsat/rad qoidalari xizmatga nima yetishini qanday belgilaydi.", "Defense"),
  c("networks", "VPNs & tunneling", "VPN va tunellash", "Wrapping traffic in an encrypted tunnel, and why it matters.", "Trafikni shifrlangan tunelga o'rash va nega muhim.", "Concept"),
  c("networks", "Pivoting & port forwarding", "Pivoting va port forwarding", "Reaching internal hosts through a foothold machine.", "Ichki xostlarga oraliq mashina orqali yetib borish.", "Attack"),
  c("networks", "DHCP explained", "DHCP tushuntirildi", "How devices get an IP the moment they join a network.", "Qurilmalar tarmoqqa ulanishi bilan IP'ni qanday oladi.", "Basics"),
  c("networks", "ICMP, ping & traceroute", "ICMP, ping va traceroute", "The tools that tell you if — and where — a host is reachable.", "Xost yetarli yoki yo'qligini aytadigan vositalar.", "Basics"),
  c("networks", "Wi-Fi security", "Wi-Fi xavfsizligi", "WEP to WPA3 — how wireless auth got safer.", "WEP'dan WPA3'gacha — simsiz autentifikatsiya qanday xavfsizlashdi.", "Wireless"),
  c("networks", "IDS / IPS basics", "IDS / IPS asoslari", "Systems that watch traffic for attacks and block them.", "Trafikni hujumlar uchun kuzatib, bloklaydigan tizimlar.", "Defense"),
  c("networks", "Proxies & Burp", "Proxy va Burp", "Sit between browser and server to inspect every request.", "Har so'rovni ko'rish uchun brauzer va server orasida turing.", "Tool"),
  c("networks", "Packet crafting", "Paket yaratish", "Build custom packets to test how a service really responds.", "Xizmat qanday javob berishini sinash uchun maxsus paketlar tuzing.", "Advanced"),

  // ---- Walkthroughs / methodology guides ----
  c("walkthroughs", "How to approach a web challenge", "Veb topshirig'iga qanday yondashish", "A repeatable checklist: map, test inputs, read source, escalate.", "Takrorlanuvchi ro'yxat: kartani chizing, kiritmalarni sinang, kodni o'qing.", "Web"),
  c("walkthroughs", "Crypto CTF methodology", "Crypto CTF metodologiyasi", "Identify the scheme first, then reach for the right attack.", "Avval sxemani aniqlang, keyin to'g'ri hujumni tanlang.", "Crypto"),
  c("walkthroughs", "Forensics: where to look", "Forensics: qayerga qarash", "Files, metadata, memory, network captures — a search order.", "Fayllar, metadata, xotira, tarmoq — qidiruv tartibi.", "Forensics"),
  c("walkthroughs", "Linux privilege escalation", "Linux imtiyozini oshirish", "SUID, sudo, cron, capabilities — the usual paths to root.", "SUID, sudo, cron, capabilities — root'ga odatiy yo'llar.", "Privesc"),
  c("walkthroughs", "Windows privilege escalation", "Windows imtiyozini oshirish", "Services, tokens, and misconfigurations that lead to SYSTEM.", "SYSTEM'ga olib boruvchi xizmatlar, tokenlar, xatoliklar.", "Privesc"),
  c("walkthroughs", "Enumerate everything", "Hamma narsani sanab chiqing", "90% of solving is recon. What to enumerate and how.", "Yechishning 90% — razvedka. Nimani va qanday sanash.", "Recon"),
  c("walkthroughs", "Using Burp Suite", "Burp Suite'dan foydalanish", "Intercept, repeat, and tamper with HTTP requests.", "HTTP so'rovlarni ushlash, takrorlash va o'zgartirish.", "Tool"),
  c("walkthroughs", "Reversing 101", "Reversing 101", "strings, file, and a first look in Ghidra.", "strings, file va Ghidra'ga birinchi nazar.", "Reverse"),
  c("walkthroughs", "Steganography toolkit", "Steganografiya to'plami", "Where data hides in images and audio, and how to extract it.", "Ma'lumot rasm va audioda qayerda yashiradi va qanday chiqariladi.", "Stego"),
  c("walkthroughs", "OSINT methodology", "OSINT metodologiyasi", "Turning a name or photo into a full picture — ethically.", "Ism yoki rasmni to'liq manzaraga aylantirish — axloqiy.", "OSINT"),
  c("walkthroughs", "Hash identification & cracking", "Hashni aniqlash va buzish", "Recognise a hash, then use hashcat or john wisely.", "Hashni taning, keyin hashcat yoki john'dan oqilona foydalaning.", "Crypto"),
  c("walkthroughs", "SQL injection cheat sheet", "SQL injection shpargalkasi", "Payloads and steps from detection to data extraction.", "Aniqlashdan ma'lumot chiqarishgacha payloadlar va qadamlar.", "Web"),
  c("walkthroughs", "XSS testing", "XSS sinovi", "Reflected, stored, DOM — finding where input becomes script.", "Reflected, stored, DOM — kiritma qayerda skriptga aylanadi.", "Web"),
  c("walkthroughs", "Command injection", "Buyruq injeksiyasi", "When user input reaches the shell, and how to prove it.", "Kiritma shellga yetganda va buni qanday isbotlash.", "Web"),
  c("walkthroughs", "LFI & path traversal", "LFI va path traversal", "Reading files you shouldn't through a careless include.", "Ehtiyotsiz include orqali ko'rmasligingiz kerak fayllarni o'qish.", "Web"),
  c("walkthroughs", "JWT attacks", "JWT hujumlari", "alg=none, weak secrets, and other token mistakes.", "alg=none, kuchsiz sirlar va boshqa token xatolari.", "Web"),
  c("walkthroughs", "Setting up a hacking VM", "Hacking VM sozlash", "Kali or Parrot in a VM — a safe place to practise.", "VM'da Kali yoki Parrot — mashq uchun xavfsiz joy.", "Setup"),
  c("walkthroughs", "The CTF mindset", "CTF mentaliteti", "Read carefully, note everything, and never brute-force blindly.", "Diqqat bilan o'qing, hammasini yozing, ko'r-ko'rona brute qilmang.", "Mindset"),
  c("walkthroughs", "Writing a good report", "Yaxshi hisobot yozish", "Turn a solve into a clear, reproducible write-up.", "Yechimni aniq, takrorlanuvchi yechimga aylantiring.", "Skill"),
  c("walkthroughs", "Responsible disclosure", "Mas'uliyatli oshkor qilish", "Found a real bug? Report it the right, legal way.", "Haqiqiy xato topdingizmi? Uni to'g'ri, qonuniy yo'l bilan xabar qiling.", "Ethics"),
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
      `CREATE TABLE IF NOT EXISTS learn_spotlights (
         id serial PRIMARY KEY, section text NOT NULL,
         title text NOT NULL, title_uz text, title_ru text,
         description text, description_uz text, description_ru text,
         tag text, url text, starts_at timestamptz,
         order_index integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT true,
         created_at timestamptz NOT NULL DEFAULT now())`,
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

    // Spotlights — idempotent by (section, title).
    let spotAdded = 0;
    for (let si = 0; si < SPOTLIGHTS.length; si++) {
      const s = SPOTLIGHTS[si];
      const ex = await pool.query("SELECT id FROM learn_spotlights WHERE section=$1 AND title=$2 LIMIT 1", [s.section, s.title]);
      if (ex.rowCount) {
        await pool.query("UPDATE learn_spotlights SET title_uz=$2, description=$3, description_uz=$4, tag=$5, url=$6, order_index=$7 WHERE id=$1",
          [ex.rows[0].id, s.titleUz, s.description, s.descriptionUz, s.tag ?? null, s.url ?? null, si]);
      } else {
        await pool.query(
          "INSERT INTO learn_spotlights (section,title,title_uz,description,description_uz,tag,url,order_index,is_published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)",
          [s.section, s.title, s.titleUz, s.description, s.descriptionUz, s.tag ?? null, s.url ?? null, si]);
        spotAdded++;
      }
    }

    console.log(`🎉 Seed done. Modules +${modAdded}, lessons +${lessonAdded}, paths +${pathAdded}, links ${linkAdded}, spotlights +${spotAdded}.`);
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
