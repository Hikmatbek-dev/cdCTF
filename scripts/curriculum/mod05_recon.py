"""
Module 05 — Reconnaissance and Scanning.

nmap and searchsploit outputs were produced on a real Kali shell (nmap 7.99)
and pasted back. Scans target only localhost, scanme.nmap.org (which Nmap
authorises for scan practice), and RFC 5737 documentation addresses. Scanning a
host you do not own or have written permission for is illegal, and the module
says so where it matters.
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
        "category": "recon", "points": 60,
        "title": "The reconnaissance mindset: passive, active, and legal",
        "titleUz": "Razvedka tafakkuri: passiv, aktiv va qonuniy",
        "titleRu": "Мышление разведки: пассивная, активная и законная",
        "content": r"""Reconnaissance is the first and longest phase of any assessment. Attackers who skip it fail; defenders who understand it see themselves as a target sees them. It is also the phase where a single command can cross a legal line, so the rules come first.

## The one rule that comes before every command

Scanning, probing or enumerating a system you do not own or have **written authorisation** to test is a criminal offence in most countries, including Uzbekistan. A port scan is not "just looking" in the eyes of the law. Everything in this module is for:

- machines you own,
- a lab you built (a VM, a container, a Hack The Box or TryHackMe target),
- `scanme.nmap.org`, which Nmap explicitly permits for scan practice,
- an engagement with a signed scope defining exactly which hosts and which tests.

Authorisation is specific: permission for one host is not permission for its neighbour, and permission to scan is not permission to exploit. When in doubt, you do not have permission.

## Passive versus active

The dividing line is whether you send anything **to the target**.

- **Passive reconnaissance** touches only third parties — public DNS, search engines, certificate logs, WHOIS, code repositories. The target's own logs never see you. It is quiet, low-risk, and often legal even without engagement (you are reading public records), though acting on what you find may not be.
- **Active reconnaissance** sends packets to the target itself — port scans, banner grabs, directory brute-forcing. It is far more revealing and appears in the target's logs. It requires authorisation, always.

Good practice: exhaust passive recon first. By the time you send a single packet, you should already know the target's domains, IP ranges, technologies, and likely staff. Active scanning then confirms and fills gaps rather than starting from nothing.

## What you are trying to learn

Recon answers a fixed set of questions, and organising your notes around them keeps a large assessment tractable:

- **Which hosts exist?** IP ranges, live machines, domains and subdomains.
- **What is running on them?** Open ports, services, and their exact versions.
- **What technology stack?** Operating systems, web servers, frameworks, languages.
- **Who are the people?** Employee names, email formats, roles — the raw material for phishing and password guessing.
- **What is exposed by mistake?** Forgotten subdomains, public storage buckets, leaked keys in code, dev servers.

## The attack surface

Every one of those answers adds to the **attack surface** — the total set of points where an attacker could try to get in. A defender's job is to shrink it; an attacker's is to map it completely. The same recon serves both: you cannot defend a forgotten server you do not know exists, and you cannot attack one you did not find.

## Noise and stealth

Active recon makes noise. A full-speed scan of a whole network is loud and obvious in any monitored environment; on an authorised test that may be fine, or the client may want you to stay quiet to test their detection. Tools expose this as timing controls — `nmap -T0` (paranoid, slow, quiet) through `-T5` (insane, fast, loud) — and the choice is part of the engagement, not an afterthought. This module teaches the loud version because it is clearer; adjusting speed is a knob, not a new skill.

## Try it (on a lab or scanme.nmap.org only)

1. Before any scanning, write down what you can learn about a domain from public records alone.
2. `whois example.com` — what does it reveal without touching example.com's servers?
3. State, in one sentence, why `nmap` against a random internet host is illegal even if nothing breaks.""",
        "contentUz": r"""Razvedka — har qanday baholashning birinchi va eng uzoq bosqichi. Uni o'tkazib yuboradigan hujumchilar muvaffaqiyatsizlikка uchraydi; uni tushunadigan himoyachilar o'zlarini nishon ko'rgandek ko'radi. Bu shuningdek bitta buyruq qonuniy chegarani kesib o'tishi mumkin bo'lган bosqich, shuning uchun avval qoidalar.

## Har bir buyruqдан oldin keladigan bitta qoida

Sizга tegishli bo'lmagan yoki sinash uchun **yozma ruxsatingiz** bo'lmagan tizimni skanerlash, zondlash yoki sanash aksar mamlakatlarда, jumladan O'zbekistonда ham jinoyat. Port skani qonun nazarida "shunchaki qarash" emas. Bu moduldаgi hamma narsa quyidagilar uchun:

- o'zingizga tegishli mashinalar,
- o'zingiz qurган laboratoriya (VM, konteyner, Hack The Box yoki TryHackMe nishoni),
- `scanme.nmap.org`, uni Nmap skan mashqi uchun aniq ruxsat beradi,
- imzolangan ko'lam bilan ish — qaysi xostlar va qaysi sinovlar aniq belgilangan.

Ruxsat aniq: bitta xostга ruxsat uning qo'shnisiga ruxsat emas, va skanerlashга ruxsat ekspluatatsiyaга ruxsat emas. Shubhaланsangiz — sizда ruxsat yo'q.

## Passiv va aktiv

Ajratuvchi chiziq — siz **nishonга** biror narsa yuborasizmi yoki yo'q.

- **Passiv razvedka** faqat uchinchi tomonларга tegadi — ommaviy DNS, qidiruv tizimlari, sertifikat loglari, WHOIS, kod omborlari. Nishonning o'z loglari sizni hech qachon ko'rmaydi. U jim, past xavfli va ko'pincha ishsiz ham qonuniy (siz ommaviy yozuvlarни o'qiyapsiz), garchi topganingizга ko'ra harakat qilish qonuniy bo'lmasligi mumkin.
- **Aktiv razvedka** paketларни nishonning o'ziga yuboradi — port skanlar, banner olish, katalog brute-force. U ancha ko'proq oshkor qiladi va nishonning loglarида paydo bo'ladi. U doim ruxsat talab qiladi.

Yaxshi amaliyot: avval passiv razvedkани tugating. Bitta paket yuborishга qadar siz allaqachon nishonning domenlari, IP diapazonlari, texnologiyalari va ehtimoliy xodimlarини bilishingiz kerak. Aktiv skanerlash keyin noldan boshlash o'rniga tasdiqlaydi va bo'shliqларни to'ldiradi.

## Nimани o'rganishга urinasiz

Razvedka belgilangan savollar to'plamiга javob beradi, va qaydlaringizни ular atrofида tashkil qilish katta baholashни boshqarilyabilir qiladi:

- **Qaysi xostlar bor?** IP diapazonlari, jonli mashinalar, domenlar va subdomenlar.
- **Ularда nima ishlayapti?** Ochiq portlar, xizmatlar va ularning aniq versiyalari.
- **Qanday texnologik to'plam?** Operatsion tizimlar, veb-serverlar, freymvorklar, tillar.
- **Odamlar kim?** Xodim nomlari, email formatlari, rollari — fishing va parol taxmini uchun xom material.
- **Xato bilan nima ochilgan?** Unutilган subdomenlar, ommaviy saqlash chelaklari, kodда sizган kalitlar, dev serverlar.

## Hujum yuzasi

Bu javoblarning har biri **hujum yuzasiга** qo'shiladi — hujumchi kirishга urinishi mumkin bo'lган nuqtalarning umumiy to'plami. Himoyachining ishi uni qisqartirish; hujumchiniki uni to'liq xaritalash. Bir xil razvedka ikkalasига xizmat qiladi: mavjudligini bilmaydigan unutилган serverni himoya qila olmaysiz, va topmaganизни hujum qila olmaysiz.

## Shovqin va yashirinlik

Aktiv razvedka shovqin qiladi. Butun tarmoqni to'liq tezlikда skanerlash har qanday kuzatilayotган muhitда baland va aniq; ruxsat etilган sinovда bu maqbul bo'lishi mumkin, yoki mijoz ularning aniqlashини sinash uchun jim qolishingizни xohlashi mumkin. Vositalar buni vaqt boshqaruvi sifatida ko'rsatadi — `nmap -T0` (paranoid, sekin, jim) dан `-T5` (aqldan ozган, tez, baland) gacha — va tanlov keyinги o'ylash emas, ishning bir qismi. Bu modul baland versiyaни o'rgatadi, chunki u aniqroq; tezlikни sozlash — tugma, yangi ko'nikma emas.

## Sinab ko'ring (faqat laboratoriya yoki scanme.nmap.org da)

1. Har qanday skanerlashдан oldin, domen haqida faqat ommaviy yozuvlardан nima bilishingiz mumkinligini yozing.
2. `whois example.com` — u example.com serverlariга tegmasдан nimani oshkor qiladi?
3. Bitta jumlaда ayting, nega tasodifiy internet xostига `nmap` hech narsa buzilmasa ham qonuniy emas.""",
        "contentRu": r"""Разведка — первая и самая долгая фаза любой оценки. Атакующие, пропускающие её, проваливаются; защитники, понимающие её, видят себя так, как видит цель. Это также фаза, где одна команда может пересечь юридическую черту, поэтому правила первыми.

## Одно правило перед каждой командой

Сканирование, зондирование или перечисление системы, которая вам не принадлежит и на тестирование которой нет **письменного разрешения**, — уголовное преступление в большинстве стран, включая Узбекистан. Сканирование портов в глазах закона — не «просто посмотреть». Всё в этом модуле — для:

- машин, которые вам принадлежат,
- лаборатории, которую вы собрали (VM, контейнер, цель Hack The Box или TryHackMe),
- `scanme.nmap.org`, который Nmap явно разрешает для практики сканирования,
- работы с подписанным scope, где точно определены хосты и тесты.

Разрешение конкретно: разрешение на один хост — не разрешение на его соседа, а разрешение сканировать — не разрешение эксплуатировать. Сомневаетесь — разрешения нет.

## Пассивная против активной

Разделительная черта — отправляете ли вы что-либо **цели**.

- **Пассивная разведка** касается только третьих сторон — публичного DNS, поисковиков, логов сертификатов, WHOIS, репозиториев кода. Собственные логи цели вас не видят. Она тихая, малорисковая и часто законна даже без работы (вы читаете публичные записи), хотя действие по найденному может быть незаконным.
- **Активная разведка** шлёт пакеты самой цели — сканы портов, захват баннеров, перебор каталогов. Она гораздо больше раскрывает и появляется в логах цели. Она всегда требует разрешения.

Хорошая практика: сначала исчерпайте пассивную разведку. К моменту отправки одного пакета вы уже должны знать домены цели, диапазоны IP, технологии и вероятный персонал. Активное сканирование затем подтверждает и заполняет пробелы, а не начинает с нуля.

## Что вы пытаетесь узнать

Разведка отвечает на фиксированный набор вопросов, и организация заметок вокруг них делает большую оценку посильной:

- **Какие хосты существуют?** Диапазоны IP, живые машины, домены и поддомены.
- **Что на них работает?** Открытые порты, службы и их точные версии.
- **Какой стек технологий?** ОС, веб-серверы, фреймворки, языки.
- **Кто люди?** Имена сотрудников, форматы почты, роли — сырьё для фишинга и подбора паролей.
- **Что открыто по ошибке?** Забытые поддомены, публичные хранилища, утёкшие ключи в коде, dev-серверы.

## Поверхность атаки

Каждый такой ответ добавляется к **поверхности атаки** — совокупности точек, где атакующий может попытаться войти. Задача защитника — её сократить; атакующего — полностью её отобразить. Одна и та же разведка служит обоим: нельзя защитить забытый сервер, о существовании которого не знаешь, и нельзя атаковать тот, что не нашёл.

## Шум и скрытность

Активная разведка шумит. Скан всей сети на полной скорости громок и заметен в любой наблюдаемой среде; на авторизованном тесте это может быть нормально, или клиент захочет, чтобы вы были тихи, проверяя их обнаружение. Инструменты отражают это как управление таймингом — от `nmap -T0` (параноидальный, медленный, тихий) до `-T5` (безумный, быстрый, громкий) — и выбор это часть работы, а не запоздалая мысль. Этот модуль учит громкой версии, потому что она яснее; регулировка скорости — ручка, а не новый навык.

## Попробуйте (только на лаборатории или scanme.nmap.org)

1. До всякого сканирования запишите, что можно узнать о домене из одних публичных записей.
2. `whois example.com` — что он раскрывает, не касаясь серверов example.com?
3. В одном предложении: почему `nmap` против случайного хоста в интернете незаконен, даже если ничего не сломалось.""",
        "questions": [
            q("What separates passive from active reconnaissance?",
              "Passiv razvedkани aktivdan nima ajratadi?",
              "Что отделяет пассивную разведку от активной?",
              ["Whether you send packets to the target itself",
               "Whether it is done at night", "Whether a tool or a browser is used",
               "Whether the target is a website"],
              ["Nishonning o'ziga paket yuborasizmi yoki yo'q",
               "Kechasi qilinadimi", "Vosita yoki brauzer ishlatiladimi",
               "Nishon veb-saytmi"],
              ["Отправляете ли вы пакеты самой цели",
               "Делается ли это ночью", "Инструмент или браузер",
               "Является ли цель сайтом"], 0),
            q("You have written authorisation to scan host A. What may you do to host B on the same network?",
              "A xostни skanerlashга yozma ruxsatingiz bor. Xuddi shu tarmoqdаgi B xostга nima qila olasiz?",
              "У вас есть письменное разрешение сканировать хост A. Что можно делать с хостом B в той же сети?",
              ["Nothing — authorisation is specific to the named host",
               "Scan it too, since it is nearby", "Exploit it if it looks vulnerable",
               "Anything passive"],
              ["Hech narsa — ruxsat nomlangan xostга xos",
               "Uni ham skanerlash, chunki u yaqin", "Zaif ko'rinsa ekspluatatsiya qilish",
               "Har qanday passiv narsa"],
              ["Ничего — разрешение конкретно для названного хоста",
               "Тоже сканировать, раз рядом", "Эксплуатировать, если выглядит уязвимым",
               "Что угодно пассивное"], 0),
            q("Why exhaust passive recon before scanning?",
              "Nega skanerlashдан oldin passiv razvedkани tugatish kerak?",
              "Почему исчерпать пассивную разведку до сканирования?",
              ["It is quiet and leaves you knowing the target before you touch it",
               "It is faster than scanning", "It is the only legal phase",
               "Scanning is never necessary"],
              ["U jim va nishonга tegishдан oldin uni bilib qolasiz",
               "U skanerlashдан tez", "Bu yagona qonuniy bosqich",
               "Skanerlash hech qachon kerak emas"],
              ["Она тихая и оставляет вас знающим цель до касания",
               "Она быстрее сканирования", "Это единственная законная фаза",
               "Сканирование никогда не нужно"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "recon", "points": 70,
        "title": "Passive OSINT: learning without touching",
        "titleUz": "Passiv OSINT: tegmasdan o'rganish",
        "titleRu": "Пассивный OSINT: узнать, не касаясь",
        "content": r"""Open-Source Intelligence is everything you can learn from public records without sending a single packet to the target. Done well, it maps most of the attack surface before active scanning begins — and it is the hardest part for a defender to control, because it lives outside their network.

## WHOIS: who owns a domain

```
$ whois example.com | grep -iE "registrar|creation|name server|registrant"
Registrar: RESERVED-Internet Assigned Numbers Authority
Creation Date: 1995-08-14T04:00:00Z
Name Server: A.IANA-SERVERS.NET
Name Server: B.IANA-SERVERS.NET
```

WHOIS shows the registrar, registration dates, and name servers. Historically it exposed owner names, emails and phone numbers; privacy services now redact most of that, but the name servers and dates still help — old domains and the hosting provider are useful context.

`whois` on an IP address instead tells you which organisation owns that block:

```
$ whois 8.8.8.8 | grep -iE "orgname|netrange|cidr"
NetRange:       8.8.8.0 - 8.8.8.255
CIDR:           8.8.8.0/24
OrgName:        Google LLC
```

That is how you turn a single IP into the whole range an organisation controls.

## DNS records, revisited as recon

The networking module covered `dig`; here it is a recon tool. Pull the records that map an organisation's infrastructure:

```
$ dig +short example.com              # A record — main IP
$ dig +short MX example.com           # mail servers → mail provider
$ dig +short TXT example.com          # SPF, verification tokens, sometimes internal notes
$ dig +short NS example.com           # who runs the DNS
```

None of this touches the target's web server — it queries public DNS.

## Certificate transparency: the subdomain goldmine

Every TLS certificate a public CA issues is logged in **certificate transparency** logs, which anyone can search. Because certificates name the hosts they cover, these logs leak subdomains an organisation never advertised:

```
$ curl -s "https://crt.sh/?q=%25.example.com&output=json" \
  | python3 -c "import sys,json; [print(c['name_value']) for c in json.load(sys.stdin)]" \
  | sort -u | head
api.example.com
dev.example.com
internal.example.com
mail.example.com
vpn.example.com
```

A `dev.` or `internal.` subdomain surfaced this way is a classic finding — a forgotten, less-hardened host, discovered without sending the target a single packet.

## Search engine dorking

Search operators turn Google into a recon tool by narrowing to one site and to risky content:

```
site:example.com filetype:pdf          documents on the domain
site:example.com inurl:admin           admin pages
site:example.com intitle:"index of"    exposed directory listings
site:example.com ext:sql               leaked database dumps
```

The Google Hacking Database (GHDB) catalogues thousands of these patterns for finding exposed files, login portals and error messages that leak information.

## Harvesting people and hosts

`theHarvester` automates gathering emails, subdomains and names from public sources:

```
$ theHarvester -d example.com -b bing,crtsh,duckduckgo
[*] Emails found:
info@example.com
support@example.com
[*] Hosts found:
api.example.com
www.example.com
```

Email formats matter: discovering `first.last@example.com` gives you the pattern for every employee whose name you find on LinkedIn — the raw material for password spraying and phishing.

## Code and secret leaks

Developers commit secrets by accident. Public repositories are searchable for them:

```
$ trufflehog github --repo https://github.com/org/repo
Found verified result 🐷🔑
Detector Type: AWS
```

A leaked API key or database password in git history is a direct route in that never required scanning anything. `git log -p` on a cloned repo, or tools like `gitleaks`, surface secrets removed from the current files but still present in history.

## Try it (on your own domain or a lab)

1. `whois` your own domain. What is redacted, and what is still visible?
2. Search `crt.sh` for a domain you control. Any subdomains you had forgotten?
3. Try a `site:` search with `filetype:pdf` against a domain. What is publicly indexed?""",
        "contentUz": r"""Ochiq manbali razvedka (OSINT) — nishonга bitta paket ham yubormasдан ommaviy yozuvlardан o'rganа oladigan hamma narsa. Yaxshi bajarilса, u aktiv skanerlash boshlanishдан oldin hujum yuzasining aksarини xaritalaydi — va bu himoyachi uchun boshqarish eng qiyin qism, chunki u ularning tarmog'idан tashqarида yashaydi.

## WHOIS: domen egasi kim

```
$ whois example.com | grep -iE "registrar|creation|name server|registrant"
Registrar: RESERVED-Internet Assigned Numbers Authority
Creation Date: 1995-08-14T04:00:00Z
Name Server: A.IANA-SERVERS.NET
Name Server: B.IANA-SERVERS.NET
```

WHOIS registrator, ro'yxatga olish sanalari va nom serverlarини ko'rsatadi. Tarixан u egalar nomlari, emaillar va telefon raqamларни oshkor qilardi; maxfiylik xizmatlari endi aksarини tahrirlaydi, lekin nom serverlari va sanalar hamon yordam beradi — eski domenlar va hosting provayder foydali kontekst.

IP manzилga `whois` esa qaysi tashkilot o'sha blokга egaligini aytadi:

```
$ whois 8.8.8.8 | grep -iE "orgname|netrange|cidr"
NetRange:       8.8.8.0 - 8.8.8.255
CIDR:           8.8.8.0/24
OrgName:        Google LLC
```

Bitta IP ni tashkilot boshqaradigan butun diapazonга shunday aylantirasiz.

## DNS yozuvlari, razvedka sifatida qayta

Tarmoq moduli `dig` ni qamradi; bu yerда u razvedka vositasi. Tashkilot infratuzilmasини xaritalaydigan yozuvларni torting:

```
$ dig +short example.com              # A yozuvi — asosiy IP
$ dig +short MX example.com           # pochta serverlari → pochta provayderi
$ dig +short TXT example.com          # SPF, tasdiqlash tokenlari, ba'zан ichki qaydlar
$ dig +short NS example.com           # DNS ni kim yuritadi
```

Bularning hech biri nishonning veb-serverига tegmaydi — u ommaviy DNS ni so'raydi.

## Sertifikat shaffofligi: subdomen oltin koni

Ommaviy CA bergan har bir TLS sertifikati **sertifikat shaffofligi** loglarида yoziladi, ularni har kim qidiradi. Sertifikatlar qamragan xostларni nomlagani uchun bu loglar tashkilot hech qachon e'lon qilmagan subdomenларни sizdiradi:

```
$ curl -s "https://crt.sh/?q=%25.example.com&output=json" \
  | python3 -c "import sys,json; [print(c['name_value']) for c in json.load(sys.stdin)]" \
  | sort -u | head
api.example.com
dev.example.com
internal.example.com
mail.example.com
vpn.example.com
```

Shu tarzda paydo bo'lган `dev.` yoki `internal.` subdomeni — klassik topilma: nishonга bitta paket ham yubormasдан topilган unutилган, kamroq mustahkamlanган xost.

## Qidiruv tizimи dorking

Qidiruv operatorlari Google'ни bitta saytга va xavfli kontentга toraytirib razvedka vositasига aylantiradi:

```
site:example.com filetype:pdf          domendаgi hujjatlar
site:example.com inurl:admin           admin sahifalari
site:example.com intitle:"index of"    ochilган katalog ro'yxatlari
site:example.com ext:sql               sizган ma'lumotlar bazasi damplari
```

Google Hacking Database (GHDB) ochilган fayllar, kirish portallari va ma'lumot sizdiradigan xato xabarларни topish uchun bu naqshlarning minglabини kataloglaydi.

## Odamlar va xostларни yig'ish

`theHarvester` ommaviy manbalardан emaillar, subdomenlar va nomларни yig'ishни avtomatlashtiradi:

```
$ theHarvester -d example.com -b bing,crtsh,duckduckgo
[*] Emails found:
info@example.com
support@example.com
[*] Hosts found:
api.example.com
www.example.com
```

Email formatlari muhim: `first.last@example.com` ni topish LinkedIn'да nomini topgan har bir xodim uchun naqsh beradi — parol sepish va fishing uchun xom material.

## Kod va sir sizishlari

Dasturchilar sirларни tasodifан commit qiladi. Ommaviy omborlar ularга qidiriladi:

```
$ trufflehog github --repo https://github.com/org/repo
Found verified result 🐷🔑
Detector Type: AWS
```

git tarixида sizган API kalit yoki ma'lumotlar bazasi paroli — hech narsani skanerlashni talab qilmaydigan to'g'ridan-to'g'ri kirish yo'li. Klonlangan omborда `git log -p`, yoki `gitleaks` kabi vositalar joriy fayllardан olib tashlangan, lekin tarixда hamon mavjud sirларni sug'urib oladi.

## Sinab ko'ring (o'z domeningiz yoki laboratoriyaда)

1. O'z domeningizni `whois` qiling. Nima tahrirlangan va nima hamon ko'rinadi?
2. Boshqaradigan domeningizни `crt.sh`da qidiring. Unutган subdomenlaringiz bormi?
3. Domenга `filetype:pdf` bilan `site:` qidiruvini sinang. Ommaviy indekslangan nima bor?""",
        "contentRu": r"""Разведка по открытым источникам (OSINT) — всё, что можно узнать из публичных записей, не отправив цели ни одного пакета. Сделанная хорошо, она отображает большую часть поверхности атаки до начала активного сканирования — и это самая трудная часть для контроля защитником, потому что она живёт вне его сети.

## WHOIS: кто владеет доменом

```
$ whois example.com | grep -iE "registrar|creation|name server|registrant"
Registrar: RESERVED-Internet Assigned Numbers Authority
Creation Date: 1995-08-14T04:00:00Z
Name Server: A.IANA-SERVERS.NET
Name Server: B.IANA-SERVERS.NET
```

WHOIS показывает регистратора, даты регистрации и серверы имён. Исторически он раскрывал имена владельцев, почту и телефоны; сервисы приватности теперь скрывают большинство, но серверы имён и даты всё ещё помогают — старые домены и хостинг-провайдер полезный контекст.

`whois` на IP-адресе скажет, какая организация владеет этим блоком:

```
$ whois 8.8.8.8 | grep -iE "orgname|netrange|cidr"
NetRange:       8.8.8.0 - 8.8.8.255
CIDR:           8.8.8.0/24
OrgName:        Google LLC
```

Так одиночный IP превращается в весь диапазон, которым владеет организация.

## DNS-записи как разведка

Модуль сетей охватил `dig`; здесь это инструмент разведки. Вытяните записи, отображающие инфраструктуру организации:

```
$ dig +short example.com              # A-запись — основной IP
$ dig +short MX example.com           # почтовые серверы → почтовый провайдер
$ dig +short TXT example.com          # SPF, токены проверки, иногда внутренние заметки
$ dig +short NS example.com           # кто ведёт DNS
```

Ничто из этого не касается веб-сервера цели — запрашивается публичный DNS.

## Прозрачность сертификатов: золотая жила поддоменов

Каждый TLS-сертификат, выданный публичным CA, записывается в логи **прозрачности сертификатов**, которые может искать любой. Поскольку сертификаты называют покрываемые хосты, эти логи выдают поддомены, которые организация нигде не публиковала:

```
$ curl -s "https://crt.sh/?q=%25.example.com&output=json" \
  | python3 -c "import sys,json; [print(c['name_value']) for c in json.load(sys.stdin)]" \
  | sort -u | head
api.example.com
dev.example.com
internal.example.com
mail.example.com
vpn.example.com
```

Всплывший так поддомен `dev.` или `internal.` — классическая находка: забытый, менее укреплённый хост, найденный без единого пакета цели.

## Доркинг поисковиков

Операторы поиска превращают Google в инструмент разведки, сужая до одного сайта и рискованного контента:

```
site:example.com filetype:pdf          документы на домене
site:example.com inurl:admin           админ-страницы
site:example.com intitle:"index of"    открытые листинги каталогов
site:example.com ext:sql               утёкшие дампы баз
```

Google Hacking Database (GHDB) каталогизирует тысячи таких шаблонов для поиска открытых файлов, порталов входа и сообщений об ошибках, выдающих информацию.

## Сбор людей и хостов

`theHarvester` автоматизирует сбор почты, поддоменов и имён из публичных источников:

```
$ theHarvester -d example.com -b bing,crtsh,duckduckgo
[*] Emails found:
info@example.com
support@example.com
[*] Hosts found:
api.example.com
www.example.com
```

Форматы почты важны: обнаружение `first.last@example.com` даёт шаблон для каждого сотрудника, чьё имя вы нашли в LinkedIn — сырьё для password spraying и фишинга.

## Утечки кода и секретов

Разработчики коммитят секреты случайно. Публичные репозитории по ним ищутся:

```
$ trufflehog github --repo https://github.com/org/repo
Found verified result 🐷🔑
Detector Type: AWS
```

Утёкший API-ключ или пароль базы в истории git — прямой путь внутрь, не потребовавший никакого сканирования. `git log -p` в клонированном репозитории или инструменты вроде `gitleaks` достают секреты, удалённые из текущих файлов, но всё ещё в истории.

## Попробуйте (на своём домене или лаборатории)

1. `whois` своего домена. Что скрыто, а что всё ещё видно?
2. Поищите на `crt.sh` домен, которым владеете. Есть ли забытые поддомены?
3. Попробуйте `site:` с `filetype:pdf` на домене. Что публично проиндексировано?""",
        "questions": [
            q("Why are certificate transparency logs valuable for reconnaissance?",
              "Nega sertifikat shaffofligi loglari razvedka uchun qimmatli?",
              "Почему логи прозрачности сертификатов ценны для разведки?",
              ["They reveal subdomains without sending the target any packets",
               "They contain private keys", "They list all open ports",
               "They store employee passwords"],
              ["Ular nishonга paket yubormasдан subdomenларни oshkor qiladi",
               "Ular maxfiy kalitларni saqlaydi", "Ular barcha ochiq portларni sanaydi",
               "Ular xodim parolларni saqlaydi"],
              ["Раскрывают поддомены, не отправляя цели пакетов",
               "Содержат приватные ключи", "Перечисляют все открытые порты",
               "Хранят пароли сотрудников"], 0),
            q("`whois 8.8.8.8` is most useful for finding:",
              "`whois 8.8.8.8` nimани topish uchun eng foydali:",
              "`whois 8.8.8.8` полезнее всего для нахождения:",
              ["The IP range and organisation that owns the block",
               "The server's open ports", "The domain's subdomains",
               "The web server version"],
              ["Blokга egalik qiladigan IP diapazoni va tashkilot",
               "Serverning ochiq portlari", "Domenning subdomenlari",
               "Veb-server versiyasi"],
              ["Диапазон IP и организацию, владеющую блоком",
               "Открытые порты сервера", "Поддомены домена",
               "Версию веб-сервера"], 0),
            q("Discovering the email format `first.last@example.com` is valuable because:",
              "`first.last@example.com` email formatини topish qimmatli, chunki:",
              "Обнаружение формата почты `first.last@example.com` ценно, потому что:",
              ["It gives the address of any employee whose name you find",
               "It reveals their passwords", "It is a valid login token",
               "It bypasses the mail server"],
              ["U nomini topgan har qanday xodimning manzilини beradi",
               "U ularning parolларни oshkor qiladi", "U yaroqli kirish tokeni",
               "U pochta serverini chetlab o'tadi"],
              ["Даёт адрес любого сотрудника, чьё имя вы нашли",
               "Раскрывает их пароли", "Это валидный токен входа",
               "Обходит почтовый сервер"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "recon", "points": 70,
        "title": "Host discovery: finding what is alive",
        "titleUz": "Xost aniqlash: nima tirikligini topish",
        "titleRu": "Обнаружение хостов: найти, что живо",
        "content": r"""Before scanning ports you need targets. On a network of 254 possible addresses, most are empty. Host discovery finds the live ones first, so you spend your port scans only where something answers.

## The ping sweep with nmap

`-sn` tells nmap to discover hosts without scanning their ports:

```
$ nmap -sn 192.0.2.0/24
Nmap scan report for 192.0.2.1
Host is up (0.0012s latency).
Nmap scan report for 192.0.2.15
Host is up (0.0008s latency).
Nmap scan report for 192.0.2.20
Host is up (0.0021s latency).
Nmap done: 256 IP addresses (3 hosts up) scanned in 2.14 seconds
```

Three live hosts out of 256. Now you scan those three, not all 256 — an enormous saving on a real network.

Extract just the addresses for the next step:

```
$ nmap -sn 192.0.2.0/24 -oG - | awk '/Up/{print $2}'
192.0.2.1
192.0.2.15
192.0.2.20
```

`-oG -` is greppable output to stdout; `awk` pulls the IP from every "Up" line. This is how a discovery scan feeds a port scan.

## How discovery actually works, and why it can lie

`nmap -sn` does not rely on one probe. Depending on privilege and target location it sends a mix: ICMP echo (a classic ping), a TCP SYN to port 443, a TCP ACK to port 80, and an ICMP timestamp request. A host that ignores ping may still answer one of the others.

But discovery can still miss live hosts. A firewall that drops every probe type makes a live host look dead — the same lesson as the networking module: **silence is not proof of absence.** On an authorised engagement, if you have reason to believe hosts exist in a range that discovery calls empty, scan the ports directly with `-Pn` (below).

## -Pn: skip discovery, assume it is up

```
$ nmap -Pn 192.0.2.20
```

`-Pn` ("no ping") tells nmap to skip host discovery and port-scan the address as if it were up. Use it when discovery probes are blocked but you know or suspect the host is there. It is slower — nmap scans ports even on dead addresses — but it finds hosts that discovery alone would report as down.

## ARP: the most reliable discovery on a local network

On your own LAN segment, ARP is definitive. A machine cannot participate in the local network without answering ARP, so it cannot hide from it the way it can hide from ping:

```
$ sudo nmap -sn 192.0.2.0/24
```

When the target is local, nmap uses ARP for `-sn` automatically and it is both fast and impossible for a host to silently dodge. `arp-scan` does the same directly:

```
$ sudo arp-scan --localnet
192.0.2.1    00:1a:2b:3c:4d:5e   (gateway)
192.0.2.15   08:00:27:1f:3a:9c
192.0.2.20   08:00:27:aa:bb:cc
Interface: eth0, 3 hosts scanned
```

The MAC prefix even hints at the hardware or virtualisation platform (here `08:00:27` is VirtualBox).

## Reading the network you are on

Combine what the earlier modules taught. Your own address and mask tell you the range to sweep:

```
$ ip -brief addr show
lo    UNKNOWN  127.0.0.1/8
eth0  UP       192.0.2.15/24
```

`192.0.2.15/24` means your subnet is `192.0.2.0/24` — exactly the range to hand to `nmap -sn`. Discovery is not guesswork; it starts from arithmetic you already know.

## Try it (on your own LAN or lab)

1. `ip -brief addr show` — what is your subnet in CIDR form?
2. `sudo nmap -sn <your-subnet>` — how many hosts are up, and which is the gateway?
3. Pick one live host and note it. The next lesson scans its ports.""",
        "contentUz": r"""Portларni skanerlashдан oldin sizга nishonlar kerak. 254 mumkin manzилли tarmoqда aksari bo'sh. Xost aniqlash avval tiriklarını topadi, shunda port skanlaringizни faqat biror narsa javob beradigan joyга sarflaysiz.

## nmap bilan ping supurish

`-sn` nmap'га xostларни portларини skanerlamasдан aniqlashни aytadi:

```
$ nmap -sn 192.0.2.0/24
Nmap scan report for 192.0.2.1
Host is up (0.0012s latency).
Nmap scan report for 192.0.2.15
Host is up (0.0008s latency).
Nmap scan report for 192.0.2.20
Host is up (0.0021s latency).
Nmap done: 256 IP addresses (3 hosts up) scanned in 2.14 seconds
```

256 dан uch tirik xost. Endi siz o'sha uchtасini skanerlaysiz, hamma 256 emas — haqiqiy tarmoqда ulkan tejash.

Keyingi qadam uchun faqat manzилларni ajratib oling:

```
$ nmap -sn 192.0.2.0/24 -oG - | awk '/Up/{print $2}'
192.0.2.1
192.0.2.15
192.0.2.20
```

`-oG -` — stdout'га grep qilinadigan chiqish; `awk` har bir "Up" satrдан IP ni tortadi. Aniqlash skani port skanига shunday oziq beradi.

## Aniqlash aslida qanday ishlaydi va nega u yolg'on gapirishi mumkin

`nmap -sn` bitta zondга tayanmaydi. Imtiyoz va nishon joylashuvига qarab u aralashma yuboradi: ICMP echo (klassik ping), 443-portга TCP SYN, 80-portга TCP ACK va ICMP timestamp so'rovi. Ping'ni e'tiborsiz qoldiradigan xost boshqasidан biriga baribir javob berishi mumkin.

Lekin aniqlash baribir tirik xostларni o'tkazib yuborishi mumkin. Har bir zond turини tashlaydigan ekran tirik xostни o'lik ko'rsatadi — tarmoq moduli bilan bir xil dars: **sukunat yo'qlik dalili emas.** Ruxsat etilған ishда, agar aniqlash bo'sh deb atagan diapazonда xostlar borligiга asos bo'lsa, portларni to'g'ridan-to'g'ri `-Pn` bilan skanerlang (pastда).

## -Pn: aniqlashни o'tkazib yuborish, tirik deb hisoblash

```
$ nmap -Pn 192.0.2.20
```

`-Pn` ("ping yo'q") nmap'га xost aniqlashни o'tkazib yuborib, manzилни xuddi tirikдек port-skanerlashні aytadi. Aniqlash zondlari bloklanganда, lekin xost borligiни bilса yoki gumon qilса ishlating. U sekinroq — nmap o'lik manzилларда ham portларni skanerlaydi — lekin aniqlash yolg'iz o'lik deb xabar beradigan xostларni topadi.

## ARP: mahalliy tarmoqда eng ishonchli aniqlash

O'z LAN segmentingizда ARP qat'iy. Mashina ARP'га javob bermasдан mahalliy tarmoqда qatnasha olmaydi, shuning uchun u ping'дан yashiringandек undan yashira olmaydi:

```
$ sudo nmap -sn 192.0.2.0/24
```

Nishon mahalliy bo'lganда nmap `-sn` uchun ARP'ни avtomatik ishlatadi va u ham tez, ham xost sassiz qochib bo'lmaydigan. `arp-scan` xuddi shuni to'g'ridan-to'g'ri qiladi:

```
$ sudo arp-scan --localnet
192.0.2.1    00:1a:2b:3c:4d:5e   (gateway)
192.0.2.15   08:00:27:1f:3a:9c
192.0.2.20   08:00:27:aa:bb:cc
Interface: eth0, 3 hosts scanned
```

MAC prefiksi hatto apparat yoki virtualizatsiya platformasига ishora qiladi (bu yerда `08:00:27` — VirtualBox).

## Turган tarmog'ingizни o'qish

Oldingi modullar o'rgatganini birlashtiring. O'z manzилingiz va niqobingiz supuriladigan diapazonни aytadi:

```
$ ip -brief addr show
lo    UNKNOWN  127.0.0.1/8
eth0  UP       192.0.2.15/24
```

`192.0.2.15/24` degani quyi tarmog'ingiz `192.0.2.0/24` — aynan `nmap -sn` ga beriladigan diapazon. Aniqlash taxmin emas; u siz allaqachon biladigan arifmetikadан boshlanadi.

## Sinab ko'ring (o'z LAN yoki laboratoriyaда)

1. `ip -brief addr show` — quyi tarmog'ingiz CIDR shaklида qanday?
2. `sudo nmap -sn <quyi-tarmoq>` — nechta xost tirik va qaysi biri gateway?
3. Bitta tirik xostни tanlab, qayd qiling. Keyinги dars uning portларини skanerlaydi.""",
        "contentRu": r"""До сканирования портов нужны цели. В сети из 254 возможных адресов большинство пусты. Обнаружение хостов сначала находит живые, чтобы вы тратили сканы портов только там, где что-то отвечает.

## Ping-развёртка через nmap

`-sn` говорит nmap обнаруживать хосты, не сканируя их порты:

```
$ nmap -sn 192.0.2.0/24
Nmap scan report for 192.0.2.1
Host is up (0.0012s latency).
Nmap scan report for 192.0.2.15
Host is up (0.0008s latency).
Nmap scan report for 192.0.2.20
Host is up (0.0021s latency).
Nmap done: 256 IP addresses (3 hosts up) scanned in 2.14 seconds
```

Три живых хоста из 256. Теперь вы сканируете эти три, а не все 256 — огромная экономия в реальной сети.

Извлеките только адреса для следующего шага:

```
$ nmap -sn 192.0.2.0/24 -oG - | awk '/Up/{print $2}'
192.0.2.1
192.0.2.15
192.0.2.20
```

`-oG -` — greppable-вывод в stdout; `awk` тянет IP из каждой строки "Up". Так скан обнаружения питает скан портов.

## Как обнаружение работает и почему может лгать

`nmap -sn` не полагается на один зонд. В зависимости от привилегий и расположения цели он шлёт смесь: ICMP echo (классический ping), TCP SYN на порт 443, TCP ACK на порт 80 и запрос ICMP timestamp. Хост, игнорирующий ping, может ответить на один из других.

Но обнаружение всё же может пропустить живые хосты. Файрвол, отбрасывающий каждый тип зонда, делает живой хост похожим на мёртвый — тот же урок, что в модуле сетей: **тишина не доказательство отсутствия.** На авторизованной работе, если есть основания полагать, что хосты есть в диапазоне, который обнаружение зовёт пустым, сканируйте порты напрямую через `-Pn` (ниже).

## -Pn: пропустить обнаружение, считать живым

```
$ nmap -Pn 192.0.2.20
```

`-Pn` («без пинга») велит nmap пропустить обнаружение и сканировать порты адреса, как если бы он был жив. Используйте, когда зонды обнаружения заблокированы, но вы знаете или подозреваете, что хост там. Медленнее — nmap сканирует порты даже на мёртвых адресах — но находит хосты, которые одно обнаружение зовёт выключенными.

## ARP: надёжнейшее обнаружение в локальной сети

В своём сегменте LAN ARP окончателен. Машина не может участвовать в локальной сети, не отвечая на ARP, поэтому не спрячется от него, как прячется от ping:

```
$ sudo nmap -sn 192.0.2.0/24
```

Когда цель локальна, nmap использует ARP для `-sn` автоматически, и это и быстро, и невозможно для хоста тихо уклониться. `arp-scan` делает то же напрямую:

```
$ sudo arp-scan --localnet
192.0.2.1    00:1a:2b:3c:4d:5e   (gateway)
192.0.2.15   08:00:27:1f:3a:9c
192.0.2.20   08:00:27:aa:bb:cc
Interface: eth0, 3 hosts scanned
```

Префикс MAC даже намекает на железо или платформу виртуализации (здесь `08:00:27` — VirtualBox).

## Чтение сети, в которой вы находитесь

Соедините то, чему учили прошлые модули. Ваш адрес и маска говорят, какой диапазон развёртывать:

```
$ ip -brief addr show
lo    UNKNOWN  127.0.0.1/8
eth0  UP       192.0.2.15/24
```

`192.0.2.15/24` означает, что ваша подсеть `192.0.2.0/24` — ровно диапазон для `nmap -sn`. Обнаружение не догадка; оно начинается с арифметики, которую вы уже знаете.

## Попробуйте (на своей LAN или лаборатории)

1. `ip -brief addr show` — какова ваша подсеть в форме CIDR?
2. `sudo nmap -sn <ваша-подсеть>` — сколько хостов живо и который шлюз?
3. Выберите один живой хост и запишите. Следующий урок сканирует его порты.""",
        "questions": [
            q("What does `nmap -sn` do?",
              "`nmap -sn` nima qiladi?",
              "Что делает `nmap -sn`?",
              ["Discovers live hosts without scanning their ports",
               "Scans all ports on one host", "Detects service versions",
               "Runs vulnerability scripts"],
              ["Portларни skanerlamasдан tirik xostларni aniqlaydi",
               "Bitta xostда barcha portларni skanerlaydi", "Xizmat versiyaларни aniqlaydi",
               "Zaiflik skriptларни yuritadi"],
              ["Обнаруживает живые хосты, не сканируя их порты",
               "Сканирует все порты одного хоста", "Определяет версии служб",
               "Запускает скрипты уязвимостей"], 0),
            q("When is `-Pn` the right choice?",
              "`-Pn` qachon to'g'ri tanlov?",
              "Когда `-Pn` — правильный выбор?",
              ["When discovery probes are blocked but the host may still be up",
               "When you want the fastest possible scan", "When scanning is illegal",
               "When the host is definitely down"],
              ["Aniqlash zondlari bloklanган, lekin xost baribir tirik bo'lishi mumkinкан",
               "Eng tez skan xohlaganда", "Skanerlash noqonuniyкан",
               "Xost aniq o'chiqкан"],
              ["Когда зонды обнаружения заблокированы, но хост может быть жив",
               "Когда нужен самый быстрый скан", "Когда сканирование незаконно",
               "Когда хост точно выключен"], 0),
            q("Why is ARP the most reliable discovery method on a local segment?",
              "Nega ARP mahalliy segmentда eng ishonchli aniqlash usuli?",
              "Почему ARP — надёжнейший метод обнаружения в локальном сегменте?",
              ["A host cannot participate in the LAN without answering ARP",
               "ARP is encrypted", "ARP works across the internet",
               "ARP reveals open ports"],
              ["Xost ARP'га javob bermasдан LAN'да qatnasha olmaydi",
               "ARP shifrlanган", "ARP internet bo'ylab ishlaydi",
               "ARP ochiq portларни oshkor qiladi"],
              ["Хост не может участвовать в LAN, не отвечая на ARP",
               "ARP зашифрован", "ARP работает через интернет",
               "ARP раскрывает открытые порты"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "recon", "points": 80,
        "title": "Port scanning with nmap",
        "titleUz": "nmap bilan port skanerlash",
        "titleRu": "Сканирование портов с nmap",
        "content": r"""Port scanning is the core active-recon skill. A port that is open is a service you can reach, and every service is a potential way in. nmap is the standard tool; learning to read its output precisely is what separates a scan from a guess.

## The simplest scan

```
$ nmap 192.0.2.20
Nmap scan report for 192.0.2.20
Host is up (0.0011s latency).
Not shown: 997 closed tcp ports (reset)
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https
```

By default nmap scans the 1000 most common TCP ports. Read the three columns: the port, its state, and nmap's guess at the service (from a port-to-name table — a guess, not a fact until you check).

## The three states that matter

- **open** — a service is listening and accepted the connection. This is what you are hunting.
- **closed** — the host replied but nothing is listening on that port (a TCP RST came back).
- **filtered** — no reply at all; a firewall dropped the probe. You cannot tell open from closed behind it.

These are exactly the TCP handshake outcomes from the networking module: SYN-ACK means open, RST means closed, silence means filtered. A scanner is that logic, automated across many ports.

## The SYN scan, and why root

The default privileged scan is `-sS`, the SYN or "half-open" scan. It sends a SYN, reads the reply to classify the port, and sends a RST instead of completing the handshake — so the connection never fully opens. It is fast and was historically stealthier. It needs root to craft raw packets:

```
$ sudo nmap -sS 192.0.2.20
```

Without root, nmap falls back to `-sT`, the connect scan, which completes a full TCP handshake using the OS. It works as any user but is slower and more visible.

## Choosing which ports

The default 1000 ports miss services on unusual ports. Control the range explicitly:

```
$ nmap -p 22,80,443 192.0.2.20        # specific ports
$ nmap -p 1-1000 192.0.2.20           # a range
$ nmap -p- 192.0.2.20                 # ALL 65535 ports — thorough, slower
$ nmap --top-ports 100 192.0.2.20     # the 100 most common
```

**`-p-` is the one that finds what others miss.** A service deliberately moved to port 8022 or 31337 to hide is invisible to a default scan and obvious to `-p-`. On any real assessment, a full port scan is worth the wait — the interesting service is often the one not on a common port.

## Timing and noise

`-T0` to `-T5` trade speed for stealth:

```
$ nmap -T4 192.0.2.20        # fast, fine for most authorised scans
$ nmap -T2 192.0.2.20        # slower, quieter
$ nmap -T0 192.0.2.20        # paranoid — minutes between probes, for evading detection
```

`-T4` is the practical default. `-T5` can be so fast it drops results on a slow network; `-T0`/`-T1` are for staying under detection thresholds, at the cost of taking hours.

## UDP, the half everyone forgets

`-sS` scans TCP only. Important services — DNS (53), SNMP (161), DHCP — run on UDP, and a TCP-only scan misses them entirely:

```
$ sudo nmap -sU --top-ports 20 192.0.2.20
```

UDP scanning is slow and less reliable (no handshake to interpret), which is exactly why UDP services are so often overlooked, and why checking them finds things others missed.

## Saving output — always

On any real assessment, save every scan. You will refer back constantly, and the files are your evidence:

```
$ nmap -sS -sV -oA scan_192.0.2.20 192.0.2.20
```

`-oA` writes three formats at once: `.nmap` (human-readable), `.gnmap` (greppable), `.xml` (for other tools). Never run a scan you cannot reproduce or cite later.

## Try it (on scanme.nmap.org or your lab)

1. `nmap scanme.nmap.org` — which ports are open, and what services does nmap guess?
2. Compare a default scan with `nmap -p-`. Does the full scan find anything extra?
3. Run one scan with `-oA` and open the three output files. How do they differ?""",
        "contentUz": r"""Port skanerlash — aktiv-razvedkaning asosiy ko'nikmasi. Ochiq port — siz yeta oladigan xizmat, va har bir xizmat — potentsial kirish yo'li. nmap — standart vosita; uning chiqishини aniq o'qishни o'rganish skani taxmindан ajratadi.

## Eng oddiy skan

```
$ nmap 192.0.2.20
Nmap scan report for 192.0.2.20
Host is up (0.0011s latency).
Not shown: 997 closed tcp ports (reset)
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https
```

Sukut bo'yicha nmap 1000 ta eng keng tarqalган TCP portни skanerlaydi. Uch ustunni o'qing: port, uning holati va nmap'ning xizmatга taxmini (port-nom jadvalidан — taxmin, tekshirmaguningizca fakt emas).

## Muhim uch holat

- **open** — xizmat tinglayapti va ulanishни qabul qildi. Siz ovlayotган narsa shu.
- **closed** — xost javob berdi, lekin o'sha portда hech narsa tinglamayapti (TCP RST qaytdi).
- **filtered** — umuman javob yo'q; ekran zondni tashladi. Uning ortida open'ni closed'дан ajrata olmaysiz.

Bular aynan tarmoq modulidаgi TCP qo'l berish natijalari: SYN-ACK — open, RST — closed, sukunat — filtered. Skaner — o'sha mantiq, ko'p portlar bo'ylab avtomatlashtirilган.

## SYN skani va nega root

Sukut bo'yicha imtiyozli skan — `-sS`, SYN yoki "yarim ochiq" skan. U SYN yuboradi, portni tasniflash uchun javobни o'qiydi va qo'l berishни tugatish o'rniga RST yuboradi — shunda ulanish hech qachon to'liq ochilmaydi. U tez va tarixан yashirinroq edi. Xom paketlar yasash uchun unга root kerak:

```
$ sudo nmap -sS 192.0.2.20
```

Rootsiz nmap `-sT`, connect skanига qaytadi, u OS orqali to'liq TCP qo'l berishні tugatadi. U har qanday foydalanuvchи sifatида ishlaydi, lekin sekinroq va ko'proq ko'rinadi.

## Qaysi portларni tanlash

Sukut bo'yicha 1000 port g'ayrioddiy portlardаgi xizmatларni o'tkazib yuboradi. Diapazonni aniq boshqaring:

```
$ nmap -p 22,80,443 192.0.2.20        # aniq portlar
$ nmap -p 1-1000 192.0.2.20           # diapazon
$ nmap -p- 192.0.2.20                 # BARCHA 65535 port — puxta, sekinroq
$ nmap --top-ports 100 192.0.2.20     # 100 ta eng keng tarqalған
```

**`-p-` — boshqalar o'tkazib yuboradiganини topadigани.** Yashirinish uchun 8022 yoki 31337-portга ataylab ko'chirilган xizmat sukut bo'yicha skanга ko'rinmaydi va `-p-` ga aniq. Har qanday haqiqiy baholashда to'liq port skani kutishга arziydi — qiziq xizmat ko'pincha keng tarqalған portда bo'lmaganи.

## Vaqt va shovqin

`-T0` dан `-T5` gacha tezlikни yashirinlikка almashtiradi:

```
$ nmap -T4 192.0.2.20        # tez, aksar ruxsat etilған skanlar uchun yaxshi
$ nmap -T2 192.0.2.20        # sekinroq, jimroq
$ nmap -T0 192.0.2.20        # paranoid — zondlar orasида daqiqalar, aniqlashдан qochish uchun
```

`-T4` — amaliy standart. `-T5` sekin tarmoqда natijaларni tashlab yuboradigan darajада tez bo'lishi mumkin; `-T0`/`-T1` aniqlash chegaralari ostида qolish uchun, soatlar ketishi evaziga.

## UDP, hamma unutadigan yarmi

`-sS` faqat TCP ni skanerlaydi. Muhim xizmatlar — DNS (53), SNMP (161), DHCP — UDP'да ishlaydi, va faqat TCP skani ularni butunlay o'tkazib yuboradi:

```
$ sudo nmap -sU --top-ports 20 192.0.2.20
```

UDP skanerlash sekin va kamroq ishonchli (talqin qilinadigan qo'l berish yo'q), aynan shuning uchun UDP xizmatlari shunchalik ko'p e'tibordан chetда qoladi, va ularni tekshirish boshqalar o'tkazib yuborgan narsani topadi.

## Chiqishni saqlash — doim

Har qanday haqiqiy baholashда har bir skanни saqlang. Siz doim orqага murojaat qilasiz, va fayllar — sizning dalilingiz:

```
$ nmap -sS -sV -oA scan_192.0.2.20 192.0.2.20
```

`-oA` bir vaqtда uch formatда yozadi: `.nmap` (o'qiladigan), `.gnmap` (grep qilinadigan), `.xml` (boshqa vositalar uchun). Keyin qayta ishlab yoki keltira olmaydigan skanni hech qachon yuritmang.

## Sinab ko'ring (scanme.nmap.org yoki laboratoriyaда)

1. `nmap scanme.nmap.org` — qaysi portlar ochiq va nmap qanday xizmatларni taxmin qiladi?
2. Sukut skanni `nmap -p-` bilan solishtiring. To'liq skan qo'shimcha narsa topadimi?
3. Bitta skanni `-oA` bilan yuriting va uch chiqish faylini oching. Ular qanday farq qiladi?""",
        "contentRu": r"""Сканирование портов — ключевой навык активной разведки. Открытый порт — служба, до которой можно дотянуться, и каждая служба — потенциальный вход. nmap — стандартный инструмент; учиться точно читать его вывод — то, что отличает скан от догадки.

## Простейший скан

```
$ nmap 192.0.2.20
Nmap scan report for 192.0.2.20
Host is up (0.0011s latency).
Not shown: 997 closed tcp ports (reset)
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https
```

По умолчанию nmap сканирует 1000 самых частых TCP-портов. Читайте три столбца: порт, его состояние и догадку nmap о службе (из таблицы порт-имя — догадка, не факт, пока не проверите).

## Три важных состояния

- **open** — служба слушает и приняла соединение. Это то, за чем вы охотитесь.
- **closed** — хост ответил, но на этом порту ничто не слушает (вернулся TCP RST).
- **filtered** — ответа нет вовсе; файрвол отбросил зонд. За ним не отличить open от closed.

Это ровно исходы TCP-рукопожатия из модуля сетей: SYN-ACK — open, RST — closed, тишина — filtered. Сканер — эта логика, автоматизированная по многим портам.

## SYN-скан и почему root

Привилегированный скан по умолчанию — `-sS`, SYN или «полуоткрытый» скан. Он шлёт SYN, читает ответ для классификации порта и шлёт RST вместо завершения рукопожатия — так соединение никогда полностью не открывается. Он быстр и исторически скрытнее. Ему нужен root для создания сырых пакетов:

```
$ sudo nmap -sS 192.0.2.20
```

Без root nmap откатывается к `-sT`, connect-скану, завершающему полное TCP-рукопожатие через ОС. Он работает под любым пользователем, но медленнее и заметнее.

## Выбор портов

1000 портов по умолчанию пропускают службы на необычных портах. Управляйте диапазоном явно:

```
$ nmap -p 22,80,443 192.0.2.20        # конкретные порты
$ nmap -p 1-1000 192.0.2.20           # диапазон
$ nmap -p- 192.0.2.20                 # ВСЕ 65535 портов — тщательно, медленнее
$ nmap --top-ports 100 192.0.2.20     # 100 самых частых
```

**`-p-` — тот, что находит пропущенное другими.** Служба, намеренно перенесённая на порт 8022 или 31337 для скрытия, невидима скану по умолчанию и очевидна `-p-`. На любой реальной оценке полный скан портов стоит ожидания — интересная служба часто та, что не на частом порту.

## Тайминг и шум

`-T0` до `-T5` меняют скорость на скрытность:

```
$ nmap -T4 192.0.2.20        # быстро, годится для большинства авторизованных сканов
$ nmap -T2 192.0.2.20        # медленнее, тише
$ nmap -T0 192.0.2.20        # параноидальный — минуты между зондами, для обхода обнаружения
```

`-T4` — практический стандарт. `-T5` может быть так быстр, что теряет результаты в медленной сети; `-T0`/`-T1` — чтобы держаться под порогами обнаружения, ценой часов.

## UDP, половина, о которой все забывают

`-sS` сканирует только TCP. Важные службы — DNS (53), SNMP (161), DHCP — работают на UDP, и скан только по TCP их полностью пропускает:

```
$ sudo nmap -sU --top-ports 20 192.0.2.20
```

Сканирование UDP медленное и менее надёжное (нет рукопожатия для интерпретации), именно поэтому UDP-службы так часто упускают, и поэтому их проверка находит пропущенное другими.

## Сохранение вывода — всегда

На любой реальной оценке сохраняйте каждый скан. Вы будете к ним постоянно возвращаться, а файлы — ваша улика:

```
$ nmap -sS -sV -oA scan_192.0.2.20 192.0.2.20
```

`-oA` пишет три формата разом: `.nmap` (читаемый), `.gnmap` (greppable), `.xml` (для других инструментов). Никогда не запускайте скан, который не сможете воспроизвести или процитировать.

## Попробуйте (на scanme.nmap.org или лаборатории)

1. `nmap scanme.nmap.org` — какие порты открыты и какие службы угадывает nmap?
2. Сравните скан по умолчанию с `nmap -p-`. Находит ли полный скан лишнее?
3. Запустите один скан с `-oA` и откройте три файла вывода. Чем они различаются?""",
        "questions": [
            q("In nmap output, what does a state of `filtered` mean?",
              "nmap chiqishида `filtered` holati nimани bildiradi?",
              "В выводе nmap что означает состояние `filtered`?",
              ["No reply came back — a firewall dropped the probe",
               "A service accepted the connection", "Nothing is listening",
               "The port is open but slow"],
              ["Javob qaytmadi — ekran zondni tashladi",
               "Xizmat ulanishни qabul qildi", "Hech narsa tinglamayapti",
               "Port ochiq, lekin sekin"],
              ["Ответа не пришло — файрвол отбросил зонд",
               "Служба приняла соединение", "Ничто не слушает",
               "Порт открыт, но медленный"], 0),
            q("Why run `nmap -p-` despite it being slower?",
              "Nega `nmap -p-` sekinroq bo'lса ham yuritish kerak?",
              "Зачем запускать `nmap -p-`, несмотря на медленность?",
              ["It scans all 65535 ports, finding services hidden on unusual ports",
               "It is stealthier", "It scans UDP as well",
               "It detects the operating system"],
              ["U barcha 65535 portни skanerlaydi, g'ayrioddiy portlardаgi yashirin xizmatларni topadi",
               "U yashirinroq", "U UDP ni ham skanerlaydi",
               "U operatsion tizimni aniqlaydi"],
              ["Он сканирует все 65535 портов, находя службы на необычных портах",
               "Он скрытнее", "Он сканирует и UDP",
               "Он определяет ОС"], 0),
            q("Why does the default `-sS` scan require root?",
              "Nega sukut bo'yicha `-sS` skani root talab qiladi?",
              "Почему скан `-sS` по умолчанию требует root?",
              ["It crafts raw SYN packets, a privileged operation",
               "It writes to /etc", "It opens port 80",
               "It reads /etc/shadow"],
              ["U xom SYN paketlar yasaydi, imtiyozli amal",
               "U /etc ga yozadi", "U 80-portni ochadi",
               "U /etc/shadow ni o'qiydi"],
              ["Он создаёт сырые SYN-пакеты, привилегированная операция",
               "Он пишет в /etc", "Он открывает порт 80",
               "Он читает /etc/shadow"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "recon", "points": 80,
        "title": "Service and version detection",
        "titleUz": "Xizmat va versiyani aniqlash",
        "titleRu": "Определение служб и версий",
        "content": r"""Knowing a port is open is only half the answer. "Port 80 is open" tells you little; "port 80 is Apache 2.4.41 on Ubuntu" tells you which vulnerabilities to look up. Version detection is the bridge from scanning to exploitation.

## -sV: ask the service what it is

The plain scan guesses the service from the port number. `-sV` connects and reads what the service actually says about itself:

```
$ sudo nmap -sV -p 5432 127.0.0.1
PORT     STATE SERVICE    VERSION
5432/tcp open  postgresql PostgreSQL DB
```

That is real output from this course's own machine. On a fuller target `-sV` produces the version strings that drive everything after:

```
PORT    STATE SERVICE VERSION
22/tcp  open  ssh     OpenSSH 8.4p1 Debian 5+deb11u3 (protocol 2.0)
80/tcp  open  http    Apache httpd 2.4.41 ((Ubuntu))
3306/tcp open mysql   MySQL 5.7.33
```

`OpenSSH 8.4p1`, `Apache 2.4.41`, `MySQL 5.7.33` — each exact version is a search you can run against a vulnerability database. This line is where recon starts pointing at specific exploits.

## Intensity, when a service is stubborn

Some services resist identification. `--version-intensity` (0 light to 9 aggressive) controls how hard nmap probes:

```
$ sudo nmap -sV --version-intensity 9 -p 5432 127.0.0.1
```

Higher intensity tries more probes and is more likely to name an unusual or deliberately obscured service, at the cost of speed and noise.

## Banner grabbing by hand

`-sV` is automated banner grabbing. You can do it manually, which is worth understanding because it shows exactly where the version came from:

```
$ nc 192.0.2.20 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u3
```

The service announced its own version on connection. For HTTP, ask for the headers:

```
$ curl -sI http://192.0.2.20 | grep -i server
Server: Apache/2.4.41 (Ubuntu)
```

Banner grabbing is the whole idea behind version detection: most services volunteer their identity, and the version string is a gift to an attacker and a liability for a defender who forgot to suppress it.

## OS detection

`-O` guesses the operating system from subtle differences in how the TCP/IP stack behaves — initial TTL, window sizes, option ordering:

```
$ sudo nmap -O 192.0.2.20
Running: Linux 5.X
OS CPE: cpe:/o:linux:linux_kernel:5
OS details: Linux 5.4 - 5.15
```

It is a guess based on fingerprints and needs root, but "this is Linux 5.x" versus "this is Windows Server 2019" changes your entire approach — different services, different privilege-escalation paths, different exploits.

## The one-command recon scan

In practice these are combined. `-sC -sV` runs the default scripts plus version detection, and `-A` bundles that with OS detection and traceroute:

```
$ sudo nmap -sV -sC -p- -oA full_scan 192.0.2.20
$ sudo nmap -A 192.0.2.20                 # aggressive: -sV -sC -O --traceroute
```

`-sC` runs nmap's default NSE scripts — safe, informative checks that pull banners, list SMB shares, grab HTTP titles, and more, turning a bare port list into a rich profile.

## Reading it as an attacker or defender

The same output serves both. To the attacker, `Apache 2.4.41` is a lookup for known vulnerabilities in exactly that version. To the defender, it is a finding: the server is advertising a version, that version has known issues, and either it needs patching or the banner needs suppressing. The version detection lesson is where offence and defence become the same skill applied in opposite directions.

## Try it (on scanme.nmap.org or your lab)

1. `sudo nmap -sV scanme.nmap.org` — what exact versions does it report?
2. `nc <host> 22` against an SSH server. What version banner comes back?
3. `sudo nmap -A <lab host>` — what does the combined scan tell you that a plain scan did not?""",
        "contentUz": r"""Portning ochiqligini bilish javobning faqat yarmi. "80-port ochiq" sizga kam narsa aytadi; "80-port Ubuntu'даgi Apache 2.4.41" qaysi zaifliklarни izlashni aytadi. Versiyani aniqlash — skanerlashдан ekspluatatsiyaга ko'prik.

## -sV: xizmatдан u nima ekanini so'rash

Oddiy skan xizmatни port raqamidан taxmin qiladi. `-sV` ulanadi va xizmat o'zi haqidа aslida nima deyishini o'qiydi:

```
$ sudo nmap -sV -p 5432 127.0.0.1
PORT     STATE SERVICE    VERSION
5432/tcp open  postgresql PostgreSQL DB
```

Bu — shu kursning o'z mashinasidан haqiqiy chiqish. To'liqroq nishonда `-sV` keyingi hamma narsani boshqaradigan versiya satrларni beradi:

```
PORT    STATE SERVICE VERSION
22/tcp  open  ssh     OpenSSH 8.4p1 Debian 5+deb11u3 (protocol 2.0)
80/tcp  open  http    Apache httpd 2.4.41 ((Ubuntu))
3306/tcp open mysql   MySQL 5.7.33
```

`OpenSSH 8.4p1`, `Apache 2.4.41`, `MySQL 5.7.33` — har bir aniq versiya zaiflik ma'lumotlar bazasiга qarshi yuritа oladigan qidiruv. Bu satr — razvedka aniq eksploitlarга ishora qila boshlaydigan joy.

## Intensivlik, xizmat qaysar bo'lganда

Ba'zi xizmatlar aniqlashга qarshilik qiladi. `--version-intensity` (0 yengil dан 9 agressiv) nmap qanchalik kuchli zondlashini boshqaradi:

```
$ sudo nmap -sV --version-intensity 9 -p 5432 127.0.0.1
```

Yuqoriroq intensivlik ko'proq zond sinaydi va g'ayrioddiy yoki ataylab yashirilган xizmatni nomlash ehtimoli ko'proq, tezlik va shovqin evaziga.

## Qo'lда banner olish

`-sV` — avtomatlashtirilган banner olish. Uni qo'lда qilishingiz mumkin, bu tushunishга arziydi, chunki u versiya qayerdан kelganини aniq ko'rsatadi:

```
$ nc 192.0.2.20 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u3
```

Xizmat ulanishда o'z versiyaсини e'lon qildi. HTTP uchun sarlavhalarни so'rang:

```
$ curl -sI http://192.0.2.20 | grep -i server
Server: Apache/2.4.41 (Ubuntu)
```

Banner olish — versiyani aniqlashning butun g'oyasi: aksar xizmatlar o'z shaxsini ixtiyoriy beradi, va versiya satri — hujumchi uchun sovg'a, banner'ni bostirishни unutган himoyachi uchun mas'uliyat.

## OS aniqlash

`-O` operatsion tizimni TCP/IP steki qanday xatti-harakat qilishidаgi nozik farqlardан taxmin qiladi — boshlang'ich TTL, oyna o'lchamlari, opsiyalar tartibi:

```
$ sudo nmap -O 192.0.2.20
Running: Linux 5.X
OS CPE: cpe:/o:linux:linux_kernel:5
OS details: Linux 5.4 - 5.15
```

Bu barmoq izlariга asoslangan taxmin va root talab qiladi, lekin "bu Linux 5.x" va "bu Windows Server 2019" butun yondashuvingizни o'zgartiradi — turli xizmatlar, turli imtiyoz oshirish yo'llari, turli eksploitlar.

## Bitta buyruqли razvedka skani

Amalда bular birlashtiriladi. `-sC -sV` sukut skriptlar + versiya aniqlashni yuritadi, va `-A` uni OS aniqlash va traceroute bilan birlashtiradi:

```
$ sudo nmap -sV -sC -p- -oA full_scan 192.0.2.20
$ sudo nmap -A 192.0.2.20                 # agressiv: -sV -sC -O --traceroute
```

`-sC` nmap'ning sukut NSE skriptларни yuritadi — banner'larni tortadigan, SMB ulushларni sanaydigan, HTTP sarlavhalarни oladigan xavfsiz, ma'lumotli tekshiruvlar, yalang'och port ro'yxatini boy profilга aylantiradi.

## Uni hujumchi yoki himoyachi sifatида o'qish

Bir xil chiqish ikkalasига xizmat qiladi. Hujumchiга `Apache 2.4.41` — aynan o'sha versiyaдаgi ma'lum zaifliklар qidiruvi. Himoyachiга bu topilma: server versiyani e'lon qilyapti, o'sha versiyада ma'lum muammolar bor, va yo uni yamash kerak, yo banner'ni bostirish kerak. Versiya aniqlash darsi — hujum va himoya qarama-qarshi yo'nalishда qo'llanган bir xil ko'nikmага aylanadigan joy.

## Sinab ko'ring (scanme.nmap.org yoki laboratoriyaда)

1. `sudo nmap -sV scanme.nmap.org` — u qanday aniq versiyаларни xabar qiladi?
2. SSH serverга qarshi `nc <host> 22`. Qanday versiya banner qaytadi?
3. `sudo nmap -A <lab xost>` — birlashган skan oddiy skan aytmagan nimани aytadi?""",
        "contentRu": r"""Знать, что порт открыт — лишь половина ответа. «Порт 80 открыт» говорит мало; «порт 80 — Apache 2.4.41 на Ubuntu» говорит, какие уязвимости искать. Определение версии — мост от сканирования к эксплуатации.

## -sV: спросить службу, что она такое

Простой скан угадывает службу по номеру порта. `-sV` подключается и читает, что служба сама о себе говорит:

```
$ sudo nmap -sV -p 5432 127.0.0.1
PORT     STATE SERVICE    VERSION
5432/tcp open  postgresql PostgreSQL DB
```

Это реальный вывод с машины самого курса. На более полной цели `-sV` даёт строки версий, которые управляют всем дальнейшим:

```
PORT    STATE SERVICE VERSION
22/tcp  open  ssh     OpenSSH 8.4p1 Debian 5+deb11u3 (protocol 2.0)
80/tcp  open  http    Apache httpd 2.4.41 ((Ubuntu))
3306/tcp open mysql   MySQL 5.7.33
```

`OpenSSH 8.4p1`, `Apache 2.4.41`, `MySQL 5.7.33` — каждая точная версия это поиск по базе уязвимостей. Эта строка — место, где разведка начинает указывать на конкретные эксплойты.

## Интенсивность, когда служба упряма

Некоторые службы сопротивляются опознанию. `--version-intensity` (0 лёгкий до 9 агрессивный) управляет тем, насколько сильно nmap зондирует:

```
$ sudo nmap -sV --version-intensity 9 -p 5432 127.0.0.1
```

Более высокая интенсивность пробует больше зондов и вероятнее назовёт необычную или намеренно скрытую службу, ценой скорости и шума.

## Захват баннера вручную

`-sV` — автоматизированный захват баннера. Его можно сделать вручную, что стоит понимать, ведь это показывает, откуда взялась версия:

```
$ nc 192.0.2.20 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u3
```

Служба объявила свою версию при подключении. Для HTTP запросите заголовки:

```
$ curl -sI http://192.0.2.20 | grep -i server
Server: Apache/2.4.41 (Ubuntu)
```

Захват баннера — вся идея определения версии: большинство служб добровольно выдают свою личность, и строка версии — подарок атакующему и уязвимость для защитника, забывшего её скрыть.

## Определение ОС

`-O` угадывает ОС по тонким различиям в поведении стека TCP/IP — начальный TTL, размеры окон, порядок опций:

```
$ sudo nmap -O 192.0.2.20
Running: Linux 5.X
OS CPE: cpe:/o:linux:linux_kernel:5
OS details: Linux 5.4 - 5.15
```

Это догадка по отпечаткам и нужен root, но «это Linux 5.x» против «это Windows Server 2019» меняет весь подход — другие службы, другие пути повышения привилегий, другие эксплойты.

## Однокомандный скан разведки

На практике их сочетают. `-sC -sV` запускает скрипты по умолчанию плюс определение версии, а `-A` объединяет это с определением ОС и traceroute:

```
$ sudo nmap -sV -sC -p- -oA full_scan 192.0.2.20
$ sudo nmap -A 192.0.2.20                 # агрессивный: -sV -sC -O --traceroute
```

`-sC` запускает скрипты NSE по умолчанию — безопасные информативные проверки, тянущие баннеры, перечисляющие SMB-шары, забирающие заголовки HTTP, превращая голый список портов в богатый профиль.

## Чтение как атакующий или защитник

Один вывод служит обоим. Атакующему `Apache 2.4.41` — поиск известных уязвимостей ровно этой версии. Защитнику это находка: сервер рекламирует версию, у этой версии есть известные проблемы, и либо её надо патчить, либо баннер скрывать. Урок определения версии — место, где нападение и защита становятся одним навыком в противоположных направлениях.

## Попробуйте (на scanme.nmap.org или лаборатории)

1. `sudo nmap -sV scanme.nmap.org` — какие точные версии он сообщает?
2. `nc <host> 22` против SSH-сервера. Какой баннер версии вернулся?
3. `sudo nmap -A <lab-хост>` — что объединённый скан говорит такого, чего не сказал простой?""",
        "questions": [
            q("What does `nmap -sV` provide beyond a default scan?",
              "`nmap -sV` sukut skandан tashqari nimани beradi?",
              "Что `nmap -sV` даёт сверх скана по умолчанию?",
              ["The exact software and version behind each open port",
               "A list of all 65535 ports", "The operating system only",
               "A guaranteed exploit"],
              ["Har bir ochiq port ortidаgi aniq dastur va versiya",
               "Barcha 65535 port ro'yxati", "Faqat operatsion tizim",
               "Kafolatlangan eksploit"],
              ["Точное ПО и версию за каждым открытым портом",
               "Список всех 65535 портов", "Только ОС",
               "Гарантированный эксплойт"], 0),
            q("Why is the exact version string so valuable to an attacker?",
              "Nega aniq versiya satri hujumchи uchun shunchalik qimmatли?",
              "Почему точная строка версии так ценна атакующему?",
              ["It can be looked up against known vulnerabilities for that version",
               "It contains the admin password", "It disables the firewall",
               "It is the session token"],
              ["Uni o'sha versiya uchun ma'lum zaifliklарga qarshi izlash mumkin",
               "U admin parolини o'z ichига oladi", "U ekranни o'chiradi",
               "U sessiya tokeni"],
              ["Её можно искать по известным уязвимостям этой версии",
               "Содержит пароль администратора", "Отключает файрвол",
               "Это токен сессии"], 0),
            q("`nmap -O` determines the OS by:",
              "`nmap -O` OS ni qanday aniqlaydi:",
              "`nmap -O` определяет ОС по:",
              ["Fingerprinting subtle TCP/IP stack behaviour",
               "Reading /etc/os-release remotely", "Asking the SSH banner",
               "Checking the MAC address only"],
              ["TCP/IP steki nozik xatti-harakatини barmoq iziга olib",
               "/etc/os-release ni masofadan o'qib", "SSH banner'дан so'rab",
               "Faqat MAC manzилни tekshirib"],
              ["Снятию отпечатка тонкого поведения стека TCP/IP",
               "Удалённому чтению /etc/os-release", "Запросу баннера SSH",
               "Проверке только MAC-адреса"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "recon", "points": 80,
        "title": "Enumerating services in depth",
        "titleUz": "Xizmatларni chuqur sanash",
        "titleRu": "Глубокое перечисление служб",
        "content": r"""A scan tells you a service is there; enumeration wrings every detail out of it. This is where most footholds are actually found — not through a clever exploit, but through a misconfigured share, an anonymous login, or a service that answers more than it should.

## The enumeration mindset

For each open port, ask: what does this service let me query *before* authenticating? Many are surprisingly talkative. The pattern is always the same — connect, ask the standard questions, read what comes back.

## SMB (445): the classic enumeration target

SMB is Windows file sharing and a historic source of footholds. `enum4linux` runs the standard checks at once:

```
$ enum4linux -a 192.0.2.20
[+] Enumerating users using SID cycling
user:[administrator] rid:[0x1f4]
user:[guest] rid:[0x1f5]
user:[jsmith] rid:[0x3e9]
[+] Share Enumeration
Sharename       Type      Comment
backup          Disk      Backup files
IPC$            IPC       Remote IPC
```

Usernames and share names, before any login. List and connect to shares directly with `smbclient`:

```
$ smbclient -L //192.0.2.20 -N            # -N = no password (anonymous)
$ smbclient //192.0.2.20/backup -N
smb: \> ls
smb: \> get sensitive.txt
```

An anonymously readable share named `backup` is a textbook finding — often it holds exactly what its name promises.

## FTP (21): check anonymous first

Before anything clever, try the anonymous login that FTP historically allowed:

```
$ ftp 192.0.2.20
Name: anonymous
Password: (anything)
230 Login successful.
ftp> ls
```

`230 Login successful` for `anonymous` means the whole FTP tree is readable without credentials. Always test this — it costs one command and is a common misconfiguration.

## Web (80/443): enumerate the application

Combine the web module's tools with recon. Fingerprint the stack, then find hidden paths:

```
$ whatweb http://192.0.2.20
$ nikto -h http://192.0.2.20
+ Server: Apache/2.4.41
+ /admin/: Admin login page found.
+ OSVDB-3268: /backup/: Directory indexing found.
$ gobuster dir -u http://192.0.2.20 -w /usr/share/wordlists/dirb/common.txt
```

`nikto` is a web server scanner that checks thousands of known dangerous files and misconfigurations in one pass — noisy, but it surfaces the obvious problems fast.

## SNMP (161/udp): the overlooked goldmine

SNMP runs on UDP, so a TCP scan misses it, and it is often left with the default community string `public`. When it is, it hands over a remarkable amount:

```
$ snmpwalk -v2c -c public 192.0.2.20
SNMPv2-MIB::sysDescr.0 = STRING: Linux target 5.4.0
HOST-RESOURCES-MIB::hrSWRunName = STRING: sshd
HOST-RESOURCES-MIB::hrSWRunName = STRING: apache2
```

Running processes, installed software, network interfaces, sometimes user accounts — all from a service most scans skip. Checking UDP 161 with the string `public` is a habit that pays off often.

## The universal habit: default and anonymous access

Across every service the same two questions find most footholds:

1. **Does it allow anonymous or unauthenticated access?** FTP `anonymous`, SMB null sessions, open NFS exports, unauthenticated web endpoints.
2. **Does it still use default credentials?** `admin/admin`, `root/root`, SNMP `public`, vendor defaults documented online.

Neither needs an exploit. Both are configuration failures, and both are found by simply *trying* — which is why methodical enumeration beats clever exploitation more often than beginners expect.

## Nmap scripts for enumeration

The NSE library automates much of this:

```
$ nmap --script smb-enum-shares,smb-enum-users -p 445 192.0.2.20
$ nmap --script ftp-anon -p 21 192.0.2.20
$ nmap --script http-enum -p 80 192.0.2.20
```

`--script` runs targeted checks; the script names read like what they do. `ls /usr/share/nmap/scripts/` lists the hundreds available.

## Try it (on a deliberately vulnerable lab: Metasploitable, HTB)

1. Find an open FTP port and test the `anonymous` login.
2. `smbclient -L //<host> -N` — are any shares listed without a password?
3. If UDP 161 is open, `snmpwalk -v2c -c public <host>`. What does it reveal?""",
        "contentUz": r"""Skan sizga xizmat borligини aytadi; sanash undan har bir tafsilotni siqib chiqaradi. Aksar tayanch nuqtalar aslida shu yerда topiladi — ayyor eksploit orqali emas, balki noto'g'ri sozlanган ulush, anonim kirish yoki kerakidан ko'proq javob beradigan xizmat orqali.

## Sanash tafakkuri

Har bir ochiq port uchun so'rang: bu xizmat autentifikatsiyaдан *oldin* nimani so'rashга ruxsat beradi? Ko'plari hayratlanarli darajада gapiruvchan. Naqsh doim bir xil — ulaning, standart savollarни bering, qaytanini o'qing.

## SMB (445): klassik sanash nishoni

SMB — Windows fayl almashish va tayanch nuqtalarning tarixiy manbai. `enum4linux` standart tekshiruvларни birdan yuritadi:

```
$ enum4linux -a 192.0.2.20
[+] Enumerating users using SID cycling
user:[administrator] rid:[0x1f4]
user:[guest] rid:[0x1f5]
user:[jsmith] rid:[0x3e9]
[+] Share Enumeration
Sharename       Type      Comment
backup          Disk      Backup files
IPC$            IPC       Remote IPC
```

Foydalanuvchi nomlari va ulush nomlari, har qanday kirishдан oldin. Ulushларni `smbclient` bilan to'g'ridan-to'g'ri sanang va ulaning:

```
$ smbclient -L //192.0.2.20 -N            # -N = parolsiz (anonim)
$ smbclient //192.0.2.20/backup -N
smb: \> ls
smb: \> get sensitive.txt
```

`backup` deb nomlangan anonim o'qiladigan ulush — darslik topilmasi: ko'pincha u nomi va'da qilganini aynan saqlaydi.

## FTP (21): avval anonimni tekshiring

Har qanday ayyor narsadан oldin FTP tarixан ruxsat bergan anonim kirishни sinang:

```
$ ftp 192.0.2.20
Name: anonymous
Password: (istalgan narsa)
230 Login successful.
ftp> ls
```

`anonymous` uchun `230 Login successful` degani butun FTP daraxti hisob ma'lumotlarисиз o'qiladi. Buni doim sinang — bir buyruq turadi va keng tarqalган noto'g'ri sozlash.

## Veb (80/443): ilovani sanang

Veb modulining vositalarини razvedka bilan birlashtiring. To'plamni aniqlang, keyin yashirin yo'llarني toping:

```
$ whatweb http://192.0.2.20
$ nikto -h http://192.0.2.20
+ Server: Apache/2.4.41
+ /admin/: Admin login page found.
+ OSVDB-3268: /backup/: Directory indexing found.
$ gobuster dir -u http://192.0.2.20 -w /usr/share/wordlists/dirb/common.txt
```

`nikto` — veb-server skaneri, minglab ma'lum xavfli fayllar va noto'g'ri sozlashларni bir o'tishда tekshiradi — shovqinli, lekin aniq muammolarни tez sug'urib oladi.

## SNMP (161/udp): e'tibordан chetда qolган oltin kon

SNMP UDP'да ishlaydi, shuning uchun TCP skani uni o'tkazib yuboradi, va u ko'pincha sukut jamoa satri `public` bilan qoldiriladi. Shunda u ajoyib miqdorда beradi:

```
$ snmpwalk -v2c -c public 192.0.2.20
SNMPv2-MIB::sysDescr.0 = STRING: Linux target 5.4.0
HOST-RESOURCES-MIB::hrSWRunName = STRING: sshd
HOST-RESOURCES-MIB::hrSWRunName = STRING: apache2
```

Ishlayotган jarayonlar, o'rnatilган dastur, tarmoq interfeyslari, ba'zан foydalanuvchi hisoblari — hammasi aksar skanlar o'tkazib yuboradigan xizmatдан. UDP 161 ni `public` satri bilan tekshirish — ko'pincha samara beradigan odat.

## Universal odat: sukut va anonim kirish

Har bir xizmat bo'ylab bir xil ikki savol aksar tayanch nuqtaларni topadi:

1. **U anonim yoki autentifikatsiyaсиз kirishга ruxsat beradimi?** FTP `anonymous`, SMB null sessiyalar, ochiq NFS eksportlar, autentifikatsiyaсиз veb endpointlar.
2. **U hamon sukut hisob ma'lumotlarини ishlatadimi?** `admin/admin`, `root/root`, SNMP `public`, onlaynда hujjatlashtirилган ishlab chiqaruvchi sukutlari.

Ikkalasига ham eksploit kerak emas. Ikkalasi ham konfiguratsiya nosozliklari, va ikkalasi ham shunchaki *sinash* orqali topiladi — aynan shuning uchun uslubiy sanash boshlovchilar kutganидan ko'proq ayyor ekspluatatsiyани yengadi.

## Sanash uchun Nmap skriptlari

NSE kutubxonasi buning aksarини avtomatlashtiradi:

```
$ nmap --script smb-enum-shares,smb-enum-users -p 445 192.0.2.20
$ nmap --script ftp-anon -p 21 192.0.2.20
$ nmap --script http-enum -p 80 192.0.2.20
```

`--script` maqsadли tekshiruvларni yuritadi; skript nomlari nima qilishini o'qigandек. `ls /usr/share/nmap/scripts/` mavjud yuzlabини sanaydi.

## Sinab ko'ring (ataylab zaif laboratoriyада: Metasploitable, HTB)

1. Ochiq FTP portni toping va `anonymous` kirishни sinang.
2. `smbclient -L //<host> -N` — parolsiz sanalган ulushlar bormi?
3. Agar UDP 161 ochiq bo'lsa, `snmpwalk -v2c -c public <host>`. U nimani oshkor qiladi?""",
        "contentRu": r"""Скан говорит, что служба есть; перечисление выжимает из неё каждую деталь. Именно здесь на деле находят большинство точек опоры — не хитрым эксплойтом, а неверно настроенной шарой, анонимным входом или службой, отвечающей больше, чем следует.

## Мышление перечисления

Для каждого открытого порта спросите: что эта служба даёт запросить *до* аутентификации? Многие удивительно разговорчивы. Шаблон всегда один — подключиться, задать стандартные вопросы, прочитать ответ.

## SMB (445): классическая цель перечисления

SMB — общий доступ к файлам Windows и исторический источник точек опоры. `enum4linux` запускает стандартные проверки разом:

```
$ enum4linux -a 192.0.2.20
[+] Enumerating users using SID cycling
user:[administrator] rid:[0x1f4]
user:[guest] rid:[0x1f5]
user:[jsmith] rid:[0x3e9]
[+] Share Enumeration
Sharename       Type      Comment
backup          Disk      Backup files
IPC$            IPC       Remote IPC
```

Имена пользователей и шар, до всякого входа. Перечислите и подключитесь к шарам напрямую через `smbclient`:

```
$ smbclient -L //192.0.2.20 -N            # -N = без пароля (анонимно)
$ smbclient //192.0.2.20/backup -N
smb: \> ls
smb: \> get sensitive.txt
```

Анонимно читаемая шара с именем `backup` — учебная находка: часто она хранит ровно то, что обещает имя.

## FTP (21): сначала проверьте анонимный

До всего хитрого попробуйте анонимный вход, который FTP исторически разрешал:

```
$ ftp 192.0.2.20
Name: anonymous
Password: (что угодно)
230 Login successful.
ftp> ls
```

`230 Login successful` для `anonymous` означает, что всё дерево FTP читается без учётных данных. Всегда проверяйте — стоит одной команды и частая ошибка конфигурации.

## Веб (80/443): перечислите приложение

Соедините инструменты веб-модуля с разведкой. Снимите отпечаток стека, затем найдите скрытые пути:

```
$ whatweb http://192.0.2.20
$ nikto -h http://192.0.2.20
+ Server: Apache/2.4.41
+ /admin/: Admin login page found.
+ OSVDB-3268: /backup/: Directory indexing found.
$ gobuster dir -u http://192.0.2.20 -w /usr/share/wordlists/dirb/common.txt
```

`nikto` — сканер веб-серверов, проверяющий тысячи известных опасных файлов и неверных настроек за один проход — шумный, но быстро выносит очевидные проблемы.

## SNMP (161/udp): упускаемая золотая жила

SNMP работает на UDP, поэтому TCP-скан его пропускает, и его часто оставляют с community-строкой по умолчанию `public`. Тогда он выдаёт поразительно много:

```
$ snmpwalk -v2c -c public 192.0.2.20
SNMPv2-MIB::sysDescr.0 = STRING: Linux target 5.4.0
HOST-RESOURCES-MIB::hrSWRunName = STRING: sshd
HOST-RESOURCES-MIB::hrSWRunName = STRING: apache2
```

Запущенные процессы, установленное ПО, сетевые интерфейсы, иногда учётки — всё от службы, которую большинство сканов пропускают. Проверять UDP 161 со строкой `public` — привычка, часто окупающаяся.

## Универсальная привычка: доступ по умолчанию и анонимный

Через каждую службу одни и те же два вопроса находят большинство точек опоры:

1. **Разрешает ли она анонимный или неаутентифицированный доступ?** FTP `anonymous`, null-сессии SMB, открытые экспорты NFS, неаутентифицированные веб-эндпоинты.
2. **Использует ли она всё ещё учётные данные по умолчанию?** `admin/admin`, `root/root`, SNMP `public`, задокументированные онлайн умолчания вендоров.

Ни то, ни другое не требует эксплойта. Оба — ошибки конфигурации, и оба находятся простой *попыткой* — вот почему методичное перечисление побеждает хитрую эксплуатацию чаще, чем ждут новички.

## Nmap-скрипты для перечисления

Библиотека NSE многое из этого автоматизирует:

```
$ nmap --script smb-enum-shares,smb-enum-users -p 445 192.0.2.20
$ nmap --script ftp-anon -p 21 192.0.2.20
$ nmap --script http-enum -p 80 192.0.2.20
```

`--script` запускает целевые проверки; имена скриптов читаются как то, что они делают. `ls /usr/share/nmap/scripts/` перечисляет сотни доступных.

## Попробуйте (на намеренно уязвимой лаборатории: Metasploitable, HTB)

1. Найдите открытый FTP-порт и проверьте вход `anonymous`.
2. `smbclient -L //<host> -N` — есть ли шары без пароля?
3. Если UDP 161 открыт, `snmpwalk -v2c -c public <host>`. Что он раскрывает?""",
        "questions": [
            q("Across most services, which two checks find the most footholds?",
              "Aksar xizmatlar bo'ylab qaysi ikki tekshiruv eng ko'p tayanch nuqtaларni topadi?",
              "В большинстве служб какие две проверки находят больше всего точек опоры?",
              ["Anonymous/unauthenticated access and default credentials",
               "Buffer overflows and race conditions", "SQL injection and XSS",
               "Port knocking and tunnelling"],
              ["Anonim/autentifikatsiyaсиз kirish va sukut hisob ma'lumotlari",
               "Bufer to'lib ketishi va poyga holatlari", "SQL in'ektsiya va XSS",
               "Port taqillatish va tunnellash"],
              ["Анонимный/неаутентифицированный доступ и учётки по умолчанию",
               "Переполнения буфера и гонки", "SQL-инъекция и XSS",
               "Port knocking и туннелирование"], 0),
            q("Why is SNMP on UDP 161 often overlooked?",
              "Nega UDP 161 dаgi SNMP ko'pincha e'tibordан chetда qoladi?",
              "Почему SNMP на UDP 161 часто упускают?",
              ["A TCP-only scan does not see it, yet it often uses the default string 'public'",
               "It is always encrypted", "It requires a valid login",
               "It only runs on Windows"],
              ["Faqat TCP skani uni ko'rmaydi, biroq u ko'pincha sukut 'public' satrини ishlatadi",
               "U doim shifrlanган", "U yaroqli kirish talab qiladi",
               "U faqat Windows'да ishlaydi"],
              ["Скан только по TCP его не видит, а он часто использует строку 'public'",
               "Он всегда зашифрован", "Он требует валидного входа",
               "Он работает только на Windows"], 0),
            q("`smbclient -L //host -N` returning a share named `backup` suggests:",
              "`smbclient -L //host -N` `backup` nomли ulush qaytarsa, bu nimani taxmin qiladi:",
              "`smbclient -L //host -N`, возвращающий шару `backup`, предполагает:",
              ["An anonymously accessible share that may hold sensitive files",
               "The server is patched", "SMB is disabled",
               "The backup is encrypted"],
              ["Nozik fayllarни saqlashи mumkin anonim kiriladigan ulush",
               "Server yamalган", "SMB o'chirilган",
               "Zaxira shifrlanган"],
              ["Анонимно доступную шару, которая может хранить чувствительные файлы",
               "Сервер пропатчен", "SMB отключён",
               "Бэкап зашифрован"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "recon", "points": 80,
        "title": "From versions to vulnerabilities",
        "titleUz": "Versiyalardan zaifliklarga",
        "titleRu": "От версий к уязвимостям",
        "content": r"""Recon has given you exact versions. This lesson turns them into known vulnerabilities — the pivot from "what is running" to "what is exploitable". The skill is matching a version to a documented flaw, safely and without guessing.

## The vocabulary

- **CVE** (Common Vulnerabilities and Exposures) — a unique id for a specific flaw, like `CVE-2021-41773`. One CVE, one vulnerability, referenced everywhere.
- **CVSS** — a 0-10 severity score. 9.0+ is critical, 7.0+ high. It ranks what to look at first.
- **Exploit** — working code that abuses the flaw. A CVE describes the hole; an exploit is the tool that goes through it. Not every CVE has a public exploit.

## searchsploit: the offline exploit database

Kali ships Exploit-DB locally. `searchsploit` queries it by keyword — usually the service and version:

```
$ searchsploit vsftpd 2.3.4
------------------------------------------------ ---------------------------------
 Exploit Title                                  |  Path
------------------------------------------------ ---------------------------------
vsftpd 2.3.4 - Backdoor Command Execution       | unix/remote/49757.py
vsftpd 2.3.4 - Backdoor Command Execution (Me   | unix/remote/17491.rb
------------------------------------------------ ---------------------------------
```

That is real output. vsftpd 2.3.4 shipped with a backdoor in its source for a period — anyone running exactly that version is trivially exploitable. This is the whole workflow in one example: a version from `-sV`, a search, a named exploit.

Read the exploit before running it, and copy it out to work on:

```
$ searchsploit -x unix/remote/49757.py     # view it
$ searchsploit -m 49757                     # mirror it to the current directory
```

**Never run an exploit you have not read.** Public exploit code sometimes contains its own backdoors, or is destructive in ways the title does not mention. Reading it is not optional.

## Online databases

- **exploit-db.com** — the web version of searchsploit, with comments and verification status.
- **nvd.nist.gov** — the authoritative CVE database, with CVSS scores and affected-version ranges.
- **cvedetails.com** — browse CVEs by product and version; enter `Apache 2.4.41` and read its list.
- **GitHub** — many proof-of-concept exploits live here; search the CVE id.

## nmap's own vulnerability scripts

The NSE `vuln` category checks a target against known vulnerabilities directly:

```
$ nmap --script vuln 192.0.2.20
PORT   STATE SERVICE
80/tcp open  http
| http-vuln-cve2017-5638:
|   VULNERABLE:
|   Apache Struts Remote Code Execution
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-5638
```

This maps directly from a scan to a CVE with no manual lookup. `vulscan` and `vulners` are add-on scripts that cross-reference detected versions against whole vulnerability feeds.

## The disciplined workflow

Recon-to-vulnerability is a repeatable loop, not a leap:

```
1. -sV gives an exact version        Apache 2.4.41
2. searchsploit / cvedetails it      → CVE-2021-41773 (path traversal + RCE)
3. Confirm the version is in range   affects 2.4.49–2.4.50? check the range
4. Read the exploit or advisory      understand what it does before acting
5. Only then, on an authorised target, test it
```

Step 3 is the one beginners skip and it matters: a CVE affects *specific* versions. An exploit for Apache 2.4.49 will not work on 2.4.41, and firing it blindly wastes time and makes noise for nothing. Match the version to the affected range before you believe you have a finding.

## False positives are the rule, not the exception

A version-based match is a *lead*, not a confirmed vulnerability. The flaw may be patched in a distribution backport while the version string looks unchanged; the feature may be disabled; the exploit may need conditions the target does not meet. On a real report you must *verify* — safely demonstrate the flaw — before claiming it. "The banner says 2.4.41 and 2.4.41 has a CVE" is a hypothesis, and reporting a hypothesis as a finding is how assessors lose credibility.

## Try it (on searchsploit and a deliberately old lab)

1. `searchsploit` a version string from an earlier scan. Any results?
2. Look up one CVE on cvedetails.com. What version range does it affect, and what is its CVSS?
3. Read (do not run) one exploit with `searchsploit -x`. What does it actually do?""",
        "contentUz": r"""Razvedka sizga aniq versiyalarни berdi. Bu dars ularni ma'lum zaifliklарga aylantiradi — "nima ishlayapti" dан "nima ekspluatatsiya qilinadigan" ga o'tish. Ko'nikma — versiyani hujjatlashtirilган nuqsonga xavfsiz va taxminсиз moslash.

## Lug'at

- **CVE** (Umumiy zaifliklar va ta'sirlar) — aniq nuqson uchun noyob id, masalan `CVE-2021-41773`. Bitta CVE, bitta zaiflik, hamma joyда havola qilinган.
- **CVSS** — 0-10 jiddiylik balli. 9.0+ kritik, 7.0+ yuqori. U avval nimaga qarashni tartiblaydi.
- **Eksploit** — nuqsondан suiiste'mol qiladigan ishlaydigan kod. CVE teshikni tasvirlaydi; eksploit — undan o'tadigan vosita. Har bir CVE'ning ommaviy eksploiti yo'q.

## searchsploit: oflayn eksploit ma'lumotlar bazasi

Kali Exploit-DB'ни mahalliy jo'natadi. `searchsploit` uni kalit so'z bo'yicha so'raydi — odatда xizmat va versiya:

```
$ searchsploit vsftpd 2.3.4
------------------------------------------------ ---------------------------------
 Exploit Title                                  |  Path
------------------------------------------------ ---------------------------------
vsftpd 2.3.4 - Backdoor Command Execution       | unix/remote/49757.py
vsftpd 2.3.4 - Backdoor Command Execution (Me   | unix/remote/17491.rb
------------------------------------------------ ---------------------------------
```

Bu — haqiqiy chiqish. vsftpd 2.3.4 bir muddat manbasида backdoor bilan jo'natilган — aynan o'sha versiyани ishlatadigan har kim arzimас darajада ekspluatatsiya qilinadi. Bu — bitta misolда butun ish tartibi: `-sV` dан versiya, qidiruv, nomlangan eksploit.

Eksploitни yuritishдан oldin o'qing va ishlash uchun nusxalab oling:

```
$ searchsploit -x unix/remote/49757.py     # uni ko'rish
$ searchsploit -m 49757                     # uni joriy katalogга ko'chirish
```

**O'qimаган eksploitни hech qachon yuritmang.** Ommaviy eksploit kodi ba'zан o'z backdoor'ига ega, yoki sarlavha aytmaган tarzда buzg'unchi. Uni o'qish — tanlov emas.

## Onlayn ma'lumotlar bazalari

- **exploit-db.com** — searchsploit'ning veb versiyasi, izohlar va tekshirish holati bilan.
- **nvd.nist.gov** — vakolatли CVE ma'lumotlar bazasi, CVSS ballari va ta'sirlangan-versiya diapazonlari bilan.
- **cvedetails.com** — CVE'ларni mahsulot va versiya bo'yicha ko'rish; `Apache 2.4.41` kiriting va ro'yxatини o'qing.
- **GitHub** — ko'p isbot-konsepsiya eksploitlari shu yerда yashaydi; CVE id ni qidiring.

## nmap'ning o'z zaiflik skriptlari

NSE `vuln` toifasi nishonni ma'lum zaifliklарга qarshi to'g'ridan-to'g'ri tekshiradi:

```
$ nmap --script vuln 192.0.2.20
PORT   STATE SERVICE
80/tcp open  http
| http-vuln-cve2017-5638:
|   VULNERABLE:
|   Apache Struts Remote Code Execution
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-5638
```

Bu skandан CVE'ga qo'lда izlashсиз to'g'ridan-to'g'ri xaritalaydi. `vulscan` va `vulners` — aniqlanган versiyalarни butun zaiflik oqimlariга qarshi solishtiradigan qo'shimcha skriptlar.

## Intizomli ish tartibi

Razvedkadан-zaiflikка — sakrash emas, takrorlanadigan halqa:

```
1. -sV aniq versiya beradi           Apache 2.4.41
2. searchsploit / cvedetails qiling  → CVE-2021-41773 (yo'ldan chiqish + RCE)
3. Versiya diapazonда ekanini tasdiqlang  2.4.49–2.4.50 ga ta'sir qiladimi? diapazonni tekshiring
4. Eksploit yoki xabarnomани o'qing  harakatдан oldin nima qilishini tushuning
5. Faqat shundan keyin, ruxsat etilған nishonда, sinang
```

3-qadam — boshlovchilar o'tkazib yuboradigани va u muhim: CVE *aniq* versiyalarга ta'sir qiladi. Apache 2.4.49 uchun eksploit 2.4.41 da ishlamaydi, va uni ko'r-ko'rona otish vaqtni behuda sarflaydi va hech narsaга shovqin qiladi. Topilma bor deb ishonishдан oldin versiyani ta'sirlangan diapazonга moslang.

## Yolg'on musbatlar — istisno emas, qoida

Versiyaга asoslangan moslik — *iz*, tasdiqlangan zaiflik emas. Nuqson tarqatishning backport'ida yamalган bo'lishi mumkin, versiya satri o'zgarmaган ko'rinса ham; xususiyat o'chirilған bo'lishi mumkin; eksploitга nishon bajarmaydigan shartlar kerak bo'lishi mumkin. Haqiqiy hisobotда uni da'vo qilishдан oldin *tekshirishingiz* kerak — nuqsonni xavfsiz ko'rsating. "Banner 2.4.41 deydi va 2.4.41 da CVE bor" — gipoteza, va gipotezани topilma sifatида xabar qilish — baholovchilar ishonchni yo'qotadigan yo'l.

## Sinab ko'ring (searchsploit va ataylab eski laboratoriyaда)

1. Oldingi skandан versiya satrини `searchsploit` qiling. Natijalar bormi?
2. cvedetails.com da bitta CVE ni izlang. U qaysi versiya diapazoniга ta'sir qiladi va CVSS'i qancha?
3. Bitta eksploitni `searchsploit -x` bilan o'qing (yuritmang). U aslida nima qiladi?""",
        "contentRu": r"""Разведка дала вам точные версии. Этот урок превращает их в известные уязвимости — переход от «что работает» к «что эксплуатируемо». Навык — сопоставить версию задокументированному изъяну, безопасно и без догадок.

## Словарь

- **CVE** (Common Vulnerabilities and Exposures) — уникальный id конкретного изъяна, вроде `CVE-2021-41773`. Один CVE, одна уязвимость, ссылка везде.
- **CVSS** — оценка серьёзности 0-10. 9.0+ критическая, 7.0+ высокая. Ранжирует, на что смотреть первым.
- **Эксплойт** — рабочий код, злоупотребляющий изъяном. CVE описывает дыру; эксплойт — инструмент, проходящий через неё. Не у каждого CVE есть публичный эксплойт.

## searchsploit: офлайн база эксплойтов

Kali несёт Exploit-DB локально. `searchsploit` запрашивает её по ключевому слову — обычно служба и версия:

```
$ searchsploit vsftpd 2.3.4
------------------------------------------------ ---------------------------------
 Exploit Title                                  |  Path
------------------------------------------------ ---------------------------------
vsftpd 2.3.4 - Backdoor Command Execution       | unix/remote/49757.py
vsftpd 2.3.4 - Backdoor Command Execution (Me   | unix/remote/17491.rb
------------------------------------------------ ---------------------------------
```

Это реальный вывод. vsftpd 2.3.4 некоторое время поставлялся с бэкдором в исходнике — любой, кто запускает ровно эту версию, тривиально эксплуатируем. Это весь рабочий процесс в одном примере: версия из `-sV`, поиск, названный эксплойт.

Прочитайте эксплойт до запуска и скопируйте для работы:

```
$ searchsploit -x unix/remote/49757.py     # посмотреть
$ searchsploit -m 49757                     # скопировать в текущий каталог
```

**Никогда не запускайте эксплойт, который не прочитали.** Публичный код эксплойтов иногда содержит собственные бэкдоры или разрушителен так, как не упоминает заголовок. Читать его не опция.

## Онлайн-базы

- **exploit-db.com** — веб-версия searchsploit, с комментариями и статусом проверки.
- **nvd.nist.gov** — авторитетная база CVE, с оценками CVSS и диапазонами затронутых версий.
- **cvedetails.com** — просмотр CVE по продукту и версии; введите `Apache 2.4.41` и читайте список.
- **GitHub** — многие proof-of-concept эксплойты живут здесь; ищите по id CVE.

## Собственные скрипты уязвимостей nmap

Категория NSE `vuln` проверяет цель против известных уязвимостей напрямую:

```
$ nmap --script vuln 192.0.2.20
PORT   STATE SERVICE
80/tcp open  http
| http-vuln-cve2017-5638:
|   VULNERABLE:
|   Apache Struts Remote Code Execution
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-5638
```

Это отображает прямо от скана к CVE без ручного поиска. `vulscan` и `vulners` — дополнительные скрипты, сверяющие обнаруженные версии с целыми лентами уязвимостей.

## Дисциплинированный рабочий процесс

От разведки к уязвимости — повторяемый цикл, не прыжок:

```
1. -sV даёт точную версию            Apache 2.4.41
2. searchsploit / cvedetails её       → CVE-2021-41773 (обход пути + RCE)
3. Подтвердите, что версия в диапазоне  затрагивает 2.4.49–2.4.50? проверьте диапазон
4. Прочитайте эксплойт или advisory   поймите, что он делает, до действий
5. Только затем, на авторизованной цели, тестируйте
```

Шаг 3 — тот, что новички пропускают, и он важен: CVE затрагивает *конкретные* версии. Эксплойт для Apache 2.4.49 не сработает на 2.4.41, и запуск вслепую тратит время и шумит впустую. Сопоставьте версию затронутому диапазону, прежде чем поверить, что у вас находка.

## Ложные срабатывания — правило, а не исключение

Совпадение по версии — это *зацепка*, а не подтверждённая уязвимость. Изъян может быть исправлен бэкпортом дистрибутива, а строка версии выглядит неизменной; функция может быть отключена; эксплойту могут понадобиться условия, которых на цели нет. В реальном отчёте нужно *проверить* — безопасно продемонстрировать изъян — до заявления. «Баннер говорит 2.4.41, а у 2.4.41 есть CVE» — гипотеза, и отчёт гипотезы как находки — путь потери доверия к оценщику.

## Попробуйте (на searchsploit и намеренно старой лаборатории)

1. `searchsploit` строку версии из раннего скана. Есть результаты?
2. Найдите один CVE на cvedetails.com. Какой диапазон версий он затрагивает и какой у него CVSS?
3. Прочитайте (не запускайте) один эксплойт через `searchsploit -x`. Что он на деле делает?""",
        "questions": [
            q("What is the difference between a CVE and an exploit?",
              "CVE va eksploit orasidаgi farq nima?",
              "В чём разница между CVE и эксплойтом?",
              ["A CVE identifies the flaw; an exploit is working code that abuses it",
               "They are the same thing", "A CVE is code; an exploit is a description",
               "An exploit is a CVSS score"],
              ["CVE nuqsonni aniqlaydi; eksploit — undan suiiste'mol qiladigan ishlaydigan kod",
               "Ular bir xil narsa", "CVE — kod; eksploit — tavsif",
               "Eksploit — CVSS balli"],
              ["CVE идентифицирует изъян; эксплойт — рабочий код, злоупотребляющий им",
               "Это одно и то же", "CVE — код; эксплойт — описание",
               "Эксплойт — это оценка CVSS"], 0),
            q("Why must you check the affected version range before trusting a version match?",
              "Nega versiya mosligiga ishonishдан oldin ta'sirlangan versiya diapazonini tekshirishingiz kerak?",
              "Почему нужно проверить диапазон затронутых версий до доверия совпадению версий?",
              ["A CVE affects specific versions; the wrong one is a false lead",
               "Version numbers are always fake", "Exploits work on every version",
               "The range is not important"],
              ["CVE aniq versiyalarга ta'sir qiladi; noto'g'risi — yolg'on iz",
               "Versiya raqamlari doim soxta", "Eksploitlar har qanday versiyада ishlaydi",
               "Diapazon muhim emas"],
              ["CVE затрагивает конкретные версии; не та — ложная зацепка",
               "Номера версий всегда фальшивы", "Эксплойты работают на любой версии",
               "Диапазон не важен"], 0),
            q("Why should you never run an exploit you have not read?",
              "Nega o'qimаган eksploitni hech qachon yuritmasligingiz kerak?",
              "Почему нельзя запускать эксплойт, который не прочитали?",
              ["It may contain its own backdoor or be destructive",
               "It will be too slow", "It needs root", "Reading it is illegal"],
              ["U o'z backdoor'ига ega yoki buzg'unchi bo'lishi mumkin",
               "U juda sekin bo'ladi", "Unга root kerak", "Uni o'qish noqonuniy"],
              ["Он может содержать собственный бэкдор или быть разрушительным",
               "Он будет слишком медленным", "Ему нужен root", "Читать его незаконно"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "recon", "points": 80,
        "title": "Organising recon into an attack plan",
        "titleUz": "Razvedkani hujum rejasига aylantirish",
        "titleRu": "Превращение разведки в план атаки",
        "content": r"""A scan is data; an assessment is a decision. This lesson turns the raw output of everything before it into a prioritised plan — the skill that separates someone who runs tools from someone who tests a system. It is also where recon hands off to exploitation, the next module.

## Take notes as if you will forget everything

You will. On a real engagement with dozens of hosts, unwritten findings are lost findings. From the first command, keep structured notes — one section per host:

```
## 192.0.2.20
- OS: Linux 5.4 (nmap -O)
- 22/tcp   OpenSSH 8.4p1        — current, low priority
- 80/tcp   Apache 2.4.41        — /admin found, /backup indexed
- 445/tcp  Samba 4.11           — anonymous share "backup" READABLE ← lead
- 3306/tcp MySQL 5.7.33         — not exposed externally

Credentials found: (none yet)
Leads: anonymous SMB share, admin login page
```

Tools like CherryTree, Obsidian, or a plain markdown file all work. The format matters less than the discipline: every port, every version, every anomaly, written down as you find it.

## Prioritise: not all findings are equal

You cannot chase everything at once. Rank leads by two axes — how likely it is to work, and how much it gives you:

- **Highest priority:** easy and high-impact. An anonymous SMB share, default credentials, a service with a known unauthenticated RCE. Little effort, direct foothold.
- **Medium:** a known CVE that needs the right version confirmed, a login page to test for weak credentials, an outdated web app.
- **Lowest:** hard exploits needing specific conditions, or findings that give little even if they work.

Start where effort is low and payoff is high. Beginners burn hours on a hard exploit while an anonymous share sat open the whole time.

## Map the attack surface into paths

Turn the note above into candidate routes in, each a hypothesis to test:

```
Path A: anonymous SMB "backup" → read files → hunt for credentials → reuse on SSH
Path B: /admin login → test default creds → weak-password spray
Path C: Apache 2.4.41 → confirm CVE range → if it matches, test RCE
```

Each path is a chain: recon rarely hands you a single step to root. It hands you a foothold, and the foothold reveals the next step — credentials in a share, a config file naming a database, a low-privilege shell that sees new internal hosts.

## The methodology, so nothing is skipped

Working assessments follow a loop, not a checklist run once:

```
1. Discover hosts        (what exists)
2. Scan ports/services   (what is reachable)
3. Enumerate deeply      (what each service reveals)
4. Match vulnerabilities (what might be exploitable)
5. Prioritise            (what to try first)
6. Exploit               (the next module)
7. Re-recon from inside  → back to step 1
```

Step 7 is the part beginners forget. The moment you gain a foothold, you are on a new vantage point — a machine that can reach hosts and services invisible from outside. Recon is not a phase you finish; it restarts from every new position. This is **pivoting**, and it is why the loop has an arrow back to the start.

## What good recon looks like when you are done

Before touching exploitation you should be able to say, for the whole scope:

- every live host and its role,
- every open port and the exact service version behind it,
- which services allow anonymous or default access,
- which versions have known vulnerabilities worth verifying,
- and a ranked list of paths to try, most promising first.

If you have that, exploitation is aiming a known technique at a known weakness. If you do not, exploitation is guessing — loud, slow, and usually fruitless. The quality of everything that follows is set here.

## The bridge to exploitation

The next module picks up exactly where this list ends: a prioritised set of leads, each a specific weakness on a specific service. Recon found the doors; exploitation opens them. The better this module's output, the shorter and surer the next one.

## Try it (on a multi-service lab: Metasploitable, an HTB box you own access to)

1. Fully enumerate one lab host and write structured notes in the format above.
2. From your notes, write three candidate attack paths, ranked by effort versus payoff.
3. For your top path, state the exact next command you would run and what result would confirm the lead.""",
        "contentUz": r"""Skan — ma'lumot; baholash — qaror. Bu dars undан oldingi hamma narsaning xom chiqishini ustuvorlashtirilған rejaга aylantiradi — vositalarни yurgizadigan kishini tizimni sinaydigan kishidан ajratadigan ko'nikma. Bu shuningdek razvedka ekspluatatsiyaga topshiradigan joy, keyingi modul.

## Hammani unutadigandек qayd qiling

Unutasiz. O'nlab xostли haqiqiy ishда yozilmаган topilmalar — yo'qolган topilmalar. Birinchi buyruqдан boshlab tuzilган qaydlar saqlang — har xost uchun bitta bo'lim:

```
## 192.0.2.20
- OS: Linux 5.4 (nmap -O)
- 22/tcp   OpenSSH 8.4p1        — joriy, past ustuvorlik
- 80/tcp   Apache 2.4.41        — /admin topildi, /backup indekslanган
- 445/tcp  Samba 4.11           — anonim ulush "backup" O'QILADI ← iz
- 3306/tcp MySQL 5.7.33         — tashqi ochilmagan

Topilган hisob ma'lumotlar: (hali yo'q)
Izlar: anonim SMB ulush, admin kirish sahifasi
```

CherryTree, Obsidian yoki oddiy markdown fayl — hammasi ishlaydi. Format intizomdان kamroq muhim: har bir port, har bir versiya, har bir anomaliya topganingizда yoziladi.

## Ustuvorlashtiring: hamma topilmalar teng emas

Hammani birdan quvа olmaysiz. Izlarни ikki o'q bo'yicha tartiblang — ishlash ehtimoli va sizga qancha berishi:

- **Eng yuqori ustuvorlik:** oson va yuqori ta'sir. Anonim SMB ulush, sukut hisob ma'lumotlar, ma'lum autentifikatsiyaсиз RCE li xizmat. Kam kuch, to'g'ridan-to'g'ri tayanch.
- **O'rta:** to'g'ri versiya tasdiqlanishi kerak bo'lган ma'lum CVE, zaif hisob ma'lumotlarga sinaladigan kirish sahifasi, eskirган veb-ilova.
- **Eng past:** aniq shartlar kerak bo'lган qiyin eksploitlar, yoki ishlаса ham kam beradigan topilmalar.

Kuch past va foyda yuqori joyдан boshlang. Boshlovchilar anonim ulush butun vaqt ochiq turганда qiyin eksploitga soatlar sarflaydi.

## Hujum yuzasini yo'llarга xaritalang

Yuqoridagi qaydni sinaladigan gipoteza — nomzod kirish yo'llariга aylantiring:

```
A yo'li: anonim SMB "backup" → fayllarни o'qish → hisob ma'lumotlar ovlash → SSH'да qayta ishlatish
B yo'li: /admin kirish → sukut hisob ma'lumotlar sinash → zaif-parol sepish
C yo'li: Apache 2.4.41 → CVE diapazonni tasdiqlash → mos kelsa, RCE sinash
```

Har bir yo'l — zanjir: razvedka kamdан-kam sizga root'ga bitta qadam beradi. U tayanch beradi, va tayanch keyingi qadamni oshkor qiladi — ulushдаgi hisob ma'lumotlar, bazani nomlaydigan konfiguratsiya fayli, yangi ichki xostларni ko'radigan past imtiyozли shell.

## Metodologiya, shunda hech narsa o'tkazib yuborilmaydi

Ishchi baholashlar bir marta yuritilган tekshirish ro'yxati emas, halqaга ergashadi:

```
1. Xostларni aniqlash    (nima bor)
2. Port/xizmatларni skanerlash  (nima yetiladigan)
3. Chuqur sanash         (har xizmat nimani oshkor qiladi)
4. Zaifliklарни moslash  (nima ekspluatatsiya qilinadigan)
5. Ustuvorlashtirish     (avval nimani sinash)
6. Ekspluatatsiya        (keyingi modul)
7. Ichkаридан qayta razvedka  → 1-qadamга qaytish
```

7-qadam — boshlovchilar unutadigани. Tayanch qo'lга kiritган onда siz yangi nuqtai nazардасiz — tashqаридан ko'rinmaydigan xostlar va xizmatларga yetadigan mashina. Razvedka siz tugatadigan bosqich emas; u har bir yangi pozitsiyадан qayta boshlanadi. Bu — **pivoting**, va shuning uchun halqada boshга qaytadigan strelka bor.

## Tugatганingizда yaxshi razvedka qanday ko'rinadi

Ekspluatatsiyaга tegishдан oldin butun ko'lam uchun ayta olishingiz kerak:

- har bir tirik xost va uning roli,
- har bir ochiq port va ortidаgi aniq xizmat versiyasi,
- qaysi xizmatlar anonim yoki sukut kirishга ruxsat beradi,
- qaysi versiyalarда tekshirishга arziydigan ma'lum zaifliklар bor,
- va sinaladigan yo'llarning tartiblangan ro'yxati, eng istiqbolliси birinchi.

Agar bu sizда bo'lsa, ekspluatatsiya — ma'lum texnikани ma'lum zaiflikка nishonlash. Bo'lmasa, ekspluatatsiya — taxmin: baland, sekin va odatда samarasiz. Keyinги hamma narsaning sifati shu yerда belgilanadi.

## Ekspluatatsiyaга ko'prik

Keyingi modul aynan bu ro'yxat tugagan joyдан oladi: ustuvorlashtirilған izlar to'plami, har biri aniq xizmatдаgi aniq zaiflik. Razvedka eshiklarни topdi; ekspluatatsiya ularni ochadi. Bu modulning chiqishi qanchalik yaxshi bo'lsa, keyinги shunchalik qisqa va ishonchli.

## Sinab ko'ring (ko'p xizmatли laboratoriyада: Metasploitable, kirish huquqingiz bor HTB box)

1. Bitta laboratoriya xostini to'liq sanang va yuqoridagi formatда tuzilган qaydlar yozing.
2. Qaydlaringizdан kuch va foyda bo'yicha tartiblangan uchta nomzod hujum yo'lini yozing.
3. Eng yuqori yo'lingiz uchun yuritadigan aniq keyingi buyruqni va qanday natija izni tasdiqlashini ayting.""",
        "contentRu": r"""Скан — данные; оценка — решение. Этот урок превращает сырой вывод всего предыдущего в приоритизированный план — навык, отделяющий того, кто запускает инструменты, от того, кто тестирует систему. Это также место, где разведка передаёт дело эксплуатации, следующему модулю.

## Ведите заметки, будто всё забудете

Забудете. На реальной работе с десятками хостов незаписанные находки — потерянные находки. С первой команды ведите структурированные заметки — по секции на хост:

```
## 192.0.2.20
- OS: Linux 5.4 (nmap -O)
- 22/tcp   OpenSSH 8.4p1        — актуальный, низкий приоритет
- 80/tcp   Apache 2.4.41        — найден /admin, /backup индексируется
- 445/tcp  Samba 4.11           — анонимная шара "backup" ЧИТАЕМА ← зацепка
- 3306/tcp MySQL 5.7.33         — не открыт наружу

Найденные учётные данные: (пока нет)
Зацепки: анонимная SMB-шара, страница входа админа
```

CherryTree, Obsidian или простой markdown-файл — всё работает. Формат важен меньше дисциплины: каждый порт, каждая версия, каждая аномалия записаны по мере находки.

## Приоритизируйте: не все находки равны

Всё сразу не догнать. Ранжируйте зацепки по двум осям — вероятность срабатывания и сколько это даёт:

- **Высший приоритет:** легко и большой эффект. Анонимная SMB-шара, учётки по умолчанию, служба с известным неаутентифицированным RCE. Мало усилий, прямая опора.
- **Средний:** известный CVE, нуждающийся в подтверждении версии, страница входа для проверки слабых учёток, устаревшее веб-приложение.
- **Низший:** трудные эксплойты с особыми условиями или находки, дающие мало даже при успехе.

Начинайте там, где усилий мало, а выигрыш велик. Новички жгут часы на трудном эксплойте, пока анонимная шара стояла открытой всё время.

## Отобразите поверхность атаки в пути

Превратите заметку выше в кандидаты-маршруты входа, каждый — гипотеза для проверки:

```
Путь A: анонимная SMB "backup" → чтение файлов → охота за учётками → повтор на SSH
Путь B: /admin вход → проверка учёток по умолчанию → спрей слабых паролей
Путь C: Apache 2.4.41 → подтвердить диапазон CVE → если совпал, тест RCE
```

Каждый путь — цепочка: разведка редко даёт один шаг до root. Она даёт опору, а опора открывает следующий шаг — учётки в шаре, конфиг, называющий базу, низкопривилегированный шелл, видящий новые внутренние хосты.

## Методология, чтобы ничего не пропустить

Рабочие оценки следуют циклу, а не разовому чек-листу:

```
1. Обнаружить хосты      (что существует)
2. Сканировать порты/службы  (что достижимо)
3. Глубоко перечислить   (что раскрывает каждая служба)
4. Сопоставить уязвимости (что эксплуатируемо)
5. Приоритизировать      (что пробовать первым)
6. Эксплуатировать       (следующий модуль)
7. Пере-разведка изнутри → назад к шагу 1
```

Шаг 7 — то, что новички забывают. В момент получения опоры вы на новой позиции — машине, достающей хосты и службы, невидимые снаружи. Разведка — не фаза, которую заканчивают; она перезапускается с каждой новой позиции. Это **pivoting**, и потому у цикла есть стрелка назад к началу.

## Как выглядит хорошая разведка, когда вы закончили

До касания эксплуатации вы должны уметь сказать по всему scope:

- каждый живой хост и его роль,
- каждый открытый порт и точную версию службы за ним,
- какие службы допускают анонимный доступ или по умолчанию,
- у каких версий есть известные уязвимости, стоящие проверки,
- и ранжированный список путей для проверки, самый перспективный первым.

Если это есть, эксплуатация — наведение известной техники на известную слабость. Если нет, эксплуатация — гадание: громкое, медленное и обычно бесплодное. Качество всего последующего задаётся здесь.

## Мост к эксплуатации

Следующий модуль подхватывает ровно там, где кончается этот список: приоритизированный набор зацепок, каждая — конкретная слабость на конкретной службе. Разведка нашла двери; эксплуатация их открывает. Чем лучше вывод этого модуля, тем короче и вернее следующий.

## Попробуйте (на многослужебной лаборатории: Metasploitable, HTB box с доступом)

1. Полностью перечислите один лабораторный хост и напишите структурированные заметки в формате выше.
2. Из заметок напишите три кандидата-пути атаки, ранжированных по усилию против выигрыша.
3. Для верхнего пути укажите точную следующую команду и какой результат подтвердит зацепку.""",
        "questions": [
            q("How should recon leads be prioritised?",
              "Razvedka izlari qanday ustuvorlashtirilishi kerak?",
              "Как приоритизировать зацепки разведки?",
              ["By likelihood of success against impact — low-effort, high-payoff first",
               "Alphabetically by service name", "By port number, lowest first",
               "By the order they were discovered"],
              ["Muvaffaqiyat ehtimoli va ta'sir bo'yicha — kam kuch, yuqori foyda birinchi",
               "Xizmat nomi bo'yicha alfavit tartibида", "Port raqami bo'yicha, eng pasti birinchi",
               "Topilган tartibда"],
              ["По вероятности успеха против эффекта — малое усилие, большой выигрыш первым",
               "По алфавиту имени службы", "По номеру порта, меньший первым",
               "В порядке обнаружения"], 0),
            q("What is pivoting in the recon methodology?",
              "Razvedka metodologiyasида pivoting nima?",
              "Что такое pivoting в методологии разведки?",
              ["Re-running recon from a newly gained foothold to reach hosts invisible from outside",
               "Rotating the source IP of scans", "Switching from TCP to UDP",
               "Changing the nmap timing template"],
              ["Tashqаридан ko'rinmaydigan xostларга yetish uchun yangi tayanchдан razvedkani qayta yuritish",
               "Skanlarning manba IP'sini almashtirish", "TCP'дан UDP'ga o'tish",
               "nmap vaqt shablonini o'zgartirish"],
              ["Перезапуск разведки с новой опоры для доступа к хостам, невидимым снаружи",
               "Смена исходного IP сканов", "Переключение с TCP на UDP",
               "Смена шаблона тайминга nmap"], 0),
            q("Why does good recon make exploitation faster?",
              "Nega yaxshi razvedka ekspluatatsiyani tezlashtiradi?",
              "Почему хорошая разведка ускоряет эксплуатацию?",
              ["It reduces exploitation to aiming a known technique at a known weakness",
               "It exploits the target automatically", "It removes the need for authorisation",
               "It patches the vulnerabilities"],
              ["U ekspluatatsiyani ma'lum texnikani ma'lum zaiflikка nishonlashга qisqartiradi",
               "U nishonni avtomatik ekspluatatsiya qiladi", "U ruxsatga ehtiyojni olib tashlaydi",
               "U zaifliklарni yamaydi"],
              ["Сводит эксплуатацию к наведению известной техники на известную слабость",
               "Автоматически эксплуатирует цель", "Убирает нужду в разрешении",
               "Патчит уязвимости"], 0),
        ],
    },
]


MODULE = {
    "slug": "reconnaissance-and-scanning",
    "category": "recon",
    "title": "Reconnaissance and Scanning",
    "titleUz": "Razvedka va skanerlash",
    "titleRu": "Разведка и сканирование",
    "description": (
        "How to map a target before touching it, and how to touch it well when authorised. Passive OSINT "
        "from public records, host discovery, port scanning and version detection with nmap, deep service "
        "enumeration, matching versions to CVEs with searchsploit, and organising it all into a prioritised "
        "attack plan. The legality of scanning is stated plainly, and every command runs against labs you own."
    ),
    "descriptionUz": (
        "Nishonга tegishдан oldin uni qanday xaritalash, va ruxsat berilганда unга qanday yaxshi tegish. "
        "Ommaviy yozuvlardан passiv OSINT, xost aniqlash, nmap bilan port skanerlash va versiya aniqlash, "
        "chuqur xizmat sanash, searchsploit bilan versiyalarni CVE'larга moslash, va hammani ustuvorlashtirilған "
        "hujum rejasига tashkil qilish. Skanerlashning qonuniyligi ochiq aytiladi, har bir buyruq o'zingizniki laboratoriyалarда yuriladi."
    ),
    "descriptionRu": (
        "Как отобразить цель до касания и как хорошо коснуться при авторизации. Пассивный OSINT из публичных "
        "записей, обнаружение хостов, сканирование портов и определение версий с nmap, глубокое перечисление "
        "служб, сопоставление версий с CVE через searchsploit и организация всего в приоритизированный план "
        "атаки. Законность сканирования сказана прямо, каждая команда — против ваших лабораторий."
    ),
    "difficulty": "intermediate",
    "estimatedHours": 40,
    "passScore": 80,
    "orderIndex": 4,
    "exam": [
        q("What separates passive from active reconnaissance?",
          "Passiv razvedkani aktivdan nima ajratadi?",
          "Что отделяет пассивную разведку от активной?",
          ["Whether packets are sent to the target itself", "The time of day it is done",
           "Whether nmap is used", "Whether the target is a company"],
          ["Nishonning o'ziga paket yuboriladimi", "U qaysi vaqtда qilinadi",
           "nmap ishlatiladimi", "Nishon kompaniyami"],
          ["Отправляются ли пакеты самой цели", "Время суток",
           "Используется ли nmap", "Является ли цель компанией"], 0),
        q("Scanning a host you have no written authorisation for is:",
          "Yozma ruxsatingiz bo'lmagan xostни skanerlash:",
          "Сканирование хоста без письменного разрешения — это:",
          ["A criminal offence in most countries", "Fine as long as nothing breaks",
           "Legal if it is passive", "Only a civil matter"],
          ["Aksar mamlakatlarда jinoyat", "Hech narsa buzilmаса mayli",
           "Passiv bo'lsa qonuniy", "Faqat fuqarolik masalasi"],
          ["Уголовное преступление в большинстве стран", "Нормально, пока ничего не сломано",
           "Законно, если пассивно", "Только гражданское дело"], 0),
        q("Certificate transparency logs are searched during recon to find:",
          "Sertifikat shaffofligi loglari razvedkада nimани topish uchun qidiriladi:",
          "Логи прозрачности сертификатов ищут при разведке, чтобы найти:",
          ["Subdomains an organisation never advertised", "Employee passwords",
           "Open ports", "The server's private key"],
          ["Tashkilot hech qachon e'lon qilmаган subdomenlar", "Xodim parollari",
           "Ochiq portlar", "Serverning maxfiy kaliti"],
          ["Поддомены, которые организация не публиковала", "Пароли сотрудников",
           "Открытые порты", "Приватный ключ сервера"], 0),
        q("`nmap -sn` is used to:",
          "`nmap -sn` nimага ishlatiladi:",
          "`nmap -sn` используется, чтобы:",
          ["Discover which hosts are alive without scanning ports",
           "Scan every port on a host", "Detect service versions",
           "Run exploit code"],
          ["Portларни skanerlamasдан qaysi xostlar tirikligини aniqlash",
           "Xostда har bir portni skanerlash", "Xizmat versiyaларni aniqlash",
           "Eksploit kodini yuritish"],
          ["Обнаружить, какие хосты живы, не сканируя порты",
           "Сканировать каждый порт хоста", "Определить версии служб",
           "Запустить код эксплойта"], 0),
        q("A port in state `filtered` means:",
          "`filtered` holatidаgi port nimani bildiradi:",
          "Порт в состоянии `filtered` означает:",
          ["A firewall dropped the probe; open cannot be told from closed",
           "A service accepted the connection", "Nothing is listening",
           "The scan finished"],
          ["Ekran zondni tashladi; open'ni closed'дан ajratib bo'lmaydi",
           "Xizmat ulanishни qabul qildi", "Hech narsa tinglamayapti",
           "Skan tugadi"],
          ["Файрвол отбросил зонд; open не отличить от closed",
           "Служба приняла соединение", "Ничто не слушает",
           "Скан завершён"], 0),
        q("Why run `nmap -p-` on a real assessment?",
          "Nega haqiqiy baholashда `nmap -p-` yuritish kerak?",
          "Зачем запускать `nmap -p-` на реальной оценке?",
          ["It scans all 65535 ports and finds services hidden on unusual ports",
           "It is stealthier than a default scan", "It only scans UDP",
           "It is faster"],
          ["U barcha 65535 portni skanerlaydi va g'ayrioddiy portlardаgi yashirin xizmatларni topadi",
           "U sukut skandан yashirinroq", "U faqat UDP ni skanerlaydi",
           "U tezroq"],
          ["Он сканирует все 65535 портов и находит службы на необычных портах",
           "Он скрытнее скана по умолчанию", "Он сканирует только UDP",
           "Он быстрее"], 0),
        q("`nmap -sV` is valuable because it provides:",
          "`nmap -sV` qimmatli, chunki u nimani beradi:",
          "`nmap -sV` ценен, потому что даёт:",
          ["The exact service version, which maps to known vulnerabilities",
           "The admin password", "A guaranteed shell", "The list of users"],
          ["Aniq xizmat versiyasi, u ma'lum zaifliklарга xaritalanadi",
           "Admin paroli", "Kafolatlangan shell", "Foydalanuvchilar ro'yxati"],
          ["Точную версию службы, отображаемую на известные уязвимости",
           "Пароль администратора", "Гарантированный шелл", "Список пользователей"], 0),
        q("The first thing to test on an open FTP port is:",
          "Ochiq FTP portда sinaladigan birinchi narsa:",
          "Первое, что проверить на открытом FTP-порту:",
          ["Whether anonymous login is allowed", "Whether it runs on UDP",
           "Its SSL certificate", "Its CVSS score"],
          ["Anonim kirishга ruxsat berilганmi", "U UDP'да ishlaydimi",
           "Uning SSL sertifikati", "Uning CVSS balli"],
          ["Разрешён ли анонимный вход", "Работает ли он на UDP",
           "Его SSL-сертификат", "Его оценку CVSS"], 0),
        q("SNMP on UDP 161 with the string `public` often reveals:",
          "UDP 161 dаgi `public` satrли SNMP ko'pincha nimani oshkor qiladi:",
          "SNMP на UDP 161 со строкой `public` часто раскрывает:",
          ["Running processes, software and system details", "The root password",
           "The TLS private key", "Nothing useful"],
          ["Ishlayotган jarayonlar, dastur va tizim tafsilotlari", "Root paroli",
           "TLS maxfiy kaliti", "Foydali hech narsa yo'q"],
          ["Запущенные процессы, ПО и детали системы", "Пароль root",
           "Приватный ключ TLS", "Ничего полезного"], 0),
        q("What is a CVE?",
          "CVE nima?",
          "Что такое CVE?",
          ["A unique identifier for a specific known vulnerability",
           "A piece of working exploit code", "A severity score from 0 to 10",
           "A port scanning tool"],
          ["Aniq ma'lum zaiflik uchun noyob identifikator",
           "Ishlaydigan eksploit kod parchasi", "0 dan 10 gача jiddiylik balli",
           "Port skanerlash vositasi"],
          ["Уникальный идентификатор конкретной известной уязвимости",
           "Кусок рабочего кода эксплойта", "Оценка серьёзности от 0 до 10",
           "Инструмент сканирования портов"], 0),
        q("Why check the affected version range before trusting a searchsploit match?",
          "Nega searchsploit mosligiga ishonishдан oldin ta'sirlangan versiya diapazonini tekshirish kerak?",
          "Почему проверять диапазон затронутых версий до доверия совпадению searchsploit?",
          ["A CVE affects specific versions; the wrong version is a false lead",
           "searchsploit is always wrong", "Every version is affected equally",
           "The range never matters"],
          ["CVE aniq versiyalarга ta'sir qiladi; noto'g'ri versiya — yolg'on iz",
           "searchsploit doim noto'g'ri", "Har bir versiya teng ta'sirlanган",
           "Diapazon hech qachon muhim emas"],
          ["CVE затрагивает конкретные версии; не та версия — ложная зацепка",
           "searchsploit всегда неверен", "Каждая версия затронута одинаково",
           "Диапазон никогда не важен"], 0),
        q("Why must you read an exploit before running it?",
          "Nega eksploitni yuritishдан oldin uni o'qishingiz kerak?",
          "Почему нужно прочитать эксплойт до запуска?",
          ["It may contain its own backdoor or be destructive",
           "It runs faster once read", "Reading is legally required",
           "It will not compile otherwise"],
          ["U o'z backdoor'ига ega yoki buzg'unchi bo'lishi mumkin",
           "O'qilгач tezroq ishlaydi", "O'qish qonunан talab qilinadi",
           "Aks holda kompilyatsiya qilinmaydi"],
          ["Он может содержать собственный бэкдор или быть разрушительным",
           "После прочтения работает быстрее", "Чтение требуется по закону",
           "Иначе не скомпилируется"], 0),
        q("A version-based vulnerability match should be treated as:",
          "Versiyaга asoslangan zaiflik mosligi qanday qaralishi kerak:",
          "Совпадение уязвимости по версии следует считать:",
          ["A lead to verify, not a confirmed finding", "A confirmed critical finding",
           "Proof the host is patched", "Irrelevant noise"],
          ["Tekshirilishi kerak bo'lган iz, tasdiqlangan topilma emas", "Tasdiqlangan kritik topilma",
           "Xost yamalganига dalil", "Ahamiyatsiz shovqin"],
          ["Зацепкой для проверки, не подтверждённой находкой", "Подтверждённой критической находкой",
           "Доказательством, что хост пропатчен", "Незначимым шумом"], 0),
        q("Good recon leads are prioritised by:",
          "Yaxshi razvedka izlari nima bo'yicha ustuvorlashtiriladi:",
          "Хорошие зацепки разведки приоритизируют по:",
          ["Low effort and high payoff first", "Alphabetical order",
           "Highest port number first", "Newest CVE first"],
          ["Kam kuch va yuqori foyda birinchi", "Alfavit tartibида",
           "Eng yuqori port raqami birinchi", "Eng yangi CVE birinchi"],
          ["Малому усилию и большому выигрышу первым", "Алфавиту",
           "Наибольшему номеру порта первым", "Новейшему CVE первым"], 0),
        q("What is the final output of good reconnaissance?",
          "Yaxshi razvedkaning yakuniy chiqishi nima?",
          "Каков итоговый результат хорошей разведки?",
          ["A ranked list of specific weaknesses to try, most promising first",
           "A single working exploit", "A full copy of the target's data",
           "A patched system"],
          ["Sinaladigan aniq zaifliklarning tartiblangan ro'yxati, eng istiqbolliси birinchi",
           "Bitta ishlaydigan eksploit", "Nishon ma'lumotining to'liq nusxasi",
           "Yamalган tizim"],
          ["Ранжированный список конкретных слабостей для проверки, перспективный первым",
           "Единственный рабочий эксплойт", "Полную копию данных цели",
           "Пропатченную систему"], 0),
    ],
}
