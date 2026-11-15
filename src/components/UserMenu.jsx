import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon } from './Icons';

export function UserMenu({ onSettings }) {
  const { exitDemo, isDemo, signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef(null);
  const email = user?.email || '';
  const initial = (isDemo ? 'D' : user?.user_metadata?.full_name?.trim()?.[0] || email[0] || '?').toUpperCase();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError('');
    try {
      if (isDemo) exitDemo();
      else await signOut();
      setOpen(false);
    } catch (signOutError) {
      setError(signOutError?.message || 'Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(value => !value); setError(''); }}
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full border border-accent/40 bg-accent font-display text-sm font-black text-ink shadow-[0_8px_24px_-12px_rgb(var(--c-accent))] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+0.65rem)] z-[70] w-72 origin-top-right rounded-2xl border border-white/10 bg-surface/80 p-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="border-b border-white/10 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{isDemo ? 'Sample session' : 'Signed in as'}</p>
              <p className="mt-1 break-all text-sm font-medium text-white" title={email}>{isDemo ? 'Demo Reader · sample data only' : email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
              className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85 transition hover:bg-white/[0.07] hover:text-white"
            >
              <SettingsIcon className="h-4 w-4 text-muted" />
              Settings
            </button>
            {error && <p role="alert" className="mx-3 mt-2 text-xs text-red-300">{error}</p>}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-red-400/10 hover:text-red-200 disabled:cursor-wait disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3" />
                <path d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
              </svg>
              {signingOut ? (isDemo ? 'Leaving demo…' : 'Signing out…') : isDemo ? 'Exit Demo' : 'Sign Out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
