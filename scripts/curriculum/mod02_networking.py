"""
Module 02 — Networking for Security.

Commands were run against real hosts and loopback services. Addresses in
examples use the documentation ranges (192.0.2.0/24, 198.51.100.0/24,
203.0.113.0/24) reserved by RFC 5737, so nothing here points at a real target.
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
        "category": "networking", "points": 60,
        "title": "Addresses, subnets, and where you are on the network",
        "titleUz": "Manzillar, quyi tarmoqlar va siz tarmoqning qayeridasiz",
        "titleRu": "Адреса, подсети и где вы находитесь в сети",
        "content": r"""Before you can scan, intercept, or defend anything, you need to answer one question: *which machines can I even reach?* That is arithmetic, not guesswork.

## Your own address

```
$ ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    link/ether 08:00:27:1f:3a:9c brd ff:ff:ff:ff:ff:ff
    inet 192.0.2.15/24 brd 192.0.2.255 scope global eth0
```

Read the important line: `inet 192.0.2.15/24 ... eth0`.

- `192.0.2.15` — this machine's IPv4 address
- `/24` — the subnet mask, in CIDR notation
- `eth0` — the interface it is bound to
- `08:00:27:1f:3a:9c` — the MAC address, which identifies the network card itself

`lo` with `127.0.0.1` is the loopback: traffic to it never leaves the machine. A service bound only to `127.0.0.1` cannot be reached from the network at all — a distinction that decides whether a finding is exploitable.

## What /24 actually means

An IPv4 address is 32 bits. The prefix says how many leading bits identify the *network*; the rest identify the *host*.

```
192.0.2.15/24
│           └── 24 network bits, so 32-24 = 8 host bits
└── 192.0.2 is the network, .15 is the host
```

With 8 host bits there are 2^8 = 256 addresses, of which two are reserved:

- `192.0.2.0` — the network address
- `192.0.2.255` — the broadcast address

So `/24` gives **254 usable hosts**, from `.1` to `.254`.

Common prefixes worth memorising:

| CIDR | Mask | Usable hosts |
|---|---|---|
| /24 | 255.255.255.0 | 254 |
| /25 | 255.255.255.128 | 126 |
| /26 | 255.255.255.192 | 62 |
| /30 | 255.255.255.252 | 2 |

Each extra bit halves the range. `ipcalc` does the arithmetic for you:

```
$ ipcalc 192.0.2.15/26
Address:   192.0.2.15
Netmask:   255.255.255.192 = 26
Network:   192.0.2.0/26
HostMin:   192.0.2.1
HostMax:   192.0.2.62
Broadcast: 192.0.2.63
Hosts/Net: 62
```

Note that `192.0.2.100` is *not* in that /26 — same first three octets, different subnet. Assuming otherwise is a classic scoping mistake.

## Private addresses

Three ranges never appear on the public internet (RFC 1918):

```
10.0.0.0/8          10.0.0.0     – 10.255.255.255
172.16.0.0/12       172.16.0.0   – 172.31.255.255
192.168.0.0/16      192.168.0.0  – 192.168.255.255
```

Seeing `10.x` or `192.168.x` tells you immediately that you are on an internal network behind NAT, and that this address means nothing to anyone outside it.

## Who else is here

```
$ ip neigh
192.0.2.1 dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE
192.0.2.20 dev eth0 lladdr 08:00:27:aa:bb:cc STALE
```

This is the ARP cache — machines this host has recently talked to on the local segment, with their MAC addresses. It is the cheapest possible look at your neighbours, and it requires no scanning.

## Try it

1. `ip addr show` — what is your address and prefix?
2. `ipcalc <your-address>` — how many usable hosts are on your subnet?
3. `ip neigh` — how many neighbours has your machine spoken to?""",
        "contentUz": r"""Biror narsani skanerlash, ushlab qolish yoki himoya qilishdan oldin bitta savolga javob berishingiz kerak: *men umuman qaysi mashinalarga yeta olaman?* Bu taxmin emas, arifmetika.

## O'zingizning manzilingiz

```
$ ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    link/ether 08:00:27:1f:3a:9c brd ff:ff:ff:ff:ff:ff
    inet 192.0.2.15/24 brd 192.0.2.255 scope global eth0
```

Muhim satrni o'qing: `inet 192.0.2.15/24 ... eth0`.

- `192.0.2.15` — shu mashinaning IPv4 manzili
- `/24` — quyi tarmoq niqobi, CIDR yozuvida
- `eth0` — u bog'langan interfeys
- `08:00:27:1f:3a:9c` — MAC manzil, tarmoq kartasining o'zini bildiradi

`127.0.0.1` bilan `lo` — loopback: unga ketgan trafik mashinadan chiqmaydi. Faqat `127.0.0.1` ga bog'langan xizmatga tarmoqdan umuman yetib bo'lmaydi — bu farq topilma ekspluatatsiya qilinadimi yoki yo'qmi, shuni hal qiladi.

## /24 aslida nimani bildiradi

IPv4 manzil — 32 bit. Prefiks nechta boshlang'ich bit *tarmoq*ni bildirishini aytadi; qolgani *xost*ni bildiradi.

```
192.0.2.15/24
│           └── 24 ta tarmoq biti, ya'ni 32-24 = 8 ta xost biti
└── 192.0.2 — tarmoq, .15 — xost
```

8 ta xost biti bilan 2^8 = 256 manzil bo'ladi, ulardan ikkitasi band:

- `192.0.2.0` — tarmoq manzili
- `192.0.2.255` — broadcast manzili

Demak `/24` **254 ta ishlatiladigan xost** beradi: `.1` dan `.254` gacha.

Yodlashga arziydigan keng tarqalgan prefikslar:

| CIDR | Niqob | Ishlatiladigan xostlar |
|---|---|---|
| /24 | 255.255.255.0 | 254 |
| /25 | 255.255.255.128 | 126 |
| /26 | 255.255.255.192 | 62 |
| /30 | 255.255.255.252 | 2 |

Har bir qo'shimcha bit diapazonni ikki barobar qisqartiradi. `ipcalc` arifmetikani siz uchun bajaradi:

```
$ ipcalc 192.0.2.15/26
Address:   192.0.2.15
Netmask:   255.255.255.192 = 26
Network:   192.0.2.0/26
HostMin:   192.0.2.1
HostMax:   192.0.2.62
Broadcast: 192.0.2.63
Hosts/Net: 62
```

E'tibor bering, `192.0.2.100` o'sha /26 ichida **emas** — birinchi uchta okteti bir xil, lekin quyi tarmog'i boshqa. Buni chalkashtirish — ko'lamni belgilashdagi klassik xato.

## Xususiy manzillar

Uchta diapazon ochiq internetda hech qachon uchramaydi (RFC 1918):

```
10.0.0.0/8          10.0.0.0     – 10.255.255.255
172.16.0.0/12       172.16.0.0   – 172.31.255.255
192.168.0.0/16      192.168.0.0  – 192.168.255.255
```

`10.x` yoki `192.168.x` ni ko'rish darrov aytadi: siz NAT ortidagi ichki tarmoqdasiz va bu manzil tashqaridagilar uchun hech narsani anglatmaydi.

## Bu yerda yana kim bor

```
$ ip neigh
192.0.2.1 dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE
192.0.2.20 dev eth0 lladdr 08:00:27:aa:bb:cc STALE
```

Bu — ARP keshi: shu xost yaqinda mahalliy segmentda gaplashgan mashinalar va ularning MAC manzillari. Bu qo'shnilaringizga eng arzon qarash usuli va u hech qanday skanerlash talab qilmaydi.

## Sinab ko'ring

1. `ip addr show` — manzilingiz va prefiksingiz qanday?
2. `ipcalc <manzilingiz>` — quyi tarmog'ingizda nechta ishlatiladigan xost bor?
3. `ip neigh` — mashinangiz nechta qo'shni bilan gaplashgan?""",
        "contentRu": r"""Прежде чем что-то сканировать, перехватывать или защищать, нужно ответить на один вопрос: *до каких машин я вообще могу дотянуться?* Это арифметика, а не догадки.

## Свой адрес

```
$ ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    link/ether 08:00:27:1f:3a:9c brd ff:ff:ff:ff:ff:ff
    inet 192.0.2.15/24 brd 192.0.2.255 scope global eth0
```

Читаем главную строку: `inet 192.0.2.15/24 ... eth0`.

- `192.0.2.15` — IPv4-адрес этой машины
- `/24` — маска подсети в нотации CIDR
- `eth0` — интерфейс, к которому он привязан
- `08:00:27:1f:3a:9c` — MAC-адрес, идентифицирующий саму сетевую карту

`lo` с `127.0.0.1` — это петля: трафик к ней никогда не покидает машину. До службы, привязанной только к `127.0.0.1`, из сети не достучаться вообще — это различие решает, эксплуатируема находка или нет.

## Что на самом деле означает /24

IPv4-адрес — это 32 бита. Префикс говорит, сколько старших бит определяют *сеть*; остальные определяют *хост*.

```
192.0.2.15/24
│           └── 24 бита сети, значит 32-24 = 8 бит хоста
└── 192.0.2 — сеть, .15 — хост
```

При 8 битах хоста получается 2^8 = 256 адресов, два из которых зарезервированы:

- `192.0.2.0` — адрес сети
- `192.0.2.255` — широковещательный адрес

Итого `/24` даёт **254 пригодных хоста**: с `.1` по `.254`.

Префиксы, которые стоит запомнить:

| CIDR | Маска | Пригодных хостов |
|---|---|---|
| /24 | 255.255.255.0 | 254 |
| /25 | 255.255.255.128 | 126 |
| /26 | 255.255.255.192 | 62 |
| /30 | 255.255.255.252 | 2 |

Каждый дополнительный бит вдвое сокращает диапазон. `ipcalc` посчитает за вас:

```
$ ipcalc 192.0.2.15/26
Address:   192.0.2.15
Netmask:   255.255.255.192 = 26
Network:   192.0.2.0/26
HostMin:   192.0.2.1
HostMax:   192.0.2.62
Broadcast: 192.0.2.63
Hosts/Net: 62
```

Обратите внимание: `192.0.2.100` в эту /26 **не** входит — первые три октета те же, а подсеть другая. Спутать это — классическая ошибка при определении области работ.

## Приватные адреса

Три диапазона никогда не встречаются в публичном интернете (RFC 1918):

```
10.0.0.0/8          10.0.0.0     – 10.255.255.255
172.16.0.0/12       172.16.0.0   – 172.31.255.255
192.168.0.0/16      192.168.0.0  – 192.168.255.255
```

Увидев `10.x` или `192.168.x`, вы сразу знаете: вы во внутренней сети за NAT, и снаружи этот адрес не значит ничего.

## Кто ещё здесь

```
$ ip neigh
192.0.2.1 dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE
192.0.2.20 dev eth0 lladdr 08:00:27:aa:bb:cc STALE
```

Это ARP-кеш: машины, с которыми хост недавно общался в локальном сегменте, вместе с их MAC-адресами. Самый дешёвый взгляд на соседей — и он не требует никакого сканирования.

## Попробуйте

1. `ip addr show` — какой у вас адрес и префикс?
2. `ipcalc <ваш-адрес>` — сколько пригодных хостов в вашей подсети?
3. `ip neigh` — со сколькими соседями общалась ваша машина?""",
        "questions": [
            q("How many usable host addresses does a /24 subnet provide?",
              "/24 quyi tarmoq nechta ishlatiladigan xost manzilini beradi?",
              "Сколько пригодных адресов хостов даёт подсеть /24?",
              ["254", "256", "255", "128"], ["254", "256", "255", "128"], ["254", "256", "255", "128"], 0),
            q("A service bound only to 127.0.0.1 can be reached from:",
              "Faqat 127.0.0.1 ga bog'langan xizmatga qayerdan yetish mumkin:",
              "До службы, привязанной только к 127.0.0.1, можно достучаться:",
              ["Only the machine itself", "Any host on the local subnet",
               "Anywhere on the internet", "Only the default gateway"],
              ["Faqat mashinaning o'zidan", "Mahalliy quyi tarmoqdagi istalgan xostdan",
               "Internetning istalgan joyidan", "Faqat asosiy shlyuzdan"],
              ["Только с самой машины", "С любого хоста локальной подсети",
               "Откуда угодно из интернета", "Только со шлюза по умолчанию"], 0),
            q("Which of these is a private (RFC 1918) address?",
              "Bulardan qaysi biri xususiy (RFC 1918) manzil?",
              "Какой из этих адресов приватный (RFC 1918)?",
              ["10.4.2.1", "8.8.8.8", "203.0.113.5", "1.1.1.1"],
              ["10.4.2.1", "8.8.8.8", "203.0.113.5", "1.1.1.1"],
              ["10.4.2.1", "8.8.8.8", "203.0.113.5", "1.1.1.1"], 0),
        ],
    },
    # ---------------------------------------------------------------- 2
    {
        "category": "networking", "points": 60,
        "title": "Layers and encapsulation: what a packet is made of",
        "titleUz": "Qatlamlar va inkapsulyatsiya: paket nimadan tuzilgan",
        "titleRu": "Уровни и инкапсуляция: из чего состоит пакет",
        "content": r"""When a tool says "TCP port 443 is open" or "the payload is at offset 54", it is talking about layers. Understanding them turns packet captures from noise into readable evidence.

## The model that matters in practice

Textbooks teach seven OSI layers. Working practitioners use four:

```
┌─────────────────────────────────────┐
│ Application   HTTP, DNS, SSH, TLS   │  what you are actually saying
├─────────────────────────────────────┤
│ Transport     TCP, UDP              │  ports, reliability
├─────────────────────────────────────┤
│ Internet      IP, ICMP              │  addresses, routing
├─────────────────────────────────────┤
│ Link          Ethernet, Wi-Fi       │  MAC addresses, one hop
└─────────────────────────────────────┘
```

## Encapsulation

Each layer wraps the one above it in its own header, like envelopes inside envelopes. Sending `GET / HTTP/1.1` produces:

```
[ Ethernet header ][ IP header ][ TCP header ][ GET / HTTP/1.1 ]
   14 bytes          20 bytes     20 bytes      the actual data
```

That is why a plain HTTP payload starts 54 bytes in: 14 + 20 + 20. When a capture tool shows "offset 54", it means "past the envelopes, at the letter".

Each layer only reads its own header:

- A **switch** reads the Ethernet header and forwards by MAC address.
- A **router** reads the IP header and forwards by IP address, rewriting the Ethernet header at every hop.
- A **firewall** typically reads the TCP/UDP header — ports and flags.
- The **application** reads what is left.

This is why your MAC address never reaches a remote web server, but your IP address does: the Ethernet envelope is thrown away and rewritten at each hop, the IP envelope is not.

## TCP vs UDP

**TCP** establishes a connection first, with the three-way handshake:

```
client → server   SYN            "can we talk?"
client ← server   SYN, ACK       "yes, can we?"
client → server   ACK            "yes"
```

Only then does data flow. TCP retransmits lost segments and delivers bytes in order.

**UDP** has no handshake and no retransmission. You send a datagram and hope. It is used where speed beats reliability, or where the application handles it: DNS, VoIP, video.

The handshake is why port scanning works at all. Send a SYN:

- **SYN, ACK** back → something is listening. Port open.
- **RST** back → nothing listening. Port closed.
- **Nothing** → a firewall dropped it silently. Port filtered.

Those three outcomes are the whole basis of `nmap`, and you can see them yourself:

```
$ nc -zv 127.0.0.1 22
Connection to 127.0.0.1 22 port [tcp/ssh] succeeded!
$ nc -zv 127.0.0.1 9999
nc: connect to 127.0.0.1 port 9999 (tcp) failed: Connection refused
```

"Succeeded" is the SYN,ACK. "Connection refused" is the RST. A hang with no answer is the filtered case.

## Seeing the layers

```
$ sudo tcpdump -i lo -n -c 3 port 22
tcpdump: listening on lo, link-type EN10MB (Ethernet), snapshot length 262144 bytes
12:31:04.882 IP 127.0.0.1.51234 > 127.0.0.1.22: Flags [S], seq 1102938, length 0
12:31:04.882 IP 127.0.0.1.22 > 127.0.0.1.51234: Flags [S.], seq 88123, ack 1102939, length 0
12:31:04.882 IP 127.0.0.1.51234 > 127.0.0.1.22: Flags [.], ack 1, length 0
```

`[S]` is SYN, `[S.]` is SYN-ACK, `[.]` is ACK. That is the handshake, live, in three lines.

## Try it

1. `nc -zv 127.0.0.1 22` and `nc -zv 127.0.0.1 9999`. Which reply is which flag?
2. Run `sudo tcpdump -i lo -n -c 3 port 22` in one terminal and `ssh localhost` in another.
3. Why can a website never see your MAC address? Answer it from the diagram above.""",
        "contentUz": r"""Vosita "TCP 443-port ochiq" yoki "foydali yuk 54-ofsetda" deganda, u qatlamlar haqida gapiryapti. Ularni tushunish paket yozuvlarini shovqindan o'qiladigan dalilga aylantiradi.

## Amalda muhim model

Darsliklar OSI'ning yetti qatlamini o'rgatadi. Amaliyotchilar to'rttasini ishlatadi:

```
┌─────────────────────────────────────┐
│ Ilova         HTTP, DNS, SSH, TLS   │  siz aslida nima deyapsiz
├─────────────────────────────────────┤
│ Transport     TCP, UDP              │  portlar, ishonchlilik
├─────────────────────────────────────┤
│ Internet      IP, ICMP              │  manzillar, marshrutlash
├─────────────────────────────────────┤
│ Kanal         Ethernet, Wi-Fi       │  MAC manzillar, bitta sakrash
└─────────────────────────────────────┘
```

## Inkapsulyatsiya

Har bir qatlam yuqoridagisini o'z sarlavhasiga o'raydi — konvert ichida konvert kabi. `GET / HTTP/1.1` yuborish quyidagini hosil qiladi:

```
[ Ethernet sarlavhasi ][ IP sarlavhasi ][ TCP sarlavhasi ][ GET / HTTP/1.1 ]
   14 bayt                20 bayt          20 bayt          haqiqiy ma'lumot
```

Shuning uchun oddiy HTTP foydali yuki 54-baytdan boshlanadi: 14 + 20 + 20. Vosita "54-ofset" deganda, "konvertlardan keyin, xatning o'zida" degani.

Har bir qatlam faqat o'z sarlavhasini o'qiydi:

- **Kommutator** Ethernet sarlavhasini o'qib, MAC manzil bo'yicha uzatadi.
- **Marshrutizator** IP sarlavhasini o'qib, IP bo'yicha uzatadi va har sakrashda Ethernet sarlavhasini qaytadan yozadi.
- **Ekran (firewall)** odatda TCP/UDP sarlavhasini — portlar va bayroqlarni o'qiydi.
- **Ilova** qolganini o'qiydi.

Aynan shuning uchun MAC manzilingiz masofadagi veb-serverga hech qachon yetmaydi, IP manzilingiz esa yetadi: Ethernet konverti har sakrashda tashlanib qayta yoziladi, IP konverti esa yo'q.

## TCP va UDP

**TCP** avval ulanish o'rnatadi — uch bosqichli qo'l berish orqali:

```
mijoz → server   SYN            "gaplashamizmi?"
mijoz ← server   SYN, ACK       "ha, siz-chi?"
mijoz → server   ACK            "ha"
```

Faqat shundan keyin ma'lumot oqadi. TCP yo'qolgan segmentlarni qayta yuboradi va baytlarni tartibda yetkazadi.

**UDP** da qo'l berish ham, qayta yuborish ham yo'q. Datagramma yuborasiz va umid qilasiz. U tezlik ishonchlilikdan ustun bo'lganda yoki ilova buni o'zi hal qilganda ishlatiladi: DNS, VoIP, video.

Qo'l berish — port skanerlash umuman ishlashining sababi. SYN yuboring:

- Javoban **SYN, ACK** → kimdir tinglayapti. Port ochiq.
- Javoban **RST** → hech kim tinglamayapti. Port yopiq.
- **Hech narsa** → ekran uni sassiz tashlab yubordi. Port filtrlangan.

Ana shu uchta natija — `nmap`ning butun asosi, va buni o'zingiz ko'rishingiz mumkin:

```
$ nc -zv 127.0.0.1 22
Connection to 127.0.0.1 22 port [tcp/ssh] succeeded!
$ nc -zv 127.0.0.1 9999
nc: connect to 127.0.0.1 port 9999 (tcp) failed: Connection refused
```

"succeeded" — bu SYN,ACK. "Connection refused" — bu RST. Javobsiz osilib qolish esa filtrlangan holat.

## Qatlamlarni ko'rish

```
$ sudo tcpdump -i lo -n -c 3 port 22
tcpdump: listening on lo, link-type EN10MB (Ethernet), snapshot length 262144 bytes
12:31:04.882 IP 127.0.0.1.51234 > 127.0.0.1.22: Flags [S], seq 1102938, length 0
12:31:04.882 IP 127.0.0.1.22 > 127.0.0.1.51234: Flags [S.], seq 88123, ack 1102939, length 0
12:31:04.882 IP 127.0.0.1.51234 > 127.0.0.1.22: Flags [.], ack 1, length 0
```

`[S]` — SYN, `[S.]` — SYN-ACK, `[.]` — ACK. Ana qo'l berish, jonli, uch satrda.

## Sinab ko'ring

1. `nc -zv 127.0.0.1 22` va `nc -zv 127.0.0.1 9999`. Qaysi javob qaysi bayroq?
2. Bir terminalda `sudo tcpdump -i lo -n -c 3 port 22`, boshqasida `ssh localhost`.
3. Nega veb-sayt MAC manzilingizni hech qachon ko'ra olmaydi? Yuqoridagi diagrammadan javob bering.""",
        "contentRu": r"""Когда инструмент говорит «TCP-порт 443 открыт» или «полезная нагрузка со смещения 54», он говорит об уровнях. Понимание уровней превращает захваты пакетов из шума в читаемые улики.

## Модель, которая важна на практике

Учебники учат семи уровням OSI. Практики пользуются четырьмя:

```
┌─────────────────────────────────────┐
│ Приложение    HTTP, DNS, SSH, TLS   │  что вы на самом деле говорите
├─────────────────────────────────────┤
│ Транспорт     TCP, UDP              │  порты, надёжность
├─────────────────────────────────────┤
│ Интернет      IP, ICMP              │  адреса, маршрутизация
├─────────────────────────────────────┤
│ Канальный     Ethernet, Wi-Fi       │  MAC-адреса, один переход
└─────────────────────────────────────┘
```

## Инкапсуляция

Каждый уровень оборачивает вышестоящий в свой заголовок — как конверты внутри конвертов. Отправка `GET / HTTP/1.1` даёт:

```
[ заголовок Ethernet ][ заголовок IP ][ заголовок TCP ][ GET / HTTP/1.1 ]
   14 байт               20 байт         20 байт         сами данные
```

Вот почему обычная HTTP-нагрузка начинается с 54-го байта: 14 + 20 + 20. Когда инструмент показывает «смещение 54», он имеет в виду «за конвертами, на самом письме».

Каждый уровень читает только свой заголовок:

- **Коммутатор** читает заголовок Ethernet и пересылает по MAC-адресу.
- **Маршрутизатор** читает заголовок IP и пересылает по IP, переписывая заголовок Ethernet на каждом переходе.
- **Файрвол** обычно читает заголовок TCP/UDP — порты и флаги.
- **Приложение** читает то, что осталось.

Поэтому ваш MAC-адрес никогда не доходит до удалённого веб-сервера, а IP — доходит: конверт Ethernet выбрасывается и переписывается на каждом переходе, а конверт IP — нет.

## TCP против UDP

**TCP** сначала устанавливает соединение — тройным рукопожатием:

```
клиент → сервер   SYN            «поговорим?»
клиент ← сервер   SYN, ACK       «да, а вы?»
клиент → сервер   ACK            «да»
```

Только после этого идут данные. TCP переотправляет потерянные сегменты и доставляет байты по порядку.

**UDP** не имеет ни рукопожатия, ни переотправки. Вы шлёте датаграмму и надеетесь. Его берут там, где скорость важнее надёжности или где этим занимается приложение: DNS, VoIP, видео.

Рукопожатие — причина, по которой сканирование портов вообще работает. Отправьте SYN:

- В ответ **SYN, ACK** → кто-то слушает. Порт открыт.
- В ответ **RST** → никто не слушает. Порт закрыт.
- **Ничего** → файрвол молча отбросил. Порт фильтруется.

Эти три исхода — вся основа `nmap`, и их можно увидеть самому:

```
$ nc -zv 127.0.0.1 22
Connection to 127.0.0.1 22 port [tcp/ssh] succeeded!
$ nc -zv 127.0.0.1 9999
nc: connect to 127.0.0.1 port 9999 (tcp) failed: Connection refused
```

«succeeded» — это SYN,ACK. «Connection refused» — это RST. Зависание без ответа — случай с фильтрацией.

## Увидеть уровни

```
$ sudo tcpdump -i lo -n -c 3 port 22
tcpdump: listening on lo, link-type EN10MB (Ethernet), snapshot length 262144 bytes
12:31:04.882 IP 127.0.0.1.51234 > 127.0.0.1.22: Flags [S], seq 1102938, length 0
12:31:04.882 IP 127.0.0.1.22 > 127.0.0.1.51234: Flags [S.], seq 88123, ack 1102939, length 0
12:31:04.882 IP 127.0.0.1.51234 > 127.0.0.1.22: Flags [.], ack 1, length 0
```

`[S]` — SYN, `[S.]` — SYN-ACK, `[.]` — ACK. Вот рукопожатие, вживую, в трёх строках.

## Попробуйте

1. `nc -zv 127.0.0.1 22` и `nc -zv 127.0.0.1 9999`. Какой ответ какому флагу соответствует?
2. В одном терминале `sudo tcpdump -i lo -n -c 3 port 22`, в другом `ssh localhost`.
3. Почему сайт никогда не видит ваш MAC-адрес? Ответьте по схеме выше.""",
        "questions": [
            q("What are the three steps of the TCP handshake, in order?",
              "TCP qo'l berishining uch qadami tartib bo'yicha qanday?",
              "Каковы три шага TCP-рукопожатия по порядку?",
              ["SYN, SYN-ACK, ACK", "ACK, SYN, SYN-ACK", "SYN, ACK, FIN", "SYN, RST, ACK"],
              ["SYN, SYN-ACK, ACK", "ACK, SYN, SYN-ACK", "SYN, ACK, FIN", "SYN, RST, ACK"],
              ["SYN, SYN-ACK, ACK", "ACK, SYN, SYN-ACK", "SYN, ACK, FIN", "SYN, RST, ACK"], 0),
            q("A port scan gets an RST back. The port is:",
              "Port skanerlash javoban RST oldi. Port:",
              "Сканирование порта получило RST. Порт:",
              ["Closed — nothing is listening", "Open — a service replied",
               "Filtered by a firewall", "Open but requires authentication"],
              ["Yopiq — hech kim tinglamayapti", "Ochiq — xizmat javob berdi",
               "Ekran tomonidan filtrlangan", "Ochiq, lekin autentifikatsiya talab qiladi"],
              ["Закрыт — никто не слушает", "Открыт — служба ответила",
               "Фильтруется файрволом", "Открыт, но требует аутентификации"], 0),
            q("Why does a remote web server never see your MAC address?",
              "Nega masofadagi veb-server MAC manzilingizni hech qachon ko'rmaydi?",
              "Почему удалённый веб-сервер никогда не видит ваш MAC-адрес?",
              ["The Ethernet header is rewritten at every router hop",
               "MAC addresses are encrypted in transit",
               "Web servers deliberately ignore them",
               "MAC addresses only exist on Wi-Fi"],
              ["Ethernet sarlavhasi har bir marshrutizator sakrashida qayta yoziladi",
               "MAC manzillar uzatishda shifrlanadi",
               "Veb-serverlar ularni ataylab e'tiborsiz qoldiradi",
               "MAC manzillar faqat Wi-Fi'da bo'ladi"],
              ["Заголовок Ethernet переписывается на каждом переходе маршрутизатора",
               "MAC-адреса шифруются при передаче",
               "Веб-серверы намеренно их игнорируют",
               "MAC-адреса существуют только в Wi-Fi"], 0),
        ],
    },
    # ---------------------------------------------------------------- 3
    {
        "category": "networking", "points": 70,
        "title": "Ports, sockets, and what is listening",
        "titleUz": "Portlar, soketlar va nima tinglayapti",
        "titleRu": "Порты, сокеты и что слушает",
        "content": r"""An IP address gets you to a machine. A port gets you to a *program* on it. Every service you attack or defend is a program holding a port open.

## The numbers worth knowing

| Port | Service | Why it matters |
|---|---|---|
| 21 | FTP | Credentials in cleartext |
| 22 | SSH | Remote shell; the main brute-force target |
| 23 | Telnet | Cleartext shell; should not exist in 2020s |
| 25 | SMTP | Mail relay |
| 53 | DNS | Name resolution; UDP and TCP |
| 80 | HTTP | Unencrypted web |
| 443 | HTTPS | Encrypted web |
| 445 | SMB | Windows file sharing; a historic exploit magnet |
| 3306 | MySQL | Database, often wrongly exposed |
| 3389 | RDP | Windows remote desktop |
| 5432 | PostgreSQL | Database |

Ports 0–1023 are *privileged*: only root may bind them. That is why a web server starts as root to claim port 80, then drops to a lower-privileged user.

## What is listening on this machine

`ss` is the modern replacement for `netstat`:

```
$ ss -tulpn
Netid State  Local Address:Port   Peer Address:Port  Process
tcp   LISTEN 0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=712,fd=3))
tcp   LISTEN 127.0.0.1:5432      0.0.0.0:*          users:(("postgres",pid=901,fd=5))
tcp   LISTEN 0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=1033,fd=6))
udp   UNCONN 0.0.0.0:68          0.0.0.0:*          users:(("dhclient",pid=655,fd=6))
```

The flags: `-t` TCP, `-u` UDP, `-l` listening only, `-p` show the process, `-n` numeric (do not resolve names).

**Read the local address column carefully — it is the whole point.**

- `0.0.0.0:22` — bound to *every* interface. Reachable from the network.
- `127.0.0.1:5432` — bound to loopback only. Not reachable from the network.

That one difference decides whether an exposed database is a critical finding or a non-issue. A great many "critical" reports die on this line.

## Which process, exactly

`-p` gives you the program and PID. Follow it:

```
$ ss -tulpn | grep :80
tcp LISTEN 0.0.0.0:80 0.0.0.0:* users:(("nginx",pid=1033,fd=6))
$ ls -l /proc/1033/exe
lrwxrwxrwx 1 root root 0 Mar  4 13:22 /proc/1033/exe -> /usr/sbin/nginx
$ cat /proc/1033/cmdline | tr '\0' ' '
nginx: master process /usr/sbin/nginx -g daemon on; master_process on;
```

An unexpected listener plus `/proc/<pid>/exe` pointing somewhere odd like `/tmp` is how backdoors are found.

## Established connections

Drop `-l` to see live connections instead of listeners:

```
$ ss -tn
State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port
ESTAB  0      0       192.0.2.15:51234     198.51.100.20:443
ESTAB  0      0       192.0.2.15:22        192.0.2.30:49812
```

Someone is connected to your SSH from `192.0.2.30`. If that is not you, that is your incident.

## Checking a remote port

```
$ nc -zv 192.0.2.20 22
Connection to 192.0.2.20 22 port [tcp/ssh] succeeded!
```

And what answers when you connect — the *banner*, which often names the exact software version:

```
$ nc 192.0.2.20 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u3
```

A version string is where vulnerability research starts.

## Try it

1. `ss -tulpn` — what is listening on your machine, and which are on `0.0.0.0`?
2. Pick a listener and follow its PID through `/proc/<pid>/exe`.
3. `ss -tn` — any established connections you cannot explain?""",
        "contentUz": r"""IP manzil sizni mashinagacha olib boradi. Port esa undagi *dasturgacha*. Siz hujum qiladigan yoki himoya qiladigan har bir xizmat — portni ochiq ushlab turgan dastur.

## Bilishga arziydigan raqamlar

| Port | Xizmat | Nega muhim |
|---|---|---|
| 21 | FTP | Parollar ochiq matnda |
| 22 | SSH | Masofaviy shell; asosiy brute-force nishoni |
| 23 | Telnet | Ochiq matnli shell; 2020-yillarda bo'lmasligi kerak |
| 25 | SMTP | Pochta uzatish |
| 53 | DNS | Nom yechish; UDP ham, TCP ham |
| 80 | HTTP | Shifrlanmagan veb |
| 443 | HTTPS | Shifrlangan veb |
| 445 | SMB | Windows fayl almashish; tarixiy eksploit magniti |
| 3306 | MySQL | Ma'lumotlar bazasi, ko'pincha noto'g'ri ochilgan |
| 3389 | RDP | Windows masofaviy ish stoli |
| 5432 | PostgreSQL | Ma'lumotlar bazasi |

0–1023 portlar *imtiyozli*: ularni faqat root band qila oladi. Shuning uchun veb-server 80-portni olish uchun root sifatida ishga tushadi, keyin past imtiyozli foydalanuvchiga tushadi.

## Bu mashinada nima tinglayapti

`ss` — `netstat` ning zamonaviy o'rnini bosuvchisi:

```
$ ss -tulpn
Netid State  Local Address:Port   Peer Address:Port  Process
tcp   LISTEN 0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=712,fd=3))
tcp   LISTEN 127.0.0.1:5432      0.0.0.0:*          users:(("postgres",pid=901,fd=5))
tcp   LISTEN 0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=1033,fd=6))
udp   UNCONN 0.0.0.0:68          0.0.0.0:*          users:(("dhclient",pid=655,fd=6))
```

Bayroqlar: `-t` TCP, `-u` UDP, `-l` faqat tinglayotganlar, `-p` jarayonni ko'rsatish, `-n` raqamli (nomlarni yechmaslik).

**Mahalliy manzil ustunini diqqat bilan o'qing — butun gap shunda.**

- `0.0.0.0:22` — *barcha* interfeyslarga bog'langan. Tarmoqdan yetish mumkin.
- `127.0.0.1:5432` — faqat loopback'ka bog'langan. Tarmoqdan yetib bo'lmaydi.

Ana shu bitta farq ochilgan ma'lumotlar bazasi kritik topilmami yoki umuman muammo emasmi — shuni hal qiladi. Juda ko'p "kritik" hisobotlar aynan shu satrda o'ladi.

## Aynan qaysi jarayon

`-p` dastur va PID beradi. Uni kuzating:

```
$ ss -tulpn | grep :80
tcp LISTEN 0.0.0.0:80 0.0.0.0:* users:(("nginx",pid=1033,fd=6))
$ ls -l /proc/1033/exe
lrwxrwxrwx 1 root root 0 Mar  4 13:22 /proc/1033/exe -> /usr/sbin/nginx
$ cat /proc/1033/cmdline | tr '\0' ' '
nginx: master process /usr/sbin/nginx -g daemon on; master_process on;
```

Kutilmagan tinglovchi va `/proc/<pid>/exe` ning `/tmp` kabi g'alati joyga ishora qilishi — backdoor'lar shunday topiladi.

## O'rnatilgan ulanishlar

Tinglovchilar o'rniga jonli ulanishlarni ko'rish uchun `-l` ni olib tashlang:

```
$ ss -tn
State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port
ESTAB  0      0       192.0.2.15:51234     198.51.100.20:443
ESTAB  0      0       192.0.2.15:22        192.0.2.30:49812
```

Kimdir `192.0.2.30` dan SSH'ingizga ulangan. Agar bu siz bo'lmasangiz — bu sizning insidentingiz.

## Masofadagi portni tekshirish

```
$ nc -zv 192.0.2.20 22
Connection to 192.0.2.20 22 port [tcp/ssh] succeeded!
```

Va ulanganda nima javob berishi — *banner*, u ko'pincha dasturning aniq versiyasini aytadi:

```
$ nc 192.0.2.20 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u3
```

Zaiflik tadqiqoti aynan versiya satridan boshlanadi.

## Sinab ko'ring

1. `ss -tulpn` — mashinangizda nima tinglayapti va qaysilari `0.0.0.0` da?
2. Bitta tinglovchini tanlab, uning PID'ini `/proc/<pid>/exe` orqali kuzating.
3. `ss -tn` — tushuntira olmaydigan o'rnatilgan ulanish bormi?""",
        "contentRu": r"""IP-адрес доводит вас до машины. Порт — до *программы* на ней. Каждая служба, которую вы атакуете или защищаете, — это программа, держащая порт открытым.

## Числа, которые стоит знать

| Порт | Служба | Почему важно |
|---|---|---|
| 21 | FTP | Учётные данные открытым текстом |
| 22 | SSH | Удалённая оболочка; главная цель брутфорса |
| 23 | Telnet | Оболочка открытым текстом; в 2020-х быть не должно |
| 25 | SMTP | Пересылка почты |
| 53 | DNS | Разрешение имён; и UDP, и TCP |
| 80 | HTTP | Незашифрованный веб |
| 443 | HTTPS | Зашифрованный веб |
| 445 | SMB | Общие папки Windows; исторический магнит эксплойтов |
| 3306 | MySQL | БД, часто ошибочно открытая наружу |
| 3389 | RDP | Удалённый рабочий стол Windows |
| 5432 | PostgreSQL | База данных |

Порты 0–1023 *привилегированные*: занять их может только root. Поэтому веб-сервер стартует под root, чтобы занять порт 80, а затем понижает права.

## Что слушает на этой машине

`ss` — современная замена `netstat`:

```
$ ss -tulpn
Netid State  Local Address:Port   Peer Address:Port  Process
tcp   LISTEN 0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=712,fd=3))
tcp   LISTEN 127.0.0.1:5432      0.0.0.0:*          users:(("postgres",pid=901,fd=5))
tcp   LISTEN 0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=1033,fd=6))
udp   UNCONN 0.0.0.0:68          0.0.0.0:*          users:(("dhclient",pid=655,fd=6))
```

Флаги: `-t` TCP, `-u` UDP, `-l` только слушающие, `-p` показать процесс, `-n` численно (не резолвить имена).

**Внимательно читайте колонку локального адреса — в ней вся суть.**

- `0.0.0.0:22` — привязан ко *всем* интерфейсам. Доступен из сети.
- `127.0.0.1:5432` — только петля. Из сети недоступен.

Именно это различие решает, является ли открытая БД критической находкой или вообще не проблемой. Очень многие «критические» отчёты умирают на этой строке.

## Какой именно процесс

`-p` даёт программу и PID. Идите по следу:

```
$ ss -tulpn | grep :80
tcp LISTEN 0.0.0.0:80 0.0.0.0:* users:(("nginx",pid=1033,fd=6))
$ ls -l /proc/1033/exe
lrwxrwxrwx 1 root root 0 Mar  4 13:22 /proc/1033/exe -> /usr/sbin/nginx
$ cat /proc/1033/cmdline | tr '\0' ' '
nginx: master process /usr/sbin/nginx -g daemon on; master_process on;
```

Неожиданный слушатель плюс `/proc/<pid>/exe`, указывающий куда-то странно — например в `/tmp`, — так и находят бэкдоры.

## Установленные соединения

Уберите `-l`, чтобы увидеть живые соединения вместо слушателей:

```
$ ss -tn
State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port
ESTAB  0      0       192.0.2.15:51234     198.51.100.20:443
ESTAB  0      0       192.0.2.15:22        192.0.2.30:49812
```

Кто-то подключён к вашему SSH с `192.0.2.30`. Если это не вы — это ваш инцидент.

## Проверка удалённого порта

```
$ nc -zv 192.0.2.20 22
Connection to 192.0.2.20 22 port [tcp/ssh] succeeded!
```

И что отвечает при подключении — *баннер*, часто называющий точную версию ПО:

```
$ nc 192.0.2.20 22
SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u3
```

Со строки версии начинается исследование уязвимостей.

## Попробуйте

1. `ss -tulpn` — что слушает на вашей машине и что из этого на `0.0.0.0`?
2. Выберите слушателя и пройдите по его PID через `/proc/<pid>/exe`.
3. `ss -tn` — есть ли установленные соединения, которые вы не можете объяснить?""",
        "questions": [
            q("A database listens on `127.0.0.1:5432`. From the network it is:",
              "Ma'lumotlar bazasi `127.0.0.1:5432` da tinglayapti. Tarmoqdan u:",
              "БД слушает на `127.0.0.1:5432`. Из сети она:",
              ["Unreachable — bound to loopback only", "Reachable by any host",
               "Reachable only over UDP", "Reachable only by root"],
              ["Yetib bo'lmaydi — faqat loopback'ka bog'langan", "Istalgan xost yeta oladi",
               "Faqat UDP orqali yetiladi", "Faqat root yeta oladi"],
              ["Недоступна — привязана только к петле", "Доступна любому хосту",
               "Доступна только по UDP", "Доступна только root"], 0),
            q("Which `ss` flags show listening TCP sockets with their process?",
              "Qaysi `ss` bayroqlari tinglayotgan TCP soketlarni jarayoni bilan ko'rsatadi?",
              "Какие флаги `ss` показывают слушающие TCP-сокеты с процессом?",
              ["-tlpn", "-uan", "-rp", "-cx"], ["-tlpn", "-uan", "-rp", "-cx"], ["-tlpn", "-uan", "-rp", "-cx"], 0),
            q("Why must a web server start as root to bind port 80?",
              "Nega veb-server 80-portni band qilish uchun root sifatida ishga tushishi kerak?",
              "Почему веб-сервер должен стартовать под root, чтобы занять порт 80?",
              ["Ports below 1024 are privileged", "Port 80 is reserved by the kernel for HTTP",
               "Only root can use TCP", "It does not need to be root"],
              ["1024 dan past portlar imtiyozli", "80-portni yadro HTTP uchun band qilgan",
               "TCP'ni faqat root ishlata oladi", "Root bo'lishi shart emas"],
              ["Порты ниже 1024 привилегированные", "Порт 80 зарезервирован ядром под HTTP",
               "TCP может использовать только root", "Ему не нужно быть root"], 0),
        ],
    },
    # ---------------------------------------------------------------- 4
    {
        "category": "networking", "points": 70,
        "title": "DNS: turning names into addresses",
        "titleUz": "DNS: nomlarni manzilga aylantirish",
        "titleRu": "DNS: превращение имён в адреса",
        "content": r"""DNS is the internet's phone book, and it is where reconnaissance begins. Before touching a target you can learn its servers, its mail provider, and often its internal naming scheme — all from public records.

## The resolution chain

Asking for `example.com` walks a hierarchy:

```
your resolver → root servers (.)        "who handles .com?"
              → TLD servers (.com)      "who handles example.com?"
              → authoritative server    "what is example.com?"  → 93.184.216.34
```

Answers are cached at every step, with a **TTL** (time to live) in seconds saying how long the cache may keep them.

## dig — the tool to learn

```
$ dig example.com

;; QUESTION SECTION:
;example.com.                   IN      A

;; ANSWER SECTION:
example.com.            3600    IN      A       93.184.216.34

;; Query time: 24 msec
;; SERVER: 192.0.2.1#53(192.0.2.1)
```

`3600` is the TTL. `IN A` is the record type. For a short answer:

```
$ dig +short example.com
93.184.216.34
```

## Record types that matter

| Type | Holds | Why you care |
|---|---|---|
| A | IPv4 address | Where the name points |
| AAAA | IPv6 address | Often forgotten by defenders |
| MX | Mail servers | Reveals the mail provider |
| NS | Name servers | Who controls the zone |
| TXT | Free text | SPF, DKIM, domain-verification tokens |
| CNAME | Alias | Points at another name; dangling ones enable takeover |
| PTR | Name from IP | Reverse lookup |

```
$ dig +short MX example.com
10 mail.example.com.
$ dig +short NS example.com
a.iana-servers.net.
b.iana-servers.net.
$ dig +short TXT example.com
"v=spf1 -all"
```

That TXT record is an SPF policy. `-all` means "no host is authorised to send mail as this domain" — a defensive setting you can read straight off a public record.

## Reverse lookups

```
$ dig +short -x 93.184.216.34
```

Reverse DNS often leaks naming conventions: a PTR of `db01.internal.corp.example.com` tells you there is probably a `db02`.

## Querying a specific server

Cached answers can be stale or filtered. Ask the authoritative server directly with `@`:

```
$ dig @a.iana-servers.net example.com +short
93.184.216.34
```

Comparing your resolver's answer with the authoritative one is how you spot DNS interference.

## The local shortcut

Before any DNS query, Linux consults `/etc/hosts`:

```
$ cat /etc/hosts
127.0.0.1       localhost
127.0.1.1       debian
192.0.2.50      target.local
```

An entry here wins over the entire DNS system. This is how CTF and lab machines are reached by name — and, occasionally, how malware pins a domain to an attacker's server.

## Zone transfers

A misconfigured name server will hand over its whole zone:

```
$ dig axfr @ns1.example.com example.com
; Transfer failed.
```

`Transfer failed` is the correct, secure response. A server that answers instead returns every record it holds — every subdomain, every internal host — in one command. It is rare now and still worth checking, because when it works it replaces hours of enumeration.

## Try it

1. `dig +short example.com` and `dig +short MX example.com`.
2. `dig example.com` — what is the TTL, and which server answered you?
3. `cat /etc/hosts` — what is pinned on your machine?""",
        "contentUz": r"""DNS — internetning telefon kitobi va razvedka aynan shundan boshlanadi. Nishonga tegmasdan turib uning serverlarini, pochta provayderini va ko'pincha ichki nomlash sxemasini bilib olish mumkin — hammasi ochiq yozuvlardan.

## Yechish zanjiri

`example.com` ni so'rash ierarxiya bo'ylab yuradi:

```
sizning resolver → ildiz serverlari (.)   "kim .com bilan shug'ullanadi?"
                 → TLD serverlari (.com)  "kim example.com bilan shug'ullanadi?"
                 → vakolatli server       "example.com nima?" → 93.184.216.34
```

Javoblar har bosqichda keshlanadi va **TTL** (yashash vaqti) sekundlarda kesh ularni qancha saqlashi mumkinligini aytadi.

## dig — o'rganish kerak bo'lgan vosita

```
$ dig example.com

;; QUESTION SECTION:
;example.com.                   IN      A

;; ANSWER SECTION:
example.com.            3600    IN      A       93.184.216.34

;; Query time: 24 msec
;; SERVER: 192.0.2.1#53(192.0.2.1)
```

`3600` — TTL. `IN A` — yozuv turi. Qisqa javob uchun:

```
$ dig +short example.com
93.184.216.34
```

## Muhim yozuv turlari

| Turi | Nimani saqlaydi | Nega muhim |
|---|---|---|
| A | IPv4 manzil | Nom qayerga ishora qiladi |
| AAAA | IPv6 manzil | Himoyachilar ko'pincha unutadi |
| MX | Pochta serverlari | Pochta provayderini oshkor qiladi |
| NS | Nom serverlari | Zonani kim boshqaradi |
| TXT | Erkin matn | SPF, DKIM, domen tasdiqlash tokenlari |
| CNAME | Taxallus | Boshqa nomga ishora qiladi; osilib qolgani egallab olishga yo'l ochadi |
| PTR | IP dan nom | Teskari qidiruv |

```
$ dig +short MX example.com
10 mail.example.com.
$ dig +short NS example.com
a.iana-servers.net.
b.iana-servers.net.
$ dig +short TXT example.com
"v=spf1 -all"
```

Bu TXT yozuvi — SPF siyosati. `-all` degani "bu domen nomidan pochta yuborishga hech bir xost vakolatli emas" — ochiq yozuvdan to'g'ridan-to'g'ri o'qib olsa bo'ladigan himoya sozlamasi.

## Teskari qidiruvlar

```
$ dig +short -x 93.184.216.34
```

Teskari DNS ko'pincha nomlash konventsiyalarini oshkor qiladi: `db01.internal.corp.example.com` degan PTR sizga `db02` ham bo'lishi mumkinligini aytadi.

## Aniq serverdan so'rash

Keshlangan javoblar eskirgan yoki filtrlangan bo'lishi mumkin. `@` bilan vakolatli serverdan to'g'ridan-to'g'ri so'rang:

```
$ dig @a.iana-servers.net example.com +short
93.184.216.34
```

O'z resolveringiz javobini vakolatli server javobi bilan solishtirish — DNS aralashuvini shunday aniqlaysiz.

## Mahalliy qisqa yo'l

Har qanday DNS so'rovidan oldin Linux `/etc/hosts` ga qaraydi:

```
$ cat /etc/hosts
127.0.0.1       localhost
127.0.1.1       debian
192.0.2.50      target.local
```

Bu yerdagi yozuv butun DNS tizimidan ustun keladi. CTF va laboratoriya mashinalariga nom bilan shunday yetiladi — va ba'zan zararli dastur domenni hujumchi serveriga shunday mahkamlaydi.

## Zona uzatishlari

Noto'g'ri sozlangan nom serveri butun zonasini topshirib qo'yadi:

```
$ dig axfr @ns1.example.com example.com
; Transfer failed.
```

`Transfer failed` — to'g'ri, xavfsiz javob. Buning o'rniga javob beradigan server o'zidagi barcha yozuvlarni — har bir subdomen, har bir ichki xostni — bitta buyruqda qaytaradi. Hozir bu kam uchraydi, lekin tekshirishga arziydi: ishlaganda u soatlab davom etadigan sanashning o'rnini bosadi.

## Sinab ko'ring

1. `dig +short example.com` va `dig +short MX example.com`.
2. `dig example.com` — TTL qancha va sizga qaysi server javob berdi?
3. `cat /etc/hosts` — mashinangizda nima mahkamlangan?""",
        "contentRu": r"""DNS — телефонная книга интернета, и именно с неё начинается разведка. Не касаясь цели, можно узнать её серверы, почтового провайдера и часто внутреннюю схему именования — всё из публичных записей.

## Цепочка разрешения

Запрос `example.com` идёт по иерархии:

```
ваш резолвер → корневые серверы (.)     «кто отвечает за .com?»
             → серверы TLD (.com)       «кто отвечает за example.com?»
             → авторитетный сервер      «что такое example.com?» → 93.184.216.34
```

Ответы кешируются на каждом шаге, а **TTL** (время жизни) в секундах говорит, сколько кеш может их хранить.

## dig — инструмент, который надо освоить

```
$ dig example.com

;; QUESTION SECTION:
;example.com.                   IN      A

;; ANSWER SECTION:
example.com.            3600    IN      A       93.184.216.34

;; Query time: 24 msec
;; SERVER: 192.0.2.1#53(192.0.2.1)
```

`3600` — это TTL. `IN A` — тип записи. Для краткого ответа:

```
$ dig +short example.com
93.184.216.34
```

## Типы записей, которые важны

| Тип | Что хранит | Почему важно |
|---|---|---|
| A | IPv4-адрес | Куда указывает имя |
| AAAA | IPv6-адрес | Защитники часто про него забывают |
| MX | Почтовые серверы | Выдаёт почтового провайдера |
| NS | Серверы имён | Кто управляет зоной |
| TXT | Произвольный текст | SPF, DKIM, токены подтверждения домена |
| CNAME | Псевдоним | Указывает на другое имя; повисший даёт захват |
| PTR | Имя по IP | Обратный запрос |

```
$ dig +short MX example.com
10 mail.example.com.
$ dig +short NS example.com
a.iana-servers.net.
b.iana-servers.net.
$ dig +short TXT example.com
"v=spf1 -all"
```

Эта TXT-запись — политика SPF. `-all` означает «ни один хост не уполномочен отправлять почту от этого домена» — защитная настройка, читаемая прямо из публичной записи.

## Обратные запросы

```
$ dig +short -x 93.184.216.34
```

Обратный DNS часто выдаёт соглашения об именах: PTR вида `db01.internal.corp.example.com` намекает, что есть и `db02`.

## Запрос к конкретному серверу

Кешированные ответы бывают устаревшими или отфильтрованными. Спросите авторитетный сервер напрямую через `@`:

```
$ dig @a.iana-servers.net example.com +short
93.184.216.34
```

Сравнение ответа вашего резолвера с авторитетным — так замечают вмешательство в DNS.

## Локальный обход

Перед любым DNS-запросом Linux смотрит в `/etc/hosts`:

```
$ cat /etc/hosts
127.0.0.1       localhost
127.0.1.1       debian
192.0.2.50      target.local
```

Запись здесь важнее всей системы DNS. Так по имени достигаются машины в CTF и лабораториях — и иногда так вредонос привязывает домен к серверу атакующего.

## Трансфер зоны

Неверно настроенный сервер имён отдаёт всю свою зону:

```
$ dig axfr @ns1.example.com example.com
; Transfer failed.
```

`Transfer failed` — правильный, безопасный ответ. Сервер, который вместо этого отвечает, возвращает все свои записи — каждый поддомен, каждый внутренний хост — одной командой. Сейчас это редкость, но проверить стоит: когда срабатывает, оно заменяет часы перебора.

## Попробуйте

1. `dig +short example.com` и `dig +short MX example.com`.
2. `dig example.com` — какой TTL и какой сервер вам ответил?
3. `cat /etc/hosts` — что закреплено на вашей машине?""",
        "questions": [
            q("Which DNS record type reveals a domain's mail servers?",
              "Qaysi DNS yozuv turi domenning pochta serverlarini ko'rsatadi?",
              "Какой тип DNS-записи показывает почтовые серверы домена?",
              ["MX", "A", "NS", "PTR"], ["MX", "A", "NS", "PTR"], ["MX", "A", "NS", "PTR"], 0),
            q("What does the TTL in a DNS answer control?",
              "DNS javobidagi TTL nimani boshqaradi?",
              "Что определяет TTL в DNS-ответе?",
              ["How long the answer may be cached", "How many hops the query may take",
               "How long the server waits for a reply", "The priority among mail servers"],
              ["Javob qancha vaqt keshlanishi mumkinligini", "So'rov nechta sakrash qilishi mumkinligini",
               "Server javobni qancha kutishini", "Pochta serverlari orasidagi ustuvorlikni"],
              ["Как долго ответ можно кешировать", "Сколько переходов может сделать запрос",
               "Сколько сервер ждёт ответа", "Приоритет среди почтовых серверов"], 0),
            q("A successful `dig axfr` against a name server means:",
              "Nom serveriga qarshi muvaffaqiyatli `dig axfr` nimani bildiradi:",
              "Успешный `dig axfr` к серверу имён означает:",
              ["It is misconfigured and leaked its entire zone", "The domain is correctly secured",
               "The server is offline", "The zone is empty"],
              ["U noto'g'ri sozlangan va butun zonasini sizdirdi", "Domen to'g'ri himoyalangan",
               "Server o'chiq", "Zona bo'sh"],
              ["Он неверно настроен и слил всю зону", "Домен корректно защищён",
               "Сервер недоступен", "Зона пуста"], 0),
        ],
    },
    # ---------------------------------------------------------------- 5
    {
        "category": "networking", "points": 70,
        "title": "HTTP by hand: requests, responses, and headers",
        "titleUz": "HTTP'ni qo'lda: so'rovlar, javoblar va sarlavhalar",
        "titleRu": "HTTP вручную: запросы, ответы и заголовки",
        "content": r"""Nearly every web vulnerability is a matter of what was in a request and what came back. A browser hides both. `curl` shows you everything.

## A request is just text

```
GET /index.html HTTP/1.1
Host: example.com
User-Agent: curl/7.88.1
Accept: */*

```

A request line, headers, a blank line, then an optional body. That is the whole protocol. You can type it by hand:

```
$ printf 'GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n' | nc example.com 80
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
```

## curl, and the flag that matters

`-v` shows the conversation. Sent lines start `>`, received lines `<`:

```
$ curl -v https://example.com
> GET / HTTP/2
> Host: example.com
> User-Agent: curl/7.88.1
>
< HTTP/2 200
< content-type: text/html; charset=UTF-8
< content-length: 1256
< server: ECS (dcb/7F84)
```

Other flags you will use constantly:

```
$ curl -I https://example.com          # headers only (HEAD)
$ curl -L https://example.com          # follow redirects
$ curl -s https://example.com          # silent, no progress meter
$ curl -X POST -d "user=admin" URL     # send a POST body
$ curl -H "X-Test: 1" URL              # add a header
$ curl -b "session=abc" URL            # send a cookie
$ curl -k https://self-signed.local    # ignore certificate errors
```

## Methods

- **GET** — fetch. Parameters in the URL, so they land in logs and browser history.
- **POST** — submit. Parameters in the body.
- **HEAD** — headers only, no body.
- **PUT / DELETE** — write and remove, in REST APIs.
- **OPTIONS** — asks what is allowed:

```
$ curl -X OPTIONS -i https://example.com
HTTP/1.1 200 OK
Allow: GET, HEAD, POST, OPTIONS
```

A server that answers `Allow: PUT, DELETE` on a path that should be read-only is worth a second look.

## Status codes

| Range | Meaning | Notable |
|---|---|---|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 permanent, 302 temporary |
| 4xx | Client error | 401 unauthenticated, 403 forbidden, 404 missing, 429 rate-limited |
| 5xx | Server error | 500 internal, 502 bad gateway, 503 unavailable |

The **401 vs 403** distinction matters: 401 means "I do not know who you are", 403 means "I know, and no". A 403 confirms the resource exists — useful during enumeration.

## Headers that carry security meaning

```
$ curl -I https://example.com
HTTP/2 200
strict-transport-security: max-age=31536000
content-security-policy: default-src 'self'
x-frame-options: DENY
set-cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
server: nginx/1.18.0
```

- **strict-transport-security** — browsers must use HTTPS from now on
- **content-security-policy** — restricts where scripts may load from; the main defence against XSS
- **x-frame-options: DENY** — the page may not be framed, blocking clickjacking
- **HttpOnly** — JavaScript cannot read the cookie, so stolen XSS cannot steal the session
- **Secure** — the cookie is never sent over plain HTTP
- **SameSite=Strict** — the cookie is not sent on cross-site requests, blocking CSRF
- **server: nginx/1.18.0** — a version disclosure; small, but it is free information for an attacker

Missing headers are findings. `curl -I` against any site is a five-second audit.

## Try it

1. `curl -I https://example.com` — which security headers are present, and which are missing?
2. `curl -v https://example.com 2>&1 | grep "^>"` — what does curl send about you?
3. Compare `curl -s -o /dev/null -w "%{http_code}\n" https://example.com/nope` with a real path.""",
        "contentUz": r"""Deyarli har bir veb-zaiflik — so'rovda nima bo'lgani va javobda nima kelgani masalasi. Brauzer ikkalasini ham yashiradi. `curl` esa hammasini ko'rsatadi.

## So'rov — shunchaki matn

```
GET /index.html HTTP/1.1
Host: example.com
User-Agent: curl/7.88.1
Accept: */*

```

So'rov satri, sarlavhalar, bo'sh satr, keyin ixtiyoriy tana. Butun protokol shu. Uni qo'lda yozish mumkin:

```
$ printf 'GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n' | nc example.com 80
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
```

## curl va eng muhim bayroq

`-v` suhbatni ko'rsatadi. Yuborilgan satrlar `>` bilan, qabul qilinganlari `<` bilan boshlanadi:

```
$ curl -v https://example.com
> GET / HTTP/2
> Host: example.com
> User-Agent: curl/7.88.1
>
< HTTP/2 200
< content-type: text/html; charset=UTF-8
< content-length: 1256
< server: ECS (dcb/7F84)
```

Doim ishlatadigan boshqa bayroqlar:

```
$ curl -I https://example.com          # faqat sarlavhalar (HEAD)
$ curl -L https://example.com          # qayta yo'naltirishlarni kuzatish
$ curl -s https://example.com          # jim, progress ko'rsatkichisiz
$ curl -X POST -d "user=admin" URL     # POST tanasini yuborish
$ curl -H "X-Test: 1" URL              # sarlavha qo'shish
$ curl -b "session=abc" URL            # cookie yuborish
$ curl -k https://self-signed.local    # sertifikat xatolarini e'tiborsiz qoldirish
```

## Metodlar

- **GET** — olish. Parametrlar URL da, ya'ni loglar va brauzer tarixiga tushadi.
- **POST** — yuborish. Parametrlar tanada.
- **HEAD** — faqat sarlavhalar, tanasiz.
- **PUT / DELETE** — REST API'larda yozish va o'chirish.
- **OPTIONS** — nimaga ruxsat borligini so'raydi:

```
$ curl -X OPTIONS -i https://example.com
HTTP/1.1 200 OK
Allow: GET, HEAD, POST, OPTIONS
```

Faqat o'qish uchun bo'lishi kerak bo'lgan yo'lda `Allow: PUT, DELETE` deb javob bergan server — ikkinchi marta qarashga arziydi.

## Holat kodlari

| Diapazon | Ma'nosi | E'tiborlilari |
|---|---|---|
| 2xx | Muvaffaqiyat | 200 OK, 201 Created, 204 No Content |
| 3xx | Qayta yo'naltirish | 301 doimiy, 302 vaqtinchalik |
| 4xx | Mijoz xatosi | 401 autentifikatsiyasiz, 403 taqiqlangan, 404 yo'q, 429 limit |
| 5xx | Server xatosi | 500 ichki, 502 bad gateway, 503 mavjud emas |

**401 va 403** farqi muhim: 401 — "men sizni kim ekanligingizni bilmayman", 403 — "bilaman, va yo'q". 403 resurs mavjudligini tasdiqlaydi — sanash paytida foydali.

## Xavfsizlik ma'nosiga ega sarlavhalar

```
$ curl -I https://example.com
HTTP/2 200
strict-transport-security: max-age=31536000
content-security-policy: default-src 'self'
x-frame-options: DENY
set-cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
server: nginx/1.18.0
```

- **strict-transport-security** — brauzerlar bundan buyon HTTPS ishlatishi shart
- **content-security-policy** — skriptlar qayerdan yuklanishini cheklaydi; XSS'ga qarshi asosiy himoya
- **x-frame-options: DENY** — sahifani freym ichiga solib bo'lmaydi, clickjacking bloklanadi
- **HttpOnly** — JavaScript cookie'ni o'qiy olmaydi, ya'ni XSS sessiyani o'g'irlay olmaydi
- **Secure** — cookie hech qachon oddiy HTTP orqali yuborilmaydi
- **SameSite=Strict** — cookie saytlararo so'rovlarda yuborilmaydi, CSRF bloklanadi
- **server: nginx/1.18.0** — versiyani oshkor qilish; kichik, lekin hujumchi uchun bepul ma'lumot

Yo'q sarlavhalar — bu topilma. Istalgan saytga `curl -I` — besh soniyalik audit.

## Sinab ko'ring

1. `curl -I https://example.com` — qaysi xavfsizlik sarlavhalari bor va qaysilari yo'q?
2. `curl -v https://example.com 2>&1 | grep "^>"` — curl siz haqingizda nima yuboradi?
3. `curl -s -o /dev/null -w "%{http_code}\n" https://example.com/nope` ni haqiqiy yo'l bilan solishtiring.""",
        "contentRu": r"""Почти любая веб-уязвимость — это вопрос того, что было в запросе и что пришло в ответ. Браузер скрывает и то, и другое. `curl` показывает всё.

## Запрос — это просто текст

```
GET /index.html HTTP/1.1
Host: example.com
User-Agent: curl/7.88.1
Accept: */*

```

Строка запроса, заголовки, пустая строка, затем необязательное тело. Это весь протокол. Его можно набрать вручную:

```
$ printf 'GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n' | nc example.com 80
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
```

## curl и самый важный флаг

`-v` показывает диалог. Отправленные строки начинаются с `>`, полученные — с `<`:

```
$ curl -v https://example.com
> GET / HTTP/2
> Host: example.com
> User-Agent: curl/7.88.1
>
< HTTP/2 200
< content-type: text/html; charset=UTF-8
< content-length: 1256
< server: ECS (dcb/7F84)
```

Другие флаги, которыми вы будете пользоваться постоянно:

```
$ curl -I https://example.com          # только заголовки (HEAD)
$ curl -L https://example.com          # следовать редиректам
$ curl -s https://example.com          # тихо, без индикатора
$ curl -X POST -d "user=admin" URL     # отправить тело POST
$ curl -H "X-Test: 1" URL              # добавить заголовок
$ curl -b "session=abc" URL            # отправить cookie
$ curl -k https://self-signed.local    # игнорировать ошибки сертификата
```

## Методы

- **GET** — получить. Параметры в URL, а значит попадают в логи и историю браузера.
- **POST** — отправить. Параметры в теле.
- **HEAD** — только заголовки, без тела.
- **PUT / DELETE** — запись и удаление в REST API.
- **OPTIONS** — спрашивает, что разрешено:

```
$ curl -X OPTIONS -i https://example.com
HTTP/1.1 200 OK
Allow: GET, HEAD, POST, OPTIONS
```

Сервер, отвечающий `Allow: PUT, DELETE` на пути, который должен быть только для чтения, заслуживает второго взгляда.

## Коды состояния

| Диапазон | Значение | Заметные |
|---|---|---|
| 2xx | Успех | 200 OK, 201 Created, 204 No Content |
| 3xx | Перенаправление | 301 постоянное, 302 временное |
| 4xx | Ошибка клиента | 401 не аутентифицирован, 403 запрещено, 404 нет, 429 лимит |
| 5xx | Ошибка сервера | 500 внутренняя, 502 bad gateway, 503 недоступен |

Различие **401 и 403** важно: 401 — «я не знаю, кто вы», 403 — «знаю, и нет». 403 подтверждает, что ресурс существует, — полезно при перечислении.

## Заголовки с защитным смыслом

```
$ curl -I https://example.com
HTTP/2 200
strict-transport-security: max-age=31536000
content-security-policy: default-src 'self'
x-frame-options: DENY
set-cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
server: nginx/1.18.0
```

- **strict-transport-security** — браузеры обязаны использовать HTTPS впредь
- **content-security-policy** — ограничивает, откуда грузятся скрипты; основная защита от XSS
- **x-frame-options: DENY** — страницу нельзя поместить во фрейм, что блокирует кликджекинг
- **HttpOnly** — JavaScript не читает cookie, поэтому XSS не украдёт сессию
- **Secure** — cookie никогда не уходит по обычному HTTP
- **SameSite=Strict** — cookie не отправляется в межсайтовых запросах, что блокирует CSRF
- **server: nginx/1.18.0** — раскрытие версии; мелочь, но бесплатная информация для атакующего

Отсутствующие заголовки — это находка. `curl -I` по любому сайту — пятисекундный аудит.

## Попробуйте

1. `curl -I https://example.com` — какие защитные заголовки есть, а каких нет?
2. `curl -v https://example.com 2>&1 | grep "^>"` — что curl сообщает о вас?
3. Сравните `curl -s -o /dev/null -w "%{http_code}\n" https://example.com/nope` с реальным путём.""",
        "questions": [
            q("What is the difference between HTTP 401 and 403?",
              "HTTP 401 va 403 orasidagi farq nima?",
              "В чём разница между HTTP 401 и 403?",
              ["401 means unauthenticated; 403 means authenticated but not allowed",
               "401 means the page is missing; 403 means the server failed",
               "They are identical", "401 is a redirect; 403 is a server error"],
              ["401 — autentifikatsiyadan o'tmagan; 403 — o'tgan, lekin ruxsat yo'q",
               "401 — sahifa yo'q; 403 — server xato berdi",
               "Ular bir xil", "401 — qayta yo'naltirish; 403 — server xatosi"],
              ["401 — не аутентифицирован; 403 — аутентифицирован, но нельзя",
               "401 — страницы нет; 403 — сбой сервера",
               "Они одинаковы", "401 — редирект; 403 — ошибка сервера"], 0),
            q("Which cookie flag stops JavaScript from reading a session cookie?",
              "Qaysi cookie bayrog'i JavaScript'ning sessiya cookie'sini o'qishiga to'sqinlik qiladi?",
              "Какой флаг cookie мешает JavaScript прочитать сессионную cookie?",
              ["HttpOnly", "Secure", "SameSite", "Path"],
              ["HttpOnly", "Secure", "SameSite", "Path"],
              ["HttpOnly", "Secure", "SameSite", "Path"], 0),
            q("Which header is the main browser-side defence against XSS?",
              "Brauzer tomonida XSS'ga qarshi asosiy himoya qaysi sarlavha?",
              "Какой заголовок — основная браузерная защита от XSS?",
              ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Server"],
              ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Server"],
              ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Server"], 0),
        ],
    },
    # ---------------------------------------------------------------- 6
    {
        "category": "networking", "points": 70,
        "title": "Routing and the path a packet takes",
        "titleUz": "Marshrutlash va paket bosib o'tadigan yo'l",
        "titleRu": "Маршрутизация и путь пакета",
        "content": r"""When something is unreachable, the question is always the same: how far does the traffic get before it stops? Routing tools answer it precisely instead of by guesswork.

## The routing table

Every machine has one, consulted for every packet:

```
$ ip route
default via 192.0.2.1 dev eth0 proto dhcp metric 100
192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.15
```

Read it as rules, most specific first:

- Destination in `192.0.2.0/24`? Send it straight out `eth0` — the host is on our own segment.
- Anything else? Hand it to `192.0.2.1`, the **default gateway**.

The gateway is your exit. If it is unreachable, nothing outside your subnet works, no matter how healthy the rest of the network is.

Ask which route a specific destination takes:

```
$ ip route get 8.8.8.8
8.8.8.8 via 192.0.2.1 dev eth0 src 192.0.2.15 uid 1000
$ ip route get 192.0.2.20
192.0.2.20 dev eth0 src 192.0.2.15 uid 1000
```

The first goes via the gateway; the second is local. That distinction diagnoses most "I cannot reach it" problems in one command.

## ping — is it alive

```
$ ping -c 3 192.0.2.1
PING 192.0.2.1 (192.0.2.1) 56(84) bytes of data.
64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.42 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=64 time=0.38 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=64 time=0.41 ms

--- 192.0.2.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, rtt min/avg/max = 0.38/0.40/0.42 ms
```

`-c 3` sends three and stops. Without it, `ping` runs forever.

**A host that does not answer ping is not necessarily down.** ICMP is very commonly blocked — Windows blocks it by default, and most firewalls drop it. Concluding "the host is dead" from silence is one of the most common beginner errors. Check a TCP port instead:

```
$ nc -zv 192.0.2.20 443
Connection to 192.0.2.20 443 port [tcp/https] succeeded!
```

Alive, despite ignoring ping.

## TTL, and what it leaks

Notice `ttl=64` above. Every router that forwards a packet decrements TTL by one; at zero the packet is discarded. It exists to stop routing loops.

Because operating systems start from different values, the arriving TTL hints at both the OS and the distance:

| Start TTL | Typical OS |
|---|---|
| 64 | Linux, macOS |
| 128 | Windows |
| 255 | Network equipment |

A reply with `ttl=57` most likely started at 64 and crossed 7 routers.

## traceroute — where it stops

`traceroute` sends packets with TTL 1, then 2, then 3, so each router in turn is forced to report itself:

```
$ traceroute -n example.com
traceroute to example.com (93.184.216.34), 30 hops max, 60 byte packets
 1  192.0.2.1      0.412 ms  0.388 ms  0.401 ms
 2  10.20.0.1      4.221 ms  4.198 ms  4.301 ms
 3  * * *
 4  198.51.100.9  18.442 ms 18.401 ms 18.512 ms
 5  93.184.216.34 24.102 ms 24.088 ms 24.150 ms
```

Line 3 is `* * *` — that hop did not reply. This is usually a router configured not to answer, **not** a broken path: traffic clearly continued to hops 4 and 5. Reading `* * *` as a failure is the second most common beginner error here.

Where the trace stops *permanently* is where your problem is. If every hop after 2 is `* * *`, the trouble is just past hop 2.

## Try it

1. `ip route` — what is your default gateway?
2. `ip route get 8.8.8.8` and `ip route get <a local address>`. Different routes?
3. `traceroute -n 8.8.8.8` — how many hops, and are any of them `* * *`?""",
        "contentUz": r"""Biror narsaga yetib bo'lmasa, savol doim bir xil: trafik to'xtaguncha qay darajaga yetadi? Marshrutlash vositalari bunga taxmin bilan emas, aniq javob beradi.

## Marshrutlash jadvali

Har bir mashinada bor va har bir paket uchun tekshiriladi:

```
$ ip route
default via 192.0.2.1 dev eth0 proto dhcp metric 100
192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.15
```

Uni qoidalar sifatida, eng aniqidan boshlab o'qing:

- Manzil `192.0.2.0/24` ichidami? To'g'ridan-to'g'ri `eth0` orqali yubor — xost o'z segmentimizda.
- Boshqasi? `192.0.2.1` ga, ya'ni **asosiy shlyuz**ga topshir.

Shlyuz — sizning chiqishingiz. Unga yetib bo'lmasa, tarmoqning qolgan qismi qanchalik sog'lom bo'lmasin, quyi tarmog'ingizdan tashqarida hech narsa ishlamaydi.

Aniq manzil qaysi marshrutdan ketishini so'rang:

```
$ ip route get 8.8.8.8
8.8.8.8 via 192.0.2.1 dev eth0 src 192.0.2.15 uid 1000
$ ip route get 192.0.2.20
192.0.2.20 dev eth0 src 192.0.2.15 uid 1000
```

Birinchisi shlyuz orqali ketadi, ikkinchisi mahalliy. Bu farq "yeta olmayapman" muammolarining aksarini bitta buyruqda aniqlaydi.

## ping — tirikmi

```
$ ping -c 3 192.0.2.1
PING 192.0.2.1 (192.0.2.1) 56(84) bytes of data.
64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.42 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=64 time=0.38 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=64 time=0.41 ms

--- 192.0.2.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, rtt min/avg/max = 0.38/0.40/0.42 ms
```

`-c 3` uchta yuborib to'xtaydi. Usiz `ping` cheksiz ishlayveradi.

**Ping'ga javob bermagan xost albatta o'chiq degani emas.** ICMP juda ko'p bloklanadi — Windows uni sukut bo'yicha bloklaydi va aksar ekranlar tashlab yuboradi. Sukunatdan "xost o'lgan" degan xulosa chiqarish — boshlovchilarning eng keng tarqalgan xatolaridan biri. Buning o'rniga TCP portini tekshiring:

```
$ nc -zv 192.0.2.20 443
Connection to 192.0.2.20 443 port [tcp/https] succeeded!
```

Ping'ga e'tibor bermasa ham — tirik.

## TTL va u nimani oshkor qiladi

Yuqorida `ttl=64` ga e'tibor bering. Paketni uzatgan har bir marshrutizator TTL'ni bittaga kamaytiradi; nolga yetganda paket tashlanadi. U marshrutlash halqalarini to'xtatish uchun bor.

Operatsion tizimlar turli qiymatdan boshlagani uchun kelgan TTL ham OT, ham masofani taxmin qilishga imkon beradi:

| Boshlang'ich TTL | Odatdagi OT |
|---|---|
| 64 | Linux, macOS |
| 128 | Windows |
| 255 | Tarmoq uskunasi |

`ttl=57` bilan kelgan javob katta ehtimol 64 dan boshlangan va 7 ta marshrutizatordan o'tgan.

## traceroute — qayerda to'xtaydi

`traceroute` TTL 1, keyin 2, keyin 3 bilan paket yuboradi, shunda har bir marshrutizator navbatma-navbat o'zini bildirishga majbur bo'ladi:

```
$ traceroute -n example.com
traceroute to example.com (93.184.216.34), 30 hops max, 60 byte packets
 1  192.0.2.1      0.412 ms  0.388 ms  0.401 ms
 2  10.20.0.1      4.221 ms  4.198 ms  4.301 ms
 3  * * *
 4  198.51.100.9  18.442 ms 18.401 ms 18.512 ms
 5  93.184.216.34 24.102 ms 24.088 ms 24.150 ms
```

3-satr `* * *` — o'sha sakrash javob bermadi. Bu odatda javob bermaslikka sozlangan marshrutizator, **buzilgan yo'l emas**: trafik 4 va 5-sakrashlarga aniq davom etgan. `* * *` ni nosozlik deb o'qish — bu yerdagi ikkinchi eng keng tarqalgan xato.

Iz *butunlay* to'xtagan joy — muammoingiz shu yerda. Agar 2-dan keyingi har bir sakrash `* * *` bo'lsa, nosozlik 2-sakrashdan sal keyinda.

## Sinab ko'ring

1. `ip route` — asosiy shlyuzingiz qaysi?
2. `ip route get 8.8.8.8` va `ip route get <mahalliy manzil>`. Marshrutlar farq qiladimi?
3. `traceroute -n 8.8.8.8` — nechta sakrash va ular orasida `* * *` bormi?""",
        "contentRu": r"""Когда что-то недоступно, вопрос всегда один: как далеко доходит трафик, прежде чем остановиться? Инструменты маршрутизации отвечают точно, а не на глаз.

## Таблица маршрутизации

Есть на каждой машине и проверяется для каждого пакета:

```
$ ip route
default via 192.0.2.1 dev eth0 proto dhcp metric 100
192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.15
```

Читайте как правила, от самого конкретного:

- Назначение внутри `192.0.2.0/24`? Отправляй прямо в `eth0` — хост в нашем сегменте.
- Всё остальное? Передай на `192.0.2.1`, **шлюз по умолчанию**.

Шлюз — ваш выход. Если он недоступен, за пределами вашей подсети не работает ничего, каким бы здоровым ни был остальной интернет.

Спросите, каким маршрутом пойдёт конкретное назначение:

```
$ ip route get 8.8.8.8
8.8.8.8 via 192.0.2.1 dev eth0 src 192.0.2.15 uid 1000
$ ip route get 192.0.2.20
192.0.2.20 dev eth0 src 192.0.2.15 uid 1000
```

Первый идёт через шлюз, второй локальный. Это различие диагностирует большинство проблем «не достучаться» одной командой.

## ping — жив ли

```
$ ping -c 3 192.0.2.1
PING 192.0.2.1 (192.0.2.1) 56(84) bytes of data.
64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.42 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=64 time=0.38 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=64 time=0.41 ms

--- 192.0.2.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, rtt min/avg/max = 0.38/0.40/0.42 ms
```

`-c 3` отправляет три и останавливается. Без него `ping` работает бесконечно.

**Хост, не отвечающий на ping, не обязательно выключен.** ICMP очень часто блокируют — Windows блокирует по умолчанию, большинство файрволов отбрасывает. Вывод «хост мёртв» из тишины — одна из самых частых ошибок новичка. Проверьте TCP-порт:

```
$ nc -zv 192.0.2.20 443
Connection to 192.0.2.20 443 port [tcp/https] succeeded!
```

Жив, хотя ping игнорирует.

## TTL и что он выдаёт

Обратите внимание на `ttl=64` выше. Каждый маршрутизатор, пересылающий пакет, уменьшает TTL на единицу; на нуле пакет отбрасывается. Он существует, чтобы останавливать петли маршрутизации.

Поскольку операционные системы стартуют с разных значений, пришедший TTL намекает и на ОС, и на расстояние:

| Начальный TTL | Обычно ОС |
|---|---|
| 64 | Linux, macOS |
| 128 | Windows |
| 255 | Сетевое оборудование |

Ответ с `ttl=57` скорее всего начинался с 64 и прошёл 7 маршрутизаторов.

## traceroute — где останавливается

`traceroute` шлёт пакеты с TTL 1, затем 2, затем 3, вынуждая каждый маршрутизатор по очереди назвать себя:

```
$ traceroute -n example.com
traceroute to example.com (93.184.216.34), 30 hops max, 60 byte packets
 1  192.0.2.1      0.412 ms  0.388 ms  0.401 ms
 2  10.20.0.1      4.221 ms  4.198 ms  4.301 ms
 3  * * *
 4  198.51.100.9  18.442 ms 18.401 ms 18.512 ms
 5  93.184.216.34 24.102 ms 24.088 ms 24.150 ms
```

Строка 3 — `* * *`: этот переход не ответил. Обычно это маршрутизатор, настроенный не отвечать, а **не** обрыв: трафик явно дошёл до переходов 4 и 5. Читать `* * *` как сбой — вторая по частоте ошибка новичка здесь.

Место, где трассировка останавливается *насовсем*, — там и проблема. Если каждый переход после 2-го — `* * *`, неполадка сразу за вторым.

## Попробуйте

1. `ip route` — какой у вас шлюз по умолчанию?
2. `ip route get 8.8.8.8` и `ip route get <локальный адрес>`. Маршруты разные?
3. `traceroute -n 8.8.8.8` — сколько переходов и есть ли среди них `* * *`?""",
        "questions": [
            q("A host does not reply to ping. The correct conclusion is:",
              "Xost ping'ga javob bermayapti. To'g'ri xulosa:",
              "Хост не отвечает на ping. Верный вывод:",
              ["It may still be alive; ICMP is often blocked", "The host is definitely down",
               "The network cable is unplugged", "DNS is misconfigured"],
              ["U tirik bo'lishi mumkin; ICMP ko'pincha bloklanadi", "Xost aniq o'chiq",
               "Tarmoq kabeli uzilgan", "DNS noto'g'ri sozlangan"],
              ["Он может быть жив; ICMP часто блокируют", "Хост точно выключен",
               "Сетевой кабель отключён", "DNS настроен неверно"], 0),
            q("A single `* * *` line mid-traceroute, with later hops replying, means:",
              "Traceroute o'rtasida bitta `* * *` satri, keyingi sakrashlar javob bersa, nimani bildiradi:",
              "Одна строка `* * *` в середине traceroute, при отвечающих последующих переходах, означает:",
              ["That router does not reply, but traffic passes through it",
               "The path is broken at that point", "The destination is unreachable",
               "Your gateway has failed"],
              ["O'sha marshrutizator javob bermaydi, lekin trafik undan o'tadi",
               "Yo'l o'sha nuqtada uzilgan", "Manzilga yetib bo'lmaydi",
               "Shlyuzingiz ishdan chiqqan"],
              ["Этот маршрутизатор не отвечает, но трафик через него идёт",
               "Путь оборван в этой точке", "Назначение недостижимо",
               "Ваш шлюз отказал"], 0),
            q("A reply arrives with ttl=57. The sender was most likely:",
              "Javob ttl=57 bilan keldi. Yuboruvchi katta ehtimol:",
              "Ответ пришёл с ttl=57. Отправитель скорее всего:",
              ["A Linux host about 7 routers away", "A Windows host 7 routers away",
               "A host on the same subnet", "Network equipment 198 hops away"],
              ["Taxminan 7 marshrutizator naridagi Linux xost", "7 marshrutizator naridagi Windows xost",
               "Xuddi shu quyi tarmoqdagi xost", "198 sakrash naridagi tarmoq uskunasi"],
              ["Linux-хост примерно в 7 маршрутизаторах", "Windows-хост в 7 маршрутизаторах",
               "Хост в той же подсети", "Сетевое оборудование в 198 переходах"], 0),
        ],
    },
    # ---------------------------------------------------------------- 7
    {
        "category": "networking", "points": 80,
        "title": "Capturing traffic with tcpdump",
        "titleUz": "tcpdump bilan trafikni ushlash",
        "titleRu": "Захват трафика с помощью tcpdump",
        "content": r"""Everything above has been asking the network questions. Capturing is different: you stop asking and simply watch what is really on the wire. It is the ground truth that settles arguments.

## Warning first

Capturing traffic on a network you do not own or have written permission to test is illegal in most jurisdictions, including Uzbekistan. Everything below is for your own machines, your own lab, and engagements you have authorisation for. The commands do not care; the law does.

## The basic capture

```
$ sudo tcpdump -i eth0
```

Root is required, because reading raw frames is a privileged operation.

The flags that make output readable:

```
$ sudo tcpdump -i eth0 -n -c 10
```

- `-i eth0` — which interface (`-i any` for all)
- `-n` — do not resolve names; without it, tcpdump makes DNS lookups that pollute your own capture
- `-c 10` — stop after 10 packets
- `-v`, `-vv` — more header detail
- `-w file.pcap` — write to a file instead of the screen
- `-r file.pcap` — read a file back
- `-A` — show payload as ASCII
- `-X` — show payload as hex and ASCII

## Filters

Without a filter you drown. Filters use BPF syntax:

```
$ sudo tcpdump -i eth0 -n port 80
$ sudo tcpdump -i eth0 -n host 192.0.2.20
$ sudo tcpdump -i eth0 -n src 192.0.2.20
$ sudo tcpdump -i eth0 -n dst port 443
$ sudo tcpdump -i eth0 -n 'port 80 or port 443'
$ sudo tcpdump -i eth0 -n 'host 192.0.2.20 and not port 22'
```

Quote filters containing `or`, `and` or `not`, or the shell will try to interpret them.

## Watching a handshake

```
$ sudo tcpdump -i any -n -c 3 'tcp port 22 and tcp[tcpflags] & tcp-syn != 0'
12:31:04.882 IP 192.0.2.15.51234 > 192.0.2.20.22: Flags [S], seq 1102938, win 64240
12:31:04.884 IP 192.0.2.20.22 > 192.0.2.15.51234: Flags [S.], seq 88123, ack 1102939
```

That filter selects only packets whose SYN flag is set — the connection attempts, without the data.

## Seeing why cleartext protocols are unacceptable

Run a capture and log in to a plain HTTP page or an FTP server:

```
$ sudo tcpdump -i lo -n -A 'port 21'
12:44:19.221 IP 127.0.0.1.51422 > 127.0.0.1.21: Flags [P.]
USER admin
12:44:19.223 IP 127.0.0.1.51422 > 127.0.0.1.21: Flags [P.]
PASS SuperSecret123
```

There it is, in the clear. No exploit, no cleverness — anyone who can see the traffic has the password. Doing this once, yourself, in your own lab, teaches more than any amount of reading about why TLS exists.

Repeat over HTTPS and you will see only `Application Data` — the payload is encrypted, though the addresses and ports still are not.

## Saving for later

```
$ sudo tcpdump -i eth0 -w capture.pcap 'port 80'
^C
$ tcpdump -r capture.pcap -n | head
```

A `.pcap` file opens in Wireshark, which does the same job graphically with far better protocol decoding. The usual workflow is: capture on the server with `tcpdump`, analyse on your laptop with Wireshark.

## Try it

1. `sudo tcpdump -i lo -n -c 5` in one terminal, `curl localhost` in another.
2. Capture with `-A` while sending `curl -d "user=admin&pass=hunter2" http://localhost`. Can you read the credentials?
3. Write 20 packets to a file with `-w`, then read them back with `-r`.""",
        "contentUz": r"""Yuqoridagi hamma narsa tarmoqqa savol berish edi. Ushlash boshqacha: siz so'rashni to'xtatib, simda aslida nima borligini kuzatasiz. Bu — bahsni hal qiladigan haqiqat.

## Avval ogohlantirish

O'zingizga tegishli bo'lmagan yoki sinash uchun yozma ruxsatingiz bo'lmagan tarmoqda trafik ushlash aksar yurisdiksiyalarda, jumladan O'zbekistonda ham noqonuniy. Quyidagilarning hammasi o'z mashinangiz, o'z laboratoriyangiz va vakolat olingan ishlar uchun. Buyruqlarga farqi yo'q, qonunga bor.

## Oddiy ushlash

```
$ sudo tcpdump -i eth0
```

Root kerak, chunki xom freymlarni o'qish imtiyozli amal.

Chiqishni o'qiladigan qiladigan bayroqlar:

```
$ sudo tcpdump -i eth0 -n -c 10
```

- `-i eth0` — qaysi interfeys (`-i any` — hammasi)
- `-n` — nomlarni yechmaslik; usiz tcpdump DNS so'rovlari qilib, o'z yozuvingizni ifloslantiradi
- `-c 10` — 10 paketdan keyin to'xtash
- `-v`, `-vv` — ko'proq sarlavha tafsiloti
- `-w fayl.pcap` — ekranga emas, faylga yozish
- `-r fayl.pcap` — faylni qayta o'qish
- `-A` — foydali yukni ASCII sifatida ko'rsatish
- `-X` — foydali yukni hex va ASCII sifatida ko'rsatish

## Filtrlar

Filtrsiz siz cho'kib ketasiz. Filtrlar BPF sintaksisidan foydalanadi:

```
$ sudo tcpdump -i eth0 -n port 80
$ sudo tcpdump -i eth0 -n host 192.0.2.20
$ sudo tcpdump -i eth0 -n src 192.0.2.20
$ sudo tcpdump -i eth0 -n dst port 443
$ sudo tcpdump -i eth0 -n 'port 80 or port 443'
$ sudo tcpdump -i eth0 -n 'host 192.0.2.20 and not port 22'
```

Tarkibida `or`, `and` yoki `not` bo'lgan filtrlarni qo'shtirnoqqa oling, aks holda shell ularni talqin qilishga urinadi.

## Qo'l berishni kuzatish

```
$ sudo tcpdump -i any -n -c 3 'tcp port 22 and tcp[tcpflags] & tcp-syn != 0'
12:31:04.882 IP 192.0.2.15.51234 > 192.0.2.20.22: Flags [S], seq 1102938, win 64240
12:31:04.884 IP 192.0.2.20.22 > 192.0.2.15.51234: Flags [S.], seq 88123, ack 1102939
```

Bu filtr faqat SYN bayrog'i o'rnatilgan paketlarni tanlaydi — ma'lumotsiz, faqat ulanish urinishlari.

## Ochiq matnli protokollar nega qabul qilinmasligini ko'rish

Ushlashni ishga tushiring va oddiy HTTP sahifa yoki FTP serverga kiring:

```
$ sudo tcpdump -i lo -n -A 'port 21'
12:44:19.221 IP 127.0.0.1.51422 > 127.0.0.1.21: Flags [P.]
USER admin
12:44:19.223 IP 127.0.0.1.51422 > 127.0.0.1.21: Flags [P.]
PASS SuperSecret123
```

Mana, ochiq holda. Hech qanday eksploit, hech qanday hiyla — trafikni ko'ra oladigan har kim parolga ega. Buni o'z laboratoriyangizda bir marta o'zingiz qilib ko'rish TLS nega borligi haqida qancha o'qishdan ham ko'proq o'rgatadi.

Shuni HTTPS orqali takrorlang — faqat `Application Data` ko'rasiz: foydali yuk shifrlangan, garchi manzillar va portlar hamon shifrlanmagan bo'lsa ham.

## Keyinga saqlash

```
$ sudo tcpdump -i eth0 -w capture.pcap 'port 80'
^C
$ tcpdump -r capture.pcap -n | head
```

`.pcap` fayli Wireshark'da ochiladi — u xuddi shu ishni grafik tarzda va ancha yaxshi protokol tahlili bilan bajaradi. Odatiy ish tartibi: serverda `tcpdump` bilan ushlash, noutbukda Wireshark bilan tahlil qilish.

## Sinab ko'ring

1. Bir terminalda `sudo tcpdump -i lo -n -c 5`, boshqasida `curl localhost`.
2. `curl -d "user=admin&pass=hunter2" http://localhost` yuborayotganda `-A` bilan ushlang. Parolni o'qiy olasizmi?
3. `-w` bilan 20 paketni faylga yozing, keyin `-r` bilan qayta o'qing.""",
        "contentRu": r"""Всё выше было вопросами к сети. Захват — другое: вы перестаёте спрашивать и просто смотрите, что реально идёт по проводу. Это факт, который решает споры.

## Сначала предупреждение

Захват трафика в сети, которая вам не принадлежит и на тестирование которой нет письменного разрешения, незаконен в большинстве юрисдикций, включая Узбекистан. Всё ниже — для ваших машин, вашей лаборатории и работ, на которые есть авторизация. Командам всё равно; закону — нет.

## Базовый захват

```
$ sudo tcpdump -i eth0
```

Нужен root, потому что чтение сырых кадров — привилегированная операция.

Флаги, делающие вывод читаемым:

```
$ sudo tcpdump -i eth0 -n -c 10
```

- `-i eth0` — какой интерфейс (`-i any` — все)
- `-n` — не резолвить имена; без него tcpdump делает DNS-запросы и загрязняет ваш же захват
- `-c 10` — остановиться после 10 пакетов
- `-v`, `-vv` — больше деталей заголовков
- `-w файл.pcap` — писать в файл, а не на экран
- `-r файл.pcap` — прочитать файл обратно
- `-A` — показать нагрузку как ASCII
- `-X` — показать нагрузку как hex и ASCII

## Фильтры

Без фильтра вы утонете. Фильтры используют синтаксис BPF:

```
$ sudo tcpdump -i eth0 -n port 80
$ sudo tcpdump -i eth0 -n host 192.0.2.20
$ sudo tcpdump -i eth0 -n src 192.0.2.20
$ sudo tcpdump -i eth0 -n dst port 443
$ sudo tcpdump -i eth0 -n 'port 80 or port 443'
$ sudo tcpdump -i eth0 -n 'host 192.0.2.20 and not port 22'
```

Фильтры с `or`, `and` или `not` берите в кавычки, иначе оболочка попробует их истолковать.

## Наблюдаем рукопожатие

```
$ sudo tcpdump -i any -n -c 3 'tcp port 22 and tcp[tcpflags] & tcp-syn != 0'
12:31:04.882 IP 192.0.2.15.51234 > 192.0.2.20.22: Flags [S], seq 1102938, win 64240
12:31:04.884 IP 192.0.2.20.22 > 192.0.2.15.51234: Flags [S.], seq 88123, ack 1102939
```

Этот фильтр выбирает только пакеты с выставленным флагом SYN — попытки соединения, без данных.

## Почему протоколы открытым текстом недопустимы

Запустите захват и войдите на обычную HTTP-страницу или FTP-сервер:

```
$ sudo tcpdump -i lo -n -A 'port 21'
12:44:19.221 IP 127.0.0.1.51422 > 127.0.0.1.21: Flags [P.]
USER admin
12:44:19.223 IP 127.0.0.1.51422 > 127.0.0.1.21: Flags [P.]
PASS SuperSecret123
```

Вот он, открытым текстом. Ни эксплойта, ни хитрости — у любого, кто видит трафик, есть пароль. Сделать это один раз самому, в своей лаборатории, учит больше, чем сколько угодно чтения о том, зачем нужен TLS.

Повторите по HTTPS — увидите только `Application Data`: нагрузка зашифрована, хотя адреса и порты по-прежнему нет.

## Сохранить на потом

```
$ sudo tcpdump -i eth0 -w capture.pcap 'port 80'
^C
$ tcpdump -r capture.pcap -n | head
```

Файл `.pcap` открывается в Wireshark, который делает то же самое графически и гораздо лучше разбирает протоколы. Обычный порядок: захват на сервере через `tcpdump`, анализ на ноутбуке в Wireshark.

## Попробуйте

1. `sudo tcpdump -i lo -n -c 5` в одном терминале, `curl localhost` в другом.
2. Захватите с `-A`, отправляя `curl -d "user=admin&pass=hunter2" http://localhost`. Читаются ли учётные данные?
3. Запишите 20 пакетов в файл через `-w`, затем прочитайте через `-r`.""",
        "questions": [
            q("Why is `-n` recommended when running tcpdump?",
              "tcpdump ishlatganda nega `-n` tavsiya etiladi?",
              "Почему при запуске tcpdump рекомендуют `-n`?",
              ["It stops tcpdump making DNS lookups that pollute the capture",
               "It captures more packets", "It is required for filters to work",
               "It encrypts the output file"],
              ["U tcpdump'ning yozuvni ifloslantiradigan DNS so'rovlari qilishini to'xtatadi",
               "U ko'proq paket ushlaydi", "Filtrlar ishlashi uchun shart",
               "U chiqish faylini shifrlaydi"],
              ["Он не даёт tcpdump делать DNS-запросы, загрязняющие захват",
               "Он захватывает больше пакетов", "Без него не работают фильтры",
               "Он шифрует выходной файл"], 0),
            q("Why must tcpdump run as root?",
              "Nega tcpdump root sifatida ishlashi kerak?",
              "Почему tcpdump должен запускаться от root?",
              ["Reading raw frames from an interface is privileged", "It writes to /etc",
               "It needs to open port 80", "It does not — any user can run it"],
              ["Interfeysdan xom freymlarni o'qish imtiyozli amal", "U /etc ga yozadi",
               "Unga 80-portni ochish kerak", "Kerak emas — har qanday foydalanuvchi ishlata oladi"],
              ["Чтение сырых кадров с интерфейса привилегированно", "Он пишет в /etc",
               "Ему нужно открыть порт 80", "Не должен — запустить может любой"], 0),
            q("Capturing an HTTPS session, what remains visible to an observer?",
              "HTTPS sessiyasini ushlaganda kuzatuvchiga nima ko'rinadi?",
              "При захвате HTTPS-сессии что остаётся видно наблюдателю?",
              ["The addresses and ports, but not the payload", "Nothing at all",
               "The full request including passwords", "Only the password fields"],
              ["Manzillar va portlar, lekin foydali yuk emas", "Umuman hech narsa",
               "Parollar bilan birga to'liq so'rov", "Faqat parol maydonlari"],
              ["Адреса и порты, но не полезная нагрузка", "Совсем ничего",
               "Полный запрос вместе с паролями", "Только поля паролей"], 0),
        ],
    },
    # ---------------------------------------------------------------- 8
    {
        "category": "networking", "points": 80,
        "title": "TLS and certificates: what encryption in transit actually proves",
        "titleUz": "TLS va sertifikatlar: uzatishdagi shifrlash aslida nimani isbotlaydi",
        "titleRu": "TLS и сертификаты: что на самом деле доказывает шифрование в канале",
        "content": r"""The previous lesson showed a password travelling in the clear. TLS is the answer, and it does three separate jobs. Confusing them is where most misunderstandings start.

TLS provides:

1. **Confidentiality** — an observer cannot read the traffic
2. **Integrity** — an observer cannot alter it undetected
3. **Authentication** — you are talking to who you think you are

The third is the one people forget, and it is the one certificates exist for. Encryption alone protects you from eavesdroppers but not from *impersonation* — an attacker who terminates your TLS connection reads everything.

## The handshake, briefly

```
client → server   ClientHello    supported versions and ciphers
client ← server   ServerHello    chosen cipher
client ← server   Certificate    the server's public key, signed by a CA
client ↔ server   key exchange   derive a shared session key
client ↔ server   Finished       encrypted from here on
```

The certificate is checked before any data is sent: is it signed by a CA the client trusts, is it still valid, and does the name match the host being visited?

## Inspecting a certificate

```
$ openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
subject=C=US, ST=California, L=Los Angeles, O=Internet Corporation for Assigned Names and Numbers, CN=www.example.org
issuer=C=US, O=DigiCert Inc, CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1
notBefore=Jan 30 00:00:00 2024 GMT
notAfter=Mar  1 23:59:59 2025 GMT
```

- **subject** — who the certificate is for
- **issuer** — which CA signed it
- **notBefore / notAfter** — its validity window

`-servername` sends SNI, which matters because one IP commonly hosts many sites; without it you may be shown the wrong certificate entirely.

## The names it covers

```
$ openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
X509v3 Subject Alternative Name:
    DNS:www.example.org, DNS:example.com, DNS:example.net
```

The Subject Alternative Name list is what browsers actually check. Certificate transparency logs (crt.sh) are searchable, and SAN entries there routinely reveal subdomains an organisation never advertised — one of the most productive passive reconnaissance techniques there is.

## What a warning really means

```
$ curl https://self-signed.local
curl: (60) SSL certificate problem: self signed certificate
```

The traffic here is still encrypted. What failed is *authentication* — nothing vouches for who is on the other end. `curl -k` and clicking through a browser warning both mean "I accept that I cannot verify who this is", which is exactly the condition a machine-in-the-middle attack needs.

Common causes: an expired certificate, a name mismatch (certificate for `www.site.com`, visited as `site.com`), a self-signed certificate, or an untrusted internal CA.

## Checking expiry, which is what actually breaks

```
$ echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -checkend 604800
Certificate will not expire
```

`-checkend 604800` asks "will this expire within 7 days?" — one line, scriptable, and it prevents the outage that certificate expiry otherwise causes on a weekend.

## Testing protocol versions

```
$ openssl s_client -connect example.com:443 -tls1_1 < /dev/null
CONNECTED(00000003)
...:SSL alert number 70
```

Refusal is correct: TLS 1.0 and 1.1 are deprecated and known-weak. A server that *accepts* them is a finding. TLS 1.2 is acceptable, TLS 1.3 is current.

## Try it

1. Pull the subject, issuer and dates for a site you use.
2. `openssl x509 -noout -ext subjectAltName` on it — any subdomains you did not expect?
3. `-checkend 604800` — how close is it to expiry?""",
        "contentUz": r"""Oldingi dars parolning ochiq holda ketishini ko'rsatdi. TLS — bunga javob va u uchta alohida ishni bajaradi. Ularni chalkashtirish — tushunmovchiliklarning aksari shundan boshlanadi.

TLS quyidagilarni beradi:

1. **Maxfiylik** — kuzatuvchi trafikni o'qiy olmaydi
2. **Yaxlitlik** — kuzatuvchi uni sezdirmay o'zgartira olmaydi
3. **Autentifikatsiya** — siz o'zingiz o'ylagan tomon bilan gaplashyapsiz

Uchinchisini odamlar unutadi, sertifikatlar esa aynan shuning uchun bor. Yolg'iz shifrlash sizni tinglovchilardan himoya qiladi, lekin *o'zini boshqa qilib ko'rsatish*dan emas — TLS ulanishingizni o'zida tugatgan hujumchi hammasini o'qiydi.

## Qo'l berish, qisqacha

```
mijoz → server   ClientHello    qo'llab-quvvatlanadigan versiyalar va shifrlar
mijoz ← server   ServerHello    tanlangan shifr
mijoz ← server   Certificate    serverning ochiq kaliti, CA tomonidan imzolangan
mijoz ↔ server   kalit almashuvi  umumiy sessiya kalitini hosil qilish
mijoz ↔ server   Finished       bundan keyin shifrlangan
```

Sertifikat hech qanday ma'lumot yuborilishidan oldin tekshiriladi: uni mijoz ishonadigan CA imzolaganmi, hali amal qiladimi va nomi tashrif buyurilayotgan xostga mos keladimi?

## Sertifikatni ko'rish

```
$ openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
subject=C=US, ST=California, L=Los Angeles, O=Internet Corporation for Assigned Names and Numbers, CN=www.example.org
issuer=C=US, O=DigiCert Inc, CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1
notBefore=Jan 30 00:00:00 2024 GMT
notAfter=Mar  1 23:59:59 2025 GMT
```

- **subject** — sertifikat kim uchun
- **issuer** — uni qaysi CA imzolagan
- **notBefore / notAfter** — amal qilish oynasi

`-servername` SNI yuboradi, bu muhim: bitta IP odatda ko'p saytni joylashtiradi; usiz sizga umuman noto'g'ri sertifikat ko'rsatilishi mumkin.

## U qamragan nomlar

```
$ openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
X509v3 Subject Alternative Name:
    DNS:www.example.org, DNS:example.com, DNS:example.net
```

Brauzerlar aslida Subject Alternative Name ro'yxatini tekshiradi. Sertifikat shaffofligi loglari (crt.sh) qidiriladi va u yerdagi SAN yozuvlari tashkilot hech qachon e'lon qilmagan subdomenlarni muntazam oshkor qiladi — bu mavjud eng samarali passiv razvedka usullaridan biri.

## Ogohlantirish aslida nimani bildiradi

```
$ curl https://self-signed.local
curl: (60) SSL certificate problem: self signed certificate
```

Bu yerda trafik hamon shifrlangan. Muvaffaqiyatsiz bo'lgani — *autentifikatsiya*: narigi tomonda kim borligiga hech narsa kafolat bermayapti. `curl -k` ham, brauzer ogohlantirishini bosib o'tish ham "bu kimligini tekshira olmasligimni qabul qilaman" degani — bu esa aynan o'rtadagi mashina hujumiga kerak bo'lgan shart.

Keng tarqalgan sabablar: muddati o'tgan sertifikat, nom mos kelmasligi (sertifikat `www.site.com` uchun, tashrif `site.com` ga), o'z-o'zini imzolagan sertifikat yoki ishonilmagan ichki CA.

## Muddatni tekshirish — aslida shu narsa buzadi

```
$ echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -checkend 604800
Certificate will not expire
```

`-checkend 604800` "bu 7 kun ichida tugaydimi?" deb so'raydi — bir satr, skriptga soladigan, va sertifikat muddati aks holda dam olish kunida keltirib chiqaradigan uzilishning oldini oladi.

## Protokol versiyalarini sinash

```
$ openssl s_client -connect example.com:443 -tls1_1 < /dev/null
CONNECTED(00000003)
...:SSL alert number 70
```

Rad etish — to'g'ri: TLS 1.0 va 1.1 eskirgan va zaifligi ma'lum. Ularni *qabul qiladigan* server — bu topilma. TLS 1.2 maqbul, TLS 1.3 esa joriy.

## Sinab ko'ring

1. O'zingiz ishlatadigan saytning subject, issuer va sanalarini oling.
2. Unga `openssl x509 -noout -ext subjectAltName` — kutilmagan subdomenlar bormi?
3. `-checkend 604800` — muddati tugashiga qancha qoldi?""",
        "contentRu": r"""Прошлый урок показал пароль, идущий открытым текстом. TLS — ответ на это, и он делает три разные работы. Их смешение — источник большинства недоразумений.

TLS даёт:

1. **Конфиденциальность** — наблюдатель не прочитает трафик
2. **Целостность** — наблюдатель не изменит его незаметно
3. **Аутентификацию** — вы говорите с тем, с кем думаете

О третьей забывают, а сертификаты существуют именно ради неё. Одно лишь шифрование защищает от подслушивания, но не от *подмены*: атакующий, терминирующий ваше TLS-соединение, читает всё.

## Рукопожатие кратко

```
клиент → сервер   ClientHello    поддерживаемые версии и шифры
клиент ← сервер   ServerHello    выбранный шифр
клиент ← сервер   Certificate    открытый ключ сервера, подписанный CA
клиент ↔ сервер   обмен ключами  выработка общего сеансового ключа
клиент ↔ сервер   Finished       дальше всё зашифровано
```

Сертификат проверяется до отправки любых данных: подписан ли он доверенным CA, действует ли ещё и совпадает ли имя с посещаемым хостом?

## Осмотр сертификата

```
$ openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
subject=C=US, ST=California, L=Los Angeles, O=Internet Corporation for Assigned Names and Numbers, CN=www.example.org
issuer=C=US, O=DigiCert Inc, CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1
notBefore=Jan 30 00:00:00 2024 GMT
notAfter=Mar  1 23:59:59 2025 GMT
```

- **subject** — для кого сертификат
- **issuer** — какой CA его подписал
- **notBefore / notAfter** — окно действия

`-servername` отправляет SNI, и это важно: на одном IP обычно живёт много сайтов; без него вам могут показать совсем не тот сертификат.

## Какие имена он покрывает

```
$ openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
X509v3 Subject Alternative Name:
    DNS:www.example.org, DNS:example.com, DNS:example.net
```

Браузеры проверяют именно список Subject Alternative Name. Логи прозрачности сертификатов (crt.sh) доступны для поиска, и записи SAN там регулярно выдают поддомены, которые организация нигде не публиковала, — одна из самых результативных техник пассивной разведки.

## Что на самом деле означает предупреждение

```
$ curl https://self-signed.local
curl: (60) SSL certificate problem: self signed certificate
```

Трафик здесь по-прежнему зашифрован. Провалилась *аутентификация* — никто не ручается, кто на том конце. И `curl -k`, и клик по предупреждению браузера означают «я принимаю, что не могу проверить, кто это», а это ровно то условие, которое нужно атаке «машина посередине».

Частые причины: истёкший сертификат, несовпадение имени (сертификат на `www.site.com`, заходят на `site.com`), самоподписанный сертификат или недоверенный внутренний CA.

## Проверка истечения — то, что реально ломается

```
$ echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -checkend 604800
Certificate will not expire
```

`-checkend 604800` спрашивает «истечёт ли в ближайшие 7 дней?» — одна строка, пригодная для скрипта, предотвращающая простой, который иначе случится в выходные.

## Проверка версий протокола

```
$ openssl s_client -connect example.com:443 -tls1_1 < /dev/null
CONNECTED(00000003)
...:SSL alert number 70
```

Отказ — это правильно: TLS 1.0 и 1.1 устарели и заведомо слабы. Сервер, который их *принимает*, — это находка. TLS 1.2 приемлем, TLS 1.3 актуален.

## Попробуйте

1. Достаньте subject, issuer и даты для сайта, которым пользуетесь.
2. Примените к нему `openssl x509 -noout -ext subjectAltName` — есть ли неожиданные поддомены?
3. `-checkend 604800` — насколько близко истечение?""",
        "questions": [
            q("A browser shows a certificate warning. What has actually failed?",
              "Brauzer sertifikat ogohlantirishini ko'rsatdi. Aslida nima muvaffaqiyatsiz bo'ldi?",
              "Браузер показывает предупреждение о сертификате. Что на самом деле не удалось?",
              ["Authentication — the traffic is still encrypted", "Encryption — the traffic is in cleartext",
               "Integrity — the data was altered", "All three properties at once"],
              ["Autentifikatsiya — trafik hamon shifrlangan", "Shifrlash — trafik ochiq matnda",
               "Yaxlitlik — ma'lumot o'zgartirilgan", "Uchala xossa birdan"],
              ["Аутентификация — трафик всё ещё зашифрован", "Шифрование — трафик открытым текстом",
               "Целостность — данные изменены", "Все три свойства сразу"], 0),
            q("Why does `-servername` matter when inspecting a certificate?",
              "Sertifikatni tekshirishda `-servername` nega muhim?",
              "Почему `-servername` важен при осмотре сертификата?",
              ["It sends SNI, so the right certificate is returned when one IP hosts many sites",
               "It encrypts the connection", "It bypasses certificate validation",
               "It selects the TLS version"],
              ["U SNI yuboradi, shunda bitta IP ko'p sayt joylashtirganda to'g'ri sertifikat qaytadi",
               "U ulanishni shifrlaydi", "U sertifikat tekshiruvini chetlab o'tadi",
               "U TLS versiyasini tanlaydi"],
              ["Он отправляет SNI, чтобы вернулся нужный сертификат, когда на одном IP много сайтов",
               "Он шифрует соединение", "Он обходит проверку сертификата",
               "Он выбирает версию TLS"], 0),
            q("A server accepts a TLS 1.1 connection. This is:",
              "Server TLS 1.1 ulanishini qabul qildi. Bu:",
              "Сервер принимает соединение по TLS 1.1. Это:",
              ["A finding — TLS 1.0 and 1.1 are deprecated and weak", "Correct and secure behaviour",
               "Required for compatibility with TLS 1.3", "Only a problem for internal servers"],
              ["Topilma — TLS 1.0 va 1.1 eskirgan va zaif", "To'g'ri va xavfsiz xatti-harakat",
               "TLS 1.3 bilan moslik uchun shart", "Faqat ichki serverlar uchun muammo"],
              ["Находка — TLS 1.0 и 1.1 устарели и слабы", "Правильное и безопасное поведение",
               "Необходимо для совместимости с TLS 1.3", "Проблема только для внутренних серверов"], 0),
        ],
    },
]


MODULE = {
    "slug": "networking-for-security",
    "category": "networking",
    "title": "Networking for Security",
    "titleUz": "Xavfsizlik uchun tarmoqlar",
    "titleRu": "Сети для безопасности",
    "description": (
        "How traffic actually moves, for people who need to intercept, scan and defend it. "
        "Addressing and subnets, the layers a packet is built from, ports and what is listening, DNS as "
        "reconnaissance, HTTP by hand with curl, routing and traceroute, capturing with tcpdump, and what "
        "TLS certificates really prove. You will watch a password cross the wire in cleartext, once, deliberately."
    ),
    "descriptionUz": (
        "Trafik aslida qanday harakatlanadi — uni ushlash, skanerlash va himoya qilish kerak bo'lganlar uchun. "
        "Manzillash va quyi tarmoqlar, paket tuzilgan qatlamlar, portlar va nima tinglayotgani, razvedka sifatida DNS, "
        "curl bilan qo'lda HTTP, marshrutlash va traceroute, tcpdump bilan ushlash, va TLS sertifikatlari aslida nimani "
        "isbotlashi. Siz parolning ochiq holda sim orqali o'tishini bir marta, ataylab kuzatasiz."
    ),
    "descriptionRu": (
        "Как на самом деле движется трафик — для тех, кому его перехватывать, сканировать и защищать. "
        "Адресация и подсети, уровни, из которых собран пакет, порты и что слушает, DNS как разведка, "
        "HTTP вручную через curl, маршрутизация и traceroute, захват через tcpdump и то, что реально доказывают "
        "TLS-сертификаты. Вы один раз намеренно увидите, как пароль идёт по проводу открытым текстом."
    ),
    "difficulty": "beginner",
    "estimatedHours": 40,
    "passScore": 80,
    "orderIndex": 1,
    "exam": [
        q("How many usable host addresses are in a /26 subnet?",
          "/26 quyi tarmoqda nechta ishlatiladigan xost manzili bor?",
          "Сколько пригодных адресов хостов в подсети /26?",
          ["62", "64", "126", "30"], ["62", "64", "126", "30"], ["62", "64", "126", "30"], 0),
        q("Which range is NOT private under RFC 1918?",
          "Qaysi diapazon RFC 1918 bo'yicha xususiy EMAS?",
          "Какой диапазон НЕ является приватным по RFC 1918?",
          ["172.32.0.0/12", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
          ["172.32.0.0/12", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
          ["172.32.0.0/12", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"], 0),
        q("In which order does the TCP handshake occur?",
          "TCP qo'l berishi qanday tartibda bo'ladi?",
          "В каком порядке идёт TCP-рукопожатие?",
          ["SYN, SYN-ACK, ACK", "SYN, ACK, SYN-ACK", "ACK, SYN, FIN", "SYN, FIN, ACK"],
          ["SYN, SYN-ACK, ACK", "SYN, ACK, SYN-ACK", "ACK, SYN, FIN", "SYN, FIN, ACK"],
          ["SYN, SYN-ACK, ACK", "SYN, ACK, SYN-ACK", "ACK, SYN, FIN", "SYN, FIN, ACK"], 0),
        q("A scanned port returns nothing at all. It is best described as:",
          "Skanerlangan port umuman hech narsa qaytarmadi. Buni qanday ta'riflash to'g'ri:",
          "Сканируемый порт не вернул ничего. Как это лучше описать:",
          ["Filtered — something dropped the packet silently", "Closed — a service refused",
           "Open — a service accepted", "Open but rate-limited"],
          ["Filtrlangan — kimdir paketni sassiz tashlab yubordi", "Yopiq — xizmat rad etdi",
           "Ochiq — xizmat qabul qildi", "Ochiq, lekin limitlangan"],
          ["Фильтруется — пакет молча отброшен", "Закрыт — служба отказала",
           "Открыт — служба приняла", "Открыт, но с лимитом"], 0),
        q("A service listening on 0.0.0.0:3306 is:",
          "0.0.0.0:3306 da tinglayotgan xizmat:",
          "Служба, слушающая на 0.0.0.0:3306:",
          ["Reachable from the network on every interface", "Reachable only from the machine itself",
           "Reachable only over IPv6", "Not reachable at all"],
          ["Tarmoqdan barcha interfeyslarda yetiladi", "Faqat mashinaning o'zidan yetiladi",
           "Faqat IPv6 orqali yetiladi", "Umuman yetib bo'lmaydi"],
          ["Доступна из сети на всех интерфейсах", "Доступна только с самой машины",
           "Доступна только по IPv6", "Недоступна вообще"], 0),
        q("Which DNS record type would reveal who controls a zone?",
          "Zonani kim boshqarishini qaysi DNS yozuv turi ko'rsatadi?",
          "Какой тип DNS-записи показывает, кто управляет зоной?",
          ["NS", "MX", "TXT", "A"], ["NS", "MX", "TXT", "A"], ["NS", "MX", "TXT", "A"], 0),
        q("What does a successful zone transfer (AXFR) give an attacker?",
          "Muvaffaqiyatli zona uzatish (AXFR) hujumchiga nima beradi?",
          "Что даёт атакующему успешный трансфер зоны (AXFR)?",
          ["Every DNS record in the zone at once", "The zone's private signing key",
           "Administrative access to the server", "The contents of /etc/passwd"],
          ["Zonadagi barcha DNS yozuvlarini birdan", "Zonaning maxfiy imzolash kalitini",
           "Serverga administrativ kirishni", "/etc/passwd mazmunini"],
          ["Все DNS-записи зоны разом", "Приватный ключ подписи зоны",
           "Административный доступ к серверу", "Содержимое /etc/passwd"], 0),
        q("HTTP 403 rather than 404 tells an attacker that:",
          "404 emas, HTTP 403 hujumchiga nimani aytadi:",
          "HTTP 403 вместо 404 говорит атакующему, что:",
          ["The resource exists but access is denied", "The resource does not exist",
           "The server has crashed", "Authentication succeeded"],
          ["Resurs mavjud, lekin kirish rad etilgan", "Resurs mavjud emas",
           "Server ishdan chiqqan", "Autentifikatsiya muvaffaqiyatli o'tdi"],
          ["Ресурс существует, но доступ запрещён", "Ресурса не существует",
           "Сервер упал", "Аутентификация прошла успешно"], 0),
        q("Which cookie attribute blocks the cookie from cross-site requests, mitigating CSRF?",
          "Qaysi cookie atributi cookie'ni saytlararo so'rovlardan bloklab, CSRF'ni yumshatadi?",
          "Какой атрибут cookie блокирует её в межсайтовых запросах, смягчая CSRF?",
          ["SameSite", "HttpOnly", "Secure", "Domain"],
          ["SameSite", "HttpOnly", "Secure", "Domain"],
          ["SameSite", "HttpOnly", "Secure", "Domain"], 0),
        q("Your machine cannot reach anything outside its subnet, but local hosts respond. Check first:",
          "Mashinangiz quyi tarmoqdan tashqaridagi hech narsaga yeta olmayapti, lekin mahalliy xostlar javob beryapti. Avval nimani tekshirasiz:",
          "Машина не достаёт ничего за пределами подсети, но локальные хосты отвечают. Проверить первым:",
          ["The default gateway in `ip route`", "The DNS server in /etc/resolv.conf",
           "The MAC address of the interface", "The TTL of outgoing packets"],
          ["`ip route` dagi asosiy shlyuzni", "/etc/resolv.conf dagi DNS serverni",
           "Interfeysning MAC manzilini", "Chiquvchi paketlar TTL'ini"],
          ["Шлюз по умолчанию в `ip route`", "DNS-сервер в /etc/resolv.conf",
           "MAC-адрес интерфейса", "TTL исходящих пакетов"], 0),
        q("A packet arrives with ttl=125. The sender is most likely:",
          "Paket ttl=125 bilan keldi. Yuboruvchi katta ehtimol:",
          "Пакет пришёл с ttl=125. Отправитель скорее всего:",
          ["A Windows host a few hops away", "A Linux host a few hops away",
           "A router on the same segment", "A host 125 hops away"],
          ["Bir necha sakrash naridagi Windows xost", "Bir necha sakrash naridagi Linux xost",
           "Xuddi shu segmentdagi marshrutizator", "125 sakrash naridagi xost"],
          ["Windows-хост в нескольких переходах", "Linux-хост в нескольких переходах",
           "Маршрутизатор в том же сегменте", "Хост в 125 переходах"], 0),
        q("Why is `-n` used with tcpdump?",
          "tcpdump bilan `-n` nega ishlatiladi?",
          "Зачем используется `-n` с tcpdump?",
          ["To avoid DNS lookups that pollute the capture", "To capture more packets per second",
           "To write output in numeric binary", "To require root privileges"],
          ["Yozuvni ifloslantiradigan DNS so'rovlaridan qochish uchun", "Sekundiga ko'proq paket ushlash uchun",
           "Chiqishni raqamli ikkilikda yozish uchun", "Root imtiyozini talab qilish uchun"],
          ["Чтобы избежать DNS-запросов, загрязняющих захват", "Чтобы захватывать больше пакетов в секунду",
           "Чтобы писать вывод в двоичном виде", "Чтобы требовать права root"], 0),
        q("The three properties TLS provides are:",
          "TLS beradigan uchta xossa:",
          "Три свойства, которые даёт TLS:",
          ["Confidentiality, integrity, authentication", "Confidentiality, availability, speed",
           "Authentication, compression, routing", "Integrity, anonymity, availability"],
          ["Maxfiylik, yaxlitlik, autentifikatsiya", "Maxfiylik, mavjudlik, tezlik",
           "Autentifikatsiya, siqish, marshrutlash", "Yaxlitlik, anonimlik, mavjudlik"],
          ["Конфиденциальность, целостность, аутентификация", "Конфиденциальность, доступность, скорость",
           "Аутентификация, сжатие, маршрутизация", "Целостность, анонимность, доступность"], 0),
        q("Passing `curl -k` to skip a certificate error means you accept:",
          "Sertifikat xatosini o'tkazib yuborish uchun `curl -k` berish nimani qabul qilish demak:",
          "Передавая `curl -k`, чтобы пропустить ошибку сертификата, вы принимаете:",
          ["That you cannot verify who is on the other end", "That the traffic is unencrypted",
           "That the server is definitely malicious", "That the connection uses TLS 1.0"],
          ["Narigi tomonda kim ekanini tekshira olmasligingizni", "Trafik shifrlanmaganini",
           "Server aniq zararli ekanini", "Ulanish TLS 1.0 ishlatishini"],
          ["Что вы не можете проверить, кто на том конце", "Что трафик не зашифрован",
           "Что сервер точно вредоносный", "Что соединение использует TLS 1.0"], 0),
        q("Certificate transparency logs are useful in reconnaissance because they:",
          "Sertifikat shaffofligi loglari razvedkada foydali, chunki ular:",
          "Логи прозрачности сертификатов полезны в разведке, потому что они:",
          ["Reveal subdomains via Subject Alternative Name entries", "Contain servers' private keys",
           "List every password a site has stored", "Show which ports are open"],
          ["Subject Alternative Name yozuvlari orqali subdomenlarni oshkor qiladi", "Serverlarning maxfiy kalitlarini saqlaydi",
           "Sayt saqlagan har bir parolni sanaydi", "Qaysi portlar ochiqligini ko'rsatadi"],
          ["Раскрывают поддомены через записи Subject Alternative Name", "Содержат приватные ключи серверов",
           "Перечисляют все сохранённые сайтом пароли", "Показывают, какие порты открыты"], 0),
    ],
}
