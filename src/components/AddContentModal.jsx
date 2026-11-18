import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAchilles } from '../context/AchillesContext';
import { useReduceMotion } from '../ui/motion';
import { generateId, getTodayDateString } from '../utils/helpers';
import { searchOpenLibrary, imdbSuggest } from '../utils/api';
import { humanizeApiError } from '../utils/errors';
import { useAutosave } from '../hooks/useAutosave';
import { BookOpen, Film, Edit, X, Search, Check, Plus } from './Icons';

const MIN_BOOK_QUERY = 3;
const MIN_CINEMA_QUERY = 2;

function docToBook(doc) {
  if (!doc || !doc.title) return null;
  const author = (Array.isArray(doc.author_name) ? doc.author_name : []).slice(0, 2).join(', ');
  return {
    id: generateId(),
    category: 'book',
    title: doc.title + (doc.subtitle ? `: ${doc.subtitle}` : ''),
    author: author || 'Unknown author',
    status: 'Watchlist',
    rating: 0,
    chapters: [],
    tags: '',
    pages: Number(doc.number_of_pages_median) || 0,
    publisher: (Array.isArray(doc.publisher) ? doc.publisher[0] : doc.publisher) || '',
    published: doc.first_publish_year ? String(doc.first_publish_year) : '',
    description: '',
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function suggestionToTitle(s) {
  if (!s || !s.l) return null;
  const isSeries = s.mt === 'tv' || /series/i.test(s.qid || '');
  return {
    id: generateId(),
    category: isSeries ? 'series' : 'movie',
    title: s.l,
    year: s.y ? String(s.y) : '',
    creator: s.s || '',
    cover: s.i?.imageUrl || '',
    status: 'Watchlist',
    rating: 0,
    notes: '',
    tags: '',
    runtime: 0,
    where: '',
    seasons: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Robust, client-side CSV parser handling quoted fields with commas.
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return null;

  function parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length >= Math.max(1, headers.length - 3)) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || '';
      });
      rows.push(row);
    }
  }
  return { headers, rows };
}

export function AddContentModal({ initialType = 'book', onClose }) {
  const { update } = useAchilles();
  const reduceMotion = useReduceMotion();
  const [activeTab, setActiveTab] = useState(initialType);

  // Online / Offline tracking
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Search state for Books & Cinema
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState(new Set());
  const debounceRef = useRef(null);
  const requestRef = useRef(0);

  // Journal form state
const [journalTitle, setJournalTitle] = useState('');
  const [journalBody, setJournalBody] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);
  const { isSaving } = useAutosave(journalBody, () => {}, 1200);

  // Import state
  const [importStatus, setImportStatus] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Clear query and results when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setQuery('');
    setResults([]);
    setError('');
  };

  const minQueryLength = activeTab === 'book' ? MIN_BOOK_QUERY : MIN_CINEMA_QUERY;
  const isShortQuery = query.trim().length > 0 && query.trim().length < minQueryLength;

  // Debounced search for Books (Open Library >=3 chars) and Cinema (IMDb / TMDB >=2 chars)
  const runSearch = useCallback(async (searchTerm, tab) => {
    const term = searchTerm.trim();
    const minLength = tab === 'book' ? MIN_BOOK_QUERY : MIN_CINEMA_QUERY;

    if (term.length < minLength) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      setResults([]);
      setError("You're offline. You can still add items manually — covers will sync when you reconnect.");
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');

    try {
      if (tab === 'book') {
        const docs = await searchOpenLibrary(term);
        if (requestId !== requestRef.current) return;
        setResults(docs);
      } else if (tab === 'movie') {
        const suggestions = await imdbSuggest(term);
        if (requestId !== requestRef.current) return;
        setResults(suggestions);
      }
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setResults([]);
      // Centralized humanized error — NEVER leaks raw JSON to UI
      const humanized = humanizeApiError(err);
      setError(humanized.message);
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'journal' || activeTab === 'import') return undefined;
    const term = query.trim();
    const minLength = activeTab === 'book' ? MIN_BOOK_QUERY : MIN_CINEMA_QUERY;

    if (term.length < minLength) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(query, activeTab);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab, runSearch]);

  // Offline-First Manual Add with Detached Background Cover Enrichment
  const handleAddManually = () => {
    const cleanTitle = query.trim();
    if (!cleanTitle) return;

    const isBook = activeTab === 'book';
    const manualKey = `manual:${cleanTitle.toLowerCase()}`;
    if (addedIds.has(manualKey)) return;

    // 1. Build record locally and save IMMEDIATELY (never awaits network)
    const newItem = {
      id: generateId(),
      category: isBook ? 'book' : 'movie',
      title: cleanTitle,
      author: isBook ? 'Unknown author' : undefined,
      creator: !isBook ? 'Unknown' : undefined,
      status: 'Watchlist',
      rating: 0,
      chapters: isBook ? [] : undefined,
      seasons: !isBook ? [] : undefined,
      tags: 'manually added',
      pages: 0,
      runtime: 0,
      publisher: '',
      published: '',
      year: '',
      description: '',
      cover: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    update(state => ({
      ...state,
      books: [newItem, ...(Array.isArray(state.books) ? state.books : [])],
    }));

    setAddedIds(prev => new Set(prev).add(manualKey));

    // 2. Detached, non-blocking background cover enrichment (6s timeout)
    const itemId = newItem.id;
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        let foundCover = '';

        if (isBook) {
          const docs = await searchOpenLibrary(cleanTitle);
          const match = (docs || []).find(d => d.cover_i);
          if (match?.cover_i) {
            foundCover = `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg`;
          }
        } else {
          const suggestions = await imdbSuggest(cleanTitle);
          const match = (suggestions || []).find(s => s.i?.imageUrl);
          if (match?.i?.imageUrl) {
            foundCover = match.i.imageUrl;
          }
        }
        clearTimeout(timeout);

        if (foundCover) {
          update(state => ({
            ...state,
            books: (state.books || []).map(b => (b.id === itemId ? { ...b, cover: foundCover } : b)),
          }));
        }
      } catch {
        // Silent failure: placeholder remains intact, completely offline-safe
      }
    })();
  };

  // Add Book from Open Library search result
  const handleAddBook = (doc) => {
    const newBook = docToBook(doc);
    if (!newBook) return;
    update(state => ({
      ...state,
      books: [newBook, ...(Array.isArray(state.books) ? state.books : [])],
    }));
    setAddedIds(prev => new Set(prev).add(doc.key || doc.cover_i || doc.title));
  };

  // Add Movie/Series from search result
  const handleAddCinema = (item) => {
    const newTitle = suggestionToTitle(item);
    if (!newTitle) return;
    update(state => ({
      ...state,
      books: [newTitle, ...(Array.isArray(state.books) ? state.books : [])],
    }));
    setAddedIds(prev => new Set(prev).add(item.id || item.l));
  };

  // Save quick Journal reflection directly into state.diary
  const handleSaveJournal = (e) => {
    e.preventDefault();
    const bodyText = journalBody.trim();
    if (!bodyText) return;

    const newEntry = {
      id: generateId(),
      date: getTodayDateString(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      title: journalTitle.trim() || 'Quick reflection',
      body: bodyText,
      content: bodyText,
      mood: 3,
      tags: 'quick reflection',
      photo: '',
      audio: '',
      video: '',
      createdAt: Date.now(),
      updated: Date.now(),
    };

    update(state => ({
      ...state,
      diary: [newEntry, ...(Array.isArray(state.diary) ? state.diary : [])],
    }));

    setJournalSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Handle CSV Import (Goodreads / IMDb)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const parsed = parseCSV(text);

        if (!parsed || !parsed.rows.length) {
          setImportStatus({
            success: false,
            message: "That file didn't look like a Goodreads or IMDb export. Please check the CSV format.",
          });
          setIsImporting(false);
          return;
        }

        const isGoodreads = parsed.headers.some(h => h.includes('shelf') || h.includes('pages') || h.includes('isbn'));
        const isImdb = parsed.headers.some(h => h.includes('titletype') || h.includes('const') || h.includes('directors'));

        const newItems = [];
        for (const row of parsed.rows) {
          const title = row.title || row.originaltitle;
          if (!title || !title.trim()) continue;

          if (isGoodreads) {
            const shelf = String(row.exclusiveshelf || '').toLowerCase();
            const status = shelf === 'currently-reading' ? 'Currently Reading' : shelf === 'read' ? 'Read' : 'Watchlist';
            newItems.push({
              id: generateId(),
              category: 'book',
              title: title.trim(),
              author: row.author || row.additionalauthors || 'Unknown author',
              status,
              rating: Number(row.myrating) || 0,
              pages: Number(row.numberofpages) || 0,
              publisher: row.publisher || '',
              published: row.yearpublished || '',
              tags: 'goodreads-import',
              cover: '',
              chapters: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } else if (isImdb) {
            const type = String(row.titletype || '').toLowerCase();
            const isSeries = type.includes('tv') || type.includes('series');
            const rating = Number(row.yourrating) || 0;
            newItems.push({
              id: generateId(),
              category: isSeries ? 'series' : 'movie',
              title: title.trim(),
              creator: row.directors || '',
              year: row.year || '',
              status: rating > 0 ? 'Watched' : 'Watchlist',
              rating: rating > 0 ? Math.min(5, Math.max(1, Math.round(rating / 2))) : 0,
              tags: 'imdb-import',
              cover: '',
              seasons: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } else {
            // Generic fallback
            newItems.push({
              id: generateId(),
              category: 'book',
              title: title.trim(),
              author: row.author || 'Unknown',
              status: 'Watchlist',
              rating: 0,
              tags: 'csv-import',
              cover: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        }

        if (newItems.length === 0) {
          setImportStatus({
            success: false,
            message: "No valid title rows found in the CSV. Please verify your export.",
          });
          setIsImporting(false);
          return;
        }

        // Bulk-add immediately to state (offline-safe)
        update(state => ({
          ...state,
          books: [...newItems, ...(Array.isArray(state.books) ? state.books : [])],
        }));

        setImportStatus({
          success: true,
          message: `Successfully imported ${newItems.length} titles into your universe.`,
        });

        // Detached background cover enrichment for the first 10 items to prevent rate limits
        const enrichSample = newItems.slice(0, 10);
        enrichSample.forEach(item => {
          (async () => {
            try {
              let cover = '';
              if (item.category === 'book') {
                const docs = await searchOpenLibrary(item.title);
                const match = (docs || []).find(d => d.cover_i);
                if (match?.cover_i) cover = `https://covers.openlibrary.org/b/id/${match.cover_i}-M.jpg`;
              } else {
                const suggestions = await imdbSuggest(item.title);
                const match = (suggestions || []).find(s => s.i?.imageUrl);
                if (match?.i?.imageUrl) cover = match.i.imageUrl;
              }
              if (cover) {
                update(state => ({
                  ...state,
                  books: (state.books || []).map(b => (b.id === item.id ? { ...b, cover } : b)),
                }));
              }
            } catch {
              // Non-blocking
            }
          })();
        });
      } catch {
        setImportStatus({
          success: false,
          message: "Could not read that CSV file. Please make sure it is uncorrupted.",
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      setImportStatus({
        success: false,
        message: "Failed to read the file. Please try again.",
      });
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const tabs = [
    { id: 'book', label: 'Book', sublabel: 'Athena', Icon: BookOpen },
    { id: 'movie', label: 'Cinema', sublabel: 'Apollo', Icon: Film },
    { id: 'journal', label: 'Journal', sublabel: 'Mnemosyne', Icon: Edit },
    { id: 'import', label: 'Import', sublabel: 'CSV', Icon: Plus },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden"
      >
        {/* Header & Type Switcher Tabs */}
        <div className="border-b border-line p-5 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent font-semibold block">
                Hermes Quick Capture
              </span>
              <h2 id="modal-title" className="font-display text-xl font-bold text-text">
                Add to Your Universe
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-text hover:bg-surface2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 sm:gap-2 border-b border-line/60 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
                    isActive
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  <tab.Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span className="text-[9px] font-mono text-muted/70 uppercase tracking-wider hidden sm:inline">
                    {tab.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'import' ? (
            /* Import Tab (Goodreads / IMDb CSV) */
            <div className="space-y-5">
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-line bg-ink/30">
                <Upload className="mx-auto h-8 w-8 text-accent/70 mb-2" />
                <h3 className="font-display text-sm font-semibold text-text mb-1">
                  Import Goodreads or IMDb Export
                </h3>
                <p className="text-xs text-muted max-w-sm mx-auto mb-4 leading-relaxed">
                  Upload a <code>.csv</code> file exported from Goodreads or IMDb. Books and films will be added to your library automatically.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="hidden"
                  id="csv-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-ink hover:bg-accent/90 transition disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isImporting ? 'Parsing CSV…' : 'Select CSV File'}</span>
                </button>
              </div>

              {importStatus && (
                <div
                  className={`rounded-xl p-3.5 text-xs ${
                    importStatus.success
                      ? 'bg-accent/15 border border-accent/40 text-accent font-medium'
                      : 'bg-surface2 border border-line text-muted'
                  }`}
                >
                  <p>{importStatus.message}</p>
                  {importStatus.success && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-surface border border-line px-4 py-1.5 text-xs text-text hover:border-accent"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'journal' ? (
            /* Journal Tab */
            <form onSubmit={handleSaveJournal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  placeholder="e.g. A quiet thought, Afternoon walk"
                  className="w-full rounded-xl border border-line bg-ink/50 px-3.5 py-2.5 text-xs text-text placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
                  Reflection
                </label>
                <textarea
                  rows={5}
                  value={journalBody}
                  onChange={(e) => setJournalBody(e.target.value)}
                  placeholder="Write your observation, memory, or reflection here…"
                  required
                  className="w-full rounded-xl border border-line bg-ink/50 p-3.5 text-xs leading-relaxed text-text placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={journalSaved || !journalBody.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-ink hover:bg-accent/90 transition disabled:opacity-50"
                >
                  {journalSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Saved to Journal</span>
                    </>
                  ) : (
                    <span>Save to Mnemosyne</span>
                  )}
                </button>
                {isSaving && (
                  <span className="text-[10px] text-muted ml-2">Saving…</span>
                )}
              </div>
            </form>
          ) : (
            /* Search Tab (Books or Cinema) */
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={!isOnline}
                  placeholder={
                    !isOnline
                      ? 'Offline — search unavailable, but you can add manually.'
                      : activeTab === 'book'
                        ? 'Search Open Library by title or author…'
                        : 'Search movies & series by title…'
                  }
                  autoFocus
                  className="w-full rounded-xl border border-line bg-ink/50 pl-10 pr-4 py-2.5 text-xs text-text placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Offline notice */}
              {!isOnline && (
                <p className="text-[11px] font-mono text-muted bg-surface2/60 p-2.5 rounded-xl border border-line">
                  You're offline. You can still add items manually below — covers will sync when you reconnect.
                </p>
              )}
              {query.length > 0 && query.length < 3 && (
                <p className="text-[10px] text-muted mt-1">
                  Type at least 3 characters to search.
                </p>
              )}

              {/* Inline query length hint */}
              {isOnline && isShortQuery && (
                <p className="text-[11px] font-mono text-muted pl-1">
                  Keep typing — search starts at {minQueryLength} characters.
                </p>
              )}

              {/* Persistent Offline-First "Add Manually" Button */}
              {query.trim().length >= 1 && (
                <div className="flex items-center justify-between rounded-xl border border-line/80 bg-surface2/60 p-3">
                  <div className="min-w-0 pr-3">
                    <span className="block text-xs font-semibold text-text truncate">
                      Add manually: “{query.trim()}”
                    </span>
                    <span className="block text-[10px] text-muted font-mono">
                      {isOnline ? 'Saves instantly, enriches cover in background' : 'Saves offline immediately'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddManually}
                    disabled={addedIds.has(`manual:${query.trim().toLowerCase()}`)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition shrink-0 ${
                      addedIds.has(`manual:${query.trim().toLowerCase()}`)
                        ? 'bg-accent/20 text-accent cursor-default'
                        : 'bg-accent text-ink hover:bg-accent/90'
                    }`}
                  >
                    {addedIds.has(`manual:${query.trim().toLowerCase()}`) ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Manually</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {loading && (
                <div className="py-8 text-center text-xs font-mono text-muted">
                  Searching {activeTab === 'book' ? 'Open Library' : 'Cinema database'}…
                </div>
              )}

              {error && (
                <p className="rounded-xl border border-line bg-surface2/60 p-3 text-xs text-muted">
                  {error}
                </p>
              )}

              {/* Results List */}
              <div className="divide-y divide-line/60">
                {activeTab === 'book' &&
                  results.map((doc, idx) => {
                    const key = doc.key || doc.cover_i || `${doc.title}-${idx}`;
                    const isAdded = addedIds.has(key);
                    const author = (Array.isArray(doc.author_name) ? doc.author_name : []).slice(0, 2).join(', ');
                    const cover = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;

                    return (
                      <div key={key} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {cover ? (
                            <img src={cover} alt="" className="h-12 w-8.5 rounded object-cover shrink-0" />
                          ) : (
                            <div className="grid h-12 w-8.5 shrink-0 place-items-center rounded bg-surface2 text-muted">
                              <BookOpen className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-semibold text-text truncate">{doc.title}</h4>
                            <p className="text-[11px] text-muted truncate">{author || 'Unknown author'}</p>
                            {doc.first_publish_year && (
                              <span className="font-mono text-[9px] text-muted/70">{doc.first_publish_year}</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddBook(doc)}
                          disabled={isAdded}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition shrink-0 ${
                            isAdded
                              ? 'bg-accent/20 text-accent cursor-default'
                              : 'bg-surface2 border border-line text-text hover:border-accent hover:text-accent'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}

                {activeTab === 'movie' &&
                  results.map((item, idx) => {
                    const key = item.id || `${item.l}-${idx}`;
                    const isAdded = addedIds.has(key);
                    const cover = item.i?.imageUrl || null;

                    return (
                      <div key={key} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {cover ? (
                            <img src={cover} alt="" className="h-12 w-8.5 rounded object-cover shrink-0" />
                          ) : (
                            <div className="grid h-12 w-8.5 shrink-0 place-items-center rounded bg-surface2 text-muted">
                              <Film className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-display text-xs font-semibold text-text truncate">{item.l}</h4>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
                              <span>{item.qid === 'tvSeries' ? 'Series' : 'Movie'}</span>
                              {item.y && <span>· {item.y}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddCinema(item)}
                          disabled={isAdded}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition shrink-0 ${
                            isAdded
                              ? 'bg-accent/20 text-accent cursor-default'
                              : 'bg-surface2 border border-line text-text hover:border-accent hover:text-accent'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {!loading && isOnline && results.length === 0 && query.trim().length >= minQueryLength && (
                <p className="py-6 text-center text-xs text-muted">
                  No public catalogue titles found for "{query}". You can add it manually using the button above.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
