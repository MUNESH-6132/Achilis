import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from './Icons';

export function CinemaMode({ items, onClose, onOpen }) {
  const list = Array.isArray(items) ? items : [];
  const [index, setIndex] = useState(0);
  const count = list.length;
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [onClose]);

  if (!count) return null;

  const item = list[((index % count) + count) % count];
  const isEntertainment = item.category === "movie" || item.category === "series";
  const meta = isEntertainment
    ? [item.category === "series" ? "Series" : "Movie", item.creator, item.year].filter(Boolean).join(" · ")
    : [item.author, item.published || item.pages ? String(item.published || item.pages) : ""].filter(Boolean).join(" · ");

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-ink" role="dialog" aria-modal="true" aria-labelledby="cinema-mode-title" tabIndex={-1}>
      <div className="relative flex items-center justify-between gap-3 px-5 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Cinema · {index + 1} / {count}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIndex(current => (current - 1 + count) % count)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-white/70 transition hover:border-accent/60 hover:text-accent" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setIndex(current => (current + 1) % count)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-white/70 transition hover:border-accent/60 hover:text-accent" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-line text-white/70 transition hover:border-accent/60 hover:text-accent" aria-label="Close cinema mode">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-6 pb-10">
        <div className="flex max-w-3xl flex-col items-center text-center sm:flex-row sm:items-end sm:gap-8 sm:text-left">
          {item.cover ? (
            <img src={item.cover} alt={`Cover of ${item.title || "untitled"}`} loading="lazy" decoding="async" className="mb-6 w-40 rounded-2xl object-contain sm:mb-0 sm:w-56" style={{ aspectRatio: "2/3" }} />
          ) : (
            <div className="mb-6 grid w-40 place-items-center rounded-2xl bg-surface2 text-4xl font-bold text-muted sm:mb-0 sm:w-56" style={{ aspectRatio: "2/3" }}>
              {String(item.title || "?").slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">{meta || "Achilis"}</p>
            <h2 id="cinema-mode-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{item.title || "Untitled"}</h2>
            {item.description ? (
              <p className="line-3 mt-3 max-w-xl text-sm leading-relaxed text-white/60">{item.description}</p>
            ) : item.notes ? (
              <p className="line-3 mt-3 max-w-xl text-sm leading-relaxed text-white/60">{item.notes}</p>
            ) : null}
            {isEntertainment && item.where && <p className="mt-2 text-xs text-white/40">{item.where}</p>}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpen?.(item);
              }}
              className="mt-5 rounded-full border border-line px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-accent hover:text-accent"
            >
              Open details <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
