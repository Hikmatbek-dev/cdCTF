"""
Module 08 — CTF Methodology and Competition. The program finale.

Where module 6 caps the offensive core and module 7 turns it around to defence,
this module puts everything into competitive practice and closes the program.
objdump output was produced on a real shell; other tool syntax (checksec,
pwntools, gdb) is the documented standard. Everything here is for CTF platforms
and labs you are meant to attack — including this one.
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
        "category": "capstone", "points": 70,
        "title": "What a CTF is: formats, categories, and the flag",
        "titleUz": "CTF nima: formatlar, kategoriyalar va flag",
        "titleRu": "Что такое CTF: форматы, категории и флаг",
        "content": r"""You have met CTF challenges throughout this program. This module is about competing in them well — turning the skills of the last seven modules into speed, method and results. It starts with the shape of the game.

## What a CTF is

A **Capture The Flag** is a cybersecurity competition where you solve challenges to find a hidden string — the **flag** — and submit it for points. On this platform a flag looks like `flag{...}` with a value inside. Finding the flag proves you solved the challenge; submitting it scores you.

CTFs are the fastest way to build real skill, because instead of reading about a vulnerability you exploit a safe copy of it yourself, under time pressure, against opponents. Everything you learned — Linux, networking, web, crypto, recon, exploitation, forensics — becomes a tool you reach for to capture a flag.

## The two formats

**Jeopardy** — the common format, and what this platform runs. A board of challenges grouped by category and points; you solve any you can, in any order, and the flag for each is worth its listed points. Harder challenges are worth more. You compete on total score.

**Attack-Defense** — each team runs identical vulnerable services and must *patch their own* while *exploiting everyone else's*, live. You score by stealing flags from opponents and keeping your own services up. It is intense, team-based, and where the offensive and defensive halves of this program meet in real time (lesson 6).

## The categories

Every category maps to a module you have finished:

- **Web** — the vulnerabilities of module 3: injection, XSS, IDOR, SSRF. Find the flaw, reach the flag.
- **Crypto** — module 4: recognise the scheme, break the misuse, decode the flag.
- **Forensics** — module 7: a disk image, a pcap, a memory dump with the flag hidden inside.
- **Reversing (rev)** — analyse a binary to understand what it does and extract the flag. New here; introduced in lesson 5.
- **Pwn (binary exploitation)** — exploit a running binary's memory bugs for a shell. New; lesson 5.
- **OSINT** — module 5's passive recon: find the flag in public information.
- **Stego / Misc** — hidden data (module 7's carving and metadata) and everything that fits nowhere else.

Recognising which category a challenge really is — a "crypto" that is actually encoding, a "web" that is actually a git leak — is half the battle, and it is the skill every prior module trained.

## Scoring and the leaderboard

- **Static scoring** — each challenge is worth a fixed number of points.
- **Dynamic scoring** — a challenge is worth more when few teams have solved it, and its value *drops* as more do. This rewards solving the hard, rare challenges first.
- **First blood** — the first team to solve a challenge; often celebrated, sometimes worth bonus points.

The leaderboard ranks by total score, with ties usually broken by who reached the score first. On this platform your solves feed the same scoreboard you have seen since module 1.

## Where to compete

- **This platform** — start here; every challenge is built to practise exactly these skills.
- **picoCTF** — beginner-friendly, always available, excellent for learning.
- **Hack The Box, TryHackMe** — guided machines and challenges, from easy to expert.
- **CTFtime.org** — the calendar of live competitions worldwide; find a team and play a real event.

## Try it

1. On this platform, open the CTF section. Which categories are there, and which module does each map to?
2. Pick the lowest-point challenge in a category you are strong in and solve it end to end.
3. Note the flag format. After every decode or exploit, ask: does my output look like `flag{...}` yet?""",
        "contentUz": r"""Bu dastur davomida CTF challenge'larга duch keldingiz. Bu modul ularда yaxshi bellashish haqida — oxirgi yetti modulning ko'nikmalarини tezlik, usul va natijаga aylantirish. U o'yin shaklидан boshlanadi.

## CTF nima

**Capture The Flag** — kiberxavfsizlik musobaqasi bo'lib, unda yashiringan satrни — **flag**ни — topish va uni ballga topshirish uchun challenge'larни yechasiz. Bu platformada flag ichida qiymatли `flag{...}` ko'rinishida. Flagни topish challenge'ни yechganingizni isbotlaydi; uni topshirish ball beradi.

CTF'lar haqiqiy ko'nikma qurishning eng tez yo'li, chunki zaiflik haqida o'qish o'rniga uning xavfsiz nusxasini o'zingiz, vaqt bosimida, raqiblarga qarshi ekspluatatsiya qilasiz. O'rgangan hamma narsangiz — Linux, tarmoq, veb, kripto, razvedka, ekspluatatsiya, forenzika — flag olish uchun qo'l cho'zadigan vositаgа aylanadi.

## Ikki format

**Jeopardy** — keng tarqalgan format, va bu platforma yuritadigan. Kategoriya va ballga guruhlangan challenge'lar taxtasi; siz istalganini, istalgan tartibda yechasiz, va har birining flagi ko'rsatilgan ballга teng. Qiyinroq challenge'lar ko'proq turadi. Umumiy ball bo'yicha bellashadingiz.

**Attack-Defense** — har jamoa bir xil zaif xizmatlarні yuritadi va *o'zinikini yamash* bilan birga *boshqalarnikini ekspluatatsiya qilish* kerak, jonli. Raqiblardan flag o'g'irlash va o'z xizmatlaringizni ishlab turishга ko'ra ball olasiz. U keskin, jamoaviy, va bu dasturning hujum va himoya yarmi real vaqtда uchrashadigan joy (6-dars).

## Kategoriyalar

Har kategoriya siz tugatgan modulга mos keladi:

- **Web** — 3-modul zaifliklari: in'ektsiya, XSS, IDOR, SSRF. Nuqsonni top, flagга yet.
- **Crypto** — 4-modul: sxemani tani, noto'g'ri ishlatishni buz, flagни dekodla.
- **Forensics** — 7-modul: ichida flag yashiringan disk tasviri, pcap, xotira dampi.
- **Reversing (rev)** — nima qilishini tushunish va flagни ajratish uchun binarни tahlil qil. Bu yerда yangi; 5-darsда tanishtiriladi.
- **Pwn (binar ekspluatatsiya)** — shell uchun ishlayotgan binarning xotira xatolarini ekspluatatsiya qil. Yangi; 5-dars.
- **OSINT** — 5-modulning passiv razvedkasi: flagни ommaviy ma'lumotда top.
- **Stego / Misc** — yashirin ma'lumot (7-modul kesish va metama'lumot) va hech qayerga sig'maydigan hamma narsa.

Challenge aslida qaysi kategoriya ekanini tanish — aslida kodlash bo'lgan "crypto", aslida git sizishi bo'lgan "web" — jangning yarmi, va u har oldingi modul o'rgatgan ko'nikma.

## Ballash va reyting

- **Statik ballash** — har challenge belgilangan ball turadi.
- **Dinamik ballash** — challenge kam jamoa yechganda ko'proq turadi, va ko'proq yechgani sari qiymati *tushadi*. Bu avval qiyin, kam uchraydigan challenge'larni yechishni rag'batlantiradi.
- **First blood** — challenge'ни birinchi yechgan jamoa; ko'pincha nishonlanadi, ba'zan bonus ball turadi.

Reyting umumiy ball bo'yicha tartiblaydi, tenglik odatda ballga birinchi yetgani bo'yicha uziladi. Bu platformada yechimlaringiz 1-moduldan ko'rgan o'sha reytingга oziq beradi.

## Qayerda bellashish

- **Bu platforma** — shu yerdan boshlang; har challenge aynan shu ko'nikmalarni mashq qilishga qurilgan.
- **picoCTF** — boshlovchilarга do'stona, doim mavjud, o'rganish uchun ajoyib.
- **Hack The Box, TryHackMe** — yo'l-yo'riqли mashinalar va challenge'lar, osondan ekspertgacha.
- **CTFtime.org** — dunyo bo'ylab jonli musobaqalar taqvimi; jamoa toping va haqiqiy tadbir o'ynang.

## Sinab ko'ring

1. Bu platformada CTF bo'limини oching. Qanday kategoriyalar bor va har biri qaysi modulга mos keladi?
2. Kuchli bo'lgan kategoriyada eng past ballli challenge'ни tanlang va boshdan oxiригаcha yeching.
3. Flag formatini qayd qiling. Har dekodlash yoki ekspluatatsiyadan keyin so'rang: chiqishim hali `flag{...}` ga o'xshaydimi?""",
        "contentRu": r"""На протяжении программы вы встречали CTF-задания. Этот модуль — о том, как хорошо в них соревноваться, превращая навыки последних семи модулей в скорость, метод и результат. Начинается с формы игры.

## Что такое CTF

**Capture The Flag** — соревнование по кибербезопасности, где вы решаете задания, чтобы найти скрытую строку — **флаг** — и сдать её на очки. На этой платформе флаг выглядит как `flag{...}` со значением внутри. Найти флаг — доказать, что задание решено; сдать его — получить очки.

CTF — быстрейший способ построить реальный навык, ведь вместо чтения об уязвимости вы эксплуатируете её безопасную копию сами, под давлением времени, против соперников. Всё изученное — Linux, сети, веб, крипто, разведка, эксплуатация, форензика — становится инструментом, к которому вы тянетесь ради флага.

## Два формата

**Jeopardy** — распространённый формат, и то, что запускает эта платформа. Доска заданий, сгруппированных по категориям и очкам; решаете любые в любом порядке, флаг каждого стоит указанных очков. Труднее задание — больше очков. Соревнуетесь по общему счёту.

**Attack-Defense** — каждая команда запускает идентичные уязвимые сервисы и должна *латать свои*, *эксплуатируя чужие*, вживую. Очки за кражу флагов у соперников и поддержание своих сервисов. Это напряжённо, командно, и здесь наступательная и защитная половины программы встречаются в реальном времени (урок 6).

## Категории

Каждая категория соответствует пройденному модулю:

- **Web** — уязвимости модуля 3: инъекция, XSS, IDOR, SSRF. Найди изъян, доберись до флага.
- **Crypto** — модуль 4: опознай схему, сломай неправильное применение, декодируй флаг.
- **Forensics** — модуль 7: образ диска, pcap, дамп памяти с флагом внутри.
- **Reversing (rev)** — анализируй бинарник, чтобы понять его и извлечь флаг. Здесь новое; вводится в уроке 5.
- **Pwn (эксплуатация бинарников)** — эксплуатируй баги памяти работающего бинарника ради шелла. Новое; урок 5.
- **OSINT** — пассивная разведка модуля 5: найди флаг в публичной информации.
- **Stego / Misc** — скрытые данные (вырезание и метаданные модуля 7) и всё, что никуда не влезает.

Опознать, какая категория на самом деле — «crypto», что на деле кодирование, «web», что на деле утечка git — половина битвы, и это навык, натренированный каждым прошлым модулем.

## Начисление очков и таблица лидеров

- **Статическое начисление** — задание стоит фиксированное число очков.
- **Динамическое начисление** — задание стоит больше, когда его решили немногие, и его цена *падает* по мере решений. Это поощряет решать трудные редкие задания первыми.
- **First blood** — первая команда, решившая задание; часто отмечается, иногда даёт бонус.

Таблица ранжирует по общему счёту, ничьи обычно разрешаются тем, кто набрал раньше. На этой платформе ваши решения питают ту же таблицу, что вы видели с модуля 1.

## Где соревноваться

- **Эта платформа** — начните здесь; каждое задание построено для практики именно этих навыков.
- **picoCTF** — дружелюбна к новичкам, всегда доступна, отлична для обучения.
- **Hack The Box, TryHackMe** — направляемые машины и задания, от лёгких до экспертных.
- **CTFtime.org** — календарь живых соревнований по миру; найдите команду и сыграйте настоящее событие.

## Попробуйте

1. На этой платформе откройте раздел CTF. Какие категории есть и какому модулю соответствует каждая?
2. Выберите задание с наименьшими очками в сильной для вас категории и решите от начала до конца.
3. Отметьте формат флага. После каждого декодирования или эксплойта спрашивайте: похож ли вывод на `flag{...}`?""",
        "questions": [
            q("In a jeopardy CTF, how do you score?",
              "Jeopardy CTF'da qanday ball olasiz?",
              "Как набирают очки в jeopardy CTF?",
              ["Solve challenges to find flags, each worth its listed points",
               "Keep your own services online", "Defend a network for the longest time",
               "Answer multiple-choice questions"],
              ["Flaglar topish uchun challenge'larни yeching, har biri ko'rsatilgan ballга teng",
               "O'z xizmatlaringizni onlaynда saqlang", "Tarmoqni eng uzoq himoya qiling",
               "Ko'p tanlovли savollarга javob bering"],
              ["Решаете задания ради флагов, каждый стоит указанных очков",
               "Держите свои сервисы онлайн", "Дольше всех защищаете сеть",
               "Отвечаете на вопросы с выбором"], 0),
            q("Recognising that a 'crypto' challenge is actually just base64 encoding is:",
              "'Crypto' challenge aslida shunchaki base64 kodlash ekanini tanish:",
              "Опознать, что «crypto»-задание на деле лишь base64-кодирование, — это:",
              ["Half the battle — identifying the real category first",
               "A waste of time", "Only relevant in forensics",
               "Impossible without the flag"],
              ["Jangning yarmi — avval haqiqiy kategoriyani aniqlash",
               "Vaqtni behuda sarflash", "Faqat forenzikada muhim",
               "Flagсиz imkonsiz"],
              ["Половина битвы — сначала опознать настоящую категорию",
               "Пустая трата времени", "Важно только в форензике",
               "Невозможно без флага"], 0),
            q("In attack-defense CTF, each team must:",
              "Attack-defense CTF'da har jamoa nima qilishi kerak:",
              "В attack-defense CTF каждая команда должна:",
              ["Patch its own vulnerable services while exploiting everyone else's",
               "Only defend, never attack", "Answer trivia questions",
               "Solve one flag and stop"],
              ["Boshqalarnikini ekspluatatsiya qilib, o'z zaif xizmatlarini yamash",
               "Faqat himoya qilish, hech qachon hujum qilmaslik", "Trivia savollarга javob berish",
               "Bitta flagni yechib to'xtash"],
              ["Латать свои уязвимые сервисы, эксплуатируя чужие",
               "Только защищаться, никогда не атаковать", "Отвечать на викторину",
               "Решить один флаг и остановиться"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "capstone", "points": 70,
        "title": "Methodology: how to actually solve a challenge",
        "titleUz": "Metodologiya: challenge'ni aslida qanday yechish",
        "titleRu": "Методология: как реально решать задание",
        "content": r"""Skill wins challenges; method wins competitions. Under time pressure, against a scoreboard, the difference between a good player and a frustrated one is a repeatable process — knowing what to try, in what order, and when to walk away.

## Start by enumerating the challenge itself

Before any clever idea, gather what you are given, exactly as recon taught for a target:

- **Read the prompt twice.** The title, the description, the hints — challenge authors hide direction there. "We found this on an old server" points at forensics or a git leak; "the admin is careless" points at access control.
- **Look at everything provided.** A file, a URL, a `nc host port`, source code. Run `file` on every download; open every link; read every line of source.
- **Note the category and points.** They tell you the expected technique and rough difficulty.

Half of CTF challenges are solved in this first pass, because the author left the path in plain sight for anyone who reads carefully.

## The per-category first moves

Each category has a reflex opening — the checks that solve the easy ones and orient you on the hard ones:

```
Web        → view source, /robots.txt, check cookies, try the obvious injection
Crypto     → identify: base64? hex? hash? RSA? then reach for the standard attack
Forensics  → file, binwalk, exiftool, strings, then the right tool for the type
Rev        → file, strings, then objdump/Ghidra to read what it does
Pwn        → checksec, find the input, look for the overflow
OSINT      → the name/handle/photo into search, crt.sh, social media
Misc/Stego → file, strings, binwalk, zsteg — is it what it claims to be?
```

These are the reflexes every prior module built. Running the right opening for the category is most of the work.

## Take notes as you go

You will try many things; without notes you repeat yourself and lose the thread. Keep a scratch file per challenge:

```
## web-300 : login bypass
- source leaked at /.git → downloaded
- login query concatenates input → sqli?
- ' OR '1'='1  → "invalid" (filtered on quotes?)
- tried /admin → 403 (exists!)
TODO: bypass the quote filter
```

This is the same structured note-taking from recon and forensics, now under a clock. It lets you put a challenge down and pick it up an hour later without starting over.

## Manage your time: know when to move on

The scoreboard rewards *total* points, not stubbornness. A disciplined player:

- **Sweeps for easy points first.** Solve every low-hanging challenge across categories before going deep on one hard one.
- **Time-boxes.** Stuck for 30–40 minutes with no new idea? Note where you are and move to another challenge. A fresh challenge often unblocks the stuck one when you return.
- **Plays to strengths early, stretches late.** Bank points in your strong categories, then spend the back half learning on the hard ones.

Beginners lose hours fixated on one challenge while easy points sit unsolved. The method is breadth first, depth second.

## When you are stuck

A checklist for the wall everyone hits:

1. **Re-read the prompt.** The hint you skimmed is usually the answer.
2. **Question your assumption.** You decided it was crypto — is it actually encoding? You assumed the input field — is it the cookie?
3. **Try the simplest thing you dismissed.** Default credentials, the obvious payload, `strings` on the file.
4. **Look at it from another category's angle.** A "web" challenge whose flag is in a leaked `.git` is really forensics.
5. **Search the exact error or string.** Someone has hit it before.

## Try it (on this platform or picoCTF)

1. Take one challenge and write its prompt, category, and everything provided into a notes file before trying anything.
2. Run the category's reflex opening. Did it solve it or orient you?
3. Deliberately time-box: give a challenge 30 minutes, then move on and come back. Did the break help?""",
        "contentUz": r"""Ko'nikma challenge'larни yutadi; usul musobaqalarни yutadi. Vaqt bosimида, reytingга qarshi, yaxshi o'yinchini asabiylashgandan ajratadigan narsa — takrorlanadigan jarayon: nimani, qaysi tartibда sinashni va qachon ketishni bilish.

## Challenge'ning o'zini sanashдан boshlang

Har qanday ayyor g'oyaдан oldin, berilganini yig'ing, aynan razvedka nishon uchun o'rgatgandек:

- **Taklifni ikki marta o'qing.** Sarlavha, tavsif, maslahatlar — challenge mualliflari yo'nalишni shu yerда yashiradi. "Buni eski serverда topdik" forenzika yoki git sizishiga ishora qiladi; "admin beparvo" kirish nazoratiga ishora qiladi.
- **Berilgan hamma narsaga qarang.** Fayl, URL, `nc host port`, manba kod. Har yuklab olishda `file` yuriting; har havolani oching; manbaning har satrини o'qing.
- **Kategoriya va ballni qayd qiling.** Ular kutilган texnika va taxminiy qiyinlikni aytadi.

CTF challenge'larining yarmi shu birinchi o'tишда yechiladi, chunki muallif yo'lni diqqat bilan o'qigan har kim uchun ko'z oldiда qoldirgan.

## Kategoriya bo'yicha birinchi harakatlar

Har kategoriyaning refleks ochilishi bor — osonlarini yechadigan va qiyinlarida yo'naltiradigan tekshiruvlar:

```
Web        → manbani ko'r, /robots.txt, cookie'larни tekshir, aniq in'ektsiyani sina
Crypto     → aniqla: base64? hex? xesh? RSA? keyin standart hujumга qo'l cho'z
Forensics  → file, binwalk, exiftool, strings, keyin tur uchun to'g'ri vosita
Rev        → file, strings, keyin nima qilishini o'qish uchun objdump/Ghidra
Pwn        → checksec, kirishni top, to'lib ketишni izla
OSINT      → nom/taxallus/rasm qidiruvга, crt.sh, ijtimoiy tarmoq
Misc/Stego → file, strings, binwalk, zsteg — u da'vo qilganidек narsami?
```

Bular — har oldingi modul qurgan reflekslar. Kategoriya uchun to'g'ri ochilishni yuritish — ishning aksari.

## Yo'l-yo'lakay qayd qiling

Ko'p narsa sinaysiz; qaydlarсиз o'zingizni takrorlaysiz va ipni yo'qotasiz. Har challenge uchun qoralama fayl saqlang:

```
## web-300 : login bypass
- manba /.git da sizib chiqди → yuklab olindi
- login so'rovi kirishni birlashtiradi → sqli?
- ' OR '1'='1  → "invalid" (tirnoqlarда filtrlangan?)
- /admin sinadim → 403 (mavjud!)
TODO: tirnoq filtrini chetlab o'tish
```

Bu — razvedka va forenzikadagi o'sha tuzilgan qayd, endi soat ostida. U challenge'ни qo'yib, bir soatдан keyin qaytadan boshlamasдан olishга imkon beradi.

## Vaqtingizni boshqaring: qachon ketishni biling

Reyting o'jarlikni emas, *umumiy* ballni rag'batlantiradi. Intizomli o'yinchi:

- **Avval oson ballларни supuradi.** Bitta qiyiniga chuqurlashishдан oldin kategoriyalar bo'ylab har past-osilgan challenge'ни yeching.
- **Vaqtni cheklaydi.** 30–40 daqiqa yangi g'oyaсиz tiqilib qoldingizmi? Qayerдaligizни qayd qiling va boshqasiga o'ting. Yangi challenge qaytganingizда tiqilib qolganини ko'pincha ochib beradi.
- **Erta kuchга o'ynaydi, kech cho'ziladi.** Kuchli kategoriyalarингизда ball to'plang, keyin ikkinchi yarmini qiyinlarда o'rganishga sarflang.

Boshlovchilar oson balllar yechilmай turgan holда bitta challenge'ga qadalib soatlar yo'qotadi. Usul — avval kenglik, keyin chuqurlik.

## Tiqilib qolganda

Hamma uriladigan devor uchun ro'yxat:

1. **Taklifni qayta o'qing.** Yuzaki ko'rgan maslahat odatда javob.
2. **Taxminingizga shubha qiling.** Crypto deb qaror qildingiz — u aslida kodlashми? Kirish maydoniни o'yladingiz — u cookie'mi?
3. **Rad etgan eng oddiy narsani sinang.** Sukut hisob ma'lumotlar, aniq payload, faylда `strings`.
4. **Boshqa kategoriya nuqtai nazаridan qarang.** Flagi sizib chiqqan `.git`да bo'lgan "web" challenge aslida forenzika.
5. **Aniq xato yoki satrни qidiring.** Kimdir undан oldin urilgan.

## Sinab ko'ring (bu platforma yoki picoCTF'да)

1. Bitta challenge'ni oling va biror narsani sinashдан oldin uning taklifi, kategoriyasi va berilgan hamma narsasini qaydlar fayliga yozing.
2. Kategoriyaning refleks ochilishini yuriting. U yechдими yoki yo'naltirdimi?
3. Ataylab vaqtни cheklang: challenge'ga 30 daqiqa bering, keyin o'ting va qayting. Tanaffus yordam berдими?""",
        "contentRu": r"""Навык выигрывает задания; метод выигрывает соревнования. Под давлением времени, против таблицы, разница между хорошим игроком и раздражённым — повторяемый процесс: знать, что пробовать, в каком порядке и когда уйти.

## Начните с перечисления самого задания

До всякой хитрой идеи соберите данное, как разведка учила для цели:

- **Прочтите условие дважды.** Заголовок, описание, подсказки — авторы прячут там направление. «Нашли на старом сервере» указывает на форензику или утечку git; «админ беспечен» — на контроль доступа.
- **Осмотрите всё данное.** Файл, URL, `nc host port`, исходник. Запускайте `file` на каждой загрузке; открывайте каждую ссылку; читайте каждую строку исходника.
- **Отметьте категорию и очки.** Они говорят об ожидаемой технике и примерной сложности.

Половина CTF-заданий решается на этом первом проходе, ведь автор оставил путь на виду для внимательного читателя.

## Первые ходы по категориям

У каждой категории есть рефлекторное начало — проверки, решающие лёгкие и ориентирующие на трудных:

```
Web        → исходник, /robots.txt, cookie, очевидная инъекция
Crypto     → опознай: base64? hex? хеш? RSA? затем стандартная атака
Forensics  → file, binwalk, exiftool, strings, затем инструмент под тип
Rev        → file, strings, затем objdump/Ghidra читать, что делает
Pwn        → checksec, найти ввод, искать переполнение
OSINT      → имя/ник/фото в поиск, crt.sh, соцсети
Misc/Stego → file, strings, binwalk, zsteg — это то, чем себя объявляет?
```

Это рефлексы, построенные каждым прошлым модулем. Запустить верное начало для категории — большая часть работы.

## Ведите заметки по ходу

Вы пробуете многое; без заметок повторяетесь и теряете нить. Держите черновик на задание:

```
## web-300 : обход логина
- исходник утёк на /.git → скачан
- запрос логина конкатенирует ввод → sqli?
- ' OR '1'='1  → "invalid" (фильтр на кавычки?)
- пробовал /admin → 403 (существует!)
TODO: обойти фильтр кавычек
```

Это те же структурированные заметки из разведки и форензики, теперь под часами. Позволяет отложить задание и вернуться через час, не начиная заново.

## Управляйте временем: знайте, когда уйти

Таблица награждает *общие* очки, не упрямство. Дисциплинированный игрок:

- **Сначала подметает лёгкие очки.** Решите каждое низко висящее задание по категориям, прежде чем углубляться в одно трудное.
- **Ограничивает время.** Застряли на 30–40 минут без новой идеи? Отметьте, где вы, и перейдите к другому. Свежее задание часто разблокирует застрявшее при возврате.
- **Играет на силе рано, тянется поздно.** Наберите очки в сильных категориях, затем вторую половину тратьте на обучение в трудных.

Новички теряют часы, зациклившись на одном задании, пока лёгкие очки не решены. Метод — сначала ширина, потом глубина.

## Когда застряли

Чек-лист для стены, в которую упираются все:

1. **Перечитайте условие.** Подсказка, которую вы пробежали, обычно и есть ответ.
2. **Усомнитесь в допущении.** Решили, что крипто — а это кодирование? Думали про поле ввода — а это cookie?
3. **Попробуйте простейшее, что отмели.** Учётки по умолчанию, очевидный пейлоад, `strings` на файле.
4. **Взгляните под углом другой категории.** «Web»-задание с флагом в утёкшем `.git` — на деле форензика.
5. **Поищите точную ошибку или строку.** Кто-то уже упирался.

## Попробуйте (на этой платформе или picoCTF)

1. Возьмите задание и запишите его условие, категорию и всё данное в файл заметок до попыток.
2. Запустите рефлекторное начало категории. Решило или сориентировало?
3. Намеренно ограничьте время: дайте заданию 30 минут, затем перейдите и вернитесь. Помог ли перерыв?""",
        "questions": [
            q("Under a scoreboard, what is the better overall strategy?",
              "Reyting ostida qaysi umumiy strategiya yaxshiroq?",
              "Под таблицей какая общая стратегия лучше?",
              ["Sweep easy points across categories first, then go deep on hard ones",
               "Fixate on the hardest challenge until solved", "Only attempt one category",
               "Solve challenges strictly in listed order"],
              ["Avval kategoriyalar bo'ylab oson ballларни supur, keyin qiyinlarга chuqurlash",
               "Yechilguncha eng qiyin challenge'ga qadal", "Faqat bitta kategoriyaга urin",
               "Challenge'larни qat'iy ro'yxat tartibида yech"],
              ["Сначала подмести лёгкие очки по категориям, затем углубляться в трудные",
               "Зациклиться на труднейшем до решения", "Пробовать только одну категорию",
               "Решать строго по списку"], 0),
            q("Why keep a notes file per challenge?",
              "Nega har challenge uchun qaydlar fayli saqlash kerak?",
              "Зачем вести файл заметок на задание?",
              ["To avoid repeating yourself and to resume without starting over",
               "It is required by the rules", "It scores bonus points",
               "It hides your work from opponents"],
              ["O'zingizni takrorlamaslik va qaytadan boshlamasдан davom etish uchun",
               "Bu qoidalар talab qiladi", "U bonus ball beradi",
               "U ishingizni raqiblardан yashiradi"],
              ["Чтобы не повторяться и возобновлять, не начиная заново",
               "Этого требуют правила", "Это даёт бонусные очки",
               "Это скрывает работу от соперников"], 0),
            q("You are stuck on a challenge for 40 minutes. The disciplined move is:",
              "Challenge'да 40 daqiqa tiqilib qoldingiz. Intizomli harakat:",
              "Вы застряли на задании 40 минут. Дисциплинированный ход:",
              ["Note where you are and move to another challenge, returning later",
               "Keep trying the same idea until it works", "Give up on the competition",
               "Ask an opponent for the flag"],
              ["Qayerдaligingizни qayd qilib, boshqa challenge'ga o'ting, keyin qayting",
               "Ishlaguncha o'sha g'oyani sinayvering", "Musobaqadan voz keching",
               "Raqibдан flag so'rang"],
              ["Отметить, где вы, и перейти к другому заданию, вернувшись позже",
               "Продолжать ту же идею, пока не сработает", "Бросить соревнование",
               "Попросить флаг у соперника"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "capstone", "points": 70,
        "title": "Web and crypto challenges in competition",
        "titleUz": "Musobaqada veb va kripto challenge'lari",
        "titleRu": "Web и crypto задания на соревновании",
        "content": r"""The two categories you are already strongest in — web and crypto — are where a CTF is won on speed. You know the vulnerabilities and the attacks; this lesson is about recognising them fast under the clock, and the recurring shapes CTF authors favour.

## Web: the CTF flavours of module 3

Web challenges are the module 3 vulnerabilities, dressed as puzzles. The reflex opening: view source, check `/robots.txt`, read the cookies, and try the obvious. Then match the challenge to its class:

- **SQL injection** — a login or search that concatenates input. The flag is usually in a hidden table; `UNION SELECT` or a blind extraction pulls it. `sqlmap` finishes what you spot by hand.
- **Command injection / SSTI** — a field reflected into a shell or a template. `;id`, `{{7*7}}`, `${7*7}` — if `49` comes back, the template evaluates your input.
- **IDOR / access control** — change an `id`, hit an endpoint the UI hides, swap a cookie's role. The flag sits behind an authorisation check that was never enforced.
- **File upload / LFI** — upload a webshell, or `?file=../../flag`. Path traversal to the flag file is a CTF staple.
- **The git leak** — an exposed `/.git` directory. `git-dumper` downloads it, `git log -p` reveals the flag committed and "removed" — really a forensics move wearing a web hat.

The CTF-specific reflexes: always check `/robots.txt`, `/.git`, `/backup`, source comments (`<!-- flag is... -->`), and hidden form fields. Authors love to leave the flag one careless step away.

## Crypto: identify, then apply the standard attack

Crypto challenges are won at the *identification* step — module 4's whole first lesson. Run the decision:

```
letters + =, /    → base64, decode
only 0-9 a-f      → hex (or a hash — check length)
32/40/64 hex      → MD5/SHA — crack with john + rockyou
-----BEGIN...     → a key; RSA → check the parameters
n and e given     → RSA → factordb, small-e, RsaCtfTool
readable-ish text → classical cipher → dcode.fr, frequency
two ciphertexts / hex key → XOR → single-byte brute or xortool
```

The CTF twist is that challenges are usually **misused** crypto, not broken algorithms — exactly module 4's central lesson. A small RSA modulus is on factordb; a repeating-key XOR falls to xortool; an "encrypted" flag is often just layered encoding that CyberChef's Magic peels in seconds.

## Layered encoding: peel until it reads

A common misc/crypto shape is a flag wrapped in several encodings — base64 of hex of ROT13. Decode, look, decode again:

```
$ echo 'NTM0YzY5NmU3NTc4' | base64 -d
534c696e7578
$ echo '534c696e7578' | xxd -r -p
SLinux
```

Two decodes, no cryptography at all. CyberChef's **Magic** mode detects and peels these automatically. The reflex: if the output is not the flag but still looks encoded, decode again.

## The flag format is your compass

Every step, check against the flag shape. On this platform, `flag{...}`. After any decode or exploit:

- Output starts with `flag{`? You are done, or nearly.
- Output is readable text but not a flag? Often a clue or a password for the next step.
- Output is noise? Wrong path — back up, re-identify.

Using the known format as a target turns guessing into a check: you know when you have arrived.

## Speed comes from reflexes, not cleverness

Under the clock, the fast solver is not smarter — they run the category's opening without hesitating. See a login form, try injection. See `flag{` reversed, reverse it. See 64 hex chars, reach for john. Every reflex here was drilled in modules 3 and 4; the competition just rewards running them without pause.

## Try it (on this platform or picoCTF web/crypto challenges)

1. On a web challenge, run the full reflex: source, robots.txt, .git, cookies. What did each reveal?
2. On a crypto challenge, identify the scheme before trying anything. Was it encoding, a hash, or real cipher?
3. Take a layered-encoding string and peel it by hand, checking after each step for the flag format.""",
        "contentUz": r"""Siz allaqachon eng kuchli bo'lgan ikki kategoriya — veb va kripto — CTF tezlikда yutiladigan joy. Siz zaifliklar va hujumlarни bilasiz; bu dars ularни soat ostida tez tanish va CTF mualliflari yoqtiradigan takrorlanuvchi shakllar haqida.

## Web: 3-modulning CTF ta'mlari

Veb challenge'lari — jumboq qilib kiyintirilgan 3-modul zaifliklari. Refleks ochilish: manbani ko'r, `/robots.txt`ni tekshir, cookie'larни o'qi va aniqni sina. Keyin challenge'ni sinfiga moslang:

- **SQL in'ektsiya** — kirishni birlashtiradigan login yoki qidiruv. Flag odatда yashirin jadvalда; `UNION SELECT` yoki ko'r ajratib olish uni tortadi. `sqlmap` qo'lда ko'rganingizni tugatadi.
- **Buyruq in'ektsiyasi / SSTI** — shell yoki shablonга aks etadigan maydon. `;id`, `{{7*7}}`, `${7*7}` — `49` qaytsa, shablon kirishingizni hisoblaydi.
- **IDOR / kirish nazorati** — `id`ni o'zgartir, UI yashiradigan endpointга ur, cookie rolini almashtir. Flag hech qachon amalga oshirilmagan avtorizatsiya tekshiruvi ortidа.
- **Fayl yuklash / LFI** — webshell yukla yoki `?file=../../flag`. Flag fayliga yo'ldan chiqish — CTF asosiy taomi.
- **Git sizishi** — ochilgan `/.git` katalogi. `git-dumper` uni yuklaydi, `git log -p` commit qilingan va "olib tashlangan" flagni oshkor qiladi — aslida veb shляpa kiygan forenzika harakati.

CTF'ga xos reflekslar: doim `/robots.txt`, `/.git`, `/backup`, manba izohlari (`<!-- flag ... -->`) va yashirin forma maydonlarини tekshir. Mualliflar flagni bitta beparvo qadam narida qoldirishни yaxshi ko'radi.

## Crypto: aniqla, keyin standart hujumni qo'lla

Kripto challenge'lari *aniqlash* qadamida yutiladi — 4-modulning butun birinchi darsi. Qarorni yurit:

```
harflar + =, /    → base64, dekodla
faqat 0-9 a-f     → hex (yoki xesh — uzunlikни tekshir)
32/40/64 hex      → MD5/SHA — john + rockyou bilan buz
-----BEGIN...     → kalit; RSA → parametrlarni tekshir
n va e berilgan   → RSA → factordb, kichik-e, RsaCtfTool
o'qiladigan matn  → klassik shifr → dcode.fr, chastota
ikki shifrmatn / hex kalit → XOR → bir baytли brute yoki xortool
```

CTF burilishi shundaki, challenge'lar odatда buzilgan algoritm emas, **noto'g'ri ishlatilgan** kripto — aynan 4-modulning markaziy darsi. Kichik RSA moduli factordb'да; takrorlanuvchi kalitли XOR xortool'ga yiqiladi; "shifrlangan" flag ko'pincha CyberChef Magic soniyalarда archiydigan qatlamli kodlash.

## Qatlamli kodlash: o'qilguncha archi

Keng tarqalgan misc/kripto shakl — bir necha kodlashга o'ralgan flag — ROT13'ning hex'ining base64'i. Dekodla, qara, yana dekodla:

```
$ echo 'NTM0YzY5NmU3NTc4' | base64 -d
534c696e7578
$ echo '534c696e7578' | xxd -r -p
SLinux
```

Ikki dekodlash, umuman kriptografiyasiz. CyberChef'ning **Magic** rejimi bularni avtomatik aniqlaydi va archiydi. Refleks: chiqish flag emas, lekin hali kodlangandек ko'rinса, yana dekodla.

## Flag formati — kompasingiz

Har qadam flag shakliga qarshi tekshiring. Bu platformada `flag{...}`. Har dekodlash yoki ekspluatatsiyadan keyin:

- Chiqish `flag{` bilan boshlanadimi? Tugadingiz yoki deyarli.
- Chiqish o'qiladigan matn, lekin flag emasmi? Ko'pincha keyingi qadam uchun ma'lumot yoki parol.
- Chiqish shovqinmi? Noto'g'ri yo'l — orqага qayting, qayta aniqlang.

Ma'lum formatni nishon sifatида ishlatish taxminni tekshiruvга aylantiradi: yetganingizni bilasiz.

## Tezlik ayyorlikдан emas, reflekslardан keladi

Soat ostida tez yechuvchi aqlliroq emas — u kategoriyaning ochilishini ikkilanmasдан yuritadi. Login formani ko'r, in'ektsiyani sina. Teskari `flag{`ни ko'r, teskarilang. 64 hex belgini ko'r, john'ga qo'l cho'z. Bu yerдаgi har refleks 3 va 4-modullarда mashq qilingan; musobaqa faqat ularni to'xtamasдан yuritishni rag'batlantiradi.

## Sinab ko'ring (bu platforma yoki picoCTF veb/kripto challenge'larida)

1. Veb challenge'да to'liq refleksni yurit: manba, robots.txt, .git, cookie'lar. Har biri nimani oshkor qildi?
2. Kripto challenge'да biror narsani sinashдан oldin sxemani aniqla. U kodlash, xesh yoki haqiqiy shifr edimi?
3. Qatlamli-kodlash satrini oling va qo'lда archi, har qadamдан keyin flag formatini tekshirib.""",
        "contentRu": r"""Две категории, в которых вы уже сильнее всего — web и crypto — там CTF выигрывается на скорости. Вы знаете уязвимости и атаки; этот урок о том, как быстро их опознавать под часами, и о повторяющихся формах, которые любят авторы CTF.

## Web: CTF-разновидности модуля 3

Web-задания — уязвимости модуля 3, наряженные в головоломки. Рефлекторное начало: исходник, `/robots.txt`, cookie, очевидное. Затем сопоставьте задание с классом:

- **SQL-инъекция** — логин или поиск, конкатенирующий ввод. Флаг обычно в скрытой таблице; `UNION SELECT` или слепое извлечение его тянет. `sqlmap` доделает замеченное вручную.
- **Инъекция команд / SSTI** — поле, отражённое в оболочку или шаблон. `;id`, `{{7*7}}`, `${7*7}` — если вернулось `49`, шаблон вычисляет ваш ввод.
- **IDOR / контроль доступа** — смените `id`, ударьте по эндпоинту, скрытому UI, подмените роль в cookie. Флаг за проверкой авторизации, которой не было.
- **Загрузка файла / LFI** — залейте вебшелл или `?file=../../flag`. Обход пути к файлу флага — классика CTF.
- **Утечка git** — открытый каталог `/.git`. `git-dumper` его скачает, `git log -p` покажет закоммиченный и «удалённый» флаг — на деле форензический ход в веб-шляпе.

CTF-специфичные рефлексы: всегда проверяйте `/robots.txt`, `/.git`, `/backup`, комментарии исходника (`<!-- flag ... -->`) и скрытые поля формы. Авторы любят оставлять флаг в одном небрежном шаге.

## Crypto: опознай, затем применяй стандартную атаку

Крипто-задания выигрываются на шаге *опознания* — весь первый урок модуля 4. Прогоните решение:

```
буквы + =, /      → base64, декодировать
только 0-9 a-f    → hex (или хеш — проверь длину)
32/40/64 hex      → MD5/SHA — взлом john + rockyou
-----BEGIN...     → ключ; RSA → проверить параметры
даны n и e        → RSA → factordb, малый-e, RsaCtfTool
почти читаемо     → классический шифр → dcode.fr, частота
два шифртекста / hex-ключ → XOR → однобайтовый перебор или xortool
```

Поворот CTF в том, что задания обычно — **неправильно применённая** крипта, а не сломанные алгоритмы — ровно центральный урок модуля 4. Малый модуль RSA есть на factordb; XOR с повторяющимся ключом падает от xortool; «зашифрованный» флаг часто лишь слоёное кодирование, которое Magic в CyberChef снимает за секунды.

## Слоёное кодирование: снимай, пока не прочитается

Частая форма misc/crypto — флаг, завёрнутый в несколько кодировок — base64 от hex от ROT13. Декодируй, смотри, декодируй снова:

```
$ echo 'NTM0YzY5NmU3NTc4' | base64 -d
534c696e7578
$ echo '534c696e7578' | xxd -r -p
SLinux
```

Два декодирования, никакой криптографии. Режим **Magic** в CyberChef распознаёт и снимает их автоматически. Рефлекс: если вывод не флаг, но всё ещё выглядит закодированным, декодируй снова.

## Формат флага — ваш компас

На каждом шаге сверяйтесь с формой флага. На этой платформе `flag{...}`. После любого декодирования или эксплойта:

- Вывод начинается с `flag{`? Готово или почти.
- Вывод — читаемый текст, но не флаг? Часто подсказка или пароль для следующего шага.
- Вывод — шум? Неверный путь — вернитесь, переопознайте.

Использование известного формата как цели превращает гадание в проверку: вы знаете, когда добрались.

## Скорость от рефлексов, не от ума

Под часами быстрый решатель не умнее — он запускает начало категории без колебаний. Видит форму логина — пробует инъекцию. Видит перевёрнутый `flag{` — переворачивает. Видит 64 hex — тянется к john. Каждый рефлекс здесь отработан в модулях 3 и 4; соревнование лишь награждает их запуск без паузы.

## Попробуйте (на этой платформе или web/crypto заданиях picoCTF)

1. На web-задании запустите полный рефлекс: исходник, robots.txt, .git, cookie. Что показало каждое?
2. На crypto-задании опознайте схему до попыток. Это было кодирование, хеш или настоящий шифр?
3. Возьмите слоёную строку и снимайте вручную, проверяя после каждого шага формат флага.""",
        "questions": [
            q("An exposed /.git directory on a web challenge is best handled by:",
              "Veb challenge'даги ochilgan /.git katalogini eng yaxshi qanday hal qilinadi:",
              "Открытый каталог /.git на web-задании лучше всего обработать:",
              ["Dumping it and reading git history for the flag (a forensics move)",
               "Ignoring it", "Brute-forcing the login", "Running sqlmap"],
              ["Uni yuklab, flag uchun git tarixini o'qish (forenzika harakati)",
               "Uni e'tiborsiz qoldirish", "Login'ni brute-force qilish", "sqlmap yuritish"],
              ["Скачав его и прочитав историю git для флага (форензический ход)",
               "Игнорировать", "Брутфорсить логин", "Запустить sqlmap"], 0),
            q("Most CTF crypto challenges are:",
              "Aksar CTF kripto challenge'lari:",
              "Большинство CTF-крипто-заданий — это:",
              ["Misused crypto or layered encoding, not broken algorithms",
               "Unbreakable modern ciphers", "Always AES-256",
               "Impossible without a supercomputer"],
              ["Noto'g'ri ishlatilgan kripto yoki qatlamli kodlash, buzilgan algoritm emas",
               "Buzib bo'lmaydigan zamonaviy shifrlar", "Doim AES-256",
               "Superkompyutersиz imkonsiz"],
              ["Неправильно применённая крипта или слоёное кодирование, не сломанные алгоритмы",
               "Невзламываемые современные шифры", "Всегда AES-256",
               "Невозможны без суперкомпьютера"], 0),
            q("After a decode step, the output is readable text but not the flag. This usually means:",
              "Dekodlashдан keyin chiqish o'qiladigan matn, lekin flag emas. Bu odatда nimani bildiradi:",
              "После декодирования вывод — читаемый текст, но не флаг. Это обычно значит:",
              ["It is a clue or a value for the next step — keep going",
               "The challenge is broken", "You must restart the competition",
               "The flag was already submitted"],
              ["Bu keyingi qadam uchun ma'lumot yoki qiymat — davom eting",
               "Challenge buzilgan", "Musobaqani qaytadan boshlash kerak",
               "Flag allaqachon topshirilgan"],
              ["Это подсказка или значение для следующего шага — продолжайте",
               "Задание сломано", "Нужно перезапустить соревнование",
               "Флаг уже сдан"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "capstone", "points": 70,
        "title": "Forensics, steganography, and OSINT challenges",
        "titleUz": "Forenzika, steganografiya va OSINT challenge'lari",
        "titleRu": "Форензика, стеганография и OSINT задания",
        "content": r"""These categories reward patience and a fixed checklist over cleverness. Forensics and stego challenges hand you a file that is hiding something; OSINT challenges hide the flag in public information. Both are won by methodically running the right sequence — the skills of module 7 and module 5's recon.

## Forensics: the file is hiding the flag

A forensics challenge gives you a disk image, a pcap, a memory dump, or an odd file, with the flag somewhere inside. The reflex sequence from module 7, every time:

```
1. file blob            — what is it really?
2. strings blob | grep -i flag   — is the flag just sitting in plaintext?
3. exiftool blob        — is it in the metadata?
4. binwalk blob         — is another file embedded? binwalk -e to extract
5. foremost -i blob     — carve out hidden files
6. for a pcap:  tshark / Wireshark → follow streams, export objects
7. for memory:  volatility → pslist, cmdline, dumpfiles
8. for a disk:  mount read-only, fls -rd for deleted, mactime for a timeline
```

`strings | grep flag` alone solves a surprising share — authors often leave the flag readable in the file. When it does not, the type decides the tool: a pcap goes to tshark, a `.raw` to volatility, a disk image to the Sleuth Kit. You have every one of these from module 7.

## Steganography: not what it claims to be

Stego challenges hide data *inside* a normal-looking file — usually an image. The tells and tools:

- **`file` vs reality** — `file` says PNG, `binwalk` finds a ZIP inside. Extract it.
- **Appended data** — content after a JPEG's `FF D9` end marker. `binwalk` and `foremost` find it.
- **LSB in images** — a message in the low bits. `zsteg` (PNG/BMP) and `stegsolve` reveal it.
- **Password-protected stego** — `steghide extract -sf image.jpg` (often the passphrase is a clue from the prompt).
- **Audio stego** — a spectrogram of a WAV can literally spell the flag; open it in Audacity or Sonic Visualiser.

```
$ zsteg image.png
b1,rgb,lsb,xy  .. text: "flag{h1dden_1n_p1x3ls}"
```

The reflex: an image in a CTF is rarely just an image. Run `file`, `binwalk`, `exiftool`, `strings`, then the stego-specific tools.

## OSINT: the flag is public

OSINT challenges give you a name, a photo, a username, or a post, and the flag lives in public information you have to find. This is module 5's passive recon as a puzzle:

- **A username** — search it across platforms (a tool like `sherlock` finds accounts with the same handle).
- **A photo** — reverse image search (Google, Yandex) to find where it came from; `exiftool` for GPS coordinates baked into it.
- **A person or company** — social media, `crt.sh` for subdomains, `whois`, public records.
- **A location** — landmarks in a photo, street signs, the sun's angle, cross-referenced with maps.

The flag might be a caption on a found photo, a subdomain in a certificate log, or a detail in an old post. OSINT rewards the same methodical, source-by-source sweep recon taught — and nothing here touches a system you do not own, because it is all public.

## The mindset these share

Forensics, stego and OSINT are not about a flash of insight; they are about running a checklist completely before concluding there is nothing. The player who loses says "I ran strings, nothing." The player who wins ran strings, binwalk, exiftool, zsteg, and *then* found it in the LSBs. Thoroughness beats cleverness in these categories every time.

## Try it (on this platform or picoCTF forensics/OSINT)

1. On a forensics file, run the full sequence — file, strings, exiftool, binwalk, foremost. Which step found something?
2. On an image you suspect has stego, try `zsteg` (PNG) or check for data after the end marker.
3. On an OSINT challenge with a username, search it across platforms. Where does the trail lead?""",
        "contentUz": r"""Bu kategoriyalar ayyorlikдан ko'ra sabr va belgilangan ro'yxatni rag'batlantiradi. Forenzika va stego challenge'lari sizga biror narsa yashirayotgan fayl beradi; OSINT challenge'lari flagni ommaviy ma'lumotда yashiradi. Ikkalasi ham to'g'ri ketma-ketlikni uslubiy yuritish bilan yutiladi — 7-modul va 5-modul razvedkasi ko'nikmalari.

## Forensics: fayl flagni yashiryapti

Forenzika challenge'i sizga disk tasviri, pcap, xotira dampi yoki g'alati fayl beradi, flag ichida qayerдadir. 7-moduldan refleks ketma-ketlik, har safar:

```
1. file blob            — u aslida nima?
2. strings blob | grep -i flag   — flag shunchaki ochiq matnда turibdimi?
3. exiftool blob        — u metama'lumotдами?
4. binwalk blob         — boshqa fayl ko'milganmi? ajratish uchun binwalk -e
5. foremost -i blob     — yashirin fayllarni kesib ol
6. pcap uchun:  tshark / Wireshark → oqimlarni kuzat, obyektlarni eksport qil
7. xotira uchun:  volatility → pslist, cmdline, dumpfiles
8. disk uchun:  faqat-o'qish mount, o'chirilganlar uchun fls -rd, vaqt chizig'i uchun mactime
```

Yolg'iz `strings | grep flag` hayratlanarli qismini yechadi — mualliflar ko'pincha flagni faylда o'qiladigan qoldiradi. Yechmaganda, tur vositани hal qiladi: pcap tshark'ga, `.raw` volatility'ga, disk tasviri Sleuth Kit'ga. Bularning har biri sizда 7-moduldan bor.

## Steganografiya: da'vo qilgani emas

Stego challenge'lari ma'lumotni oddiy ko'rinadigan fayl *ichida* yashiradi — odatда rasm. Belgilar va vositalar:

- **`file` va haqiqat** — `file` PNG deydi, `binwalk` ichида ZIP topadi. Ajratib ol.
- **Qo'shilgan ma'lumot** — JPEG'ning `FF D9` oxir belgisidан keyingi kontent. `binwalk` va `foremost` topadi.
- **Rasmlarда LSB** — past bitlarдаgi xabar. `zsteg` (PNG/BMP) va `stegsolve` ochadi.
- **Parol bilan himoyalangan stego** — `steghide extract -sf image.jpg` (parol ko'pincha taklifдан ma'lumot).
- **Audio stego** — WAV spektrogrammasi flagni tom ma'noда yozishi mumkin; Audacity yoki Sonic Visualiser'да oching.

```
$ zsteg image.png
b1,rgb,lsb,xy  .. text: "flag{h1dden_1n_p1x3ls}"
```

Refleks: CTF'даgi rasm kamdан-kam shunchaki rasm. `file`, `binwalk`, `exiftool`, `strings`, keyin stego'ga xos vositalarни yurit.

## OSINT: flag ommaviy

OSINT challenge'lari sizga nom, rasm, foydalanuvchi nomi yoki post beradi, va flag siz topishingiz kerak bo'lgan ommaviy ma'lumotда yashaydi. Bu — jumboq sifatidаgi 5-modulning passiv razvedkasi:

- **Foydalanuvchi nomi** — uni platformalar bo'ylab qidiring (`sherlock` kabi vosita bir xil taxallusли hisoblarни topadi).
- **Rasm** — qayerдан kelganини topish uchun teskari rasm qidiruvi (Google, Yandex); ichига kiritilgan GPS koordinatalari uchun `exiftool`.
- **Shaxs yoki kompaniya** — ijtimoiy tarmoq, subdomenlar uchun `crt.sh`, `whois`, ommaviy yozuvlar.
- **Joy** — rasmdаgi diqqatga sazovor joylar, ko'cha belgilari, quyosh burchagi, xaritalar bilan solishtirilган.

Flag topilgan rasmdаgi sarlavha, sertifikat logidаgi subdomen yoki eski postdаgi tafsilot bo'lishi mumkin. OSINT razvedka o'rgatgan o'sha uslubiy, manbама-manba supurishni rag'batlantiradi — va bu yerда hech narsa sizга tegishli bo'lmagan tizimga tegmaydi, chunki hammasi ommaviy.

## Bularning umumiy tafakkuri

Forenzika, stego va OSINT tushunish chaqnashi haqida emas; ular hech narsa yo'q deb xulosа qilishдан oldin ro'yxatni to'liq yuritish haqida. Yutqazadigan o'yinchi "strings yugurtirdim, hech narsa" deydi. Yutadigan o'yinchi strings, binwalk, exiftool, zsteg yugurtirди va *keyin* uni LSB'larда topди. Bu kategoriyalarда puxtalik ayyorlikni har safar yengadi.

## Sinab ko'ring (bu platforma yoki picoCTF forenzika/OSINT)

1. Forenzik faylда to'liq ketma-ketlikni yurit — file, strings, exiftool, binwalk, foremost. Qaysi qadam biror narsa topди?
2. Stego bor deb gumon qilgan rasmда `zsteg` (PNG) sinang yoki oxir belgisidан keyin ma'lumotни tekshiring.
3. Foydalanuvchi nomli OSINT challenge'да uni platformalar bo'ylab qidiring. Iz qayerга olib boradi?""",
        "contentRu": r"""Эти категории награждают терпение и фиксированный чек-лист, а не находчивость. Задания форензики и стего дают файл, что-то прячущий; OSINT-задания прячут флаг в публичной информации. Оба выигрываются методичным запуском верной последовательности — навыков модуля 7 и разведки модуля 5.

## Форензика: файл прячет флаг

Форензическое задание даёт образ диска, pcap, дамп памяти или странный файл с флагом где-то внутри. Рефлекторная последовательность из модуля 7, каждый раз:

```
1. file blob            — что это на самом деле?
2. strings blob | grep -i flag   — флаг просто лежит открытым текстом?
3. exiftool blob        — он в метаданных?
4. binwalk blob         — встроен ли другой файл? binwalk -e для извлечения
5. foremost -i blob     — вырезать скрытые файлы
6. для pcap:  tshark / Wireshark → следить за потоками, экспорт объектов
7. для памяти:  volatility → pslist, cmdline, dumpfiles
8. для диска:  монтировать только чтение, fls -rd для удалённых, mactime для хронологии
```

Один `strings | grep flag` решает удивительную долю — авторы часто оставляют флаг читаемым в файле. Когда нет, тип решает инструмент: pcap к tshark, `.raw` к volatility, образ диска к Sleuth Kit. Всё это у вас есть из модуля 7.

## Стеганография: не то, чем себя объявляет

Стего-задания прячут данные *внутри* нормально выглядящего файла — обычно изображения. Признаки и инструменты:

- **`file` против реальности** — `file` говорит PNG, `binwalk` находит ZIP внутри. Извлеки.
- **Дописанные данные** — контент после маркера конца JPEG `FF D9`. `binwalk` и `foremost` находят.
- **LSB в изображениях** — сообщение в младших битах. `zsteg` (PNG/BMP) и `stegsolve` его выявляют.
- **Стего с паролем** — `steghide extract -sf image.jpg` (пароль часто подсказка из условия).
- **Аудио-стего** — спектрограмма WAV может буквально написать флаг; откройте в Audacity или Sonic Visualiser.

```
$ zsteg image.png
b1,rgb,lsb,xy  .. text: "flag{h1dden_1n_p1x3ls}"
```

Рефлекс: изображение в CTF редко просто изображение. Запустите `file`, `binwalk`, `exiftool`, `strings`, затем стего-специфичные инструменты.

## OSINT: флаг публичен

OSINT-задания дают имя, фото, ник или пост, и флаг живёт в публичной информации, которую надо найти. Это пассивная разведка модуля 5 как головоломка:

- **Ник** — ищите его по платформам (инструмент вроде `sherlock` находит аккаунты с тем же хэндлом).
- **Фото** — обратный поиск по картинке (Google, Yandex), чтобы найти источник; `exiftool` для GPS-координат внутри.
- **Человек или компания** — соцсети, `crt.sh` для поддоменов, `whois`, публичные записи.
- **Локация** — ориентиры на фото, уличные знаки, угол солнца, сверенные с картами.

Флаг может быть подписью к найденному фото, поддоменом в логе сертификатов или деталью в старом посте. OSINT награждает ту же методичную развёртку источник-за-источником, чему учила разведка — и здесь ничто не касается системы, которой вы не владеете, ведь всё публично.

## Общее мышление

Форензика, стего и OSINT не о вспышке озарения; они о полном прогоне чек-листа до вывода, что ничего нет. Проигравший говорит «запустил strings, ничего». Победитель запустил strings, binwalk, exiftool, zsteg и *затем* нашёл в LSB. В этих категориях тщательность бьёт находчивость каждый раз.

## Попробуйте (на этой платформе или forensics/OSINT picoCTF)

1. На форензическом файле запустите полную последовательность — file, strings, exiftool, binwalk, foremost. Какой шаг нашёл что-то?
2. На изображении с подозрением на стего попробуйте `zsteg` (PNG) или проверьте данные после маркера конца.
3. На OSINT-задании с ником ищите его по платформам. Куда ведёт след?""",
        "questions": [
            q("What single command solves a surprising share of forensics challenges?",
              "Qaysi bitta buyruq forenzika challenge'larining hayratlanarli qismini yechadi?",
              "Какая одна команда решает удивительную долю форензических заданий?",
              ["strings blob | grep -i flag — the flag is often in plaintext",
               "chmod 777 blob", "rm blob", "ping the challenge"],
              ["strings blob | grep -i flag — flag ko'pincha ochiq matnда",
               "chmod 777 blob", "rm blob", "challenge'ни ping qilish"],
              ["strings blob | grep -i flag — флаг часто открытым текстом",
               "chmod 777 blob", "rm blob", "пинговать задание"], 0),
            q("An image in a CTF that `file` calls PNG but `binwalk` finds a ZIP inside is:",
              "CTF'даги `file` PNG deydigan, lekin `binwalk` ichида ZIP topadigan rasm:",
              "Изображение в CTF, которое `file` зовёт PNG, но `binwalk` находит ZIP внутри:",
              ["Steganography — extract the embedded data",
               "A corrupted file, discard it", "Always a dead end", "A crypto challenge"],
              ["Steganografiya — ko'milgan ma'lumotни ajrat",
               "Buzilgan fayl, tashla", "Doim boshi berk", "Kripto challenge"],
              ["Стеганография — извлеки встроенные данные",
               "Битый файл, выбросьте", "Всегда тупик", "Крипто-задание"], 0),
            q("OSINT challenges are solved using:",
              "OSINT challenge'lari nima bilan yechiladi:",
              "OSINT-задания решаются с помощью:",
              ["Public information — searches, reverse image, crt.sh, social media",
               "Exploiting the target's server", "Brute-forcing passwords",
               "Reverse engineering a binary"],
              ["Ommaviy ma'lumot — qidiruvlar, teskari rasm, crt.sh, ijtimoiy tarmoq",
               "Nishon serverini ekspluatatsiya qilish", "Parollarни brute-force qilish",
               "Binarni teskari muhandislik"],
              ["Публичной информации — поиск, обратный поиск фото, crt.sh, соцсети",
               "Эксплуатации сервера цели", "Перебора паролей",
               "Реверс-инжиниринга бинарника"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "capstone", "points": 80,
        "title": "Reversing and pwn: the binary categories",
        "titleUz": "Reversing va pwn: binar kategoriyalar",
        "titleRu": "Reversing и pwn: бинарные категории",
        "content": r"""Two categories are new: **reversing** (understand a compiled program) and **pwn** (exploit its memory bugs). They are the deepest end of CTF and a field of their own — this lesson is an honest orientation, enough to solve entry-level challenges and to know what you are looking at, not a full course.

## Reversing: read what a binary does

A rev challenge gives you a compiled program — often one that asks for a password and prints the flag if you get it right. Your job is to understand it well enough to find or compute that input. The opening moves:

```
$ file crackme            — architecture, is it stripped?
$ strings crackme         — readable text: the password? the flag? library calls?
$ ./crackme               — run it (in a VM/sandbox): what does it want?
```

`strings` alone solves easy rev challenges — the password or flag is sometimes a plain string in the binary. When it is not, you read the code.

## Reading the disassembly

`objdump -d` disassembles the binary to assembly:

```
$ objdump -d crackme | grep -A5 '<main>:'
0000000000001139 <main>:
    1139:  55                    push   %rbp
    113a:  48 89 e5              mov    %rsp,%rbp
    113d:  48 8d 05 c0 0e 00 00  lea    0xec0(%rip),%rax
```

That is real output. Reading raw assembly is slow, so most players use a **decompiler** that reconstructs C-like code: **Ghidra** (free, from the NSA) or IDA. Ghidra turns the disassembly into readable pseudo-C where you can see the password comparison directly — `if (input == "s3cr3t")` — and read off the answer. For dynamic analysis, **gdb** (with the `pwndbg` or `gef` plugin) runs the binary step by step, letting you watch registers and memory and set breakpoints at the check.

The rev workflow: `strings` first, then Ghidra to read the logic, then gdb to confirm at runtime. Entry-level challenges fall to `strings` and a glance at Ghidra's output.

## Pwn: exploit the binary's memory

Pwn (binary exploitation) is the offensive side: the binary is running as a service (`nc host port`), and it has a memory-safety bug you exploit to hijack it — usually for a shell that reads the flag. The classic bug is the **buffer overflow**: the program reads more input than its buffer holds, and the excess overwrites adjacent memory, including the saved return address. Control the return address and you control execution.

First, see what protections are on:

```
$ checksec crackme
    Arch:     amd64
    Stack:    No canary found        ← overflow is not detected
    NX:       NX enabled             ← cannot run code on the stack
    PIE:      No PIE                 ← addresses are fixed, easier
```

`checksec` reads the mitigations: a **stack canary** detects overflows, **NX** stops code on the stack, **PIE/ASLR** randomises addresses. Which are off tells you which technique is in play. A binary with no canary and no PIE is the classic teaching overflow.

## The pwn toolkit

**pwntools** is the Python library that makes exploitation scriptable — connect, send a crafted payload, receive the shell:

```python
from pwn import *
p = remote("host", 1337)
payload = b"A"*72 + p64(0x401156)   # overflow the buffer, overwrite return address
p.sendline(payload)
p.interactive()                      # drop into the shell you got
```

`p64()` packs an address; the `b"A"*72` fills the buffer up to the return address, found with gdb. This is the entry-level shape; real pwn goes into ROP chains, format strings, and heap exploitation — deep, rewarding, and a specialisation on its own.

## Where these fit in your journey

Rev and pwn are the hardest CTF categories and the most respected — they reward deep systems knowledge and are a direct path to careers in exploit development and vulnerability research. This lesson makes you literate: you can solve `strings`-and-Ghidra rev challenges and simple overflow pwns, and you know exactly what to study next if this is the direction that grips you. Many world-class hackers started precisely here, with one crackme and one overflow.

## Try it (on picoCTF's rev/pwn — the best beginner set)

1. `file` and `strings` a simple crackme. Is the password or flag just sitting in the binary?
2. Open a crackme in Ghidra; find the comparison that checks the input. What is it comparing against?
3. `checksec` a pwn binary. Which protections are off, and what does that let you try?""",
        "contentUz": r"""Ikki kategoriya yangi: **reversing** (kompilyatsiyalangan dasturni tushunish) va **pwn** (uning xotira xatolarini ekspluatatsiya qilish). Ular CTF'ning eng chuqur uchi va o'z sohasi — bu dars halol yo'naltirish, boshlang'ich challenge'larni yechish va nimaga qarayotganingizni bilishга yetarli, to'liq kurs emas.

## Reversing: binar nima qilishini o'qish

Rev challenge'i sizga kompilyatsiyalangan dastur beradi — ko'pincha parol so'raydigan va to'g'ri bergangizда flag chiqaradigani. Vazifangiz — uni o'sha kirishni topish yoki hisoblashга yetarli tushunish. Ochilish harakatlari:

```
$ file crackme            — arxitektura, u stripped'mi?
$ strings crackme         — o'qiladigan matn: parol? flag? kutubxona chaqiruvlari?
$ ./crackme               — yurit (VM/sandbox'да): u nima xohlaydi?
```

Yolg'iz `strings` oson rev challenge'larni yechadi — parol yoki flag ba'zан binarда oddiy satr. U bo'lmaganда, kodni o'qiysiz.

## Disassembly'ni o'qish

`objdump -d` binarni assemblyга disassemble qiladi:

```
$ objdump -d crackme | grep -A5 '<main>:'
0000000000001139 <main>:
    1139:  55                    push   %rbp
    113a:  48 89 e5              mov    %rsp,%rbp
    113d:  48 8d 05 c0 0e 00 00  lea    0xec0(%rip),%rax
```

Bu — haqiqiy chiqish. Xom assemblyни o'qish sekin, shuning uchun aksar o'yinchilar C'ga o'xshash kodni qayta tiklaydigan **dekompilyator** ishlatadi: **Ghidra** (bepul, NSA'дан) yoki IDA. Ghidra disassembly'ni o'qiladigan psevdo-C'ga aylantiradi, unда parol taqqoslashni to'g'ridan-to'g'ri ko'rasiz — `if (input == "s3cr3t")` — va javobni o'qib olasiz. Dinamik tahlil uchun **gdb** (`pwndbg` yoki `gef` plagini bilan) binarni qadamma-qadam yuritadi, registrlar va xotirани kuzatib, tekshiruvда breakpoint qo'yishга imkon beradi.

Rev ish tartibi: avval `strings`, keyin mantiqni o'qish uchun Ghidra, keyin ish vaqtида tasdiqlash uchun gdb. Boshlang'ich challenge'lar `strings` va Ghidra chiqishiga bir qarashга yiqiladi.

## Pwn: binarning xotirasini ekspluatatsiya qilish

Pwn (binar ekspluatatsiya) — hujumkor tomon: binar xizmat sifatida ishlaydi (`nc host port`), va unда siz uni egallash uchun ekspluatatsiya qiladigan xotira-xavfsizlik xatosi bor — odatда flagни o'qiydigan shell uchun. Klassik xato — **bufer to'lib ketishi**: dastur buferi saqlaydigandан ko'proq kirish o'qiydi, va ortiqchasi qo'shni xotirani, jumladan saqlangan qaytish manzilini qayta yozadi. Qaytish manzilini boshqaring va bajarilishni boshqarasiz.

Avval qanday himoyalar borligini ko'ring:

```
$ checksec crackme
    Arch:     amd64
    Stack:    No canary found        ← to'lib ketish aniqlanmaydi
    NX:       NX enabled             ← stekда kod yurita olmaysiz
    PIE:      No PIE                 ← manzillar belgilangan, osonroq
```

`checksec` yumshatishlarni o'qiydi: **stek kanareykasi** to'lib ketishni aniqlaydi, **NX** stekда kodni to'xtatadi, **PIE/ASLR** manzillarni tasodifiy qiladi. Qaysilari o'chiq — qaysi texnika o'ynayotganini aytadi. Kanareyka va PIE'siz binar — klassik o'quv to'lib ketishi.

## Pwn asboblar to'plami

**pwntools** — ekspluatatsiyani skriptга soladigan Python kutubxonasi — ulan, yasalgan payload yubor, shell qabul qil:

```python
from pwn import *
p = remote("host", 1337)
payload = b"A"*72 + p64(0x401156)   # buferni to'ldirib, qaytish manzilini qayta yoz
p.sendline(payload)
p.interactive()                      # olgan shell'ga tush
```

`p64()` manzilni qadoqlaydi; `b"A"*72` buferni qaytish manziligacha to'ldiradi, u gdb bilan topiladi. Bu — boshlang'ich shakl; haqiqiy pwn ROP zanjirlari, format satrlari va heap ekspluatatsiyasiga kiradi — chuqur, mukofotli va o'zicha ixtisoslashuv.

## Bular sayohatingizда qayerга mos keladi

Rev va pwn — eng qiyin CTF kategoriyalari va eng hurmatlisi — ular chuqur tizim bilimini rag'batlantiradi va eksploit ishlab chiqish va zaiflik tadqiqotidаgi karyeraga to'g'ridan-to'g'ri yo'l. Bu dars sizni savodli qiladi: `strings`-va-Ghidra rev challenge'lari va oddiy to'lib ketish pwn'larини yecha olasiz, va bu sizni ushlagan yo'nalish bo'lsa, keyin nimani o'rganishni aniq bilasiz. Ko'p jahon darajasidagi hackerlar aynan shu yerдан, bitta crackme va bitta to'lib ketish bilan boshlagan.

## Sinab ko'ring (picoCTF rev/pwn'да — eng yaxshi boshlang'ich to'plam)

1. Oddiy crackme'ni `file` va `strings` qiling. Parol yoki flag shunchaki binarда turibdimi?
2. Crackme'ni Ghidra'да oching; kirishni tekshiradigan taqqoslashni toping. U nimaga qarshi taqqoslayapti?
3. Pwn binarини `checksec` qiling. Qaysi himoyalar o'chiq va bu nimani sinashга imkon beradi?""",
        "contentRu": r"""Две категории новые: **reversing** (понять скомпилированную программу) и **pwn** (эксплуатировать её баги памяти). Это глубочайший край CTF и отдельная область — этот урок честная ориентация, достаточная решать начальные задания и понимать, на что смотрите, не полный курс.

## Reversing: читать, что делает бинарник

Rev-задание даёт скомпилированную программу — часто ту, что просит пароль и печатает флаг при верном. Ваша задача — понять её настолько, чтобы найти или вычислить этот ввод. Начальные ходы:

```
$ file crackme            — архитектура, он stripped?
$ strings crackme         — читаемый текст: пароль? флаг? вызовы библиотек?
$ ./crackme               — запустить (в VM/песочнице): что он хочет?
```

Один `strings` решает лёгкие rev-задания — пароль или флаг иногда обычная строка в бинарнике. Когда нет — читаете код.

## Чтение дизассемблера

`objdump -d` дизассемблирует бинарник в ассемблер:

```
$ objdump -d crackme | grep -A5 '<main>:'
0000000000001139 <main>:
    1139:  55                    push   %rbp
    113a:  48 89 e5              mov    %rsp,%rbp
    113d:  48 8d 05 c0 0e 00 00  lea    0xec0(%rip),%rax
```

Это реальный вывод. Читать сырой ассемблер медленно, поэтому большинство используют **декомпилятор**, реконструирующий C-подобный код: **Ghidra** (бесплатна, от NSA) или IDA. Ghidra превращает дизассемблер в читаемый псевдо-C, где вы прямо видите сравнение пароля — `if (input == "s3cr3t")` — и считываете ответ. Для динамики **gdb** (с плагином `pwndbg` или `gef`) гоняет бинарник по шагам, давая смотреть регистры и память и ставить точки останова на проверке.

Rev-процесс: сначала `strings`, затем Ghidra читать логику, затем gdb подтвердить в рантайме. Начальные задания падают от `strings` и взгляда на вывод Ghidra.

## Pwn: эксплуатировать память бинарника

Pwn (эксплуатация бинарников) — наступательная сторона: бинарник работает как сервис (`nc host port`), и в нём баг безопасности памяти, который вы эксплуатируете для захвата — обычно ради шелла, читающего флаг. Классический баг — **переполнение буфера**: программа читает больше ввода, чем вмещает буфер, и избыток перезаписывает соседнюю память, включая сохранённый адрес возврата. Контролируйте адрес возврата — контролируете выполнение.

Сначала посмотрите защиты:

```
$ checksec crackme
    Arch:     amd64
    Stack:    No canary found        ← переполнение не обнаруживается
    NX:       NX enabled             ← нельзя выполнять код на стеке
    PIE:      No PIE                 ← адреса фиксированы, легче
```

`checksec` читает митигации: **стековая канарейка** обнаруживает переполнения, **NX** запрещает код на стеке, **PIE/ASLR** рандомизирует адреса. Какие выключены — говорит, какая техника в игре. Бинарник без канарейки и PIE — классическое учебное переполнение.

## Набор pwn

**pwntools** — библиотека Python, делающая эксплуатацию скриптуемой — подключись, отправь крафтовый пейлоад, прими шелл:

```python
from pwn import *
p = remote("host", 1337)
payload = b"A"*72 + p64(0x401156)   # переполнить буфер, перезаписать адрес возврата
p.sendline(payload)
p.interactive()                      # войти в полученный шелл
```

`p64()` пакует адрес; `b"A"*72` заполняет буфер до адреса возврата, найденного в gdb. Это начальная форма; настоящий pwn уходит в ROP-цепочки, форматные строки и эксплуатацию кучи — глубоко, ценно и отдельная специализация.

## Где это в вашем пути

Rev и pwn — труднейшие категории CTF и самые уважаемые — они награждают глубокое знание систем и прямой путь к карьере в разработке эксплойтов и исследовании уязвимостей. Этот урок делает вас грамотным: вы решаете rev-задания на `strings` и Ghidra и простые pwn на переполнении, и знаете, что учить дальше, если это направление вас захватило. Многие хакеры мирового класса начинали именно здесь, с одного crackme и одного переполнения.

## Попробуйте (на rev/pwn picoCTF — лучший начальный набор)

1. `file` и `strings` простой crackme. Пароль или флаг просто лежит в бинарнике?
2. Откройте crackme в Ghidra; найдите сравнение, проверяющее ввод. С чем оно сравнивает?
3. `checksec` pwn-бинарник. Какие защиты выключены и что это позволяет попробовать?""",
        "questions": [
            q("What does a decompiler like Ghidra give you over raw disassembly?",
              "Ghidra kabi dekompilyator xom disassembly'дan tashqari nima beradi?",
              "Что декомпилятор вроде Ghidra даёт сверх сырого дизассемблера?",
              ["Readable pseudo-C reconstructing the program's logic",
               "The encryption key", "Faster execution", "A copy of the flag directly"],
              ["Dastur mantiqини qayta tiklaydigan o'qiladigan psevdo-C",
               "Shifrlash kaliti", "Tezroq bajarilish", "Flagning to'g'ridan-to'g'ri nusxasi"],
              ["Читаемый псевдо-C, реконструирующий логику программы",
               "Ключ шифрования", "Более быстрое выполнение", "Копию флага напрямую"], 0),
            q("What does `checksec` on a pwn binary tell you?",
              "Pwn binarида `checksec` sizga nimani aytadi?",
              "Что `checksec` на pwn-бинарнике вам говорит?",
              ["Which memory protections (canary, NX, PIE) are on or off",
               "The flag", "The source code", "The attacker's IP"],
              ["Qaysi xotira himoyalari (kanareyka, NX, PIE) yoqilgan yoki o'chiq",
               "Flag", "Manba kod", "Hujumchining IP'si"],
              ["Какие защиты памяти (канарейка, NX, PIE) включены или выключены",
               "Флаг", "Исходный код", "IP атакующего"], 0),
            q("A classic buffer overflow works by:",
              "Klassik bufer to'lib ketishi qanday ishlaydi:",
              "Классическое переполнение буфера работает так:",
              ["Writing past the buffer to overwrite the saved return address",
               "Guessing the password", "Decrypting the binary",
               "Sending a valid HTTP request"],
              ["Bufer chegarasidan tashqariga yozib, saqlangan qaytish manzilini qayta yozish",
               "Parolni taxmin qilish", "Binarni deshifrlash",
               "Yaroqli HTTP so'rov yuborish"],
              ["Записью за буфер для перезаписи сохранённого адреса возврата",
               "Угадыванием пароля", "Расшифровкой бинарника",
               "Отправкой валидного HTTP-запроса"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "capstone", "points": 70,
        "title": "Attack-defense CTFs and playing as a team",
        "titleUz": "Attack-defense CTF va jamoada o'ynash",
        "titleRu": "Attack-defense CTF и игра в команде",
        "content": r"""Jeopardy is you against a scoreboard. Attack-defense is the full picture — offence and defence at the same time, against live opponents, as a team. It is where every skill in this program is used at once, and where a team beats a collection of individuals.

## How attack-defense works

Every team is given the same set of vulnerable services running on their own machine (the "vulnbox"). The game then runs in rounds:

- **Attack** — find the vulnerabilities in the services and exploit them on *other teams'* machines to steal their **flags** (rotated secrets planted by the organisers each round).
- **Defend** — the same vulnerabilities are in *your* services. Patch them so others cannot steal your flags — without breaking the service, because a service that is down also loses points.

You score for every flag you steal and for keeping your own services available. It is offence and defence, simultaneously, under time pressure — the whole program, live.

## The moment offence and defence become one

This is where module 6 (attack) and module 7 (defence) stop being separate. In a single round you:

1. Find a SQL injection in a service (module 3).
2. Exploit it on every opponent to steal their flags (module 6).
3. Realise your own service has the same bug — patch it (module 7's remediation).
4. Watch your traffic to see who is attacking you, and how (module 7's network forensics).
5. Learn their exploit from your logs and turn it back on them.

The defender's forensics and the attacker's exploitation are the same knowledge, and here you run both at once. Reading an opponent's attack in your own logs — then replaying it against everyone — is the signature attack-defense move, and it is exactly why this program taught both directions.

## Team roles

No one does all of it alone. A team divides the work:

- **Attackers** — find and weaponise the vulnerabilities, write exploit scripts, run them against all opponents every round.
- **Defenders** — monitor the services, patch bugs, watch traffic for incoming attacks, keep everything running.
- **Infra** — automate: a script that fires every exploit at every team each round, a dashboard of service health, flag submission.

Automation wins attack-defense. A vulnerability found once should become a script that steals that flag from every team, every round, without a human. The team that automates its exploits and its monitoring out-scores one that does everything by hand.

## Communication and note-sharing

A team is only as good as its shared knowledge. The structured notes you have kept all program become a *shared* document: which service has which bug, which exploit works, who is attacking, what has been patched. A vulnerability one member finds must reach the whole team in seconds. Voice comms, a shared notes doc, and a channel for "I found X" are as important as the exploits.

## From solo skill to team craft

Everything before this taught you to solve alone. Attack-defense adds the layer that real security work has: coordination. A professional red team, a blue team defending a company, an incident response team — all are teams running the offensive and defensive skills of this program together, communicating, dividing work, automating. Playing attack-defense is the closest a CTF gets to the actual job.

## Try it

1. Join a team for an attack-defense event on CTFtime (many welcome beginners). Take one role and own it.
2. Find one vulnerability in a service; write a script that steals its flag from every opponent automatically.
3. Watch your own traffic during a round. Can you spot an incoming attack and learn the exploit from it?""",
        "contentUz": r"""Jeopardy — siz reytingга qarshi. Attack-defense — to'liq rasm — bir vaqtда hujum va himoya, jonli raqiblarga qarshi, jamoa sifatида. Bu — dasturdаgi har ko'nikma bir vaqtда ishlatiladigan joy, va jamoa yakkalar to'plamini yengadigan joy.

## Attack-defense qanday ishlaydi

Har jamoaга o'z mashinasида (vulnbox) ishlayotган bir xil zaif xizmatlar to'plami beriladi. Keyin o'yin raundlarда yuriladi:

- **Hujum** — xizmatlardаgi zaifliklarni top va ularni *boshqa jamoalar* mashinalarида ekspluatatsiya qilib, ularning **flag**larini o'g'irla (tashkilotchilar har raundда joylaydigan aylanuvchi sirlar).
- **Himoya** — xuddi shu zaifliklar *sizning* xizmatlaringizда. Ularni yamang, boshqalar flaglaringizni o'g'irlay olmasin — xizmatni buzmasдан, chunki o'chiq xizmat ham ball yo'qotadi.

Har o'g'irlagan flagингиз va o'z xizmatlaringizni mavjud saqlaganingiz uchun ball olasiz. Bu — hujum va himoya, bir vaqtда, vaqt bosimида — butun dastur, jonli.

## Hujum va himoya bitta bo'ladigan lahza

Bu — 6-modul (hujum) va 7-modul (himoya) alohida bo'lishдан to'xtaydigan joy. Bitta raundда siz:

1. Xizmatда SQL in'ektsiyani topasiz (3-modul).
2. Uni har raqibда ekspluatatsiya qilib, flaglarини o'g'irlaysiz (6-modul).
3. O'z xizmatingizда xuddi shu xato borligini anglaysiz — uni yamaysiz (7-modul bartaraf etishi).
4. Kim va qanday hujum qilayotganini ko'rish uchun trafikingizni kuzatasiz (7-modul tarmoq forenzikasi).
5. Ularning eksploitини loglaringizдан o'rganib, ularga qaytarasiz.

Himoyachining forenzikasi va hujumchining ekspluatatsiyasi — bir xil bilim, va bu yerда ikkalasini bir vaqtда yuritasiz. Raqibning hujumini o'z loglaringizда o'qib — keyin uni hammaga qaytarib o'ynash — attack-defense'ning imzo harakati, va aynan shuning uchun bu dastur ikkala yo'nalishni o'rgatgan.

## Jamoa rollari

Hech kim hammasini yolg'iz qilmaydi. Jamoa ishni bo'ladi:

- **Hujumchilar** — zaifliklarni topib qurollantiradi, eksploit skriptlari yozadi, har raundда ularni barcha raqiblarga qarshi yuritadi.
- **Himoyachilar** — xizmatlarni kuzatadi, xatolarni yamaydi, kiruvchi hujumlar uchun trafikni kuzatadi, hamma narsani ishlab turadi.
- **Infra** — avtomatlashtiradi: har raundда har jamoaga har eksploitни otadigan skript, xizmat salomatligi paneli, flag topshirish.

Avtomatlashtirish attack-defense'ni yutadi. Bir marta topilган zaiflik odamsiz har jamoaдан, har raundда o'sha flagни o'g'irlaydigan skriptга aylanishi kerak. Eksploitlari va kuzatuvини avtomatlashtirган jamoa hammasini qo'lда qilganини ball bo'yicha yengadi.

## Aloqa va qayd almashish

Jamoa faqat umumiy bilimi darajasида yaxshi. Butun dastur davomida saqlagan tuzilgan qaydlaringiz *umumiy* hujjatga aylanadi: qaysi xizmatда qaysi xato, qaysi eksploit ishlaydi, kim hujum qilyapti, nima yamalgan. Bir a'zo topgan zaiflik butun jamoaга soniyalarда yetishi kerak. Ovozli aloqa, umumiy qaydlar hujjati va "X topdim" kanali eksploitlar kabi muhim.

## Yakka ko'nikmadan jamoa hunariga

Bundan oldingi hamma narsa sizni yolg'iz yechishga o'rgatdi. Attack-defense haqiqiy xavfsizlik ishida bor qatlamni qo'shadi: muvofiqlashtirish. Professional red team, kompaniyani himoya qiladigan blue team, insidentga javob jamoasi — hammasi bu dasturning hujum va himoya ko'nikmalarini birga yuritadigan, aloqa qiladigan, ishni bo'ladigan, avtomatlashtiradigan jamoalar. Attack-defense o'ynash — CTF haqiqiy ishга yeta oladigan eng yaqin nuqta.

## Sinab ko'ring

1. CTFtime'да attack-defense tadbiri uchun jamoaga qo'shiling (ko'plari boshlovchilarni qabul qiladi). Bitta rolni oling va egallang.
2. Xizmatда bitta zaiflik toping; uning flagини har raqibдан avtomatik o'g'irlaydigan skript yozing.
3. Raund davomida o'z trafikingizni kuzating. Kiruvchi hujumni sezib, undан eksploitни o'rganа olasizmi?""",
        "contentRu": r"""Jeopardy — вы против таблицы. Attack-defense — полная картина — нападение и защита одновременно, против живых соперников, командой. Здесь каждый навык программы используется разом, и здесь команда бьёт набор одиночек.

## Как работает attack-defense

Каждой команде дают одинаковый набор уязвимых сервисов на своей машине («vulnbox»). Игра идёт раундами:

- **Атака** — найди уязвимости в сервисах и эксплуатируй их на машинах *других команд*, чтобы украсть их **флаги** (сменяемые секреты, подсаживаемые организаторами каждый раунд).
- **Защита** — те же уязвимости в *ваших* сервисах. Залатайте их, чтобы другие не украли ваши флаги — не сломав сервис, ведь лежащий сервис тоже теряет очки.

Очки за каждый украденный флаг и за доступность своих сервисов. Это нападение и защита одновременно, под давлением времени — вся программа, вживую.

## Момент, когда нападение и защита становятся одним

Здесь модуль 6 (атака) и модуль 7 (защита) перестают быть отдельными. В одном раунде вы:

1. Находите SQL-инъекцию в сервисе (модуль 3).
2. Эксплуатируете её на каждом сопернике, крадя флаги (модуль 6).
3. Понимаете, что в вашем сервисе тот же баг — латаете (устранение модуля 7).
4. Смотрите свой трафик, кто и как вас атакует (сетевая форензика модуля 7).
5. Узнаёте их эксплойт из своих логов и оборачиваете против них.

Форензика защитника и эксплуатация атакующего — одно знание, и здесь вы гоняете оба разом. Прочитать атаку соперника в своих логах — затем воспроизвести против всех — фирменный ход attack-defense, и ровно потому программа учила обоим направлениям.

## Роли в команде

Никто не делает всё в одиночку. Команда делит работу:

- **Атакующие** — находят и вооружают уязвимости, пишут эксплойт-скрипты, гоняют их против всех соперников каждый раунд.
- **Защитники** — мониторят сервисы, латают баги, следят за входящими атаками, держат всё на ходу.
- **Инфра** — автоматизирует: скрипт, стреляющий каждым эксплойтом по каждой команде каждый раунд, дашборд здоровья сервисов, сдача флагов.

Автоматизация выигрывает attack-defense. Найденная раз уязвимость должна стать скриптом, крадущим её флаг у каждой команды каждый раунд без человека. Команда, автоматизировавшая эксплойты и мониторинг, обгоняет ту, что всё делает руками.

## Коммуникация и обмен заметками

Команда хороша настолько, насколько общее её знание. Структурированные заметки, что вы вели всю программу, становятся *общим* документом: в каком сервисе какой баг, какой эксплойт работает, кто атакует, что залатано. Уязвимость, найденная одним, должна дойти до всей команды за секунды. Голосовая связь, общий док заметок и канал «нашёл X» так же важны, как эксплойты.

## От сольного навыка к командному ремеслу

Всё до этого учило решать в одиночку. Attack-defense добавляет слой, который есть в реальной работе: координацию. Профессиональная red team, blue team, защищающая компанию, команда реагирования — все это команды, гоняющие наступательные и защитные навыки программы вместе, общаясь, деля работу, автоматизируя. Игра в attack-defense — самое близкое, что CTF даёт к настоящей работе.

## Попробуйте

1. Присоединитесь к команде на attack-defense событии CTFtime (многие рады новичкам). Возьмите одну роль и владейте ею.
2. Найдите одну уязвимость в сервисе; напишите скрипт, крадущий её флаг у каждого соперника автоматически.
3. Смотрите свой трафик в раунде. Можете ли заметить входящую атаку и узнать из неё эксплойт?""",
        "questions": [
            q("In attack-defense CTF, why is automation decisive?",
              "Attack-defense CTF'da nega avtomatlashtirish hal qiluvchi?",
              "В attack-defense CTF почему автоматизация решает?",
              ["A found exploit becomes a script that steals every team's flag every round",
               "It is against the rules to do it by hand", "It defends without any effort",
               "Manual play is always faster"],
              ["Topilган eksploit har raundда har jamoa flagини o'g'irlaydigan skriptga aylanadi",
               "Qo'lда qilish qoidaga zid", "U hech qanday kuchsiz himoya qiladi",
               "Qo'lда o'ynash doim tezroq"],
              ["Найденный эксплойт становится скриптом, крадущим флаг каждой команды каждый раунд",
               "Делать руками против правил", "Он защищает без усилий",
               "Ручная игра всегда быстрее"], 0),
            q("What is the signature attack-defense move that unites offence and defence?",
              "Hujum va himoyani birlashtiradigan attack-defense imzo harakati nima?",
              "Каков фирменный ход attack-defense, объединяющий нападение и защиту?",
              ["Reading an opponent's attack in your own logs, then replaying it against everyone",
               "Powering off your vulnbox", "Submitting your own flag",
               "Ignoring incoming traffic"],
              ["Raqib hujumini o'z loglaringizда o'qib, keyin uni hammaga qaytarib o'ynash",
               "Vulnbox'ingizni o'chirish", "O'z flagingizni topshirish",
               "Kiruvchi trafikni e'tiborsiz qoldirish"],
              ["Чтение атаки соперника в своих логах, затем её воспроизведение против всех",
               "Выключение своего vulnbox", "Сдача своего флага",
               "Игнорирование входящего трафика"], 0),
            q("Keeping a service down to avoid being exploited in attack-defense:",
              "Attack-defense'da ekspluatatsiyадан qochish uchun xizmatni o'chiq saqlash:",
              "Держать сервис выключенным, чтобы избежать эксплуатации в attack-defense:",
              ["Also loses points — services must stay available",
               "Is the winning strategy", "Is required by the rules",
               "Has no downside"],
              ["Ham ball yo'qotadi — xizmatlar mavjud bo'lishi kerak",
               "Yutuqli strategiya", "Qoidalar talab qiladi",
               "Salbiy tomoni yo'q"],
              ["Тоже теряет очки — сервисы должны оставаться доступны",
               "Выигрышная стратегия", "Требуется правилами",
               "Не имеет минусов"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "capstone", "points": 70,
        "title": "From CTF to a career",
        "titleUz": "CTF'dan karyeragacha",
        "titleRu": "От CTF к карьере",
        "content": r"""CTF is where the skill is built; a career is where it is used. This lesson maps the paths from what you now know to a profession in cybersecurity — the roles, the ways to prove your skill, and how to turn practice into a job.

## The roles this program leads to

The skills you have built open several distinct careers:

- **Penetration tester / red team** — the offensive core of modules 1–6, applied with authorisation: find the vulnerabilities before a real attacker does, and report them.
- **SOC analyst / blue team** — module 7's defensive skills: monitor, detect, and respond to attacks as they happen.
- **Incident responder / DFIR** — module 7 in depth: investigate breaches, do forensics, contain and recover.
- **Vulnerability researcher / exploit developer** — the rev and pwn direction: find new bugs in software and write the exploits. The deepest technical path.
- **Bug bounty hunter** — independent web and app testing for pay, on programs that invite it (HackerOne, Bugcrowd). Your module 3 skills, turned into income, entirely legally.
- **Security engineer** — build the defences: secure the code, the pipeline, the infrastructure. Offence knowledge applied to prevention.

You do not have to choose today. The generalist foundation you built lets you try each and specialise where you find you love the work.

## Proving your skill

Employers want evidence, and you can build it now:

- **This platform and CTF rankings** — a visible record of challenges solved. A CTFtime profile with real event placements is a portfolio in itself.
- **Hack The Box / TryHackMe** — public profiles showing machines rooted and paths completed, widely recognised by recruiters.
- **Certifications, if they fit your path:**
  - **OSCP** — the respected hands-on offensive cert: a 24-hour practical exam where you exploit real machines. The natural target for the offensive path.
  - **CompTIA Security+** — a broad entry-level baseline, often asked for in job listings.
  - Blue-team certs (BTL, GCIH), cloud security certs, and beyond as you specialise.
- **Bug bounty findings** — a public record of real vulnerabilities responsibly reported is powerful evidence, and it pays.
- **Your own writing** — a blog of CTF writeups, a tool you built, a bug you found and disclosed. This shows how you think, which certs cannot.

Certifications open doors; demonstrated skill walks through them. The best candidates have both — and this program is the foundation for either.

## Responsible disclosure and bug bounty

The legal, paid way to use offensive skill on real systems is **bug bounty** and **responsible disclosure**. A company publishes a scope — what you may test and how — and pays for valid vulnerabilities you find and report *privately*, giving them time to fix it before any public mention. It is module 3 and module 6, applied exactly as this program insisted: only within authorisation, always reported to help the owner defend. It is proof that the offensive skills of this course have a fully legitimate, well-paid home.

## Building a name in the community

Cybersecurity is a community, and reputation is built by contribution:

- Publish CTF writeups — teaching a solve shows mastery.
- Help others on this platform, on forums, in Telegram groups.
- Report bugs responsibly and disclose them well.
- Contribute to open-source security tools.
- Speak, mentor, organise a local CTF.

The Uzbek security community is young and growing, and there is room to become one of the people who builds it. This platform exists because someone chose to share knowledge instead of hoarding it — you can be the next.

## The practical next steps

1. Make your skill visible: a CTFtime profile, an HTB/THM account, solves on this platform.
2. Pick a direction that grips you — offensive, defensive, research — and go deep on it.
3. Target one credential that fits (OSCP for offence, Security+ for breadth) if your path wants it.
4. Start a bug bounty or a writeup blog — real, public evidence of real skill.
5. Contribute — teach, report, build. A name in the community opens doors a résumé cannot.

## Try it

1. Create or update a profile that shows your skill — CTFtime, HTB, or your solves here.
2. Choose one career direction from the list and write down the next concrete thing to learn for it.
3. Write one CTF writeup — explaining a solve teaches you as much as solving it, and it is portfolio.""",
        "contentUz": r"""CTF — ko'nikma quriladigan joy; karyera — u ishlatiladigan joy. Bu dars siz endi biladigan narsadan kiberxavfsizlikdаgi kasbga yo'llarni xaritalaydi — rollar, ko'nikmangizni isbotlash yo'llari va mashqni ishga aylantirish.

## Bu dastur olib boradigan rollar

Qurgan ko'nikmalaringiz bir necha alohida karyerani ochadi:

- **Penetratsiya sinovchisi / red team** — 1–6-modullarning hujum o'zagi, ruxsat bilan qo'llangan: haqiqiy hujumchidan oldin zaifliklarni top va xabar ber.
- **SOC tahlilchisi / blue team** — 7-modulning himoya ko'nikmalari: hujumlarni sodir bo'lganда kuzat, aniqla va javob ber.
- **Insidentга javob beruvchi / DFIR** — 7-modul chuqurroq: buzilishlarni tekshir, forenzika qil, chekla va tikla.
- **Zaiflik tadqiqotchisi / eksploit ishlab chiquvchi** — rev va pwn yo'nalishi: dasturдa yangi xatolar top va eksploitlar yoz. Eng chuqur texnik yo'l.
- **Bug bounty ovchisi** — pul evaziga mustaqil veb va ilova sinovi, buni taklif qiladigan dasturlarда (HackerOne, Bugcrowd). 3-modul ko'nikmalaringiz, butunlay qonuniy daromadga aylangan.
- **Xavfsizlik muhandisi** — himoyalarni qur: kodni, quvurni, infratuzilmani xavfsizla. Hujum bilimи oldini olishга qo'llangan.

Bugun tanlashingiz shart emas. Qurgan generalist poydevoringiz har birini sinab, ishni sevган joyingizda ixtisoslashishга imkon beradi.

## Ko'nikmangizni isbotlash

Ish beruvchilar dalil xohlaydi, va siz uni hozir qura olasiz:

- **Bu platforma va CTF reytinglari** — yechilган challenge'lar ko'rinadigan yozuvи. Haqiqiy tadbir o'rinlari bilan CTFtime profili — o'zi portfolio.
- **Hack The Box / TryHackMe** — root qilingan mashinalar va tugatilган yo'llarni ko'rsatadigan ommaviy profillar, rekruterlarga keng tanilган.
- **Sertifikatlar, agar yo'lingizга mos kelса:**
  - **OSCP** — hurmatли amaliy hujum sertifikati: haqiqiy mashinalarni ekspluatatsiya qiladigan 24-soatlik amaliy imtihon. Hujum yo'li uchun tabiiy nishon.
  - **CompTIA Security+** — keng boshlang'ich asos, ish e'lonlarида ko'p so'raladi.
  - Blue-team sertifikatlari (BTL, GCIH), bulut xavfsizligi sertifikatlari va ixtisoslashgan sari boshqalar.
- **Bug bounty topilmalari** — mas'uliyat bilan xabar qilingan haqiqiy zaifliklar ommaviy yozuvi — kuchli dalil, va u pul to'laydi.
- **O'z yozuvingiz** — CTF writeup'lari blogi, qurgan vositangiz, topib oshkor qilган xatongiz. Bu sertifikatlar qila olmaydigan qanday o'ylashingizni ko'rsatadi.

Sertifikatlar eshiklarni ochadi; namoyish etilган ko'nikma ulardan o'tadi. Eng yaxshi nomzodlarда ikkalasi bor — va bu dastur ikkalasi uchun ham poydevor.

## Mas'uliyatli oshkor qilish va bug bounty

Haqiqiy tizimlarда hujum ko'nikmasini ishlatishning qonuniy, pulli yo'li — **bug bounty** va **mas'uliyatli oshkor qilish**. Kompaniya ko'lamni e'lon qiladi — nimani va qanday sinashingiz mumkin — va topib *shaxsiy* xabar qilган yaroqli zaifliklaringiz uchun to'laydi, ular ommaviy eslatishдан oldin tuzatishga vaqt beradi. Bu — 3 va 6-modul, aynan bu dastur talab qilgandек qo'llangan: faqat ruxsat ichида, doim egaga himoyada yordam berish uchun xabar qilingan. Bu — bu kursning hujum ko'nikmalari butunlay qonuniy, yaxshi pulli uy borligiга dalil.

## Jamiyatда nom qurish

Kiberxavfsizlik — jamiyat, va obro' hissa bilan quriladi:

- CTF writeup'lari nashr qil — yechimni o'rgatish mahoratни ko'rsatadi.
- Bu platformada, forumlarда, Telegram guruhlarида boshqalarga yordam ber.
- Xatolarni mas'uliyat bilan xabar qil va yaxshi oshkor qil.
- Ochiq manbali xavfsizlik vositalariga hissa qo'sh.
- Gapir, mentorlik qil, mahalliy CTF tashkil qil.

O'zbek xavfsizlik jamiyati yosh va o'sib bormoqda, va uni quradigan odamlardан biri bo'lishga joy bor. Bu platforma kimdir bilimni to'plash o'rniga ulashishни tanlagani uchun mavjud — siz keyingisi bo'lishingiz mumkin.

## Amaliy keyingi qadamlar

1. Ko'nikmangizni ko'rinadigan qiling: CTFtime profili, HTB/THM hisobi, bu yerдаgi yechimlar.
2. Sizni ushlaydigan yo'nalishни tanlang — hujum, himoya, tadqiqot — va unга chuqurlashing.
3. Mos bitta guvohnomani nishonга oling (hujum uchun OSCP, kenglik uchun Security+) agar yo'lingiz xohlаса.
4. Bug bounty yoki writeup blog boshlang — haqiqiy ko'nikmaning haqiqiy, ommaviy dalili.
5. Hissa qo'shing — o'rgating, xabar qiling, quring. Jamiyatда nom rezyume ocha olmaydigan eshiklarni ochadi.

## Sinab ko'ring

1. Ko'nikmangizni ko'rsatadigan profil yarating yoki yangilang — CTFtime, HTB yoki bu yerдаgi yechimlaringiz.
2. Ro'yxatдан bitta karyera yo'nalishни tanlang va uning uchun o'rganadigan keyingi aniq narsani yozing.
3. Bitta CTF writeup yozing — yechimni tushuntirish uni yechgandек o'rgatadi, va u portfolio.""",
        "contentRu": r"""CTF — где строится навык; карьера — где он используется. Этот урок картирует пути от того, что вы теперь знаете, к профессии в кибербезопасности — роли, способы доказать навык и как превратить практику в работу.

## Роли, к которым ведёт программа

Построенные навыки открывают несколько разных карьер:

- **Пентестер / red team** — наступательное ядро модулей 1–6, применённое с авторизацией: найти уязвимости раньше настоящего атакующего и сообщить.
- **SOC-аналитик / blue team** — защитные навыки модуля 7: мониторить, обнаруживать и реагировать на атаки по мере их появления.
- **Специалист по реагированию / DFIR** — модуль 7 вглубь: расследовать взломы, вести форензику, сдерживать и восстанавливать.
- **Исследователь уязвимостей / разработчик эксплойтов** — направление rev и pwn: находить новые баги в ПО и писать эксплойты. Глубочайший технический путь.
- **Багхантер** — независимое тестирование веба и приложений за плату, на приглашающих программах (HackerOne, Bugcrowd). Навыки модуля 3, превращённые в доход, полностью законно.
- **Инженер безопасности** — строить защиты: защищать код, пайплайн, инфраструктуру. Знание нападения, применённое к предотвращению.

Выбирать сегодня не обязательно. Построенный фундамент дженералиста позволяет попробовать каждое и специализироваться там, где найдёте, что любите работу.

## Как доказать навык

Работодатели хотят доказательств, и вы можете их построить сейчас:

- **Эта платформа и рейтинги CTF** — видимая запись решённых заданий. Профиль CTFtime с реальными местами на событиях — уже портфолио.
- **Hack The Box / TryHackMe** — публичные профили с рутнутыми машинами и пройденными путями, широко признаны рекрутерами.
- **Сертификаты, если подходят пути:**
  - **OSCP** — уважаемый практический наступательный сертификат: 24-часовой практический экзамен с эксплуатацией реальных машин. Естественная цель наступательного пути.
  - **CompTIA Security+** — широкая начальная база, часто в вакансиях.
  - Blue-team сертификаты (BTL, GCIH), облачные и другие по мере специализации.
- **Находки багбаунти** — публичная запись реальных уязвимостей, ответственно сообщённых, — мощное доказательство, и оно платит.
- **Ваши тексты** — блог CTF-разборов, ваш инструмент, найденный и раскрытый баг. Это показывает, как вы думаете, чего сертификаты не могут.

Сертификаты открывают двери; продемонстрированный навык проходит сквозь них. У лучших кандидатов есть оба — и эта программа фундамент для любого.

## Ответственное раскрытие и багбаунти

Законный, оплачиваемый способ применять наступательный навык на реальных системах — **багбаунти** и **ответственное раскрытие**. Компания публикует scope — что и как можно тестировать — и платит за валидные уязвимости, найденные и сообщённые *приватно*, давая время исправить до публичного упоминания. Это модули 3 и 6, применённые ровно так, как настаивала программа: только в рамках авторизации, всегда с сообщением, чтобы помочь владельцу защититься. Это доказательство, что наступательные навыки курса имеют полностью легитимный, хорошо оплачиваемый дом.

## Построение имени в сообществе

Кибербезопасность — сообщество, и репутация строится вкладом:

- Публикуйте CTF-разборы — обучение решению показывает мастерство.
- Помогайте другим на этой платформе, на форумах, в Telegram-группах.
- Сообщайте о багах ответственно и раскрывайте их хорошо.
- Вносите вклад в открытые инструменты безопасности.
- Выступайте, наставляйте, организуйте локальный CTF.

Узбекское сообщество безопасности молодо и растёт, и есть место стать одним из тех, кто его строит. Эта платформа существует, потому что кто-то выбрал делиться знанием, а не копить — вы можете быть следующим.

## Практические следующие шаги

1. Сделайте навык видимым: профиль CTFtime, аккаунт HTB/THM, решения здесь.
2. Выберите захватывающее направление — нападение, защита, исследование — и углубитесь.
3. Нацельтесь на один подходящий сертификат (OSCP для нападения, Security+ для широты), если путь хочет.
4. Начните багбаунти или блог разборов — реальное публичное доказательство навыка.
5. Вносите вклад — учите, сообщайте, стройте. Имя в сообществе открывает двери, которых не откроет резюме.

## Попробуйте

1. Создайте или обновите профиль, показывающий навык — CTFtime, HTB или решения здесь.
2. Выберите одно карьерное направление из списка и запишите следующее конкретное, что для него учить.
3. Напишите один CTF-разбор — объяснение решения учит не меньше, чем решение, и это портфолио.""",
        "questions": [
            q("Which certification is the natural target for the offensive (pentest) path?",
              "Hujum (pentest) yo'li uchun tabiiy nishon qaysi sertifikat?",
              "Какой сертификат — естественная цель наступательного (пентест) пути?",
              ["OSCP — a 24-hour hands-on exam exploiting real machines",
               "A typing certificate", "Security+ only", "None exist"],
              ["OSCP — haqiqiy mashinalarni ekspluatatsiya qiladigan 24-soatlik amaliy imtihon",
               "Yozuv sertifikati", "Faqat Security+", "Hech biri yo'q"],
              ["OSCP — 24-часовой практический экзамен с эксплуатацией реальных машин",
               "Сертификат печати", "Только Security+", "Не существует"], 0),
            q("What is bug bounty / responsible disclosure?",
              "Bug bounty / mas'uliyatli oshkor qilish nima?",
              "Что такое багбаунти / ответственное раскрытие?",
              ["A legal, paid way to test real systems within a published scope and report privately",
               "Attacking any site for money", "A CTF category",
               "Selling exploits on the black market"],
              ["E'lon qilingan ko'lam ichида haqiqiy tizimlarni sinash va shaxsiy xabar qilishning qonuniy, pulli yo'li",
               "Pul uchun istalgan saytga hujum", "CTF kategoriyasi",
               "Qora bozorда eksploit sotish"],
              ["Законный, оплачиваемый способ тестировать реальные системы в опубликованном scope и сообщать приватно",
               "Атака любого сайта за деньги", "Категория CTF",
               "Продажа эксплойтов на чёрном рынке"], 0),
            q("Beyond certifications, what best shows an employer how you think?",
              "Sertifikatlardан tashqari, ish beruvchiga qanday o'ylashingizни eng yaxshi nima ko'rsatadi?",
              "Помимо сертификатов, что лучше показывает работодателю, как вы думаете?",
              ["Demonstrated skill — writeups, CTF profiles, disclosed bugs, tools you built",
               "The length of your résumé", "A large number of certificates alone",
               "Nothing — certificates are enough"],
              ["Namoyish etilган ko'nikma — writeup'lar, CTF profillari, oshkor qilingan xatolar, qurgan vositalaringiz",
               "Rezyumeingiz uzunligi", "Faqat ko'p sertifikat",
               "Hech narsa — sertifikatlar yetarli"],
              ["Продемонстрированный навык — разборы, профили CTF, раскрытые баги, ваши инструменты",
               "Длина резюме", "Одно лишь большое число сертификатов",
               "Ничего — сертификатов достаточно"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "capstone", "points": 90,
        "title": "The end of the path: everything, together",
        "titleUz": "Yo'lning oxiri: hammasi, birga",
        "titleRu": "Конец пути: всё вместе",
        "content": r"""This is the final lesson of the whole program. Eight modules, from a first shell prompt to competing in CTFs, and now they become one thing. Everything you have learned was building toward this: not eight topics, but one integrated skill, and the judgement to use it well.

## The whole journey, in one view

Look at the path you have walked:

```
1. Linux            — the ground everything runs on
2. Networking       — how machines reach each other
3. Web Security     — the most common way in
4. Cryptography     — the secrets, and how they fail
5. Recon            — mapping a target before you touch it
6. Exploitation     — the offensive core: recon → foothold → root → pivot
7. Forensics & IR   — the same chain, read from the defender's side
8. CTF Methodology  — all of it, put into competitive practice
```

Modules 1–5 were the tools. Module 6 assembled them into an attack. Module 7 turned the whole attack around and showed you how a defender reads every step of it. Module 8 put both into practice against real challenges and real opponents. That is not a list of subjects — it is one skill, seen from every angle.

## Offence and defence were always one thing

The deepest lesson of the program is that attacking and defending are the same knowledge, read in two directions. Every offensive technique leaves a defensive trace; every defensive artifact is the footprint of an attack:

| You learned to attack... | ...which taught you to defend |
|---|---|
| brute-force and exploit | detect the failed logins and the odd process |
| escalate and pivot | audit sudo/SUID, segment the network |
| break weak crypto | salt and slow-hash, use crypto correctly |
| exfiltrate over the network | read the pcap, spot the beaconing |
| hide and delete | carve the deleted, find the cleared log |

You did not learn to attack *or* defend. You learned the one underlying thing, and now you can stand on either side of it. That is what makes a complete security practitioner, and it is what this whole program was built to give you.

## A skill, and a responsibility

You now know how to break into systems, and how to catch someone who does. That is real power, and it is legitimate in exactly one frame, stated one last time and meant completely:

**You learned to attack so that you can defend, and you only ever act within authorisation.** The line between a security professional and a criminal is not skill — you have the skill either way — it is authorisation and intent. Every technique in these eight modules was given to you to make systems safer, to help your community, to build a career protecting people. Bug bounties, penetration tests, CTFs, defending an organisation — these are where this knowledge belongs. Use it there, and only there.

## What you can do now

Take stock of what you could not do eight modules ago and can now:

- Take a machine you have never seen, map it, find a way in, gain root, and pivot deeper.
- Read a breach from a disk image, a memory dump, and a packet capture, and reconstruct exactly what happened.
- Recognise and break misused cryptography, and use it correctly yourself.
- Find and exploit the vulnerabilities that dominate real-world web applications — and fix them.
- Compete in a CTF across every category, and hold your own.
- Investigate an incident end to end and write a report someone can act on.

That is the foundation of a cybersecurity professional. Not the finish — the foundation. The field is vast and always moving, and the best in it are lifelong learners. But you now have the base to build any specialisation on, and the judgement to use it responsibly.

## Where you go from here

- **Keep playing.** CTFs, Hack The Box, this platform — skill decays without practice and grows with it.
- **Specialise.** Pick the direction that gripped you most — web, AD, cloud, rev/pwn, DFIR — and go deep.
- **Prove it.** A CTF profile, a certification, bug bounty findings, writeups.
- **Give back.** Teach, report responsibly, contribute, help the next person. This platform exists because someone did.

## The last word

You started this program able to type commands into a terminal. You finish it able to attack and defend real systems, to investigate a breach, and to compete with people who do this for a living. That is a genuine transformation, and you earned it lesson by lesson.

Use it to build, not to break. Use it to defend your community, to protect the people around you, to make the systems everyone depends on a little safer. That is the entire purpose of cdCTF, and now it is yours to carry forward.

Welcome to the field. Go do good work.

## Try it — the final capstone

1. Take a full machine you own or a hard CTF box, and go from nothing to root and a written report — using every module.
2. For each step, name the module it came from. Notice that you no longer think of them as separate.
3. Write down which direction you will specialise in, and the first concrete step you will take this week. Then take it.""",
        "contentUz": r"""Bu — butun dasturning oxirgi darsi. Sakkiz modul, birinchi shell taklifidan CTF'da bellashishgacha, va endi ular bitta narsaga aylanadi. O'rgangan hamma narsangiz shunга qurilardi: sakkiz mavzu emas, bitta yaxlit ko'nikma, va uni yaxshi ishlatish mulohazasi.

## Butun sayohat, bitta ko'rinishда

Bosib o'tган yo'lingizga qarang:

```
1. Linux            — hamma narsa ishlaydigan zamin
2. Tarmoq           — mashinalar bir-biriga qanday yetadi
3. Veb xavfsizlik   — eng keng tarqalgan kirish yo'li
4. Kriptografiya    — sirlar va ular qanday yiqiladi
5. Razvedka         — tegishдан oldin nishonni xaritalash
6. Ekspluatatsiya   — hujum o'zagi: razvedka → tayanch → root → pivot
7. Forenzika & IR   — o'sha zanjir, himoyachи tomonidан o'qilган
8. CTF metodologiyasi — hammasi, musobaqa amaliyotiga qo'yilган
```

1–5-modullar — vositalar. 6-modul ularni hujumга yig'di. 7-modul butun hujumни teskari o'girib, himoyachи uning har qadamini qanday o'qishini ko'rsatди. 8-modul ikkalasini haqiqiy challenge'lar va haqiqiy raqiblarga qarshi amaliyotга qo'ydi. Bu — mavzular ro'yxati emas — har burchakдан ko'rilган bitta ko'nikma.

## Hujum va himoya doim bitta narsa edi

Dasturning eng chuqur darsi — hujum va himoya bir xil bilim, ikki yo'nalishда o'qilган. Har hujum texnikasi himoyaviy iz qoldiradi; har himoyaviy artefakt — hujum izi:

| Hujum qilishni o'rgandingiz... | ...bu sizni himoya qilishga o'rgatди |
|---|---|
| brute-force va ekspluatatsiya | muvaffaqiyatsiz kirishlar va g'alati jarayonni aniqlash |
| oshirish va pivot | sudo/SUID audit, tarmoqni segmentlash |
| zaif kriptoni buzish | tuzlash va sekin-xeshlash, kriptoni to'g'ri ishlatish |
| tarmoq orqali chiqarish | pcap'ni o'qish, beaconing'ni sezish |
| yashirish va o'chirish | o'chirilганni kesish, tozаланган logни topish |

Siz hujum *yoki* himoyани o'rganmadingiz. Siz bitta asosiy narsani o'rgandingiz, va endi uning har ikki tomonида tura olasiz. To'liq xavfsizlik amaliyotchisini shu qiladi, va bu butun dastur sizga berish uchun qurilган narsa.

## Ko'nikma va mas'uliyat

Siz endi tizimlarga qanday bostirib kirish va buni qilganни qanday ushlashni bilasiz. Bu — haqiqiy kuch, va u aynan bitta ramkada qonuniy, oxirgi marta aytilган va to'liq nazarда tutilган:

**Siz himoya qila olishingiz uchun hujum qilishни o'rgandingiz, va faqat ruxsat ichida harakat qilasiz.** Xavfsizlik professionali bilan jinoyatchи orasidаgi chiziq — ko'nikma emas — sizда har ikki holatда ham ko'nikma bor — u ruxsat va niyat. Bu sakkiz moduldаgi har texnika sizga tizimlarni xavfsizroq qilish, jamiyatingizga yordam berish, odamlarni himoya qilish karyerasini qurish uchun berilди. Bug bounty, penetratsiya sinovlari, CTF'lar, tashkilotni himoya qilish — bu bilim shu yerга tegishli. Uni shu yerда, va faqat shu yerда ishlating.

## Endi nima qila olasiz

Sakkiz modul oldin qila olmaган va endi qila oladiganingizni hisoblang:

- Hech ko'rmagan mashinani olib, xaritalash, kirish yo'lini topish, root olish va chuqurroq pivot qilish.
- Disk tasviri, xotira dampi va paket yozuvidан buzilishни o'qib, aynan nima bo'lganини qayta tiklash.
- Noto'g'ri ishlatilган kriptoni tanish va buzish, va o'zingiz uni to'g'ri ishlatish.
- Haqiqiy veb-ilovalarда ustunlik qiladigan zaifliklarni topib ekspluatatsiya qilish — va ularni tuzatish.
- CTF'da har kategoriya bo'ylab bellashish va o'z o'rningizni ushlash.
- Insidentни boshdan oxiригаcha tekshirish va kimdir harakat qila oladigan hisobot yozish.

Bu — kiberxavfsizlik professionalining poydevori. Yakun emas — poydevor. Soha ulkan va doim harakatда, va undаgi eng yaxshilari — umrbod o'rganuvchilar. Lekin sizда endi istalgan ixtisoslashuvni quradigan asos va uni mas'uliyat bilan ishlatadigan mulohaza bor.

## Bu yerдан qayerга borasiz

- **O'ynashда davom eting.** CTF'lar, Hack The Box, bu platforma — ko'nikma mashqсиz susayadi va u bilan o'sadi.
- **Ixtisoslashing.** Sizni eng ko'p ushlaган yo'nalishни tanlang — veb, AD, bulut, rev/pwn, DFIR — va chuqurlashing.
- **Isbotlang.** CTF profili, sertifikat, bug bounty topilmalari, writeup'lar.
- **Qaytaring.** O'rgating, mas'uliyat bilan xabar qiling, hissa qo'shing, keyingi odamga yordam bering. Bu platforma kimdir shuni qilgani uchun mavjud.

## Oxirgi so'z

Siz bu dasturni terminalга buyruq yozа oladigan holда boshladingiz. Uni haqiqiy tizimlarga hujum qilish va himoya qilish, buzilishni tekshirish va buni kasb qilganlar bilan bellashish holида tugatasiz. Bu — chinakam o'zgarish, va siz uni darsма-dars qozondingiz.

Uni buzish uchun emas, qurish uchun ishlating. Jamiyatingizni himoya qilish, atrofingizdаgi odamlarni himoya qilish, hamma tayanadigan tizimlarni bir oz xavfsizroq qilish uchun ishlating. cdCTF'ning butun maqsadi shu, va endi u sizning oldinga olib borishingiz uchun.

Sohaga xush kelibsiz. Boring, yaxshi ish qiling.

## Sinab ko'ring — yakuniy capstone

1. O'zingizнiki to'liq mashina yoki qiyin CTF box'ini oling va hech narsadан root va yozma hisobotgacha boring — har modulни ishlatib.
2. Har qadam uchun u kelган modulni nomlang. Ularni endi alohida deb o'ylamasligingizни sezing.
3. Qaysi yo'nalishда ixtisoslashishingizni va bu hafta qiladigan birinchi aniq qadamni yozing. Keyin uni qiling.""",
        "contentRu": r"""Это финальный урок всей программы. Восемь модулей, от первого приглашения оболочки до соревнований в CTF, и теперь они становятся одним. Всё изученное вело к этому: не восемь тем, а один целостный навык и суждение, чтобы им хорошо пользоваться.

## Весь путь в одном виде

Взгляните на пройденный путь:

```
1. Linux            — почва, на которой всё работает
2. Сети             — как машины достигают друг друга
3. Веб-безопасность — самый частый путь внутрь
4. Криптография     — секреты и как они падают
5. Разведка         — картирование цели до касания
6. Эксплуатация     — наступательное ядро: разведка → опора → root → пивот
7. Форензика & IR   — та же цепочка, прочитанная со стороны защитника
8. Методология CTF  — всё это, в соревновательной практике
```

Модули 1–5 были инструментами. Модуль 6 собрал их в атаку. Модуль 7 развернул всю атаку и показал, как защитник читает каждый её шаг. Модуль 8 применил оба на реальных заданиях и соперниках. Это не список предметов — это один навык, увиденный со всех сторон.

## Нападение и защита всегда были одним

Глубочайший урок программы: атака и защита — одно знание, читаемое в двух направлениях. Каждая наступательная техника оставляет защитный след; каждый защитный артефакт — отпечаток атаки:

| Вы научились атаковать... | ...что научило вас защищать |
|---|---|
| брутфорс и эксплойт | замечать неудачные входы и странный процесс |
| эскалацию и пивот | аудит sudo/SUID, сегментацию сети |
| ломать слабую крипту | солить и медленно хешировать, применять крипту верно |
| эксфильтрацию по сети | читать pcap, замечать биконинг |
| прятать и удалять | вырезать удалённое, находить очищенный лог |

Вы научились не атаке *или* защите. Вы научились одной основе, и теперь можете стоять по любую её сторону. Это делает полного специалиста по безопасности, и это то, что вся программа была построена вам дать.

## Навык и ответственность

Вы теперь знаете, как взломать системы и как поймать того, кто это делает. Это реальная сила, и она легитимна ровно в одной рамке, сказанной в последний раз и полностью подразумеваемой:

**Вы научились атаковать, чтобы защищать, и действуете только в рамках авторизации.** Черта между профессионалом безопасности и преступником — не навык — навык у вас есть в любом случае — это авторизация и намерение. Каждая техника этих восьми модулей дана вам, чтобы делать системы безопаснее, помогать сообществу, строить карьеру, защищая людей. Багбаунти, пентесты, CTF, защита организации — вот где это знание уместно. Используйте его там, и только там.

## Что вы теперь можете

Оцените, чего вы не могли восемь модулей назад и можете теперь:

- Взять невиданную машину, картировать её, найти путь внутрь, получить root и пивотить глубже.
- Прочитать взлом из образа диска, дампа памяти и захвата пакетов и точно реконструировать, что было.
- Опознавать и ломать неправильно применённую криптографию и применять её верно самому.
- Находить и эксплуатировать уязвимости, доминирующие в реальных веб-приложениях — и чинить их.
- Соревноваться в CTF по всем категориям и держать удар.
- Расследовать инцидент от начала до конца и написать отчёт, по которому можно действовать.

Это фундамент специалиста по кибербезопасности. Не финиш — фундамент. Область огромна и всегда движется, и лучшие в ней — вечные ученики. Но у вас теперь есть база, на которой строится любая специализация, и суждение, чтобы использовать её ответственно.

## Куда вы идёте дальше

- **Продолжайте играть.** CTF, Hack The Box, эта платформа — навык угасает без практики и растёт с ней.
- **Специализируйтесь.** Выберите захватившее направление — веб, AD, облако, rev/pwn, DFIR — и углубитесь.
- **Докажите это.** Профиль CTF, сертификат, находки багбаунти, разборы.
- **Отдавайте.** Учите, сообщайте ответственно, вносите вклад, помогайте следующему. Эта платформа существует, потому что кто-то так сделал.

## Последнее слово

Вы начали программу, умея вводить команды в терминал. Заканчиваете, умея атаковать и защищать реальные системы, расследовать взлом и соревноваться с теми, кто делает это профессионально. Это настоящая трансформация, и вы заслужили её урок за уроком.

Используйте это, чтобы строить, а не ломать. Чтобы защищать сообщество, оберегать людей вокруг, делать системы, от которых все зависят, чуть безопаснее. В этом весь смысл cdCTF, и теперь он ваш, чтобы нести дальше.

Добро пожаловать в область. Идите и делайте хорошую работу.

## Попробуйте — финальный капстоун

1. Возьмите полную машину, которой владеете, или трудный CTF-бокс, и пройдите от нуля до root и письменного отчёта — используя каждый модуль.
2. Для каждого шага назовите модуль, откуда он. Заметьте, что вы больше не думаете о них как об отдельных.
3. Запишите, в каком направлении будете специализироваться, и первый конкретный шаг на этой неделе. Затем сделайте его.""",
        "questions": [
            q("What is the deepest lesson of the whole program?",
              "Butun dasturning eng chuqur darsi nima?",
              "Каков глубочайший урок всей программы?",
              ["Attack and defence are the same knowledge, read in two directions",
               "Attack is more important than defence", "CTFs are the only goal",
               "Certifications matter most"],
              ["Hujum va himoya bir xil bilim, ikki yo'nalishда o'qilган",
               "Hujum himoyadан muhimroq", "CTF'lar yagona maqsad",
               "Sertifikatlar eng muhim"],
              ["Атака и защита — одно знание, читаемое в двух направлениях",
               "Атака важнее защиты", "CTF — единственная цель",
               "Сертификаты важнее всего"], 0),
            q("What separates a security professional from a criminal?",
              "Xavfsizlik professionalини jinoyatchidан nima ajratadi?",
              "Что отделяет профессионала безопасности от преступника?",
              ["Authorisation and intent, not skill",
               "The tools they use", "The speed of their exploits",
               "Their operating system"],
              ["Ruxsat va niyat, ko'nikma emas",
               "Ular ishlatadigan vositalar", "Eksploitlari tezligi",
               "Operatsion tizimi"],
              ["Авторизация и намерение, не навык",
               "Инструменты, что они используют", "Скорость их эксплойтов",
               "Их операционная система"], 0),
            q("The program describes your new ability as:",
              "Dastur sizning yangi qobiliyatingizni nima deb ta'riflaydi:",
              "Программа описывает вашу новую способность как:",
              ["A foundation to build any specialisation on — not the finish",
               "The complete mastery of the field", "Only useful for CTFs",
               "A reason to stop learning"],
              ["Istalgan ixtisoslashuvni quradigan poydevor — yakun emas",
               "Sohaning to'liq mahorati", "Faqat CTF uchun foydali",
               "O'rganishни to'xtatish sababi"],
              ["Фундамент для любой специализации — не финиш",
               "Полное мастерство области", "Полезна только для CTF",
               "Повод перестать учиться"], 0),
        ],
    },
]


MODULE = {
    "slug": "ctf-methodology",
    "category": "capstone",
    "title": "CTF Methodology and Competition",
    "titleUz": "CTF metodologiyasi va musobaqa",
    "titleRu": "Методология CTF и соревнования",
    "description": (
        "The program finale: everything, put into competitive practice. What CTFs are and how they are scored, "
        "a methodology for solving under the clock, web and crypto at speed, forensics/stego/OSINT by checklist, "
        "an honest intro to reversing and pwn, attack-defense and team play, the path from CTF to a career, and "
        "a closing lesson that unites the whole eight-module journey — offence and defence as one skill."
    ),
    "descriptionUz": (
        "Dastur yakuni: hammasi, musobaqa amaliyotiga qo'yilган. CTF nima va qanday ballanadi, soat ostida yechish "
        "metodologiyasi, tezlikда veb va kripto, ro'yxat bo'yicha forenzika/stego/OSINT, reversing va pwn'ga halol "
        "kirish, attack-defense va jamoada o'yin, CTF'dan karyeragacha yo'l, va butun sakkiz-modulli sayohatni "
        "birlashtiradigan yakuniy dars — hujum va himoya bitta ko'nikma sifatида."
    ),
    "descriptionRu": (
        "Финал программы: всё, применённое в соревновательной практике. Что такое CTF и как считаются очки, "
        "методология решения под часами, web и crypto на скорости, форензика/стего/OSINT по чек-листу, честное "
        "введение в reversing и pwn, attack-defense и командная игра, путь от CTF к карьере и завершающий урок, "
        "объединяющий весь восьмимодульный путь — нападение и защита как один навык."
    ),
    "difficulty": "advanced",
    "estimatedHours": 40,
    "passScore": 80,
    "orderIndex": 7,
    "exam": [
        q("On this platform's CTFs, what does a flag look like?",
          "Bu platforma CTF'larida flag qanday ko'rinadi?",
          "Как выглядит флаг в CTF этой платформы?",
          ["flag{...} with a value inside", "A password hash", "An IP address", "A CVE number"],
          ["Ichida qiymatли flag{...}", "Parol xeshi", "IP manzil", "CVE raqami"],
          ["flag{...} со значением внутри", "Хеш пароля", "IP-адрес", "Номер CVE"], 0),
        q("The most important first step on any challenge is:",
          "Har challenge'дагi eng muhim birinchi qadam:",
          "Важнейший первый шаг на любом задании:",
          ["Enumerate it: read the prompt, examine everything provided",
           "Immediately run every exploit", "Guess the flag", "Ask for a hint"],
          ["Uni sanash: taklifni o'qi, berilган hamma narsani ko'r",
           "Darrov har eksploitни yurit", "Flagни taxmin qil", "Maslahat so'ra"],
          ["Перечислить: прочесть условие, осмотреть всё данное",
           "Сразу запустить все эксплойты", "Угадать флаг", "Попросить подсказку"], 0),
        q("Under a scoreboard, the winning strategy is:",
          "Reyting ostida yutuqли strategiya:",
          "Под таблицей выигрышная стратегия:",
          ["Sweep easy points across categories first, then go deep",
           "Fixate on the hardest challenge", "Solve strictly in order",
           "Only play one category"],
          ["Avval kategoriyalar bo'ylab oson ballларni supur, keyin chuqurlash",
           "Eng qiyin challenge'ga qadal", "Qat'iy tartibда yech",
           "Faqat bitta kategoriya o'yna"],
          ["Сначала подмести лёгкие очки по категориям, затем углубляться",
           "Зациклиться на труднейшем", "Решать строго по порядку",
           "Играть только одну категорию"], 0),
        q("Most CTF crypto challenges involve:",
          "Aksar CTF kripto challenge'lari nimани o'z ichига oladi:",
          "Большинство CTF-крипто-заданий связаны с:",
          ["Misused crypto or layered encoding, not broken algorithms",
           "Breaking AES-256", "Quantum computers", "Unbreakable ciphers"],
          ["Noto'g'ri ishlatilган kripto yoki qatlamli kodlash, buzilган algoritm emas",
           "AES-256'ni buzish", "Kvant kompyuterlar", "Buzib bo'lmaydigan shifrlar"],
          ["Неправильно применённой криптой или слоёным кодированием, не сломанными алгоритмами",
           "Взломом AES-256", "Квантовыми компьютерами", "Невзламываемыми шифрами"], 0),
        q("For a forensics or stego file, thoroughness means running:",
          "Forenzika yoki stego fayli uchun puxtalik nimani yuritishни anglatadi:",
          "Для форензика- или стего-файла тщательность значит запуск:",
          ["file, strings, exiftool, binwalk, foremost — the whole checklist",
           "Only strings", "Only file", "A single guess"],
          ["file, strings, exiftool, binwalk, foremost — butun ro'yxat",
           "Faqat strings", "Faqat file", "Bitta taxmin"],
          ["file, strings, exiftool, binwalk, foremost — весь чек-лист",
           "Только strings", "Только file", "Одной догадки"], 0),
        q("OSINT challenges are solved using:",
          "OSINT challenge'lari nima bilan yechiladi:",
          "OSINT-задания решаются с помощью:",
          ["Public information only — searches, reverse image, crt.sh, social media",
           "Exploiting the target server", "Buffer overflows", "SQL injection"],
          ["Faqat ommaviy ma'lumot — qidiruvlar, teskari rasm, crt.sh, ijtimoiy tarmoq",
           "Nishon serverini ekspluatatsiya qilish", "Bufer to'lib ketishlari", "SQL in'ektsiya"],
          ["Только публичной информации — поиск, обратный поиск фото, crt.sh, соцсети",
           "Эксплуатации сервера цели", "Переполнений буфера", "SQL-инъекции"], 0),
        q("In a reversing challenge, a decompiler like Ghidra provides:",
          "Reversing challenge'да Ghidra kabi dekompilyator nima beradi:",
          "В reversing-задании декомпилятор вроде Ghidra даёт:",
          ["Readable pseudo-C reconstructing the program's logic",
           "The flag automatically", "Faster execution", "A network scan"],
          ["Dastur mantiqini qayta tiklaydigan o'qiladigan psevdo-C",
           "Flagni avtomatik", "Tezroq bajarilish", "Tarmoq skani"],
          ["Читаемый псевдо-C, реконструирующий логику программы",
           "Флаг автоматически", "Более быстрое выполнение", "Сетевой скан"], 0),
        q("`checksec` on a pwn binary shows:",
          "Pwn binarида `checksec` nimani ko'rsatadi:",
          "`checksec` на pwn-бинарнике показывает:",
          ["Which memory protections (canary, NX, PIE) are enabled",
           "The flag", "The source code", "The password"],
          ["Qaysi xotira himoyalari (kanareyka, NX, PIE) yoqilган",
           "Flag", "Manba kod", "Parol"],
          ["Какие защиты памяти (канарейка, NX, PIE) включены",
           "Флаг", "Исходный код", "Пароль"], 0),
        q("A classic buffer overflow hijacks execution by:",
          "Klassik bufer to'lib ketishi bajarilishni qanday egallaydi:",
          "Классическое переполнение буфера захватывает выполнение:",
          ["Overwriting the saved return address past the buffer",
           "Guessing the password", "Decrypting the binary", "Sending valid input"],
          ["Bufer ortidаgi saqlangan qaytish manzilini qayta yozib",
           "Parolni taxmin qilib", "Binarni deshifrlab", "Yaroqli kirish yuborib"],
          ["Перезаписью сохранённого адреса возврата за буфером",
           "Угадыванием пароля", "Расшифровкой бинарника", "Отправкой валидного ввода"], 0),
        q("In attack-defense CTF, what does a team do each round?",
          "Attack-defense CTF'da jamoa har raundда nima qiladi?",
          "В attack-defense CTF что команда делает каждый раунд?",
          ["Exploit opponents' services to steal flags while patching its own",
           "Only answer questions", "Only defend, never attack",
           "Wait for the next round"],
          ["O'zinikini yamash bilan raqiblar xizmatlarini ekspluatatsiya qilib flag o'g'irlash",
           "Faqat savollarга javob berish", "Faqat himoya, hech qachon hujum emas",
           "Keyingi raundni kutish"],
          ["Эксплуатировать сервисы соперников ради флагов, латая свои",
           "Только отвечать на вопросы", "Только защищаться, не атаковать",
           "Ждать следующий раунд"], 0),
        q("Why is automation decisive in attack-defense?",
          "Attack-defense'da nega avtomatlashtirish hal qiluvchi?",
          "Почему автоматизация решает в attack-defense?",
          ["One found exploit becomes a script hitting every team every round",
           "It is required by the rules", "Manual is always faster",
           "It defends with no effort"],
          ["Bitta topilған eksploit har raundда har jamoaga uradigan skriptga aylanadi",
           "Qoidalar talab qiladi", "Qo'lда doim tezroq",
           "U kuchsiz himoya qiladi"],
          ["Один найденный эксплойт становится скриптом, бьющим каждую команду каждый раунд",
           "Требуется правилами", "Вручную всегда быстрее",
           "Защищает без усилий"], 0),
        q("The legal, paid way to use offensive skill on real systems is:",
          "Haqiqiy tizimlarда hujum ko'nikmasini ishlatishning qonuniy, pulli yo'li:",
          "Законный, оплачиваемый способ применять наступательный навык на реальных системах:",
          ["Bug bounty and responsible disclosure, within a published scope",
           "Attacking any site you like", "Selling exploits", "There is none"],
          ["Bug bounty va mas'uliyatli oshkor qilish, e'lon qilingan ko'lam ichida",
           "Yoqqan istalgan saytga hujum", "Eksploit sotish", "Yo'q"],
          ["Багбаунти и ответственное раскрытие в опубликованном scope",
           "Атака любого сайта", "Продажа эксплойтов", "Такого нет"], 0),
        q("Which certification is the natural target for the offensive path?",
          "Hujum yo'li uchun tabiiy nishon qaysi sertifikat?",
          "Какой сертификат — естественная цель наступательного пути?",
          ["OSCP", "A typing test", "None", "A driver's licence"],
          ["OSCP", "Yozuv testi", "Hech biri", "Haydovchilik guvohnomasi"],
          ["OSCP", "Тест печати", "Никакой", "Водительские права"], 0),
        q("The single most important boundary on everything you learned is:",
          "O'rgangan hamma narsangizdаgi eng muhim yagona chegara:",
          "Единственная важнейшая граница всего изученного:",
          ["Act only within authorisation — attack to defend, never to harm",
           "Always use the newest tools", "Never tell anyone your techniques",
           "Only attack foreign systems"],
          ["Faqat ruxsat ichida harakat qil — himoya uchun hujum, hech qachon zarar uchun emas",
           "Doim eng yangi vositalarni ishlat", "Texnikalaringizni hech kimga aytma",
           "Faqat chet el tizimlariga hujum qil"],
          ["Действовать только в рамках авторизации — атаковать ради защиты, не ради вреда",
           "Всегда использовать новейшие инструменты", "Никому не рассказывать техники",
           "Атаковать только иностранные системы"], 0),
        q("The program describes your new ability as:",
          "Dastur sizning yangi qobiliyatingizni nima deb ta'riflaydi:",
          "Программа описывает вашу новую способность как:",
          ["A foundation to build any specialisation on, used responsibly",
           "Complete and final mastery", "Only for winning CTFs",
           "A reason to stop learning"],
          ["Mas'uliyat bilan ishlatiladigan, istalgan ixtisoslashuvni quradigan poydevor",
           "To'liq va yakuniy mahorat", "Faqat CTF yutish uchun",
           "O'rganishni to'xtatish sababi"],
          ["Фундамент для любой специализации, используемый ответственно",
           "Полное и окончательное мастерство", "Только для побед в CTF",
           "Повод перестать учиться"], 0),
    ],
}
