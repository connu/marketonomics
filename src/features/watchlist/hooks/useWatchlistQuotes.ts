'use client'

import { useCallback, useState } from 'react'
import { fetchQuote, fetchHistory, type QuoteData } from '../../../services/marketData'
import { useVisiblePolling } from '../../../utils/useVisiblePolling'

// 3-month sparkline closes, fetched once per symbol per session.
const sparkCache = new Map<string, number[]>()

export function useWatchlistQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({})
  const [sparks, setSparks] = useState<Record<string, number[]>>({})

  const key = symbols.join(',')

  const tick = useCallback(() => {
    const syms = key ? key.split(',') : []
    if (!syms.length) return
    void Promise.allSettled(syms.map(s => fetchQuote(s))).then(results => {
      setQuotes(prev => {
        const next = { ...prev }
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) next[syms[i]] = r.value
        })
        return next
      })
    })
    // Sparklines: only fetch what we don't have yet
    const missing = syms.filter(s => !sparkCache.has(s))
    if (missing.length) {
      void Promise.allSettled(missing.map(s => fetchHistory(s, '3mo'))).then(results => {
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value.length) {
            sparkCache.set(missing[i], r.value.map(p => p.close))
          }
        })
        setSparks(() => {
          const next: Record<string, number[]> = {}
          sparkCache.forEach((v, k) => { next[k] = v })
          return next
        })
      })
    }
  }, [key])

  useVisiblePolling(tick, 60_000)

  return { quotes, sparks }
}
