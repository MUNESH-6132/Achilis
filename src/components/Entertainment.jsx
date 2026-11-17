import React, { memo, useState, useMemo, useEffect } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { TitleCard } from './TitleCard';
import { TitleEditor } from './TitleEditor';
import { TitleDetails } from './TitleDetails';
import { BulkAddCinemaModal } from './BulkAddCinemaModal';
import { ListView } from './ListView';
import { CinemaMode } from './CinemaMode';
import { Plus, Film, Play, Search } from './Icons';
import { generateId } from '../utils/helpers';
import { EmptyState } from './EmptyState';
import { SkeletonCard } from './SkeletonCard';

const STATUS_FILTERS = ["All", "Watched", "In progress", "Watchlist"];
const MemoizedTitleCard = memo(TitleCard);
const VIEW_MODES = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" }
];

function getTitleProgress(title) {
  const episodes = (Array.isArray(title.seasons) ? title.seasons : [])
    .flatMap(season => Array.isArray(season?.episodes) ? season.episodes : []);
  if (episodes.length) {
    const done = episodes.filter(episode => episode?.done).length;
    return { percent: Math.round(done / episodes.length * 100), label: `${done} of ${episodes.length} episodes watched` };
  }
  const statusProgress = { Watchlist: 0, 'In progress': 50, Watched: 100 }[title.status] ?? 0;
  return { percent: statusProgress, label: title.status || 'Watchlist' };
}

function formatRuntime(value) {
  const runtime = Number(value) || 0;
  if (runtime <= 0) return '';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours ? (minutes ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
}

export function Entertainment({ query = "", loading = false, referenceRequest = null, onReferenceHandled }) {
  const { data, update, notify } = useAchilles();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("achilles:entertainmentView") || "grid");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingTitle, setEditingTitle] = useState(null);
  const [activeTitle, setActiveTitle] = useState(null);
  const [cinemaItems, setCinemaItems] = useState(null);
  const [localQuery, setLocalQuery] = useState("");
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("achilles:entertainmentView", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!referenceRequest || !['movie', 'series'].includes(referenceRequest.category)) return;
    const title = data.books.find(item => item.id === referenceRequest.id);
    if (!title) return;
    setActiveTitle(title);
    onReferenceHandled?.();
  }, [referenceRequest, data.books, onReferenceHandled]);

  const searchQuery = localQuery.trim() ? localQuery : query;
  const filteredTitles = useMemo(() => {
    return data.books.filter(b => {
      const isEnt = b.category === "movie" || b.category === "series";
      if (!isEnt) return false;
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (b.title + " " + (b.creator || "")).toLowerCase().includes(q);
      }
      return true;
    });
  }, [data.books, statusFilter, searchQuery]);
  const titleCount = data.books.filter(book => book.category === 'movie' || book.category === 'series').length;
  const watchedCount = data.books.filter(book => (book.category === 'movie' || book.category === 'series') && book.status === 'Watched').length;
  const hasTitles = titleCount > 0;
  const featuredTitle = filteredTitles.find(title => title.status === 'In progress') || filteredTitles[0] || null;
  const featuredProgress = featuredTitle ? getTitleProgress(featuredTitle) : null;
  const hasEpisodeProgress = featuredTitle?.category === 'series'
    && Array.isArray(featuredTitle.seasons)
    && featuredTitle.seasons.some(season => Array.isArray(season?.episodes) && season.episodes.length > 0);

  const handleSave = (title) => {
    update(state => {
      const exists = state.books.find(b => b.id === title.id);
      return {
        ...state,
        books: exists ? state.books.map(b => b.id === title.id ? title : b) : [title, ...state.books]
      };
    });
  };

  const handleBulkAdd = (titles) => {
    const valid = titles.filter(Boolean);
    if (!valid.length) return;
    update(state => ({
      ...state,
      books: [...valid, ...state.books]
    }));
    notify(valid.length === 1 ? "1 title added." : `${valid.length} titles added.`);
  };

  if (loading) {
    return (
      <section aria-label="Loading entertainment">
        <div className="mb-6">
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Cinema</h1>
          <p className="mt-1 text-sm text-muted">Finding your next favorite…</p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-accent">
            Apollo · Cinema Universe
          </p>
          <h1 className="font-display text-6xl font-bold tracking-tight text-text">Cinema</h1>
          <p className="mt-2 text-sm text-muted">
            {titleCount} {titleCount === 1 ? 'title' : 'titles'} · {watchedCount} watched
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={localQuery}
              onChange={event => setLocalQuery(event.target.value)}
              placeholder="Search titles…"
              aria-label="Search titles"
              className="w-full border-0 border-b border-line bg-transparent py-2 pl-7 pr-2 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-full border border-line p-0.5">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                aria-pressed={viewMode === mode.id}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${viewMode === mode.id ? 'bg-accent text-ink' : 'text-muted hover:text-text'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCinemaItems(filteredTitles)} disabled={filteredTitles.length === 0} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-40">
            <Play className="h-4 w-4" /> Play
          </button>
          <button
            type="button"
            onClick={() => setIsBulkAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface2"
          >
            <Plus className="h-4 w-4" /> Bulk Add
          </button>
          <button
            type="button"
            onClick={() => setEditingTitle({ id: generateId(), category: "movie", status: "Watchlist" })}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" /> Add Movie/Series
          </button>
        </div>
      </div>

      {featuredTitle && (
        <section className="relative isolate mb-8 min-h-[280px] overflow-hidden rounded-xl sm:min-h-[320px]" aria-label="Featured title">
          {featuredTitle.cover && (
            <img src={featuredTitle.cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-sm" />
          )}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/20" />
          <div className="relative z-10 grid min-h-[280px] grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 px-5 py-6 sm:min-h-[320px] sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-8 sm:px-10">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                {featuredTitle.status === 'In progress' ? 'Continue watching' : featuredTitle.status === 'Watched' ? 'Recently watched' : 'Your next feature'}
              </p>
              <h2 className="mt-3 line-clamp-2 max-w-2xl font-display text-3xl leading-tight tracking-tight text-white sm:text-5xl">
                {featuredTitle.title || 'Untitled feature'}
              </h2>
              <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-wide text-white/65 sm:text-xs">
                {[featuredTitle.creator, featuredTitle.year, formatRuntime(featuredTitle.runtime), featuredTitle.category === 'series' ? 'Series' : 'Film'].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-5 max-w-sm">
                <div className="mb-2 flex justify-between gap-3 font-mono text-[10px] text-white/65">
                  <span>{featuredProgress.label}</span>
                  <span>{featuredProgress.percent}%</span>
                </div>
                <div role="progressbar" aria-label={hasEpisodeProgress ? 'Episodes watched' : 'Viewing status'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={featuredProgress.percent} aria-valuetext={featuredProgress.label} className="h-1 overflow-hidden bg-white/20">
                  <span className="block h-full bg-accent" style={{ width: `${featuredProgress.percent}%` }} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTitle(featuredTitle)}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-white/85"
              >
                {featuredTitle.status === 'In progress' ? 'Continue Watching' : 'View title'}
              </button>
            </div>
            <button type="button" onClick={() => setActiveTitle(featuredTitle)} aria-label={`Open ${featuredTitle.title || 'untitled title'}`} className="w-full overflow-hidden rounded-md shadow-[0_15px_30px_-10px_rgba(0,0,0,0.8)]">
              {featuredTitle.cover ? (
                <img src={featuredTitle.cover} alt="" className="aspect-[2/3] w-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex aspect-[2/3] items-end bg-surface2 p-2 text-left text-xs text-muted">{featuredTitle.title || 'Film'}</span>
              )}
            </button>
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line">
        {STATUS_FILTERS.map(status => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            className={`-mb-px border-b-2 px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest transition ${statusFilter === status ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredTitles.length === 0 ? (
        <EmptyState
          Icon={Film}
          title={hasTitles ? "No titles match that" : "Your watchlist is waiting"}
          description={hasTitles ? "Try another search or status, or add another title to your collection." : "Save the movies and series you want to watch, and keep track of what you’ve seen."}
          actionLabel={hasTitles ? "Add a title" : "Add your first title"}
          onAction={() => setEditingTitle({ id: generateId(), category: "movie", status: "Watchlist" })}
        />
      ) : viewMode === "list" ? (
        <ListView items={filteredTitles} onOpen={title => setActiveTitle(title)} />
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredTitles.map(t => (
            <MemoizedTitleCard key={t.id} title={t} onOpen={setActiveTitle} onEdit={setEditingTitle} />
          ))}
        </div>
      )}

      {editingTitle && (
        <TitleEditor title={editingTitle} onClose={() => setEditingTitle(null)} onSave={handleSave} />
      )}
      {activeTitle && (
        <TitleDetails
          item={activeTitle}
          onClose={() => setActiveTitle(null)}
          onEdit={title => {
            setActiveTitle(null);
            setEditingTitle(title);
          }}
        />
      )}
      {isBulkAddOpen && <BulkAddCinemaModal onClose={() => setIsBulkAddOpen(false)} onAddTitles={handleBulkAdd} />}
      {cinemaItems && <CinemaMode items={cinemaItems} onClose={() => setCinemaItems(null)} onOpen={title => setActiveTitle(title)} />}
    </div>
  );
}