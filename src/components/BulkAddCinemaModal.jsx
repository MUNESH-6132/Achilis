import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { Modal } from './Modal';
import { Cover } from './Cover';
import { Search, X } from './Icons';
import { generateId } from '../utils/helpers';
import { tmdbSuggest } from '../utils/api';

const MIN_QUERY_LENGTH = 2;

function suggestionToTitle(suggestion) {
  if (!suggestion || !suggestion.l) return null;
  const isSeries = suggestion.mt === "tv" || /series/i.test(suggestion.qid || "");
  return {
    id: generateId(),
    category: isSeries ? "series" : "movie",
    title: suggestion.l,
    year: suggestion.y ? String(suggestion.y) : "",
    creator: suggestion.s || "",
    cover: suggestion.i?.imageUrl || "",
    status: "Watchlist",
    rating: 0,
    notes: "",
    tags: "",
    runtime: 0,
    where: "",
    seasons: [],
  };
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resultKey(suggestion) {
  return `${normalize(suggestion?.l)}|${String(suggestion?.y || "").trim()}`;
}

function stagedKey(suggestion) {
  if (!suggestion) return "";
  if (suggestion.tid) return `tmdb:${suggestion.tid}`;
  if (suggestion.id) return String(suggestion.id);
  return resultKey(suggestion);
}

export function BulkAddCinemaModal({ onClose, onAddTitles }) {
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
        .filter(book => book.category === "movie" || book.category === "series")
        .map(book => `${normalize(book.title)}|${String(book.year || "").trim()}`)
    ),
    [data.books]
  );
  const stagedKeys = useMemo(() => new Set(stagedItems.map(stagedKey)), [stagedItems]);

  const runSearch = useCallback(async (value) => {
    const term = value.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const suggestions = await tmdbSuggest(term);
      if (requestId !== requestRef.current) return;
      setResults(suggestions);
    } catch {
      if (requestId !== requestRef.current) return;
      setResults([]);
      setError("Could not search titles. Check your connection and try again.");
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
    }, 400);
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

  const toggleStaged = (suggestion) => {
    if (!suggestion || libraryKeys.has(resultKey(suggestion))) return;
    const key = stagedKey(suggestion);
    setStagedItems(previous => (
      previous.some(item => stagedKey(item) === key)
        ? previous.filter(item => stagedKey(item) !== key)
        : [...previous, suggestion]
    ));
  };

  const removeStaged = (suggestion) => {
    const key = stagedKey(suggestion);
    setStagedItems(previous => previous.filter(item => stagedKey(item) !== key));
  };

  const handleAdd = () => {
    if (stagedItems.length === 0) return;
    const titles = stagedItems.map(suggestionToTitle).filter(Boolean);
    if (titles.length === 0) return;
    onAddTitles?.(titles);
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
        Searching titles…
      </div>
    );
  } else if (queryIsShort) {
    content = (
      <div className="py-16 text-center text-sm text-muted">
        Type at least {MIN_QUERY_LENGTH} characters to search for movies and series.
      </div>
    );
  } else if (results.length === 0) {
    content = (
      <div className="py-16 text-center text-sm text-muted">
        No titles found. Try a different title.
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {results.map((suggestion, index) => {
          const cover = suggestion.i?.imageUrl || "";
          const staged = stagedKeys.has(stagedKey(suggestion));
          const inLibrary = libraryKeys.has(resultKey(suggestion));
          const locked = staged || inLibrary;
          return (
            <button
              key={`${suggestion.tid || index}-${index}`}
              type="button"
              onClick={() => { if (!locked) toggleStaged(suggestion); }}
              aria-pressed={staged}
              aria-disabled={locked}
              aria-label={`${staged ? "Remove" : "Select"} ${suggestion.l || "untitled title"}${inLibrary ? " (already in library)" : ""}`}
              className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition ${
                staged
                  ? "border-accent bg-accent/5"
                  : inLibrary
                    ? "border-line bg-surface/40 opacity-60"
                    : "border-line bg-surface/40 hover:border-accent/40"
              }`}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <Cover book={{ title: suggestion.l, author: suggestion.s, cover }} className="transition-transform duration-300 group-hover:scale-105" />
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
                <p className="line-clamp-2 text-xs font-semibold leading-tight text-text">{suggestion.l || "Untitled"}</p>
                <p className="mt-1 line-clamp-1 text-[10px] text-muted">
                  {[suggestion.y, suggestion.mt === "tv" || /series/i.test(suggestion.qid || "") ? "Series" : "Movie"].filter(Boolean).join(" · ")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Modal onClose={onClose} width="max-w-4xl" title="Bulk Add Movies & Series" mobileSheet>
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-text">Bulk Add Movies &amp; Series</h2>
            <p className="mt-1 text-xs text-muted">Search TMDB and add several titles at once.</p>
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
              placeholder="Search movies and series…"
              aria-label="Search TMDB"
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
                {stagedItems.map((item, index) => (
                  <div
                    key={`${stagedKey(item)}-${index}`}
                    className="group relative h-16 w-11 shrink-0 overflow-hidden rounded-md border border-line"
                  >
                    <Cover book={{ title: item.l, author: item.s, cover: item.i?.imageUrl }} />
                    <button
                      type="button"
                      onClick={() => removeStaged(item)}
                      aria-label={`Remove ${item.l || "title"} from staging`}
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
              {stagedItems.length} {stagedItems.length === 1 ? "Title" : "Titles"} Selected
            </span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={stagedItems.length === 0}
              className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add {stagedItems.length > 0 ? `${stagedItems.length} ` : ""}{stagedItems.length === 1 ? "Title" : "Titles"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}