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

function TitleListItem({ item, onOpen }) {
  const progress = getEpisodeProgress(item);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-accent/40 hover:bg-surface2/60"
    >
      <span className="block h-[84px] w-14 shrink-0 overflow-hidden rounded-lg border border-line">
        <Cover book={{ ...item, author: item.creator }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-display text-base font-bold">{item.title}</span>
          <span className="rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {item.category === 'series' ? 'Series' : 'Movie'}
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

export function ListView({ items, onOpen }) {
  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <TitleListItem key={item.id} item={item} onOpen={() => onOpen(item)} />
      ))}
    </div>
  );
}
