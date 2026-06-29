export interface Indicator {
  symbol: string
  label: string
  description: string
  category: 'equity' | 'volatility' | 'rates' | 'commodities' | 'currency' | 'crypto'
  unit: string
  invertColor?: boolean
}

export interface IndicatorQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  previousClose: number
}

export const INDICATORS: Indicator[] = [
  {
    symbol: '^GSPC',
    label: 'S&P 500',
    description: 'Benchmark US large-cap equity index',
    category: 'equity',
    unit: 'pts',
  },
  {
    symbol: '^IXIC',
    label: 'NASDAQ',
    description: 'Technology-heavy US equity index',
    category: 'equity',
    unit: 'pts',
  },
  {
    symbol: '^DJI',
    label: 'Dow Jones',
    description: 'US blue-chip industrial average',
    category: 'equity',
    unit: 'pts',
  },
  {
    symbol: '^VIX',
    label: 'VIX',
    description: 'CBOE Volatility Index — the "fear gauge"',
    category: 'volatility',
    unit: '',
    invertColor: true,
  },
  {
    symbol: '^TNX',
    label: '10Y Treasury',
    description: 'US 10-year government bond yield',
    category: 'rates',
    unit: '%',
  },
  {
    symbol: '^FVX',
    label: '5Y Treasury',
    description: 'US 5-year government bond yield',
    category: 'rates',
    unit: '%',
  },
  {
    symbol: 'GC=F',
    label: 'Gold',
    description: 'Gold futures (USD/oz)',
    category: 'commodities',
    unit: 'USD/oz',
  },
  {
    symbol: 'CL=F',
    label: 'WTI Oil',
    description: 'WTI crude oil futures (USD/bbl)',
    category: 'commodities',
    unit: 'USD/bbl',
  },
  {
    symbol: 'SI=F',
    label: 'Silver',
    description: 'Silver futures (USD/oz)',
    category: 'commodities',
    unit: 'USD/oz',
  },
  {
    symbol: 'DX-Y.NYB',
    label: 'USD Index',
    description: 'US Dollar Index against basket of major currencies',
    category: 'currency',
    unit: '',
  },
  {
    symbol: 'EURUSD=X',
    label: 'EUR/USD',
    description: 'Euro to US Dollar exchange rate',
    category: 'currency',
    unit: '',
  },
  {
    symbol: 'BTC-USD',
    label: 'Bitcoin',
    description: 'Bitcoin price in USD',
    category: 'crypto',
    unit: 'USD',
  },
  {
    symbol: 'ETH-USD',
    label: 'Ethereum',
    description: 'Ethereum price in USD',
    category: 'crypto',
    unit: 'USD',
  },
]

export const CATEGORY_LABELS: Record<Indicator['category'], string> = {
  equity: 'Equity Indices',
  volatility: 'Volatility',
  rates: 'Interest Rates',
  commodities: 'Commodities',
  currency: 'Currency',
  crypto: 'Crypto',
}
