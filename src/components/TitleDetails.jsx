import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAchilles } from '../context/AchillesContext';
import { Cover } from './Cover';
import { Stars } from './Stars';
import { X, Check, Edit } from './Icons';
import { useReduceMotion } from '../ui/motion';

function formatRuntime(value) {
  const runtime = Number(value) || 0;
  if (runtime <= 0) return '';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours ? (minutes ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
}

export function TitleDetails({ item, onClose, onEdit }) {
  const { data, update } = useAchilles();
  const reduceMotion = useReduceMotion();
  const current = data.books.find(b => b.id === item.id) || item;

  const isSeries = current.category === "series";
  const seasons = Array.isArray(current.seasons) ? current.seasons : [];
  const episodes = seasons.flatMap(season => Array.isArray(season.episodes) ? season.episodes : []);
  const totalEpisodes = episodes.length;
  const watchedEpisodes = episodes.filter(episode => episode.done).length;
  const episodeProgress = totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0;

  const status = current.status || "Watchlist";
  const isWatched = status === "Watched";
  const isInProgress = status === "In progress";
  const statusProgress = { Watchlist: 0, "In progress": 50, Watched: 100 }[status] ?? 0;
  const progress = isSeries && totalEpisodes ? episodeProgress : statusProgress;
  const progressLabel = isSeries && totalEpisodes
    ? `${watchedEpisodes} of ${totalEpisodes} episodes watched`
    : isWatched
      ? "Watched"
      : isInProgress
        ? "In progress"
        : "On the watchlist";

  const tags = String(current.tags || "").split(",").map(tag => tag.trim()).filter(Boolean);
  const runtime = formatRuntime(current.runtime);

  const [notes, setNotes] = useState(current.notes || "");
  const [visible, setVisible] = useState(true);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeButtonRef = useRef(null);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    setNotes(current.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      onCloseRef.current?.();
    }, reduceMotion ? 0 : 260);
  }, [reduceMotion]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [requestClose]);

  const updateTitle = (patch) => {
    update(state => ({
      ...state,
      books: state.books.map(b => b.id === current.id ? { ...b, ...patch } : b)
    }));
  };

  const toggleEpisode = (seasonId, episodeId) => {
    const nextSeasons = seasons.map(season => (
      season.id === seasonId
        ? { ...season, episodes: season.episodes.map(episode => episode.id === episodeId ? { ...episode, done: !episode.done } : episode) }
        : season
    ));
    updateTitle({ seasons: nextSeasons });
  };

  const handleNotesChange = (event) => {
    const value = event.target.value;
    setNotes(value);
    updateTitle({ notes: value });
  };

  const metaRows = [
    { label: isSeries ? "Created by" : "Directed by", value: current.creator || "—" },
    { label: "Year", value: current.year || "—" },
    { label: "Runtime", value: runtime || "—" },
    { label: "Where to watch", value: current.where || "—" },
    { label: "Genres", value: tags.length ? tags.join(", ") : "—" },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="title-drawer"
          className="fixed inset-0 z-[70] flex justify-end"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label={current.title || "Title details"}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onMouseDown={requestClose}
          />
          <motion.div
            initial={reduceMotion ? false : { x: "4%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "4%", opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full max-w-5xl overflow-y-auto border-l border-line bg-ink shadow-2xl"
          >
            <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent">
                  {isSeries ? "Series" : "Film"} {current.year ? `· ${current.year}` : ''} {runtime ? `· ${runtime}` : ''}
                </p>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={requestClose}
                  aria-label="Close details"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-accent/50 hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr] md:gap-12">
                <div>
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-8 rounded-full opacity-70"
                      style={{
                        background: "radial-gradient(circle at 50% 45%, rgb(var(--c-accent) / 0.30), transparent 70%)",
                        filter: "blur(32px)",
                      }}
                    />
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-line shadow-2xl">
                      <Cover book={{ ...current, author: current.creator || current.author }} />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={requestClose}
                      className="flex-1 rounded-md border border-line px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface2"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(current)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent/90"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="relative inline-flex items-center">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-3 h-1.5 w-1.5 rounded-full ${isWatched || isInProgress ? 'bg-accent' : 'bg-muted'}`}
                    />
                    <select
                      value={status}
                      onChange={event => updateTitle({ status: event.target.value })}
                      aria-label="Viewing status"
                      className={`cursor-pointer appearance-none rounded-full border py-1 pl-6 pr-7 text-[10px] font-semibold uppercase tracking-widest outline-none transition ${isWatched
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : isInProgress
                          ? 'border-accent/25 bg-accent/5 text-accent'
                          : 'border-line bg-surface text-muted'}`}
                    >
                      <option value="Watchlist">Watchlist</option>
                      <option value="In progress">In progress</option>
                      <option value="Watched">Watched</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="pointer-events-none absolute right-2.5 h-3 w-3 opacity-60"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>

                  <h1 className="mt-4 break-words font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
                    {current.title || "Untitled"}
                  </h1>
                  <p className="mt-3 font-serif text-lg text-muted">
                    {current.creator || "Unknown creator"}{current.year ? ` · ${current.year}` : ""}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Stars value={current.rating || 0} onChange={value => updateTitle({ rating: value })} className="text-lg" />
                      <span className="text-xs text-muted">{current.rating ? `${current.rating}/5` : "Not rated"}</span>
                    </div>
                    {!isSeries && (
                      <button
                        type="button"
                        onClick={() => updateTitle({ status: isWatched ? "Watchlist" : "Watched" })}
                        aria-pressed={isWatched}
                        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition ${isWatched ? "border border-accent/40 bg-accent/10 text-accent" : "bg-accent text-ink hover:bg-accent/90"}`}
                      >
                        <Check className="h-4 w-4" /> {isWatched ? "Watched" : "Mark as watched"}
                      </button>
                    )}
                  </div>

                  <section className="mt-8">
                    <div className="flex items-end justify-between">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                        {isSeries && totalEpisodes ? "Series progress" : "Viewing status"}
                      </p>
                      <span className="font-display text-2xl font-bold text-accent">{progress}%</span>
                    </div>
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted">{progressLabel}</p>
                  </section>

                  {isSeries && seasons.length > 0 && (
                    <section className="mt-8">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Seasons &amp; episodes</p>
                      <div className="mt-3 max-h-72 space-y-5 overflow-y-auto pr-1">
                        {seasons.map(season => {
                          const seasonEpisodes = Array.isArray(season.episodes) ? season.episodes : [];
                          const doneCount = seasonEpisodes.filter(episode => episode.done).length;
                          const seasonPercent = seasonEpisodes.length ? Math.round((doneCount / seasonEpisodes.length) * 100) : 0;
                          return (
                            <div key={season.id}>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-text">{season.title}</span>
                                <span className="text-xs tabular-nums text-muted">{doneCount}/{seasonEpisodes.length}</span>
                              </div>
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                                <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${seasonPercent}%` }} />
                              </div>
                              {seasonEpisodes.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {seasonEpisodes.map(episode => (
                                    <button
                                      key={episode.id}
                                      type="button"
                                      onClick={() => toggleEpisode(season.id, episode.id)}
                                      aria-pressed={episode.done}
                                      className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition hover:bg-surface2"
                                    >
                                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border transition ${episode.done ? "border-accent bg-accent text-ink" : "border-line text-transparent"}`}>
                                        <Check className="h-3 w-3" />
                                      </span>
                                      <span className={`flex-1 truncate text-xs ${episode.done ? "text-muted line-through" : "text-text"}`}>{episode.title}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <section className="mt-8">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Personal review</p>
                    <textarea
                      value={notes}
                      onChange={handleNotesChange}
                      rows={4}
                      placeholder="What you thought, or why it is on the list…"
                      className="mt-2 w-full resize-y rounded-lg border border-line bg-surface/50 p-4 font-serif text-base leading-relaxed text-text placeholder:text-muted/50 outline-none transition focus:border-accent"
                    />
                  </section>

                  <section className="mt-8 border-t border-line">
                    {metaRows.map((row, index) => (
                      <div key={index} className="flex border-b border-line py-3">
                        <span className="w-32 shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted">{row.label}</span>
                        <span className="text-sm font-medium text-text">{row.value}</span>
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}