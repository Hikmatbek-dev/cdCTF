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
    <div className={`relative ${className} overflow-hidden bg-muted`}>
      <img
        src={src}
        alt={category}
        className={`w-full h-full object-cover transition-all duration-700 ${solved ? "grayscale opacity-50 scale-100 group-hover:scale-105" : "scale-105 group-hover:scale-110"}`}
      />
      {/* Category Hue overlay to keep the visual identity of the category */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40 transition-opacity group-hover:opacity-60"
        style={{ backgroundColor: `hsl(${hue} 80% 50%)` }}
      />
      {solved && (
        <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />
      )}
    </div>
  );
}
