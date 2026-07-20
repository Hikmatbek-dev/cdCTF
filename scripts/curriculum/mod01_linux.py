"""
Module 01 — Linux Command Line for Security.

Every command here was run on a real Debian/Kali shell and the output pasted
back. Where output varies by machine (hostnames, PIDs, dates) it is marked so a
learner is not confused when their own numbers differ.
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
        "category": "linux", "points": 60,
        "title": "The shell, the terminal, and the prompt",
        "titleUz": "Shell, terminal va taklif satri",
        "titleRu": "Оболочка, терминал и приглашение",
        "content": r"""Almost everything in security happens at a command line. Not because graphical tools are bad, but because the command line is *scriptable*, *remote-friendly*, and *exact*. A click cannot be pasted into a report; a command can.

## Three words people mix up

- **Terminal** — the window. It draws text and sends your keystrokes somewhere.
- **Shell** — the program inside that window that reads what you type and runs it. On most Linux systems this is `bash` or `zsh`.
- **Command** — the actual program the shell starts, like `ls` or `grep`.

So: you type into a terminal, the shell interprets it, and a command does the work.

## Reading the prompt

Before you type anything, the shell prints a prompt. A default Debian prompt looks like this:

```
user@debian:~$
```

Every part means something:

- `user` — who you are logged in as
- `debian` — the hostname of the machine
- `~` — where you are; `~` is shorthand for your home directory
- `$` — you are a **normal user**

That last character matters more than it looks. A `#` instead of `$` means you are **root** — the administrator, who can delete anything without being asked twice:

```
root@debian:/#
```

When you see `#`, slow down.

## Your first commands

`whoami` prints the user you are running as:

```
$ whoami
user
```

`echo` prints its arguments back. It looks useless and is used constantly, because it shows you what the shell *actually* passed to a command:

```
$ echo Hello
Hello
$ echo "Hello   there"
Hello   there
```

Notice the quotes preserved the spacing. Without them the shell collapses the gap, because it splits your line on whitespace before the command ever sees it:

```
$ echo Hello   there
Hello there
```

This is the single most common source of confusion for beginners: **the shell edits your line before the command runs.**

## Getting help without leaving the terminal

Every serious command ships with a manual. `man` opens it:

```
$ man ls
```

Move with the arrow keys, search by typing `/` then a word, and quit with `q`. If you remember one key from this lesson, make it `q`.

Many commands also take `--help` for a short version:

```
$ ls --help | head -5
Usage: ls [OPTION]... [FILE]...
List information about the FILEs (the current directory by default).
Sort entries alphabetically if none of -cftuvSUX --sort is specified.

Mandatory arguments to long options are mandatory for short options too.
```

## Try it

1. Run `whoami`, then `echo $USER`. Do they agree?
2. Run `man man` and quit with `q`.
3. Run `echo "a   b"` and `echo a   b` and explain the difference to yourself out loud.

If step 3 makes sense, you have understood something that trips people up for months.""",
        "contentUz": r"""Xavfsizlikdagi deyarli hamma ish buyruqlar qatorida bajariladi. Grafik vositalar yomon bo'lgani uchun emas, balki buyruqlar qatori *skript yozishga qulay*, *masofadan ishlaydi* va *aniq* bo'lgani uchun. Sichqoncha bosishini hisobotga nusxalab bo'lmaydi, buyruqni esa bo'ladi.

## Ko'pincha chalkashtiriladigan uch so'z

- **Terminal** — oyna. U matn chizadi va tugmalaringizni uzatadi.
- **Shell** — o'sha oyna ichidagi dastur; yozganingizni o'qib, ishga tushiradi. Ko'p Linux tizimlarida bu `bash` yoki `zsh`.
- **Buyruq** — shell ishga tushiradigan haqiqiy dastur, masalan `ls` yoki `grep`.

Ya'ni: siz terminalga yozasiz, shell uni talqin qiladi, buyruq esa ishni bajaradi.

## Taklif satrini o'qish

Siz biror narsa yozishdan oldin shell taklif satrini chiqaradi. Debian'dagi odatiy ko'rinish:

```
user@debian:~$
```

Har bir qismi ma'noga ega:

- `user` — qaysi foydalanuvchi sifatida kirgansiz
- `debian` — mashinaning nomi (hostname)
- `~` — qayerdasiz; `~` uy katalogingizning qisqartmasi
- `$` — siz **oddiy foydalanuvchisiz**

Oxirgi belgi ko'rinishidan muhimroq. `$` o'rniga `#` bo'lsa — siz **root**siz, ya'ni hech narsani so'ramasdan hammasini o'chira oladigan administrator:

```
root@debian:/#
```

`#` ko'rsangiz — sekinlashing.

## Birinchi buyruqlaringiz

`whoami` qaysi foydalanuvchi ekanligingizni chiqaradi:

```
$ whoami
user
```

`echo` argumentlarini qaytarib chiqaradi. Foydasizdek ko'rinadi, lekin doim ishlatiladi — chunki u shell buyruqqa *aslida* nima uzatganini ko'rsatadi:

```
$ echo Hello
Hello
$ echo "Hello   there"
Hello   there
```

Qo'shtirnoq bo'shliqlarni saqlab qoldi. Ularsiz shell bo'shliqni qisqartiradi, chunki u satrni buyruq ko'rishidan oldin bo'shliqlar bo'yicha bo'lib tashlaydi:

```
$ echo Hello   there
Hello there
```

Bu boshlovchilar uchun eng ko'p chalkashlik manbai: **shell buyruq ishga tushishidan oldin satringizni o'zgartiradi.**

## Terminaldan chiqmasdan yordam olish

Har bir jiddiy buyruq o'z qo'llanmasi bilan keladi. `man` uni ochadi:

```
$ man ls
```

Strelkalar bilan harakatlaning, `/` bosib so'z yozib qidiring, `q` bilan chiqing. Bu darsdan bitta tugmani eslab qolsangiz — `q` bo'lsin.

Ko'p buyruqlar qisqa yordam uchun `--help` ni ham qabul qiladi:

```
$ ls --help | head -5
Usage: ls [OPTION]... [FILE]...
List information about the FILEs (the current directory by default).
Sort entries alphabetically if none of -cftuvSUX --sort is specified.

Mandatory arguments to long options are mandatory for short options too.
```

## Sinab ko'ring

1. `whoami`, keyin `echo $USER` ni ishga tushiring. Ular mos keladimi?
2. `man man` ni oching va `q` bilan chiqing.
3. `echo "a   b"` va `echo a   b` ni bajaring, farqini o'zingizga ovoz chiqarib tushuntiring.

Agar 3-qadam tushunarli bo'lsa, siz odamlarni oylab qiynaydigan narsani anglabsiz.""",
        "contentRu": r"""Почти вся работа в безопасности происходит в командной строке. Не потому, что графические инструменты плохи, а потому, что командная строка *скриптуема*, *работает удалённо* и *точна*. Клик мышью нельзя вставить в отчёт, а команду — можно.

## Три слова, которые путают

- **Терминал** — окно. Оно рисует текст и передаёт ваши нажатия клавиш.
- **Оболочка (shell)** — программа внутри этого окна, которая читает набранное и запускает его. В большинстве систем это `bash` или `zsh`.
- **Команда** — сама программа, которую запускает оболочка, например `ls` или `grep`.

Итак: вы печатаете в терминале, оболочка интерпретирует, команда выполняет работу.

## Как читать приглашение

Прежде чем вы что-то наберёте, оболочка печатает приглашение. Типичный вид в Debian:

```
user@debian:~$
```

Каждая часть что-то значит:

- `user` — под каким пользователем вы вошли
- `debian` — имя машины (hostname)
- `~` — где вы находитесь; `~` — сокращение для домашнего каталога
- `$` — вы **обычный пользователь**

Последний символ важнее, чем кажется. Если вместо `$` стоит `#`, вы **root** — администратор, который может удалить что угодно без переспроса:

```
root@debian:/#
```

Увидели `#` — замедлитесь.

## Первые команды

`whoami` печатает, под кем вы работаете:

```
$ whoami
user
```

`echo` печатает свои аргументы обратно. Выглядит бесполезно, а используется постоянно, потому что показывает, что оболочка *на самом деле* передала команде:

```
$ echo Hello
Hello
$ echo "Hello   there"
Hello   there
```

Кавычки сохранили пробелы. Без них оболочка их схлопывает, потому что разбивает строку по пробелам ещё до того, как команда её увидит:

```
$ echo Hello   there
Hello there
```

Это главный источник путаницы у новичков: **оболочка правит вашу строку до запуска команды.**

## Помощь, не выходя из терминала

У каждой серьёзной команды есть руководство. `man` его открывает:

```
$ man ls
```

Перемещайтесь стрелками, ищите через `/` и слово, выходите по `q`. Если запомните одну клавишу из этого урока — пусть это будет `q`.

Многие команды принимают `--help` для краткой справки:

```
$ ls --help | head -5
Usage: ls [OPTION]... [FILE]...
List information about the FILEs (the current directory by default).
Sort entries alphabetically if none of -cftuvSUX --sort is specified.

Mandatory arguments to long options are mandatory for short options too.
```

## Попробуйте

1. Выполните `whoami`, затем `echo $USER`. Совпадают?
2. Откройте `man man` и выйдите по `q`.
3. Выполните `echo "a   b"` и `echo a   b` и объясните себе разницу вслух.

Если третий шаг понятен, вы разобрались с тем, на чём люди спотыкаются месяцами.""",
        "questions": [
            q("In the prompt `root@debian:/#`, what does the `#` tell you?",
              "`root@debian:/#` taklif satrida `#` nimani bildiradi?",
              "Что означает `#` в приглашении `root@debian:/#`?",
              ["You are running as root", "The command failed", "You are in a comment", "The shell is busy"],
              ["Siz root sifatida ishlayapsiz", "Buyruq xato berdi", "Siz izoh ichidasiz", "Shell band"],
              ["Вы работаете под root", "Команда завершилась с ошибкой", "Вы внутри комментария", "Оболочка занята"], 0),
            q("Why does `echo a   b` print `a b` with one space?",
              "Nega `echo a   b` bitta bo'shliq bilan `a b` chiqaradi?",
              "Почему `echo a   b` печатает `a b` с одним пробелом?",
              ["The shell splits the line on whitespace before echo runs", "echo always removes spaces",
               "The terminal cannot display multiple spaces", "It is a bug in echo"],
              ["Shell echo ishga tushishidan oldin satrni bo'shliqlar bo'yicha bo'ladi", "echo doim bo'shliqlarni o'chiradi",
               "Terminal bir nechta bo'shliqni ko'rsata olmaydi", "Bu echo dagi xato"],
              ["Оболочка разбивает строку по пробелам до запуска echo", "echo всегда удаляет пробелы",
               "Терминал не может показать несколько пробелов", "Это ошибка в echo"], 0),
            q("Which key quits a `man` page?",
              "`man` sahifasidan qaysi tugma chiqaradi?",
              "Какая клавиша выходит из страницы `man`?",
              ["q", "Ctrl+S", "x", "Esc"], ["q", "Ctrl+S", "x", "Esc"], ["q", "Ctrl+S", "x", "Esc"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "linux", "points": 60,
        "title": "Moving around the filesystem",
        "titleUz": "Fayl tizimi bo'ylab harakatlanish",
        "titleRu": "Перемещение по файловой системе",
        "content": r"""You cannot attack, defend, or investigate a machine you cannot navigate. Three commands do almost all of it: `pwd`, `ls`, `cd`.

## Where am I

`pwd` — print working directory:

```
$ pwd
/home/user
```

The shell always has exactly one working directory. Every relative path you type is resolved from it.

## What is here

`ls` lists the current directory:

```
$ ls
Desktop  Documents  Downloads  notes.txt
```

By itself `ls` hides a lot. The flags that matter:

```
$ ls -l
total 16
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Desktop
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Documents
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Downloads
-rw-r--r-- 1 user user   84 Mar  4 11:40 notes.txt
```

- `-l` — long format: permissions, owner, size, modification time
- `-a` — show hidden entries (anything whose name starts with `.`)
- `-h` — human-readable sizes (`4.0K` instead of `4096`)

They combine:

```
$ ls -lah
total 28K
drwxr-xr-x 5 user user 4.0K Mar  4 11:40 .
drwxr-xr-x 3 root root 4.0K Mar  3 09:10 ..
-rw------- 1 user user  220 Mar  3 09:10 .bash_history
-rw-r--r-- 1 user user 3.5K Mar  3 09:10 .bashrc
-rw-r--r-- 1 user user   84 Mar  4 11:40 notes.txt
```

**This is why `-a` matters in security.** `.bash_history` — a record of every command the user typed — is invisible without it. So are `.ssh/`, `.env`, and `.git/`. Attackers and defenders both look here first.

Two entries appear in every directory:

- `.` — this directory
- `..` — the parent directory

## Going somewhere

`cd` changes directory:

```
$ cd Documents
$ pwd
/home/user/Documents
```

Paths come in two kinds:

- **Absolute** — starts at `/`, the root of the whole filesystem: `/var/log/auth.log`. Means the same thing from anywhere.
- **Relative** — starts from where you are: `Documents/report.txt`, or `../Downloads`.

Useful shortcuts:

```
$ cd ..        # up one level
$ cd ~         # home directory
$ cd           # also home directory
$ cd -         # back to the previous directory
$ cd /         # the filesystem root
```

`cd -` is the one people discover late and then use forever:

```
$ pwd
/home/user/Documents
$ cd /var/log
$ cd -
/home/user/Documents
```

## Tab completion

Press **Tab** and the shell finishes the name for you. Press it twice to see all matches:

```
$ cd Doc<Tab>
$ cd Documents/
```

This is not just convenience — it prevents typos in long paths, and it *proves the path exists*. If Tab does not complete, you got the name wrong.

## Try it

1. From your home directory run `ls -lah` and find your `.bashrc`.
2. `cd /var/log`, then `ls`, then `cd -`. Where did you land?
3. Type `cd /et` then press Tab. What happens, and what does that tell you?""",
        "contentUz": r"""Siz harakatlana olmaydigan mashinaga hujum ham qila olmaysiz, uni himoya ham qila olmaysiz. Deyarli hamma ishni uch buyruq bajaradi: `pwd`, `ls`, `cd`.

## Men qayerdaman

`pwd` — joriy katalogni chiqaradi:

```
$ pwd
/home/user
```

Shell'da doim aynan bitta joriy katalog bo'ladi. Siz yozgan har bir nisbiy yo'l shundan hisoblanadi.

## Bu yerda nima bor

`ls` joriy katalogni sanaydi:

```
$ ls
Desktop  Documents  Downloads  notes.txt
```

Yolg'iz `ls` ko'p narsani yashiradi. Muhim bayroqlar:

```
$ ls -l
total 16
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Desktop
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Documents
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Downloads
-rw-r--r-- 1 user user   84 Mar  4 11:40 notes.txt
```

- `-l` — uzun format: ruxsatlar, egasi, hajmi, o'zgartirilgan vaqti
- `-a` — yashirin yozuvlarni ko'rsatish (nomi `.` bilan boshlanadiganlar)
- `-h` — o'qishga qulay hajmlar (`4096` o'rniga `4.0K`)

Ular birlashadi:

```
$ ls -lah
total 28K
drwxr-xr-x 5 user user 4.0K Mar  4 11:40 .
drwxr-xr-x 3 root root 4.0K Mar  3 09:10 ..
-rw------- 1 user user  220 Mar  3 09:10 .bash_history
-rw-r--r-- 1 user user 3.5K Mar  3 09:10 .bashrc
-rw-r--r-- 1 user user   84 Mar  4 11:40 notes.txt
```

**Xavfsizlikda `-a` shuning uchun muhim.** `.bash_history` — foydalanuvchi yozgan har bir buyruq yozuvi — usiz ko'rinmaydi. `.ssh/`, `.env`, `.git/` ham shunday. Hujumchi ham, himoyachi ham avval shu yerga qaraydi.

Har bir katalogda ikkita yozuv bo'ladi:

- `.` — shu katalogning o'zi
- `..` — ota katalog

## Biror joyga borish

`cd` katalogni almashtiradi:

```
$ cd Documents
$ pwd
/home/user/Documents
```

Yo'llar ikki xil bo'ladi:

- **Absolyut** — butun fayl tizimining ildizi `/` dan boshlanadi: `/var/log/auth.log`. Qayerdan yozsangiz ham bir xil ma'noni beradi.
- **Nisbiy** — turgan joyingizdan boshlanadi: `Documents/report.txt` yoki `../Downloads`.

Foydali qisqartmalar:

```
$ cd ..        # bir pog'ona yuqoriga
$ cd ~         # uy katalogi
$ cd           # bu ham uy katalogi
$ cd -         # oldingi katalogga qaytish
$ cd /         # fayl tizimi ildizi
```

`cd -` ni odamlar kech kashf etadi va keyin doim ishlatadi:

```
$ pwd
/home/user/Documents
$ cd /var/log
$ cd -
/home/user/Documents
```

## Tab bilan to'ldirish

**Tab** ni bosing — shell nomni siz uchun tugatadi. Ikki marta bossangiz, barcha mosliklarni ko'rsatadi:

```
$ cd Doc<Tab>
$ cd Documents/
```

Bu shunchaki qulaylik emas — uzun yo'llarda xatolarning oldini oladi va *yo'l mavjudligini isbotlaydi*. Tab to'ldirmasa, nomni noto'g'ri yozgansiz.

## Sinab ko'ring

1. Uy katalogingizda `ls -lah` ni bajaring va `.bashrc` ni toping.
2. `cd /var/log`, keyin `ls`, keyin `cd -`. Qayerga tushdingiz?
3. `cd /et` yozib Tab ni bosing. Nima bo'ldi va bu sizga nimani aytadi?""",
        "contentRu": r"""Нельзя атаковать, защищать или расследовать машину, по которой не умеешь перемещаться. Почти всё делают три команды: `pwd`, `ls`, `cd`.

## Где я

`pwd` — печатает текущий каталог:

```
$ pwd
/home/user
```

У оболочки всегда ровно один рабочий каталог. Каждый относительный путь разрешается от него.

## Что здесь есть

`ls` выводит содержимое текущего каталога:

```
$ ls
Desktop  Documents  Downloads  notes.txt
```

Сам по себе `ls` многое скрывает. Важные флаги:

```
$ ls -l
total 16
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Desktop
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Documents
drwxr-xr-x 2 user user 4096 Mar  3 09:12 Downloads
-rw-r--r-- 1 user user   84 Mar  4 11:40 notes.txt
```

- `-l` — длинный формат: права, владелец, размер, время изменения
- `-a` — показать скрытые записи (те, чьё имя начинается с `.`)
- `-h` — размеры в удобном виде (`4.0K` вместо `4096`)

Они комбинируются:

```
$ ls -lah
total 28K
drwxr-xr-x 5 user user 4.0K Mar  4 11:40 .
drwxr-xr-x 3 root root 4.0K Mar  3 09:10 ..
-rw------- 1 user user  220 Mar  3 09:10 .bash_history
-rw-r--r-- 1 user user 3.5K Mar  3 09:10 .bashrc
-rw-r--r-- 1 user user   84 Mar  4 11:40 notes.txt
```

**Вот почему `-a` важен в безопасности.** `.bash_history` — запись каждой введённой команды — без него не виден. Как и `.ssh/`, `.env`, `.git/`. И атакующие, и защитники смотрят сюда первым делом.

В каждом каталоге есть две записи:

- `.` — сам этот каталог
- `..` — родительский каталог

## Переход

`cd` меняет каталог:

```
$ cd Documents
$ pwd
/home/user/Documents
```

Пути бывают двух видов:

- **Абсолютный** — начинается с `/`, корня файловой системы: `/var/log/auth.log`. Означает одно и то же откуда угодно.
- **Относительный** — от текущего места: `Documents/report.txt` или `../Downloads`.

Полезные сокращения:

```
$ cd ..        # на уровень вверх
$ cd ~         # домашний каталог
$ cd           # тоже домашний каталог
$ cd -         # обратно в предыдущий каталог
$ cd /         # корень файловой системы
```

`cd -` открывают поздно, а потом пользуются всегда:

```
$ pwd
/home/user/Documents
$ cd /var/log
$ cd -
/home/user/Documents
```

## Автодополнение по Tab

Нажмите **Tab** — оболочка допишет имя за вас. Дважды — покажет все совпадения:

```
$ cd Doc<Tab>
$ cd Documents/
```

Это не только удобство: это защищает от опечаток в длинных путях и *доказывает, что путь существует*. Если Tab не дополняет — имя набрано неверно.

## Попробуйте

1. В домашнем каталоге выполните `ls -lah` и найдите `.bashrc`.
2. `cd /var/log`, затем `ls`, затем `cd -`. Куда вы попали?
3. Наберите `cd /et` и нажмите Tab. Что произошло и о чём это говорит?""",
        "questions": [
            q("Which `ls` flag reveals files like `.bash_history`?",
              "`.bash_history` kabi fayllarni qaysi `ls` bayrog'i ko'rsatadi?",
              "Какой флаг `ls` показывает файлы вроде `.bash_history`?",
              ["-a", "-l", "-h", "-r"], ["-a", "-l", "-h", "-r"], ["-a", "-l", "-h", "-r"], 0),
            q("What does `cd -` do?",
              "`cd -` nima qiladi?",
              "Что делает `cd -`?",
              ["Returns to the previous directory", "Goes up one level",
               "Goes to the home directory", "Goes to the filesystem root"],
              ["Oldingi katalogga qaytadi", "Bir pog'ona yuqoriga chiqadi",
               "Uy katalogiga o'tadi", "Fayl tizimi ildiziga o'tadi"],
              ["Возвращает в предыдущий каталог", "Поднимается на уровень вверх",
               "Переходит в домашний каталог", "Переходит в корень"], 0),
            q("`/var/log/auth.log` is which kind of path?",
              "`/var/log/auth.log` qanday yo'l?",
              "Каким путём является `/var/log/auth.log`?",
              ["Absolute", "Relative", "Hidden", "Symbolic"],
              ["Absolyut", "Nisbiy", "Yashirin", "Ramziy"],
              ["Абсолютным", "Относительным", "Скрытым", "Символическим"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "linux", "points": 60,
        "title": "The filesystem hierarchy: where things live",
        "titleUz": "Fayl tizimi ierarxiyasi: nima qayerda turadi",
        "titleRu": "Иерархия файловой системы: что где лежит",
        "content": r"""On Windows you have `C:\`. On Linux there is exactly one tree, starting at `/`. Every disk, every USB stick, every network share is *mounted* somewhere inside it.

```
$ ls /
bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

Knowing what these hold is the difference between guessing and looking.

## The ones that matter in security

**`/etc`** — system-wide configuration. Plain text, almost always readable.

```
$ ls /etc | head -8
apache2
crontab
group
hostname
hosts
passwd
shadow
ssh
```

`/etc/passwd` lists every account on the machine and is world-readable:

```
$ head -3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
user:x:1000:1000:User,,,:/home/user:/bin/bash
```

Each line is `name:password:UID:GID:comment:home:shell`. The `x` means the real hash lives in `/etc/shadow`, which is **not** world-readable:

```
$ ls -l /etc/shadow
-rw-r----- 1 root shadow 1043 Mar  3 09:10 /etc/shadow
$ cat /etc/shadow
cat: /etc/shadow: Permission denied
```

If you ever *can* read `/etc/shadow` as a normal user, that is a serious finding.

**`/home`** — user directories. `/home/user`, `/home/alice`. This is where SSH keys, notes, and credentials accumulate.

**`/root`** — root's own home. Note it is *not* `/home/root`.

**`/var`** — variable data: logs, mail, spools. `/var/log` is the first place any investigation goes:

```
$ ls /var/log | head -6
apache2
auth.log
dpkg.log
kern.log
syslog
wtmp
```

`auth.log` records logins and `sudo` use — including failed ones.

**`/tmp`** — world-writable scratch space, wiped on reboot. Anyone can write here, which is exactly why attackers stage tools here and why defenders watch it:

```
$ ls -ld /tmp
drwxrwxrwt 12 root root 4096 Mar  4 12:01 /tmp
```

That trailing `t` is the *sticky bit*: everyone may create files, but you can only delete your own.

**`/proc`** — not a real disk at all. The kernel exposes live process information as files:

```
$ cat /proc/version
Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org) ...
$ ls /proc | head -5
1
10
1042
acpi
cmdline
```

Those numbers are process IDs. `/proc/<pid>/cmdline` shows exactly how a process was started — priceless when something suspicious is running.

**`/usr/bin`, `/bin`, `/sbin`** — the programs themselves. `which` finds one:

```
$ which grep
/usr/bin/grep
```

## Try it

1. `ls -l /etc/shadow` — who owns it, and can you read it?
2. `wc -l /etc/passwd` — how many accounts are on your machine?
3. `cat /proc/cpuinfo | head -20` — where did that text come from, given `/proc` is not on any disk?""",
        "contentUz": r"""Windows'da `C:\` bor. Linux'da esa `/` dan boshlanadigan aynan bitta daraxt bor. Har bir disk, har bir USB, har bir tarmoq resursi shu daraxtning ichiga *ulanadi* (mount qilinadi).

```
$ ls /
bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

Bularda nima borligini bilish — taxmin qilish bilan qarab olish orasidagi farq.

## Xavfsizlikda muhimlari

**`/etc`** — tizim bo'ylab sozlamalar. Oddiy matn, deyarli doim o'qilaveradi.

```
$ ls /etc | head -8
apache2
crontab
group
hostname
hosts
passwd
shadow
ssh
```

`/etc/passwd` mashinadagi har bir hisobni sanaydi va hamma o'qiy oladi:

```
$ head -3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
user:x:1000:1000:User,,,:/home/user:/bin/bash
```

Har bir satr: `nom:parol:UID:GID:izoh:uy:shell`. `x` degani haqiqiy xesh `/etc/shadow` da, uni esa hamma o'qiy **olmaydi**:

```
$ ls -l /etc/shadow
-rw-r----- 1 root shadow 1043 Mar  3 09:10 /etc/shadow
$ cat /etc/shadow
cat: /etc/shadow: Permission denied
```

Agar oddiy foydalanuvchi sifatida `/etc/shadow` ni o'qiy olsangiz — bu jiddiy topilma.

**`/home`** — foydalanuvchi kataloglari: `/home/user`, `/home/alice`. SSH kalitlari, qaydlar va parollar shu yerda to'planadi.

**`/root`** — root'ning o'z uyi. E'tibor bering, u `/home/root` **emas**.

**`/var`** — o'zgaruvchan ma'lumot: loglar, pochta, navbatlar. `/var/log` — har qanday tekshiruv boshlanadigan birinchi joy:

```
$ ls /var/log | head -6
apache2
auth.log
dpkg.log
kern.log
syslog
wtmp
```

`auth.log` kirishlar va `sudo` ishlatilishini yozadi — muvaffaqiyatsizlarini ham.

**`/tmp`** — hamma yozа oladigan vaqtinchalik joy, qayta yuklashda tozalanadi. Bu yerga har kim yozа oladi — aynan shuning uchun hujumchilar vositalarini shu yerga qo'yadi, himoyachilar esa kuzatadi:

```
$ ls -ld /tmp
drwxrwxrwt 12 root root 4096 Mar  4 12:01 /tmp
```

Oxiridagi `t` — *sticky bit*: hamma fayl yaratа oladi, lekin faqat o'zinikini o'chirа oladi.

**`/proc`** — umuman haqiqiy disk emas. Yadro jonli jarayon ma'lumotini fayl ko'rinishida ko'rsatadi:

```
$ cat /proc/version
Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org) ...
$ ls /proc | head -5
1
10
1042
acpi
cmdline
```

Bu raqamlar — jarayon ID'lari. `/proc/<pid>/cmdline` jarayon qanday ishga tushirilganini aniq ko'rsatadi — shubhali narsa ishlayotganda bebaho.

**`/usr/bin`, `/bin`, `/sbin`** — dasturlarning o'zi. `which` ularni topadi:

```
$ which grep
/usr/bin/grep
```

## Sinab ko'ring

1. `ls -l /etc/shadow` — egasi kim va siz uni o'qiy olasizmi?
2. `wc -l /etc/passwd` — mashinangizda nechta hisob bor?
3. `cat /proc/cpuinfo | head -20` — `/proc` hech qanday diskda bo'lmasa, bu matn qayerdan keldi?""",
        "contentRu": r"""В Windows есть `C:\`. В Linux — ровно одно дерево, начинающееся с `/`. Каждый диск, каждая флешка, каждая сетевая шара *монтируется* куда-то внутрь него.

```
$ ls /
bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

Знание того, что здесь лежит, — это разница между догадкой и проверкой.

## Важные для безопасности

**`/etc`** — общесистемная конфигурация. Обычный текст, почти всегда читаемый.

```
$ ls /etc | head -8
apache2
crontab
group
hostname
hosts
passwd
shadow
ssh
```

`/etc/passwd` перечисляет все учётные записи и читается всеми:

```
$ head -3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
user:x:1000:1000:User,,,:/home/user:/bin/bash
```

Каждая строка: `имя:пароль:UID:GID:комментарий:домашний:оболочка`. `x` означает, что реальный хеш лежит в `/etc/shadow`, который читается **не** всеми:

```
$ ls -l /etc/shadow
-rw-r----- 1 root shadow 1043 Mar  3 09:10 /etc/shadow
$ cat /etc/shadow
cat: /etc/shadow: Permission denied
```

Если обычным пользователем вы всё же смогли прочитать `/etc/shadow` — это серьёзная находка.

**`/home`** — каталоги пользователей: `/home/user`, `/home/alice`. Здесь накапливаются SSH-ключи, заметки и учётные данные.

**`/root`** — домашний каталог самого root. Обратите внимание: это **не** `/home/root`.

**`/var`** — изменяемые данные: логи, почта, очереди. `/var/log` — первое место любого расследования:

```
$ ls /var/log | head -6
apache2
auth.log
dpkg.log
kern.log
syslog
wtmp
```

`auth.log` фиксирует входы и использование `sudo` — в том числе неудачные.

**`/tmp`** — общедоступное для записи временное место, очищается при перезагрузке. Писать сюда может любой — именно поэтому атакующие складывают тут инструменты, а защитники следят:

```
$ ls -ld /tmp
drwxrwxrwt 12 root root 4096 Mar  4 12:01 /tmp
```

Завершающий `t` — это *sticky bit*: создавать файлы может каждый, а удалять — только свои.

**`/proc`** — вообще не настоящий диск. Ядро отдаёт информацию о живых процессах в виде файлов:

```
$ cat /proc/version
Linux version 6.1.0-18-amd64 (debian-kernel@lists.debian.org) ...
$ ls /proc | head -5
1
10
1042
acpi
cmdline
```

Эти числа — идентификаторы процессов. `/proc/<pid>/cmdline` показывает, как именно был запущен процесс — бесценно, когда работает что-то подозрительное.

**`/usr/bin`, `/bin`, `/sbin`** — сами программы. `which` их находит:

```
$ which grep
/usr/bin/grep
```

## Попробуйте

1. `ls -l /etc/shadow` — кто владелец и можете ли вы его прочитать?
2. `wc -l /etc/passwd` — сколько учётных записей на вашей машине?
3. `cat /proc/cpuinfo | head -20` — откуда взялся этот текст, если `/proc` не лежит ни на одном диске?""",
        "questions": [
            q("Where are password hashes stored on a modern Linux system?",
              "Zamonaviy Linux tizimida parol xeshlari qayerda saqlanadi?",
              "Где на современной Linux-системе хранятся хеши паролей?",
              ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/proc/passwd"],
              ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/proc/passwd"],
              ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/proc/passwd"], 0),
            q("What does the `t` at the end of `drwxrwxrwt` on /tmp mean?",
              "/tmp dagi `drwxrwxrwt` oxiridagi `t` nimani bildiradi?",
              "Что означает `t` в конце `drwxrwxrwt` у /tmp?",
              ["Sticky bit — you can only delete your own files", "The directory is temporary",
               "Only root may write", "The directory is a symlink"],
              ["Sticky bit — faqat o'z fayllaringizni o'chira olasiz", "Katalog vaqtinchalik",
               "Faqat root yoza oladi", "Katalog ramziy havola"],
              ["Sticky bit — удалять можно только свои файлы", "Каталог временный",
               "Писать может только root", "Каталог — символическая ссылка"], 0),
            q("Which directory would you check first to see login attempts?",
              "Kirish urinishlarini ko'rish uchun avval qaysi katalogga qaraysiz?",
              "Какой каталог вы проверите первым, чтобы увидеть попытки входа?",
              ["/var/log", "/etc", "/tmp", "/usr/bin"],
              ["/var/log", "/etc", "/tmp", "/usr/bin"],
              ["/var/log", "/etc", "/tmp", "/usr/bin"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "linux", "points": 60,
        "title": "Reading files without opening an editor",
        "titleUz": "Muharrir ochmasdan fayllarni o'qish",
        "titleRu": "Чтение файлов без редактора",
        "content": r"""Logs are big. Config files are long. Opening a 2 GB log in an editor is a mistake you make once. These commands read exactly as much as you need.

## cat — dump the whole thing

```
$ cat /etc/hostname
debian
```

Fine for small files. Never for a log — `cat` on a huge file floods your terminal and you cannot scroll back far enough.

## head and tail — the ends

```
$ head -5 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
```

```
$ tail -3 /var/log/auth.log
Mar  4 12:04:11 debian sudo:     user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update
Mar  4 12:04:11 debian sudo: pam_unix(sudo:session): session opened for user root(uid=0) by user(uid=1000)
Mar  4 12:04:19 debian sudo: pam_unix(sudo:session): session closed for user root
```

The flag every defender uses is `-f` — *follow*. It prints new lines as they are written:

```
$ tail -f /var/log/auth.log
```

Leave that running in one terminal, try to log in wrongly from another, and watch the failure appear live. Stop it with **Ctrl+C**.

## less — read at your own pace

```
$ less /var/log/syslog
```

Inside `less`:

- arrows / `Page Up` / `Page Down` — move
- `/pattern` — search forward, `n` for the next hit
- `G` — jump to the end, `g` — to the start
- `q` — quit

`less` never loads the whole file into memory, so it opens a 2 GB log instantly.

## wc — count

```
$ wc -l /etc/passwd
32 /etc/passwd
```

`-l` lines, `-w` words, `-c` bytes. Counting lines is how you answer "how many failed logins were there?" without reading any of them.

## file — what is this actually

Extensions lie. `file` looks at the content:

```
$ file notes.txt
notes.txt: ASCII text
$ file /usr/bin/grep
/usr/bin/grep: ELF 64-bit LSB pie executable, x86-64, dynamically linked
$ file photo.png
photo.png: PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced
```

In forensics and CTFs this is a reflex: a file named `image.jpg` that `file` calls a ZIP archive is the whole puzzle.

## strings — text inside binaries

```
$ strings /usr/bin/passwd | grep -i password | head -3
password
Enter new UNIX password:
Retype new UNIX password:
```

`strings` pulls printable sequences out of binary data. It is the fastest first look at an unknown executable or a memory dump.

## Try it

1. `tail -f /var/log/auth.log` in one terminal; in another run `sudo whoami`. What appears?
2. `wc -l /var/log/syslog` — how many lines is that?
3. Run `file` on something in `/usr/bin` and on a text file. Compare.""",
        "contentUz": r"""Loglar katta. Konfiguratsiya fayllari uzun. 2 GB loglarni muharrirda ochish — bir marta qilinadigan xato. Bu buyruqlar kerak bo'lgan miqdorni aniq o'qiydi.

## cat — hammasini chiqarish

```
$ cat /etc/hostname
debian
```

Kichik fayllar uchun yaxshi. Log uchun hech qachon — katta faylda `cat` terminalni to'ldiradi va orqaga yetarlicha aylantira olmaysiz.

## head va tail — chekkalar

```
$ head -5 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
```

```
$ tail -3 /var/log/auth.log
Mar  4 12:04:11 debian sudo:     user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update
Mar  4 12:04:11 debian sudo: pam_unix(sudo:session): session opened for user root(uid=0) by user(uid=1000)
Mar  4 12:04:19 debian sudo: pam_unix(sudo:session): session closed for user root
```

Har bir himoyachi ishlatadigan bayroq — `-f`, ya'ni *follow*. U yangi satrlarni yozilishi bilan chiqaradi:

```
$ tail -f /var/log/auth.log
```

Buni bir terminalda qoldiring, boshqasidan noto'g'ri kirishga urinib ko'ring va xatoning jonli paydo bo'lishini kuzating. **Ctrl+C** bilan to'xtating.

## less — o'z sur'atingizda o'qish

```
$ less /var/log/syslog
```

`less` ichida:

- strelkalar / `Page Up` / `Page Down` — harakat
- `/naqsh` — oldinga qidirish, `n` — keyingi moslik
- `G` — oxiriga, `g` — boshiga
- `q` — chiqish

`less` faylni butunlay xotiraga yuklamaydi, shuning uchun 2 GB logni bir zumda ochadi.

## wc — sanash

```
$ wc -l /etc/passwd
32 /etc/passwd
```

`-l` satrlar, `-w` so'zlar, `-c` baytlar. "Nechta muvaffaqiyatsiz kirish bo'lgan?" degan savolga birortasini ham o'qimasdan javob berish shu tarzda bo'ladi.

## file — bu aslida nima

Kengaytmalar yolg'on gapiradi. `file` mazmunga qaraydi:

```
$ file notes.txt
notes.txt: ASCII text
$ file /usr/bin/grep
/usr/bin/grep: ELF 64-bit LSB pie executable, x86-64, dynamically linked
$ file photo.png
photo.png: PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced
```

Forenzika va CTF'da bu refleks: `image.jpg` deb nomlangan fayl `file` nazarida ZIP arxiv bo'lsa — jumboqning o'zi shu.

## strings — ikkilik fayl ichidagi matn

```
$ strings /usr/bin/passwd | grep -i password | head -3
password
Enter new UNIX password:
Retype new UNIX password:
```

`strings` ikkilik ma'lumotdan chop etiladigan ketma-ketliklarni sug'urib oladi. Noma'lum bajariluvchi fayl yoki xotira dampiga eng tez birinchi qarash — shu.

## Sinab ko'ring

1. Bir terminalda `tail -f /var/log/auth.log`; boshqasida `sudo whoami`. Nima paydo bo'ladi?
2. `wc -l /var/log/syslog` — nechta satr?
3. `/usr/bin` dagi biror narsaga va matn fayliga `file` ni qo'llang. Solishtiring.""",
        "contentRu": r"""Логи большие. Конфиги длинные. Открыть лог на 2 ГБ в редакторе — ошибка, которую делают один раз. Эти команды читают ровно столько, сколько нужно.

## cat — вывести всё

```
$ cat /etc/hostname
debian
```

Годится для маленьких файлов. Никогда для лога — `cat` на огромном файле затопит терминал, и вы не отмотаете назад.

## head и tail — края

```
$ head -5 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
```

```
$ tail -3 /var/log/auth.log
Mar  4 12:04:11 debian sudo:     user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update
Mar  4 12:04:11 debian sudo: pam_unix(sudo:session): session opened for user root(uid=0) by user(uid=1000)
Mar  4 12:04:19 debian sudo: pam_unix(sudo:session): session closed for user root
```

Флаг, которым пользуется каждый защитник, — `-f`, *follow*. Он печатает новые строки по мере записи:

```
$ tail -f /var/log/auth.log
```

Оставьте это в одном терминале, попробуйте неправильно войти из другого и смотрите, как ошибка появляется вживую. Остановка — **Ctrl+C**.

## less — читать в своём темпе

```
$ less /var/log/syslog
```

Внутри `less`:

- стрелки / `Page Up` / `Page Down` — перемещение
- `/шаблон` — поиск вперёд, `n` — следующее совпадение
- `G` — в конец, `g` — в начало
- `q` — выход

`less` не грузит файл в память целиком, поэтому лог на 2 ГБ открывается мгновенно.

## wc — считать

```
$ wc -l /etc/passwd
32 /etc/passwd
```

`-l` строки, `-w` слова, `-c` байты. Именно так отвечают на вопрос «сколько было неудачных входов?», не читая ни одного.

## file — что это на самом деле

Расширения врут. `file` смотрит на содержимое:

```
$ file notes.txt
notes.txt: ASCII text
$ file /usr/bin/grep
/usr/bin/grep: ELF 64-bit LSB pie executable, x86-64, dynamically linked
$ file photo.png
photo.png: PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced
```

В форензике и CTF это рефлекс: файл с именем `image.jpg`, который `file` считает ZIP-архивом, — и есть вся головоломка.

## strings — текст внутри бинарников

```
$ strings /usr/bin/passwd | grep -i password | head -3
password
Enter new UNIX password:
Retype new UNIX password:
```

`strings` вытаскивает печатаемые последовательности из двоичных данных. Это самый быстрый первый взгляд на неизвестный исполняемый файл или дамп памяти.

## Попробуйте

1. `tail -f /var/log/auth.log` в одном терминале; в другом — `sudo whoami`. Что появилось?
2. `wc -l /var/log/syslog` — сколько строк?
3. Примените `file` к чему-нибудь из `/usr/bin` и к текстовому файлу. Сравните.""",
        "questions": [
            q("Which command shows new log lines as they are written?",
              "Qaysi buyruq yangi log satrlarini yozilishi bilan ko'rsatadi?",
              "Какая команда показывает новые строки лога по мере записи?",
              ["tail -f", "head -n", "cat", "wc -l"], ["tail -f", "head -n", "cat", "wc -l"],
              ["tail -f", "head -n", "cat", "wc -l"], 0),
            q("A file is named `image.jpg` but `file` reports `Zip archive data`. What does that tell you?",
              "Fayl nomi `image.jpg`, lekin `file` `Zip archive data` deydi. Bu nimani bildiradi?",
              "Файл называется `image.jpg`, но `file` сообщает `Zip archive data`. О чём это говорит?",
              ["The extension is misleading; the real content is a ZIP", "The file is corrupted",
               "JPEG files are always ZIPs internally", "file made a mistake"],
              ["Kengaytma chalg'ituvchi; asl mazmun — ZIP", "Fayl buzilgan",
               "JPEG fayllar ichida doim ZIP bo'ladi", "file xato qildi"],
              ["Расширение вводит в заблуждение; на деле это ZIP", "Файл повреждён",
               "JPEG всегда внутри ZIP", "file ошибся"], 0),
            q("Why prefer `less` over `cat` for a 2 GB log?",
              "2 GB log uchun nega `cat` emas, `less` afzal?",
              "Почему для лога на 2 ГБ лучше `less`, а не `cat`?",
              ["less does not load the whole file into memory", "less is a newer command",
               "cat cannot open files over 1 GB", "less compresses the file"],
              ["less faylni butunlay xotiraga yuklamaydi", "less yangiroq buyruq",
               "cat 1 GB dan katta faylni ocha olmaydi", "less faylni siqadi"],
              ["less не загружает файл целиком в память", "less — более новая команда",
               "cat не открывает файлы больше 1 ГБ", "less сжимает файл"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "linux", "points": 70,
        "title": "Users, identity, and sudo",
        "titleUz": "Foydalanuvchilar, shaxsiyat va sudo",
        "titleRu": "Пользователи, идентичность и sudo",
        "content": r"""Linux decides what you may do based on *who the kernel thinks you are*. Privilege escalation — the core of most attacks — is the art of changing that answer.

## Who am I, precisely

`whoami` gives the short answer. `id` gives the real one:

```
$ id
uid=1000(user) gid=1000(user) groups=1000(user),27(sudo),44(video)
```

- `uid` — your user ID. **UID 0 is root.** The name does not matter; the number does.
- `gid` — your primary group
- `groups` — every group you belong to

Group membership is not decoration. Being in `sudo` means you may run commands as root. Being in `docker` is, on most systems, equivalent to being root — a fact that surprises people during audits.

## Accounts on the machine

```
$ head -3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
user:x:1000:1000:User,,,:/home/user:/bin/bash
```

Real people usually have UID >= 1000 and a real shell. Service accounts have `/usr/sbin/nologin` — they exist to own files and run daemons, not to log in. An account with UID 0 that is *not* named root is a red flag:

```
$ awk -F: '$3 == 0 {print $1}' /etc/passwd
root
```

If that prints two names, investigate.

## Becoming someone else

`sudo` runs one command as another user, root by default:

```
$ whoami
user
$ sudo whoami
[sudo] password for user:
root
```

You typed *your* password, not root's — `sudo` checks that you are allowed, then elevates. What you are allowed is in `/etc/sudoers`, and you can ask directly:

```
$ sudo -l
Matching Defaults entries for user on debian:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User user may run the following commands on debian:
    (ALL : ALL) ALL
```

**`sudo -l` is the first command run on any privilege-escalation check.** `(ALL : ALL) ALL` means full root. But narrower rules are where the interesting mistakes live:

```
User user may run the following commands on debian:
    (root) NOPASSWD: /usr/bin/find
```

That looks harmless and is not: `find` can execute commands, so a rule letting you run `find` as root with no password hands over the machine.

`su` switches user entirely, and asks for the *target's* password:

```
$ su - alice
Password:
alice@debian:~$
```

The `-` matters: it loads Alice's environment as a real login instead of keeping yours.

## Every sudo is recorded

```
$ sudo tail -2 /var/log/auth.log
Mar  4 12:44:02 debian sudo:     user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/tail -2 /var/log/auth.log
Mar  4 12:44:02 debian sudo: pam_unix(sudo:session): session opened for user root(uid=0) by user(uid=1000)
```

The command, the directory it ran from, and who ran it. This is the trail defenders follow — and the trail attackers try to break.

## Try it

1. `id` — which groups are you in? Is `sudo` one of them?
2. `sudo -l` — what exactly are you allowed to run?
3. `awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd` — who are the real humans on this box?""",
        "contentUz": r"""Linux nimaga ruxsat berishni *yadro sizni kim deb bilishiga* qarab hal qiladi. Imtiyozni oshirish (privilege escalation) — aksar hujumlarning o'zagi — shu javobni o'zgartirish san'ati.

## Men aniq kimman

`whoami` qisqa javob beradi. `id` esa haqiqiysini:

```
$ id
uid=1000(user) gid=1000(user) groups=1000(user),27(sudo),44(video)
```

- `uid` — foydalanuvchi ID'ingiz. **UID 0 — root.** Nom emas, raqam ahamiyatli.
- `gid` — asosiy guruhingiz
- `groups` — a'zo bo'lgan barcha guruhlaringiz

Guruh a'zoligi bezak emas. `sudo` da bo'lish — root sifatida buyruq bajara olish demak. `docker` da bo'lish esa aksar tizimlarda root bo'lishga teng — bu auditlarda odamlarni hayratga soladi.

## Mashinadagi hisoblar

```
$ head -3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
user:x:1000:1000:User,,,:/home/user:/bin/bash
```

Haqiqiy odamlarda odatda UID >= 1000 va haqiqiy shell bo'ladi. Xizmat hisoblarida `/usr/sbin/nologin` — ular fayl egasi bo'lish va demon ishlatish uchun bor, kirish uchun emas. Nomi root **bo'lmagan** UID 0 li hisob — qizil bayroq:

```
$ awk -F: '$3 == 0 {print $1}' /etc/passwd
root
```

Agar ikkita nom chiqsa — tekshiring.

## Boshqa birov bo'lish

`sudo` bitta buyruqni boshqa foydalanuvchi, sukut bo'yicha root sifatida bajaradi:

```
$ whoami
user
$ sudo whoami
[sudo] password for user:
root
```

Siz *o'z* parolingizni yozdingiz, root'nikini emas — `sudo` ruxsatingizni tekshiradi, keyin ko'taradi. Nimaga ruxsatingiz borligi `/etc/sudoers` da, va buni to'g'ridan-to'g'ri so'rash mumkin:

```
$ sudo -l
Matching Defaults entries for user on debian:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User user may run the following commands on debian:
    (ALL : ALL) ALL
```

**`sudo -l` — imtiyozni oshirish tekshiruvida birinchi bajariladigan buyruq.** `(ALL : ALL) ALL` to'liq root degani. Ammo qiziq xatolar torroq qoidalarda yashiringan:

```
User user may run the following commands on debian:
    (root) NOPASSWD: /usr/bin/find
```

Bu zararsizdek ko'rinadi, lekin unday emas: `find` buyruq bajara oladi, shuning uchun uni parolsiz root sifatida yurgizish huquqi butun mashinani topshiradi.

`su` foydalanuvchini butunlay almashtiradi va *nishonning* parolini so'raydi:

```
$ su - alice
Password:
alice@debian:~$
```

`-` muhim: u sizning muhitingizni saqlab qolish o'rniga Alice'ning muhitini haqiqiy kirish kabi yuklaydi.

## Har bir sudo yozib olinadi

```
$ sudo tail -2 /var/log/auth.log
Mar  4 12:44:02 debian sudo:     user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/tail -2 /var/log/auth.log
Mar  4 12:44:02 debian sudo: pam_unix(sudo:session): session opened for user root(uid=0) by user(uid=1000)
```

Buyruq, u bajarilgan katalog va kim bajargani. Bu — himoyachilar kuzatadigan iz, hujumchilar esa uni uzishga urinadi.

## Sinab ko'ring

1. `id` — qaysi guruhlardasiz? `sudo` ular orasidami?
2. `sudo -l` — aniq nimani bajarishga ruxsatingiz bor?
3. `awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd` — bu mashinadagi haqiqiy odamlar kimlar?""",
        "contentRu": r"""Linux решает, что вам можно, исходя из того, *кем вас считает ядро*. Повышение привилегий — сердцевина большинства атак — это искусство изменить этот ответ.

## Кто я точно

`whoami` даёт короткий ответ. `id` — настоящий:

```
$ id
uid=1000(user) gid=1000(user) groups=1000(user),27(sudo),44(video)
```

- `uid` — ваш идентификатор. **UID 0 — это root.** Важно число, а не имя.
- `gid` — основная группа
- `groups` — все группы, в которых вы состоите

Членство в группе — не украшение. Быть в `sudo` значит запускать команды от root. Быть в `docker` на большинстве систем равносильно root — факт, который удивляет людей на аудитах.

## Учётные записи на машине

```
$ head -3 /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
user:x:1000:1000:User,,,:/home/user:/bin/bash
```

У живых людей обычно UID >= 1000 и настоящая оболочка. У служебных учёток — `/usr/sbin/nologin`: они существуют, чтобы владеть файлами и запускать демоны, а не входить в систему. Учётка с UID 0, которая **не** называется root, — тревожный признак:

```
$ awk -F: '$3 == 0 {print $1}' /etc/passwd
root
```

Если вывелось два имени — разбирайтесь.

## Стать кем-то другим

`sudo` выполняет одну команду от имени другого пользователя, по умолчанию root:

```
$ whoami
user
$ sudo whoami
[sudo] password for user:
root
```

Вы ввели *свой* пароль, а не рутовый: `sudo` проверяет, что вам можно, и повышает права. Что именно можно — записано в `/etc/sudoers`, и это можно спросить напрямую:

```
$ sudo -l
Matching Defaults entries for user on debian:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User user may run the following commands on debian:
    (ALL : ALL) ALL
```

**`sudo -l` — первая команда при любой проверке на повышение привилегий.** `(ALL : ALL) ALL` означает полный root. Но самое интересное живёт в узких правилах:

```
User user may run the following commands on debian:
    (root) NOPASSWD: /usr/bin/find
```

Выглядит безобидно, но это не так: `find` умеет выполнять команды, поэтому право запускать его от root без пароля отдаёт всю машину.

`su` полностью переключает пользователя и спрашивает пароль *целевого*:

```
$ su - alice
Password:
alice@debian:~$
```

Дефис важен: он загружает окружение Алисы как при настоящем входе, вместо сохранения вашего.

## Каждый sudo записывается

```
$ sudo tail -2 /var/log/auth.log
Mar  4 12:44:02 debian sudo:     user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/tail -2 /var/log/auth.log
Mar  4 12:44:02 debian sudo: pam_unix(sudo:session): session opened for user root(uid=0) by user(uid=1000)
```

Команда, каталог, откуда она запущена, и кто запустил. Это след, по которому идут защитники — и который пытаются оборвать атакующие.

## Попробуйте

1. `id` — в каких вы группах? Есть ли среди них `sudo`?
2. `sudo -l` — что именно вам разрешено запускать?
3. `awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd` — кто реальные люди на этой машине?""",
        "questions": [
            q("Which UID always means root?",
              "Qaysi UID doim root'ni bildiradi?",
              "Какой UID всегда означает root?",
              ["0", "1", "1000", "65534"], ["0", "1", "1000", "65534"], ["0", "1", "1000", "65534"], 0),
            q("Whose password does `sudo` ask for?",
              "`sudo` kimning parolini so'raydi?",
              "Чей пароль спрашивает `sudo`?",
              ["Your own", "Root's", "The target user's", "None — sudo never asks"],
              ["O'zingizniki", "Root'niki", "Nishon foydalanuvchiniki", "Hech kimniki — sudo so'ramaydi"],
              ["Ваш собственный", "Пароль root", "Пароль целевого пользователя", "Ничей — sudo не спрашивает"], 0),
            q("Why is `(root) NOPASSWD: /usr/bin/find` dangerous?",
              "Nega `(root) NOPASSWD: /usr/bin/find` xavfli?",
              "Почему `(root) NOPASSWD: /usr/bin/find` опасно?",
              ["find can execute commands, so it grants full root", "find can delete /etc/shadow only",
               "It disables logging", "It is not dangerous at all"],
              ["find buyruq bajara oladi, ya'ni to'liq root beradi", "find faqat /etc/shadow ni o'chira oladi",
               "U loglashni o'chiradi", "U umuman xavfli emas"],
              ["find умеет выполнять команды, а значит даёт полный root", "find может удалить только /etc/shadow",
               "Оно отключает логирование", "Это совсем не опасно"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "linux", "points": 70,
        "title": "File permissions: reading and changing them",
        "titleUz": "Fayl ruxsatlari: o'qish va o'zgartirish",
        "titleRu": "Права на файлы: чтение и изменение",
        "content": r"""Most Linux privilege escalation comes down to one sentence: *a file allowed something it should not have.* Reading permissions fluently is therefore not optional.

## Anatomy of `ls -l`

```
$ ls -l notes.txt
-rw-r--r-- 1 user staff 84 Mar  4 11:40 notes.txt
```

The first field is ten characters:

```
-  rw-  r--  r--
│   │    │    │
│   │    │    └── others: everyone else
│   │    └─────── group: members of the file's group
│   └──────────── owner: the user who owns it
└──────────────── type: - file, d directory, l symlink
```

Each triple is `r` read, `w` write, `x` execute, with `-` for absent. So `-rw-r--r--` means: owner may read and write; group and everyone else may only read.

Then `1` (link count), `user` (owner), `staff` (group), `84` (bytes), the date, the name.

## What the bits mean for directories

The same letters mean different things:

- `r` — you may *list* the directory
- `w` — you may *create and delete* entries in it
- `x` — you may *enter* it and reach things inside

`x` without `r` is common and useful: you can access `/some/dir/file` if you know the name, but cannot list what is there.

## Numbers

Each triple is three bits, so it fits in one octal digit:

```
r = 4    w = 2    x = 1
```

Add them:

- `rwx` = 4+2+1 = **7**
- `rw-` = 4+2 = **6**
- `r-x` = 4+1 = **5**
- `r--` = **4**

So `-rw-r--r--` is **644**, and `-rwxr-xr-x` is **755**. These two cover most files you will ever create.

## Changing them with chmod

Numeric, setting all three at once:

```
$ chmod 600 secret.txt
$ ls -l secret.txt
-rw------- 1 user user 12 Mar  4 13:02 secret.txt
```

Symbolic, adjusting one thing:

```
$ chmod +x script.sh      # make executable for everyone
$ chmod u+x script.sh     # only the owner
$ chmod go-rwx secret.txt # take everything from group and others
```

`u` user, `g` group, `o` others, `a` all; `+` add, `-` remove, `=` set exactly.

## Why 600 for keys

SSH refuses to use a private key that others can read:

```
$ chmod 644 ~/.ssh/id_rsa
$ ssh server
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for '/home/user/.ssh/id_rsa' are too open.
```

The fix is `chmod 600 ~/.ssh/id_rsa`. This is not SSH being fussy — a readable private key is a compromised private key.

## Ownership

```
$ sudo chown alice notes.txt        # change owner
$ sudo chown alice:staff notes.txt  # owner and group
```

Only root can give a file away.

## SUID — the escalation classic

A file with `s` where the owner's `x` would be runs **as its owner**, no matter who starts it:

```
$ ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root 68208 Mar  3 09:10 /usr/bin/passwd
```

That `s` is why an ordinary user can change their own password, which writes to root-owned `/etc/shadow`. It is also the first thing an attacker hunts for:

```
$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/su
/usr/bin/mount
```

A *normal* list looks like that. An unusual entry — `/usr/bin/find`, `/usr/bin/vim`, a custom binary — very often means instant root.

## Try it

1. `touch t.txt; ls -l t.txt` — what are the default permissions?
2. `chmod 600 t.txt`, then `ls -l`. Then `chmod 644 t.txt` and compare.
3. `find / -perm -4000 -type f 2>/dev/null` — is anything on your list surprising?""",
        "contentUz": r"""Linux'dagi imtiyoz oshirishning aksari bitta jumlaga tayanadi: *fayl ruxsat bermasligi kerak bo'lgan narsaga ruxsat bergan.* Shuning uchun ruxsatlarni ravon o'qish — tanlov emas.

## `ls -l` anatomiyasi

```
$ ls -l notes.txt
-rw-r--r-- 1 user staff 84 Mar  4 11:40 notes.txt
```

Birinchi maydon — o'nta belgi:

```
-  rw-  r--  r--
│   │    │    │
│   │    │    └── boshqalar: qolgan hamma
│   │    └─────── guruh: fayl guruhi a'zolari
│   └──────────── egasi: fayl egasi bo'lgan foydalanuvchi
└──────────────── turi: - fayl, d katalog, l ramziy havola
```

Har uchlik: `r` o'qish, `w` yozish, `x` bajarish; yo'q bo'lsa `-`. Ya'ni `-rw-r--r--`: egasi o'qiy va yoza oladi; guruh va qolganlar faqat o'qiy oladi.

Keyin `1` (havolalar soni), `user` (egasi), `staff` (guruh), `84` (bayt), sana, nom.

## Kataloglar uchun bitlar nimani bildiradi

Xuddi shu harflar boshqa ma'noni beradi:

- `r` — katalogni *sanay* olasiz
- `w` — unda yozuv *yarata va o'chira* olasiz
- `x` — unga *kira* olasiz va ichidagilarga yeta olasiz

`r` siz `x` — keng tarqalgan va foydali: nomini bilsangiz `/some/dir/file` ga kira olasiz, lekin u yerda nima borligini sanay olmaysiz.

## Raqamlar

Har uchlik — uch bit, ya'ni bitta sakkizlik raqamga sig'adi:

```
r = 4    w = 2    x = 1
```

Qo'shing:

- `rwx` = 4+2+1 = **7**
- `rw-` = 4+2 = **6**
- `r-x` = 4+1 = **5**
- `r--` = **4**

Demak `-rw-r--r--` bu **644**, `-rwxr-xr-x` esa **755**. Bu ikkisi siz yaratadigan fayllarning aksarini qamraydi.

## chmod bilan o'zgartirish

Raqamli — uchalasini birdan o'rnatadi:

```
$ chmod 600 secret.txt
$ ls -l secret.txt
-rw------- 1 user user 12 Mar  4 13:02 secret.txt
```

Ramziy — bittasini tuzatadi:

```
$ chmod +x script.sh      # hamma uchun bajariluvchi qilish
$ chmod u+x script.sh     # faqat egasi uchun
$ chmod go-rwx secret.txt # guruh va boshqalardan hammasini olib tashlash
```

`u` egasi, `g` guruh, `o` boshqalar, `a` hammasi; `+` qo'shish, `-` olib tashlash, `=` aniq o'rnatish.

## Nega kalitlar uchun 600

SSH boshqalar o'qiy oladigan maxfiy kalitni ishlatishdan bosh tortadi:

```
$ chmod 644 ~/.ssh/id_rsa
$ ssh server
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for '/home/user/.ssh/id_rsa' are too open.
```

Yechim: `chmod 600 ~/.ssh/id_rsa`. Bu SSH'ning injiqligi emas — o'qilaveradigan maxfiy kalit allaqachon buzilgan kalit.

## Egalik

```
$ sudo chown alice notes.txt        # egasini almashtirish
$ sudo chown alice:staff notes.txt  # egasi va guruhi
```

Faylni birovga faqat root berа oladi.

## SUID — klassik eskalatsiya

Egasining `x` o'rnida `s` turgan fayl kim ishga tushirishidan qat'i nazar **egasi sifatida** bajariladi:

```
$ ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root 68208 Mar  3 09:10 /usr/bin/passwd
```

Aynan shu `s` tufayli oddiy foydalanuvchi o'z parolini o'zgartira oladi — bu esa root egalik qiladigan `/etc/shadow` ga yozadi. Bu hujumchi birinchi qidiradigan narsa hamdir:

```
$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/su
/usr/bin/mount
```

*Odatiy* ro'yxat shunday ko'rinadi. G'ayrioddiy yozuv — `/usr/bin/find`, `/usr/bin/vim` yoki maxsus binar — ko'pincha bir zumda root degani.

## Sinab ko'ring

1. `touch t.txt; ls -l t.txt` — sukut bo'yicha ruxsatlar qanday?
2. `chmod 600 t.txt`, keyin `ls -l`. Keyin `chmod 644 t.txt` va solishtiring.
3. `find / -perm -4000 -type f 2>/dev/null` — ro'yxatingizda hayratlanarli narsa bormi?""",
        "contentRu": r"""Большая часть повышения привилегий в Linux сводится к одной фразе: *файл разрешил то, чего не должен был.* Поэтому свободно читать права — не опция.

## Анатомия `ls -l`

```
$ ls -l notes.txt
-rw-r--r-- 1 user staff 84 Mar  4 11:40 notes.txt
```

Первое поле — десять символов:

```
-  rw-  r--  r--
│   │    │    │
│   │    │    └── остальные: все прочие
│   │    └─────── группа: члены группы файла
│   └──────────── владелец: пользователь-владелец
└──────────────── тип: - файл, d каталог, l символическая ссылка
```

Каждая тройка: `r` чтение, `w` запись, `x` выполнение, `-` если нет. То есть `-rw-r--r--`: владелец читает и пишет; группа и все прочие только читают.

Далее `1` (число ссылок), `user` (владелец), `staff` (группа), `84` (байт), дата, имя.

## Что биты значат для каталогов

Те же буквы означают другое:

- `r` — можно *перечислить* каталог
- `w` — можно *создавать и удалять* записи в нём
- `x` — можно *войти* в него и добраться до содержимого

`x` без `r` — частая и полезная комбинация: вы попадёте в `/some/dir/file`, зная имя, но не увидите список.

## Числа

Каждая тройка — три бита, то есть одна восьмеричная цифра:

```
r = 4    w = 2    x = 1
```

Складываем:

- `rwx` = 4+2+1 = **7**
- `rw-` = 4+2 = **6**
- `r-x` = 4+1 = **5**
- `r--` = **4**

Значит `-rw-r--r--` — это **644**, а `-rwxr-xr-x` — **755**. Эти два покрывают большинство создаваемых файлов.

## Меняем через chmod

Числами — сразу все три тройки:

```
$ chmod 600 secret.txt
$ ls -l secret.txt
-rw------- 1 user user 12 Mar  4 13:02 secret.txt
```

Символьно — правим что-то одно:

```
$ chmod +x script.sh      # сделать исполняемым для всех
$ chmod u+x script.sh     # только для владельца
$ chmod go-rwx secret.txt # забрать всё у группы и остальных
```

`u` владелец, `g` группа, `o` остальные, `a` все; `+` добавить, `-` убрать, `=` установить точно.

## Почему 600 для ключей

SSH отказывается использовать приватный ключ, который могут читать другие:

```
$ chmod 644 ~/.ssh/id_rsa
$ ssh server
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for '/home/user/.ssh/id_rsa' are too open.
```

Лечится через `chmod 600 ~/.ssh/id_rsa`. Это не придирки SSH — читаемый приватный ключ уже скомпрометирован.

## Владение

```
$ sudo chown alice notes.txt        # сменить владельца
$ sudo chown alice:staff notes.txt  # владельца и группу
```

Отдать файл может только root.

## SUID — классика эскалации

Файл, у которого на месте `x` владельца стоит `s`, выполняется **от имени владельца**, кто бы его ни запустил:

```
$ ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root 68208 Mar  3 09:10 /usr/bin/passwd
```

Именно этот `s` позволяет обычному пользователю сменить свой пароль, что пишет в принадлежащий root `/etc/shadow`. Это же — первое, что ищет атакующий:

```
$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/passwd
/usr/bin/sudo
/usr/bin/su
/usr/bin/mount
```

*Обычный* список выглядит так. Необычная запись — `/usr/bin/find`, `/usr/bin/vim`, самописный бинарник — очень часто означает мгновенный root.

## Попробуйте

1. `touch t.txt; ls -l t.txt` — какие права по умолчанию?
2. `chmod 600 t.txt`, затем `ls -l`. Затем `chmod 644 t.txt` и сравните.
3. `find / -perm -4000 -type f 2>/dev/null` — есть ли в вашем списке что-то неожиданное?""",
        "questions": [
            q("What is `-rw-r--r--` in numeric form?",
              "`-rw-r--r--` raqamli shaklda qanday?",
              "Как записать `-rw-r--r--` числами?",
              ["644", "755", "600", "777"], ["644", "755", "600", "777"], ["644", "755", "600", "777"], 0),
            q("On a directory, what does the `x` bit allow?",
              "Katalogda `x` biti nimaga ruxsat beradi?",
              "Что разрешает бит `x` на каталоге?",
              ["Entering it and reaching files inside", "Listing its contents",
               "Creating files in it", "Running it as a program"],
              ["Unga kirish va ichidagi fayllarga yetish", "Mazmunini sanash",
               "Unda fayl yaratish", "Uni dastur sifatida ishga tushirish"],
              ["Войти в него и добраться до файлов внутри", "Просмотреть его содержимое",
               "Создавать в нём файлы", "Запустить его как программу"], 0),
            q("A binary shows `-rwsr-xr-x` owned by root. What does the `s` mean?",
              "Binar `-rwsr-xr-x` va egasi root. `s` nimani bildiradi?",
              "У бинарника `-rwsr-xr-x`, владелец root. Что означает `s`?",
              ["It runs as root regardless of who starts it", "It is a system file",
               "It is a shell script", "It is encrypted"],
              ["U kim ishga tushirishidan qat'i nazar root sifatida bajariladi", "Bu tizim fayli",
               "Bu shell skript", "U shifrlangan"],
              ["Он выполняется от root, кто бы его ни запустил", "Это системный файл",
               "Это shell-скрипт", "Он зашифрован"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "linux", "points": 70,
        "title": "Finding files and searching text",
        "titleUz": "Fayllarni topish va matn qidirish",
        "titleRu": "Поиск файлов и текста",
        "content": r"""You will spend more time looking for things than reading them. Two commands do the looking: `find` for files, `grep` for what is inside them.

## find — search by properties

The shape is always `find <where> <conditions>`:

```
$ find /etc -name "*.conf"
/etc/adduser.conf
/etc/deluser.conf
/etc/ucf.conf
...
```

By name, case-insensitively:

```
$ find /home -iname "*password*"
/home/user/Documents/passwords.txt
```

By type — `f` file, `d` directory, `l` symlink:

```
$ find /var/log -type f -name "*.log"
/var/log/auth.log
/var/log/kern.log
```

By time — files changed in the last day:

```
$ find /etc -mtime -1
```

By size — bigger than 100 MB:

```
$ find / -size +100M -type f 2>/dev/null
```

By permission — the SUID hunt from the previous lesson:

```
$ find / -perm -4000 -type f 2>/dev/null
```

**About that `2>/dev/null`.** Searching `/` as a normal user produces a flood of `Permission denied` lines. Those go to *standard error*, which `2>` redirects, and `/dev/null` discards. The next lesson explains this properly; for now, it is the difference between readable output and noise.

## grep — search inside files

```
$ grep root /etc/passwd
root:x:0:0:root:/root:/bin/bash
```

The flags that earn their keep:

- `-i` — ignore case
- `-r` — recurse into directories
- `-n` — show line numbers
- `-v` — invert: show lines that do **not** match
- `-c` — count matches instead of printing them
- `-l` — print only the names of matching files

Combined, they answer real questions. Which files mention a password?

```
$ grep -rn -i "password" /etc/ 2>/dev/null | head -3
/etc/adduser.conf:# in /etc/shadow. The password will be set to the value
/etc/login.defs:# Password aging controls:
/etc/pam.d/common-password:# here are the per-package modules (the "Primary" block)
```

How many failed SSH logins were there?

```
$ sudo grep -c "Failed password" /var/log/auth.log
47
```

Which hosts did they come from?

```
$ sudo grep "Failed password" /var/log/auth.log | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | sort | uniq -c | sort -rn | head -3
     31 203.0.113.45
     12 198.51.100.9
      4 192.0.2.7
```

That one line — filter, extract, count, sort — is the shape of nearly every log investigation you will ever do.

## Just enough regular expression

`grep` matches patterns, not only literals:

- `^` — start of line: `grep "^root" /etc/passwd`
- `$` — end of line: `grep "bash$" /etc/passwd`
- `.` — any single character
- `*` — zero or more of the previous thing
- `[0-9]` — any digit
- `+` — one or more (needs `-E`)

```
$ grep -E "^user:" /etc/passwd
user:x:1000:1000:User,,,:/home/user:/bin/bash
$ grep -E "sh$" /etc/passwd | wc -l
3
```

Anchoring with `^` and `$` is what turns a sloppy search into a precise one.

## Try it

1. `find /etc -name "*.conf" | wc -l` — how many config files?
2. `grep -c "" /etc/passwd` versus `wc -l /etc/passwd` — do they agree?
3. `sudo grep "Failed password" /var/log/auth.log | tail -5` — anything trying to get in?""",
        "contentUz": r"""Siz narsalarni o'qishdan ko'ra ularni qidirishga ko'proq vaqt sarflaysiz. Qidirishni ikki buyruq bajaradi: fayllar uchun `find`, ular ichidagi mazmun uchun `grep`.

## find — xususiyatlar bo'yicha qidirish

Shakli doim `find <qayerda> <shartlar>`:

```
$ find /etc -name "*.conf"
/etc/adduser.conf
/etc/deluser.conf
/etc/ucf.conf
...
```

Nom bo'yicha, katta-kichik harfga e'tibor bermay:

```
$ find /home -iname "*password*"
/home/user/Documents/passwords.txt
```

Tur bo'yicha — `f` fayl, `d` katalog, `l` ramziy havola:

```
$ find /var/log -type f -name "*.log"
/var/log/auth.log
/var/log/kern.log
```

Vaqt bo'yicha — oxirgi bir kunda o'zgargan fayllar:

```
$ find /etc -mtime -1
```

Hajm bo'yicha — 100 MB dan katta:

```
$ find / -size +100M -type f 2>/dev/null
```

Ruxsat bo'yicha — oldingi darsdagi SUID ovi:

```
$ find / -perm -4000 -type f 2>/dev/null
```

**Ana shu `2>/dev/null` haqida.** Oddiy foydalanuvchi sifatida `/` ni qidirish `Permission denied` satrlari selini beradi. Ular *standart xato* oqimiga boradi, `2>` uni yo'naltiradi, `/dev/null` esa yo'q qiladi. Keyingi dars buni to'liq tushuntiradi; hozircha bu — o'qilishi mumkin chiqish bilan shovqin orasidagi farq.

## grep — fayllar ichida qidirish

```
$ grep root /etc/passwd
root:x:0:0:root:/root:/bin/bash
```

O'zini oqlaydigan bayroqlar:

- `-i` — katta-kichik harfni farqlamaslik
- `-r` — kataloglar ichiga rekursiv kirish
- `-n` — satr raqamlarini ko'rsatish
- `-v` — teskari: mos **kelmaydigan** satrlarni ko'rsatish
- `-c` — chiqarish o'rniga mosliklarni sanash
- `-l` — faqat mos fayl nomlarini chiqarish

Birlashganda ular haqiqiy savollarga javob beradi. Qaysi fayllarda parol tilga olingan?

```
$ grep -rn -i "password" /etc/ 2>/dev/null | head -3
/etc/adduser.conf:# in /etc/shadow. The password will be set to the value
/etc/login.defs:# Password aging controls:
/etc/pam.d/common-password:# here are the per-package modules (the "Primary" block)
```

Nechta muvaffaqiyatsiz SSH kirishi bo'lgan?

```
$ sudo grep -c "Failed password" /var/log/auth.log
47
```

Ular qaysi manzillardan kelgan?

```
$ sudo grep "Failed password" /var/log/auth.log | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | sort | uniq -c | sort -rn | head -3
     31 203.0.113.45
     12 198.51.100.9
      4 192.0.2.7
```

Ana shu bitta satr — filtrlash, ajratib olish, sanash, tartiblash — siz qiladigan deyarli har bir log tekshiruvining shakli.

## Muntazam ifodalardan yetarlicha

`grep` faqat harfma-harf emas, naqshlarga mos keladi:

- `^` — satr boshi: `grep "^root" /etc/passwd`
- `$` — satr oxiri: `grep "bash$" /etc/passwd`
- `.` — istalgan bitta belgi
- `*` — oldingi narsadan nol yoki ko'p
- `[0-9]` — istalgan raqam
- `+` — bir yoki ko'p (`-E` kerak)

```
$ grep -E "^user:" /etc/passwd
user:x:1000:1000:User,,,:/home/user:/bin/bash
$ grep -E "sh$" /etc/passwd | wc -l
3
```

`^` va `$` bilan bog'lash — beparvo qidiruvni aniq qidiruvga aylantiradigan narsa.

## Sinab ko'ring

1. `find /etc -name "*.conf" | wc -l` — nechta konfiguratsiya fayli?
2. `grep -c "" /etc/passwd` va `wc -l /etc/passwd` — ular mos keladimi?
3. `sudo grep "Failed password" /var/log/auth.log | tail -5` — kirishga urinayotgan biror kim bormi?""",
        "contentRu": r"""Вы потратите больше времени на поиск, чем на чтение. Ищут две команды: `find` — файлы, `grep` — то, что внутри них.

## find — поиск по свойствам

Форма всегда `find <где> <условия>`:

```
$ find /etc -name "*.conf"
/etc/adduser.conf
/etc/deluser.conf
/etc/ucf.conf
...
```

По имени, без учёта регистра:

```
$ find /home -iname "*password*"
/home/user/Documents/passwords.txt
```

По типу — `f` файл, `d` каталог, `l` символическая ссылка:

```
$ find /var/log -type f -name "*.log"
/var/log/auth.log
/var/log/kern.log
```

По времени — изменённые за последние сутки:

```
$ find /etc -mtime -1
```

По размеру — больше 100 МБ:

```
$ find / -size +100M -type f 2>/dev/null
```

По правам — охота за SUID из прошлого урока:

```
$ find / -perm -4000 -type f 2>/dev/null
```

**Про этот `2>/dev/null`.** Поиск по `/` обычным пользователем даёт поток строк `Permission denied`. Они идут в *стандартный поток ошибок*, `2>` его перенаправляет, а `/dev/null` выбрасывает. Следующий урок объяснит это как следует; пока это разница между читаемым выводом и шумом.

## grep — поиск внутри файлов

```
$ grep root /etc/passwd
root:x:0:0:root:/root:/bin/bash
```

Флаги, которые окупаются:

- `-i` — без учёта регистра
- `-r` — рекурсивно по каталогам
- `-n` — показывать номера строк
- `-v` — инверсия: строки, которые **не** совпали
- `-c` — считать совпадения вместо вывода
- `-l` — печатать только имена подходящих файлов

Вместе они отвечают на настоящие вопросы. В каких файлах упоминается пароль?

```
$ grep -rn -i "password" /etc/ 2>/dev/null | head -3
/etc/adduser.conf:# in /etc/shadow. The password will be set to the value
/etc/login.defs:# Password aging controls:
/etc/pam.d/common-password:# here are the per-package modules (the "Primary" block)
```

Сколько было неудачных входов по SSH?

```
$ sudo grep -c "Failed password" /var/log/auth.log
47
```

С каких адресов они шли?

```
$ sudo grep "Failed password" /var/log/auth.log | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | sort | uniq -c | sort -rn | head -3
     31 203.0.113.45
     12 198.51.100.9
      4 192.0.2.7
```

Эта одна строка — отфильтровать, извлечь, посчитать, отсортировать — форма почти любого разбора логов, который вам предстоит.

## Ровно столько регулярных выражений, сколько нужно

`grep` ищет по шаблонам, а не только по буквам:

- `^` — начало строки: `grep "^root" /etc/passwd`
- `$` — конец строки: `grep "bash$" /etc/passwd`
- `.` — любой одиночный символ
- `*` — ноль или больше предыдущего
- `[0-9]` — любая цифра
- `+` — один или больше (нужен `-E`)

```
$ grep -E "^user:" /etc/passwd
user:x:1000:1000:User,,,:/home/user:/bin/bash
$ grep -E "sh$" /etc/passwd | wc -l
3
```

Привязка через `^` и `$` превращает неряшливый поиск в точный.

## Попробуйте

1. `find /etc -name "*.conf" | wc -l` — сколько конфигов?
2. `grep -c "" /etc/passwd` против `wc -l /etc/passwd` — совпадают?
3. `sudo grep "Failed password" /var/log/auth.log | tail -5` — кто-нибудь ломится?""",
        "questions": [
            q("What does `2>/dev/null` accomplish in `find / -perm -4000 2>/dev/null`?",
              "`find / -perm -4000 2>/dev/null` da `2>/dev/null` nima qiladi?",
              "Что делает `2>/dev/null` в `find / -perm -4000 2>/dev/null`?",
              ["Discards error messages so only results show", "Speeds up the search",
               "Searches only readable files", "Writes results to a file"],
              ["Xato xabarlarini yo'q qiladi, faqat natijalar qoladi", "Qidiruvni tezlashtiradi",
               "Faqat o'qiladigan fayllarni qidiradi", "Natijalarni faylga yozadi"],
              ["Отбрасывает сообщения об ошибках, оставляя только результаты", "Ускоряет поиск",
               "Ищет только читаемые файлы", "Пишет результаты в файл"], 0),
            q("Which grep flag prints lines that do NOT match?",
              "Qaysi grep bayrog'i mos KELMAYDIGAN satrlarni chiqaradi?",
              "Какой флаг grep печатает строки, которые НЕ совпали?",
              ["-v", "-i", "-c", "-l"], ["-v", "-i", "-c", "-l"], ["-v", "-i", "-c", "-l"], 0),
            q("What does `^root` match in a regular expression?",
              "Muntazam ifodada `^root` nimaga mos keladi?",
              "Чему соответствует `^root` в регулярном выражении?",
              ["Lines that begin with root", "Lines that end with root",
               "Lines containing root anywhere", "Lines without root"],
              ["root bilan boshlanadigan satrlar", "root bilan tugaydigan satrlar",
               "Ichida root bo'lgan har qanday satr", "root yo'q satrlar"],
              ["Строки, начинающиеся с root", "Строки, заканчивающиеся на root",
               "Строки, где root встречается где угодно", "Строки без root"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "linux", "points": 80,
        "title": "Pipes, redirection, and building one-liners",
        "titleUz": "Quvurlar, yo'naltirish va bir qatorli buyruqlar",
        "titleRu": "Конвейеры, перенаправление и однострочники",
        "content": r"""This is the lesson that turns a list of commands into a toolkit. Each Linux tool does one small thing; pipes let you chain them into something no single tool provides.

## Three streams

Every process gets three channels:

- **stdin** (0) — input
- **stdout** (1) — normal output
- **stderr** (2) — error messages

They are separate on purpose, so errors do not corrupt data you are processing.

```
$ ls /etc /nope
ls: cannot access '/nope': No such file or directory
/etc:
adduser.conf
...
```

Both appeared on screen, but they travelled different channels. Send stdout to a file and the error still shows:

```
$ ls /etc /nope > out.txt
ls: cannot access '/nope': No such file or directory
```

## Redirection

```
$ echo "hello" > file.txt     # write, replacing the file
$ echo "world" >> file.txt    # append
$ cat file.txt
hello
world
```

`>` truncates without asking. Typing `>` when you meant `>>` destroys the file — it happens to everyone once.

Redirect errors with `2>`, and both with `&>`:

```
$ find / -name "*.conf" 2> errors.txt
$ find / -name "*.conf" &> everything.txt
$ find / -name "*.conf" 2>/dev/null
```

`/dev/null` is a file that discards everything written to it.

Read input from a file with `<`:

```
$ wc -l < /etc/passwd
32
```

## Pipes

`|` connects one command's stdout to the next command's stdin:

```
$ cat /etc/passwd | grep bash | wc -l
3
```

Read it left to right: take the file, keep lines with `bash`, count them.

Note that pipes carry **stdout only**. This is why `2>/dev/null` sits before the pipe — errors would otherwise still reach your screen.

## The workhorses

`sort` orders lines; `uniq -c` collapses adjacent duplicates and counts them. `uniq` only sees *adjacent* lines, so it is nearly always preceded by `sort`:

```
$ cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn
     22 /usr/sbin/nologin
      3 /bin/bash
      2 /bin/sync
      1 /bin/false
```

That answers "which shells are in use, and how often?" in one line. `cut -d: -f7` takes field 7 using `:` as the delimiter — the shell column of `/etc/passwd`.

`tee` writes to a file *and* passes the data onward — useful when you want to keep evidence and keep working:

```
$ sudo grep "Failed password" /var/log/auth.log | tee failed.txt | wc -l
47
```

`xargs` turns input lines into arguments for another command:

```
$ find /var/log -name "*.log" | xargs wc -l | tail -1
  18422 total
```

## Building one up

Start small and add a stage at a time, checking each. Top attacking IPs from an auth log:

```
$ sudo grep "Failed password" /var/log/auth.log \
  | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -5
     31 203.0.113.45
     12 198.51.100.9
      4 192.0.2.7
```

Stage by stage: find failures → extract IPs → sort so duplicates group → count each → order by count → keep the top five.

The backslashes let one command span several lines. Build these by running the first stage, then adding `| next` and running again. Debugging a six-stage pipe you wrote all at once is miserable.

## Try it

1. `cut -d: -f1 /etc/passwd | sort | head -5` — the first five account names alphabetically.
2. `ls /etc | wc -l`, then `ls /etc > list.txt; wc -l < list.txt`. Same number?
3. Build up the failed-login pipeline one stage at a time and watch the output change.""",
        "contentUz": r"""Bu — buyruqlar ro'yxatini asbob to'plamiga aylantiradigan dars. Har bir Linux vositasi bitta kichik ishni qiladi; quvurlar ularni birlashtirib, birorta vosita yolg'iz bera olmaydigan natijani beradi.

## Uchta oqim

Har bir jarayon uchta kanal oladi:

- **stdin** (0) — kirish
- **stdout** (1) — oddiy chiqish
- **stderr** (2) — xato xabarlari

Ular ataylab ajratilgan, toki xatolar siz qayta ishlayotgan ma'lumotni buzmasin.

```
$ ls /etc /nope
ls: cannot access '/nope': No such file or directory
/etc:
adduser.conf
...
```

Ikkalasi ekranda chiqdi, lekin turli kanallardan keldi. stdout ni faylga yuborsangiz, xato baribir ko'rinadi:

```
$ ls /etc /nope > out.txt
ls: cannot access '/nope': No such file or directory
```

## Yo'naltirish

```
$ echo "hello" > file.txt     # yozish, faylni almashtirib
$ echo "world" >> file.txt    # oxiriga qo'shish
$ cat file.txt
hello
world
```

`>` so'ramasdan faylni bo'shatadi. `>>` o'rniga `>` yozish faylni yo'q qiladi — bu hammada bir marta bo'ladi.

Xatolarni `2>` bilan, ikkalasini `&>` bilan yo'naltiring:

```
$ find / -name "*.conf" 2> errors.txt
$ find / -name "*.conf" &> everything.txt
$ find / -name "*.conf" 2>/dev/null
```

`/dev/null` — unga yozilgan hamma narsani yo'q qiladigan fayl.

`<` bilan fayldan kirish o'qing:

```
$ wc -l < /etc/passwd
32
```

## Quvurlar

`|` bir buyruqning stdout'ini keyingisining stdin'iga ulaydi:

```
$ cat /etc/passwd | grep bash | wc -l
3
```

Chapdan o'ngga o'qing: faylni ol, `bash` bor satrlarni qoldir, ularni sana.

E'tibor bering, quvurlar **faqat stdout**ni olib o'tadi. Shuning uchun `2>/dev/null` quvurdan oldin turadi — aks holda xatolar baribir ekraningizga chiqadi.

## Asosiy ish otlari

`sort` satrlarni tartiblaydi; `uniq -c` yonma-yon takrorlarni birlashtirib sanaydi. `uniq` faqat *yonma-yon* satrlarni ko'radi, shuning uchun undan oldin deyarli doim `sort` turadi:

```
$ cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn
     22 /usr/sbin/nologin
      3 /bin/bash
      2 /bin/sync
      1 /bin/false
```

Bu "qaysi shell'lar ishlatiladi va qanchadan?" degan savolga bir satrda javob beradi. `cut -d: -f7` ajratgich sifatida `:` ni olib, 7-maydonni oladi — `/etc/passwd` dagi shell ustuni.

`tee` faylga yozadi *va* ma'lumotni keyingiga uzatadi — dalilni saqlab, ishni davom ettirmoqchi bo'lganingizda foydali:

```
$ sudo grep "Failed password" /var/log/auth.log | tee failed.txt | wc -l
47
```

`xargs` kirish satrlarini boshqa buyruq uchun argumentga aylantiradi:

```
$ find /var/log -name "*.log" | xargs wc -l | tail -1
  18422 total
```

## Bosqichma-bosqich qurish

Kichikdan boshlang va har birini tekshirib, bittadan bosqich qo'shing. Auth logdan eng ko'p hujum qilgan IP'lar:

```
$ sudo grep "Failed password" /var/log/auth.log \
  | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -5
     31 203.0.113.45
     12 198.51.100.9
      4 192.0.2.7
```

Bosqichma-bosqich: xatolarni top → IP'larni ajratib ol → takrorlar guruhlanishi uchun tartibla → har birini sana → son bo'yicha tartibla → beshtasini qoldir.

Teskari chiziqlar bitta buyruqni bir necha satrga yoyadi. Bularni birinchi bosqichni bajarib, keyin `| keyingi` qo'shib qayta bajarish orqali quring. Birdaniga yozilgan olti bosqichli quvurni tuzatish — azob.

## Sinab ko'ring

1. `cut -d: -f1 /etc/passwd | sort | head -5` — alifbo bo'yicha birinchi beshta hisob nomi.
2. `ls /etc | wc -l`, keyin `ls /etc > list.txt; wc -l < list.txt`. Son bir xilmi?
3. Muvaffaqiyatsiz kirishlar quvurini bosqichma-bosqich quring va chiqish qanday o'zgarishini kuzating.""",
        "contentRu": r"""Это урок, который превращает список команд в набор инструментов. Каждый инструмент Linux делает одну маленькую вещь; конвейеры позволяют соединить их в то, чего не даёт ни один инструмент по отдельности.

## Три потока

Каждый процесс получает три канала:

- **stdin** (0) — ввод
- **stdout** (1) — обычный вывод
- **stderr** (2) — сообщения об ошибках

Они разделены намеренно, чтобы ошибки не портили обрабатываемые данные.

```
$ ls /etc /nope
ls: cannot access '/nope': No such file or directory
/etc:
adduser.conf
...
```

Оба вывода на экране, но пришли они по разным каналам. Отправьте stdout в файл — ошибка всё равно видна:

```
$ ls /etc /nope > out.txt
ls: cannot access '/nope': No such file or directory
```

## Перенаправление

```
$ echo "hello" > file.txt     # записать, заменив файл
$ echo "world" >> file.txt    # дописать в конец
$ cat file.txt
hello
world
```

`>` обнуляет файл без вопросов. Набрать `>` вместо `>>` — уничтожить файл; это случается с каждым один раз.

Перенаправляйте ошибки через `2>`, а оба потока — через `&>`:

```
$ find / -name "*.conf" 2> errors.txt
$ find / -name "*.conf" &> everything.txt
$ find / -name "*.conf" 2>/dev/null
```

`/dev/null` — файл, который выбрасывает всё записанное в него.

Чтение ввода из файла через `<`:

```
$ wc -l < /etc/passwd
32
```

## Конвейеры

`|` соединяет stdout одной команды со stdin следующей:

```
$ cat /etc/passwd | grep bash | wc -l
3
```

Читайте слева направо: взять файл, оставить строки с `bash`, посчитать их.

Заметьте: конвейеры несут **только stdout**. Поэтому `2>/dev/null` ставится до конвейера — иначе ошибки всё равно попадут на экран.

## Рабочие лошадки

`sort` упорядочивает строки; `uniq -c` схлопывает соседние дубликаты и считает их. `uniq` видит только *соседние* строки, поэтому перед ним почти всегда стоит `sort`:

```
$ cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn
     22 /usr/sbin/nologin
      3 /bin/bash
      2 /bin/sync
      1 /bin/false
```

Это отвечает на вопрос «какие оболочки используются и как часто?» одной строкой. `cut -d: -f7` берёт седьмое поле с разделителем `:` — колонку оболочки в `/etc/passwd`.

`tee` пишет в файл *и* передаёт данные дальше — удобно, когда надо сохранить улику и продолжить работу:

```
$ sudo grep "Failed password" /var/log/auth.log | tee failed.txt | wc -l
47
```

`xargs` превращает строки ввода в аргументы для другой команды:

```
$ find /var/log -name "*.log" | xargs wc -l | tail -1
  18422 total
```

## Собираем по шагам

Начинайте с малого и добавляйте по одной стадии, проверяя каждую. Топ атакующих IP из auth-лога:

```
$ sudo grep "Failed password" /var/log/auth.log \
  | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" \
  | sort \
  | uniq -c \
  | sort -rn \
  | head -5
     31 203.0.113.45
     12 198.51.100.9
      4 192.0.2.7
```

По стадиям: найти неудачи → извлечь IP → отсортировать, чтобы дубликаты сгруппировались → посчитать каждый → упорядочить по числу → оставить пятёрку.

Обратные слэши растягивают одну команду на несколько строк. Стройте их так: выполните первую стадию, добавьте `| следующая`, выполните снова. Отлаживать конвейер из шести стадий, написанный сразу целиком, — мучение.

## Попробуйте

1. `cut -d: -f1 /etc/passwd | sort | head -5` — первые пять имён учёток по алфавиту.
2. `ls /etc | wc -l`, затем `ls /etc > list.txt; wc -l < list.txt`. Число совпало?
3. Соберите конвейер неудачных входов по шагам и смотрите, как меняется вывод.""",
        "questions": [
            q("What is the difference between `>` and `>>`?",
              "`>` va `>>` orasidagi farq nima?",
              "В чём разница между `>` и `>>`?",
              ["`>` replaces the file, `>>` appends to it", "`>` appends, `>>` replaces",
               "They are identical", "`>>` only works with pipes"],
              ["`>` faylni almashtiradi, `>>` oxiriga qo'shadi", "`>` qo'shadi, `>>` almashtiradi",
               "Ular bir xil", "`>>` faqat quvurlar bilan ishlaydi"],
              ["`>` заменяет файл, `>>` дописывает", "`>` дописывает, `>>` заменяет",
               "Они одинаковы", "`>>` работает только с конвейерами"], 0),
            q("Why is `sort` almost always used before `uniq -c`?",
              "Nega `uniq -c` dan oldin deyarli doim `sort` ishlatiladi?",
              "Почему `sort` почти всегда используется перед `uniq -c`?",
              ["uniq only collapses adjacent duplicate lines", "uniq requires sorted input to run at all",
               "sort removes errors", "It makes uniq faster but is not required"],
              ["uniq faqat yonma-yon takror satrlarni birlashtiradi", "uniq umuman ishlashi uchun tartiblangan kirish talab qiladi",
               "sort xatolarni olib tashlaydi", "U uniq'ni tezlashtiradi, lekin shart emas"],
              ["uniq схлопывает только соседние дубликаты", "uniq вообще не работает без сортировки",
               "sort убирает ошибки", "Так быстрее, но не обязательно"], 0),
            q("A pipe `|` carries which stream to the next command?",
              "`|` quvuri keyingi buyruqqa qaysi oqimni olib o'tadi?",
              "Какой поток конвейер `|` передаёт следующей команде?",
              ["stdout only", "stderr only", "Both stdout and stderr", "stdin only"],
              ["Faqat stdout", "Faqat stderr", "stdout va stderr ikkalasi", "Faqat stdin"],
              ["Только stdout", "Только stderr", "И stdout, и stderr", "Только stdin"], 0),
        ],
    },
]


MODULE = {
    "slug": "linux-command-line",
    "category": "linux",
    "title": "Linux Command Line for Security",
    "titleUz": "Xavfsizlik uchun Linux buyruqlar qatori",
    "titleRu": "Командная строка Linux для безопасности",
    "description": (
        "The shell from first principles, for people who will use it to attack and defend systems. "
        "Navigation, the filesystem, users and sudo, permissions and SUID, searching with find and grep, "
        "and the pipelines that turn separate tools into real investigations. Every command is one you run yourself."
    ),
    "descriptionUz": (
        "Shell'ni boshidan — tizimlarga hujum qiladigan va ularni himoya qiladigan odamlar uchun. "
        "Harakatlanish, fayl tizimi, foydalanuvchilar va sudo, ruxsatlar va SUID, find va grep bilan qidirish, "
        "hamda alohida vositalarni haqiqiy tekshiruvga aylantiradigan quvurlar. Har bir buyruqni o'zingiz bajarasiz."
    ),
    "descriptionRu": (
        "Оболочка с самых основ — для тех, кто будет атаковать и защищать системы. "
        "Навигация, файловая система, пользователи и sudo, права и SUID, поиск через find и grep, "
        "и конвейеры, превращающие отдельные инструменты в настоящее расследование. Каждую команду вы выполняете сами."
    ),
    "difficulty": "beginner",
    "estimatedHours": 40,
    "passScore": 80,
    "orderIndex": 0,
    "exam": [
        q("In the prompt `root@host:/#`, what does `#` indicate?",
          "`root@host:/#` taklif satrida `#` nimani bildiradi?",
          "Что означает `#` в приглашении `root@host:/#`?",
          ["The session is running as root", "The command failed", "A comment follows", "The shell is busy"],
          ["Sessiya root sifatida ishlayapti", "Buyruq xato berdi", "Keyin izoh keladi", "Shell band"],
          ["Сессия работает под root", "Команда завершилась ошибкой", "Дальше комментарий", "Оболочка занята"], 0),
        q("Which command prints your UID, GID and group memberships?",
          "Qaysi buyruq UID, GID va guruh a'zoliklaringizni chiqaradi?",
          "Какая команда печатает ваш UID, GID и группы?",
          ["id", "whoami", "pwd", "ls -l"], ["id", "whoami", "pwd", "ls -l"], ["id", "whoami", "pwd", "ls -l"], 0),
        q("Where are password hashes stored?",
          "Parol xeshlari qayerda saqlanadi?",
          "Где хранятся хеши паролей?",
          ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/root/.hashes"],
          ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/root/.hashes"],
          ["/etc/shadow", "/etc/passwd", "/var/log/auth.log", "/root/.hashes"], 0),
        q("`-rwxr-xr-x` written numerically is:",
          "`-rwxr-xr-x` raqamli shaklda:",
          "`-rwxr-xr-x` в числовом виде:",
          ["755", "644", "777", "700"], ["755", "644", "777", "700"], ["755", "644", "777", "700"], 0),
        q("Which command lists exactly what you are permitted to run as root?",
          "Root sifatida aynan nimani bajara olishingizni qaysi buyruq ko'rsatadi?",
          "Какая команда покажет, что именно вам разрешено выполнять от root?",
          ["sudo -l", "id", "whoami", "cat /etc/sudoers"],
          ["sudo -l", "id", "whoami", "cat /etc/sudoers"],
          ["sudo -l", "id", "whoami", "cat /etc/sudoers"], 0),
        q("Which command finds every SUID binary on the system?",
          "Tizimdagi barcha SUID binarlarni qaysi buyruq topadi?",
          "Какая команда находит все SUID-бинарники в системе?",
          ["find / -perm -4000 -type f 2>/dev/null", "ls -l /usr/bin",
           "grep -r suid /etc", "find / -name '*suid*'"],
          ["find / -perm -4000 -type f 2>/dev/null", "ls -l /usr/bin",
           "grep -r suid /etc", "find / -name '*suid*'"],
          ["find / -perm -4000 -type f 2>/dev/null", "ls -l /usr/bin",
           "grep -r suid /etc", "find / -name '*suid*'"], 0),
        q("Which log file records logins and sudo usage on Debian?",
          "Debian'da kirishlar va sudo ishlatilishini qaysi log fayli yozadi?",
          "Какой файл лога фиксирует входы и использование sudo в Debian?",
          ["/var/log/auth.log", "/var/log/kern.log", "/var/log/dpkg.log", "/etc/login.defs"],
          ["/var/log/auth.log", "/var/log/kern.log", "/var/log/dpkg.log", "/etc/login.defs"],
          ["/var/log/auth.log", "/var/log/kern.log", "/var/log/dpkg.log", "/etc/login.defs"], 0),
        q("What does `tail -f` do that `tail` alone does not?",
          "`tail -f` yolg'iz `tail` qilmaydigan nimani qiladi?",
          "Что делает `tail -f`, чего не делает просто `tail`?",
          ["Keeps printing new lines as they are written", "Prints the first lines instead",
           "Follows symbolic links", "Formats the output as a table"],
          ["Yangi satrlarni yozilishi bilan chiqaraverdi", "Buning o'rniga birinchi satrlarni chiqaradi",
           "Ramziy havolalarni kuzatadi", "Chiqishni jadval qilib formatlaydi"],
          ["Продолжает печатать новые строки по мере записи", "Печатает первые строки вместо последних",
           "Следует по символическим ссылкам", "Форматирует вывод таблицей"], 0),
        q("`grep -v error log.txt` prints:",
          "`grep -v error log.txt` nimani chiqaradi:",
          "`grep -v error log.txt` печатает:",
          ["Lines that do not contain 'error'", "Lines containing 'error'",
           "The count of 'error' lines", "Only the first 'error' line"],
          ["'error' so'zi yo'q satrlarni", "'error' bor satrlarni",
           "'error' satrlari sonini", "Faqat birinchi 'error' satrini"],
          ["Строки, где нет 'error'", "Строки, где есть 'error'",
           "Количество строк с 'error'", "Только первую строку с 'error'"], 0),
        q("In `cut -d: -f7 /etc/passwd`, what does `-f7` select?",
          "`cut -d: -f7 /etc/passwd` da `-f7` nimani tanlaydi?",
          "Что выбирает `-f7` в `cut -d: -f7 /etc/passwd`?",
          ["The seventh colon-separated field, the login shell", "The seventh line of the file",
           "The first seven characters", "Seven random fields"],
          ["Yettinchi ikki nuqta bilan ajratilgan maydon — login shell", "Faylning yettinchi satrini",
           "Birinchi yetti belgini", "Yettita tasodifiy maydonni"],
          ["Седьмое поле через двоеточие — оболочку входа", "Седьмую строку файла",
           "Первые семь символов", "Семь случайных полей"], 0),
        q("Why does `2>/dev/null` come before the pipe in `find / ... 2>/dev/null | sort`?",
          "Nega `find / ... 2>/dev/null | sort` da `2>/dev/null` quvurdan oldin turadi?",
          "Почему `2>/dev/null` стоит до конвейера в `find / ... 2>/dev/null | sort`?",
          ["Pipes carry only stdout, so errors would still reach the screen",
           "Pipes cannot appear after a redirection", "It makes find run faster",
           "Order does not matter"],
          ["Quvurlar faqat stdout'ni olib o'tadi, shuning uchun xatolar baribir ekranga chiqardi",
           "Quvur yo'naltirishdan keyin kela olmaydi", "Bu find'ni tezlashtiradi",
           "Tartib ahamiyatsiz"],
          ["Конвейер несёт только stdout, поэтому ошибки всё равно попали бы на экран",
           "Конвейер не может стоять после перенаправления", "Так find работает быстрее",
           "Порядок не важен"], 0),
        q("A file named `report.pdf` is reported by `file` as `Zip archive data`. The correct conclusion is:",
          "`report.pdf` nomli faylni `file` `Zip archive data` deb ko'rsatdi. To'g'ri xulosa:",
          "Файл `report.pdf` определяется `file` как `Zip archive data`. Верный вывод:",
          ["The extension does not match the real content", "The file is corrupted",
           "All PDFs are ZIP archives", "file cannot read PDFs"],
          ["Kengaytma haqiqiy mazmunga mos emas", "Fayl buzilgan",
           "Barcha PDF'lar ZIP arxiv", "file PDF'ni o'qiy olmaydi"],
          ["Расширение не соответствует реальному содержимому", "Файл повреждён",
           "Все PDF — это ZIP-архивы", "file не читает PDF"], 0),
        q("Why must an SSH private key be mode 600?",
          "Nega SSH maxfiy kaliti 600 rejimida bo'lishi kerak?",
          "Почему приватный ключ SSH должен иметь режим 600?",
          ["A key others can read is already compromised", "SSH cannot parse other modes",
           "600 makes the key load faster", "It is only a convention with no effect"],
          ["Boshqalar o'qiy oladigan kalit allaqachon buzilgan", "SSH boshqa rejimlarni o'qiy olmaydi",
           "600 kalitni tezroq yuklaydi", "Bu shunchaki an'ana, ta'siri yo'q"],
          ["Ключ, доступный другим на чтение, уже скомпрометирован", "SSH не понимает другие режимы",
           "С 600 ключ загружается быстрее", "Это лишь соглашение без последствий"], 0),
        q("On a directory, which bit lets you list its contents?",
          "Katalogda qaysi bit uning mazmunini sanashga imkon beradi?",
          "Какой бит на каталоге позволяет посмотреть его содержимое?",
          ["r", "w", "x", "s"], ["r", "w", "x", "s"], ["r", "w", "x", "s"], 0),
        q("`cd -` takes you where?",
          "`cd -` sizni qayerga olib boradi?",
          "Куда переводит `cd -`?",
          ["To the previous working directory", "To the home directory",
           "Up one level", "To the filesystem root"],
          ["Oldingi ish katalogiga", "Uy katalogiga", "Bir pog'ona yuqoriga", "Fayl tizimi ildiziga"],
          ["В предыдущий рабочий каталог", "В домашний каталог",
           "На уровень вверх", "В корень файловой системы"], 0),
    ],
}
