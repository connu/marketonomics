# SWOT Analysis

An honest assessment of QuantLab as a product and as a codebase, as of mid-2026.

## Strengths

- **Privacy by architecture.** All statistics run client-side; portfolio data never leaves localStorage; there is no tracking, no accounts, no backend database. This is a genuine differentiator versus hosted finance tools and is trivially verifiable from the code.
- **Zero backend cost.** The only server code is three stateless proxy routes, deployable on any free serverless tier. No database, no jobs, no ops.
- **Real breadth of methods.** Ten econometric methods (through Granger, Engle–Granger cointegration, and mutual information) implemented from scratch in dependency-free TypeScript is unusual for a hobby web app, and each result ships with a plain-English interpretation string — good for learning.
- **Fast, cohesive UX.** One-time history fetch with client-side re-alignment means changing factors or windows is instant. The overlay chart's three normalization modes (z-score / % change / min-max) are the right tool for cross-unit comparison, raw values stay visible in tooltips, and a chart-design toggle offers both a classic light and a TradingView-inspired dark look.
- **Clean, legible codebase.** Small, feature-foldered, typed end-to-end, with the math isolated in one pure module (`math.ts`) that is easy to review and reuse. The Comparative Analysis tab also supports adding stock tickers as comparison series alongside factors, extending the matrix beyond the bundled dataset.
- **Honest by temperament.** The README already carries real disclaimers, and the interpretation strings note things like "Granger causality is predictive, not structural."

## Weaknesses

- **Unofficial data API at the core.** Everything live depends on undocumented Yahoo endpoints with no SLA. One upstream change bricks the app's main workflow.
- **Tiny statistical samples.** Annual-only data caps analyses at ~20 observations (often ~10). Most of the ten methods are underpowered or unstable at that size, and running all of them across 21 factors invites multiple-comparison false positives. This is the product's central scientific weakness.
- **Static, hand-maintained factor data.** `factors.json` is manually transcribed, US-only, mixes annual-average and year-end conventions, and stops at 2025. Staleness is guaranteed without manual effort.
- **Trust-eroding presentation choices.** The "AI · Generated" research summary is a fixed template with a hard-coded "Confidence: High" badge, and the analytics drawer's interpretation is similarly canned (with a hard-coded "21Y" label against a 22-year dataset). Users who notice will discount the honest parts too.
- **Dead and half-wired code.** The portfolio feature (form, table, import/export) and the tabbed `AnalysisPanel` method selector exist but are mounted on no route; the quote endpoint is unused; the root README describes routes (portfolio, simulation, dashboard, fundamentals) that do not exist. The stat cards silently analyze only the first selected factor.
- **No tests.** Zero automated tests over hand-rolled numerical code (p-value approximations, ADF, OLS) — precisely the code most likely to harbor silent errors. No dividend adjustment in price data either.

## Opportunities

- **Official data sources.** FRED's free official API could replace most of `factors.json` with always-current, provenance-backed series — the single highest-value upgrade. Alpha Vantage/Twelve Data/Polygon could back up or replace Yahoo for prices.
- **Higher-frequency data.** Monthly factor series (CPI, rates, DXY are all monthly at source) would grow samples from ~20 to ~240 points, transforming statistical credibility at modest code cost — the math layer is frequency-agnostic already.
- **Finish what's built.** Mounting the existing portfolio page, wiring the method-selector panel, and correlating portfolio holdings against factors are cheap wins from code that already exists.
- **Statistical hardening.** Multiple-comparison corrections, returns-based (not level-based) options, bootstrap confidence intervals, and validation of `math.ts` against statsmodels/R would set it apart from other free tools.
- **Genuinely generated summaries.** Replacing the template "AI" summary with a real LLM call (or deleting the badge) turns a liability into a feature.
- **Alerts and exports.** Watchlists, correlation-shift alerts, and PDF/CSV export of results are natural extensions once a data source is dependable.

## Threats

- **Yahoo API breakage** — the existential one. Yahoo has shut down or restricted public endpoints before; rate limiting or crumb-token enforcement could kill search/history at any time, and scraping sits in a terms-of-service gray zone.
- **Free and stronger alternatives.** Portfolio Visualizer, TradingView, Koyfin, FRED's own charts, and a large ecosystem of Python notebooks cover overlapping ground with official data and larger teams. QuantLab's niche (client-side privacy + causal-inference methods) is real but narrow.
- **Maintenance decay.** A solo early-stage project with hand-updated data has two clocks ticking: `factors.json` staleness (annual) and dependency churn (Next/React/MUI majors). Without tests, upgrades are risky; without updates, the "Live · 2004–2025" badge quietly becomes false advertising.
- **Misuse risk.** The polished terminal aesthetic, p-value chips, and "Confidence: High" styling can lead users to trade on statistically fragile output. Reputational (and in the worst case regulatory-adjacent) risk grows with audience unless the honesty of the UI catches up with the honesty of the README.
