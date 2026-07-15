// Module-level watchlist store persisted to localStorage. Same pattern as the
// portfolio store: the server snapshot is a stable empty array so SSR never
// mismatches, and the cache hydrates lazily on first client read.

export interface WatchlistItem {
  symbol: string
  label: string
  addedAt: number
}

const STORAGE_KEY = 'qv_watchlist_v1'
/** Soft cap — keeps 60s quote polling well under Yahoo's tolerance. */
export const WATCHLIST_MAX = 20

function isValidItem(obj: unknown): obj is WatchlistItem {
  if (typeof obj !== 'object' || obj === null) return false
  const w = obj as Record<string, unknown>
  return typeof w.symbol === 'string' && typeof w.label === 'string' && typeof w.addedAt === 'number'
}

function load(): WatchlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidItem)
  } catch {
    return []
  }
}

function save(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

let cache: WatchlistItem[] | null = null
const EMPTY: WatchlistItem[] = []
const listeners = new Set<() => void>()

export function getSnapshot(): WatchlistItem[] {
  if (cache === null) cache = load()
  return cache
}

export function getServerSnapshot(): WatchlistItem[] {
  return EMPTY
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function mutate(update: (prev: WatchlistItem[]) => WatchlistItem[]): void {
  cache = update(getSnapshot())
  save(cache)
  listeners.forEach(notify => notify())
}
