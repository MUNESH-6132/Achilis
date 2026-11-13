import React, { useEffect, useRef, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { Modal } from './Modal';
import { Cover } from './Cover';
import { X, Play as Film, Plus, Check, Trash } from './Icons';
import { generateId, parseTags } from '../utils/helpers';
import { fetchPoster, imdbSuggest, tmdbDetails } from '../utils/api';

const BUTTON_BASE = "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent px-4 py-2.5 text-ink hover:bg-[#ff6a1f] hover:shadow-[0_12px_30px_-12px_#ff5500] active:scale-[.98]`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-line px-4 py-2.5 text-white/80 hover:border-accent/60 hover:bg-white/[0.04] hover:text-white active:scale-[.98]`;
const BUTTON_SUBTLE = `${BUTTON_BASE} bg-surface2 px-3.5 py-2 text-white/70 hover:bg-[#2a2a2a] hover:text-white`;
const INPUT_CLASS = "w-full rounded-2xl border border-line bg-surface2 px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition focus:border-accent/70 focus:bg-surface2";
const STATUS_OPTIONS = ["Watched", "In progress", "Watchlist"];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function resizePoster(file, maxSize = 480, quality = .82) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("Choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not read that image."));
      image.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (error) {
          reject(new Error("Could not process that image."));
        }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function createSeason(index) {
  return { id: generateId(), title: `Season ${index}`, episodes: [] };
}

function normalizeSeasons(seasons) {
  return (Array.isArray(seasons) ? seasons : []).map(season => ({
    id: season.id || generateId(),
    title: String(season.title || "Season").trim() || "Season",
    episodes: (Array.isArray(season.episodes) ? season.episodes : []).map(episode => ({
      id: episode.id || generateId(),
      title: String(episode.title || "Episode").trim() || "Episode",
      done: !!episode.done
    }))
  }));
}

function SeasonEditor({ season, index, onChange, onRemove }) {
  const [episodeTitle, setEpisodeTitle] = useState("");
  const episodes = Array.isArray(season.episodes) ? season.episodes : [];
  const watchedCount = episodes.filter(episode => episode.done).length;
  const progress = episodes.length ? Math.round(watchedCount / episodes.length * 100) : 0;

  const addEpisode = () => {
    const title = episodeTitle.trim();
    if (!title) return;
    onChange({ episodes: [...episodes, { id: generateId(), title, done: false }] });
    setEpisodeTitle("");
  };

  return (
    <div className="rounded-2xl border border-line bg-ink/40 p-4">
      <div className="flex items-center gap-2">
        <input
          className={`${INPUT_CLASS} py-1.5 text-sm`}
          value={season.title}
          onChange={event => onChange({ title: event.target.value })}
          aria-label={`Name for season ${index + 1}`}
        />
        <span className="shrink-0 text-[11px] tabular-nums text-muted">{watchedCount}/{episodes.length}</span>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-accent/10 hover:text-accent"
          aria-label={`Remove ${season.title || "season"}`}
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
      {episodes.length > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
        {episodes.map(episode => (
          <div key={episode.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => onChange({ episodes: episodes.map(item => item.id === episode.id ? { ...item, done: !item.done } : item) })}
              aria-label={episode.done ? "Mark unwatched" : "Mark watched"}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${episode.done ? "border-accent bg-accent text-ink" : "border-line text-transparent hover:border-accent/60"}`}
            >
              <Check className="h-3 w-3" />
            </button>
            <span className={`min-w-0 flex-1 truncate text-xs ${episode.done ? "text-muted line-through" : "text-white/85"}`}>
              {episode.title}
            </span>
            <button
              type="button"
              onClick={() => onChange({ episodes: episodes.filter(item => item.id !== episode.id) })}
              className="text-muted opacity-0 transition hover:text-accent group-hover:opacity-100"
              aria-label="Remove episode"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className={`${INPUT_CLASS} py-1.5 text-xs`}
          value={episodeTitle}
          onChange={event => setEpisodeTitle(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault();
              addEpisode();
            }
          }}
          placeholder="Add an episode"
        />
        <button type="button" onClick={addEpisode} className={`${BUTTON_SUBTLE} shrink-0 px-3 py-1.5`} aria-label="Add episode">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function RatingInput({ value = 0, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={`text-lg leading-none transition hover:scale-110 hover:text-accent ${star <= value ? "text-accent" : "text-white/20"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function TitleEditor({ title, item = title, onClose, onSave }) {
  const { data, update } = useAchilles();
  const [form, setForm] = useState(() => ({
    category: "movie",
    status: "Watchlist",
    rating: 0,
    tags: "",
    notes: "",
    seasons: [],
    ...item
  }));
  const initialForm = useRef(null);
  if (initialForm.current === null) initialForm.current = JSON.stringify(form);
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const searchTimeout = useRef(null);
  const searchWrapper = useRef(null);
  const posterInput = useRef(null);
  const seasons = Array.isArray(form.seasons) ? form.seasons : [];
  const episodes = seasons.flatMap(season => Array.isArray(season.episodes) ? season.episodes : []);
  const watchedEpisodes = episodes.filter(episode => episode.done).length;
  const episodeProgress = episodes.length ? Math.round(watchedEpisodes / episodes.length * 100) : 0;

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  useEffect(() => {
    if (!suggestions.length) return undefined;
    const closeSuggestions = event => {
      if (searchWrapper.current && !searchWrapper.current.contains(event.target)) setSuggestions([]);
    };
    document.addEventListener("mousedown", closeSuggestions);
    return () => document.removeEventListener("mousedown", closeSuggestions);
  }, [suggestions]);

  const setField = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  const updateSeason = (id, patch) => setField("seasons", seasons.map(season => season.id === id ? { ...season, ...patch } : season));
  const addSeason = () => setField("seasons", [...seasons, createSeason(seasons.length + 1)]);
  const removeSeason = id => setField("seasons", seasons.filter(season => season.id !== id));

  const handleTitleChange = event => {
    const query = event.target.value;
    setField("title", query);
    setMessage("");
    clearTimeout(searchTimeout.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        setSuggestions(await imdbSuggest(query));
      } catch {
        setSuggestions([]);
      }
    }, 350);
  };

  const selectSuggestion = async suggestion => {
    setForm(previous => ({
      ...previous,
      title: suggestion.l,
      year: suggestion.y ? String(suggestion.y) : previous.year,
      creator: previous.creator || suggestion.s || "",
      category: /series/i.test(suggestion.qid || "") ? "series" : "movie",
      cover: suggestion.i?.imageUrl || previous.cover
    }));
    setSuggestions([]);
    if (!suggestion.tid) {
      setMessage("Filled from IMDb.");
      return;
    }

    setMessage("Loading details…");
    try {
      const details = await tmdbDetails(suggestion.mt, suggestion.tid);
      setForm(previous => ({
        ...previous,
        creator: details.creator || previous.creator,
        runtime: details.runtime || previous.runtime,
        tags: details.tags || previous.tags,
        where: details.where || previous.where,
        seasons: details.seasons.length && !(previous.seasons || []).length
          ? details.seasons.map(season => ({
              id: generateId(),
              title: season.name || `Season ${season.season_number}`,
              episodes: Array.from({ length: season.episode_count }, (_, index) => ({
                id: generateId(),
                title: `Episode ${index + 1}`,
                done: false
              }))
            }))
          : previous.seasons
      }));
      setMessage("Filled from TMDB.");
    } catch {
      setMessage("Filled the basics from TMDB. Other details were not available.");
    }
  };

  const handlePosterUpload = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      setField("cover", await resizePoster(file));
      setMessage("Poster added.");
    } catch (error) {
      setMessage(error.message || "Could not use that image.");
    } finally {
      setBusy(false);
    }
  };

  const handlePosterLookup = async () => {
    setBusy(true);
    try {
      const poster = await fetchPoster(form.title);
      if (poster) {
        setField("cover", poster);
        setMessage("Poster added.");
      } else {
        setMessage("Poster lookup is not connected yet. Upload an image or paste a URL instead.");
      }
    } catch {
      setMessage("Poster lookup is not connected yet. Add an image by hand.");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    const cleanTitle = form.title.trim();
    if (!cleanTitle) {
      setMessage("Give it a title first.");
      return;
    }
    const savedTitle = {
      ...form,
      title: cleanTitle,
      category: form.category === "series" ? "series" : "movie",
      creator: String(form.creator || "").trim(),
      year: String(form.year || "").trim(),
      where: String(form.where || "").trim(),
      runtime: Math.max(0, Number(form.runtime) || 0),
      tags: parseTags(form.tags).join(", "),
      notes: String(form.notes || "").trim(),
      seasons: form.category === "series" ? normalizeSeasons(seasons) : [],
      updated: Date.now()
    };

    if (onSave) {
      onSave(savedTitle);
    } else {
      update(state => ({
        ...state,
        books: data.books.some(book => book.id === savedTitle.id)
          ? state.books.map(book => book.id === savedTitle.id ? savedTitle : book)
          : [savedTitle, ...state.books]
      }));
    }
    onClose();
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${item.title || "this title"}"?`)) return;
    update(state => ({
      ...state,
      books: state.books.filter(book => book.id !== item.id),
      shelves: (Array.isArray(state.shelves) ? state.shelves : []).map(shelf => ({
        ...shelf,
        titleIds: (shelf.titleIds || []).filter(id => id !== item.id)
      }))
    }));
    onClose();
  };

  const handleClose = () => {
    if (JSON.stringify(form) !== initialForm.current && !window.confirm("Close without saving these details?")) return;
    onClose();
  };

  return (
    <Modal onClose={handleClose} width="max-w-3xl">
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
            <Film className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-xl font-black leading-tight">{item.id && data.books.some(book => book.id === item.id) ? "Title details" : "Add a title"}</h2>
            <p className="text-xs text-muted">
              {episodes.length ? `${watchedEpisodes}/${episodes.length} episodes · ` : ""}
              {item.id && data.books.some(book => book.id === item.id) ? "Saved in Entertainment" : "A film or a series, with its own poster and progress."}
            </p>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-6 sm:grid-cols-[132px_1fr]">
          <div>
            <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line">
              <Cover book={{ ...form, author: form.creator }} />
            </div>
            <input ref={posterInput} type="file" accept="image/*" className="hidden" onChange={handlePosterUpload} />
            <button type="button" onClick={() => posterInput.current?.click()} disabled={busy} className={`${BUTTON_SUBTLE} mt-2 w-full text-xs`}>
              Upload poster
            </button>
            <button type="button" onClick={handlePosterLookup} disabled={busy} className={`${BUTTON_SUBTLE} mt-1.5 w-full text-xs`}>
              {busy ? "Working…" : "Fetch poster"}
            </button>
          </div>

          <div className="space-y-4">
            <Field label="Title">
              <div ref={searchWrapper} style={{ position: "relative" }}>
                <input
                  className={INPUT_CLASS}
                  value={form.title}
                  onChange={handleTitleChange}
                  placeholder="Type a movie or series name"
                  autoFocus
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div
                    className="rounded-2xl border border-line bg-surface2 shadow-2xl"
                    style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "100%", marginTop: 4, maxHeight: 300, overflowY: "auto" }}
                  >
                    {suggestions.map(suggestion => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="hover:bg-line"
                        style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "8px 12px", alignItems: "center" }}
                      >
                        {suggestion.i ? (
                          <img loading="lazy" decoding="async" src={suggestion.i.imageUrl} alt="" style={{ width: 34, height: 50, objectFit: "cover", borderRadius: 6, flex: "none" }} />
                        ) : (
                          <span style={{ width: 34, height: 50, flex: "none" }} />
                        )}
                        <span style={{ minWidth: 0 }}>
                          <span className="block text-sm font-semibold">{suggestion.l}</span>
                          <span className="block text-xs text-muted">
                            {suggestion.y || ""}
                            {suggestion.qid ? ` · ${/series/i.test(suggestion.qid) ? "Series" : "Movie"}` : ""}
                            {suggestion.s ? ` · ${suggestion.s}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <div>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Type</span>
              <div className="flex gap-1.5">
                {[{ id: "movie", label: "Movie" }, { id: "series", label: "Series" }].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setField("category", type.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${form.category === type.id ? "border-accent bg-accent text-ink" : "border-line text-muted hover:border-accent/50 hover:text-white"}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Creator or director">
                <input className={INPUT_CLASS} value={form.creator || ""} onChange={event => setField("creator", event.target.value)} placeholder="Who made it?" />
              </Field>
              <Field label="Year">
                <input className={INPUT_CLASS} value={form.year || ""} onChange={event => setField("year", event.target.value)} placeholder="2024" inputMode="numeric" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Runtime in minutes">
                <input className={INPUT_CLASS} type="number" min="0" value={form.runtime || ""} onChange={event => setField("runtime", event.target.value)} placeholder={form.category === "series" ? "Per episode" : "120"} />
              </Field>
              <Field label="Where to watch">
                <input className={INPUT_CLASS} value={form.where || ""} onChange={event => setField("where", event.target.value)} placeholder="Cinema, Netflix, a shelf at home" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setField("status", status)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${form.status === status ? "border-accent bg-accent text-ink" : "border-line text-muted hover:border-accent/50 hover:text-white"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Rating</span>
                <div className="flex h-10 items-center">
                  <RatingInput value={form.rating || 0} onChange={rating => setField("rating", rating)} className="text-xl" />
                </div>
              </div>
            </div>

            {form.category === "movie" && (
              <Field label="Watched on">
                <input type="date" className={INPUT_CLASS} value={form.watched || ""} onChange={event => setField("watched", event.target.value)} />
              </Field>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tags · comma separated">
            <input className={INPUT_CLASS} value={form.tags || ""} onChange={event => setField("tags", event.target.value)} placeholder="science fiction, comfort" />
          </Field>
          <Field label="Poster URL">
            <input className={INPUT_CLASS} value={form.cover || ""} onChange={event => setField("cover", event.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea rows={3} className={`${INPUT_CLASS} resize-y leading-relaxed`} value={form.notes || ""} onChange={event => setField("notes", event.target.value)} placeholder="What you thought, or why it is on the list." />
        </Field>

        {form.category === "series" && (
          <section className="rounded-3xl border border-line bg-ink/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold">Seasons and episodes</h3>
                <p className="text-xs text-muted">
                  {episodes.length ? `${watchedEpisodes} of ${episodes.length} watched · ${episodeProgress}%` : "Add a season, then tick episodes as you watch them."}
                </p>
              </div>
              <button type="button" onClick={addSeason} className={BUTTON_SECONDARY}>
                <Plus className="h-4 w-4" /> Add season
              </button>
            </div>
            {episodes.length > 0 && (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${episodeProgress}%` }} />
              </div>
            )}
            <div className="mt-4 space-y-3">
              {seasons.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
                  No seasons yet. Add one to start a checklist.
                </p>
              ) : (
                seasons.map((season, index) => (
                  <SeasonEditor
                    key={season.id}
                    season={season}
                    index={index}
                    onChange={patch => updateSeason(season.id, patch)}
                    onRemove={() => removeSeason(season.id)}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {message && <p className="rounded-2xl border border-accent/25 bg-accent/[0.08] px-4 py-2.5 text-xs text-accent">{message}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <div>
          {data.books.some(book => book.id === item.id) && (
            <button type="button" onClick={handleDelete} className={`${BUTTON_SECONDARY} border-transparent text-muted hover:border-accent/40 hover:text-accent`}>
              <Trash className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className={BUTTON_SECONDARY} onClick={handleClose}>Cancel</button>
          <button type="button" className={BUTTON_PRIMARY} onClick={handleSave}>
            {data.books.some(book => book.id === item.id) ? "Save changes" : "Add to Entertainment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
