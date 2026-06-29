import { Holding } from '../types/holding'

const STORAGE_KEY = 'quantlab_holdings_v1'

function isValidHolding(obj: unknown): obj is Holding {
  if (typeof obj !== 'object' || obj === null) return false
  const h = obj as Record<string, unknown>
  return (
    typeof h.id === 'string' &&
    typeof h.company === 'string' &&
    typeof h.ticker === 'string' &&
    typeof h.shares === 'number' &&
    typeof h.purchasePrice === 'number' &&
    typeof h.currentPrice === 'number' &&
    typeof h.sector === 'string' &&
    typeof h.industry === 'string'
  )
}

export function loadHoldings(): Holding[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidHolding)
  } catch {
    return []
  }
}

export function saveHoldings(holdings: Holding[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
}

export function exportJSON(holdings: Holding[]): void {
  const blob = new Blob([JSON.stringify(holdings, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `quantlab-portfolio-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file: File): Promise<Holding[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!Array.isArray(parsed)) {
          reject(new Error('File must contain a JSON array of holdings'))
          return
        }
        const valid = parsed.filter(isValidHolding)
        if (valid.length === 0 && parsed.length > 0) {
          reject(new Error('No valid holdings found in file'))
          return
        }
        resolve(valid)
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
