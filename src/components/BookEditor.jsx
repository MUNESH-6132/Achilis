import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { X, BookOpen } from './Icons';
import { generateId } from '../utils/helpers';
import { searchOpenLibrary } from '../utils/api';
import { useAchilles } from '../context/AchillesContext';
import { Button, ErrorState, Input } from '../ui/Primitives';

const INPUT_CLASS = "w-full bg-transparent border-b border-line focus:border-accent py-2 text-text placeholder:text-muted/60 focus:outline-none transition-colors appearance-none";
const MOBILE_INPUT_CLASS = "text-base";

export function BookEditor({ book, onClose, onSave }) {
  const { notify } = useAchilles();
  const [form, setForm] = useState(() => ({
    id: generateId(),
    category: "book",
    title: "",
    author: "",
    status: "Watchlist",
    rating: 0,
    pages: 0,
    cover: "",
    ...book,
    currentPage: book?.currentPage ?? "",
  }));
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [saveError, setSaveError] = useState("");
  const searchTimeout = useRef(null);

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setSaveError("");
  };

  const searchTitle = async value => {
    setLookupError("");
    setBusy(true);
    try {
      setSuggestions(await searchOpenLibrary(value));
    } catch {
      setSuggestions([]);
      setLookupError("Could not search Open Library. Check your connection or continue adding the book manually.");
    } finally {
      setBusy(false);
    }
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setField("title", val);
    setSearchTerm(val);
    setLookupError("");
    clearTimeout(searchTimeout.current);
    
    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      await searchTitle(val);
    }, 400);
  };

  const selectSuggestion = (doc) => {
    const author = (doc.author_name || []).slice(0, 2).join(", ");
    setForm(f => ({
      ...f,
      title: doc.title + (doc.subtitle ? `: ${doc.subtitle}` : ""),
      author: author || f.author,
      cover: f.cover || (doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : ""),
      pages: f.pages || Number(doc.number_of_pages_median) || 0,
      publisher: f.publisher || (doc.publisher || [])[0] || "",
      published: f.published || (doc.first_publish_year ? String(doc.first_publish_year) : "")
    }));
    setSuggestions([]);
    setSearchTerm("");
    setLookupError("");
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      setSaveError("Add a book title before saving.");
      return;
    }
    const rawTotalPages = String(form.pages ?? "").trim();
    const totalPages = rawTotalPages ? Number(rawTotalPages) : 0;
    const currentPage = String(form.currentPage ?? "").trim();
    if (totalPages < 0 || !Number.isInteger(totalPages)) {
      setSaveError("Enter a whole number for total pages.");
      return;
    }
    if (currentPage && (
      !Number.isInteger(Number(currentPage))
      || Number(currentPage) < 0
      || (totalPages > 0 && Number(currentPage) > totalPages)
    )) {
      setSaveError("Current page must be a whole number within the book’s page count.");
      return;
    }
    onSave({
      ...form,
      pages: totalPages,
      currentPage: currentPage ? Number(currentPage) : "",
    });
    notify(book ? "Book saved." : "Book added.");
    onClose();
  };

  return (
    <Modal onClose={onClose} width="max-w-2xl" title={book ? "Edit book" : "Add book"} mobileSheet>
      <div className="flex items-center justify-between border-b border-line px-8 py-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl md:text-3xl text-text"><BookOpen className="h-5 w-5 text-accent"/> {book ? "Edit Book" : "Add Book"}</h2>
        <button type="button" onClick={onClose} aria-label="Close book editor" className="text-muted hover:text-text"><X className="h-5 w-5" /></button>
      </div>
      
      <div className="space-y-8 p-8">
        <div className="relative">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1 block">Title</label>
          <Input type="search" value={form.title} onChange={handleTitleChange} className={`mt-1 ${MOBILE_INPUT_CLASS} font-serif text-2xl`} placeholder="Search Open Library..." autoComplete="off" enterKeyHint="search" />
          {busy && <p role="status" className="mt-2 text-xs text-muted">Searching Open Library…</p>}
          {lookupError && (
            <div className="mt-2">
              <ErrorState message={lookupError} onRetry={() => void searchTitle(form.title)} />
            </div>
          )}
          {!busy && !lookupError && searchTerm.trim().length >= 3 && suggestions.length === 0 && (
            <p role="status" className="mt-2 text-xs text-muted">No match found. Continue adding this book manually.</p>
          )}
          
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto">
              {suggestions.map((doc, i) => (
                <button key={i} onClick={() => selectSuggestion(doc)} className="flex w-full items-center gap-3 px-2 py-2 text-left transition hover:bg-white/5">
                  {doc.cover_i ? <img src={`https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`} alt={`Cover of ${doc.title}`} loading="lazy" decoding="async" width="32" height="48" className="h-12 w-8 rounded object-cover" /> : <div className="h-12 w-8 bg-surface rounded" />}
                  <div>
                    <p className="text-sm font-semibold">{doc.title}</p>
                    <p className="text-xs text-muted">{(doc.author_name || []).slice(0, 2).join(", ")} {doc.first_publish_year}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1 block">Author</label>
            <input value={form.author || ""} onChange={e => setField("author", e.target.value)} className={`${INPUT_CLASS} mt-1 ${MOBILE_INPUT_CLASS}`} placeholder="Author" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1 block">Status</label>
            <select value={form.status} onChange={e => setField("status", e.target.value)} className={`${INPUT_CLASS} mt-1 ${MOBILE_INPUT_CLASS}`}>
              <option value="Watchlist">Want to Read</option>
              <option value="Currently Reading">Currently Reading</option>
              <option value="Read">Read</option>
            </select>
          </div>
          {saveError && <p role="alert" className="text-xs text-muted">{saveError}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="book-total-pages" className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1 block">Total pages (optional)</label>
            <input
              id="book-total-pages"
              type="number"
              min="1"
              step="1"
              value={form.pages || ""}
              onChange={event => setField("pages", Number(event.target.value) || 0)}
              className={`${INPUT_CLASS} mt-1 ${MOBILE_INPUT_CLASS}`}
              placeholder="Page count"
            />
          </div>
          <div>
            <label htmlFor="book-current-page" className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1 block">Current page (optional)</label>
            <input
              id="book-current-page"
              type="number"
              min="0"
              max={Number(form.pages) || undefined}
              step="1"
              value={form.currentPage ?? ""}
              onChange={event => setField("currentPage", event.target.value)}
              className={`${INPUT_CLASS} mt-1 ${MOBILE_INPUT_CLASS}`}
              placeholder="Not started"
            />
          </div>
        </div>
        
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1 block">Cover Image URL</label>
          <input value={form.cover || ""} onChange={e => setField("cover", e.target.value)} className={`${INPUT_CLASS} mt-1 ${MOBILE_INPUT_CLASS}`} placeholder="https://..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-8 py-4">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted hover:text-text">Cancel</button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </Modal>
  );
}
