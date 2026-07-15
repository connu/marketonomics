import type { QuoteData } from '../app/api/quote/[symbol]/route'
import type { HistoryPoint } from '../app/api/history/[symbol]/route'
import type { SearchResult } from '../app/api/search/route'

export type { QuoteData, HistoryPoint, SearchResult }

export async function searchTickers(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? []
}

export async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchHistory(
  symbol: string,
  range = '1y',
  interval?: '1d' | '1wk' | '1mo'
): Promise<HistoryPoint[]> {
  const qs = `range=${range}` + (interval ? `&interval=${interval}` : '')
  const res = await fetch(`/api/history/${encodeURIComponent(symbol)}?${qs}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.points ?? []
}
