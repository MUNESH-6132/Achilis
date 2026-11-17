import React, { useEffect, useState } from 'react';
import { HelmetLogo } from './HelmetLogo';

const SPLASH_SESSION_KEY = 'achilis:splash-seen:v1';

export function SplashScreen() {
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!showIntro) return undefined;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    } catch {
      // The short intro still works when session storage is unavailable.
    }
    const timer = window.setTimeout(() => setShowIntro(false), 900);
    const handleKeyDown = event => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        setShowIntro(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showIntro]);

  return (
    <div
      className="relative z-[100] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-6 text-text"
      onClick={() => setShowIntro(false)}
    >
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-surface border border-line shadow-2xl mb-6">
          <HelmetLogo className="h-14 w-14 text-accent" />
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl tracking-widest uppercase font-bold text-text">ACHILIS</h1>
        {showIntro ? (
          <>
            <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.28em] text-accent font-semibold">
              A universe of your own.
            </p>
            <p className="mt-2 text-xs text-muted max-w-xs mx-auto">
              Knowledge · Entertainment · Reflections
            </p>
            <button
              type="button"
              onClick={() => setShowIntro(false)}
              className="mt-8 min-h-11 px-5 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted hover:text-accent border border-line rounded-full"
            >
              Skip intro
            </button>
          </>
        ) : (
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-muted">Awakening Olympus…</p>
        )}
      </div>
    </div>
  );
}
