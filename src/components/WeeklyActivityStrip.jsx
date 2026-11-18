import React, { useMemo } from 'react';
import { BookOpen, Check } from './Icons';

/**
 * WeeklyActivityStrip Component
 * Displays Monday through Sunday actual recorded reading & focus sessions.
 * Never fabricates sessions or counts app-opening as activity.
 * Designed to remain a clean, single-row horizontal strip on mobile.
 */
export function WeeklyActivityStrip({
  books = [],
  habits = [],
  habitLogs = [],
  pomo = [],
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
    let totalMinutes = 0;
    let totalSessions = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const isToday = dateStr === now.toISOString().slice(0, 10);

      // 1. Focus / Pomodoro sessions on this date
      const pomoForDay = (Array.isArray(pomo) ? pomo : []).filter(p => p.date === dateStr);
      const pomoMinutes = pomoForDay.reduce((sum, p) => sum + (Number(p.minutes) || 0), 0);
      const pomoSessionsCount = pomoForDay.length;

      // 2. Reading habit logs on this date
      const habitCount = habitLogs.filter(log => {
        const logDate = log.date || (log.created_at ? log.created_at.slice(0, 10) : '');
        const id = log.habit_id || log.trackerId;
        const status = log.status;
        return logDate === dateStr && readingHabitIds.has(id) && status !== 'skipped' && status !== 'rest';
      }).length;

      // 3. Books progress or finished on this date
      const bookCount = books.filter(b => {
        const finishedDate = String(b.finishedAt || b.readAt || b.completedAt || '').slice(0, 10);
        const updatedDate = b.updatedAt ? new Date(b.updatedAt).toISOString().slice(0, 10) : '';
        return (finishedDate === dateStr || (updatedDate === dateStr && b.status === 'Currently Reading' && Number(b.currentPage) > 0));
      }).length;

      // 4. Diary reflections tagged reading
      const diaryCount = (Array.isArray(diary) ? diary : []).filter(entry => {
        const entryDate = entry.date || (entry.createdAt ? new Date(entry.createdAt).toISOString().slice(0, 10) : '');
        const tags = String(entry.tags || '').toLowerCase();
        return entryDate === dateStr && (tags.includes('read') || tags.includes('book'));
      }).length;

      const dayActivityCount = pomoSessionsCount + habitCount + bookCount + diaryCount;
      const hasActivity = dayActivityCount > 0;

      if (hasActivity) {
        activeDaysCount += 1;
        totalMinutes += pomoMinutes;
        totalSessions += dayActivityCount;
      }

      days.push({
        label: dayLabels[i],
        dayNum: d.getDate(),
        dateStr,
        isToday,
        hasActivity,
        minutes: pomoMinutes,
        count: dayActivityCount,
      });
    }

    return {
      days,
      activeDaysCount,
      totalMinutes,
      totalSessions,
    };
  }, [books, habits, habitLogs, pomo, diary]);

  const summaryText = useMemo(() => {
    if (weekData.activeDaysCount === 0) {
      return 'No reading recorded yet this week';
    }
    const hours = Math.floor(weekData.totalMinutes / 60);
    const mins = weekData.totalMinutes % 60;
    if (weekData.totalMinutes > 0) {
      const timeStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;
      return `${weekData.activeDaysCount} of 7 days · ${timeStr} focused`;
    }
    return `${weekData.activeDaysCount} of 7 days · ${weekData.totalSessions} reading session${weekData.totalSessions === 1 ? '' : 's'}`;
  }, [weekData]);

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-4 sm:p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-semibold">
            Weekly Activity · Mon – Sun
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted">
          {summaryText}
        </span>
      </div>

      {/* Horizontal Strip: 7 equal columns, never stacks on mobile */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {weekData.days.map((day) => (
          <div
            key={day.dateStr}
            className={`flex flex-col items-center justify-between py-2 sm:py-2.5 px-1 rounded-xl transition-all ${
              day.hasActivity
                ? 'bg-accent text-ink font-semibold shadow-sm'
                : day.isToday
                  ? 'border border-text/30 bg-surface2 text-text'
                  : 'bg-ink/30 border border-line/40 text-muted'
            }`}
          >
            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider mb-0.5">
              {day.label}
            </span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center my-0.5">
              {day.hasActivity ? (
                <div className="grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-full bg-ink text-accent">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              ) : (
                <span className={`text-[11px] sm:text-xs ${day.isToday ? 'font-bold text-text' : 'text-muted/60'}`}>
                  {day.dayNum}
                </span>
              )}
            </div>
            <span className="text-[8px] sm:text-[9px] font-mono opacity-80">
              {day.hasActivity ? (day.minutes > 0 ? `${day.minutes}m` : 'done') : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
