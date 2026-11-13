import React from 'react';
import { Modal } from './Modal';
import { Edit } from './Icons';

function getSeriesProgress(item) {
  const episodes = (Array.isArray(item.seasons) ? item.seasons : [])
    .flatMap(season => Array.isArray(season.episodes) ? season.episodes : []);
  return episodes.length
    ? { done: episodes.filter(episode => episode.done).length, total: episodes.length }
    : null;
}

export function TitleDetails({ item, onClose, onEdit }) {
  const isSeries = item.category === "series";
  const progress = getSeriesProgress(item);
  const progressPercent = progress ? Math.round(progress.done / progress.total * 100) : 0;
  const tags = String(item.tags || "").split(",").map(tag => tag.trim()).filter(Boolean);
  const status = {
    Watchlist: "On the watchlist",
    "In progress": isSeries ? "Watching" : "In progress",
    Watched: "Watched"
  }[item.status] || item.status;
  const meta = [
    isSeries ? "Series" : "Film",
    item.year,
    item.runtime ? `${item.runtime} min` : "",
    item.status === "Watched" && item.watched ? `Watched ${item.watched}` : ""
  ].filter(Boolean);

  const rowStyle = {
    width: 110,
    flex: "none",
    fontSize: 11,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "rgb(var(--c-muted))"
  };
  const renderRow = (label, value) => value ? (
    <div style={{ display: "flex", gap: 14, padding: "10px 0", borderTop: "1px solid rgb(var(--c-text) / .07)" }}>
      <span style={rowStyle}>{label}</span>
      <span style={{ fontSize: 14, color: "rgb(var(--c-text))", lineHeight: 1.5, minWidth: 0 }}>{value}</span>
    </div>
  ) : null;

  return (
    <Modal onClose={onClose} width="max-w-3xl">
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 28 }}>
        {item.cover ? (
          <div
            style={{
              position: "absolute",
              inset: -40,
              backgroundImage: `url(${item.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(46px) saturate(1.2)",
              opacity: .28
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg,rgb(var(--c-surface) / .5),rgb(var(--c-surface)) 72%)"
          }}
        />
        <div style={{ position: "relative", padding: "clamp(18px,4vw,34px)" }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div style={{ flex: "none", width: "clamp(140px,28vw,210px)" }}>
              {item.cover ? (
                <img
                  src={item.cover}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: "100%",
                    aspectRatio: "2/3",
                    objectFit: "cover",
                    borderRadius: 18,
                    boxShadow: "0 30px 60px -20px rgba(0,0,0,.9)"
                  }}
                />
              ) : (
                <div style={{ aspectRatio: "2/3", borderRadius: 18, background: "rgb(var(--c-surface2))" }} />
              )}
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <p style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "rgb(var(--c-accent))", fontWeight: 600 }}>
                {meta.join(" · ")}
              </p>
              <h2
                className="font-display font-black tracking-tight"
                style={{ fontSize: "clamp(28px,5vw,42px)", lineHeight: 1.05, margin: "8px 0 14px" }}
              >
                {item.title}
              </h2>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                <span style={{ border: "1px solid rgb(var(--c-line))", background: "rgba(200,102,58,.12)", color: "rgb(var(--c-accent))", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                  {status}
                </span>
                {item.rating ? (
                  <span style={{ color: "rgb(var(--c-accent))", letterSpacing: 2 }}>
                    {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                  </span>
                ) : (
                  <span style={{ color: "rgb(var(--c-muted))", fontSize: 12 }}>Not rated</span>
                )}
              </div>
              {progress && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgb(var(--c-muted))", marginBottom: 6 }}>
                    <span>Progress</span>
                    <span>{progress.done} of {progress.total} episodes</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: "rgb(var(--c-text) / .08)", overflow: "hidden" }}>
                    <i style={{ display: "block", height: "100%", width: `${progressPercent}%`, background: "rgb(var(--c-accent))" }} />
                  </div>
                </div>
              )}
              {renderRow(isSeries ? "Created by" : "Directed by", item.creator)}
              {renderRow("Where to watch", item.where)}
              {tags.length ? renderRow("Genres", (
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ border: "1px solid rgb(var(--c-text) / .12)", borderRadius: 99, padding: "2px 10px", fontSize: 12, color: "rgb(var(--c-text))" }}>
                      {tag}
                    </span>
                  ))}
                </span>
              )) : null}
              {isSeries && (item.seasons || []).length ? renderRow("Seasons", (
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {item.seasons.map(season => (
                    <span key={season.id}>
                      {season.title} · {(season.episodes || []).filter(episode => episode.done).length}/{(season.episodes || []).length}
                    </span>
                  ))}
                </span>
              )) : null}
            </div>
          </div>
          {item.notes ? (
            <div style={{ marginTop: 24, padding: "16px 18px", borderRadius: 18, background: "rgb(var(--c-text) / .04)", border: "1px solid rgb(var(--c-text) / .06)" }}>
              <p style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgb(var(--c-muted))", marginBottom: 6 }}>Notes</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgb(var(--c-text))", whiteSpace: "pre-wrap" }}>{item.notes}</p>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 28 }}>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-accent/60 hover:bg-white/[0.04] hover:text-white active:scale-[.98]" onClick={onClose}>
              Close
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-[#ff6a1f] active:scale-[.98]" onClick={() => onEdit(item)}>
              <Edit className="h-4 w-4" /> Edit
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
