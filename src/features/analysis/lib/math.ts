// Pure TypeScript implementations of statistical/econometric methods.
// No external dependencies. All inputs are number arrays of equal length.

// ─── Helpers ────────────────────────────────────────────────────────────────

export function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

export function variance(arr: number[]): number {
  const m = mean(arr)
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)
}

export function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr))
}

function rank(arr: number[]): number[] {
  const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  //sorting, by value because js converts everything to strings 
  const ranks = new Array(arr.length)
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length - 1 && sorted[j + 1].v === sorted[j].v) j++ //note to self: this is one line
    const avgRank = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[sorted[k].i] = avgRank
    i = j + 1
  }
  return ranks
}

// Regularized incomplete beta function approximation for t and F p-values
function betaIncomplete(x: number, a: number, b: number): number {
  // Continued fraction expansion (Lentz method)
  if (x < 0 || x > 1) return 0
  if (x === 0) return 0
  if (x === 1) return 1
  const lbeta = lgamma(a + b) - lgamma(a) - lgamma(b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta)
  const betaCF = (x: number, a: number, b: number) => {
    const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30
    const qab = a + b, qap = a + 1, qam = a - 1
    let c = 1, d = 1 - qab * x / qap
    if (Math.abs(d) < FPMIN) d = FPMIN
    d = 1 / d
    let h = d
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
      d = 1 / d; h *= d * c
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
      d = 1 / d
      const del = d * c; h *= del
      if (Math.abs(del - 1) < EPS) break
    }
    return h
  }
  if (x < (a + 1) / (a + b + 2)) return front * betaCF(x, a, b) / a
  return 1 - front * betaCF(1 - x, b, a) / b
}

function lgamma(x: number): number {
  // Lanczos approximation
  const g = 7
  const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x)
  x -= 1
  let a = C[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += C[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

function tPValue(t: number, df: number): number {
  // Two-tailed p-value via regularized incomplete beta
  const x = df / (df + t * t)
  return betaIncomplete(x, df / 2, 0.5)
}

function fPValue(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1
  const x = d2 / (d2 + d1 * f)
  return betaIncomplete(x, d2 / 2, d1 / 2)
}

// OLS: X is n×k matrix (rows=observations, cols=predictors incl. intercept), y is n-vector
function ols(X: number[][], y: number[]): { coef: number[]; rss: number; fitted: number[] } {
  const n = X.length, k = X[0].length
  // Compute X'X and X'y
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0))
  const Xty: number[] = new Array(k).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      Xty[j] += X[i][j] * y[i]
      for (let l = 0; l < k; l++) XtX[j][l] += X[i][j] * X[i][l]
    }
  }
  // Solve via Gaussian elimination with partial pivoting
  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]])
  for (let col = 0; col < k; col++) {
    let maxRow = col
    for (let row = col + 1; row < k; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    if (Math.abs(aug[col][col]) < 1e-12) continue
    for (let row = 0; row < k; row++) {
      if (row === col) continue
      const factor = aug[row][col] / aug[col][col]
      for (let c = col; c <= k; c++) aug[row][c] -= factor * aug[col][c]
    }
  }
  const coef = aug.map((row, i) => (Math.abs(aug[i][i]) < 1e-12 ? 0 : row[k] / aug[i][i]))
  const fitted = X.map(row => row.reduce((s, v, j) => s + v * coef[j], 0))
  const rss = y.reduce((s, yi, i) => s + (yi - fitted[i]) ** 2, 0)
  return { coef, rss, fitted }
}

function diffSeries(arr: number[]): number[] {
  const r: number[] = []
  for (let i = 1; i < arr.length; i++) r.push(arr[i] - arr[i - 1])
  return r
}

function lagSeries(arr: number[], lag: number): number[] {
  return arr.slice(0, arr.length - lag)
}

// ─── Public Analysis Results Types ───────────────────────────────────────────

export interface PearsonResult {
  method: 'pearson'
  r: number
  pValue: number
  interpretation: string
}

export interface SpearmanResult {
  method: 'spearman'
  rho: number
  pValue: number
  interpretation: string
}

export interface CrossCorrelationResult {
  method: 'crossCorrelation'
  lags: number[]
  correlations: number[]
  peakLag: number
  peakCorrelation: number
  interpretation: string
}

export interface LinearRegressionResult {
  method: 'linearRegression'
  slope: number
  intercept: number
  r2: number
  pValue: number
  predictions: number[]
  residuals: number[]
  interpretation: string
}

export interface RollingCorrelationResult {
  method: 'rollingCorrelation'
  window: number
  years: number[]
  correlations: number[]
  interpretation: string
}

export interface GrangerResult {
  method: 'granger'
  lag: number
  fStat: number
  pValue: number
  xCausesY: boolean
  yCausesX: boolean
  interpretation: string
}

export interface CointegrationResult {
  method: 'cointegration'
  adfStatistic: number
  criticalValue95: number
  cointegrated: boolean
  interpretation: string
}

export interface MonteCarloResult {
  method: 'monteCarlo'
  nSimulations: number
  years: number
  baseValue: number
  median: number
  p10: number
  p25: number
  p75: number
  p90: number
  meanReturn: number
  volatility: number
  paths: number[][]
  interpretation: string
}

export interface ElasticityResult {
  method: 'elasticity'
  pointElasticities: number[]
  meanElasticity: number
  years: number[]
  interpretation: string
}

export interface MutualInfoResult {
  method: 'mutualInfo'
  mi: number
  normalizedMI: number
  interpretation: string
}

export type AnalysisResult =
  | PearsonResult | SpearmanResult | CrossCorrelationResult
  | LinearRegressionResult | RollingCorrelationResult | GrangerResult
  | CointegrationResult | MonteCarloResult | ElasticityResult | MutualInfoResult

// ─── Correlation strength helper ──────────────────────────────────────────────

function correlationStrength(r: number): string {
  const a = Math.abs(r)
  if (a >= 0.9) return 'very strong'
  if (a >= 0.7) return 'strong'
  if (a >= 0.5) return 'moderate'
  if (a >= 0.3) return 'weak'
  return 'negligible'
}

function direction(r: number): string { return r > 0 ? 'positive' : 'negative' }

// ─── 1. Pearson Correlation ───────────────────────────────────────────────────

export function pearsonCorrelation(x: number[], y: number[]): PearsonResult {
  const n = x.length
  const xm = mean(x), ym = mean(y)
  const num = x.reduce((s, xi, i) => s + (xi - xm) * (y[i] - ym), 0)
  const denX = x.reduce((s, xi) => s + (xi - xm) ** 2, 0)
  const denY = y.reduce((s, yi) => s + (yi - ym) ** 2, 0)
  const r = (denX === 0 || denY === 0) ? 0 : num / Math.sqrt(denX * denY)
  const t = r * Math.sqrt((n - 2) / Math.max(1 - r ** 2, 1e-12))
  const pValue = tPValue(Math.abs(t), n - 2)
  const sig = pValue < 0.05 ? 'statistically significant (p < 0.05)' : 'not statistically significant'
  return {
    method: 'pearson',
    r,
    pValue,
    interpretation: `r = ${r.toFixed(3)}: ${correlationStrength(r)} ${direction(r)} linear correlation. ${sig}. r² = ${(r**2).toFixed(3)} (the factor explains ${(r**2*100).toFixed(1)}% of variance in stock price).`,
  }
}

// ─── 2. Spearman Rank Correlation ────────────────────────────────────────────

export function spearmanCorrelation(x: number[], y: number[]): SpearmanResult {
  const rx = rank(x), ry = rank(y)
  const { r: rho, pValue } = pearsonCorrelation(rx, ry)
  const sig = pValue < 0.05 ? 'statistically significant (p < 0.05)' : 'not statistically significant'
  return {
    method: 'spearman',
    rho,
    pValue,
    interpretation: `ρ = ${rho.toFixed(3)}: ${correlationStrength(rho)} ${direction(rho)} monotonic relationship (rank-based, robust to outliers). ${sig}. Spearman is preferred over Pearson when data is non-normally distributed or has outliers.`,
  }
}

// ─── 3. Cross-Correlation ────────────────────────────────────────────────────

export function crossCorrelation(x: number[], y: number[], maxLag = 5): CrossCorrelationResult {
  const n = x.length
  const lags: number[] = [], correlations: number[] = []
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    if (Math.abs(lag) >= n) { lags.push(lag); correlations.push(0); continue }
    const xi = lag >= 0 ? x.slice(0, n - lag) : x.slice(-lag)
    const yi = lag >= 0 ? y.slice(lag) : y.slice(0, n + lag)
    const { r } = pearsonCorrelation(xi, yi)
    lags.push(lag)
    correlations.push(r)
  }
  const maxIdx = correlations.reduce((best, v, i) => Math.abs(v) > Math.abs(correlations[best]) ? i : best, 0)
  const peakLag = lags[maxIdx], peakCorr = correlations[maxIdx]
  const lagDir = peakLag > 0 ? `X leads Y by ${peakLag} year(s) — X may predict stock price` :
    peakLag < 0 ? `Y leads X by ${-peakLag} year(s) — stock price may predict the factor` :
    'simultaneous relationship (no lead/lag)'
  return {
    method: 'crossCorrelation',
    lags,
    correlations,
    peakLag,
    peakCorrelation: peakCorr,
    interpretation: `Peak correlation r = ${peakCorr.toFixed(3)} at lag ${peakLag}. ${lagDir}. Cross-correlation reveals whether the factor leads or lags stock price movements.`,
  }
}

// ─── 4. Linear Regression ────────────────────────────────────────────────────

export function linearRegression(x: number[], y: number[]): LinearRegressionResult {
  const n = x.length
  const X = x.map(xi => [1, xi])
  const { coef, rss, fitted } = ols(X, y)
  const [intercept, slope] = coef
  const yMean = mean(y)
  const ssTot = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0)
  const r2 = Math.max(0, 1 - rss / ssTot)
  const se = Math.sqrt(rss / (n - 2))
  const xVar = x.reduce((s, xi) => s + (xi - mean(x)) ** 2, 0)
  const seSlope = se / Math.sqrt(xVar)
  const t = slope / Math.max(seSlope, 1e-12)
  const pValue = tPValue(Math.abs(t), n - 2)
  const residuals = y.map((yi, i) => yi - fitted[i])
  const sig = pValue < 0.05 ? 'significant predictor' : 'not a significant predictor'
  return {
    method: 'linearRegression',
    slope,
    intercept,
    r2,
    pValue,
    predictions: fitted,
    residuals,
    interpretation: `ŷ = ${intercept.toFixed(2)} + ${slope.toFixed(4)}·x  |  R² = ${r2.toFixed(3)} (model explains ${(r2*100).toFixed(1)}% of variance). Slope p-value = ${pValue.toFixed(4)} — factor is a ${sig}. For every 1-unit increase in the factor, stock price changes by ${slope.toFixed(4)}.`,
  }
}

// ─── 5. Rolling Correlation ──────────────────────────────────────────────────

export function rollingCorrelation(x: number[], y: number[], years: number[], window = 5): RollingCorrelationResult {
  const n = x.length
  const correlations: number[] = []
  const windowYears: number[] = []
  for (let i = 0; i < n; i++) {
    if (i < window - 1) { correlations.push(NaN); windowYears.push(years[i]); continue }
    const { r } = pearsonCorrelation(x.slice(i - window + 1, i + 1), y.slice(i - window + 1, i + 1))
    correlations.push(r)
    windowYears.push(years[i])
  }
  const valid = correlations.filter(v => !isNaN(v))
  const recentCorr = valid[valid.length - 1] ?? 0
  const earlyCorr = valid[0] ?? 0
  const trend = recentCorr > earlyCorr + 0.1 ? 'strengthening' : recentCorr < earlyCorr - 0.1 ? 'weakening' : 'stable'
  return {
    method: 'rollingCorrelation',
    window,
    years: windowYears,
    correlations,
    interpretation: `${window}-year rolling Pearson correlation. Most recent window r = ${recentCorr.toFixed(3)}. Relationship is ${trend} over time. Rolling correlation reveals structural breaks or regime changes in the factor-stock relationship.`,
  }
}

// ─── 6. Granger Causality Test ───────────────────────────────────────────────

export function grangerCausality(x: number[], y: number[], lag = 2): GrangerResult {
  const n = x.length
  if (n < lag * 2 + 4) return {
    method: 'granger', lag, fStat: 0, pValue: 1, xCausesY: false, yCausesX: false,
    interpretation: 'Insufficient data for Granger causality test.'
  }

  const testCausality = (cause: number[], effect: number[]): { f: number; p: number } => {
    const nEff = n - lag
    // Restricted: effect = f(lags of effect only)
    const Xr = effect.slice(lag - 1, n - 1).map((_, t) =>
      [1, ...Array.from({ length: lag }, (__, l) => effect[t + lag - 1 - l])]
    )
    const yr = effect.slice(lag)
    const { rss: rssR } = ols(Xr, yr)
    // Unrestricted: effect = f(lags of effect + lags of cause)
    const Xu = effect.slice(lag - 1, n - 1).map((_, t) => [
      1,
      ...Array.from({ length: lag }, (__, l) => effect[t + lag - 1 - l]),
      ...Array.from({ length: lag }, (__, l) => cause[t + lag - 1 - l]),
    ])
    const { rss: rssU } = ols(Xu, yr)
    const df1 = lag, df2 = nEff - 2 * lag - 1
    if (df2 <= 0 || rssU < 1e-12) return { f: 0, p: 1 }
    const fStat = ((rssR - rssU) / df1) / (rssU / df2)
    return { f: Math.max(0, fStat), p: fPValue(Math.max(0, fStat), df1, df2) }
  }

  const { f: fXY, p: pXY } = testCausality(x, y)
  const { f: fYX, p: pYX } = testCausality(y, x)
  const xCausesY = pXY < 0.05, yCausesX = pYX < 0.05
  const causality = xCausesY && yCausesX ? 'bidirectional causality' :
    xCausesY ? 'factor Granger-causes stock price' :
    yCausesX ? 'stock price Granger-causes the factor' :
    'no Granger causality detected in either direction'

  return {
    method: 'granger',
    lag,
    fStat: fXY,
    pValue: pXY,
    xCausesY,
    yCausesX,
    interpretation: `Granger causality (lag=${lag}): ${causality}. F(factor→stock) = ${fXY.toFixed(3)}, p = ${pXY.toFixed(4)}. F(stock→factor) = ${fYX.toFixed(3)}, p = ${pYX.toFixed(4)}. Note: Granger causality is predictive, not structural causality.`,
  }
}

// ─── 7. Cointegration Test (Engle-Granger) ───────────────────────────────────

export function cointegrationTest(x: number[], y: number[]): CointegrationResult {
  // Step 1: regress y on x, get residuals
  const X = x.map(xi => [1, xi])
  const { fitted } = ols(X, y)
  const resid = y.map((yi, i) => yi - fitted[i])
  // Step 2: ADF test on residuals (lag=1, no constant needed since residuals are demeaned)
  const n = resid.length
  const dResid = diffSeries(resid)
  const xADF = resid.slice(0, n - 1).map(v => [v])
  const { coef } = ols(xADF, dResid)
  const gamma = coef[0]
  const fittedADF = xADF.map(row => row[0] * gamma)
  const rssADF = dResid.reduce((s, v, i) => s + (v - fittedADF[i]) ** 2, 0)
  const seGamma = Math.sqrt(rssADF / (n - 2)) / Math.sqrt(xADF.reduce((s, row) => s + row[0] ** 2, 0))
  const adfStat = gamma / Math.max(seGamma, 1e-12)
  // Engle-Granger critical values (n≈20): -3.34 (1%), -2.76 (5%), -2.46 (10%)
  const cv95 = -2.76
  const cointegrated = adfStat < cv95
  return {
    method: 'cointegration',
    adfStatistic: adfStat,
    criticalValue95: cv95,
    cointegrated,
    interpretation: `Engle-Granger ADF statistic = ${adfStat.toFixed(3)} (5% critical value = ${cv95}). ${cointegrated ? 'Series appear cointegrated — they share a long-run equilibrium relationship. Deviations are temporary.' : 'Series are not cointegrated — no stable long-run equilibrium found. Apparent correlation may be spurious.'}`,
  }
}

// ─── 8. Monte Carlo Simulation ───────────────────────────────────────────────

export function monteCarlo(stockYearlyPrices: number[], nSimulations = 500, horizonYears = 10): MonteCarloResult {
  const logReturns: number[] = []
  for (let i = 1; i < stockYearlyPrices.length; i++) {
    if (stockYearlyPrices[i] > 0 && stockYearlyPrices[i - 1] > 0)
      logReturns.push(Math.log(stockYearlyPrices[i] / stockYearlyPrices[i - 1]))
  }
  const mu = mean(logReturns)
  const sigma = stdDev(logReturns)
  const base = stockYearlyPrices[stockYearlyPrices.length - 1]

  // Box-Muller for Gaussian samples
  const rng = (() => {
    let spare: number | null = null
    return () => {
      if (spare !== null) { const s = spare; spare = null; return s }
      const u = Math.random(), v = Math.random()
      const mag = sigma * Math.sqrt(-2 * Math.log(u))
      spare = mag * Math.cos(2 * Math.PI * v)
      return mag * Math.sin(2 * Math.PI * v)
    }
  })()

  const MAX_PATHS = 50
  const paths: number[][] = []
  const finalValues: number[] = []
  for (let s = 0; s < nSimulations; s++) {
    let price = base
    const path: number[] = [base]
    for (let t = 0; t < horizonYears; t++) {
      price = price * Math.exp(mu - 0.5 * sigma ** 2 + rng())
      path.push(price)
    }
    finalValues.push(price)
    if (s < MAX_PATHS) paths.push(path)
  }

  finalValues.sort((a, b) => a - b)
  const p = (q: number) => finalValues[Math.floor(q * nSimulations)]

  return {
    method: 'monteCarlo',
    nSimulations,
    years: horizonYears,
    baseValue: base,
    median: p(0.5),
    p10: p(0.1),
    p25: p(0.25),
    p75: p(0.75),
    p90: p(0.9),
    meanReturn: mu * 100,
    volatility: sigma * 100,
    paths,
    interpretation: `${nSimulations} simulated ${horizonYears}-year price paths. Based on historical mean annual return ${(mu * 100).toFixed(1)}% and volatility ${(sigma * 100).toFixed(1)}%. Median projected price: $${p(0.5).toFixed(2)} (10th pct: $${p(0.1).toFixed(2)}, 90th pct: $${p(0.9).toFixed(2)}).`,
  }
}

// ─── 9. Sensitivity / Elasticity Analysis ────────────────────────────────────

export function elasticityAnalysis(x: number[], y: number[], years: number[]): ElasticityResult {
  const pointElasticities: number[] = []
  const ys: number[] = []
  for (let i = 1; i < x.length; i++) {
    const pctX = (x[i] - x[i - 1]) / Math.abs(x[i - 1] || 1e-12)
    const pctY = (y[i] - y[i - 1]) / Math.abs(y[i - 1] || 1e-12)
    if (Math.abs(pctX) > 0.0001) {
      pointElasticities.push(pctY / pctX)
      ys.push(years[i])
    }
  }
  const clipped = pointElasticities.filter(e => Math.abs(e) < 50)
  const me = clipped.length > 0 ? mean(clipped) : 0
  const elastic = Math.abs(me) > 1 ? 'elastic' : 'inelastic'
  const dir = me > 0 ? 'same direction as' : 'opposite direction to'
  return {
    method: 'elasticity',
    pointElasticities: clipped,
    meanElasticity: me,
    years: ys,
    interpretation: `Mean elasticity = ${me.toFixed(3)}. Stock price moves ${dir} the factor and is ${elastic} to it (|E| ${Math.abs(me) > 1 ? '> 1' : '< 1'}). A 1% change in the factor is associated with a ${me.toFixed(2)}% change in stock price on average.`,
  }
}

// ─── 10. Mutual Information ──────────────────────────────────────────────────

export function mutualInformation(x: number[], y: number[], bins = 5): MutualInfoResult {
  const n = x.length
  const minX = Math.min(...x), maxX = Math.max(...x)
  const minY = Math.min(...y), maxY = Math.max(...y)
  const bw = (v: number, min: number, max: number) =>
    Math.min(Math.floor(((v - min) / (max - min + 1e-12)) * bins), bins - 1)

  const joint: number[][] = Array.from({ length: bins }, () => new Array(bins).fill(0))
  for (let i = 0; i < n; i++) joint[bw(x[i], minX, maxX)][bw(y[i], minY, maxY)]++

  let mi = 0
  const margX = joint.map(row => row.reduce((s, v) => s + v, 0))
  const margY = Array.from({ length: bins }, (_, j) => joint.reduce((s, row) => s + row[j], 0))
  for (let i = 0; i < bins; i++) for (let j = 0; j < bins; j++) {
    if (joint[i][j] === 0) continue
    const pxy = joint[i][j] / n
    const px = margX[i] / n, py = margY[j] / n
    if (px > 0 && py > 0) mi += pxy * Math.log(pxy / (px * py))
  }

  const hX = -margX.reduce((s, v) => { const p = v / n; return s + (p > 0 ? p * Math.log(p) : 0) }, 0)
  const hY = -margY.reduce((s, v) => { const p = v / n; return s + (p > 0 ? p * Math.log(p) : 0) }, 0)
  const normalizedMI = hX + hY > 0 ? (2 * mi) / (hX + hY) : 0

  const strength = normalizedMI > 0.6 ? 'high' : normalizedMI > 0.3 ? 'moderate' : 'low'
  return {
    method: 'mutualInfo',
    mi,
    normalizedMI,
    interpretation: `Mutual information = ${mi.toFixed(4)} nats. Normalized MI = ${normalizedMI.toFixed(3)} (${strength} information sharing). MI is non-parametric and captures non-linear dependencies that Pearson misses. NMI ranges from 0 (independent) to 1 (perfect dependence).`,
  }
}
