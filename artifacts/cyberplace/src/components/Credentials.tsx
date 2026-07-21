import { useId } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * The two credentials this platform issues, in their final form.
 *
 * A module certificate is restrained — the name is the only large thing on the
 * sheet, and everything else is the minimum a credential must carry. The
 * programme diploma is the ceremonial one: a ruled frame, corner flourishes,
 * serif display type, an engraved seal and a signature, in the dark brand and
 * carrying the verification furniture a modern credential needs.
 *
 * The hierarchy is deliberate. Eight certificates lead to one diploma, so the
 * diploma is the only one dressed for the occasion.
 *
 * Both are A4 landscape (1.414) and size their type in container units, so the
 * proportions hold from a phone to a full-width card. Wrap either in
 * `CredentialFrame`, which keeps a readable minimum width and scrolls inside
 * its own box — a fixed-proportion document cannot be squeezed onto a phone
 * without its fine print falling to a few pixels.
 */

export type CredentialData = {
  fullName: string;
  /** Module title, or the programme name on a diploma. */
  subject: string;
  score: number;
  serial: string;
  issued: string;
  verifyUrl: string;
  /** Scanned signature, black ink; inverted for the dark sheet. */
  signature?: string;
};

export type CredentialLabels = {
  title: string;      // "Certificate of Completion" / "Diploma"
  certifies: string;  // "This certifies that"
  completed: string;  // "has completed the module" / "…the full programme — all 8 modules"
  scoreLabel: string; // "Final score" / "Programme average"
  issued: string;     // "Issued"
  signatory: string;  // "Hikmatbek Yusupov · Director"
};

/** Keeps a document readable on small screens without the page scrolling. */
export function CredentialFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-6 px-6 pb-2">
      <div className="min-w-[680px]">{children}</div>
    </div>
  );
}

function QrBlock({ dark }: { dark: string }) {
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

function SignatureMark({ src }: { src?: string }) {
  return src
    ? <img src={src} alt="" className="w-[13cqw] h-[3cqw] object-contain object-left invert brightness-125 opacity-90" />
    : (
      <svg viewBox="0 0 200 46" className="w-[13cqw] h-[3cqw]" fill="none" aria-hidden="true">
        <path d="M8 34c14-22 22 6 30-6s10 12 20 2 14-16 22-6 8 14 18 8 16-18 26-10 12 12 22 6"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
    );
}

/* ── Module certificate — restrained ─────────────────────────────────────── */
export function ModuleCertificate({ d, l }: { d: CredentialData; l: CredentialLabels }) {
  return (
    <article
      className="@container relative w-full aspect-[1.414/1] bg-[#0B0713] text-[#F3F2F8] shadow-2xl select-none"
      data-testid="sheet-certificate"
    >
      <div className="absolute inset-[3%] border border-white/10" />

      <div className="relative h-full flex flex-col px-[9%] py-[7%]">
        <div className="flex items-baseline justify-between">
          <div className="font-bold text-[1.5cqw] tracking-tight">
            <span style={{ color: "#9064F7" }}>cd</span><span className="opacity-45">CTF</span>
          </div>
          <div className="font-mono text-[0.95cqw] tracking-[0.4em] uppercase opacity-55">{l.title}</div>
        </div>

        <div className="mt-auto mb-auto">
          <div className="font-mono text-[0.95cqw] tracking-[0.3em] uppercase opacity-55">{l.certifies}</div>
          <h1 className="font-serif text-[5.4cqw] leading-[1.05] mt-[1.4%]" data-testid="text-certificate-name">
            {d.fullName}
          </h1>
          <div className="w-[9cqw] h-[2px] mt-[2.6%]" style={{ background: "linear-gradient(90deg,#9064F7,#468AF6)" }} />
          <p className="text-[1.7cqw] mt-[3%] opacity-80">
            <span data-testid="text-certificate-module">{d.subject}</span>
            <span className="opacity-40"> · </span>
            <span className="font-mono tabular-nums" style={{ color: "#A78BFA" }} data-testid="text-certificate-score">
              {d.score}%
            </span>
          </p>
        </div>

        <div className="w-full flex items-end justify-between gap-[4%] pt-[2.4%] border-t border-white/15">
          <div className="min-w-0">
            <SignatureMark src={d.signature} />
            <div className="font-mono text-[0.95cqw] tracking-[0.2em] uppercase opacity-62 mt-[4%] truncate">
              {l.signatory}
            </div>
          </div>

          <div className="text-center shrink-0">
            <div className="font-mono text-[0.95cqw] tracking-[0.2em] uppercase opacity-62">{l.issued}</div>
            <div className="font-mono text-[1.1cqw] mt-[6%] tabular-nums">{d.issued}</div>
          </div>

          <div className="flex items-center gap-[1cqw] shrink-0">
            <div className="text-right">
              <div className="font-mono text-[1.05cqw] tracking-wider" style={{ color: "#A78BFA" }}
                data-testid="text-certificate-serial">{d.serial}</div>
              <div className="font-mono text-[0.9cqw] opacity-62 mt-[6%]">{d.verifyUrl}</div>
            </div>
            <div className="w-[6cqw] aspect-square bg-white p-[0.35cqw] shrink-0"><QrBlock dark="#0B0713" /></div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── Programme diploma — ceremonial ──────────────────────────────────────── */
export function ProgrammeDiploma({ d, l }: { d: CredentialData; l: CredentialLabels }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <article
      className="@container relative w-full aspect-[1.414/1] overflow-hidden bg-[#0E0916] text-[#F3F2F8] shadow-2xl select-none"
      data-testid="sheet-diploma"
    >
      {/* aurora, kept low so the ruled frame stays crisp over it */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(65% 80% at 12% -8%, rgba(144,100,247,0.30), transparent 62%)," +
          "radial-gradient(55% 70% at 100% 108%, rgba(70,138,246,0.24), transparent 62%)",
      }} />

      <div className="relative w-full h-full p-[2.6%]">
        <div className="w-full h-full border border-[#9064F7]/45 p-[1.5%]">
          <div className="w-full h-full border border-[#9064F7]/20 flex flex-col items-center px-[6%] py-[4%] relative">

            {[["top-0 left-0", ""], ["top-0 right-0", "scale-x-[-1]"],
              ["bottom-0 left-0", "scale-y-[-1]"], ["bottom-0 right-0", "scale-[-1]"]].map(([pos, flip], k) => (
              <svg key={k} className={`absolute ${pos} ${flip} w-[4.5cqw] h-[4.5cqw] text-[#9064F7]/55`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M0 12V0h12" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 18V5h13" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
              </svg>
            ))}

            {/* verification, tucked into the ruled area */}
            <div className="absolute top-[3%] right-[3%] w-[9%] aspect-square bg-white rounded p-[0.6%]">
              <QrBlock dark="#0E0916" />
            </div>

            <div className="font-mono text-[1.25cqw] tracking-[0.42em] uppercase mb-[1.6%]"
              style={{ backgroundImage: "linear-gradient(90deg,#9064F7,#468AF6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              cdCTF Academy
            </div>
            <h1 className="font-serif text-[3.1cqw] leading-tight tracking-wide">{l.title}</h1>
            <div className="w-[16%] h-px bg-gradient-to-r from-transparent via-[#9064F7] to-transparent my-[2.4%]" />

            <p className="text-[1.3cqw] text-white/62">{l.certifies}</p>
            <div className="font-serif text-[4.6cqw] leading-[1.1] mt-[1%] mb-[2.4%]" data-testid="text-diploma-name">
              {d.fullName}
            </div>
            <p className="text-[1.3cqw] text-white/62 text-center max-w-[80%]">{l.completed}</p>
            <div className="font-serif italic text-[2.2cqw] text-white/90 mt-[0.8%]">{d.subject}</div>

            <div className="w-full flex items-end justify-between mt-auto">
              <div className="text-left">
                <div className="text-[2.5cqw] font-semibold tabular-nums leading-none"
                  style={{ backgroundImage: "linear-gradient(90deg,#9064F7,#468AF6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                  data-testid="text-diploma-score">
                  {d.score}%
                </div>
                <div className="text-[1cqw] uppercase tracking-[0.22em] text-white/60 mt-[8%]">{l.scoreLabel}</div>
              </div>

              {/* engraved seal */}
              <svg viewBox="0 0 100 100" className="w-[13%] shrink-0 -mb-[1%]" aria-hidden="true">
                <defs>
                  <linearGradient id={`${uid}seal`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9064F7" /><stop offset="100%" stopColor="#468AF6" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 24 }).map((_, k) => (
                  <rect key={k} x="48" y="3" width="4" height="13" rx="2" fill={`url(#${uid}seal)`} opacity="0.5"
                    transform={`rotate(${k * 15} 50 50)`} />
                ))}
                <circle cx="50" cy="50" r="34" fill={`url(#${uid}seal)`} />
                <circle cx="50" cy="50" r="27" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.6" />
                <path d="M41 50l6.5 6.5L61 43" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="text-right min-w-0">
                <div className="flex justify-end"><SignatureMark src={d.signature} /></div>
                <div className="w-[13cqw] border-t border-white/35 ml-auto mt-[1%]" />
                <div className="text-[1cqw] uppercase tracking-[0.22em] text-white/60 mt-[4%] truncate">{l.signatory}</div>
                <div className="text-[1cqw] uppercase tracking-[0.22em] text-white/60 mt-[2%]">{l.issued} {d.issued}</div>
              </div>
            </div>

            <div className="flex items-center gap-[1.2cqw] mt-[2.4%] font-mono text-[1.02cqw] text-white/62">
              <ShieldCheck className="w-[1.4cqw] h-[1.4cqw] text-[#A78BFA]" />
              <span className="text-white/80" data-testid="text-diploma-serial">{d.serial}</span>
              <span className="text-white/30">·</span>
              <span>{d.verifyUrl}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
