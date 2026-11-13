import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { generateId, getCurrentTime, getToday } from '../utils/helpers';
import { Clock, Pause, Play, Trash, X } from './Icons';

const TIMER_KEY = "achilles:timer:v1";
const SOUND_KEY = "achilles:sound:v1";
const BUTTON_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition duration-200 hover:bg-[#ff6a1f] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON_SECONDARY = "inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-white/80 transition duration-200 hover:border-accent/60 hover:bg-white/[0.04] hover:text-white active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40";
const SAFE_BOTTOM = { bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" };
let audioContext = null;

function formatTime(seconds) {
  const value = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function getInitialTimer(workMinutes) {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return { mode: "focus", remaining: workMinutes * 60, running: false, endsAt: 0, message: "" };
    const saved = JSON.parse(raw);
    if (!saved) return { mode: "focus", remaining: workMinutes * 60, running: false, endsAt: 0, message: "" };

    const mode = saved.mode === "break" ? "break" : "focus";
    if (saved.endsAt) {
      const remaining = Math.max(0, Math.round((saved.endsAt - Date.now()) / 1000));
      if (remaining > 0) return { mode, remaining, running: true, endsAt: saved.endsAt, message: "" };
    }

    const remaining = Number(saved.remaining);
    return {
      mode,
      remaining: Number.isFinite(remaining) && remaining > 0 ? remaining : workMinutes * 60,
      running: false,
      endsAt: 0,
      message: "",
    };
  } catch {
    return {
      mode: "focus",
      remaining: workMinutes * 60,
      running: false,
      endsAt: 0,
      message: "The saved timer could not be restored. A fresh timer is ready."
    };
  }
}

function ProgressRing({ progress, size = 132, stroke = 8, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--c-line))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--c-accent))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-[stroke-dashoffset] duration-300 ease-linear" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

async function playTone() {
  try {
    const context = getAudioContext();
    if (!context) return false;
    if (context.state === "suspended") await context.resume();
    const start = context.currentTime;
    [[880, 0], [1174.66, 0.18], [1567.98, 0.36]].forEach(([frequency, delay]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(context.destination);
      const time = start + delay;
      gain.gain.setValueAtTime(1e-4, time);
      gain.gain.exponentialRampToValueAtTime(0.18, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(1e-4, time + 0.7);
      oscillator.start(time);
      oscillator.stop(time + 0.75);
    });
    return true;
  } catch {
    return false;
  }
}

async function primeAudio() {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return true;
}

async function playCompletionSound() {
  try {
    const customSound = localStorage.getItem(SOUND_KEY);
    if (customSound) {
      const audio = new Audio(customSound);
      try {
        await audio.play();
        return true;
      } catch {
        return playTone();
      }
    }
  } catch {
    return playTone();
  }
  return playTone();
}

export function Timer() {
  const { data, update } = useAchilles();
  const workMinutes = Number(data.timer?.work) || 25;
  const breakMinutes = Number(data.timer?.break) || 5;
  const [initialTimer] = useState(() => getInitialTimer(workMinutes));
  const [mode, setMode] = useState(initialTimer.mode);
  const [remaining, setRemaining] = useState(initialTimer.remaining);
  const [running, setRunning] = useState(initialTimer.running);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState(initialTimer.message);
  const [soundName, setSoundName] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) ? "Custom sound" : "Default chime"; } catch { return "Default chime"; }
  });
  const [notificationPermission, setNotificationPermission] = useState(
    () => typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const endsAtRef = useRef(initialTimer.endsAt);
  const completedRef = useRef(false);
  const duration = (mode === "focus" ? workMinutes : breakMinutes) * 60;
  const progress = duration > 0 ? 1 - remaining / duration : 0;

  useEffect(() => {
    try {
      if (running && endsAtRef.current) {
        localStorage.setItem(TIMER_KEY, JSON.stringify({ mode, endsAt: endsAtRef.current }));
      } else if (remaining > 0) {
        localStorage.setItem(TIMER_KEY, JSON.stringify({ mode, remaining }));
      }
    } catch {
      setMessage("The timer could not be saved on this device.");
    }
  }, [running, mode, remaining]);

  const completeSession = useCallback(() => {
    const completedMode = mode;
    if (completedMode === "focus") {
      update(state => ({
        ...state,
        pomo: [{
          id: generateId(),
          date: getToday(),
          time: getCurrentTime(),
          minutes: Number(state.timer.work) || workMinutes
        }, ...(state.pomo || [])].slice(0, 500)
      }));
    }
    void playCompletionSound().then(played => {
      if (!played) setMessage("Timer finished, but audio could not be played.");
    });
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Achilis · timer", {
          body: completedMode === "focus"
            ? `Focus session complete. ${breakMinutes} minute break starts now.`
            : "Break finished. Ready for another round?",
          tag: "achilles-timer"
        });
      }
    } catch {
      setMessage("Timer finished, but the notification could not be shown.");
    }
    const nextMode = completedMode === "focus" ? "break" : "focus";
    setMode(nextMode);
    setRemaining((nextMode === "focus" ? workMinutes : breakMinutes) * 60);
    setMessage(completedMode === "focus" ? "Session logged to Logs. Take a breath." : "Break over — your next block is ready.");
  }, [breakMinutes, mode, update, workMinutes]);

  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
      if (left <= 0) {
        if (!completedRef.current) {
          completedRef.current = true;
          setRemaining(0);
          setRunning(false);
          completeSession();
        }
        return;
      }
      setRemaining(left);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [running, completeSession]);

  const start = () => {
    if (running || remaining <= 0) return;
    setMessage("");
    completedRef.current = false;
    void primeAudio().then(initialized => {
      if (!initialized) setMessage("Audio is unavailable in this browser.");
    }).catch(() => setMessage("Audio could not be started in this browser."));
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then(setNotificationPermission).catch(() => {
        setMessage("Notification permission could not be requested.");
      });
    }
    endsAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const pause = () => {
    if (!running) return;
    setRemaining(Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000)));
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    completedRef.current = false;
    setRemaining(duration);
    setMessage("");
    try { localStorage.removeItem(TIMER_KEY); } catch { setMessage("The saved timer could not be cleared."); }
  };

  const selectMode = nextMode => {
    setRunning(false);
    completedRef.current = false;
    setMode(nextMode);
    setRemaining((nextMode === "focus" ? workMinutes : breakMinutes) * 60);
    setMessage("");
  };

  const setDuration = (field, value) => {
    const minutes = Math.max(1, Math.min(180, Math.round(Number(value) || 1)));
    update(state => ({ ...state, timer: { ...state.timer, [field]: minutes } }));
    if (!running && ((field === "work" && mode === "focus") || (field === "break" && mode === "break"))) {
      setRemaining(minutes * 60);
    }
  };

  const uploadSound = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setMessage("Please pick an audio file under 3 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(SOUND_KEY, String(reader.result));
        setSoundName(file.name);
        setMessage("Custom sound saved for this browser.");
      } catch {
        setMessage("Could not store the file — browser storage may be full.");
      }
    };
    reader.onerror = () => setMessage("Could not read that audio file.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removeSound = () => {
    try {
      localStorage.removeItem(SOUND_KEY);
      setSoundName("Default chime");
      setMessage("Back to the default chime.");
    } catch {
      setMessage("Could not remove the custom sound.");
    }
  };

  const enableNotifications = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotificationPermission).catch(() => {
      setMessage("Notification permission could not be requested.");
    });
  };

  const modeButtons = (
    <div className="flex rounded-full border border-line bg-ink/60 p-1">
      {[
        { id: "focus", label: `Focus ${workMinutes}m` },
        { id: "break", label: `Break ${breakMinutes}m` }
      ].map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => selectMode(option.id)}
          className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${mode === option.id ? "bg-white text-ink" : "text-muted hover:text-white"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const controls = (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={start} disabled={running || remaining <= 0} className={BUTTON_PRIMARY}>
        <Play className="h-3.5 w-3.5" /> Start
      </button>
      <button type="button" onClick={pause} disabled={!running} className={BUTTON_SECONDARY}>
        <Pause className="h-3.5 w-3.5" /> Pause
      </button>
      <button type="button" onClick={reset} className={BUTTON_SECONDARY}>
        <Trash className="h-3.5 w-3.5" /> Reset
      </button>
    </div>
  );

  const settings = showSettings && (
    <div className="mt-4 space-y-3 rounded-2xl border border-line bg-ink/50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">Focus (min)</span>
          <input type="number" min="1" max="180" className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-white focus:border-accent/70 focus:outline-none" value={workMinutes} disabled={running} onChange={event => setDuration("work", event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">Break (min)</span>
          <input type="number" min="1" max="180" className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-white focus:border-accent/70 focus:outline-none" value={breakMinutes} disabled={running} onChange={event => setDuration("break", event.target.value)} />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate text-muted">{soundName}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => {
            void playCompletionSound().then(played => {
              setMessage(played ? "Timer sound is ready." : "Audio could not be played in this browser.");
            });
          }} className="rounded-full border border-line px-2 py-1 font-semibold text-white/70 transition hover:border-accent/50 hover:text-white">Test</button>
          <button type="button" onClick={removeSound} className="grid h-6 w-6 place-items-center rounded-full text-muted transition hover:text-accent" aria-label="Remove custom sound">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-line px-2.5 py-2 text-[11px] text-muted transition hover:border-accent/40 hover:text-white">
        <span>Upload custom MP3</span>
        <input type="file" accept="audio/*" onChange={uploadSound} className="w-28 text-[10px] text-muted file:mr-2 file:rounded-full file:border-0 file:bg-surface2 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-white/80" />
      </label>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>Notifications: {notificationPermission}</span>
        {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
          <button type="button" onClick={enableNotifications} className="rounded-full border border-line px-2 py-1 font-semibold text-white/70 transition hover:border-accent/50 hover:text-white">Enable</button>
        )}
      </div>
    </div>
  );

  const timerRing = size => (
    <ProgressRing progress={progress} size={size} stroke={size > 200 ? 12 : 8}>
      <span className={`font-display font-black tabular-nums leading-none ${size > 200 ? "text-[clamp(3rem,14vw,6rem)]" : "text-3xl"}`}>{formatTime(remaining)}</span>
      <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted">{running ? "running" : mode}</span>
    </ProgressRing>
  );

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        style={SAFE_BOTTOM}
        className="fixed right-5 z-40 flex items-center gap-2 rounded-full border border-line bg-surface/95 px-4 py-2.5 shadow-[0_20px_40px_-18px_rgba(0,0,0,0.9)] transition hover:border-accent/60 hover:text-accent"
        aria-label="Open pomodoro timer"
      >
        <Clock className="h-4 w-4 text-accent" />
        <span className="font-display text-sm font-bold tabular-nums">{running ? formatTime(remaining) : "Timer"}</span>
        {running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
      </button>
    );
  }

  if (expanded) {
    return (
      <div className="fade-in fixed inset-0 z-40 flex flex-col bg-ink/95">
        <header className="flex items-center justify-between gap-3 px-6 py-5">
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted"><Clock className="h-4 w-4 text-accent" /> Pomodoro</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setExpanded(false)} className="rounded-full bg-surface2 px-3.5 py-2 text-xs text-white/70 hover:bg-[#2a2a2a] hover:text-white">↓ Collapse</button>
            <button type="button" onClick={() => { setExpanded(false); setMinimized(true); }} className="rounded-full bg-surface2 px-3.5 py-2 text-xs text-white/70 hover:bg-[#2a2a2a] hover:text-white" aria-label="Minimize timer"><X className="mr-1 inline h-4 w-4" /> Minimize</button>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-20">
          <div className="w-full max-w-xs">{modeButtons}</div>
          {timerRing(300)}
          {controls}
          {message && <p className="text-xs text-accent">{message}</p>}
          <div className="w-full max-w-sm">
            <button type="button" onClick={() => setShowSettings(value => !value)} className="mx-auto flex items-center gap-1.5 text-xs text-muted transition hover:text-white">
              <span aria-hidden="true">⚙</span> Settings
            </button>
            {settings}
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside style={SAFE_BOTTOM} className="pop-in fixed right-4 z-40 w-[19.5rem] max-w-[calc(100vw-2rem)] rounded-[28px] border border-line bg-surface/95 p-5 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.95)]" aria-label="Pomodoro timer">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted"><Clock className="h-3.5 w-3.5 text-accent" /> Pomodoro</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowSettings(value => !value)} className={`grid h-7 w-7 place-items-center rounded-full transition ${showSettings ? "bg-accent/15 text-accent" : "text-muted hover:text-white"}`} aria-label="Timer settings">⚙</button>
          <button type="button" onClick={() => setExpanded(true)} className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:text-white" aria-label="Expand timer">⤢</button>
          <button type="button" onClick={() => { setExpanded(false); setMinimized(true); }} className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:text-white" aria-label="Minimize timer"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="mb-4">{modeButtons}</div>
      <div className="flex flex-col items-center gap-3">
        {timerRing(132)}
        {controls}
      </div>
      {message && <p className="mt-3 text-center text-[11px] text-accent">{message}</p>}
      {settings}
    </aside>
  );
}
