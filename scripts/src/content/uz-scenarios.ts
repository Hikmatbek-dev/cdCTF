/**
 * Challenges set in Uzbekistan.
 *
 * Every other CTF platform hands an Uzbek learner a challenge about a fictional
 * American bank, in English. That is the one thing cdCTF can do that TryHackMe
 * and HackTheBox structurally cannot: put the learner inside a scenario they
 * recognise — a metro Wi-Fi subnet, an .uz MX record, an nginx log from a
 * Tashkent host — and say it in their own language.
 *
 * Rules this file follows, deliberately:
 *
 *  - **Fictional organisations only.** "Chinor Telecom", "Anhor Bank",
 *    "Zarafshon Logistics" do not exist. Naming a real Uzbek company in a
 *    breach scenario would be defamatory whether or not it is true.
 *  - **No attached files.** Everything needed to solve is in the description,
 *    so the importer needs no object storage and the challenge works offline.
 *  - **The artefact is not translated.** A log excerpt, a dig output or a
 *    base64 blob is evidence; translating it would change the answer. Only the
 *    instructions around it exist in three languages — which is also what a
 *    real report looks like.
 *  - **Every flag is derivable.** No guessing, no external lookups.
 *
 * Adding a challenge: append an entry, keep `name` unique and stable — the
 * importer upserts on it — and run the import script. Nothing else to do.
 */

export type LocalChallenge = {
  /** Stable identity. The importer upserts on this, so never edit it in place. */
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  /** Must be one of the categories in artifacts/api-server/src/lib/practice-map.ts. */
  category: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  flag: string;
  hint: string;
  hintUz: string;
  hintRu: string;
  hintCost: number;
};

/** A fenced code block, so the artefact renders as evidence rather than prose. */
const block = (s: string) => "```\n" + s.trim() + "\n```";

const METRO_TASK = block(`
SSID:     Metro_Free_WiFi
Subnet:   10.44.0.0/22
Gateway:  10.44.0.1
`);

const IMEI_TASK = block(`
IMEI: 3 5 9 8 0 7 0 6 4 5 2 1 2 3 ?
`);

const ARCHIVE_TASK = block(`
Y2RDVEZ7Y2hpbm9yX3RlbGVjb21fYXJ4aXZpXzIwMjZ9
`);

const BOZOR_TASK = block(`
pqPGS{ertvfgba_obmbev_fuvsev}
`);

const HEADERS_TASK = block(`
HTTP/1.1 200 OK
Server: nginx
Date: Thu, 12 Mar 2026 09:41:22 GMT
Content-Type: text/html; charset=utf-8
X-Backend-Server: anhor-bank-app-03.internal.uz
Set-Cookie: SESSID=8f2b1c9d4e; Path=/; HttpOnly
Cache-Control: no-store
`);

const LOG_TASK = block(`
185.213.44.19 - - [12/Mar/2026:03:14:07 +0500] "GET /wp-login.php HTTP/1.1" 404 153
94.158.61.7   - - [12/Mar/2026:03:14:09 +0500] "GET / HTTP/1.1" 200 4821
185.213.44.19 - - [12/Mar/2026:03:14:11 +0500] "GET /.env HTTP/1.1" 404 153
185.213.44.19 - - [12/Mar/2026:03:14:12 +0500] "GET /admin/ HTTP/1.1" 403 162
185.213.44.19 - - [12/Mar/2026:03:14:14 +0500] "GET /backup.zip HTTP/1.1" 404 153
213.230.109.4 - - [12/Mar/2026:03:15:02 +0500] "POST /api/login HTTP/1.1" 200 312
185.213.44.19 - - [12/Mar/2026:03:15:41 +0500] "GET /..%2f..%2fetc/passwd HTTP/1.1" 400 166
185.213.44.19 - - [12/Mar/2026:03:16:03 +0500] "GET /old/config.php.bak HTTP/1.1" 200 2044
185.213.44.19 - - [12/Mar/2026:03:16:20 +0500] "GET /old/config.php.old HTTP/1.1" 404 153
`);

const MX_TASK = block(`
$ dig MX chinor-telecom.uz +short
30 mx3.chinor-telecom.uz.
10 mx1.chinor-telecom.uz.
20 mx2.chinor-telecom.uz.
`);

const STEGO_TASK = block(`
Tong osmonni sekin horitdi, keksa eman novdasi tebrandi.
`);

const PERMS_TASK = block(`
$ ls -l /opt/zarafshon/
-rwxr-x---  1 deploy  devops  4096  deploy.sh
-rw-r--r--  1 deploy  devops   812  config.yml
-rw-------  1 root    root    1024  .db_password
`);

const JWT_TASK = block(`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDQyIiwibmljayI6ImRpbHNob2QiLCJyb2xlIjoiYXVkaXRvciIsIm9yZyI6IlphcmFmc2hvbiBMb2dpc3RpY3MiLCJmbGFnIjoiY2RDVEZ7and0X3BheWxvYWRfaGVjaF9xYWNob25fbWF4Zml5X2VtYXN9IiwiaWF0IjoxNzY3MjI1NjAwfQ.Qm9zaHFhX2ltem9fYmVsZ2lzaQ
`);

const HASH_TASK = block(`
Hash (MD5): a705f38d0fee5df6dd7ef739156094be

Wordlist:
olmaliq
samarqand
chorsu2026
registon
zarafshon
navruz
bahor
toshkent
chinor
anhor
`);

export const UZ_SCENARIOS: LocalChallenge[] = [
  {
    name: "Metro Free WiFi",
    nameUz: "Metro Free WiFi",
    nameRu: "Metro Free WiFi",
    category: "Networking",
    difficulty: "easy",
    points: 100,
    description:
      `You connect to the open Wi-Fi at a Tashkent metro station and the DHCP lease comes back like this:\n\n${METRO_TASK}\n` +
      `Before scanning anything, work out the edge of the network. **What is the last usable host address in this subnet?**\n\n` +
      `Flag format: \`cdCTF{10.0.0.1}\``,
    descriptionUz:
      `Toshkent metrosi bekatidagi ochiq Wi-Fi'ga ulandingiz va DHCP quyidagini qaytardi:\n\n${METRO_TASK}\n` +
      `Skanerlashdan oldin tarmoq chegarasini aniqlang. **Bu tarmoqdagi oxirgi foydalanish mumkin bo'lgan host manzili qaysi?**\n\n` +
      `Flag formati: \`cdCTF{10.0.0.1}\``,
    descriptionRu:
      `Вы подключились к открытому Wi-Fi на станции ташкентского метро, и DHCP вернул следующее:\n\n${METRO_TASK}\n` +
      `Прежде чем что-то сканировать, определите границу сети. **Какой последний используемый адрес хоста в этой подсети?**\n\n` +
      `Формат флага: \`cdCTF{10.0.0.1}\``,
    flag: "cdCTF{10.44.3.254}",
    hint: "A /22 covers four /24 blocks. The very last address is the broadcast — you want the one before it.",
    hintUz: "/22 to'rtta /24 blokni qamrab oladi. Eng oxirgi manzil — broadcast; sizga undan oldingisi kerak.",
    hintRu: "/22 покрывает четыре блока /24. Самый последний адрес — broadcast; вам нужен предыдущий.",
    hintCost: 10,
  },
  {
    name: "The stolen handset",
    nameUz: "O'g'irlangan telefon",
    nameRu: "Украденный телефон",
    category: "Miscellaneous",
    difficulty: "easy",
    points: 100,
    description:
      `A phone is handed in at a Tashkent police station. The IMEI sticker is scratched and the final digit is unreadable:\n\n${IMEI_TASK}\n` +
      `An IMEI's last digit is a Luhn check digit, so it can be recomputed. **Submit the complete 15-digit IMEI.**\n\n` +
      `Flag format: \`cdCTF{123456789012345}\``,
    descriptionUz:
      `Toshkentdagi militsiya bo'limiga telefon topshirildi. IMEI stikeri tirnalgan, oxirgi raqam o'qilmayapti:\n\n${IMEI_TASK}\n` +
      `IMEI'ning oxirgi raqami — Luhn nazorat raqami, ya'ni uni qayta hisoblash mumkin. **To'liq 15 xonali IMEI'ni yuboring.**\n\n` +
      `Flag formati: \`cdCTF{123456789012345}\``,
    descriptionRu:
      `В отделение милиции в Ташкенте сдали телефон. Наклейка с IMEI поцарапана, последняя цифра нечитаема:\n\n${IMEI_TASK}\n` +
      `Последняя цифра IMEI — контрольная цифра Луна, её можно вычислить. **Отправьте полный 15-значный IMEI.**\n\n` +
      `Формат флага: \`cdCTF{123456789012345}\``,
    flag: "cdCTF{359807064521235}",
    hint: "Double every second digit from the left. If doubling gives more than 9, add the two digits together.",
    hintUz: "Chapdan boshlab har ikkinchi raqamni ikkilantiring. Natija 9 dan katta bo'lsa, raqamlarini qo'shing.",
    hintRu: "Удваивайте каждую вторую цифру слева. Если результат больше 9 — сложите его цифры.",
    hintCost: 10,
  },
  {
    name: "Chinor Telecom archive",
    nameUz: "Chinor Telecom arxivi",
    nameRu: "Архив Chinor Telecom",
    category: "Crypto",
    difficulty: "easy",
    points: 100,
    description:
      `A string was found in the configuration of a fictional operator, "Chinor Telecom". It is not encrypted — only encoded:\n\n${ARCHIVE_TASK}\n` +
      `**Decode it.**`,
    descriptionUz:
      `Xayoliy "Chinor Telecom" operatorining konfiguratsiyasidan quyidagi satr topildi. U shifrlangan emas — faqat kodlangan:\n\n${ARCHIVE_TASK}\n` +
      `**Uni dekodlang.**`,
    descriptionRu:
      `В конфигурации вымышленного оператора «Chinor Telecom» найдена строка. Она не зашифрована — лишь закодирована:\n\n${ARCHIVE_TASK}\n` +
      `**Раскодируйте её.**`,
    flag: "cdCTF{chinor_telecom_arxivi_2026}",
    hint: "Letters, digits, and a trailing '='-style alphabet: this is the encoding every HTTP header uses. `base64 -d`.",
    hintUz: "Harflar, raqamlar va HTTP sarlavhalarida ishlatiladigan alifbo — bu base64. `base64 -d`.",
    hintRu: "Буквы, цифры и алфавит, знакомый по HTTP-заголовкам — это base64. `base64 -d`.",
    hintCost: 10,
  },
  {
    name: "Registon bazaar cipher",
    nameUz: "Registon bozori shifri",
    nameRu: "Шифр Регистанского базара",
    category: "Crypto",
    difficulty: "easy",
    points: 100,
    description:
      `A note passed between two traders at Registon. The letters are shifted by a fixed amount:\n\n${BOZOR_TASK}\n` +
      `**Recover the original text.**`,
    descriptionUz:
      `Registondagi ikki savdogar o'rtasida yurgan xat. Harflar qat'iy miqdorga surilgan:\n\n${BOZOR_TASK}\n` +
      `**Asl matnni tiklang.**`,
    descriptionRu:
      `Записка между двумя торговцами на Регистане. Буквы сдвинуты на фиксированное число:\n\n${BOZOR_TASK}\n` +
      `**Восстановите исходный текст.**`,
    flag: "cdCTF{registon_bozori_shifri}",
    hint: "Only 25 shifts are possible — try them all. The most famous one moves each letter 13 places.",
    hintUz: "Jami 25 ta surish mumkin — hammasini sinang. Eng mashhuri har harfni 13 pozitsiyaga suradi.",
    hintRu: "Возможны всего 25 сдвигов — переберите их. Самый известный сдвигает букву на 13 позиций.",
    hintCost: 10,
  },
  {
    name: "Anhor Bank response headers",
    nameUz: "Anhor Bank javob sarlavhalari",
    nameRu: "Заголовки ответа Anhor Bank",
    category: "Recon",
    difficulty: "easy",
    points: 100,
    description:
      `During an authorised assessment of the fictional "Anhor Bank" you capture this response:\n\n${HEADERS_TASK}\n` +
      `One header leaks something that should never leave the internal network. **Which internal hostname is exposed?**\n\n` +
      `Flag format: \`cdCTF{host.internal.uz}\``,
    descriptionUz:
      `Xayoliy "Anhor Bank"ni ruxsat etilgan tekshiruv paytida quyidagi javobni oldingiz:\n\n${HEADERS_TASK}\n` +
      `Sarlavhalardan biri ichki tarmoqdan chiqmasligi kerak bo'lgan ma'lumotni oshkor qilmoqda. **Qaysi ichki host nomi ochilib qolgan?**\n\n` +
      `Flag formati: \`cdCTF{host.internal.uz}\``,
    descriptionRu:
      `В ходе авторизованной проверки вымышленного «Anhor Bank» вы получили такой ответ:\n\n${HEADERS_TASK}\n` +
      `Один из заголовков раскрывает то, что не должно покидать внутреннюю сеть. **Какое внутреннее имя хоста раскрыто?**\n\n` +
      `Формат флага: \`cdCTF{host.internal.uz}\``,
    flag: "cdCTF{anhor-bank-app-03.internal.uz}",
    hint: "Ignore Server and Set-Cookie. Look for the non-standard header — the ones a proxy adds for debugging.",
    hintUz: "Server va Set-Cookie'ni e'tiborsiz qoldiring. Nostandart sarlavhaga qarang — proksi debug uchun qo'shadiganiga.",
    hintRu: "Не смотрите на Server и Set-Cookie. Ищите нестандартный заголовок — такие добавляет прокси для отладки.",
    hintCost: 10,
  },
  {
    name: "Night traffic on the Tashkent host",
    nameUz: "Toshkentdagi serverda tungi trafik",
    nameRu: "Ночной трафик на ташкентском сервере",
    category: "Forensics",
    difficulty: "medium",
    points: 200,
    description:
      `An nginx access log from a server in Tashkent, at three in the morning:\n\n${LOG_TASK}\n` +
      `One IP is clearly scanning. Almost everything it asks for returns 404 — but not everything. ` +
      `**Which path did the scanner actually retrieve?**\n\n` +
      `Flag format: \`cdCTF{/path/to/file}\``,
    descriptionUz:
      `Toshkentdagi serverning nginx access logi, tungi soat uchda:\n\n${LOG_TASK}\n` +
      `Bitta IP aniq skanerlamoqda. U so'ragan deyarli hamma narsa 404 qaytaradi — lekin hammasi emas. ` +
      `**Skaner aslida qaysi faylni qo'lga kiritdi?**\n\n` +
      `Flag formati: \`cdCTF{/path/to/file}\``,
    descriptionRu:
      `Лог nginx с сервера в Ташкенте, три часа ночи:\n\n${LOG_TASK}\n` +
      `Один IP явно сканирует. Почти всё, что он запрашивает, отдаёт 404 — но не всё. ` +
      `**Какой путь сканер всё-таки получил?**\n\n` +
      `Формат флага: \`cdCTF{/path/to/file}\``,
    flag: "cdCTF{/old/config.php.bak}",
    hint: "Filter the scanner's lines by status code. A single 200 among the 404s is the whole story.",
    hintUz: "Skaner satrlarini status kodi bo'yicha filtrlang. 404'lar orasidagi bitta 200 — butun voqea shu.",
    hintRu: "Отфильтруйте строки сканера по коду ответа. Единственный 200 среди 404 — и есть вся история.",
    hintCost: 20,
  },
  {
    name: "Where does the mail go",
    nameUz: "Pochta qayerga boradi",
    nameRu: "Куда уходит почта",
    category: "Recon",
    difficulty: "easy",
    points: 100,
    description:
      `Mapping the mail infrastructure of a fictional .uz domain:\n\n${MX_TASK}\n` +
      `**Which server receives the mail first?**\n\n` +
      `Flag format: \`cdCTF{mx0.example.uz}\` — no trailing dot.`,
    descriptionUz:
      `Xayoliy .uz domenining pochta infratuzilmasini o'rganyapsiz:\n\n${MX_TASK}\n` +
      `**Pochta birinchi navbatda qaysi serverga tushadi?**\n\n` +
      `Flag formati: \`cdCTF{mx0.example.uz}\` — oxirida nuqta yo'q.`,
    descriptionRu:
      `Вы изучаете почтовую инфраструктуру вымышленного домена .uz:\n\n${MX_TASK}\n` +
      `**На какой сервер почта попадает в первую очередь?**\n\n` +
      `Формат флага: \`cdCTF{mx0.example.uz}\` — без точки в конце.`,
    flag: "cdCTF{mx1.chinor-telecom.uz}",
    hint: "The number before each name is a preference, not a rank — and in MX records lower wins.",
    hintUz: "Har bir nom oldidagi raqam — ustuvorlik, tartib emas. MX yozuvlarida kichigi ustun turadi.",
    hintRu: "Число перед именем — приоритет, а не порядок. В MX-записях побеждает меньшее.",
    hintCost: 10,
  },
  {
    name: "A line of poetry",
    nameUz: "Bir satr she'r",
    nameRu: "Строка стихотворения",
    category: "Steganography",
    difficulty: "easy",
    points: 100,
    description:
      `A single line was left in the footer of a leaked document. Nothing is encrypted; something is simply hidden in plain sight:\n\n${STEGO_TASK}\n` +
      `**Read the hidden word and submit it in capitals.**\n\n` +
      `Flag format: \`cdCTF{WORD}\``,
    descriptionUz:
      `Sizib chiqqan hujjatning pastki qismida bitta satr qolgan. Hech nima shifrlanmagan — shunchaki ko'z oldida yashiringan:\n\n${STEGO_TASK}\n` +
      `**Yashirin so'zni o'qing va bosh harflarda yuboring.**\n\n` +
      `Flag formati: \`cdCTF{SO'Z}\``,
    descriptionRu:
      `В нижней части утёкшего документа осталась одна строка. Ничего не зашифровано — просто спрятано на виду:\n\n${STEGO_TASK}\n` +
      `**Прочитайте скрытое слово и отправьте его заглавными буквами.**\n\n` +
      `Формат флага: \`cdCTF{СЛОВО}\``,
    flag: "cdCTF{TOSHKENT}",
    hint: "Do not read the sentence. Read only the first letter of each word, in order.",
    hintUz: "Gapni o'qimang. Faqat har bir so'zning birinchi harfini, tartib bilan o'qing.",
    hintRu: "Не читайте предложение. Читайте только первую букву каждого слова по порядку.",
    hintCost: 10,
  },
  {
    name: "Zarafshon Logistics deploy directory",
    nameUz: "Zarafshon Logistics deploy katalogi",
    nameRu: "Каталог деплоя Zarafshon Logistics",
    category: "Scripting",
    difficulty: "easy",
    points: 100,
    description:
      `A listing from a production server of the fictional "Zarafshon Logistics":\n\n${PERMS_TASK}\n` +
      `**Give the octal permissions of \`deploy.sh\` and \`.db_password\`, in that order.**\n\n` +
      `Flag format: \`cdCTF{777_666}\``,
    descriptionUz:
      `Xayoliy "Zarafshon Logistics" ishlab chiqarish serveridagi ro'yxat:\n\n${PERMS_TASK}\n` +
      `**\`deploy.sh\` va \`.db_password\` fayllarining sakkizlik ruxsatlarini shu tartibda yozing.**\n\n` +
      `Flag formati: \`cdCTF{777_666}\``,
    descriptionRu:
      `Листинг с рабочего сервера вымышленной «Zarafshon Logistics»:\n\n${PERMS_TASK}\n` +
      `**Укажите восьмеричные права \`deploy.sh\` и \`.db_password\` именно в этом порядке.**\n\n` +
      `Формат флага: \`cdCTF{777_666}\``,
    flag: "cdCTF{750_600}",
    hint: "r=4, w=2, x=1. Add them per triple: owner, group, others.",
    hintUz: "r=4, w=2, x=1. Har uchlik uchun qo'shing: egasi, guruh, boshqalar.",
    hintRu: "r=4, w=2, x=1. Складывайте по тройкам: владелец, группа, остальные.",
    hintCost: 10,
  },
  {
    name: "The auditor's token",
    nameUz: "Auditor tokeni",
    nameRu: "Токен аудитора",
    category: "Web",
    difficulty: "medium",
    points: 200,
    description:
      `A session token captured from a fictional logistics portal:\n\n${JWT_TASK}\n` +
      `Its signature cannot be forged without the key — but the signature is not what is being asked. ` +
      `**Read the token's payload.**`,
    descriptionUz:
      `Xayoliy logistika portalidan olingan sessiya tokeni:\n\n${JWT_TASK}\n` +
      `Uning imzosini kalitsiz soxtalashtirib bo'lmaydi — lekin bu yerda imzo so'ralmayapti. ` +
      `**Tokenning payload qismini o'qing.**`,
    descriptionRu:
      `Токен сессии, перехваченный на вымышленном логистическом портале:\n\n${JWT_TASK}\n` +
      `Подпись без ключа не подделать — но её и не спрашивают. ` +
      `**Прочитайте payload токена.**`,
    flag: "cdCTF{jwt_payload_hech_qachon_maxfiy_emas}",
    hint: "A JWT is three base64url parts split by dots. The middle one is not encrypted — decode it.",
    hintUz: "JWT — nuqta bilan ajratilgan uchta base64url qism. O'rtadagisi shifrlanmagan — dekodlang.",
    hintRu: "JWT — три base64url-части, разделённые точками. Средняя не зашифрована — раскодируйте её.",
    hintCost: 20,
  },
  {
    name: "One hash, ten words",
    nameUz: "Bitta hash, o'nta so'z",
    nameRu: "Один хеш, десять слов",
    category: "Crypto",
    difficulty: "medium",
    points: 200,
    description:
      `A password hash pulled from a dump, and the ten candidates a colleague thinks it could be:\n\n${HASH_TASK}\n` +
      `**Which word produces this hash?** Submit the word itself.\n\n` +
      `Flag format: \`cdCTF{word}\``,
    descriptionUz:
      `Dumpdan olingan parol hashi va hamkasbingiz taxmin qilgan o'nta nomzod:\n\n${HASH_TASK}\n` +
      `**Qaysi so'z shu hashni beradi?** So'zning o'zini yuboring.\n\n` +
      `Flag formati: \`cdCTF{so'z}\``,
    descriptionRu:
      `Хеш пароля из дампа и десять кандидатов, которые предложил коллега:\n\n${HASH_TASK}\n` +
      `**Какое слово даёт этот хеш?** Отправьте само слово.\n\n` +
      `Формат флага: \`cdCTF{слово}\``,
    flag: "cdCTF{chorsu2026}",
    hint: "Ten candidates is ten hashes. `echo -n word | md5sum` — no cracking tool needed.",
    hintUz: "O'nta nomzod — o'nta hash. `echo -n so'z | md5sum` — hech qanday crack dasturi kerak emas.",
    hintRu: "Десять кандидатов — десять хешей. `echo -n слово | md5sum` — никакой утилиты не нужно.",
    hintCost: 20,
  },
];
