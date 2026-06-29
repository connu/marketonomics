'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function usePortfolio(): UsePortfolioReturn {
  const [holdings, setHoldings] = useState<Holding[]>([])

  useEffect(() => {
    setHoldings(loadHoldings())
  }, [])

  useEffect(() => {
    saveHoldings(holdings)
  }, [holdings])

  const addHolding = useCallback((data: Omit<Holding, 'id'>) => {
    setHoldings((prev) => [...prev, { ...data, id: uuidv4() }])
  }, [])

  const updateHolding = useCallback((id: string, data: Omit<Holding, 'id'>) => {
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...data, id } : h)))
  }, [])

  const deleteHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const exportHoldings = useCallback(() => {
    exportJSON(holdings)
  }, [holdings])

  return { holdings, addHolding, updateHolding, deleteHolding, exportHoldings }
}
