# How It Works

## Architecture at a glance

QuantLab is a Next.js 16 app (React 19, TypeScript, MUI for UI, Recharts for charts). There is no database and no application backend. The server side consists of exactly three API routes that proxy Yahoo Finance; **everything else — data alignment, normalization, and all statistics — runs client-side in your browser**.

```
Browser (client components)                 Next.js server              External
─────────────────────────────              ─────────────────           ─────────
Search box ──────────────────────────────▶ /api/search ──────────────▶ Yahoo Finance
"Load Chart" ────────────────────────────▶ /api/history/[symbol] ────▶ Yahoo Finance
(quote helper, currently unused by UI) ──▶ /api/quote/[symbol] ──────▶ Yahoo Finance

price history ──▶ toYearlyPrices() ──▶ alignData() with factors.json
                                          │
                                          ▼
                        math.ts (10 statistical methods, pure TS)
                                          │
                                          ▼
                          Recharts charts + stat cards
```

Key directories:

| Path | Role |
|---|---|
| `src/app/(routes)/economics/page.tsx` | Relationship Explorer page |
| `src/app/(routes)/analytics/page.tsx` | Comparative Analysis page |
| `src/app/api/{search,quote,history}` | Yahoo Finance proxy routes |
| `src/services/marketData.ts` | Thin client-side fetch wrappers for those routes |
| `src/features/analysis/lib/normalize.ts` | Yearly collapsing, factor alignment, display normalization |
| `src/features/analysis/lib/math.ts` | All statistical methods (pure TypeScript, no dependencies) |
| `src/features/analysis/hooks/useFactorAnalysis.ts` | Page state: load, cache, re-align, dispatch methods |
| `src/features/portfolio/` | Portfolio types, localStorage persistence, JSON import/export |
| `src/data/factors.json` | Bundled annual factor dataset, 2004–2025 |

## The API routes (Yahoo Finance proxy)

The three routes exist so the browser never calls Yahoo directly (avoiding CORS) and so responses can be cached by Next.js:

- **`GET /api/search?q=...`** — proxies Yahoo's symbol search, returns up to 8 matches filtered to `EQUITY`, `ETF`, and `INDEX` types. Not cached.
- **`GET /api/history/[symbol]?range=...`** — proxies Yahoo's v8 chart endpoint. Valid ranges: `1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max`. The interval is chosen per range (daily for ≤3mo, weekly for most, **monthly for `max`**). Responses are cached for 1 hour. The analysis flow always requests `range=max`.
- **`GET /api/quote/[symbol]`** — current price and day change, cached 60 seconds. (Wired up in `marketData.ts` but not currently used by either page.)

These calls hit `query1.finance.yahoo.com` with a generic browser User-Agent. This is an **unofficial, undocumented API** — see [Data Sources](data-sources.md) for the caveats.

## Yearly normalization and alignment

The factor dataset is annual, so stock prices must be collapsed to annual frequency before anything can be compared:

1. **`toYearlyPrices`** takes the full monthly history and keeps the **last available close of each calendar year**. For the current year, that is simply the most recent close so far — a partial-year value.
2. **`alignData`** intersects the stock's years with the factor dataset's years (2004–2025) over the chosen window (5/10/15/20 years back from the latest common year). Years where either side is missing are dropped. The result is a set of equal-length arrays: `years`, `stockPrices`, and one value array per selected factor.
3. Statistics run on these **raw price levels** (not returns), except Monte Carlo, which converts to log returns internally.

For charting only, each series is additionally normalized to make different units visually comparable: z-score (default), cumulative % change from the window's first year, or min-max scaling to 0–100. This affects the display, not the statistics.

Practical consequence: a "20Y" analysis has at most ~20 data points, and a stock that IPO'd in 2015 has even fewer. The stat card grid refuses to render with fewer than 4 aligned points.

## The statistical methods, in plain language

All ten methods live in `src/features/analysis/lib/math.ts` as dependency-free TypeScript. P-values for t- and F-statistics are computed via a regularized incomplete beta function (Lentz continued-fraction method with a Lanczos log-gamma); regressions use ordinary least squares solved by Gaussian elimination with partial pivoting. On the Relationship Explorer, all ten run at once against the first selected factor.

1. **Pearson correlation** — "Do the two series move together in a straight-line way?" Returns r between −1 and +1 and a two-tailed p-value from a t-test with n−2 degrees of freedom. r² is reported as "% of variance explained."

2. **Spearman rank correlation** — Pearson computed on the *ranks* of the values (ties get averaged ranks). Answers "do they move in the same direction?" without assuming a straight line, and is robust to outliers.

3. **Cross-correlation** — slides one series against the other by −5 to +5 years (capped by sample size) and computes Pearson r at each lag. The lag with the largest |r| is reported as the "peak." A positive peak lag suggests the factor moves before the stock; a negative one suggests the reverse. With annual data, each extra lag costs you a data point.

4. **Linear regression (OLS)** — fits `stock price = intercept + slope × factor`. Reports slope, intercept, R², a p-value on the slope, and residuals. The slope reads as "price change per one unit of the factor." Note this regresses price *levels* on factor *levels* — see [Limitations](limitations.md) on spurious regression.

5. **Rolling correlation** — Pearson r recomputed over a sliding window (5 years, or half the sample if smaller). Shows whether the relationship strengthened, weakened, or flipped over time. Early years without a full window are blank.

6. **Granger causality** — asks "do past values of the factor help predict the stock beyond what the stock's own past already predicts?" It fits two regressions of the stock on its own lags — one with the factor's lags added — and F-tests whether the addition reduced error significantly. Tested in both directions with (up to) 2 lags. "Granger-causes" means *helps predict*, not *causes* in any physical sense, and the test degrades to "insufficient data" below ~8 observations.

7. **Cointegration (Engle–Granger)** — asks "do the two series share a stable long-run relationship, so that when they drift apart they tend to come back?" It regresses one on the other and runs an augmented Dickey–Fuller test on the residuals. The 5% critical value (−2.76) is a hard-coded constant calibrated for n≈20.

8. **Monte Carlo simulation** — the one method that **ignores the factor entirely**. It estimates the stock's mean and volatility of annual log returns, then simulates 500 random future price paths (geometric Brownian motion via Box–Muller sampling) over up to 10 years, reporting the median and 10th/25th/75th/90th percentile ending prices. It answers "given past return statistics, how wide is the range of outcomes?" — assuming the future is statistically like the past.

9. **Elasticity** — for each consecutive year pair, computes (% change in stock) ÷ (% change in factor), then averages, discarding extreme values (|E| > 50) and years where the factor barely moved. |E| > 1 is labeled "elastic" (stock moves proportionally more than the factor).

10. **Mutual information** — an information-theoretic measure: bins both series into a small grid (up to 5×5, fewer with small samples) and measures how much knowing one value tells you about the other, linear or not. Reported in nats plus a normalized 0–1 score. With ~10 observations spread over a 5×5 grid, the estimate is extremely coarse.

Each method returns a machine result plus a canned English `interpretation` string built from the numbers.

## The Comparative Analysis tab

`/analytics` operates directly on the bundled annual dataset (2004–2025) plus any stock tickers you add as comparison series, with no year-range window. It computes a full Pearson correlation matrix across selected series, and the click-through drawer re-uses `pearsonCorrelation`, `linearRegression`, and `crossCorrelation` (lags ±2) from the same math library.

## Portfolio persistence

`src/features/portfolio/services/portfolioStorage.ts` reads and writes a JSON array of holdings under the localStorage key `quantlab_holdings_v1`, validating every record's shape on load and on import (bad records are dropped, not errored). Export builds a JSON blob and triggers a browser download. There is no server component — see [Data Sources](data-sources.md). Note that these components are not currently mounted on any route.
