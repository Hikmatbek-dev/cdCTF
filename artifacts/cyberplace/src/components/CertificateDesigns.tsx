import { useId } from "react";
import { ShieldCheck, Check } from "lucide-react";

/**
 * Three certificate treatments, so the look can be chosen by seeing it rather
 * than described. Each takes the same data and is self-contained; whichever
 * wins becomes the body of CertificatePage.
 */

export type CertData = {
  fullName: string;
  moduleTitle: string;
  score: number;
  serial: string;
  issued: string;
  verifyUrl: string;
  /* Achievement strip — only the premium treatment uses these. */
  rank?: string;
  difficulty?: string;
  hours?: string;
  level?: string;
};

/* ── A+B · The hybrid ─────────────────────────────────────────────────────
   The ceremony of the classic diploma — ruled frame, corner flourishes, serif
   display type, an engraved seal and a signature line — rendered in the dark
   brand, and carrying the credential's verification furniture (QR, serial,
   public URL). Formal enough to print, modern enough to post.               */
export function CertificateHybrid({ d }: { d: CertData }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div className="@container w-full aspect-[1.414/1] relative overflow-hidden bg-[#0E0916] text-[#F3F2F8] shadow-2xl">
      {/* aurora, kept low so the ruled frame stays crisp over it */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(65% 80% at 12% -8%, rgba(144,100,247,0.30), transparent 62%)," +
          "radial-gradient(55% 70% at 100% 108%, rgba(70,138,246,0.24), transparent 62%)",
      }} />

      <div className="relative w-full h-full p-[2.6%]">
        <div className="w-full h-full border border-[#9064F7]/45 p-[1.5%]">
          <div className="w-full h-full border border-[#9064F7]/20 flex flex-col items-center px-[6%] py-[4%] relative">

            {/* corner flourishes */}
            {[["top-0 left-0", ""], ["top-0 right-0", "scale-x-[-1]"], ["bottom-0 left-0", "scale-y-[-1]"], ["bottom-0 right-0", "scale-[-1]"]].map(([pos, flip], i) => (
              <svg key={i} className={`absolute ${pos} ${flip} w-[4.5cqw] h-[4.5cqw] text-[#9064F7]/55`} viewBox="0 0 32 32" fill="none">
                <path d="M0 12V0h12" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 18V5h13" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
              </svg>
            ))}

            {/* QR, tucked into the top-right of the ruled area */}
            <div className="absolute top-[3%] right-[3%] w-[9%] aspect-square bg-white rounded p-[0.6%]">
              <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges" aria-hidden="true">
                <rect width="21" height="21" fill="#fff" />
                {[[0, 0], [14, 0], [0, 14]].map(([x, y], i) => (
                  <g key={i}>
                    <rect x={x} y={y} width="7" height="7" fill="#0E0916" />
                    <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
                    <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0E0916" />
                  </g>
                ))}
                {Array.from({ length: 88 }).map((_, i) => {
                  const x = 1 + ((i * 7) % 19), y = 1 + ((i * 11) % 19);
                  if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return null;
                  return <rect key={i} x={x} y={y} width="1" height="1" fill="#0E0916" />;
                })}
              </svg>
            </div>

            {/* masthead */}
            <div className="font-mono text-[1.25cqw] tracking-[0.42em] uppercase mb-[1.6%]"
              style={{ background: "linear-gradient(90deg,#9064F7,#468AF6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              cdCTF Academy
            </div>
            <h1 className="font-serif text-[3.1cqw] leading-tight tracking-wide">Certificate of Completion</h1>
            <div className="w-[16%] h-px bg-gradient-to-r from-transparent via-[#9064F7] to-transparent my-[2.4%]" />

            {/* recipient */}
            <p className="text-[1.3cqw] text-white/55">This certifies that</p>
            <div className="font-serif text-[4.6cqw] leading-[1.1] mt-[1%] mb-[2.4%]">{d.fullName}</div>
            <p className="text-[1.3cqw] text-white/55">has successfully completed the module</p>
            <div className="font-serif italic text-[2.2cqw] text-white/90 mt-[0.8%]">{d.moduleTitle}</div>

            {/* score · seal · signature */}
            <div className="w-full flex items-end justify-between mt-auto">
              <div className="text-left">
                <div className="text-[2.5cqw] font-semibold tabular-nums leading-none"
                  style={{ background: "linear-gradient(90deg,#9064F7,#468AF6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  {d.score}%
                </div>
                <div className="text-[1cqw] uppercase tracking-[0.22em] text-white/60 mt-[8%]">Final score</div>
              </div>

              <svg viewBox="0 0 100 100" className="w-[13%] shrink-0 -mb-[1%]" aria-hidden="true">
                <defs>
                  <linearGradient id={`hseal${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9064F7" />
                    <stop offset="100%" stopColor="#468AF6" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 24 }).map((_, i) => (
                  <rect key={i} x="48" y="3" width="4" height="13" rx="2" fill={`url(#hseal${id})`} opacity="0.5"
                    transform={`rotate(${i * 15} 50 50)`} />
                ))}
                <circle cx="50" cy="50" r="34" fill={`url(#hseal${id})`} />
                <circle cx="50" cy="50" r="27" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.6" />
                <path d="M41 50l6.5 6.5L61 43" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="text-right">
                <div className="w-[15cqw] border-b border-white/35 mb-[3%]" />
                <div className="text-[1cqw] uppercase tracking-[0.22em] text-white/60">Issued {d.issued}</div>
              </div>
            </div>

            {/* verification line */}
            <div className="flex items-center gap-[1.2cqw] mt-[2.4%] font-mono text-[1.02cqw] text-white/50">
              <ShieldCheck className="w-[1.4cqw] h-[1.4cqw] text-[#A78BFA]" />
              <span className="text-white/75">{d.serial}</span>
              <span className="text-white/25">·</span>
              <span>{d.verifyUrl}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── A · Classic diploma ──────────────────────────────────────────────────
   Landscape, ruled border, serif display type, an engraved seal and a
   signature line. The one you would print and hang.                        */
export function CertificateClassic({ d }: { d: CertData }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div className="@container w-full aspect-[1.414/1] bg-[#FDFCFB] text-[#1C1528] p-[3%] shadow-2xl">
      <div className="w-full h-full border-2 border-[#9064F7]/50 p-[2%]">
        <div className="w-full h-full border border-[#9064F7]/25 flex flex-col items-center justify-center text-center px-[7%] relative">

          {/* corner flourishes */}
          {[["top-0 left-0", ""], ["top-0 right-0", "scale-x-[-1]"], ["bottom-0 left-0", "scale-y-[-1]"], ["bottom-0 right-0", "scale-[-1]"]].map(([pos, flip], i) => (
            <svg key={i} className={`absolute ${pos} ${flip} w-8 h-8 text-[#9064F7]/40`} viewBox="0 0 32 32" fill="none">
              <path d="M0 12V0h12" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 18V5h13" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            </svg>
          ))}

          <div className="font-serif text-[1.5cqw] tracking-[0.35em] uppercase text-[#9064F7] mb-[1.5%]">
            cdCTF Academy
          </div>
          <h1 className="font-serif text-[3.4cqw] leading-tight mb-[1%]">
            Certificate of Completion
          </h1>
          <div className="w-[18%] h-px bg-[#9064F7]/40 mb-[3.5%]" />

          <p className="text-[1.35cqw] text-[#5A5170] mb-[1.5%]">This certifies that</p>
          <div className="font-serif text-[4.4cqw] leading-none mb-[3%]">{d.fullName}</div>

          <p className="text-[1.35cqw] text-[#5A5170] mb-[1%]">has successfully completed the module</p>
          <div className="font-serif text-[2.3cqw] italic mb-[4%]">{d.moduleTitle}</div>

          {/* seal · score · signature */}
          <div className="w-full flex items-end justify-between mt-auto pt-[2%]">
            <div className="text-left">
              <div className="text-[2.6cqw] font-serif leading-none">{d.score}%</div>
              <div className="text-[1.1cqw] uppercase tracking-widest text-[#5A5170] mt-1">Final score</div>
            </div>

            <svg viewBox="0 0 100 100" className="w-[11%] shrink-0" aria-hidden="true">
              <defs>
                <linearGradient id={`seal${id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9064F7" />
                  <stop offset="100%" stopColor="#468AF6" />
                </linearGradient>
              </defs>
              {/* rosette */}
              {Array.from({ length: 24 }).map((_, i) => (
                <rect key={i} x="48" y="4" width="4" height="12" rx="2" fill={`url(#seal${id})`} opacity="0.55"
                  transform={`rotate(${i * 15} 50 50)`} />
              ))}
              <circle cx="50" cy="50" r="34" fill={`url(#seal${id})`} />
              <circle cx="50" cy="50" r="27" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.65" />
              <path d="M42 50l6 6 12-13" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="text-right">
              <div className="w-[13cqw] border-b border-[#1C1528]/40 mb-1" />
              <div className="text-[1.1cqw] uppercase tracking-widest text-[#5A5170]">Issued {d.issued}</div>
            </div>
          </div>

          <div className="font-mono text-[1cqw] text-[#5A5170] mt-[2%]">{d.serial}</div>
        </div>
      </div>
    </div>
  );
}

/* ── B · Modern credential ────────────────────────────────────────────────
   Dark, verification-first: the serial and the check are the subject, the
   way a LinkedIn-shareable badge works.                                    */
export function CertificateCredential({ d }: { d: CertData }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div className="@container w-full aspect-[1.414/1] rounded-2xl overflow-hidden shadow-2xl relative bg-[#0E0916] text-[#F3F2F8]">
      {/* aurora */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(70% 90% at 15% -10%, rgba(144,100,247,0.35), transparent 65%), radial-gradient(60% 80% at 100% 110%, rgba(70,138,246,0.28), transparent 65%)",
      }} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9064F7] to-[#468AF6]" />

      <div className="relative h-full flex flex-col p-[5%]">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-[2cqw] tracking-tight">
              <span className="bg-gradient-to-r from-[#9064F7] to-[#468AF6] bg-clip-text text-transparent">cd</span>
              <span className="text-white/60">CTF</span>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-[3%] text-[1.15cqw] font-medium uppercase tracking-[0.2em] text-[#A78BFA]">
              <ShieldCheck className="w-[1.5cqw] h-[1.5cqw]" /> Verified credential
            </div>
          </div>

          {/* QR-styled block — a real QR is generated server-side on issue */}
          <div className="w-[13%] aspect-square bg-white rounded-lg p-[1%] shrink-0">
            <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges" aria-hidden="true">
              <rect width="21" height="21" fill="#fff" />
              {[[0, 0], [14, 0], [0, 14]].map(([x, y], i) => (
                <g key={i}>
                  <rect x={x} y={y} width="7" height="7" fill="#1C1528" />
                  <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
                  <rect x={x + 2} y={y + 2} width="3" height="3" fill="#1C1528" />
                </g>
              ))}
              {Array.from({ length: 90 }).map((_, i) => {
                const x = 1 + ((i * 7) % 19), y = 1 + ((i * 11) % 19);
                if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return null;
                return <rect key={i} x={x} y={y} width="1" height="1" fill="#1C1528" />;
              })}
            </svg>
          </div>
        </div>

        <div className="mt-auto">
          <div className="text-[1.2cqw] text-white/50 mb-[1%]">Awarded to</div>
          <div className="text-[4.2cqw] font-bold leading-none tracking-tight mb-[3%]">{d.fullName}</div>
          <div className="text-[1.9cqw] font-medium text-white/85 mb-[4%]">{d.moduleTitle}</div>

          <div className="flex items-end justify-between border-t border-white/10 pt-[3%]">
            <div className="flex items-center gap-[5%]">
              <div>
                <div className="text-[1cqw] uppercase tracking-widest text-white/40">Score</div>
                <div className="text-[2.4cqw] font-bold tabular-nums bg-gradient-to-r from-[#9064F7] to-[#468AF6] bg-clip-text text-transparent">{d.score}%</div>
              </div>
              <div>
                <div className="text-[1cqw] uppercase tracking-widest text-white/40">Issued</div>
                <div className="text-[1.5cqw] font-medium tabular-nums">{d.issued}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[1.15cqw] text-white/70">{d.serial}</div>
              <div className="font-mono text-[1cqw] text-white/35">{d.verifyUrl}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-0 h-0" id={`anchor${id}`} />
    </div>
  );
}

/* ── C · Minimal editorial ────────────────────────────────────────────────
   Almost nothing on the page: enormous type, one accent rule, wide margins. */
export function CertificateMinimal({ d }: { d: CertData }) {
  return (
    <div className="@container w-full aspect-[1.414/1] bg-[#FAF8FB] text-[#1C1528] shadow-2xl flex flex-col justify-between p-[8%]">
      <div className="flex items-start justify-between">
        <div className="text-[1.15cqw] uppercase tracking-[0.4em] text-[#5A5170]">Certificate</div>
        <div className="font-bold text-[1.6cqw] tracking-tight">
          <span className="text-[#662FC6]">cd</span><span className="text-[#5A5170]">CTF</span>
        </div>
      </div>

      <div>
        <div className="text-[6cqw] font-bold leading-[0.95] tracking-[-0.03em] mb-[3%]">
          {d.fullName}
        </div>
        <div className="w-[22%] h-[3px] bg-gradient-to-r from-[#662FC6] to-[#1453DB] mb-[4%]" />
        <div className="text-[2.1cqw] leading-snug text-[#3B3350] max-w-[70%]">
          completed <span className="font-semibold text-[#1C1528]">{d.moduleTitle}</span> with a score of{" "}
          <span className="font-semibold text-[#662FC6] tabular-nums">{d.score}%</span>.
        </div>
      </div>

      <div className="flex items-end justify-between text-[1.15cqw] text-[#5A5170]">
        <div className="flex items-center gap-2">
          <Check className="w-[1.5cqw] h-[1.5cqw] text-[#662FC6]" />
          <span className="font-mono">{d.serial}</span>
        </div>
        <div className="tabular-nums">{d.issued}</div>
      </div>
    </div>
  );
}
