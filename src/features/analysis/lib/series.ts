// Shared series helpers for the Comparative Analysis surface.

export interface SeriesInfo {
  id: string
  label: string
  unit: string
  values: number[]
  color: string
}

// Keep only index pairs where both series have finite values, so stats
// (Pearson, regression, cross-correlation) work for series with partial history.
export function finitePairs(a: number[], b: number[]): [number[], number[]] {
  const xs: number[] = []
  const ys: number[] = []
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) {
      xs.push(a[i])
      ys.push(b[i])
    }
  }
  return [xs, ys]
}

/** SVG ids must not contain symbol characters like ^ or : */
export function svgId(prefix: string, raw: string): string {
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}
