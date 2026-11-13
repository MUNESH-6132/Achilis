import React, { useMemo, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { DiaryEditor } from './DiaryEditor';
import { NoteEditor } from './NoteEditor';
import { Trackers } from './Trackers';
import { RichText } from './RichText';
import { Plus } from './Icons';
import { formatMonthDay, formatMonthYear, formatWeekday, getToday, parseTags } from '../utils/helpers';

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" }
];

function DiaryEntryCard({ entry, onOpen }) {
  const mood = MOODS.find(item => item.value === Number(entry.mood)) || MOODS[2];
  const tags = parseTags(entry.tags);
  const body = entry.body ?? entry.content ?? "";

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 transition duration-300 hover:border-accent/40 hover:bg-surface2/60">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border border-line bg-surface2">
          <span className="font-display text-base font-black leading-none">{String(entry.date || "").slice(8, 10)}</span>
          <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted">{formatWeekday(entry.date)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block w-full text-left"
            aria-label={`Open entry: ${entry.title || "Untitled"}`}
          >
            <h3 className="truncate font-display text-lg font-bold leading-tight transition hover:text-accent">
              {entry.title || "Untitled"}
            </h3>
            <p className="mt-0.5 text-xs text-muted">{entry.time || "No time"} · {mood.emoji} {mood.label}</p>
          </button>
        </div>
        <span className="text-xl leading-none opacity-70">{mood.emoji}</span>
      </div>
      {entry.photo ? <img src={entry.photo} alt="Entry snapshot" loading="lazy" decoding="async" className="mt-3 max-h-56 w-full rounded-2xl border border-line object-cover" /> : null}
      {entry.video ? <video controls src={entry.video} className="mt-3 w-full rounded-2xl border border-line" /> : null}
      {entry.audio ? <audio controls src={entry.audio} className="mt-3 w-full" /> : null}
      {body ? <RichText text={body} className="mt-3 text-sm leading-relaxed text-muted" /> : null}
      {tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10px] text-white/70">{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function DiarySpace({ entries, allEntries, totalCount, today, onNewEntry, onOpenEntry }) {
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Diary</h1>
          <p className="mt-1 text-xs text-muted">{totalCount} entr{totalCount === 1 ? "y" : "ies"} · {formatMonthDay(today)}</p>
        </div>
        <button type="button" className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-accent/90" onClick={onNewEntry}>
          <Plus className="h-4 w-4" /> New entry
        </button>
      </div>

      <section className="relative mb-8 overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.13] via-surface to-surface p-5">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <span className="text-accent" aria-hidden="true">✦</span>
          <h2 className="font-display text-sm font-bold">On this day</h2>
          <span className="text-xs text-muted">· {formatMonthDay(today)}</span>
        </div>
        {memories.length ? (
          <div className="relative mt-3 space-y-1">
            {memories.map(entry => {
              const years = Number(today.slice(0, 4)) - Number(entry.date.slice(0, 4));
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onOpenEntry(entry)}
                  className="flex w-full items-baseline gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
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
          <p className="relative mt-2 text-sm text-muted">No memories from this date yet — your future self will thank you for writing today.</p>
        )}
      </section>

      {entries.length === 0 ? (
        <div className="rise-in flex flex-col items-center justify-center rounded-[28px] border border-dashed border-line bg-surface/40 px-6 py-20 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Plus className="h-6 w-6" />
          </span>
          <h2 className="font-display text-xl font-bold">{totalCount ? "Nothing matches that" : "The page is blank"}</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">{totalCount ? "Try another search, or clear it in the top bar." : "A few honest lines are enough. Start with how today felt."}</p>
          {!totalCount && (
            <button type="button" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-accent/90" onClick={onNewEntry}>
              <Plus className="h-4 w-4" /> Write the first entry
            </button>
          )}
        </div>
      ) : null}

      {entries.length > 0 && (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.key}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{group.label}</h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] text-muted">{group.items.length}</span>
              </div>
              <div className="space-y-3">
                {group.items.map(entry => (
                  <DiaryEntryCard key={entry.id} entry={entry} onOpen={() => onOpenEntry(entry)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Personal({ query = "" }) {
  const { data, update } = useAchilles();
  const [tab, setTab] = useState("diary");
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const today = getToday();
  const search = query.trim().toLowerCase();

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
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-line bg-surface p-1">
          {[
            { id: "diary", label: "Diary" },
            { id: "logs", label: "Logs" },
            { id: "notes", label: "Notes" }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${tab === item.id ? "bg-white text-ink" : "text-muted hover:text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab === "notes" && (
          <button
            onClick={() => setEditingNote({})}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink transition hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" /> Add Note
          </button>
        )}
      </div>

      {tab === "diary" && (
        <DiarySpace
          entries={filteredDiary}
          allEntries={data.diary}
          totalCount={data.diary.length}
          today={today}
          onNewEntry={() => setEditingEntry({})}
          onOpenEntry={openEntry}
        />
      )}
      {tab === "logs" && <Trackers />}
      {tab === "notes" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted">No notes yet.</div>
          ) : (
            filteredNotes.map(note => (
              <div key={note.id} className="flex aspect-square cursor-pointer flex-col rounded-2xl bg-yellow-100 p-5 shadow-md transition hover:shadow-lg" onClick={() => setEditingNote(note)}>
                <h3 className="mb-2 font-display font-bold text-gray-800">{note.title || "Untitled"}</h3>
                <RichText text={note.content} className="text-sm text-gray-700 line-clamp-6" />
              </div>
            ))
          )}
        </div>
      )}

      {editingEntry && (
        <DiaryEditor
          entry={editingEntry.id ? editingEntry : null}
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
