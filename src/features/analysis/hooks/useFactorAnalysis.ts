'use client'

import { useState, useCallback } from 'react'
import { fetchHistory } from '../../../services/marketData'
import { alignData, toYearlyPrices } from '../lib/normalize'
import type { AlignedData } from '../lib/normalize'
import type { AnalysisResult } from '../lib/math'
import {
  pearsonCorrelation, spearmanCorrelation, crossCorrelation,
  linearRegression, rollingCorrelation, grangerCausality,
  cointegrationTest, monteCarlo, elasticityAnalysis, mutualInformation,
} from '../lib/math'

export type MethodId =
  | 'pearson' | 'spearman' | 'crossCorrelation'
  | 'linearRegression' | 'rollingCorrelation' | 'granger'
  | 'cointegration' | 'monteCarlo' | 'elasticity' | 'mutualInfo'

export const METHOD_LABELS: Record<MethodId, string> = {
  pearson: 'Pearson r',
  spearman: 'Spearman ρ',
  crossCorrelation: 'Cross-Correlation',
  linearRegression: 'Linear Regression',
  rollingCorrelation: 'Rolling Correlation',
  granger: 'Granger Causality',
  cointegration: 'Cointegration',
  monteCarlo: 'Monte Carlo',
  elasticity: 'Elasticity',
  mutualInfo: 'Mutual Information',
}

// Raw values only — chart component handles normalization based on display mode
export interface ChartSeries {
  years: number[]
  stockRaw: number[]
  factorRaw: Record<string, number[]>
}

export interface AnalysisState {
  symbol: string
  companyName: string
  chartSeries: ChartSeries | null
  aligned: AlignedData | null
  // Cached yearly prices so factor/range changes don't re-fetch
  yearlyPrices: { year: number; close: number }[]
  loading: boolean
  error: string | null
  selectedFactors: string[]
  yearRange: number
  activeMethod: MethodId
  results: Record<string, AnalysisResult>
}

const INITIAL: AnalysisState = {
  symbol: '',
  companyName: '',
  chartSeries: null,
  aligned: null,
  yearlyPrices: [],
  loading: false,
  error: null,
  selectedFactors: [],
  yearRange: 10,
  activeMethod: 'pearson',
  results: {},
}

/** `initial` seeds state on first render (e.g. from shareable URL params). */
export function useFactorAnalysis(initial?: Partial<Pick<AnalysisState, 'selectedFactors' | 'yearRange'>>) {
  const [state, setState] = useState<AnalysisState>(() => ({ ...INITIAL, ...initial }))

  // Only called once when user clicks "Load Chart" — fetches and caches yearly prices
  const loadStock = useCallback(async (symbol: string, name: string, yearRange: number, selectedFactors: string[]) => {
    setState(s => ({ ...s, loading: true, error: null, chartSeries: null, aligned: null, results: {} }))
    try {
      const pts = await fetchHistory(symbol, 'max')
      if (!pts.length) throw new Error('No historical data found')
      const yearly = toYearlyPrices(pts)
      const aligned = alignData(yearly, selectedFactors, yearRange)
      setState(s => ({
        ...s,
        symbol,
        companyName: name,
        yearlyPrices: yearly,
        chartSeries: buildChart(aligned),
        aligned,
        loading: false,
      }))
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Failed to load' }))
    }
  }, [])

  // Re-align from cached yearly prices — no network call
  const realign = useCallback((
    yearly: { year: number; close: number }[],
    factors: string[],
    yearRange: number
  ) => {
    const aligned = alignData(yearly, factors, yearRange)
    setState(s => ({
      ...s,
      aligned,
      chartSeries: buildChart(aligned),
      results: {},
    }))
  }, [])

  const toggleFactor = useCallback((factorId: string) => {
    setState(s => {
      const next = s.selectedFactors.includes(factorId)
        ? s.selectedFactors.filter(f => f !== factorId)
        : [...s.selectedFactors, factorId]
      return { ...s, selectedFactors: next, results: {} }
    })
  }, [])

  const runAnalysis = useCallback((aligned: AlignedData, factorId: string, method: MethodId): AnalysisResult => {
    const x = aligned.factorValues[factorId]
    const y = aligned.stockPrices
    const years = aligned.years
    if (!x || x.length < 4) return pearsonCorrelation([0], [0])
    switch (method) {
      case 'pearson': return pearsonCorrelation(x, y)
      case 'spearman': return spearmanCorrelation(x, y)
      case 'crossCorrelation': return crossCorrelation(x, y, Math.min(5, Math.floor(x.length / 3)))
      case 'linearRegression': return linearRegression(x, y)
      case 'rollingCorrelation': return rollingCorrelation(x, y, years, Math.min(5, Math.floor(x.length / 2)))
      case 'granger': return grangerCausality(x, y, Math.min(2, Math.floor(x.length / 5)))
      case 'cointegration': return cointegrationTest(x, y)
      case 'monteCarlo': return monteCarlo(y, 500, Math.min(10, Math.max(3, Math.floor(x.length / 2))))
      case 'elasticity': return elasticityAnalysis(x, y, years)
      case 'mutualInfo': return mutualInformation(x, y, Math.min(5, Math.floor(Math.sqrt(x.length))))
    }
  }, [])

  const computeResults = useCallback((method: MethodId) => {
    setState(s => {
      if (!s.aligned || !s.selectedFactors.length) return { ...s, activeMethod: method }
      const results: Record<string, AnalysisResult> = {}
      for (const fid of s.selectedFactors) {
        results[fid] = runAnalysis(s.aligned, fid, method)
      }
      return { ...s, activeMethod: method, results }
    })
  }, [runAnalysis])

  return { state, setState, loadStock, realign, toggleFactor, computeResults }
}

function buildChart(aligned: AlignedData): ChartSeries {
  const factorRaw: Record<string, number[]> = {}
  for (const [fid, vals] of Object.entries(aligned.factorValues)) {
    factorRaw[fid] = vals
  }
  return {
    years: aligned.years,
    stockRaw: aligned.stockPrices,
    factorRaw,
  }
}
