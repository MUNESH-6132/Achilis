import React from 'react';

/**
 * Achilis Helmet Logo
 * Minimalist, sophisticated Greek Corinthian warrior helmet silhouette.
 * Scalable from 16px favicon to prominent display headers.
 */
export function HelmetLogo({ className = "h-8 w-8", color, ariaLabel = "Achilis" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={ariaLabel}
      role="img"
    >
      {/* Plume Crest - sweeping elegant arc */}
      <path
        d="M18 4C23 4 33 6.5 38 12.5C40.5 15.5 41 18.5 39 19C37.2 19.5 35 17 32 15C27.5 12 21 10.5 14 11C11.5 11.2 9 11.7 7 12.5C7.2 9.5 10 5.5 18 4Z"
        fill={color || "currentColor"}
        className="opacity-95"
      />
      {/* Plume Spine line */}
      <path
        d="M13 10.5C21 10 27.5 11.8 32 15C34.5 16.8 36.5 18.5 38 18.5"
        stroke={color || "currentColor"}
        strokeWidth="1.2"
        strokeLinecap="round"
        className="opacity-40"
      />
      {/* Helmet Skull Dome & Brow */}
      <path
        d="M13 13C20 12.8 28 15 31.5 20C33.5 23 34 26 34 30C34 32.5 33 35 32 37.5C31.5 38.5 30 39.5 28.5 39.5C27 39.5 26.5 38 26.5 36.5C26.5 32.5 26 29 24.5 26.5C23.5 25 21.5 24.5 19 24.5H16.5C14.5 24.5 13.5 25.5 13 27.5C12.2 30.5 11.8 34 11.5 37.5C11.3 39.5 10 40 8.5 39C7 38 7 35.5 7.5 32C8.2 26 9.5 19 13 13Z"
        fill={color || "currentColor"}
      />
      {/* Corinthian Eye-Slit / Visor Cutout (Negative Space defined by stylized eye opening) */}
      <path
        d="M17.5 21.5C20.5 21.5 23.5 22.8 25 24.5C23 25.2 20.5 25.2 18 24.2C16.8 23.7 16.5 22.8 17.5 21.5Z"
        fill="var(--c-ink, #08090C)"
        className="transition-colors"
      />
      {/* Nasal Guard Accent Line */}
      <path
        d="M20 25.5V33"
        stroke="var(--c-ink, #08090C)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Lower Cheek-Guard & Neck-Guard Profile */}
      <path
        d="M8.5 33.5C10 33 11 34 11.5 36C12.5 39.5 14.5 42 18.5 42.5C21 42.8 23 42 24.5 40.5C26 39 27 36 27.5 33"
        stroke={color || "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
        className="opacity-70"
      />
    </svg>
  );
}

/**
 * HelmetLogoMark
 * Compact, ultra-clean warrior emblem optimized for favicons and small avatar icons (16-32px).
 */
export function HelmetLogoMark({ className = "h-5 w-5", color = "#B49B70" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Crest */}
      <path
        d="M8 2.5C11 2.5 17 4 19.5 7.5C20.5 9 20.5 10.5 19 10.5C17 10.5 14.5 8.5 11 7.5C8 6.5 5 7 4 7.5C4.2 5 6 2.5 8 2.5Z"
        fill={color}
      />
      {/* Helmet Body */}
      <path
        d="M6.5 8C10.5 7.8 15 9.2 17 12.5C18 14.2 18 16.5 17.5 18.5C17 20 16 20.5 15 20C14.5 18 14 15.5 13 14C12 13 10.5 13 9 13H8C7 13 6.5 14 6 15.5C5.5 17.5 5 20 4.2 20C3.5 20 3.2 18.5 3.5 16.5C4 13 4.8 9.5 6.5 8Z"
        fill={color}
      />
      {/* Eye Slit */}
      <path
        d="M9 11.5C10.8 11.5 12.5 12.3 13.5 13.5C12 14 10.5 14 9 13.2C8.2 12.8 8.2 12.2 9 11.5Z"
        fill="var(--c-ink, #08090C)"
      />
    </svg>
  );
}
