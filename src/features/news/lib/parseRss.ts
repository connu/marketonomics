// Minimal RSS 2.0 parsing — DOMParser doesn't exist in the route-handler
// runtime, and the Yahoo feed is simple enough that a targeted extractor
// beats pulling in an XML dependency.

export interface RssItem {
  title: string
  link: string
  /** ISO timestamp (empty string when the feed omits pubDate) */
  pubDate: string
  summary: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  let content = m[1].trim()
  const cdata = content.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  if (cdata) content = cdata[1].trim()
  // Strip any residual markup (descriptions sometimes embed HTML)
  return decodeEntities(content.replace(/<[^>]+>/g, '')).trim()
}

export function parseRss(xml: string, maxItems = 15): RssItem[] {
  const items: RssItem[] = []
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
  for (const block of blocks) {
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    if (!title || !link.startsWith('http')) continue
    const rawDate = extractTag(block, 'pubDate')
    const parsed = Date.parse(rawDate)
    items.push({
      title,
      link,
      pubDate: Number.isFinite(parsed) ? new Date(parsed).toISOString() : '',
      summary: extractTag(block, 'description').slice(0, 300),
    })
    if (items.length >= maxItems) break
  }
  return items
}
