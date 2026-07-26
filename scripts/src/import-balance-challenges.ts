/**
 * Twenty new challenges, added to fix a lopsided catalogue.
 *
 * A live audit of the 97 published challenges found Crypto at 29 and the
 * hands-on categories starved — Web 6, Pwn 5, Reverse 4, Scripting 2 — with
 * only 27 rated easy, which is thin for the beginners this platform is for.
 * These twenty are weighted the other way: Web 8, Reverse 4, Scripting 4,
 * Pwn 2, Networking 2, and 11 of them easy.
 *
 * Every challenge is self-contained — the data lives in the description, so
 * there is no file to host and no target to keep running — and every one was
 * round-trip verified by the generator: the described solve path was executed
 * and had to return the flag before the challenge was emitted here.
 *
 * Flags are stored pre-hashed, exactly as the server writes them (sha256 of the
 * normalised flag), so this file never contains a plaintext answer.
 *
 * Idempotent: skips any challenge whose name already exists.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts run import-balance
 */
import { Pool } from "pg";

type Challenge = {
  name: string; nameUz: string; nameRu: string;
  category: string; difficulty: string; points: number;
  description: string; descriptionUz: string; descriptionRu: string;
  hint: string; hintUz: string; hintRu: string;
  flagHash: string;
};

const CHALLENGES: Challenge[] = [
  {
    "name": "Left in the Markup",
    "nameUz": "Kodda qolib ketgan",
    "nameRu": "Забыто в разметке",
    "category": "Web",
    "difficulty": "easy",
    "points": 100,
    "description": "Someone shipped the page with a note still in it.\n\n```html\n<div class=\"login\">\n  <form action=\"/auth\" method=\"post\">\n    <input name=\"user\"><input name=\"pass\" type=\"password\">\n  </form>\n  <!-- TODO: remove before launch — staging key flag%7B47e9f7d4dbaf1104ecdb94919e1c0e3f%7D -->\n</div>\n```\n\nThe value is URL-encoded.",
    "descriptionUz": "Kimdir sahifani izoh bilan birga chiqarib yuborgan.\n\n```html\n<div class=\"login\">\n  <form action=\"/auth\" method=\"post\">\n    <input name=\"user\"><input name=\"pass\" type=\"password\">\n  </form>\n  <!-- TODO: remove before launch — staging key flag%7B47e9f7d4dbaf1104ecdb94919e1c0e3f%7D -->\n</div>\n```\n\nQiymat URL-kodlangan.",
    "descriptionRu": "Кто-то выкатил страницу вместе с комментарием.\n\n```html\n<div class=\"login\">\n  <form action=\"/auth\" method=\"post\">\n    <input name=\"user\"><input name=\"pass\" type=\"password\">\n  </form>\n  <!-- TODO: remove before launch — staging key flag%7B47e9f7d4dbaf1104ecdb94919e1c0e3f%7D -->\n</div>\n```\n\nЗначение закодировано URL-кодированием.",
    "hint": "%7B is '{' and %7D is '}'. Any URL decoder undoes it.",
    "hintUz": "%7B — bu '{', %7D — bu '}'. Istalgan URL dekoder buni ochadi.",
    "hintRu": "%7B — это '{', %7D — это '}'. Любой URL-декодер это раскроет.",
    "flagHash": "sha256$2fdd8345764be8e187ab87ee40fa358755843eb3c071d6d1d8a4e2dc8f61764a"
  },
  {
    "name": "Session Cookie",
    "nameUz": "Sessiya cookie'si",
    "nameRu": "Сессионная кука",
    "category": "Web",
    "difficulty": "easy",
    "points": 100,
    "description": "The server hands out this cookie on login:\n\n```http\nHTTP/1.1 200 OK\nSet-Cookie: session=ZmxhZ3tiMzMwOGVkYTI3OTBkMGJhODc1Y2MxYzQ2NjUxM2NjYn0=; Path=/; HttpOnly\n```\n\nRead what the session actually contains.",
    "descriptionUz": "Server kirishda shu cookie'ni beradi:\n\n```http\nHTTP/1.1 200 OK\nSet-Cookie: session=ZmxhZ3tiMzMwOGVkYTI3OTBkMGJhODc1Y2MxYzQ2NjUxM2NjYn0=; Path=/; HttpOnly\n```\n\nSessiya ichida aslida nima borligini o'qing.",
    "descriptionRu": "Сервер выдаёт эту куку при входе:\n\n```http\nHTTP/1.1 200 OK\nSet-Cookie: session=ZmxhZ3tiMzMwOGVkYTI3OTBkMGJhODc1Y2MxYzQ2NjUxM2NjYn0=; Path=/; HttpOnly\n```\n\nПрочитайте, что на самом деле лежит в сессии.",
    "hint": "Session values are very often just Base64 — decode it.",
    "hintUz": "Sessiya qiymatlari ko'pincha oddiy Base64 bo'ladi — dekodlang.",
    "hintRu": "Значения сессии часто просто Base64 — декодируйте.",
    "flagHash": "sha256$f9c0e8e9b8b3b075a5a9e7f99db20034a3508e888eea60cfc42444d91c591a34"
  },
  {
    "name": "Basic Auth",
    "nameUz": "Basic Auth",
    "nameRu": "Basic Auth",
    "category": "Web",
    "difficulty": "easy",
    "points": 100,
    "description": "A request went out with credentials attached:\n\n```http\nGET /admin HTTP/1.1\nHost: internal.example\nAuthorization: Basic YWRtaW46ZmxhZ3tkYTk0YTBhMTAzNmZlMmNiZWNiZWE2NjU5YmU2YjQ2MX0=\n```\n\nRecover the password.",
    "descriptionUz": "So'rov hisob ma'lumotlari bilan yuborilgan:\n\n```http\nGET /admin HTTP/1.1\nHost: internal.example\nAuthorization: Basic YWRtaW46ZmxhZ3tkYTk0YTBhMTAzNmZlMmNiZWNiZWE2NjU5YmU2YjQ2MX0=\n```\n\nParolni tiklang.",
    "descriptionRu": "Запрос ушёл вместе с учётными данными:\n\n```http\nGET /admin HTTP/1.1\nHost: internal.example\nAuthorization: Basic YWRtaW46ZmxhZ3tkYTk0YTBhMTAzNmZlMmNiZWNiZWE2NjU5YmU2YjQ2MX0=\n```\n\nВосстановите пароль.",
    "hint": "Basic auth is Base64 of 'user:password' — decode and take the part after the colon.",
    "hintUz": "Basic auth — 'foydalanuvchi:parol' ning Base64 ko'rinishi. Dekodlang va ikkinchi qismini oling.",
    "hintRu": "Basic auth — это Base64 от 'пользователь:пароль'. Декодируйте и возьмите часть после двоеточия.",
    "flagHash": "sha256$4f1b021786272b6a2ed1f416640ca6f4e26ff10803da32b0ae59a0db81ac53a4"
  },
  {
    "name": "Token Payload",
    "nameUz": "Token ichidagi ma'lumot",
    "nameRu": "Полезная нагрузка токена",
    "category": "Web",
    "difficulty": "medium",
    "points": 150,
    "description": "A JSON Web Token was captured in transit:\n\n```\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiAiMSIsICJub3RlIjogImZsYWd7MWY3MGI4ZjhkN2NlZGUzZjdjYzY3NzU1ODk2MGVhNzZ9In0.c2lnbmF0dXJl\n```\n\nA JWT is not encrypted. Read what it is carrying.",
    "descriptionUz": "Uzatilayotgan JSON Web Token qo'lga kiritildi:\n\n```\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiAiMSIsICJub3RlIjogImZsYWd7MWY3MGI4ZjhkN2NlZGUzZjdjYzY3NzU1ODk2MGVhNzZ9In0.c2lnbmF0dXJl\n```\n\nJWT shifrlanmagan. U nima olib yurayotganini o'qing.",
    "descriptionRu": "Перехвачен JSON Web Token:\n\n```\neyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiAiMSIsICJub3RlIjogImZsYWd7MWY3MGI4ZjhkN2NlZGUzZjdjYzY3NzU1ODk2MGVhNzZ9In0.c2lnbmF0dXJl\n```\n\nJWT не зашифрован. Прочитайте, что он несёт.",
    "hint": "Split on the dots and Base64url-decode the middle part — that is the payload.",
    "hintUz": "Nuqtalar bo'yicha ajrating va o'rtadagi qismni Base64url dekodlang — bu payload.",
    "hintRu": "Разделите по точкам и декодируйте среднюю часть Base64url — это payload.",
    "flagHash": "sha256$e7d2a295d58846bde5473cef8d27161011b6ae3e7e89a319954363addebe6f26"
  },
  {
    "name": "Encoded Twice",
    "nameUz": "Ikki marta kodlangan",
    "nameRu": "Закодировано дважды",
    "category": "Web",
    "difficulty": "medium",
    "points": 150,
    "description": "A parameter arrived at the backend looking like this:\n\n```\nGET /search?q=flag%257B86fcb17d38ada0166464e2cd47c79b50%257D\n```\n\nOne decode is not enough.",
    "descriptionUz": "Backendga parametr shu ko'rinishda yetib keldi:\n\n```\nGET /search?q=flag%257B86fcb17d38ada0166464e2cd47c79b50%257D\n```\n\nBir marta dekodlash yetarli emas.",
    "descriptionRu": "На бэкенд параметр пришёл в таком виде:\n\n```\nGET /search?q=flag%257B86fcb17d38ada0166464e2cd47c79b50%257D\n```\n\nОдного декодирования мало.",
    "hint": "Look at the '%25' sequences: that is '%' itself encoded. Decode, then decode again.",
    "hintUz": "'%25' ketma-ketligiga qarang: bu '%' belgisining o'zi kodlangan. Dekodlang, so'ng yana dekodlang.",
    "hintRu": "Обратите внимание на '%25' — это закодированный сам '%'. Декодируйте дважды.",
    "flagHash": "sha256$0c180f3eab86e96a41e95b37942f4b39c833949b34bd70f5119ae0eb7cb67311"
  },
  {
    "name": "Disallowed",
    "nameUz": "Taqiqlangan",
    "nameRu": "Запрещено",
    "category": "Web",
    "difficulty": "easy",
    "points": 100,
    "description": "The site's robots.txt asks crawlers to stay away from something:\n\n```\nUser-agent: *\nDisallow: /assets/\nDisallow: /MZWGCZ33MVTDIMJRGA2TIM3EGYYTQOBWGE2WGZJWGM2GKMRQGQ4TGOLEMM2H2===/\n```\n\nThe path they are hiding is Base32.",
    "descriptionUz": "Saytning robots.txt fayli qidiruv robotlarini bir joydan qaytaradi:\n\n```\nUser-agent: *\nDisallow: /assets/\nDisallow: /MZWGCZ33MVTDIMJRGA2TIM3EGYYTQOBWGE2WGZJWGM2GKMRQGQ4TGOLEMM2H2===/\n```\n\nUlar yashirayotgan yo'l — Base32.",
    "descriptionRu": "robots.txt сайта просит краулеры не ходить кое-куда:\n\n```\nUser-agent: *\nDisallow: /assets/\nDisallow: /MZWGCZ33MVTDIMJRGA2TIM3EGYYTQOBWGE2WGZJWGM2GKMRQGQ4TGOLEMM2H2===/\n```\n\nСкрываемый путь — это Base32.",
    "hint": "Base32 is uppercase A–Z and 2–7, usually padded with '='. Decode the path.",
    "hintUz": "Base32 — katta A–Z va 2–7, odatda '=' bilan to'ldiriladi. Yo'lni dekodlang.",
    "hintRu": "Base32 — заглавные A–Z и 2–7, обычно с '=' в конце. Декодируйте путь.",
    "flagHash": "sha256$665100abe3dd0db47fb5be2555b7a12140fdb1ded4c93b9c6400daa750a48a2b"
  },
  {
    "name": "Union Select",
    "nameUz": "Union Select",
    "nameRu": "Union Select",
    "category": "Web",
    "difficulty": "medium",
    "points": 200,
    "description": "An injectable search endpoint returned this when the payload\n`' UNION SELECT hex(secret),NULL FROM config-- ` was sent:\n\n```\n| result                                                             | rank |\n|--------------------------------------------------------------------|------|\n| 666c61677b32653134336462353062613535373332656434663331333664626234663663667d                                                  | NULL |\n```\n\nTurn the response back into text.",
    "descriptionUz": "Zaif qidiruv endpointi `' UNION SELECT hex(secret),NULL FROM config-- `\nyuborilganda shuni qaytardi:\n\n```\n| result                                                             | rank |\n|--------------------------------------------------------------------|------|\n| 666c61677b32653134336462353062613535373332656434663331333664626234663663667d                                                  | NULL |\n```\n\nJavobni matnga qaytaring.",
    "descriptionRu": "Уязвимый поисковый эндпоинт вернул это на payload\n`' UNION SELECT hex(secret),NULL FROM config-- `:\n\n```\n| result                                                             | rank |\n|--------------------------------------------------------------------|------|\n| 666c61677b32653134336462353062613535373332656434663331333664626234663663667d                                                  | NULL |\n```\n\nВерните ответ в текст.",
    "hint": "hex() returned the bytes as hex — two characters per byte. Convert hex back to ASCII.",
    "hintUz": "hex() baytlarni o'n oltilikda qaytargan — har bayt ikki belgi. Hex'ni ASCII'ga qaytaring.",
    "hintRu": "hex() вернул байты в шестнадцатеричном виде — два символа на байт. Переведите обратно в ASCII.",
    "flagHash": "sha256$ad773c600e694c7daa8b48534b117fce5aa5c94bff59a34a2c4efb83cdb397cd"
  },
  {
    "name": "Redirect Chain",
    "nameUz": "Yo'naltirishlar zanjiri",
    "nameRu": "Цепочка редиректов",
    "category": "Web",
    "difficulty": "medium",
    "points": 150,
    "description": "Following a short link produced this chain:\n\n```http\nHTTP/1.1 302 Found\nLocation: /r/2?t=start\n\nHTTP/1.1 302 Found\nLocation: /r/3?t=ZmxhZ3thNzEyMjUwZmYzMTU1ZWFjYjA1N2YyMWZiYjM3ZGFiOX0%3D\n\nHTTP/1.1 200 OK\n```\n\nThe interesting value is in the last redirect: URL-encoded, and Base64 underneath.",
    "descriptionUz": "Qisqa havolani kuzatish shu zanjirni berdi:\n\n```http\nHTTP/1.1 302 Found\nLocation: /r/2?t=start\n\nHTTP/1.1 302 Found\nLocation: /r/3?t=ZmxhZ3thNzEyMjUwZmYzMTU1ZWFjYjA1N2YyMWZiYjM3ZGFiOX0%3D\n\nHTTP/1.1 200 OK\n```\n\nKerakli qiymat oxirgi yo'naltirishda: URL-kodlangan, ostida esa Base64.",
    "descriptionRu": "Переход по короткой ссылке дал такую цепочку:\n\n```http\nHTTP/1.1 302 Found\nLocation: /r/2?t=start\n\nHTTP/1.1 302 Found\nLocation: /r/3?t=ZmxhZ3thNzEyMjUwZmYzMTU1ZWFjYjA1N2YyMWZiYjM3ZGFiOX0%3D\n\nHTTP/1.1 200 OK\n```\n\nНужное значение — в последнем редиректе: URL-кодирование, а под ним Base64.",
    "hint": "Two layers: URL-decode the parameter first, then Base64-decode the result.",
    "hintUz": "Ikki qatlam: avval parametrni URL-dekodlang, so'ng natijani Base64 dekodlang.",
    "hintRu": "Два слоя: сначала URL-декодируйте параметр, затем декодируйте Base64.",
    "flagHash": "sha256$d0b848dee83805a765b7bba369d4e88d58fb682c335eb12c9464d2256c6b36d3"
  },
  {
    "name": "Single Byte",
    "nameUz": "Bitta bayt",
    "nameRu": "Один байт",
    "category": "Reverse",
    "difficulty": "easy",
    "points": 100,
    "description": "This routine produced the bytes below. Undo it.\n\n```c\nvoid enc(char *s) {\n    for (int i = 0; s[i]; i++) s[i] ^= 0x5A;\n}\n```\n\nOutput (hex): `3c363b3d21396e3f6c683e6c633e623b6a6d626d6c6d6263386a3f69696f6d623f686d633b27`",
    "descriptionUz": "Bu funksiya quyidagi baytlarni chiqargan. Uni orqaga qaytaring.\n\n```c\nvoid enc(char *s) {\n    for (int i = 0; s[i]; i++) s[i] ^= 0x5A;\n}\n```\n\nNatija (hex): `3c363b3d21396e3f6c683e6c633e623b6a6d626d6c6d6263386a3f69696f6d623f686d633b27`",
    "descriptionRu": "Эта функция выдала байты ниже. Обратите её.\n\n```c\nvoid enc(char *s) {\n    for (int i = 0; s[i]; i++) s[i] ^= 0x5A;\n}\n```\n\nВывод (hex): `3c363b3d21396e3f6c683e6c633e623b6a6d626d6c6d6263386a3f69696f6d623f686d633b27`",
    "hint": "XOR is its own inverse — XOR the bytes with 0x5A again.",
    "hintUz": "XOR o'ziga teskari — baytlarni yana 0x5A bilan XOR qiling.",
    "hintRu": "XOR обратен сам себе — сложите байты с 0x5A ещё раз.",
    "flagHash": "sha256$b541c0f600635e0a964b2c37d637459c45c4fd79bfbbe416f76797361efc539d"
  },
  {
    "name": "Off By Three",
    "nameUz": "Uchtaga surilgan",
    "nameRu": "Смещение на три",
    "category": "Reverse",
    "difficulty": "easy",
    "points": 100,
    "description": "Each byte was pushed forward before being written out.\n\n```c\nfor (int i = 0; i < n; i++) out[i] = in[i] + 3;\n```\n\nOutput (hex): `696f646a7e653a3c3b34663a3369383a65673c3b643c663465383435343c69656837653a3c80`",
    "descriptionUz": "Har bir bayt yozib chiqarishdan oldin oldinga surilgan.\n\n```c\nfor (int i = 0; i < n; i++) out[i] = in[i] + 3;\n```\n\nNatija (hex): `696f646a7e653a3c3b34663a3369383a65673c3b643c663465383435343c69656837653a3c80`",
    "descriptionRu": "Каждый байт сдвинули вперёд перед записью.\n\n```c\nfor (int i = 0; i < n; i++) out[i] = in[i] + 3;\n```\n\nВывод (hex): `696f646a7e653a3c3b34663a3369383a65673c3b643c663465383435343c69656837653a3c80`",
    "hint": "Subtract 3 from every byte, then read it as text.",
    "hintUz": "Har bir baytdan 3 ni ayiring, so'ng matn sifatida o'qing.",
    "hintRu": "Вычтите 3 из каждого байта и прочитайте как текст.",
    "flagHash": "sha256$4a77320cf0689b41f0472707208e0cd0020fbccfd00522a9114aeca4b07d0599"
  },
  {
    "name": "Backwards",
    "nameUz": "Teskarisiga",
    "nameRu": "Задом наперёд",
    "category": "Reverse",
    "difficulty": "easy",
    "points": 100,
    "description": "The program printed its input in reverse:\n\n```\n}689b21540cfc6cdad408907650cc5d70{galf\n```",
    "descriptionUz": "Dastur kiritilgan matnni teskarisiga chiqargan:\n\n```\n}689b21540cfc6cdad408907650cc5d70{galf\n```",
    "descriptionRu": "Программа вывела вход задом наперёд:\n\n```\n}689b21540cfc6cdad408907650cc5d70{galf\n```",
    "hint": "Read it right to left — or `rev` in a terminal.",
    "hintUz": "O'ngdan chapga o'qing — yoki terminalda `rev`.",
    "hintRu": "Читайте справа налево — или `rev` в терминале.",
    "flagHash": "sha256$2d87671ee0c300da31d322eab450e3dbf85639d1cfc2e2d0811e8a3d07777bbe"
  },
  {
    "name": "Rotate Wider",
    "nameUz": "Kengroq aylantirish",
    "nameRu": "Поворот пошире",
    "category": "Reverse",
    "difficulty": "medium",
    "points": 150,
    "description": "ROT13 does nothing useful here, because the encoder rotated the whole\nprintable ASCII range, not just letters:\n\n```\n7=28Lah_5_d5fa47_b`b2a2`gghb374_cca4cN\n```",
    "descriptionUz": "Bu yerda ROT13 yordam bermaydi, chunki kodlovchi faqat harflarni emas,\nbutun chop etiladigan ASCII oralig'ini aylantirgan:\n\n```\n7=28Lah_5_d5fa47_b`b2a2`gghb374_cca4cN\n```",
    "descriptionRu": "ROT13 здесь бесполезен: кодировщик повернул весь диапазон печатаемых\nASCII-символов, а не только буквы:\n\n```\n7=28Lah_5_d5fa47_b`b2a2`gghb374_cca4cN\n```",
    "hint": "This is ROT47. Applying ROT47 a second time returns the original.",
    "hintUz": "Bu ROT47. ROT47 ni ikkinchi marta qo'llasangiz, asl matn qaytadi.",
    "hintRu": "Это ROT47. Примените ROT47 второй раз — вернётся исходный текст.",
    "flagHash": "sha256$260fa41846ed18dd1a49b862b2935d8a49d79cd5868a3be3dc4409b43c706952"
  },
  {
    "name": "Every Third",
    "nameUz": "Har uchinchisi",
    "nameRu": "Каждый третий",
    "category": "Scripting",
    "difficulty": "easy",
    "points": 100,
    "description": "Padding was inserted between the real characters — two junk characters\nafter every real one:\n\n```\nfb5lo2am6gy4{e77f97y93c24h92g01j44w98c78y22m1af76f8dw42n5ce3dd92r54i9at26p46i4ed3cr15c22n78v5dh75c31y0cs3dj4bt3}b8\n```\n\nPull the signal back out.",
    "descriptionUz": "Haqiqiy belgilar orasiga to'ldiruvchi qo'yilgan — har bir haqiqiy\nbelgidan keyin ikkita keraksiz belgi:\n\n```\nfb5lo2am6gy4{e77f97y93c24h92g01j44w98c78y22m1af76f8dw42n5ce3dd92r54i9at26p46i4ed3cr15c22n78v5dh75c31y0cs3dj4bt3}b8\n```\n\nSignalni qaytarib ajratib oling.",
    "descriptionRu": "Между настоящими символами вставлен мусор — по два лишних символа\nпосле каждого настоящего:\n\n```\nfb5lo2am6gy4{e77f97y93c24h92g01j44w98c78y22m1af76f8dw42n5ce3dd92r54i9at26p46i4ed3cr15c22n78v5dh75c31y0cs3dj4bt3}b8\n```\n\nИзвлеките сигнал обратно.",
    "hint": "Take characters at positions 0, 3, 6, 9 … — one line of Python or `cut` does it.",
    "hintUz": "0, 3, 6, 9 … o'rinlardagi belgilarni oling — bitta qator Python yoki `cut` yetarli.",
    "hintRu": "Берите символы на позициях 0, 3, 6, 9 … — хватит одной строки Python или `cut`.",
    "flagHash": "sha256$d0e303a8b7e3830517253feb08079c4ad19bf68ccfd32054ca71c17d83342ec5"
  },
  {
    "name": "Run Length",
    "nameUz": "Takrorlar soni",
    "nameRu": "Длины серий",
    "category": "Scripting",
    "difficulty": "medium",
    "points": 150,
    "description": "The text was run-length encoded — each run written as `character x count`,\nruns separated by commas:\n\n```\nfx1,lx1,ax1,gx1,{x1,ex1,bx1,4x1,ex1,2x1,8x1,1x1,3x1,6x1,0x1,9x1,ax1,1x1,4x1,3x1,7x1,6x1,fx1,5x1,9x1,bx1,fx1,1x1,8x1,bx1,cx1,4x1,6x1,5x1,ex1,fx1,3x1,}x1\n```\n\nExpand it back.",
    "descriptionUz": "Matn takrorlar soni bo'yicha kodlangan — har bir seriya `belgi x soni`\nko'rinishida, seriyalar vergul bilan ajratilgan:\n\n```\nfx1,lx1,ax1,gx1,{x1,ex1,bx1,4x1,ex1,2x1,8x1,1x1,3x1,6x1,0x1,9x1,ax1,1x1,4x1,3x1,7x1,6x1,fx1,5x1,9x1,bx1,fx1,1x1,8x1,bx1,cx1,4x1,6x1,5x1,ex1,fx1,3x1,}x1\n```\n\nUni yoyib chiqing.",
    "descriptionRu": "Текст закодирован длинами серий — каждая серия как `символ x количество`,\nсерии разделены запятыми:\n\n```\nfx1,lx1,ax1,gx1,{x1,ex1,bx1,4x1,ex1,2x1,8x1,1x1,3x1,6x1,0x1,9x1,ax1,1x1,4x1,3x1,7x1,6x1,fx1,5x1,9x1,bx1,fx1,1x1,8x1,bx1,cx1,4x1,6x1,5x1,ex1,fx1,3x1,}x1\n```\n\nРазверните обратно.",
    "hint": "Split on commas, then on the 'x': repeat each character its count of times.",
    "hintUz": "Vergul bo'yicha, so'ng 'x' bo'yicha ajrating: har bir belgini soni marta takrorlang.",
    "hintRu": "Разделите по запятым, затем по 'x': повторите каждый символ указанное число раз.",
    "flagHash": "sha256$805e6cbbf5ac83d7e74e28a05e0c76fe64fc6c7c5b7b2968b3d56d365e594836"
  },
  {
    "name": "Odd Line Out",
    "nameUz": "Boshqacha qator",
    "nameRu": "Лишняя строка",
    "category": "Scripting",
    "difficulty": "easy",
    "points": 100,
    "description": "A log file full of hashes has one line that is not a hash:\n\n```\n9139de53480c6242\n9125050df84a2e24\n1b184d6b3515168c\nflag{45d9e938e5ef891200d7d98d2ff1e57d}\nee65dd4e598060ec\nb05c8ddc8a8ed741\nedf36739cd90ef25\n```",
    "descriptionUz": "Hash'lar bilan to'la log faylida bitta qator hash emas:\n\n```\n9139de53480c6242\n9125050df84a2e24\n1b184d6b3515168c\nflag{45d9e938e5ef891200d7d98d2ff1e57d}\nee65dd4e598060ec\nb05c8ddc8a8ed741\nedf36739cd90ef25\n```",
    "descriptionRu": "В логе, полном хешей, одна строка — не хеш:\n\n```\n9139de53480c6242\n9125050df84a2e24\n1b184d6b3515168c\nflag{45d9e938e5ef891200d7d98d2ff1e57d}\nee65dd4e598060ec\nb05c8ddc8a8ed741\nedf36739cd90ef25\n```",
    "hint": "Everything else is 16 hex bytes. `grep` for the flag prefix, or just look for the odd shape.",
    "hintUz": "Qolganlari 16 baytlik hex. Flag prefiksini `grep` qiling yoki shakli boshqacha qatorni toping.",
    "hintRu": "Остальные — 16 hex-байт. Сделайте `grep` по префиксу флага или найдите строку иной формы.",
    "flagHash": "sha256$1b9685d46fe4f9b61f5f5bea2a1bc20ff31948d6fbb6d387f4e269b7bb834bfa"
  },
  {
    "name": "Interleaved",
    "nameUz": "Aralashtirilgan",
    "nameRu": "Чередование",
    "category": "Scripting",
    "difficulty": "medium",
    "points": 150,
    "description": "The string was split down the middle and the two halves were woven\ntogether, one character each:\n\n```\nf3l5a7g9{4a9126f1b5a0201907b8015e0b4a}\n```\n\nUnweave it.",
    "descriptionUz": "Satr o'rtasidan ikkiga bo'lingan va ikkala yarmi bittadan belgi bilan\no'zaro to'qilgan:\n\n```\nf3l5a7g9{4a9126f1b5a0201907b8015e0b4a}\n```\n\nUni yechib oling.",
    "descriptionRu": "Строку разрезали пополам и переплели половины по одному символу:\n\n```\nf3l5a7g9{4a9126f1b5a0201907b8015e0b4a}\n```\n\nРасплетите обратно.",
    "hint": "Even positions are the first half, odd positions the second — join them back in order.",
    "hintUz": "Juft o'rinlar — birinchi yarim, toq o'rinlar — ikkinchisi. Ularni tartib bilan birlashtiring.",
    "hintRu": "Чётные позиции — первая половина, нечётные — вторая. Соедините их по порядку.",
    "flagHash": "sha256$357730676423dacdd7bbf4d2d279a465c02835b4b19f29f7e14b7ab4ef8c90e0"
  },
  {
    "name": "Count the Padding",
    "nameUz": "To'ldirishni sanang",
    "nameRu": "Посчитайте отступ",
    "category": "Pwn",
    "difficulty": "medium",
    "points": 200,
    "description": "How many bytes must be written before the saved return address is reached?\n\n```c\nvoid vuln(void) {\n    char name[64];      // buffer\n    long canary_off;    // 8 bytes\n    gets(name);         // no bounds check\n}\n```\n\nOn x86-64 the saved frame pointer sits between the locals and the return\naddress. Work out the offset, then take:\n\n    flag{ sha256(\"offset<N>\")[:32] }\n\nwhere `<N>` is that number in decimal. For example, if you decide the answer is\n16, you would hash the string `offset16`.",
    "descriptionUz": "Saqlangan qaytish manziliga yetguncha necha bayt yozish kerak?\n\n```c\nvoid vuln(void) {\n    char name[64];      // bufer\n    long canary_off;    // 8 bayt\n    gets(name);         // chegara tekshirilmaydi\n}\n```\n\nx86-64 da saqlangan kadr ko'rsatkichi lokal o'zgaruvchilar bilan qaytish\nmanzili orasida turadi. Ofsetni hisoblang, so'ng oling:\n\n    flag{ sha256(\"offset<N>\")[:32] }\n\nbu yerda `<N>` — o'sha son (o'nlik). Masalan, javob 16 desangiz, `offset16`\nsatrini hash qilasiz.",
    "descriptionRu": "Сколько байт нужно записать, чтобы дойти до сохранённого адреса возврата?\n\n```c\nvoid vuln(void) {\n    char name[64];      // буфер\n    long canary_off;    // 8 байт\n    gets(name);         // без проверки границ\n}\n```\n\nНа x86-64 сохранённый указатель кадра лежит между локальными переменными и\nадресом возврата. Вычислите смещение, затем возьмите:\n\n    flag{ sha256(\"offset<N>\")[:32] }\n\nгде `<N>` — это число в десятичном виде. Например, если решите, что ответ 16,\nхешируйте строку `offset16`.",
    "hint": "64 bytes of buffer + 8 bytes of the local + 8 bytes of saved RBP.",
    "hintUz": "64 bayt bufer + 8 bayt lokal o'zgaruvchi + 8 bayt saqlangan RBP.",
    "hintRu": "64 байта буфера + 8 байт локальной переменной + 8 байт сохранённого RBP.",
    "flagHash": "sha256$0c26e83f83a789ea5d3451c89d67ca6acc22dcf3abdd156d5a8be4d6046edd6a"
  },
  {
    "name": "Which Argument",
    "nameUz": "Qaysi argument",
    "nameRu": "Какой аргумент",
    "category": "Pwn",
    "difficulty": "medium",
    "points": 200,
    "description": "A format string bug lets you print stack values:\n\n```\n$ ./app \"AAAA %p %p %p %p %p %p %p\"\nAAAA 0x7ffd0a1c 0x7f9c2d40 (nil) 0x1 0x7ffd0a90 0x400680 0x41414141\n```\n\nYour input appeared at the seventh printed value. That means `%7$s` would\ndereference it. Take:\n\n    flag{ sha256(\"arg<N>\")[:32] }\n\nwhere `<N>` is the argument index you would use.",
    "descriptionUz": "Format satri xatosi stek qiymatlarini chop etishga imkon beradi:\n\n```\n$ ./app \"AAAA %p %p %p %p %p %p %p\"\nAAAA 0x7ffd0a1c 0x7f9c2d40 (nil) 0x1 0x7ffd0a90 0x400680 0x41414141\n```\n\nSizning kiritmangiz yettinchi chop etilgan qiymatda paydo bo'ldi. Ya'ni `%7$s`\nuni dereferens qiladi. Oling:\n\n    flag{ sha256(\"arg<N>\")[:32] }\n\nbu yerda `<N>` — siz ishlatadigan argument indeksi.",
    "descriptionRu": "Ошибка форматной строки позволяет печатать значения со стека:\n\n```\n$ ./app \"AAAA %p %p %p %p %p %p %p\"\nAAAA 0x7ffd0a1c 0x7f9c2d40 (nil) 0x1 0x7ffd0a90 0x400680 0x41414141\n```\n\nВаш ввод появился седьмым по счёту. Значит, `%7$s` его разыменует. Возьмите:\n\n    flag{ sha256(\"arg<N>\")[:32] }\n\nгде `<N>` — индекс аргумента, который вы бы использовали.",
    "hint": "0x41414141 is 'AAAA' — count which printed value that was.",
    "hintUz": "0x41414141 — bu 'AAAA'. U nechanchi chop etilgan qiymat ekanini sanang.",
    "hintRu": "0x41414141 — это 'AAAA'. Посчитайте, каким по счёту он был напечатан.",
    "flagHash": "sha256$845f2aa42c2d902e3baf55680220de3e231fffc868d453f7ea5363b163a71b67"
  },
  {
    "name": "Read the Bytes",
    "nameUz": "Baytlarni o'qing",
    "nameRu": "Прочитайте байты",
    "category": "Networking",
    "difficulty": "easy",
    "points": 100,
    "description": "A packet capture shows one HTTP request. Here are its payload bytes:\n\n```\n47 45 54 20 2f 73 74 61 74 75 73 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 61 70 69 2e 69 6e 74 65 72 6e 61 6c 0d 0a 58 2d 54 6f 6b 65 6e 3a 20 66 6c 61 67 7b 37 36 31 63 36 32 64 30 63 65 64 63 32 63 31 61 38 61 62 61 33 64 33 63 65 38 61 66 66 39 64 30 7d 0d 0a 0d 0a\n```\n\nReconstruct the request and read the header it carries.",
    "descriptionUz": "Tarmoq yozuvida bitta HTTP so'rov bor. Uning payload baytlari:\n\n```\n47 45 54 20 2f 73 74 61 74 75 73 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 61 70 69 2e 69 6e 74 65 72 6e 61 6c 0d 0a 58 2d 54 6f 6b 65 6e 3a 20 66 6c 61 67 7b 37 36 31 63 36 32 64 30 63 65 64 63 32 63 31 61 38 61 62 61 33 64 33 63 65 38 61 66 66 39 64 30 7d 0d 0a 0d 0a\n```\n\nSo'rovni tiklang va u olib yurgan sarlavhani o'qing.",
    "descriptionRu": "В дампе трафика один HTTP-запрос. Вот байты его полезной нагрузки:\n\n```\n47 45 54 20 2f 73 74 61 74 75 73 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 61 70 69 2e 69 6e 74 65 72 6e 61 6c 0d 0a 58 2d 54 6f 6b 65 6e 3a 20 66 6c 61 67 7b 37 36 31 63 36 32 64 30 63 65 64 63 32 63 31 61 38 61 62 61 33 64 33 63 65 38 61 66 66 39 64 30 7d 0d 0a 0d 0a\n```\n\nВосстановите запрос и прочитайте заголовок.",
    "hint": "Each pair of hex digits is one ASCII character — convert the whole run to text.",
    "hintUz": "Har ikki hex raqam — bitta ASCII belgi. Butun ketma-ketlikni matnga o'giring.",
    "hintRu": "Каждая пара hex-цифр — один ASCII-символ. Переведите всю последовательность в текст.",
    "flagHash": "sha256$4cc79e34f2530e8ecd62527bc2134ed6389f03d4cdad7e1f2f69e577b6c69e81"
  },
  {
    "name": "TXT Record",
    "nameUz": "TXT yozuv",
    "nameRu": "TXT-запись",
    "category": "Networking",
    "difficulty": "easy",
    "points": 100,
    "description": "A DNS lookup turned up an unusual TXT record:\n\n```\n$ dig +short TXT _verify.example.internal\n\"v=1; data=ZmxhZ3s1Y2MxMGJkOTExNjg3YmI4ZTI4OGUyZDJiYTA1MGViNX0=\"\n```\n\nRead what was published there.",
    "descriptionUz": "DNS so'rovi g'alati TXT yozuvni topdi:\n\n```\n$ dig +short TXT _verify.example.internal\n\"v=1; data=ZmxhZ3s1Y2MxMGJkOTExNjg3YmI4ZTI4OGUyZDJiYTA1MGViNX0=\"\n```\n\nU yerda nima e'lon qilinganini o'qing.",
    "descriptionRu": "DNS-запрос выдал необычную TXT-запись:\n\n```\n$ dig +short TXT _verify.example.internal\n\"v=1; data=ZmxhZ3s1Y2MxMGJkOTExNjg3YmI4ZTI4OGUyZDJiYTA1MGViNX0=\"\n```\n\nПрочитайте, что там опубликовано.",
    "hint": "The data field is Base64 — decode it.",
    "hintUz": "data maydoni Base64 — uni dekodlang.",
    "hintRu": "Поле data — это Base64, декодируйте его.",
    "flagHash": "sha256$62adfb5527c124185e507f36975e13e5d003807222b08368e0c036e2826d4cb1"
  }
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const pool = new Pool({ connectionString });

async function main() {
  let added = 0, skipped = 0;
  for (const c of CHALLENGES) {
    const existing = await pool.query("SELECT id FROM ctf_tasks WHERE lower(name) = lower($1)", [c.name]);
    if (existing.rowCount) { skipped++; continue; }
    await pool.query(
      `INSERT INTO ctf_tasks
         (name, name_uz, name_ru, description, description_uz, description_ru,
          category, difficulty, points, hint, hint_uz, hint_ru, flag, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)`,
      [c.name, c.nameUz, c.nameRu, c.description, c.descriptionUz, c.descriptionRu,
        c.category, c.difficulty, c.points, c.hint, c.hintUz, c.hintRu, c.flagHash],
    );
    added++;
  }
  console.log(`Added ${added}, skipped ${skipped} (already present).`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => { console.error(err); await pool.end(); process.exit(1); });
