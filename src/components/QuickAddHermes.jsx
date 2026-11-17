import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Film, Edit } from './Icons';
import { useReduceMotion } from '../ui/motion';

/**
 * Quick Add — Hermes (Capture new content)
 * Floating bottom-right speed-dial menu for rapidly capturing books, films, and reflections.
 */
export function QuickAddHermes({ onAddBook, onAddMovie, onAddJournal }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const reduceMotion = useReduceMotion();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const items = [
    {
      id: 'book',
      label: 'Add Book',
      sublabel: 'Athena',
      Icon: BookOpen,
      action: () => {
        setOpen(false);
        onAddBook?.();
      },
    },
    {
      id: 'movie',
      label: 'Add Movie / Series',
      sublabel: 'Apollo',
      Icon: Film,
      action: () => {
        setOpen(false);
        onAddMovie?.();
      },
    },
    {
      id: 'journal',
      label: 'Add Journal Entry',
      sublabel: 'Mnemosyne',
      Icon: Edit,
      action: () => {
        setOpen(false);
        onAddJournal?.();
      },
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto"
      aria-label="Hermes Quick Capture"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-orientation="vertical"
            aria-label="Hermes quick add options"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 flex flex-col items-end gap-2.5"
          >
            {items.map((item, idx) => (
              <motion.button
                key={item.id}
                role="menuitem"
                type="button"
                onClick={item.action}
                initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.15 }}
                className="group flex items-center gap-3 rounded-full bg-surface/95 border border-line pl-4 pr-2.5 py-2 text-text shadow-xl backdrop-blur-md transition-all hover:bg-surface2 hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="text-right">
                  <span className="block text-xs font-semibold text-text group-hover:text-accent transition-colors">
                    {item.label}
                  </span>
                  <span className="block text-[9px] font-mono tracking-wider uppercase text-muted">
                    {item.sublabel}
                  </span>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent group-hover:bg-accent group-hover:text-ink transition-colors">
                  <item.Icon className="h-4 w-4" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Hermes Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close Quick Add menu" : "Hermes Quick Add"}
        className={`group relative flex h-13 w-13 items-center justify-center rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
          open
            ? 'bg-surface border border-accent/40 text-text rotate-45'
            : 'bg-accent hover:bg-accent/90 text-ink hover:scale-105 shadow-[0_10px_30px_-8px_rgba(180,155,112,0.45)]'
        }`}
      >
        <Plus className="h-6 w-6 stroke-[2.2] transition-transform duration-300" />
        {!open && (
          <span className="sr-only">Quick Add (Hermes)</span>
        )}
      </button>
    </div>
  );
}
