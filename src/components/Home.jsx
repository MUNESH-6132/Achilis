import React, { useState, useEffect } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { Aura } from './Aura';
import { BookOpen, Play as Film } from './Icons';

const getGreeting = (hour) => hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

export function Home({ onGo }) {
  const { data } = useAchilles();
  const n = data.books.filter(p => (p.category || "book") === "book");
  const r = n.filter(p => p.status === "Read").length;
  const s = data.books.filter(p => p.category === "movie" || p.category === "series");
  const a = s.filter(p => p.status === "In progress").length;
  const i = s.filter(p => p.status === "Watchlist").length;
  const o = Array.isArray(data.diary) ? data.diary : [];
  const u = Array.isArray(data.notes) ? data.notes : [];
  
  const cards = [
    { id: "library", name: "Library", Icon: BookOpen, count: n.length, unit: n.length === 1 ? "book" : "books", line: r ? `${r} finished` : n.length ? "Nothing finished yet" : "Start your first book", blurb: "Covers, chapters and reading progress." },
    { id: "entertainment", name: "Entertainment", Icon: Film, count: s.length, unit: s.length === 1 ? "title" : "titles", line: a ? `${a} in progress` : i ? `${i} on the watchlist` : "Add a film or series", blurb: "Films, series, shelves and tonight's pick." },
    { id: "personal", name: "Personal", Icon: BookOpen, count: o.length + u.length, unit: o.length + u.length === 1 ? "entry" : "entries", line: `${o.length} diary · ${u.length} notes`, blurb: "Diary, logs and notes behind your PIN." }
  ];

  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const [ix, setIx] = useState(0);
  const cov = data.books.filter(b => b.cover);
  const isM = b => b.category === "movie" || b.category === "series";
  const goT = b => onGo(isM(b) ? "entertainment" : "library");
  const cont = data.books.filter(b => b.status === "In progress" || b.status === "Currently Reading").slice(0, 10);
  const ft = cov.length ? cov[ix % cov.length] : null;
  const hero = cont[0] || ft;

  useEffect(() => {
    if (cov.length < 2) return;
    const id = setInterval(() => setIx(q => q + 1), 6500);
    return () => clearInterval(id);
  }, [cov.length]);

  const pill = { border: "1px solid rgb(var(--c-line))", borderRadius: 999, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "rgb(var(--c-text))", background: "rgb(var(--c-text) / .06)", backdropFilter: "blur(8px)" };

  return (
    <div className="mx-auto max-w-5xl">
      <section style={{ position: "relative", overflow: "hidden", borderRadius: 32, border: "1px solid rgb(var(--c-line))", background: "rgb(var(--c-ink))", minHeight: 430, marginBottom: 28 }}>
        {ft && <div key={"bg" + ft.id} style={{ position: "absolute", inset: 0, backgroundImage: "url(" + ft.cover + ")", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(30px) saturate(1.4)", opacity: .6, transform: "scale(1.25)" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgb(var(--c-ink)) 10%,rgb(var(--c-ink) / .6) 55%,rgb(var(--c-ink) / .15)),linear-gradient(0deg,rgb(var(--c-ink)),transparent 50%)" }} />
        
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "space-between", padding: "clamp(24px,5vw,52px)" }}>
          <div style={{ flex: "1 1 320px", maxWidth: 520, animation: "achIn .8s both" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{dateStr}</p>
            <h1 className="mt-3 font-display font-black tracking-tight" style={{ fontSize: "clamp(36px,6vw,64px)", lineHeight: 1.02 }}>{getGreeting(new Date().getHours())}, {data.user}.</h1>
            <p className="mt-4 text-sm text-muted">{n.length} books · {s.length} films and series{a ? " · " + a + " in progress" : ""} · {o.length + u.length} personal entries</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
              {hero && <button type="button" onClick={() => goT(hero)} style={{ ...pill, background: "rgb(var(--c-accent))", borderColor: "rgb(var(--c-accent))", color: "rgb(var(--c-ink))" }}>Continue {hero.title.length > 26 ? hero.title.slice(0, 26) + "…" : hero.title}</button>}
              <button type="button" onClick={() => onGo("library")} style={pill}>Library</button>
              <button type="button" onClick={() => onGo("entertainment")} style={pill}>Entertainment</button>
            </div>
          </div>
          {ft && (
            <button key={"p" + ft.id} type="button" onClick={() => goT(ft)} aria-label={ft.title} style={{ flex: "none", animation: "achIn .9s both" }}>
              <img src={ft.cover} alt={ft.title} loading="lazy" decoding="async" style={{ width: "clamp(130px,22vw,210px)", aspectRatio: "2/3", objectFit: "cover", borderRadius: 20, boxShadow: "0 40px 80px -20px rgb(var(--c-accent) / .45),0 20px 40px rgba(0,0,0,.7)", animation: "achFloat 7s ease-in-out infinite", willChange: "transform" }} />
            </button>
          )}
        </div>
      </section>

      {cont.length ? (
        <div style={{ marginBottom: 28 }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Continue</p>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
            {cont.map(b => (
              <button key={b.id} type="button" onClick={() => goT(b)} style={{ flex: "none", width: 132, textAlign: "left" }}>
                <div style={{ aspectRatio: "2/3", borderRadius: 16, overflow: "hidden", background: "rgb(var(--c-surface2))", border: "1px solid rgb(var(--c-line))" }}>
                  {b.cover && <img src={b.cover} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div className="mt-1.5 text-xs font-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-7 flex flex-wrap items-center gap-6 rounded-[28px] border border-line bg-surface p-6">
        <div style={{ width: 150, height: 150, flex: "none" }}>
          <Aura entries={o} />
        </div>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Aura</p>
          <h2 className="mt-1 font-display text-2xl font-black tracking-tight">Your week in colour</h2>
          <p className="mt-2 max-w-md text-xs text-muted">{o.length ? "Shaped by the mood of your last seven diary days. Brighter days warm it toward orange, heavier days cool it toward blue." : "Write a diary entry and this starts to take shape."}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ id, name, Icon, count, unit, line, blurb }) => (
          <button key={id} type="button" onClick={() => onGo(id)} className="group relative flex min-h-[230px] flex-col rounded-[28px] border border-line bg-surface p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_30px_60px_-30px_rgb(var(--c-accent) / 0.45)]" style={{ overflow: "hidden" }}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent"><Icon className="h-5 w-5" /></span>
            <span className="mt-auto block pt-8">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{name}</span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black tracking-tight">{count}</span>
                <span className="text-xs text-muted">{unit}</span>
              </span>
              <span className="mt-3 block text-xs font-medium text-white/75">{line}</span>
              <span className="mt-1 block text-xs text-muted">{blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
