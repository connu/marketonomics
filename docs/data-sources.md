# Data Sources

Every number in the app comes from one of four places: Yahoo Finance (live, via proxy routes), FRED (live macro, via a proxy route), the bundled `src/data/factors.json` (static), or your browser's localStorage (watchlist/portfolio).

All live sources are **free and keyless** — no signup, no API key, no billing. FRED has an optional key upgrade; see below.

## 1. Yahoo Finance (live stock data)

Four Next.js API routes proxy Yahoo Finance's **unofficial, undocumented** endpoints:

| Route | Yahoo endpoint | Used for | Cache |
|---|---|---|---|
| `/api/search?q=` | `/v1/finance/search` | Ticker autocomplete (equities, ETFs, indices; max 8 results). Retries once on a transient upstream blip | 5 min |
| `/api/history/[symbol]?range=&interval=` | `/v8/finance/chart/{symbol}` | Price history (OHLCV). Analysis uses `range=max` (monthly bars); the Strategy Lab passes an explicit `interval` (`1wk`/`1mo`). Daily bars are refused for `10y`/`max` ranges | 1 hour |
| `/api/quote/[symbol]` | `/v8/finance/chart/{symbol}` (1-day) | Current price / day change — powers the Live Macro market cards and the watchlist | 60 s |
| `/api/news/[symbol]` | `feeds.finance.yahoo.com/rss/2.0/headline` | Per-ticker headlines (RSS/XML, parsed server-side by `features/news/lib/parseRss.ts`). Soft-fails to an empty list — news never breaks the page | 15 min |

### Reliability caveats — read these

- **This is not a supported API.** Yahoo publishes no documentation, offers no SLA, and has historically changed or restricted these endpoints without notice (the older public API was shut down in 2017; the current endpoints sometimes require cookies/crumbs or rate-limit aggressively). The routes send a generic `User-Agent: Mozilla/5.0` header to look like a browser. If Yahoo changes anything, **stock search and loading simply break** until the routes in `src/app/api/` are updated or a different provider is swapped in.
- **Terms of service.** Scraping Yahoo's endpoints likely sits outside their intended use. Fine for personal/educational tinkering; do not build a commercial product on it.
- **Price adjustment:** the history route reads the chart endpoint's `close` series, which Yahoo split-adjusts, but it does **not** request the dividend-adjusted `adjclose` series. So prices reflect splits but ignore dividends — long-run "performance" of high-yield stocks is understated relative to total return.
- **Privacy:** analysis math runs in your browser, but every symbol you search or load is sent to your own Next.js server, which forwards it to Yahoo. (The page also loads the Inter font from Google Fonts.) No analytics or tracking is built into the app itself.

## 2. FRED (live macro data)

`/api/macro/[series]` proxies the **Federal Reserve Bank of St. Louis (FRED)**, powering the Live Macro tab, the `macro:` series on Comparative Analysis, and the Strategy Lab's macro filters.

- **Keyless by default.** The route reads FRED's public CSV export (`fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES>`) — no signup, no key. Cached 6 hours (these series update monthly at most).
- **Whitelisted series only.** `src/features/macro/catalog.ts` is the single source of truth for which series are allowed, shared by the route (validation — this prevents the route becoming an open proxy) and the UI (labels, categories, YoY defaults). Unknown ids return 400. Currently 14 series across inflation, rates, labor, money supply, activity, and housing.
- **Frequency.** Monthly for most series (daily for Treasury yields, weekly for mortgage rates) — considerably richer than the annual `factors.json` data. Levels reach back decades (e.g. Fed Funds to 1954, CPI to 1947).
- **Parsing caveats handled:** FRED marks missing observations with `.`, has used both `DATE` and `observation_date` as the first column header, and returns an **HTML error page with a 200 status** for a bad series id — so the route checks the content-type before parsing.

### Optional: FRED API key upgrade

The app is fully functional without a key. Setting one switches the route to FRED's official JSON API, which is more stable than the CSV export and has explicit rate limits rather than informal ones. The client response shape is identical either way, so nothing else changes.

1. Create a free account at <https://fredaccount.stlouisfed.org/apikeys> and request an API key (instant, free, no card).
2. Add it to `.env.local` in the project root:
   ```
   FRED_API_KEY=your_key_here
   ```
3. Restart the dev server. `src/app/api/macro/[series]/route.ts` picks it up automatically.

## 3. Bundled factor data (`src/data/factors.json`)

The macroeconomic dataset is a **static JSON file checked into the repository**. It contains:

- A `years` array: **2004 through 2025** (22 annual values).
- 21 factors, each with a label, unit, category, description, and exactly 22 values.

### The factors

| ID | Label | Unit | Category | Stated origin (per description text) |
|---|---|---|---|---|
| `interest_rate` | Federal Funds Rate | % | Monetary Policy | Federal Reserve / FRED (annual average) |
| `inflation_cpi` | Inflation Rate (CPI) | % | Monetary Policy | BLS / FRED (annual % change) |
| `reserve_requirement` | Reserve Requirement (CRR) | % | Monetary Policy | Federal Reserve (0% since March 2020) |
| `sp500` | S&P 500 Performance | pts | Market Indices | Yahoo Finance / S&P Global (year-end close) |
| `nasdaq` | NASDAQ Performance | pts | Market Indices | Yahoo Finance / NASDAQ (year-end close) |
| `usd_index` | USD Strength (DXY) | index | Market Indices | ICE / FRED (year-end) |
| `gold` | Gold Price | $/oz | Commodities | LBMA / FRED (annual average) |
| `silver` | Silver Price | $/oz | Commodities | LBMA / FRED (annual average) |
| `oil_wti` | Petrol (WTI Crude) | $/bbl | Commodities | EIA / FRED (annual average) |
| `wheat` | Wheat Price | $/bu | Commodities | USDA / CBOT (annual average) |
| `corn` | Corn Price | $/bu | Commodities | USDA / CBOT (annual average) |
| `nvidia_revenue` | NVIDIA Revenue | $B | Technology | NVIDIA earnings reports |
| `micron_revenue` | Micron Revenue | $B | Technology | Micron earnings reports |
| `cloud_revenue` | Cloud Revenue (US Market) | $B | Technology | Gartner / Synergy Research **estimates** |
| `ai_investment` | AI Adoption (US VC) | $B | Technology | PitchBook / Stanford AI Index |
| `electricity_price` | Electricity Prices | ¢/kWh | Macroeconomic | EIA (US residential average) |
| `fdi` | Foreign Direct Investment | $B | Macroeconomic | BEA / UNCTAD |
| `household_debt` | Household Debt | $T | Macroeconomic | NY Fed / FRED |
| `current_account` | Current Account Balance | $B | Macroeconomic | BEA / FRED |
| `trade_balance` | Net Exports (Trade Balance) | $B | Macroeconomic | US Census Bureau / BEA |
| `weather_temp` | US Annual Temperature | °F | Climate | NOAA NCEI (contiguous 48 states) |

### Caveats

- **The file is static and hand-assembled.** The "Source" lines above come from the descriptions inside the JSON; the values were transcribed into the file by the author, not fetched from those institutions at runtime. There is no automated pipeline, no provenance beyond the description strings, and no way to verify a value without checking it against the original source yourself.
- **It goes stale.** Adding 2026 (or correcting any value) requires manually editing `src/data/factors.json`. The most recent year's values were necessarily entered before the year ended, so treat them as provisional.
- **Mixed conventions.** Some factors are annual averages, others year-end snapshots, others fiscal-year company figures — noted in each description. Comparing an annual-average series against a year-end series adds subtle timing mismatch.
- Note that everything is **US-centric**: US rates, US inflation, US indices, US temperature.

## 4. Browser localStorage

Three keys, all local to your browser — nothing is uploaded, there is no account or sync, and clearing site data deletes them permanently.

| Key | Holds |
|---|---|
| `qv_watchlist_v1` | Watchlist symbols (`symbol`, `label`, `addedAt`), max 20. Quotes refresh every 60 s while the tab is visible |
| `qv-design-mode` | Classic / TradingView design choice, applied before first paint |
| `quantlab_holdings_v1` | Portfolio holdings — see caveat below |

Each store validates records on load and silently drops malformed ones. All use the `useSyncExternalStore` pattern with a stable empty server snapshot, so SSR never mismatches.

**Portfolio caveat:** the portfolio feature (`src/features/portfolio/`) is inherited fork code that is **not routed** — it has no UI surface in the app. Its `currentPrice` is whatever was entered and is never refreshed from Yahoo.

## What is *not* persisted

Analysis results, selected factors, loaded stock history, and backtest results live only in React state. However, the **Relationship Explorer and Comparative Analysis encode their state in the URL** (`?symbol=&factors=&range=` and `?series=`), so those analyses survive a reload and can be shared as links.
