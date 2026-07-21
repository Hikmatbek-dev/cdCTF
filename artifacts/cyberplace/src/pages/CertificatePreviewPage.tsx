import { CertificateHybrid, CertificateClassic, CertificateCredential, CertificateMinimal, type CertData } from "@/components/CertificateDesigns";
import { CertificatePremium, CertificateDiploma } from "@/components/CertificatePremium";

/** The diploma covers the whole programme, so it carries its own sample. */
const DIPLOMA: CertData = {
  fullName: "Hikmatbek Yusupov",
  moduleTitle: "cdCTF Cybersecurity Programme",
  score: 91,
  serial: "CDCTF-DIP-7B4E20A9",
  issued: "21.07.2026",
  verifyUrl: "cyberplace.uz/diploma/7B4E20A9",
  moduleCount: 8,
  modules: [
    "Linux", "Networking", "Web Security", "Cryptography",
    "Recon", "Exploitation", "Forensics & IR", "CTF Methodology",
  ],
};

/**
 * A side-by-side of the three certificate treatments, so the look can be picked
 * by seeing it. Temporary: once one is chosen it becomes CertificatePage and
 * this page and its route come out.
 */
const SAMPLE: CertData = {
  fullName: "Hikmatbek Yusupov",
  moduleTitle: "Linux Command Line for Security",
  score: 93,
  serial: "CDCTF-2F9A41C7",
  issued: "21.07.2026",
  verifyUrl: "cyberplace.uz/certificate/2F9A41C7",
  rank: "#12",
  difficulty: "Beginner",
  hours: "40h",
  level: "01 / 08",
};

const VARIANTS = [
  {
    key: "★★",
    name: "Dastur diplomi — yakuniy, eng yuqori maqom",
    note: "Butun dastur uchun. Oltin yetakchi, binafsha yordamchi. Dafna gulchambari, sakkiz modulning sharaf ro'yxati va dastur o'rtachasi — bularni faqat diplom ko'tara oladi.",
    Comp: CertificateDiploma,
    data: DIPLOMA,
  },
  {
    key: "★",
    name: "Modul sertifikati — premium security print",
    note: "Bitta modul uchun. Guilloche naqsh, hex to'r, mikromatn, UV chiziqlar, oltin folga, kiber emblema, ikkita imzo va muhr, yutuq statistikasi.",
    Comp: CertificatePremium,
  },
  {
    key: "A+B",
    name: "Klassik diplom × zamonaviy credential",
    note: "Bezakli ramka, burchak naqshlari, serif shrift, muhr va imzo chizig'i — qorong'i brend ustida, QR va tekshirish havolasi bilan. Chop etsa ham, ulashsa ham yarashadi.",
    Comp: CertificateHybrid,
  },
  {
    key: "A",
    name: "Klassik diplom",
    note: "Gorizontal, bezakli ramka, serif shrift, muhr va imzo chizig'i. Chop etib devorga osiladigan.",
    Comp: CertificateClassic,
  },
  {
    key: "B",
    name: "Zamonaviy credential",
    note: "Qorong'i, gradient, QR va tekshirish havolasi oldinda. LinkedIn'ga qo'yish uchun.",
    Comp: CertificateCredential,
  },
  {
    key: "C",
    name: "Minimal editorial",
    note: "Ko'p bo'sh joy, juda katta ism, bitta akssent chiziq. Zamonaviy va qimmat.",
    Comp: CertificateMinimal,
  },
];

export default function CertificatePreviewPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="eyebrow mb-3">{"Namuna · tanlash uchun"}</div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Sertifikat dizayni</h1>
        <p className="text-muted-foreground mb-14 max-w-2xl">
          Uchta variant, bir xil ma'lumot bilan. Qaysi biri yoqsa — harfini ayting (A, B yoki C),
          o'shanisini haqiqiy sertifikat sahifasiga qo'yaman.
        </p>

        <div className="space-y-16">
          {VARIANTS.map(({ key, name, note, Comp, data }) => (
            <section key={key} data-testid={`cert-variant-${key}`}>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-2xl font-bold gradient-text">{key}</span>
                <h2 className="text-xl font-semibold">{name}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5 max-w-2xl">{note}</p>
              {/* A certificate is a fixed-proportion document: squeezed into a
                  phone its fine print falls to ~3px. So it keeps a readable
                  minimum width and scrolls inside its own box — the page
                  itself never scrolls sideways. */}
              <div className="overflow-x-auto -mx-6 px-6 pb-2">
                <div className="min-w-[680px]">
                  <Comp d={data ?? SAMPLE} />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
