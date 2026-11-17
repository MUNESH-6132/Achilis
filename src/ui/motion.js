import { createContext, useContext } from 'react';
import { useReducedMotion as useSystemReducedMotion } from 'framer-motion';

export const MOTION = Object.freeze({
  instant: 0,
  fast: 150,
  base: 220,
  slow: 600,
  sidebarIntentDelay: 120,
  sidebarDismissDelay: 150,
  sidebarTransition: 200,
  homeEntrance: 220,
  heroCoverDelay: 120,
  homeSequence: 720,
  shelfStagger: 50,
  shelfHover: 150,
  numberEntrance: 300,
  pageEnter: 180,
  pageExit: 100,
  menuTransition: 220,
  easeOut: Object.freeze([0.16, 1, 0.3, 1]),
  softSpring: Object.freeze({ type: 'spring', stiffness: 240, damping: 28, duration: 0.55 }),
});

export const MotionPreferenceContext = createContext(false);

export function useReduceMotion() {
  const systemPreference = useSystemReducedMotion();
  const appPreference = useContext(MotionPreferenceContext);
  return Boolean(systemPreference || appPreference);
}
