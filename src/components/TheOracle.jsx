import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAchilles } from '../context/AchillesContext';
import { useAuth } from '../context/AuthContext';
import { useReduceMotion } from '../ui/motion';
import { useAutosave } from '../hooks/useAutosave';
import { Pin, Check, Plus, X, ChevronRight } from './Icons';
import { ORACLE_QUESTIONS, getDailyQuestions } from '../data/oracleQuestions';

export function TheOracle() {
  const { data, update } = useAchilles();
  const { user, isDemo } = useAuth();
  const reduceMotion = useReduceMotion();
  const ownerId = isDemo ? 'demo' : user?.id || 'local';

  // --- Midnight Rollover: today refreshes when local calendar date changes ---
  const [today, setToday] = useState(() => new Date().toLocaleDateString('en-CA'));
  const rolloverTimerRef = useRef(null);

  useEffect(() => {
    function scheduleRollover() {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
      rolloverTimerRef.current = setTimeout(() => {
        setToday(new Date().toLocaleDateString('en-CA'));
        scheduleRollover();
      }, msUntilMidnight + 500); // 500ms buffer past midnight
    }
    scheduleRollover();
    return () => clearTimeout(rolloverTimerRef.current);
  }, []);

  // State slices
  const oracleAnswers = data.oracleAnswers || {};
  const oraclePinned = Array.isArray(data.oraclePinned) ? data.oraclePinned : [];
  const oracleCustom = Array.isArray(data.oracleCustom) ? data.oracleCustom : [];

  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [draftAnswers, setDraftAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState('');
const [customCategoryText, setCustomCategoryText] = useState('Personal Inquiry');

  // Per-question autosave instances
  const autosaveInstances = useRef({});
  
  // Track isSaving state per question for UI display
  const isSavingRef = useRef({});

  // Merge curated + custom questions
  const allQuestions = useMemo(() => {
    return [...ORACLE_QUESTIONS, ...oracleCustom];
  }, [oracleCustom]);

  // Today's 3 stable questions (deterministic by date + ownerId)
  const dailyQuestions = useMemo(() => {
    return getDailyQuestions(today, allQuestions, oraclePinned, ownerId);
  }, [today, allQuestions, oraclePinned, ownerId]);

  // Debounced autosave per question (TASK 6)
  const handleAnswerChange = useCallback((qId, value) => {
    // Immediately update draft answer for UI responsiveness
    setDraftAnswers(prev => ({ ...prev, [qId]: value }));

    // Trigger debounced autosave via hook (1.2s delay)
    const instance = autosaveInstances.current[qId];
    if (instance) {
      instance(value);
      // Track isSaving state for UI display
      isSavingRef.current[qId] = instance.isSaving;
    }
  }, []);

  // Initialize autosave instances for each daily question
  useEffect(() => {
    const newInstances = {};
    dailyQuestions.forEach(q => {
      newInstances[q.id] = (value) => {
        const now = Date.now();
        try {
          update(state => ({
            ...state,
            oracleAnswers: {
              ...(state.oracleAnswers || {}),
              [qId]: {
                answer: value,
                date: today,
                updatedAt: now,
              },
            },
          }));
          setSaveStatus(prev => ({ ...prev, [qId]: 'Saved' }));
        } catch (saveError) {
          console.error('Oracle autosave failed:', saveError);
          setSaveStatus(prev => ({ ...prev, [qId]: 'Error saving' }));
        }
        // Clear save status after 2s
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [qId]: '' }));
        }, 2000);
      };
      autosaveInstances.current[q.id] = newInstances[q.id];
    });
    // Cleanup on unmount / question change
    return () => {
      Object.keys(autosaveInstances.current).forEach(key => {
        delete autosaveInstances.current[key];
      });
    };
  }, [dailyQuestions, update, today]);

  // Toggle Pin/Bookmark
  const togglePin = useCallback((qId, e) => {
    e.stopPropagation();
    update(state => {
      const current = Array.isArray(state.oraclePinned) ? state.oraclePinned : [];
      const next = current.includes(qId)
        ? current.filter(id => id !== qId)
        : [...current, qId];

      try {
        localStorage.setItem('achilles:oraclePinned', JSON.stringify(next));
      } catch {
        // Safe fallback if storage quota exceeded
      }
      return { ...state, oraclePinned: next };
    });
  }, [update]);

  // Add Custom Question
  const handleAddCustomQuestion = (e) => {
    e.preventDefault();
    if (!customQuestionText.trim()) return;
    const newQ = {
      id: `custom-q-${Date.now()}`,
      category: customCategoryText.trim() || 'Personal Reflection',
      question: customQuestionText.trim(),
      isCustom: true,
      createdAt: Date.now(),
    };
    update(state => ({
      ...state,
      oracleCustom: [newQ, ...(state.oracleCustom || [])],
    }));
    setCustomQuestionText('');
    setShowCustomModal(false);
  };

  // Answered questions history
  const answeredHistory = useMemo(() => {
    return Object.entries(oracleAnswers)
      .map(([id, item]) => {
        const qObj = allQuestions.find(q => q.id === id) || { question: 'Archived inquiry', category: 'Reflection' };
        return {
          id,
          question: qObj.question,
          category: qObj.category,
          answer: item.answer,
          date: item.date,
          updatedAt: item.updatedAt,
        };
      })
      .filter(item => item.answer && item.answer.trim().length > 0)
      .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  }, [oracleAnswers, allQuestions]);

  return (
    <section className="mb-16" aria-labelledby="oracle-heading">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent font-semibold">
              The Oracle · Daily Reflections
            </span>
          </div>
          <h2 id="oracle-heading" className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text">
            Three Questions for Today
          </h2>
          <p className="mt-1 text-xs text-muted max-w-xl leading-relaxed">
            Consistent throughout your day. Pin meaningful inquiries, author your own, and reflect quietly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-text hover:border-accent/40 hover:text-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Custom Prompt</span>
          </button>
          {answeredHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
            >
              <span>{showHistory ? 'Hide Past Reflections' : `Past Reflections (${answeredHistory.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily 3 Questions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {dailyQuestions.map((q) => {
          const isPinned = oraclePinned.includes(q.id);
          const isOpen = activeQuestionId === q.id;
          const currentAnswer = draftAnswers[q.id] !== undefined
            ? draftAnswers[q.id]
            : (oracleAnswers[q.id]?.answer || '');
          const status = saveStatus[q.id];
          const hasAnswer = currentAnswer.trim().length > 0;

          return (
            <div
              key={q.id}
              className={`group flex flex-col justify-between rounded-2xl border transition-all duration-300 p-5 ${
                isOpen
                  ? 'bg-surface border-accent/40 shadow-xl'
                  : 'bg-surface/60 border-line hover:border-accent/30 hover:bg-surface/90'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-accent font-semibold">
                      {q.category}
                    </span>
                    {hasAnswer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-mono font-medium text-accent">
                        <Check className="h-2.5 w-2.5" /> Answered
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => togglePin(q.id, e)}
                    aria-label={isPinned ? "Unpin question" : "Pin question"}
                    title={isPinned ? "Unpin from daily slots" : "Pin to keep in daily slots"}
                    className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
                      isPinned
                        ? 'bg-accent/20 text-accent hover:bg-accent/30'
                        : 'text-muted/50 hover:text-accent hover:bg-surface2'
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Question Text (clean Inter font-sans for modern editorial aesthetic) */}
                <h3 className="font-sans text-base leading-relaxed text-text font-normal mb-4">
                  "{q.question}"
                </h3>
              </div>

              <div>
                {/* Expand / Collapse Answer trigger */}
                <button
                  type="button"
                  onClick={() => setActiveQuestionId(isOpen ? null : q.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between text-xs font-medium text-muted hover:text-accent transition-colors pt-3 border-t border-line/60"
                >
                  <span>{isOpen ? 'Close Reflection' : hasAnswer ? 'Edit Reflection' : 'Reflect on This'}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90 text-accent' : ''}`} />
                </button>

                {/* Answer Area */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3 pt-2"
                    >
                      <textarea
                        rows={4}
                        value={currentAnswer}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Write your reflection here… your words autosave quietly."
                        aria-label={`Reflection for: ${q.question}`}
                        className="w-full rounded-xl border border-line bg-ink/50 p-3 text-xs leading-relaxed text-text placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none transition-colors"
                      />
                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-muted">
                        <span>{isSavingRef.current[q.id] ? 'Saving…' : hasAnswer ? 'Saved to your universe' : 'Autosaves as you type'}</span>
                        <span>{currentAnswer.length} chars</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Past Answered Reflections Archive */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            className="mt-8 rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-md"
          >
            <h4 className="font-display text-lg text-text font-semibold mb-4 flex items-center justify-between">
              <span>Historical Reflections</span>
              <span className="font-mono text-xs font-normal text-muted">{answeredHistory.length} recorded</span>
            </h4>
            <div className="divide-y divide-line">
              {answeredHistory.map(item => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold">{item.category}</span>
                    <span className="text-[10px] font-mono text-muted">{item.date}</span>
                  </div>
                  <p className="font-sans text-sm text-text font-medium mb-2 leading-relaxed">"{item.question}"</p>
                  <p className="text-xs text-muted/90 leading-relaxed bg-ink/40 rounded-xl p-3 border border-line/40">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Question Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-text">Add Custom Reflection Prompt</h3>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomQuestion}>
                <div className="mb-4">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">Category or Theme</label>
                  <input
                    type="text"
                    value={customCategoryText}
                    onChange={(e) => setCustomCategoryText(e.target.value)}
                    placeholder="e.g. Creative Work, Personal Wisdom"
                    className="w-full rounded-xl border border-line bg-ink/50 px-3.5 py-2.5 text-xs text-text placeholder:text-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="mb-5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">Inquiry Question</label>
                  <textarea
                    rows={3}
                    value={customQuestionText}
                    onChange={(e) => setCustomQuestionText(e.target.value)}
                    placeholder="What question would challenge or center you today?"
                    required
                    className="w-full rounded-xl border border-line bg-ink/50 p-3.5 text-xs text-text placeholder:text-muted/60 focus:border-accent focus:outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-accent text-ink px-5 py-2 text-xs font-semibold hover:bg-accent/90 transition"
                  >
                    Add to The Oracle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
