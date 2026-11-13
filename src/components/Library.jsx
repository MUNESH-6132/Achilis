import React, { memo, useState, useMemo, useEffect } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { BookCard } from './BookCard';
import { BookDetails } from './BookDetails';
import { BookEditor } from './BookEditor';
import { ShelfView } from './ShelfView';
import { FloatView } from './FloatView';
import { CinemaMode } from './CinemaMode';
import { Plus, BookOpen, Play } from './Icons';
import { generateId } from '../utils/helpers';

const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink transition hover:bg-accent/90";
const MemoizedBookCard = memo(BookCard);
const STATUS_FILTERS = ["All", "Read", "Currently Reading", "Watchlist"];
const VIEW_MODES = [
  { id: "grid", label: "Grid" },
  { id: "shelf", label: "Shelf" },
  { id: "float", label: "Float" }
];

const createEmptyBook = () => ({
  id: generateId(),
  title: "", author: "", category: "book", status: "Watchlist", rating: 0,
  chapters: [], tags: "", pages: 0, publisher: "", published: "", description: "", cover: ""
});

export function Library({ query = "" }) {
  const { data, update } = useAchilles();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("achilles:libraryView") || "grid");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeBook, setActiveBook] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [cinemaItems, setCinemaItems] = useState(null);

  useEffect(() => {
    localStorage.setItem("achilles:libraryView", viewMode);
  }, [viewMode]);

  const searchQuery = query;
  const filteredBooks = useMemo(() => {
    return data.books.filter(b => {
      const isBook = (b.category || "book") === "book";
      if (!isBook) return false;
      const matchesStatus = statusFilter === "All" || b.status === statusFilter;
      if (!matchesStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [b.title, b.author, b.englishTitle, b.englishAuthor, b.tags].join(" ").toLowerCase();
        return searchable.includes(q);
      }
      return true;
    });
  }, [data.books, statusFilter, searchQuery, viewMode]);

  const readCount = data.books.filter(b => (b.category || "book") === "book" && b.status === "Read").length;

  const handleSaveBook = (book) => {
    update(state => {
      const exists = state.books.some(b => b.id === book.id);
      return {
        ...state,
        books: exists ? state.books.map(b => b.id === book.id ? book : b) : [book, ...state.books]
      };
    });
  };

  const handleStatusChange = (book, status) => {
    update(state => ({
      ...state,
      books: state.books.map(item => item.id === book.id ? { ...item, status } : item)
    }));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Library</h1>
          <p className="mt-1 text-xs text-muted">
            {data.books.filter(b => (b.category || "book") === "book").length} books · {readCount} finished
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-line bg-surface p-1" role="group" aria-label="Library view">
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
          <button type="button" onClick={() => setCinemaItems(filteredBooks)} disabled={filteredBooks.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-accent/50 hover:bg-surface2 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Play className="h-4 w-4" /> Play
          </button>
          <button onClick={() => setEditingBook(createEmptyBook())} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" /> Add book
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === status ? "border-white bg-white text-ink" : "border-line text-muted hover:border-accent/50 hover:text-white"
            }`}
          >
            {status}
          </button>
        ))}
        {query && <span className="ml-auto self-center text-xs text-muted">Filtering by "{query}"</span>}
      </div>

      {filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-line bg-surface/40 px-6 py-24 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen className="h-6 w-6" />
          </span>
          <h2 className="font-display text-xl font-bold">
            {query || statusFilter !== "All" ? "Nothing matches that" : "Your shelves are waiting"}
          </h2>
          <p className="mt-2 max-w-xs text-sm text-muted">
            {query || statusFilter !== "All" ? "Try another filter or clear the search." : "Add the book on your nightstand and start tracking it chapter by chapter."}
          </p>
        </div>
      ) : viewMode === "shelf" ? (
        <ShelfView books={filteredBooks} onOpen={book => setActiveBook(book)} onEdit={book => setEditingBook(book)} />
      ) : viewMode === "float" ? (
        <FloatView books={filteredBooks} onOpen={book => setActiveBook(book)} onStatus={handleStatusChange} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredBooks.map(book => (
            <MemoizedBookCard key={book.id} book={book} onOpen={setActiveBook} onEdit={setEditingBook} />
          ))}
        </div>
      )}

      {activeBook && <BookDetails book={activeBook} onClose={() => setActiveBook(null)} onEdit={(b) => { setActiveBook(null); setEditingBook(b); }} />}
      {editingBook && <BookEditor book={editingBook} onClose={() => setEditingBook(null)} onSave={handleSaveBook} />}
      {cinemaItems && <CinemaMode items={cinemaItems} onClose={() => setCinemaItems(null)} onOpen={book => setActiveBook(book)} />}
    </div>
  );
}
