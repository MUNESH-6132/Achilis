import React, { useEffect, useState, useMemo } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { useAuth } from '../context/AuthContext';
import { getHabitRecords } from '../utils/habitStore';
import { habitTrackerV2 } from '../utils/features';
import { useReduceMotion } from '../ui/motion';
import { BookOpen, Film, Edit, Check } from './Icons';
import { BookDetails } from './BookDetails';
import { OlympusHero } from './OlympusHero';
import { WeeklyActivityStrip } from './WeeklyActivityStrip';
import { TheOdysseyTimeline } from './TheOdysseyTimeline';
import { TheOracle } from './TheOracle';

function getTimestamp(value) {
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function firstLine(value) {
  return String(value || '').split(/\r?\n/).map(line => line.trim()).find(Boolean);
}

export function Home({ onGo, onAddBook, ambientMode = false }) {
  const { data, update } = useAchilles();
  const { isDemo, user } = useAuth();
  const reduceMotion = useReduceMotion();
  const [selectedBook, setSelectedBook] = useState(null);
  const [habitRecords, setHabitRecords] = useState(null);

  const ownerId = isDemo ? 'demo' : user?.id || 'local';

  // Load habit records if habit tracker V2 is enabled
  useEffect(() => {
    if (!habitTrackerV2) return;
    let active = true;
    getHabitRecords(ownerId)
      .then(records => {
        if (active) setHabitRecords(records);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ownerId]);

  // Data slices
  const books = useMemo(() => {
    return (Array.isArray(data.books) ? data.books : []).filter(
      item => (item.category || 'book') === 'book'
    );
  }, [data.books]);

  const screens = useMemo(() => {
    return (Array.isArray(data.books) ? data.books : []).filter(
      item => item.category === 'movie' || item.category === 'series'
    );
  }, [data.books]);

  const diary = Array.isArray(data.diary) ? data.diary : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const legacyTrackers = Array.isArray(data.trackers) ? data.trackers : [];
  const legacyLogs = Array.isArray(data.logs) ? data.logs : [];

  const habits = habitRecords?.habits?.length ? habitRecords.habits : legacyTrackers;
  const habitLogs = habitRecords?.logs?.length ? habitRecords.logs : legacyLogs;

  // Genuine reading statistics for Olympus Hero
  const { readingStreak, booksFinishedThisYear } = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    const finishedThisYear = books.filter(b =>
      b.status === 'Read' &&
      String(b.finishedAt || b.readAt || b.completedAt || b.updatedAt || '').slice(0, 4) === currentYear
    ).length;

    // Genuine reading activity dates
    const activityDates = new Set();
    (Array.isArray(data.pomo) ? data.pomo : []).forEach(p => p.date && activityDates.add(p.date));
    (Array.isArray(habitLogs) ? habitLogs : []).forEach(l => {
      const d = l.date || (l.created_at ? l.created_at.slice(0, 10) : '');
      if (d && l.status !== 'skipped' && l.status !== 'rest') activityDates.add(d);
    });
    books.forEach(b => {
      if (b.status === 'Currently Reading' && b.updatedAt && Number(b.currentPage) > 0) {
        activityDates.add(new Date(b.updatedAt).toISOString().slice(0, 10));
      }
      const finishDate = String(b.finishedAt || b.readAt || b.completedAt || '').slice(0, 10);
      if (finishDate) activityDates.add(finishDate);
    });

    // Consecutive daily streak
    let streak = 0;
    const cursor = new Date();
    const todayStr = cursor.toISOString().slice(0, 10);
    if (!activityDates.has(todayStr)) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (activityDates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { readingStreak: streak, booksFinishedThisYear: finishedThisYear };
  }, [books, habitLogs, data.pomo]);

  // Compile The Odyssey Timeline activities from real user data
  const odysseyActivities = useMemo(() => {
    const list = [];

    // 1. Books
    books.forEach(b => {
      const createdTime = getTimestamp(b.createdAt || b.date || b.updatedAt);
      if (createdTime) {
        list.push({
          id: b.id,
          eventType: 'book_started',
          title: b.title || 'Untitled book',
          detail: b.author ? `by ${b.author}` : 'Added to Library',
          badge: 'Book Started',
          category: 'book',
          cover: b.cover,
          timestamp: createdTime,
          Icon: BookOpen,
        });
      }

      if (b.status === 'Read') {
        const finishTime = getTimestamp(b.finishedAt || b.readAt || b.completedAt || b.updatedAt);
        if (finishTime && finishTime !== createdTime) {
          list.push({
            id: b.id,
            eventType: 'book_finished',
            title: b.title || 'Untitled book',
            detail: b.author ? `by ${b.author}` : 'Completed reading',
            badge: 'Completed',
            category: 'book',
            cover: b.cover,
            timestamp: finishTime,
            Icon: Check,
          });
        }
      }

      if (b.status === 'Currently Reading' && Number(b.currentPage) > 0 && b.updatedAt) {
        const updateTime = getTimestamp(b.updatedAt);
        if (updateTime !== createdTime) {
          list.push({
            id: b.id,
            eventType: 'reading_progress',
            title: b.title || 'Untitled book',
            detail: `Reached page ${b.currentPage}`,
            badge: `Page ${b.currentPage}`,
            category: 'book',
            cover: b.cover,
            timestamp: updateTime,
            Icon: BookOpen,
          });
        }
      }
    });

    // 2. Screens
    screens.forEach(s => {
      const createdTime = getTimestamp(s.createdAt || s.date);
      if (createdTime) {
        list.push({
          id: s.id,
          eventType: 'screen_added',
          title: s.title || 'Untitled title',
          detail: s.creator || (s.category === 'series' ? 'Series' : 'Film'),
          badge: s.category === 'series' ? 'Series Added' : 'Film Added',
          category: s.category,
          cover: s.cover,
          timestamp: createdTime,
          Icon: Film,
        });
      }

      if (s.status === 'Watched') {
        const finishTime = getTimestamp(s.finishedAt || s.updatedAt);
        if (finishTime && finishTime !== createdTime) {
          list.push({
            id: s.id,
            eventType: 'screen_watched',
            title: s.title || 'Untitled title',
            detail: 'Watched in Cinema',
            badge: 'Watched',
            category: s.category,
            cover: s.cover,
            timestamp: finishTime,
            Icon: Check,
          });
        }
      }
    });

    // 3. Diary reflections
    diary.forEach(entry => {
      const time = getTimestamp(entry.updated || entry.createdAt || `${entry.date || ''}T${entry.time || '00:00'}`);
      if (time && (entry.title || entry.body || entry.content)) {
        list.push({
          id: entry.id,
          eventType: 'diary_entry',
          title: String(entry.title || '').trim() || firstLine(entry.body || entry.content) || 'Diary reflection',
          detail: 'Personal reflection',
          badge: 'Reflected',
          category: 'diary',
          cover: entry.photo || '',
          timestamp: time,
          Icon: Edit,
        });
      }
    });

    // Deduplicate by unique id + date (YYYY-MM-DD)
    const seen = new Set();
    const unique = [];
    for (const item of list) {
      const ts = Number(item.timestamp) || 0;
      const d = ts ? new Date(ts) : new Date();
      const dateKey = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const key = `${item.id}-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }, [books, screens, diary]);

  // Handle clicking timeline item
  const handleOpenTimelineItem = (act) => {
    if (act.category === 'book') {
      const targetBook = books.find(b => b.id === act.id);
      if (targetBook) {
        setSelectedBook(targetBook);
        return;
      }
      onGo('collection', 'books');
    } else if (act.category === 'movie' || act.category === 'series') {
      onGo('collection', 'screen');
    } else if (act.category === 'diary') {
      onGo('journal', 'diary');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* 1. Hero: Where I Left Off */}
      <OlympusHero
        books={books}
        screens={screens}
        streak={readingStreak}
        booksFinishedThisYear={booksFinishedThisYear}
        onOpenBook={book => setSelectedBook(book)}
        onAddBook={onAddBook}
        onGoLibrary={() => onGo('collection', 'books')}
      />

      {/* 2. Weekly Activity Strip */}
      <div className="mb-14">
        <WeeklyActivityStrip
          books={books}
          habits={habits}
          habitLogs={habitLogs}
          pomo={data.pomo}
          diary={diary}
        />
      </div>

      {/* 3. The Odyssey — Organic Activity Timeline (Clio) */}
      <TheOdysseyTimeline
        activities={odysseyActivities}
        onOpenItem={handleOpenTimelineItem}
      />

      {/* 4. The Oracle — Daily Reflections */}
      <TheOracle />

      {/* 5. Editorial Universe Pulse (Summary Statistics) */}
      <section className="mt-16 pt-8 border-t border-line">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onGo('collection', 'books')}
            className="rounded-2xl border border-line bg-surface/60 p-5 text-left hover:border-accent/40 hover:bg-surface transition-all group"
          >
            <span className="block text-[10px] font-mono uppercase tracking-widest text-muted group-hover:text-accent transition-colors">
              Athena · Library
            </span>
            <span className="font-display text-3xl font-bold text-text mt-2 block">
              {books.length}
            </span>
            <span className="text-xs text-muted block mt-0.5">Volumes catalogued</span>
          </button>

          <button
            type="button"
            onClick={() => onGo('collection', 'screen')}
            className="rounded-2xl border border-line bg-surface/60 p-5 text-left hover:border-accent/40 hover:bg-surface transition-all group"
          >
            <span className="block text-[10px] font-mono uppercase tracking-widest text-muted group-hover:text-accent transition-colors">
              Apollo · Cinema
            </span>
            <span className="font-display text-3xl font-bold text-text mt-2 block">
              {screens.length}
            </span>
            <span className="text-xs text-muted block mt-0.5">Films & series</span>
          </button>

          <button
            type="button"
            onClick={() => onGo('journal', 'diary')}
            className="rounded-2xl border border-line bg-surface/60 p-5 text-left hover:border-accent/40 hover:bg-surface transition-all group"
          >
            <span className="block text-[10px] font-mono uppercase tracking-widest text-muted group-hover:text-accent transition-colors">
              Mnemosyne · Reflections
            </span>
            <span className="font-display text-3xl font-bold text-text mt-2 block">
              {diary.length + notes.length}
            </span>
            <span className="text-xs text-muted block mt-0.5">Diary & notes</span>
          </button>

          <button
            type="button"
            onClick={() => onGo('journal', 'habits')}
            className="rounded-2xl border border-line bg-surface/60 p-5 text-left hover:border-accent/40 hover:bg-surface transition-all group"
          >
            <span className="block text-[10px] font-mono uppercase tracking-widest text-muted group-hover:text-accent transition-colors">
              Daily Rituals
            </span>
            <span className="font-display text-3xl font-bold text-text mt-2 block">
              {habits.length}
            </span>
            <span className="text-xs text-muted block mt-0.5">Habits active</span>
          </button>
        </div>
      </section>

      {/* Book Details Modal */}
      {selectedBook && (
        <BookDetails
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onEdit={() => {
            setSelectedBook(null);
            onGo('collection', 'books');
          }}
        />
      )}
    </div>
  );
}
