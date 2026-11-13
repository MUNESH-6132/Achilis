import React from 'react';

// Base Icon wrapper
export function Icon({ className = "h-4 w-4", children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const Search = ({ className }) => <Icon className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Icon>;
export const Plus = ({ className }) => <Icon className={className}><path d="M12 5v14M5 12h14" /></Icon>;
export const X = ({ className }) => <Icon className={className}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const Grid = ({ className }) => <Icon className={className}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></Icon>;
export const Library = ({ className }) => <Icon className={className}><rect x="3" y="4" width="4.5" height="16" rx="1.5"/><rect x="10" y="4" width="4.5" height="16" rx="1.5"/><path d="m17.4 5.4 4.2 14.2" /></Icon>;
export const Book = ({ className }) => <Icon className={className}><rect x="7" y="4" width="10" height="16" rx="2"/><path d="M3 7v10M21 7v10" /></Icon>;
export const ChevronLeft = ({ className }) => <Icon className={className}><path d="m14 6-6 6 6 6" /></Icon>;
export const ChevronRight = ({ className }) => <Icon className={className}><path d="m10 6 6 6-6 6" /></Icon>;
export const ArrowRight = ({ className }) => <Icon className={className}><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></Icon>;
export const BookOpen = ({ className }) => <Icon className={className}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" /><path d="M20 18v3H6.5" /></Icon>;
export const Edit = ({ className }) => <Icon className={className}><path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z" /><path d="m14 6 3 3" /></Icon>;
export const Lock = ({ className }) => <Icon className={className}><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>;
export const Settings = ({ className }) => <Icon className={className}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1A7.6 7.6 0 0 1 7 13.2l-1.8-.5v-2.8l1.8-.5a7.6 7.6 0 0 1 .3-1.9L5.9 6.4l1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7.6 7.6 0 0 1 .3 1.9l1.8.5v2.8l-1.8.5a7.6 7.6 0 0 1-.3 1.8Z" /></Icon>;
export const Film = ({ className }) => <Icon className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4" /></Icon>;
export const Download = ({ className }) => <Icon className={className}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 20h16" /></Icon>;
export const Upload = ({ className }) => <Icon className={className}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></Icon>;
export const Trash = ({ className }) => <Icon className={className}><path d="M4 7h16" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></Icon>;
export const Flame = ({ className }) => <Icon className={className}><path d="M12 3s4.5 4.2 4.5 8a4.5 4.5 0 0 1-9 0c0-1.4.7-2.6.7-2.6S5.5 11 5.5 14a6.5 6.5 0 0 0 13 0c0-5.4-6.5-11-6.5-11Z" /></Icon>;
export const Clock = ({ className }) => <Icon className={className}><circle cx="12" cy="13" r="8" /><path d="M12 9.5V13l2.5 1.5" /><path d="M9 2h6" /></Icon>;
export const Play = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" fill="currentColor"/></svg>;
export const Pause = ({ className = "h-4 w-4" }) => <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor"/></svg>;
export const Check = ({ className }) => <Icon className={className}><path d="M20 6 9 17l-5-5" /></Icon>;
