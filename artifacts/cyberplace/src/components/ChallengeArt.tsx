import { useId, useMemo, type ReactElement } from "react";

/**
 * Cover art for a challenge card.
 *
 * The previous version hashed the challenge name into arcs, squares, waves or a
 * constellation. Every card got a different picture and not one of them said
 * anything: a wave does not mean "crypto", and a learner scanning a hundred
 * cards learned nothing from looking. Decoration carrying no information is
 * noise with a rendering cost.
 *
 * The composition now comes from the *category* — a login form with an
 * injection in it for Web, a key and ciphertext for Crypto, a hex dump for
 * Forensics — and the name hash only jitters the details, so two Web challenges
 * look like siblings rather than twins. Same category, same idea; same name,
 * same picture.
 *
 * Still SVG: no network request, crisp at any size, and it follows the theme.
 */

/** FNV-1a. Small, stable, and good enough to scatter a few hundred names. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic sequence of numbers from one seed. */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
}

type Draw = (rand: () => number) => ReactElement[];

const W = "#fff";
/** Ink on the art: white at a few fixed strengths, so every scene matches. */
const ink = (o: number) => ({ stroke: W, strokeOpacity: o, fill: "none" as const });
const solid = (o: number) => ({ fill: W, fillOpacity: o });

/** Browser chrome for the scenes that live inside a page. */
function frame(x = 16, y = 14, w = 144, h = 76): ReactElement[] {
  return [
    <rect key="f" x={x} y={y} width={w} height={h} rx="4" {...ink(0.28)} strokeWidth="1.2" />,
    <line key="b" x1={x} y1={y + 14} x2={x + w} y2={y + 14} {...ink(0.2)} strokeWidth="1" />,
    ...[0, 1, 2].map(i => <circle key={`d${i}`} cx={x + 9 + i * 8} cy={y + 7} r="2" {...solid(0.3)} />),
  ];
}

/** Rows of "text" — a wireframe's way of suggesting writing. */
function lines(x: number, y: number, widths: number[], gap = 9, o = 0.22): ReactElement[] {
  return widths.map((w, i) => (
    <rect key={`l${i}`} x={x} y={y + i * gap} width={w} height="3" rx="1.5" {...solid(o)} />
  ));
}

/** One scene per idea. `default` catches anything the catalogue grows later. */
const SCENES: Record<string, Draw> = {
  // A login form with a quote injected into it — the shape of the whole class.
  web: rand => [
    ...frame(),
    ...lines(30, 40, [44, 62], 11, 0.18),
    <rect key="i1" x={30} y={48} width={92} height={11} rx="2" {...ink(0.34)} strokeWidth="1" />,
    <rect key="i2" x={30} y={66} width={92} height={11} rx="2" {...ink(0.34)} strokeWidth="1" />,
    <text key="q" x={35} y={75} fontSize="9" fontFamily="monospace" {...solid(0.75)}>{"' OR 1=1--"}</text>,
    <rect key="btn" x={128} y={66} width={22} height={11} rx="2" {...solid(0.28 + rand() * 0.08)} />,
  ],
  // A key, and the blocks it unlocks.
  crypto: rand => [
    <circle key="ring" cx="42" cy="52" r="15" {...ink(0.4)} strokeWidth="2.4" />,
    <rect key="shaft" x={56} y={49} width={44} height={6} rx="2" {...solid(0.4)} />,
    <rect key="t1" x={86} y={55} width={6} height={10} rx="1.5" {...solid(0.4)} />,
    <rect key="t2" x={96} y={55} width={6} height={14} rx="1.5" {...solid(0.4)} />,
    ...Array.from({ length: 8 }, (_, i) => (
      <rect key={`b${i}`} x={112 + (i % 4) * 13} y={30 + Math.floor(i / 4) * 15}
        width={10} height={10} rx="2" {...solid(0.1 + rand() * 0.22)} />
    )),
  ],
  // A hex dump: what forensics actually stares at.
  forensics: rand => [
    ...Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 11 }, (_, c) => (
        <rect key={`h${r}-${c}`} x={20 + c * 13} y={22 + r * 14} width={9} height={7} rx="1"
          {...solid(rand() > 0.82 ? 0.6 : 0.12 + rand() * 0.1)} />
      )),
    ).flat(),
    <rect key="sel" x={20 + Math.floor(rand() * 8) * 13 - 2} y={22 + Math.floor(rand() * 5) * 14 - 2}
      width={13} height={11} rx="2" {...ink(0.7)} strokeWidth="1.4" />,
  ],
  // Packets crossing between two hosts.
  networking: rand => [
    <rect key="a" x={16} y={40} width={26} height={22} rx="3" {...ink(0.4)} strokeWidth="1.4" />,
    <rect key="b" x={134} y={40} width={26} height={22} rx="3" {...ink(0.4)} strokeWidth="1.4" />,
    <line key="w" x1="42" y1="51" x2="134" y2="51" {...ink(0.18)} strokeWidth="1" strokeDasharray="3 4" />,
    ...Array.from({ length: 4 }, (_, i) => (
      <rect key={`p${i}`} x={52 + i * 22} y={45 + (rand() - 0.5) * 10} width={13} height={11} rx="2"
        {...solid(0.22 + i * 0.14)} />
    )),
  ],
  // A stack, and the frame writing past the end of it.
  pwn: rand => [
    ...Array.from({ length: 5 }, (_, i) => (
      <rect key={`s${i}`} x={40} y={20 + i * 14} width={70} height={11} rx="2"
        {...solid(i === 3 ? 0.55 : 0.12 + rand() * 0.08)} />
    )),
    <path key="ov" d="M110 62 L140 62 L140 78 L118 78" {...ink(0.6)} strokeWidth="1.6" />,
    <path key="ar" d="M124 74 l-6 4 6 4" {...ink(0.6)} strokeWidth="1.6" />,
    <text key="x" x={116} y={54} fontSize="9" fontFamily="monospace" {...solid(0.6)}>41 41</text>,
  ],
  // Disassembly, and a jump.
  reverse: rand => [
    ...Array.from({ length: 6 }, (_, i) => (
      <g key={`r${i}`}>
        <rect x={22} y={22 + i * 12} width={22} height={4} rx="2" {...solid(0.3)} />
        <rect x={52} y={22 + i * 12} width={30 + rand() * 40} height={4} rx="2" {...solid(0.14)} />
      </g>
    )),
    <path key="jmp" d="M14 30 q-8 26 0 52" {...ink(0.45)} strokeWidth="1.4" />,
    <path key="jh" d="M14 82 l4-5 -4-4" {...ink(0.45)} strokeWidth="1.4" />,
  ],
  // A shell waiting for you.
  scripting: rand => [
    ...frame(),
    <text key="p" x={26} y={42} fontSize="10" fontFamily="monospace" {...solid(0.7)}>$</text>,
    ...lines(38, 37, [58 + rand() * 30, 40 + rand() * 30, 70 + rand() * 20], 12, 0.2),
    <rect key="cur" x={38} y={70} width={7} height={10} {...solid(0.65)} />,
  ],
  // A picture with something buried in its bits.
  steganography: rand => [
    <rect key="img" x={26} y={20} width={124} height={60} rx="4" {...ink(0.35)} strokeWidth="1.3" />,
    <path key="hill" d="M26 74 L64 44 L92 66 L118 50 L150 74 Z" {...solid(0.16)} />,
    <circle key="sun" cx={118} cy={36} r="8" {...solid(0.24)} />,
    ...Array.from({ length: 16 }, (_, i) => (
      <rect key={`bit${i}`} x={32 + i * 7.4} y={88} width={4} height={4} rx="1"
        {...solid(rand() > 0.5 ? 0.62 : 0.16)} />
    )),
  ],
  // People, and the links between them.
  osint: rand => [
    ...Array.from({ length: 5 }, (_, i) => {
      const x = 30 + i * 30, y = i % 2 ? 34 : 62;
      return (
        <g key={`n${i}`}>
          <circle cx={x} cy={y} r="7" {...ink(0.4)} strokeWidth="1.3" />
          <path d={`M${x - 9} ${y + 15} a9 9 0 0 1 18 0`} {...ink(0.3)} strokeWidth="1.3" />
          {i < 4 && <line x1={x + 8} y1={y} x2={x + 22} y2={i % 2 ? 62 : 34} {...ink(0.18)} strokeWidth="1" strokeDasharray="2 3" />}
        </g>
      );
    }),
    <circle key="hit" cx={30 + Math.floor(rand() * 5) * 30} cy={48} r="20" {...ink(0.35)} strokeWidth="1.2" strokeDasharray="4 4" />,
  ],
  // A bucket standing open.
  cloud: rand => [
    <path key="c" d="M46 54 a16 16 0 0 1 30-8 a13 13 0 0 1 24 6 a12 12 0 0 1-2 24 H56 a14 14 0 0 1-10-22 Z"
      {...ink(0.4)} strokeWidth="1.5" />,
    <rect key="door" x={104} y={44} width={34} height={30} rx="3" {...ink(0.45)} strokeWidth="1.4" />,
    <path key="open" d="M104 44 L88 36 L88 66 L104 74" {...solid(0.18)} />,
    ...Array.from({ length: 3 }, (_, i) => (
      <rect key={`f${i}`} x={110} y={50 + i * 8} width={20 - rand() * 8} height={3} rx="1.5" {...solid(0.3)} />
    )),
  ],
  // A phone.
  mobile: rand => [
    <rect key="p" x={62} y={14} width={52} height={78} rx="7" {...ink(0.42)} strokeWidth="1.5" />,
    <rect key="n" x={80} y={19} width={16} height="3" rx="1.5" {...solid(0.35)} />,
    ...lines(70, 32, [36, 28, 34, 22], 10, 0.18),
    <rect key="b" x={70} y={74} width={36} height={11} rx="3" {...solid(0.28 + rand() * 0.1)} />,
  ],
  // A chip and its pins.
  hardware: rand => [
    <rect key="c" x={56} y={30} width={64} height={46} rx="4" {...ink(0.42)} strokeWidth="1.5" />,
    <rect key="d" x={70} y={44} width={36} height={18} rx="2" {...solid(0.2)} />,
    ...Array.from({ length: 6 }, (_, i) => (
      <g key={`pin${i}`}>
        <line x1={56} y1={38 + i * 7} x2={40} y2={38 + i * 7} {...ink(0.3 + rand() * 0.2)} strokeWidth="1.4" />
        <line x1={120} y1={38 + i * 7} x2={136} y2={38 + i * 7} {...ink(0.3 + rand() * 0.2)} strokeWidth="1.4" />
      </g>
    )),
  ],
  // A mesh that learns.
  ai: rand => {
    const cols: ReadonlyArray<readonly [number, readonly number[]]> =
      [[30, [30, 52, 74]], [88, [24, 46, 68, 88]], [146, [40, 64]]];
    const out: ReactElement[] = [];
    cols.forEach(([x, ys], ci) => {
      ys.forEach((y, i) => {
        out.push(<circle key={`n${ci}-${i}`} cx={x} cy={y} r="5" {...solid(0.3 + rand() * 0.25)} />);
        if (ci < cols.length - 1) {
          cols[ci + 1][1].forEach((y2, j) => {
            out.push(<line key={`e${ci}-${i}-${j}`} x1={x + 5} y1={y} x2={cols[ci + 1][0] - 5} y2={y2}
              {...ink(0.06 + rand() * 0.1)} strokeWidth="1" />);
          });
        }
      });
    });
    return out;
  },
  // A flag on a hill: the generic one, and where Misc/Others land.
  default: rand => [
    <line key="pole" x1={54} y1={18} x2={54} y2={86} {...ink(0.45)} strokeWidth="2" />,
    <path key="flag" d="M54 22 L118 32 L54 44 Z" {...solid(0.38)} />,
    ...Array.from({ length: 5 }, (_, i) => (
      <rect key={`g${i}`} x={28 + i * 26} y={82} width={18 + rand() * 8} height="3" rx="1.5" {...solid(0.12)} />
    )),
  ],
};

/** Categories share a scene where they share an idea. */
const ALIAS: Record<string, string> = {
  exploitation: "pwn",
  recon: "osint",
  misc: "default",
  miscellaneous: "default",
  others: "default",
};

function sceneFor(category: string): Draw {
  const key = (category || "").toLowerCase().trim();
  return SCENES[ALIAS[key] ?? key] ?? SCENES.default;
}

type Props = { name: string; category: string; hue: number; className?: string; solved?: boolean };

export function ChallengeArt({ name, category, hue, className, solved }: Props) {
  const uid = useId().replace(/:/g, "");
  const seed = hash(name);
  const shapes = useMemo(() => sceneFor(category)(rng(seed)), [category, seed]);

  return (
    <svg viewBox="0 0 176 104" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          {/* Solved art drains to a near-neutral tone. A solved card should read
              as "done with" from across the grid instead of competing for
              attention with the ones still to do. */}
          <stop offset="0%" stopColor={solved ? `hsl(${hue} 10% 24%)` : `hsl(${hue} 62% 34%)`} />
          <stop offset="100%" stopColor={solved ? `hsl(${hue} 8% 14%)` : `hsl(${(hue + 30) % 360} 66% 18%)`} />
        </linearGradient>
      </defs>
      <rect width="176" height="104" fill={`url(#g${uid})`} />
      <g opacity={solved ? 0.4 : 1}>{shapes}</g>
    </svg>
  );
}
