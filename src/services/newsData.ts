import type { NewsItem, NewsResponse } from '../app/api/news/[symbol]/route'

export type { NewsItem, NewsResponse }

export async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const res = await fetch(`/api/news/${encodeURIComponent(symbol)}`)
  if (!res.ok) return []
  const data: NewsResponse = await res.json()
  return data.items ?? []
}
