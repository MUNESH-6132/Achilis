import React, { memo, useState, useMemo, useEffect } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { TitleCard } from './TitleCard';
import { TitleEditor } from './TitleEditor';
import { TitleDetails } from './TitleDetails';
import { FloatView } from './FloatView';
import { ListView } from './ListView';
import { CinemaMode } from './CinemaMode';
import { Plus, BookOpen, Play } from './Icons'; // Use Film if you have it, otherwise BookOpen
import { generateId } from '../utils/helpers';

const STATUS_FILTERS = ["All", "Watched", "In progress", "Watchlist"];
const MemoizedTitleCard = memo(TitleCard);
const VIEW_MODES = [
  { id: "grid", label: "Grid" },
  { id: "float", label: "Float" },
  { id: "list", label: "List" }
];

export function Entertainment({ query = "" }) {
  const { data, update } = useAchilles();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("achilles:entertainmentView") || "grid");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingTitle, setEditingTitle] = useState(null);
  const [activeTitle, setActiveTitle] = useState(null);
  const [cinemaItems, setCinemaItems] = useState(null);

  useEffect(() => {
    localStorage.setItem("achilles:entertainmentView", viewMode);
  }, [viewMode]);

  const searchQuery = query;
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
  }, [data.books, statusFilter, searchQuery, viewMode]);

  const handleSave = (title) => {
    update(state => {
      const exists = state.books.find(b => b.id === title.id);
      return {
        ...state,
        books: exists ? state.books.map(b => b.id === title.id ? title : b) : [title, ...state.books]
      };
    });
  };

  const handleStatusChange = (title, status) => {
    update(state => ({
      ...state,
      books: state.books.map(item => item.id === title.id ? { ...item, status } : item)
    }));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Entertainment</h1>
          <p className="mt-1 text-xs text-muted">{filteredTitles.length} titles</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-line bg-surface p-1" role="group" aria-label="Entertainment view">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                aria-pressed={viewMode === mode.id}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${viewMode === mode.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-white"}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCinemaItems(filteredTitles)} disabled={filteredTitles.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-accent/50 hover:bg-surface2 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Play className="h-4 w-4" /> Play
          </button>
          <button onClick={() => setEditingTitle({ id: generateId(), category: "movie", status: "Watchlist" })} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink transition hover:bg-accent/90">
            <Plus className="h-4 w-4" /> Add Title
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${statusFilter === status ? "border-white bg-white text-ink" : "border-line text-muted hover:border-accent/50 hover:text-white"}`}>
            {status}
          </button>
        ))}
      </div>

      {filteredTitles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-line bg-surface/40 px-6 py-24 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen className="h-6 w-6" />
          </span>
          <h2 className="font-display text-xl font-bold">No titles yet</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">Add a movie or series to start tracking.</p>
        </div>
      ) : viewMode === "float" ? (
        <FloatView books={filteredTitles} onOpen={title => setActiveTitle(title)} onStatus={handleStatusChange} />
      ) : viewMode === "list" ? (
        <ListView items={filteredTitles} onOpen={title => setActiveTitle(title)} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
      {cinemaItems && <CinemaMode items={cinemaItems} onClose={() => setCinemaItems(null)} onOpen={title => setActiveTitle(title)} />}
    </div>
  );
}
