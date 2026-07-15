'use client'

import { useEffect, useState } from 'react'
import { fetchMacroSeries, type MacroPoint } from '../../../services/macroData'

// Series are small (decades of monthly data ≈ a few hundred points), so each
// one is fetched once and cached for the session; range/YoY views slice locally.
const cache = new Map<string, MacroPoint[]>()

interface SeriesState {
  key: string
  points: MacroPoint[]
  error: string | null
}

export function useMacroSeries(id: string) {
  // `loading` is derived (fetched key lags the requested id), matching the
  // useIndicatorHistory pattern — no synchronous setState in the effect.
  const [result, setResult] = useState<SeriesState>({ key: '', points: [], error: null })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async (): Promise<MacroPoint[] | null> => {
      const cached = cache.get(id)
      if (cached) return cached
      const res = await fetchMacroSeries(id)
      if (!res || !res.points.length) return null
      cache.set(id, res.points)
      return res.points
    }
    load()
      .then(points => {
        if (cancelled) return
        if (points) setResult({ key: id, points, error: null })
        else setResult({ key: id, points: [], error: 'Could not load series' })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: id, points: [], error: 'Could not load series' })
      })
    return () => { cancelled = true }
  }, [id])

  const current = result.key === id
  return {
    points: current ? result.points : [],
    loading: Boolean(id) && !current,
    error: current ? result.error : null,
  }
}
