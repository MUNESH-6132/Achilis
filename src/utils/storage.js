import { SCHEMA_VERSION, defaultState } from './defaults';
import { idbGet, idbSet } from './db';
import { sanitizeState } from './sanitize';
import { supabase } from './supabaseClient';

export const STORAGE_KEY = 'achilles:v1';
export const DEMO_STORAGE_KEY = 'achilles:demo:v1';

export const SAVE_DEBOUNCE_MS = 600;

/**
 * Reads IndexedDB first, then migrates the legacy localStorage value if needed.
 */
export async function loadStateAsync({
  key = STORAGE_KEY,
  fallbackState,
  migrateLegacy = key === STORAGE_KEY,
} = {}) {
  let indexedDbError;
  try {
    const stored = await idbGet(key);
    if (stored) {
      return sanitizeState({ ...defaultState, ...stored, schemaVersion: SCHEMA_VERSION });
    }
  } catch (error) {
    indexedDbError = error;
  }

  if (!migrateLegacy) {
    if (indexedDbError) {
      throw new Error('Could not load data from browser storage.', { cause: indexedDbError });
    }
    return sanitizeState(fallbackState);
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    if (indexedDbError) {
      throw new Error('Could not load data from browser storage.', { cause: indexedDbError });
    }
    return sanitizeState(null);
  }

  const legacyState = sanitizeState(JSON.parse(raw));
  try {
    await idbSet(key, legacyState);
    localStorage.removeItem(key);
  } catch {
    // Keep the readable legacy copy; autosave will retry the IndexedDB write.
  }
  return legacyState;
}

/**
 * Writes the whole state to IndexedDB. Returns false if persistence fails.
 */
export async function saveStateAsync(state, key = STORAGE_KEY) {
  try {
    await idbSet(key, state);
    return true;
  } catch {
    return false;
  }
}

export function toCloudState(state) {
  const diary = Array.isArray(state?.diary)
    ? state.diary.map(entry => {
        const cloudEntry = { ...entry };
        for (const field of ['photo', 'audio', 'video']) {
          if (typeof cloudEntry[field] === 'string' && cloudEntry[field].startsWith('data:')) {
            cloudEntry[field] = null;
          }
        }
        return cloudEntry;
      })
    : [];
  return { ...state, diary };
}

export async function saveCloudStateAsync(userId, state) {
  if (!supabase) {
    throw new Error('Cloud sync is not configured.');
  }
  if (!userId) {
    throw new Error('Sign in before syncing data.');
  }

  const cloudData = toCloudState(state);
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, data: cloudData, updated_at: updatedAt },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();
  if (error) throw error;
  return { data: cloudData, updatedAt: data?.updated_at || updatedAt };
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
export function startAutosave(state, { key = STORAGE_KEY, onSaveResult, sync = fileSync } = {}) {
  const persist = async () => {
    const saved = await saveStateAsync(state, key);
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
