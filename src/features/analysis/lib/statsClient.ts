// Client for the stats Web Worker. Falls back to synchronous main-thread
// computation when workers are unavailable (SSR, old browsers, or a bundler
// regression), so stats always render even if the worker path breaks.

import { computeCards, type StatCard, type StatColors } from './statCards'
import { monteCarlo, type MonteCarloResult } from './math'

export type StatsRequest =
  | { id: number; kind: 'statCards'; x: number[]; y: number[]; years: number[]; factorLabel: string; symbol: string; colors: StatColors }
  | { id: number; kind: 'monteCarlo'; prices: number[]; nSimulations: number; horizonYears: number }

export type StatsResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string }

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function failAllPending(reason: string): void {
  pending.forEach(({ reject }) => reject(new Error(reason)))
  pending.clear()
}

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null
  if (worker) return worker
  try {
    worker = new Worker(new URL('../workers/stats.worker.ts', import.meta.url))
    worker.onmessage = (e: MessageEvent<StatsResponse>) => {
      const msg = e.data
      const entry = pending.get(msg.id)
      if (!entry) return
      pending.delete(msg.id)
      if (msg.ok) entry.resolve(msg.result)
      else entry.reject(new Error(msg.error))
    }
    worker.onerror = () => {
      failAllPending('Stats worker crashed')
      worker?.terminate()
      worker = null
    }
  } catch {
    worker = null
  }
  return worker
}

function post<T>(req: StatsRequest): Promise<T> {
  const w = getWorker()
  if (!w) return Promise.reject(new Error('worker unavailable'))
  return new Promise<T>((resolve, reject) => {
    pending.set(req.id, { resolve: resolve as (v: unknown) => void, reject })
    w.postMessage(req)
  })
}

export async function runStatCards(
  x: number[], y: number[], years: number[], factorLabel: string, symbol: string, colors: StatColors
): Promise<StatCard[]> {
  try {
    return await post<StatCard[]>({ id: ++seq, kind: 'statCards', x, y, years, factorLabel, symbol, colors })
  } catch {
    return computeCards(x, y, years, factorLabel, symbol, colors)
  }
}

export async function runMonteCarlo(
  prices: number[], nSimulations = 500, horizonYears = 10
): Promise<MonteCarloResult> {
  try {
    return await post<MonteCarloResult>({ id: ++seq, kind: 'monteCarlo', prices, nSimulations, horizonYears })
  } catch {
    return monteCarlo(prices, nSimulations, horizonYears)
  }
}
