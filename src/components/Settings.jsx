import React, { useMemo, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { useAuth } from '../context/AuthContext';
import { formatMonthDay, getTodayDateString } from '../utils/helpers';
import { Check, Clock, Download, Settings as SettingsIcon, Trash, Upload } from './Icons';
import { restoreTrackersBackup } from '../utils/habitStore';

const CARD_CLASS = "mt-12 border-b border-white/5 pb-8 last:border-b-0";
const INPUT_CLASS = "w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none";
const BUTTON_PRIMARY = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_SECONDARY = "inline-flex min-h-11 items-center justify-center gap-2 px-2 py-2.5 text-sm font-semibold text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

const THEMES = [
  { id: "dark", name: "Dark Theme", note: "Near-black brutalist editorial with antique gold", sw: ["#08090C", "#181818", "#B49B70"] },
  { id: "light", name: "Light Theme", note: "Pure white editorial with antique gold", sw: ["#FFFFFF", "#E9E9E9", "#9B8158"] }
];

function SectionHeading({ Icon, title, description, trailing }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="mt-1 shrink-0 text-muted">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">{title}</h2>
          {trailing}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

function PreferenceToggle({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/5 py-4 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className="grid h-11 w-12 shrink-0 place-items-center"
      >
        <span className={`relative block h-6 w-11 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface2'}`}>
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
      </button>
    </div>
  );
}

function YourDataSection({ data, onExport, onImport, onImportFile, importInputRef, onRestoreTrackers }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [syncName, setSyncName] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");

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

  return (
    <section className={CARD_CLASS}>
      <SectionHeading
        Icon={Download}
        title="Your data"
        description="Export or import a backup, or write your data to a JSON file you choose."
      />
      {syncName && (
        <p className="mb-4 text-xs text-muted">
          Last written file: <span className="font-semibold text-white/80">{syncName}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onExport} className={BUTTON_SECONDARY}>
          <Download className="h-4 w-4" /> Export
        </button>
        <button type="button" onClick={onImport} className={BUTTON_SECONDARY}>
          <Upload className="h-4 w-4" /> Import
        </button>
        <button type="button" onClick={chooseFile} disabled={busy} className={BUTTON_SECONDARY}>
          Choose Sync File
          {busy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
        </button>
        <button type="button" onClick={async () => {
          setRestoreMessage("");
          try {
            await onRestoreTrackers();
            setRestoreMessage("The tracker backup was restored without replacing current data.");
          } catch (error) {
            setRestoreMessage(error?.message || "Could not restore the tracker backup.");
          }
        }} className={BUTTON_SECONDARY}>
          Restore tracker backup
        </button>
      </div>
      <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportFile} />
      {message && <p role="status" className="mt-3 text-xs text-muted">{message}</p>}
      {restoreMessage && <p role="status" className="mt-3 text-xs text-muted">{restoreMessage}</p>}
    </section>
  );
}

function getWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

export function Settings({
  theme,
  setTheme,
  reduceMotion,
  setReduceMotion,
  ambientMode,
  setAmbientMode,
  onShowWhatsNew,
  onExport,
  onImport,
  onImportFile,
  importInputRef,
}) {
  const { cloudSyncError, cloudSyncStatus, data, isDemo, lastSynced, notify, replaceAll, syncNow, update } = useAchilles();
  const { isConfigured, updatePassword, user } = useAuth();
  const ownerId = isDemo ? 'demo' : user?.id || 'local';
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [cloudActionMessage, setCloudActionMessage] = useState("");

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

  const changePassword = async event => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMessage("Choose a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("The passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      await updatePassword(newPassword);
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage(error?.message || "Could not update the password. Please try again.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncBusy(true);
    setCloudActionMessage('');
    try {
      const result = await syncNow();
      if (result.failedMediaCount) {
        setCloudActionMessage('Your data synced, but some media remains on this device because it could not be uploaded.');
        notify('Some media could not be synced; the local copies were retained.');
      } else {
        setCloudActionMessage('Your data is synced.');
        notify('Your data is synced to Supabase.');
      }
    } catch (error) {
      const message = error?.message || 'Cloud sync is unavailable. Your changes remain saved locally.';
      setCloudActionMessage(message);
      notify('Cloud sync failed. Your changes remain saved locally.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRestoreTrackers = async () => {
    const restored = await restoreTrackersBackup(ownerId, data);
    update(state => ({
      ...state,
      trackers: restored.trackers,
      logs: restored.logs,
    }));
    notify('Tracker backup restored additively.');
  };

  const resetAll = () => {
    if (!window.confirm("Reset all books, diary, notes, logs and focus sessions? This cannot be undone.")) return;
    if (!window.confirm("Really wipe everything? Export a backup first if you are not sure.")) return;
    replaceAll({ user: data.user, pin: data.pin });
  };

  const stats = [
    { label: "Today", value: todayMinutes },
    { label: "Last 7 days", value: weekMinutes },
    { label: "All time", value: totalMinutes }
  ];
  const cloudStatusLabel = {
    demo: 'Demo mode · local only',
    'signed-out': 'Signed out',
    unconfigured: 'Not configured',
    syncing: 'Syncing…',
    synced: 'Up to date',
    offline: 'Offline — local only',
  }[cloudSyncStatus] || 'Unknown';
  const lastSyncedLabel = lastSynced && !Number.isNaN(new Date(lastSynced).getTime())
    ? new Date(lastSynced).toLocaleString()
    : 'Not synced yet';

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Preferences</p>
          <h1 className="mt-1 font-display text-5xl font-bold tracking-tight sm:text-6xl">Settings</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Shape your space, manage your data, and review the time you’ve spent focusing.</p>
        </div>
        {onShowWhatsNew && (
          <button type="button" onClick={onShowWhatsNew} className={BUTTON_SECONDARY}>
            What’s new
          </button>
        )}
      </header>

      <div>
        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={SettingsIcon}
            title="Appearance"
            description="Choose a color palette. Your preference is saved on this device."
          />
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {THEMES.map(option => {
              const active = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={active}
                  className={`flex min-h-11 items-center gap-2 text-sm transition ${active ? "text-white" : "text-muted hover:text-white"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: option.sw[2] }} />
                  <span>{option.name}</span>
                  {active && <Check className="h-3.5 w-3.5 text-accent" />}
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <PreferenceToggle
              title="Reduce motion"
              description="Use simpler transitions and pause Ambient motion."
              checked={reduceMotion}
              onChange={setReduceMotion}
            />
            <PreferenceToggle
              title="Ambient mode"
              description="Let a few covers drift quietly behind Home. This setting is off by default."
              checked={ambientMode}
              onChange={setAmbientMode}
            />
          </div>
        </section>

        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={Upload}
            title="Cloud Sync"
            description="Your data stays available locally and syncs to your Supabase account when connected."
            trailing={<span className="text-[11px] font-semibold text-muted">{cloudStatusLabel}</span>}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="py-2 sm:pr-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Signed in as</p>
              <p className="mt-2 break-all text-sm font-semibold text-white/90">{isDemo ? 'Demo mode · local data only' : user?.email || (isConfigured ? 'Not signed in' : 'Supabase is not configured')}</p>
            </div>
            <div className="py-2 sm:pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Last synced</p>
              <p className="mt-2 text-sm font-semibold text-white/90">{lastSyncedLabel}</p>
            </div>
          </div>
          {(cloudSyncError || cloudActionMessage) && (
            <p role="status" className="mt-3 pt-3 text-xs text-muted">
              {cloudActionMessage || cloudSyncError}
            </p>
          )}
          {user && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={handleSyncNow} disabled={syncBusy} className={BUTTON_PRIMARY}>
                Sync Now
                {syncBusy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
              </button>
            </div>
          )}
        </section>

        <YourDataSection data={data} onExport={onExport} onImport={onImport} onImportFile={onImportFile} importInputRef={importInputRef} onRestoreTrackers={handleRestoreTrackers} />

        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={Trash}
            title="Danger Zone"
            description="Change your account password, or reset your local and synced data. Resetting cannot be undone."
          />
          <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">New password</span>
              <input
                className={INPUT_CLASS}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={event => { setNewPassword(event.target.value); setPasswordMessage(""); }}
                placeholder="At least 8 characters"
                disabled={!user}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Confirm password</span>
              <input
                className={INPUT_CLASS}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={event => { setConfirmPassword(event.target.value); setPasswordMessage(""); }}
                placeholder="Repeat new password"
                disabled={!user}
              />
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={passwordBusy || !user} className={`${BUTTON_SECONDARY} w-full`}>
                Change Password
                {passwordBusy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
              </button>
            </div>
          </form>
          {passwordMessage && <p role="status" className="mt-3 text-xs text-muted">{passwordMessage}</p>}
          <div className="mt-6 flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted">Your account remains active. Books, diary entries, notes, logs and focus history are cleared on this device and queued for cloud sync.</p>
            <button type="button" onClick={resetAll} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-2 py-2.5 text-sm font-semibold text-muted transition hover:text-white">
              <Trash className="h-4 w-4" /> Reset All Data
            </button>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <SectionHeading
            Icon={Clock}
            title="Focus History"
            description="A record of completed focus sessions from your Pomodoro timer."
            trailing={<span className="text-[11px] font-semibold text-muted">{pomo.length} sessions</span>}
          />
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {stats.map(stat => (
              <div key={stat.label} className="py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</p>
                <p className="mt-2 font-display text-3xl font-black tabular-nums">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted">minutes focused</p>
              </div>
            ))}
          </div>
          {pomo.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-white/80">No completed sessions yet</p>
              <p className="mt-1 text-xs text-muted">Finish a focus session and it will appear here.</p>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto divide-y divide-line">
              {pomo.map((session, index) => (
                <div key={session.id || `${session.date}-${session.time}-${index}`} className="flex items-center gap-3 py-3 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span className="font-medium text-white/85">{formatMonthDay(session.date)}</span>
                  <span className="text-xs text-muted">{session.time || "—"}</span>
                  <span className="ml-auto font-display font-bold tabular-nums text-white">{session.minutes} min</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
