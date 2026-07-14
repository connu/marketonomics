---
name: verify
description: Build, launch, and drive the QuantView app to verify changes at its real surface
---

# Verifying marketonomics (QuantView)

## Build / lint (what CI runs)
- `npm run lint` — eslint; CI fails on errors only, warnings pass.
- `npm run build` — Next 16 (Turbopack) production build + TypeScript check.

## Launch
- `PORT=3777 npm run dev` in the background; ready in ~5s. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3777/economics` → 200.
- Live routes: `/` (redirect/landing), `/economics` (Relationship Explorer), `/analytics` (Comparative Analysis). Portfolio feature and IndicatorChart are NOT routed — dead code, no surface.

## Drive (Playwright, already in node_modules — no install needed)
Run scripts with `NODE_PATH=<repo>/node_modules node script.js` if the script lives outside the repo.

- Design mode: toggle pills labeled `Classic` / `TradingView` in the top nav. Persisted in `localStorage['qv-design-mode']`, applied as `data-design-mode` on `<html>` before paint. To start a page directly in dark mode: `page.addInitScript(() => localStorage.setItem('qv-design-mode', 'tradingview'))`. Classic body bg = `rgb(241,245,249)`, TradingView = `rgb(19,23,34)`.
- Economics flow: fill first `input` with a ticker (e.g. AAPL), wait ~1.5s, click first `[role="option"]`, click `button:has-text("Load Chart")`, wait ~2.5s. Range pills: 5Y/10Y/15Y/20Y. Factor overlays: click chip text (e.g. `text=Gold Price`). Live Yahoo Finance data — needs network.
- Analytics flow: charts render on load; click an off-diagonal matrix cell value (e.g. `text=0.89`) to open the pairwise drawer.
- Always collect `page.on('console')` errors and `pageerror`.

## Gotchas
- Foreground `sleep` is fine but the dev server must be started with `run_in_background` or `&` + log redirect.
- Kill with `lsof -ti :3777 | xargs kill`.
