import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Film, ArrowRight, ChevronLeft, ChevronRight, Plus, Flame } from './Icons';
import { useReduceMotion } from '../ui/motion';

/**
 * Card Stack Variants ("coming from behind" physical metaphor)
 */
const topCardVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 14 : -14,
    y: -8,
    scale: 0.95,
    opacity: 0.7,
    rotate: direction > 0 ? 2 : -2,
  }),
  center: {
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    rotate: 0,
  },
  exit: (direction) => ({
    x: direction > 0 ? -120 : 120,
    y: 10,
    scale: 0.94,
    opacity: 0,
    rotate: direction > 0 ? -7 : 7,
  }),
};

export function OlympusHero({
  books = [],
  screens = [],
  streak = 0,
  booksFinishedThisYear = 0,
  onOpenBook,
  onAddBook,
  onGoLibrary,
}) {
  const reduceMotion = useReduceMotion();

  // Strict real data: active reading books
  const activeBooks = useMemo(() => {
    return books.filter(b => b.status === 'Currently Reading');
  }, [books]);

  // Active screen title in progress (if any)
  const activeScreen = useMemo(() => {
    return screens.find(s => s.status === 'In progress') || null;
  }, [screens]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Guard against index bounds
  const currentBook = activeBooks.length > 0
    ? activeBooks[Math.min(activeIndex, activeBooks.length - 1)]
    : null;

  // Next 1–2 cards in the stack ring buffer
  const nextBook1 = activeBooks.length > 1
    ? activeBooks[(activeIndex + 1) % activeBooks.length]
    : null;
  const nextBook2 = activeBooks.length > 2
    ? activeBooks[(activeIndex + 2) % activeBooks.length]
    : null;

  const handleNext = useCallback(() => {
    if (activeBooks.length <= 1) return;
    setDirection(1);
    setActiveIndex(prev => (prev + 1) % activeBooks.length);
  }, [activeBooks.length]);

  const handlePrev = useCallback(() => {
    if (activeBooks.length <= 1) return;
    setDirection(-1);
    setActiveIndex(prev => (prev - 1 + activeBooks.length) % activeBooks.length);
  }, [activeBooks.length]);

  const handleGoTo = useCallback((index) => {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  const handleDragEnd = (_e, info) => {
    setIsDragging(false);
    const swipeThreshold = 45;
    const velocityThreshold = 250;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      handlePrev();
    }
  };

  // Calculate genuine progress
  const totalPages = currentBook ? Number(currentBook.pages) || 0 : 0;
  const currentPage = currentBook ? Number(currentBook.currentPage) || 0 : 0;
  const chaptersCount = Array.isArray(currentBook?.chapters) ? currentBook.chapters.length : 0;
  const chaptersDone = chaptersCount > 0 ? currentBook.chapters.filter(c => c.done).length : 0;

  const progressPercent = totalPages > 0
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : chaptersCount > 0
      ? Math.round((chaptersDone / chaptersCount) * 100)
      : 0;

  const pagesRemaining = totalPages > currentPage ? totalPages - currentPage : 0;

  return (
    <div className="relative mb-14 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface/80 to-ink p-6 sm:p-8 md:p-12 shadow-2xl">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-accent/5 blur-[120px]" />

      {currentBook ? (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] gap-8 md:gap-14 items-center">
          {/* Left: Physical Stack Metaphor (Deck of Cards) */}
          <div className="relative flex justify-center md:justify-start">
            <motion.div
              animate={!reduceMotion && !isDragging ? { y: [0, -6, 0] } : { y: 0 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="relative aspect-[2/3] w-48 sm:w-56 md:w-full max-w-[240px]"
            >
              {/* Card 2: Deepest peeking card (only when >= 3 active books) */}
              {nextBook2 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleGoTo((activeIndex + 2) % activeBooks.length)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGoTo((activeIndex + 2) % activeBooks.length)}
                  aria-label={`Switch to ${nextBook2.title}`}
                  title={`Switch to ${nextBook2.title}`}
                  className="absolute inset-0 rounded-2xl overflow-hidden border border-line/40 bg-surface2 shadow-md cursor-pointer transition-transform duration-300 pointer-events-auto hover:scale-[0.92]"
                  style={{
                    transform: 'translate3d(26px, -15px, 0) scale(0.90)',
                    opacity: 0.35,
                    zIndex: 10,
                    transformOrigin: 'bottom center',
                  }}
                >
                  {nextBook2.cover ? (
                    <img
                      src={nextBook2.cover}
                      alt=""
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-muted">
                      <BookOpen className="h-8 w-8 text-accent/40 mb-1" />
                      <span className="font-display text-xs text-text line-clamp-1">{nextBook2.title}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Card 1: Middle peeking card (when >= 2 active books) */}
              {nextBook1 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleGoTo((activeIndex + 1) % activeBooks.length)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGoTo((activeIndex + 1) % activeBooks.length)}
                  aria-label={`Switch to ${nextBook1.title}`}
                  title={`Switch to ${nextBook1.title}`}
                  className="absolute inset-0 rounded-2xl overflow-hidden border border-line/50 bg-surface2 shadow-lg cursor-pointer transition-transform duration-300 pointer-events-auto hover:scale-[0.97]"
                  style={{
                    transform: 'translate3d(14px, -8px, 0) scale(0.95)',
                    opacity: 0.65,
                    zIndex: 20,
                    transformOrigin: 'bottom center',
                  }}
                >
                  {nextBook1.cover ? (
                    <img
                      src={nextBook1.cover}
                      alt=""
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-muted">
                      <BookOpen className="h-8 w-8 text-accent/50 mb-1" />
                      <span className="font-display text-xs text-text line-clamp-1">{nextBook1.title}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Top Active Card: Draggable on mobile/desktop, animated via AnimatePresence */}
              <AnimatePresence custom={direction} mode="popLayout" initial={false}>
                <motion.div
                  key={currentBook.id || activeIndex}
                  custom={direction}
                  variants={topCardVariants}
                  initial={reduceMotion ? false : "enter"}
                  animate="center"
                  exit={reduceMotion ? undefined : "exit"}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                  }
                  drag={activeBooks.length > 1 && !reduceMotion ? "x" : false}
                  dragDirectionLock
                  dragElastic={0.2}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  style={{
                    zIndex: 30,
                    transformOrigin: 'bottom center',
                    touchAction: 'pan-y',
                  }}
                  className={`relative h-full w-full rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] border border-line/60 bg-surface2 select-none ${
                    activeBooks.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  {currentBook.cover ? (
                    <img
                      src={currentBook.cover}
                      alt={`Cover of ${currentBook.title}`}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-muted pointer-events-none">
                      <BookOpen className="h-10 w-10 text-accent/60 mb-2" />
                      <span className="font-display text-sm font-semibold text-text line-clamp-2">
                        {currentBook.title}
                      </span>
                      <span className="text-[10px] text-muted mt-1">{currentBook.author || 'Unknown author'}</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right: Book Details & Actions */}
          <div className="flex flex-col justify-center">
            {/* Top Row: Subtitle & Clean Accessible Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent font-semibold">
                  Where You Left Off · Athena
                </span>
                {/* Only render "N of M active" when multiple books exist */}
                {activeBooks.length > 1 && (
                  <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-[10px] font-mono text-muted">
                    {activeIndex + 1} of {activeBooks.length} active
                  </span>
                )}
              </div>

              {/* Accessible Prev/Next Switcher (completely hidden when only 1 book active, no dot-pill) */}
              {activeBooks.length > 1 && (
                <div className="flex items-center gap-1 hidden sm:flex">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous active book in stack"
                    title="Previous book in stack"
                    className="grid h-7 w-7 place-items-center rounded-full border border-line bg-surface2/80 text-muted hover:text-text hover:border-accent/40 hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next active book in stack"
                    title="Next book in stack"
                    className="grid h-7 w-7 place-items-center rounded-full border border-line bg-surface2/80 text-muted hover:text-text hover:border-accent/40 hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Book Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text leading-tight mb-2">
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
                    : (chaptersCount > 0 ? `${chaptersDone} of ${chaptersCount} sections done` : 'Currently reading')}
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

              {/* Genuine Reading Stats Row beside / below progress */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {totalPages > 0 && pagesRemaining > 0 && (
                  <span className="text-[11px] font-mono text-muted">
                    <strong className="text-text">{pagesRemaining}</strong> pages remaining
                  </span>
                )}

                {/* Compact genuine stats pills */}
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-0.5 text-[10px] font-mono font-medium text-accent border border-line">
                    <Flame className="h-3 w-3 text-accent" />
                    <span>{streak} day streak</span>
                  </span>
                )}

                {booksFinishedThisYear > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-0.5 text-[10px] font-mono font-medium text-muted border border-line">
                    <span>{booksFinishedThisYear} finished this year</span>
                  </span>
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
                onClick={() => onOpenBook(currentBook)}
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
        <div className="relative z-10 text-center py-12 px-4 max-w-xl mx-auto">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface2 border border-line text-accent mb-5">
            <BookOpen className="h-8 w-8 stroke-[1.5]" />
          </div>

          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent font-semibold block mb-2">
            Olympus · Quiet Sanctuary
          </span>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text mb-3">
            No Book Currently in Progress
          </h2>

          <p className="text-xs sm:text-sm text-muted mb-8 leading-relaxed">
            Begin your next intellectual adventure. Capture a new title with Hermes or select a volume waiting in your Athena Library.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onAddBook}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs sm:text-sm font-semibold text-ink shadow-[0_10px_25px_-5px_rgba(180,155,112,0.4)] hover:bg-accent/90 hover:scale-[1.02] transition-all"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Capture with Hermes</span>
            </button>

            <button
              type="button"
              onClick={onGoLibrary}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-5 py-2.5 text-xs sm:text-sm font-medium text-text hover:border-accent/40 hover:text-accent transition-colors"
            >
              <span>Explore Athena Library</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
