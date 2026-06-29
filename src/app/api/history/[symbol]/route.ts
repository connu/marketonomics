import { NextRequest, NextResponse } from 'next/server'

export interface HistoryPoint {
  timestamp: number
  date: string
  close: number
  open: number
  high: number
  low: number
  volume: number
}

const VALID_RANGES = ['1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'] as const
type Range = (typeof VALID_RANGES)[number]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const rangeParam = req.nextUrl.searchParams.get('range') ?? '1y'
  const range: Range = VALID_RANGES.includes(rangeParam as Range)
    ? (rangeParam as Range)
    : '1y'

  const interval = range === '1mo' ? '1d' : range === '3mo' ? '1d' : range === 'max' ? '1mo' : '1wk'

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'History fetch failed' }, { status: res.status })
  }

  const data = await res.json()
  const result = data?.chart?.result?.[0]

  if (!result) {
    return NextResponse.json({ error: 'No data' }, { status: 404 })
  }

  const timestamps: number[] = result.timestamp ?? []
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? []
  const opens: number[] = result.indicators?.quote?.[0]?.open ?? []
  const highs: number[] = result.indicators?.quote?.[0]?.high ?? []
  const lows: number[] = result.indicators?.quote?.[0]?.low ?? []
  const volumes: number[] = result.indicators?.quote?.[0]?.volume ?? []

  const points: HistoryPoint[] = timestamps
    .map((ts, i) => ({
      timestamp: ts,
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i],
      open: opens[i],
      high: highs[i],
      low: lows[i],
      volume: volumes[i],
    }))
    .filter((p) => p.close != null)

  return NextResponse.json({ symbol, range, points })
}
