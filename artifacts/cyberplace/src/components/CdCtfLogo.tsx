import React from "react";

interface CdCtfLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

/**
 * Official cdCTF Logo Component
 * Automatically switches between light mode (/logo.png) and dark mode (/logo-remove-bg.png).
 */
export function CdCtfLogo({ className = "h-10 w-auto", size, alt = "cdCTF Logo" }: CdCtfLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} style={style}>
      {/* Light mode: Dumaloq (circular) logo */}
      <span className="dark:hidden h-full aspect-square rounded-full overflow-hidden flex items-center justify-center p-0.5 bg-card border border-border/40 shadow-sm shrink-0">
        <img
          src="/logo.png"
          alt={alt}
          className="h-full w-full object-cover rounded-full"
        />
      </span>
      {/* Dark mode: Transparent logo */}
      <img
        src="/logo-remove-bg.png"
        alt={alt}
        className="hidden dark:block h-full w-auto object-contain"
      />
    </span>
  );
}
