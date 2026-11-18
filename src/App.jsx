import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AchillesProvider, useAchilles } from './context/AchillesContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './components/Home';
import { Library } from './components/Library';
import { Entertainment } from './components/Entertainment';
import { Personal } from './components/Personal';
import { Settings } from './components/Settings';
import { WhatsNew } from './components/WhatsNew';
import { SplashScreen } from './components/SplashScreen';
import { Splash } from './components/Splash';
import { Search } from './components/Icons';
import { getTodayDateString } from './utils/helpers';
import { demoData } from './utils/mockData';
import { Toast } from './ui/Toast';
import { Button } from './ui/Primitives';
import { MotionPreferenceContext, useReduceMotion } from './ui/motion';
import { HeaderNav } from './components/HeaderNav';
import { HermesQuickAdd } from './components/HermesQuickAdd';
import { AddContentModal } from './components/AddContentModal';
import { HelmetLogo } from './components/HelmetLogo';

const LockScreen = () => {
  const { saveError } = useAchilles();
  const { authError, isConfigured, signIn, signUp, startDemo } = useAuth();
  const [requestedSignUp] = useState(() => new URLSearchParams(window.location.search).get('auth') === 'signup');
  const [showAuth, setShowAuth] = useState(requestedSignUp);
  const [mode, setMode] = useState(requestedSignUp ? 'signup' : 'signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!requestedSignUp) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [requestedSignUp]);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!isConfigured) {
      setError('Cloud authentication is not configured. Check the Supabase environment variables and restart the app.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Enter your name to create an account.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password, fullName.trim());
        if (!result.session) {
          setMessage('Account created. Check your email to confirm your address, then sign in.');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (authIssue) {
      setError(authIssue?.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleStartDemo = () => {
    setError('');
    try {
      startDemo();
    } catch (demoError) {
      setError(demoError?.message || 'Could not start demo mode in this browser.');
    }
  };

  return (
    <div className="relative z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5 py-12">
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-line shadow-2xl mb-4">
            <HelmetLogo className="h-10 w-10 text-accent" />
          </div>
          <h1 className="font-serif text-5xl tracking-widest uppercase font-bold text-text">Achilis</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-accent font-semibold">A universe of your own.</p>
          <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-muted">A personal space for collecting knowledge, entertainment, memories and experiences.</p>
        </div>
        <div className="space-y-5">
          {saveError && <p role="alert" className="border-l-2 border-accent pl-3 text-xs text-muted">Browser storage is unavailable or full. Existing data may not load or save correctly.</p>}
          {!showAuth ? (
            <>
              {authError && <p role="alert" className="border-l-2 border-accent pl-3 text-xs text-muted">{authError}</p>}
              {error && <p role="alert" className="border-l-2 border-accent pl-3 text-xs text-muted">{error}</p>}
              <button
                type="button"
                onClick={handleStartDemo}
                className="w-full rounded-full bg-white px-6 py-5 text-lg font-bold text-black transition hover:bg-white/85"
              >
                Try Demo
                <span className="mt-1 block text-sm font-medium">No signup required</span>
              </button>
              <button type="button" onClick={() => { setShowAuth(true); setError(''); setMessage(''); }} className="w-full text-center text-sm text-muted transition hover:text-white">
                Already have an account? <span className="font-semibold text-white">Sign in</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              {authError && !error && <p role="alert" className="border-l-2 border-accent pl-3 text-xs text-muted">{authError}</p>}
              <div className="flex gap-6 border-b border-white/10">
                <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} aria-pressed={mode === 'signin'} className={`min-h-11 border-b-2 text-sm font-semibold transition ${mode === 'signin' ? 'border-white text-white' : 'border-transparent text-muted hover:text-white'}`}>Sign In</button>
                <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }} aria-pressed={mode === 'signup'} className={`min-h-11 border-b-2 text-sm font-semibold transition ${mode === 'signup' ? 'border-white text-white' : 'border-transparent text-muted hover:text-white'}`}>Sign Up</button>
              </div>
              {mode === 'signup' && (
                <div className="mb-4">
                  <label htmlFor="auth-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Full name</label>
                  <input id="auth-name" className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm text-white focus:border-white focus:outline-none" value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required />
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="auth-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Email</label>
                <input id="auth-email" className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm text-white focus:border-white focus:outline-none" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required />
              </div>
              <div className="mb-5">
                <label htmlFor="auth-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Password</label>
                <input id="auth-password" className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm text-white focus:border-white focus:outline-none" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
              </div>
              {error && <p className="border-l-2 border-accent pl-3 text-xs text-muted">{error}</p>}
              {message && <p role="status" className="text-xs text-muted">{message}</p>}
              <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-white/85 disabled:opacity-50" disabled={busy || !isConfigured}>
                {mode === 'signup' ? "Create Account" : "Sign In"}
                {busy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
              </button>
              {!isConfigured && <p className="mt-3 text-center text-xs text-muted">Supabase environment variables are missing.</p>}
              <button type="button" onClick={() => { setShowAuth(false); setError(''); setMessage(''); }} className="w-full text-center text-sm text-muted transition hover:text-white">Back to demo</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { cloudReady, cloudSyncStatus, data, replaceAll, saveError, syncNow, toastMessage, undoToast, undoLatest, dismissLatest } = useAchilles();
  const { exitDemo, isDemo, user: authUser, loading: authLoading } = useAuth();
  const systemReduceMotion = useReduceMotion();
  const [space, setSpace] = useState('home');
  const [collectionTab, setCollectionTab] = useState('books');
  const [journalTab, setJournalTab] = useState('diary');
  const [diaryPromptRequest, setDiaryPromptRequest] = useState(null);
  const [referenceRequest, setReferenceRequest] = useState(null);
  const [requestAddBook, setRequestAddBook] = useState(false);
  const [quickAddType, setQuickAddType] = useState(null);
  const [search, setSearch] = useState('');
  const [focusSearchRequested, setFocusSearchRequested] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [whatsNewPreference] = useState(() => {
    try {
      return { shouldShow: localStorage.getItem("achilles:whatsnew:v1") === null, error: false };
    } catch {
      return { shouldShow: true, error: true };
    }
  });
  const [themePreference] = useState(() => {
    try {
      const stored = localStorage.getItem("achilles:theme");
      if (stored === 'light' || stored === 'paper') return { value: "light", error: false };
      return { value: "dark", error: false };
    } catch {
      return { value: "dark", error: true };
    }
  });
  const [reduceMotionPreference] = useState(() => {
    try {
      return { value: localStorage.getItem('achilles:reduce-motion') === 'true', error: false };
    } catch {
      return { value: false, error: true };
    }
  });
  const [ambientPreference] = useState(() => {
    try {
      return { value: localStorage.getItem('achilles:ambient') === 'true', error: false };
    } catch {
      return { value: false, error: true };
    }
  });
  const [reduceMotionSetting, setReduceMotionSetting] = useState(reduceMotionPreference.value);
  const [ambientMode, setAmbientMode] = useState(ambientPreference.value);
  const reduceMotion = Boolean(systemReduceMotion || reduceMotionSetting);
  const [preferenceError, setPreferenceError] = useState(
    whatsNewPreference.error || themePreference.error || reduceMotionPreference.error || ambientPreference.error,
  );
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [syncRetryError, setSyncRetryError] = useState('');
  const fileRef = useRef(null);
  const searchInputRef = useRef(null);
  const [navigateTo, setNavigateTo] = useState(null);
  const navigate = useCallback((nextSpace, subtab, addBook = false, diaryPrompt = '', filter) => {
    setSpace(nextSpace);
    setSearch('');
    if (nextSpace === 'collection' && subtab) setCollectionTab(subtab);
    if (nextSpace === 'journal' && subtab) setJournalTab(subtab);
    setRequestAddBook(addBook);
    setDiaryPromptRequest(diaryPrompt ? { id: Date.now(), prompt: diaryPrompt } : null);
    setNavigateTo({ space: nextSpace, subtab, filter });
  }, []);
  const openReference = useCallback(item => {
    if (!item?.id) return;
    setReferenceRequest({ id: item.id, category: item.category });
    navigate('collection', item.category === 'movie' || item.category === 'series' ? 'screen' : 'books');
  }, [navigate]);
  const clearReferenceRequest = useCallback(() => setReferenceRequest(null), []);
  const openSearch = useCallback(() => {
    setFocusSearchRequested(true);
    if (space !== 'collection' && space !== 'journal') navigate('collection', 'books');
  }, [navigate, space]);

  useEffect(() => {
    if (!focusSearchRequested || (space !== 'collection' && space !== 'journal')) return;
    searchInputRef.current?.focus();
    setFocusSearchRequested(false);
  }, [focusSearchRequested, space]);

  useEffect(() => {
    const handleShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [openSearch]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
  }, [reduceMotion]);

  useEffect(() => {
    try {
      localStorage.setItem('achilles:reduce-motion', String(reduceMotionSetting));
    } catch {
      setPreferenceError(true);
    }
  }, [reduceMotionSetting]);

  useEffect(() => {
    try {
      localStorage.setItem('achilles:ambient', String(ambientMode));
    } catch {
      setPreferenceError(true);
    }
  }, [ambientMode]);

  useEffect(() => {
    if (!whatsNewPreference.shouldShow) return undefined;
    const timer = setTimeout(() => setShowWhatsNew(true), 1000);
    return () => clearTimeout(timer);
  }, [whatsNewPreference.shouldShow]);

  // Theme Switcher
  const [theme, setTheme] = useState(themePreference.value);
  const changeTheme = useCallback(nextTheme => {
    const valid = nextTheme === 'light' ? 'light' : 'dark';
    setTheme(valid);
    try {
      localStorage.setItem("achilles:theme", valid);
    } catch {
      setPreferenceError(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("class", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#FFFFFF" : "#08090C");
    }
  }, [theme]);

  const handleThemeToggle = () => {
    changeTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `achilis-backup-${getTodayDateString()}.json`;
    a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.books && parsed.diary) replaceAll(parsed);
        else alert("Invalid backup file.");
      } catch { alert("Could not read file."); }
    };
    reader.readAsText(file);
  };

  const handleSyncRetry = async () => {
    setSyncRetrying(true);
    setSyncRetryError('');
    try {
      await syncNow();
    } catch (error) {
      setSyncRetryError(error?.message || 'Sync could not reconnect. Your changes remain saved locally.');
    } finally {
      setSyncRetrying(false);
    }
  };

  if (!isDemo && authLoading) return <SplashScreen />;
  if (!isDemo && !authUser) return <LockScreen />;
  const NAV = [
    { id: 'home', label: 'Olympus', active: space === 'home', onClick: () => navigate('home') },
    { id: 'library', label: 'Athena', active: space === 'collection' && collectionTab === 'books', onClick: () => navigate('collection', 'books') },
    { id: 'cinema', label: 'Apollo', active: space === 'collection' && collectionTab === 'screen', onClick: () => navigate('collection', 'screen') },
    { id: 'journal', label: 'Mnemosyne', active: space === 'journal', onClick: () => navigate('journal') },
  ];

  return (
    <MotionPreferenceContext.Provider value={reduceMotion}>
    <div className="app-shell flex flex-col overflow-hidden bg-ink text-text">
      {/* Full-width Top Navigation Bar (HeaderNav) */}
      <HeaderNav
        space={space}
        collectionTab={collectionTab}
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={handleThemeToggle}
        userName={(data.user || authUser?.user_metadata?.full_name || 'Reader').split(/\s+/)[0]}
        isDemo={isDemo}
        onExitDemo={() => exitDemo(true)}
        onSettings={() => navigate('settings')}
      />

      {isDemo && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-xs border-b border-line bg-surface/50">
          <span className="text-muted">Demo Mode — Saved locally in your browser</span>
          <button type="button" onClick={() => exitDemo(true)} className="min-h-11 font-semibold text-accent transition hover:underline">
            Create Free Account →
          </button>
        </div>
      )}

      <main
        className="main-content min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-8 md:pb-12"
      >
        {saveError && <div role="alert" className="mb-3 border-b border-line px-4 py-2 text-center text-xs text-muted">Browser storage is unavailable or full — recent changes may not be saved.</div>}
        {preferenceError && <div role="status" className="mb-3 border-b border-line px-4 py-2 text-center text-xs text-muted">A preference could not be saved in this browser.</div>}
        {cloudSyncStatus === 'offline' && (
          <div role="status" className="mb-3 flex flex-wrap items-center justify-center gap-3 border-b border-line px-4 py-2 text-center text-xs text-muted">
            <span>{syncRetryError || "Cloud sync is unavailable. Your changes remain saved locally and this app still works offline."}</span>
            <Button variant="quiet" loading={syncRetrying} onClick={() => void handleSyncRetry()} className="min-h-11 px-3 py-1 text-xs">
              Retry sync
            </Button>
          </div>
        )}

        {(space === 'collection' || space === 'journal') && (
          <div className={`relative mx-auto mb-6 w-full ${space === 'journal' ? 'max-w-3xl' : 'max-w-5xl'}`}>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                ref={searchInputRef}
                aria-label="Search this space"
                type="search"
                enterKeyHint="search"
                className="w-full border-0 border-b border-line bg-transparent py-2 pl-7 pr-2 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search this space…"
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${space}-${collectionTab}-${journalTab}`}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.01 : 0.3, ease: 'easeInOut' } }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10, transition: { duration: 0.3, ease: 'easeInOut' } }}
          >
            {!cloudReady ? (
              space === 'collection'
                ? collectionTab === 'books' ? <Library query={search} loading /> : <Entertainment query={search} loading />
                  : <div className="flex min-h-[50vh] items-center justify-center"><Splash /></div>
            ) : (
              <>
                {space === 'home' && <Home onGo={navigate} onAddBook={() => navigate('collection', 'books', true)} ambientMode={ambientMode} />}
                {space === 'collection' && (
                  <>
                    <div className="mb-6 flex items-center gap-1 border-b border-line" role="tablist" aria-label="Collection">
                      {[{ id: 'books', label: 'Books' }, { id: 'screen', label: 'Screen' }].map(tab => (
                        <button key={tab.id} type="button" role="tab" aria-selected={collectionTab === tab.id} onClick={() => { setCollectionTab(tab.id); setRequestAddBook(false); setSearch(''); }} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${collectionTab === tab.id ? 'border-white text-white' : 'border-transparent text-muted hover:text-white'}`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    {collectionTab === 'books'
                      ? <Library
                          query={search}
                          openAddBook={requestAddBook}
                          onAddBookHandled={() => setRequestAddBook(false)}
                          referenceRequest={referenceRequest}
                          onReferenceHandled={clearReferenceRequest}
                          initialFilter={navigateTo?.filter}
                        />
                      : <Entertainment
                          query={search}
                          referenceRequest={referenceRequest}
                          onReferenceHandled={clearReferenceRequest}
                        />}
                  </>
                )}
                {space === 'journal' && <Personal key={journalTab} query={search} initialTab={journalTab} entryPrompt={diaryPromptRequest} onOpenReference={openReference} />}
                {space === 'settings' && (
                  <Settings
                    theme={theme}
                    setTheme={changeTheme}
                    reduceMotion={reduceMotionSetting}
                    setReduceMotion={setReduceMotionSetting}
                    ambientMode={ambientMode}
                    setAmbientMode={setAmbientMode}
                    onShowWhatsNew={() => setShowWhatsNew(true)}
                    onExport={handleExport}
                    onImport={() => fileRef.current?.click()}
                    onImportFile={handleImport}
                    importInputRef={fileRef}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Hermes Floating Speed-Dial */}
      <HermesQuickAdd
        onSelectType={type => setQuickAddType(type)}
      />

      {/* Unified Add Content Modal */}
      {quickAddType && (
        <AddContentModal
          initialType={quickAddType}
          onClose={() => setQuickAddType(null)}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[35] flex justify-center bg-ink/90 backdrop-blur-md border-t border-line px-3 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden" aria-label="Primary">
        <div className="flex max-w-full items-center justify-center gap-1 rounded-full bg-surface/90 px-2 py-1 shadow-xl backdrop-blur-sm border border-line">
          {NAV.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`min-h-11 rounded-full px-3 text-xs font-medium transition-colors ${item.active ? 'text-accent font-semibold' : 'text-muted hover:text-text'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {showWhatsNew && <WhatsNew onClose={dontShowAgain => {
        setShowWhatsNew(false);
        if (dontShowAgain) {
          try {
            localStorage.setItem("achilles:whatsnew:v1", "1");
          } catch {
            setPreferenceError(true);
          }
        }
      }} />}
      <Toast
        message={undoToast?.message || toastMessage}
        actionLabel={undoToast ? 'Undo' : undefined}
        onAction={undoLatest}
        onDismiss={dismissLatest}
      />
    </div>
    </MotionPreferenceContext.Provider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthAwareApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AuthAwareApp() {
  const { isDemo } = useAuth();
  return (
    <AchillesProvider
      key={isDemo ? 'demo' : 'account'}
      demoMode={isDemo}
      initialData={isDemo ? demoData : undefined}
    >
      <AppContent />
    </AchillesProvider>
  );
}

export default App;
