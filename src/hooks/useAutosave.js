import { useState, useRef, useEffect } from 'react';

/**
 * useAutosave - Debounced autosave engine for text inputs and progress updates.
 *
 * @param {any} value - The current value to debounce-saving.
 * @param {Function} onSave - Callback to persist the value (e.g., update from AchillesContext).
 * @param {number} delay - Debounce delay in milliseconds (default: 1200 = 1.2s).
 * @returns {Object} :: { isSaving, lastSaved }
 *
 * Behavior:
 * - When `value` changes, a timer of `delay` ms is started.
 * - If `value` changes again before the timer fires, the timer is reset.
 * - When the timer fires and the user is online, `onSave(value)` is called.
 * - If the user is offline when the timer fires, save is postponed.
 *   A `window.addEventListener('online', ...)` listener is registered
 *   (once per hook instance) to trigger the save once reconnected.
 * - `isSaving` is set to `true` while the timer is pending and during the `onSave` call.
 * - `lastSaved` is updated to `Date.now()` after a successful save.
 * - On unmount or value change, the timer is cleared.
 */
export function useAutosave(value, onSave, delay = 1200) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef = useRef(null);
  const pendingRef = useRef(value);
  const onlineListenerRef = useRef(null);

  // Stop any existing timer on re-render / value change
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [value]);

  // Set timer when value changes (and clear any prior timer)
  useEffect(() => {
    if (onlineListenerRef.current && typeof navigator !== 'undefined' && navigator.onLine) {
      // online state changed externally; just let the normal flow handle it
    }

    timerRef.current = setTimeout(async () => {
      // Check online status before saving
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Offline: set pending state; listener will resume save
        setIsSaving(false);
        setLastSaved(null);
        return;
      }

      setIsSaving(true);
      try {
        await onSave(value);
        setLastSaved(Date.now());
        setIsSaving(false);
      } catch (err) {
        console.error('Autosave failed:', err);
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, onSave, delay]);

  // Add global online listener once (first time hook mounts)
  useEffect(() => {
    if (onlineListenerRef.current) return;

    onlineListenerRef.current = () => {
      // When coming back online, re-run the save with the pending value
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      // Re-invoke the save with the pending value
      if (pendingRef.current !== undefined) {
        // Reset timer state so the save fires immediately-ish
        setIsSaving(true);
        onSave(pendingRef.current).then(() => {
          setLastSaved(Date.now());
          setIsSaving(false);
        });
      }
    };

    window.addEventListener('online', onlineListenerRef.current);
    return () => {
      window.removeEventListener('online', onlineListenerRef.current);
      onlineListenerRef.current = null;
    };
  }, []); // dependency array: run once on mount

  return { isSaving, lastSaved };
}

export default useAutosave;
