// Performance statistics for backtest results.

import { mean, stdDev } from '../../analysis/lib/math'
import type { BacktestInterval, BacktestStats, Trade } from '../types'

export function maxDrawdown(curve: number[]): number {
  let peak = -Infinity
  let worst = 0
  for (const v of curve) {
    if (v > peak) peak = v
    const dd = v / peak - 1
    if (dd < worst) worst = dd
  }
  return worst
}

interface StatsInput {
  equity: number[]
  benchmark: number[]
  /** Per-bar strategy returns (0 when out of the market) */
  strategyReturns: number[]
  trades: Trade[]
  position: boolean[]
  dates: string[]
  interval: BacktestInterval
}

export function computeStats(input: StatsInput): BacktestStats {
  const { equity, benchmark, strategyReturns, trades, position, dates, interval } = input
  const n = equity.length
  const last = n - 1
  const years = n > 1
    ? Math.max((Date.parse(dates[last]) - Date.parse(dates[0])) / (365.25 * 86_400_000), 1 / 12)
    : 0

  const totalReturn = n ? equity[last] / 100 - 1 : 0
  const benchmarkTotalReturn = n ? benchmark[last] / 100 - 1 : 0
  const cagr = years > 0 ? Math.pow(equity[last] / 100, 1 / years) - 1 : 0
  const benchmarkCagr = years > 0 ? Math.pow(benchmark[last] / 100, 1 / years) - 1 : 0

  const periodsPerYear = interval === '1wk' ? 52 : 12
  const vol = strategyReturns.length > 1 ? stdDev(strategyReturns) : 0
  const sharpe = vol > 0 ? (mean(strategyReturns) / vol) * Math.sqrt(periodsPerYear) : 0

  const wins = trades.filter(t => t.returnPct > 0).length
  const held = position.filter(Boolean).length

  return {
    totalReturn,
    benchmarkTotalReturn,
    cagr,
    benchmarkCagr,
    maxDrawdown: maxDrawdown(equity),
    benchmarkMaxDrawdown: maxDrawdown(benchmark),
    sharpe,
    winRate: trades.length ? wins / trades.length : 0,
    nTrades: trades.length,
    exposure: position.length ? held / position.length : 0,
    years,
  }
}
