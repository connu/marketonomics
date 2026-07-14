# Data Sources

Every number in the app comes from one of three places: Yahoo Finance (live, via proxy routes), the bundled `src/data/factors.json` (static), or your browser's localStorage (portfolio).

## 1. Yahoo Finance (live stock data)

Three Next.js API routes proxy Yahoo Finance's **unofficial, undocumented** endpoints at `query1.finance.yahoo.com`:

| Route | Yahoo endpoint | Used for | Cache |
|---|---|---|---|
| `/api/search?q=` | `/v1/finance/search` | Ticker autocomplete (equities, ETFs, indices; max 8 results) | none |
| `/api/history/[symbol]?range=` | `/v8/finance/chart/{symbol}` | Price history (OHLCV). Analysis always uses `range=max`, which returns **monthly** bars | 1 hour |
| `/api/quote/[symbol]` | `/v8/finance/chart/{symbol}` (1-day) | Current price / day change (exposed via `marketData.ts`; not currently called by either page) | 60 s |

### Reliability caveats — read these

- **This is not a supported API.** Yahoo publishes no documentation, offers no SLA, and has historically changed or restricted these endpoints without notice (the older public API was shut down in 2017; the current endpoints sometimes require cookies/crumbs or rate-limit aggressively). The routes send a generic `User-Agent: Mozilla/5.0` header to look like a browser. If Yahoo changes anything, **stock search and loading simply break** until the routes in `src/app/api/` are updated or a different provider is swapped in.
- **Terms of service.** Scraping Yahoo's endpoints likely sits outside their intended use. Fine for personal/educational tinkering; do not build a commercial product on it.
- **Price adjustment:** the history route reads the chart endpoint's `close` series, which Yahoo split-adjusts, but it does **not** request the dividend-adjusted `adjclose` series. So prices reflect splits but ignore dividends — long-run "performance" of high-yield stocks is understated relative to total return.
- **Privacy:** analysis math runs in your browser, but every symbol you search or load is sent to your own Next.js server, which forwards it to Yahoo. (The page also loads the Inter font from Google Fonts.) No analytics or tracking is built into the app itself.

## 2. Bundled factor data (`src/data/factors.json`)

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

## 3. Browser localStorage (portfolio)

Portfolio holdings are stored only in your browser, under the localStorage key **`quantlab_holdings_v1`**, as a JSON array of holdings (`id`, `company`, `ticker`, `shares`, `purchasePrice`, `currentPrice`, `sector`, `industry`). Implications:

- Nothing is uploaded anywhere; there is no account or sync.
- Data is per-browser and per-device. Clearing site data deletes it permanently.
- JSON **export** downloads the array as a dated file; **import** validates each record and silently drops malformed ones.
- `currentPrice` is whatever you entered — it is not refreshed from Yahoo.

No other data is persisted: analysis results, selected factors, and loaded stock history live only in React state and are gone on page reload.
