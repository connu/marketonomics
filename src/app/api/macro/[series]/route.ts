import { NextRequest, NextResponse } from 'next/server'
import { getMacroDef } from '../../../../features/macro/catalog'

export interface MacroPoint {
  /** YYYY-MM-DD */
  date: string
  value: number
}

export interface MacroSeriesResponse {
  series: string
  label: string
  unit: string
  frequency: string
  points: MacroPoint[]
}

// FRED's CSV export marks missing observations with "." and has used both
// "DATE" and "observation_date" as the date column header over time.
function parseFredCsv(csv: string): MacroPoint[] {
  const lines = csv.split('\n')
  const points: MacroPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const comma = line.indexOf(',')
    if (comma === -1) continue
    const date = line.slice(0, comma).trim()
    const raw = line.slice(comma + 1).trim()
    if (raw === '.' || raw === '') continue
    const value = Number(raw)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value)) continue
    points.push({ date, value })
  }
  return points
}

interface FredObservation { date: string; value: string }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ series: string }> }
) {
  const { series } = await params
  const def = getMacroDef(series)
  if (!def) {
    return NextResponse.json({ error: 'Unknown macro series' }, { status: 400 })
  }

  const start = req.nextUrl.searchParams.get('start')
  const startDate = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : null
  const apiKey = process.env.FRED_API_KEY

  let points: MacroPoint[]

  if (apiKey) {
    // Optional upgrade path: official FRED API (free key, higher reliability).
    const url =
      `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(def.id)}` +
      `&api_key=${apiKey}&file_type=json` +
      (startDate ? `&observation_start=${startDate}` : '')
    const res = await fetch(url, { next: { revalidate: 21600 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Macro fetch failed' }, { status: 502 })
    }
    const data = await res.json()
    const obs: FredObservation[] = data?.observations ?? []
    points = obs
      .filter(o => o.value !== '.' && Number.isFinite(Number(o.value)))
      .map(o => ({ date: o.date, value: Number(o.value) }))
  } else {
    // Keyless path: FRED's public CSV export.
    const url =
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(def.id)}` +
      (startDate ? `&cosd=${startDate}` : '')
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 21600 },
    })
    const contentType = res.headers.get('content-type') ?? ''
    // FRED returns an HTML error page (status 200) for bad ids — reject non-CSV.
    if (!res.ok || !contentType.includes('csv')) {
      return NextResponse.json({ error: 'Macro fetch failed' }, { status: 502 })
    }
    points = parseFredCsv(await res.text())
  }

  if (!points.length) {
    return NextResponse.json({ error: 'No data' }, { status: 404 })
  }

  const body: MacroSeriesResponse = {
    series: def.id,
    label: def.label,
    unit: def.unit,
    frequency: def.frequency,
    points,
  }
  return NextResponse.json(body)
}
