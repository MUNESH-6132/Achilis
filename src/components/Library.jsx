import React, { memo, useEffect, useMemo, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { BookCard } from './BookCard';
import { BookDetails } from './BookDetails';
import { BookEditor } from './BookEditor';
import { BulkAddModal } from './BulkAddModal';
import { CinemaMode } from './CinemaMode';
import { ListView } from './ListView';
import { Plus, BookOpen, Play, Trash, Check } from './Icons';
import { generateId } from '../utils/helpers';
import { EmptyState } from './EmptyState';
import { SkeletonCard } from './SkeletonCard';
import { Modal } from './Modal';

const MemoizedBookCard = memo(BookCard);
const STATUS_FILTERS = ["All", "Read", "Currently Reading", "Watchlist"];
const VIEW_MODES = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" }
];
const createEmptyBook = () => ({
  id: generateId(),
  title: "", author: "", category: "book", status: "Watchlist", rating: 0,
  chapters: [], tags: "", pages: 0, publisher: "", published: "", description: "", cover: ""
});

export function Library({ query = "", loading = false, openAddBook = false, onAddBookHandled, referenceRequest = null, onReferenceHandled, initialFilter }) {
  const { data, update, notify } = useAchilles();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("achilles:libraryView") || "grid");
  const [statusFilter, setStatusFilter] = useState(initialFilter || "All");
  const [activeBook, setActiveBook] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [cinemaItems, setCinemaItems] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const requestedBook = useMemo(() => openAddBook ? createEmptyBook() : null, [openAddBook]);
  const bookToEdit = editingBook || requestedBook;
  const bookCount = data.books.filter(b => (b.category || "book") === "book").length;

  useEffect(() => {
    localStorage.setItem("achilles:libraryView", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!referenceRequest || (referenceRequest.category && referenceRequest.category !== 'book')) return;
    const book = data.books.find(item => item.id === referenceRequest.id);
    if (!book) return;
    setActiveBook(book);
    onReferenceHandled?.();
  }, [referenceRequest, data.books, onReferenceHandled]);

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
  }, [data.books, statusFilter, searchQuery]);

  const readCount = data.books.filter(b => (b.category || "book") === "book" && b.status === "Read").length;
  const hasBooks = data.books.some(book => (book.category || "book") === "book");

  const handleSaveBook = (book) => {
    update(state => {
      const exists = state.books.some(b => b.id === book.id);
      return {
        ...state,
        books: exists ? state.books.map(b => b.id === book.id ? book : b) : [book, ...state.books]
      };
    });
  };

  const handleBulkAdd = (books) => {
    const valid = books.filter(Boolean);
    if (!valid.length) return;
    update(state => ({
      ...state,
      books: [...valid, ...state.books]
    }));
    notify(valid.length === 1 ? "1 book added." : `${valid.length} books added.`);
  };

  const closeEditor = () => {
    setEditingBook(null);
    if (openAddBook) onAddBookHandled?.();
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteBook = (id) => {
    update(state => ({
      ...state,
      books: state.books.filter(b => b.id !== id)
    }));
  };

  const confirmDeleteBooks = () => {
    selectedIds.forEach(deleteBook);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setConfirmDelete(false);
  };

  if (loading) {
    return (
      <section aria-label="Loading library">
        <div className="mb-6">
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Library</h1>
          <p className="mt-1 text-sm text-muted">Getting your shelves ready…</p>
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
            Athena · Reading Universe
          </p>
          <h1 className="font-display text-6xl font-bold tracking-tight text-text">Library</h1>
          <p className="mt-2 text-sm text-muted">
            {bookCount} {bookCount === 1 ? 'book' : 'books'} · {readCount} finished
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={() => setCinemaItems(filteredBooks)}
            disabled={filteredBooks.length === 0}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
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
            onClick={() => setEditingBook(createEmptyBook())}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" /> Add book
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line">
        {STATUS_FILTERS.map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={`-mb-px border-b-2 px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest transition ${statusFilter === status ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}
          >
            {status}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleSelectionMode}
          aria-pressed={isSelectionMode}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition ${isSelectionMode ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'}`}
        >
          <Check className="h-3.5 w-3.5" /> {isSelectionMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {query && <p className="mb-4 text-xs text-muted">Filtering by “{query}”</p>}

      {filteredBooks.length === 0 ? (
        <EmptyState
          Icon={BookOpen}
          title={hasBooks ? "No books match that" : "Your library is empty"}
          description={hasBooks ? "Try a different search or status, or add another book to your shelves." : "Start a reading list and keep the stories you love all in one place."}
          actionLabel={hasBooks ? "Add a book" : "Add your first book"}
          onAction={() => setEditingBook(createEmptyBook())}
        />
      ) : viewMode === "list" ? (
        <ListView
          items={filteredBooks}
          onOpen={book => setActiveBook(book)}
          selectMode={isSelectionMode}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
        />
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredBooks.map(book => (
            <MemoizedBookCard
              key={book.id}
              book={book}
              onOpen={setActiveBook}
              onEdit={setEditingBook}
              selectMode={isSelectionMode}
              selected={selectedIds.has(book.id)}
              onToggle={toggleSelect}
            />
          ))}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
          <div className="flex items-center gap-4 rounded-full border border-line bg-surface/95 px-5 py-2.5 shadow-2xl backdrop-blur-md">
            <span className="whitespace-nowrap text-xs font-semibold text-text">
              {selectedIds.size} {selectedIds.size === 1 ? 'Book' : 'Books'} Selected
            </span>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} width="max-w-md" title="Delete books">
          <div className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-text">
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'book' : 'books'}?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Are you sure you want to delete {selectedIds.size} {selectedIds.size === 1 ? 'book' : 'books'}? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-line px-5 py-2 text-sm font-semibold text-text transition hover:bg-surface2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBooks}
                className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeBook && <BookDetails book={activeBook} onClose={() => setActiveBook(null)} onEdit={(b) => { setActiveBook(null); setEditingBook(b); }} />}
      {bookToEdit && <BookEditor book={bookToEdit} onClose={closeEditor} onSave={handleSaveBook} />}
      {isBulkAddOpen && <BulkAddModal onClose={() => setIsBulkAddOpen(false)} onAddBooks={handleBulkAdd} />}
      {cinemaItems && <CinemaMode items={cinemaItems} onClose={() => setCinemaItems(null)} onOpen={book => setActiveBook(book)} />}
    </div>
  );
}