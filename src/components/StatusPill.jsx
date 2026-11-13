import React from 'react';

export function StatusPill({ status, className = "" }) {
  const colorClass = 
    status === "Read" || status === "Watched" 
      ? "border-accent/40 bg-accent/15 text-accent" 
      : status === "Currently Reading" || status === "In progress" 
        ? "border-white/25 bg-white/10 text-white" 
        : "border-line bg-black/55 text-muted";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass} ${className}`}>
      {status}
    </span>
  );
}
