'use client'

import { useEffect } from 'react'

/**
 * Runs `callback` immediately, then every `intervalMs` — but skips ticks while
 * the tab is hidden and fires a catch-up tick when it becomes visible again, so
 * background tabs don't keep polling the network.
 *
 * `callback` must be memoized (useCallback): it is an effect dependency, so a
 * new identity re-runs the immediate tick and restarts the interval. That's what
 * makes the poll pick up a changed subject — e.g. a watchlist hydrating from
 * localStorage after mount fetches at once rather than waiting a full interval.
 */
export function useVisiblePolling(callback: () => void, intervalMs: number): void {
  useEffect(() => {
    callback()
    const tick = () => {
      if (!document.hidden) callback()
    }
    const id = setInterval(tick, intervalMs)
    const onVisible = () => {
      if (!document.hidden) callback()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [callback, intervalMs])
}
