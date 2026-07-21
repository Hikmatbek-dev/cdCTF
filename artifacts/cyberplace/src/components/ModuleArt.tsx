import { useId } from "react";

/**
 * Hand-drawn SVG artwork, one per module.
 *
 * The roadmap used a single generic lucide glyph per card, which read as a wall
 * of identical rows. These are real illustrations instead: each is built from
 * the module's own subject matter (a terminal, a radar sweep, a broken chain),
 * drawn in the brand violet→blue gradient over a soft glow.
 *
 * They are SVG rather than raster on purpose — they inherit the theme through
 * currentColor and the CSS variables, cost no network request, stay crisp at
 * any size, and can animate. Motion is subtle and respects reduced-motion.
 */

type ArtProps = { className?: string };

/** Shared scaffolding: the glow behind the art and the two brand gradients. */
function Defs({ ids }: { ids: { glow: string; stroke: string; fill: string; soft: string } }) {
  return (
    <defs>
      <radialGradient id={ids.glow} cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={ids.stroke} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" />
        <stop offset="100%" stopColor="hsl(var(--accent))" />
      </linearGradient>
      <linearGradient id={ids.fill} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id={ids.soft} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.15" />
      </linearGradient>
    </defs>
  );
}

function useIds() {
  // React's useId returns ids containing punctuation (":r4:" / "«r4»" depending
  // on version). Those characters are not safe inside an SVG url(#…) reference,
  // so strip them down to word characters before using them as gradient ids.
  const base = `art${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return {
    glow: `${base}-glow`,
    stroke: `${base}-stroke`,
    fill: `${base}-fill`,
    soft: `${base}-soft`,
  };
}

const SVG = "0 0 120 120";

/** 1 — Linux: a terminal window, a prompt and a blinking caret. */
export function LinuxArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      <rect x="20" y="28" width="80" height="60" rx="8" fill={`url(#${ids.fill})`} stroke={`url(#${ids.stroke})`} strokeWidth="1.6" />
      <path d="M20 40h80" stroke={`url(#${ids.stroke})`} strokeWidth="1.2" opacity="0.55" />
      <circle cx="28" cy="34" r="2.2" fill="hsl(var(--primary))" opacity="0.9" />
      <circle cx="36" cy="34" r="2.2" fill="hsl(var(--accent))" opacity="0.7" />
      <circle cx="44" cy="34" r="2.2" fill="hsl(var(--primary))" opacity="0.45" />
      {/* prompt */}
      <path d="M29 52l5 4-5 4" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="40" y="54" width="26" height="3.4" rx="1.7" fill={`url(#${ids.soft})`} />
      <rect x="29" y="64" width="46" height="3.4" rx="1.7" fill={`url(#${ids.soft})`} opacity="0.6" />
      <rect x="29" y="74" width="30" height="3.4" rx="1.7" fill={`url(#${ids.soft})`} opacity="0.35" />
      <rect className="cd-caret" x="63" y="72.6" width="7" height="6.4" rx="1.4" fill="hsl(var(--primary))" />
    </svg>
  );
}

/** 2 — Networking: linked nodes with a packet travelling the highlighted path. */
export function NetworkArt({ className }: ArtProps) {
  const ids = useIds();
  const nodes = [
    [60, 26], [30, 48], [90, 48], [24, 84], [60, 70], [96, 84],
  ] as const;
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      <g stroke={`url(#${ids.stroke})`} strokeWidth="1.3" opacity="0.4" strokeLinecap="round">
        <path d="M60 26L30 48M60 26L90 48M30 48L24 84M30 48L60 70M90 48L60 70M90 48L96 84M24 84L60 70M60 70L96 84" />
      </g>
      {/* the live route */}
      <path id={`${ids.glow}-route`} d="M60 26L30 48L60 70L96 84" stroke={`url(#${ids.stroke})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="cd-packet" r="3.4" fill="hsl(var(--accent))">
        <animateMotion dur="3.2s" repeatCount="indefinite" path="M60 26L30 48L60 70L96 84" />
      </circle>
      {nodes.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 0 || i === 5 ? 6.5 : 5}
          fill="hsl(var(--card))" stroke={`url(#${ids.stroke})`} strokeWidth="1.8" />
      ))}
      <circle cx="60" cy="26" r="2.4" fill="hsl(var(--primary))" />
      <circle cx="96" cy="84" r="2.4" fill="hsl(var(--accent))" />
    </svg>
  );
}

/** 3 — Web: a browser window with a fracture running through the page. */
export function WebArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      <rect x="18" y="26" width="84" height="64" rx="8" fill={`url(#${ids.fill})`} stroke={`url(#${ids.stroke})`} strokeWidth="1.6" />
      <path d="M18 40h84" stroke={`url(#${ids.stroke})`} strokeWidth="1.2" opacity="0.55" />
      <circle cx="26" cy="33" r="2" fill="hsl(var(--primary))" opacity="0.8" />
      <circle cx="33" cy="33" r="2" fill="hsl(var(--accent))" opacity="0.6" />
      <rect x="42" y="30.5" width="52" height="5" rx="2.5" fill="hsl(var(--primary))" opacity="0.18" />
      {/* the injected field */}
      <rect x="28" y="50" width="44" height="9" rx="3" stroke={`url(#${ids.stroke})`} strokeWidth="1.5" opacity="0.85" />
      <rect x="32" y="53.4" width="18" height="2.4" rx="1.2" fill={`url(#${ids.soft})`} />
      {/* fracture */}
      <path className="cd-flicker" d="M74 44l-9 14 8 3-11 17" stroke="hsl(var(--accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 70h26M32 78h16" stroke={`url(#${ids.soft})`} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <circle cx="86" cy="70" r="3" fill="hsl(var(--accent))" opacity="0.55" />
    </svg>
  );
}

/** 4 — Cryptography: a keyhole built from cipher blocks, dissolving to hex. */
export function CryptoArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      {/* shackle */}
      <path d="M44 50V40a16 16 0 0 1 32 0v10" stroke={`url(#${ids.stroke})`} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="32" y="50" width="56" height="42" rx="8" fill={`url(#${ids.fill})`} stroke={`url(#${ids.stroke})`} strokeWidth="1.8" />
      {/* keyhole */}
      <circle cx="60" cy="66" r="6" stroke={`url(#${ids.stroke})`} strokeWidth="2" />
      <path d="M60 72v10" stroke={`url(#${ids.stroke})`} strokeWidth="2.6" strokeLinecap="round" />
      {/* dissolving blocks */}
      <g className="cd-drift">
        <rect x="20" y="30" width="7" height="7" rx="1.6" fill="hsl(var(--primary))" opacity="0.5" />
        <rect x="95" y="38" width="6" height="6" rx="1.4" fill="hsl(var(--accent))" opacity="0.45" />
        <rect x="14" y="66" width="5" height="5" rx="1.2" fill="hsl(var(--accent))" opacity="0.35" />
        <rect x="99" y="72" width="7" height="7" rx="1.6" fill="hsl(var(--primary))" opacity="0.3" />
      </g>
    </svg>
  );
}

/** 5 — Recon: a radar sweep locking onto one target. */
export function ReconArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      <circle cx="60" cy="60" r="34" stroke={`url(#${ids.stroke})`} strokeWidth="1.6" opacity="0.9" />
      <circle cx="60" cy="60" r="23" stroke={`url(#${ids.stroke})`} strokeWidth="1.2" opacity="0.5" />
      <circle cx="60" cy="60" r="12" stroke={`url(#${ids.stroke})`} strokeWidth="1.2" opacity="0.3" />
      <path d="M60 26v68M26 60h68" stroke={`url(#${ids.stroke})`} strokeWidth="1" opacity="0.25" />
      {/* sweep */}
      <g className="cd-sweep" style={{ transformOrigin: "60px 60px" }}>
        <path d="M60 60L60 26A34 34 0 0 1 90 43Z" fill={`url(#${ids.soft})`} opacity="0.5" />
        <path d="M60 60L60 26" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* blips */}
      <circle cx="76" cy="44" r="3.4" fill="hsl(var(--accent))" />
      <circle cx="76" cy="44" r="7" stroke="hsl(var(--accent))" strokeWidth="1.4" opacity="0.45" />
      <circle cx="42" cy="74" r="2.4" fill="hsl(var(--primary))" opacity="0.7" />
      <circle cx="70" cy="80" r="2" fill="hsl(var(--primary))" opacity="0.45" />
    </svg>
  );
}

/** 6 — Exploitation: a chain of stages ending in a broken link. */
export function ExploitArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      {/* three intact links */}
      <g stroke={`url(#${ids.stroke})`} strokeWidth="2.2">
        <rect x="16" y="42" width="24" height="16" rx="8" />
        <rect x="34" y="56" width="24" height="16" rx="8" opacity="0.85" />
        <rect x="52" y="42" width="24" height="16" rx="8" opacity="0.7" />
      </g>
      {/* the broken one */}
      <path className="cd-flicker" d="M74 62a8 8 0 0 1 8-8h6" stroke="hsl(var(--accent))" strokeWidth="2.4" strokeLinecap="round" />
      <path className="cd-flicker" d="M104 70a8 8 0 0 1-8 8h-6" stroke="hsl(var(--accent))" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M88 60l6 10M94 60l-6 10" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      {/* root shell */}
      <rect x="30" y="82" width="46" height="16" rx="4" fill={`url(#${ids.fill})`} stroke={`url(#${ids.stroke})`} strokeWidth="1.4" />
      <path d="M36 87l4 3-4 3" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="45" y="88.6" width="14" height="2.8" rx="1.4" fill={`url(#${ids.soft})`} />
      <rect className="cd-caret" x="62" y="88" width="5" height="4" rx="1" fill="hsl(var(--primary))" />
    </svg>
  );
}

/** 7 — Forensics: a magnifier recovering blocks from a timeline. */
export function ForensicsArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      {/* timeline bars */}
      <g>
        <rect x="16" y="34" width="60" height="7" rx="3.5" fill={`url(#${ids.soft})`} opacity="0.75" />
        <rect x="16" y="47" width="44" height="7" rx="3.5" fill={`url(#${ids.soft})`} opacity="0.5" />
        <rect x="16" y="60" width="70" height="7" rx="3.5" fill={`url(#${ids.soft})`} opacity="0.35" />
        <rect x="16" y="73" width="34" height="7" rx="3.5" fill={`url(#${ids.soft})`} opacity="0.22" />
      </g>
      {/* recovered fragments */}
      <rect x="66" y="46" width="8" height="9" rx="2" stroke="hsl(var(--accent))" strokeWidth="1.4" strokeDasharray="2.5 2" />
      <rect x="54" y="72" width="8" height="9" rx="2" stroke="hsl(var(--accent))" strokeWidth="1.4" strokeDasharray="2.5 2" opacity="0.7" />
      {/* magnifier */}
      <circle cx="76" cy="70" r="20" fill="hsl(var(--card))" fillOpacity="0.55" stroke={`url(#${ids.stroke})`} strokeWidth="2.4" />
      <path d="M90 84l12 12" stroke={`url(#${ids.stroke})`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M68 70h16M68 76h10" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M68 64h12" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** 8 — CTF: a flag planted on a summit of solved challenges. */
export function CtfArt({ className }: ArtProps) {
  const ids = useIds();
  return (
    <svg viewBox={SVG} className={className} fill="none" aria-hidden="true">
      <Defs ids={ids} />
      <circle cx="60" cy="58" r="46" fill={`url(#${ids.glow})`} />
      {/* stacked challenge tiles */}
      <g stroke={`url(#${ids.stroke})`} strokeWidth="1.6">
        <rect x="18" y="84" width="84" height="14" rx="4" fill={`url(#${ids.fill})`} />
        <rect x="28" y="70" width="64" height="14" rx="4" fill={`url(#${ids.fill})`} opacity="0.85" />
        <rect x="38" y="56" width="44" height="14" rx="4" fill={`url(#${ids.fill})`} opacity="0.7" />
      </g>
      {/* pole + flag */}
      <path d="M60 56V20" stroke={`url(#${ids.stroke})`} strokeWidth="2.6" strokeLinecap="round" />
      <path className="cd-wave" d="M60 22h26l-6 8 6 8H60z" fill={`url(#${ids.soft})`} stroke={`url(#${ids.stroke})`} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="60" cy="18" r="3" fill="hsl(var(--primary))" />
      {/* sparks */}
      <circle cx="30" cy="34" r="2" fill="hsl(var(--accent))" opacity="0.6" />
      <circle cx="92" cy="46" r="1.8" fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx="24" cy="56" r="1.5" fill="hsl(var(--accent))" opacity="0.4" />
    </svg>
  );
}

/** Module slug → its artwork. */
export const MODULE_ART: Record<string, (p: ArtProps) => React.ReactElement> = {
  "linux-command-line": LinuxArt,
  "networking-for-security": NetworkArt,
  "web-application-security": WebArt,
  "cryptography-for-security": CryptoArt,
  "reconnaissance-and-scanning": ReconArt,
  "exploitation-and-privilege-escalation": ExploitArt,
  "forensics-and-incident-response": ForensicsArt,
  "ctf-methodology": CtfArt,
};
