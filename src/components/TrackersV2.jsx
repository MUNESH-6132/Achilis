import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Check, Plus } from './Icons';
import { Trackers } from './Trackers';
import { getTodayDateString, generateId } from '../utils/helpers';
import {
  createHabit,
  deleteHabitLogRecord,
  getHabitRecords,
  migrateLegacyTrackers,
  saveHabitLogRecord,
  saveHabitRecord,
} from '../utils/habitStore';

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function recentDates(count, finalDate) {
  const [year, month, day] = finalDate.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    return dateKey(new Date(year, month - 1, day + offset));
  });
}

function localDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function statusLabel(log, status) {
  if (log?.status === 'rest') return 'rest day';
  if (log?.status === 'skipped') return 'not done';
  if (status === 'done') return 'done';
  if (status === 'partial') return 'partial';
  return 'not done';
}

function isScheduledOn(habit, date) {
  if (!Array.isArray(habit.schedule)) return true;
  return habit.schedule.includes(localDate(date).getDay());
}

function countStep(habit) {
  const configuredStep = Number(habit.step ?? habit.step_size);
  if (Number.isInteger(configuredStep) && configuredStep > 0) return configuredStep;
  return String(habit.unit || '').toLowerCase().includes('page') ? 5 : 1;
}

function statusFor(log, habit) {
  if (!log) return 'empty';
  if (log.status === 'rest' || log.status === 'skipped') return 'dash';
  if (habit.type === 'count') {
    if (Number(log.value) >= Number(habit.target)) return 'done';
    if (Number(log.value) >= Number(habit.tiny_target || 1)) return 'partial';
    return 'empty';
  }
  return log.status === 'done' ? 'done' : log.status === 'partial' ? 'partial' : 'empty';
}

function StatusMark({ status, label }) {
  const classes = {
    done: 'h-2.5 w-2.5 rounded-full bg-accent',
    partial: 'h-2.5 w-2.5 rounded-full',
    dash: 'h-px w-2.5',
    empty: 'h-2 w-2 rounded-full bg-surface2',
  };
  return (
    <span
      className={`inline-block shrink-0 ${classes[status]}`}
      style={status === 'partial'
        ? { background: 'linear-gradient(to right, rgb(var(--c-accent)) 50%, rgb(var(--c-surface2)) 50%)' }
        : status === 'dash' ? { backgroundColor: 'rgb(var(--c-muted))' } : undefined}
      title={label}
    />
  );
}

function CountControl({ habit, value, onAdjust, onSet }) {
  const [draft, setDraft] = useState(String(value));
  const target = Math.max(1, Number(habit.target) || 1);
  const unit = habit.unit || 'times';
  const step = countStep(habit);
  const progress = Math.min(100, (value / target) * 100);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    if (/^\d+$/.test(draft) && Number(draft) !== value) onSet(Number(draft));
    else setDraft(String(value));
  };

  const stepFromDraft = direction => {
    const base = /^\d+$/.test(draft) ? Number(draft) : value;
    onAdjust(direction * step, base);
  };

  return (
    <div className="w-full sm:max-w-xs">
      <div className="flex items-center gap-1">
        <button type="button" data-count-step="true" onClick={() => stepFromDraft(-1)} aria-label={`Decrease ${habit.name} by ${step}`} className="grid h-11 w-11 shrink-0 place-items-center text-xl text-muted hover:text-white">−</button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 text-sm tabular-nums">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={draft}
            aria-label={`Current ${habit.name}`}
            onChange={event => setDraft(event.target.value)}
            onBlur={event => {
              if (!event.relatedTarget?.dataset.countStep) commitDraft();
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="h-11 w-16 border-b border-line bg-transparent text-center text-base tabular-nums focus:border-accent focus:outline-none"
          />
          <span className="whitespace-nowrap text-muted">/ {target} {unit}</span>
        </div>
        <button type="button" data-count-step="true" onClick={() => stepFromDraft(1)} aria-label={`Increase ${habit.name} by ${step}`} className="grid h-11 w-11 shrink-0 place-items-center text-xl text-muted hover:text-white">+</button>
      </div>
      <div
        role="progressbar"
        aria-label={`${habit.name} progress`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
        aria-valuetext={`${value} of ${target} ${unit}`}
        className="h-1 overflow-hidden bg-surface2"
      >
        <div className="h-full" style={{ width: `${progress}%`, backgroundColor: 'rgb(var(--c-text))' }} />
      </div>
    </div>
  );
}

function CheckControl({ habit, done, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} done`}
      aria-pressed={done}
      className="min-h-11 shrink-0 px-2 text-sm font-medium text-muted transition-colors hover:text-white"
    >
      {done ? <><Check className="mr-1 inline h-4 w-4 text-white" />Done</> : 'Mark done'}
    </button>
  );
}

function HabitMoreMenu({ habitId, date, hasLog, onRest, onUndo }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuId = `habit-menu-${habitId}`;

  return (
    <div
      className="relative shrink-0"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="More"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(current => !current)}
        className="grid h-11 w-11 place-items-center text-xl leading-none text-muted hover:text-white"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-full z-20 min-w-36 bg-ink p-1 shadow-xl">
          <button type="button" onClick={() => { setOpen(false); onRest(); }} className="block min-h-11 w-full px-3 text-left text-sm text-muted hover:text-white">Rest day</button>
          <button type="button" disabled={!hasLog} onClick={() => { setOpen(false); onUndo(); }} className="block min-h-11 w-full px-3 text-left text-sm text-muted hover:text-white disabled:cursor-not-allowed disabled:opacity-50">{date === getTodayDateString() ? 'Undo today' : 'Undo this day'}</button>
        </div>
      )}
    </div>
  );
}

function TrackerForm({ onClose, onSave, initialValues = {} }) {
  const [name, setName] = useState(initialValues.name || '');
  const [type, setType] = useState(initialValues.type || 'check');
  const [target, setTarget] = useState(String(initialValues.target ?? '1'));
  const [unit, setUnit] = useState(initialValues.unit || 'times');
  const [schedule, setSchedule] = useState('daily');
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a habit name.');
      return;
    }
    if (type === 'count' && (!Number.isInteger(Number(target)) || Number(target) < 1)) {
      setError('Target must be at least 1.');
      return;
    }
    await onSave({
      name,
      type,
      target,
      unit: type === 'count' ? unit : '',
      schedule: schedule === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
    });
  };

  return (
    <Modal onClose={onClose} width="max-w-md" title="Add a habit">
      <form onSubmit={event => void submit(event)} className="space-y-5 p-6">
        <div>
          <label htmlFor="habit-name" className="mb-1.5 block text-sm font-semibold">Name</label>
          <input id="habit-name" autoFocus maxLength={60} value={name} onChange={event => setName(event.target.value)} className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm focus:border-white focus:outline-none" placeholder="e.g. Read each day" />
        </div>
        <div>
          <label htmlFor="habit-type" className="mb-1.5 block text-sm font-semibold">Type</label>
          <select id="habit-type" value={type} onChange={event => setType(event.target.value)} className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm focus:border-white focus:outline-none">
            <option value="check">Check</option>
            <option value="count">Count</option>
          </select>
        </div>
        {type === 'count' && (
          <div>
            <label htmlFor="habit-target" className="mb-1.5 block text-sm font-semibold">Daily target</label>
            <input id="habit-target" type="number" min="1" step="1" value={target} onChange={event => setTarget(event.target.value)} className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm focus:border-white focus:outline-none" />
          </div>
        )}
        {type === 'count' && (
          <div>
            <label htmlFor="habit-unit" className="mb-1.5 block text-sm font-semibold">Unit</label>
            <input id="habit-unit" maxLength={24} value={unit} onChange={event => setUnit(event.target.value)} className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm focus:border-white focus:outline-none" placeholder="e.g. pages" />
          </div>
        )}
        <div>
          <label htmlFor="habit-schedule" className="mb-1.5 block text-sm font-semibold">Schedule</label>
          <select id="habit-schedule" value={schedule} onChange={event => setSchedule(event.target.value)} className="w-full border-0 border-b border-white/20 bg-transparent px-0 py-3 text-sm focus:border-white focus:outline-none">
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
          </select>
        </div>
        {error && <p role="alert" className="text-sm text-white">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm font-semibold text-muted hover:text-white">Cancel</button>
          <button type="submit" className="min-h-11 rounded-full bg-white px-5 text-sm font-bold text-black">Add habit</button>
        </div>
      </form>
    </Modal>
  );
}

export function TrackersV2({ ownerId, legacyTrackers, legacyLogs }) {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadResult, setLoadResult] = useState({ ownerId: null, error: null });
  const loading = loadResult.ownerId !== ownerId;
  const migrationError = loadResult.ownerId === ownerId ? loadResult.error : null;
  const [readError, setReadError] = useState('');
  const [showForm, setShowForm] = useState(null);
  const [activeHabitId, setActiveHabitId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [undo, setUndo] = useState(null);
  const undoRef = useRef(null);
  const logsRef = useRef(logs);
  const today = getTodayDateString();
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const month = useMemo(() => recentDates(30, today), [today]);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    let active = true;
    migrateLegacyTrackers(ownerId, legacyTrackers, legacyLogs)
      .then(() => getHabitRecords(ownerId))
      .then(records => {
        if (!active) return;
        setHabits(records.habits);
        setLogs(records.logs);
        setLoadResult({ ownerId, error: null });
        setReadError('');
      })
      .catch(error => {
        if (!active) return;
        console.error('Habit tracker migration failed; showing the legacy tracker.', error);
        setLoadResult({ ownerId, error });
      })
    return () => {
      active = false;
    };
  }, [ownerId, legacyTrackers, legacyLogs]);

  useEffect(() => () => {
    if (undoRef.current) clearTimeout(undoRef.current.timer);
  }, []);

  const activeHabits = useMemo(() => {
    const seenIds = new Set();
    return habits.filter(habit => {
      const id = String(habit.id);
      if (habit.archived_at || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
  }, [habits]);
  const findLog = (habitId, date) => logsRef.current.find(log => log.habit_id === habitId && log.date === date);
  const todayHabits = activeHabits.filter(habit => {
    const log = logs.find(item => item.habit_id === habit.id && item.date === today);
    return isScheduledOn(habit, today) && log?.status !== 'rest';
  });
  const todayDone = todayHabits.filter(habit => {
    const log = logs.find(item => item.habit_id === habit.id && item.date === today);
    return statusFor(log, habit) === 'done';
  }).length;
  const setError = error => {
    console.error('Could not save habit tracker data.', error);
    setReadError(error?.message || 'Could not save this habit change. Your existing data is unchanged.');
  };

  const queueUndo = (message, action) => {
    if (undoRef.current) clearTimeout(undoRef.current.timer);
    const item = { id: generateId(), message, action, timer: null };
    item.timer = setTimeout(() => {
      if (undoRef.current?.id === item.id) {
        undoRef.current = null;
        setUndo(null);
      }
    }, 8000);
    undoRef.current = item;
    setUndo(item);
  };

  const writeLog = async (habit, date, next) => {
    const previous = findLog(habit.id, date);
    if (!next && !previous) return;
    const updated = {
      ...(previous || {}),
      ...(next || { value: 0, status: 'skipped' }),
      id: previous?.id || generateId(),
      ownerId,
      habit_id: habit.id,
      date,
    };
    const remaining = logsRef.current.filter(log => !(log.habit_id === habit.id && log.date === date));
    logsRef.current = [...remaining, updated];
    setLogs(logsRef.current);
    try {
      await saveHabitLogRecord(updated);
    } catch (error) {
      if (findLog(habit.id, date) === updated) {
        const restored = logsRef.current.filter(log => !(log.habit_id === habit.id && log.date === date));
        logsRef.current = previous ? [...restored, previous] : restored;
        setLogs(logsRef.current);
      }
      throw error;
    }
    queueUndo('Habit updated', async () => {
      if (previous) await saveHabitLogRecord(previous);
      else if (updated) await deleteHabitLogRecord(ownerId, updated.id);
      const restored = logsRef.current.filter(log => !(log.habit_id === habit.id && log.date === date));
      logsRef.current = previous ? [...restored, previous] : restored;
      setLogs(logsRef.current);
    });
  };

  const setCount = async (habit, date, nextValue) => {
    const value = Math.max(0, Math.floor(Number(nextValue) || 0));
    const target = Math.max(1, Number(habit.target) || 1);
    const tinyTarget = Math.max(1, Number(habit.tiny_target) || 1);
    const status = value >= target ? 'done' : value >= tinyTarget ? 'partial' : 'in_progress';
    try {
      await writeLog(habit, date, value ? { value, status } : { value: 0, status: 'skipped' });
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  const adjustCount = async (habit, date, amount, currentValue) => {
    const current = findLog(habit.id, date);
    const value = Math.max(0, (currentValue ?? (Number(current?.value) || 0)) + amount);
    if (!current && value === 0) return;
    await setCount(habit, date, value);
  };

  const markRest = async (habit, date) => {
    try {
      await writeLog(habit, date, { value: 0, status: 'rest' });
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  const undoDay = async (habit, date) => {
    if (!findLog(habit.id, date)) return;
    try {
      await writeLog(habit, date, { value: 0, status: 'skipped' });
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  const markDone = async (habit, date) => {
    const current = findLog(habit.id, date);
    try {
      await writeLog(habit, date, current?.status === 'done'
        ? { value: 0, status: 'skipped' }
        : { value: 1, status: 'done' });
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  const addHabit = async values => {
    const habit = createHabit({ ...values, ownerId });
    try {
      await saveHabitRecord(habit);
      setHabits(current => [...current, habit]);
      setShowForm(null);
      queueUndo('Habit added', async () => {
        const archived = { ...habit, archived_at: new Date().toISOString() };
        await saveHabitRecord(archived);
        setHabits(current => current.map(item => item.id === habit.id ? archived : item));
      });
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  const archiveHabit = async habit => {
    const archived = { ...habit, archived_at: new Date().toISOString() };
    try {
      await saveHabitRecord(archived);
      setHabits(current => current.map(item => item.id === habit.id ? archived : item));
      setActiveHabitId(null);
      queueUndo('Habit archived', async () => {
        await saveHabitRecord(habit);
        setHabits(current => current.map(item => item.id === habit.id ? habit : item));
      });
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  const undoLatest = async () => {
    const item = undoRef.current;
    if (!item) return;
    clearTimeout(item.timer);
    undoRef.current = null;
    setUndo(null);
    try {
      await item.action();
      setReadError('');
    } catch (error) {
      setError(error);
    }
  };

  if (migrationError) {
    return (
      <div>
        <p role="alert" className="mb-4 text-sm text-muted">The new tracker could not load. Your existing trackers are untouched; showing the original tracker instead.</p>
        <Trackers />
      </div>
    );
  }
  if (loading) return <p role="status" className="py-8 text-sm text-muted">Loading habits…</p>;

  const consistencyFor = habit => {
    const completed = month.filter(date => {
      const log = logs.find(item => item.habit_id === habit.id && item.date === date);
      const status = statusFor(log, habit);
      return status === 'done' || status === 'partial';
    }).length;
    return `${completed} of last 30 days`;
  };

  const selectedHabit = activeHabits.find(habit => habit.id === activeHabitId);
  const selectedLog = selectedHabit && logs.find(log => log.habit_id === selectedHabit.id && log.date === selectedDate);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Today: {todayDone} of {todayHabits.length} done</h1>
          <p className="mt-1 text-sm text-muted">Small steps, counted over time</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm({})}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
        >
          <Plus className="h-4 w-4" /> Add habit
        </button>
      </div>

      {readError && <p role="alert" className="mb-4 text-sm text-white">{readError}</p>}

      {selectedHabit && (
        <section className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">{selectedHabit.name}</h2>
              <p className="mt-1 text-xs text-muted">{consistencyFor(selectedHabit)} · last 30 days</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setActiveHabitId(null)} className="min-h-11 px-2 text-sm text-muted hover:text-white">All habits</button>
              <HabitMoreMenu
                habitId={selectedHabit.id}
                date={selectedDate}
                hasLog={Boolean(selectedLog)}
                onRest={() => void markRest(selectedHabit, selectedDate)}
                onUndo={() => void undoDay(selectedHabit, selectedDate)}
              />
              <button type="button" onClick={() => void archiveHabit(selectedHabit)} className="min-h-11 px-2 text-sm text-muted hover:text-white">Archive</button>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <div role="group" aria-label="Last 30 days" className="grid min-w-[440px] grid-cols-10">
            {month.map(date => {
              const log = logs.find(item => item.habit_id === selectedHabit.id && item.date === date);
              const status = statusFor(log, selectedHabit);
              const selected = selectedDate === date;
              const label = `${localDate(date).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}, ${statusLabel(log, status)}`;
              const isToday = date === today;
              return <button key={date} type="button" onClick={() => setSelectedDate(date)} aria-pressed={selected} aria-label={label} className={`grid h-11 w-11 place-items-center text-[10px] ${selected ? 'text-white' : 'text-muted'}`}>
                <span className="grid h-5 w-5 place-items-center rounded-full" style={isToday ? { boxShadow: '0 0 0 1px rgb(var(--c-text) / .7)' } : undefined}>
                  <StatusMark status={status} label={label} />
                </span>
              </button>;
            })}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <p className="mr-auto text-sm font-semibold">{selectedDate === today ? 'Today' : localDate(selectedDate).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            {selectedHabit.type === 'count' ? (
              <CountControl
                habit={selectedHabit}
                value={Number(selectedLog?.value) || 0}
                onAdjust={(amount, base) => void adjustCount(selectedHabit, selectedDate, amount, base)}
                onSet={value => void setCount(selectedHabit, selectedDate, value)}
              />
            ) : (
              <CheckControl habit={selectedHabit} done={selectedLog?.status === 'done'} onToggle={() => void markDone(selectedHabit, selectedDate)} />
            )}
          </div>
        </section>
      )}

      {!selectedHabit && (
        activeHabits.length ? (
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">30-day rhythm</p>
              {activeHabits.map(habit => {
                const log = logs.find(item => item.habit_id === habit.id && item.date === today);
                const status = statusFor(log, habit);
                const value = Number(log?.value) || 0;
                return (
                  <article key={habit.id} className="border-b border-white/5 py-4 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => { setActiveHabitId(habit.id); setSelectedDate(today); }} className="min-h-11 min-w-0 flex-1 truncate text-left text-base font-semibold text-white hover:text-white">
                        {habit.name}
                      </button>
                      <HabitMoreMenu
                        habitId={habit.id}
                        date={today}
                        hasLog={Boolean(log)}
                        onRest={() => void markRest(habit, today)}
                        onUndo={() => void undoDay(habit, today)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      {habit.type === 'count' ? (
                        <CountControl
                          habit={habit}
                          value={value}
                          onAdjust={(amount, base) => void adjustCount(habit, today, amount, base)}
                          onSet={nextValue => void setCount(habit, today, nextValue)}
                        />
                      ) : (
                        <CheckControl habit={habit} done={status === 'done'} onToggle={() => void markDone(habit, today)} />
                      )}
                      <span className="py-2 text-xs text-muted">{consistencyFor(habit)}</span>
                    </div>
                    <div className="mt-2 overflow-x-auto">
                      <div role="group" aria-label={`${habit.name}, last 30 days`} className="ml-auto grid min-w-[440px] grid-cols-10">
                      {month.map(date => {
                        const dayLog = logs.find(item => item.habit_id === habit.id && item.date === date);
                        const dayStatus = statusFor(dayLog, habit);
                        const label = `${localDate(date).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}, ${statusLabel(dayLog, dayStatus)}`;
                        const isToday = date === today;
                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={date > today}
                            onClick={() => { setActiveHabitId(habit.id); setSelectedDate(date); }}
                            aria-label={label}
                            title={label}
                            className="grid h-11 w-11 place-items-center disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span
                              className="grid h-5 w-5 place-items-center rounded-full"
                              style={isToday ? { boxShadow: '0 0 0 1px rgb(var(--c-text) / .7)' } : undefined}
                            >
                              <StatusMark status={dayStatus} label={label} />
                            </span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        ) : (
          <p className="py-6 text-sm text-muted">No habits yet. Add one or choose a starter below.</p>
        )
      )}

      {!selectedHabit && activeHabits.length < 4 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-muted">Try:</span>
          <button type="button" onClick={() => setShowForm({ name: 'Write 1 line', type: 'check', target: 1, unit: '' })} className="min-h-11 text-left text-muted hover:text-white">Write 1 line</button>
          <button type="button" onClick={() => setShowForm({ name: '10-minute walk', type: 'count', target: 10, unit: 'minutes' })} className="min-h-11 text-left text-muted hover:text-white">10-minute walk</button>
          <button type="button" onClick={() => setShowForm({ name: 'Read 10 pages', type: 'count', target: 10, unit: 'pages' })} className="min-h-11 text-left text-muted hover:text-white">Read 10 pages</button>
        </div>
      )}

      {undo && (
        <div role="status" aria-live="polite" className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[110] flex w-[min(90vw,32rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-lg bg-surface px-4 py-3 text-sm md:bottom-6">
          <span>{undo.message}</span>
          <button type="button" onClick={() => void undoLatest()} className="min-h-11 px-3 font-semibold text-white">Undo</button>
        </div>
      )}
      {showForm && <TrackerForm initialValues={showForm} onClose={() => setShowForm(null)} onSave={addHabit} />}
    </div>
  );
}
