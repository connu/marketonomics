'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  getSnapshot, getServerSnapshot, subscribe, mutate,
  WATCHLIST_MAX, type WatchlistItem,
} from '../store'

export interface UseWatchlistReturn {
  items: WatchlistItem[]
  add: (symbol: string, label: string) => void
  remove: (symbol: string) => void
  has: (symbol: string) => boolean
  isFull: boolean
}

export function useWatchlist(): UseWatchlistReturn {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const add = useCallback((symbol: string, label: string) => {
    mutate(prev => {
      if (prev.length >= WATCHLIST_MAX || prev.some(i => i.symbol === symbol)) return prev
      return [...prev, { symbol, label, addedAt: Date.now() }]
    })
  }, [])

  const remove = useCallback((symbol: string) => {
    mutate(prev => prev.filter(i => i.symbol !== symbol))
  }, [])

  const has = useCallback(
    (symbol: string) => items.some(i => i.symbol === symbol),
    [items]
  )

  return { items, add, remove, has, isFull: items.length >= WATCHLIST_MAX }
}
