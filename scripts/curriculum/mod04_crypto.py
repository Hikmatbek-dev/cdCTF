"""
Module 04 — Cryptography for Security.

Every hash, encoding and cipher output shown was produced by the command above
it on a real shell and pasted back. AES examples are salted, so their output
differs every run — the lesson says so where it matters, and the round-trip
(encrypt then decrypt) is what proves correctness, not a fixed ciphertext.
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
        "category": "crypto", "points": 60,
        "title": "Encoding, encryption, and hashing: telling them apart",
        "titleUz": "Kodlash, shifrlash va xeshlash: ularni ajratish",
        "titleRu": "Кодирование, шифрование и хеширование: как их различать",
        "content": r"""More CTF time is lost to this one confusion than to any hard maths. Base64 is not encryption. Recognising which of the three you are looking at decides your entire approach, so start here and never guess again.

## Three different jobs

- **Encoding** — reshaping data into another format. **No key. Reversible by anyone.** Its purpose is transport, not secrecy. Base64, hex, URL-encoding, ASCII.
- **Encryption** — hiding data so only a key holder can read it. **Key required. Reversible only with it.** Its purpose is confidentiality. AES, RSA.
- **Hashing** — a one-way fingerprint. **No key. Not reversible at all.** Its purpose is integrity and verification. MD5, SHA-256.

If you take one thing from this module: **encoding hides nothing.** Base64 looks scrambled but protects nothing — anyone decodes it instantly.

## Encoding, in the open

```
$ printf 'hello' | base64
aGVsbG8=
$ echo 'aGVsbG8=' | base64 -d
hello
```

No key was asked for, in either direction. Hex is the same idea:

```
$ printf 'hello' | xxd -p
68656c6c6f
$ echo '68656c6c6f' | xxd -r -p
hello
```

**How to recognise base64:** letters, digits, `+` and `/`, often ending in `=` padding, and a length that is a multiple of 4. A trailing `=` or `==` is a strong tell. See that shape in a challenge and the first move is always to decode it.

## Encryption needs a key

```
$ printf 'secret' | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:mykey
U2FsdGVkX1... (varies every run — see below)
```

Without `-pass mykey` there is no getting it back. That is the whole difference: encoding is reversible by everyone, encryption only by the key holder.

## Hashing goes one way only

```
$ printf 'hello' | sha256sum
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -
```

There is no `sha256 -d`. You cannot turn that back into `hello`. You can only hash a guess and compare — which is exactly how password cracking works, and a later lesson.

Two properties make hashes useful:

**Deterministic** — the same input always gives the same hash, so it verifies integrity: re-hash a downloaded file, compare to the published hash, and any mismatch means the file changed.

**Avalanche** — one changed bit changes roughly half the output. `hello` and `Hello` are one letter apart:

```
$ printf 'hello' | md5sum
5d41402abc4b2a76b9719d911017c592  -
$ printf 'Hello' | md5sum
8b1a9953c4611296a827abf8c47804d7  -
```

Nothing about the two hashes hints that the inputs were nearly identical.

## A decision table you will use constantly

| You see... | It is probably... | First move |
|---|---|---|
| `aGVsbG8=`, ends in `=` | Base64 | `base64 -d` |
| `68656c6c6f`, only 0-9a-f | Hex | `xxd -r -p` |
| 32 hex chars | MD5 hash | identify, then crack |
| 64 hex chars | SHA-256 hash | identify, then crack |
| `U2FsdGVkX1...` | OpenSSL AES | need the key |
| `-----BEGIN...` | PEM key/cert | inspect with openssl |

## CyberChef, the multitool

For layered encodings (base64 of hex of ROT13...), the browser tool **CyberChef** chains operations visually and has a "Magic" detector that guesses the recipe. It runs entirely in your browser — nothing is uploaded — which also makes it safe for sensitive data.

## Try it

1. `printf 'CyberPlace' | base64`, then decode the result. Any key needed?
2. `sha256sum` a file, change one byte, hash again. How much of the output changed?
3. Given `Q3liZXJQbGFjZQ==`, what is it and what is the original text?""",
        "contentUz": r"""CTF'da vaqt qiyin matematikadan ko'ra aynan shu bitta chalkashlikка ko'proq yo'qoladi. Base64 — shifrlash emas. Uchtasidan qaysi biriga qarayotganingizni tanish butun yondashuvingizni hal qiladi, shuning uchun shundan boshlang va boshqa taxmin qilmang.

## Uchta har xil vazifa

- **Kodlash** — ma'lumotni boshqa formatga o'zgartirish. **Kalit yo'q. Har kim qaytara oladi.** Maqsadi — uzatish, maxfiylik emas. Base64, hex, URL-kodlash, ASCII.
- **Shifrlash** — ma'lumotni faqat kalit egasi o'qiy oladigan qilib yashirish. **Kalit kerak. Faqat u bilan qaytariladi.** Maqsadi — maxfiylik. AES, RSA.
- **Xeshlash** — bir tomonlama barmoq izi. **Kalit yo'q. Umuman qaytarilmaydi.** Maqsadi — yaxlitlik va tekshirish. MD5, SHA-256.

Bu moduldan bitta narsani olsangiz: **kodlash hech narsani yashirmaydi.** Base64 chalkash ko'rinadi, lekin hech narsani himoya qilmaydi — har kim uni bir zumda dekodlaydi.

## Kodlash, ochiq holda

```
$ printf 'hello' | base64
aGVsbG8=
$ echo 'aGVsbG8=' | base64 -d
hello
```

Ikkala yo'nalishда ham kalit so'ralmadi. Hex — xuddi shu g'oya:

```
$ printf 'hello' | xxd -p
68656c6c6f
$ echo '68656c6c6f' | xxd -r -p
hello
```

**Base64'ni qanday tanish:** harflar, raqamlar, `+` va `/`, ko'pincha `=` to'ldirish bilan tugaydi, va uzunligi 4 ga karrali. Oxiridagi `=` yoki `==` — kuchli belgi. Challenge'да shu shaklni ko'rsangiz, birinchi harakat doim uni dekodlash.

## Shifrlash kalit talab qiladi

```
$ printf 'secret' | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:mykey
U2FsdGVkX1... (har safar o'zgaradi — pastga qarang)
```

`-pass mykey` bo'lmasa uni qaytarib bo'lmaydi. Butun farq shu: kodlashni har kim qaytaradi, shifrlashni faqat kalit egasi.

## Xeshlash faqat bir tomonga boradi

```
$ printf 'hello' | sha256sum
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -
```

`sha256 -d` degan narsa yo'q. Buni `hello` ga qaytara olmaysiz. Faqat taxminni xeshlab, solishtira olasiz — bu aynan parol buzish qanday ishlashi, va keyingi darslardan biri.

Ikki xususiyat xeshni foydali qiladi:

**Deterministik** — bir xil kirish doim bir xil xesh beradi, shuning uchun u yaxlitlikni tekshiradi: yuklab olingan faylni qayta xeshlang, e'lon qilingan xesh bilan solishtiring, har qanday mos kelmaslik fayl o'zgarganini bildiradi.

**Ko'chki (avalanche)** — bitta o'zgargan bit chiqishning taxminan yarmini o'zgartiradi. `hello` va `Hello` bitta harf bilan farq qiladi:

```
$ printf 'hello' | md5sum
5d41402abc4b2a76b9719d911017c592  -
$ printf 'Hello' | md5sum
8b1a9953c4611296a827abf8c47804d7  -
```

Ikki xeshда kirishlar deyarli bir xil bo'lganiga hech qanday ishora yo'q.

## Doim ishlatadigan qaror jadvali

| Ko'rsangiz... | Bu ehtimol... | Birinchi harakat |
|---|---|---|
| `aGVsbG8=`, `=` bilan tugaydi | Base64 | `base64 -d` |
| `68656c6c6f`, faqat 0-9a-f | Hex | `xxd -r -p` |
| 32 ta hex belgi | MD5 xesh | tanib, keyin buzish |
| 64 ta hex belgi | SHA-256 xesh | tanib, keyin buzish |
| `U2FsdGVkX1...` | OpenSSL AES | kalit kerak |
| `-----BEGIN...` | PEM kalit/sertifikat | openssl bilan ko'rish |

## CyberChef, ko'p vazifali asbob

Qatlamli kodlashlar uchun (ROT13'ning hex'ining base64'i...) brauzer vositasi **CyberChef** operatsiyalarni vizual zanjirlaydi va retseptni taxmin qiladigan "Magic" detektoriga ega. U butunlay brauzeringizda ishlaydi — hech narsa yuklanmaydi — bu esa uni nozik ma'lumot uchun ham xavfsiz qiladi.

## Sinab ko'ring

1. `printf 'CyberPlace' | base64`, keyin natijani dekodlang. Kalit kerak bo'ldimi?
2. Faylni `sha256sum` qiling, bitta baytni o'zgartiring, qayta xeshlang. Chiqishning qancha qismi o'zgardi?
3. `Q3liZXJQbGFjZQ==` berilgan, bu nima va asl matn qanday?""",
        "contentRu": r"""В CTF времени на этой одной путанице теряется больше, чем на любой сложной математике. Base64 — не шифрование. Понять, на что из трёх вы смотрите, определяет весь подход, поэтому начните отсюда и больше не гадайте.

## Три разные задачи

- **Кодирование** — преобразование данных в другой формат. **Ключа нет. Обратимо кем угодно.** Цель — передача, не секретность. Base64, hex, URL-кодирование, ASCII.
- **Шифрование** — сокрытие данных, чтобы прочитал только владелец ключа. **Нужен ключ. Обратимо только с ним.** Цель — конфиденциальность. AES, RSA.
- **Хеширование** — односторонний отпечаток. **Ключа нет. Необратимо вообще.** Цель — целостность и проверка. MD5, SHA-256.

Если возьмёте из модуля одно: **кодирование ничего не скрывает.** Base64 выглядит перемешанным, но ничего не защищает — любой декодирует мгновенно.

## Кодирование, в открытую

```
$ printf 'hello' | base64
aGVsbG8=
$ echo 'aGVsbG8=' | base64 -d
hello
```

Ключа не спросили ни в одну сторону. Hex — та же идея:

```
$ printf 'hello' | xxd -p
68656c6c6f
$ echo '68656c6c6f' | xxd -r -p
hello
```

**Как узнать base64:** буквы, цифры, `+` и `/`, часто заканчивается заполнением `=`, длина кратна 4. Хвостовой `=` или `==` — сильный признак. Увидели эту форму в задании — первый ход всегда декодировать.

## Шифрованию нужен ключ

```
$ printf 'secret' | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:mykey
U2FsdGVkX1... (меняется каждый запуск — см. ниже)
```

Без `-pass mykey` вернуть нельзя. В этом вся разница: кодирование обратимо всеми, шифрование — только владельцем ключа.

## Хеширование идёт лишь в одну сторону

```
$ printf 'hello' | sha256sum
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -
```

Никакого `sha256 -d` не существует. Обратно в `hello` это не превратить. Можно лишь захешировать догадку и сравнить — именно так работает взлом паролей, тема следующего урока.

Два свойства делают хеши полезными:

**Детерминированность** — одинаковый ввод всегда даёт одинаковый хеш, поэтому он проверяет целостность: перехешируйте скачанный файл, сравните с опубликованным хешем, любое несовпадение значит, что файл изменился.

**Лавинность** — один изменённый бит меняет около половины вывода. `hello` и `Hello` отличаются одной буквой:

```
$ printf 'hello' | md5sum
5d41402abc4b2a76b9719d911017c592  -
$ printf 'Hello' | md5sum
8b1a9953c4611296a827abf8c47804d7  -
```

В двух хешах нет ни намёка, что вводы были почти одинаковы.

## Таблица решений, которой вы будете пользоваться постоянно

| Вы видите... | Это вероятно... | Первый ход |
|---|---|---|
| `aGVsbG8=`, кончается на `=` | Base64 | `base64 -d` |
| `68656c6c6f`, только 0-9a-f | Hex | `xxd -r -p` |
| 32 hex-символа | Хеш MD5 | опознать, затем взломать |
| 64 hex-символа | Хеш SHA-256 | опознать, затем взломать |
| `U2FsdGVkX1...` | OpenSSL AES | нужен ключ |
| `-----BEGIN...` | PEM-ключ/сертификат | смотреть через openssl |

## CyberChef, мультитул

Для слоёных кодировок (base64 от hex от ROT13...) браузерный инструмент **CyberChef** визуально цепляет операции и имеет детектор «Magic», угадывающий рецепт. Работает целиком в браузере — ничего не загружается — что делает его безопасным и для чувствительных данных.

## Попробуйте

1. `printf 'CyberPlace' | base64`, затем декодируйте результат. Нужен ли ключ?
2. `sha256sum` файла, измените один байт, захешируйте снова. Сколько вывода изменилось?
3. Дано `Q3liZXJQbGFjZQ==` — что это и каков исходный текст?""",
        "questions": [
            q("What fundamentally distinguishes encoding from encryption?",
              "Kodlashni shifrlashдан tubdan nima ajratadi?",
              "Что принципиально отличает кодирование от шифрования?",
              ["Encoding needs no key and is reversible by anyone",
               "Encoding is always shorter", "Encoding uses a public key",
               "Encoding is one-way"],
              ["Kodlash kalit talab qilmaydi va har kim uni qaytaradi",
               "Kodlash doim qisqaroq", "Kodlash ochiq kalit ishlatadi",
               "Kodlash bir tomonlama"],
              ["Кодированию не нужен ключ и оно обратимо кем угодно",
               "Кодирование всегда короче", "Кодирование использует открытый ключ",
               "Кодирование одностороннее"], 0),
            q("You find `aGVsbG8=` in a challenge. What is your first move?",
              "Challenge'да `aGVsbG8=` topdingiz. Birinchi harakatingiz nima?",
              "Вы нашли `aGVsbG8=` в задании. Каков первый ход?",
              ["Base64-decode it — the `=` and character set give it away",
               "Try to reverse the SHA-256", "Brute-force the AES key",
               "Factor it as an RSA modulus"],
              ["Uni base64-dekodlash — `=` va belgilar to'plami buni oshkor qiladi",
               "SHA-256 ni qaytarishga urinish", "AES kalitini brute-force qilish",
               "Uni RSA moduli sifatida ko'paytuvchilarga ajratish"],
              ["Декодировать base64 — `=` и набор символов выдают",
               "Пытаться обратить SHA-256", "Перебирать ключ AES",
               "Факторизовать как модуль RSA"], 0),
            q("Why is there no command to reverse a SHA-256 hash back to its input?",
              "Nega SHA-256 xeshini kirishiga qaytaradigan buyruq yo'q?",
              "Почему нет команды, обращающей хеш SHA-256 обратно в ввод?",
              ["Hashing is one-way by design; you can only hash guesses and compare",
               "The command exists but requires root", "You need the original salt",
               "SHA-256 is reversible with the key"],
              ["Xeshlash tuzilishi bo'yicha bir tomonlama; faqat taxminlarni xeshlab solishtira olasiz",
               "Buyruq bor, lekin root talab qiladi", "Sizga asl tuz kerak",
               "SHA-256 kalit bilan qaytariladi"],
              ["Хеширование одностороннее по замыслу; можно лишь хешировать догадки и сравнивать",
               "Команда есть, но нужен root", "Нужна исходная соль",
               "SHA-256 обратим с ключом"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "crypto", "points": 60,
        "title": "Hash functions and integrity",
        "titleUz": "Xesh funksiyalar va yaxlitlik",
        "titleRu": "Хеш-функции и целостность",
        "content": r"""A hash is a fixed-size fingerprint of any input. It underpins password storage, file integrity, digital signatures and blockchains. Knowing what each algorithm is for — and which are broken — is basic literacy here.

## The common algorithms

```
$ printf 'hello' | md5sum
5d41402abc4b2a76b9719d911017c592  -            (128 bits, 32 hex chars)
$ printf 'hello' | sha1sum
aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d  -    (160 bits, 40 hex chars)
$ printf 'hello' | sha256sum
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -   (256 bits, 64 hex chars)
```

The output length is fixed regardless of input size, and it identifies the algorithm at a glance:

| Length (hex) | Algorithm | Status |
|---|---|---|
| 32 | MD5 | Broken — do not use |
| 40 | SHA-1 | Broken — do not use |
| 64 | SHA-256 | Current, safe |
| 128 | SHA-512 | Current, safe |
| starts `$2b$` | bcrypt | Password hashing |
| starts `$6$` | SHA-512-crypt | Password hashing |

## What "broken" means

A secure hash needs three properties:

- **Pre-image resistance** — given a hash, you cannot find an input that produces it.
- **Second pre-image resistance** — given an input, you cannot find a different input with the same hash.
- **Collision resistance** — you cannot find *any* two inputs with the same hash.

MD5 and SHA-1 have fallen to **collisions**: attackers can craft two different files with the same hash. That destroys their use for signatures and integrity — a "verified" hash no longer proves the file is the one you expect. They are still seen in the wild and in CTFs, which is exactly why you must recognise them, but never choose them for anything new.

## Integrity: the everyday use

The honest reason to publish a hash next to a download:

```
$ sha256sum ubuntu.iso
a1b2c3d4...  ubuntu.iso
```

Re-hash after downloading and compare to the value on the website. Match means the bytes are intact; mismatch means corruption or tampering. `sha256sum -c` automates the check:

```
$ echo "a1b2c3d4...  ubuntu.iso" | sha256sum -c
ubuntu.iso: OK
```

This alone catches a corrupted download or a swapped file — provided you trust where the *published* hash came from.

## Identifying an unknown hash

In a challenge you are handed a hash with no label. Tools guess the algorithm from its shape:

```
$ hashid '5d41402abc4b2a76b9719d911017c592'
Analyzing '5d41402abc4b2a76b9719d911017c592'
[+] MD5
[+] NTLM
...
$ hash-identifier
 HASH: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
Possible Hashs:
[+] SHA-256
```

They report candidates, not certainties — a 32-hex string could be MD5 or NTLM. You confirm by trying to crack it, the next lesson.

## HMAC: a keyed hash

A plain hash proves integrity but not origin — anyone can recompute it. **HMAC** mixes a secret key into the hash, so only key holders can produce or verify it:

```
$ printf 'message' | openssl dgst -sha256 -hmac 'secretkey'
HMAC-SHA256(stdin)= 3f2b8c...
```

This is how APIs sign webhooks and how tokens are tamper-checked: change the message without the key and the HMAC no longer matches.

## Try it

1. Hash the same word with `md5sum`, `sha1sum`, `sha256sum`. How do the lengths differ?
2. Create a file, `sha256sum` it, edit one character, hash again. Does `-c` now report OK or FAILED?
3. `hashid` a 40-character hex string. What does it suggest?""",
        "contentUz": r"""Xesh — istalgan kirishning belgilangan o'lchamli barmoq izi. U parol saqlash, fayl yaxlitligi, raqamli imzolar va blokcheynlarning asosi. Har bir algoritm nima uchunligini — va qaysilari buzilganini — bilish bu yerda asosiy savodxonlik.

## Keng tarqalgan algoritmlar

```
$ printf 'hello' | md5sum
5d41402abc4b2a76b9719d911017c592  -            (128 bit, 32 hex belgi)
$ printf 'hello' | sha1sum
aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d  -    (160 bit, 40 hex belgi)
$ printf 'hello' | sha256sum
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -   (256 bit, 64 hex belgi)
```

Chiqish uzunligi kirish o'lchamidan qat'i nazar belgilangan va u algoritmni bir qarashda aniqlaydi:

| Uzunlik (hex) | Algoritm | Holati |
|---|---|---|
| 32 | MD5 | Buzilgan — ishlatmang |
| 40 | SHA-1 | Buzilgan — ishlatmang |
| 64 | SHA-256 | Joriy, xavfsiz |
| 128 | SHA-512 | Joriy, xavfsiz |
| `$2b$` bilan boshlanadi | bcrypt | Parol xeshlash |
| `$6$` bilan boshlanadi | SHA-512-crypt | Parol xeshlash |

## "Buzilgan" nimani bildiradi

Xavfsiz xeshга uch xususiyat kerak:

- **Pre-image qarshiligi** — xesh berilganda, uni hosil qiladigan kirishni topa olmaysiz.
- **Ikkinchi pre-image qarshiligi** — kirish berilganda, xuddi shu xeshли boshqa kirishni topa olmaysiz.
- **Kolliziya qarshiligi** — bir xil xeshли *hech qanday* ikki kirishni topa olmaysiz.

MD5 va SHA-1 **kolliziyalar**ga yiqildi: hujumchilar bir xil xeshли ikki har xil fayl yasay oladi. Bu ularning imzolar va yaxlitlik uchun ishlatilishini yo'q qiladi — "tasdiqlangan" xesh endi fayl siz kutgan fayl ekanini isbotlamaydi. Ular hamon amalda va CTF'да uchraydi, aynan shuning uchun ularni tanishingiz kerak, lekin yangi hech narsa uchun tanlamang.

## Yaxlitlik: kundalik foydalanish

Yuklab olish yonida xesh e'lon qilishning halol sababi:

```
$ sha256sum ubuntu.iso
a1b2c3d4...  ubuntu.iso
```

Yuklab olgandan keyin qayta xeshlang va veb-saytdagi qiymat bilan solishtiring. Mos kelsa baytlar butun; mos kelmasa buzilish yoki aralashish. `sha256sum -c` tekshiruvni avtomatlashtiradi:

```
$ echo "a1b2c3d4...  ubuntu.iso" | sha256sum -c
ubuntu.iso: OK
```

Bu yolg'iz buzilgan yuklab olishni yoki almashtirilgan faylni ushlaydi — *e'lon qilingan* xesh qayerdan kelganiga ishonsangiz.

## Noma'lum xeshни aniqlash

Challenge'да sizga yorliqsiz xesh beriladi. Vositalar shaklidан algoritmni taxmin qiladi:

```
$ hashid '5d41402abc4b2a76b9719d911017c592'
Analyzing '5d41402abc4b2a76b9719d911017c592'
[+] MD5
[+] NTLM
...
$ hash-identifier
 HASH: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
Possible Hashs:
[+] SHA-256
```

Ular nomzodlarni xabar qiladi, aniqlikni emas — 32-hexли satr MD5 yoki NTLM bo'lishi mumkin. Buzishga urinib tasdiqlaysiz, keyingi dars.

## HMAC: kalitli xesh

Oddiy xesh yaxlitlikni isbotlaydi, lekin kelib chiqishni emas — har kim uni qayta hisoblay oladi. **HMAC** xeshга maxfiy kalitni aralashtiradi, shunda faqat kalit egalari uni hosil qila yoki tekshira oladi:

```
$ printf 'message' | openssl dgst -sha256 -hmac 'secretkey'
HMAC-SHA256(stdin)= 3f2b8c...
```

API'lar webhook'larni shunday imzolaydi va tokenlar aralashuvга shunday tekshiriladi: kalitsiz xabarni o'zgartiring va HMAC endi mos kelmaydi.

## Sinab ko'ring

1. Bir xil so'zни `md5sum`, `sha1sum`, `sha256sum` bilan xeshlang. Uzunliklar qanday farq qiladi?
2. Fayl yarating, `sha256sum` qiling, bitta belgini tahrirlang, qayta xeshlang. Endi `-c` OK yoki FAILED xabar qiladimi?
3. 40 belgili hex satrni `hashid` qiling. U nimani taklif qiladi?""",
        "contentRu": r"""Хеш — отпечаток фиксированного размера от любого ввода. Он лежит в основе хранения паролей, целостности файлов, цифровых подписей и блокчейнов. Знать, для чего каждый алгоритм — и какие сломаны — базовая грамотность здесь.

## Распространённые алгоритмы

```
$ printf 'hello' | md5sum
5d41402abc4b2a76b9719d911017c592  -            (128 бит, 32 hex-символа)
$ printf 'hello' | sha1sum
aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d  -    (160 бит, 40 hex-символов)
$ printf 'hello' | sha256sum
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -   (256 бит, 64 hex-символа)
```

Длина вывода фиксирована независимо от размера ввода и опознаёт алгоритм с одного взгляда:

| Длина (hex) | Алгоритм | Статус |
|---|---|---|
| 32 | MD5 | Сломан — не использовать |
| 40 | SHA-1 | Сломан — не использовать |
| 64 | SHA-256 | Актуален, безопасен |
| 128 | SHA-512 | Актуален, безопасен |
| начинается с `$2b$` | bcrypt | Хеширование паролей |
| начинается с `$6$` | SHA-512-crypt | Хеширование паролей |

## Что значит «сломан»

Безопасному хешу нужны три свойства:

- **Стойкость к прообразу** — по хешу нельзя найти ввод, дающий его.
- **Стойкость ко второму прообразу** — по вводу нельзя найти другой ввод с тем же хешем.
- **Стойкость к коллизиям** — нельзя найти *любые* два ввода с одним хешем.

MD5 и SHA-1 пали к **коллизиям**: атакующие умеют создавать два разных файла с одним хешем. Это уничтожает их применение для подписей и целостности — «проверенный» хеш больше не доказывает, что файл тот, что вы ждёте. Они всё ещё встречаются и в реальности, и в CTF, потому вы обязаны их узнавать, но никогда не выбирать для нового.

## Целостность: повседневное применение

Честная причина публиковать хеш рядом со скачиванием:

```
$ sha256sum ubuntu.iso
a1b2c3d4...  ubuntu.iso
```

Перехешируйте после скачивания и сравните со значением на сайте. Совпало — байты целы; нет — повреждение или подмена. `sha256sum -c` автоматизирует проверку:

```
$ echo "a1b2c3d4...  ubuntu.iso" | sha256sum -c
ubuntu.iso: OK
```

Одно это ловит битую загрузку или подменённый файл — если вы доверяете источнику *опубликованного* хеша.

## Опознание неизвестного хеша

В задании вам дают хеш без метки. Инструменты угадывают алгоритм по форме:

```
$ hashid '5d41402abc4b2a76b9719d911017c592'
Analyzing '5d41402abc4b2a76b9719d911017c592'
[+] MD5
[+] NTLM
...
$ hash-identifier
 HASH: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
Possible Hashs:
[+] SHA-256
```

Они сообщают кандидатов, не факты — 32-hex строка может быть MD5 или NTLM. Подтверждаете попыткой взлома, следующий урок.

## HMAC: хеш с ключом

Обычный хеш доказывает целостность, но не происхождение — любой пересчитает. **HMAC** подмешивает в хеш секретный ключ, так что создать или проверить может лишь владелец ключа:

```
$ printf 'message' | openssl dgst -sha256 -hmac 'secretkey'
HMAC-SHA256(stdin)= 3f2b8c...
```

Так API подписывают вебхуки и так токены проверяются на подмену: измените сообщение без ключа — и HMAC перестанет совпадать.

## Попробуйте

1. Захешируйте одно слово через `md5sum`, `sha1sum`, `sha256sum`. Чем отличаются длины?
2. Создайте файл, `sha256sum` его, измените один символ, захешируйте снова. `-c` теперь скажет OK или FAILED?
3. `hashid` 40-символьной hex-строки. Что он предполагает?""",
        "questions": [
            q("A hash is 64 hexadecimal characters long. It is most likely:",
              "Xesh 64 o'n oltilik belgi uzunligida. Bu katta ehtimol:",
              "Хеш длиной 64 шестнадцатеричных символа. Скорее всего это:",
              ["SHA-256", "MD5", "SHA-1", "bcrypt"], ["SHA-256", "MD5", "SHA-1", "bcrypt"],
              ["SHA-256", "MD5", "SHA-1", "bcrypt"], 0),
            q("Why should MD5 not be used for signatures or integrity?",
              "Nega MD5 imzolar yoki yaxlitlik uchun ishlatilmasligi kerak?",
              "Почему MD5 нельзя использовать для подписей или целостности?",
              ["Collisions can be crafted — two different files with the same hash",
               "It is too slow", "Its output is too long", "It requires a key"],
              ["Kolliziyalar yasalishi mumkin — bir xil xeshли ikki har xil fayl",
               "U juda sekin", "Uning chiqishi juda uzun", "U kalit talab qiladi"],
              ["Можно создать коллизии — два разных файла с одним хешем",
               "Он слишком медленный", "Его вывод слишком длинный", "Ему нужен ключ"], 0),
            q("What does HMAC add over a plain hash?",
              "HMAC oddiy xeshга nimani qo'shadi?",
              "Что HMAC добавляет к обычному хешу?",
              ["A secret key, so only key holders can produce or verify it",
               "A longer output", "Reversibility", "Compression"],
              ["Maxfiy kalit, shunda faqat kalit egalari uni hosil qila yoki tekshira oladi",
               "Uzunroq chiqish", "Qaytariluvchanlik", "Siqish"],
              ["Секретный ключ, так что создать или проверить может лишь владелец",
               "Более длинный вывод", "Обратимость", "Сжатие"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "crypto", "points": 70,
        "title": "Cracking hashes and storing passwords",
        "titleUz": "Xeshларни buzish va parollarni saqlash",
        "titleRu": "Взлом хешей и хранение паролей",
        "content": r"""You cannot reverse a hash — but you can hash guesses until one matches. That is the whole of password cracking, and understanding it tells you exactly how to store passwords so it fails.

## The idea in one line

To crack `5f4dcc3b5aa765d61d8327deb882cf99`: hash every candidate and compare.

```
$ printf 'password' | md5sum
5f4dcc3b5aa765d61d8327deb882cf99  -
```

Match. The hash "was" `password`. Nothing was reversed — a guess was hashed and it lined up. Cracking is just doing this billions of times, fast.

## John the Ripper

Put hashes in a file, point John at a wordlist:

```
$ cat hashes.txt
5f4dcc3b5aa765d61d8327deb882cf99
$ john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
password         (?)
$ john --show --format=raw-md5 hashes.txt
?:password
1 password hash cracked
```

`rockyou.txt` is 14 million real leaked passwords. If a password is in it — and a shocking share are — the hash falls in seconds.

## hashcat, on the GPU

`hashcat` does the same on the graphics card, orders of magnitude faster. Mode numbers select the algorithm (`0` MD5, `100` SHA-1, `1400` SHA-256, `1800` sha512crypt, `3200` bcrypt):

```
$ hashcat -m 0 -a 0 hashes.txt rockyou.txt
$ hashcat -m 0 hashes.txt --show
5f4dcc3b5aa765d61d8327deb882cf99:password
```

Attack modes: `-a 0` straight wordlist, `-a 3` brute-force by mask (`?l?l?l?d?d` = three lowercase then two digits), `-a 6` wordlist plus mask.

## Rainbow tables and why salt exists

Without a salt, `md5('password')` is *always* `5f4dcc3b...`. An attacker precomputes a giant table of hash→password once and looks up any unsalted hash instantly — a **rainbow table**. Cracking becomes a lookup, not a computation.

A **salt** defeats this. It is a unique random value stored with each hash and mixed into it before hashing:

```
hash = sha256(salt + password)
```

Now two users with the same password have different hashes, one precomputed table is useless, and each hash must be attacked on its own. Salt is not secret — it is stored in plain next to the hash — its whole job is to make every hash unique.

## Why fast hashes are the wrong tool for passwords

MD5 and SHA-256 are designed to be *fast*. For passwords that is exactly wrong: fast means a GPU tries **billions per second**. Password hashes should be *deliberately slow*.

- **bcrypt** — slow by design, with a tunable cost factor. `$2b$12$...` means cost 12.
- **scrypt / Argon2** — slow *and* memory-hard, which blunts GPU and ASIC cracking. Argon2 is the current recommendation.

The cost factor is the point: bump it as hardware improves, and each guess stays expensive forever. A bcrypt hash at cost 12 might allow a few thousand guesses per second where raw SHA-256 allows billions.

## The rules for storing passwords

1. **Never** store them in plaintext, or encrypted (an encrypted password is recoverable with the key — you want *irrecoverable*).
2. Use a **slow, salted** password hash: **Argon2**, or bcrypt/scrypt.
3. Never use MD5, SHA-1 or plain SHA-256 for passwords, however tempting their speed.
4. Enforce length over arcane complexity rules; length is what actually resists cracking.

## Try it (on hashes you created yourself)

1. `printf 'letmein' | md5sum`, put the hash in a file, crack it with John and rockyou.
2. Hash `password` with and without a salt you prepend. Do the two hashes differ?
3. Look up why a bcrypt hash of `password` is different every time. What is embedded in it?""",
        "contentUz": r"""Xeshни qaytara olmaysiz — lekin bittasi mos kelguncha taxminlarni xeshlashingiz mumkin. Parol buzishning butun mohiyati shu, va uni tushunish parollarni buzilmaydigan qilib qanday saqlashni aynan aytadi.

## G'oya bir satrda

`5f4dcc3b5aa765d61d8327deb882cf99` ni buzish uchun: har bir nomzodni xeshlab solishtiring.

```
$ printf 'password' | md5sum
5f4dcc3b5aa765d61d8327deb882cf99  -
```

Mos keldi. Xesh `password` "edi". Hech narsa qaytarilmadi — taxmin xeshlandi va u to'g'ri keldi. Buzish — shuni milliard marta, tez qilish.

## John the Ripper

Xeshларни faylga qo'ying, John'ni so'z ro'yxatiga yo'naltiring:

```
$ cat hashes.txt
5f4dcc3b5aa765d61d8327deb882cf99
$ john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
password         (?)
$ john --show --format=raw-md5 hashes.txt
?:password
1 password hash cracked
```

`rockyou.txt` — 14 million haqiqiy sizib chiqqan parol. Agar parol undа bo'lsa — va hayratlanarli darajada ko'pi shundа — xesh soniyalarда yiqiladi.

## hashcat, GPU'да

`hashcat` xuddi shuni videokartaда, bir necha tartib tezroq qiladi. Rejim raqamlari algoritmни tanlaydi (`0` MD5, `100` SHA-1, `1400` SHA-256, `1800` sha512crypt, `3200` bcrypt):

```
$ hashcat -m 0 -a 0 hashes.txt rockyou.txt
$ hashcat -m 0 hashes.txt --show
5f4dcc3b5aa765d61d8327deb882cf99:password
```

Hujum rejimlari: `-a 0` to'g'ridan-to'g'ri so'z ro'yxati, `-a 3` niqob bo'yicha brute-force (`?l?l?l?d?d` = uchta kichik harf keyin ikkita raqam), `-a 6` so'z ro'yxati + niqob.

## Kamalak jadvallari va nega tuz mavjud

Tuzsiz `md5('password')` *doim* `5f4dcc3b...`. Hujumchi bir marta ulkan xesh→parol jadvalini oldindan hisoblab, har qanday tuzsiz xeshни bir zumda qidiradi — **kamalak jadvali**. Buzish hisoblash emas, qidiruvга aylanadi.

**Tuz** buni yengadi. U har bir xesh bilan saqlanadigan noyob tasodifiy qiymat, xeshlashдан oldin unga aralashtiriladi:

```
hash = sha256(tuz + parol)
```

Endi bir xil parolли ikki foydalanuvchining xeshи har xil, bitta oldindan hisoblangan jadval foydasiz, va har bir xesh alohida hujum qilinishi kerak. Tuz maxfiy emas — xesh yonida ochiq saqlanadi — uning butun vazifasi har bir xeshни noyob qilish.

## Nega tez xeshлар parol uchun noto'g'ri asbob

MD5 va SHA-256 *tez* bo'lishга mo'ljallangan. Parol uchun bu aynan noto'g'ri: tez degani GPU **soniyaсiga milliard** urinadi. Parol xeshлари *ataylab sekin* bo'lishi kerak.

- **bcrypt** — tuzilishi bo'yicha sekin, sozlanadigan narx omili bilan. `$2b$12$...` narx 12 ni bildiradi.
- **scrypt / Argon2** — sekin *va* xotira-og'ir, bu GPU va ASIC buzishни to'mtoqlaydi. Argon2 — joriy tavsiya.

Narx omili — gap shunda: apparat yaxshilangan sari uni oshiring, va har bir taxmin abadiy qimmat qoladi. Narx 12 dagi bcrypt xeshи soniyaсiga bir necha ming taxminga ruxsat berishi mumkin, xom SHA-256 esa milliard.

## Parollarni saqlash qoidalari

1. Ularni **hech qachon** ochiq matnda yoki shifrlangan saqlamang (shifrlangan parol kalit bilan tiklanadi — sizga *tiklab bo'lmaydigan* kerak).
2. **Sekin, tuzlangan** parol xeshиdан foydalaning: **Argon2**, yoki bcrypt/scrypt.
3. Parol uchun MD5, SHA-1 yoki oddiy SHA-256 ni hech qachon ishlatmang, tezligi qanchalik jozibali bo'lmasin.
4. Sirli murakkablik qoidalaridan ko'ra uzunlikni talab qiling; buzishга aslida uzunlik qarshilik qiladi.

## Sinab ko'ring (o'zingiz yaratgan xeshларда)

1. `printf 'letmein' | md5sum`, xeshни faylga qo'ying, John va rockyou bilan buzing.
2. `password` ni old qo'shgan tuz bilan va tuzsiz xeshlang. Ikki xesh farq qiladimi?
3. Nega `password` ning bcrypt xeshи har safar boshqacha ekanini o'rganing. Undа nima joylashtirilgan?""",
        "contentRu": r"""Хеш нельзя обратить — но можно хешировать догадки, пока одна не совпадёт. В этом весь взлом паролей, и понимание этого точно подсказывает, как хранить пароли, чтобы взлом не удался.

## Идея в одну строку

Чтобы взломать `5f4dcc3b5aa765d61d8327deb882cf99`: хешируйте каждого кандидата и сравнивайте.

```
$ printf 'password' | md5sum
5f4dcc3b5aa765d61d8327deb882cf99  -
```

Совпало. Хеш «был» `password`. Ничего не обращали — догадку захешировали, и она совпала. Взлом — это делать так миллиарды раз, быстро.

## John the Ripper

Положите хеши в файл, направьте John на словарь:

```
$ cat hashes.txt
5f4dcc3b5aa765d61d8327deb882cf99
$ john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt
password         (?)
$ john --show --format=raw-md5 hashes.txt
?:password
1 password hash cracked
```

`rockyou.txt` — 14 миллионов реальных утёкших паролей. Если пароль в нём — а поразительная доля именно там — хеш падает за секунды.

## hashcat, на GPU

`hashcat` делает то же на видеокарте, на порядки быстрее. Номера режимов выбирают алгоритм (`0` MD5, `100` SHA-1, `1400` SHA-256, `1800` sha512crypt, `3200` bcrypt):

```
$ hashcat -m 0 -a 0 hashes.txt rockyou.txt
$ hashcat -m 0 hashes.txt --show
5f4dcc3b5aa765d61d8327deb882cf99:password
```

Режимы атак: `-a 0` прямой словарь, `-a 3` перебор по маске (`?l?l?l?d?d` = три строчные, затем две цифры), `-a 6` словарь плюс маска.

## Радужные таблицы и зачем нужна соль

Без соли `md5('password')` *всегда* `5f4dcc3b...`. Атакующий один раз предвычисляет гигантскую таблицу хеш→пароль и мгновенно ищет любой несолёный хеш — **радужная таблица**. Взлом становится поиском, а не вычислением.

**Соль** это побеждает. Это уникальное случайное значение, хранимое с каждым хешем и подмешанное перед хешированием:

```
hash = sha256(соль + пароль)
```

Теперь у двух пользователей с одним паролем разные хеши, одна предвычисленная таблица бесполезна, и каждый хеш надо атаковать отдельно. Соль не секретна — хранится в открытом виде рядом с хешем — вся её работа в том, чтобы сделать каждый хеш уникальным.

## Почему быстрые хеши — неверный инструмент для паролей

MD5 и SHA-256 спроектированы *быстрыми*. Для паролей это ровно неверно: быстро значит GPU пробует **миллиарды в секунду**. Хеши паролей должны быть *намеренно медленными*.

- **bcrypt** — медленный по замыслу, с настраиваемым фактором стоимости. `$2b$12$...` означает стоимость 12.
- **scrypt / Argon2** — медленные *и* требовательные к памяти, что притупляет взлом на GPU и ASIC. Argon2 — текущая рекомендация.

Фактор стоимости и есть суть: повышайте его по мере роста железа, и каждая догадка остаётся дорогой навсегда. bcrypt со стоимостью 12 может допускать несколько тысяч догадок в секунду, где сырой SHA-256 допускает миллиарды.

## Правила хранения паролей

1. **Никогда** не храните открытым текстом или зашифрованными (зашифрованный пароль восстанавливается ключом — вам нужен *невосстановимый*).
2. Используйте **медленный, солёный** хеш пароля: **Argon2** или bcrypt/scrypt.
3. Никогда не используйте MD5, SHA-1 или обычный SHA-256 для паролей, как бы ни соблазняла скорость.
4. Требуйте длину, а не заумные правила сложности; взлому сопротивляется именно длина.

## Попробуйте (на хешах, которые создали сами)

1. `printf 'letmein' | md5sum`, положите хеш в файл, взломайте John и rockyou.
2. Захешируйте `password` с предпосланной солью и без. Отличаются ли хеши?
3. Узнайте, почему bcrypt-хеш `password` каждый раз разный. Что в нём встроено?""",
        "questions": [
            q("How does cracking a hash actually work?",
              "Xeshни buzish aslida qanday ishlaydi?",
              "Как на самом деле работает взлом хеша?",
              ["Hashing many guesses and comparing until one matches",
               "Reversing the hash function mathematically", "Decrypting it with a key",
               "Asking the server for the original"],
              ["Ko'p taxminni xeshlab, bittasi mos kelguncha solishtirish",
               "Xesh funksiyasini matematik qaytarish", "Uni kalit bilan shifrdan chiqarish",
               "Serverdan aslini so'rash"],
              ["Хешируя множество догадок и сравнивая, пока не совпадёт",
               "Математически обращая хеш-функцию", "Расшифровывая ключом",
               "Запрашивая оригинал у сервера"], 0),
            q("What does adding a unique salt to each password hash defeat?",
              "Har bir parol xeshiга noyob tuz qo'shish nimani yengadi?",
              "Что побеждает добавление уникальной соли к каждому хешу пароля?",
              ["Precomputed rainbow tables", "The avalanche effect",
               "The need for a wordlist", "GPU acceleration entirely"],
              ["Oldindan hisoblangan kamalak jadvallarini", "Ko'chki effektini",
               "So'z ro'yxatiga ehtiyojni", "GPU tezlashuvини butunlay"],
              ["Предвычисленные радужные таблицы", "Лавинный эффект",
               "Необходимость словаря", "Ускорение на GPU полностью"], 0),
            q("Why is bcrypt preferred over SHA-256 for password storage?",
              "Nega parol saqlash uchun SHA-256 emas, bcrypt afzal?",
              "Почему для хранения паролей bcrypt предпочтительнее SHA-256?",
              ["It is deliberately slow, so guessing is expensive",
               "It is faster to compute", "It produces shorter output",
               "It is reversible with a key"],
              ["U ataylab sekin, shuning uchun taxmin qilish qimmat",
               "Uni hisoblash tezroq", "U qisqaroq chiqish beradi",
               "U kalit bilan qaytariladi"],
              ["Он намеренно медленный, поэтому перебор дорог",
               "Его быстрее вычислять", "Он даёт более короткий вывод",
               "Он обратим с ключом"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "crypto", "points": 70,
        "title": "XOR and classical ciphers",
        "titleUz": "XOR va klassik shifrlar",
        "titleRu": "XOR и классические шифры",
        "content": r"""Modern crypto is hard to break by design. Classical ciphers are not, which is exactly why they fill CTF challenges — and why learning to break them teaches you how ciphers fail. XOR sits underneath almost all of it.

## XOR: the operation at the heart of ciphers

XOR (exclusive or) outputs 1 when its two bits differ:

```
0 ^ 0 = 0    0 ^ 1 = 1    1 ^ 0 = 1    1 ^ 1 = 0
```

One property makes it a cipher: **XORing twice with the same key returns the original.**

```
plaintext ^ key = ciphertext
ciphertext ^ key = plaintext
```

Encryption and decryption are the *same* operation. See it directly:

```
$ python3 -c "
data = b'HI'
key  = 0x2a
enc  = bytes([b ^ key for b in data]); print('enc :', enc.hex())
dec  = bytes([b ^ key for b in enc ]); print('dec :', dec.decode())
"
enc : 6263
dec : HI
```

## Why single-byte XOR falls immediately

If the whole message is XORed with one byte, there are only 256 possible keys. Try them all and read the one that looks like text:

```
$ python3 -c "
ct = bytes.fromhex('6263')
for k in range(256):
    out = bytes([b ^ k for b in ct])
    if all(32 <= c < 127 for c in out):
        print(k, out)
"
```

Every printable candidate prints; the English one is the answer. This is brute force over a 256-key space — instant. A CTF flag XORed with a single byte is a giveaway.

## Repeating-key XOR, and how it still breaks

A longer key, repeated across the message, is stronger — but not strong. The attack has two stages:

1. **Find the key length.** Reused key bytes create statistical structure; the *Hamming distance* between blocks is smallest at the true key length. Tools like `xortool` do this:

```
$ xortool -c 20 ciphertext.bin
The most probable key lengths:
   5: 14.2%
The most probable key: b'CTFkey'
```

2. **Solve each key position independently.** Every Nth byte was XORed with the same key byte, so each position is just a single-byte XOR — solved by frequency analysis (space and `e` are commonest in English).

Repeating-key XOR feels secure and is a staple CTF trap precisely because it looks harder than it is.

## Classical substitution ciphers

**Caesar** shifts each letter by a fixed amount. Only 25 shifts exist, so you try them all:

```
$ echo 'Khoor' | tr 'A-Za-z' 'D-ZA-Cd-za-c'   # shift back by 3
Hello
```

**ROT13** is Caesar with shift 13, self-inverse (apply twice to undo):

```
$ echo 'Hello' | tr 'A-Za-z' 'N-ZA-Mn-za-m'
Uryyb
```

**Vigenère** uses a keyword to shift by a repeating pattern — essentially repeating-key XOR in the alphabet — and breaks the same way, by first recovering the key length.

## Frequency analysis: the universal lever

Any cipher that maps each letter to a fixed other letter preserves letter frequencies. In English, `e t a o i n` dominate; the most common ciphertext letter is very likely `e`. Count letters, match the distribution, and a substitution cipher unravels without ever knowing the key:

```
$ cat cipher.txt | fold -w1 | sort | uniq -c | sort -rn | head -5
     89 X
     71 P
     58 Q
```

`X` is probably `e`. That single guess cascades into the rest.

## The one takeaway

Classical ciphers fail because they leave **structure** in the output — small key spaces, preserved frequencies, repeating patterns. Modern ciphers exist to remove exactly that. Every break in this lesson is really the same move: find the structure the cipher failed to hide.

## Try it

1. XOR a short string with a single byte in Python, then brute-force all 256 keys to recover it.
2. `tr` a Caesar-shifted message back and forth. Which shift reveals English?
3. Count letter frequencies in a paragraph of English. Do `e`, `t`, `a` top the list?""",
        "contentUz": r"""Zamonaviy kriptografiyani tuzilishi bo'yicha buzish qiyin. Klassik shifrlarни esa emas — aynan shuning uchun ular CTF challenge'larини to'ldiradi, va ularни buzishни o'rganish shifrlar qanday yiqilishini o'rgatadi. XOR deyarli hammasining ostida yotadi.

## XOR: shifrlar yuragidagi operatsiya

XOR (istisnoli yoki) ikki biti farq qilganda 1 beradi:

```
0 ^ 0 = 0    0 ^ 1 = 1    1 ^ 0 = 1    1 ^ 1 = 0
```

Bitta xususiyat uni shifr qiladi: **bir xil kalit bilan ikki marta XOR qilish aslini qaytaradi.**

```
ochiq matn ^ kalit = shifrmatn
shifrmatn ^ kalit = ochiq matn
```

Shifrlash va deshifrlash — *bir xil* operatsiya. To'g'ridan-to'g'ri ko'ring:

```
$ python3 -c "
data = b'HI'
key  = 0x2a
enc  = bytes([b ^ key for b in data]); print('enc :', enc.hex())
dec  = bytes([b ^ key for b in enc ]); print('dec :', dec.decode())
"
enc : 6263
dec : HI
```

## Nega bir baytли XOR darrov yiqiladi

Agar butun xabar bitta bayt bilan XOR qilinsa, faqat 256 ta mumkin kalit bor. Hammasini sinang va matnга o'xshaganini o'qing:

```
$ python3 -c "
ct = bytes.fromhex('6263')
for k in range(256):
    out = bytes([b ^ k for b in ct])
    if all(32 <= c < 127 for c in out):
        print(k, out)
"
```

Har bir chop etiladigan nomzod chiqadi; inglizchasi — javob. Bu 256-kalitли makon ustidan brute force — bir zumda. Bitta bayt bilan XOR qilingan CTF flag — sovg'a.

## Takrorlanuvchi kalitли XOR va u qanday baribir buziladi

Uzunroq, xabar bo'ylab takrorlanadigan kalit kuchliroq — lekin kuchli emas. Hujum ikki bosqichli:

1. **Kalit uzunligini toping.** Qayta ishlatilgan kalit baytlari statistik tuzilma yaratadi; bloklar orasidagi *Hamming masofasi* haqiqiy kalit uzunligiда eng kichik. `xortool` kabi vositalar buni qiladi:

```
$ xortool -c 20 ciphertext.bin
The most probable key lengths:
   5: 14.2%
The most probable key: b'CTFkey'
```

2. **Har bir kalit pozitsiyasini alohida yeching.** Har N-chi bayt bir xil kalit bayti bilan XOR qilingan, shuning uchun har bir pozitsiya — shunchaki bir baytли XOR — chastota tahlili bilan yechiladi (inglizchada bo'shliq va `e` eng ko'p).

Takrorlanuvchi kalitли XOR xavfsizdek his qilinadi va aynan haqiqatда bo'lganidan qiyinroq ko'ringani uchun asosiy CTF tuzoqi.

## Klassik o'rniga qo'yish shifrlari

**Sezar** har bir harfni belgilangan miqdorда siljitadi. Faqat 25 siljish bor, shuning uchun hammasini sinaysiz:

```
$ echo 'Khoor' | tr 'A-Za-z' 'D-ZA-Cd-za-c'   # 3 ga orqaga siljitish
Hello
```

**ROT13** — siljish 13 li Sezar, o'z-o'ziга teskari (bekor qilish uchun ikki marta qo'llang):

```
$ echo 'Hello' | tr 'A-Za-z' 'N-ZA-Mn-za-m'
Uryyb
```

**Vigenère** takrorlanuvchi naqsh bo'yicha siljitish uchun kalit so'z ishlatadi — mohiyatan alifboдаgi takrorlanuvchi kalitли XOR — va xuddi shunday, avval kalit uzunligini tiklab buziladi.

## Chastota tahlili: universal richag

Har bir harfни belgilangan boshqa harfга o'giradigan har qanday shifr harf chastotalarini saqlaydi. Inglizchada `e t a o i n` ustunlik qiladi; eng ko'p uchraydigan shifrmatn harfи katta ehtimol `e`. Harflarни sanang, taqsimotни moslang, va o'rniga qo'yish shifri kalitни umuman bilmasdan yechiladi:

```
$ cat cipher.txt | fold -w1 | sort | uniq -c | sort -rn | head -5
     89 X
     71 P
     58 Q
```

`X` ehtimol `e`. O'sha bitta taxmin qolganига kaskad bo'ladi.

## Bitta xulosa

Klassik shifrlar chiqishда **tuzilma** qoldirgani uchun yiqiladi — kichik kalit makonlari, saqlangan chastotalar, takrorlanuvchi naqshlar. Zamonaviy shifrlar aynan shuni olib tashlash uchun bor. Bu darsdagi har bir buzish aslida bir xil harakat: shifr yashira olmagan tuzilmани topish.

## Sinab ko'ring

1. Python'да qisqa satrни bitta bayt bilan XOR qiling, keyin uni tiklash uchun barcha 256 kalitни brute-force qiling.
2. Sezar siljitilgan xabarни `tr` bilan u yoq-bu yoqqа o'giring. Qaysi siljish inglizchani oshkor qiladi?
3. Inglizcha paragrafда harf chastotalarини sanang. `e`, `t`, `a` ro'yxat boshidami?""",
        "contentRu": r"""Современную криптографию сломать сложно по замыслу. Классические шифры — нет, потому они и наполняют CTF-задания, и учиться их ломать — значит понимать, как шифры проваливаются. XOR лежит почти под всем этим.

## XOR: операция в сердце шифров

XOR (исключающее или) выдаёт 1, когда два бита различаются:

```
0 ^ 0 = 0    0 ^ 1 = 1    1 ^ 0 = 1    1 ^ 1 = 0
```

Одно свойство делает его шифром: **XOR дважды с одним ключом возвращает оригинал.**

```
открытый текст ^ ключ = шифртекст
шифртекст ^ ключ = открытый текст
```

Шифрование и расшифровка — *одна и та же* операция. Посмотрите напрямую:

```
$ python3 -c "
data = b'HI'
key  = 0x2a
enc  = bytes([b ^ key for b in data]); print('enc :', enc.hex())
dec  = bytes([b ^ key for b in enc ]); print('dec :', dec.decode())
"
enc : 6263
dec : HI
```

## Почему однобайтовый XOR падает сразу

Если всё сообщение XOR-ится одним байтом, возможных ключей всего 256. Переберите все и прочитайте похожий на текст:

```
$ python3 -c "
ct = bytes.fromhex('6263')
for k in range(256):
    out = bytes([b ^ k for b in ct])
    if all(32 <= c < 127 for c in out):
        print(k, out)
"
```

Печатается каждый печатаемый кандидат; английский — ответ. Это перебор по пространству из 256 ключей — мгновенно. CTF-флаг, XOR-нутый одним байтом, — подарок.

## XOR с повторяющимся ключом и как он всё равно ломается

Более длинный ключ, повторяемый по сообщению, сильнее — но не силён. Атака в две стадии:

1. **Найти длину ключа.** Повторно использованные байты ключа создают статистическую структуру; *расстояние Хэмминга* между блоками наименьшее при истинной длине ключа. Инструменты вроде `xortool` это делают:

```
$ xortool -c 20 ciphertext.bin
The most probable key lengths:
   5: 14.2%
The most probable key: b'CTFkey'
```

2. **Решить каждую позицию ключа отдельно.** Каждый N-й байт XOR-нут одним байтом ключа, поэтому каждая позиция — просто однобайтовый XOR — решается частотным анализом (пробел и `e` чаще всего в английском).

XOR с повторяющимся ключом кажется надёжным и служит классической ловушкой CTF именно потому, что выглядит сложнее, чем есть.

## Классические шифры замены

**Цезарь** сдвигает каждую букву на фиксированную величину. Сдвигов всего 25, поэтому пробуете все:

```
$ echo 'Khoor' | tr 'A-Za-z' 'D-ZA-Cd-za-c'   # сдвиг назад на 3
Hello
```

**ROT13** — Цезарь со сдвигом 13, самообратный (примените дважды, чтобы отменить):

```
$ echo 'Hello' | tr 'A-Za-z' 'N-ZA-Mn-za-m'
Uryyb
```

**Виженер** использует ключевое слово для сдвига по повторяющемуся шаблону — по сути XOR с повторяющимся ключом в алфавите — и ломается так же, сначала восстановлением длины ключа.

## Частотный анализ: универсальный рычаг

Любой шифр, отображающий каждую букву в фиксированную другую, сохраняет частоты букв. В английском доминируют `e t a o i n`; самая частая буква шифртекста весьма вероятно `e`. Сосчитайте буквы, сопоставьте распределение — и шифр замены распутывается без знания ключа:

```
$ cat cipher.txt | fold -w1 | sort | uniq -c | sort -rn | head -5
     89 X
     71 P
     58 Q
```

`X` вероятно `e`. Эта одна догадка каскадом раскрывает остальное.

## Один вывод

Классические шифры падают, потому что оставляют в выводе **структуру** — малые пространства ключей, сохранённые частоты, повторяющиеся шаблоны. Современные шифры существуют, чтобы убрать ровно это. Каждый взлом в этом уроке — по сути один ход: найти структуру, которую шифр не смог скрыть.

## Попробуйте

1. XOR-ните короткую строку одним байтом в Python, затем переберите все 256 ключей, чтобы восстановить её.
2. `tr` сдвинутое Цезарем сообщение туда-обратно. Какой сдвиг открывает английский?
3. Сосчитайте частоты букв в абзаце на английском. Возглавляют ли список `e`, `t`, `a`?""",
        "questions": [
            q("What makes XOR usable as a cipher?",
              "XOR'ни shifr sifatida ishlatib bo'ladigan qiladigan narsa nima?",
              "Что делает XOR пригодным как шифр?",
              ["XORing twice with the same key returns the original",
               "It compresses the data", "It is irreversible",
               "It requires a public key"],
              ["Bir xil kalit bilan ikki marta XOR aslini qaytaradi",
               "U ma'lumotni siqadi", "U qaytarilmaydi",
               "U ochiq kalit talab qiladi"],
              ["XOR дважды с одним ключом возвращает оригинал",
               "Он сжимает данные", "Он необратим",
               "Ему нужен открытый ключ"], 0),
            q("Why does single-byte XOR fall instantly?",
              "Nega bir baytли XOR bir zumda yiqiladi?",
              "Почему однобайтовый XOR падает мгновенно?",
              ["Only 256 keys exist, so all can be tried at once",
               "The key is stored in the ciphertext", "XOR is not really encryption",
               "The plaintext is always English"],
              ["Faqat 256 kalit bor, shuning uchun hammasini birdan sinash mumkin",
               "Kalit shifrmatnда saqlanadi", "XOR aslida shifrlash emas",
               "Ochiq matn doim inglizcha"],
              ["Существует лишь 256 ключей, поэтому все можно перебрать разом",
               "Ключ хранится в шифртексте", "XOR — это не шифрование",
               "Открытый текст всегда английский"], 0),
            q("Frequency analysis breaks a substitution cipher by:",
              "Chastota tahlili o'rniga qo'yish shifrини qanday buzadi:",
              "Частотный анализ ломает шифр замены путём:",
              ["Matching ciphertext letter counts to known language frequencies",
               "Trying every possible key", "Reversing the hash",
               "Guessing the key length only"],
              ["Shifrmatn harf sonlarини ma'lum til chastotalariга moslash",
               "Har bir mumkin kalitни sinash", "Xeshни qaytarish",
               "Faqat kalit uzunligini taxmin qilish"],
              ["Сопоставления частот букв шифртекста известным частотам языка",
               "Перебора каждого возможного ключа", "Обращения хеша",
               "Угадывания только длины ключа"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "crypto", "points": 70,
        "title": "Symmetric encryption and block cipher modes",
        "titleUz": "Simmetrik shifrlash va blok shifr rejimlari",
        "titleRu": "Симметричное шифрование и режимы блочных шифров",
        "content": r"""Symmetric encryption uses one shared key to both encrypt and decrypt. AES is the standard, and it is not broken — but *how* you use it decides whether it protects anything. The mode matters as much as the cipher.

## AES in practice

```
$ printf 'secret message' | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:mykey123
U2FsdGVkX1/E37IUOy7WDmsYapCWSKb5Bha4ak9az6c=
```

Decrypt with the same key:

```
$ echo 'U2FsdGVkX1/E37IUOy7WDmsYapCWSKb5Bha4ak9az6c=' \
  | openssl enc -d -aes-256-cbc -pbkdf2 -a -pass pass:mykey123
secret message
```

Two things to notice. The ciphertext **changes every run** even with the same input and key — because a random salt and IV are mixed in, which is correct and desirable. And `-256` is the key size in bits; AES-128 and AES-256 are both secure, the number is not a "strength ranking" to worry about.

## Block ciphers work on fixed-size blocks

AES encrypts 16 bytes at a time. Real messages are longer, so a **mode of operation** defines how the blocks are chained. This choice is where AES is most often misused.

## ECB: the mode that leaks

Electronic Codebook encrypts each block independently. That sounds harmless and is a serious flaw: **identical plaintext blocks produce identical ciphertext blocks.** The structure of the data survives encryption.

The famous demonstration is the "ECB penguin": encrypt a bitmap of Tux in ECB mode and the penguin is still clearly visible in the ciphertext, because every identical region of colour encrypts to the same bytes. The data is "encrypted" and you can still see the picture.

```
$ printf 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' \
  | openssl enc -aes-128-ecb -nosalt -K 00112233445566778899aabbccddeeff -a
```

Two identical 16-byte blocks of `A` produce two identical ciphertext blocks — visible repetition in the output. Never use ECB.

## CBC: chaining the blocks

Cipher Block Chaining XORs each plaintext block with the previous ciphertext block before encrypting, so identical plaintext no longer gives identical ciphertext. It needs an **IV** (initialisation vector) — a random starting value — for the first block, which is why the same input encrypts differently each time.

CBC is sound when used correctly, but it has sharp edges: a wrong or reused IV weakens it, and *padding oracle* attacks can exploit an application that reveals whether decryption padding was valid.

## GCM: encryption plus authentication

Galois/Counter Mode is the modern default. It provides confidentiality *and* an authentication tag that detects tampering — so an attacker cannot flip bits in the ciphertext undetected. Prefer **AES-GCM** (or ChaCha20-Poly1305) for anything new; it removes whole classes of mistake that CBC leaves open.

## The key exchange problem

Symmetric encryption has one hard problem it cannot solve alone: **both sides need the same secret key, but how do they agree on it over an insecure channel without an eavesdropper learning it?** You cannot just send the key — anyone watching gets it too. This single question is what asymmetric cryptography, the next two lessons, exists to answer.

## The rules

- AES is secure; the mode decides whether your use of it is.
- **Never ECB** — it preserves patterns in the plaintext.
- Prefer **authenticated** modes (GCM) so tampering is detected, not just hidden.
- Never hardcode or reuse keys and IVs; derive keys properly (PBKDF2, Argon2) from passwords.

## Try it

1. Encrypt a message with `openssl enc -aes-256-cbc -pbkdf2`, then decrypt it back. Does the round-trip return your text?
2. Encrypt the same input twice. Why is the output different both times?
3. Read about the ECB penguin. In one sentence, why does the image survive encryption?""",
        "contentUz": r"""Simmetrik shifrlash shifrlash va deshifrlashning ikkalasi uchun bitta umumiy kalit ishlatadi. AES — standart, va u buzilmagan — lekin uni *qanday* ishlatishingiz biror narsani himoya qiladimi yoki yo'qmi, shuni hal qiladi. Rejim shifrning o'zi kabi muhim.

## AES amalда

```
$ printf 'secret message' | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:mykey123
U2FsdGVkX1/E37IUOy7WDmsYapCWSKb5Bha4ak9az6c=
```

Bir xil kalit bilan deshifrlang:

```
$ echo 'U2FsdGVkX1/E37IUOy7WDmsYapCWSKb5Bha4ak9az6c=' \
  | openssl enc -d -aes-256-cbc -pbkdf2 -a -pass pass:mykey123
secret message
```

Ikki narsaga e'tibor bering. Shifrmatn bir xil kirish va kalit bilan ham **har safar o'zgaradi** — chunki tasodifiy tuz va IV aralashtiriladi, bu to'g'ri va maqsadga muvofiq. Va `-256` — kalit o'lchami bitларда; AES-128 va AES-256 ikkalasi xavfsiz, raqam tashvishlanadigan "kuch reytingi" emas.

## Blok shifrlar belgilangan o'lchamli bloklarда ishlaydi

AES bir vaqtда 16 baytни shifrlaydi. Haqiqiy xabarlar uzunroq, shuning uchun **ish rejimi** bloklar qanday zanjirlanishini belgilaydi. Bu tanlov — AES eng ko'p noto'g'ri ishlatiladigan joy.

## ECB: sizdiradigan rejim

Elektron kod kitobi har bir blokни mustaqil shifrlaydi. Bu zararsizdek eshitiladi va jiddiy nuqson: **bir xil ochiq matn bloklari bir xil shifrmatn bloklari beradi.** Ma'lumot tuzilmasi shifrlashдан omon qoladi.

Mashhur namoyish — "ECB pingvini": Tux bitmap'ини ECB rejimида shifrlang va pingvin shifrmatnда hamon aniq ko'rinadi, chunki har bir bir xil rang mintaqasi bir xil baytларга shifrlanadi. Ma'lumot "shifrlangan" va siz rasmni hamon ko'rasiz.

```
$ printf 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' \
  | openssl enc -aes-128-ecb -nosalt -K 00112233445566778899aabbccddeeff -a
```

`A` ning ikki bir xil 16-baytли bloki ikki bir xil shifrmatn bloki beradi — chiqishда ko'rinadigan takror. ECB'ни hech qachon ishlatmang.

## CBC: bloklarни zanjirlash

Shifr blok zanjirlash har bir ochiq matn blokини shifrlashдан oldin oldingi shifrmatn bloki bilan XOR qiladi, shunday qilib bir xil ochiq matn endi bir xil shifrmatn bermaydi. Birinchi blok uchun unга **IV** (ishga tushirish vektori) — tasodifiy boshlang'ich qiymat — kerak, shuning uchun bir xil kirish har safar boshqacha shifrlanadi.

CBC to'g'ri ishlatilganда mustahkam, lekin uning o'tkir chetlari bor: noto'g'ri yoki qayta ishlatilgan IV uni zaiflashtiradi, va *padding oracle* hujumlari deshifrlash to'ldirishi yaroqli edimi yoki yo'qmi oshkor qiladigan ilovadan foydalanishi mumkin.

## GCM: shifrlash + autentifikatsiya

Galois/Counter rejimi — zamonaviy standart. U maxfiylik *va* aralashuvни aniqlaydigan autentifikatsiya tegini beradi — shunda hujumchi shifrmatnда bitларни sezdirmay o'zgartira olmaydi. Yangi hamma narsa uchun **AES-GCM** (yoki ChaCha20-Poly1305) ni afzal ko'ring; u CBC ochiq qoldiradigan butun xatolar sinflarини olib tashlaydi.

## Kalit almashuvi muammosi

Simmetrik shifrlashning yolg'iz hal qila olmaydigan bitta qiyin muammosi bor: **ikkala tomonга bir xil maxfiy kalit kerak, lekin ular xavfsiz bo'lmagan kanal orqali tinglovchi bilmasдан uni qanday kelishadi?** Kalitни shunchaki yubora olmaysiz — kuzatayotgan har kim uni ham oladi. Aynan shu savol keyingi ikki dars — asimmetrik kriptografiya javob berish uchun mavjud.

## Qoidalar

- AES xavfsiz; rejim uni ishlatishingiz xavfsizmi yoki yo'qmi hal qiladi.
- **Hech qachon ECB** — u ochiq matnдаgi naqshlarни saqlaydi.
- **Autentifikatsiyalangan** rejimlarni (GCM) afzal ko'ring, shunda aralashuv yashirilmaydi, aniqlanadi.
- Kalitlar va IV'larни hech qachon qattiq kodlamang yoki qayta ishlatmang; parollardан kalitларni to'g'ri hosil qiling (PBKDF2, Argon2).

## Sinab ko'ring

1. Xabarni `openssl enc -aes-256-cbc -pbkdf2` bilan shifrlang, keyin qaytadan deshifrlang. Aylanma matningizni qaytaradimi?
2. Bir xil kirishни ikki marta shifrlang. Nega chiqish ikkala safar boshqacha?
3. ECB pingvini haqida o'qing. Bitta jumlaда, nega rasm shifrlashдан omon qoladi?""",
        "contentRu": r"""Симметричное шифрование использует один общий ключ и для шифрования, и для расшифровки. AES — стандарт, и он не сломан — но *как* вы его используете решает, защищает ли он что-нибудь. Режим важен не меньше самого шифра.

## AES на практике

```
$ printf 'secret message' | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:mykey123
U2FsdGVkX1/E37IUOy7WDmsYapCWSKb5Bha4ak9az6c=
```

Расшифруйте тем же ключом:

```
$ echo 'U2FsdGVkX1/E37IUOy7WDmsYapCWSKb5Bha4ak9az6c=' \
  | openssl enc -d -aes-256-cbc -pbkdf2 -a -pass pass:mykey123
secret message
```

Обратите внимание на две вещи. Шифртекст **меняется каждый запуск** даже при том же вводе и ключе — потому что подмешиваются случайная соль и IV, что верно и желательно. И `-256` — размер ключа в битах; AES-128 и AES-256 оба безопасны, число — не «рейтинг силы», о котором надо волноваться.

## Блочные шифры работают с блоками фиксированного размера

AES шифрует по 16 байт за раз. Реальные сообщения длиннее, поэтому **режим работы** определяет, как блоки сцепляются. Этот выбор — место, где AES чаще всего используют неправильно.

## ECB: режим, который течёт

Electronic Codebook шифрует каждый блок независимо. Звучит безобидно, а это серьёзный дефект: **одинаковые блоки открытого текста дают одинаковые блоки шифртекста.** Структура данных переживает шифрование.

Знаменитая демонстрация — «ECB-пингвин»: зашифруйте битмап Tux в режиме ECB, и пингвин по-прежнему ясно виден в шифртексте, потому что каждая одинаковая область цвета шифруется в одни и те же байты. Данные «зашифрованы», а картинку по-прежнему видно.

```
$ printf 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' \
  | openssl enc -aes-128-ecb -nosalt -K 00112233445566778899aabbccddeeff -a
```

Два одинаковых 16-байтовых блока `A` дают два одинаковых блока шифртекста — видимый повтор в выводе. Никогда не используйте ECB.

## CBC: сцепление блоков

Cipher Block Chaining XOR-ит каждый блок открытого текста с предыдущим блоком шифртекста перед шифрованием, так что одинаковый открытый текст больше не даёт одинаковый шифртекст. Ему нужен **IV** (вектор инициализации) — случайное стартовое значение — для первого блока, поэтому один и тот же ввод шифруется по-разному каждый раз.

CBC надёжен при правильном использовании, но у него острые края: неверный или повторно использованный IV ослабляет его, а атаки *padding oracle* могут использовать приложение, раскрывающее, был ли валиден паддинг при расшифровке.

## GCM: шифрование плюс аутентификация

Galois/Counter Mode — современный стандарт. Он даёт конфиденциальность *и* тег аутентификации, обнаруживающий подмену — так что атакующий не может незаметно переставить биты в шифртексте. Предпочитайте **AES-GCM** (или ChaCha20-Poly1305) для всего нового; он убирает целые классы ошибок, которые CBC оставляет открытыми.

## Проблема обмена ключами

У симметричного шифрования есть одна трудная проблема, которую оно само не решает: **обеим сторонам нужен один секретный ключ, но как договориться о нём по небезопасному каналу так, чтобы подслушивающий его не узнал?** Просто послать ключ нельзя — любой наблюдающий получит его тоже. Именно на этот вопрос отвечает асимметричная криптография, следующие два урока.

## Правила

- AES безопасен; режим решает, безопасно ли ваше применение.
- **Никогда ECB** — он сохраняет шаблоны открытого текста.
- Предпочитайте **аутентифицированные** режимы (GCM), чтобы подмена обнаруживалась, а не только скрывалась.
- Никогда не зашивайте и не переиспользуйте ключи и IV; выводите ключи правильно (PBKDF2, Argon2) из паролей.

## Попробуйте

1. Зашифруйте сообщение через `openssl enc -aes-256-cbc -pbkdf2`, затем расшифруйте обратно. Возвращает ли цикл ваш текст?
2. Зашифруйте один и тот же ввод дважды. Почему вывод оба раза разный?
3. Прочитайте про ECB-пингвина. В одном предложении: почему картинка переживает шифрование?""",
        "questions": [
            q("Why is ECB mode insecure?",
              "Nega ECB rejimi xavfsiz emas?",
              "Почему режим ECB небезопасен?",
              ["Identical plaintext blocks produce identical ciphertext, leaking structure",
               "It uses a key that is too short", "It cannot be decrypted",
               "It is slower than CBC"],
              ["Bir xil ochiq matn bloklari bir xil shifrmatn beradi, tuzilmani sizdiradi",
               "U juda qisqa kalit ishlatadi", "Uni deshifrlab bo'lmaydi",
               "U CBC'дан sekinroq"],
              ["Одинаковые блоки открытого текста дают одинаковый шифртекст, выдавая структуру",
               "Он использует слишком короткий ключ", "Его нельзя расшифровать",
               "Он медленнее CBC"], 0),
            q("Why does AES-CBC produce different ciphertext for the same input each time?",
              "Nega AES-CBC bir xil kirish uchun har safar boshqa shifrmatn beradi?",
              "Почему AES-CBC даёт разный шифртекст для одного ввода каждый раз?",
              ["A random IV (and salt) is mixed in", "The key changes automatically",
               "AES is non-deterministic", "The plaintext is compressed differently"],
              ["Tasodifiy IV (va tuz) aralashtiriladi", "Kalit avtomatik o'zgaradi",
               "AES nodeterministik", "Ochiq matn boshqacha siqiladi"],
              ["Подмешивается случайный IV (и соль)", "Ключ меняется автоматически",
               "AES недетерминирован", "Открытый текст сжимается иначе"], 0),
            q("What does AES-GCM add over AES-CBC?",
              "AES-GCM AES-CBC'га nimani qo'shadi?",
              "Что AES-GCM добавляет к AES-CBC?",
              ["An authentication tag that detects tampering", "A longer key",
               "Faster decryption only", "Reversibility without a key"],
              ["Aralashuvni aniqlaydigan autentifikatsiya tegi", "Uzunroq kalit",
               "Faqat tezroq deshifrlash", "Kalitsiz qaytariluvchanlik"],
              ["Тег аутентификации, обнаруживающий подмену", "Более длинный ключ",
               "Только более быструю расшифровку", "Обратимость без ключа"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "crypto", "points": 80,
        "title": "Public-key cryptography and RSA",
        "titleUz": "Ochiq kalitли kriptografiya va RSA",
        "titleRu": "Криптография с открытым ключом и RSA",
        "content": r"""The previous lesson ended on a problem: two parties need a shared key but cannot exchange one safely. Public-key cryptography solves it with a startling idea — two *different* keys, one you publish and one you keep.

## Two keys, opposite roles

Each party has a **key pair**:

- a **public key**, shared with everyone
- a **private key**, kept secret

What one key locks, only the other unlocks. This gives two distinct powers:

- **Encrypt with the public key** → only the private key decrypts. Anyone can send you a secret; only you read it.
- **Sign with the private key** → the public key verifies. Only you could have produced it; anyone can check it is yours. This is the digital signature.

No shared secret ever crosses the wire. That is the breakthrough.

## RSA, from the ground up

RSA's security rests on one fact: multiplying two large primes is easy, but factoring the result back into them is infeasible when they are large enough.

```
1. Pick two primes p, q
2. n = p × q                     (the modulus, public)
3. φ(n) = (p-1)(q-1)
4. Choose e (commonly 65537)     (public exponent)
5. d = e⁻¹ mod φ(n)              (private exponent)

Public key:  (n, e)
Private key: (n, d)

Encrypt:  c = mᵉ mod n
Decrypt:  m = cᵈ mod n
```

Small numbers make it concrete:

```
$ python3 -c "
p, q = 61, 53
n = p*q                    # 3233
phi = (p-1)*(q-1)          # 3120
e = 17
d = pow(e, -1, phi)        # 2753
m = 65
c = pow(m, e, n); print('cipher :', c)   # 2790
print('back   :', pow(c, d, n))          # 65
"
cipher : 2790
back   : 65
```

`65` encrypted to `2790` and came back to `65` — using only the public key to encrypt and the private key to decrypt. Real RSA uses primes hundreds of digits long, but the arithmetic is exactly this.

## Generating and reading real keys

```
$ openssl genrsa -out private.pem 2048
$ openssl rsa -in private.pem -pubout -out public.pem
$ openssl rsa -in private.pem -noout -text | head -3
Private-Key: (2048 bit, 2 primes)
modulus:
    00:c7:b3:f9:9c:...
```

`genrsa` picks the primes and derives everything; `-pubout` extracts the shareable half. In a CTF you often get a `public.pem` and must recover the private key — which is only possible if the parameters were chosen badly.

## Why RSA falls in CTFs (and never should in production)

Textbook and misused RSA has well-known weaknesses, and CTF challenges live in them:

- **Small n** — if the modulus is small enough to factor, tools like `factordb` or `yafu` recover `p` and `q`, and with them the private key. Always check `factordb.com` first; it has precomputed factorisations of many weak moduli.
- **Small e with no padding** — if `e=3` and the message is short, `m³` may be less than `n`, so `c` is just `m³` and you take an ordinary cube root. No modular arithmetic to break.
- **Shared primes across keys** — if two moduli share a prime, `gcd(n1, n2)` reveals it instantly, breaking both.
- **Close primes** — if `p` and `q` are near each other, Fermat factorisation finds them fast.

The lesson: RSA the algorithm is sound; RSA with proper key sizes (2048-bit+) and proper padding (OAEP) is not the thing that breaks. What breaks is small keys, missing padding, and reused parameters. A tool like `RsaCtfTool` runs every one of these attacks automatically:

```
$ RsaCtfTool --publickey public.pem --uncipherfile cipher.txt
```

## Signatures, the other half

The same maths, run in reverse, proves origin:

```
$ echo "important" > msg.txt
$ openssl dgst -sha256 -sign private.pem -out msg.sig msg.txt
$ openssl dgst -sha256 -verify public.pem -signature msg.sig msg.txt
Verified OK
```

You sign a hash of the message with your private key; anyone verifies with your public key. This is what makes TLS certificates, software updates and signed commits trustworthy.

## Try it

1. Work the small RSA example in Python. Change `m` and confirm it still round-trips.
2. `openssl genrsa` a keypair, then read the modulus with `-text`.
3. Look up `factordb.com` and search for a small number like `3233`. Does it return the factors?""",
        "contentUz": r"""Oldingi dars muammoда tugadi: ikki tomonга umumiy kalit kerak, lekin ular uni xavfsiz almasha olmaydi. Ochiq kalitли kriptografiya buni hayratlanarli g'oya bilan yechadi — ikkita *har xil* kalit, birini e'lon qilasiz, birini saqlaysiz.

## Ikki kalit, qarama-qarshi rollar

Har bir tomonда **kalit jufti** bor:

- **ochiq kalit**, hamma bilan bo'lishiladi
- **maxfiy kalit**, sir saqlanadi

Bir kalit qulflaganini faqat ikkinchisi ochadi. Bu ikki alohida kuch beradi:

- **Ochiq kalit bilan shifrlash** → faqat maxfiy kalit deshifrlaydi. Har kim sizga sir yubora oladi; faqat siz uni o'qiysiz.
- **Maxfiy kalit bilan imzolash** → ochiq kalit tekshiradi. Uni faqat siz yasagan bo'lishingiz mumkin; har kim u sizniki ekanini tekshira oladi. Bu — raqamli imzo.

Hech qanday umumiy sir sim orqali o'tmaydi. Yutuq shu.

## RSA, boshidan

RSA xavfsizligi bitta faktга tayanadi: ikki katta tub sonni ko'paytirish oson, lekin natijани ularга qayta ko'paytuvchilarга ajratish ular yetarlicha katta bo'lganда imkonsiz.

```
1. Ikki tub son p, q tanlang
2. n = p × q                     (modul, ochiq)
3. φ(n) = (p-1)(q-1)
4. e tanlang (odatda 65537)      (ochiq eksponent)
5. d = e⁻¹ mod φ(n)              (maxfiy eksponent)

Ochiq kalit:  (n, e)
Maxfiy kalit: (n, d)

Shifrlash:  c = mᵉ mod n
Deshifrlash: m = cᵈ mod n
```

Kichik sonlar buni aniq qiladi:

```
$ python3 -c "
p, q = 61, 53
n = p*q                    # 3233
phi = (p-1)*(q-1)          # 3120
e = 17
d = pow(e, -1, phi)        # 2753
m = 65
c = pow(m, e, n); print('cipher :', c)   # 2790
print('back   :', pow(c, d, n))          # 65
"
cipher : 2790
back   : 65
```

`65` `2790` ga shifrlandi va `65` ga qaytdi — shifrlash uchun faqat ochiq kalit, deshifrlash uchun maxfiy kalit ishlatib. Haqiqiy RSA yuzlab raqamli tub sonlar ishlatadi, lekin arifmetika aynan shu.

## Haqiqiy kalitларni yaratish va o'qish

```
$ openssl genrsa -out private.pem 2048
$ openssl rsa -in private.pem -pubout -out public.pem
$ openssl rsa -in private.pem -noout -text | head -3
Private-Key: (2048 bit, 2 primes)
modulus:
    00:c7:b3:f9:9c:...
```

`genrsa` tub sonlarni tanlaydi va hammani hosil qiladi; `-pubout` bo'lishiladigan yarmini chiqaradi. CTF'да siz ko'pincha `public.pem` olasiz va maxfiy kalitни tiklashingiz kerak — bu faqat parametrlar yomon tanlanган bo'lsa mumkin.

## Nega RSA CTF'да yiqiladi (va ishlab chiqarishда hech qachon yiqilmasligi kerak)

Darslik va noto'g'ri ishlatilgan RSA'ning ma'lum zaifliklари bor, CTF challenge'lari ularда yashaydi:

- **Kichik n** — agar modul ko'paytuvchilarга ajratishга yetarlicha kichik bo'lsa, `factordb` yoki `yafu` kabi vositalar `p` va `q` ni tiklaydi, va ular bilan maxfiy kalitни. Doim avval `factordb.com` ni tekshiring; unда ko'p zaif modullar oldindan hisoblangan.
- **To'ldirishsiz kichik e** — agar `e=3` va xabar qisqa bo'lsa, `m³` `n` дан kichik bo'lishi mumkin, shunda `c` shunchaki `m³` va siz oddiy kub ildizini olasiz. Buzadigan modul arifmetikasi yo'q.
- **Kalitlar orasida umumiy tub sonlar** — agar ikki modul tub sonni bo'lishsa, `gcd(n1, n2)` uni bir zumda oshkor qiladi, ikkalasini buzadi.
- **Yaqin tub sonlar** — agar `p` va `q` bir-birига yaqin bo'lsa, Ferma ko'paytuvchilarга ajratish ularни tez topadi.

Dars: RSA algoritm mustahkam; to'g'ri kalit o'lchamli (2048-bit+) va to'g'ri to'ldirishli (OAEP) RSA yiqiladigan narsa emas. Yiqiladigani — kichik kalitlar, yo'q to'ldirish va qayta ishlatilgan parametrlar. `RsaCtfTool` kabi vosita bularning har birini avtomatik yuritadi:

```
$ RsaCtfTool --publickey public.pem --uncipherfile cipher.txt
```

## Imzolar, ikkinchi yarmi

Xuddi shu matematika, teskari yuritilganда, kelib chiqishни isbotlaydi:

```
$ echo "important" > msg.txt
$ openssl dgst -sha256 -sign private.pem -out msg.sig msg.txt
$ openssl dgst -sha256 -verify public.pem -signature msg.sig msg.txt
Verified OK
```

Siz xabar xeshини maxfiy kalitingiz bilan imzolaysiz; har kim ochiq kalitingiz bilan tekshiradi. Bu TLS sertifikatlari, dasturiy yangilanishlar va imzolangan commit'larni ishonchli qiladi.

## Sinab ko'ring

1. Kichik RSA misolини Python'да ishlang. `m` ni o'zgartiring va u hamon aylanishini tasdiqlang.
2. `openssl genrsa` bilan kalit jufti yarating, keyin modulني `-text` bilan o'qing.
3. `factordb.com` ni oching va `3233` kabi kichik sonni qidiring. U ko'paytuvchilarни qaytaradimi?""",
        "contentRu": r"""Прошлый урок закончился проблемой: двум сторонам нужен общий ключ, но обменяться им безопасно нельзя. Криптография с открытым ключом решает это поразительной идеей — два *разных* ключа, один публикуете, другой храните.

## Два ключа, противоположные роли

У каждой стороны есть **пара ключей**:

- **открытый ключ**, доступный всем
- **закрытый ключ**, хранимый в секрете

Что запер один ключ, отпирает только другой. Это даёт две отдельные возможности:

- **Шифровать открытым ключом** → расшифровывает только закрытый. Любой может послать вам секрет; прочтёте только вы.
- **Подписывать закрытым ключом** → проверяет открытый. Создать могли только вы; любой проверит, что это ваше. Это цифровая подпись.

Никакой общий секрет не идёт по проводу. В этом прорыв.

## RSA с нуля

Безопасность RSA держится на одном факте: умножить два больших простых легко, а разложить результат обратно на них невозможно, когда они достаточно велики.

```
1. Выбрать два простых p, q
2. n = p × q                     (модуль, открытый)
3. φ(n) = (p-1)(q-1)
4. Выбрать e (обычно 65537)      (открытая экспонента)
5. d = e⁻¹ mod φ(n)              (закрытая экспонента)

Открытый ключ:  (n, e)
Закрытый ключ:  (n, d)

Шифрование:  c = mᵉ mod n
Расшифровка: m = cᵈ mod n
```

Малые числа делают это наглядным:

```
$ python3 -c "
p, q = 61, 53
n = p*q                    # 3233
phi = (p-1)*(q-1)          # 3120
e = 17
d = pow(e, -1, phi)        # 2753
m = 65
c = pow(m, e, n); print('cipher :', c)   # 2790
print('back   :', pow(c, d, n))          # 65
"
cipher : 2790
back   : 65
```

`65` зашифровался в `2790` и вернулся в `65` — используя для шифрования только открытый ключ, а для расшифровки закрытый. Настоящий RSA берёт простые из сотен цифр, но арифметика ровно эта.

## Генерация и чтение настоящих ключей

```
$ openssl genrsa -out private.pem 2048
$ openssl rsa -in private.pem -pubout -out public.pem
$ openssl rsa -in private.pem -noout -text | head -3
Private-Key: (2048 bit, 2 primes)
modulus:
    00:c7:b3:f9:9c:...
```

`genrsa` выбирает простые и выводит всё; `-pubout` извлекает делимую половину. В CTF вам часто дают `public.pem`, и надо восстановить закрытый ключ — что возможно, только если параметры выбраны плохо.

## Почему RSA падает в CTF (и никогда не должен в продакшене)

У учебного и неправильно использованного RSA есть известные слабости, и CTF-задания живут в них:

- **Малый n** — если модуль достаточно мал для факторизации, инструменты вроде `factordb` или `yafu` восстанавливают `p` и `q`, а с ними закрытый ключ. Всегда сначала проверяйте `factordb.com`; там предвычислены факторизации многих слабых модулей.
- **Малый e без паддинга** — если `e=3` и сообщение короткое, `m³` может быть меньше `n`, тогда `c` — просто `m³`, и вы берёте обычный кубический корень. Нет модульной арифметики для взлома.
- **Общие простые между ключами** — если два модуля делят простое, `gcd(n1, n2)` выдаёт его мгновенно, ломая оба.
- **Близкие простые** — если `p` и `q` близки, факторизация Ферма находит их быстро.

Урок: RSA как алгоритм надёжен; RSA с нормальными размерами ключа (2048-бит+) и нормальным паддингом (OAEP) — не то, что ломается. Ломаются малые ключи, отсутствие паддинга и переиспользованные параметры. Инструмент вроде `RsaCtfTool` прогоняет каждую из этих атак автоматически:

```
$ RsaCtfTool --publickey public.pem --uncipherfile cipher.txt
```

## Подписи, другая половина

Та же математика, запущенная в обратную сторону, доказывает происхождение:

```
$ echo "important" > msg.txt
$ openssl dgst -sha256 -sign private.pem -out msg.sig msg.txt
$ openssl dgst -sha256 -verify public.pem -signature msg.sig msg.txt
Verified OK
```

Вы подписываете хеш сообщения своим закрытым ключом; любой проверяет вашим открытым. Это делает доверенными TLS-сертификаты, обновления ПО и подписанные коммиты.

## Попробуйте

1. Проработайте малый пример RSA в Python. Измените `m` и убедитесь, что цикл всё ещё замыкается.
2. `openssl genrsa` пару ключей, затем прочитайте модуль через `-text`.
3. Откройте `factordb.com` и поищите малое число вроде `3233`. Вернёт ли оно множители?""",
        "questions": [
            q("On what mathematical problem does RSA's security rest?",
              "RSA xavfsizligi qaysi matematik muammoга tayanadi?",
              "На какой математической задаче держится безопасность RSA?",
              ["Factoring the product of two large primes is infeasible",
               "Reversing a hash is impossible", "XOR cannot be undone",
               "Sorting large numbers is slow"],
              ["Ikki katta tub son ko'paytmasini ajratish imkonsiz",
               "Xeshни qaytarish imkonsiz", "XOR'ни bekor qilib bo'lmaydi",
               "Katta sonlarни tartiblash sekin"],
              ["Разложить произведение двух больших простых невозможно",
               "Обратить хеш невозможно", "XOR нельзя отменить",
               "Сортировать большие числа медленно"], 0),
            q("You encrypt with someone's public key. Who can decrypt the result?",
              "Siz birovning ochiq kaliti bilan shifrlaysiz. Natijани kim deshifrlay oladi?",
              "Вы шифруете чьим-то открытым ключом. Кто может расшифровать?",
              ["Only the holder of the matching private key", "Anyone with the public key",
               "Anyone at all — it is just encoding", "Only the person who encrypted it"],
              ["Faqat mos maxfiy kalit egasi", "Ochiq kalitли har kim",
               "Umuman har kim — bu shunchaki kodlash", "Faqat uni shifrlagan kishi"],
              ["Только владелец соответствующего закрытого ключа", "Любой с открытым ключом",
               "Вообще любой — это просто кодирование", "Только тот, кто зашифровал"], 0),
            q("In a CTF, an RSA key with a small modulus is breakable because:",
              "CTF'да kichik modulли RSA kaliti buziladi, chunki:",
              "В CTF ключ RSA с малым модулем взламываем, потому что:",
              ["n can be factored into p and q, recovering the private key",
               "the public exponent is secret", "hashes can be reversed",
               "AES is weak"],
              ["n ni p va q ga ajratib, maxfiy kalitни tiklash mumkin",
               "ochiq eksponent maxfiy", "xeshларni qaytarish mumkin",
               "AES zaif"],
              ["n можно разложить на p и q, восстановив закрытый ключ",
               "открытая экспонента секретна", "хеши можно обратить",
               "AES слаб"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "crypto", "points": 80,
        "title": "Key exchange and how TLS combines everything",
        "titleUz": "Kalit almashuvi va TLS hammani qanday birlashtiradi",
        "titleRu": "Обмен ключами и как TLS всё объединяет",
        "content": r"""Symmetric encryption is fast but needs a shared key; asymmetric solves key sharing but is slow. Real systems use each for what it is good at. This lesson shows how, ending with TLS — where every idea in the module works together.

## Diffie-Hellman: agreeing on a secret in public

Diffie-Hellman lets two parties derive a shared secret over a channel an eavesdropper is fully watching — without ever sending the secret itself. The trick is arithmetic that is easy forwards and infeasible backwards.

```
Public, agreed openly:  a prime p, and a base g

Alice picks secret a       Bob picks secret b
Alice sends  A = gᵃ mod p  Bob sends  B = gᵇ mod p
Alice computes  Bᵃ mod p   Bob computes  Aᵇ mod p

Both arrive at the same value:  gᵃᵇ mod p
```

An eavesdropper sees `p, g, A, B` but not `a` or `b`. Recovering them means solving the *discrete logarithm* problem, which is infeasible for large `p`. Both sides now hold the same secret; nobody sent it.

```
$ python3 -c "
p = 23; g = 5          # tiny, for illustration only
a = 6; b = 15          # private
A = pow(g, a, p)       # Alice sends
B = pow(g, b, p)       # Bob sends
print('Alice secret:', pow(B, a, p))
print('Bob   secret:', pow(A, b, p))
"
Alice secret: 2
Bob   secret: 2
```

Same number, never transmitted. Real Diffie-Hellman uses a 2048-bit+ `p` or elliptic curves (ECDH), which are stronger per bit.

## Forward secrecy

Because a fresh Diffie-Hellman exchange can happen per session, the session keys are ephemeral. Even if the server's long-term private key is stolen *later*, past recorded sessions stay unreadable — their keys were never stored and cannot be recomputed. This property is **forward secrecy**, and it is why ephemeral key exchange (ECDHE) is the default in modern TLS.

## The hybrid every real protocol uses

Neither type alone is enough, so systems combine them:

1. **Asymmetric** to agree on or transport a key, and to authenticate identity.
2. **Symmetric** (AES) to encrypt the actual data, because it is fast.

You get asymmetric's key-distribution power with symmetric's speed. Nothing bulk-encrypts with RSA; RSA or DH only establishes the AES key that does the work.

## TLS: the whole module in one handshake

Opening `https://` runs this, and you now understand every step:

```
1. ClientHello    → supported cipher suites, a random value
2. ServerHello    → chosen cipher suite, a random value
3. Certificate    → server's public key, signed by a CA
                    (asymmetric signatures — lesson 6)
4. Verify cert    → client checks the CA signature and the name
                    (integrity + authentication — module 2)
5. Key exchange   → ECDHE derives a shared secret in public
                    (Diffie-Hellman — this lesson)
6. Derive keys    → both sides compute the same AES session keys
7. Finished       → everything from here is AES-GCM
                    (symmetric + authenticated mode — lesson 5)
```

Every property the module built appears: the certificate is an asymmetric signature, verifying it is authentication, the key exchange is Diffie-Hellman, the bulk encryption is authenticated symmetric. TLS is not a separate topic — it is these pieces assembled.

## Inspect a live handshake

```
$ openssl s_client -connect example.com:443 2>/dev/null | grep -E "Protocol|Cipher"
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_256_GCM_SHA384
```

Read the cipher suite as a sentence: **AES-256** in **GCM** mode for the data, **SHA-384** for integrity, with TLS 1.3's built-in ephemeral key exchange. Every term is something you now know.

## Try it

1. Run the tiny Diffie-Hellman example. Change `a` and `b`; do both sides still agree?
2. `openssl s_client` a site and read its negotiated cipher suite. Name each part.
3. Explain forward secrecy in one sentence: why does stealing the server key tomorrow not decrypt a session recorded today?""",
        "contentUz": r"""Simmetrik shifrlash tez, lekin umumiy kalit kerak; asimmetrik kalit almashishни yechadi, lekin sekin. Haqiqiy tizimlar har birini o'zi yaxshi bo'lган narsa uchun ishlatadi. Bu dars qanday ekanini ko'rsatadi, TLS bilan tugaydi — u yerда moduldаgi har bir g'oya birga ishlaydi.

## Diffie-Hellman: ochiqда sirni kelishish

Diffie-Hellman ikki tomonга tinglovchi to'liq kuzatib turган kanal orqali umumiy sirни hosil qilishga imkon beradi — sirning o'zini hech qachon yubormasдан. Hiyla — oldinga oson, orqага imkonsiz arifmetika.

```
Ochiq, ochiqда kelishilgan:  tub son p, va asos g

Alisa maxfiy a tanlaydi       Bob maxfiy b tanlaydi
Alisa yuboradi  A = gᵃ mod p  Bob yuboradi  B = gᵇ mod p
Alisa hisoblaydi  Bᵃ mod p    Bob hisoblaydi  Aᵇ mod p

Ikkalasi bir xil qiymatga yetadi:  gᵃᵇ mod p
```

Tinglovchi `p, g, A, B` ni ko'radi, lekin `a` yoki `b` ni emas. Ularни tiklash *diskret logarifm* muammosini yechish demak, bu katta `p` uchun imkonsiz. Ikkala tomon endi bir xil sirга ega; hech kim uni yubormadi.

```
$ python3 -c "
p = 23; g = 5          # kichik, faqat namoyish uchun
a = 6; b = 15          # maxfiy
A = pow(g, a, p)       # Alisa yuboradi
B = pow(g, b, p)       # Bob yuboradi
print('Alisa siri:', pow(B, a, p))
print('Bob   siri:', pow(A, b, p))
"
Alisa siri: 2
Bob   siri: 2
```

Bir xil son, hech qachon uzatilmagan. Haqiqiy Diffie-Hellman 2048-bit+ `p` yoki elliptik egri chiziqlar (ECDH) ishlatadi, ular har bitга kuchliroq.

## Oldinga maxfiylik (forward secrecy)

Yangi Diffie-Hellman almashuvi har sessiyaда bo'lishi mumkin bo'lgani uchun sessiya kalitlari o'tkinchi. Serverning uzoq muddatli maxfiy kaliti *keyinroq* o'g'irlansa ham, o'tган yozib olingan sessiyalar o'qib bo'lmaydigan qoladi — ularning kalitlari hech qachon saqlanmagan va qayta hisoblab bo'lmaydi. Bu xususiyat — **oldinga maxfiylik**, va aynan shuning uchun o'tkinchi kalit almashuvi (ECDHE) zamonaviy TLS'да standart.

## Har bir haqiqiy protokol ishlatadigan gibrid

Ikkala tur ham yolg'iz yetarli emas, shuning uchun tizimlar ularni birlashtiradi:

1. Kalitни kelishish yoki uzatish va shaxsni autentifikatsiya qilish uchun **asimmetrik**.
2. Haqiqiy ma'lumotni shifrlash uchun **simmetrik** (AES), chunki u tez.

Siz asimmetrikning kalit tarqatish kuchини simmetrikning tezligi bilan olasiz. Hech narsa RSA bilan ommaviy shifrlanmaydi; RSA yoki DH faqat ishни qiladigan AES kalitини o'rnatadi.

## TLS: butun modul bitta qo'l berishда

`https://` ni ochish shuni yuritadi, va siz endi har bir qadamni tushunasiz:

```
1. ClientHello    → qo'llab-quvvatlanadigan shifr to'plamlari, tasodifiy qiymat
2. ServerHello    → tanlangan shifr to'plami, tasodifiy qiymat
3. Certificate    → serverning ochiq kaliti, CA tomonidan imzolangan
                    (asimmetrik imzolar — 6-dars)
4. Sertni tekshirish → mijoz CA imzosi va nomni tekshiradi
                    (yaxlitlik + autentifikatsiya — 2-modul)
5. Kalit almashuvi → ECDHE ochiqда umumiy sirни hosil qiladi
                    (Diffie-Hellman — bu dars)
6. Kalitларni hosil qilish → ikkala tomon bir xil AES sessiya kalitларni hisoblaydi
7. Finished       → bundan keyin hammasi AES-GCM
                    (simmetrik + autentifikatsiyalangan rejim — 5-dars)
```

Modul qurган har bir xususiyat paydo bo'ladi: sertifikat — asimmetrik imzo, uni tekshirish — autentifikatsiya, kalit almashuvi — Diffie-Hellman, ommaviy shifrlash — autentifikatsiyalangan simmetrik. TLS alohida mavzu emas — u shu bo'laklar yig'ilgani.

## Jonli qo'l berishни ko'ring

```
$ openssl s_client -connect example.com:443 2>/dev/null | grep -E "Protocol|Cipher"
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_256_GCM_SHA384
```

Shifr to'plamini jumla sifatida o'qing: ma'lumot uchun **GCM** rejimidа **AES-256**, yaxlitlik uchun **SHA-384**, TLS 1.3 ning ichki o'tkinchi kalit almashuvi bilan. Har bir atama siz endi biladigan narsa.

## Sinab ko'ring

1. Kichik Diffie-Hellman misolини yuriting. `a` va `b` ni o'zgartiring; ikkala tomon hamon kelishadimi?
2. Saytни `openssl s_client` qiling va uning kelishilgan shifr to'plamини o'qing. Har bir qismini nomlang.
3. Oldinga maxfiylikни bitta jumlaда tushuntiring: nega ertага server kalitини o'g'irlash bugun yozib olingan sessiyaни deshifrlamaydi?""",
        "contentRu": r"""Симметричное шифрование быстрое, но нужен общий ключ; асимметричное решает обмен ключами, но медленное. Реальные системы используют каждое для того, в чём оно хорошо. Этот урок показывает как, заканчиваясь TLS — где все идеи модуля работают вместе.

## Диффи-Хеллман: договориться о секрете при всех

Диффи-Хеллман позволяет двум сторонам вывести общий секрет по каналу, за которым подслушивающий полностью следит — ни разу не отправив сам секрет. Трюк — арифметика, лёгкая вперёд и невозможная назад.

```
Открыто, согласовано при всех:  простое p и основание g

Алиса выбирает секрет a       Боб выбирает секрет b
Алиса шлёт  A = gᵃ mod p      Боб шлёт  B = gᵇ mod p
Алиса считает  Bᵃ mod p       Боб считает  Aᵇ mod p

Оба приходят к одному значению:  gᵃᵇ mod p
```

Подслушивающий видит `p, g, A, B`, но не `a` и `b`. Восстановить их — решить задачу *дискретного логарифма*, невозможную для большого `p`. Обе стороны теперь держат один секрет; никто его не отправлял.

```
$ python3 -c "
p = 23; g = 5          # крошечные, только для иллюстрации
a = 6; b = 15          # приватные
A = pow(g, a, p)       # Алиса шлёт
B = pow(g, b, p)       # Боб шлёт
print('Секрет Алисы:', pow(B, a, p))
print('Секрет Боба :', pow(A, b, p))
"
Секрет Алисы: 2
Секрет Боба : 2
```

Одно число, ни разу не переданное. Настоящий Диффи-Хеллман берёт 2048-бит+ `p` или эллиптические кривые (ECDH), которые сильнее на бит.

## Прямая секретность

Поскольку свежий обмен Диффи-Хеллмана может происходить на каждую сессию, сеансовые ключи эфемерны. Даже если долгосрочный закрытый ключ сервера украдут *позже*, прошлые записанные сессии останутся нечитаемыми — их ключи никогда не хранились и не могут быть пересчитаны. Это свойство — **прямая секретность**, и потому эфемерный обмен ключами (ECDHE) — стандарт в современном TLS.

## Гибрид, который использует каждый реальный протокол

Ни один тип сам по себе не достаточен, поэтому системы их сочетают:

1. **Асимметричное** — договориться о ключе или передать его и аутентифицировать личность.
2. **Симметричное** (AES) — шифровать сами данные, потому что оно быстрое.

Вы получаете силу распространения ключей асимметрии со скоростью симметрии. Ничто не шифруется массово через RSA; RSA или DH лишь устанавливает AES-ключ, который делает работу.

## TLS: весь модуль в одном рукопожатии

Открытие `https://` запускает это, и вы теперь понимаете каждый шаг:

```
1. ClientHello    → поддерживаемые наборы шифров, случайное значение
2. ServerHello    → выбранный набор шифров, случайное значение
3. Certificate    → открытый ключ сервера, подписанный CA
                    (асимметричные подписи — урок 6)
4. Проверка серт. → клиент проверяет подпись CA и имя
                    (целостность + аутентификация — модуль 2)
5. Обмен ключами  → ECDHE выводит общий секрет при всех
                    (Диффи-Хеллман — этот урок)
6. Вывод ключей   → обе стороны вычисляют одинаковые сеансовые ключи AES
7. Finished       → дальше всё AES-GCM
                    (симметричный + аутентифицированный режим — урок 5)
```

Появляется каждое свойство, построенное модулем: сертификат — асимметричная подпись, его проверка — аутентификация, обмен ключами — Диффи-Хеллман, массовое шифрование — аутентифицированное симметричное. TLS — не отдельная тема, а собранные эти части.

## Осмотрите живое рукопожатие

```
$ openssl s_client -connect example.com:443 2>/dev/null | grep -E "Protocol|Cipher"
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_256_GCM_SHA384
```

Читайте набор шифров как предложение: **AES-256** в режиме **GCM** для данных, **SHA-384** для целостности, со встроенным эфемерным обменом ключами TLS 1.3. Каждый термин — то, что вы теперь знаете.

## Попробуйте

1. Запустите крошечный пример Диффи-Хеллмана. Измените `a` и `b`; согласуются ли обе стороны?
2. `openssl s_client` к сайту и прочитайте согласованный набор шифров. Назовите каждую часть.
3. Объясните прямую секретность в одном предложении: почему кража ключа сервера завтра не расшифрует записанную сегодня сессию?""",
        "questions": [
            q("What does Diffie-Hellman achieve?",
              "Diffie-Hellman nimaga erishadi?",
              "Чего достигает Диффи-Хеллман?",
              ["A shared secret over a public channel without sending it",
               "Faster symmetric encryption", "A one-way hash",
               "Factoring large primes"],
              ["Ochiq kanal orqali sirни yubormasдан umumiy sir",
               "Tezroq simmetrik shifrlash", "Bir tomonlama xesh",
               "Katta tub sonlarни ajratish"],
              ["Общий секрет по публичному каналу без его отправки",
               "Более быстрое симметричное шифрование", "Односторонний хеш",
               "Факторизацию больших простых"], 0),
            q("Why do real protocols combine asymmetric and symmetric crypto?",
              "Nega haqiqiy protokollar asimmetrik va simmetrik kriptografiyani birlashtiradi?",
              "Почему реальные протоколы сочетают асимметричную и симметричную криптографию?",
              ["Asymmetric distributes the key; symmetric encrypts fast",
               "Symmetric is more secure than asymmetric", "Asymmetric is faster for bulk data",
               "It is only for backward compatibility"],
              ["Asimmetrik kalitни tarqatadi; simmetrik tez shifrlaydi",
               "Simmetrik asimmetrikдан xavfsizroq", "Asimmetrik ommaviy ma'lumot uchun tezroq",
               "Bu faqat orqага moslik uchun"],
              ["Асимметричное распространяет ключ; симметричное быстро шифрует",
               "Симметричное безопаснее асимметричного", "Асимметричное быстрее для массовых данных",
               "Это только для обратной совместимости"], 0),
            q("What does forward secrecy guarantee?",
              "Oldinga maxfiylik nimani kafolatlaydi?",
              "Что гарантирует прямая секретность?",
              ["Stealing the server key later cannot decrypt past sessions",
               "Passwords are hashed with a salt", "Certificates never expire",
               "The cipher cannot be downgraded"],
              ["Server kalitини keyinroq o'g'irlash o'tган sessiyalarni deshifrlay olmaydi",
               "Parollar tuz bilan xeshlanadi", "Sertifikatlar hech qachon tugamaydi",
               "Shifrни pasaytirib bo'lmaydi"],
              ["Кража ключа сервера позже не расшифрует прошлые сессии",
               "Пароли хешируются с солью", "Сертификаты не истекают",
               "Шифр нельзя понизить"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "crypto", "points": 80,
        "title": "Attacking crypto in CTFs: putting it together",
        "titleUz": "CTF'да kriptografiyaga hujum: hammasini birlashtirish",
        "titleRu": "Атака на криптографию в CTF: собираем всё вместе",
        "content": r"""Crypto challenges look intimidating and are mostly a checklist. The winning skill is not advanced maths — it is *identifying* what you are looking at and reaching for the right known attack. This lesson is that checklist.

## The identification flowchart

Nearly every crypto challenge starts the same way: figure out what the blob is.

```
Looks like text with =, +, / ?          → base64, decode it
Only 0-9 a-f ?                          → hex, decode it (or a hash — check length)
32 / 40 / 64 hex chars ?                → MD5 / SHA-1 / SHA-256 hash → crack it
Starts with -----BEGIN ?                → PEM key or cert → openssl / RsaCtfTool
n and e given, or a public.pem ?        → RSA → check factordb, small-e, RsaCtfTool
Single repeated shift, or readable-ish ? → classical cipher → Caesar/Vigenère/frequency
Two ciphertexts, or a hex key hint ?     → XOR → single-byte brute or xortool
```

Run the blob through this before touching any maths. Half of crypto challenges are solved at the identification step alone.

## The toolkit, mapped to what it beats

| Situation | Tool | Move |
|---|---|---|
| Layered / unknown encoding | CyberChef ("Magic") | let it detect the recipe |
| A hash to reverse | john, hashcat | dictionary then brute-force |
| Identify a hash | hashid, hash-identifier | narrow the algorithm |
| Weak RSA | RsaCtfTool, factordb | run every known attack |
| Repeating-key XOR | xortool | recover key length then key |
| Classical substitution | dcode.fr, quipqiup | automated frequency solving |
| General scripting | Python + pycryptodome | anything bespoke |

`dcode.fr` deserves a special mention: it recognises and solves dozens of classical ciphers automatically, and is often the fastest path for anything pre-modern.

## Worked example: an RSA challenge

You are given `n`, `e`, and a ciphertext `c`. The disciplined sequence:

```
1. Is n small or on factordb?
   $ python3 -c "print(len(str(3233)))"   # tiny → factordb will have it
   Look up n on factordb.com → get p, q

2. With p and q, reconstruct the private key and decrypt:
   $ python3 -c "
   p, q, e, c = 61, 53, 17, 2790
   n = p*q; phi = (p-1)*(q-1)
   d = pow(e, -1, phi)
   print(pow(c, d, n))
   "
   65

3. If factoring fails, is e tiny (e=3) with a short message?
   → try an integer cube root of c (no modulus involved)

4. Still stuck? Let RsaCtfTool try them all:
   $ RsaCtfTool --publickey public.pem --uncipherfile cipher.bin
```

You did not break RSA. You recognised a *misused* RSA and applied the matching known attack — which is the entire game.

## Worked example: an unknown blob

```
$ echo 'NTM0YzY5NmU3NTc4' | base64 -d
534c696e7578
$ echo '534c696e7578' | xxd -r -p
SLinux
```

Base64, then hex, then text — two decodes, no cryptography at all. The "Magic" mode in CyberChef would have peeled both layers in one step. Recognising *layers* is a skill of its own: decode, look, decode again, until it reads as text.

## The flag format is your oracle

CTF flags follow a fixed pattern — here `flag{...}` with a 32-character value. That gives you a check: after any decode or decrypt, *does the output start to look like the flag format?* If a step produces `flag{` you are on the right path; if it produces noise, back up and reconsider the identification. Use the known ending as a target, not just the start.

## What this module was really about

Six lessons of theory reduce to a few working habits:

- **Identify before you attack.** Encoding, hash, symmetric, asymmetric, classical — each has a signature and a standard response.
- **Encoding is never security.** Decode it and move on.
- **Modern crypto is not broken; its misuse is.** ECB, small RSA keys, fast password hashes, reused IVs, missing salts — every real break in this module was a *usage* error, not a broken algorithm.
- **The defender's version is the same knowledge inverted:** salt and slow-hash passwords, use authenticated AES modes, pick proper RSA sizes with padding, and never confuse encoding with encryption.

Learn the signatures and the standard responses, and crypto challenges stop being a wall and become a checklist you run.

## Try it

1. Chain-decode `NTM0YzY5NmU3NTc4` by hand: base64, then hex. What text falls out?
2. Take the small RSA example, publish only `n` and `e`, and recover the message via factordb logic.
3. Given a 32-hex-character string labelled only "hash", identify it and attempt to crack it with John.""",
        "contentUz": r"""Kriptografiya challenge'lari qo'rqinchli ko'rinadi va asosan tekshirish ro'yxati. G'olib ko'nikma ilg'or matematika emas — bu qarayotган narsangizni *aniqlash* va to'g'ri ma'lum hujumга qo'l cho'zish. Bu dars — o'sha tekshirish ro'yxati.

## Aniqlash blok-sxemasi

Deyarli har bir kripto challenge bir xil boshlanadi: blob nima ekanini aniqlang.

```
=, +, / bilan matnга o'xshaydimi?        → base64, dekodlang
Faqat 0-9 a-f ?                          → hex, dekodlang (yoki xesh — uzunlikни tekshiring)
32 / 40 / 64 hex belgi ?                 → MD5 / SHA-1 / SHA-256 xesh → buzing
-----BEGIN bilan boshlanadimi ?          → PEM kalit yoki sert → openssl / RsaCtfTool
n va e berilgan, yoki public.pem ?       → RSA → factordb, kichik-e, RsaCtfTool ni tekshiring
Bitta takroriy siljish, yoki o'qiladigan? → klassik shifr → Sezar/Vigenère/chastota
Ikki shifrmatn, yoki hex kalit ishorasi ? → XOR → bir baytли brute yoki xortool
```

Har qanday matematikaga tegishдан oldin blobni shundан o'tkazing. Kripto challenge'larning yarmi faqat aniqlash bosqichiда yechiladi.

## Asboblar to'plami, u yengadigan narsага moslangan

| Vaziyat | Vosita | Harakat |
|---|---|---|
| Qatlamli / noma'lum kodlash | CyberChef ("Magic") | retseptni aniqlashiga qo'ying |
| Qaytariladigan xesh | john, hashcat | lug'at keyin brute-force |
| Xeshни aniqlash | hashid, hash-identifier | algoritmni toraytiring |
| Zaif RSA | RsaCtfTool, factordb | har bir ma'lum hujumни yuriting |
| Takrorlanuvchi kalitли XOR | xortool | kalit uzunligi keyin kalit |
| Klassik o'rniga qo'yish | dcode.fr, quipqiup | avtomatik chastota yechish |
| Umumiy skript | Python + pycryptodome | har qanday maxsus narsa |

`dcode.fr` alohida eslatishга loyiq: u o'nlab klassik shifrларни avtomatik taniydi va yechadi, va ko'pincha zamonaviygа qadar hamma narsa uchun eng tez yo'l.

## Ishlangan misol: RSA challenge

Sizga `n`, `e` va shifrmatn `c` beriladi. Intizomli ketma-ketlik:

```
1. n kichikmi yoki factordb'дами?
   $ python3 -c "print(len(str(3233)))"   # kichik → factordb'да bo'ladi
   n ni factordb.com'да qidiring → p, q ni oling

2. p va q bilan maxfiy kalitни qayta tuzing va deshifrlang:
   $ python3 -c "
   p, q, e, c = 61, 53, 17, 2790
   n = p*q; phi = (p-1)*(q-1)
   d = pow(e, -1, phi)
   print(pow(c, d, n))
   "
   65

3. Agar ajratish muvaffaqiyatsiz bo'lsa, e kichikmi (e=3) qisqa xabar bilan?
   → c ning butun kub ildizini sinang (modul yo'q)

4. Hamon tiqilib qoldingizmi? RsaCtfTool hammasini sinasin:
   $ RsaCtfTool --publickey public.pem --uncipherfile cipher.bin
```

Siz RSA'ни buzmadingiz. Siz *noto'g'ri ishlatilgan* RSA'ни tanidingiz va mos ma'lum hujumни qo'lladingiz — butun o'yin shu.

## Ishlangan misol: noma'lum blob

```
$ echo 'NTM0YzY5NmU3NTc4' | base64 -d
534c696e7578
$ echo '534c696e7578' | xxd -r -p
SLinux
```

Base64, keyin hex, keyin matn — ikki dekodlash, umuman kriptografiyasiz. CyberChef'даgi "Magic" rejimi ikkala qatlamни bitta qadamда archib olardi. *Qatlamlar*ни tanish — o'ziga xos ko'nikma: dekodlang, qarang, yana dekodlang, u matn sifatida o'qilguncha.

## Flag formati sizning orakulingiz

CTF flaglari belgilangan naqshга ergashadi — bu yerда 32-belgili qiymatли `flag{...}`. Bu sizga tekshiruv beradi: har qanday dekodlash yoki deshifrlashдан keyin, *chiqish flag formatiга o'xshay boshladimi?* Agar qadam `flag{` bersa, siz to'g'ri yo'ldasiz; agar shovqin bersa, orqага qayting va aniqlashни qayta ko'rib chiqing. Ma'lum oxirini nishon sifatida ishlating, faqat boshini emas.

## Bu modul aslida nima haqida edi

Olti dars nazariya bir necha ishchi odatга kamayadi:

- **Hujumдан oldin aniqlang.** Kodlash, xesh, simmetrik, asimmetrik, klassik — har birining imzosi va standart javobi bor.
- **Kodlash hech qachon xavfsizlik emas.** Dekodlang va davom eting.
- **Zamonaviy kriptografiya buzilmagan; uni noto'g'ri ishlatish buzilgan.** ECB, kichik RSA kalitlari, tez parol xeshлари, qayta ishlatilgan IV'lar, yo'q tuzlar — bu moduldаgi har bir haqiqiy buzish *ishlatish* xatosi edi, buzilgan algoritm emas.
- **Himoyachi versiyasi — xuddi shu bilim teskari:** parollarni tuzlab va sekin-xeshlang, autentifikatsiyalangan AES rejimларni ishlating, to'ldirishли to'g'ri RSA o'lchamlarини tanlang, va kodlashni shifrlash bilan hech qachon adashtirmang.

Imzolar va standart javoblarни o'rganing, va kripto challenge'lari devor bo'lishдан to'xtab, siz yuritadigan tekshirish ro'yxatiга aylanadi.

## Sinab ko'ring

1. `NTM0YzY5NmU3NTc4` ni qo'lда zanjir-dekodlang: base64, keyin hex. Qanday matn chiqadi?
2. Kichik RSA misolини oling, faqat `n` va `e` ni e'lon qiling, va factordb mantig'i orqali xabarни tiklang.
3. Faqat "xesh" deb belgilangan 32-hex-belgili satr berilганда, uni aniqlang va John bilan buzishga urining.""",
        "contentRu": r"""Крипто-задания выглядят пугающе, а по сути — чек-лист. Побеждающий навык не в продвинутой математике — он в *опознании* того, на что вы смотрите, и в обращении к правильной известной атаке. Этот урок — тот самый чек-лист.

## Блок-схема опознания

Почти каждое крипто-задание начинается одинаково: понять, что за блоб.

```
Похоже на текст с =, +, / ?              → base64, декодируйте
Только 0-9 a-f ?                         → hex, декодируйте (или хеш — проверьте длину)
32 / 40 / 64 hex-символа ?               → хеш MD5 / SHA-1 / SHA-256 → взломать
Начинается с -----BEGIN ?                → PEM-ключ или серт → openssl / RsaCtfTool
Даны n и e, или public.pem ?             → RSA → проверить factordb, малый-e, RsaCtfTool
Один повторяющийся сдвиг, или почти читаемо? → классический шифр → Цезарь/Виженер/частота
Два шифртекста, или намёк на hex-ключ ?  → XOR → однобайтовый перебор или xortool
```

Прогоните блоб через это до всякой математики. Половина крипто-заданий решается на одном шаге опознания.

## Набор инструментов, сопоставленный с тем, что он бьёт

| Ситуация | Инструмент | Ход |
|---|---|---|
| Слоёная / неизвестная кодировка | CyberChef ("Magic") | дайте определить рецепт |
| Хеш для обращения | john, hashcat | словарь, затем перебор |
| Опознать хеш | hashid, hash-identifier | сузить алгоритм |
| Слабый RSA | RsaCtfTool, factordb | прогнать все известные атаки |
| XOR с повторяющимся ключом | xortool | длину ключа, затем ключ |
| Классическая замена | dcode.fr, quipqiup | автоматическое частотное решение |
| Общий скриптинг | Python + pycryptodome | что угодно нестандартное |

`dcode.fr` заслуживает особого упоминания: он распознаёт и решает десятки классических шифров автоматически и часто самый быстрый путь для всего домодерного.

## Разобранный пример: RSA-задание

Вам дают `n`, `e` и шифртекст `c`. Дисциплинированная последовательность:

```
1. Мал ли n или есть на factordb?
   $ python3 -c "print(len(str(3233)))"   # мал → factordb его знает
   Найдите n на factordb.com → получите p, q

2. С p и q восстановите закрытый ключ и расшифруйте:
   $ python3 -c "
   p, q, e, c = 61, 53, 17, 2790
   n = p*q; phi = (p-1)*(q-1)
   d = pow(e, -1, phi)
   print(pow(c, d, n))
   "
   65

3. Если факторизация не удалась, мал ли e (e=3) при коротком сообщении?
   → попробуйте целый кубический корень из c (без модуля)

4. Всё ещё застряли? Пусть RsaCtfTool попробует всё:
   $ RsaCtfTool --publickey public.pem --uncipherfile cipher.bin
```

Вы не сломали RSA. Вы опознали *неправильно применённый* RSA и применили подходящую известную атаку — в этом вся игра.

## Разобранный пример: неизвестный блоб

```
$ echo 'NTM0YzY5NmU3NTc4' | base64 -d
534c696e7578
$ echo '534c696e7578' | xxd -r -p
SLinux
```

Base64, потом hex, потом текст — два декодирования, никакой криптографии. Режим «Magic» в CyberChef снял бы оба слоя в один шаг. Распознавать *слои* — отдельный навык: декодируй, смотри, декодируй снова, пока не прочитается как текст.

## Формат флага — ваш оракул

CTF-флаги следуют фиксированному шаблону — здесь `flag{...}` с 32-символьным значением. Это даёт проверку: после любого декодирования или расшифровки — *начинает ли вывод походить на формат флага?* Если шаг даёт `flag{`, вы на верном пути; если шум — вернитесь и пересмотрите опознание. Используйте известное окончание как цель, а не только начало.

## О чём этот модуль был на самом деле

Шесть уроков теории сводятся к нескольким рабочим привычкам:

- **Опознавай до атаки.** Кодирование, хеш, симметрия, асимметрия, классика — у каждого есть подпись и стандартный ответ.
- **Кодирование — никогда не защита.** Декодируй и иди дальше.
- **Современная криптография не сломана; сломано её неправильное применение.** ECB, малые ключи RSA, быстрые хеши паролей, переиспользованные IV, отсутствующие соли — каждый реальный взлом в этом модуле был ошибкой *применения*, а не сломанным алгоритмом.
- **Версия защитника — то же знание наоборот:** солите и медленно хешируйте пароли, используйте аутентифицированные режимы AES, берите нормальные размеры RSA с паддингом и никогда не путайте кодирование с шифрованием.

Выучите подписи и стандартные ответы — и крипто-задания перестают быть стеной и становятся чек-листом, который вы прогоняете.

## Попробуйте

1. Цепочкой декодируйте `NTM0YzY5NmU3NTc4` вручную: base64, затем hex. Какой текст выпадет?
2. Возьмите малый пример RSA, опубликуйте только `n` и `e` и восстановите сообщение логикой factordb.
3. Дана 32-hex-символьная строка с меткой лишь «hash» — опознайте её и попробуйте взломать через John.""",
        "questions": [
            q("What is the most important first step in a crypto challenge?",
              "Kripto challenge'да eng muhim birinchi qadam nima?",
              "Каков важнейший первый шаг в крипто-задании?",
              ["Identifying what kind of data or cipher you are looking at",
               "Writing a custom brute-forcer", "Factoring the modulus immediately",
               "Guessing the flag"],
              ["Qanday ma'lumot yoki shifrga qarayotganingizni aniqlash",
               "Maxsus brute-forcer yozish", "Modulni darrov ajratish",
               "Flagni taxmin qilish"],
              ["Опознание, что за данные или шифр перед вами",
               "Написание своего перебора", "Немедленная факторизация модуля",
               "Угадывание флага"], 0),
            q("An RSA challenge is solvable in a CTF usually because:",
              "CTF'да RSA challenge odatда yechiladi, chunki:",
              "RSA-задание в CTF обычно решаемо, потому что:",
              ["The key was misused — small n, small e, or reused primes",
               "RSA itself is broken", "The private key is always given",
               "AES protects it"],
              ["Kalit noto'g'ri ishlatilган — kichik n, kichik e yoki qayta ishlatilган tub sonlar",
               "RSA'ning o'zi buzilган", "Maxfiy kalit doim beriladi",
               "AES uni himoya qiladi"],
              ["Ключ применён неправильно — малый n, малый e или переиспользованные простые",
               "Сам RSA сломан", "Закрытый ключ всегда дан",
               "Его защищает AES"], 0),
            q("The module's recurring lesson about modern crypto is:",
              "Modulning zamonaviy kriptografiya haqidagi takrorlanuvchi darsi:",
              "Повторяющийся урок модуля о современной криптографии:",
              ["The algorithms are sound; the breaks come from misuse",
               "All modern algorithms are broken", "Encoding provides real security",
               "Longer keys are always the fix"],
              ["Algoritmlar mustahkam; buzishlar noto'g'ri ishlatishдан keladi",
               "Barcha zamonaviy algoritmlar buzilган", "Kodlash haqiqiy xavfsizlik beradi",
               "Uzunroq kalitlar doim yechim"],
              ["Алгоритмы надёжны; взломы идут от неправильного применения",
               "Все современные алгоритмы сломаны", "Кодирование даёт реальную защиту",
               "Более длинные ключи — всегда решение"], 0),
        ],
    },
]


MODULE = {
    "slug": "cryptography-for-security",
    "category": "crypto",
    "title": "Cryptography for Security",
    "titleUz": "Xavfsizlik uchun kriptografiya",
    "titleRu": "Криптография для безопасности",
    "description": (
        "Cryptography as a practitioner uses it, not as a maths course. Telling encoding, encryption and "
        "hashing apart; hash functions, cracking with John and hashcat, and how to store passwords; XOR and "
        "classical ciphers; AES and why the mode matters; RSA and public keys; Diffie-Hellman and how TLS "
        "assembles all of it; and a CTF checklist that turns crypto challenges from a wall into a routine."
    ),
    "descriptionUz": (
        "Amaliyotchi ishlatadigan kriptografiya, matematika kursi emas. Kodlash, shifrlash va xeshlashni "
        "ajratish; xesh funksiyalar, John va hashcat bilan buzish, va parollarni qanday saqlash; XOR va "
        "klassik shifrlar; AES va nega rejim muhim; RSA va ochiq kalitlar; Diffie-Hellman va TLS hammasini "
        "qanday yig'ishi; va kripto challenge'larни devordан odatga aylantiradigan CTF tekshirish ro'yxati."
    ),
    "descriptionRu": (
        "Криптография так, как её использует практик, а не курс математики. Различение кодирования, "
        "шифрования и хеширования; хеш-функции, взлом через John и hashcat, и как хранить пароли; XOR и "
        "классические шифры; AES и почему важен режим; RSA и открытые ключи; Диффи-Хеллман и как TLS всё "
        "собирает; и CTF-чеклист, превращающий крипто-задания из стены в рутину."
    ),
    "difficulty": "intermediate",
    "estimatedHours": 45,
    "passScore": 80,
    "orderIndex": 3,
    "exam": [
        q("Base64 is an example of:",
          "Base64 nimaga misol:",
          "Base64 — это пример:",
          ["Encoding — reversible by anyone, no key", "Encryption — needs a key",
           "Hashing — one-way", "A signature scheme"],
          ["Kodlash — har kim qaytaradi, kalitsiz", "Shifrlash — kalit kerak",
           "Xeshlash — bir tomonlama", "Imzo sxemasi"],
          ["Кодирования — обратимо любым, без ключа", "Шифрования — нужен ключ",
           "Хеширования — одностороннее", "Схемы подписи"], 0),
        q("A 32-hex-character string is most likely which hash?",
          "32-hex-belgili satr katta ehtimol qaysi xesh?",
          "32-hex-символьная строка — скорее всего какой хеш?",
          ["MD5", "SHA-256", "SHA-512", "bcrypt"],
          ["MD5", "SHA-256", "SHA-512", "bcrypt"],
          ["MD5", "SHA-256", "SHA-512", "bcrypt"], 0),
        q("Cracking a hash means:",
          "Xeshни buzish nimani anglatadi:",
          "Взломать хеш значит:",
          ["Hashing guesses until one matches", "Mathematically inverting it",
           "Decrypting it with a key", "Reading it from /etc/shadow"],
          ["Bittasi mos kelguncha taxminlarni xeshlash", "Uni matematik teskari qilish",
           "Uni kalit bilan deshifrlash", "Uni /etc/shadow'дан o'qish"],
          ["Хешировать догадки, пока не совпадёт", "Математически инвертировать",
           "Расшифровать ключом", "Прочитать из /etc/shadow"], 0),
        q("What does adding a salt to a password hash prevent?",
          "Parol xeshiга tuz qo'shish nimани oldini oladi?",
          "Что предотвращает добавление соли к хешу пароля?",
          ["Precomputed rainbow-table lookups", "Brute-force entirely",
           "The avalanche effect", "The need for hashing"],
          ["Oldindan hisoblangan kamalak-jadval qidiruvlarini", "Brute-force'ni butunlay",
           "Ko'chki effektini", "Xeshlashga ehtiyojni"],
          ["Поиск по предвычисленной радужной таблице", "Перебор полностью",
           "Лавинный эффект", "Необходимость хеширования"], 0),
        q("Why is bcrypt better than SHA-256 for passwords?",
          "Nega parol uchun bcrypt SHA-256'дан yaxshiroq?",
          "Почему bcrypt лучше SHA-256 для паролей?",
          ["It is deliberately slow, making guessing expensive", "It is faster",
           "It produces a shorter hash", "It is reversible"],
          ["U ataylab sekin, taxminni qimmat qiladi", "U tezroq",
           "U qisqaroq xesh beradi", "U qaytariladi"],
          ["Он намеренно медленный, делая перебор дорогим", "Он быстрее",
           "Он даёт более короткий хеш", "Он обратим"], 0),
        q("Encrypting then decrypting with the SAME operation is characteristic of:",
          "Bir xil operatsiya bilan shifrlab keyin deshifrlash nimага xos:",
          "Шифрование и расшифровка ОДНОЙ операцией характерны для:",
          ["XOR", "RSA", "SHA-256", "Diffie-Hellman"],
          ["XOR", "RSA", "SHA-256", "Diffie-Hellman"],
          ["XOR", "RSA", "SHA-256", "Diffie-Hellman"], 0),
        q("Why does a single-byte XOR cipher fall instantly?",
          "Nega bir baytли XOR shifri bir zumda yiqiladi?",
          "Почему однобайтовый XOR-шифр падает мгновенно?",
          ["Only 256 keys exist to try", "The key is printed in the ciphertext",
           "XOR preserves letter case", "It uses a public key"],
          ["Sinash uchun faqat 256 kalit bor", "Kalit shifrmatnда chop etiladi",
           "XOR harf registrini saqlaydi", "U ochiq kalit ishlatadi"],
          ["Существует лишь 256 ключей для перебора", "Ключ напечатан в шифртексте",
           "XOR сохраняет регистр букв", "Он использует открытый ключ"], 0),
        q("Why must AES never be used in ECB mode?",
          "Nega AES hech qachon ECB rejimида ishlatilmasligi kerak?",
          "Почему AES нельзя использовать в режиме ECB?",
          ["Identical plaintext blocks give identical ciphertext, leaking patterns",
           "ECB uses a weaker key", "ECB cannot be decrypted", "ECB is slower"],
          ["Bir xil ochiq matn bloklari bir xil shifrmatn beradi, naqshlarni sizdiradi",
           "ECB zaifroq kalit ishlatadi", "ECB'ни deshifrlab bo'lmaydi", "ECB sekinroq"],
          ["Одинаковые блоки открытого текста дают одинаковый шифртекст, выдавая шаблоны",
           "ECB использует более слабый ключ", "ECB нельзя расшифровать", "ECB медленнее"], 0),
        q("AES-GCM provides confidentiality and additionally:",
          "AES-GCM maxfiylik va qo'shimcha:",
          "AES-GCM даёт конфиденциальность и дополнительно:",
          ["An authentication tag detecting tampering", "A public/private key pair",
           "A one-way hash", "A key exchange"],
          ["Aralashuvni aniqlaydigan autentifikatsiya tegi", "Ochiq/maxfiy kalit jufti",
           "Bir tomonlama xesh", "Kalit almashuvi"],
          ["Тег аутентификации, обнаруживающий подмену", "Пару открытый/закрытый ключ",
           "Односторонний хеш", "Обмен ключами"], 0),
        q("RSA's security depends on the difficulty of:",
          "RSA xavfsizligi nimaning qiyinligiга bog'liq:",
          "Безопасность RSA зависит от трудности:",
          ["Factoring the product of two large primes", "Reversing SHA-256",
           "Guessing a bcrypt cost", "Brute-forcing AES"],
          ["Ikki katta tub son ko'paytmasini ajratish", "SHA-256'ни qaytarish",
           "bcrypt narxини taxmin qilish", "AES'ни brute-force qilish"],
          ["Факторизации произведения двух больших простых", "Обращения SHA-256",
           "Угадывания стоимости bcrypt", "Перебора AES"], 0),
        q("You encrypt a message with someone's PUBLIC key. Who can read it?",
          "Siz xabarни birovning OCHIQ kaliti bilan shifrlaysiz. Uni kim o'qiy oladi?",
          "Вы шифруете сообщение чьим-то ОТКРЫТЫМ ключом. Кто прочтёт?",
          ["Only the holder of the private key", "Anyone with the public key",
           "Everyone — public keys are shared", "Only you"],
          ["Faqat maxfiy kalit egasi", "Ochiq kalitли har kim",
           "Hamma — ochiq kalitlar bo'lishiladi", "Faqat siz"],
          ["Только владелец закрытого ключа", "Любой с открытым ключом",
           "Все — открытые ключи общие", "Только вы"], 0),
        q("Diffie-Hellman lets two parties:",
          "Diffie-Hellman ikki tomonга nimага imkon beradi:",
          "Диффи-Хеллман позволяет двум сторонам:",
          ["Agree on a shared secret over a public channel without sending it",
           "Hash a password with a salt", "Sign a document",
           "Factor a modulus"],
          ["Ochiq kanal orqali sirни yubormasдан umumiy sirга kelishish",
           "Parolني tuz bilan xeshlash", "Hujjatни imzolash",
           "Modulني ajratish"],
          ["Договориться об общем секрете по публичному каналу, не отправляя его",
           "Захешировать пароль с солью", "Подписать документ",
           "Факторизовать модуль"], 0),
        q("Real protocols use asymmetric crypto to ___ and symmetric crypto to ___.",
          "Haqiqiy protokollar ___ uchun asimmetrik va ___ uchun simmetrik kriptografiya ishlatadi.",
          "Реальные протоколы используют асимметрию для ___ и симметрию для ___.",
          ["establish/authenticate a key; encrypt the bulk data",
           "encrypt the bulk data; establish a key", "hash data; sign it",
           "sign data; hash it"],
          ["kalitни o'rnatish/autentifikatsiya; ommaviy ma'lumotni shifrlash",
           "ommaviy ma'lumotni shifrlash; kalitни o'rnatish", "ma'lumotni xeshlash; imzolash",
           "ma'lumotni imzolash; xeshlash"],
          ["установить/аутентифицировать ключ; шифровать массив данных",
           "шифровать массив данных; установить ключ", "хешировать данные; подписать",
           "подписать данные; хешировать"], 0),
        q("Forward secrecy means that:",
          "Oldinga maxfiylik shuni anglatadi:",
          "Прямая секретность означает, что:",
          ["Stealing the long-term key later cannot decrypt past sessions",
           "The certificate never expires", "Passwords are salted",
           "The cipher cannot be downgraded"],
          ["Uzoq muddatli kalitни keyinroq o'g'irlash o'tган sessiyalarni deshifrlay olmaydi",
           "Sertifikat hech qachon tugamaydi", "Parollar tuzlanган",
           "Shifrни pasaytirib bo'lmaydi"],
          ["Кража долгосрочного ключа позже не расшифрует прошлые сессии",
           "Сертификат не истекает", "Пароли солёные",
           "Шифр нельзя понизить"], 0),
        q("The recurring lesson of the module is that a real crypto break is usually:",
          "Modulning takrorlanuvchi darsi shuki, haqiqiy kripto buzish odatда:",
          "Повторяющийся урок модуля: реальный крипто-взлом обычно это:",
          ["A misuse of a sound algorithm, not a broken algorithm",
           "A newly discovered flaw in AES", "Proof that all crypto is weak",
           "Always solved by a longer key"],
          ["Mustahkam algoritmni noto'g'ri ishlatish, buzilган algoritm emas",
           "AES'да yangi topilган nuqson", "Barcha kriptografiya zaif ekaniga dalil",
           "Doim uzunroq kalit bilan yechiladi"],
          ["Неправильное применение надёжного алгоритма, а не сломанный алгоритм",
           "Заново найденный изъян в AES", "Доказательство, что вся крипта слаба",
           "Всегда решается более длинным ключом"], 0),
    ],
}
