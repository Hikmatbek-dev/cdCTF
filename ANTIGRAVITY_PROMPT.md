# cdCTF — davom ettirish uchun to'liq brief (Antigravity uchun)

Sen `/home/bozkurt/Desktop/ummuiy/2-darajali/CyberPlace.uz` loyihasida ishlaysan. Bu — **cdCTF**: o'zbek jamiyati uchun bepul, uch tilli (o'zbek / rus / ingliz) kiberxavfsizlik akademiyasi va CTF platformasi (TryHackMe / HackTheBox uslubida, lekin mahalliy). Bosh maqsad: **yangi boshlovchi ham tushunadigan, sodda va aniq taklif beradigan mahsulot** yaratish.

Boshqa bir agent (Claude Code) allaqachon katta ish qildi. Quyida: nima qilingani, nima qolgani, va **buzib qo'ymaslik uchun bilishing shart bo'lgan cheklovlar**. Diqqat bilan o'qi.

---

## 0. Muhim: ishga tushirish, tekshirish, cheklovlar

### Stack
- pnpm monorepo (workspaces). Node, `corepack pnpm` ishlat.
- Frontend: `artifacts/cyberplace` — React + Vite + Tailwind **v4** (`@tailwindcss/vite`, **`tailwind.config.js` yo'q**), wouter (router), TanStack Query, orval-generated API client (`@workspace/api-client-react`).
- Backend: `artifacts/api-server` — Express 5, esbuild bilan bundle qilinadi (`node build.mjs`), serverless ham (`src/serverless.ts`). Postgres + Drizzle (`lib/db`).
- i18n: **tarjima fayllari yo'q**. `src/lib/LanguageContext.tsx` dagi `t(en, uz, ru)` funksiyasi orqali, matnlar JSX ichida. Har yangi matn 3 tilda bo'lishi shart.

### Ishga tushirish
```bash
corepack pnpm install
# lokal DB docker-compose bilan (postgres:15, port 5432, db=cyberplace, user=postgres, pass=password)
docker compose up -d
# API (port 8080):
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/cyberplace" PORT=8080 JWT_SECRET=dev NODE_ENV=development node artifacts/api-server/dist/index.mjs
# yoki dev rejimida hammasi: ./run.sh
# Frontend dev (Vite proxy /api -> :8080):
corepack pnpm --filter cyberplace run dev   # port 7000, yoki vite dev --port 5173
```

### Har o'zgarishdan keyin ishlatiladigan tekshiruvlar (MAJBURIY)
```bash
corepack pnpm run typecheck        # 4 paket, 0 xato bo'lishi kerak
corepack pnpm run lint             # touched fayllarda 0 error (warning'lar mayli)
corepack pnpm --filter ./scripts run check-labs   # lab xavfsizligi regressiya testi
corepack pnpm --filter cyberplace run build        # prod build
```

### CHEKLOVLAR — bularni buzma (avvalgi ish shu qoidalar asosida qilingan)
1. **Brend / domen:** brend `cdCTF`, domen `cdctf.uz` (papka nomi "CyberPlace.uz" bo'lsa ham — u eskirgan). `cyberplace.uz` deb yozma.
2. **Production DB va secretlar:** sen prod bazasiga tegma, prod importlarni O'ZING ishga tushirma, prod secretlarni ochma. Bularni foydalanuvchi o'zi qiladi. Kod tayyorla, buyruqni ayt, lekin ishga tushirmang.
3. **Deploy:** `npx vercel --prod` orqali (foydalanuvchi qiladi). **`vercel.json` ga hech qachon kunlik-ostidan (sub-daily) cron qo'shma** — Hobby plan buni rad etadi va har build jimgina barbod bo'ladi.
4. **Vercel rewrites zanjirlanmaydi:** crawler/OG qoidalari `/api/[...path]` ga yo'naltirilishi kerak, `/api/og/...` ga emas.
5. **Dizayn yo'nalishi:** sayt qorong'i "hacker terminal" ko'rinishidan **yorug' o'quv-platforma ko'rinishiga** o'tkazilyapti (Duolingo/Coursera uslubi). Yorug' rejim — asosiy (default). Qorong'i rejim ham ishlashi shart. Terminal estetikasi faqat dars kod bloklari, CTF va labs ichida qoladi. Mockupsiz, to'g'ridan kodda. **Yaxshi ishlagan narsalarning MANTIG'INI o'zgartirma, faqat ko'rinishini** — bular: `/start` onboarding, `LessonDetailPage` stepper, `RoadmapTree`, `Credentials` (sertifikat), bo'sh holat (empty state) matnlari.
6. **Monetizatsiya:** o'quvchilar hech qachon to'lamaydi. Daromad: A (fond/grant) → B (homiylik qilingan CTF musobaqalari) → C (talent pipeline / ish beruvchilar). Careers bo'limi shu C uchun.
7. **Skrinshot muhitda ishlamasligi mumkin.** Vizualni tekshirish uchun kontrast/o'lcham/overflow'ni JS bilan o'lchash usuli avval qo'llangan (pastda).

---

## 1. ALLAQACHON QILINGAN ISH (buzma, ustiga qur)

### P0 — Lab xavfsizligi (TUGALLANGAN, tekshirilgan)
Foydalanuvchi shikoyati: labni "to'xtatish"dan keyin ham nusxalangan URL orqali flagni olib bo'lardi. Asl muammo undan kattaroq edi — **5 ta lab flagi production JS bundle ichida ochiq matnda edi** (login shart emas). Hammasi tuzatildi:
- `lib/lab-scenarios` ikkiga bo'lindi: `src/meta.ts` (slug/topshiriq/maslahat — frontend faqat `@workspace/lab-scenarios/meta` ni import qiladi) va `src/index.ts` (hujjatlar + flaglar + tekshiruvchilar — **faqat server**). `src/engines.ts` — brauzer va serverda bir xil ishlaydigan yagona dvigatel (`String(fn)` orqali).
- Flaglar 5 tasi ham almashtirildi (eskilari kuygan).
- `GET /api/labs/target/:slug` endi **imzolangan sessiya tokeni** talab qiladi (`?t=<token>`), `lab_instances.status='running' AND expiresAt>now()` tekshiradi. Token = `browser:<uuid>` instance id ning tasodifiy qismi.
- Yangi `POST /api/labs/solve` — flag faqat exploit serverda tasdiqlangach beriladi (payload'ni o'sha dvigatel qayta ishlaydi). SQL labida manba koddan parolni o'qib olish endi ishlamaydi.
- `submitFlagHandler` (`ctf.ts`) — lab bilan bog'langan challenge uchun submitter o'sha labni ishga tushirganini tekshiradi.
- "Reopen the target" havolasi va XFO/CSP ziddiyati tuzatildi.
- **Regressiya testi:** `scripts/src/check-labs.ts` — buni har o'zgarishdan keyin ishlat.

> ⚠️ **Foydalanuvchiga qoldirilgan (sen qilma):** production DB'da flaglarni rotatsiya qilish. Deploy'dan OLDIN foydalanuvchi shuni ishga tushirishi kerak:
> `DATABASE_URL=<prod> pnpm --filter ./scripts run import-labs`

### P2.1 — Yangi vizual til (TUGALLANGAN)
`artifacts/cyberplace/src/index.css` to'liq qayta yozilgan:
- Iliq qog'oz foni, harakatlar uchun **indigo** (`--primary`), diqqat uchun **amber** (`--accent`), muvaffaqiyat uchun **emerald** (`--neon`). Barcha matn juftlari WCAG AA (4.5:1) dan o'tadi — o'lchangan.
- Yorug' rejim default (`ThemeContext.tsx`), `index.html` da FOUC oldini olish uchun inline skript bor.
- **Tipografika shkalasi:** `h1`–`h6` uchun `clamp()` asosida — sahifalar o'z sarlavha o'lchamini belgilamasligi kerak.
- **Layout klasslari:** `.page` (navbar offset + pastki bo'shliq), `.shell` (max-w-6xl), `.shell-mid` (max-w-4xl), `.shell-narrow` (max-w-3xl, o'qish uchun).
- **Komponent klasslari:** `.glass-card`, `.cyber-button` (yassi indigo, min 44px balandlik), `.cyber-button-outline`, `.neon-button`, `.field` (yagona input), `.chip` / `.chip-primary` / `.chip-neon` / `.chip-accent`, `.eyebrow`, `.section-alt` (iliq tonli tasma — endi ag'darilmaydi).
- **Buzilgan shadcn tokenlari tuzatildi:** `--primary-border`, `--button-outline`, `--badge-outline`, va `.hover-elevate` / `.active-elevate-2` utilitalari aniqlandi (ular mavjud emas edi — shuning uchun `<Button>` da hover, `variant="outline"` da border yo'q edi).

Qayta yozilgan: `Navbar.tsx`, `HeroTerminal.tsx` (endi yorug' sahifada qorong'i terminal — "specimen"), `HomePage.tsx`, `CtfListPage.tsx`, `LessonDetailPage.tsx`.

### P2.2 — Komponent qatlami (YARIM QILINGAN — buni davom ettirasan, pastga qara)
Allaqachon: ~96 ta sahifa frame/konteyner `.page`/`.shell*` ga ko'chirildi (skript bilan, aniq string match orqali), ~64 ta `bg-foreground/5`→`bg-muted` / `border-foreground/5`→`border-border`, qo'lda yozilgan inputlar `.field` ga, `text-white`→`text-primary-foreground` (bg-primary ustida), ~22 ta sahifa-sarlavha tipografika shkalasiga ko'chirildi.

---

## 2. SENING VAZIFALARING (tartib bo'yicha)

### 🔴 P2.2 — Komponent qatlamini tugat (BIRINCHI, hozir yarim)
1. **~19 ta ishlatilmagan shadcn primitivini o'chir** (hech qayerda import qilinmagan, tekshirilgan): `src/components/ui/` ichidan `carousel.tsx`, `menubar.tsx`, `resizable.tsx`, `sidebar.tsx`, `command.tsx`, `drawer.tsx`, `chart.tsx`. O'chirgach `typecheck` + `build` ishlat. (Boshqalarini ham `grep -rl "ui/<name>\"" src` bilan tekshirib, 0 bo'lsa o'chirsang bo'ladi — lekin ehtiyot bo'l.)
2. **Qolgan `text-white` va `bg-foreground/5` larni ko'rib chiq:** `Credentials.tsx` (sertifikat — QORA/oltin sheet, `text-white` TO'G'RI, tegma), `RoadmapTree.tsx`, `LessonTasks.tsx`, `ShareCredential.tsx`, `EventPage.tsx`, `HomePage.tsx`. Faqat rangli fon ustida bo'lmagan `text-white` larni token rangga o'zgartir.
3. **Barcha 34 sahifani brauzerda ko'r** (yorug' VA qorong'i, 390px VA 1280px) va kontrast/overflow tekshir (pastdagi audit skripti bilan). 0 kontrast xatosi maqsad.
4. `text-neon` klassi endi haqiqiy (`--color-neon` aniqlangan) — `AdminCompetitionsPage.tsx:90` da to'g'ri ko'rinishini tekshir.

### 🟠 P1.1 — Har sahifaga global Layout + footer
Hozir footer **faqat HomePage'da** (`HomePage.tsx` ichida). Bosh sahifadan chiqsang `/learn`, `/talent`, `/impact`, `/verify`, `/start` **umuman topib bo'lmaydi**. Global `Layout` komponenti yasab, navbar + footer + `.shell`ni o'zi boshqarsin. Footer'ga `/start`, `/learn`, `/impact`, `/verify` havolalarini qo'sh. `App.tsx` route'larini Layout bilan o'ra.

### 🟠 P1.2 — Jargon lug'ati + inline izohlar
`flag, CTF, pwn, recon, writeup, XP, title, streak, TTL, container/browser lab, passkey, API token` — bosh sahifadan tashqari hech qayerda tushuntirilmagan. Lug'at sahifasi yoki inline "bu nima?" tooltiplari qo'sh. Terminologiyani birlashtir: navbarda "XP", scoreboardda "pts", dashboardda "points" — bitta so'z ("ball"/"points"). (Navbarda allaqachon "points"ga o'zgartirilgan.)

### 🟠 P1.3 — Qotib qolgan raqamlar va xom ID'lar
- `HomePage.tsx` da fallback raqamlar (`8/64/40+`) live API bilan zid — `:118` "340 hours", `:685` "sixty-four lessons" ham. Hammasini live API'dan yoki bitta manbadan ol.
- `DashboardPage.tsx` da faoliyat `#12` deb ko'rsatiladi (ID, nom emas) — challenge/lesson nomini ko'rsat.
- `HomePage.tsx` da "Baby SQLi / XOR Me" kartalari soxta, bosilmaydi — yo real qil, yo bosiladiganday ko'rsatma.

### 🟡 P3.1 — Ikonka / OG / PWA manifest (texnik bug)
- `public/site.webmanifest`: `icon.jpg` `192x192` deб yozilgan, aslida **2048×2048, 255 KB**. `logo.png` `512x512 maskable` deб, aslida `600×342` (maskable bo'lolmaydi).
- `og:image` (`index.html`) 600×342 — kerak ~1200×630.
- `public/img/net-1200.webp` — hech qayerda ishlatilmagan, o'chir yoki ishlat.
- To'g'ri o'lchamli ikonkalar generatsiya qilish kerak bo'lsa, foydalanuvchidan so'ra (rasm generatsiya qila olmasang).

### 🟡 P3.2 — Rasmlar
Butun saytda atigi 4 ta haqiqiy rasm (hammasi HomePage'da). `ChallengeArt.tsx` va `ModuleArt.tsx` — kod bilan chiziladigan SVG sahnalar (yaxshi). Muammolar:
- `ChallengeArt` da `cloud/mobile/hardware/ai` sahnalari hech qachon ishlatilmaydi, va **OSINT** (4 ta challenge bor) `lib/category-style.ts` da yo'q → noto'g'ri kulrang rangda chiqadi. Buni tuzat.
- SVG tizimini dars kartalari, bo'sh holatlar, dashboard, Careers'ga kengaytir.
- (AI illyustratsiya yoki litsenziyalangan foto kerak bo'lsa — foydalanuvchidan so'ra, prompt/ro'yxat tayyorla.)

### 🟡 P3.3 — Solved/unsolved holati hamma joyda bir xil
`CtfListPage` da kuchli (4 belgi: border, rail, badge, drained art). Lekin `ModuleDetailPage.tsx:220-226` da **faqat rang**, va boshqa yashil (`emerald-500`, `--neon` emas). CtfListPage uslubini challenge ko'ringan har joyga qo'lla.

### 🟡 P4 — Careers buglari
`/jobs` va `/talent`. `TalentPage.tsx` "N nomzod" deб yozib faqat 24 tasini ko'rsatadi (paginatsiya yo'q; `Pagination` komponenti mavjud). Jobs 200 tadan keyin jimgina yo'qoladi. API'ning yarmi OpenAPI'da yo'q, qo'lda `fetch` bilan (`JobsPage.tsx:66-75`, `credentials` qo'yilmagan). Inglizcha qotib qolgan `"Failed"` (`:73, :107`). Native `confirm()` (`:135`) — `AlertDialog` bilan almashtir. `hidden` o'lik dekor bloklari (`JobsPage.tsx`, `TalentPage.tsx`). `seed-demo.ts` dagi "Example Corp → example.com/apply" soxta e'lonlari prod'da bo'lmasin. `GET /api/jobs/:id` — sahifasi yo'q (yo yasab, yo o'chir).

### 🟡 P5 — Admin panel mobilda
`AdminSidebar.tsx:28` — qattiq `w-64`, responsive/drawer yo'q; 360px'da kontentga ~100px qoladi. 10 ta admin sahifasi shu shell'ni ishlatadi. Mobil drawer qil. Qo'shimcha: `CtfDetailPage` da bo'sh 4-ustun, `DashboardPage.tsx:203` `p-10+text-5xl` tiles, `SecurityPage.tsx:302` `min-w-[20rem]` overflow.

### 🟢 P6 — Hujjat, a11y, o'lik kod
- `README.md` — bitta qator. `replit.md` hali "CyberPlace" deб nomlangan va "8 challenge, 5 dars" deydi (aslida ~167 dars, ~47+ challenge). Yangila.
- Barcha shadcn primitivlaridagi screen-reader matni faqat inglizcha (`dialog.tsx` "Close", `pagination.tsx`, `sidebar.tsx`, `spinner.tsx` "Loading", `carousel.tsx`, `breadcrumb.tsx`). i18n qil.
- O'lik kod: `CompetitionsPage.tsx:10-21` `StatusBadge` (tarjimasiz raw status, `statusLabel` tomonidan soyalangan), `LessonTestPage.tsx:30,123-141` (`blocked` hech qachon true bo'lmaydi).

---

## 3. Vizualni skrinshot'siz tekshirish (kontrast/overflow audit)

Brauzer konsolida (yoki MCP javascript_exec) shu skriptni ishlat — sahifadagi har matnning haqiqiy kontrastini oklab/rgb aralashmasini hisoblab o'lchaydi:

```js
(()=>{const srgb=v=>v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055;
const parse=s=>{let m=s.match(/rgba?\(([^)]+)\)/);if(m){const p=m[1].split(',').map(Number);return{rgb:[p[0],p[1],p[2]],a:p.length>3?p[3]:1}}m=s.match(/oklab\(([^)]+)\)/);if(m){const p=m[1].replace('/',' ').trim().split(/\s+/).map(Number);const c=Math.max(0,Math.min(1,srgb(Math.pow(p[0],3))))*255;return{rgb:[c,c,c],a:p.length>3?p[3]:1}}return null};
const lum=c=>{const[r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b};
const bgOf=el=>{const st=[];let n=el;while(n&&n!==document.documentElement){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0){st.push(c);if(c.a>=0.999)break}n=n.parentElement}if(!st.length||st[st.length-1].a<0.999){const b=parse(getComputedStyle(document.body).backgroundColor);st.push({rgb:b?b.rgb:[255,255,255],a:1})}let out=st[st.length-1].rgb;for(let i=st.length-2;i>=0;i--){const c=st[i];out=out.map((v,k)=>c.rgb[k]*c.a+v*(1-c.a))}return out};
const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);const[hi,lo]=l1>l2?[l1,l2]:[l2,l1];return(hi+0.05)/(lo+0.05)};
const fails=[];document.querySelectorAll('body *').forEach(el=>{if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').trim();if(t.length<2)return;const cs=getComputedStyle(el);if(cs.webkitTextFillColor==='rgba(0, 0, 0, 0)')return;const fg=parse(cs.color);if(!fg)return;const r=ratio(fg.rgb,bgOf(el));const sz=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700;const need=(sz>=24||(sz>=18.66&&bold))?3:4.5;if(r<need-0.03)fails.push({t:t.slice(0,36),r:+r.toFixed(2),cls:el.className.toString().slice(0,44)})});
return JSON.stringify({url:location.pathname,dark:document.documentElement.classList.contains('dark'),w:innerWidth,nFails:fails.length,fails:fails.slice(0,8),overflow:document.documentElement.scrollWidth>innerWidth+1},null,1)})()
```
Yorug' + qorong'i (`document.documentElement.classList.toggle('dark')`) va 390px + 1280px da ishlat.

---

## 4. Ish uslubi
- Kichik, aniq string-match'lar bilan ishla (Tailwind klasslari ustidan keng regex — bu ko'rmagan narsani jim buzib qo'yishning yo'li).
- Har mantiqiy bosqichdan keyin `typecheck` + `check-labs` ishlat.
- Ishlagan narsalarni buzma (P0 xavfsizlik, /start, stepperlar, sertifikat).
- Prod DB / secret / deploy — foydalanuvchiga qoldir, o'zing qilma.
- Har yangi matn 3 tilda (`t(en,uz,ru)`).
- **Hech narsa commit qilinmagan hozir** (63 fayl o'zgargan, ishchi daraxt "iflos"). Foydalanuvchi commit qilishni so'ramaguncha commit qilma.
