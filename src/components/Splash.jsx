import React from 'react';
import { HelmetLogo } from './HelmetLogo';

export function Splash() {
  return (
    <div className="relative z-[100] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink text-text">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-surface border border-line shadow-2xl mb-4">
          <HelmetLogo className="h-12 w-12 text-accent animate-pulse" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-widest uppercase text-text">Achilis</h1>
        <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-accent font-semibold">
          A universe of your own
        </p>
        <p className="mt-3 text-xs text-muted">Awakening Olympus…</p>
      </div>
    </div>
  );
}
