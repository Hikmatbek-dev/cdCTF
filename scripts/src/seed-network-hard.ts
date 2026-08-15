import { Pool } from "pg";

const NETWORK_LESSONS: Record<string, any[]> = {
  "IP addresses and ports": [
    {
      q: "Which IPv4 address class is typically reserved for large enterprise networks requiring millions of hosts?",
      quz: "Odatda millionlab xostlarni talab qiladigan yirik korporativ tarmoqlar uchun qaysi IPv4 manzil sinfi ajratilgan?",
      qru: "Какой класс IPv4-адресов обычно резервируется для крупных корпоративных сетей, требующих миллионы хостов?",
      options: ["Class A", "Class B", "Class C", "Class D"],
      optionsuz: ["A sinfi", "B sinfi", "C sinfi", "D sinfi"],
      optionsru: ["Класс A", "Класс B", "Класс C", "Класс D"],
      correct: 0
    },
    {
      q: "What is the primary difference between a well-known port and a dynamic/private port?",
      quz: "Taniqli port (well-known port) va dinamik/xususiy port o'rtasidagi asosiy farq nima?",
      qru: "В чем основное отличие хорошо известного порта от динамического/частного порта?",
      options: ["Well-known ports (0-1023) require root privileges, dynamic ports (49152-65535) are for client connections.", "Dynamic ports are only used for UDP, well-known for TCP.", "Well-known ports are randomly assigned by the OS.", "There is no difference, ports are universally identical."],
      optionsuz: ["Taniqli portlar (0-1023) root huquqlarini talab qiladi, dinamik portlar (49152-65535) mijoz ulanishlari uchundir.", "Dinamik portlar faqat UDP uchun, taniqli portlar TCP uchun ishlatiladi.", "Taniqli portlar OT tomonidan tasodifiy ajratiladi.", "Farqi yo'q, portlar hamma joyda bir xil."],
      optionsru: ["Общеизвестные порты (0-1023) требуют прав root, динамические порты (49152-65535) предназначены для клиентских подключений.", "Динамические порты используются только для UDP, общеизвестные для TCP.", "Общеизвестные порты назначаются ОС случайным образом.", "Разницы нет, порты везде одинаковы."],
      correct: 0
    },
    {
      q: "Which of the following IP addresses represents a non-routable loopback address in IPv6?",
      quz: "Quyidagi IP manzillardan qaysi biri IPv6 da marshrutlanmaydigan loopback manzilini ifodalaydi?",
      qru: "Какой из следующих IP-адресов представляет немаршрутизируемый loopback-адрес в IPv6?",
      options: ["::1", "127.0.0.1", "fe80::1", "::ffff:127.0.0.1"],
      optionsuz: ["::1", "127.0.0.1", "fe80::1", "::ffff:127.0.0.1"],
      optionsru: ["::1", "127.0.0.1", "fe80::1", "::ffff:127.0.0.1"],
      correct: 0
    },
    {
      q: "In NAT (Network Address Translation), what does PAT (Port Address Translation) specifically achieve?",
      quz: "NAT (Network Address Translation) da PAT (Port Address Translation) aniq nimaga erishadi?",
      qru: "В NAT (Network Address Translation) что именно обеспечивает PAT (Port Address Translation)?",
      options: ["Maps multiple private IPs to a single public IP using different source ports.", "Encrypts the port number to hide traffic type.", "Converts IPv4 addresses to IPv6 addresses.", "Blocks unauthorized incoming ports automatically."],
      optionsuz: ["Turli xil manba portlaridan foydalanib, bir nechta xususiy IP-larni bitta ommaviy IP-ga xaritaga tushiradi.", "Trafik turini yashirish uchun port raqamini shifrlaydi.", "IPv4 manzillarini IPv6 manzillariga aylantiradi.", "Ruxsatsiz kirish portlarini avtomatik ravishda bloklaydi."],
      optionsru: ["Сопоставляет несколько частных IP-адресов с одним публичным IP-адресом, используя разные порты источника.", "Шифрует номер порта, чтобы скрыть тип трафика.", "Преобразует адреса IPv4 в адреса IPv6.", "Автоматически блокирует несанкционированные входящие порты."],
      correct: 0
    },
    {
      q: "What is the CIDR notation for a subnet mask of 255.255.255.224?",
      quz: "255.255.255.224 ostki tarmoq maskasi uchun CIDR belgisi qanday?",
      qru: "Какова нотация CIDR для маски подсети 255.255.255.224?",
      options: ["/27", "/24", "/28", "/26"],
      optionsuz: ["/27", "/24", "/28", "/26"],
      optionsru: ["/27", "/24", "/28", "/26"],
      correct: 0
    }
  ],
  "TCP and UDP": [
    {
      q: "During the TCP 3-way handshake, what flag is set by the server in response to the initial client packet?",
      quz: "TCP 3 tomonlama qo'l siqish (handshake) jarayonida mijozning dastlabki paketiga javoban server tomonidan qanday bayroq(flag) o'rnatiladi?",
      qru: "Во время 3-этапного рукопожатия TCP какой флаг устанавливается сервером в ответ на начальный пакет клиента?",
      options: ["SYN-ACK", "ACK", "SYN", "FIN"],
      optionsuz: ["SYN-ACK", "ACK", "SYN", "FIN"],
      optionsru: ["SYN-ACK", "ACK", "SYN", "FIN"],
      correct: 0
    },
    {
      q: "Which characteristic makes UDP highly suitable for real-time VoIP applications?",
      quz: "Qaysi xususiyat UDP ni real vaqt rejimida VoIP ilovalari uchun juda mos qiladi?",
      qru: "Какая характеристика делает UDP очень подходящим для VoIP-приложений в реальном времени?",
      options: ["Lack of retransmission delays.", "Guaranteed packet ordering.", "Built-in encryption.", "Automatic congestion control."],
      optionsuz: ["Qayta uzatish kechikishlarining yo'qligi.", "Paketlarni kafolatlangan tartiblash.", "O'rnatilgan shifrlash.", "Tirbandlikni avtomatik boshqarish."],
      optionsru: ["Отсутствие задержек повторной передачи.", "Гарантированный порядок пакетов.", "Встроенное шифрование.", "Автоматический контроль перегрузок."],
      correct: 0
    },
    {
      q: "In a TCP packet header, what is the Window Size field used for?",
      quz: "TCP paket sarlavhasida Window Size maydoni nima uchun ishlatiladi?",
      qru: "Для чего используется поле Window Size в заголовке пакета TCP?",
      options: ["Flow control, indicating how much data the receiver can currently accept.", "Defining the maximum segment size.", "Setting the TTL (Time To Live).", "Determining the encryption key length."],
      optionsuz: ["Oqimni boshqarish, qabul qiluvchi hozirda qancha ma'lumot qabul qilishi mumkinligini ko'rsatish uchun.", "Maksimal segment hajmini aniqlash uchun.", "TTL (Yashash vaqti) ni o'rnatish uchun.", "Shifrlash kaliti uzunligini aniqlash uchun."],
      optionsru: ["Управление потоком, указывающее, сколько данных в настоящее время может принять получатель.", "Определение максимального размера сегмента.", "Установка TTL (времени жизни).", "Определение длины ключа шифрования."],
      correct: 0
    },
    {
      q: "What happens if a UDP packet is corrupted in transit?",
      quz: "Agar UDP paketi tranzit paytida buzilgan bo'lsa nima bo'ladi?",
      qru: "Что произойдет, если пакет UDP будет поврежден при передаче?",
      options: ["It is dropped silently by the receiver.", "The receiver requests a retransmission.", "The receiver attempts to fix it using parity bits.", "The router returns an ICMP error to the sender."],
      optionsuz: ["Qabul qiluvchi tomonidan jimgina tashlab yuboriladi.", "Qabul qiluvchi uni qayta uzatishni so'raydi.", "Qabul qiluvchi uni parity bitlari yordamida tuzatishga harakat qiladi.", "Router jo'natuvchiga ICMP xatosini qaytaradi."],
      optionsru: ["Он молча отбрасывается получателем.", "Получатель запрашивает повторную передачу.", "Получатель пытается исправить это с помощью битов четности.", "Маршрутизатор возвращает отправителю ошибку ICMP."],
      correct: 0
    },
    {
      q: "Which TCP flag combination is often used in stealth scanning (e.g., Xmas Scan)?",
      quz: "Yashirin skanerlashda (masalan, Xmas Scan) qaysi TCP bayroq birikmasi tez-tez ishlatiladi?",
      qru: "Какая комбинация флагов TCP часто используется при скрытом сканировании (например, Xmas Scan)?",
      options: ["FIN, PSH, URG", "SYN, ACK", "RST, FIN", "SYN, URG"],
      optionsuz: ["FIN, PSH, URG", "SYN, ACK", "RST, FIN", "SYN, URG"],
      optionsru: ["FIN, PSH, URG", "SYN, ACK", "RST, FIN", "SYN, URG"],
      correct: 0
    }
  ],
  "DNS: names to numbers": [
    {
      q: "What type of DNS record is specifically used to map a domain name to an IPv6 address?",
      quz: "Domen nomini IPv6 manziliga xaritalash uchun aniq qaysi turdagi DNS yozuvi ishlatiladi?",
      qru: "Какой тип записи DNS специально используется для сопоставления доменного имени с адресом IPv6?",
      options: ["AAAA", "A", "CNAME", "PTR"],
      optionsuz: ["AAAA", "A", "CNAME", "PTR"],
      optionsru: ["AAAA", "A", "CNAME", "PTR"],
      correct: 0
    },
    {
      q: "Which component of the DNS hierarchy is responsible for knowing the IP addresses of authoritative name servers for the .com domain?",
      quz: "DNS ierarxiyasining qaysi komponenti .com domeni uchun avtoritet nom serverlarining IP manzillarini bilish uchun javobgardir?",
      qru: "Какой компонент иерархии DNS отвечает за знание IP-адресов авторитетных серверов имен для домена .com?",
      options: ["Root Name Servers", "Authoritative DNS Servers", "Local DNS Resolver", "TLD (Top-Level Domain) Servers"],
      optionsuz: ["Ildiz(Root) nom serverlari", "Avtoritet DNS serverlari", "Mahalliy DNS rezolveri", "TLD (Yuqori darajali domen) serverlari"],
      optionsru: ["Корневые серверы имен", "Авторитетные серверы DNS", "Локальный преобразователь DNS", "Серверы TLD (домена верхнего уровня)"],
      correct: 0
    },
    {
      q: "What is a DNS Zone Transfer (AXFR) and why is it a security risk if misconfigured?",
      quz: "DNS Zona Uzatish (AXFR) nima va nima uchun u noto'g'ri sozlangan bo'lsa, xavfsizlikka tahdid soladi?",
      qru: "Что такое передача зоны DNS (AXFR) и почему она представляет собой угрозу безопасности при неправильной настройке?",
      options: ["It replicates the entire DNS database of a domain; attackers can use it to map the entire internal network.", "It encrypts DNS queries; if misconfigured, it exposes queries in plaintext.", "It caches old records; causing users to visit malicious sites.", "It allows dynamic IP updates; attackers can hijack the domain."],
      optionsuz: ["U domenning butun DNS bazasini nusxalaydi; tajovuzkorlar undan butun ichki tarmoq xaritasini chizish uchun foydalanishi mumkin.", "U DNS so'rovlarini shifrlaydi; agar noto'g'ri sozlangan bo'lsa, so'rovlarni ochiq matnda ko'rsatadi.", "U eski yozuvlarni keshlash; foydalanuvchilarni zararli saytlarga tashrif buyurishga majbur qiladi.", "Dinamik IP yangilanishlariga imkon beradi; tajovuzkorlar domenni o'g'irlashi mumkin."],
      optionsru: ["Он реплицирует всю базу данных DNS домена; злоумышленники могут использовать его для составления карты всей внутренней сети.", "Он шифрует DNS-запросы; если он настроен неправильно, он раскрывает запросы в виде простого текста.", "Он кэширует старые записи; заставляя пользователей посещать вредоносные сайты.", "Это позволяет динамически обновлять IP; злоумышленники могут перехватить домен."],
      correct: 0
    },
    {
      q: "How does DNS caching poisoning (DNS Spoofing) work?",
      quz: "DNS keshini zaharlash (DNS Spoofing) qanday ishlaydi?",
      qru: "Как работает отравление кэша DNS (DNS Spoofing)?",
      options: ["An attacker injects fake DNS records into a recursive resolver's cache, redirecting users.", "An attacker changes the host file on the target's computer.", "An attacker floods the DNS server with queries until it crashes.", "An attacker steals the domain's SSL certificate."],
      optionsuz: ["Tajovuzkor rekursiv rezolver keshiga soxta DNS yozuvlarini kiritib, foydalanuvchilarni boshqa tomonga yo'naltiradi.", "Tajovuzkor nishonning kompyuteridagi host faylini o'zgartiradi.", "Tajovuzkor DNS serverini so'rovlar bilan to'ldirib yuboradi.", "Tajovuzkor domenning SSL sertifikatini o'g'irlaydi."],
      optionsru: ["Злоумышленник внедряет поддельные записи DNS в кэш рекурсивного преобразователя, перенаправляя пользователей.", "Злоумышленник изменяет файл хоста на компьютере цели.", "Злоумышленник заполняет DNS-сервер запросами, пока он не выйдет из строя.", "Злоумышленник крадет SSL-сертификат домена."],
      correct: 0
    },
    {
      q: "Which DNS record type is essential for setting up email services and specifying mail servers?",
      quz: "Elektron pochta xizmatlarini o'rnatish va pochta serverlarini ko'rsatish uchun qaysi DNS yozuv turi muhim?",
      qru: "Какой тип записи DNS имеет важное значение для настройки служб электронной почты и указания почтовых серверов?",
      options: ["MX", "TXT", "SRV", "NS"],
      optionsuz: ["MX", "TXT", "SRV", "NS"],
      optionsru: ["MX", "TXT", "SRV", "NS"],
      correct: 0
    }
  ]
};

const EXAM_QUESTIONS = [
  {
    q: "In an enterprise network, you observe abnormal traffic utilizing ICMP tunneling. What is the most likely purpose of this attack?",
    quz: "Korporativ tarmoqda siz ICMP tunneling orqali g'ayritabiiy trafikni kuzatdingiz. Ushbu hujumning eng ehtimoliy maqsadi nima?",
    qru: "В корпоративной сети вы наблюдаете аномальный трафик с использованием ICMP-туннелирования. Какова наиболее вероятная цель этой атаки?",
    options: ["Data exfiltration bypassing standard firewall rules.", "Causing a Denial of Service via Ping of Death.", "Spoofing IP addresses to bypass MAC filtering.", "Automatically updating routing tables via OSPF."],
    optionsuz: ["Standart xavfsizlik devori qoidalarini chetlab o'tib, ma'lumotlarni chiqarib yuborish.", "Ping of Death orqali xizmat ko'rsatishni rad etishni keltirib chiqarish.", "MAC filtrlashni chetlab o'tish uchun IP manzillarni soxtalashtirish.", "OSPF orqali marshrutlash jadvallarini avtomatik yangilash."],
    optionsru: ["Утечка данных в обход стандартных правил брандмауэра.", "Вызов отказа в обслуживании с помощью Ping of Death.", "Подмена IP-адресов для обхода фильтрации MAC.", "Автоматическое обновление таблиц маршрутизации через OSPF."],
    correct: 0
  },
  {
    q: "How does the BGP (Border Gateway Protocol) route hijacking vulnerability manifest?",
    quz: "BGP (Border Gateway Protocol) marshrutini o'g'irlash zaifligi qanday namoyon bo'ladi?",
    qru: "Как проявляется уязвимость перехвата маршрута BGP (Border Gateway Protocol)?",
    options: ["A malicious AS announces a more specific prefix, redirecting global traffic to itself.", "An attacker guesses the TCP sequence numbers of BGP peers.", "The DNS server routes traffic to an incorrect AS number.", "A router runs out of memory processing BGP tables."],
    optionsuz: ["Zararli AS aniqroq prefiksni e'lon qiladi va global trafikni o'ziga yo'naltiradi.", "Tajovuzkor BGP tengdoshlarining TCP ketma-ketlik raqamlarini taxmin qiladi.", "DNS serveri trafikni noto'g'ri AS raqamiga yo'naltiradi.", "BGP jadvallarini qayta ishlashda routerning xotirasi tugaydi."],
    optionsru: ["Вредоносная AS объявляет более конкретный префикс, перенаправляя глобальный трафик на себя.", "Злоумышленник угадывает порядковые номера TCP узлов BGP.", "DNS-сервер направляет трафик на неверный номер AS.", "У маршрутизатора заканчивается память при обработке таблиц BGP."],
    correct: 0
  },
  {
    q: "If an IDS alerts on a 'TCP SYN Flood', what mitigation technique at the firewall or load balancer is most effective?",
    quz: "Agar IDS 'TCP SYN Flood' haqida ogohlantirsa, xavfsizlik devori yoki yuk balanserida qaysi yumshatish texnikasi eng samarali hisoblanadi?",
    qru: "Если IDS предупреждает о 'TCP SYN Flood', какой метод смягчения последствий на брандмауэре или балансировщике нагрузки является наиболее эффективным?",
    options: ["SYN Cookies", "Disabling ICMP replies", "Dropping all UDP packets", "Increasing the TTL value"],
    optionsuz: ["SYN Cookies", "ICMP javoblarini o'chirish", "Barcha UDP paketlarini tashlab yuborish", "TTL qiymatini oshirish"],
    optionsru: ["SYN Cookies", "Отключение ответов ICMP", "Отбрасывание всех UDP-пакетов", "Увеличение значения TTL"],
    correct: 0
  },
  {
    q: "Why is ARP Spoofing highly effective on local area networks (LANs) but ineffective across the wider internet?",
    quz: "Nima uchun ARP Spoofing mahalliy tarmoqlarda (LAN) juda samarali, lekin kengroq internetda samarasiz?",
    qru: "Почему ARP Spoofing очень эффективен в локальных сетях (LAN), но неэффективен в широком Интернете?",
    options: ["ARP is a Layer 2 protocol and does not cross Layer 3 routers.", "ISPs block ARP packets by default.", "ARP relies on TCP, which resets across WANs.", "ARP packets are encrypted on the internet."],
    optionsuz: ["ARP Layer 2 protokoli bo'lib, Layer 3 routerlaridan o'tmaydi.", "ISP provayderlari sukut bo'yicha ARP paketlarini bloklaydi.", "ARP TCP ga tayanadi, u WAN bo'ylab qayta o'rnatiladi.", "Internetda ARP paketlari shifrlangan."],
    optionsru: ["ARP — это протокол уровня 2, который не пересекает маршрутизаторы уровня 3.", "Интернет-провайдеры блокируют ARP-пакеты по умолчанию.", "ARP опирается на TCP, который сбрасывается в сетях WAN.", "Пакеты ARP шифруются в Интернете."],
    correct: 0
  },
  {
    q: "What is the primary function of IPSec Transport Mode compared to Tunnel Mode?",
    quz: "Tunnel rejimiga nisbatan IPSec transport rejimining asosiy vazifasi nima?",
    qru: "Какова основная функция транспортного режима IPSec по сравнению с туннельным режимом?",
    options: ["Transport mode only encrypts the payload, while Tunnel mode encrypts both the payload and the original IP header.", "Transport mode is used for site-to-site VPNs.", "Transport mode does not provide data integrity.", "Tunnel mode operates at Layer 4, Transport operates at Layer 3."],
    optionsuz: ["Transport rejimi faqat yukni shifrlaydi, Tunnel rejimi esa yukni ham, asl IP sarlavhasini ham shifrlaydi.", "Transport rejimi saytdan saytga VPN-lar uchun ishlatiladi.", "Transport rejimi ma'lumotlar yaxlitligini ta'minlamaydi.", "Tunnel rejimi 4-qatlamda, Transport 3-qatlamda ishlaydi."],
    optionsru: ["Транспортный режим шифрует только полезную нагрузку, тогда как туннельный режим шифрует как полезную нагрузку, так и исходный заголовок IP.", "Транспортный режим используется для VPN типа «сеть-сеть».", "Транспортный режим не обеспечивает целостность данных.", "Туннельный режим работает на уровне 4, транспортный — на уровне 3."],
    correct: 0
  },
  {
    q: "In a Distributed Reflection Denial of Service (DRDoS) attack via NTP, what specific command is typically abused?",
    quz: "NTP orqali tarqatilgan ko'zgu xizmatini rad etish (DRDoS) hujumida odatda qaysi o'ziga xos buyruq suiiste'mol qilinadi?",
    qru: "Какая конкретная команда обычно злоупотребляется при атаке типа «распределенный отказ в обслуживании» (DRDoS) через NTP?",
    options: ["monlist", "ntpdate", "ping", "get-status"],
    optionsuz: ["monlist", "ntpdate", "ping", "get-status"],
    optionsru: ["monlist", "ntpdate", "ping", "get-status"],
    correct: 0
  },
  {
    q: "Which IEEE standard is primarily associated with port-based Network Access Control (PNAC)?",
    quz: "Qaysi IEEE standarti asosan portga asoslangan Tarmoqqa kirishni boshqarish (PNAC) bilan bog'liq?",
    qru: "Какой стандарт IEEE в первую очередь связан с управлением доступом к сети на основе портов (PNAC)?",
    options: ["802.1X", "802.11", "802.3", "802.1Q"],
    optionsuz: ["802.1X", "802.11", "802.3", "802.1Q"],
    optionsru: ["802.1X", "802.11", "802.3", "802.1Q"],
    correct: 0
  },
  {
    q: "A subnet has a mask of /29. How many usable host IPs are available?",
    quz: "/29 maskali quyi tarmoqda. Qancha foydalanish mumkin bo'lgan xost IP-lari mavjud?",
    qru: "Подсеть имеет маску /29. Сколько доступно полезных IP-адресов хостов?",
    options: ["6", "8", "14", "30"],
    optionsuz: ["6", "8", "14", "30"],
    optionsru: ["6", "8", "14", "30"],
    correct: 0
  },
  {
    q: "What defines a Split-Tunnel VPN configuration?",
    quz: "Split-Tunnel VPN konfiguratsiyasini nima belgilaydi?",
    qru: "Что определяет конфигурацию Split-Tunnel VPN?",
    options: ["Only traffic destined for the corporate network goes through the VPN, while internet traffic bypasses it.", "Traffic is split across multiple ISPs for redundancy.", "The VPN uses both TCP and UDP simultaneously.", "Encryption and decryption are handled by separate dedicated servers."],
    optionsuz: ["Faqat korporativ tarmoqqa yo'naltirilgan trafik VPN orqali o'tadi, internet trafigi esa uni aylanib o'tadi.", "Qayta ishlash uchun trafik bir nechta ISP lari bo'ylab bo'linadi.", "VPN bir vaqtning o'zida TCP va UDP dan foydalanadi.", "Shifrlash va parolni ochish alohida maxsus serverlar tomonidan amalga oshiriladi."],
    optionsru: ["Через VPN проходит только трафик, предназначенный для корпоративной сети, а интернет-трафик идет в обход него.", "Трафик распределяется между несколькими интернет-провайдерами для обеспечения избыточности.", "VPN использует одновременно TCP и UDP.", "Шифрование и дешифрование обрабатываются отдельными выделенными серверами."],
    correct: 0
  },
  {
    q: "When analyzing a PCAP, what indicates a successful TCP connection establishment?",
    quz: "PCAP-ni tahlil qilayotganda, muvaffaqiyatli TCP ulanishini o'rnatilishini nima ko'rsatadi?",
    qru: "При анализе PCAP что указывает на успешное установление TCP-соединения?",
    options: ["A packet sequence of SYN -> SYN-ACK -> ACK.", "A packet with the PSH flag set.", "A DNS response followed by a TLS Client Hello.", "A continuous stream of ICMP replies."],
    optionsuz: ["SYN -> SYN-ACK -> ACK paketi ketma-ketligi.", "PSH bayrog'i o'rnatilgan paket.", "DNS javobidan so'ng TLS Client Hello.", "ICMP javoblarining uzluksiz oqimi."],
    optionsru: ["Последовательность пакетов SYN -> SYN-ACK -> ACK.", "Пакет с установленным флагом PSH.", "Ответ DNS, за которым следует TLS Client Hello.", "Непрерывный поток ответов ICMP."],
    correct: 0
  },
  {
    q: "Which protocol is utilized to automatically assign IP configurations to clients on a local network?",
    quz: "Mijozlarga mahalliy tarmoqda IP konfiguratsiyalarini avtomatik ravishda belgilash uchun qaysi protokol ishlatiladi?",
    qru: "Какой протокол используется для автоматического назначения IP-конфигураций клиентам в локальной сети?",
    options: ["DHCP", "DNS", "ARP", "BGP"],
    optionsuz: ["DHCP", "DNS", "ARP", "BGP"],
    optionsru: ["DHCP", "DNS", "ARP", "BGP"],
    correct: 0
  },
  {
    q: "During a penetration test, you find an open port 53. If it answers to TCP requests rather than UDP, what might it indicate?",
    quz: "Penetratsiya testi davomida siz ochiq 53 portni topasiz. Agar u UDP emas, balki TCP so'rovlariga javob bersa, bu nimani ko'rsatishi mumkin?",
    qru: "Во время теста на проникновение вы находите открытый порт 53. Если он отвечает на запросы TCP, а не UDP, на что это может указывать?",
    options: ["The server allows DNS Zone Transfers (AXFR) or handles very large responses.", "The server is a web server misconfigured to use port 53.", "The DNS service is corrupted and failing back to TCP.", "The port is being used as a honeypot."],
    optionsuz: ["Server DNS Zone Transfers (AXFR) ga ruxsat beradi yoki juda katta javoblarni qayta ishlaydi.", "Server 53-portdan foydalanish uchun noto'g'ri sozlangan veb-server.", "DNS xizmati buzilgan va TCP-ga qaytmoqda.", "Port asal idishi (honeypot) sifatida ishlatilmoqda."],
    optionsru: ["Сервер разрешает передачу зон DNS (AXFR) или обрабатывает очень большие ответы.", "Сервер — это веб-сервер, неправильно настроенный для использования порта 53.", "Служба DNS повреждена и возвращается к TCP.", "Порт используется как honeypot."],
    correct: 0
  },
  {
    q: "What is the function of the OSPF protocol in large networks?",
    quz: "Katta tarmoqlarda OSPF protokolining vazifasi nima?",
    qru: "Какова функция протокола OSPF в больших сетях?",
    options: ["It dynamically calculates the shortest path for routing using a link-state algorithm.", "It encrypts traffic between remote branch offices.", "It converts domain names to internal IP addresses.", "It manages the allocation of IPv6 addresses."],
    optionsuz: ["U havola holati(link-state) algoritmi yordamida marshrutlash uchun eng qisqa yo'lni dinamik ravishda hisoblab chiqadi.", "Uzoqdagi filiallar orasidagi trafikni shifrlaydi.", "Domen nomlarini ichki IP manzillarga aylantiradi.", "IPv6 manzillarini taqsimlashni boshqaradi."],
    optionsru: ["Он динамически вычисляет кратчайший путь для маршрутизации с использованием алгоритма состояния канала.", "Он шифрует трафик между удаленными филиалами.", "Он преобразует доменные имена во внутренние IP-адреса.", "Он управляет распределением адресов IPv6."],
    correct: 0
  },
  {
    q: "What vulnerability arises if an organization relies solely on MAC address filtering for wireless network security?",
    quz: "Agar tashkilot simsiz tarmoq xavfsizligi uchun faqat MAC-manzillarni filtrlashga tayansa, qanday zaiflik yuzaga keladi?",
    qru: "Какая уязвимость возникает, если организация полагается исключительно на фильтрацию MAC-адресов для обеспечения безопасности беспроводной сети?",
    options: ["MAC addresses can be easily sniffed in plaintext and spoofed by attackers.", "MAC addresses are only 32 bits and easily brute-forced.", "MAC filtering disables WPA3 encryption automatically.", "The router's ARP table overflows rapidly."],
    optionsuz: ["MAC manzillarni oddiy matnda osongina ushlab olish va tajovuzkorlar tomonidan soxtalashtirish mumkin.", "MAC manzillar faqat 32 bit bo'lib, osonlikcha buziladi (brute-force).", "MAC filtrlash WPA3 shifrlashni avtomatik ravishda o'chiradi.", "Routerning ARP jadvali tez to'lib ketadi."],
    optionsru: ["MAC-адреса легко перехватываются открытым текстом и подделываются злоумышленниками.", "MAC-адреса состоят всего из 32 бит, и их легко подобрать (brute-force).", "Фильтрация MAC автоматически отключает шифрование WPA3.", "Таблица ARP маршрутизатора быстро переполняется."],
    correct: 0
  },
  {
    q: "How does the 'Time To Live' (TTL) field in an IP header prevent infinite network loops?",
    quz: "IP sarlavhasidagi 'Time To Live' (TTL) maydoni qanday qilib cheksiz tarmoq ko'chadan(loop) saqlaydi?",
    qru: "Как поле 'Time To Live' (TTL) в заголовке IP предотвращает бесконечные сетевые циклы?",
    options: ["It decrements by 1 at each router hop; if it reaches 0, the packet is discarded.", "It restricts the packet from existing longer than a specified number of seconds.", "It forces the packet to return to the sender if a loop is detected.", "It encrypts the routing path to prevent interception."],
    optionsuz: ["Har bir router xopida(hop) 1 taga kamayadi; agar u 0 ga yetsa, paket bekor qilinadi.", "Paket belgilangan soniyalardan ko'proq yashashini cheklaydi.", "Agar sikl aniqlansa, paketni jo'natuvchiga qaytarishga majbur qiladi.", "Tutib qolishning oldini olish uchun marshrutlash yo'lini shifrlaydi."],
    optionsru: ["Он уменьшается на 1 при каждом прыжке маршрутизатора; если он достигает 0, пакет отбрасывается.", "Он ограничивает существование пакета временем, превышающим указанное количество секунд.", "Он заставляет пакет вернуться отправителю, если обнаружен цикл.", "Он шифрует путь маршрутизации для предотвращения перехвата."],
    correct: 0
  }
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  
  try {
    const modTitle = "Networking basics";
    const modRes = await pool.query("SELECT id FROM modules WHERE title=$1", [modTitle]);
    if (modRes.rowCount === 0) throw new Error("Module not found");
    const mid = modRes.rows[0].id;

    // Insert hard exam questions
    await pool.query("DELETE FROM module_questions WHERE module_id=$1", [mid]);
    for (let i = 0; i < EXAM_QUESTIONS.length; i++) {
      const q = EXAM_QUESTIONS[i];
      await pool.query(
        `INSERT INTO module_questions (module_id, question, question_uz, question_ru, options, options_uz, options_ru, correct_option, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [mid, q.q, q.quz, q.qru, JSON.stringify(q.options), JSON.stringify(q.optionsuz), JSON.stringify(q.optionsru), q.correct, i]
      );
    }

    // Insert medium lesson questions
    const lessonsRes = await pool.query("SELECT id, title FROM lessons WHERE module_id=$1", [mid]);
    for (const l of lessonsRes.rows) {
      const qs = NETWORK_LESSONS[l.title];
      if (qs) {
        await pool.query("DELETE FROM lesson_questions WHERE lesson_id=$1", [l.id]);
        for (let i = 0; i < qs.length; i++) {
          const q = qs[i];
          await pool.query(
            `INSERT INTO lesson_questions (lesson_id, question, question_uz, question_ru, options, options_uz, options_ru, correct_option, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [l.id, q.q, q.quz, q.qru, JSON.stringify(q.options), JSON.stringify(q.optionsuz), JSON.stringify(q.optionsru), q.correct, i]
          );
        }
      }
    }
    
    console.log("Successfully seeded HARD networking module and MEDIUM lessons with FULL translations!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
