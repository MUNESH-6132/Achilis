// Default persisted state (mirrors the `Oo` object in the single-file app).
export const SCHEMA_VERSION = 3;

// Allowed `category` values for a library entry.
export const BOOK_CATEGORIES = ['book', 'movie', 'series'];

export const defaultState = {
  schemaVersion: SCHEMA_VERSION,
  user: null,
  pin: null,
  books: [],
  diary: [],
  notes: [],
  shelves: [],
  trackers: [],
  logs: [],
  pomo: [],
  timer: {
    work: 25,
    break: 5,
  },
};
