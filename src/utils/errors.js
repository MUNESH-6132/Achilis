/**
 * Centralized API error humanizer.
 * Returns { message: string, kind: string } for safe, user-friendly UI display.
 * Guarantees that raw JSON blobs or developer stack traces never leak into the UI.
 */
export function humanizeApiError(err) {
  if (!err) {
    return {
      kind: 'unknown',
      message: 'Something went wrong while searching. You can add this title manually.',
    };
  }

  const msg = String(err.message || err || '');

  // Timeout / Aborted
  if (err.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout')) {
    return {
      kind: 'timeout',
      message: 'That took too long. Check your connection and try again.',
    };
  }

  // Offline / Network Failure
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (
    isOffline ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ERR_INTERNET_DISCONNECTED') ||
    msg.includes('Network request failed')
  ) {
    return {
      kind: 'offline',
      message: "You're offline. You can still add items manually — covers will sync when you reconnect.",
    };
  }

  // 429 Rate Limit
  if (err.status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    return {
      kind: 'rate_limit',
      message: 'The library is busy. Wait a few seconds and try again.',
    };
  }

  // 422 Short Query / Open Library 3-character rule
  if (
    err.status === 422 ||
    (msg.includes('422') && (msg.includes('character') || msg.includes('short') || msg.includes('query'))) ||
    msg.includes('at least 3 characters')
  ) {
    return {
      kind: 'short_query',
      message: 'Type at least 3 characters to search.',
    };
  }

  // 5xx Server Error
  if ((err.status >= 500 && err.status < 600) || /50[0-4]/.test(msg)) {
    return {
      kind: 'server',
      message: 'The search service is temporarily down. Try again shortly or add manually.',
    };
  }

  // 404 Not Found
  if (err.status === 404 || msg.includes('404')) {
    return {
      kind: 'not_found',
      message: 'No matching titles found in the public catalogue.',
    };
  }

  return {
    kind: 'unknown',
    message: 'Could not complete the search. You can add this title manually below.',
  };
}
