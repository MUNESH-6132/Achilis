import { BOOK_CATEGORIES, SCHEMA_VERSION, defaultState } from './defaults';

/**
 * Normalises any loaded/imported payload into a valid persisted state.
 * Mirrors the original `dl` function; the merge order is kept so stored
 * values always win over defaults, exactly like the single-file app.
 */
export function sanitizeState(input) {
  const source = input && typeof input === 'object' ? input : {};

  const books = (Array.isArray(source.books) ? source.books : [])
    .filter((book) => book && typeof book === 'object')
    .map((book) => {
      const category = BOOK_CATEGORIES.includes(book.category) ? book.category : 'book';
      return book.category === category ? book : { ...book, category };
    });

  const notes = (Array.isArray(source.notes) ? source.notes : [])
    .filter((note) => note && typeof note === 'object')
    .map((note) => ({
      title: '',
      body: '',
      tags: '',
      pinned: false,
      createdAt: Number(note.createdAt) || Date.now(),
      updated: Number(note.updated) || Date.now(),
      ...note,
    }));

  const shelves = (Array.isArray(source.shelves) ? source.shelves : [])
    .filter((shelf) => shelf && typeof shelf === 'object' && String(shelf.name || '').trim())
    .map((shelf, index) => ({
      id: shelf.id || `shelf-${index}`,
      name: String(shelf.name).trim().slice(0, 40),
      titleIds: [...new Set(
        (Array.isArray(shelf.titleIds) ? shelf.titleIds : []).filter(Boolean).map(String),
      )],
    }));

  return {
    ...defaultState,
    ...source,
    schemaVersion: SCHEMA_VERSION,
    books,
    notes,
    shelves,
    timer: { ...defaultState.timer, ...(source.timer || {}) },
  };
}
