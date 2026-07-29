# cdCTF Technical Audit & Debt Remediation Plan

Ushbu hujjat cdCTF platformasining joriy holatidagi UI/UX, funksional va arxitektura kamchiliklarini o'z ichiga oladi. Senior dasturchi darajasida tizimli hal qilish uchun priotizatsiya qilingan (P0 dan P2 gacha).


> **Status:** all items below completed. Verified with `pnpm run typecheck`,
> `pnpm run lint`, `pnpm --filter ./scripts run check-labs`, `pnpm --filter cyberplace run build`,
> and browser checks (light+dark, mobile 390px + desktop 1280px). Notes per item inline where a
> decision was made. Native `confirm()` was also removed from the user-facing Writeups and the
> account-delete flow; the remaining `confirm()`s are in staff-only admin utilities
> (AdminUsers/Ctf/Blocked/Curriculum) and were left as-is, outside this document's scope.

## 🔥 P0: Kritik blokerlar (Immediate Action Required)

- [x] **Mobil Layout Refactor (`AdminSidebar.tsx`)**:
  - **Muammo**: Sidebar qat'iy `w-64` qilib yozilgan, 400px dan kichik ekranlarda asosiy kontentga atigi ~100px joy qolib ketib, interfeys qulaydi.
  - **Yechim**: Shadcn/ui ning `<Sheet>` (Drawer) komponentini implementatsiya qilib, mobil ekranlarda sidebarni yashirish va burger menyuga o'tkazish.
- [x] **Viewport Overflow Fixes (`DashboardPage.tsx`, `SecurityPage.tsx`)**:
  - **Muammo**: `p-10 text-5xl` kabi qattiq padding/shrift o'lchamlari va `min-w-[20rem]` xususiyatlari gorizontal scroll (overflow) ga sabab bo'lyapti.
  - **Yechim**: Responsive Tailwind utilitalaridan foydalanish (masalan, `p-6 sm:p-10`, `text-3xl sm:text-5xl`) va rigid (qat'iy) minimum kengliklarni olib tashlash.
- [x] **Jobs API Routing (`api-server/src/routes/jobs.ts`)**:
  - **Muammo**: Detal sahifalar uchun `GET /api/jobs/:id` endpointi yo'q yoki UI da ulangan havolalar "o'lik".
  - **Yechim**: API endpointni yaratish yoki UI dagi bosiladigan kartalardagi havolalarni olib tashlash.

## ⚡ P1: Asosiy Funksional va UX Qarzlar (Core UX Debt)

- [x] **Karyera Paginatsiyasi (`TalentPage.tsx`, `JobsPage.tsx`)**:
  - **Muammo**: API va UI moslashmagan. UI 24 yoki 200 tadan keyin to'xtaydi, lekin qolgan ma'lumotlarni ko'rish imkonsiz.
  - **Yechim**: TanStack Query orqali sahifalash (cursor yoki offset/limit) mantig'ini mavjud `<Pagination>` komponenti bilan bog'lash.
- [x] **Native Alertlarni Yo'q qilish (`JobsPage.tsx`)**:
  - **Muammo**: Zamonaviy saytda bloklovchi `window.confirm()` ishlatilgan.
  - **Yechim**: Tasdiqlash oynalarini shadcn/ui ning `<AlertDialog>` komponentiga almashtirish.
- [x] **Visual State Parity (`ModuleDetailPage.tsx`)**:
  - **Muammo**: Yechilgan (solved) darslar holati `CtfListPage` da juda mukammal vizual qilingan bo'lsa-da, modul detallarida shunchaki oddiy yashil matn bilan ko'rsatilgan.
  - **Yechim**: Kengaytirilgan vizual holatni (border-color, badge va background highlight) ikkala sahifa o'rtasida sinxronlash/komponentga ajratish.
- [x] **A11y & i18n Hardcoded Strings**:
  - **Muammo**: Shadcn ibtidoyiy (primitive) komponentlari ichida "Close", "Loading" kabi yashirin (sr-only) inglizcha matnlar va tarjima qilinmagan xatoliklar qolib ketgan.
  - **Yechim**: Barcha qotib qolgan matnlarni kontekstual `t(en, uz, ru)` chaqiruvlari bilan o'rash.

## 🛠 P2: Arxitektura, Assetlar va O'lik Kodlar (Architecture & Assets)

- [x] **SVG Art Integration (`ChallengeArt.tsx`)**:
  - **Muammo**: OSINT yo'nalishi uchun vektor illustratsiyasi yo'q (kulrang joy chiqadi). Boshqa qimmatli vektorlar (cloud, mobile) loyihada umuman chaqirilmagan.
  - **Yechim**: OSINT uchun vektor chizish/topish va ishlatilmagan vektorlardan Empty State (ma'lumot yo'q) sahifalari uchun foydalanish.
- [x] **PWA & OpenGraph Meta (`site.webmanifest`, `index.html`)**:
  - **Muammo**: O'lchamlar aldanib qo'yilgan (2048x2048 rasm 192x192 deb atalgan, `og:image` esa SEO uchun noqulay 600x342).
  - **Yechim**: Ikonkalarni to'g'ri o'lchamlarda (192, 512) qayta generatsiya qilish va OpenGraph uchun standart 1200x630 hajmdagi rasmni ishlab chiqib ulash.
- [x] **O'lik Kodlarni Tozalash (Dead Code Elimination)**:
  - **Muammo**: `LessonTestPage.tsx` dagi yetib bo'lmaydigan blocklanish mantiqlari va `CompetitionsPage.tsx` dagi unused variable'lar.
  - **Yechim**: Loyihani keraksiz kodlardan tozalab optimizatsiya qilish (DCE).
- [x] **Hujjatlashtirish (Documentation Overhaul)**:
  - **Muammo**: `README.md` bo'sh, `replit.md` da eski arxitektura va eskizlar qolib ketgan.
  - **Yechim**: Yangi devlar (yoki AIning o'zi) loyihaga tushunishi uchun muhitni sozlash (setup), DB rotatsiyasi va arxitekturani tushuntiruvchi professional `README` yozish.
