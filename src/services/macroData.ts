import type { MacroPoint, MacroSeriesResponse } from '../app/api/macro/[series]/route'

export type { MacroPoint, MacroSeriesResponse }

export async function fetchMacroSeries(
  id: string,
  start?: string
): Promise<MacroSeriesResponse | null> {
  const qs = start ? `?start=${encodeURIComponent(start)}` : ''
  const res = await fetch(`/api/macro/${encodeURIComponent(id)}${qs}`)
  if (!res.ok) return null
  return res.json()
}
