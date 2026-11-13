import React, { useEffect, useRef, useState } from 'react';
import { Cover } from './Cover';
import { ChevronLeft, ChevronRight, Edit } from './Icons';

const BUTTON_BASE = 'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40';
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent px-4 py-2.5 text-ink hover:bg-[#ff6a1f] hover:shadow-[0_12px_30px_-12px_#ff5500] active:scale-[.98]`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line px-4 py-2.5 text-white/80 hover:border-accent/60 hover:bg-white/[0.04] hover:text-white active:scale-[.98]`;

function getChapterProgress(book) {
  const chapters = Array.isArray(book.chapters) ? book.chapters : [];
  return chapters.length
    ? { done: chapters.filter(chapter => chapter.done).length, total: chapters.length }
    : null;
}

function ShelfBook({ book, active, onOpen, onEdit, delay = 0 }) {
  const [flipped, setFlipped] = useState(false);
  const flipTimer = useRef(null);
  const progress = getChapterProgress(book);

  useEffect(() => () => clearTimeout(flipTimer.current), []);

  const startFlipTimer = () => {
    clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(() => setFlipped(true), 1000);
  };

  const handleLeave = event => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    clearTimeout(flipTimer.current);
    setFlipped(false);
  };

  return (
    <div
      className="shelf-item group shrink-0 snap-center"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={startFlipTimer}
      onMouseLeave={handleLeave}
      onFocus={startFlipTimer}
      onBlur={handleLeave}
    >
      <div className={`flip-scene relative aspect-[2/3] w-[148px] rounded-2xl sm:w-[164px] ${active ? 'ring-2 ring-accent/70 ring-offset-4 ring-offset-ink' : ''}`}>
        <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${book.title || 'book'}`}
            className="flip-face border border-line bg-surface2 text-left"
          >
            <Cover book={book} />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
            {progress && (
              <span className="absolute bottom-2 right-2 rounded-full border border-line bg-black/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white/85">
                {progress.done}/{progress.total}
              </span>
            )}
          </button>
          <div className="flip-face flip-back flex flex-col border border-line bg-surface p-3">
            <p className="line-clamp-2 font-display text-sm font-bold leading-tight">{book.title || 'Untitled'}</p>
            <p className="mt-1 truncate text-[11px] text-muted">{book.author || 'Unknown author'}</p>
            <p className="mt-2 text-[11px] leading-snug text-white/60">
              {progress
                ? `${progress.done} of ${progress.total} chapters read`
                : Number(book.pages)
                  ? `${book.pages} pages`
                  : 'No chapters tracked yet'}
            </p>
            <div className="mt-auto flex flex-col gap-1.5 pt-3">
              <button type="button" onClick={onOpen} className={`${BUTTON_PRIMARY} w-full px-2 py-1.5 text-[11px]`}>
                Details
              </button>
              <button type="button" onClick={() => onEdit(book)} className={`${BUTTON_SECONDARY} w-full px-2 py-1.5 text-[11px]`}>
                <Edit className="h-3 w-3" /> Edit
              </button>
            </div>
          </div>
        </div>
        {!flipped && (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onEdit(book);
            }}
            aria-label={`Edit ${book.title || 'book'}`}
            title="Edit book"
            className="absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full border border-line bg-black/70 text-white/80 transition hover:border-accent/60 hover:text-accent opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-3 w-[148px] truncate text-center text-xs font-semibold sm:w-[164px]">{book.title || 'Untitled'}</p>
    </div>
  );
}

export function ShelfView({ books, onOpen, onEdit }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const shelfRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const activeIndex = books.length ? Math.min(index, books.length - 1) : 0;

  useEffect(() => {
    if (paused || books.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex(current => (current + 1) % books.length);
    }, 25000);
    return () => clearInterval(timer);
  }, [paused, books.length]);

  useEffect(() => {
    const shelf = shelfRef.current;
    const activeBook = shelf?.children[activeIndex];
    if (!shelf || !activeBook) return;
    shelf.scrollTo({
      left: activeBook.offsetLeft - (shelf.clientWidth - activeBook.clientWidth) / 2,
      behavior: prefersReducedMotion.current ? 'auto' : 'smooth',
    });
  }, [activeIndex]);

  const move = amount => {
    if (!books.length) return;
    setIndex(current => (current + amount + books.length) % books.length);
  };

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-line bg-gradient-to-b from-surface to-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-center justify-between px-5 pt-4 text-[11px] text-muted">
        <span>{paused ? 'Floating paused while you look' : 'Floating shelf'}</span>
        <span className="tabular-nums">{activeIndex + 1} of {books.length}</span>
      </div>
      <div ref={shelfRef} className="no-scrollbar flex snap-x items-end gap-6 overflow-x-auto px-8 pb-3 pt-8">
        {books.map((book, bookIndex) => (
          <ShelfBook
            key={book.id}
            book={book}
            active={bookIndex === activeIndex}
            delay={bookIndex * 350}
            onOpen={() => onOpen(book)}
            onEdit={onEdit}
          />
        ))}
      </div>
      <div className="h-3 bg-gradient-to-b from-[#312a25] to-[#1a1716] shadow-[0_12px_26px_rgba(0,0,0,0.8)]" />
      <div className="h-2 bg-[#0c0b0a]" />
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-muted">Hover a cover for one second to flip it. The shelf moves on every 25 seconds.</p>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} className={`${BUTTON_SECONDARY} px-3 py-1.5 text-xs`} aria-label="Previous book">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => move(1)} className={`${BUTTON_SECONDARY} px-3 py-1.5 text-xs`} aria-label="Next book">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
