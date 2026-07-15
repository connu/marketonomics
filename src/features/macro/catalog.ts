// Whitelisted FRED series catalog — the single source of truth shared by the
// /api/macro route handler (validation) and the UI (labels, grouping).
// Keyless data comes from fredgraph.csv; an optional FRED_API_KEY env var
// upgrades the route to the official JSON API with the same response shape.

export type MacroCategory = 'inflation' | 'rates' | 'labor' | 'money' | 'activity' | 'housing'

export interface MacroSeriesDef {
  /** FRED series id, e.g. 'CPIAUCSL' */
  id: string
  label: string
  unit: string
  category: MacroCategory
  frequency: 'monthly' | 'quarterly' | 'daily' | 'weekly'
  /** Series where a year-over-year % view is the meaningful default */
  yoy?: boolean
  description: string
}

export const MACRO_SERIES: MacroSeriesDef[] = [
  { id: 'CPIAUCSL', label: 'CPI', unit: 'index', category: 'inflation', frequency: 'monthly', yoy: true, description: 'Consumer Price Index for All Urban Consumers' },
  { id: 'PCEPI', label: 'PCE Price Index', unit: 'index', category: 'inflation', frequency: 'monthly', yoy: true, description: 'Personal Consumption Expenditures price index — the Fed’s preferred inflation gauge' },
  { id: 'FEDFUNDS', label: 'Fed Funds Rate', unit: '%', category: 'rates', frequency: 'monthly', description: 'Effective federal funds rate' },
  { id: 'DGS10', label: '10Y Treasury Yield', unit: '%', category: 'rates', frequency: 'daily', description: 'Market yield on 10-year US Treasury securities' },
  { id: 'DGS2', label: '2Y Treasury Yield', unit: '%', category: 'rates', frequency: 'daily', description: 'Market yield on 2-year US Treasury securities' },
  { id: 'T10Y2Y', label: '10Y-2Y Spread', unit: '%', category: 'rates', frequency: 'daily', description: 'Yield-curve spread — negative values signal inversion' },
  { id: 'UNRATE', label: 'Unemployment Rate', unit: '%', category: 'labor', frequency: 'monthly', description: 'Civilian unemployment rate' },
  { id: 'PAYEMS', label: 'Nonfarm Payrolls', unit: 'thousands', category: 'labor', frequency: 'monthly', yoy: true, description: 'Total nonfarm employment' },
  { id: 'M2SL', label: 'M2 Money Supply', unit: '$B', category: 'money', frequency: 'monthly', yoy: true, description: 'M2 money stock' },
  { id: 'INDPRO', label: 'Industrial Production', unit: 'index', category: 'activity', frequency: 'monthly', yoy: true, description: 'Industrial production index' },
  { id: 'UMCSENT', label: 'Consumer Sentiment', unit: 'index', category: 'activity', frequency: 'monthly', description: 'University of Michigan consumer sentiment' },
  { id: 'PCE', label: 'Consumer Spending', unit: '$B', category: 'activity', frequency: 'monthly', yoy: true, description: 'Personal consumption expenditures' },
  { id: 'HOUST', label: 'Housing Starts', unit: 'thousands', category: 'housing', frequency: 'monthly', description: 'New privately-owned housing units started' },
  { id: 'MORTGAGE30US', label: '30Y Mortgage Rate', unit: '%', category: 'housing', frequency: 'weekly', description: 'Average 30-year fixed mortgage rate' },
]

export const MACRO_CATEGORY_ORDER: MacroCategory[] = ['inflation', 'rates', 'labor', 'money', 'activity', 'housing']

export const MACRO_CATEGORY_LABELS: Record<MacroCategory, string> = {
  inflation: 'Inflation',
  rates: 'Interest Rates',
  labor: 'Labor Market',
  money: 'Money Supply',
  activity: 'Economic Activity',
  housing: 'Housing',
}

export function getMacroDef(id: string): MacroSeriesDef | null {
  return MACRO_SERIES.find(s => s.id === id) ?? null
}
