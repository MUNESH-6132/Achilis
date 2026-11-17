import React, { useEffect, useMemo, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { useAuth } from '../context/AuthContext';
import { DiaryEditor } from './DiaryEditor';
import { NoteEditor } from './NoteEditor';
import { Trackers } from './Trackers';
import { TrackersV2 } from './TrackersV2';
import { BookOpen, Edit, Plus, Search } from './Icons';
import { EmptyState } from './EmptyState';
import { formatMonthDay, formatMonthYear, getToday } from '../utils/helpers';
import { habitTrackerV2 } from '../utils/features';

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" }
];

const TABS = [
  { id: "diary", label: "Diary" },
  { id: "logs", label: "Daily Rituals" },
  { id: "notes", label: "Notes" }
];

function DiarySpace({ entries, allEntries, totalCount, today, onNewEntry, onEditEntry }) {
  const todayKey = today.slice(5);
  const memories = allEntries
    .filter(entry => entry.date && entry.date.slice(5) === todayKey && entry.date.slice(0, 4) < today.slice(0, 4))
    .sort((a, b) => b.date.localeCompare(a.date));
  const groups = useMemo(() => {
    const grouped = new Map();
    for (const entry of entries) {
      const key = String(entry.date || today).slice(0, 7);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    }
    return [...grouped.entries()].map(([key, items]) => ({
      key,
      label: formatMonthYear(key),
      items
    }));
  }, [entries, today]);

  return (
    <div>
      <section className="relative mb-8 border-b border-line pb-5">
        <div className="flex items-center gap-2">
          <span className="text-accent" aria-hidden="true">✦</span>
          <h2 className="font-display text-sm font-bold tracking-tight">On this day</h2>
          <span className="text-xs text-muted">· {formatMonthDay(today)}</span>
        </div>
        {memories.length ? (
          <div className="mt-3 space-y-1">
            {memories.map(entry => {
              const years = Number(today.slice(0, 4)) - Number(entry.date.slice(0, 4));
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onEditEntry(entry)}
                  className="flex w-full items-baseline gap-3 py-2 text-left transition hover:text-white"
                >
                  <span className="w-14 shrink-0 font-display text-sm font-black text-accent">{entry.date.slice(0, 4)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{entry.title || "Untitled"}</span>
                    <span className="block truncate text-xs text-muted">
                      {entry.body || entry.content || "No body text"} · {years} year{years === 1 ? "" : "s"} ago
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No memories from this date yet — your future self will thank you for writing today.</p>
        )}
      </section>

      {entries.length === 0 ? (
        <EmptyState
          Icon={Edit}
          title={totalCount ? "No diary entries found" : "Your diary is empty"}
          description={totalCount ? "Try a different search, or write a new entry to capture what’s on your mind." : "A few honest lines are enough. Start with how today felt."}
          actionLabel={totalCount ? "Write an entry" : "Write your first entry"}
          onAction={onNewEntry}
        />
      ) : null}

      {groups.map(group => (
        <section key={group.key} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{group.label}</h2>
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10px] text-muted">{group.items.length}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.items.map(entry => {
              const mood = MOODS.find(item => item.value === Number(entry.mood)) || MOODS[2];
              const snippet = entry.body ?? entry.content ?? "";
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onEditEntry(entry)}
                  aria-label={`Edit diary entry: ${entry.title || formatMonthDay(entry.date)}`}
                  className="group flex flex-col rounded-lg border border-line bg-surface/40 p-5 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-accent/30"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                      {formatMonthDay(entry.date)} · {entry.time || "No time"}
                    </span>
                    <span aria-label={mood.label} title={mood.label} className="text-base leading-none">{mood.emoji}</span>
                  </span>
                  <span className="mt-2 line-clamp-2 font-display text-2xl font-bold leading-tight text-text">{entry.title || "Untitled entry"}</span>
                  {snippet ? <span className="mt-2 line-clamp-2 text-sm text-muted">{snippet}</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Personal({ query = "", initialTab = "diary", entryPrompt = null, onOpenReference }) {
  const { data, update } = useAchilles();
  const { isDemo, user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [localQuery, setLocalQuery] = useState("");
  const today = getToday();
  const searchQuery = localQuery.trim() ? localQuery : query;
  const search = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (entryPrompt?.prompt) setEditingEntry({ content: entryPrompt.prompt });
  }, [entryPrompt]);

  const filteredDiary = useMemo(() => [...data.diary
    .filter(entry => !search || [entry.title, entry.body ?? entry.content, entry.tags].join(" ").toLowerCase().includes(search))
    .sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`))], [data.diary, search]);
  const filteredNotes = useMemo(() => data.notes.filter(note =>
    !search || [note.title, note.content].join(" ").toLowerCase().includes(search)
  ), [data.notes, search]);

  const handleSaveDiary = entry => {
    const body = entry.content ?? entry.body ?? "";
    const savedEntry = { ...entry, body, content: body };
    update(state => {
      const exists = state.diary.some(item => item.id === savedEntry.id);
      return {
        ...state,
        diary: exists
          ? state.diary.map(item => item.id === savedEntry.id ? savedEntry : item)
          : [savedEntry, ...state.diary]
      };
    });
  };

  const handleSaveNote = note => {
    update(state => {
      const exists = state.notes.some(item => item.id === note.id);
      return {
        ...state,
        notes: exists ? state.notes.map(item => item.id === note.id ? note : item) : [note, ...state.notes]
      };
    });
  };

  const openEntry = entry => setEditingEntry({ ...entry, content: entry.content ?? entry.body ?? "" });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-accent">
            Mnemosyne · Reflections
          </p>
          <h1 className="font-display text-6xl font-bold tracking-tight text-text">Journal</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={localQuery}
              onChange={event => setLocalQuery(event.target.value)}
              placeholder="Search your journal…"
              aria-label="Search journal"
              className="w-full border-0 border-b border-line bg-transparent py-2 pl-7 pr-2 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent"
            />
          </div>
          {tab === "diary" && (
            <button
              type="button"
              onClick={() => setEditingEntry({})}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" /> New Entry
            </button>
          )}
          {tab === "notes" && (
            <button
              type="button"
              onClick={() => setEditingNote({})}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" /> Add Note
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line">
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest transition ${tab === item.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "diary" && (
        <DiarySpace
          entries={filteredDiary}
          allEntries={data.diary}
          totalCount={data.diary.length}
          today={today}
          onNewEntry={() => setEditingEntry({})}
          onEditEntry={openEntry}
        />
      )}
      {tab === "logs" && (habitTrackerV2
        ? <TrackersV2
            ownerId={isDemo ? 'demo' : user?.id || 'local'}
            legacyTrackers={Array.isArray(data.trackers) ? data.trackers : []}
            legacyLogs={Array.isArray(data.logs) ? data.logs : []}
          />
        : <Trackers />)}
      {tab === "notes" && (
        filteredNotes.length === 0 ? (
          <EmptyState
            Icon={BookOpen}
            title={data.notes.length ? "No notes match that" : "Your notes are empty"}
            description={data.notes.length ? "Try a different search, or add a new note to your collection." : "Keep ideas, reminders, and little bits of inspiration close at hand."}
            actionLabel={data.notes.length ? "Add a note" : "Write your first note"}
            onAction={() => setEditingNote({})}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredNotes.map(note => {
              const noteDate = String(note.updated || note.createdAt || '').slice(0, 10);
              return (
                <button
                  key={note.id}
                  type="button"
                  aria-label={`Edit note: ${note.title || "Untitled"}`}
                  onClick={() => setEditingNote(note)}
                  className="group flex flex-col rounded-lg border border-line bg-surface/40 p-5 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-accent/30"
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                    {noteDate ? formatMonthDay(noteDate) : "Note"}
                  </span>
                  <span className="mt-2 line-clamp-2 font-display text-2xl font-bold leading-tight text-text">{note.title || "Untitled"}</span>
                  <span className="mt-2 line-clamp-2 text-sm text-muted">{note.content || "No content yet."}</span>
                </button>
              );
            })}
          </div>
        )
      )}

      {editingEntry && (
        <DiaryEditor
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveDiary}
        />
      )}
      {editingNote && (
        <NoteEditor
          note={editingNote.id ? editingNote : null}
          onClose={() => setEditingNote(null)}
          onSave={handleSaveNote}
        />
      )}
    </div>
  );
}