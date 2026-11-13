import React, { useMemo, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { formatMonthDay, generateId, getTodayDateString, hashPin, verifyPin } from '../utils/helpers';
import { Check, Clock, Download, Film, Settings as SettingsIcon, Trash } from './Icons';

const CARD_CLASS = "rounded-3xl border border-line bg-surface p-6 sm:p-8";
const INPUT_CLASS = "w-full rounded-xl border border-line bg-ink/60 px-4 py-3 text-sm text-white placeholder:text-muted/60 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10";
const BUTTON_PRIMARY = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_SECONDARY = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-accent/50 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50";

const THEMES = [
  { id: "ember", name: "Ember", note: "Warm library at dusk", sw: ["#17110e", "#2f241b", "#f0873a"] },
  { id: "noir", name: "Noir", note: "The original black and orange", sw: ["#0a0a0a", "#141414", "#ff5500"] },
  { id: "midnight", name: "Midnight", note: "Deep blue and ice", sw: ["#080f1d", "#101a2c", "#5caaff"] },
  { id: "sage", name: "Sage", note: "Forest and clay", sw: ["#10150f", "#182016", "#d19a66"] },
  { id: "paper", name: "Paper", note: "Cream daylight", sw: ["#f7f1e6", "#fffbf3", "#b5572e"] }
];

function SectionHeading({ Icon, title, description, trailing }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {trailing}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

function AchFileSyncSection({ data }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [syncName, setSyncName] = useState("");

  const chooseFile = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (typeof window.showSaveFilePicker !== "function") {
        setMessage("This browser does not support File Sync. Download a backup instead.");
        return;
      }
      const handle = await window.showSaveFilePicker({
        suggestedName: "achilis-sync.json",
        types: [{ description: "Achilis data", accept: { "application/json": [".json"] } }]
      });
      setSyncName(handle.name);
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify({
        app: "achilles",
        version: 1,
        exportedAt: new Date().toISOString(),
        ...data
      }, null, 2));
      await writable.close();
      setMessage("Your current data was written to the selected file.");
    } catch (error) {
      if (error?.name !== "AbortError") setMessage("Could not write to that file. Check its permissions and try again.");
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = () => {
    setMessage("");
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `achilis-${getTodayDateString()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage("Could not create the backup. Please try again.");
    }
  };

  return (
    <section className={CARD_CLASS}>
      <SectionHeading
        Icon={Download}
        title="File Sync"
        description="Export a portable backup or write your data to a JSON file you choose."
      />
      {syncName && (
        <p className="mb-4 rounded-xl border border-line bg-ink/40 px-4 py-3 text-xs text-muted">
          Last written file: <span className="font-semibold text-white/80">{syncName}</span>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={downloadBackup} className={BUTTON_SECONDARY}>
          <Download className="h-4 w-4" /> Download Backup
        </button>
        <button type="button" onClick={chooseFile} disabled={busy} className={BUTTON_PRIMARY}>
          {busy ? "Opening…" : "Choose Sync File"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-xs text-muted">{message}</p>}
    </section>
  );
}

function getWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

export function Settings({ theme, setTheme, onShowWhatsNew }) {
  const { data, update, replaceAll } = useAchilles();
  const [pinCur, setPinCur] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [savedTmdbKey] = useState(() => {
    try {
      return { value: localStorage.getItem("achilles:tmdbKey") || "", error: false };
    } catch {
      return { value: "", error: true };
    }
  });
  const [tmdbKey, setTmdbKey] = useState(savedTmdbKey.value);
  const [tmdbMessage, setTmdbMessage] = useState(
    savedTmdbKey.error ? "Could not read the saved API key from this browser." : ""
  );
  const [tmdbTesting, setTmdbTesting] = useState(false);

  const pomo = useMemo(
    () => [...(Array.isArray(data.pomo) ? data.pomo : [])]
      .sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`)),
    [data.pomo]
  );
  const [today] = useState(() => getTodayDateString());
  const [weekStart] = useState(getWeekStart);
  const sumMinutes = entries => entries.reduce((total, entry) => total + (Number(entry.minutes) || 0), 0);
  const todayMinutes = sumMinutes(pomo.filter(entry => entry.date === today));
  const weekMinutes = sumMinutes(pomo.filter(entry => String(entry.date) >= weekStart));
  const totalMinutes = sumMinutes(pomo);

  const changePin = async event => {
    event.preventDefault();
    if (!data.pin?.hash) {
      setPinMessage("No PIN is set on this device yet.");
      return;
    }
    if (pinNew.length < 4) {
      setPinMessage("Choose at least 4 digits.");
      return;
    }

    setPinBusy(true);
    try {
      const currentHash = await hashPin(pinCur, data.pin.salt);
      if (!verifyPin(currentHash, data.pin.hash)) {
        setPinMessage("That current PIN is not right.");
        return;
      }
      const salt = generateId();
      const hash = await hashPin(pinNew, salt);
      update(state => ({ ...state, pin: { salt, hash } }));
      setPinMessage("PIN updated successfully.");
      setPinCur("");
      setPinNew("");
    } catch {
      setPinMessage("Could not update the PIN. Please try again.");
    } finally {
      setPinBusy(false);
    }
  };

  const resetAll = () => {
    if (!window.confirm("Reset all books, diary, notes, logs and focus sessions? This cannot be undone.")) return;
    if (!window.confirm("Really wipe everything? Export a backup first if you are not sure.")) return;
    replaceAll({ user: data.user, pin: data.pin });
    setTimeout(() => location.reload(), 900);
  };

  const saveTmdbKey = event => {
    event.preventDefault();
    const key = String(tmdbKey).trim();
    try {
      if (key) localStorage.setItem("achilles:tmdbKey", key);
      else localStorage.removeItem("achilles:tmdbKey");
      setTmdbMessage(key ? "API key saved on this device." : "API key cleared.");
    } catch {
      setTmdbMessage("Could not save the key on this device.");
    }
  };

  const testTmdbKey = async () => {
    const key = String(tmdbKey).trim();
    if (!key) {
      setTmdbMessage("Enter an API key before testing it.");
      return;
    }
    setTmdbTesting(true);
    setTmdbMessage("");
    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/multi?query=Dune&api_key=${encodeURIComponent(key)}`);
      if (response.status === 200) {
        const result = await response.json();
        setTmdbMessage(`Connection successful. Found ${(result.results || []).length} results for Dune.`);
      } else {
        setTmdbMessage(response.status === 401 ? "401 Unauthorized — the API key is invalid." : `Request failed with HTTP ${response.status}.`);
      }
    } catch {
      setTmdbMessage("Could not reach TMDB. Check your connection and try again.");
    } finally {
      setTmdbTesting(false);
    }
  };

  const stats = [
    { label: "Today", value: todayMinutes },
    { label: "Last 7 days", value: weekMinutes },
    { label: "All time", value: totalMinutes }
  ];

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Preferences</p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight">Settings</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Shape your space, manage your data, and review the time you’ve spent focusing.</p>
        </div>
        {onShowWhatsNew && (
          <button type="button" onClick={onShowWhatsNew} className={BUTTON_SECONDARY}>
            What’s new
          </button>
        )}
      </header>

      <div className="space-y-5">
        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={SettingsIcon}
            title="Appearance"
            description="Choose a color palette. Your preference is saved on this device."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {THEMES.map(option => {
              const active = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={active}
                  className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-accent bg-accent/[0.08]" : "border-line bg-ink/30 hover:border-accent/40 hover:bg-ink/50"}`}
                >
                  <span className="flex shrink-0 -space-x-2">
                    {option.sw.map((color, index) => (
                      <span key={index} className="h-8 w-8 rounded-full border border-line shadow-sm" style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-bold">{option.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">{option.note}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={Film}
            title="Entertainment API"
            description="Add a TMDB API key to search for movie and series details."
          />
          <form onSubmit={saveTmdbKey} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="sr-only" htmlFor="tmdb-api-key">TMDB API key</label>
            <input
              id="tmdb-api-key"
              className={INPUT_CLASS}
              type="password"
              autoComplete="off"
              value={tmdbKey}
              onChange={event => { setTmdbKey(event.target.value); setTmdbMessage(""); }}
              placeholder="Paste your TMDB API key"
            />
            <button type="submit" className={BUTTON_PRIMARY}>Save Key</button>
            <button type="button" onClick={testTmdbKey} disabled={tmdbTesting} className={BUTTON_SECONDARY}>
              {tmdbTesting ? "Testing…" : "Test Connection"}
            </button>
          </form>
          {tmdbMessage && <p role="status" className="mt-3 text-xs text-muted">{tmdbMessage}</p>}
        </section>

        <AchFileSyncSection data={data} />

        <section className="rounded-3xl border border-accent/30 bg-surface p-6 sm:p-8">
          <SectionHeading
            Icon={Trash}
            title="Danger Zone"
            description="Change the PIN that protects Personal, or reset your data. Resetting cannot be undone."
          />
          <form onSubmit={changePin} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Current PIN</span>
              <input
                className={INPUT_CLASS}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength="8"
                value={pinCur}
                onChange={event => { setPinCur(event.target.value.replace(/\D/g, "").slice(0, 8)); setPinMessage(""); }}
                placeholder="4–8 digits"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">New PIN</span>
              <input
                className={INPUT_CLASS}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength="8"
                value={pinNew}
                onChange={event => { setPinNew(event.target.value.replace(/\D/g, "").slice(0, 8)); setPinMessage(""); }}
                placeholder="At least 4 digits"
              />
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={pinBusy} className={`${BUTTON_PRIMARY} w-full`}>
                {pinBusy ? "Saving…" : "Change PIN"}
              </button>
            </div>
          </form>
          {pinMessage && <p role="status" className="mt-3 text-xs text-muted">{pinMessage}</p>}
          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted">Your name and PIN are retained. Books, diary entries, notes, logs and focus history are cleared.</p>
            <button type="button" onClick={resetAll} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10">
              <Trash className="h-4 w-4" /> Reset All Data
            </button>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={Clock}
            title="Focus History"
            description="A record of completed focus sessions from your Pomodoro timer."
            trailing={<span className="rounded-full border border-line bg-ink/40 px-3 py-1 text-[11px] font-semibold text-muted">{pomo.length} sessions</span>}
          />
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-2xl border border-line bg-ink/35 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</p>
                <p className="mt-2 font-display text-3xl font-black tabular-nums">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted">minutes focused</p>
              </div>
            ))}
          </div>
          {pomo.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-ink/20 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-white/80">No completed sessions yet</p>
              <p className="mt-1 text-xs text-muted">Finish a focus session and it will appear here.</p>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto rounded-2xl border border-line">
              {pomo.map((session, index) => (
                <div key={session.id || `${session.date}-${session.time}-${index}`} className={`flex items-center gap-3 bg-ink/20 px-4 py-3 text-sm ${index ? "border-t border-line" : ""}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span className="font-medium text-white/85">{formatMonthDay(session.date)}</span>
                  <span className="text-xs text-muted">{session.time || "—"}</span>
                  <span className="ml-auto font-display font-bold tabular-nums text-accent">{session.minutes} min</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
