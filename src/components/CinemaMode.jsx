import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from './Icons';

export function CinemaMode({ items, onClose, onOpen }) {
  const list = Array.isArray(items) ? items : [];
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const count = list.length;

  useEffect(() => {
    if (count < 2) return undefined;
    let transitionTimer;
    const timer = setInterval(() => {
      setFading(true);
      transitionTimer = setTimeout(() => {
        setIndex(current => (current + 1) % count);
        setFading(false);
      }, 420);
    }, 5000);
    return () => {
      clearInterval(timer);
      clearTimeout(transitionTimer);
    };
  }, [count]);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!count) return null;

  const item = list[((index % count) + count) % count];
  const isEntertainment = item.category === "movie" || item.category === "series";
  const meta = isEntertainment
    ? [item.category === "series" ? "Series" : "Movie", item.creator, item.year].filter(Boolean).join(" · ")
    : [item.author, item.published || item.pages ? String(item.published || item.pages) : ""].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-black/95" role="dialog" aria-label="Cinema mode">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: item.cover ? `url(${item.cover})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(46px) saturate(1.3)",
          opacity: 0.42,
          transform: "scale(1.2)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90" />
      <div className="relative flex items-center justify-between gap-3 px-5 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Cinema · {index + 1} / {count}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIndex(current => (current - 1 + count) % count)} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-accent/60 hover:text-accent" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setIndex(current => (current + 1) % count)} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-accent/60 hover:text-accent" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-accent/60 hover:text-accent" aria-label="Close cinema mode">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-6 pb-10">
        <div className="flex max-w-3xl flex-col items-center text-center transition-opacity duration-300 sm:flex-row sm:items-end sm:gap-8 sm:text-left" style={{ opacity: fading ? 0 : 1 }}>
          {item.cover ? (
            <img src={item.cover} alt="" loading="lazy" decoding="async" className="mb-6 w-40 rounded-2xl border border-white/10 object-cover shadow-2xl sm:mb-0 sm:w-56" style={{ aspectRatio: "2/3" }} />
          ) : (
            <div className="mb-6 grid w-40 place-items-center rounded-2xl border border-white/10 bg-white/5 text-4xl font-black text-white/30 sm:mb-0 sm:w-56" style={{ aspectRatio: "2/3" }}>
              {String(item.title || "?").slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">{meta || "Achilis"}</p>
            <h2 className="mt-2 font-display text-3xl font-black leading-tight text-white sm:text-5xl">{item.title || "Untitled"}</h2>
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
              className="mt-5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-accent hover:text-accent"
            >
              Open details <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="relative h-1 w-full bg-white/10">
        <div key={index} className="h-full bg-accent" style={{ width: "0%", animation: "achCinemaBar 5s linear forwards" }} />
      </div>
    </div>
  );
}
