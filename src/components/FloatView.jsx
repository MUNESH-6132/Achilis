import React, { useEffect, useRef, useState } from 'react';
import { Cover } from './Cover';
import { ChevronLeft, ChevronRight } from './Icons';

const BUTTON_BASE = 'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40';
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent px-4 py-2.5 text-ink hover:bg-[#ff6a1f] hover:shadow-[0_12px_30px_-12px_#ff5500] active:scale-[.98]`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line px-4 py-2.5 text-white/80 hover:border-accent/60 hover:bg-white/[0.04] hover:text-white active:scale-[.98]`;

function getNextStatus(item) {
  const isEntertainment = item.category === 'movie' || item.category === 'series';
  const order = isEntertainment
    ? ['Watchlist', 'In progress', 'Watched']
    : ['Watchlist', 'Currently Reading', 'Read'];
  const next = order[(order.indexOf(item.status) + 1) % order.length];
  const labels = isEntertainment
    ? { Watchlist: 'Start watching', 'In progress': 'Mark watched', Watched: 'Watch again' }
    : { Watchlist: 'Start reading', 'Currently Reading': 'Mark finished', Read: 'Read again' };
  return { next, label: labels[item.status] || (isEntertainment ? 'Start watching' : 'Start reading') };
}

function StatusAction({ item, onStatus }) {
  if (!onStatus) return null;
  const { next, label } = getNextStatus(item);
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        event.preventDefault();
        onStatus(item, next);
      }}
      className="truncate rounded-full border border-line px-3.5 py-2 text-xs font-semibold text-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
      title={`Move to ${next}`}
    >
      {label}
    </button>
  );
}

export function FloatView({ books, onOpen, onStatus }) {
  const [index, setIndex] = useState(() => Math.floor(Math.max(0, books.length - 1) / 2));
  const holdUntil = useRef(0);
  const activeIndex = books.length ? ((index % books.length) + books.length) % books.length : 0;
  const activeBook = books[activeIndex];

  const move = amount => {
    holdUntil.current = Date.now() + 3200;
    setIndex(current => {
      const next = (current + amount) % (books.length || 1);
      return next < 0 ? next + (books.length || 1) : next;
    });
  };

  useEffect(() => {
    if (books.length < 2) return undefined;
    const timer = setInterval(() => {
      if (Date.now() >= holdUntil.current) {
        setIndex(current => (current + 1) % books.length);
      }
    }, 1300);
    return () => clearInterval(timer);
  }, [books.length]);

  return (
    <div>
      <div
        className="relative mx-auto h-[430px] w-full max-w-4xl select-none outline-none"
        style={{ perspective: '1400px' }}
        tabIndex={0}
        onMouseEnter={() => { holdUntil.current = Date.now() + 2500; }}
        onMouseLeave={() => { holdUntil.current = Date.now() + 400; }}
        role="group"
        aria-label="Book carousel"
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            move(-1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            move(1);
          } else if (event.key === 'Enter' && activeBook) {
            onOpen(activeBook);
          }
        }}
      >
        {books.map((book, bookIndex) => {
          const offset = bookIndex - activeIndex;
          const distance = Math.abs(offset);
          if (distance > 3) return null;
          return (
            <button
              key={book.id}
              type="button"
              onClick={() => (offset === 0 ? onOpen(book) : setIndex(bookIndex))}
              aria-label={book.title}
              className="absolute left-1/2 top-1/2 h-[300px] w-[200px] overflow-hidden rounded-2xl border border-line shadow-[0_40px_60px_-30px_rgba(0,0,0,0.95)] transition-[transform,opacity] duration-500 ease-out"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 152}px) translateZ(${-distance * 145}px) rotateY(${-offset * 34}deg) scale(${1 - distance * 0.05})`,
                opacity: distance > 2 ? 0.3 : 1,
                zIndex: 20 - distance,
                filter: distance === 0 ? 'none' : 'brightness(0.55)',
              }}
            >
              <Cover book={book} />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-col items-center gap-3">
        {activeBook && (
          <div className="text-center">
            <p className="font-display text-lg font-bold">{activeBook.title}</p>
            <p className="text-xs text-muted">
              {activeBook.author || activeBook.creator || (activeBook.year ? String(activeBook.year) : 'Unknown')}
              {activeBook.rating ? ` · ${'★'.repeat(activeBook.rating)}` : ''}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button type="button" className={BUTTON_SECONDARY} onClick={() => move(-1)} disabled={books.length < 2} aria-label="Previous book">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={BUTTON_PRIMARY} onClick={() => activeBook && onOpen(activeBook)}>
            Open details
          </button>
          {activeBook && <StatusAction item={activeBook} onStatus={onStatus} />}
          <button type="button" className={BUTTON_SECONDARY} onClick={() => move(1)} disabled={books.length < 2} aria-label="Next book">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {books.map((book, bookIndex) => (
            <button
              key={book.id}
              type="button"
              onClick={() => {
                holdUntil.current = Date.now() + 3200;
                setIndex(bookIndex);
              }}
              aria-label={`Go to ${book.title}`}
              className={`h-1.5 rounded-full transition-all ${bookIndex === activeIndex ? 'w-5 bg-accent' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted">Drifts on its own · hover to pause · click a cover to open</p>
      </div>
    </div>
  );
}
