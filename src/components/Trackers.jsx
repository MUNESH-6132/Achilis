import React from 'react';
import { useAchilles } from '../context/AchillesContext';
import { getTodayDateString, generateId } from '../utils/helpers';
import { Plus } from './Icons';

export function Trackers() {
  const { data, update } = useAchilles();
  const today = getTodayDateString();
  const trackers = Array.isArray(data.trackers) ? data.trackers : [];
  const logs = Array.isArray(data.logs) ? data.logs : [];

  const toggleTracker = (trackerId) => {
    update(state => {
      const existing = state.logs.find(l => l.trackerId === trackerId && l.date === today);
      if (existing) {
        return { ...state, logs: state.logs.filter(l => l.id !== existing.id) };
      }
      return { ...state, logs: [...state.logs, { id: generateId(), trackerId, date: today }] };
    });
  };

  const addTracker = () => {
    const name = prompt("Tracker name (e.g. Drink Water, Workout):");
    if (name) {
      update(state => ({ ...state, trackers: [...(state.trackers || []), { id: generateId(), name }] }));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black">Trackers</h1>
          <p className="mt-1 text-xs text-muted">Daily habits</p>
        </div>
        <button onClick={addTracker} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink"><Plus className="h-4 w-4"/> Add Tracker</button>
      </div>
      <div className="space-y-3">
        {trackers.map(t => {
          const isDone = logs.some(l => l.trackerId === t.id && l.date === today);
          return (
            <div key={t.id} onClick={() => toggleTracker(t.id)} className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${isDone ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface hover:border-white/20'}`}>
              <span className="font-semibold text-white">{t.name}</span>
              <div className={`grid h-6 w-6 place-items-center rounded-full border ${isDone ? 'bg-accent text-ink' : 'border-muted text-transparent'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
            </div>
          );
        })}
        {trackers.length === 0 && <p className="text-center py-10 text-muted">No trackers yet. Add one!</p>}
      </div>
    </div>
  );
}
