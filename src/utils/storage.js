import { SCHEMA_VERSION, defaultState } from './defaults';
import { idbGet, idbSet } from './db';
import { sanitizeState } from './sanitize';

export const STORAGE_KEY = 'achilles:v1';

export const SAVE_DEBOUNCE_MS = 600;

/**
 * Reads IndexedDB first, then migrates the legacy localStorage value if needed.
 */
export async function loadStateAsync() {
  let indexedDbError;
  try {
    const stored = await idbGet(STORAGE_KEY);
    if (stored) {
      return sanitizeState({ ...defaultState, ...stored, schemaVersion: SCHEMA_VERSION });
    }
  } catch (error) {
    indexedDbError = error;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    if (indexedDbError) {
      throw new Error('Could not load data from browser storage.', { cause: indexedDbError });
    }
    return sanitizeState(null);
  }

  const legacyState = sanitizeState(JSON.parse(raw));
  try {
    await idbSet(STORAGE_KEY, legacyState);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keep the readable legacy copy; autosave will retry the IndexedDB write.
  }
  return legacyState;
}

/**
 * Writes the whole state to IndexedDB. Returns false if persistence fails.
 */
export async function saveStateAsync(state) {
  try {
    await idbSet(STORAGE_KEY, state);
    return true;
  } catch {
    return false;
  }
}

/**
 * Placeholder for the file-sync feature that has not been migrated yet.
 * The provider calls init/queue/flush in the same places as the original app,
 * so wiring the real implementation later needs no change to the provider.
 */
export const fileSync = {
  init() {},
  queue() {},
  flush() {},
};

/**
 * Wires up debounced IndexedDB persistence, page/tab-hide flushing, and cleanup.
 *
 * Returns the effect cleanup function.
 */
export function startAutosave(state, { onSaveResult, sync = fileSync } = {}) {
  const persist = async () => {
    const saved = await saveStateAsync(state);
    if (onSaveResult) onSaveResult(saved);
    sync.queue(state);
  };

  const timer = setTimeout(() => {
    void persist();
  }, SAVE_DEBOUNCE_MS);

  const flush = () => {
    clearTimeout(timer);
    void persist();
    sync.flush();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush();
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
