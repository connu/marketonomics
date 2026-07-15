'use client'

import { useCallback, useState } from 'react'
import { fetchHistory } from '../../../services/marketData'
import { fetchMacroSeries, type MacroPoint } from '../../../services/macroData'
import { runBacktest } from '../lib/engine'
import { runMonteCarlo } from '../../analysis/lib/statsClient'
import type { MonteCarloResult } from '../../analysis/lib/math'
import type { BacktestConfig, BacktestResult } from '../types'

export interface UseBacktestReturn {
  result: BacktestResult | null
  /** The config that produced `result` */
  ranConfig: BacktestConfig | null
  monteCarlo: MonteCarloResult | null
  running: boolean
  error: string | null
  run: (cfg: BacktestConfig) => void
}

/** Strategy equity sampled at year-ends — the input the Monte Carlo model expects. */
function yearlyEquity(dates: string[], equity: number[]): number[] {
  const byYear: Record<string, number> = {}
  for (let i = 0; i < dates.length; i++) byYear[dates[i].slice(0, 4)] = equity[i]
  return Object.keys(byYear).sort().map(y => byYear[y])
}

export function useBacktest(): UseBacktestReturn {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [ranConfig, setRanConfig] = useState<BacktestConfig | null>(null)
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback((cfg: BacktestConfig) => {
    void (async () => {
      setRunning(true)
      setError(null)
      try {
        const bars = await fetchHistory(cfg.symbol, cfg.range, cfg.interval)
        if (bars.length < 30) throw new Error('Not enough price history for this configuration')

        const macroSeries: Record<string, MacroPoint[]> = {}
        await Promise.all(
          cfg.filters.map(async f => {
            const res = await fetchMacroSeries(f.seriesId)
            if (!res || !res.points.length) throw new Error(`Couldn't load macro series ${f.seriesId}`)
            macroSeries[f.seriesId] = res.points
          })
        )

        const bt = runBacktest(bars, macroSeries, cfg)
        setResult(bt)
        setRanConfig(cfg)

        // Forward projection from the strategy's own yearly return distribution,
        // computed in the stats Web Worker.
        const yearly = yearlyEquity(bt.dates, bt.equity)
        setMonteCarlo(yearly.length >= 4 ? await runMonteCarlo(yearly, 500, 10) : null)
      } catch (e) {
        setResult(null)
        setRanConfig(null)
        setMonteCarlo(null)
        setError(e instanceof Error ? e.message : 'Backtest failed')
      } finally {
        setRunning(false)
      }
    })()
  }, [])

  return { result, ranConfig, monteCarlo, running, error, run }
}
