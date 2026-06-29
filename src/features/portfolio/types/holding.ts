export interface Holding {
  id: string
  company: string
  ticker: string
  shares: number
  purchasePrice: number
  currentPrice: number
  sector: string
  industry: string
}

export interface HoldingFormData {
  company: string
  ticker: string
  shares: string
  purchasePrice: string
  currentPrice: string
  sector: string
  industry: string
}
