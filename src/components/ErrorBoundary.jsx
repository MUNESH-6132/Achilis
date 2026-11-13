import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-6 text-center text-white">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold">Something went wrong</h1>
          <p className="mb-6 max-w-md text-muted">A component crashed, but your data is safe. Please refresh the page to try again.</p>
          <button onClick={() => window.location.reload()} className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-ink hover:bg-accent/90">
            Refresh App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
