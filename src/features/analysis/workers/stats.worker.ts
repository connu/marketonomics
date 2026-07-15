// Web Worker that runs the heavier statistical computations (10-method stat
// cards, Monte Carlo simulation) off the main thread. Message contracts live
// in lib/statsClient.ts; payloads must stay structured-clone serializable.

import { computeCards } from '../lib/statCards'
import { monteCarlo } from '../lib/math'
import type { StatsRequest, StatsResponse } from '../lib/statsClient'

const scope = self as unknown as {
  postMessage: (msg: StatsResponse) => void
  onmessage: ((e: MessageEvent<StatsRequest>) => void) | null
}

scope.onmessage = (e: MessageEvent<StatsRequest>) => {
  const msg = e.data
  try {
    switch (msg.kind) {
      case 'statCards':
        scope.postMessage({
          id: msg.id,
          ok: true,
          result: computeCards(msg.x, msg.y, msg.years, msg.factorLabel, msg.symbol, msg.colors),
        })
        break
      case 'monteCarlo':
        scope.postMessage({
          id: msg.id,
          ok: true,
          result: monteCarlo(msg.prices, msg.nSimulations, msg.horizonYears),
        })
        break
    }
  } catch (err) {
    scope.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
