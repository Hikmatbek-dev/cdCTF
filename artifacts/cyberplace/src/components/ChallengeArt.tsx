import { useId, useMemo, type ReactElement } from "react";

/**
 * Cover art for a challenge card, generated from the challenge itself.
 *
 * A catalogue of a hundred cards with one glyph repeated on every row is
 * unreadable — nothing distinguishes one from the next at a glance. Commissioned
 * artwork per challenge is not on the table, so each cover is *derived*: the
 * category picks the palette, and a hash of the name picks the composition, the
 * angle and the shapes. The same challenge always draws the same picture, and
 * two challenges almost never draw the same one.
 *
 * SVG rather than raster: no network request, crisp at any size, and it follows
 * the theme.
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

type Props = { name: string; hue: number; className?: string; solved?: boolean };

export function ChallengeArt({ name, hue, className, solved }: Props) {
  const uid = useId().replace(/:/g, "");
  const seed = hash(name);

  const shapes = useMemo(() => {
    const rand = rng(seed);
    // Four families, chosen by the name — enough variety that a grid never
    // looks tiled, few enough that the set still feels like one system.
    const family = seed % 4;
    const items: ReactElement[] = [];

    if (family === 0) {
      // Concentric arcs, like a radar sweep.
      for (let i = 0; i < 5; i++) {
        const r = 18 + i * 15 + rand() * 6;
        items.push(<circle key={i} cx="30" cy="70" r={r} fill="none" stroke="#fff" strokeOpacity={0.16 - i * 0.02} strokeWidth="1.5" />);
      }
    } else if (family === 1) {
      // A drifting field of squares.
      for (let i = 0; i < 14; i++) {
        const x = rand() * 160, y = rand() * 90, s = 6 + rand() * 16;
        items.push(<rect key={i} x={x} y={y} width={s} height={s} rx="2" fill="#fff" fillOpacity={0.05 + rand() * 0.12} transform={`rotate(${rand() * 45} ${x} ${y})`} />);
      }
    } else if (family === 2) {
      // Stacked waves.
      for (let i = 0; i < 4; i++) {
        const y = 28 + i * 18;
        const a = 8 + rand() * 10;
        items.push(
          <path key={i}
            d={`M-10 ${y} Q 30 ${y - a}, 70 ${y} T 150 ${y} T 230 ${y}`}
            fill="none" stroke="#fff" strokeOpacity={0.2 - i * 0.03} strokeWidth="1.5" />,
        );
      }
    } else {
      // A constellation: nodes and the lines between them.
      const pts = Array.from({ length: 7 }, () => [12 + rand() * 150, 12 + rand() * 80] as const);
      pts.forEach(([x1, y1], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        items.push(<line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity="0.14" strokeWidth="1" />);
      });
      pts.forEach(([x, y], i) => {
        items.push(<circle key={`p${i}`} cx={x} cy={y} r={2 + rand() * 2.5} fill="#fff" fillOpacity="0.35" />);
      });
    }
    return items;
  }, [seed]);

  return (
    <svg viewBox="0 0 176 104" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 72% 52%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 38) % 360} 68% 38%)`} />
        </linearGradient>
      </defs>
      <rect width="176" height="104" fill={`url(#g${uid})`} />
      {shapes}
      {/* A solved card wears its tick in the art, so the grid reads at a glance. */}
      {solved && (
        <g transform="translate(148 16)">
          <circle r="11" fill="#fff" fillOpacity="0.9" />
          <path d="M-5 0 L-1.5 3.5 L5 -3.5" fill="none" stroke={`hsl(${hue} 70% 32%)`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}
