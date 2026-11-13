import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Cover } from './Cover';
import { X, BookOpen } from './Icons';
import { generateId } from '../utils/helpers';
import { searchOpenLibrary } from '../utils/api';

export function BookEditor({ book, onClose, onSave }) {
  const [form, setForm] = useState(book || { id: generateId(), category: "book", title: "", author: "", status: "Watchlist", rating: 0, pages: 0, cover: "" });
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setField("title", val);
    clearTimeout(searchTimeout.current);
    
    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      try {
        setBusy(true);
        const res = await searchOpenLibrary(val);
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
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
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal onClose={onClose} width="max-w-2xl">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-xl font-black flex items-center gap-2"><BookOpen className="h-5 w-5"/> {book ? "Edit Book" : "Add Book"}</h2>
        <button onClick={onClose} className="text-muted hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      
      <div className="space-y-4 p-6">
        <div className="relative">
          <label className="text-xs font-semibold text-muted uppercase">Title</label>
          <input value={form.title} onChange={handleTitleChange} className="w-full mt-1 rounded-xl border border-line bg-ink p-2.5 text-white" placeholder="Search Open Library..." autoComplete="off" />
          
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface2 p-1 shadow-2xl">
              {suggestions.map((doc, i) => (
                <button key={i} onClick={() => selectSuggestion(doc)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 transition">
                  {doc.cover_i ? <img src={`https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`} alt="" loading="lazy" decoding="async" className="h-12 w-8 rounded object-cover" /> : <div className="h-12 w-8 bg-ink rounded" />}
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
            <label className="text-xs font-semibold text-muted uppercase">Author</label>
            <input value={form.author || ""} onChange={e => setField("author", e.target.value)} className="w-full mt-1 rounded-xl border border-line bg-ink p-2.5 text-white" placeholder="Author" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase">Status</label>
            <select value={form.status} onChange={e => setField("status", e.target.value)} className="w-full mt-1 rounded-xl border border-line bg-ink p-2.5 text-white">
              <option value="Watchlist">Want to Read</option>
              <option value="Currently Reading">Currently Reading</option>
              <option value="Read">Read</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-xs font-semibold text-muted uppercase">Cover Image URL</label>
          <input value={form.cover || ""} onChange={e => setField("cover", e.target.value)} className="w-full mt-1 rounded-xl border border-line bg-ink p-2.5 text-white" placeholder="https://..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-surface2">Cancel</button>
        <button onClick={handleSave} disabled={busy} className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink hover:bg-accent/90">
          {busy ? "Working..." : "Save"}
        </button>
      </div>
    </Modal>
  );
}
