import React, { useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { Modal } from './Modal';
import { Cover } from './Cover';
import { Stars } from './Stars';
import { StatusPill } from './StatusPill';
import { BookOpen, X, Plus, Check, Edit } from './Icons';
import { generateId } from '../utils/helpers';
import { fetchChapters } from '../utils/api';

const MILESTONES = [25, 50, 75, 100];
const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15";
const BTN_ACCENT = "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink transition hover:bg-accent/90";
const INPUT_CLASS = "w-full rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-white placeholder:text-muted/50 focus:border-accent/70 focus:outline-none";

export function BookDetails({ book, onClose, onEdit }) {
  const { data, update } = useAchilles();
  const currentBook = data.books.find(b => b.id === book.id) || book;
  const chapters = Array.isArray(currentBook.chapters) ? currentBook.chapters : [];
  
  const completedCount = chapters.filter(c => c.done).length;
  const totalCount = chapters.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextMilestone = MILESTONES.find(m => m > progress) || 100;

  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [generateCount, setGenerateCount] = useState("12");

  const updateChapters = (newChapters) => {
    update(state => ({
      ...state,
      books: state.books.map(b => b.id === currentBook.id ? { ...b, chapters: newChapters } : b)
    }));
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
      setMessage("No table of contents found online. Generate or add them by hand.");
    } finally {
      setFetching(false);
    }
  };

  const metaParts = [currentBook.publisher, currentBook.published, Number(currentBook.pages) ? `${currentBook.pages} pages` : ""].filter(Boolean);

  return (
    <Modal onClose={onClose} width="max-w-3xl">
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-black leading-tight">{currentBook.title || "Untitled"}</h2>
            <p className="truncate text-xs text-muted">{currentBook.author || currentBook.creator || (currentBook.year ? String(currentBook.year) : "Unknown")}</p>
          </div>
        </div>
        <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-6 sm:grid-cols-[150px_1fr]">
          <div>
            <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line">
              <Cover book={currentBook} />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={currentBook.status || "Watchlist"} />
              <Stars value={currentBook.rating || 0} className="text-sm" />
            </div>
            {metaParts.length ? (
              <p className="mt-3 text-xs text-muted">{metaParts.join(" · ")}</p>
            ) : (
              <p className="mt-3 text-xs text-muted">Publisher and page count are not set.</p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {currentBook.description || "No description yet. Use Edit book to fetch details online or write your own."}
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-line bg-ink/40 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold">Reading progress</h3>
              <p className="text-xs text-muted">{totalCount ? `${completedCount} of ${totalCount} chapters complete · ${progress}%` : "Add chapters below to start tracking."}</p>
            </div>
            <span className="text-[11px] tabular-nums text-muted">{Number(currentBook.pages) ? `${currentBook.pages} pages` : "No page count"}</span>
          </div>
          <div className="relative mt-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
            {[25, 50, 75].map(p => (
              <span key={p} className="absolute top-0 h-2.5 w-px bg-ink" style={{ left: `${p}%` }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {MILESTONES.map(m => (
              <span key={m} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums transition ${progress >= m ? "border-accent/50 bg-accent/15 text-accent" : "border-line text-muted"}`}>
                {m}%
              </span>
            ))}
            <span className="ml-auto text-[11px] text-muted">{progress >= 100 ? "Finished" : `Next milestone ${nextMilestone}%`}</span>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-ink/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-base font-bold">Chapters and sections</h3>
              <p className="text-xs text-muted">{totalCount ? "Tick one as you finish it." : "Generate a list, fetch it online, or add your own."}</p>
            </div>
            <button onClick={fetchOnlineChapters} disabled={fetching} className={BTN_PRIMARY}>
              {fetching ? "Fetching…" : "Fetch online"}
            </button>
          </div>

          {totalCount === 0 ? (
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-line p-4">
              <div className="w-28">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">How many sections</label>
                <input type="number" min="1" max="40" value={generateCount} onChange={e => setGenerateCount(e.target.value)} className={INPUT_CLASS} />
              </div>
              <button onClick={generateChapters} className={BTN_PRIMARY}>Generate sections</button>
            </div>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {chapters.map(chapter => (
                <div key={chapter.id} className="group flex items-center gap-3 rounded-xl border border-transparent bg-surface2 px-3 py-2 transition hover:border-line" style={{ marginLeft: `${(chapter.depth || 0) * 12}px` }}>
                  <button onClick={() => toggleChapter(chapter.id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${chapter.done ? "border-accent bg-accent text-ink" : "border-line text-transparent hover:border-accent/60"}`}>
                    <Check className="h-3 w-3" />
                  </button>
                  <span className={`flex-1 text-sm leading-snug ${chapter.done ? "text-muted line-through" : "text-white/90"}`}>{chapter.title}</span>
                  <button onClick={() => removeChapter(chapter.id)} className="text-muted opacity-0 transition hover:text-accent group-hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input type="text" className={INPUT_CLASS} value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addChapter())} placeholder={totalCount ? "Add another chapter" : "Add a chapter by hand"} />
            <button onClick={addChapter} className={`${BTN_PRIMARY} shrink-0 px-4`}><Plus className="h-4 w-4" /></button>
          </div>
        </section>
        {message && <p className="rounded-2xl border border-accent/25 bg-accent/[0.08] px-4 py-2.5 text-xs text-accent">{message}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <span className="text-[11px] text-muted">Changes save as you tick them.</span>
        <div className="flex gap-2">
          <button onClick={onClose} className={BTN_PRIMARY}>Close</button>
          <button onClick={() => onEdit(currentBook)} className={BTN_ACCENT}>
            <Edit className="h-4 w-4" /> Edit book
          </button>
        </div>
      </div>
    </Modal>
  );
}
