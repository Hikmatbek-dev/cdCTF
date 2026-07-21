import type { CertData } from "@/components/CertificateDesigns";

/**
 * The restrained pair.
 *
 * The security-print treatment stacked guilloche, hex mesh, microtext, UV
 * threads, an emblem, a stamp and a stats strip onto one sheet. Every piece
 * was defensible on its own; together they left nowhere for the eye to rest.
 *
 * This strips all of it. What survives is only what a certificate has to say —
 * who, what, how well, when, and how to check it — set in a lot of empty space
 * with a single hairline rule and one accent. The name is the only large thing on
 * the page, which is the whole point of the document.
 *
 * Kept deliberately: the serif (it is a document, not a web page), the mono for
 * anything machine-checkable, and the QR, because a credential nobody can
 * verify is not worth issuing.
 */

function QR({ dark }: { dark: string }) {
  return (
    <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="21" height="21" fill="#fff" />
      {[[0, 0], [14, 0], [0, 14]].map(([x, y], k) => (
        <g key={k}>
          <rect x={x} y={y} width="7" height="7" fill={dark} />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill={dark} />
        </g>
      ))}
      {Array.from({ length: 96 }).map((_, k) => {
        const x = 1 + ((k * 7) % 19), y = 1 + ((k * 11) % 19);
        if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return null;
        return <rect key={k} x={x} y={y} width="1" height="1" fill={dark} />;
      })}
    </svg>
  );
}

function Foot({ d, accent, dark }: { d: CertData; accent: string; dark: string }) {
  return (
    <div className="w-full flex items-end justify-between gap-[4%] pt-[2.4%] border-t border-current/15">
      {/* signature */}
      <div className="min-w-0">
        {d.directorSig
          ? <img src={d.directorSig} alt="" className="w-[12cqw] h-[2.6cqw] object-contain object-left invert brightness-125 opacity-90" />
          : <svg viewBox="0 0 200 40" className="w-[12cqw] h-[2.6cqw]" fill="none" aria-hidden="true">
              <path d="M8 30c14-20 22 6 30-5s10 11 20 2 14-15 22-5 8 13 18 7 16-16 26-9 12 11 22 6"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            </svg>}
        <div className="font-mono text-[0.95cqw] tracking-[0.2em] uppercase opacity-60 mt-[4%] truncate">
          Hikmatbek Yusupov · Director
        </div>
      </div>

      <div className="text-center shrink-0">
        <div className="font-mono text-[0.95cqw] tracking-[0.2em] uppercase opacity-55">Issued</div>
        <div className="font-mono text-[1.1cqw] mt-[6%] tabular-nums">{d.issued}</div>
      </div>

      {/* verification */}
      <div className="flex items-center gap-[1cqw] shrink-0">
        <div className="text-right">
          <div className="font-mono text-[1.05cqw] tracking-wider" style={{ color: accent }}>{d.serial}</div>
          <div className="font-mono text-[0.9cqw] opacity-55 mt-[6%]">{d.verifyUrl}</div>
        </div>
        <div className="w-[6cqw] aspect-square bg-white p-[0.35cqw] shrink-0">
          <QR dark={dark} />
        </div>
      </div>
    </div>
  );
}

/** Module certificate — violet accent. */
export function CertificateCleanModule({ d }: { d: CertData }) {
  return (
    <div className="@container relative w-full aspect-[1.414/1] bg-[#0B0713] text-[#F3F2F8] shadow-2xl select-none">
      <div className="absolute inset-[3%] border border-white/10" />

      <div className="relative h-full flex flex-col px-[9%] py-[7%]">
        <div className="flex items-baseline justify-between">
          <div className="font-bold text-[1.5cqw] tracking-tight">
            <span style={{ color: "#9064F7" }}>cd</span><span className="opacity-45">CTF</span>
          </div>
          <div className="font-mono text-[0.95cqw] tracking-[0.4em] uppercase opacity-55">Certificate</div>
        </div>

        <div className="mt-auto mb-auto">
          <div className="font-mono text-[0.95cqw] tracking-[0.3em] uppercase opacity-55">Awarded to</div>
          <h1 className="font-serif text-[5.4cqw] leading-[1.05] mt-[1.4%]">{d.fullName}</h1>
          <div className="w-[9cqw] h-[2px] mt-[2.6%]" style={{ background: "linear-gradient(90deg,#9064F7,#468AF6)" }} />
          <p className="text-[1.7cqw] mt-[3%] opacity-80">
            {d.moduleTitle}
            <span className="opacity-40"> · </span>
            <span className="font-mono tabular-nums" style={{ color: "#A78BFA" }}>{d.score}%</span>
          </p>
        </div>

        <Foot d={d} accent="#A78BFA" dark="#0B0713" />
      </div>
    </div>
  );
}

/** Programme diploma — gold accent, and the one line only a diploma earns. */
export function CertificateCleanDiploma({ d }: { d: CertData }) {
  const n = d.moduleCount ?? d.modules?.length ?? 8;
  return (
    <div className="@container relative w-full aspect-[1.414/1] bg-[#0A0611] text-[#F5F1E4] shadow-2xl select-none">
      <div className="absolute inset-[3%] border border-[#D9BA6E]/25" />

      <div className="relative h-full flex flex-col px-[9%] py-[7%]">
        <div className="flex items-baseline justify-between">
          <div className="font-bold text-[1.5cqw] tracking-tight">
            <span style={{ color: "#D9BA6E" }}>cd</span><span className="opacity-45">CTF</span>
          </div>
          <div className="font-mono text-[0.95cqw] tracking-[0.4em] uppercase" style={{ color: "#D9BA6E" }}>Diploma</div>
        </div>

        <div className="mt-auto mb-auto">
          <div className="font-mono text-[0.95cqw] tracking-[0.3em] uppercase opacity-55">Conferred upon</div>
          <h1 className="font-serif text-[5.4cqw] leading-[1.05] mt-[1.4%]">{d.fullName}</h1>
          <div className="w-[9cqw] h-[2px] mt-[2.6%]" style={{ background: "linear-gradient(90deg,#D9BA6E,#F7ECC4)" }} />
          <p className="text-[1.7cqw] mt-[3%] opacity-80">
            {`Completed the full cybersecurity programme — all ${n} modules`}
            <span className="opacity-40"> · </span>
            <span className="font-mono tabular-nums" style={{ color: "#E8CE8A" }}>{d.score}%</span>
          </p>
        </div>

        <Foot d={d} accent="#E8CE8A" dark="#0A0611" />
      </div>
    </div>
  );
}
