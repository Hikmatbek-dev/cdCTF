import { useId } from "react";
import type { CertData } from "@/components/CertificateDesigns";

/**
 * The security-printing treatment: a certificate built the way a banknote or a
 * passport page is, then dressed in the CTF identity.
 *
 * Everything here is drawn — guilloche rosettes, hex mesh, microtext, the
 * emblem — so it stays crisp at print resolution, re-colours with the brand,
 * and adds no download. The layers, back to front:
 *
 *   1. vignette + centre spotlight   (lighting)
 *   2. blueprint hex mesh            (cyber ground)
 *   3. two guilloche rosettes        (the spirograph curves on currency)
 *   4. binary/hex ribbons            (CTF identity, whispered)
 *   5. microtext rules               (the line that looks solid until you zoom)
 *   6. content
 *
 * Type is a deliberate three-way pairing, each with one job: a serif for the
 * ceremony, mono for anything machine-checkable (serial, URL, stats), and the
 * UI sans for nothing at all — it is kept out so the card never reads as a web
 * page. Tracking widens as size drops, which is what keeps small caps legible.
 */

/* Spirograph (hypotrochoid) — the curve engine-turned onto banknotes. */
function guilloche(R: number, r: number, d: number, turns = 12, steps = 900) {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const k = (R - r) / r;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return "M" + pts.join("L");
}

const MICRO = "CDCTF·VERIFIED·CREDENTIAL·CYBERPLACE.UZ·";

export function CertificatePremium({ d }: { d: CertData }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const i = (n: string) => `${uid}${n}`;

  return (
    <div className="@container relative w-full aspect-[1.414/1] overflow-hidden bg-[#0B0713] text-[#F3F2F8] shadow-2xl select-none">

      {/* ── 1 · security ground ─────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1414 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={i("foil")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B6CF0" /><stop offset="28%" stopColor="#63D8F5" />
            <stop offset="52%" stopColor="#F0DFA8" /><stop offset="76%" stopColor="#63D8F5" />
            <stop offset="100%" stopColor="#8B6CF0" />
          </linearGradient>
          <linearGradient id={i("brand")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9064F7" /><stop offset="100%" stopColor="#468AF6" />
          </linearGradient>
          <pattern id={i("hex")} width="56" height="48.5" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
            <path d="M28 0l24 14v28L28 56 4 42V14z" fill="none" stroke="#9064F7" strokeWidth="0.8" opacity="0.085" />
          </pattern>
          <radialGradient id={i("spot")} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.075" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0.012" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={i("vig")} cx="50%" cy="45%" r="72%">
            <stop offset="45%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.62" />
          </radialGradient>
        </defs>

        {/* Blueprint mesh, faint enough to be texture rather than pattern. */}
        <rect width="1414" height="1000" fill={`url(#${i("hex")})`} />

        {/* Guilloche rosettes, bled off two opposite corners like a banknote.
            A third sat dead centre, directly behind the recipient's name —
            the one place on the sheet that has to stay quiet — so it is gone.
            Ornament belongs in the margins; the centre belongs to the name. */}
        <g stroke={`url(#${i("brand")})`} fill="none" strokeWidth="0.45" opacity="0.28">
          <g transform="translate(120,880)"><path d={guilloche(150, 47, 78, 14)} /></g>
          <g transform="translate(1300,140)"><path d={guilloche(130, 41, 66, 13)} /></g>
        </g>

        {/* lighting */}
        <rect width="1414" height="1000" fill={`url(#${i("spot")})`} />
        <rect width="1414" height="1000" fill={`url(#${i("vig")})`} />
      </svg>

      {/* ── 2 · frame + microtext ───────────────────────────────────── */}
      <div className="absolute inset-[2.2%] border border-[#9064F7]/45" />
      <div className="absolute inset-[3.2%] border border-[#63D8F5]/12" />

      <svg className="absolute inset-[2.2%] w-auto h-auto" style={{ width: "95.6%", height: "95.6%" }} viewBox="0 0 1000 700" aria-hidden="true">
        <defs>
          <path id={i("mt")} d="M14 14 H986 V686 H14 Z" />
        </defs>
        {/* Reads as a hairline rule until magnified — the passport trick. */}
        <text fontSize="5.4" fill="#9064F7" opacity="0.4" letterSpacing="1.1" fontFamily="ui-monospace, monospace">
          <textPath href={`#${i("mt")}`}>{MICRO.repeat(26)}</textPath>
        </text>
      </svg>

      {/* corner flourishes */}
      {[["top-[2.2%] left-[2.2%]", ""], ["top-[2.2%] right-[2.2%]", "scale-x-[-1]"],
        ["bottom-[2.2%] left-[2.2%]", "scale-y-[-1]"], ["bottom-[2.2%] right-[2.2%]", "scale-[-1]"]].map(([pos, flip], k) => (
        <svg key={k} className={`absolute ${pos} ${flip} w-[6cqw] h-[6cqw]`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path d="M0 14V0h14" stroke="#9064F7" strokeWidth="1.4" opacity="0.75" />
          <path d="M6 21V6h15" stroke="#63D8F5" strokeWidth="0.7" opacity="0.4" />
          <circle cx="6" cy="6" r="1.6" fill="#F0DFA8" opacity="0.75" />
        </svg>
      ))}

      {/* ── 3 · content ─────────────────────────────────────────────── */}
      <div className="relative h-full flex flex-col items-center px-[7.5%] py-[5.5%]">

        {/* masthead */}
        <div className="flex items-center gap-[1.6cqw]">
          <span className="h-px w-[5cqw] bg-gradient-to-r from-transparent to-[#9064F7]/70" />
          <span className="font-mono text-[1.15cqw] tracking-[0.5em] uppercase"
            style={{ backgroundImage: "linear-gradient(90deg,#9064F7,#63D8F5)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            cdCTF Academy
          </span>
          <span className="h-px w-[5cqw] bg-gradient-to-l from-transparent to-[#9064F7]/70" />
        </div>

        <h1 className="font-serif text-[2.9cqw] leading-tight tracking-[0.08em] mt-[1.4%]">
          Certificate of Completion
        </h1>

        {/* emblem */}
        <Emblem uid={uid} />

        {/* recipient — foil + emboss */}
        <p className="font-mono text-[1.02cqw] tracking-[0.3em] uppercase text-white/50 mt-[1.2%]">
          This certifies that
        </p>
        <div
          className="font-serif text-[4.5cqw] leading-[1.12] mt-[0.6%]"
          style={{
            backgroundImage: "linear-gradient(100deg,#C9A961 0%,#F7ECC4 22%,#FFFDF4 38%,#E8D9A0 52%,#F7ECC4 70%,#C9A961 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.22)) drop-shadow(0 -1px 1px rgba(0,0,0,0.55)) drop-shadow(0 3px 12px rgba(201,169,97,0.30))",
          }}
        >
          {d.fullName}
        </div>

        <p className="font-mono text-[1.02cqw] tracking-[0.3em] uppercase text-white/50 mt-[1.4%]">
          has completed the module
        </p>
        <div className="font-serif italic text-[2.1cqw] text-white/95 mt-[0.5%]">{d.moduleTitle}</div>

        {/* achievement strip */}
        <div className="w-full mt-[2.6%] grid grid-cols-5 border-y border-white/12">
          {[
            ["Rank", d.rank ?? "—"],
            ["Score", `${d.score}%`],
            ["Difficulty", d.difficulty ?? "—"],
            ["Time", d.hours ?? "—"],
            ["Level", d.level ?? "—"],
          ].map(([label, value], k) => (
            <div key={label} className={`py-[1.6%] text-center ${k > 0 ? "border-l border-white/10" : ""}`}>
              <div className="font-mono text-[0.98cqw] tracking-[0.24em] uppercase text-white/55">{label}</div>
              <div className="font-mono text-[1.5cqw] font-semibold tabular-nums mt-[6%]"
                style={k === 1
                  ? { backgroundImage: "linear-gradient(90deg,#9064F7,#63D8F5)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                  : { color: "#EDEAF7" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* signatures · verification block */}
        <div className="w-full mt-auto flex items-end justify-between gap-[3%]">
          <Signature name="Hikmatbek Yusupov" role="Academy Director" uid={uid} src={d.directorSig} stamp />
          <Signature name="A. Karimov" role="Lead Instructor" uid={uid} src={d.instructorSig} />

          {/* the ID block, given its own plate */}
          <div className="shrink-0 flex items-stretch gap-[0.9cqw] rounded-[0.6cqw] border border-[#9064F7]/40 bg-white/[0.035] p-[0.9cqw]"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09)" }}>
            <div className="w-[7.6cqw] aspect-square bg-white rounded-[0.3cqw] p-[0.4cqw] shrink-0">
              <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges" aria-hidden="true">
                <rect width="21" height="21" fill="#fff" />
                {[[0, 0], [14, 0], [0, 14]].map(([x, y], k) => (
                  <g key={k}>
                    <rect x={x} y={y} width="7" height="7" fill="#0B0713" />
                    <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
                    <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0B0713" />
                  </g>
                ))}
                {Array.from({ length: 96 }).map((_, k) => {
                  const x = 1 + ((k * 7) % 19), y = 1 + ((k * 11) % 19);
                  if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return null;
                  return <rect key={k} x={x} y={y} width="1" height="1" fill="#0B0713" />;
                })}
              </svg>
            </div>
            <div className="flex flex-col justify-center pr-[0.4cqw]">
              <div className="font-mono text-[0.95cqw] tracking-[0.24em] uppercase text-white/50">Certificate ID</div>
              <div className="font-mono text-[1.12cqw] tracking-wider text-[#F0DFA8] mt-[4%]">{d.serial}</div>
              <div className="font-mono text-[0.95cqw] text-white/62 mt-[6%]">{d.verifyUrl}</div>
              <div className="font-mono text-[0.95cqw] text-white/62 mt-[2%]">Issued {d.issued}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 · UV security threads, over everything ────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1414 1000" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 214 C 300 178, 520 268, 820 222 S 1230 156, 1414 206" stroke="#63D8F5" strokeWidth="0.7" fill="none" opacity="0.13" />
        <path d="M0 806 C 340 852, 560 748, 900 800 S 1240 862, 1414 812" stroke="#F0DFA8" strokeWidth="0.7" fill="none" opacity="0.11" />
      </svg>
    </div>
  );
}

/**
 * The programme diploma — the whole-course credential, and deliberately the
 * grander of the two.
 *
 * Where a module certificate is violet with a gold accent, this inverts the
 * hierarchy: gold leads, violet supports. It carries what only a diploma can —
 * a roll of every module passed, the average across them — under a full laurel
 * wreath. Same security ground and A4 proportion, so the pair read as a set.
 */
export function CertificateDiploma({ d }: { d: CertData }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const i = (n: string) => `${uid}${n}`;
  const modules = d.modules ?? [];

  return (
    <div className="@container relative w-full aspect-[1.414/1] overflow-hidden bg-[#0A0611] text-[#F5F1E4] shadow-2xl select-none">

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1414 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={i("gold")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F7ECC4" /><stop offset="45%" stopColor="#D9BA6E" /><stop offset="100%" stopColor="#A6803C" />
          </linearGradient>
          <pattern id={i("hex")} width="56" height="48.5" patternUnits="userSpaceOnUse">
            <path d="M28 0l24 14v28L28 56 4 42V14z" fill="none" stroke="#D9BA6E" strokeWidth="0.8" opacity="0.075" />
          </pattern>
          <radialGradient id={i("spot")} cx="50%" cy="36%" r="60%">
            <stop offset="0%" stopColor="#F7ECC4" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#F7ECC4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={i("vig")} cx="50%" cy="45%" r="72%">
            <stop offset="42%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.66" />
          </radialGradient>
        </defs>

        <rect width="1414" height="1000" fill={`url(#${i("hex")})`} />
        <g stroke={`url(#${i("gold")})`} fill="none" strokeWidth="0.5" opacity="0.30">
          <g transform="translate(105,890)"><path d={guilloche(155, 49, 80, 14)} /></g>
          <g transform="translate(1310,120)"><path d={guilloche(135, 43, 68, 13)} /></g>
        </g>
        <rect width="1414" height="1000" fill={`url(#${i("spot")})`} />
        <rect width="1414" height="1000" fill={`url(#${i("vig")})`} />
      </svg>

      {/* gold double frame */}
      <div className="absolute inset-[2%] border-2 border-[#D9BA6E]/55" />
      <div className="absolute inset-[3%] border border-[#D9BA6E]/22" />

      <svg className="absolute inset-[2%]" style={{ width: "96%", height: "96%" }} viewBox="0 0 1000 700" aria-hidden="true">
        <defs><path id={i("mt")} d="M14 14 H986 V686 H14 Z" /></defs>
        <text fontSize="5.4" fill="#D9BA6E" opacity="0.42" letterSpacing="1.1" fontFamily="ui-monospace, monospace">
          <textPath href={`#${i("mt")}`}>{MICRO.repeat(26)}</textPath>
        </text>
      </svg>

      {/* laurel wreath, centred behind the name — one clean shape, so it reads
          as grandeur rather than noise */}
      <svg viewBox="0 0 200 200" className="absolute left-1/2 top-[41%] -translate-x-1/2 -translate-y-1/2 w-[42cqw] opacity-[0.16]" aria-hidden="true">
        <g stroke="#D9BA6E" strokeWidth="2.4" fill="none" strokeLinecap="round">
          <path d="M100 178a76 76 0 0 1-56-116" />
          <path d="M100 178a76 76 0 0 0 56-116" />
          {Array.from({ length: 9 }).map((_, k) => {
            const a = (-118 + k * 11) * Math.PI / 180;
            const x = 100 + 74 * Math.cos(a), y = 100 + 74 * Math.sin(a);
            return <g key={k}>
              <ellipse cx={x} cy={y} rx="11" ry="4.6" transform={`rotate(${a * 180 / Math.PI + 90} ${x} ${y})`} />
              <ellipse cx={200 - x} cy={y} rx="11" ry="4.6" transform={`rotate(${-(a * 180 / Math.PI + 90)} ${200 - x} ${y})`} />
            </g>;
          })}
        </g>
      </svg>

      {/* corners */}
      {[["top-[2%] left-[2%]", ""], ["top-[2%] right-[2%]", "scale-x-[-1]"],
        ["bottom-[2%] left-[2%]", "scale-y-[-1]"], ["bottom-[2%] right-[2%]", "scale-[-1]"]].map(([pos, flip], k) => (
        <svg key={k} className={`absolute ${pos} ${flip} w-[6.5cqw] h-[6.5cqw]`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path d="M0 15V0h15" stroke="#D9BA6E" strokeWidth="1.5" opacity="0.85" />
          <path d="M6 22V6h16" stroke="#D9BA6E" strokeWidth="0.7" opacity="0.42" />
          <circle cx="6" cy="6" r="1.8" fill="#F7ECC4" opacity="0.9" />
        </svg>
      ))}

      {/* content */}
      <div className="relative h-full flex flex-col items-center px-[7%] py-[4.6%]">
        <div className="flex items-center gap-[1.6cqw]">
          <span className="h-px w-[6cqw] bg-gradient-to-r from-transparent to-[#D9BA6E]/80" />
          <span className="font-mono text-[1.1cqw] tracking-[0.5em] uppercase text-[#D9BA6E]">cdCTF Academy</span>
          <span className="h-px w-[6cqw] bg-gradient-to-l from-transparent to-[#D9BA6E]/80" />
        </div>

        <div className="font-serif text-[5.6cqw] leading-none tracking-[0.16em] mt-[1%]"
          style={{
            backgroundImage: "linear-gradient(100deg,#A6803C 0%,#F7ECC4 24%,#FFFDF4 40%,#E8D9A0 56%,#F7ECC4 72%,#A6803C 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.22)) drop-shadow(0 -1px 1px rgba(0,0,0,0.6)) drop-shadow(0 4px 16px rgba(217,186,110,0.32))",
          }}>
          DIPLOMA
        </div>
        <div className="font-serif italic text-[1.7cqw] text-[#F5F1E4]/80 mt-[0.4%]">in Cybersecurity</div>

        <p className="font-mono text-[1cqw] tracking-[0.3em] uppercase text-white/62 mt-[2.2%]">This is to certify that</p>
        <div className="font-serif text-[4.4cqw] leading-[1.1] mt-[0.5%] text-[#FFFDF4]"
          style={{ filter: "drop-shadow(0 2px 10px rgba(217,186,110,0.28))" }}>
          {d.fullName}
        </div>
        <p className="font-mono text-[1cqw] tracking-[0.26em] uppercase text-white/62 mt-[1.4%] text-center">
          has completed the full programme of study — all {d.moduleCount ?? modules.length} modules
        </p>

        {/* roll of honour */}
        {modules.length > 0 && (
          <div className="w-full grid grid-cols-4 gap-x-[2cqw] gap-y-[0.5cqw] mt-[2.2%] px-[3%]">
            {modules.map((m, k) => (
              <div key={m} className="flex items-center gap-[0.5cqw] min-w-0">
                <span className="font-mono text-[0.82cqw] text-[#D9BA6E]/90 tabular-nums shrink-0">
                  {String(k + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[0.86cqw] text-white/72 truncate">{m}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-baseline gap-[1cqw] mt-[2.4%]">
          <span className="font-mono text-[0.95cqw] tracking-[0.26em] uppercase text-white/62">Programme average</span>
          <span className="font-serif text-[2.6cqw] leading-none"
            style={{
              backgroundImage: "linear-gradient(100deg,#D9BA6E,#FFFDF4,#D9BA6E)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}>
            {d.score}%
          </span>
        </div>

        {/* signatures · id plate */}
        <div className="w-full mt-auto flex items-end justify-between gap-[3%]">
          <Signature name="Hikmatbek Yusupov" role="Academy Director" uid={uid} src={d.directorSig} stamp />
          <Signature name="A. Karimov" role="Lead Instructor" uid={uid} src={d.instructorSig} />

          <div className="shrink-0 flex items-stretch gap-[0.9cqw] rounded-[0.6cqw] border border-[#D9BA6E]/45 bg-white/[0.04] p-[0.9cqw]"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)" }}>
            <div className="w-[7.6cqw] aspect-square bg-white rounded-[0.3cqw] p-[0.4cqw] shrink-0">
              <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges" aria-hidden="true">
                <rect width="21" height="21" fill="#fff" />
                {[[0, 0], [14, 0], [0, 14]].map(([x, y], k) => (
                  <g key={k}>
                    <rect x={x} y={y} width="7" height="7" fill="#0A0611" />
                    <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
                    <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0A0611" />
                  </g>
                ))}
                {Array.from({ length: 96 }).map((_, k) => {
                  const x = 1 + ((k * 5) % 19), y = 1 + ((k * 13) % 19);
                  if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return null;
                  return <rect key={k} x={x} y={y} width="1" height="1" fill="#0A0611" />;
                })}
              </svg>
            </div>
            <div className="flex flex-col justify-center pr-[0.4cqw]">
              <div className="font-mono text-[0.8cqw] tracking-[0.24em] uppercase text-white/62">Diploma ID</div>
              <div className="font-mono text-[1.12cqw] tracking-wider text-[#F0DFA8] mt-[4%]">{d.serial}</div>
              <div className="font-mono text-[0.84cqw] text-white/62 mt-[6%]">{d.verifyUrl}</div>
              <div className="font-mono text-[0.84cqw] text-white/62 mt-[2%]">Conferred {d.issued}</div>
            </div>
          </div>
        </div>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1414 1000" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 196 C 320 162, 540 250, 840 206 S 1240 142, 1414 190" stroke="#F0DFA8" strokeWidth="0.7" fill="none" opacity="0.12" />
        <path d="M0 818 C 340 864, 560 760, 900 812 S 1240 872, 1414 824" stroke="#9064F7" strokeWidth="0.7" fill="none" opacity="0.11" />
      </svg>
    </div>
  );
}

/* A hexagonal cyber medal: circuit spokes, laurel, a shield reading "flag". */
function Emblem({ uid }: { uid: string }) {
  const i = (n: string) => `${uid}${n}`;
  return (
    <svg viewBox="0 0 120 120" className="w-[11.5cqw] mt-[1.6%]" aria-hidden="true">
      <defs>
        <linearGradient id={i("em")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" /><stop offset="52%" stopColor="#7C4DF5" /><stop offset="100%" stopColor="#3B7BE8" />
        </linearGradient>
        <linearGradient id={i("gold")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7ECC4" /><stop offset="50%" stopColor="#D9BA6E" /><stop offset="100%" stopColor="#A6803C" />
        </linearGradient>
        <radialGradient id={i("spec")} cx="35%" cy="26%" r="52%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" /><stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* circuit spokes */}
      <g stroke={`url(#${i("gold")})`} strokeWidth="1.1" opacity="0.7">
        {Array.from({ length: 12 }).map((_, k) => (
          <g key={k} transform={`rotate(${k * 30} 60 60)`}>
            <path d="M60 8v9" /><circle cx="60" cy="6" r="1.5" fill={`url(#${i("gold")})`} stroke="none" />
          </g>
        ))}
      </g>

      {/* laurel */}
      <g stroke={`url(#${i("gold")})`} strokeWidth="1.6" fill="none" opacity="0.9">
        <path d="M30 88a40 40 0 0 1-6-34" strokeLinecap="round" />
        <path d="M90 88a40 40 0 0 0 6-34" strokeLinecap="round" />
      </g>

      {/* hex medal */}
      <path d="M60 18l32 19v38L60 94 28 75V37z" fill={`url(#${i("gold")})`} />
      <path d="M60 22l28.5 17v34L60 90 31.5 73V39z" fill={`url(#${i("em")})`} />
      <path d="M60 22l28.5 17v34L60 90 31.5 73V39z" fill={`url(#${i("spec")})`} />
      <path d="M60 27l24 14.2v28.6L60 84 36 69.8V41.2z" fill="none" stroke="#fff" strokeWidth="0.7" opacity="0.35" />

      {/* flag on a staff — the CTF tell */}
      <path d="M52 42v30" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M52 43h20l-4.5 7 4.5 7H52z" fill="#fff" opacity="0.96" />
      <circle cx="52" cy="39" r="2.4" fill="#F7ECC4" />
    </svg>
  );
}

function Signature({ name, role, uid, src, stamp = false }: {
  name: string; role: string; uid: string; src?: string; stamp?: boolean;
}) {
  const i = (n: string) => `${uid}${n}`;
  return (
    <div className="relative min-w-0">
      {/* A real scanned signature when one is supplied; the drawn stand-in
          otherwise, so the rule is never left empty. Signatures are usually
          black ink on white — `invert` flips them to white on the dark ground,
          and `multiply`-free compositing keeps the paper from showing. */}
      {src ? (
        <img
          src={src}
          alt=""
          className="w-[13cqw] h-[3cqw] object-contain object-left invert brightness-125 opacity-90"
        />
      ) : (
        <svg viewBox="0 0 200 46" className="w-[13cqw] h-[3cqw]" fill="none" aria-hidden="true">
          <path
            d={role === "Academy Director"
              ? "M8 34c14-22 22 6 30-6s10 12 20 2 14-16 22-6 8 14 18 8 16-18 26-10 12 12 22 6"
              : "M10 30c10-16 18 8 26-2s12 10 22 0 10-12 20-4 10 12 20 4 14-10 24-2"}
            stroke="#EDEAF7" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </svg>
      )}
      <div className="w-[13cqw] border-t border-white/35 mt-[1%]" />
      <div className="font-mono text-[0.98cqw] tracking-[0.2em] uppercase text-white/75 mt-[4%] truncate">{name}</div>
      <div className="font-mono text-[0.95cqw] tracking-[0.2em] uppercase text-white/62 mt-[2%] truncate">{role}</div>

      {stamp && (
        <svg viewBox="0 0 100 100" className="absolute -top-[1.5cqw] left-[6cqw] w-[7.5cqw] rotate-[-14deg]" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#63D8F5" strokeWidth="3" opacity="0.5" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#63D8F5" strokeWidth="1.2" opacity="0.42" />
          <defs><path id={i("stp")} d="M50 50m-27 0a27 27 0 1 1 54 0a27 27 0 1 1-54 0" /></defs>
          <text fontSize="10.5" fill="#63D8F5" opacity="0.55" letterSpacing="2.2" fontFamily="ui-monospace, monospace">
            <textPath href={`#${i("stp")}`}>OFFICIAL · cdCTF · ACADEMY ·</textPath>
          </text>
          <path d="M36 50l9 9 19-19" stroke="#63D8F5" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
