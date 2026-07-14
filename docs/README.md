# QuantLab Documentation

QuantLab (branded **QuantView** in the UI) is a client-side quantitative research tool. It overlays roughly two decades of annual macroeconomic factor data on stock prices fetched from Yahoo Finance, and runs a set of statistical methods on the aligned series.

These docs aim to be accurate and honest. They describe what the code actually does — including its limits — rather than what a marketing page would say.

## Contents

| Document | What it covers |
|---|---|
| [Getting Started](getting-started.md) | Install, run, and use the app: both tabs, searching stocks, selecting factors, reading results, portfolio data |
| [How It Works](how-it-works.md) | Architecture and data flow: API routes, yearly normalization, and a plain-language tour of every statistical method |
| [Data Sources](data-sources.md) | Where every number comes from: Yahoo Finance endpoints, the bundled `factors.json`, and what is stored in your browser |
| [Limitations](limitations.md) | What NOT to trust this program with — read this before acting on any result |
| [SWOT Analysis](swot.md) | An honest assessment of the application's strengths, weaknesses, opportunities, and threats |

## Quick orientation

- **Two pages:** Relationship Explorer (`/economics`) and Comparative Analysis (`/analytics`). The root URL redirects to `/economics`.
- **All statistics run in your browser.** The Next.js server only proxies Yahoo Finance requests.
- **Data is annual.** Stock prices are collapsed to one value per year and aligned with a static, bundled factor dataset covering 2004–2025.
- **This is educational software, not financial advice.** See [Limitations](limitations.md).
