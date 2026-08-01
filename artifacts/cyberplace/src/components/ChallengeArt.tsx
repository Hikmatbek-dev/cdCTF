/**
 * Cover art for a challenge card.
 *
 * Nine category illustrations, one per family. They were shipped as 1024×1024
 * PNGs of ~1 MB each — rendered into a 176px slot, so a full challenge grid
 * pulled ~9 MB, most of it thrown away on resize. They are WebP now, at 192 and
 * 384 wide, ~22 KB each; the grid loads a few hundred KB once and caches it.
 *
 * The illustrations have English words baked into them ("EXPLOIT", "SECURED")
 * which cannot be translated and read as AI stock up close. So the image is
 * treated as *texture*, not label: a heavy vignette and a hue wash push the
 * baked text down into the background, and the real, translatable category name
 * is drawn as text by the card that uses this component.
 */

const ALIAS: Record<string, string> = {
  exploitation: "pwn",
  recon: "osint",
  misc: "misc",
  miscellaneous: "misc",
  others: "misc",
  steganography: "stegano",
  scripting: "misc",
  cloud: "networking",
  mobile: "misc",
  hardware: "misc",
  ai: "misc",
};

const AVAILABLE = ["web", "crypto", "forensics", "networking", "reverse", "pwn", "stegano", "osint", "misc"];

function imageName(category: string): string {
  const key = (category || "").toLowerCase().trim();
  const alias = ALIAS[key] ?? key;
  return AVAILABLE.includes(alias) ? alias : "misc";
}

type Props = { name: string; category: string; hue: number; className?: string; solved?: boolean };

export function ChallengeArt({ category, hue, className, solved }: Props) {
  const base = `/ctf-categories/${imageName(category)}`;

  return (
    <div className={`relative ${className} overflow-hidden bg-black/80 select-none`}>
      <img
        src={`${base}-192.webp`}
        srcSet={`${base}-192.webp 192w, ${base}-384.webp 384w`}
        sizes="(max-width: 640px) 100vw, 320px"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-all duration-700 ease-out ${
          solved
            ? "grayscale opacity-35 scale-100"
            : "scale-105 group-hover:scale-110"
        }`}
      />

      {/* Vignette: darkens the edges so the baked-in text recedes and the
          card's own title always has something to sit on. */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(0,0,0,0.55)_100%)]" />

      {/* Hue wash: ties every image to its category colour so nine different
          stock illustrations read as one system rather than a ransom note. */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-color opacity-45"
        style={{ background: `hsl(${hue} 70% 45%)` }}
      />
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30 group-hover:opacity-45 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 75% 20%, hsl(${hue} 90% 60% / 0.55), transparent 70%)` }}
      />

      {/* A solved card is drained further, so the grid reads at a glance. */}
      {solved && <div className="absolute inset-0 pointer-events-none bg-background/40" />}
    </div>
  );
}
