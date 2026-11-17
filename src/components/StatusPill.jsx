import React from 'react';

export function StatusPill({ status, className = "" }) {
  const isComplete = status === "Read" || status === "Watched";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${isComplete ? "text-accent" : "text-muted"} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isComplete ? "bg-accent" : "bg-muted"}`} />
      {status}
    </span>
  );
}
