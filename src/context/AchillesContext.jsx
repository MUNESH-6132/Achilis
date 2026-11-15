import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, supabaseConfigured } from '../utils/supabaseClient';
import { idbGet, idbSet } from '../utils/db';
import { sanitizeState } from '../utils/sanitize';
import { SCHEMA_VERSION, defaultState } from '../utils/defaults';
import { DEMO_STORAGE_KEY, fileSync, loadStateAsync, saveCloudStateAsync, saveStateAsync, startAutosave, toCloudState } from '../utils/storage';
import { uploadDiaryMediaToSupabase } from '../utils/media';
import { Splash } from '../components/Splash';

const AchillesContext = createContext(null);
const CLOUD_OWNER_KEY = 'achilles:cloud-owner:v1';

function normalizeState(value) {
  return sanitizeState({ ...defaultState, ...value, schemaVersion: SCHEMA_VERSION });
}

function getUserDisplayName(user) {
  return user.user_metadata?.full_name?.trim() || user.email || 'Achilis reader';
}

function restoreLocalMedia(cloudState, localState) {
  const localEntries = new Map(
    (Array.isArray(localState?.diary) ? localState.diary : []).map(entry => [entry.id, entry]),
  );
  return {
    ...cloudState,
    diary: cloudState.diary.map(entry => {
      const localEntry = localEntries.get(entry.id);
      if (!localEntry) return entry;
      const restored = { ...entry };
      for (const field of ['photo', 'audio', 'video']) {
        if (
          !restored[field]
          && typeof localEntry[field] === 'string'
          && localEntry[field].startsWith('data:')
        ) {
          restored[field] = localEntry[field];
        }
      }
      return restored;
    }),
  };
}

export function AchillesProvider({ children, demoMode = false, initialData = defaultState }) {
  const { isDemo, user, loading: authLoading } = useAuth();
  const activeDemoMode = demoMode || isDemo;
  const stateStorageKey = activeDemoMode ? DEMO_STORAGE_KEY : undefined;
  const [state, setState] = useState(() => activeDemoMode ? sanitizeState(initialData) : defaultState);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [cloudReadyUserId, setCloudReadyUserId] = useState(null);
  const [cloudAccountReadyId, setCloudAccountReadyId] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(supabaseConfigured ? 'signed-out' : 'unconfigured');
  const [cloudSyncError, setCloudSyncError] = useState('');
  const [lastSynced, setLastSynced] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const stateRef = useRef(state);
  const lastCloudSnapshotRef = useRef(null);
  const toastTimerRef = useRef(null);
  const userId = user?.id;
  const userDisplayName = user ? getUserDisplayName(user) : '';
  const cloudReady = activeDemoMode || !userId || cloudReadyUserId === userId;

  const notify = useCallback(message => {
    setToastMessage(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 4500);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadStateAsync({
      key: stateStorageKey,
      fallbackState: activeDemoMode ? initialData : undefined,
      migrateLegacy: !activeDemoMode,
    })
      .then(loadedState => {
        if (mounted) setState(loadedState);
      })
      .catch(() => {
        if (mounted) {
          setSaveError(true);
          if (activeDemoMode) setState(sanitizeState(initialData));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeDemoMode, initialData, stateStorageKey]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    fileSync.init();
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    if (loading || authLoading) return undefined;
    if (activeDemoMode) {
      setCloudAccountReadyId(null);
      setCloudSyncStatus('demo');
      setCloudSyncError('');
      setLastSynced(null);
      lastCloudSnapshotRef.current = null;
      return undefined;
    }
    if (!userId) {
      setCloudReadyUserId(null);
      setCloudAccountReadyId(null);
      setCloudSyncStatus(supabaseConfigured ? 'signed-out' : 'unconfigured');
      setCloudSyncError('');
      setLastSynced(null);
      lastCloudSnapshotRef.current = null;
      return undefined;
    }
    if (!supabase) {
      setCloudReadyUserId(userId);
      setCloudSyncStatus('unconfigured');
      setCloudSyncError('Cloud sync is not configured. Local data remains available.');
      return undefined;
    }

    let active = true;
    setCloudSyncStatus('syncing');
    setCloudSyncError('');
    setLastSynced(null);
    lastCloudSnapshotRef.current = null;

    const initializeCloudData = async () => {
      try {
        const localOwnerId = await idbGet(CLOUD_OWNER_KEY);
        if (!active) return;
        if (localOwnerId && localOwnerId !== userId) {
          const isolatedState = normalizeState({ ...defaultState, user: userDisplayName });
          stateRef.current = isolatedState;
          setState(isolatedState);
          if (!(await saveStateAsync(isolatedState))) setSaveError(true);
          await idbSet(CLOUD_OWNER_KEY, userId);
        }

        const { data: row, error } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setCloudAccountReadyId(userId);

        const hasCloudState = row?.data && typeof row.data === 'object' && !Array.isArray(row.data);
        let nextState;
        if (hasCloudState) {
          nextState = restoreLocalMedia(normalizeState(row.data), stateRef.current);
        } else {
          nextState = stateRef.current;
          if (localOwnerId && localOwnerId !== userId) {
            nextState = normalizeState({ ...defaultState, user: userDisplayName });
          } else if (!nextState.user) {
            nextState = normalizeState({ ...nextState, user: userDisplayName });
          }

        }

        const mediaMigration = await uploadDiaryMediaToSupabase(nextState, userId);
        if (!active) return;
        nextState = mediaMigration.state;
        if (mediaMigration.failedUploads.length) {
          notify('Some diary media could not be uploaded and remains available locally on this device.');
        }

        const snapshot = JSON.stringify(toCloudState(nextState));
        lastCloudSnapshotRef.current = snapshot;
        stateRef.current = nextState;
        setState(nextState);
        if (!(await saveStateAsync(nextState))) setSaveError(true);
        if (!active) return;
        await idbSet(CLOUD_OWNER_KEY, userId);

        if (!hasCloudState || mediaMigration.inlineMediaCount) {
          const result = await saveCloudStateAsync(userId, nextState);
          setLastSynced(result.updatedAt);
        } else {
          setLastSynced(row.updated_at || null);
        }

        if (!active) return;
        setCloudSyncError('');
        setCloudSyncStatus('synced');
        setCloudReadyUserId(userId);
      } catch (error) {
        if (!active) return;
        lastCloudSnapshotRef.current = null;
        setCloudSyncError(error?.message || 'Cloud sync is temporarily unavailable.');
        setCloudSyncStatus('offline');
        setCloudReadyUserId(userId);
        notify('Cloud sync is unavailable. Your IndexedDB data remains saved locally.');
      }
    };

    void initializeCloudData();
    return () => {
      active = false;
    };
  }, [activeDemoMode, authLoading, loading, notify, userDisplayName, userId]);

  useEffect(() => {
    if (activeDemoMode || !userId || !supabase || !cloudReady || cloudAccountReadyId !== userId) return undefined;

    let active = true;
    const channel = supabase
      .channel(`user-data-changes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_data',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          if (!active) return;
          const remoteData = payload.new?.data;
          if (!remoteData || typeof remoteData !== 'object' || Array.isArray(remoteData)) return;

          const nextState = restoreLocalMedia(normalizeState(remoteData), stateRef.current);
          const snapshot = JSON.stringify(toCloudState(nextState));
          setLastSynced(payload.new.updated_at || new Date().toISOString());
          if (snapshot === lastCloudSnapshotRef.current) return;

          lastCloudSnapshotRef.current = snapshot;
          stateRef.current = nextState;
          setState(nextState);
          void saveStateAsync(nextState).then(saved => {
            if (active && !saved) setSaveError(true);
          });
        },
      )
      .subscribe(status => {
        if (!active || (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT')) return;
        setCloudSyncStatus('offline');
        setCloudSyncError('Live updates are temporarily unavailable. Local changes are still saved.');
        notify('Live cloud updates are unavailable. Local changes are still saved.');
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [activeDemoMode, cloudAccountReadyId, cloudReady, notify, userId]);

  useEffect(() => {
    if (activeDemoMode || loading || authLoading || !userId || !supabase || !cloudReady || cloudAccountReadyId !== userId) return undefined;

    const snapshot = JSON.stringify(toCloudState(state));
    if (snapshot === lastCloudSnapshotRef.current) return undefined;

    let active = true;
    const timer = setTimeout(async () => {
      setCloudSyncStatus('syncing');
      lastCloudSnapshotRef.current = snapshot;
      try {
        const result = await saveCloudStateAsync(userId, state);
        if (!active) return;
        setLastSynced(result.updatedAt);
        setCloudSyncError('');
        setCloudSyncStatus('synced');
      } catch (error) {
        if (!active) return;
        if (lastCloudSnapshotRef.current === snapshot) lastCloudSnapshotRef.current = null;
        setCloudSyncError(error?.message || 'Cloud sync failed. Your local data is safe.');
        setCloudSyncStatus('offline');
        notify('Cloud sync failed. Your changes remain saved locally.');
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeDemoMode, authLoading, cloudAccountReadyId, cloudReady, loading, notify, state, userId]);

  useEffect(() => {
    if (loading) return undefined;
    return startAutosave(state, {
      key: stateStorageKey,
      onSaveResult: saved => setSaveError(!saved),
    });
  }, [loading, state, stateStorageKey]);

  const syncNow = useCallback(async () => {
    if (activeDemoMode) {
      throw new Error('Cloud sync is disabled in demo mode.');
    }
    if (!userId || !supabase) {
      throw new Error('Sign in with a configured Supabase account before syncing.');
    }

    setCloudSyncStatus('syncing');
    setCloudSyncError('');
    try {
      const mediaMigration = await uploadDiaryMediaToSupabase(state, userId);
      const stateToSync = mediaMigration.state;
      stateRef.current = stateToSync;
      setState(stateToSync);
      if (!(await saveStateAsync(stateToSync))) setSaveError(true);

      const result = await saveCloudStateAsync(userId, stateToSync);
      lastCloudSnapshotRef.current = JSON.stringify(result.data);
      setLastSynced(result.updatedAt);
      setCloudAccountReadyId(userId);
      setCloudReadyUserId(userId);
      setCloudSyncStatus('synced');
      if (mediaMigration.failedUploads.length) {
        setCloudSyncError('Some diary media remains local because it could not be uploaded.');
      }
      return { ...result, failedMediaCount: mediaMigration.failedUploads.length };
    } catch (error) {
      setCloudSyncError(error?.message || 'Cloud sync failed. Your local data is safe.');
      setCloudSyncStatus('offline');
      throw error;
    }
  }, [activeDemoMode, state, userId]);

  const update = useCallback(patch => {
    setState(previous => (
      typeof patch === 'function' ? patch(previous) : { ...previous, ...patch }
    ));
  }, []);

  const replaceAll = useCallback(incoming => {
    setState(previous => ({
      ...sanitizeState(incoming),
      user: previous.user,
      pin: previous.pin,
    }));
  }, []);

  const value = {
    cloudReady,
    cloudSyncError,
    cloudSyncStatus,
    data: state,
    isDemo: activeDemoMode,
    lastSynced,
    notify,
    replaceAll,
    saveError,
    syncNow,
    toastMessage,
    update,
  };

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
