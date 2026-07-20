"""
Module 07 — Digital Forensics and Incident Response.

The defender's counterpart to the offensive core. Tool output (dd, sha256sum,
foremost, binwalk, exiftool, tshark, volatility) was produced on a real Kali
shell where the tool was available (tshark 4.6.6) and pasted back; volatility 3
uses its documented command syntax. Every technique here is for systems you own
or are authorised to investigate.
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
        "category": "forensics", "points": 70,
        "title": "The DFIR mindset: first response and order of volatility",
        "titleUz": "DFIR tafakkuri: birinchi javob va o'zgaruvchanlik tartibi",
        "titleRu": "Мышление DFIR: первый ответ и порядок волатильности",
        "content": r"""The offensive modules taught you to break in. This one is the other side of the table: what a defender does after a breach — find out what happened, preserve the proof, and answer "how, when, and what did they take". The single rule that governs all of it: **do not destroy the evidence you came to collect.**

## Two jobs, one discipline

- **Digital forensics** — the careful, after-the-fact reconstruction: what was on the disk, in memory, in the logs, and what it proves.
- **Incident response (IR)** — the live handling of an active or recent breach: contain it, investigate, recover, and learn.

They share one method — collect evidence without altering it, build a timeline, follow the artifacts — and this module teaches both as one skill, the mirror image of the attack chain you already know.

## Order of volatility: collect the fleeting first

Evidence disappears at very different rates. The **order of volatility** ranks what to capture first, because some of it is gone the moment you act:

```
1. CPU registers, cache          — gone in nanoseconds
2. RAM (running processes,        — gone on power-off
   network connections, keys)
3. Network state (ARP, routes,    — changes by the second
   open sockets)
4. Running processes             — change constantly
5. Disk                          — survives a reboot
6. Backups, archives             — the most durable
```

The practical consequence is the opposite of instinct: **do not pull the plug, and do not reboot.** A running machine holds a memory image full of decryption keys, injected code, and network connections that vanish forever on power-off. Capture RAM first, then disk. A defender who reboots a compromised host to "clean it" has destroyed the best evidence there was.

## Chain of custody

Evidence is only useful if it can be trusted, and in any serious case — legal, HR, insurance — it must be *provably* untampered. **Chain of custody** is the unbroken record of who handled each piece of evidence, when, and what they did to it:

```
Item: disk image of laptop-07 (server room), 2024-03-04 14:20
  14:20  A. Karimov  imaged via write-blocker, sha256 = a1b2c3...
  14:55  A. Karimov  stored on evidence drive EV-11, sealed
  16:10  D. Ismoilov received EV-11 for analysis, seal intact
```

Every hand-off is signed and timestamped. A gap in the chain lets anyone argue the evidence was altered, and the whole investigation collapses.

## Integrity by hashing

The mechanism that makes "untampered" provable is the hash from the cryptography module. You hash evidence at collection, and any time later re-hash it: a matching hash proves not one byte changed.

```
$ sha256sum evidence.dd
a1b2c3d4e5f6...  evidence.dd
```

Record that hash in the chain of custody. If it ever differs, the evidence is compromised. This single habit — hash on collection, verify before use — underpins all of forensics.

## Do no harm: work on copies

You never investigate the original. You make a forensic copy (next lesson), verify its hash matches, and do *all* analysis on the copy. The original is sealed and untouched, so that if your analysis is ever questioned, the pristine original is there to re-image. Opening a file on the original changes its access time — and that timestamp might have been evidence.

## The first-response checklist

Arriving at a suspected incident, in order:

1. **Do not turn it off.** Photograph the screen, note what is running.
2. **Capture volatile data first** — RAM, network connections, running processes.
3. **Then image the disk** with a write-blocker, and hash it.
4. **Start the chain of custody** the moment you touch anything.
5. **Document everything** — times, actions, what you saw — as you go, not after.

Everything in this module assumes you did these first. Rush them and the rest is built on evidence a court, or a careful colleague, will throw out.

## Try it (on your own machine / a lab)

1. Hash a file with `sha256sum`, copy it, hash the copy. Do they match? Change one byte and re-hash.
2. List what volatile data you would lose if you powered off your machine right now.
3. Write a two-line chain-of-custody entry for a file you "collected" as evidence.""",
        "contentUz": r"""Hujum modullari sizga bostirib kirishni o'rgatdi. Bu modul — stolning boshqa tomoni: buzilishdan keyin himoyachi nima qiladi — nima bo'lganini aniqlash, dalilni saqlash va "qanday, qachon va nima olishdi" degan savolga javob berish. Buni boshqaradigan yagona qoida: **yig'ish uchun kelgan dalilingizni yo'q qilmang.**

## Ikki ish, bitta intizom

- **Raqamli forenzika** — ehtiyotkor, voqeadan keyingi qayta tiklash: diskda, xotirada, loglarda nima bo'lgan va u nimani isbotlaydi.
- **Insidentga javob (IR)** — faol yoki yaqinda bo'lgan buzilishni jonli boshqarish: cheklash, tekshirish, tiklash va saboq olish.

Ular bitta usulni bo'lishadi — dalilni o'zgartirmasdan yig'ish, vaqt chizig'ini qurish, artefaktlarni kuzatish — va bu modul ikkalasini bitta ko'nikma sifatida o'rgatadi, siz allaqachon biladigan hujum zanjirining ko'zgu aksi.

## O'zgaruvchanlik tartibi: avval o'tkinchisini yig'ing

Dalil juda turli tezlikda yo'qoladi. **O'zgaruvchanlik tartibi** avval nimani olishni tartiblaydi, chunki ba'zisi siz harakat qilgan onda yo'qoladi:

```
1. Protsessor registrlari, kesh   — nanosekundlarda yo'qoladi
2. RAM (ishlayotgan jarayonlar,    — o'chirishda yo'qoladi
   tarmoq ulanishlari, kalitlar)
3. Tarmoq holati (ARP, marshrutlar, — soniyalarda o'zgaradi
   ochiq soketlar)
4. Ishlayotgan jarayonlar          — doim o'zgaradi
5. Disk                            — qayta yuklashdan omon qoladi
6. Zaxiralar, arxivlar             — eng chidamli
```

Amaliy oqibat instinktga teskari: **shnurni sug'urmang va qayta yuklamang.** Ishlayotgan mashina shifr kalitlari, kiritilgan kod va o'chirishda abadiy yo'qoladigan tarmoq ulanishlariga to'la xotira tasvirini saqlaydi. Avval RAMni oling, keyin diskni. Buzilgan xostni "tozalash" uchun qayta yuklagan himoyachi bor eng yaxshi dalilni yo'q qilgan.

## Vasiylik zanjiri (chain of custody)

Dalil faqat ishonilса foydali, va har qanday jiddiy holatda — huquqiy, kadrlar, sug'urta — u *isbotlanadigan* darajada aralashtirilmagan bo'lishi kerak. **Vasiylik zanjiri** — har bir dalilni kim, qachon boshqarganini va u bilan nima qilganining uzluksiz yozuvi:

```
Buyum: laptop-07 disk tasviri (server xonasi), 2024-03-04 14:20
  14:20  A. Karimov  write-blocker orqali tasvirlandi, sha256 = a1b2c3...
  14:55  A. Karimov  EV-11 dalil diskiga saqlandi, muhrlandi
  16:10  D. Ismoilov EV-11 ni tahlil uchun oldi, muhr butun
```

Har bir topshirish imzolangan va vaqt tamg'alangan. Zanjirdagi bo'shliq har kimga dalil o'zgartirilgan deyishga imkon beradi va butun tekshiruv qulaydi.

## Xeshlash orqali yaxlitlik

"Aralashtirilmagan"ni isbotlanadigan qiladigan mexanizm — kriptografiya modulidan xesh. Dalilni yig'ishda xeshlaysiz va keyin istalgan vaqtda qayta xeshlaysiz: mos keluvchi xesh bitta bayt ham o'zgarmaganini isbotlaydi.

```
$ sha256sum evidence.dd
a1b2c3d4e5f6...  evidence.dd
```

O'sha xeshni vasiylik zanjiriga yozing. Agar u biror marta farq qilса, dalil buzilgan. Aynan shu bitta odat — yig'ishda xeshlash, ishlatishdan oldin tekshirish — butun forenzikaning asosi.

## Zarar yetkazmang: nusxalarda ishlang

Siz hech qachon asl nusxani tekshirmaysiz. Forenzik nusxa qilasiz (keyingi dars), uning xeshi mos kelishini tekshirasiz va *butun* tahlilni nusxada bajarasiz. Asl nusxa muhrlanadi va tegilmaydi, shunda tahlilingiz shubha ostiga olinsa, toza asl nusxa qayta tasvirlash uchun bor. Asl nusxadagi faylni ochish uning kirish vaqtini o'zgartiradi — va o'sha vaqt tamg'asi dalil bo'lgan bo'lishi mumkin.

## Birinchi javob ro'yxati

Shubhali insidentga kelganda, tartibda:

1. **O'chirmang.** Ekranni suratga oling, nima ishlayotganini qayd qiling.
2. **Avval o'zgaruvchan ma'lumotni oling** — RAM, tarmoq ulanishlari, ishlayotgan jarayonlar.
3. **Keyin diskni** write-blocker bilan tasvirlang va xeshlang.
4. **Vasiylik zanjirini** biror narsaga tegan onda boshlang.
5. **Hamma narsani hujjatlang** — vaqtlar, harakatlar, ko'rganingiz — keyin emas, jarayonda.

Bu moduldagi hamma narsa siz avval shularni qilganingizni nazarda tutadi. Ularni shoshiltiring va qolgani sud yoki ehtiyotkor hamkasb rad etadigan dalilga qurilgan bo'ladi.

## Sinab ko'ring (o'z mashinangiz / laboratoriyada)

1. Faylni `sha256sum` bilan xeshlang, nusxalang, nusxani xeshlang. Mos keladimi? Bitta baytni o'zgartirib qayta xeshlang.
2. Mashinangizni hozir o'chirsangiz qanday o'zgaruvchan ma'lumotni yo'qotishingizni sanang.
3. Dalil sifatida "yig'gan" faylingiz uchun ikki qatorli vasiylik zanjiri yozuvини yozing.""",
        "contentRu": r"""Наступательные модули учили взламывать. Этот — другая сторона стола: что делает защитник после взлома — выяснить, что случилось, сохранить доказательства и ответить «как, когда и что унесли». Единственное правило, управляющее всем: **не уничтожь доказательства, за которыми пришёл.**

## Две задачи, одна дисциплина

- **Цифровая форензика** — аккуратная реконструкция постфактум: что было на диске, в памяти, в логах и что это доказывает.
- **Реагирование на инциденты (IR)** — живая обработка активного или недавнего взлома: сдержать, расследовать, восстановить и извлечь урок.

Они разделяют один метод — собирать улики, не изменяя их, строить хронологию, идти по артефактам — и этот модуль учит обоим как одному навыку, зеркалу уже знакомой вам цепочки атаки.

## Порядок волатильности: сначала собрать мимолётное

Улики исчезают с очень разной скоростью. **Порядок волатильности** ранжирует, что захватывать первым, ведь часть исчезает в момент вашего действия:

```
1. Регистры CPU, кеш               — исчезают за наносекунды
2. RAM (запущенные процессы,        — исчезает при выключении
   сетевые соединения, ключи)
3. Состояние сети (ARP, маршруты,   — меняется посекундно
   открытые сокеты)
4. Запущенные процессы             — постоянно меняются
5. Диск                            — переживает перезагрузку
6. Резервные копии, архивы         — самое долговечное
```

Практическое следствие противоположно инстинкту: **не выдёргивайте шнур и не перезагружайте.** Работающая машина держит образ памяти, полный ключей расшифровки, внедрённого кода и сетевых соединений, которые навсегда исчезают при выключении. Сначала снимите RAM, затем диск. Защитник, перезагрузивший скомпрометированный хост, чтобы «почистить», уничтожил лучшую улику.

## Цепочка сохранности (chain of custody)

Улика полезна, только если ей можно доверять, и в любом серьёзном деле — юридическом, кадровом, страховом — она должна быть *доказуемо* нетронута. **Цепочка сохранности** — непрерывная запись того, кто и когда обращался с каждой уликой и что с ней делал:

```
Предмет: образ диска laptop-07 (серверная), 2024-03-04 14:20
  14:20  А. Каримов  снят через write-blocker, sha256 = a1b2c3...
  14:55  А. Каримов  сохранён на диск улик EV-11, опечатан
  16:10  Д. Исмоилов получил EV-11 на анализ, пломба цела
```

Каждая передача подписана и с меткой времени. Пробел в цепочке позволяет кому угодно заявить, что улику изменили, и всё расследование рушится.

## Целостность через хеширование

Механизм, делающий «нетронутость» доказуемой, — хеш из модуля криптографии. Вы хешируете улику при сборе и позже в любой момент перехешируете: совпадающий хеш доказывает, что не изменился ни байт.

```
$ sha256sum evidence.dd
a1b2c3d4e5f6...  evidence.dd
```

Запишите этот хеш в цепочку сохранности. Если он когда-нибудь отличается, улика скомпрометирована. Именно эта привычка — хешировать при сборе, проверять перед использованием — лежит в основе всей форензики.

## Не навреди: работайте с копиями

Оригинал вы никогда не исследуете. Делаете форензическую копию (следующий урок), проверяете, что её хеш совпадает, и *весь* анализ ведёте на копии. Оригинал опечатан и нетронут, чтобы, если анализ оспорят, чистый оригинал был для повторного снятия образа. Открытие файла на оригинале меняет его время доступа — а эта метка могла быть уликой.

## Чек-лист первого реагирования

Прибыв на подозреваемый инцидент, по порядку:

1. **Не выключайте.** Сфотографируйте экран, отметьте, что запущено.
2. **Сначала снимите волатильные данные** — RAM, сетевые соединения, процессы.
3. **Затем снимите образ диска** через write-blocker и захешируйте.
4. **Начните цепочку сохранности** в момент первого касания.
5. **Документируйте всё** — время, действия, что видели — по ходу, не потом.

Всё в этом модуле предполагает, что это сделано первым. Поспешите — и остальное построено на уликах, которые суд или внимательный коллега отбросит.

## Попробуйте (на своей машине / в лаборатории)

1. Захешируйте файл через `sha256sum`, скопируйте, захешируйте копию. Совпадают? Измените байт и перехешируйте.
2. Перечислите, какие волатильные данные вы потеряете, выключив машину прямо сейчас.
3. Напишите двухстрочную запись цепочки сохранности для файла, который вы «собрали» как улику.""",
        "questions": [
            q("Why should you not power off or reboot a compromised machine?",
              "Nega buzilgan mashinani o'chirmaslik yoki qayta yuklamaslik kerak?",
              "Почему нельзя выключать или перезагружать скомпрометированную машину?",
              ["Volatile data in RAM — keys, processes, connections — is lost forever",
               "It will alert the attacker", "The disk will be encrypted",
               "It voids the warranty"],
              ["RAM'dagi o'zgaruvchan ma'lumot — kalitlar, jarayonlar, ulanishlar — abadiy yo'qoladi",
               "U hujumchini ogohlantiradi", "Disk shifrlanadi",
               "Kafolat bekor bo'ladi"],
              ["Волатильные данные в RAM — ключи, процессы, соединения — теряются навсегда",
               "Это предупредит атакующего", "Диск зашифруется",
               "Это аннулирует гарантию"], 0),
            q("What does chain of custody establish?",
              "Vasiylik zanjiri nimani o'rnatadi?",
              "Что устанавливает цепочка сохранности?",
              ["An unbroken record of who handled evidence and when, proving it was not tampered with",
               "The attacker's identity", "The market value of the evidence",
               "The encryption key"],
              ["Dalilni kim va qachon boshqargani uzluksiz yozuvi — u aralashtirilmaganini isbotlaydi",
               "Hujumchining shaxsi", "Dalilning bozor qiymati",
               "Shifrlash kaliti"],
              ["Непрерывную запись, кто и когда обращался с уликой, доказывая её нетронутость",
               "Личность атакующего", "Рыночную стоимость улики",
               "Ключ шифрования"], 0),
            q("Why do you analyse a copy of the evidence, never the original?",
              "Nega dalilning nusxasini tahlil qilasiz, hech qachon asl nusxani emas?",
              "Почему анализируют копию улики, а не оригинал?",
              ["Any action alters the original (e.g. access times); the sealed original stays pristine",
               "Copies are faster to read", "The original is always encrypted",
               "It is only a legal formality with no technical reason"],
              ["Har qanday harakat asl nusxani o'zgartiradi (masalan kirish vaqti); muhrlangan asl nusxa toza qoladi",
               "Nusxalarni o'qish tezroq", "Asl nusxa doim shifrlangan",
               "Bu texnik sababsiz faqat huquqiy rasmiyatchilik"],
              ["Любое действие меняет оригинал (напр. время доступа); опечатанный оригинал остаётся чистым",
               "Копии быстрее читать", "Оригинал всегда зашифрован",
               "Это только юридическая формальность без технической причины"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "forensics", "points": 70,
        "title": "Disk imaging and integrity",
        "titleUz": "Disk tasvirlash va yaxlitlik",
        "titleRu": "Снятие образа диска и целостность",
        "content": r"""Before you analyse a disk you make a bit-for-bit copy — an **image** — and work on that. A forensic image is not a file copy; it is every byte of the device, including deleted files and slack space, captured exactly.

## Why a bit-for-bit image, not a file copy

A normal copy (`cp`, drag-and-drop) copies *files* the filesystem knows about. It misses everything forensics cares about: deleted files still on the platter, the slack space at the end of clusters, unallocated regions, and the partition layout. A forensic image captures the raw device — every sector — so nothing is lost.

## dd — the classic imager

`dd` copies raw blocks from one place to another. To image a disk:

```
$ sudo dd if=/dev/sdb of=evidence.dd bs=4M status=progress
2147483648 bytes (2.1 GB) copied, 34 s, 63 MB/s
```

- `if=/dev/sdb` — the input, the *whole device* (not a partition like `/dev/sdb1`)
- `of=evidence.dd` — the output image file
- `bs=4M` — block size, for speed
- `status=progress` — show progress

**The direction is everything.** Get `if` and `of` backwards and you overwrite the evidence with a blank file — `dd` has erased more disks than any other command. Read the line twice before pressing enter.

## dcfldd and dc3dd — dd built for forensics

`dcfldd` is `dd` with forensics features: it hashes *while* it images, so you get the hash of the source and the copy in one pass and can prove they match:

```
$ sudo dcfldd if=/dev/sdb of=evidence.dd hash=sha256 hashlog=evidence.hash
```

This is preferred over plain `dd` in real work, because integrity is baked into the acquisition instead of a separate step you might forget.

## Write blockers: read without writing

The moment you connect a suspect disk, the operating system may *write* to it — updating timestamps, mounting it, creating hidden files. That alters the evidence before you have even started. A **write blocker** — hardware or software — sits between you and the disk and physically refuses all writes, so the original cannot change.

In software, mount read-only:

```
$ sudo mount -o ro,noexec,noatime /dev/sdb1 /mnt/evidence
```

`ro` read-only, `noatime` do not even update access times, `noexec` do not run anything from it. In serious casework a hardware write blocker is used because it cannot be bypassed by a misconfiguration.

## Verify the image matches

After imaging, prove the copy is identical to the source by hashing both:

```
$ sudo sha256sum /dev/sdb
a1b2c3d4...  /dev/sdb
$ sha256sum evidence.dd
a1b2c3d4...  evidence.dd
```

Identical hashes mean the image is a perfect copy. Record both in the chain of custody. From now on you work only on `evidence.dd`, and if anyone asks whether your working copy is faithful, the hash answers.

## Working on the image without touching the disk

You can mount the image read-only to browse it, or attach it as a loop device:

```
$ sudo mount -o ro,loop evidence.dd /mnt/analysis
$ ls /mnt/analysis
```

The image file itself never changes, so you can re-mount, run tools, and even make a second copy to experiment on destructively — the sealed original disk and the master image both stay pristine.

## Compression and storage

Images are large. You can compress on the fly, keeping the hash of the *uncompressed* data:

```
$ sudo dd if=/dev/sdb bs=4M | gzip > evidence.dd.gz
```

Store the image, its hash, and the chain-of-custody entry together. The image is the foundation of everything that follows in this module — every timeline, every carved file, every recovered artifact comes from it.

## Try it (on a spare USB stick or a lab image you own)

1. `dd` a small USB stick to an image file, then `sha256sum` both. Do they match?
2. Mount the image read-only with `-o ro,loop` and list its contents.
3. Explain, in one sentence, why a write blocker matters even before you open a single file.""",
        "contentUz": r"""Diskni tahlil qilishdan oldin bit-bit nusxa — **tasvir (image)** — qilasiz va o'shanda ishlaysiz. Forenzik tasvir fayl nusxasi emas; u qurilmaning har bir bayti, jumladan o'chirilgan fayllar va bo'sh joy, aniq olingan.

## Nega bit-bit tasvir, fayl nusxasi emas

Oddiy nusxa (`cp`, sudrab tashlash) fayl tizimi biladigan *fayllarni* nusxalaydi. U forenzikaga muhim hamma narsani o'tkazib yuboradi: plastinkada hali turgan o'chirilgan fayllar, klasterlar oxiridagi bo'sh joy, ajratilmagan hududlar va bo'lim tuzilishi. Forenzik tasvir xom qurilmani — har bir sektorni — oladi, shunda hech narsa yo'qolmaydi.

## dd — klassik tasvirlovchi

`dd` xom bloklarni bir joydan boshqasiga nusxalaydi. Diskni tasvirlash uchun:

```
$ sudo dd if=/dev/sdb of=evidence.dd bs=4M status=progress
2147483648 bytes (2.1 GB) copied, 34 s, 63 MB/s
```

- `if=/dev/sdb` — kirish, *butun qurilma* (`/dev/sdb1` kabi bo'lim emas)
- `of=evidence.dd` — chiqish tasvir fayli
- `bs=4M` — blok o'lchami, tezlik uchun
- `status=progress` — jarayonni ko'rsatish

**Yo'nalish — hamma narsa.** `if` va `of` ni teskari qo'yib dalilni bo'sh fayl bilan qayta yozasiz — `dd` boshqa har qanday buyruqdan ko'ra ko'proq disk o'chirgan. Enter bosishdan oldin satrni ikki marta o'qing.

## dcfldd va dc3dd — forenzika uchun dd

`dcfldd` — forenzika xususiyatli `dd`: u tasvirlash *paytida* xeshlaydi, shunda manba va nusxaning xeshini bitta o'tishda olasiz va mos kelishini isbotlay olasiz:

```
$ sudo dcfldd if=/dev/sdb of=evidence.dd hash=sha256 hashlog=evidence.hash
```

Bu haqiqiy ishda oddiy `dd` dan afzal, chunki yaxlitlik unutishingiz mumkin bo'lgan alohida qadam emas, olishning ichiga qurilgan.

## Write blocker: yozmasdan o'qish

Shubhali diskni ulagan oningizda operatsion tizim unga *yozishi* mumkin — vaqt tamg'alarini yangilash, mount qilish, yashirin fayllar yaratish. Bu siz boshlashdan oldin dalilni o'zgartiradi. **Write blocker** — apparat yoki dastur — siz va disk orasida turadi va barcha yozishlarni jismonan rad etadi, shunda asl nusxa o'zgara olmaydi.

Dasturda faqat-o'qish mount qiling:

```
$ sudo mount -o ro,noexec,noatime /dev/sdb1 /mnt/evidence
```

`ro` faqat-o'qish, `noatime` kirish vaqtlarini ham yangilamaslik, `noexec` undan hech narsa ishga tushirmaslik. Jiddiy ishda apparat write blocker ishlatiladi, chunki uni noto'g'ri sozlash bilan chetlab bo'lmaydi.

## Tasvir mos kelishini tekshiring

Tasvirlashdan keyin ikkalasini xeshlab, nusxa manbaga bir xilligini isbotlang:

```
$ sudo sha256sum /dev/sdb
a1b2c3d4...  /dev/sdb
$ sha256sum evidence.dd
a1b2c3d4...  evidence.dd
```

Bir xil xeshlar tasvir mukammal nusxa ekanini bildiradi. Ikkalasini vasiylik zanjiriga yozing. Bundan buyon faqat `evidence.dd` da ishlaysiz, va kimdir ishchi nusxangiz sodiqmi deb so'rasa, xesh javob beradi.

## Diskka tegmasdan tasvirda ishlash

Ko'rish uchun tasvirni faqat-o'qish mount qilishingiz yoki loop qurilma sifatida ulashingiz mumkin:

```
$ sudo mount -o ro,loop evidence.dd /mnt/analysis
$ ls /mnt/analysis
```

Tasvir faylining o'zi hech qachon o'zgarmaydi, shunda qayta mount qilishingiz, vositalarni yuritishingiz va hatto buzg'unchi tajriba uchun ikkinchi nusxa qilishingiz mumkin — muhrlangan asl disk ham, asosiy tasvir ham toza qoladi.

## Siqish va saqlash

Tasvirlar katta. Uchib ketayotganda siqishingiz mumkin, *siqilmagan* ma'lumot xeshini saqlab:

```
$ sudo dd if=/dev/sdb bs=4M | gzip > evidence.dd.gz
```

Tasvir, uning xeshi va vasiylik zanjiri yozuvini birga saqlang. Tasvir — bu moduldagi hamma narsaning poydevori — har bir vaqt chizig'i, har bir kesib olingan fayl, har bir tiklangan artefakt undan keladi.

## Sinab ko'ring (zaxira USB yoki o'zingizniki laboratoriya tasvirida)

1. Kichik USB'ni tasvir fayliga `dd` qiling, keyin ikkalasini `sha256sum` qiling. Mos keladimi?
2. Tasvirni `-o ro,loop` bilan faqat-o'qish mount qiling va mazmunini sanang.
3. Bitta faylни ochishdan oldin ham write blocker nega muhimligini bir jumlada tushuntiring.""",
        "contentRu": r"""Прежде чем анализировать диск, делают побитовую копию — **образ** — и работают с ней. Форензический образ не копия файлов; это каждый байт устройства, включая удалённые файлы и слэк-пространство, снятый точно.

## Почему побитовый образ, а не копия файлов

Обычная копия (`cp`, перетаскивание) копирует *файлы*, известные файловой системе. Она упускает всё, что важно форензике: удалённые файлы, ещё лежащие на пластине, слэк в конце кластеров, нераспределённые области и разметку разделов. Форензический образ снимает сырое устройство — каждый сектор — так что ничего не теряется.

## dd — классический имиджер

`dd` копирует сырые блоки из одного места в другое. Чтобы снять образ диска:

```
$ sudo dd if=/dev/sdb of=evidence.dd bs=4M status=progress
2147483648 bytes (2.1 GB) copied, 34 s, 63 MB/s
```

- `if=/dev/sdb` — вход, *всё устройство* (не раздел вроде `/dev/sdb1`)
- `of=evidence.dd` — выходной файл образа
- `bs=4M` — размер блока, для скорости
- `status=progress` — показать прогресс

**Направление — это всё.** Перепутайте `if` и `of` — и перезапишете улику пустым файлом; `dd` стёр больше дисков, чем любая другая команда. Прочитайте строку дважды перед Enter.

## dcfldd и dc3dd — dd для форензики

`dcfldd` — это `dd` с форензическими функциями: он хеширует *во время* снятия, так что вы получаете хеш источника и копии за один проход и можете доказать совпадение:

```
$ sudo dcfldd if=/dev/sdb of=evidence.dd hash=sha256 hashlog=evidence.hash
```

Это предпочтительнее простого `dd` в реальной работе, потому что целостность встроена в снятие, а не отдельный шаг, который можно забыть.

## Write blocker: читать, не записывая

В момент подключения подозреваемого диска ОС может *записать* на него — обновить метки времени, смонтировать, создать скрытые файлы. Это меняет улику до того, как вы начали. **Write blocker** — аппаратный или программный — стоит между вами и диском и физически отвергает все записи, так что оригинал не изменится.

Программно смонтируйте только для чтения:

```
$ sudo mount -o ro,noexec,noatime /dev/sdb1 /mnt/evidence
```

`ro` только чтение, `noatime` не обновлять даже время доступа, `noexec` ничего с него не запускать. В серьёзном деле используют аппаратный write blocker, потому что его нельзя обойти неверной настройкой.

## Проверьте, что образ совпадает

После снятия докажите идентичность копии источнику, захешировав оба:

```
$ sudo sha256sum /dev/sdb
a1b2c3d4...  /dev/sdb
$ sha256sum evidence.dd
a1b2c3d4...  evidence.dd
```

Одинаковые хеши означают, что образ — точная копия. Запишите оба в цепочку сохранности. Отныне вы работаете только с `evidence.dd`, и если спросят, верна ли рабочая копия, ответит хеш.

## Работа с образом, не касаясь диска

Образ можно смонтировать только для чтения для просмотра или подключить как loop-устройство:

```
$ sudo mount -o ro,loop evidence.dd /mnt/analysis
$ ls /mnt/analysis
```

Сам файл образа никогда не меняется, так что можно перемонтировать, гонять инструменты и даже сделать вторую копию для разрушительных экспериментов — и опечатанный оригинал, и мастер-образ остаются чистыми.

## Сжатие и хранение

Образы большие. Можно сжимать на лету, сохраняя хеш *несжатых* данных:

```
$ sudo dd if=/dev/sdb bs=4M | gzip > evidence.dd.gz
```

Храните образ, его хеш и запись цепочки сохранности вместе. Образ — фундамент всего дальнейшего в модуле: каждая хронология, каждый вырезанный файл, каждый восстановленный артефакт идёт из него.

## Попробуйте (на запасной флешке или своём лабораторном образе)

1. `dd` небольшую флешку в файл образа, затем `sha256sum` оба. Совпадают?
2. Смонтируйте образ только для чтения с `-o ro,loop` и перечислите содержимое.
3. Объясните в одном предложении, почему write blocker важен ещё до открытия единственного файла.""",
        "questions": [
            q("Why is a forensic image made bit-for-bit rather than as a file copy?",
              "Nega forenzik tasvir fayl nusxasi emas, bit-bit qilinadi?",
              "Почему форензический образ снимают побитово, а не как копию файлов?",
              ["It captures deleted files, slack and unallocated space a file copy misses",
               "It is faster than copying files", "It compresses better",
               "File copies are illegal in court"],
              ["U fayl nusxasi o'tkazib yuboradigan o'chirilgan fayllar, bo'sh va ajratilmagan joyni oladi",
               "U fayl nusxalashdan tezroq", "U yaxshiroq siqiladi",
               "Fayl nusxalari sudda noqonuniy"],
              ["Он снимает удалённые файлы, слэк и нераспределённое место, что копия упускает",
               "Он быстрее копирования файлов", "Он лучше сжимается",
               "Копии файлов незаконны в суде"], 0),
            q("What does a write blocker do?",
              "Write blocker nima qiladi?",
              "Что делает write blocker?",
              ["Physically prevents any writes to the suspect disk, so it cannot be altered",
               "Encrypts the disk", "Speeds up imaging", "Deletes malware automatically"],
              ["Shubhali diskка har qanday yozishni jismonan to'sadi, shunda u o'zgara olmaydi",
               "Diskни shifrlaydi", "Tasvirlashni tezlashtiradi", "Zararli dasturni avtomatik o'chiradi"],
              ["Физически предотвращает любые записи на подозреваемый диск, чтобы он не изменился",
               "Шифрует диск", "Ускоряет снятие образа", "Автоматически удаляет вредонос"], 0),
            q("In `dd if=/dev/sdb of=evidence.dd`, what happens if you swap if and of?",
              "`dd if=/dev/sdb of=evidence.dd` da if va of ni almashtirsangiz nima bo'ladi?",
              "В `dd if=/dev/sdb of=evidence.dd` что будет, если поменять if и of?",
              ["You overwrite the evidence disk with the (blank) file — data destroyed",
               "Nothing — dd is symmetric", "The image is compressed",
               "It only reads faster"],
              ["Dalil diskини (bo'sh) fayl bilan qayta yozasiz — ma'lumot yo'q qilinadi",
               "Hech narsa — dd simmetrik", "Tasvir siqiladi",
               "U faqat tezroq o'qiydi"],
              ["Вы перезапишете диск-улику (пустым) файлом — данные уничтожены",
               "Ничего — dd симметричен", "Образ сожмётся",
               "Он лишь читает быстрее"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "forensics", "points": 70,
        "title": "The filesystem as evidence: timelines and deleted files",
        "titleUz": "Fayl tizimi dalil sifatida: vaqt chiziqlari va o'chirilgan fayllar",
        "titleRu": "Файловая система как улика: хронологии и удалённые файлы",
        "content": r"""A filesystem records far more than the files you see. Every file carries timestamps, and every "deleted" file usually still exists. Reading these turns a disk image into a story of what happened, and when.

## The timestamps every file carries

Unix filesystems keep three times per file, the **MAC** times:

- **mtime** — Modified: when the file's *contents* last changed.
- **atime** — Accessed: when it was last *read*.
- **ctime** — Changed: when its *metadata* (permissions, owner, name) last changed. Not "created".

```
$ stat report.txt
  File: report.txt
  Size: 2841        Blocks: 8          IO Block: 4096   regular file
Access: 2024-03-04 09:12:44.000000000 +0500
Modify: 2024-03-03 22:41:10.000000000 +0500
Change: 2024-03-03 22:41:10.000000000 +0500
```

These are evidence. A config file with an mtime at 03:00 on the night of the breach is a lead. A sensitive document with an atime just before data was exfiltrated shows it was read. Windows adds a fourth, the *birth* time (true creation), which forensic tools read from the MFT.

## Timelining: ordering the whole disk by time

The single most powerful forensic technique is the **timeline** — every file's MAC times, sorted, so you can read the disk as a sequence of events. The Sleuth Kit builds it:

```
$ fls -r -m / evidence.dd > bodyfile          # collect metadata for every file
$ mactime -b bodyfile -d > timeline.csv        # sort it all by time
```

Now `timeline.csv` reads chronologically:

```
Mon Mar 04 2024 03:01:12  ...  /tmp/.x/backdoor        (created)
Mon Mar 04 2024 03:01:45  ...  /etc/crontab            (modified)
Mon Mar 04 2024 03:02:10  ...  /var/www/config.php     (accessed)
```

At a glance: a file appeared in `/tmp` at 03:01, then crontab was edited, then a config was read. That is the attacker's footprints in order. **Building and reading a timeline is the core skill of disk forensics.**

## Deleted files are usually still there

Deleting a file does not erase its data. The filesystem just marks its entry as free and unlinks it; the actual bytes stay on the disk until something else overwrites them. Until then, the file is recoverable.

The Sleuth Kit lists deleted entries and recovers them:

```
$ fls -rd evidence.dd                 # list deleted files
d/d * 128:  /home/user/secret.docx    # the * marks it deleted
$ icat evidence.dd 128 > recovered.docx   # recover by its inode number
```

`fls -rd` finds deleted entries; `icat` reads the data still sitting at that inode. This is how a "deleted" incriminating document comes back, and why secure deletion (overwriting) exists.

## Slack space and hidden data

A file rarely fills its last cluster exactly; the leftover — **slack space** — may still hold fragments of a *previous* file that lived there. Forensic tools read slack, and it occasionally holds exactly the fragment that matters. Data can also hide in unallocated space, in alternate data streams (NTFS), or past the declared end of a partition.

## The Sleuth Kit and Autopsy

The commands above (`fls`, `icat`, `mactime`) are **The Sleuth Kit** — the standard open-source forensic toolkit. **Autopsy** is its graphical front end: point it at a disk image and it builds the timeline, lists deleted files, extracts artifacts (browser history, recent files, USB history) and lets you search — all without touching the original. In practice you often drive Autopsy for breadth and drop to Sleuth Kit commands for precision.

## Reading a filesystem like a detective

Every question has a filesystem answer: *When did they get in?* — earliest anomalous mtime. *What did they touch?* — atimes around the incident. *What did they leave?* — files created in odd places (`/tmp`, `/dev/shm`, hidden dot-directories). *What did they take?* — atimes on sensitive files. The filesystem does not forget; forensics is knowing where it remembers.

## Try it (on a lab image or a spare drive you own)

1. `stat` a file and read its three MAC times. Edit it, `stat` again — which times changed?
2. Delete a file on a test image, then recover it with `fls -rd` and `icat`.
3. Build a `mactime` timeline of a small image and find the most recently modified files.""",
        "contentUz": r"""Fayl tizimi siz ko'radigan fayllardan ancha ko'proq yozadi. Har bir fayl vaqt tamg'alarini olib yuradi, va har bir "o'chirilgan" fayl odatda hali mavjud. Bularni o'qish disk tasvirini nima bo'lgani va qachonligi haqidagi hikoyaga aylantiradi.

## Har bir fayl olib yuradigan vaqt tamg'alari

Unix fayl tizimlari har fayl uchun uch vaqt saqlaydi — **MAC** vaqtlari:

- **mtime** — O'zgartirilgan: fayl *mazmuni* oxirgi marta o'zgargan vaqt.
- **atime** — Kirilgan: u oxirgi marta *o'qilgan* vaqt.
- **ctime** — Almashgan: uning *metama'lumoti* (ruxsatlar, egasi, nom) oxirgi marta o'zgargan vaqt. "Yaratilgan" emas.

```
$ stat report.txt
  File: report.txt
  Size: 2841        Blocks: 8          IO Block: 4096   regular file
Access: 2024-03-04 09:12:44.000000000 +0500
Modify: 2024-03-03 22:41:10.000000000 +0500
Change: 2024-03-03 22:41:10.000000000 +0500
```

Bular — dalil. Buzilish tunida 03:00 dagi mtime li konfiguratsiya fayli — iz. Ma'lumot chiqarilishidan oldingi atime li nozik hujjat u o'qilganini ko'rsatadi. Windows to'rtinchisini — *tug'ilish* vaqtini (haqiqiy yaratilish) qo'shadi, forenzik vositalar uni MFT'dan o'qiydi.

## Vaqt chizig'i: butun diskni vaqt bo'yicha tartiblash

Eng kuchli yagona forenzik texnika — **vaqt chizig'i** — har faylning MAC vaqtlari tartiblangan, shunda diskni voqealar ketma-ketligi sifatida o'qiysiz. The Sleuth Kit uni quradi:

```
$ fls -r -m / evidence.dd > bodyfile          # har fayl uchun metama'lumot yig'ish
$ mactime -b bodyfile -d > timeline.csv        # hammasini vaqt bo'yicha tartiblash
```

Endi `timeline.csv` xronologik o'qiladi:

```
Mon Mar 04 2024 03:01:12  ...  /tmp/.x/backdoor        (yaratildi)
Mon Mar 04 2024 03:01:45  ...  /etc/crontab            (o'zgartirildi)
Mon Mar 04 2024 03:02:10  ...  /var/www/config.php     (kirildi)
```

Bir qarashda: 03:01 da `/tmp` da fayl paydo bo'ldi, keyin crontab tahrirlandi, keyin konfiguratsiya o'qildi. Bu — hujumchining izlari tartibda. **Vaqt chizig'ini qurish va o'qish — disk forenzikasining o'zak ko'nikmasi.**

## O'chirilgan fayllar odatda hali joyida

Faylni o'chirish uning ma'lumotini yo'q qilmaydi. Fayl tizimi shunchaki yozuvини bo'sh deb belgilaydi va uzadi; haqiqiy baytlar boshqa narsa qayta yozguncha diskda qoladi. Shu paytgacha fayl tiklanadi.

The Sleuth Kit o'chirilgan yozuvlarni sanaydi va tiklaydi:

```
$ fls -rd evidence.dd                 # o'chirilgan fayllarni sanash
d/d * 128:  /home/user/secret.docx    # * uni o'chirilgan deb belgilaydi
$ icat evidence.dd 128 > recovered.docx   # inode raqami bo'yicha tiklash
```

`fls -rd` o'chirilgan yozuvlarni topadi; `icat` o'sha inode'da hali turgan ma'lumotni o'qiydi. Aynan shunday "o'chirilgan" ayblovchi hujjat qaytadi, va xavfsiz o'chirish (qayta yozish) nega mavjudligi shu.

## Bo'sh joy (slack) va yashirin ma'lumot

Fayl oxirgi klasterini kamdan-kam aniq to'ldiradi; ortiqcha qism — **slack space** — o'sha yerda yashagan *oldingi* faylning parchalarini hali saqlashi mumkin. Forenzik vositalar slack'ni o'qiydi, va u ba'zan aynan muhim parchani saqlaydi. Ma'lumot ajratilmagan joyda, alternativ ma'lumot oqimlarida (NTFS) yoki bo'limning e'lon qilingan oxiridan keyin ham yashirinishi mumkin.

## The Sleuth Kit va Autopsy

Yuqoridagi buyruqlar (`fls`, `icat`, `mactime`) — **The Sleuth Kit** — standart ochiq forenzik to'plam. **Autopsy** — uning grafik interfeysi: uni disk tasviriga yo'naltiring, u vaqt chizig'ini quradi, o'chirilgan fayllarni sanaydi, artefaktlarni (brauzer tarixi, oxirgi fayllar, USB tarixi) ajratib oladi va qidirishga imkon beradi — hammasi asl nusxaga tegmasdan. Amalda siz ko'pincha kenglik uchun Autopsy'ni, aniqlik uchun Sleuth Kit buyruqlarини yuritasiz.

## Fayl tizimini detektivdek o'qish

Har savolning fayl tizimida javobi bor: *Qachon kirishdi?* — eng erta anomal mtime. *Nimaga tegishdi?* — insident atrofidagi atime'lar. *Nima qoldirishdi?* — g'alati joylarda yaratilgan fayllar (`/tmp`, `/dev/shm`, yashirin nuqta-kataloglar). *Nima olishdi?* — nozik fayllardagi atime'lar. Fayl tizimi unutmaydi; forenzika — u qayerda eslashini bilish.

## Sinab ko'ring (laboratoriya tasviri yoki o'zingizniki zaxira diskда)

1. Faylni `stat` qiling va uch MAC vaqtini o'qing. Tahrirlang, yana `stat` — qaysi vaqtlar o'zgardi?
2. Test tasvirida faylni o'chiring, keyin `fls -rd` va `icat` bilan tiklang.
3. Kichik tasvirning `mactime` vaqt chizig'ini quring va eng yaqinda o'zgartirilgan fayllarni toping.""",
        "contentRu": r"""Файловая система записывает куда больше, чем видимые файлы. Каждый файл несёт метки времени, и каждый «удалённый» файл обычно ещё существует. Их чтение превращает образ диска в историю того, что произошло и когда.

## Метки времени каждого файла

Файловые системы Unix хранят три времени на файл — **MAC**-времена:

- **mtime** — Modified: когда последний раз менялось *содержимое*.
- **atime** — Accessed: когда последний раз *читался*.
- **ctime** — Changed: когда последний раз менялись *метаданные* (права, владелец, имя). Не «создан».

```
$ stat report.txt
  File: report.txt
  Size: 2841        Blocks: 8          IO Block: 4096   regular file
Access: 2024-03-04 09:12:44.000000000 +0500
Modify: 2024-03-03 22:41:10.000000000 +0500
Change: 2024-03-03 22:41:10.000000000 +0500
```

Это улики. Конфиг с mtime в 03:00 в ночь взлома — зацепка. Чувствительный документ с atime прямо перед эксфильтрацией показывает, что его читали. Windows добавляет четвёртое — *время рождения* (истинное создание), которое форензические инструменты читают из MFT.

## Хронология: упорядочить весь диск по времени

Мощнейшая единственная техника — **хронология**: MAC-времена каждого файла, отсортированные, чтобы читать диск как последовательность событий. The Sleuth Kit её строит:

```
$ fls -r -m / evidence.dd > bodyfile          # собрать метаданные каждого файла
$ mactime -b bodyfile -d > timeline.csv        # отсортировать всё по времени
```

Теперь `timeline.csv` читается хронологически:

```
Mon Mar 04 2024 03:01:12  ...  /tmp/.x/backdoor        (создан)
Mon Mar 04 2024 03:01:45  ...  /etc/crontab            (изменён)
Mon Mar 04 2024 03:02:10  ...  /var/www/config.php     (прочитан)
```

С одного взгляда: в 03:01 в `/tmp` появился файл, затем отредактирован crontab, затем прочитан конфиг. Это следы атакующего по порядку. **Построить и прочитать хронологию — ключевой навык дисковой форензики.**

## Удалённые файлы обычно ещё на месте

Удаление файла не стирает его данные. Файловая система лишь помечает запись как свободную и отвязывает её; сами байты остаются на диске, пока их что-то не перезапишет. До тех пор файл восстановим.

The Sleuth Kit перечисляет удалённые записи и восстанавливает их:

```
$ fls -rd evidence.dd                 # перечислить удалённые файлы
d/d * 128:  /home/user/secret.docx    # * помечает удалённый
$ icat evidence.dd 128 > recovered.docx   # восстановить по номеру inode
```

`fls -rd` находит удалённые записи; `icat` читает данные, ещё лежащие в этом inode. Так возвращается «удалённый» уличающий документ, и потому существует безопасное удаление (перезапись).

## Слэк-пространство и скрытые данные

Файл редко точно заполняет последний кластер; остаток — **слэк** — может хранить фрагменты *предыдущего* файла, жившего там. Форензические инструменты читают слэк, и иногда он хранит именно нужный фрагмент. Данные также прячутся в нераспределённом месте, в альтернативных потоках данных (NTFS) или за объявленным концом раздела.

## The Sleuth Kit и Autopsy

Команды выше (`fls`, `icat`, `mactime`) — это **The Sleuth Kit**, стандартный открытый форензический набор. **Autopsy** — его графический интерфейс: наведите его на образ диска, и он построит хронологию, перечислит удалённые файлы, извлечёт артефакты (история браузера, недавние файлы, история USB) и даст искать — всё не касаясь оригинала. На практике часто ведут Autopsy для широты и спускаются к командам Sleuth Kit для точности.

## Читать файловую систему как детектив

У каждого вопроса есть ответ в файловой системе: *Когда вошли?* — самый ранний аномальный mtime. *Что трогали?* — atime вокруг инцидента. *Что оставили?* — файлы в странных местах (`/tmp`, `/dev/shm`, скрытые точка-каталоги). *Что унесли?* — atime на чувствительных файлах. Файловая система не забывает; форензика — знать, где она помнит.

## Попробуйте (на лабораторном образе или своём запасном диске)

1. `stat` файла и прочитайте три MAC-времени. Отредактируйте, `stat` снова — какие времена изменились?
2. Удалите файл на тестовом образе, затем восстановите через `fls -rd` и `icat`.
3. Постройте `mactime`-хронологию небольшого образа и найдите недавно изменённые файлы.""",
        "questions": [
            q("What does a filesystem timeline (mactime) let an investigator do?",
              "Fayl tizimi vaqt chizig'i (mactime) tekshiruvchiga nima qilishga imkon beradi?",
              "Что хронология файловой системы (mactime) позволяет следователю?",
              ["Read the disk as a time-ordered sequence of events across all files",
               "Decrypt encrypted files", "Recover the root password",
               "Block the attacker in real time"],
              ["Diskni barcha fayllar bo'ylab vaqt bo'yicha tartiblangan voqealar ketma-ketligi sifatida o'qish",
               "Shifrlangan fayllarni deshifrlash", "Root parolini tiklash",
               "Hujumchini real vaqtda bloklash"],
              ["Читать диск как упорядоченную по времени последовательность событий по всем файлам",
               "Расшифровать зашифрованные файлы", "Восстановить пароль root",
               "Блокировать атакующего в реальном времени"], 0),
            q("Why is a 'deleted' file usually still recoverable?",
              "Nega 'o'chirilgan' fayl odatda hali tiklanadi?",
              "Почему «удалённый» файл обычно ещё восстановим?",
              ["Deletion only unlinks the entry; the data stays until overwritten",
               "The OS keeps a hidden backup of every file", "Deletion is reversible with Ctrl+Z",
               "Files are never truly deleted by design"],
              ["O'chirish faqat yozuvni uzadi; ma'lumot qayta yozilguncha qoladi",
               "OS har faylning yashirin zaxirasini saqlaydi", "O'chirish Ctrl+Z bilan qaytariladi",
               "Fayllar tuzilishi bo'yicha hech qachon haqiqatan o'chmaydi"],
              ["Удаление лишь отвязывает запись; данные остаются, пока не перезаписаны",
               "ОС хранит скрытую копию каждого файла", "Удаление обратимо через Ctrl+Z",
               "Файлы по замыслу никогда не удаляются полностью"], 0),
            q("Which timestamp reflects when a file's contents were last changed?",
              "Qaysi vaqt tamg'asi fayl mazmuni oxirgi marta o'zgargan vaqtni aks ettiradi?",
              "Какая метка отражает последнее изменение содержимого файла?",
              ["mtime", "atime", "ctime", "birth time"],
              ["mtime", "atime", "ctime", "tug'ilish vaqti"],
              ["mtime", "atime", "ctime", "время рождения"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "forensics", "points": 70,
        "title": "File carving and metadata artifacts",
        "titleUz": "Fayl kesish va metama'lumot artefaktlari",
        "titleRu": "Вырезание файлов и артефакты метаданных",
        "content": r"""Sometimes there is no filesystem entry at all — a file was deleted and its metadata gone, or you are handed a raw blob. **Carving** recovers files from raw bytes by recognising their signatures, and **metadata** hidden inside files often answers questions the file's contents do not.

## File signatures: the magic bytes

Most file formats begin with a fixed byte sequence — a **magic number** — that identifies the type regardless of extension:

```
JPEG   FF D8 FF        ... ends FF D9
PNG    89 50 4E 47     (‰PNG)
PDF    25 50 44 46     (%PDF)
ZIP    50 4B 03 04     (PK..)
GZIP   1F 8B 08
ELF    7F 45 4C 46     (.ELF)
```

`file` reads these to name a type; `xxd` shows them raw:

```
$ xxd photo.jpg | head -1
00000000: ffd8 ffe0 0010 4a46 4946 0001 0100 0001  ......JFIF......
```

`ff d8 ff` — a JPEG, whatever the name claims. Recognising signatures is how you see through a file that lies about what it is.

## Carving: recover files with no filesystem

`foremost` and `scalpel` scan raw data for these signatures and extract each file they find — no filesystem needed. Point `foremost` at a disk image or unallocated space:

```
$ foremost -i evidence.dd -o carved/
Processing: evidence.dd
$ ls carved/
audit.txt  jpg/  pdf/  zip/
```

It carves everything with a recognisable header into type folders. This recovers files whose directory entry is long gone — deleted images, documents from unallocated space, fragments in slack. It is the recovery of last resort, and it works because a file's bytes outlive its name.

`binwalk` does the same for *embedded* files — one file hidden inside another:

```
$ binwalk multi.bin
DECIMAL       HEXADECIMAL     DESCRIPTION
10            0xA             gzip compressed data
```

`binwalk` found a gzip stream buried inside the file. Firmware images, "innocent" pictures, and CTF challenges routinely hide a whole archive inside another file — `binwalk -e` extracts it.

## Metadata: what a file says about itself

Files carry metadata the content does not show. `exiftool` reads it from almost any format:

```
$ exiftool photo.jpg
File Name                       : photo.jpg
File Size                       : 176 kB
Camera Model Name               : iPhone 13
Create Date                     : 2024:03:04 14:22:08
GPS Latitude                    : 41 deg 18' 40.9" N
GPS Longitude                   : 69 deg 16' 47.1" E
```

That photo carries the exact time it was taken and the **GPS coordinates** of where. Metadata routinely holds the smoking gun: a document's author and edit history, a photo's location, the software that produced a file, a timestamp that contradicts a suspect's story. Always run `exiftool` on evidence files — the answer is often in data no one thought to remove.

## Steganography: data hidden in plain sight

Data can be hidden *inside* a normal-looking file — a message in the low bits of an image, a payload appended after a JPEG's `FF D9` end marker. The tells:

- `file` says one thing, `binwalk` finds another format inside it.
- A "photo" far larger than its dimensions justify.
- `strings` on an image reveals readable text that should not be there.

```
$ strings photo.jpg | grep -i "flag\|password\|secret"
$ steghide extract -sf photo.jpg          # if steghide was used, with a passphrase
```

In forensics and CTFs alike, an image that is not just an image is a common hiding place. The first checks are always `file`, `binwalk`, `exiftool`, `strings`.

## The recovery workflow

Given an unknown or recovered blob:

```
1. file blob            — what does it claim to be?
2. xxd blob | head      — what do the magic bytes actually say?
3. exiftool blob        — what metadata (times, GPS, author) is inside?
4. binwalk blob         — is another file embedded?
5. strings blob | less  — any readable text, keys, paths?
6. foremost -i blob     — carve out any files it contains
```

Six commands turn an opaque blob into everything it was hiding. This sequence is a reflex in both defensive forensics and offensive CTF play.

## Try it (on files you own)

1. `xxd` a JPEG and a PDF; find their magic bytes. Rename a JPEG to `.txt` — does `file` still identify it?
2. `exiftool` a photo from your phone. Does it carry GPS or a timestamp?
3. `binwalk` a firmware image or a file you suspect has something embedded. Anything inside?""",
        "contentUz": r"""Ba'zan fayl tizimi yozuvi umuman yo'q — fayl o'chirilgan va metama'lumoti ketgan, yoki sizga xom blob berilgan. **Kesish (carving)** fayllarni imzolarini tanib xom baytlardan tiklaydi, va fayllar ichidagi yashirin **metama'lumot** ko'pincha fayl mazmuni bermaydigan savollarga javob beradi.

## Fayl imzolari: sehrli baytlar

Aksar fayl formatlari belgilangan bayt ketma-ketligi — **sehrli raqam** — bilan boshlanadi, u turini kengaytmadan qat'i nazar aniqlaydi:

```
JPEG   FF D8 FF        ... FF D9 bilan tugaydi
PNG    89 50 4E 47     (‰PNG)
PDF    25 50 44 46     (%PDF)
ZIP    50 4B 03 04     (PK..)
GZIP   1F 8B 08
ELF    7F 45 4C 46     (.ELF)
```

`file` turini nomlash uchun bularni o'qiydi; `xxd` ularni xom ko'rsatadi:

```
$ xxd photo.jpg | head -1
00000000: ffd8 ffe0 0010 4a46 4946 0001 0100 0001  ......JFIF......
```

`ff d8 ff` — JPEG, nomi nima da'vo qilса ham. Imzolarni tanish — nima ekani haqida yolg'on gapiradigan faylni ko'rib olish yo'li.

## Kesish: fayl tizimisiz fayllarni tiklash

`foremost` va `scalpel` xom ma'lumotni bu imzolar uchun skanerlaydi va topgan har bir faylni ajratib oladi — fayl tizimi kerak emas. `foremost`ni disk tasviri yoki ajratilmagan joyga yo'naltiring:

```
$ foremost -i evidence.dd -o carved/
Processing: evidence.dd
$ ls carved/
audit.txt  jpg/  pdf/  zip/
```

U taniladigan sarlavhali hamma narsani tur papkalariga kesadi. Bu katalog yozuvi allaqachon ketgan fayllarni tiklaydi — o'chirilgan rasmlar, ajratilmagan joydan hujjatlar, slack'dagi parchalar. Bu — oxirgi chora tiklash, va u ishlaydi, chunki fayl baytlari uning nomidan uzoq yashaydi.

`binwalk` xuddi shuni *ichki* fayllar uchun qiladi — bir fayl ichida yashiringan boshqasi:

```
$ binwalk multi.bin
DECIMAL       HEXADECIMAL     DESCRIPTION
10            0xA             gzip compressed data
```

`binwalk` fayl ichiga ko'milgan gzip oqimini topdi. Proshivka tasvirlari, "begunoh" rasmlar va CTF challenge'lari muntazam butun arxivni boshqa fayl ichida yashiradi — `binwalk -e` uni ajratadi.

## Metama'lumot: fayl o'zi haqida nima aytadi

Fayllar mazmun ko'rsatmaydigan metama'lumotni olib yuradi. `exiftool` uni deyarli har formatdan o'qiydi:

```
$ exiftool photo.jpg
File Name                       : photo.jpg
File Size                       : 176 kB
Camera Model Name               : iPhone 13
Create Date                     : 2024:03:04 14:22:08
GPS Latitude                    : 41 deg 18' 40.9" N
GPS Longitude                   : 69 deg 16' 47.1" E
```

O'sha rasm olingan aniq vaqtni va qayerning **GPS koordinatalarini** olib yuradi. Metama'lumot muntazam hal qiluvchi dalilni saqlaydi: hujjat muallifi va tahrir tarixi, rasm joyi, faylni ishlab chiqargan dastur, shubhalining hikoyasiga zid vaqt tamg'asi. Dalil fayllarida doim `exiftool` yuriting — javob ko'pincha hech kim olib tashlashni o'ylamagan ma'lumotda.

## Steganografiya: ko'z oldida yashiringan ma'lumot

Ma'lumot oddiy ko'rinadigan fayl *ichida* yashirinishi mumkin — rasmning past bitlaridagi xabar, JPEG'ning `FF D9` oxir belgisidan keyin qo'shilgan foydali yuk. Belgilari:

- `file` bir narsa deydi, `binwalk` uning ichida boshqa format topadi.
- O'lchamlari oqlaydigandan ancha katta "rasm".
- Rasmda `strings` bo'lmasligi kerak bo'lgan o'qiladigan matnni ochadi.

```
$ strings photo.jpg | grep -i "flag\|password\|secret"
$ steghide extract -sf photo.jpg          # steghide ishlatilgan bo'lsa, parol bilan
```

Forenzikada ham, CTF'da ham shunchaki rasm bo'lmagan rasm — keng tarqalgan yashirinish joyi. Birinchi tekshiruvlar doim `file`, `binwalk`, `exiftool`, `strings`.

## Tiklash ish tartibi

Noma'lum yoki tiklangan blob berilganda:

```
1. file blob            — u nima deb da'vo qiladi?
2. xxd blob | head      — sehrli baytlar aslida nima deydi?
3. exiftool blob        — ichida qanday metama'lumot (vaqtlar, GPS, muallif)?
4. binwalk blob         — boshqa fayl ko'milganmi?
5. strings blob | less  — o'qiladigan matn, kalitlar, yo'llar bormi?
6. foremost -i blob     — ichidagi fayllarni kesib oling
```

Olti buyruq noaniq blobni u yashirgan hamma narsaga aylantiradi. Bu ketma-ketlik himoyaviy forenzikada ham, hujumkor CTF o'yinida ham refleks.

## Sinab ko'ring (o'z fayllaringizda)

1. JPEG va PDF ni `xxd` qiling; sehrli baytlarini toping. JPEG ni `.txt` ga qayta nomlang — `file` uni hali aniqlaydimi?
2. Telefoningizdan rasmni `exiftool` qiling. U GPS yoki vaqt tamg'asini olib yuradimi?
3. Proshivka tasviri yoki ichida biror narsa bor deb gumon qilgan faylni `binwalk` qiling. Ichida biror narsa bormi?""",
        "contentRu": r"""Иногда записи в файловой системе нет вовсе — файл удалён, а метаданные исчезли, или вам дали сырой блоб. **Вырезание (carving)** восстанавливает файлы из сырых байтов, распознавая их сигнатуры, а скрытые внутри файлов **метаданные** часто отвечают на вопросы, которых не даёт содержимое.

## Сигнатуры файлов: магические байты

Большинство форматов начинается с фиксированной последовательности байтов — **магического числа** — определяющей тип независимо от расширения:

```
JPEG   FF D8 FF        ... кончается FF D9
PNG    89 50 4E 47     (‰PNG)
PDF    25 50 44 46     (%PDF)
ZIP    50 4B 03 04     (PK..)
GZIP   1F 8B 08
ELF    7F 45 4C 46     (.ELF)
```

`file` читает их, чтобы назвать тип; `xxd` показывает их сырыми:

```
$ xxd photo.jpg | head -1
00000000: ffd8 ffe0 0010 4a46 4946 0001 0100 0001  ......JFIF......
```

`ff d8 ff` — JPEG, что бы ни утверждало имя. Распознавание сигнатур — способ видеть сквозь файл, который лжёт о своём типе.

## Вырезание: восстановить файлы без файловой системы

`foremost` и `scalpel` сканируют сырые данные на эти сигнатуры и извлекают каждый найденный файл — файловая система не нужна. Наведите `foremost` на образ диска или нераспределённое место:

```
$ foremost -i evidence.dd -o carved/
Processing: evidence.dd
$ ls carved/
audit.txt  jpg/  pdf/  zip/
```

Он вырезает всё с распознаваемым заголовком в папки по типам. Это восстанавливает файлы, чья запись каталога давно исчезла — удалённые картинки, документы из нераспределённого места, фрагменты в слэке. Это восстановление последней надежды, и оно работает, потому что байты файла переживают его имя.

`binwalk` делает то же для *встроенных* файлов — одного, спрятанного внутри другого:

```
$ binwalk multi.bin
DECIMAL       HEXADECIMAL     DESCRIPTION
10            0xA             gzip compressed data
```

`binwalk` нашёл gzip-поток, зарытый внутри файла. Образы прошивок, «невинные» картинки и CTF-задания регулярно прячут целый архив внутри другого файла — `binwalk -e` его извлекает.

## Метаданные: что файл говорит о себе

Файлы несут метаданные, которых не показывает содержимое. `exiftool` читает их почти из любого формата:

```
$ exiftool photo.jpg
File Name                       : photo.jpg
File Size                       : 176 kB
Camera Model Name               : iPhone 13
Create Date                     : 2024:03:04 14:22:08
GPS Latitude                    : 41 deg 18' 40.9" N
GPS Longitude                   : 69 deg 16' 47.1" E
```

Это фото несёт точное время съёмки и **GPS-координаты** места. Метаданные регулярно хранят решающую улику: автора и историю правок документа, место фото, ПО, создавшее файл, метку времени, противоречащую версии подозреваемого. Всегда запускайте `exiftool` на уликах — ответ часто в данных, которые никто не подумал удалить.

## Стеганография: данные, спрятанные на виду

Данные могут прятаться *внутри* нормально выглядящего файла — сообщение в младших битах изображения, полезная нагрузка после маркера конца JPEG `FF D9`. Признаки:

- `file` говорит одно, `binwalk` находит внутри другой формат.
- «Фото» гораздо больше, чем оправдывают его размеры.
- `strings` на изображении показывает читаемый текст, которого там быть не должно.

```
$ strings photo.jpg | grep -i "flag\|password\|secret"
$ steghide extract -sf photo.jpg          # если использован steghide, с паролем
```

И в форензике, и в CTF изображение, которое не просто изображение, — частое место укрытия. Первые проверки всегда `file`, `binwalk`, `exiftool`, `strings`.

## Рабочий процесс восстановления

Дан неизвестный или восстановленный блоб:

```
1. file blob            — чем он себя объявляет?
2. xxd blob | head      — что на деле говорят магические байты?
3. exiftool blob        — какие метаданные (время, GPS, автор) внутри?
4. binwalk blob         — встроен ли другой файл?
5. strings blob | less  — есть ли читаемый текст, ключи, пути?
6. foremost -i blob     — вырезать содержащиеся файлы
```

Шесть команд превращают непрозрачный блоб во всё, что он прятал. Эта последовательность — рефлекс и в защитной форензике, и в наступательной игре CTF.

## Попробуйте (на своих файлах)

1. `xxd` JPEG и PDF; найдите магические байты. Переименуйте JPEG в `.txt` — `file` его всё ещё опознаёт?
2. `exiftool` фото с телефона. Несёт ли оно GPS или метку времени?
3. `binwalk` образ прошивки или файл, в котором подозреваете встроенное. Есть ли что-то внутри?""",
        "questions": [
            q("What does file carving (e.g. foremost) do?",
              "Fayl kesish (masalan foremost) nima qiladi?",
              "Что делает вырезание файлов (напр. foremost)?",
              ["Recovers files from raw bytes by their signatures, with no filesystem needed",
               "Encrypts files by type", "Deletes files securely",
               "Renames files to their correct extension"],
              ["Fayllarni imzolari bo'yicha xom baytlardan tiklaydi, fayl tizimisiz",
               "Fayllarni tur bo'yicha shifrlaydi", "Fayllarni xavfsiz o'chiradi",
               "Fayllarni to'g'ri kengaytmaga qayta nomlaydi"],
              ["Восстанавливает файлы из сырых байтов по сигнатурам, без файловой системы",
               "Шифрует файлы по типу", "Безопасно удаляет файлы",
               "Переименовывает файлы в правильное расширение"], 0),
            q("A photo's exiftool output includes GPS coordinates. Why does this matter forensically?",
              "Rasmning exiftool chiqishida GPS koordinatalari bor. Nega bu forenzik jihatdan muhim?",
              "Вывод exiftool фото содержит GPS-координаты. Почему это важно для форензики?",
              ["It reveals exactly where the photo was taken — evidence the content does not show",
               "It makes the photo load faster", "It encrypts the image",
               "It is never reliable"],
              ["U rasm aynan qayerda olinganini oshkor qiladi — mazmun ko'rsatmaydigan dalil",
               "U rasmni tezroq yuklaydi", "U rasmni shifrlaydi",
               "U hech qachon ishonchli emas"],
              ["Показывает, где именно снято фото — улику, которой нет в содержимом",
               "Ускоряет загрузку фото", "Шифрует изображение",
               "Никогда не надёжно"], 0),
            q("`file` says 'JPEG' but `binwalk` finds a ZIP archive inside. This suggests:",
              "`file` 'JPEG' deydi, lekin `binwalk` ichida ZIP arxiv topadi. Bu nimani taxmin qiladi:",
              "`file` говорит 'JPEG', но `binwalk` находит внутри ZIP. Это предполагает:",
              ["Something is hidden inside the image (embedded data / steganography)",
               "The image is corrupted", "JPEGs always contain ZIPs",
               "binwalk is wrong"],
              ["Rasm ichida biror narsa yashiringan (ko'milgan ma'lumot / steganografiya)",
               "Rasm buzilgan", "JPEG'lar doim ZIP saqlaydi",
               "binwalk noto'g'ri"],
              ["Что-то спрятано внутри изображения (встроенные данные / стеганография)",
               "Изображение повреждено", "JPEG всегда содержат ZIP",
               "binwalk ошибается"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "forensics", "points": 80,
        "title": "Memory forensics with Volatility",
        "titleUz": "Volatility bilan xotira forenzikasi",
        "titleRu": "Форензика памяти с Volatility",
        "content": r"""The first-response lesson said to capture RAM before anything else. This lesson is why: a memory image holds what the disk never does — running processes, network connections, injected code, and decryption keys. Malware that leaves nothing on disk is fully visible in memory.

## Why memory is the richest evidence

A great deal exists *only* in RAM while a machine runs:

- **Running processes**, including ones with no file on disk (fileless malware).
- **Network connections** — every open socket and who it talks to.
- **Injected code** hiding inside legitimate processes.
- **Decryption keys and passwords** in cleartext, held by running programs.
- **Command history and clipboard**, unsaved documents.

Power off and all of it is gone. This is why the defender captures memory first, and why an attacker's carefully disk-less malware is undone by a memory image.

## Capturing memory

On a live Linux host, tools like **AVML** or **LiME** dump RAM to a file:

```
$ sudo avml memory.raw
```

On Windows, WinPMEM or a commercial tool. The result is a raw memory image — often several gigabytes — that you then analyse offline, on your own machine, never on the suspect host.

## Volatility: the memory analysis framework

**Volatility 3** is the standard tool. You point it at the image and run plugins, each answering one question. The shape is always `vol -f <image> <os>.<plugin>`:

```
$ vol -f memory.raw windows.info            # identify the OS and build
$ vol -f memory.raw windows.pslist          # running processes
$ vol -f memory.raw windows.netscan         # network connections
$ vol -f memory.raw windows.pstree          # process parent/child tree
```

Linux images use `linux.*` plugins (`linux.pslist`, `linux.bash` for shell history, and so on). The workflow is: identify the image, list processes, find the anomaly, then dig into it.

## Finding the intruder in the process list

`pslist` shows what was running:

```
$ vol -f memory.raw windows.pslist
PID    PPID   ImageFileName    CreateTime
4      0      System           2024-03-04 08:00:01
712    652    svchost.exe      2024-03-04 08:00:14
1840   712    powershell.exe   2024-03-04 03:02:44   ← 03:02, odd parent
```

A `powershell.exe` spawned at 03:02 by an unusual parent is exactly the anomaly a timeline pointed at. `pstree` shows the lineage — legitimate processes have expected parents; a shell whose parent is a web server or a document reader is an intrusion.

## Detecting injected and hidden code

The plugin that catches stealthy malware is **malfind** — it looks for memory regions that are executable but not backed by a file on disk, the signature of injected code:

```
$ vol -f memory.raw windows.malfind
Process: svchost.exe  PID: 712
  Protection: PAGE_EXECUTE_READWRITE
  MZ header found in injected region  ← a whole executable injected into svchost
```

An executable living inside `svchost.exe`'s memory, with no file behind it, is code injection — malware hiding inside a trusted process. This is invisible on disk and obvious in memory.

## Pulling artifacts out of the image

Volatility can extract what it finds for deeper analysis:

```
$ vol -f memory.raw windows.dumpfiles --pid 1840     # files a process had open
$ vol -f memory.raw windows.cmdline                  # the exact command lines
$ vol -f memory.raw linux.bash                       # recovered shell history
```

`cmdline` recovers the full command each process was started with — often the whole attack, spelled out. `linux.bash` reconstructs what the attacker typed. Memory does not just show that malware ran; it shows *how it was invoked*.

## Why the order-of-volatility rule paid off

Everything in this lesson — the injected code, the live connections, the recovered commands — is gone the instant the machine powers off. The first-response discipline of capturing RAM before touching anything is what makes this analysis possible. A defender who rebooted the host to "be safe" would have nothing here to find.

## Try it (on a sample image — many public ones exist for practice)

1. Install Volatility 3 and run `windows.info` on a sample memory image to identify it.
2. Run `pslist` and `pstree`; find a process with an unexpected parent.
3. Run `malfind`; does any process hold an injected, file-less executable region?""",
        "contentUz": r"""Birinchi javob darsi hamma narsadan oldin RAM olishni aytdi. Bu dars — nega: xotira tasviri disk hech qachon saqlamaydigan narsani saqlaydi — ishlayotgan jarayonlar, tarmoq ulanishlari, kiritilgan kod va shifr kalitlari. Diskda hech narsa qoldirmaydigan zararli dastur xotirada to'liq ko'rinadi.

## Nega xotira eng boy dalil

Mashina ishlaganda ko'p narsa *faqat* RAM'da bo'ladi:

- **Ishlayotgan jarayonlar**, jumladan diskda fayli yo'qlari (faylsiz zararli dastur).
- **Tarmoq ulanishlari** — har bir ochiq soket va u kim bilan gaplashishi.
- Qonuniy jarayonlar ichida yashiringan **kiritilgan kod**.
- Ishlayotgan dasturlar saqlaydigan ochiq matndagi **shifr kalitlari va parollar**.
- **Buyruqlar tarixi va bufer**, saqlanmagan hujjatlar.

O'chiring va hammasi ketadi. Aynan shuning uchun himoyachi avval xotirani oladi, va hujumchining ehtiyotkorlik bilan disksiz zararli dasturi xotira tasviri bilan buziladi.

## Xotirani olish

Jonli Linux xostда **AVML** yoki **LiME** kabi vositalar RAM'ni faylga dump qiladi:

```
$ sudo avml memory.raw
```

Windows'da WinPMEM yoki tijorat vositasi. Natija — xom xotira tasviri — ko'pincha bir necha gigabayt — keyin uni oflaynда, o'z mashinangizда, hech qachon shubhali xostда tahlil qilasiz.

## Volatility: xotira tahlil freymvorki

**Volatility 3** — standart vosita. Uni tasvirga yo'naltirasiz va plaginlar yuritasiz, har biri bitta savolga javob beradi. Shakli doim `vol -f <tasvir> <os>.<plagin>`:

```
$ vol -f memory.raw windows.info            # OS va qurilishni aniqlash
$ vol -f memory.raw windows.pslist          # ishlayotgan jarayonlar
$ vol -f memory.raw windows.netscan         # tarmoq ulanishlari
$ vol -f memory.raw windows.pstree          # jarayon ota/bola daraxti
```

Linux tasvirlari `linux.*` plaginlarини ishlatadi (`linux.pslist`, shell tarixi uchun `linux.bash` va h.k.). Ish tartibi: tasvirni aniqlash, jarayonlarni sanash, anomaliyani topish, keyin unga chuqurlashish.

## Jarayon ro'yxatidan bosqinchini topish

`pslist` nima ishlayotganini ko'rsatadi:

```
$ vol -f memory.raw windows.pslist
PID    PPID   ImageFileName    CreateTime
4      0      System           2024-03-04 08:00:01
712    652    svchost.exe      2024-03-04 08:00:14
1840   712    powershell.exe   2024-03-04 03:02:44   ← 03:02, g'alati ota
```

03:02 da g'ayrioddiy ota tomonidan yaratilgan `powershell.exe` — aynan vaqt chizig'i ishora qilgan anomaliya. `pstree` nasabni ko'rsatadi — qonuniy jarayonlarning kutilgan otalari bor; otasi veb-server yoki hujjat o'quvchisi bo'lgan shell — bosqinchilik.

## Kiritilgan va yashirin kodni aniqlash

Yashirin zararli dasturni ushlaydigan plagin — **malfind** — u bajariladigan, lekin diskда fayl bilan qo'llab-quvvatlanmagan xotira hududlarini qidiradi, kiritilgan kod imzosi:

```
$ vol -f memory.raw windows.malfind
Process: svchost.exe  PID: 712
  Protection: PAGE_EXECUTE_READWRITE
  MZ header found in injected region  ← svchost ichiga butun bajariluvchi kiritilgan
```

`svchost.exe` xotirasi ichida yashaydigan, ortida fayli yo'q bajariluvchi — kod kiritish — ishonchli jarayon ichida yashiringan zararli dastur. Bu diskда ko'rinmas va xotirada aniq.

## Tasvirdan artefaktlarni tortib olish

Volatility topganini chuqurroq tahlil uchun ajratib oladi:

```
$ vol -f memory.raw windows.dumpfiles --pid 1840     # jarayon ochgan fayllar
$ vol -f memory.raw windows.cmdline                  # aniq buyruq satrlari
$ vol -f memory.raw linux.bash                       # tiklangan shell tarixi
```

`cmdline` har jarayon ishga tushirilgan to'liq buyruqni tiklaydi — ko'pincha butun hujum, yozib berilgan. `linux.bash` hujumchi yozganini qayta tiklaydi. Xotira zararli dastur ishlaganini emas, *u qanday chaqirilganini* ko'rsatadi.

## Nega o'zgaruvchanlik tartibi qoidasi samara berdi

Bu darsdagi hamma narsa — kiritilgan kod, jonli ulanishlar, tiklangan buyruqlar — mashina o'chgan onда ketadi. Biror narsaga tegishdan oldin RAM olish birinchi javob intizomi bu tahlilni mumkin qiladi. "Ehtiyot bo'lish uchun" xostni qayta yuklagan himoyachida bu yerда topadigan hech narsa bo'lmasди.

## Sinab ko'ring (namuna tasvirда — mashq uchun ko'p ommaviysi bor)

1. Volatility 3 o'rnating va namuna xotira tasvirида `windows.info` yuriting.
2. `pslist` va `pstree` yuriting; kutilmagan otali jarayonni toping.
3. `malfind` yuriting; biror jarayon kiritilgan, faylsiz bajariluvchi hududini saqlaydimi?""",
        "contentRu": r"""Урок первого реагирования сказал снимать RAM раньше всего. Этот урок — почему: образ памяти хранит то, чего никогда нет на диске — запущенные процессы, сетевые соединения, внедрённый код и ключи расшифровки. Вредонос, ничего не оставляющий на диске, полностью виден в памяти.

## Почему память — богатейшая улика

Многое существует *только* в RAM, пока машина работает:

- **Запущенные процессы**, включая те, у кого нет файла на диске (бесфайловый вредонос).
- **Сетевые соединения** — каждый открытый сокет и с кем он говорит.
- **Внедрённый код**, спрятанный внутри легитимных процессов.
- **Ключи расшифровки и пароли** открытым текстом, хранимые работающими программами.
- **История команд и буфер обмена**, несохранённые документы.

Выключите — и всё исчезнет. Поэтому защитник снимает память первой, и поэтому тщательно бездисковый вредонос атакующего разоблачается образом памяти.

## Снятие памяти

На живом хосте Linux инструменты вроде **AVML** или **LiME** дампят RAM в файл:

```
$ sudo avml memory.raw
```

На Windows — WinPMEM или коммерческий инструмент. Результат — сырой образ памяти, часто несколько гигабайт — который вы затем анализируете офлайн, на своей машине, никогда на подозреваемом хосте.

## Volatility: фреймворк анализа памяти

**Volatility 3** — стандартный инструмент. Вы наводите его на образ и запускаете плагины, каждый отвечает на один вопрос. Форма всегда `vol -f <образ> <os>.<плагин>`:

```
$ vol -f memory.raw windows.info            # определить ОС и сборку
$ vol -f memory.raw windows.pslist          # запущенные процессы
$ vol -f memory.raw windows.netscan         # сетевые соединения
$ vol -f memory.raw windows.pstree          # дерево процессов родитель/потомок
```

Образы Linux используют плагины `linux.*` (`linux.pslist`, `linux.bash` для истории оболочки и т.д.). Рабочий процесс: определить образ, перечислить процессы, найти аномалию, затем копать в неё.

## Найти вторженца в списке процессов

`pslist` показывает, что работало:

```
$ vol -f memory.raw windows.pslist
PID    PPID   ImageFileName    CreateTime
4      0      System           2024-03-04 08:00:01
712    652    svchost.exe      2024-03-04 08:00:14
1840   712    powershell.exe   2024-03-04 03:02:44   ← 03:02, странный родитель
```

`powershell.exe`, порождённый в 03:02 необычным родителем, — ровно та аномалия, на которую указала хронология. `pstree` показывает родословную — у легитимных процессов ожидаемые родители; оболочка, чей родитель — веб-сервер или просмотрщик документов, — это вторжение.

## Обнаружение внедрённого и скрытого кода

Плагин, ловящий скрытный вредонос, — **malfind** — он ищет области памяти, исполняемые, но не подкреплённые файлом на диске, сигнатуру внедрённого кода:

```
$ vol -f memory.raw windows.malfind
Process: svchost.exe  PID: 712
  Protection: PAGE_EXECUTE_READWRITE
  MZ header found in injected region  ← целый исполняемый внедрён в svchost
```

Исполняемый, живущий в памяти `svchost.exe` без файла за ним, — внедрение кода: вредонос, спрятанный внутри доверенного процесса. Это невидимо на диске и очевидно в памяти.

## Извлечение артефактов из образа

Volatility извлекает найденное для более глубокого анализа:

```
$ vol -f memory.raw windows.dumpfiles --pid 1840     # файлы, открытые процессом
$ vol -f memory.raw windows.cmdline                  # точные командные строки
$ vol -f memory.raw linux.bash                       # восстановленная история оболочки
```

`cmdline` восстанавливает полную команду запуска каждого процесса — часто всю атаку, прописанную. `linux.bash` реконструирует набранное атакующим. Память показывает не просто что вредонос работал, а *как он был вызван*.

## Почему правило порядка волатильности окупилось

Всё в этом уроке — внедрённый код, живые соединения, восстановленные команды — исчезает в момент выключения. Дисциплина первого реагирования снимать RAM до касания чего-либо делает этот анализ возможным. У защитника, перезагрузившего хост «на всякий случай», здесь нечего было бы найти.

## Попробуйте (на образце — много публичных для практики)

1. Установите Volatility 3 и запустите `windows.info` на образце памяти, чтобы определить его.
2. Запустите `pslist` и `pstree`; найдите процесс с неожиданным родителем.
3. Запустите `malfind`; держит ли какой-то процесс внедрённую бесфайловую исполняемую область?""",
        "questions": [
            q("Why is a memory image often richer evidence than a disk image?",
              "Nega xotira tasviri ko'pincha disk tasviridan boyroq dalil?",
              "Почему образ памяти часто более богатая улика, чем образ диска?",
              ["It holds running processes, live connections, injected code and keys the disk never has",
               "It is larger", "It is easier to hash",
               "The disk cannot be imaged"],
              ["U disk hech qachon saqlamaydigan ishlayotgan jarayonlar, jonli ulanishlar, kiritilgan kod va kalitlarni saqlaydi",
               "U kattaroq", "Uni xeshlash osonroq",
               "Diskни tasvirlab bo'lmaydi"],
              ["Он хранит процессы, живые соединения, внедрённый код и ключи, которых нет на диске",
               "Он больше", "Его легче хешировать",
               "Диск нельзя снять образом"], 0),
            q("What does Volatility's malfind plugin detect?",
              "Volatility'ning malfind plagini nimani aniqlaydi?",
              "Что обнаруживает плагин malfind в Volatility?",
              ["Executable memory regions not backed by a file — the sign of code injection",
               "Encrypted files on disk", "Weak passwords",
               "Open network ports"],
              ["Fayl bilan qo'llab-quvvatlanmagan bajariladigan xotira hududlari — kod kiritish belgisi",
               "Diskдаgi shifrlangan fayllar", "Zaif parollar",
               "Ochiq tarmoq portlari"],
              ["Исполняемые области памяти без файла за ними — признак внедрения кода",
               "Зашифрованные файлы на диске", "Слабые пароли",
               "Открытые сетевые порты"], 0),
            q("A powershell.exe with parent process a document reader, started at 03:00, suggests:",
              "Otasi hujjat o'quvchisi bo'lgan, 03:00 da boshlangan powershell.exe nimani taxmin qiladi:",
              "powershell.exe с родителем-просмотрщиком документов, запущенный в 03:00, предполагает:",
              ["An intrusion — a shell spawned from an unexpected parent",
               "A routine scheduled task", "A Windows update",
               "Nothing unusual"],
              ["Bosqinchilik — kutilmagan otadan yaratilgan shell",
               "Odatiy rejalashtirilgan vazifa", "Windows yangilanishi",
               "G'ayrioddiy hech narsa yo'q"],
              ["Вторжение — оболочка, порождённая неожиданным родителем",
               "Рутинную запланированную задачу", "Обновление Windows",
               "Ничего необычного"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "forensics", "points": 70,
        "title": "Log and event analysis: building the timeline",
        "titleUz": "Log va voqea tahlili: vaqt chizig'ini qurish",
        "titleRu": "Анализ логов и событий: построение хронологии",
        "content": r"""Logs are the diary of a system — who logged in, what ran, what failed. In an investigation they turn scattered clues into an ordered account of the attack. The skill is knowing which logs answer which question, and stitching them into one timeline.

## The Linux logs that matter

```
/var/log/auth.log      logins, sudo, ssh — the account trail
/var/log/syslog        general system messages
/var/log/kern.log      kernel — hardware, drivers, some attacks
/var/log/apache2/      web server access and errors
~/.bash_history        commands a user typed
/var/log/wtmp          login records (read with `last`)
/var/log/btmp          failed logins (read with `lastb`)
```

The account trail is usually first. Who logged in, and from where?

```
$ last -f /var/log/wtmp | head
user     pts/0    203.0.113.45     Mon Mar  4 03:00   still logged in
root     pts/0    203.0.113.45     Mon Mar  4 03:05 - 03:20  (00:15)
```

A login from an external IP at 03:00, then a jump to root five minutes later — the shape of a breach, read straight from the logs.

Failed logins expose brute force:

```
$ grep "Failed password" /var/log/auth.log | tail -3
Mar  4 02:58 sshd: Failed password for admin from 203.0.113.45
$ grep "Failed password" /var/log/auth.log | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | sort | uniq -c | sort -rn | head
    412 203.0.113.45
```

412 failures from one IP, ending just before a successful login, is a brute force that worked — the same pipeline you learned to build in the Linux module, now used to reconstruct an attack.

## journald: the systemd log

Modern systems log to journald, queried with `journalctl`:

```
$ journalctl -u ssh --since "2024-03-04 02:00" --until "03:30"
$ journalctl _UID=1000 -o short-iso           # everything a user did
$ journalctl -k -p err                        # kernel errors only
```

`--since`/`--until` narrow to the incident window; `-u` filters to one service. journald keeps structured fields, so you can filter by user, service, priority and time precisely.

## Windows event logs

Windows records to the Event Log, read with the Event Viewer or `wevtutil`. The IDs to know:

- **4624** — successful logon; **4625** — failed logon (brute force shows as many 4625s).
- **4634** — logoff. **4672** — special privileges assigned (admin logon).
- **4688** — a process was created. **7045** — a new service installed (a common persistence trick).
- **1102** — the audit log was cleared — itself a strong sign of an attacker covering tracks.

A burst of 4625s followed by a 4624 from the same source is a brute force that succeeded — the Windows mirror of the auth.log pattern above.

## Building the master timeline

The core of an investigation is merging every source into one chronological account: filesystem MAC times (from the disk lesson), auth logs, web logs, journald, memory artifacts. Line them up by timestamp and the attack reads as a story:

```
02:58  auth.log   412th failed ssh login from 203.0.113.45
03:00  wtmp       successful login: user from 203.0.113.45
03:01  filesystem /tmp/.x/backdoor created
03:02  memory     powershell.exe spawned, injected code
03:05  auth.log   sudo to root
03:10  apache     GET /download?file=../../etc/shadow
03:20  wtmp       logout
```

Seven lines from five sources, and the whole intrusion is laid out: brute force in, foothold, persistence, privilege escalation, data access, exit. **This merged timeline is the deliverable of an investigation** — it is what the report is built from.

## Watch for anti-forensics

Attackers try to break the timeline. Signs: a cleared log (Windows 1102, or an auth.log that suddenly starts mid-day), timestamps that do not fit (a file with an mtime *before* its filesystem was created — timestomping), gaps where logging stopped. A missing or tampered log is itself evidence — the absence is the finding.

## Try it (on your own logs or a lab)

1. `last` and `grep "Failed password" /var/log/auth.log` on your machine — any logins or failures you cannot explain?
2. `journalctl -u ssh --since today` — what does it show about SSH activity?
3. Merge three events from different logs into one timeline, sorted by time.""",
        "contentUz": r"""Loglar — tizimning kundaligi: kim kirdi, nima ishladi, nima muvaffaqiyatsiz bo'ldi. Tekshiruvda ular tarqoq izlarni hujumning tartiblangan bayoniga aylantiradi. Ko'nikma — qaysi log qaysi savolga javob berishini bilish va ularni bitta vaqt chizig'iga tikish.

## Muhim Linux loglari

```
/var/log/auth.log      kirishlar, sudo, ssh — hisob izi
/var/log/syslog        umumiy tizim xabarlari
/var/log/kern.log      yadro — apparat, drayverlar, ba'zi hujumlar
/var/log/apache2/      veb-server kirish va xatolari
~/.bash_history        foydalanuvchi yozgan buyruqlar
/var/log/wtmp          kirish yozuvlari (`last` bilan o'qing)
/var/log/btmp          muvaffaqiyatsiz kirishlar (`lastb` bilan o'qing)
```

Hisob izi odatda birinchi. Kim kirdi va qayerdan?

```
$ last -f /var/log/wtmp | head
user     pts/0    203.0.113.45     Mon Mar  4 03:00   still logged in
root     pts/0    203.0.113.45     Mon Mar  4 03:05 - 03:20  (00:15)
```

03:00 da tashqi IP'dan kirish, keyin besh daqiqadan keyin root'ga sakrash — buzilish shakli, to'g'ridan-to'g'ri loglardan o'qilgan.

Muvaffaqiyatsiz kirishlar brute force'ni oshkor qiladi:

```
$ grep "Failed password" /var/log/auth.log | tail -3
Mar  4 02:58 sshd: Failed password for admin from 203.0.113.45
$ grep "Failed password" /var/log/auth.log | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | sort | uniq -c | sort -rn | head
    412 203.0.113.45
```

Bitta IP'dan 412 muvaffaqiyatsizlik, muvaffaqiyatli kirishdan sal oldin tugagan — ishlagan brute force — Linux modulida qurishни o'rgangan o'sha quvur, endi hujumni qayta tiklashda ishlatilgan.

## journald: systemd logi

Zamonaviy tizimlar journald'ga log qiladi, `journalctl` bilan so'raladi:

```
$ journalctl -u ssh --since "2024-03-04 02:00" --until "03:30"
$ journalctl _UID=1000 -o short-iso           # foydalanuvchi qilgan hamma narsa
$ journalctl -k -p err                        # faqat yadro xatolari
```

`--since`/`--until` insident oynasiga toraytiradi; `-u` bitta xizmatга filtrlaydi. journald tuzilgan maydonlarni saqlaydi, shunda foydalanuvchi, xizmat, ustuvorlik va vaqt bo'yicha aniq filtrlaysiz.

## Windows voqea loglari

Windows Event Log'ga yozadi, Event Viewer yoki `wevtutil` bilan o'qiladi. Bilish kerak ID'lar:

- **4624** — muvaffaqiyatli kirish; **4625** — muvaffaqiyatsiz kirish (brute force ko'p 4625 sifatida ko'rinadi).
- **4634** — chiqish. **4672** — maxsus imtiyozlar berildi (admin kirishi).
- **4688** — jarayon yaratildi. **7045** — yangi xizmat o'rnatildi (keng tarqalgan barqarorlik hiylasi).
- **1102** — audit logi tozalandi — o'zi hujumchi izlarni yashirishining kuchli belgisi.

Bir manbadan 4625'lar seli, keyin 4624 — ishlagan brute force — yuqoridagi auth.log naqshining Windows ko'zgusi.

## Asosiy vaqt chizig'ini qurish

Tekshiruvning o'zagi — har bir manbani bitta xronologik bayonga birlashtirish: fayl tizimi MAC vaqtlari (disk darsidan), auth loglari, veb loglari, journald, xotira artefaktlari. Ularni vaqt tamg'asi bo'yicha tekislang va hujum hikoyadek o'qiladi:

```
02:58  auth.log   203.0.113.45'dan 412-ssh kirish muvaffaqiyatsizligi
03:00  wtmp       muvaffaqiyatli kirish: 203.0.113.45'dan user
03:01  fayl tizimi /tmp/.x/backdoor yaratildi
03:02  xotira     powershell.exe yaratildi, kod kiritildi
03:05  auth.log   root'ga sudo
03:10  apache     GET /download?file=../../etc/shadow
03:20  wtmp       chiqish
```

Besh manbadan yetti satr va butun bosqinchilik yoyilgan: brute force kirish, tayanch, barqarorlik, imtiyoz oshirish, ma'lumotga kirish, chiqish. **Bu birlashtirilgan vaqt chizig'i — tekshiruvning natijasi** — hisobot undan quriladi.

## Anti-forenzikadan ehtiyot bo'ling

Hujumchilar vaqt chizig'ini buzishga urinadi. Belgilar: tozalangan log (Windows 1102, yoki kun o'rtasida to'satdan boshlanadigan auth.log), mos kelmaydigan vaqt tamg'alari (fayl tizimi yaratilishidan *oldingi* mtime li fayl — timestomping), loglash to'xtagan bo'shliqlar. Yo'q yoki aralashtirilgan log — o'zi dalil; yo'qlik — topilma.

## Sinab ko'ring (o'z loglaringiz yoki laboratoriyada)

1. Mashinangizда `last` va `grep "Failed password" /var/log/auth.log` — tushuntira olmaydigan kirish yoki muvaffaqiyatsizlik bormi?
2. `journalctl -u ssh --since today` — u SSH faoliyati haqida nimani ko'rsatadi?
3. Turli loglardan uch voqeani vaqt bo'yicha tartiblab bitta vaqt chizig'iga birlashtiring.""",
        "contentRu": r"""Логи — дневник системы: кто вошёл, что запускалось, что не удалось. В расследовании они превращают разрозненные улики в упорядоченный отчёт об атаке. Навык — знать, какой лог отвечает на какой вопрос, и сшить их в одну хронологию.

## Важные логи Linux

```
/var/log/auth.log      входы, sudo, ssh — след учёток
/var/log/syslog        общие системные сообщения
/var/log/kern.log      ядро — железо, драйверы, некоторые атаки
/var/log/apache2/      доступ и ошибки веб-сервера
~/.bash_history        команды, набранные пользователем
/var/log/wtmp          записи входов (читать через `last`)
/var/log/btmp          неудачные входы (читать через `lastb`)
```

След учёток обычно первый. Кто вошёл и откуда?

```
$ last -f /var/log/wtmp | head
user     pts/0    203.0.113.45     Mon Mar  4 03:00   still logged in
root     pts/0    203.0.113.45     Mon Mar  4 03:05 - 03:20  (00:15)
```

Вход с внешнего IP в 03:00, затем прыжок к root через пять минут — форма взлома, прочитанная прямо из логов.

Неудачные входы вскрывают брутфорс:

```
$ grep "Failed password" /var/log/auth.log | tail -3
Mar  4 02:58 sshd: Failed password for admin from 203.0.113.45
$ grep "Failed password" /var/log/auth.log | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | sort | uniq -c | sort -rn | head
    412 203.0.113.45
```

412 неудач с одного IP, кончившихся прямо перед успешным входом, — сработавший брутфорс — тот же конвейер, что вы строили в модуле Linux, теперь для реконструкции атаки.

## journald: лог systemd

Современные системы пишут в journald, запрашивается через `journalctl`:

```
$ journalctl -u ssh --since "2024-03-04 02:00" --until "03:30"
$ journalctl _UID=1000 -o short-iso           # всё, что делал пользователь
$ journalctl -k -p err                        # только ошибки ядра
```

`--since`/`--until` сужают к окну инцидента; `-u` фильтрует по службе. journald хранит структурированные поля, так что можно точно фильтровать по пользователю, службе, приоритету и времени.

## Логи событий Windows

Windows пишет в Event Log, читается через Event Viewer или `wevtutil`. ID, которые надо знать:

- **4624** — успешный вход; **4625** — неудачный вход (брутфорс — много 4625).
- **4634** — выход. **4672** — назначены особые привилегии (вход админа).
- **4688** — создан процесс. **7045** — установлена новая служба (частый приём закрепления).
- **1102** — журнал аудита очищен — сам по себе сильный признак заметания следов.

Всплеск 4625, затем 4624 из того же источника — сработавший брутфорс, зеркало паттерна auth.log выше.

## Построение мастер-хронологии

Ядро расследования — слияние всех источников в один хронологический отчёт: MAC-времена файловой системы (из урока о диске), auth-логи, веб-логи, journald, артефакты памяти. Выстройте их по метке времени, и атака читается как история:

```
02:58  auth.log   412-я неудача ssh с 203.0.113.45
03:00  wtmp       успешный вход: user с 203.0.113.45
03:01  файл.сист. создан /tmp/.x/backdoor
03:02  память     запущен powershell.exe, внедрён код
03:05  auth.log   sudo к root
03:10  apache     GET /download?file=../../etc/shadow
03:20  wtmp       выход
```

Семь строк из пяти источников — и всё вторжение разложено: брутфорс, опора, закрепление, повышение привилегий, доступ к данным, выход. **Эта слитая хронология — результат расследования**, из неё строится отчёт.

## Следите за анти-форензикой

Атакующие пытаются сломать хронологию. Признаки: очищенный лог (Windows 1102 или auth.log, вдруг начинающийся среди дня), несовпадающие метки (файл с mtime *раньше* создания файловой системы — timestomping), пробелы, где логирование прекратилось. Отсутствующий или подделанный лог сам по себе улика — отсутствие и есть находка.

## Попробуйте (на своих логах или в лаборатории)

1. `last` и `grep "Failed password" /var/log/auth.log` на своей машине — есть ли входы или неудачи, которые вы не можете объяснить?
2. `journalctl -u ssh --since today` — что он показывает об активности SSH?
3. Слейте три события из разных логов в одну хронологию, отсортированную по времени.""",
        "questions": [
            q("Which Windows Event ID indicates a failed logon (many of them = brute force)?",
              "Qaysi Windows Event ID muvaffaqiyatsiz kirishni bildiradi (ko'pi = brute force)?",
              "Какой Windows Event ID означает неудачный вход (много = брутфорс)?",
              ["4625", "4624", "7045", "1102"], ["4625", "4624", "7045", "1102"], ["4625", "4624", "7045", "1102"], 0),
            q("What is the master timeline in an investigation?",
              "Tekshiruvда asosiy vaqt chizig'i nima?",
              "Что такое мастер-хронология в расследовании?",
              ["Every evidence source merged into one time-ordered account of the attack",
               "A list of open ports", "The attacker's IP address",
               "A single log file"],
              ["Har bir dalil manbai hujumning bitta vaqt bo'yicha tartiblangan bayoniga birlashtirilgan",
               "Ochiq portlar ro'yxati", "Hujumchining IP manzili",
               "Bitta log fayli"],
              ["Все источники улик, слитые в один упорядоченный по времени отчёт об атаке",
               "Список открытых портов", "IP-адрес атакующего",
               "Один файл лога"], 0),
            q("A Windows event log that was cleared (ID 1102) tells an investigator:",
              "Tozalangan Windows voqea logi (ID 1102) tekshiruvchiga nimani aytadi:",
              "Очищенный журнал событий Windows (ID 1102) говорит следователю:",
              ["An attacker likely tried to cover their tracks — the absence is itself evidence",
               "The system is healthy", "Logging was never enabled",
               "Nothing of interest"],
              ["Hujumchi izlarini yashirishga uringan bo'lishi mumkin — yo'qlik o'zi dalil",
               "Tizim sog'lom", "Loglash hech qachon yoqilmagan",
               "Qiziq hech narsa yo'q"],
              ["Атакующий, вероятно, заметал следы — отсутствие само по себе улика",
               "Система здорова", "Логирование не было включено",
               "Ничего интересного"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "forensics", "points": 80,
        "title": "Network forensics: reading the capture",
        "titleUz": "Tarmoq forenzikasi: yozuvni o'qish",
        "titleRu": "Сетевая форензика: чтение захвата",
        "content": r"""When traffic was captured — by an IDS, a tap, or tcpdump left running — the packets are a recording of exactly what crossed the wire. Network forensics reads that recording to find the intrusion, extract what was stolen, and produce indicators to hunt for elsewhere.

## The pcap: a recording of the wire

A capture is saved as a `.pcap` (or `.pcapng`) file — every packet, with its timestamp, addresses, ports and payload. It is the ground truth of what happened on the network, and unlike logs it cannot be edited after the fact by an attacker on the host. The networking module taught you to *make* one with tcpdump; here you *read* one.

## tshark: Wireshark on the command line

`tshark` is Wireshark's terminal engine — ideal for scripting through a large capture:

```
$ tshark -r capture.pcap | head
  1  0.000  192.0.2.15 → 203.0.113.45  TCP  51234 → 443 [SYN]
  2  0.001  203.0.113.45 → 192.0.2.15  TCP  443 → 51234 [SYN, ACK]
$ tshark -r capture.pcap -q -z conv,tcp        # who talked to whom, by volume
$ tshark -r capture.pcap -Y "http.request"     # just HTTP requests
```

`-z conv,tcp` summarises conversations — the pairs of hosts and how much data each exchanged. A workstation that suddenly sent hundreds of megabytes to an unknown external IP is data exfiltration, visible in one line.

## Following a stream

The single most useful move is reassembling one conversation into readable form. In Wireshark it is "Follow TCP Stream"; in tshark:

```
$ tshark -r capture.pcap -q -z follow,tcp,ascii,0
GET /login HTTP/1.1
Host: shop.local
...
POST /login  user=admin&pass=SuperSecret123
```

Over plain HTTP, the credentials are right there — the exact lesson from the networking module, now used to *find* what an attacker captured, or to prove a cleartext protocol leaked a password. Over HTTPS you would see only encrypted `Application Data`, but the addresses, timing and volumes still tell a story.

## Extracting files from the capture

Anything transferred unencrypted can be pulled back out of the packets:

```
$ tshark -r capture.pcap --export-objects http,extracted/
$ ls extracted/
malware.exe  invoice.pdf  config.json
```

`--export-objects http` reconstructs every file sent over HTTP — the malware that was downloaded, the document that was exfiltrated. This is how a defender recovers the actual payload for analysis and proves what left the network.

## Indicators of compromise (IOCs)

The point of network forensics is not just this incident — it is producing **IOCs**: concrete artifacts you can search for everywhere else to find the same attacker. From a capture:

- **IP addresses and domains** the malware contacted (its command-and-control).
- **URLs and User-Agent strings** unique to the tool.
- **File hashes** of what was transferred.
- **JA3 fingerprints** of the TLS client, which identify malware even over encryption.

```
$ tshark -r capture.pcap -Y "dns" -T fields -e dns.qry.name | sort -u
evil-c2.example.com
```

That one domain, fed into every firewall and DNS log across the organisation, finds every other machine talking to the same command-and-control. A single investigation becomes a hunt across the whole network.

## Reading beaconing

Malware "phones home" on a schedule — **beaconing**. In a capture it shows as connections to the same external host at regular intervals: every 60 seconds, a small packet out. Regular, low-volume, persistent traffic to one destination is the signature of an implant checking for orders, and the timing itself is an indicator.

## Try it (on a sample pcap — many exist for practice)

1. `tshark -r file.pcap -q -z conv,tcp` — which conversation moved the most data?
2. Follow one TCP stream to ASCII. Is any of it readable (a cleartext protocol)?
3. `--export-objects http` on a capture with a download. What files come out?""",
        "contentUz": r"""Trafik ushlanganda — IDS, tap yoki ishlab turgan tcpdump orqali — paketlar simdan aynan nima o'tganining yozuvi. Tarmoq forenzikasi o'sha yozuvni o'qib bosqinchilikni topadi, o'g'irlanganini ajratadi va boshqa joyda ovlash uchun ko'rsatkichlar ishlab chiqaradi.

## pcap: simning yozuvi

Ushlash `.pcap` (yoki `.pcapng`) fayl sifatida saqlanadi — har paket, vaqt tamg'asi, manzillar, portlar va foydali yuki bilan. Bu — tarmoqда nima bo'lganining haqiqati, va loglardan farqli, uni xostдаgi hujumchи keyin tahrirlay olmaydi. Tarmoq moduli sizga tcpdump bilan *qilishни* o'rgatdi; bu yerда siz uni *o'qiysiz*.

## tshark: buyruq qatoridagi Wireshark

`tshark` — Wireshark'ning terminal dvigateli — katta yozuv bo'ylab skript yozishga ideal:

```
$ tshark -r capture.pcap | head
  1  0.000  192.0.2.15 → 203.0.113.45  TCP  51234 → 443 [SYN]
  2  0.001  203.0.113.45 → 192.0.2.15  TCP  443 → 51234 [SYN, ACK]
$ tshark -r capture.pcap -q -z conv,tcp        # kim kim bilan gaplashди, hajm bo'yicha
$ tshark -r capture.pcap -Y "http.request"     # faqat HTTP so'rovlari
```

`-z conv,tcp` suhbatlarni umumlashtiradi — xostlar juftlari va har biri qancha ma'lumot almashgani. To'satdan noma'lum tashqi IP'ga yuzlab megabayt yuborgan ish stantsiyasi — ma'lumot chiqarish, bir satrda ko'rinadi.

## Oqimni kuzatish

Eng foydali yagona harakat — bitta suhbatni o'qiladigan shaklga qayta yig'ish. Wireshark'da bu "Follow TCP Stream"; tshark'da:

```
$ tshark -r capture.pcap -q -z follow,tcp,ascii,0
GET /login HTTP/1.1
Host: shop.local
...
POST /login  user=admin&pass=SuperSecret123
```

Oddiy HTTP orqali hisob ma'lumotlar shundoq turibdi — tarmoq modulidan aynan o'sha dars, endi hujumchи ushlaganини *topish* yoki ochiq matnli protokol parolni sizdirganini isbotlash uchun ishlatilgan. HTTPS orqali faqat shifrlangan `Application Data` ko'rasiz, lekin manzillar, vaqt va hajmlar baribir hikoya aytadi.

## Yozuvдan fayllarni ajratish

Shifrlanmasdan uzatilgan har narsani paketlardan qaytarib olsa bo'ladi:

```
$ tshark -r capture.pcap --export-objects http,extracted/
$ ls extracted/
malware.exe  invoice.pdf  config.json
```

`--export-objects http` HTTP orqali yuborilgan har faylni qayta tiklaydi — yuklab olingan zararli dastur, chiqarilgan hujjat. Himoyachи tahlil uchun haqiqiy foydali yukни shunday qaytaradi va tarmoqдан nima chiqqanини isbotlaydi.

## Buzilish ko'rsatkichlari (IOC)

Tarmoq forenzikasining maqsadi faqat bu insident emas — u **IOC** ishlab chiqarish: bir xil hujumchини topish uchun boshqa hamma joyда qidiriladigan aniq artefaktlar. Yozuvдан:

- Zararli dastur bog'langan **IP manzillar va domenlar** (uning buyruq-va-nazorati).
- Vositaга xos **URL va User-Agent satrlari**.
- Uzatilganning **fayl xeshlari**.
- Shifrlash orqali ham zararli dasturни aniqlaydigan TLS mijozining **JA3 barmoq izlari**.

```
$ tshark -r capture.pcap -Y "dns" -T fields -e dns.qry.name | sort -u
evil-c2.example.com
```

O'sha bitta domen, tashkilot bo'ylab har bir ekran va DNS logiga berilса, bir xil buyruq-va-nazorat bilan gaplashayotган har bir boshqa mashinani topadi. Bitta tekshiruv butun tarmoq bo'ylab ovга aylanadi.

## Beaconing'ni o'qish

Zararli dastur jadval bo'yicha "uyga qo'ng'iroq qiladi" — **beaconing**. Yozuvда bu bir xil tashqi xostга muntazam oraliqларда ulanish sifatида ko'rinadi: har 60 soniyада kichik paket tashqariga. Bitta manzilга muntazam, kam hajmli, doimiy trafik — buyruq kutayotган implant imzosi, va vaqtning o'zи ko'rsatkich.

## Sinab ko'ring (namuna pcap'да — mashq uchun ko'p bor)

1. `tshark -r file.pcap -q -z conv,tcp` — qaysi suhbat eng ko'p ma'lumot ko'chirди?
2. Bitta TCP oqimini ASCII'ga kuzating. Undан biror narsa o'qiladimi (ochiq matnli protokol)?
3. Yuklab olinган yozuvда `--export-objects http`. Qanday fayllar chiqadi?""",
        "contentRu": r"""Когда трафик был захвачен — IDS, ответвлением или работающим tcpdump — пакеты являются записью того, что именно прошло по проводу. Сетевая форензика читает эту запись, чтобы найти вторжение, извлечь украденное и произвести индикаторы для поиска в других местах.

## pcap: запись провода

Захват сохраняется как файл `.pcap` (или `.pcapng`) — каждый пакет с меткой времени, адресами, портами и нагрузкой. Это истина о том, что было в сети, и в отличие от логов её не может отредактировать постфактум атакующий на хосте. Модуль сетей учил *создавать* её через tcpdump; здесь вы её *читаете*.

## tshark: Wireshark в командной строке

`tshark` — терминальный движок Wireshark — идеален для скриптинга по большому захвату:

```
$ tshark -r capture.pcap | head
  1  0.000  192.0.2.15 → 203.0.113.45  TCP  51234 → 443 [SYN]
  2  0.001  203.0.113.45 → 192.0.2.15  TCP  443 → 51234 [SYN, ACK]
$ tshark -r capture.pcap -q -z conv,tcp        # кто с кем говорил, по объёму
$ tshark -r capture.pcap -Y "http.request"     # только HTTP-запросы
```

`-z conv,tcp` суммирует беседы — пары хостов и сколько данных обменял каждый. Рабочая станция, вдруг отправившая сотни мегабайт неизвестному внешнему IP, — это эксфильтрация данных, видимая в одной строке.

## Следование за потоком

Полезнейший приём — пересборка одной беседы в читаемый вид. В Wireshark это «Follow TCP Stream»; в tshark:

```
$ tshark -r capture.pcap -q -z follow,tcp,ascii,0
GET /login HTTP/1.1
Host: shop.local
...
POST /login  user=admin&pass=SuperSecret123
```

По обычному HTTP учётные данные прямо здесь — тот самый урок из модуля сетей, теперь для *поиска* захваченного атакующим или доказательства, что протокол открытым текстом слил пароль. По HTTPS вы увидели бы лишь зашифрованные `Application Data`, но адреса, тайминг и объёмы всё равно рассказывают историю.

## Извлечение файлов из захвата

Всё переданное без шифрования можно вытащить обратно из пакетов:

```
$ tshark -r capture.pcap --export-objects http,extracted/
$ ls extracted/
malware.exe  invoice.pdf  config.json
```

`--export-objects http` реконструирует каждый файл, отправленный по HTTP — скачанный вредонос, вынесенный документ. Так защитник восстанавливает саму нагрузку для анализа и доказывает, что покинуло сеть.

## Индикаторы компрометации (IOC)

Смысл сетевой форензики не только этот инцидент — это производство **IOC**: конкретных артефактов для поиска везде, чтобы найти того же атакующего. Из захвата:

- **IP-адреса и домены**, с которыми связывался вредонос (его командный сервер).
- **URL и строки User-Agent**, уникальные для инструмента.
- **Хеши файлов** переданного.
- **JA3-отпечатки** TLS-клиента, опознающие вредонос даже сквозь шифрование.

```
$ tshark -r capture.pcap -Y "dns" -T fields -e dns.qry.name | sort -u
evil-c2.example.com
```

Этот один домен, поданный в каждый файрвол и DNS-лог по организации, находит каждую другую машину, говорящую с тем же командным сервером. Одно расследование становится охотой по всей сети.

## Чтение биконинга

Вредонос «звонит домой» по расписанию — **биконинг**. В захвате это соединения с одним внешним хостом через равные интервалы: каждые 60 секунд — маленький пакет наружу. Регулярный, малообъёмный, постоянный трафик к одному адресу — сигнатура импланта, ждущего команд, и сам тайминг — индикатор.

## Попробуйте (на образце pcap — их много для практики)

1. `tshark -r file.pcap -q -z conv,tcp` — какая беседа перенесла больше всего данных?
2. Проследите один TCP-поток в ASCII. Читается ли что-то (протокол открытым текстом)?
3. `--export-objects http` на захвате со скачиванием. Какие файлы выходят?""",
        "questions": [
            q("Why is a pcap capture harder for an attacker to tamper with than host logs?",
              "Nega pcap yozuvини hujumchи xost loglariga qaraganда qiyinroq aralashtiradi?",
              "Почему pcap-захват сложнее подделать атакующему, чем логи хоста?",
              ["It records the actual wire traffic, off the host the attacker controls",
               "It is encrypted", "It cannot be read without Wireshark",
               "It is stored in the cloud"],
              ["U hujumchи boshqaradigan xostдан tashqarида haqiqiy sim trafigini yozadi",
               "U shifrlangan", "Uni Wireshark'сиз o'qib bo'lmaydi",
               "U bulutда saqlanadi"],
              ["Он записывает реальный трафик провода, вне хоста, который контролирует атакующий",
               "Он зашифрован", "Его нельзя прочитать без Wireshark",
               "Он хранится в облаке"], 0),
            q("What is an Indicator of Compromise (IOC)?",
              "Buzilish ko'rsatkichi (IOC) nima?",
              "Что такое индикатор компрометации (IOC)?",
              ["A concrete artifact (IP, domain, hash) you search for elsewhere to find the same attacker",
               "A type of firewall", "A memory image",
               "The attacker's real name"],
              ["Bir xil hujumchини topish uchun boshqa joyда qidiriladigan aniq artefakt (IP, domen, xesh)",
               "Ekran turi", "Xotira tasviri",
               "Hujumchining haqiqiy nomi"],
              ["Конкретный артефакт (IP, домен, хеш), который ищут в других местах, чтобы найти того же атакующего",
               "Тип файрвола", "Образ памяти",
               "Настоящее имя атакующего"], 0),
            q("Regular small connections to one external host every 60 seconds is:",
              "Har 60 soniyада bitta tashqi xostга muntazam kichik ulanishlar:",
              "Регулярные малые соединения к одному внешнему хосту каждые 60 секунд — это:",
              ["Beaconing — malware checking in with its command-and-control",
               "A DNS lookup", "A software update", "Normal web browsing"],
              ["Beaconing — zararli dastur buyruq-va-nazorati bilan aloqa qilishi",
               "DNS qidiruvи", "Dastur yangilanishi", "Oddiy veb-sayt ko'rish"],
              ["Биконинг — вредонос отмечается у командного сервера",
               "DNS-запрос", "Обновление ПО", "Обычный веб-сёрфинг"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "forensics", "points": 90,
        "title": "The investigation end to end, and the IR lifecycle",
        "titleUz": "Tekshiruv boshdan oxirigacha va IR hayot davri",
        "titleRu": "Расследование от начала до конца и жизненный цикл IR",
        "content": r"""This lesson assembles the module the way the exploitation capstone assembled the offensive core: every technique becomes one investigation, run inside the incident-response process organisations actually follow. Forensics is the defender's mirror of the attack chain — and now you can read both directions.

## The incident response lifecycle

Real IR follows a defined cycle (the SANS/NIST model), and every forensic technique in this module lives inside one of its phases:

```
1. Preparation    — before anything: logging, backups, a plan, tools ready
2. Identification — detect and confirm an incident is real
3. Containment    — stop the bleeding without destroying evidence
4. Eradication    — remove the attacker's foothold, malware, persistence
5. Recovery       — restore clean systems, verify they are safe
6. Lessons learned— write it up, fix the root cause, improve
```

Containment is the hardest balance: you must stop the attacker *and* preserve evidence. Pulling the network cable contains without destroying memory; powering off contains but destroys it. The order-of-volatility discipline from lesson 1 is what lets you contain and investigate at once.

## The full investigation, technique by technique

An incident, worked from detection to report, using every lesson:

```
DETECTION   an alert: outbound traffic to a known-bad IP (lesson 7 IOC)
1. First response (L1): do not power off; capture RAM, then image the disk, hash both
2. Memory (L5):    pslist → a powershell.exe with an odd parent at 03:02
                   malfind → injected code in svchost; cmdline → the full command
3. Disk (L2,L3):   timeline the image → /tmp/.x/backdoor created 03:01,
                   crontab modified 03:01 (the persistence)
4. Carving (L4):   recover the deleted dropper; exiftool → its build timestamp
5. Logs (L6):      auth.log → 412 failed ssh then a login from 203.0.113.45 at 03:00;
                   the entry point, five minutes before the backdoor
6. Network (L7):   the pcap → beaconing to evil-c2.example.com; export the
                   exfiltrated files; the C2 domain is an IOC
7. Timeline:       merge all of it into one account, 02:58 → 03:20
```

Read it and the whole breach is reconstructed: brute force in at 02:58, foothold at 03:00, persistence and injection at 03:01–03:02, privilege escalation, data exfiltration, exit at 03:20. This is the attacker's chain from module 6, seen from the other side — every offensive step left a defensive artifact.

## Offence and defence are one picture

Every attack technique you learned leaves a trace a defender reads:

| The attacker did... | The defender finds... |
|---|---|
| brute-forced ssh | 412 failed logins in auth.log, then a success |
| dropped a reverse shell | an odd process in memory, a file in /tmp |
| escalated via sudo/SUID | a sudo entry in auth.log, a new SUID binary |
| added cron persistence | a modified crontab, on the timeline |
| exfiltrated over the network | a large outbound flow in the pcap |
| deleted their tools | recoverable files, carved back |
| cleared the logs | the gap itself — the absence is evidence |

Learning to attack taught you exactly where to look when defending, and learning to investigate shows you exactly what an attacker must avoid leaving. They are the same knowledge, read in two directions — the point this whole program has been building toward.

## The forensic report

An investigation is worthless if it cannot be communicated. The report mirrors the offensive report from module 6, from the defender's side:

- **Executive summary** — what happened, impact, in plain language for leadership.
- **Timeline** — the merged, sourced account of the attack, the heart of the report.
- **Evidence** — hashes, chain of custody, the artifacts, so every claim is verifiable.
- **Root cause** — how they got in (here: a weak SSH password, no rate limiting).
- **Remediation** — specific fixes: strong passwords + MFA, rate limiting, patching, monitoring.
- **IOCs** — the indicators to hunt for across the rest of the estate.

Every conclusion traces to evidence with a hash and a place in the timeline. That is what separates a forensic finding from a guess — the same discipline of proof that ran through the offensive report, applied to defence.

## Where forensics goes from here

This module is a foundation. To go deeper: mobile forensics, cloud and container forensics, malware reverse engineering, threat hunting at scale (SIEM, EDR), and the legal side of expert testimony. But the method is constant — collect without altering, build a timeline, follow the artifacts, prove every claim — and you now have it.

## Try it — the capstone

On a lab incident you own (a deliberately compromised VM, a forensics CTF, a sample image set):

1. Work an incident end to end: first response, memory, disk, logs, network — building one merged timeline.
2. For each finding, name the lesson and the offensive technique it is the trace of.
3. Write a short forensic report — summary, timeline, evidence with hashes, root cause, remediation, IOCs. That report is the deliverable this module was building toward.""",
        "contentUz": r"""Bu dars modulni ekspluatatsiya capstone'i hujum o'zagini yig'gandек yig'adi: har texnika bitta tekshiruvга aylanadi, tashkilotlar haqiqatan amal qiladigan insidentга javob jarayoni ichida yuritilgan. Forenzika — hujum zanjirining himoyachи ko'zgusi — va endi siz ikkala yo'nalishни o'qiy olasiz.

## Insidentга javob hayot davri

Haqiqiy IR belgilangan tsiklga ergashadi (SANS/NIST modeli), va bu moduldаgi har forenzik texnika uning bir bosqichида yashaydi:

```
1. Tayyorgarlik   — hamma narsadan oldin: loglash, zaxira, reja, tayyor vositalar
2. Aniqlash       — insident haqiqatligiни aniqlash va tasdiqlash
3. Cheklash       — dalilни yo'q qilmasdan qon oqishini to'xtatish
4. Yo'q qilish    — hujumchи tayanchi, zararli dastur, barqarorlikني olib tashlash
5. Tiklash        — toza tizimlarни tiklash, xavfsizligini tekshirish
6. Saboqlar       — yozib olish, ildiz sababiни tuzatish, yaxshilash
```

Cheklash — eng qiyin muvozanat: hujumchини to'xtatib *va* dalilني saqlashingiz kerak. Tarmoq kabelini sug'urish xotirани yo'q qilmasdan cheklaydi; o'chirish cheklaydi, lekin uni yo'q qiladi. 1-darsdan o'zgaruvchanlik tartibi intizomi bir vaqtда cheklash va tekshirishга imkon beradi.

## To'liq tekshiruv, texnikama-texnika

Aniqlashдан hisobotga qadar yuritilgan insident, har darsni ishlatib:

```
ANIQLASH    ogohlantirish: ma'lum-yomon IP'ga chiquvchi trafik (7-dars IOC)
1. Birinchi javob (D1): o'chirmang; RAM oling, keyin diskni tasvirlang, ikkalasini xeshlang
2. Xotira (D5):    pslist → 03:02 da g'alati otali powershell.exe
                   malfind → svchost'da kiritilgan kod; cmdline → to'liq buyruq
3. Disk (D2,D3):   tasvir vaqt chizig'i → /tmp/.x/backdoor 03:01 da yaratilди,
                   crontab 03:01 da o'zgartirилди (barqarorlik)
4. Kesish (D4):    o'chirilgan dropper'ni tiklash; exiftool → uning qurilish vaqti
5. Loglar (D6):    auth.log → 412 muvaffaqiyatsiz ssh, keyin 03:00 da 203.0.113.45'dan kirish;
                   kirish nuqtasi, backdoor'dан besh daqiqa oldin
6. Tarmoq (D7):    pcap → evil-c2.example.com'ga beaconing; chiqarилган fayllarni
                   ajratish; C2 domeni — IOC
7. Vaqt chizig'i:  hammasini bitta bayonga birlashtirish, 02:58 → 03:20
```

Uni o'qing va butun buzilish qayta tiklanган: 02:58 da brute force kirish, 03:00 da tayanch, 03:01–03:02 da barqarorlik va kiritish, imtiyoz oshirish, ma'lumot chiqarish, 03:20 da chiqish. Bu — 6-moduldan hujumchи zanjiri, boshqa tomondan ko'rilган — har hujumkor qadam himoyaviy artefakt qoldirди.

## Hujum va himoya — bitta rasm

O'rgangan har hujum texnikangiz himoyachи o'qiydigan iz qoldiradi:

| Hujumchи qildi... | Himoyachи topadi... |
|---|---|
| ssh brute force | auth.log'da 412 muvaffaqiyatsiz kirish, keyin muvaffaqiyat |
| reverse shell tashladi | xotirада g'alati jarayon, /tmp'da fayl |
| sudo/SUID orqali oshirди | auth.log'da sudo yozuvi, yangi SUID binar |
| cron barqarorlik qo'shди | o'zgartirilган crontab, vaqt chizig'ида |
| tarmoq orqali chiqарди | pcap'da katta chiquvchi oqim |
| vositalarини o'chirди | tiklanadigan fayllar, qayta kesilган |
| loglarни tozаlaди | bo'shliqning o'zi — yo'qlik dalil |

Hujum qilishни o'rganish himoya qilганда aynan qayerга qarashни o'rgatди, va tekshirishни o'rganish hujumchи aynan nimани qoldirmasligi kerakligини ko'rsatади. Ular bitta bilim, ikki yo'nalishда o'qilган — butun bu dastur qurayotган nuqta.

## Forenzik hisobot

Tekshiruv agar yetkazib bo'lmаса qadrsiz. Hisobot 6-moduldаgi hujumkor hisobotni himoyachи tomonidан aks ettiradi:

- **Ijrochilar xulosasi** — nima bo'lди, ta'sir, rahbariyat uchun oddiy tilда.
- **Vaqt chizig'i** — birlashtirilган, manbali hujum bayoni, hisobotning yuragi.
- **Dalil** — xeshlar, vasiylik zanjiri, artefaktlar, shunда har da'vo tekshiriladi.
- **Ildiz sababi** — qanday kirishди (bu yerда: zaif SSH parol, tezlik cheklashi yo'q).
- **Bartaraf etish** — aniq tuzatishlar: kuchli parol + MFA, tezlik cheklash, yamash, kuzatuv.
- **IOC'lar** — qolgan mulk bo'ylab ovlanadigan ko'rsatkichlar.

Har xulosa xesh va vaqt chizig'idаgi o'ringа ega dalilга bog'lanадi. Forenzik topilmани taxmindан ajratadigan narsa shu — hujumkor hisobotдан o'tган o'sha isbot intizomi, himoyаga qo'llanган.

## Forenzika bu yerдан qayerга boradi

Bu modul — poydevor. Chuqurroq: mobil forenzika, bulut va konteyner forenzikasi, zararli dastur teskari muhandisligi, miqyosда tahdid ovlash (SIEM, EDR) va ekspert guvohligining huquqiy tomoni. Lekin usul doimiy — o'zgartirmasdan yig'ish, vaqt chizig'ini qurish, artefaktlarni kuzatish, har da'voни isbotlash — va endi u sizда bor.

## Sinab ko'ring — capstone

O'zingizниki laboratoriya insidentида (ataylab buzilган VM, forenzik CTF, namuna tasvir to'plami):

1. Insidentни boshdan oxiригаcha yuriting: birinchi javob, xotira, disk, loglar, tarmoq — bitta birlashtirilган vaqt chizig'ini qurib.
2. Har topilma uchun darsni va u iz bo'lган hujumkor texnikani nomlang.
3. Qisqa forenzik hisobot yozing — xulosa, vaqt chizig'i, xeshli dalil, ildiz sababi, bartaraf etish, IOC'lar. O'sha hisobot — bu modul qurayotган natija.""",
        "contentRu": r"""Этот урок собирает модуль так, как капстоун эксплуатации собрал наступательное ядро: каждая техника становится одним расследованием, проводимым внутри процесса реагирования, которому организации реально следуют. Форензика — зеркало цепочки атаки со стороны защитника — и теперь вы читаете оба направления.

## Жизненный цикл реагирования на инциденты

Реальный IR следует определённому циклу (модель SANS/NIST), и каждая форензическая техника модуля живёт в одной из его фаз:

```
1. Подготовка     — до всего: логирование, бэкапы, план, готовые инструменты
2. Идентификация  — обнаружить и подтвердить, что инцидент реален
3. Сдерживание    — остановить кровотечение, не уничтожив улики
4. Устранение     — убрать опору атакующего, вредонос, закрепление
5. Восстановление — вернуть чистые системы, убедиться, что безопасны
6. Уроки          — описать, устранить корневую причину, улучшить
```

Сдерживание — труднейший баланс: надо остановить атакующего *и* сохранить улики. Выдернуть сетевой кабель — сдержать, не уничтожив память; выключить — сдержать, но уничтожить её. Дисциплина порядка волатильности из урока 1 позволяет сдержать и расследовать одновременно.

## Полное расследование, техника за техникой

Инцидент, отработанный от обнаружения до отчёта, с каждым уроком:

```
ОБНАРУЖЕНИЕ  алерт: исходящий трафик к известно-плохому IP (IOC урока 7)
1. Первое реагирование (У1): не выключать; снять RAM, затем образ диска, захешировать оба
2. Память (У5):    pslist → powershell.exe со странным родителем в 03:02
                   malfind → внедрённый код в svchost; cmdline → полная команда
3. Диск (У2,У3):   хронология образа → /tmp/.x/backdoor создан 03:01,
                   crontab изменён 03:01 (закрепление)
4. Вырезание (У4): восстановить удалённый дроппер; exiftool → его время сборки
5. Логи (У6):      auth.log → 412 неудач ssh, затем вход с 203.0.113.45 в 03:00;
                   точка входа, за пять минут до бэкдора
6. Сеть (У7):      pcap → биконинг к evil-c2.example.com; экспортировать
                   вынесенные файлы; домен C2 — IOC
7. Хронология:     слить всё в один отчёт, 02:58 → 03:20
```

Прочтите — и весь взлом реконструирован: брутфорс в 02:58, опора в 03:00, закрепление и внедрение в 03:01–03:02, повышение привилегий, эксфильтрация, выход в 03:20. Это цепочка атакующего из модуля 6, увиденная с другой стороны — каждый наступательный шаг оставил защитный артефакт.

## Нападение и защита — одна картина

Каждая изученная техника атаки оставляет след, который читает защитник:

| Атакующий сделал... | Защитник находит... |
|---|---|
| брутфорс ssh | 412 неудач в auth.log, затем успех |
| сбросил reverse shell | странный процесс в памяти, файл в /tmp |
| эскалация через sudo/SUID | запись sudo в auth.log, новый SUID-бинарник |
| добавил cron-закрепление | изменённый crontab, в хронологии |
| эксфильтрация по сети | крупный исходящий поток в pcap |
| удалил инструменты | восстановимые файлы, вырезанные обратно |
| очистил логи | сам пробел — отсутствие и есть улика |

Умение атаковать научило вас, где именно смотреть при защите, а умение расследовать показывает, чего именно атакующий должен избегать оставлять. Это одно знание, читаемое в двух направлениях — то, к чему вела вся программа.

## Форензический отчёт

Расследование бесполезно, если его нельзя изложить. Отчёт зеркалит наступательный отчёт модуля 6 со стороны защитника:

- **Резюме для руководства** — что случилось, влияние, простым языком.
- **Хронология** — слитый, с источниками отчёт об атаке, сердце отчёта.
- **Улики** — хеши, цепочка сохранности, артефакты, чтобы каждое утверждение проверялось.
- **Корневая причина** — как вошли (здесь: слабый пароль SSH, нет ограничения частоты).
- **Устранение** — конкретные исправления: сильные пароли + MFA, лимит частоты, патчи, мониторинг.
- **IOC** — индикаторы для охоты по остальной инфраструктуре.

Каждый вывод восходит к улике с хешем и местом в хронологии. Это отличает форензическую находку от догадки — та же дисциплина доказательства, что и в наступательном отчёте, применённая к защите.

## Куда форензика идёт дальше

Этот модуль — фундамент. Глубже: мобильная форензика, форензика облака и контейнеров, реверс-инжиниринг вредоносов, охота за угрозами в масштабе (SIEM, EDR) и юридическая сторона экспертных показаний. Но метод постоянен — собирать не изменяя, строить хронологию, идти по артефактам, доказывать каждое утверждение — и теперь он у вас есть.

## Попробуйте — капстоун

На своём лабораторном инциденте (намеренно скомпрометированная VM, форензический CTF, набор образцов):

1. Отработайте инцидент от начала до конца: первое реагирование, память, диск, логи, сеть — строя одну слитую хронологию.
2. Для каждой находки назовите урок и наступательную технику, следом которой она является.
3. Напишите короткий форензический отчёт — резюме, хронология, улики с хешами, корневая причина, устранение, IOC. Этот отчёт — результат, к которому вёл модуль.""",
        "questions": [
            q("In the IR lifecycle, why is containment a delicate balance?",
              "IR hayot davrida nega cheklash nozik muvozanat?",
              "В цикле IR почему сдерживание — тонкий баланс?",
              ["You must stop the attacker while preserving volatile evidence",
               "It requires the most staff", "It is illegal without a warrant",
               "It always destroys the disk"],
              ["Hujumchини to'xtatib, o'zgaruvchan dalilни saqlashingiz kerak",
               "U eng ko'p xodim talab qiladi", "Order-siz noqonuniy",
               "U doim diskни yo'q qiladi"],
              ["Нужно остановить атакующего, сохранив волатильные улики",
               "Требует больше всего персонала", "Незаконно без ордера",
               "Всегда уничтожает диск"], 0),
            q("The central insight of the module is that offence and defence are:",
              "Modulning markaziy tushunchasi — hujum va himoya:",
              "Центральная мысль модуля: нападение и защита —",
              ["The same knowledge read in two directions — each attack leaves a trace",
               "Completely separate fields", "Defence needs no offensive knowledge",
               "Only useful in CTFs"],
              ["Ikki yo'nalishда o'qilган bir xil bilim — har hujum iz qoldiradi",
               "Butunlay alohida sohalar", "Himoya hujum bilimini talab qilmaydi",
               "Faqat CTF'да foydali"],
              ["Одно знание, читаемое в двух направлениях — каждая атака оставляет след",
               "Совершенно разные области", "Защите не нужно знание атак",
               "Полезны только в CTF"], 0),
            q("What ties every conclusion in a forensic report to something trustworthy?",
              "Forenzik hisobotда har xulosani ishonchli narsaга nima bog'laydi?",
              "Что связывает каждый вывод форензического отчёта с чем-то надёжным?",
              ["Evidence with a hash and a place in the timeline",
               "The investigator's reputation", "The number of pages",
               "A signature from the attacker"],
              ["Xesh va vaqt chizig'idаgi o'ringа ega dalil",
               "Tekshiruvchining obro'si", "Betlar soni",
               "Hujumchидан imzo"],
              ["Улика с хешем и местом в хронологии",
               "Репутация следователя", "Количество страниц",
               "Подпись атакующего"], 0),
        ],
    },
]


MODULE = {
    "slug": "forensics-and-incident-response",
    "category": "forensics",
    "title": "Digital Forensics and Incident Response",
    "titleUz": "Raqamli forenzika va insidentga javob",
    "titleRu": "Цифровая форензика и реагирование на инциденты",
    "description": (
        "The defender's mirror of the attack chain: what you do after a breach. The DFIR mindset and order of "
        "volatility, disk imaging and integrity, filesystem timelines and deleted files, carving and metadata, "
        "memory forensics with Volatility, log and event analysis, network forensics and IOCs, and a full "
        "investigation run inside the incident-response lifecycle — proving every finding with evidence."
    ),
    "descriptionUz": (
        "Hujum zanjirining himoyachи ko'zgusi: buzilishдан keyin nima qilasiz. DFIR tafakkuri va o'zgaruvchanlik "
        "tartibi, disk tasvirlash va yaxlitlik, fayl tizimi vaqt chiziqlari va o'chirilgan fayllar, kesish va "
        "metama'lumot, Volatility bilan xotira forenzikasi, log va voqea tahlili, tarmoq forenzikasi va IOC'lar, "
        "va insidentга javob hayot davri ichида yuritilган to'liq tekshiruv — har topilmани dalil bilan isbotlash."
    ),
    "descriptionRu": (
        "Зеркало цепочки атаки со стороны защитника: что делать после взлома. Мышление DFIR и порядок "
        "волатильности, снятие образа диска и целостность, хронологии файловой системы и удалённые файлы, "
        "вырезание и метаданные, форензика памяти с Volatility, анализ логов и событий, сетевая форензика и IOC, "
        "и полное расследование внутри жизненного цикла реагирования — с доказательством каждой находки."
    ),
    "difficulty": "advanced",
    "estimatedHours": 45,
    "passScore": 80,
    "orderIndex": 6,
    "exam": [
        q("What is the practical consequence of the order of volatility?",
          "O'zgaruvchanlik tartibining amaliy oqibati nima?",
          "Каково практическое следствие порядка волатильности?",
          ["Capture RAM before disk — do not power off or reboot a compromised host",
           "Always reboot to clear malware", "Image the disk first, ignore memory",
           "Encrypt everything before analysis"],
          ["Diskдан oldin RAM oling — buzilган xostни o'chirmang yoki qayta yuklamang",
           "Zararli dasturни tozalash uchun doim qayta yuklang", "Avval diskни tasvirlang, xotirани e'tiborsiz qoldiring",
           "Tahlildан oldin hamma narsани shifrlang"],
          ["Снимать RAM до диска — не выключать и не перезагружать скомпрометированный хост",
           "Всегда перезагружать для очистки вредоноса", "Сначала диск, память игнорировать",
           "Шифровать всё до анализа"], 0),
        q("Chain of custody exists to:",
          "Vasiylik zanjiri nima uchun mavjud:",
          "Цепочка сохранности существует, чтобы:",
          ["Prove evidence was not tampered with, via an unbroken handling record",
           "Speed up the investigation", "Encrypt the evidence",
           "Identify the attacker"],
          ["Uzluksiz boshqaruv yozuvi orqali dalил aralashtirilmaganини isbotlash",
           "Tekshiruvni tezlashtirish", "Dalилни shifrlash",
           "Hujumchини aniqlash"],
          ["Доказать нетронутость улики через непрерывную запись обращения",
           "Ускорить расследование", "Зашифровать улику",
           "Опознать атакующего"], 0),
        q("A forensic disk image is:",
          "Forenzik disk tasviri:",
          "Форензический образ диска — это:",
          ["A bit-for-bit copy including deleted files and slack space",
           "A copy of the visible files only", "A compressed archive of documents",
           "A screenshot of the desktop"],
          ["Bit-bit nusxa, jumladan o'chirilган fayllar va bo'sh joy",
           "Faqat ko'rinадиган fayllar nusxasi", "Hujjatlar siqilган arxivи",
           "Ish stoli skrinshoti"],
          ["Побитовая копия, включая удалённые файлы и слэк",
           "Копия только видимых файлов", "Сжатый архив документов",
           "Скриншот рабочего стола"], 0),
        q("Which command hashes evidence to prove it was not altered?",
          "Qaysi buyruq dalилни o'zgartirilmaганини isbotlash uchun xeshlaydi?",
          "Какая команда хеширует улику для доказательства неизменности?",
          ["sha256sum", "chmod", "grep", "nmap"],
          ["sha256sum", "chmod", "grep", "nmap"],
          ["sha256sum", "chmod", "grep", "nmap"], 0),
        q("A filesystem timeline (mactime) is built to:",
          "Fayl tizimi vaqt chizig'и (mactime) nima uchun quriladi:",
          "Хронология файловой системы (mactime) строится, чтобы:",
          ["Order every file's activity by time and read the disk as events",
           "Delete old files", "Encrypt the disk", "Find open ports"],
          ["Har faylning faoliyatини vaqt bo'yicha tartiblash va diskни voqealar sifatида o'qish",
           "Eski fayllarни o'chirish", "Diskни shifrlash", "Ochiq portlarни topish"],
          ["Упорядочить активность каждого файла по времени и читать диск как события",
           "Удалить старые файлы", "Зашифровать диск", "Найти открытые порты"], 0),
        q("Why is a 'deleted' file often recoverable?",
          "Nega 'o'chirilган' fayl ko'pincha tiklanadi?",
          "Почему «удалённый» файл часто восстановим?",
          ["Deletion unlinks the entry but the data stays until overwritten",
           "The OS backs up every file", "Deletion is fake", "Files move to the cloud"],
          ["O'chirish yozuvni uzadi, lekin ma'lumot qayta yozилguncha qoladi",
           "OS har faylни zaxiralaydi", "O'chirish soxta", "Fayllar bulutга ko'chadi"],
          ["Удаление отвязывает запись, но данные остаются до перезаписи",
           "ОС бэкапит каждый файл", "Удаление фиктивно", "Файлы уходят в облако"], 0),
        q("`exiftool` on a photo reveals GPS coordinates. This is valuable because:",
          "Rasmda `exiftool` GPS koordinatalarини oshkor qiladi. Bu qimmatли, chunki:",
          "`exiftool` на фото выдаёт GPS-координаты. Это ценно, потому что:",
          ["It shows where the photo was taken — evidence not in the content",
           "It makes the photo smaller", "It removes the metadata",
           "It is always wrong"],
          ["U rasm qayerда olinganини ko'rsatadi — mazmunда yo'q dalил",
           "U rasmни kichraytiradi", "U metama'lumotни olib tashlaydi",
           "U doim noto'g'ri"],
          ["Показывает, где снято фото — улику, которой нет в содержимом",
           "Уменьшает фото", "Удаляет метаданные", "Всегда неверно"], 0),
        q("What does file carving (foremost/binwalk) recover?",
          "Fayl kesish (foremost/binwalk) nimани tiklaydi?",
          "Что восстанавливает вырезание файлов (foremost/binwalk)?",
          ["Files from raw bytes by their signatures, with no filesystem",
           "Deleted user accounts", "Network passwords", "Kernel modules"],
          ["Fayl tizimисиз imzolari bo'yicha xom baytlardан fayllarni",
           "O'chirilган foydalanuvchи hisoblarини", "Tarmoq parollarини", "Yadro modullarини"],
          ["Файлы из сырых байтов по сигнатурам, без файловой системы",
           "Удалённые учётки", "Сетевые пароли", "Модули ядра"], 0),
        q("Volatility's malfind detects:",
          "Volatility'ning malfind nimани aniqlaydi:",
          "malfind в Volatility обнаруживает:",
          ["Executable memory not backed by a file — injected code",
           "Weak passwords", "Deleted files on disk", "Open TCP ports"],
          ["Fayl bilan qo'llab-quvvatlanmagан bajariладиган xotira — kiritilган kod",
           "Zaif parollar", "Diskдаgi o'chirилган fayllar", "Ochiq TCP portlar"],
          ["Исполняемую память без файла — внедрённый код",
           "Слабые пароли", "Удалённые файлы на диске", "Открытые TCP-порты"], 0),
        q("Many Windows Event ID 4625 followed by a 4624 from the same source means:",
          "Bir manbадан ko'p Windows Event ID 4625, keyin 4624 nimани bildiradi:",
          "Много Windows Event ID 4625, затем 4624 из того же источника означает:",
          ["A brute-force that eventually succeeded",
           "A normal reboot", "A software update", "A cleared log"],
          ["Oxiri muvaffaqiyatли bo'lган brute-force",
           "Oddiy qayta yuklash", "Dastur yangilanishi", "Tozаланган log"],
          ["Брутфорс, в итоге удавшийся",
           "Обычную перезагрузку", "Обновление ПО", "Очищенный лог"], 0),
        q("In a pcap, exporting HTTP objects lets an investigator:",
          "pcap'да HTTP obyektlarни eksport qilish tekshiruvchига nимани beradi:",
          "В pcap экспорт HTTP-объектов позволяет следователю:",
          ["Recover the actual files transferred (downloaded malware, exfiltrated docs)",
           "Decrypt HTTPS", "Reset the attacker's password", "Block the connection"],
          ["Uzatилган haqiqiy fayllarни tiklash (yuklab olинган zararli dastur, chiqарилган hujjatlar)",
           "HTTPS'ни deshifrlash", "Hujumchи parolини tiklash", "Ulanishni bloklash"],
          ["Восстановить переданные файлы (скачанный вредонос, вынесенные документы)",
           "Расшифровать HTTPS", "Сбросить пароль атакующего", "Заблокировать соединение"], 0),
        q("An Indicator of Compromise (IOC) is used to:",
          "Buzilish ko'rsatkichи (IOC) nima uchun ishlatiladi:",
          "Индикатор компрометации (IOC) используется, чтобы:",
          ["Hunt for the same attacker across other systems",
           "Encrypt the evidence", "Speed up disk imaging", "Contain the network"],
          ["Bir xil hujumчини boshqa tizimlar bo'ylab ovlash",
           "Dalилни shifrlash", "Disk tasvirlashни tezlashtirish", "Tarmoqни cheklash"],
          ["Искать того же атакующего по другим системам",
           "Шифровать улику", "Ускорить снятие образа", "Сдержать сеть"], 0),
        q("In the IR lifecycle, containment must be done so that it:",
          "IR hayot davrida cheklash shundай qilinishi kerakki, u:",
          "В цикле IR сдерживание должно проводиться так, чтобы оно:",
          ["Stops the attacker without destroying evidence",
           "Powers off immediately", "Deletes all logs", "Formats the disk"],
          ["Dalилни yo'q qilmасдан hujумчини to'xtatadi",
           "Darrov o'chiradi", "Barcha loglarни o'chiradi", "Diskни formatlaydi"],
          ["Останавливает атакующего, не уничтожая улики",
           "Немедленно выключает", "Удаляет все логи", "Форматирует диск"], 0),
        q("The module's central lesson is that offence and defence are:",
          "Modulning markaziy darsi — hujум va himoya:",
          "Центральный урок модуля: нападение и защита —",
          ["The same knowledge, read in two directions",
           "Unrelated skills", "Only for CTFs", "Impossible to learn together"],
          ["Ikki yo'nalishда o'qилган bir xil bilim",
           "Bog'liq bo'lmаган ko'nikmalar", "Faqat CTF uchun", "Birga o'rganib bo'lmaydi"],
          ["Одно знание, читаемое в двух направлениях",
           "Несвязанные навыки", "Только для CTF", "Нельзя учить вместе"], 0),
        q("Every conclusion in a forensic report must trace to:",
          "Forenzik hisobotда har xulosa nимага bog'lanishи kerak:",
          "Каждый вывод форензического отчёта должен восходить к:",
          ["Evidence with a hash and a place in the timeline",
           "The investigator's opinion", "A guess", "The attacker's confession"],
          ["Xesh va vaqt chizig'idаgi o'ringа ega dalил",
           "Tekshiruvchи fikri", "Taxmin", "Hujумчи tan olishi"],
          ["Улике с хешем и местом в хронологии",
           "Мнению следователя", "Догадке", "Признанию атакующего"], 0),
    ],
}
