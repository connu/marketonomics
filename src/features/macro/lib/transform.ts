// Pure transforms for FRED macro series.

import type { MacroPoint } from '../../../services/macroData'

/**
 * Year-over-year % change. Matches each observation with the one closest to
 * 365 days earlier, so it works for monthly, weekly, and daily series alike.
 */
export function toYoY(points: MacroPoint[]): MacroPoint[] {
  const out: MacroPoint[] = []
  let j = 0
  for (let i = 0; i < points.length; i++) {
    const t = Date.parse(points[i].date) - 365 * 86_400_000
    while (j + 1 < points.length && Math.abs(Date.parse(points[j + 1].date) - t) <= Math.abs(Date.parse(points[j].date) - t)) j++
    const base = points[j]
    // Require the base observation to actually be ~a year back (±45 days)
    if (base.value !== 0 && Math.abs(Date.parse(base.date) - t) <= 45 * 86_400_000 && Date.parse(base.date) < Date.parse(points[i].date)) {
      out.push({ date: points[i].date, value: ((points[i].value - base.value) / Math.abs(base.value)) * 100 })
    }
  }
  return out
}

/** Last observation per calendar year — feeds directly into toFactorYearValues. */
export function toAnnual(points: MacroPoint[]): { year: number; close: number }[] {
  const byYear: Record<number, number> = {}
  for (const p of points) {
    byYear[Number(p.date.slice(0, 4))] = p.value
  }
  return Object.entries(byYear)
    .map(([y, v]) => ({ year: Number(y), close: v }))
    .sort((a, b) => a.year - b.year)
}

/** Keep only observations from the last `years` calendar years (0 = all). */
export function sliceYears(points: MacroPoint[], years: number): MacroPoint[] {
  if (!years || !points.length) return points
  const cutoff = Date.parse(points[points.length - 1].date) - years * 365.25 * 86_400_000
  return points.filter(p => Date.parse(p.date) >= cutoff)
}
