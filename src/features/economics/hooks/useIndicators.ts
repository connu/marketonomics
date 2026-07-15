'use client'

import { useState, useEffect, useCallback } from 'react'
import { INDICATORS, IndicatorQuote } from '../types/indicator'
import { fetchQuote, fetchHistory, HistoryPoint } from '../../../services/marketData'
import { useVisiblePolling } from '../../../utils/useVisiblePolling'

export interface UseIndicatorsReturn {
  quotes: Record<string, IndicatorQuote>
  loading: boolean
  lastUpdated: Date | null
  refresh: () => void
}

async function fetchAllQuotes(): Promise<Record<string, IndicatorQuote>> {
  const results = await Promise.allSettled(
    INDICATORS.map(async ({ symbol }) => {
      const q = await fetchQuote(symbol)
      if (!q) return null
      return {
        symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
        previousClose: q.regularMarketPreviousClose,
      } satisfies IndicatorQuote
    })
  )

  const map: Record<string, IndicatorQuote> = {}
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      map[INDICATORS[i].symbol] = r.value
    }
  })
  return map
}

export function useIndicators(): UseIndicatorsReturn {
  const [quotes, setQuotes] = useState<Record<string, IndicatorQuote>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const applyQuotes = useCallback((data: Record<string, IndicatorQuote>) => {
    setQuotes(data)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  // `loading` starts true and only manual refresh() re-arms it, so the 60s
  // interval updates prices without flashing the loading state.
  const refresh = useCallback(() => {
    setLoading(true)
    void fetchAllQuotes().then(applyQuotes)
  }, [applyQuotes])

  // 60s polling that pauses while the tab is hidden (no wasted requests) and
  // refreshes immediately when it becomes visible again.
  useVisiblePolling(
    useCallback(() => void fetchAllQuotes().then(applyQuotes), [applyQuotes]),
    60_000
  )

  return { quotes, loading, lastUpdated, refresh }
}

export function useIndicatorHistory(symbol: string, range: string) {
  // `loading` is derived (fetched key lags the requested one) instead of being
  // reset inside the effect; previous points stay visible while the next
  // range loads, matching the prior behavior.
  const [result, setResult] = useState<{ key: string; points: HistoryPoint[] }>({
    key: '',
    points: [],
  })

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    fetchHistory(symbol, range).then((pts) => {
      if (!cancelled) setResult({ key: `${symbol}|${range}`, points: pts })
    })
    return () => {
      cancelled = true
    }
  }, [symbol, range])

  const loading = Boolean(symbol) && result.key !== `${symbol}|${range}`
  return { history: result.points, loading }
}
