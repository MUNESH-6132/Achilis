import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AchillesProvider, useAchilles } from './context/AchillesContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './components/Home';
import { Library } from './components/Library';
import { Entertainment } from './components/Entertainment';
import { Personal } from './components/Personal';
import { Settings } from './components/Settings';
import { WhatsNew } from './components/WhatsNew';
import { Timer } from './components/Timer';
import { SplashScreen } from './components/SplashScreen';
import { DiaryEditor } from './components/DiaryEditor';
import { NoteEditor } from './components/NoteEditor';
import { Search, Lock, Download, Upload, BookOpen, Play as Film, Edit, Grid as SettingsIcon } from './components/Icons';
import { getTodayDateString, hashPin, verifyPin, generateId, getToday } from './utils/helpers';

const LockScreen = ({ onUnlock }) => {
  const { data, update, saveError } = useAchilles();
  const hasUser = !!data.user;
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!hasUser) {
      const n = name.trim();
      if (!n) { setError("Tell us what to call you."); return; }
      if (pin && !/^\d{4,8}$/.test(pin)) { setError("The PIN must be 4 to 8 digits."); return; }
      setBusy(true);
      const salt = Math.random().toString(36).slice(2);
      const hash = pin ? await hashPin(pin, salt) : null;
      update({ user: n, pin: hash ? { salt, hash } : null });
      setBusy(false); onUnlock();
      return;
    }
    if (!pin) { setError("Enter your PIN to unlock."); return; }
    setBusy(true);
    const hash = await hashPin(pin, data.pin.salt);
    setBusy(false);
    if (verifyPin(hash, data.pin.hash)) { setPin(''); onUnlock(); } 
    else { setPin(''); setError("That PIN is not right."); }
  };

  return (
    <div className="relative z-[100] flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-accent/25 blur-[150px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-accent/[0.06] to-transparent" />
      <div className="rise-in relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent font-display text-2xl font-black text-ink shadow-[0_24px_60px_-24px_#ff5500]">A</div>
          <h1 className="font-display text-4xl font-black tracking-tight">Achilis</h1>
          <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">{hasUser ? `Welcome back, ${data.user}.` : "A quiet home for your books, days and habits."}</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-[28px] border border-line bg-surface/90 p-6 shadow-2xl">
          {saveError && <p role="alert" className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">Browser storage is unavailable or full. Existing data may not load or save correctly.</p>}
          {!hasUser && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Your name</label>
              <input className="w-full rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-white focus:border-accent/70 focus:outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" autoFocus />
            </div>
          )}
          <div className="mb-5">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{hasUser ? "PIN" : "PIN · optional"}</label>
            <input className="w-full rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-white tracking-[0.4em] focus:border-accent/70 focus:outline-none" type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" autoFocus={hasUser} />
          </div>
          {error && <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">{error}</p>}
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-accent/90" disabled={busy}>
            {busy ? "One moment…" : hasUser ? "Unlock" : "Create my space"}
          </button>
        </form>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { data, replaceAll, saveError, update } = useAchilles();
  const [locked, setLocked] = useState(true);
  const [space, setSpace] = useState('home');
  const [search, setSearch] = useState('');
  const [fab, setFab] = useState(false);
  const [quick, setQuick] = useState(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [whatsNewPreference] = useState(() => {
    try {
      return { shouldShow: localStorage.getItem("achilles:whatsnew:v1") === null, error: false };
    } catch {
      return { shouldShow: true, error: true };
    }
  });
  const [themePreference] = useState(() => {
    try {
      return { value: localStorage.getItem("achilles:theme") || "ember", error: false };
    } catch {
      return { value: "ember", error: true };
    }
  });
  const [preferenceError, setPreferenceError] = useState(whatsNewPreference.error || themePreference.error);
  const fileRef = useRef(null);
  const completeSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    if (!whatsNewPreference.shouldShow) return undefined;
    const timer = setTimeout(() => setShowWhatsNew(true), 1000);
    return () => clearTimeout(timer);
  }, [whatsNewPreference.shouldShow]);

  // Theme Switcher
  const [theme, setTheme] = useState(themePreference.value);
  const changeTheme = useCallback(nextTheme => {
    setTheme(nextTheme);
    try {
      localStorage.setItem("achilles:theme", nextTheme);
    } catch {
      setPreferenceError(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const colors = { ember: "#17110e", noir: "#0a0a0a", midnight: "#080f1d", sage: "#10150f", paper: "#f7f1e6" };
      meta.setAttribute("content", colors[theme] || "#17110e");
    }
  }, [theme]);

  const cycleTheme = () => {
    const themes = ['ember', 'noir', 'midnight', 'sage', 'paper'];
    const i = themes.indexOf(theme);
    changeTheme(themes[(i + 1) % themes.length]);
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

  if (showSplash) return <SplashScreen onComplete={completeSplash} />;

  if (!data.user || (data.pin && locked)) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  const NAV = [
    { id: "library", label: "Library", Icon: BookOpen },
    { id: "entertainment", label: "Entertainment", Icon: Film },
    { id: "personal", label: "Personal", Icon: Edit },
    { id: "settings", label: "Settings", Icon: SettingsIcon }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
          <button onClick={() => setSpace('home')} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-black text-ink shadow-[0_10px_26px_-12px_#ff5500]">A</span>
            <span className="font-display text-xl font-black tracking-tight">Achilis</span>
          </button>
          
          {space !== 'home' && space !== 'settings' && (
            <div className="relative order-last w-full sm:order-none sm:ml-2 sm:w-auto sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input className="w-full rounded-full border border-transparent bg-surface pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted/50 focus:border-accent/70 focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
            </div>
          )}

          <nav className="ml-auto flex items-center rounded-full border border-line bg-surface p-1">
            {NAV.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => { setSpace(id); setSearch(''); }} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${space === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-white'}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          
          <button onClick={cycleTheme} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-sm text-muted transition hover:border-accent/60 hover:text-accent" title="Cycle theme">◐</button>
        </div>
      </header>

      {saveError && <div role="alert" className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-accent">Browser storage is unavailable or full — recent changes may not be saved.</div>}
      {preferenceError && <div role="status" className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-accent">A preference could not be saved in this browser.</div>}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-44 pt-8 sm:px-6">
        {space === 'home' && <Home onGo={setSpace} />}
        {space === 'library' && <Library query={search} />}
        {space === 'entertainment' && <Entertainment query={search} />}
        {space === 'personal' && <Personal query={search} />}
        {space === 'settings' && <Settings theme={theme} setTheme={changeTheme} onShowWhatsNew={() => setShowWhatsNew(true)} />}
      </main>

      <footer className="mt-auto border-t border-line bg-ink/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4 text-xs text-muted sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface2 font-display text-xs font-bold text-white">{data.user.slice(0, 1).toUpperCase()}</span>
            <span className="truncate font-medium text-white/80">{data.user}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 hover:bg-surface2"><Download className="h-3.5 w-3.5" /> Export</button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 hover:bg-surface2"><Upload className="h-3.5 w-3.5" /> Import</button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {data.pin && <button onClick={() => setLocked(true)} className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 hover:bg-surface2"><Lock className="h-3.5 w-3.5" /> Lock</button>}
          </div>
        </div>
      </footer>

      {/* FAB (Floating Action Button) */}
      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2">
        {fab && (
          <div className="pop-in flex flex-col items-end gap-2">
            <button onClick={() => { setFab(false); setQuick({ kind: 'note' }); }} className="rounded-full border border-line bg-surface/95 px-4 py-2 text-xs font-semibold text-white shadow-xl transition hover:border-accent/60 hover:text-accent">Quick note</button>
            <button onClick={() => { setFab(false); setQuick({ kind: 'diary' }); }} className="rounded-full border border-line bg-surface/95 px-4 py-2 text-xs font-semibold text-white shadow-xl transition hover:border-accent/60 hover:text-accent">Quick diary</button>
          </div>
        )}
        <button onClick={() => setFab(!fab)} className="grid h-14 w-14 place-items-center rounded-full border border-accent/40 bg-accent text-2xl font-black text-ink shadow-[0_18px_40px_-16px_rgb(var(--c-accent))] transition hover:brightness-110">{fab ? "×" : "+"}</button>
      </div>

      {/* Quick Capture Modals */}
      {quick?.kind === 'note' && <NoteEditor note={{ id: generateId(), title: "", content: "" }} onClose={() => setQuick(null)} onSave={n => {
        update(state => ({ ...state, notes: [n, ...(state.notes || [])] }));
        setQuick(null);
      }} />}
      
      {quick?.kind === 'diary' && <DiaryEditor entry={{ id: generateId(), date: getToday(), title: "", content: "", mood: 3 }} onClose={() => setQuick(null)} onSave={d => {
        update(state => {
          const exists = state.diary.some(entry => entry.id === d.id);
          return {
            ...state,
            diary: exists ? state.diary.map(entry => entry.id === d.id ? d : entry) : [d, ...state.diary]
          };
        });
        setQuick(null);
      }} />}
      <Timer />
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
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AchillesProvider>
        <AppContent />
      </AchillesProvider>
    </ErrorBoundary>
  );
}
export default App;
