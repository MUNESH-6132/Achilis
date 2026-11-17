import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Film, ArrowRight, ChevronLeft, ChevronRight } from './Icons';
import { useReduceMotion } from '../ui/motion';

export function OlympusHero({
  books = [],
  screens = [],
  onOpenBook,
  onGoLibrary,
}) {
  const reduceMotion = useReduceMotion();

  // Find all books currently being read
  const activeBooks = useMemo(() => {
    const reading = books.filter(b => b.status === 'Currently Reading');
    if (reading.length > 0) return reading;
    // Fallback: most recently updated book
    const sorted = [...books].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return sorted.slice(0, 1);
  }, [books]);

  // Active screen title in progress (if any)
  const activeScreen = useMemo(() => {
    return screens.find(s => s.status === 'In progress') || null;
  }, [screens]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Guard against index bounds
  const currentBook = activeBooks[Math.min(activeIndex, activeBooks.length - 1)] || null;

  // Calculate genuine progress
  const totalPages = currentBook ? Number(currentBook.pages) || 0 : 0;
  const currentPage = currentBook ? Number(currentBook.currentPage) || 0 : 0;
  const progressPercent = totalPages > 0
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : (Array.isArray(currentBook?.chapters) && currentBook.chapters.length > 0
      ? Math.round((currentBook.chapters.filter(c => c.done).length / currentBook.chapters.length) * 100)
      : 0);

  const pagesRemaining = totalPages > currentPage ? totalPages - currentPage : 0;

  return (
    <div className="relative mb-14 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface/80 to-ink p-8 md:p-12 shadow-2xl">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-accent/5 blur-[120px]" />

      {currentBook ? (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] gap-8 md:gap-12 items-center">
          {/* Left: Book Cover with floating animation and ambient shadow */}
          <div className="relative flex justify-center md:justify-start">
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="relative aspect-[2/3] w-48 sm:w-56 md:w-full rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] border border-line/60"
            >
              {currentBook.cover ? (
                <img
                  src={currentBook.cover}
                  alt={`Cover of ${currentBook.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-surface2 p-6 text-center text-muted">
                  <BookOpen className="h-10 w-10 text-accent/60 mb-2" />
                  <span className="font-serif text-sm font-semibold text-text line-clamp-2">
                    {currentBook.title}
                  </span>
                  <span className="text-[10px] text-muted mt-1">{currentBook.author || 'Unknown'}</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: Book Details & Actions */}
          <div className="flex flex-col justify-center">
            {/* Top Row: Subtitle & Multi-book switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent font-semibold">
                  Where You Left Off · Athena
                </span>
                {activeBooks.length > 1 && (
                  <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-mono text-muted">
                    {activeIndex + 1} of {activeBooks.length} reading
                  </span>
                )}
              </div>

              {/* Multi-book Switcher controls */}
              {activeBooks.length > 1 && (
                <div className="flex items-center gap-1.5 bg-surface2/80 rounded-full p-1 border border-line">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(prev => (prev > 0 ? prev - 1 : activeBooks.length - 1))}
                    aria-label="Previous active book"
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:text-text hover:bg-surface"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(prev => (prev < activeBooks.length - 1 ? prev + 1 : 0))}
                    aria-label="Next active book"
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:text-text hover:bg-surface"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Book Title */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text leading-tight mb-2">
              {currentBook.title}
            </h1>

            {/* Author */}
            <p className="text-sm md:text-base text-muted font-medium mb-6">
              by <span className="text-text">{currentBook.author || 'Unknown author'}</span>
            </p>

            {/* Progress Bar & Real Statistics */}
            <div className="space-y-2 mb-8 max-w-lg">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted">
                  {totalPages > 0
                    ? `Page ${currentPage} of ${totalPages}`
                    : (currentBook.chapters?.length ? `${currentBook.chapters.filter(c => c.done).length} of ${currentBook.chapters.length} chapters` : 'In progress')}
                </span>
                <span className="text-accent font-semibold">{progressPercent}%</span>
              </div>

              {/* Progress track */}
              <div className="h-2 w-full rounded-full bg-ink/70 border border-line overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-accent shadow-[0_0_12px_rgba(180,155,112,0.6)] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Genuine Stats Row */}
              <div className="flex flex-wrap gap-4 pt-2 text-[11px] font-mono text-muted">
                {totalPages > 0 && pagesRemaining > 0 && (
                  <span><strong className="text-text">{pagesRemaining}</strong> pages remaining</span>
                )}
                {currentBook.tags && (
                  <span className="truncate max-w-[200px]">Tags: <strong className="text-text">{currentBook.tags}</strong></span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenBook?.(currentBook)}
                className="inline-flex items-center gap-2.5 rounded-full bg-accent px-6 py-3 text-xs md:text-sm font-bold text-ink shadow-[0_10px_25px_-5px_rgba(180,155,112,0.4)] hover:bg-accent/90 hover:scale-[1.02] transition-all"
              >
                <span>Continue Reading</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onGoLibrary}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-5 py-3 text-xs md:text-sm font-medium text-text hover:border-accent/40 hover:text-accent transition-colors"
              >
                <span>View Library</span>
              </button>

              {/* Optional Cinema in-progress badge */}
              {activeScreen && (
                <div className="hidden lg:flex items-center gap-2 rounded-full border border-line/80 bg-ink/40 px-3.5 py-1.5 text-xs text-muted">
                  <Film className="h-3.5 w-3.5 text-accent" />
                  <span className="truncate max-w-[140px]">Watching: <strong className="text-text">{activeScreen.title}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: No book currently reading */
        <div className="text-center py-8">
          <BookOpen className="mx-auto h-12 w-12 text-accent/60 mb-4" />
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-text mb-2">
            Welcome to Olympus
          </h2>
          <p className="text-sm text-muted max-w-md mx-auto mb-6 leading-relaxed">
            Choose a book from your library or add a new title to begin tracking your reading journey.
          </p>
          <button
            type="button"
            onClick={onGoLibrary}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-ink hover:bg-accent/90 transition-all"
          >
            <span>Explore Library · Athena</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
