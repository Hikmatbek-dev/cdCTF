import React from "react";

interface CdCtfLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official cdCTF Monogram Logo Component
 * Continuous line 'cd' monogram with purple terminal cursor bar '_'
 */
export function CdCtfLogo({ className = "w-8 h-8", size }: CdCtfLogoProps) {
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="cdCTF Logo"
    >
      {/* Continuous 'cd' vector path */}
      <path
        d="M 42 50 
           C 42 32, 22 32, 22 50 
           C 22 68, 42 68, 52 50 
           C 62 32, 82 32, 82 50 
           C 82 68, 62 68, 62 50 
           L 82 15 
           L 82 64"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Terminal prompt cursor '_' */}
      <rect
        x="96"
        y="56"
        width="34"
        height="9"
        rx="4.5"
        fill="#9064F7"
      />
    </svg>
  );
}
