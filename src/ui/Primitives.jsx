import { BookOpen, Plus } from '../components/Icons';

const buttonStyles = {
  primary: 'rounded-full bg-accent text-ink hover:bg-accent/90 shadow-sm',
  secondary: 'rounded-full border border-line text-text hover:border-accent/40 hover:text-accent',
  quiet: 'text-muted hover:text-text',
};

export function Button({
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${buttonStyles[variant]} ${className}`}
    >
      {children}
      {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
    </button>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full border-0 border-b border-line bg-transparent px-0 py-2.5 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none ${className}`}
    />
  );
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`bg-line/40 ${className}`} />;
}

export function EmptyState({
  Icon = BookOpen,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <Icon className="mb-4 h-10 w-10 text-muted opacity-20" />
      <h2 className="font-display text-xl font-bold tracking-tight text-text">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6 px-5">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </section>
  );
}

export function ErrorState({ message, onRetry, retryLabel = 'Retry' }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-t border-line py-3 text-sm text-muted">
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && <Button variant="quiet" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}
