// Pure backtest engine. Signals are computed from data available at bar t and
// applied to the t → t+1 return (position taken at the close of bar t), so
// there is no lookahead bias by construction.

import type { HistoryPoint } from '../../../services/marketData'
import type { MacroPoint } from '../../../services/macroData'
import type { BacktestConfig, BacktestResult, EntryRule, MacroFilter, Trade } from '../types'
import { sma } from './indicators'
import { computeStats } from './stats'

function evaluateSignals(rule: EntryRule, closes: number[]): boolean[] {
  switch (rule.type) {
    case 'buyAndHold':
      return closes.map(() => true)
    case 'smaCross': {
      const fast = sma(closes, rule.fast)
      const slow = sma(closes, rule.slow)
      return closes.map((_, i) => Number.isFinite(fast[i]) && Number.isFinite(slow[i]) && fast[i] > slow[i])
    }
    case 'priceAboveSma': {
      const line = sma(closes, rule.period)
      return closes.map((c, i) => Number.isFinite(line[i]) && c > line[i])
    }
  }
}

// For each bar date, is the macro series rising/falling as of the latest
// observation on or before that date? Forward-fills with a moving pointer;
// bars before the second macro observation resolve to false (not held).
function evaluateFilter(filter: MacroFilter, points: MacroPoint[], dates: string[]): boolean[] {
  const out = new Array<boolean>(dates.length).fill(false)
  let j = 0
  for (let i = 0; i < dates.length; i++) {
    while (j + 1 < points.length && points[j + 1].date <= dates[i]) j++
    if (j >= 1 && points[j].date <= dates[i]) {
      const delta = points[j].value - points[j - 1].value
      out[i] = filter.direction === 'rising' ? delta > 0 : delta < 0
    }
  }
  return out
}

function extractTrades(position: boolean[], closes: number[], dates: string[]): Trade[] {
  const trades: Trade[] = []
  let entryIdx: number | null = null
  for (let i = 0; i < position.length; i++) {
    if (position[i] && entryIdx === null) {
      entryIdx = i
    } else if (!position[i] && entryIdx !== null) {
      trades.push({
        entryDate: dates[entryIdx],
        exitDate: dates[i],
        returnPct: closes[i] / closes[entryIdx] - 1,
      })
      entryIdx = null
    }
  }
  if (entryIdx !== null) {
    const last = closes.length - 1
    trades.push({
      entryDate: dates[entryIdx],
      exitDate: dates[last],
      returnPct: closes[last] / closes[entryIdx] - 1,
    })
  }
  return trades
}

export function runBacktest(
  bars: HistoryPoint[],
  macroSeries: Record<string, MacroPoint[]>,
  config: BacktestConfig
): BacktestResult {
  const closes = bars.map(b => b.close)
  const dates = bars.map(b => b.date)
  const n = bars.length

  const signals = evaluateSignals(config.rule, closes)
  const filterResults = config.filters.map(f => evaluateFilter(f, macroSeries[f.seriesId] ?? [], dates))
  const position = signals.map((s, i) => s && filterResults.every(f => f[i]))
  // The last bar has no following return to capture
  if (n > 0) position[n - 1] = false

  const equity = new Array<number>(n).fill(100)
  const benchmark = new Array<number>(n).fill(100)
  const strategyReturns: number[] = []
  for (let i = 1; i < n; i++) {
    const barReturn = closes[i] / closes[i - 1]
    equity[i] = equity[i - 1] * (position[i - 1] ? barReturn : 1)
    benchmark[i] = (100 * closes[i]) / closes[0]
    strategyReturns.push(position[i - 1] ? barReturn - 1 : 0)
  }

  const trades = extractTrades(position, closes, dates)
  const stats = computeStats({
    equity, benchmark, strategyReturns, trades, position, dates, interval: config.interval,
  })

  return { dates, equity, benchmark, position, trades, stats }
}
