// Shareable-URL helpers. Pages read query params once on mount (both analysis
// pages are fully client-rendered, so this avoids the useSearchParams Suspense
// requirement) and write via history.replaceState to skip re-render churn.

export function readUrlParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

/** Merge params into the current URL; null/empty removes the key. */
export function writeUrlParams(params: Record<string, string | null>): void {
  if (typeof window === 'undefined') return
  const sp = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === '') sp.delete(key)
    else sp.set(key, value)
  }
  const qs = sp.toString()
  window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
}
