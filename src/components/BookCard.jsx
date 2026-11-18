import React from 'react';
import { BookCover } from './BookCover';
import { StatusPill } from './StatusPill';
import { Stars } from './Stars';
import { Edit } from './Icons';
import { useAchilles } from '../context/AchillesContext';

export function BookCard({ book, onOpen, onEdit, selected, selectMode, onToggle }) {
  const { update } = useAchilles();

  const handleStatusChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = e.target.value;

    update(state => ({
      ...state,
      books: state.books.map(b => b.id === book.id ? { ...b, status: newStatus } : b)
    }));
  };

  const handleActivate = () => {
    if (selectMode) {
      if (onToggle) onToggle(book.id);
      return;
    }
    onOpen?.(book);
  };

  return (
    <article className="group relative flex flex-col transition-transform duration-300 hover:-translate-y-2">
      <button
        type="button"
        aria-label={selectMode ? `${selected ? 'Deselect' : 'Select'} ${book.title || 'untitled book'}` : `Open ${book.title || 'untitled book'}`}
        aria-pressed={selectMode ? Boolean(selected) : undefined}
        className="flex w-full flex-col text-left"
        onClick={handleActivate}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)]">
          <BookCover book={book} title={book.title} author={(Array.isArray(book.author_name) ? book.author_name : [book.author || ""]).slice(0, 2).join(", ")} cover={book.cover} onAddCover={(url) => { const { update } = useAchilles(); update(state => ({ ...state, books: state.books.map(b => b.id === book.id ? { ...b, cover: url } : b) })); }} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-transparent transition duration-300 group-hover:ring-accent/60"
          />
          {selectMode && (
            <span
              aria-hidden="true"
              className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-sm border-2 transition ${selected ? 'border-accent bg-accent text-ink' : 'border-line bg-ink/80 text-transparent'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
          )}
          <div className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <StatusPill status={book.status || "Watchlist"} />
          </div>
        </div>
        <div className="mt-4 flex w-full flex-col px-1">
          <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-white transition group-hover:text-white">
            {book.title || "Untitled"}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted">{book.author || "Unknown"}</p>
          <div className="mt-1 flex items-center justify-between">
            <Stars value={book.rating || 0} className="text-xs scale-90 origin-left" />
            {book.pages ? <span className="text-[10px] text-muted">{book.pages}p</span> : null}
          </div>
        </div>
      </button>
      {!selectMode && (
        <>
          <button
            type="button"
            onClick={() => onEdit(book)}
            aria-label={`Edit ${book.title || 'untitled book'}`}
            className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-white drop-shadow-lg transition-colors hover:text-accent md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          >
            <Edit className="h-4 w-4" />
          </button>
          <select
            value={book.status || 'Watchlist'}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface/90 text-xs border border-white/10 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
          >
            <>
              <option value="Watchlist">Watchlist</option>
              <option value="Currently Reading">Currently Reading</option>
              <option value="Read">Read</option>
            </>
          </select>
        </>
      )}
    </article>
  );
}