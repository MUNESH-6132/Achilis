import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAchilles } from '../context/AchillesContext';
import { useAuth } from '../context/AuthContext';
import { MOTION, useReduceMotion } from '../ui/motion';
import { Modal } from './Modal';
import { LogOut, Palette, Settings as SettingsIcon } from './Icons';

const THEME_NAMES = {
  dark: 'Dark',
  light: 'Light',
};

export function UserMenu({ onSettings, onCycleTheme, onCreateAccount, onOpenChange, theme, mobile = false }) {
  const { cloudSyncStatus, hasPendingSync, syncNow } = useAchilles();
  const { exitDemo, isDemo, signOut, user } = useAuth();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const rootRef = useRef(null);
  const avatarRef = useRef(null);
  const menuRef = useRef(null);

  const email = user?.email || '';
  const displayName = isDemo
    ? 'Demo Reader'
    : user?.user_metadata?.full_name?.trim() || email || 'Account';
  const initial = displayName[0]?.toUpperCase() || '?';
  const menuItems = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])];

  const setMenuOpen = nextValue => {
    const next = typeof nextValue === 'function' ? nextValue(open) : nextValue;
    if (next === open) return;
    setOpen(next);
    setError('');
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
    const handlePointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onOpenChange, open]);

  const handleMenuKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(false);
      avatarRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      if (!mobile) return;
      const items = menuItems();
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement);
      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && currentIndex === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = menuItems();
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex;
    if (currentIndex < 0) nextIndex = event.key === 'ArrowUp' ? items.length - 1 : 0;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    else nextIndex = (currentIndex - 1 + items.length) % items.length;
    items[nextIndex].focus();
  };

  const performSignOut = async inDialog => {
    setSigningOut(true);
    setError('');
    setSyncError('');
    try {
      await signOut();
      setSyncDialogOpen(false);
      setMenuOpen(false);
      return true;
    } catch (signOutError) {
      const message = signOutError?.message || 'Could not sign out. Please try again.';
      if (inDialog) setSyncError(message);
      else setError(message);
      return false;
    } finally {
      setSigningOut(false);
    }
  };

  const handleDemoExit = createAccount => {
    try {
      if (createAccount) onCreateAccount?.();
      else exitDemo();
    } catch (demoError) {
      setError(demoError?.message || 'Could not leave demo mode. Please try again.');
    }
  };

  const handleSignOut = async () => {
    setError('');
    if (isDemo) {
      handleDemoExit(false);
      return;
    }
    if (hasPendingSync) {
      setSyncError('');
      setSyncDialogOpen(true);
      return;
    }
    await performSignOut(false);
  };

  const handleSyncAndSignOut = async () => {
    setSyncBusy(true);
    setSyncError('');
    try {
      const result = await syncNow();
      if (result.failedMediaCount) {
        setSyncError('Some diary media could not be uploaded. Sync is incomplete; retry or sign out anyway.');
        return;
      }
      await performSignOut(true);
    } catch (syncIssue) {
      setSyncError(syncIssue?.message || 'Sync failed. Your changes remain saved locally.');
    } finally {
      setSyncBusy(false);
    }
  };

  const itemClass = 'flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-white/85 hover:bg-surface2 hover:text-white focus-visible:bg-surface2';
  const menuContent = (
    <>
      <div className="border-b border-line px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{isDemo ? 'Demo mode' : 'Signed in'}</p>
        <p className="mt-1 truncate text-sm font-medium text-white" title={displayName}>{displayName}</p>
        <p className="mt-0.5 truncate text-xs text-muted" title={isDemo ? 'Sample data only' : email}>
          {isDemo ? 'Sample data only' : email}
        </p>
      </div>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setMenuOpen(false);
          onSettings();
        }}
        className={`${itemClass} mt-2`}
      >
        <SettingsIcon className="h-4 w-4 shrink-0 text-muted" />
        Settings
      </button>
      <button type="button" role="menuitem" onClick={onCycleTheme} className={itemClass}>
        <Palette className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate">Theme · {THEME_NAMES[theme] || theme}</span>
      </button>
      <div role="separator" className="my-2 border-t border-line" />
      {error && <p role="alert" className="mx-3 mb-2 text-xs text-muted">{error}</p>}
      {isDemo ? (
        <>
          <button type="button" role="menuitem" onClick={() => handleDemoExit(false)} className={itemClass}>
            <LogOut className="h-4 w-4 shrink-0 text-muted" />
            Exit demo
          </button>
          <button type="button" role="menuitem" onClick={() => handleDemoExit(true)} className={itemClass}>
            <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center text-muted">+</span>
            Create account
          </button>
        </>
      ) : (
        <button type="button" role="menuitem" onClick={() => void handleSignOut()} disabled={signingOut} className={`${itemClass} disabled:cursor-wait disabled:opacity-60`}>
          <LogOut className="h-4 w-4 shrink-0 text-muted" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      )}
    </>
  );

  return (
    <div ref={rootRef} className={`relative ${mobile ? '' : 'z-[60]'}`}>
      <button
        ref={avatarRef}
        type="button"
        onClick={() => setMenuOpen(value => !value)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={mobile ? 'mobile-account-menu' : 'desktop-account-menu'}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-accent/50 font-display text-sm font-semibold text-text hover:bg-surface2 transition-colors"
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && !mobile && (
          <motion.div
            ref={menuRef}
            id="desktop-account-menu"
            role="menu"
            aria-label="Account options"
            onKeyDown={handleMenuKeyDown}
            onBlur={event => {
              if (!rootRef.current?.contains(event.relatedTarget)) setMenuOpen(false);
            }}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduceMotion ? 0.01 : MOTION.fast / 1000, ease: MOTION.easeOut }}
            className="absolute right-0 top-[calc(100%+0.75rem)] z-[80] hidden w-72 bg-surface p-2 shadow-2xl md:block"
          >
            {menuContent}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && mobile && (
          <div className="fixed inset-0 z-[65] md:hidden">
            <motion.button
              type="button"
              aria-label="Close account menu"
              onClick={() => {
                setMenuOpen(false);
                avatarRef.current?.focus();
              }}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : MOTION.fast / 1000 }}
              className="absolute inset-0 h-full w-full bg-black/60"
            />
            <motion.div
              ref={menuRef}
              id="mobile-account-menu"
              role="menu"
              aria-label="Account options"
              onKeyDown={handleMenuKeyDown}
              onBlur={event => {
                if (!rootRef.current?.contains(event.relatedTarget)) setMenuOpen(false);
              }}
              initial={reduceMotion ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: reduceMotion ? 0.01 : MOTION.menuTransition / 1000, ease: MOTION.easeOut }}
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" aria-hidden="true" />
              {menuContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {syncDialogOpen && (
        <Modal onClose={() => setSyncDialogOpen(false)} title="Sync before signing out">
          <div className="p-6 sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Account</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Changes may not be synced</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sync your latest changes before signing out, or continue and keep them saved on this device.
            </p>
            {cloudSyncStatus === 'offline' && (
              <p className="mt-3 border-l-2 border-line pl-3 text-xs leading-relaxed text-muted">
                You appear to be offline. Sync may fail; your local data will remain available.
              </p>
            )}
            {syncError && <p role="alert" className="mt-3 text-xs text-muted">{syncError}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleSyncAndSignOut()}
                disabled={syncBusy || signingOut}
                autoFocus={cloudSyncStatus !== 'offline'}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-60"
              >
                {syncBusy ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                onClick={() => void performSignOut(true)}
                disabled={signingOut || syncBusy}
                className="inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-surface2 disabled:opacity-60"
              >
                Sign out anyway
              </button>
              <button
                type="button"
                onClick={() => setSyncDialogOpen(false)}
                autoFocus={cloudSyncStatus === 'offline'}
                className="inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface2 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
