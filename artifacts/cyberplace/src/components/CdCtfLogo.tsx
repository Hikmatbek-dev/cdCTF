import React from "react";

interface CdCtfLogoProps {
  className?: string;
  size?: number;
  useImage?: boolean;
}

/**
 * Official cdCTF Monogram Logo Component
 * Matches logo.png: continuous 'cd' monogram with purple angled terminal cursor '_'
 */
export function CdCtfLogo({ className = "w-8 h-8", size, useImage = false }: CdCtfLogoProps) {
  if (useImage) {
    return (
      <img
        src="/logo-remove-bg.png"
        alt="cdCTF Logo"
        className={`object-contain ${className}`}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="cdCTF Logo"
    >
      {/* Continuous 'cd' monogram filled path */}
      <path
        d="M 60 30 
           C 40 30, 24 44, 24 64 
           C 24 84, 40 98, 60 98 
           C 72 98, 83 91, 90 80 
           C 97 91, 108 98, 120 98 
           C 134 98, 146 88, 146 72 
           L 146 18 
           L 128 18 
           L 128 68 
           C 128 78, 120 84, 112 84 
           C 102 84, 94 76, 94 64 
           C 94 48, 106 30, 124 30 
           L 124 30 
           C 108 30, 94 42, 86 54 
           C 79 40, 68 30, 60 30 Z"
        fill="currentColor"
      />

      {/* Modern angled terminal cursor '_' */}
      <path
        d="M 142 98 L 152 84 L 186 84 L 186 98 Z"
        fill="#8B5CF6"
      />
    </svg>
  );
}
