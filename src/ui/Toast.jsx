export function Toast({ message, actionLabel, onAction, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role={actionLabel ? 'alert' : 'status'}
      aria-live={actionLabel ? 'assertive' : 'polite'}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[110] flex w-[min(90vw,32rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3 text-sm text-white md:bottom-6"
    >
      <span className="min-w-0">{message}</span>
      {actionLabel && (
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onAction} className="min-h-11 rounded-lg px-3 font-semibold text-accent hover:bg-surface2">
            {actionLabel}
          </button>
          <button type="button" onClick={onDismiss} aria-label="Dismiss and delete" className="min-h-11 rounded-lg px-2 text-muted hover:bg-surface2 hover:text-white">
            Ignore
          </button>
        </div>
      )}
    </div>
  );
}
