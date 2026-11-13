import React from 'react';

export function Splash() {
  return (
    <div className="relative z-[100] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute -inset-20 rounded-full bg-accent/10 blur-[90px]"
        style={{ animation: "achKb 7s ease-in-out infinite alternate" }}
      />
      <div className="relative text-center" style={{ animation: "achIn .55s ease-out both" }}>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent font-display text-3xl font-black text-ink shadow-[0_24px_60px_-24px_#ff5500]">
          A
        </div>
        <h1 className="mt-6 font-display text-2xl font-black tracking-tight">Achilis</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted">Loading your space</p>
      </div>
    </div>
  );
}
