import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReduceMotion } from '../ui/motion';

export function Modal({ onClose, children, width = "max-w-2xl", title = "Dialog", mobileSheet = false }) {
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReduceMotion();
  const desktopWidth = {
    'max-w-md': 'md:max-w-md',
    'max-w-lg': 'md:max-w-lg',
    'max-w-2xl': 'md:max-w-2xl',
    'max-w-3xl': 'md:max-w-3xl',
    'max-w-4xl': 'md:max-w-4xl',
  }[width] || 'md:max-w-2xl';
  const panelClass = mobileSheet
    ? `my-auto h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto bg-ink md:my-auto md:h-auto md:min-h-0 md:max-h-[calc(100dvh-3rem)] ${desktopWidth}`
    : `my-auto w-full ${width} bg-ink`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      if (onCloseRef.current() === false) {
        closingRef.current = false;
        setVisible(true);
      }
    }, reduceMotion ? 0 : 180);
  }, [reduceMotion]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const getFocusable = () => [...(dialog?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || [])].filter(element => element.getClientRects().length > 0);
    const initialFocus = dialog?.querySelector('[autofocus]') || getFocusable()[0] || dialog;
    initialFocus?.focus();
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(closeTimerRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [requestClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="modal-backdrop"
          ref={dialogRef}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
          className={`fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/70 ${mobileSheet ? 'items-stretch p-0 md:items-center md:p-6' : 'items-start p-4 sm:items-center sm:p-6'}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) requestClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: 'easeOut' }}
            className={panelClass}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

