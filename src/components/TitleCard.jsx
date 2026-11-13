import React from 'react';
import { Cover } from './Cover';
import { StatusPill } from './StatusPill';
import { Stars } from './Stars';
import { Edit } from './Icons';

export function TitleCard({ title, onOpen, onEdit }) {
  return (
    <div className="group relative flex flex-col cursor-pointer transition" onClick={() => onOpen(title)}>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)]">
        <Cover book={title} />
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(title); }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition hover:bg-accent hover:text-ink group-hover:opacity-100"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-2 left-2">
          <StatusPill status={title.status || "Watchlist"} className="backdrop-blur-md bg-black/60 shadow-sm" />
        </div>
      </div>
      <div className="mt-3 flex flex-col px-0.5">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-white/90 group-hover:text-accent transition">
          {title.title || "Untitled"}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          {title.creator || title.author || "Unknown"}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <Stars value={title.rating || 0} className="text-xs scale-90 origin-left" />
          {title.category === "series" && title.episodes && (
            <span className="text-[10px] text-muted">{title.episodes.filter(e => e.done).length}/{title.episodes.length} ep</span>
          )}
        </div>
      </div>
    </div>
  );
}
