import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { sanitizeState } from '../utils/sanitize';
import { defaultState } from '../utils/defaults';
import { fileSync, loadStateAsync, startAutosave } from '../utils/storage';
import { Splash } from '../components/Splash';

const AchillesContext = createContext(null);

export function AchillesProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadStateAsync()
      .then((loadedState) => {
        if (mounted) setState(loadedState);
      })
      .catch(() => {
        if (mounted) setSaveError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // File-sync bootstrap (no-op until that feature is migrated).
  useEffect(() => {
    fileSync.init();
  }, []);

  // Debounced persistence + flush on pagehide / tab hide.
  useEffect(
    () => {
      if (loading) return undefined;
      return startAutosave(state, { onSaveResult: (saved) => setSaveError(!saved) });
    },
    [state, loading],
  );

  // Accepts either a partial patch or an updater function.
  const update = useCallback((patch) => {
    setState((previous) => (
      typeof patch === 'function' ? patch(previous) : { ...previous, ...patch }
    ));
  }, []);

  // Replaces everything from an imported/restored payload, keeping identity.
  const replaceAll = useCallback((incoming) => {
    setState((previous) => ({
      ...sanitizeState(incoming),
      user: previous.user,
      pin: previous.pin,
    }));
  }, []);

  const value = { data: state, update, replaceAll, saveError };

  if (loading) return <Splash />;

  return <AchillesContext.Provider value={value}>{children}</AchillesContext.Provider>;
}

export function useAchilles() {
  const context = useContext(AchillesContext);
  if (!context) {
    throw new Error('useAchilles must be used inside an AchillesProvider');
  }
  return context;
}
