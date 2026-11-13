import React from 'react';
import { Cover } from './Cover';
import { StatusPill } from './StatusPill';
import { Stars } from './Stars';
import { Edit } from './Icons';

export function BookCard({ book, onOpen, onEdit, selected, selectMode, onToggle }) {
  return (
    <div 
      className="group relative flex flex-col cursor-pointer transition"
      onClick={() => selectMode ? onToggle(book.id) : onOpen(book)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)]">
        <Cover book={book} />
        {selectMode && (
          <div className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 ${selected ? 'border-accent bg-accent text-ink' : 'border-white/50 bg-black/50 text-transparent'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
        )}
        {!selectMode && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(book); }}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition hover:bg-accent hover:text-ink group-hover:opacity-100"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="absolute bottom-2 left-2">
          <StatusPill status={book.status || "Watchlist"} className="backdrop-blur-md bg-black/60 shadow-sm" />
        </div>
      </div>
      <div className="mt-3 flex flex-col px-0.5">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-white/90 group-hover:text-accent transition">
          {book.title || "Untitled"}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          {book.author || "Unknown"}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <Stars value={book.rating || 0} className="text-xs scale-90 origin-left" />
          {book.pages ? <span className="text-[10px] text-muted">{book.pages}p</span> : null}
        </div>
      </div>
    </div>
  );
}
