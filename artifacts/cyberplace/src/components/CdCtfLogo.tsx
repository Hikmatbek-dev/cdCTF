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
      <img
        src="/logo.png"
        alt={alt}
        className="dark:hidden h-full w-auto object-contain"
      />
      <img
        src="/logo-remove-bg.png"
        alt={alt}
        className="hidden dark:block h-full w-auto object-contain"
      />
    </span>
  );
}
