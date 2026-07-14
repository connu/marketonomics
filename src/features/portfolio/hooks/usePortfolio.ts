'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { Holding } from '../types/holding'
import { loadHoldings, saveHoldings, exportJSON } from '../services/portfolioStorage'
import { v4 as uuidv4 } from 'uuid'

export interface UsePortfolioReturn {
  holdings: Holding[]
  addHolding: (holding: Omit<Holding, 'id'>) => void
  updateHolding: (id: string, holding: Omit<Holding, 'id'>) => void
  deleteHolding: (id: string) => void
  exportHoldings: () => void
}

// Module-level store: localStorage is the source of truth, hydrated lazily on
// the client so server renders see an empty portfolio without a hydration
// mismatch. All components using the hook share one synced copy.
let holdingsCache: Holding[] | null = null
const EMPTY_HOLDINGS: Holding[] = []
const listeners = new Set<() => void>()

function getSnapshot(): Holding[] {
  if (holdingsCache === null) holdingsCache = loadHoldings()
  return holdingsCache
}

function getServerSnapshot(): Holding[] {
  return EMPTY_HOLDINGS
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function mutateHoldings(update: (prev: Holding[]) => Holding[]): void {
  holdingsCache = update(getSnapshot())
  saveHoldings(holdingsCache)
  listeners.forEach((notify) => notify())
}

export function usePortfolio(): UsePortfolioReturn {
  const holdings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const addHolding = useCallback((data: Omit<Holding, 'id'>) => {
    mutateHoldings((prev) => [...prev, { ...data, id: uuidv4() }])
  }, [])

  const updateHolding = useCallback((id: string, data: Omit<Holding, 'id'>) => {
    mutateHoldings((prev) => prev.map((h) => (h.id === id ? { ...data, id } : h)))
  }, [])

  const deleteHolding = useCallback((id: string) => {
    mutateHoldings((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const exportHoldings = useCallback(() => {
    exportJSON(getSnapshot())
  }, [])

  return { holdings, addHolding, updateHolding, deleteHolding, exportHoldings }
}
