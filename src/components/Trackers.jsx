import React from 'react';
import { useAchilles } from '../context/AchillesContext';
import { getTodayDateString, generateId } from '../utils/helpers';
import { Plus } from './Icons';
import { EmptyState } from './EmptyState';

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
          <h1 className="font-display text-4xl font-bold tracking-tight">Today</h1>
          <p className="mt-1 text-xs text-muted">Daily habits</p>
        </div>
        {trackers.length > 0 && <button type="button" onClick={addTracker} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"><Plus className="h-4 w-4"/> Add habit</button>}
      </div>
      <div className="divide-y divide-white/5">
        {trackers.map(t => {
          const isDone = logs.some(l => l.trackerId === t.id && l.date === today);
          return (
            <button type="button" key={t.id} onClick={() => toggleTracker(t.id)} aria-pressed={isDone} className="flex min-h-11 w-full items-center justify-between py-4 text-left transition hover:text-white">
              <span className="font-semibold text-white">{t.name}</span>
              <span className="flex items-center gap-2 text-sm text-muted">
                {isDone ? "Done" : "Mark done"}
                {isDone && <span aria-hidden="true" className="text-white">✓</span>}
              </span>
            </button>
          );
        })}
        {trackers.length === 0 && (
          <EmptyState
            title="No habits to track"
            description="Add a habit to start recording your daily progress."
            actionLabel="Add a tracker"
            onAction={addTracker}
          />
        )}
      </div>
    </div>
  );
}
