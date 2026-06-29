'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { INDICATORS, IndicatorQuote } from '../types/indicator'
import { fetchQuote, fetchHistory, HistoryPoint } from '../../../services/marketData'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await fetchAllQuotes()
    setQuotes(data)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    intervalRef.current = setInterval(refresh, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  return { quotes, loading, lastUpdated, refresh }
}

export function useIndicatorHistory(symbol: string, range: string) {
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    fetchHistory(symbol, range).then((pts) => {
      setHistory(pts)
      setLoading(false)
    })
  }, [symbol, range])

  return { history, loading }
}
