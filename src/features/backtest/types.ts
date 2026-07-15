// Rule model for the Strategy Lab. Discriminated unions keep the engine
// extensible: adding a rule = one union member + one case in evaluateSignals.

export type EntryRule =
  | { type: 'buyAndHold' }
  /** Hold while the fast SMA is above the slow SMA */
  | { type: 'smaCross'; fast: number; slow: number }
  /** Hold while price is above its SMA */
  | { type: 'priceAboveSma'; period: number }

/** AND-combined with the entry rule. `seriesId` is a whitelisted FRED id. */
export interface MacroFilter {
  seriesId: string
  /** Hold only while the macro series is rising / falling vs its previous observation */
  direction: 'rising' | 'falling'
}

export type BacktestRange = '5y' | '10y' | 'max'
export type BacktestInterval = '1wk' | '1mo'

export interface BacktestConfig {
  symbol: string
  range: BacktestRange
  interval: BacktestInterval
  rule: EntryRule
  filters: MacroFilter[]
}

export interface Trade {
  entryDate: string
  exitDate: string
  /** Simple return over the trade, e.g. 0.12 = +12% */
  returnPct: number
}

export interface BacktestStats {
  totalReturn: number
  benchmarkTotalReturn: number
  cagr: number
  benchmarkCagr: number
  maxDrawdown: number
  benchmarkMaxDrawdown: number
  sharpe: number
  winRate: number
  nTrades: number
  /** Fraction of bars spent in the market, 0..1 */
  exposure: number
  years: number
}

export interface BacktestResult {
  dates: string[]
  /** Strategy equity curve, normalized to start at 100 */
  equity: number[]
  /** Buy-and-hold benchmark, normalized to start at 100 */
  benchmark: number[]
  /** position[i] = in the market for the bar i → i+1 return */
  position: boolean[]
  trades: Trade[]
  stats: BacktestStats
}
