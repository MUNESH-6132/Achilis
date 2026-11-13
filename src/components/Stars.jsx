import React from 'react';

export function Stars({ value = 0, onChange, className = "" }) {
  const isInteractive = typeof onChange === "function";
  const ariaLabel = value ? `${value} out of 5 stars` : "Not rated";

  return (
    <div 
      className={`flex items-center gap-0.5 ${className}`} 
      {...(!isInteractive ? { role: "img", "aria-label": ariaLabel } : {})}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        isInteractive ? (
          <button 
            key={star} 
            type="button" 
            onClick={() => onChange(star === value ? 0 : star)} 
            aria-label={`${star} star${star > 1 ? "s" : ""}`} 
            className={`text-lg leading-none transition hover:scale-110 hover:text-accent ${star <= value ? "text-accent" : "text-white/20"}`}
          >
            ★
          </button>
        ) : (
          <span 
            key={star} 
            aria-hidden="true" 
            className={`text-lg leading-none ${star <= value ? "text-accent" : "text-white/20"}`}
          >
            ★
          </span>
        )
      ))}
    </div>
  );
}
