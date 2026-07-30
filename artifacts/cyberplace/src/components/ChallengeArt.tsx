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
  ai: "misc"
};

function getImageName(category: string): string {
  const key = (category || "").toLowerCase().trim();
  const alias = ALIAS[key] ?? key;
  const available = ["web", "crypto", "forensics", "networking", "reverse", "pwn", "stegano", "osint", "misc"];
  if (available.includes(alias)) {
    return alias;
  }
  return "misc";
}

type Props = { name: string; category: string; hue: number; className?: string; solved?: boolean };

export function ChallengeArt({ category, hue, className, solved }: Props) {
  const imgName = getImageName(category);
  const src = `/ctf-categories/${imgName}.png`;

  return (
    <div className={`relative ${className} overflow-hidden bg-black/80 select-none`}>
      {/* Base Image */}
      <img
        src={src}
        alt={category}
        className={`w-full h-full object-cover transition-all duration-700 ease-out ${
          solved
            ? "grayscale opacity-40 scale-100 contrast-125"
            : "scale-105 group-hover:scale-110 group-hover:brightness-110"
        }`}
      />

      {/* Cyber Grid & Overlay Texture */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none"
      />
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Category Hue Glowing Gradient */}
      <div
        className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500 mix-blend-color-dodge pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 20%, hsl(${hue} 90% 60% / 0.4), transparent 70%)`
        }}
      />

      {/* Solved Visual Overlay Effect */}
      {solved && (
        <div className="absolute inset-0 bg-emerald-950/30 backdrop-blur-[1px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
        </div>
      )}

      {/* Subtle Scanline Effect on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_51%)] bg-[size:100%_4px]" />
    </div>
  );
}
