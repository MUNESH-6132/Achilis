import React, { useEffect } from 'react';
import achillesImg from '../assets/images.jpeg';

export function SplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fade-in relative z-[100] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <div className="pop-in relative mb-8">
        <img
          src={achillesImg}
          alt="Achilles"
          loading="eager"
          decoding="async"
          className="h-64 w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          style={{ animation: 'achFloat 6s ease-in-out infinite' }}
        />
      </div>

      <div className="rise-in relative text-center" style={{ animationDelay: '0.2s' }}>
        <h1 className="font-display text-5xl font-black tracking-widest text-accent drop-shadow-[0_0_15px_rgba(240,135,58,0.5)]">
          ACHILLES
        </h1>
        <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted">
          "Let fate do what it will; I will meet it with my spear."
        </p>
      </div>
    </div>
  );
}
