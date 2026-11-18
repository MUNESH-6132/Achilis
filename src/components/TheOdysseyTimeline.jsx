import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, X } from './Icons';
import { BookCover } from './BookCover';
import { useReduceMotion } from '../ui/motion';

function formatEventDate(timestamp) {
  if (!timestamp) return 'Recently';
  const date = new Date(typeof timestamp === 'number' ? timestamp : String(timestamp));
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TheOdysseyTimeline({
  activities = [],
  onOpenItem,
}) {
  const reduceMotion = useReduceMotion();
  const [showAllModal, setShowAllModal] = useState(false);

  const formatDateKey = useCallback(timestamp => {
    const ts = Number(timestamp) || 0;
    const d = new Date(ts);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Deduplicate nodes by unique id + date (YYYYMMDD), then sort newest first
  const processedActivities = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const act of activities) {
      const key = `${act.id}-${formatDateKey(act.timestamp)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(act);
      }
    }
    return unique.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
  }, [activities, formatDateKey]);

  const allActivities = processedActivities;
  const displayActivities = processedActivities.slice(0, 7);

  return (
    <section className="mb-20" aria-labelledby="odyssey-heading">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent font-semibold">
              The Odyssey · Clio
            </span>
          </div>
          <h2 id="odyssey-heading" className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text">
            Your Flowing Journey
          </h2>
          <p className="mt-1 text-xs text-muted max-w-xl leading-relaxed">
            An organic historical journey of books explored, cinema witnessed, and reflections penned.
          </p>
        </div>

        {allActivities.length > 7 && (
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-semibold text-text hover:border-accent/40 hover:text-accent transition-colors"
          >
            <span>See All Timeline</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {displayActivities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted/40 mb-3" />
          <h3 className="font-serif text-base text-text">The Odyssey begins here</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            As you read books, watch films, and write journal entries, your personal journey will trace its organic path across time.
          </p>
        </div>
      ) : (
        /* The Organic Flowing Journey */
        <div className="relative py-6">
          {/* Desktop Flowing Timeline (Alternating Curved Layout) */}
          <div className="hidden md:block relative">
            {/* Organic Flowing SVG Path behind the nodes */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 800 900"
              fill="none"
            >
              <defs>
                <linearGradient id="odysseyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#B49B70" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#B49B70" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#B49B70" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <motion.path
                d="M 400 30 C 470 90, 480 150, 400 210 C 320 270, 310 330, 400 390 C 490 450, 480 510, 400 570 C 320 630, 310 690, 400 750 C 480 810, 470 870, 400 900"
                stroke="url(#odysseyGradient)"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                fill="none"
                initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>

            {/* Alternating Activity Nodes */}
            <div className="space-y-12 relative z-10">
              {displayActivities.map((act, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <motion.div
                    key={`${act.id}-${act.eventType}-${index}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 + 0.1, duration: 0.3 }}
                    className={`flex items-center gap-6 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Content Card */}
                    <div className={`w-[calc(50%-2.5rem)] ${isLeft ? 'text-right' : 'text-left'}`}>
                      <button
                        type="button"
                        onClick={() => onOpenItem?.(act)}
                        className={`group inline-flex items-center gap-4 rounded-2xl border border-line bg-surface/90 p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-accent/40 hover:bg-surface hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          isLeft ? 'flex-row-reverse text-right' : 'flex-row text-left'
                        }`}
                      >
                        {/* Cover / Poster Thumbnail */}
                        {act.cover ? (
                          <BookCover cover={act.cover} title={act.title} author={act.author || ''} className="h-16 w-11 rounded-lg object-cover shadow-md shrink-0 border border-line/60" />
                        ) : (
                          <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-surface2 border border-line/60 text-muted">
                            <act.Icon className="h-5 w-5 text-accent/80" />
                          </div>
                        )}

                        <div className="min-w-0">
                          {/* Badge & Date */}
                          <div className={`flex items-center gap-2 mb-1 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[9px] font-mono font-medium text-accent">
                              {act.badge}
                            </span>
                            <span className="text-[10px] font-mono text-muted">
                              {formatEventDate(act.timestamp)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="font-serif text-sm font-semibold text-text truncate group-hover:text-accent transition-colors">
                            {act.title}
                          </h4>

                          {/* Secondary detail */}
                          {act.detail && (
                            <p className="text-xs text-muted truncate mt-0.5">
                              {act.detail}
                            </p>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Central Flow Node Orb */}
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                      <div className="h-3.5 w-3.5 rounded-full bg-accent shadow-[0_0_12px_rgba(180,155,112,0.8)] border-2 border-ink" />
                      <div className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
                    </div>

                    {/* Empty balancing space for opposite side */}
                    <div className="w-[calc(50%-2.5rem)]" />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile Flowing Timeline (Vertical Flow Curve) */}
          <div className="md:hidden relative pl-8">
            {/* Vertical Flow Line */}
            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-accent via-accent/30 to-transparent" />

            <div className="space-y-6">
              {displayActivities.map((act, index) => (
                <div key={`${act.id}-${act.eventType}-${index}`} className="relative">
                  {/* Node point */}
                  <div className="absolute -left-8 top-5 flex h-4 w-4 items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(180,155,112,0.8)]" />
                  </div>

                  {/* Card */}
                  <button
                    type="button"
                    onClick={() => onOpenItem?.(act)}
                    className="w-full text-left flex items-center gap-3.5 rounded-xl border border-line bg-surface/90 p-3.5 shadow-md hover:border-accent/40 focus:outline-none"
                  >
                    {act.cover ? (
                      <BookCover cover={act.cover} title={act.title} author={act.author || ''} className="h-14 w-10 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-surface2 text-accent">
                        <act.Icon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-mono text-accent">
                          {act.badge}
                        </span>
                        <span className="text-[10px] font-mono text-muted">{formatEventDate(act.timestamp)}</span>
                      </div>
                      <h4 className="font-serif text-sm font-semibold text-text truncate">{act.title}</h4>
                      {act.detail && <p className="text-xs text-muted truncate">{act.detail}</p>}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Complete Historical Odyssey Modal */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-line shrink-0">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold">Complete Chronology</span>
                  <h3 className="font-serif text-2xl font-bold text-text mt-0.5">The Full Odyssey</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-4">
                {allActivities.map((act, index) => (
                  <button
                    key={`${act.id}-${index}`}
                    type="button"
                    onClick={() => {
                      setShowAllModal(false);
                      onOpenItem?.(act);
                    }}
                    className="w-full text-left flex items-center gap-4 rounded-xl border border-line/60 bg-ink/40 p-3.5 hover:border-accent/40 hover:bg-surface2 transition-all"
                  >
                    {act.cover ? (
                      <BookCover cover={act.cover} title={act.title} author={act.author || ''} className="h-14 w-10 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-accent">
                        <act.Icon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-mono text-accent">
                          {act.badge}
                        </span>
                        <span className="text-[10px] font-mono text-muted">{formatEventDate(act.timestamp)}</span>
                      </div>
                      <h4 className="font-serif text-sm font-semibold text-text truncate">{act.title}</h4>
                      {act.detail && <p className="text-xs text-muted truncate">{act.detail}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
