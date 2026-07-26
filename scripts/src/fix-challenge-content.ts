/**
 * Give the imported challenges the instructions they never had.
 *
 * A live audit found 35 of 97 published challenges whose description was just
 * the title repeated — "DTMF" described as "DTMF", "PDF" as "PDF", "ROT" as
 * "ROT". Every one has a file attached, so they were all solvable; the learner
 * simply had nothing telling them what to do. None of the 97 had a hint, and
 * the junk-description ones had no Uzbek or Russian text either.
 *
 * This writes, for each challenge matched by name:
 *   - a real task description in English, Uzbek and Russian
 *   - a hint in all three (the hint system is now wired up and charges points)
 *   - a corrected category where the original was a junk drawer
 *
 * Deliberately conservative: the text describes the technique the title names
 * and the file that is attached. It never claims a specific flag, filename or
 * value, because those were not verifiable from outside the database.
 *
 * Idempotent — matches on name, and only fills the fields listed here.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts run fix-content
 *         DATABASE_URL=... pnpm --filter ./scripts run fix-content -- --dry-run
 */
import { Pool } from "pg";

type Fix = {
  name: string;
  /** Set when the original category was "Others"/"Miscellaneous" — a junk drawer. */
  category?: string;
  description: string; descriptionUz: string; descriptionRu: string;
  hint: string; hintUz: string; hintRu: string;
};

/** A decoding challenge: same shape of task, different encoding. */
function decode(name: string, enc: string, encUz: string, encRu: string, hint: string, hintUz: string, hintRu: string, category?: string): Fix {
  return {
    name, category,
    description: `The attached file holds the flag ${enc}. Decode it back to readable text and submit the flag.`,
    descriptionUz: `Biriktirilgan faylda flag ${encUz} saqlangan. Uni o'qiladigan matnga qaytaring va flagni topshiring.`,
    descriptionRu: `В приложенном файле флаг ${encRu}. Расшифруйте его в читаемый текст и отправьте флаг.`,
    hint, hintUz, hintRu,
  };
}

const FIXES: Fix[] = [
  // ── Crypto: encodings ────────────────────────────────────────────────────
  decode("Base64", "encoded with Base64", "Base64 bilan kodlangan", "закодирован в Base64",
    "Any Base64 decoder works — CyberChef, or `base64 -d` in a terminal.",
    "Istalgan Base64 dekoder ishlaydi — CyberChef yoki terminalda `base64 -d`.",
    "Подойдёт любой декодер Base64 — CyberChef или `base64 -d` в терминале."),
  decode("Base32", "encoded with Base32", "Base32 bilan kodlangan", "закодирован в Base32",
    "Base32 uses A–Z and 2–7, and often ends in '=' padding. CyberChef decodes it.",
    "Base32 A–Z va 2–7 belgilaridan iborat, oxirida ko'pincha '=' bo'ladi. CyberChef dekodlaydi.",
    "Base32 использует A–Z и 2–7, часто с '=' в конце. CyberChef его декодирует."),
  decode("Binary", "written as binary", "ikkilik sanoq sistemasida yozilgan", "записан в двоичном виде",
    "Each group of 8 bits is one character. Convert binary → ASCII.",
    "Har 8 bit — bitta belgi. Ikkilikdan ASCII'ga o'giring.",
    "Каждые 8 бит — один символ. Переведите двоичное в ASCII."),
  decode("Decimal", "written as decimal character codes", "o'nlik belgi kodlarida yozilgan", "записан десятичными кодами символов",
    "Each number is one character's ASCII code — 72 is 'H'.",
    "Har bir son — belgining ASCII kodi: 72 = 'H'.",
    "Каждое число — ASCII-код символа: 72 = 'H'."),
  decode("Hexadecimal", "written as hexadecimal", "o'n oltilik sanoqda yozilgan", "записан в шестнадцатеричном виде",
    "Two hex digits make one byte — 0x41 is 'A'. Try `xxd -r -p`.",
    "Ikki hex raqam — bitta bayt: 0x41 = 'A'. `xxd -r -p` ni sinab ko'ring.",
    "Две hex-цифры — один байт: 0x41 = 'A'. Попробуйте `xxd -r -p`."),
  decode("Octal", "written as octal character codes", "sakkizlik kodlarda yozilgan", "записан восьмеричными кодами",
    "Base 8: each value converts to a character code. 110 (octal) is 'H'.",
    "Asos 8: har bir qiymat belgi kodiga aylanadi. 110 (sakkizlik) = 'H'.",
    "Основание 8: каждое значение — код символа. 110 (вось.) = 'H'."),
  decode("UTF-8", "encoded as UTF-8 code points", "UTF-8 kod nuqtalarida kodlangan", "закодирован в кодовых точках UTF-8",
    "Map each code point back to its character; CyberChef's 'From Decimal' helps.",
    "Har bir kod nuqtasini belgiga qaytaring; CyberChef'dagi 'From Decimal' yordam beradi.",
    "Верните каждую кодовую точку в символ; поможет 'From Decimal' в CyberChef.", "Crypto"),
  decode("UTF-16", "encoded as UTF-16", "UTF-16 da kodlangan", "закодирован в UTF-16",
    "UTF-16 stores two bytes per character — watch the byte order (BOM).",
    "UTF-16 har belgiga ikki bayt ajratadi — bayt tartibiga (BOM) e'tibor bering.",
    "UTF-16 хранит два байта на символ — следите за порядком байт (BOM).", "Crypto"),
  decode("UTF-32", "encoded as UTF-32", "UTF-32 da kodlangan", "закодирован в UTF-32",
    "Four bytes per character, so most of them are zeros. Strip them and read the rest.",
    "Har belgiga to'rt bayt, shuning uchun ko'pi nol. Nollarni olib tashlang va qolganini o'qing.",
    "Четыре байта на символ, поэтому много нулей. Уберите их и читайте остальное.", "Crypto"),
  decode("Morse", "written in Morse code", "Morze kodida yozilgan", "записан азбукой Морзе",
    "Dots and dashes: '.-' is A, '-...' is B. Any Morse decoder will do.",
    "Nuqta va chiziq: '.-' = A, '-...' = B. Istalgan Morze dekoder yaraydi.",
    "Точки и тире: '.-' = A, '-...' = B. Подойдёт любой декодер Морзе."),
  decode("Roman Numerals", "written in Roman numerals", "Rim raqamlarida yozilgan", "записан римскими цифрами",
    "Convert each numeral to a number, then read those numbers as character codes.",
    "Har bir raqamni songa o'giring, so'ng sonlarni belgi kodlari sifatida o'qing.",
    "Переведите каждую цифру в число, затем читайте числа как коды символов."),

  // ── Crypto: classical ciphers ────────────────────────────────────────────
  {
    name: "Caesar Cipher",
    description: "The flag is enciphered with a Caesar shift — every letter moved the same number of places along the alphabet. Find the shift and recover the flag.",
    descriptionUz: "Flag Sezar shifri bilan yopilgan — har bir harf alifbo bo'ylab bir xil qadamga surilgan. Surilishni toping va flagni tiklang.",
    descriptionRu: "Флаг зашифрован шифром Цезаря — каждая буква сдвинута на одно и то же число позиций. Найдите сдвиг и восстановите флаг.",
    hint: "There are only 25 shifts. Try them all — the one that spells 'flag' is right.",
    hintUz: "Jami 25 ta surilish bor. Hammasini sinab ko'ring — 'flag' chiqqani to'g'ri.",
    hintRu: "Всего 25 сдвигов. Переберите их — верный тот, где читается 'flag'.",
  },
  {
    name: "ROT",
    description: "A rotation cipher hides the flag: the alphabet is rotated by a fixed amount (ROT13 is the classic). Rotate it back.",
    descriptionUz: "Flag rotatsiya shifri ostida: alifbo qat'iy miqdorga aylantirilgan (ROT13 — klassikasi). Orqaga aylantiring.",
    descriptionRu: "Флаг скрыт шифром вращения: алфавит повёрнут на фиксированное число (классика — ROT13). Поверните обратно.",
    hint: "Start with ROT13; if that is not readable, walk through the other rotations.",
    hintUz: "ROT13 dan boshlang; o'qilmasa, boshqa aylanishlarni ketma-ket sinang.",
    hintRu: "Начните с ROT13; если нечитаемо — переберите остальные повороты.",
  },
  {
    name: "Atbash Cipher",
    description: "Atbash mirrors the alphabet — A becomes Z, B becomes Y. Reverse the mapping to read the flag.",
    descriptionUz: "Atbash alifboni ko'zguga soladi — A→Z, B→Y. Moslikni teskarisiga qaytarib flagni o'qing.",
    descriptionRu: "Atbash зеркалит алфавит — A становится Z, B становится Y. Разверните соответствие и прочитайте флаг.",
    hint: "Atbash is its own inverse: applying it a second time gives the plaintext back.",
    hintUz: "Atbash o'ziga teskari: ikkinchi marta qo'llasangiz asl matn chiqadi.",
    hintRu: "Atbash обратен сам себе: примените его второй раз — получите исходный текст.",
  },
  {
    name: "Vigenere Cipher",
    description: "A Vigenère cipher shifts each letter by a repeating keyword. Recover the keyword — or break it statistically — and decrypt the flag.",
    descriptionUz: "Vigenère shifri har bir harfni takrorlanuvchi kalit so'z bo'yicha suradi. Kalitni toping — yoki statistik yo'l bilan buzing — va flagni oching.",
    descriptionRu: "Шифр Виженера сдвигает каждую букву по повторяющемуся ключевому слову. Найдите ключ — или взломайте статистически — и расшифруйте флаг.",
    hint: "Guess the key length first (Kasiski or index of coincidence), then solve each position as a Caesar shift.",
    hintUz: "Avval kalit uzunligini toping (Kasiski yoki mos kelish indeksi), so'ng har bir o'rinni Sezar shifri kabi yeching.",
    hintRu: "Сначала определите длину ключа (Касиски или индекс совпадений), затем решайте каждую позицию как шифр Цезаря.",
  },
  {
    name: "XOR",
    description: "The flag was XORed with a key. Work out the key — a known part of the plaintext is usually enough — and XOR it back.",
    descriptionUz: "Flag kalit bilan XOR qilingan. Kalitni aniqlang — odatda ochiq matnning ma'lum qismi yetarli — va qayta XOR qiling.",
    descriptionRu: "Флаг был сложен по XOR с ключом. Определите ключ — обычно хватает известной части открытого текста — и примените XOR обратно.",
    hint: "You know the plaintext starts with the flag prefix. XOR that against the ciphertext to expose the key.",
    hintUz: "Ochiq matn flag prefiksi bilan boshlanishini bilasiz. Uni shifrmatn bilan XOR qilsangiz, kalit ochiladi.",
    hintRu: "Вы знаете, что текст начинается с префикса флага. Сложите его по XOR с шифротекстом — так проявится ключ.",
  },
  {
    name: "AES",
    description: "The flag is encrypted with AES. Find the key and mode used, then decrypt the file.",
    descriptionUz: "Flag AES bilan shifrlangan. Ishlatilgan kalit va rejimni toping, so'ng faylni deshifrlang.",
    descriptionRu: "Флаг зашифрован AES. Определите ключ и режим, затем расшифруйте файл.",
    hint: "Check the file for the key material and the mode (ECB and CBC behave very differently); CyberChef's AES Decrypt takes it from there.",
    hintUz: "Faylda kalit va rejimni qidiring (ECB va CBC juda farq qiladi); keyin CyberChef'ning AES Decrypt'i ishni bajaradi.",
    hintRu: "Поищите в файле ключ и режим (ECB и CBC ведут себя по-разному); дальше поможет AES Decrypt в CyberChef.",
  },
  {
    name: "Qwerty",
    category: "Crypto",
    description: "The text was typed on a shifted keyboard layout — each character stands for a neighbouring key. Map it back to what the typist meant.",
    descriptionUz: "Matn surilgan klaviatura joylashuvida terilgan — har bir belgi qo'shni tugmani anglatadi. Uni asl holiga qaytaring.",
    descriptionRu: "Текст набран со смещением по клавиатуре — каждый символ означает соседнюю клавишу. Восстановите исходный набор.",
    hint: "Lay a QWERTY keyboard next to the text and shift each character one key left or right.",
    hintUz: "QWERTY klaviaturani matn yoniga qo'ying va har bir belgini bir tugma chapga yoki o'ngga suring.",
    hintRu: "Положите рядом раскладку QWERTY и сдвиньте каждый символ на клавишу влево или вправо.",
  },
  {
    name: "Signal",
    description: "A recorded signal carries the flag. Inspect the waveform and its spectrogram to read what was transmitted.",
    descriptionUz: "Yozib olingan signalda flag bor. To'lqin shakli va spektrogrammani tekshirib, uzatilgan ma'lumotni o'qing.",
    descriptionRu: "В записанном сигнале скрыт флаг. Изучите форму волны и спектрограмму, чтобы прочитать переданное.",
    hint: "Open it in Audacity or Sonic Visualiser and switch to spectrogram view — signals often spell the flag there.",
    hintUz: "Audacity yoki Sonic Visualiser'da oching va spektrogramma ko'rinishiga o'ting — signal ko'pincha flagni o'sha yerda yozadi.",
    hintRu: "Откройте в Audacity или Sonic Visualiser и включите спектрограмму — сигнал часто «рисует» флаг именно там.",
  },

  // ── Forensics ────────────────────────────────────────────────────────────
  {
    name: "Strings",
    description: "The flag sits in plain text inside a binary file. Pull the readable strings out of it and find the flag among them.",
    descriptionUz: "Flag ikkilik fayl ichida ochiq matn holida yotibdi. Fayldan o'qiladigan satrlarni ajratib oling va orasidan flagni toping.",
    descriptionRu: "Флаг лежит открытым текстом внутри бинарного файла. Извлеките из него читаемые строки и найдите флаг.",
    hint: "`strings file | grep -i flag` gets you there in one command.",
    hintUz: "`strings fayl | grep -i flag` — bitta buyruq bilan topasiz.",
    hintRu: "`strings файл | grep -i flag` — одна команда и готово.",
  },
  {
    name: "Binwalk",
    description: "Something is embedded inside this file. Scan it for hidden file signatures, extract what you find, and recover the flag.",
    descriptionUz: "Bu fayl ichiga boshqa narsa joylangan. Yashirin fayl imzolarini skanerlang, topilganini ajratib oling va flagni tiklang.",
    descriptionRu: "Внутри этого файла что-то спрятано. Просканируйте его на сигнатуры вложенных файлов, извлеките найденное и получите флаг.",
    hint: "`binwalk -e file` lists the embedded signatures and extracts them.",
    hintUz: "`binwalk -e fayl` joylangan imzolarni ko'rsatadi va ajratib oladi.",
    hintRu: "`binwalk -e файл` покажет вложенные сигнатуры и извлечёт их.",
  },
  {
    name: "DTMF",
    description: "The recording holds the tones a telephone keypad makes. Decode the dialled digits — they spell out what you need.",
    descriptionUz: "Yozuvda telefon klaviaturasi chiqaradigan tovushlar bor. Terilgan raqamlarni dekodlang — kerakli narsa o'shalarda.",
    descriptionRu: "В записи — тоны телефонной клавиатуры. Декодируйте набранные цифры: в них то, что нужно.",
    hint: "DTMF encodes each key as two simultaneous frequencies. A DTMF decoder (or a spectrogram plus a frequency table) reads them off.",
    hintUz: "DTMF har bir tugmani ikkita bir vaqtli chastota bilan kodlaydi. DTMF dekoder (yoki spektrogramma + chastota jadvali) ularni o'qiydi.",
    hintRu: "DTMF кодирует каждую клавишу двумя одновременными частотами. Декодер DTMF (или спектрограмма и таблица частот) их прочитает.",
  },
  {
    name: "Strange",
    description: "This file looks ordinary but carries hidden data. Work through the usual steganography checks until the flag surfaces.",
    descriptionUz: "Fayl oddiy ko'rinadi, lekin ichida yashirin ma'lumot bor. Odatiy steganografiya tekshiruvlarini ketma-ket bajaring — flag chiqadi.",
    descriptionRu: "Файл выглядит обычным, но несёт скрытые данные. Пройдите стандартные проверки стеганографии, пока не проявится флаг.",
    hint: "Try, in order: metadata (exiftool), embedded files (binwalk), bit planes (zsteg/stegsolve), then a password-protected payload (steghide).",
    hintUz: "Tartib bilan sinang: metama'lumot (exiftool), joylangan fayllar (binwalk), bit tekisliklari (zsteg/stegsolve), so'ng parolli yuk (steghide).",
    hintRu: "Пробуйте по порядку: метаданные (exiftool), вложенные файлы (binwalk), битовые плоскости (zsteg/stegsolve), затем защищённые данные (steghide).",
  },

  // ── Networking ───────────────────────────────────────────────────────────
  {
    name: "Handshake",
    description: "A captured wireless handshake is attached. Crack the passphrase from it — that passphrase is what you submit.",
    descriptionUz: "Biriktirilgan faylda simsiz tarmoq handshake'i yozib olingan. Undan parolni buzing — o'sha parolni topshirasiz.",
    descriptionRu: "Приложен перехваченный рукопожатие Wi-Fi. Взломайте из него пароль — его и нужно отправить.",
    hint: "aircrack-ng or hashcat with a wordlist like rockyou will run the handshake against candidate passwords.",
    hintUz: "aircrack-ng yoki hashcat'ni rockyou kabi lug'at bilan ishlatib, handshake'ni parollarga solishtiring.",
    hintRu: "aircrack-ng или hashcat со словарём вроде rockyou проверят рукопожатие по кандидатам паролей.",
  },

  // ── Archives and documents: were "Others", a junk drawer ─────────────────
  {
    name: "ZIP", category: "Forensics",
    description: "The flag is inside a ZIP archive that will not simply open. Get past the protection and read what is stored in it.",
    descriptionUz: "Flag oddiy ochilmaydigan ZIP arxiv ichida. Himoyani chetlab o'ting va ichidagini o'qing.",
    descriptionRu: "Флаг внутри ZIP-архива, который просто так не открыть. Обойдите защиту и прочитайте содержимое.",
    hint: "zip2john turns the archive into a hash john or hashcat can attack with a wordlist.",
    hintUz: "zip2john arxivni hash'ga aylantiradi — uni john yoki hashcat lug'at bilan buzadi.",
    hintRu: "zip2john превратит архив в хеш, который john или hashcat вскроют по словарю.",
  },
  {
    name: "RAR", category: "Forensics",
    description: "A RAR archive holds the flag behind a password. Recover the password, open the archive, and take the flag.",
    descriptionUz: "RAR arxivda flag parol ostida. Parolni tiklang, arxivni oching va flagni oling.",
    descriptionRu: "RAR-архив хранит флаг под паролем. Восстановите пароль, откройте архив и заберите флаг.",
    hint: "rar2john extracts the hash; feed it to john with a wordlist such as rockyou.",
    hintUz: "rar2john hash'ni ajratadi; uni rockyou kabi lug'at bilan john'ga bering.",
    hintRu: "rar2john извлечёт хеш; передайте его john со словарём вроде rockyou.",
  },
  {
    name: "7z", category: "Forensics",
    description: "A 7z archive stands between you and the flag. Break the password and extract its contents.",
    descriptionUz: "Siz bilan flag orasida 7z arxiv turibdi. Parolni buzing va ichidagini ajratib oling.",
    descriptionRu: "Между вами и флагом — архив 7z. Взломайте пароль и извлеките содержимое.",
    hint: "7z2john produces the hash; john or hashcat does the rest.",
    hintUz: "7z2john hash chiqaradi; qolganini john yoki hashcat bajaradi.",
    hintRu: "7z2john выдаст хеш; остальное сделают john или hashcat.",
  },
  {
    name: "PDF", category: "Forensics",
    description: "The flag is hidden in a PDF — not necessarily in the text you can see. Examine the document properly and find it.",
    descriptionUz: "Flag PDF ichida yashiringan — ko'rinib turgan matnda bo'lishi shart emas. Hujjatni sinchiklab tekshiring va toping.",
    descriptionRu: "Флаг спрятан в PDF — не обязательно в видимом тексте. Изучите документ внимательно и найдите его.",
    hint: "Look past the rendered page: metadata (exiftool), raw objects and streams (pdftotext, peepdf, or strings).",
    hintUz: "Ko'rinadigan sahifadan nariga qarang: metama'lumot (exiftool), xom obyektlar va oqimlar (pdftotext, peepdf yoki strings).",
    hintRu: "Смотрите не только на страницу: метаданные (exiftool), сырые объекты и потоки (pdftotext, peepdf или strings).",
  },
  {
    name: "Word", category: "Forensics",
    description: "A Word document carries the flag. Modern .docx files are ZIP containers — look inside rather than only at the page.",
    descriptionUz: "Word hujjatida flag bor. Zamonaviy .docx fayllar — ZIP konteyner; faqat sahifaga emas, ichiga ham qarang.",
    descriptionRu: "Флаг несёт документ Word. Современные .docx — это ZIP-контейнеры: смотрите внутрь, а не только на страницу.",
    hint: "Rename it to .zip and unpack it, then grep the XML parts (and check document metadata).",
    hintUz: "Nomini .zip ga o'zgartirib oching, so'ng XML qismlarini grep qiling (metama'lumotni ham tekshiring).",
    hintRu: "Переименуйте в .zip и распакуйте, затем grep по XML-частям (и проверьте метаданные).",
  },
  {
    name: "Excel", category: "Forensics",
    description: "A spreadsheet holds the flag. It may be in a hidden sheet, a formula, or the file's internal parts rather than a visible cell.",
    descriptionUz: "Jadval faylida flag bor. U yashirin varaqda, formulada yoki faylning ichki qismlarida bo'lishi mumkin — ko'rinadigan katakda emas.",
    descriptionRu: "Флаг в таблице. Он может быть на скрытом листе, в формуле или во внутренних частях файла, а не в видимой ячейке.",
    hint: "Unhide every sheet, check formulas and defined names — or unpack the .xlsx as a ZIP and read the XML.",
    hintUz: "Barcha varaqlarni ko'rsating, formulalar va nomlarni tekshiring — yoki .xlsx ni ZIP sifatida ochib XML'ni o'qing.",
    hintRu: "Покажите все листы, проверьте формулы и имена — или распакуйте .xlsx как ZIP и читайте XML.",
  },
  {
    name: "PowerPoint", category: "Forensics",
    description: "The flag is in a presentation. Slides can hide things off-canvas, behind images, or in speaker notes and the file's XML.",
    descriptionUz: "Flag taqdimot ichida. Slaydlar narsalarni ekran tashqarisida, rasm ortida, ma'ruzachi izohlarida yoki fayl XML'ida yashirishi mumkin.",
    descriptionRu: "Флаг в презентации. Слайды могут прятать данные за пределами полотна, под картинками, в заметках и в XML файла.",
    hint: "Unpack the .pptx as a ZIP and grep the slide XML — that catches hidden and off-slide content too.",
    hintUz: "'.pptx' ni ZIP sifatida oching va slayd XML'ini grep qiling — yashirin va slayddan tashqari kontent ham chiqadi.",
    hintRu: "Распакуйте .pptx как ZIP и сделайте grep по XML слайдов — так найдётся и скрытое содержимое.",
  },

  // ── Web ──────────────────────────────────────────────────────────────────
  {
    name: "HTML",
    description: "The page shows you nothing useful, but its source does. Read the HTML behind it and find the flag.",
    descriptionUz: "Sahifa o'zi hech nima ko'rsatmaydi, lekin uning manba kodi ko'rsatadi. Ortidagi HTML'ni o'qing va flagni toping.",
    descriptionRu: "Страница не показывает ничего полезного, а её исходник — показывает. Прочитайте HTML и найдите флаг.",
    hint: "View source (Ctrl+U) and read the comments — that is where things get left behind.",
    hintUz: "Manba kodini oching (Ctrl+U) va izohlarni o'qing — narsalar odatda o'sha yerda qoladi.",
    hintRu: "Откройте исходный код (Ctrl+U) и читайте комментарии — там обычно всё и остаётся.",
  },
  {
    name: "Java Script",
    description: "The flag is produced by the page's JavaScript rather than written in the HTML. Read the script and work out what it builds.",
    descriptionUz: "Flag HTML'da yozilmagan — uni sahifaning JavaScript kodi hosil qiladi. Skriptni o'qing va u nima quraayotganini aniqlang.",
    descriptionRu: "Флаг не записан в HTML — его собирает JavaScript страницы. Прочитайте скрипт и разберитесь, что он формирует.",
    hint: "Open DevTools, find the script, and either follow the logic or run the relevant part in the console.",
    hintUz: "DevTools'ni oching, skriptni toping va mantiqni kuzating yoki kerakli qismini konsolda ishga tushiring.",
    hintRu: "Откройте DevTools, найдите скрипт и либо проследите логику, либо выполните нужную часть в консоли.",
  },

  // ── Miscellaneous: genuinely open-ended searches ─────────────────────────
  {
    name: "Find Flag",
    description: "The flag is somewhere in the attached file. Nothing tells you where — search it methodically until you turn it up.",
    descriptionUz: "Flag biriktirilgan fayl ichida biror joyda. Qayerdaligini hech narsa aytmaydi — uni tizimli qidirib toping.",
    descriptionRu: "Флаг где-то в приложенном файле. Никаких подсказок о месте — ищите методично, пока не найдёте.",
    hint: "Work outward: strings and grep first, then metadata, then embedded files (binwalk).",
    hintUz: "Bosqichma-bosqich: avval strings va grep, so'ng metama'lumot, keyin joylangan fayllar (binwalk).",
    hintRu: "По шагам: сначала strings и grep, затем метаданные, потом вложенные файлы (binwalk).",
  },
  {
    name: "Where is Flag",
    description: "This file is hiding the flag well. Go through the standard analysis steps until something gives it away.",
    descriptionUz: "Bu fayl flagni yaxshi yashirgan. Standart tahlil bosqichlarini birma-bir bajaring — biror narsa uni fosh qiladi.",
    descriptionRu: "Этот файл прячет флаг надёжно. Пройдите стандартные шаги анализа, пока что-нибудь его не выдаст.",
    hint: "Confirm the real file type first (`file`), because the extension may be lying to you.",
    hintUz: "Avval faylning haqiqiy turini aniqlang (`file`), chunki kengaytma sizni chalg'itayotgan bo'lishi mumkin.",
    hintRu: "Сначала определите настоящий тип файла (`file`) — расширение может обманывать.",
  },
];

// ── runner ─────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");
const pool = new Pool({ connectionString });

async function main() {
  let updated = 0, missing = 0, recategorised = 0;

  for (const fix of FIXES) {
    const found = await pool.query(
      "SELECT id, category FROM ctf_tasks WHERE lower(name) = lower($1)",
      [fix.name],
    );
    if (found.rowCount === 0) {
      console.warn(`  ? not found: ${fix.name}`);
      missing++;
      continue;
    }
    for (const row of found.rows) {
      const category = fix.category ?? row.category;
      if (fix.category && fix.category !== row.category) recategorised++;
      if (!dryRun) {
        await pool.query(
          `UPDATE ctf_tasks SET
             description = $2, description_uz = $3, description_ru = $4,
             hint = $5, hint_uz = $6, hint_ru = $7, category = $8
           WHERE id = $1`,
          [row.id, fix.description, fix.descriptionUz, fix.descriptionRu,
            fix.hint, fix.hintUz, fix.hintRu, category],
        );
      }
      updated++;
    }
  }

  console.log(`\n${dryRun ? "[dry run] would update" : "Updated"} ${updated} challenge(s).`);
  if (recategorised) console.log(`  ${recategorised} moved out of a junk-drawer category.`);
  if (missing) console.log(`  ${missing} name(s) in this file matched nothing — check them.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => { console.error(err); await pool.end(); process.exit(1); });
