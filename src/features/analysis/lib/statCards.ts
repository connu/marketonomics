// Pure stat-card computation shared by the stats Web Worker and the
// synchronous fallback path. No React or DOM imports — everything in and out
// is structured-clone serializable.

import {
  pearsonCorrelation, spearmanCorrelation, crossCorrelation,
  linearRegression, rollingCorrelation, grangerCausality,
  cointegrationTest, monteCarlo, elasticityAnalysis, mutualInformation,
} from './math'

export interface Bar { label: string; val: string; pct: string; color: string }

export interface StatCard {
  name: string
  result: string
  resultColor: string
  explanation: string
  bars: Bar[]
}

// Stat colors per design mode (classic: green/red/slate/blue · TradingView: teal/red).
export interface StatColors { pos: string; neg: string; neu: string; blue: string }

function firstSentence(text: string): string {
  const i = text.indexOf('. ')
  return i === -1 ? text : text.slice(0, i + 1)
}

export function computeCards(x: number[], y: number[], years: number[], factorLabel: string, symbol: string, c: StatColors): StatCard[] {
  const { pos: POS, neg: NEG, neu: NEU, blue: BLUE } = c

  const window = Math.min(5, Math.max(3, Math.floor(x.length / 2)))
  const roll = rollingCorrelation(x, y, years, window)
  // "Rolling window breakdown" mini-bars from the same rolling series
  const bars: Bar[] = roll.correlations
    .map((r, i) => ({ r, year: roll.years[i] }))
    .filter(d => !isNaN(d.r))
    .slice(-5)
    .map(d => ({
      label: `'${String(d.year).slice(2)}`,
      val: d.r.toFixed(2),
      pct: `${Math.min(Math.max(Math.abs(d.r) * 80 + 12, 6), 96)}%`,
      color: d.r > 0 ? BLUE : NEG,
    }))
  const rollRecent = roll.correlations.filter(v => !isNaN(v)).slice(-1)[0] ?? 0

  const pear = pearsonCorrelation(x, y)
  const spear = spearmanCorrelation(x, y)
  const xcorr = crossCorrelation(x, y, Math.min(5, Math.floor(x.length / 3)))
  const reg = linearRegression(x, y)
  const gr = grangerCausality(x, y, Math.min(2, Math.floor(x.length / 5)))
  const coint = cointegrationTest(x, y)
  const mc = monteCarlo(y, 500, Math.min(10, Math.max(3, Math.floor(x.length / 2))))
  const elas = elasticityAnalysis(x, y, years)
  const mi = mutualInformation(x, y, Math.min(5, Math.floor(Math.sqrt(x.length))))

  const sign = (v: number) => (v > 0.3 ? POS : v < -0.3 ? NEG : NEU)

  return [
    { name: 'Pearson Correlation', result: pear.r.toFixed(3), resultColor: sign(pear.r), explanation: firstSentence(pear.interpretation), bars },
    { name: 'Spearman Correlation', result: spear.rho.toFixed(3), resultColor: sign(spear.rho), explanation: firstSentence(spear.interpretation), bars },
    { name: 'Cross Correlation', result: `${xcorr.peakCorrelation.toFixed(3)} @ ${xcorr.peakLag >= 0 ? '+' : ''}${xcorr.peakLag}y`, resultColor: Math.abs(xcorr.peakCorrelation) > 0.3 ? BLUE : NEU, explanation: firstSentence(xcorr.interpretation), bars },
    { name: 'Linear Regression', result: `R² = ${reg.r2.toFixed(3)}`, resultColor: reg.r2 > 0.25 ? POS : NEU, explanation: `OLS explains ${(reg.r2 * 100).toFixed(1)}% of variance in ${symbol}. Slope ${reg.slope.toFixed(4)} per unit of ${factorLabel}.`, bars },
    { name: 'Rolling Correlation', result: `${rollRecent.toFixed(3)} (${roll.window}y)`, resultColor: Math.abs(rollRecent) > 0.3 ? BLUE : NEU, explanation: firstSentence(roll.interpretation), bars },
    { name: 'Granger Causality', result: `p = ${gr.pValue.toFixed(4)}`, resultColor: gr.pValue < 0.05 ? POS : NEU, explanation: firstSentence(gr.interpretation), bars },
    { name: 'Cointegration', result: coint.cointegrated ? 'Cointegrated' : 'Not Cointegrated', resultColor: coint.cointegrated ? POS : NEU, explanation: firstSentence(coint.interpretation), bars },
    { name: 'Monte Carlo', result: `σ = ${mc.volatility.toFixed(1)}%`, resultColor: NEU, explanation: firstSentence(mc.interpretation), bars },
    { name: 'Elasticity', result: `${elas.meanElasticity.toFixed(3)}`, resultColor: NEU, explanation: firstSentence(elas.interpretation), bars },
    { name: 'Mutual Information', result: `${mi.normalizedMI.toFixed(3)} NMI`, resultColor: mi.normalizedMI > 0.3 ? BLUE : NEU, explanation: firstSentence(mi.interpretation), bars },
  ]
}
