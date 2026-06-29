// Data alignment and normalization utilities

import factorsData from '../../../data/factors.json'

export type FactorId = keyof typeof factorsData.factors

export interface FactorMeta {
  id: string
  label: string
  unit: string
  category: string
  description: string
  source?: string
}

export interface AlignedData {
  years: number[]
  stockPrices: number[]
  factorValues: Record<string, number[]>
}

// Extract yearly closes from history points (take last available close of each year)
export function toYearlyPrices(
  historyPoints: { date: string; close: number }[]
): { year: number; close: number }[] {
  const byYear: Record<number, number> = {}
  for (const pt of historyPoints) {
    const year = new Date(pt.date).getFullYear()
    if (pt.close != null) byYear[year] = pt.close
  }
  return Object.entries(byYear)
    .map(([y, c]) => ({ year: Number(y), close: c }))
    .sort((a, b) => a.year - b.year)
}

// Align stock yearly prices with factor data over a common year range
export function alignData(
  stockYearly: { year: number; close: number }[],
  factorIds: string[],
  yearRange: number
): AlignedData {
  const allFactorYears = factorsData.years
  const latestYear = Math.min(
    allFactorYears[allFactorYears.length - 1],
    Math.max(...stockYearly.map(p => p.year))
  )
  const startYear = latestYear - yearRange + 1

  const years: number[] = []
  const stockPrices: number[] = []
  const factorValues: Record<string, number[]> = {}
  for (const id of factorIds) factorValues[id] = []

  const stockMap = Object.fromEntries(stockYearly.map(p => [p.year, p.close]))
  const factorMap = factorsData.factors as Record<string, { values: number[] }>

  for (let y = startYear; y <= latestYear; y++) {
    const fi = allFactorYears.indexOf(y)
    const stockClose = stockMap[y]
    if (fi === -1 || stockClose == null) continue
    years.push(y)
    stockPrices.push(stockClose)
    for (const id of factorIds) {
      factorValues[id].push(factorMap[id]?.values[fi] ?? NaN)
    }
  }

  return { years, stockPrices, factorValues }
}

// Normalize to % change from first value (base = 0%)
export function toPctChange(values: number[]): number[] {
  const base = values[0]
  if (!base || base === 0) return values.map(() => 0)
  return values.map(v => ((v - base) / Math.abs(base)) * 100)
}

// Min-max scale to [0, 100] based on the series' own range
export function minMaxScale(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 50)
  return values.map(v => ((v - min) / (max - min)) * 100)
}

// Z-score normalize
export function zScore(values: number[]): number[] {
  const m = values.reduce((s, v) => s + v, 0) / values.length
  const s = Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length)
  if (s === 0) return values.map(() => 0)
  return values.map(v => (v - m) / s)
}

// Get factor metadata
export function getFactorMeta(id: string): FactorMeta | null {
  const f = (factorsData.factors as Record<string, FactorMeta & { values: number[] }>)[id]
  if (!f) return null
  return { id: f.id, label: f.label, unit: f.unit, category: f.category, description: f.description }
}

export function getAllFactors(): (FactorMeta & { values: number[] })[] {
  return Object.values(factorsData.factors as Record<string, FactorMeta & { values: number[] }>)
}

export const FACTOR_YEARS = factorsData.years

export const CATEGORY_ORDER = ['monetary', 'market', 'commodity', 'tech', 'macro', 'climate'] as const
export const CATEGORY_LABELS: Record<string, string> = {
  monetary: 'Monetary Policy',
  market: 'Market Indices',
  commodity: 'Commodities',
  tech: 'Technology',
  macro: 'Macroeconomic',
  climate: 'Climate',
}
