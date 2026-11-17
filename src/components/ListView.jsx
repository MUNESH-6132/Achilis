import React from 'react';
import { Cover } from './Cover';
import { Stars } from './Stars';
import { StatusPill } from './StatusPill';

function getEpisodeProgress(item) {
  const episodes = (Array.isArray(item.seasons) ? item.seasons : [])
    .flatMap(season => Array.isArray(season.episodes) ? season.episodes : []);
  return episodes.length
    ? { done: episodes.filter(episode => episode.done).length, total: episodes.length }
    : null;
}

function formatRuntime(value) {
  const runtime = Number(value) || 0;
  if (runtime <= 0) return '';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours ? (minutes ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
}

function TitleListItem({ item, onOpen, selectMode, selected, onToggle }) {
  const progress = getEpisodeProgress(item);
  const activate = () => {
    if (selectMode) {
      if (onToggle) onToggle(item.id);
      return;
    }
    onOpen();
  };

  return (
    <button
      type="button"
      onClick={activate}
      aria-pressed={selectMode ? Boolean(selected) : undefined}
      aria-label={selectMode ? `${selected ? 'Deselect' : 'Select'} ${item.title || 'untitled'}` : undefined}
      className="group flex w-full items-center gap-4 py-4 text-left transition"
    >
      <span className="relative block h-[84px] w-14 shrink-0 overflow-hidden rounded-lg bg-surface2">
        <Cover book={{ ...item, author: item.creator }} />
        {selectMode && (
          <span
            aria-hidden="true"
            className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-sm border-2 transition ${selected ? 'border-accent bg-accent text-ink' : 'border-line bg-ink/80 text-transparent'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-display text-base font-bold">{item.title}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {item.category === 'series' ? 'Series' : item.category === 'movie' ? 'Movie' : 'Book'}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {[item.creator, item.year, formatRuntime(item.runtime), item.where].filter(Boolean).join(' · ') || 'No details yet'}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-3">
          <StatusPill status={item.status} />
          {progress && (
            <span className="text-[11px] tabular-nums text-muted">
              {progress.done} of {progress.total} episodes
            </span>
          )}
          <Stars value={item.rating || 0} className="text-sm" />
        </span>
      </span>
    </button>
  );
}

export function ListView({ items, onOpen, selectMode, selectedIds, onToggle }) {
  return (
    <div className="divide-y divide-line">
      {items.map(item => (
        <TitleListItem
          key={item.id}
          item={item}
          onOpen={() => onOpen(item)}
          selectMode={selectMode}
          selected={selectedIds ? selectedIds.has(item.id) : false}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}