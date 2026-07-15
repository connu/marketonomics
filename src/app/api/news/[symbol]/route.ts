import { NextRequest, NextResponse } from 'next/server'
import { parseRss, type RssItem } from '../../../../features/news/lib/parseRss'

export type NewsItem = RssItem

export interface NewsResponse {
  symbol: string
  items: NewsItem[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const url =
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}` +
    `&region=US&lang=en-US`

  // News is decorative — soft-fail to an empty list instead of erroring the page.
  const empty: NewsResponse = { symbol, items: [] }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 },
    })
    if (!res.ok) return NextResponse.json(empty)
    const xml = await res.text()
    if (!xml.includes('<item')) return NextResponse.json(empty)
    return NextResponse.json({ symbol, items: parseRss(xml) } satisfies NewsResponse)
  } catch {
    return NextResponse.json(empty)
  }
}
