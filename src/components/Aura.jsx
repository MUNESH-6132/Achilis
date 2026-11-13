import React, { useMemo } from 'react';

export function Aura({ entries }) {
  const moods = useMemo(() => {
    const arr = Array.isArray(entries) ? entries.slice(0, 7) : [];
    if (!arr.length) return [];
    return arr.map(e => Math.max(1, Math.min(5, Number(e.mood) || 3)));
  }, [entries]);

  const avg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
  const heat = Math.max(0, Math.min(1, (avg - 1) / 4));
  const spikes = 3 + Math.round(heat * 7);
  
  const points = useMemo(() => {
    const n = 64, out = [];
    for (let i = 0; i < n; i += 1) {
      const a = i / n * Math.PI * 2;
      const wob = 1 + Math.sin(a * spikes + heat * 4) * 0.07 * (0.5 + heat) + Math.sin(a * 3 + 1.7) * 0.05;
      out.push([160 + Math.cos(a) * 96 * wob, 160 + Math.sin(a) * 96 * wob]);
    }
    return out;
  }, [spikes, heat]);

  const dPath = points.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " Z";
  const inner = points.map((p, i) => {
    const cx = 160 + (p[0] - 160) * 0.62, cy = 160 + (p[1] - 160) * 0.62;
    return (i ? "L" : "M") + cx.toFixed(1) + " " + cy.toFixed(1);
  }).join(" ") + " Z";
  const hue = Math.round(205 - heat * 185);

  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label={moods.length ? `Aura for the last ${moods.length} diary days` : "Aura waiting for diary entries"}>
      <defs>
        <radialGradient id="auragrad" cx="38%" cy="34%" r="78%">
          <stop offset="0%" stopColor={`hsl(${hue} 95% 62%)`} stopOpacity=".95" />
          <stop offset="100%" stopColor={`hsl(${Math.max(8, hue - 40)} 90% 42%)`} stopOpacity=".35" />
        </radialGradient>
      </defs>
      <path d={dPath} fill="url(#auragrad)" stroke={`hsl(${hue} 90% 70%)`} strokeOpacity=".4" strokeWidth="1" />
      <path d={inner} fill="rgb(var(--c-ink))" fillOpacity=".35" />
      {moods.map((m, i) => {
        const a = i / Math.max(1, moods.length) * Math.PI * 2 - Math.PI / 2;
        const r = 132 + m * 5;
        return <circle key={i} cx={(160 + Math.cos(a) * r).toFixed(1)} cy={(160 + Math.sin(a) * r).toFixed(1)} r={2.6 + m * 0.7} fill={`hsl(${hue} 90% 68%)`} fillOpacity=".55" />;
      })}
    </svg>
  );
}
