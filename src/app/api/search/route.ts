import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  symbol: string
  shortname: string
  longname: string
  exchange: string
  quoteType: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 1) {
    return NextResponse.json({ results: [] })
  }

  const url =
    `https://query1.finance.yahoo.com/v1/finance/search` +
    `?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Search failed' }, { status: res.status })
  }

  const data = await res.json()
  // Yahoo can return the same symbol on multiple exchanges; symbol is the
  // app-wide identity (React keys, quote lookups), so keep only the first hit.
  const seen = new Set<string>()
  const quotes: SearchResult[] = (data?.quotes ?? [])
    .filter((q: Record<string, unknown>) => {
      if (q.quoteType !== 'EQUITY' && q.quoteType !== 'ETF' && q.quoteType !== 'INDEX') return false
      if (typeof q.symbol !== 'string' || seen.has(q.symbol)) return false
      seen.add(q.symbol)
      return true
    })
    .map((q: Record<string, unknown>) => ({
      symbol: q.symbol,
      shortname: q.shortname ?? q.symbol,
      longname: q.longname ?? q.shortname ?? q.symbol,
      exchange: q.exchange,
      quoteType: q.quoteType,
    }))

  return NextResponse.json({ results: quotes })
}
