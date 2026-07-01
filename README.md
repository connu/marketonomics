# QuantLab

A quantitative portfolio research platform that overlays 20 years of macroeconomic data on stock prices, enabling sophisticated statistical analysis of correlations and causal relationships.

**Analyze. Understand. Decide.**


---

## Overview

https://github.com/user-attachments/assets/e10b4631-7319-4c2f-9686-e1db1322df9c



QuantLab performs analysis on stocks by correlating stock performance with macroeconomic [but not limited to] factors. All computation runs **client-side in your browser** the data never leaves your machine. 

### Key Features

- **Economic Factor Analysis** — Overlay 20 years of macro data (inflation, unemployment, GDP, interest rates, etc.) on any stock
- **10 Statistical Methods** — From basic correlation to advanced causal inference
- **Privacy First** — Client-side computation. No backend, no tracking, no data transmission
- **Portfolio Management** — Track holdings, import/export via JSON
- **Real Market Data** — Live data from Yahoo Finance
- **No Installation** — Runs entirely in the browser

---

## Quick Start
### Run Analysis

1. **Search** a stock (e.g., AAPL, NVDA, SPY)
2. **Select factors** (inflation, unemployment, yield curve, etc.)
3. **Choose a method** (Pearson correlation, Granger causality, etc.)
4. **View results** — charts, statistics, and interpretations

---

## Architecture

### Data Flow

```
User selects stock
    ↓
Fetch 20y price history (Yahoo Finance API)
    ↓
Normalize to yearly frequency
    ↓
Align with economic factor data
    ↓
Run statistical analysis (client-side)
    ↓
Render charts + results

```

### Tech Stack

- **Frontend** — Next.js 16, React 19, TypeScript
- **UI** — Material-UI (MUI) with responsive design
- **Charts** — Recharts
- **Data** — Yahoo Finance API (free tier)
- **Math** — Pure TypeScript implementations (no external dependencies)

---

## Statistical Methods

QuantLab implements 10 econometric and statistical methods:

| Method | Use Case | Output |
|--------|----------|--------|
| **Pearson Correlation** | Linear relationship strength | r ∈ [-1, 1], p-value |
| **Spearman Rank Correlation** | Monotonic relationship (rank-based) | ρ ∈ [-1, 1], p-value |
| **Cross-Correlation** | Time-lagged relationship | Correlation at lags 0±n, p-value |
| **Linear Regression** | Predict stock price from factor | Coefficient, R², residual plot |
| **Rolling Correlation** | Time-varying relationship | Correlation over rolling windows |
| **Granger Causality** | Does factor *cause* stock moves? | F-stat, p-value, reject/fail-to-reject |
| **Cointegration** | Long-run equilibrium relationship | ADF stat, p-value, cointegrating vector |
| **Monte Carlo Simulation** | Price path uncertainty | Distribution, confidence intervals |
| **Elasticity Analysis** | % change in stock per % change in factor | Elasticity coefficient |
| **Mutual Information** | Information-theoretic dependence | Bits of shared information |

**All methods include statistical significance testing (p-values, confidence intervals).**

---

## Platform Features

### Economics Page (Active)
- Search and load any stock/ETF/index
- Overlay with macro factors
- Switch between 5Y, 10Y, 15Y, 20Y lookback windows
- Switch statistical methods on the fly
- View normalized charts and raw correlation tables

### Portfolio Page (Stub)
- Add/edit/delete holdings
- Import holdings from JSON
- Export portfolio to JSON
- Planned: cost basis tracking, performance attribution

### Analytics Page (Stub)
- Planned: factor exposure across portfolio
- Planned: correlation matrix heatmaps
- Planned: risk decomposition

### Simulation Page (Stub)
- Planned: Monte Carlo portfolio paths
- Planned: scenario analysis
- Planned: stress testing

### Dashboard Page (Stub)
- Planned: portfolio overview
- Planned: alerts on factor divergences

### Fundamentals Page (Stub)
- Planned: P/E, PEG, debt ratios
- Planned: earnings history
- Planned: valuation metrics

---

## Limitations

### By Design
- **Client-side only** — No backend. Limits real-time streaming, persistence, and enterprise features.
- **Daily data** — Yahoo Finance free API provides daily OHLCV. Intraday analysis not supported.
- **20-year history** — Longer histories available on paid APIs (Bloomberg, FactSet).
- **No authentication** — Single-user tool. Data stored in localStorage (browser-specific, not synced).

### Known Risks
- **Yahoo Finance API** — Free tier has no SLA. Subject to rate limits, terms changes, or deprecation.
- **Custom math implementations** — All statistical methods are hand-coded. Edge-case bugs possible (especially in cointegration, Granger causality). Use at your own risk.
- **Browser limitations** — Large datasets (10K+ symbols) will slow down. Cache clears wipe portfolio data.

---

## Development

### Project Structure

```
src/
├── app/                          # Next.js pages & layout
│   ├── (routes)/                 # Route groups
│   │   ├── economics/            # Main analysis page
│   │   ├── portfolio/
│   │   ├── analytics/
│   │   ├── simulation/
│   │   ├── dashboard/
│   │   └── fundamentals/
│   ├── api/                      # API routes (Yahoo Finance proxy)
│   │   ├── search/
│   │   ├── quote/
│   │   └── history/
│   └── layout.tsx
├── components/                   # Shared components
│   └── layout/AppShell.tsx
├── features/                     # Feature modules
│   ├── analysis/                 # Core econometric analysis
│   │   ├── hooks/useFactorAnalysis.ts
│   │   ├── lib/
│   │   │   ├── math.ts           # Statistical implementations
│   │   │   └── normalize.ts      # Data alignment
│   │   └── components/
│   ├── portfolio/                # Portfolio management
│   │   ├── hooks/
│   │   └── services/
│   └── economics/                # Economics data layer
├── services/                     # Global services (market data)
├── types/                        # Global types
└── utils/                        # Helpers (formatting, etc.)
```

### Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
```

### Testing

Currently no tests. Contribution needed:
- Unit tests for math library (./src/features/analysis/lib/math.ts)
- Integration tests for analysis flows
- E2E tests with Playwright

---

## Roadmap

### Phase 1 (Current)
- [x] Economics factor analysis
- [ ] Unit tests for math library
- [ ] Portfolio page
- [ ] Documentation (algorithms, math)

### Phase 2 (Planned)
- [ ] Backtesting engine (replay strategies over 20y history)
- [ ] Portfolio optimization (Markowitz mean-variance)
- [ ] Real-time alerts
- [ ] PDF reports and email

### Phase 3 (Future)
- [ ] Backend (persistence, team collaboration)
- [ ] Institutional API
- [ ] Alternative data (crypto, commodities, sentiment)
- [ ] ML-based factor discovery
- [ ] Desktop app (Tauri/Electron)
- [ ] Mobile app (React Native)

---

## Contributing

This is an early-stage solo project. Contributions welcome:

1. **Math review** — Peer-review implementations in `src/features/analysis/lib/math.ts`
2. **Tests** — Add unit/integration tests
3. **Features** — Implement stub pages or new analysis methods
4. **Docs** — Improve algorithm documentation

Fork, branch, and open a PR.

---

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Vercel auto-deploys on push. Uses Vercel's free tier for edge functions (API routes).

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Disclaimers

⚠️ **QuantLab is educational software. Not investment advice.**

- Past correlation does not predict future returns.
- Statistical significance ≠ practical significance.
- Always do your own due diligence.
- Backtests can be optimized for past data and fail in live markets.
- Use at your own risk. Authors assume no liability.

---

## License

MIT

---

## FAQ

**Q: Can I use this for real trading?**  
A: At your own risk. The tool is educational. Real trading requires risk management, diversification, position sizing, and compliance. Many profitable-looking strategies fail live.

**Q: Why client-side only?**  
A: Privacy. Your analysis data never leaves your browser. No surveillance, no data sales, no backend logs.

**Q: Can I analyze intraday data?**  
A: Not with Yahoo Finance free API. Upgrade to a paid provider (Twelve Data, Alpha Vantage, IEX Cloud) for minute-level data.

**Q: How long does analysis take?**  
A: Seconds. Most methods (correlation, regression) are O(n). Granger and cointegration tests use numerical methods—O(n²–n³).

**Q: What if Yahoo Finance API breaks?**  
A: The app will stop working. Swapping data sources requires updating `src/app/api/` routes.

**Q: Can I export my analysis?**  
A: Portfolio data exports as JSON. Charts can be screenshotted. Feature request: PDF reports.

**Q: Is there a mobile app?**  
A: Not yet. QuantLab runs on mobile browsers, but optimized mobile app is planned.

---

## Resources

- [QuantLab Docs](./AGENTS.md) (project guidelines)
- [Next.js Docs](https://nextjs.org/docs)
- [MUI Docs](https://mui.com/)
- [Econometrics Primer](https://en.wikipedia.org/wiki/Econometrics) (Wikipedia)

---

**Made with ❤️ for quantitative researchers.**
