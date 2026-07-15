// Price indicators for the backtest engine.

/** Simple moving average via a rolling sum — O(n). NaN until the window fills. */
export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (period < 1) return out
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}
