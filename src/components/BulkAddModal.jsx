import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { Modal } from './Modal';
import { Cover } from './Cover';
import { Search, X } from './Icons';
import { generateId } from '../utils/helpers';
import { searchOpenLibrary } from '../utils/api';
import { humanizeApiError } from '../utils/errors';

const MIN_QUERY_LENGTH = 3;

function docToBook(doc) {
  if (!doc || !doc.title) return null;
  const author = (Array.isArray(doc.author_name) ? doc.author_name : []).slice(0, 2).join(", ");
  const publisher = Array.isArray(doc.publisher) ? doc.publisher[0] : doc.publisher;
  const tags = Array.isArray(doc.subject)
    ? doc.subject.filter(tag => !String(tag).includes(":")).slice(0, 3).join(", ")
    : "";
  return {
    id: generateId(),
    category: "book",
    title: doc.title + (doc.subtitle ? `: ${doc.subtitle}` : ""),
    author,
    status: "Watchlist",
    rating: 0,
    chapters: [],
    tags,
    pages: Number(doc.number_of_pages_median) || 0,
    publisher: publisher || "",
    published: doc.first_publish_year ? String(doc.first_publish_year) : "",
    description: "",
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "",
  };
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function docKey(doc) {
  return `${normalize(doc?.title)}|${String(doc?.first_publish_year || "").trim()}`;
}

function bookKey(book) {
  return `${normalize(book?.title)}|${String(book?.published || book?.year || "").trim()}`;
}

export function BulkAddModal({ onClose, onAddBooks }) {
  const { data } = useAchilles();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stagedItems, setStagedItems] = useState([]);
  const requestRef = useRef(0);
  const debounceRef = useRef(null);

  const libraryKeys = useMemo(
    () => new Set(
      (Array.isArray(data.books) ? data.books : [])
        .filter(book => (book.category || "book") === "book")
        .map(bookKey)
    ),
    [data.books]
  );
  const stagedKeys = useMemo(() => new Set(stagedItems.map(docKey)), [stagedItems]);

const runSearch = useCallback(async (value) => {
    const term = value.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }
    console.log('Search started at:', Date.now());
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const docs = await searchOpenLibrary(term);
      if (requestId !== requestRef.current) return;
      setResults(docs);
      console.log('Search finished at:', Date.now());
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setResults([]);
      setError(humanizeApiError(err).message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError("");
      setLoading(false);
      return undefined;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(debounceRef.current);
      void runSearch(query);
    }
  };

  const toggleStaged = (doc) => {
    if (!doc || libraryKeys.has(docKey(doc))) return;
    const key = docKey(doc);
    setStagedItems(previous => (
      previous.some(item => docKey(item) === key)
        ? previous.filter(item => docKey(item) !== key)
        : [...previous, doc]
    ));
  };

  const removeStaged = (doc) => {
    const key = docKey(doc);
    setStagedItems(previous => previous.filter(item => docKey(item) !== key));
  };

  const handleAdd = () => {
    if (stagedItems.length === 0) return;
    const books = stagedItems.map(docToBook).filter(Boolean);
    if (books.length === 0) return;
    onAddBooks?.(books);
    setStagedItems([]);
    onClose?.();
  };

  const queryIsShort = query.trim().length < MIN_QUERY_LENGTH;

  let content;
  if (error) {
    content = (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => void runSearch(query)}
          className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-text transition hover:border-accent/40 hover:text-accent"
        >
          Try again
        </button>
      </div>
    );
  } else if (loading && results.length === 0) {
    content = (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        Searching Open Library…
      </div>
    );
  } else if (queryIsShort) {
    content = (
      <div className="py-16 text-center text-sm text-muted">
        Type at least {MIN_QUERY_LENGTH} characters to search for books.
      </div>
    );
  } else if (results.length === 0) {
    content = (
      <div className="py-16 text-center text-sm text-muted">
        No books found. Try a different title or author.
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {results.map((doc, index) => {
          const cover = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "";
          const staged = stagedKeys.has(docKey(doc));
          const inLibrary = libraryKeys.has(docKey(doc));
          const locked = staged || inLibrary;
          return (
            <button
              key={`${doc.cover_i || index}-${index}`}
              type="button"
              onClick={() => { if (!locked) toggleStaged(doc); }}
              aria-pressed={staged}
              aria-disabled={locked}
              aria-label={`${staged ? "Remove" : "Select"} ${doc.title || "untitled book"}${inLibrary ? " (already in library)" : ""}`}
              className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition ${
                staged
                  ? "border-accent bg-accent/5"
                  : inLibrary
                    ? "border-line bg-surface/40 opacity-60"
                    : "border-line bg-surface/40 hover:border-accent/40"
              }`}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <Cover book={{ title: doc.title, author: (Array.isArray(doc.author_name) ? doc.author_name : []).slice(0, 2).join(", "), cover }} className="transition-transform duration-300 group-hover:scale-105" />
                <span
                  aria-hidden="true"
                  className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-sm border-2 transition ${
                    staged
                      ? "border-accent bg-accent text-ink"
                      : inLibrary
                        ? "border-line bg-surface2 text-muted"
                        : "border-line bg-ink/80 text-transparent"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {locked && (
                  <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${inLibrary ? "bg-ink/85 text-muted" : "bg-accent text-ink"}`}>
                    {inLibrary ? "In library" : "Staged"}
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-semibold leading-tight text-text">{doc.title || "Untitled"}</p>
                <p className="mt-1 line-clamp-1 text-[10px] text-muted">
                  {(Array.isArray(doc.author_name) ? doc.author_name : []).slice(0, 2).join(", ") || "Unknown"}
                </p>
                {doc.first_publish_year ? <p className="mt-0.5 text-[10px] text-muted/70">{doc.first_publish_year}</p> : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Modal onClose={onClose} width="max-w-4xl" title="Bulk Add Books" mobileSheet>
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-text">Bulk Add Books</h2>
            <p className="mt-1 text-xs text-muted">Search Open Library and add several books at once.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bulk add"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-accent/50 hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by title or author…"
              aria-label="Search Open Library"
              enterKeyHint="search"
              className="w-full rounded-md border border-line bg-surface/40 py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted outline-none transition focus:border-accent"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
          {content}
        </div>

        <div className="border-t border-line bg-ink">
          {stagedItems.length > 0 && (
            <div className="px-6 pt-3">
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted">Staged</span>
                {stagedItems.map((doc, index) => (
                  <div
                    key={`${docKey(doc)}-${index}`}
                    className="group relative h-16 w-11 shrink-0 overflow-hidden rounded-md border border-line"
                  >
                    <Cover book={{ title: doc.title, author: (Array.isArray(doc.author_name) ? doc.author_name : []).slice(0, 2).join(", "), cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "" }} />
                    <button
                      type="button"
                      onClick={() => removeStaged(doc)}
                      aria-label={`Remove ${doc.title || "book"} from staging`}
                      className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-ink/90 text-white transition hover:bg-red-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <span className="text-xs font-semibold text-text">
              {stagedItems.length} {stagedItems.length === 1 ? "Book" : "Books"} Selected
            </span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={stagedItems.length === 0}
              className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add {stagedItems.length > 0 ? `${stagedItems.length} ` : ""}{stagedItems.length === 1 ? "Book" : "Books"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}