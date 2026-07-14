# Limitations — What Not to Trust This Program With

QuantLab is an educational research toy. It is genuinely useful for building intuition about how macro series and stock prices co-move, and for learning what these statistical methods do. It is **not** a decision-making tool. Here is the honest list of reasons why.

## Not financial advice

Nothing the app outputs is investment advice. A green card saying "statistically significant" or "Cointegrated ✓" is not a trading signal. Past relationships routinely break; strategies that look good on historical data routinely fail live. Use at your own risk.

## Correlation is not causation

Almost every method here measures *association*. Gold and a tech stock can both rise for a decade because of a third force (falling rates, general growth, inflation of everything) and score a beautiful r = 0.9 with no mechanism connecting them. Even **Granger causality**, despite the name, only tests whether one series *helps predict* another — the code's own interpretation string says so. It cannot distinguish "X drives Y" from "X reacts faster than Y to the same news."

## Tiny samples make every statistic fragile

This is the single biggest issue:

- Data is **annual**. A "20Y" window is at most ~20 observations; the default 10Y window is ~10; a stock that IPO'd recently gives you fewer still (the app only requires **4** aligned points to display results).
- With n≈10, a p-value below 0.05 is easy to hit by chance, confidence in r is enormous (the 95% CI on r from 10 points spans roughly ±0.6), and a single year (2008, 2020) can dominate the whole result.
- Several methods are badly starved at this size: cross-correlation loses a data point per lag; rolling correlation windows shrink to 3–5 points; mutual information bins ~10 points into up to 25 cells; the cointegration test uses critical values calibrated for n≈20 regardless of your actual n.
- **Multiple comparisons:** the Relationship Explorer runs 10 methods at once, and 21 factors are a click away. Test 21 factors × 10 methods and you should *expect* a handful of "significant" results from pure noise. No correction is applied.

## Yearly frequency smooths away almost everything

Collapsing to one closing price per year (last trade of the year, at that) discards intra-year crashes, recoveries, volatility, and any dynamic faster than ~2 years. Relationships that operate at monthly or quarterly horizons — most macro-to-market transmission — are invisible or aliased. The 2020 COVID crash and recovery, for instance, nets out to almost nothing in annual closes.

## Statistics on price levels invite spurious results

Correlation and regression are computed on raw **price levels**, which trend upward for most stocks and most factors. Two unrelated upward-trending (non-stationary) series will show strong correlation and high R² — the classic *spurious regression* problem. The cointegration test exists partly to check this, but it is itself a hand-rolled implementation on tiny samples. Be most suspicious of exactly the results that look most impressive.

## The "AI · Generated" research summary is a template

The Research Summary panel on the Relationship Explorer displays a fixed paragraph ("The Pearson and Spearman correlation estimates are broadly consistent… Monte Carlo bootstrapping validates estimation robustness…") **regardless of what your results actually were**. Only the ticker, factor names, window, and sample count are interpolated. The "Confidence: High" badge is likewise hard-coded. The pairwise interpretation in the Comparative Analysis drawer is also canned text keyed off |r| (it calls anything with |r| > 0.4 "statistically robust… suitable for factor-model inclusion", and its "Period: 21Y" label is hard-coded even though the dataset spans 22 years). Read the numbers, not the prose.

## Yahoo Finance is unofficial and can break at any time

All live data comes from undocumented Yahoo endpoints with no SLA (see [Data Sources](data-sources.md)). Rate limits, endpoint changes, or region blocks will break search and loading with no fallback provider. Data quality issues (bad ticks, missing months, currency quirks for non-US listings) pass through unchecked.

## No dividends; splits handled only upstream

The app uses Yahoo's `close` series, which is split-adjusted by Yahoo, but it does **not** use the dividend-adjusted `adjclose` series. Long-run price charts of dividend-paying stocks therefore understate total return, and any correlation involving them is measured against price, not investor return. There is no explicit corporate-action handling in the codebase at all — you inherit whatever Yahoo returns.

## Survivorship and lookahead caveats

- **Survivorship:** you can only search for tickers that still exist on Yahoo. Delisted, bankrupt, and acquired companies are invisible, so any informal "this factor works on the stocks I checked" conclusion is biased toward survivors.
- **Lookahead / timing:** yearly alignment pairs a factor's value for year Y with the stock's *year-end* close for year Y. Many factor values (annual averages, fiscal-year revenues, full-year CPI) are only knowable *after* year end — so contemporaneous correlations describe hindsight, not what an investor could have traded on at the time. The current year mixes a partial-year stock close with provisionally entered factor values.
- **Monte Carlo lookahead of a different kind:** the simulation projects the future from the *same* historical window you loaded, assuming returns are i.i.d. normal with constant drift and volatility. It knows nothing about the factor, valuations, or regime changes.

## Static factor data goes stale

`factors.json` is hand-maintained, US-only, mixes annual-average with year-end conventions, and stops at 2025. Nobody updates it automatically. See [Data Sources](data-sources.md).

## Hand-rolled math, no tests

All statistics are custom pure-TypeScript implementations (incomplete beta p-values, Gaussian-elimination OLS, ADF test, etc.). They look reasonable, but the repository contains **no automated tests**, and the numerically delicate methods (Granger, cointegration, p-value approximations) are exactly where subtle bugs hide. The root README says it plainly: "Edge-case bugs possible… Use at your own risk." Independent verification against R/statsmodels is a welcome contribution.

## Other honest footnotes

- The stat card grid only ever analyzes the **first** selected factor; the other selected factors are chart overlays only.
- Portfolio data lives in localStorage: clearing browser data destroys it, and the `currentPrice` field is manual, not live.
- Some factors are themselves estimates ("Cloud Revenue" is a market-size estimate; "AI Adoption" is a VC-funding proxy), so you may be correlating a stock against someone's guess.
