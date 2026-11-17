import React from 'react';

/**
 * Achilis Logo
 * Minimal Corinthian-helmet silhouette + ACHILIS wordmark.
 * Crisp at 16px, works in monochrome and antique gold,
 * usable as favicon + loading animation.
 */
export function Logo({ className = "w-8 h-8", theme = "dark" }) {
  const accent = theme === 'dark' ? '#B49B70' : '#9B8158';
  const ink = theme === 'dark' ? '#111111' : '#FFFFFF';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Achilis"
    >
      <path
        d="M32 7c-7 0-11 5-10 11h20c1-6-3-11-10-11z"
        fill={accent}
      />
      <path
        d="M32 16c-11 0-19 9-19 21v7c0 4 3 6 7 6h4v-9c0-4 3-7 8-7s8 3 8 7v9h4c4 0 7-2 7-6v-7c0-12-8-21-19-21z"
        fill={accent}
      />
      <rect x="32" y="34" width="4" height="16" rx="2" fill={ink} />
    </svg>
  );
}

/** Wordmark "ACHILIS" in the display font, tracking-wide. */
export function LogoWordmark({ className = "font-display text-[2xl] tracking-[0.2em] inline-block" }) {
  return (
    <span className={className}>
      ACHILIS
    </span>
  );
}