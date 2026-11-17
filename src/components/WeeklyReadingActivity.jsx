import React, { useMemo } from 'react';
import { BookOpen, Check } from './Icons';

/**
 * Weekly Reading Activity Strip
 * Displays Monday through Sunday actual recorded reading activity.
 * Never fabricates sessions or counts app-opening as activity.
 */
export function WeeklyReadingActivity({
  books = [],
  habits = [],
  habitLogs = [],
  diary = [],
}) {
  const weekData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const distToMonday = (dayOfWeek + 6) % 7; // Monday = 0, Sunday = 6

    const monday = new Date(now);
    monday.setDate(now.getDate() - distToMonday);
    monday.setHours(0, 0, 0, 0);

    const readingHabitIds = new Set(
      habits
        .filter(h => {
          const name = String(h.name || '').toLowerCase();
          return name.includes('read') || name.includes('book') || name.includes('page');
        })
        .map(h => h.id)
    );

    const days = [];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    let activeDaysCount = 0;
    let totalReadingRecords = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const isToday = dateStr === now.toISOString().slice(0, 10);
      const isPastOrToday = d <= now;

      // 1. Habit logs matching reading
      const habitCount = habitLogs.filter(log => {
        const logDate = log.date || (log.created_at ? log.created_at.slice(0, 10) : '');
        const id = log.habit_id || log.trackerId;
        const status = log.status;
        return logDate === dateStr && readingHabitIds.has(id) && status !== 'skipped' && status !== 'rest';
      }).length;

      // 2. Books updated or finished on this date
      const bookCount = books.filter(b => {
        const finishedDate = String(b.finishedAt || b.readAt || b.completedAt || '').slice(0, 10);
        const updatedDate = b.updatedAt ? new Date(b.updatedAt).toISOString().slice(0, 10) : '';
        return (finishedDate === dateStr || (updatedDate === dateStr && Number(b.currentPage) > 0));
      }).length;

      // 3. Diary entries specifically tagged with reading
      const diaryCount = diary.filter(entry => {
        const entryDate = entry.date || (entry.createdAt ? new Date(entry.createdAt).toISOString().slice(0, 10) : '');
        const tags = String(entry.tags || '').toLowerCase();
        return entryDate === dateStr && (tags.includes('read') || tags.includes('book'));
      }).length;

      const totalCountForDay = habitCount + bookCount + diaryCount;
      const hasActivity = totalCountForDay > 0;

      if (hasActivity) {
        activeDaysCount += 1;
        totalReadingRecords += totalCountForDay;
      }

      days.push({
        label: dayLabels[i],
        shortLabel: dayLabels[i][0],
        dateStr,
        dayNum: d.getDate(),
        isToday,
        isPastOrToday,
        hasActivity,
        count: totalCountForDay,
      });
    }

    return {
      days,
      activeDaysCount,
      totalReadingRecords,
    };
  }, [books, habits, habitLogs, diary]);

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-semibold">
            Weekly Reading Activity · Monday – Sunday
          </span>
        </div>
        <span className="font-mono text-xs text-muted">
          {weekData.activeDaysCount > 0
            ? `${weekData.activeDaysCount} of 7 days recorded`
            : 'No reading recorded yet this week'}
        </span>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {weekData.days.map((day) => (
          <div
            key={day.dateStr}
            className={`flex flex-col items-center justify-between py-2.5 px-1 rounded-xl transition-all ${
              day.hasActivity
                ? 'bg-accent/15 border border-accent/40 text-accent font-semibold shadow-sm'
                : day.isToday
                  ? 'border border-text/20 bg-surface2 text-text'
                  : 'bg-ink/30 border border-line/40 text-muted'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider mb-1">
              {day.label}
            </span>
            <div className="flex h-6 w-6 items-center justify-center my-1">
              {day.hasActivity ? (
                <div className="grid h-5 w-5 place-items-center rounded-full bg-accent text-ink">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              ) : (
                <span className={`text-xs ${day.isToday ? 'font-bold text-text' : 'text-muted/60'}`}>
                  {day.dayNum}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono opacity-80">
              {day.hasActivity ? `${day.count} act` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
