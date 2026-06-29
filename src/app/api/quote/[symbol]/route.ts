import { NextRequest, NextResponse } from 'next/server'

export interface QuoteData {
  symbol: string
  shortName: string
  longName: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketPreviousClose: number
  currency: string
  exchange: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=1d&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Quote fetch failed' }, { status: res.status })
  }

  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta

  if (!meta) {
    return NextResponse.json({ error: 'No data' }, { status: 404 })
  }

  const quote: QuoteData = {
    symbol: meta.symbol,
    shortName: meta.shortName ?? meta.symbol,
    longName: meta.longName ?? meta.shortName ?? meta.symbol,
    regularMarketPrice: meta.regularMarketPrice,
    regularMarketChange: meta.regularMarketPrice - meta.chartPreviousClose,
    regularMarketChangePercent:
      ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
    regularMarketPreviousClose: meta.chartPreviousClose,
    currency: meta.currency,
    exchange: meta.exchangeName,
  }

  return NextResponse.json(quote)
}
