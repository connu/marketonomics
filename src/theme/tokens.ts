import type { CSSProperties } from 'react'

// Two app-wide design modes:
//  - 'classic'     — the original QuantView light theme (values copied verbatim
//                    from the previously hardcoded hex colors, so the rendered
//                    result is pixel-identical to the old design).
//  - 'tradingview' — a dark mode based on TradingView's charting platform palette.
export type DesignMode = 'classic' | 'tradingview'

export const DESIGN_MODE_STORAGE_KEY = 'qv-design-mode'
export const DESIGN_MODE_ATTR = 'data-design-mode'

export interface ChartTokens {
  /** Grid stroke for mini charts / drawer charts */
  grid: string
  /** Grid stroke for the hero overlay chart */
  gridAlt: string
  /** Grid dash pattern; undefined = solid lines (TradingView style) */
  gridDash?: string
  /** Axis tick text color */
  tick: string
  /** Zero/base reference line */
  refLine: string
  /** Hover crosshair for tooltips; undefined = library default */
  cursor?: { stroke: string; strokeWidth: number }
  /** Cursor style for scatter tooltips */
  scatterCursor: Record<string, string | number>
  /** Recharts Tooltip contentStyle */
  tooltip: CSSProperties
  /** Recharts Tooltip labelStyle */
  tooltipLabel: CSSProperties
  /** Primary series color (the stock line) */
  primary: string
  /** Primary series stroke width */
  primaryWidth: number
  /** Draw a soft gradient area fill under primary line series */
  areaGradient: boolean
}

export interface DesignTokens {
  /** Positive / up values (returns, gains, significant stats) */
  pos: string
  /** Negative / down values */
  neg: string
  /** Neutral stat color */
  neutral: string
  /** Primary accent blue */
  accent: string
  /** Accent-colored text that must stay readable on the app background */
  accentText: string
  /** Tinted accent surface (info boxes, badges) */
  accentBg: string
  accentBorder: string
  warn: string
  /** Strongest ink (was #0f172a) */
  textStrong: string
  /** Body ink (was #374151) */
  textBody: string
  /** Muted ink (was #94a3b8) */
  textMuted: string
  /** Faintest ink (was #cbd5e1) */
  textFaint: string
  /** Recessed pane background (was #f8fafc) */
  insetBg: string
  /** Recessed pane hover (was #f1f5f9) */
  insetHover: string
  /** Progress-bar track (was #f1f5f9) */
  trackBg: string
  /** Faint internal divider (was #f1f5f9) */
  hairline: string
  /** Subtle border (was #e2e8f0) */
  borderSubtle: string
  /** Lag-analysis cell background (was #fff) */
  lagCellBg: string
  /** Sub-label inside the highlighted peak-lag cell (was #93c5fd) */
  peakLagSubtext: string
  /** Modal/drawer backdrop */
  overlay: string
  panelShadow: string
  navShadow: string
  cardShadow: string
  cardShadowHover: string
  drawerShadow: string
  /** Nav segmented-control container background (was #f1f5f9) */
  navPillBg: string
  activeTabBg: string
  activeTabText: string
  inactiveTabText: string
  tabShadow: string
  /** Brand logo square */
  brandBg: string
  liveDot: string
  liveRing: string
  /** Series palette for standalone factor/stock series (analytics grid) */
  factorColors: string[]
  /**
   * Series palette for factor overlays drawn against the primary stock line
   * (Relationship Explorer). Excludes chart.primary so overlays never collide
   * with the stock series. Identical to factorColors in classic mode.
   */
  overlayFactorColors: string[]
  /** Correlation matrix cell background for a given r */
  corrColor: (v: number) => string
  /** Correlation matrix cell text color for a given r */
  corrText: (v: number) => string
  corrDiagText: string
  /** Correlation legend swatches, -1 … +1 */
  corrLegend: string[]
  corrNeutralBorder: string
  chart: ChartTokens
}

// ---------------------------------------------------------------------------
// Classic (light) — values copied verbatim from the original hardcoded design.
// ---------------------------------------------------------------------------

// Saturated palette that reads clearly on a white canvas (QuantView light theme).
export const CLASSIC_FACTOR_COLORS = [
  '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#065f46',
  '#b45309', '#0891b2', '#be185d', '#1e40af', '#166534',
  '#92400e', '#0f766e', '#9f1239', '#4338ca', '#ea580c',
]

const classic: DesignTokens = {
  pos: '#16a34a',
  neg: '#dc2626',
  neutral: '#64748b',
  accent: '#2563eb',
  accentText: '#1d4ed8',
  accentBg: '#eff6ff',
  accentBorder: '#bfdbfe',
  warn: '#f59e0b',
  textStrong: '#0f172a',
  textBody: '#374151',
  textMuted: '#94a3b8',
  textFaint: '#cbd5e1',
  insetBg: '#f8fafc',
  insetHover: '#f1f5f9',
  trackBg: '#f1f5f9',
  hairline: '#f1f5f9',
  borderSubtle: '#e2e8f0',
  lagCellBg: '#fff',
  peakLagSubtext: '#93c5fd',
  overlay: 'rgba(15,23,42,0.15)',
  panelShadow: '0 1px 4px rgba(0,0,0,0.04)',
  navShadow: '0 1px 4px rgba(0,0,0,0.05)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.04)',
  cardShadowHover: '0 4px 16px rgba(0,0,0,0.09)',
  drawerShadow: '-6px 0 28px rgba(0,0,0,0.09)',
  navPillBg: '#f1f5f9',
  activeTabBg: '#fff',
  activeTabText: '#0f172a',
  inactiveTabText: '#64748b',
  tabShadow: '0 1px 3px rgba(0,0,0,0.1)',
  brandBg: '#0f172a',
  liveDot: '#22c55e',
  liveRing: '#bbf7d0',
  factorColors: CLASSIC_FACTOR_COLORS,
  overlayFactorColors: CLASSIC_FACTOR_COLORS,
  corrColor: (v: number): string => {
    if (v >= 0.99) return '#0f172a'
    if (v > 0.6) return '#1d4ed8'
    if (v > 0.35) return '#3b82f6'
    if (v > 0.1) return '#93c5fd'
    if (v > -0.1) return '#f1f5f9'
    if (v > -0.35) return '#fca5a5'
    if (v > -0.6) return '#ef4444'
    return '#b91c1c'
  },
  corrText: (v: number): string =>
    Math.abs(v) > 0.4 || v >= 0.99 ? '#ffffff' : '#0f172a',
  corrDiagText: '#94a3b8',
  corrLegend: ['#b91c1c', '#ef4444', '#fca5a5', '#f1f5f9', '#93c5fd', '#3b82f6', '#1d4ed8'],
  corrNeutralBorder: '#e2e8f0',
  chart: {
    grid: '#eef2f6',
    gridAlt: '#f1f5f9',
    gridDash: '3 3',
    tick: '#94a3b8',
    refLine: '#e2e8f0',
    cursor: undefined,
    scatterCursor: { strokeDasharray: '3 3' },
    tooltip: { fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' },
    tooltipLabel: { color: '#0f172a', fontWeight: 600 },
    primary: '#0f172a',
    primaryWidth: 2.5,
    areaGradient: false,
  },
}

// ---------------------------------------------------------------------------
// TradingView (dark) — TradingView's actual dark-theme palette.
//   background #131722 · panels #1e222d · borders/grid #2a2e39
//   axis text #787b86 · primary text #d1d4dc
//   blue #2962ff · up #26a69a · down #ef5350 · crosshair #758696
// ---------------------------------------------------------------------------

// Series palette validated (dataviz six-checks) against the #131722 surface.
export const TV_FACTOR_COLORS = [
  '#2962ff', '#ef5350', '#e65100', '#9575cd', '#26a69a',
  '#f4511e', '#0097a7', '#ec407a', '#43a047', '#7986cb',
  '#b28522', '#00897b', '#d81b60', '#5c6bc0', '#c75b39',
]

// Overlay palette: drawn alongside the #2962ff primary stock line, so it must
// not contain that blue. Validated with '#2962ff' prepended (shared pane).
export const TV_OVERLAY_FACTOR_COLORS = [
  '#ef5350', '#26a69a', '#e65100', '#9575cd', '#0097a7',
  '#ec407a', '#43a047', '#7986cb', '#b28522', '#00897b',
  '#d81b60', '#5c6bc0', '#c75b39', '#f4511e',
]

const tradingview: DesignTokens = {
  pos: '#26a69a',
  neg: '#ef5350',
  neutral: '#787b86',
  accent: '#2962ff',
  accentText: '#5b9cf6',
  accentBg: 'rgba(41,98,255,0.10)',
  accentBorder: 'rgba(41,98,255,0.35)',
  warn: '#ff9800',
  textStrong: '#d1d4dc',
  textBody: '#d1d4dc',
  textMuted: '#787b86',
  textFaint: '#565b66',
  insetBg: '#131722',
  insetHover: '#181d2b',
  trackBg: '#2a2e39',
  hairline: '#2a2e39',
  borderSubtle: '#2a2e39',
  lagCellBg: '#1e222d',
  peakLagSubtext: 'rgba(255,255,255,0.65)',
  overlay: 'rgba(0,0,0,0.5)',
  panelShadow: 'none',
  navShadow: 'none',
  cardShadow: 'none',
  cardShadowHover: '0 4px 16px rgba(0,0,0,0.4)',
  drawerShadow: '-6px 0 28px rgba(0,0,0,0.5)',
  navPillBg: '#131722',
  activeTabBg: '#2a2e39',
  activeTabText: '#d1d4dc',
  inactiveTabText: '#787b86',
  tabShadow: 'none',
  brandBg: '#2962ff',
  liveDot: '#26a69a',
  liveRing: 'rgba(38,166,154,0.25)',
  factorColors: TV_FACTOR_COLORS,
  overlayFactorColors: TV_OVERLAY_FACTOR_COLORS,
  corrColor: (v: number): string => {
    if (v >= 0.99) return '#1a47d6'
    if (v > 0.6) return '#2962ff'
    if (v > 0.35) return 'rgba(41,98,255,0.55)'
    if (v > 0.1) return 'rgba(41,98,255,0.25)'
    if (v > -0.1) return '#2a2e39'
    if (v > -0.35) return 'rgba(239,83,80,0.25)'
    if (v > -0.6) return 'rgba(239,83,80,0.6)'
    return '#ef5350'
  },
  corrText: (v: number): string =>
    Math.abs(v) > 0.4 || v >= 0.99 ? '#ffffff' : '#d1d4dc',
  corrDiagText: 'rgba(255,255,255,0.55)',
  corrLegend: [
    '#ef5350', 'rgba(239,83,80,0.6)', 'rgba(239,83,80,0.25)', '#2a2e39',
    'rgba(41,98,255,0.25)', 'rgba(41,98,255,0.55)', '#2962ff',
  ],
  corrNeutralBorder: '#363a45',
  chart: {
    grid: '#2a2e39',
    gridAlt: '#2a2e39',
    gridDash: undefined, // solid, thin gridlines
    tick: '#787b86',
    refLine: '#363a45',
    cursor: { stroke: '#758696', strokeWidth: 1 },
    scatterCursor: { strokeDasharray: '3 3', stroke: '#758696' },
    tooltip: {
      fontSize: 11,
      borderRadius: 8,
      border: '1px solid #2a2e39',
      backgroundColor: '#1e222d',
      color: '#d1d4dc',
    },
    tooltipLabel: { color: '#d1d4dc', fontWeight: 600 },
    primary: '#2962ff',
    primaryWidth: 2,
    areaGradient: true,
  },
}

export const DESIGN_TOKENS: Record<DesignMode, DesignTokens> = {
  classic,
  tradingview: tradingview,
}
