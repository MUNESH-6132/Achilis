import React from 'react';
import { Cover } from './Cover';
import { StatusPill } from './StatusPill';
import { Stars } from './Stars';
import { Edit } from './Icons';
import { useAchilles } from '../context/AchillesContext';

export function TitleCard({ title, onOpen, onEdit }) {
  const { update } = useAchilles();

  const handleStatusChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = e.target.value;

    update(state => ({
      ...state,
      books: state.books.map(b => b.id === title.id ? { ...b, status: newStatus } : b)
    }));
  };

  return (
    <article className="group relative flex flex-col transition-transform duration-300 hover:-translate-y-2">
      <button
        type="button"
        onClick={() => onOpen(title)}
        aria-label={`Open ${title.title || 'untitled title'}`}
        className="flex w-full flex-col text-left"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)]">
          <Cover book={{ ...title, author: title.creator || title.author }} className="transition-transform duration-300 group-hover:scale-105" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg border border-transparent transition duration-300 group-hover:border-accent/30"
          />
          <div className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <StatusPill status={title.status || "Watchlist"} />
          </div>
        </div>
        <div className="mt-3 flex w-full flex-col px-1">
          <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight text-white transition group-hover:text-white">
            {title.title || "Untitled"}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted">
            {[title.creator || title.author || "Unknown", title.year].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <Stars value={title.rating || 0} className="text-xs scale-90 origin-left" />
            {title.category === "series" && title.episodes && (
              <span className="text-[10px] text-muted">{title.episodes.filter(e => e.done).length}/{title.episodes.length} ep</span>
            )}
          </div>
        </div>
      </button>
      <>
        <button
          type="button"
          onClick={() => onEdit(title)}
          aria-label={`Edit ${title.title || 'untitled title'}`}
          className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-white drop-shadow-lg transition-colors hover:text-accent md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Edit className="h-4 w-4" />
        </button>
        <select
          value={title.status || 'Watchlist'}
          onChange={handleStatusChange}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface/90 text-xs border border-white/10 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
        >
          {title.category === 'movie' || title.category === 'series' ? (
            <>
              <option value="Watchlist">Watchlist</option>
              <option value="In progress">In Progress</option>
              <option value="Watched">Watched</option>
            </>
          ) : (
            <>
              <option value="Watchlist">Want to Read</option>
              <option value="Currently Reading">Reading</option>
              <option value="Read">Read</option>
            </>
          )}
        </select>
      </>
    </article>
  );
}