import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Film, Edit } from './Icons';
import { useReduceMotion } from '../ui/motion';

/**
 * HermesQuickAdd Component
 * Floating speed-dial button positioned in the bottom-right corner.
 * Auto-hides on downward scroll, expands into 3 options (Athena, Apollo, Mnemosyne),
 * and respects mobile safe areas and prefers-reduced-motion.
 */
export function HermesQuickAdd({ onSelectType }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const lastScrollY = useRef(0);
  const reduceMotion = useReduceMotion();

  // Auto-hide when scrolling down, show when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 15 && currentScrollY > 100) {
        setVisible(false);
      } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY <= 100) {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    { id: 'book', label: 'Add Book', sublabel: 'Athena', Icon: BookOpen },
    { id: 'movie', label: 'Add Movie / Series', sublabel: 'Apollo', Icon: Film },
    { id: 'journal', label: 'Add Journal Entry', sublabel: 'Mnemosyne', Icon: Edit },
    { id: 'import', label: 'Import Library', sublabel: 'Goodreads / IMDB', Icon: Plus },
  ];

  const handleSelect = (id) => {
    setOpen(false);
    onSelectType?.(id);
  };

  const isShown = visible || open;

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-20 sm:bottom-8 right-6 z-40 flex flex-col items-end pointer-events-auto transition-opacity duration-300 ${
        isShown ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
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
                onClick={() => handleSelect(item.id)}
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
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Quick Add"
        title="Quick Add (Hermes)"
        className={`group relative flex h-13 w-13 items-center justify-center rounded-full shadow-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
          open
            ? 'bg-surface border border-accent/40 text-text rotate-45'
            : 'bg-accent hover:bg-accent/90 text-ink hover:scale-105 shadow-[0_10px_30px_-8px_rgba(180,155,112,0.45)]'
        }`}
      >
        <Plus className="h-6 w-6 stroke-[2.2] transition-transform duration-300" />
      </button>
    </div>
  );
}
