import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAchilles } from '../context/AchillesContext';
import { Cover } from './Cover';
import { Stars } from './Stars';
import { X, Plus, Check, Edit } from './Icons';
import { generateId } from '../utils/helpers';
import { fetchChapters } from '../utils/api';
import { ErrorState } from '../ui/Primitives';
import { useReduceMotion } from '../ui/motion';

const BTN_OUTLINE = "inline-flex items-center justify-center gap-2 border border-line text-text rounded-full px-4 py-2 hover:bg-surface2 transition text-xs font-semibold";
const CHAPTER_INPUT_CLASS = "w-full bg-transparent border-b border-line focus:border-accent py-2 text-text placeholder:text-muted/50 focus:outline-none transition-colors appearance-none";

export function BookDetails({ book, onClose, onEdit }) {
  const { data, update } = useAchilles();
  const reduceMotion = useReduceMotion();
  const currentBook = data.books.find(b => b.id === book.id) || book;
  const chapters = Array.isArray(currentBook.chapters) ? currentBook.chapters : [];

  const completedCount = chapters.filter(c => c.done).length;
  const totalCount = chapters.length;
  const totalPages = Number(currentBook.pages) || 0;
  const currentPage = Number(currentBook.currentPage) || 0;
  const chapterProgress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const pageProgress = totalPages ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
  const progress = totalCount ? chapterProgress : pageProgress;
  const progressLabel = totalCount
    ? `${completedCount} of ${totalCount} sections done`
    : totalPages
      ? `Page ${currentPage} of ${totalPages}`
      : "Add sections or a page count to track this read.";

  const status = currentBook.status || "Watchlist";
  const isReading = status === "Currently Reading";
  const isComplete = status === "Read";

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [message, setMessage] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [generateCount, setGenerateCount] = useState("12");
  const [review, setReview] = useState(currentBook.review || "");

  const [visible, setVisible] = useState(true);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeButtonRef = useRef(null);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    setReview(currentBook.review || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBook.id]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      onCloseRef.current?.();
    }, reduceMotion ? 0 : 260);
  }, [reduceMotion]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [requestClose]);

  const updateBook = (patch) => {
    update(state => ({
      ...state,
      books: state.books.map(b => b.id === currentBook.id ? { ...b, ...patch } : b)
    }));
  };

  const updateChapters = (newChapters) => {
    updateBook({ chapters: newChapters });
  };

  const toggleChapter = (id) => {
    updateChapters(chapters.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  const removeChapter = (id) => {
    updateChapters(chapters.filter(c => c.id !== id));
  };

  const addChapter = () => {
    const title = newChapterTitle.trim();
    if (!title) return;
    updateChapters([...chapters, { id: generateId(), title, depth: 0, done: false }]);
    setNewChapterTitle("");
    setMessage("");
  };

  const generateChapters = () => {
    const count = Math.max(1, Math.min(40, Number(generateCount) || 0));
    if (!count || totalCount) return;
    updateChapters(Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      title: `Chapter ${i + 1}`,
      depth: 0,
      done: false
    })));
    setMessage(`Added ${count} chapters. Rename or remove any of them below.`);
  };

  const fetchOnlineChapters = async () => {
    setFetching(true);
    setFetchError(false);
    setMessage("");
    try {
      const { chapters: fetched, source } = await fetchChapters(currentBook);
      const existingTitles = new Set(chapters.map(c => c.title.toLowerCase()));
      const newChapters = fetched
        .map(c => ({ ...c, id: generateId(), done: false }))
        .filter(c => !existingTitles.has(c.title.toLowerCase()));

      if (newChapters.length) {
        updateChapters([...chapters, ...newChapters]);
        setMessage(`Added ${newChapters.length} chapters from ${source}.`);
      } else {
        setMessage("Those chapters are already listed.");
      }
    } catch {
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  };

  const handleReviewChange = (event) => {
    const value = event.target.value;
    setReview(value);
    updateBook({ review: value });
  };

  const metaRows = [
    { label: 'Author', value: currentBook.author || currentBook.creator || '—' },
    { label: 'Publisher', value: currentBook.publisher || '—' },
    { label: 'Published', value: currentBook.published || (currentBook.year ? String(currentBook.year) : '—') },
    { label: 'Genres', value: Array.isArray(currentBook.tags) ? currentBook.tags.join(', ') : (currentBook.genres || '—') },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="book-drawer"
          className="fixed inset-0 z-[70] flex justify-end"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label={currentBook.title || "Book details"}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onMouseDown={requestClose}
          />
          <motion.div
            initial={reduceMotion ? false : { x: "4%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "4%", opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full max-w-5xl overflow-y-auto border-l border-line bg-ink shadow-2xl"
          >
            <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent">
                  Book {currentBook.year ? `· ${currentBook.year}` : ''} {totalPages ? `· ${totalPages} pages` : ''}
                </p>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={requestClose}
                  aria-label="Close details"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-accent/50 hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr] md:gap-12">
                <div>
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-8 rounded-full opacity-70"
                      style={{
                        background: "radial-gradient(circle at 50% 45%, rgb(var(--c-accent) / 0.30), transparent 70%)",
                        filter: "blur(32px)",
                      }}
                    />
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line shadow-2xl">
                      <Cover book={currentBook} />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={requestClose}
                      className="flex-1 rounded-md border border-line px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface2"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(currentBook)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="relative inline-flex items-center">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-3 h-1.5 w-1.5 rounded-full ${isReading || isComplete ? 'bg-accent' : 'bg-muted'}`}
                    />
                    <select
                      value={status}
                      onChange={event => updateBook({ status: event.target.value })}
                      aria-label="Reading status"
                      className={`cursor-pointer appearance-none rounded-full border py-1 pl-6 pr-7 text-[10px] font-semibold uppercase tracking-widest outline-none transition ${isReading
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : isComplete
                          ? 'border-accent/25 bg-accent/5 text-accent'
                          : 'border-line bg-surface text-muted'}`}
                    >
                      <option value="Watchlist">Want to Read</option>
                      <option value="Currently Reading">Currently Reading</option>
                      <option value="Read">Read</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="pointer-events-none absolute right-2.5 h-3 w-3 opacity-60"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>

                  <h1 className="mt-4 break-words font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
                    {currentBook.title || "Untitled"}
                  </h1>
                  <p className="mt-3 font-serif text-lg text-muted">
                    {currentBook.author || currentBook.creator || "Unknown author"}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Stars value={currentBook.rating || 0} onChange={value => updateBook({ rating: value })} className="text-lg" />
                      <span className="text-xs text-muted">{currentBook.rating ? `${currentBook.rating}/5` : "Not rated"}</span>
                    </div>
                  </div>

                  <section className="mt-8">
                    <div className="flex items-end justify-between">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Reading progress</p>
                      <span className="font-display text-2xl font-bold text-accent">{progress}%</span>
                    </div>
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted">{progressLabel}</p>
                  </section>

                  <section className="mt-8">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Context</p>
                    <p className="mt-2 font-serif text-base leading-relaxed text-text">
                      {currentBook.description || "No description available."}
                    </p>
                  </section>

                  {currentBook.quote && (
                    <section className="mt-8">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Quote</p>
                      <p className="mt-2 font-serif text-xl italic leading-relaxed text-accent">
                        “{currentBook.quote}”
                      </p>
                    </section>
                  )}

                  <section className="mt-8">
                    <label htmlFor="book-review" className="text-[10px] font-mono uppercase tracking-widest text-muted">Personal notes</label>
                    <textarea
                      id="book-review"
                      value={review}
                      onChange={handleReviewChange}
                      rows={4}
                      placeholder="Your thoughts, reflections, favorite lines…"
                      className="mt-2 w-full resize-y rounded-lg border border-line bg-surface/50 p-4 font-serif text-base leading-relaxed text-text placeholder:text-muted/50 outline-none transition focus:border-accent"
                    />
                  </section>

                  <section className="mt-8 border-t border-line">
                    {metaRows.map((row, index) => (
                      <div key={index} className="flex border-b border-line py-3">
                        <span className="w-32 shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted">{row.label}</span>
                        <span className="text-sm font-medium text-text">{row.value}</span>
                      </div>
                    ))}
                  </section>

                  <section className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Chapters and sections</p>
                        <p className="mt-1 text-xs text-muted">{totalCount ? "Tick one as you finish it." : "Generate a list, fetch it online, or add your own."}</p>
                      </div>
                      <button type="button" onClick={fetchOnlineChapters} disabled={fetching} aria-busy={fetching} className={BTN_OUTLINE}>
                        Fetch online
                        {fetching && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                      </button>
                    </div>

                    {totalCount === 0 ? (
                      <div className="mt-4 flex flex-wrap items-end gap-3">
                        <div className="w-28">
                          <label className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-muted">How many sections</label>
                          <input type="number" min="1" max="40" value={generateCount} onChange={e => setGenerateCount(e.target.value)} className={CHAPTER_INPUT_CLASS} />
                        </div>
                        <button onClick={generateChapters} className="rounded-full border border-line px-4 py-2 text-xs text-text transition hover:bg-surface2">Generate sections</button>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-3">
                        {chapters.map(chapter => (
                          <div key={chapter.id} className="group flex items-center gap-3 border-b border-line/40 py-3 transition" style={{ marginLeft: `${(chapter.depth || 0) * 12}px` }}>
                            <button type="button" onClick={() => toggleChapter(chapter.id)} aria-label={`${chapter.done ? "Mark incomplete" : "Mark complete"}: ${chapter.title}`} aria-pressed={chapter.done} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${chapter.done ? "bg-accent text-ink" : "border border-line text-muted hover:text-accent"}`}>
                              <Check className="h-3 w-3" />
                            </button>
                            <span className={`flex-1 text-sm leading-snug ${chapter.done ? "text-muted line-through" : "text-text"}`}>{chapter.title}</span>
                            <button type="button" onClick={() => removeChapter(chapter.id)} aria-label={`Remove ${chapter.title}`} className="grid h-10 w-10 shrink-0 place-items-center text-muted transition hover:text-accent">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input type="text" className={CHAPTER_INPUT_CLASS} value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addChapter())} placeholder={totalCount ? "Add another chapter" : "Add a chapter by hand"} />
                      <button type="button" onClick={addChapter} aria-label="Add chapter" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-accent hover:text-accent"><Plus className="h-4 w-4" /></button>
                    </div>

                    {message && <p className="mt-3 text-xs text-accent">{message}</p>}
                    {fetchError && (
                      <div className="mt-3">
                        <ErrorState
                          message="Could not fetch chapters online. Try again, or add chapters by hand."
                          onRetry={() => void fetchOnlineChapters()}
                        />
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}