import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { LogoWordmark } from './Logo';
import { UserMenu } from './UserMenu';

// Hook updating precisely once per minute on the minute boundary
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timerId;
    const scheduleNextMinute = () => {
      const current = new Date();
      setNow(current);
      const msUntilNext = (60 - current.getSeconds()) * 1000 - current.getMilliseconds() + 50;
      timerId = setTimeout(scheduleNextMinute, msUntilNext);
    };
    scheduleNextMinute();
    return () => clearTimeout(timerId);
  }, []);

  return now;
}

export function HeaderNav({
  space,
  collectionTab,
  onNavigate,
  theme,
  onToggleTheme,
  userName = 'Reader',
  onExitDemo,
  onSettings,
}) {
  const clock = useMinuteClock();

  // Greeting based on current hour
  const hour = clock.getHours();
  const greetingText = hour < 5
    ? 'Night reflections'
    : hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : 'Good evening';

  const formattedDate = clock.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = clock.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      myth: 'Olympus',
      active: space === 'home',
      onClick: () => onNavigate('home'),
    },
    {
      id: 'library',
      label: 'Library',
      myth: 'Athena',
      active: space === 'collection' && collectionTab === 'books',
      onClick: () => onNavigate('collection', 'books'),
    },
    {
      id: 'cinema',
      label: 'Cinema',
      myth: 'Apollo',
      active: space === 'collection' && collectionTab === 'screen',
      onClick: () => onNavigate('collection', 'screen'),
    },
    {
      id: 'journal',
      label: 'Journal',
      myth: 'Mnemosyne',
      active: space === 'journal',
      onClick: () => onNavigate('journal'),
    },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-line bg-ink/90 backdrop-blur-md transition-colors"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Achilis Logo + Wordmark */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Logo className="h-8 w-8 transition-transform duration-300 hover:scale-105" />
          <LogoWordmark className="font-display font-bold tracking-widest text-text" />
        </div>

        {/* Center: Primary Navigation */}
        <nav
          className="hidden lg:flex items-center gap-2"
          aria-label="Primary Spaces"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-colors flex flex-col items-center group ${
                item.active ? 'text-text font-semibold' : 'text-muted'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>{item.label}</span>
                {/* Mythology name as small muted label */}
                <span className="text-xs text-muted">
                  {item.myth}
                </span>
              </span>

              {item.active && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-[2px] bg-accent rounded-full"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Clock, Theme Toggle, Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Live Clock (1-minute interval) */}
          <div className="hidden sm:flex flex-col text-right font-mono text-[11px] leading-tight text-muted border-r border-line pr-3">
            <span className="text-text font-semibold">{formattedTime}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted/70">{formattedDate}</span>
          </div>

          {/* Theme Toggle Button (Dark / Light) */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-accent/40 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {theme === 'dark' ? (
              // Sun icon for switching to light
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              // Moon icon for switching to dark
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

          {/* User Menu */}
          <UserMenu
            theme={theme}
            onSettings={onSettings}
            onCycleTheme={onToggleTheme}
            onCreateAccount={onExitDemo}
          />
        </div>
      </div>
    </header>
  );
}