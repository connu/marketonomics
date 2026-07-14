'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Menu, MenuItem, IconButton, TextField,
  CircularProgress, Divider, ListSubheader,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import {
  ResponsiveContainer, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Scatter,
} from 'recharts'
import { getAllFactors, getFactorMeta, FACTOR_YEARS, toYearlyPrices, toFactorYearValues } from '../../../features/analysis/lib/normalize'
import { pearsonCorrelation, crossCorrelation, linearRegression } from '../../../features/analysis/lib/math'
import { searchTickers, fetchHistory, type SearchResult } from '../../../services/marketData'
import { useDesignMode } from '../../ThemeRegistry'

// Default series mirror the design (equity + AI + rates + inflation + oil + gold),
// mapped onto the app's real factor dataset.
const DEFAULT_SERIES = ['sp500', 'ai_investment', 'interest_rate', 'inflation_cpi', 'oil_wti', 'gold']

interface SeriesInfo {
  id: string
  label: string
  unit: string
  values: number[]
  color: string
}

// Stock series are keyed as `stock:<SYMBOL>` in selectedIds
const STOCK_PREFIX = 'stock:'

interface StockData {
  label: string
  values: number[] // aligned to FACTOR_YEARS (NaN where the ticker has no data)
}

// Keep only index pairs where both series have finite values, so stats
// (Pearson, regression, cross-correlation) work for stocks with partial history.
function finitePairs(a: number[], b: number[]): [number[], number[]] {
  const xs: number[] = []
  const ys: number[] = []
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) {
      xs.push(a[i])
      ys.push(b[i])
    }
  }
  return [xs, ys]
}

/** SVG ids must not contain symbol characters like ^ or : */
function svgId(prefix: string, raw: string): string {
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function Panel({ children, sx }: { children: React.ReactNode; sx?: object }) {
  const { tokens } = useDesignMode()
  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: '14px', boxShadow: tokens.panelShadow, ...sx,
      }}
    >
      {children}
    </Box>
  )
}

function MiniChart({ series, onRemove }: { series: SeriesInfo; onRemove: () => void }) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart
  const gradientId = svgId('mini-grad', series.id)
  const data = useMemo(
    () => FACTOR_YEARS.map((year, i) => ({
      year,
      value: Number.isFinite(series.values[i]) ? series.values[i] : null,
    })),
    [series]
  )
  return (
    <Box
      sx={{
        bgcolor: tokens.insetBg, borderRadius: '10px', p: '12px 14px',
        transition: 'background 0.15s', position: 'relative',
        '&:hover': { background: tokens.insetHover }, '&:hover .rm-btn': { opacity: 1 },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: series.color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {series.label}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', ml: 'auto' }}>{series.unit}</Typography>
        <IconButton
          className="rm-btn"
          size="small"
          onClick={onRemove}
          sx={{ p: 0.25, opacity: 0, transition: 'opacity 0.15s' }}
        >
          <CloseIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Stack>
      <Box sx={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="analytics-sync" margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
            {ct.areaGradient && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              cursor={ct.cursor ?? true}
              contentStyle={ct.tooltip}
              labelStyle={ct.tooltipLabel}
            />
            {ct.areaGradient && (
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill={`url(#${gradientId})`}
                connectNulls={false}
                activeDot={false}
                legendType="none"
                tooltipType="none"
              />
            )}
            <Line type="monotone" dataKey="value" name={series.label} stroke={series.color} strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} fill={series.color} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}

interface DrawerData { ri: number; ci: number }

function DetailDrawer({ open, cell, series, onClose }: {
  open: boolean
  cell: DrawerData | null
  series: SeriesInfo[]
  onClose: () => void
}) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart
  const content = useMemo(() => {
    if (!cell) return null
    const rowS = series[cell.ri]
    const colS = series[cell.ci]
    if (!rowS || !colS) return null
    const [x, y] = finitePairs(colS.values, rowS.values)
    if (x.length < 3) return null
    const { r } = pearsonCorrelation(x, y)
    const reg = linearRegression(x, y)
    const points = x
      .map((xv, i) => ({ x: xv, y: y[i], reg: reg.intercept + reg.slope * xv }))
      .sort((a, b) => a.x - b.x)
    const xcorr = crossCorrelation(x, y, 2)
    const interpretation = `${rowS.label} and ${colS.label} show r = ${r.toFixed(3)} (R² = ${(r * r).toFixed(3)}) over ${x.length} annual observations. ${Math.abs(r) > 0.4 ? 'This is a statistically robust relationship suitable for factor-model inclusion.' : 'This relationship warrants further regime-conditional testing before production use.'}`
    return { rowS, colS, r, reg, points, xcorr, interpretation }
  }, [cell, series])

  return (
    <>
      {/* Overlay */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed', inset: 0, bgcolor: tokens.overlay, zIndex: 199,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer */}
      <Box
        sx={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: { xs: '100%', sm: 440 },
          bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', zIndex: 200,
          boxShadow: tokens.drawerShadow,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)', overflowY: 'auto',
        }}
      >
        {content && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                  Pairwise Analysis
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{content.rowS.label}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', my: 0.25 }}>vs</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{content.colS.label}</Typography>
              </Box>
              <IconButton onClick={onClose} size="small" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: tokens.insetBg }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>

            {/* Key metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2.25 }}>
              {[
                { label: 'Pearson r', val: content.r.toFixed(3), big: true },
                { label: 'R²', val: (content.r * content.r).toFixed(3), big: true },
                { label: 'Period', val: `${content.points.length}Y Annual`, big: false },
                { label: 'Observations', val: `${content.points.length} pts`, big: false },
              ].map(m => (
                <Box key={m.label} sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: m.big ? 1.75 : 1.5 }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.6 }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ fontSize: m.big ? 24 : 13, fontWeight: m.big ? 700 : 600, color: m.big ? tokens.textStrong : tokens.textBody, letterSpacing: m.big ? '-0.8px' : 0 }}>
                    {m.val}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Scatter + OLS */}
            <Box sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: 1.75, mb: 1.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, mb: 1.25 }}>Scatter Plot · OLS Regression</Typography>
              <Box sx={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={content.points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
                    <XAxis type="number" dataKey="x" name={content.colS.label} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" name={content.rowS.label} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} cursor={ct.scatterCursor} />
                    <Scatter dataKey="y" fill={tokens.accent} fillOpacity={0.5} />
                    <Line type="linear" dataKey="reg" stroke={tokens.neg} strokeWidth={2} dot={false} activeDot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Lag analysis */}
            <Box sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: 1.75, mb: 1.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, mb: 1.25 }}>Cross-Correlation by Lag</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.6 }}>
                {content.xcorr.lags.map((lag, i) => {
                  const v = content.xcorr.correlations[i]
                  const isPeak = lag === content.xcorr.peakLag
                  return (
                    <Box key={lag} sx={{ textAlign: 'center', bgcolor: isPeak ? 'primary.main' : tokens.lagCellBg, borderRadius: '7px', p: '9px 4px', border: '1px solid', borderColor: isPeak ? 'primary.main' : 'divider' }}>
                      <Typography sx={{ fontSize: 9, color: isPeak ? tokens.peakLagSubtext : 'text.disabled', mb: 0.4, fontWeight: 500 }}>
                        {lag >= 0 ? '+' : ''}{lag}y
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: isPeak ? '#fff' : tokens.textBody }}>{v.toFixed(2)}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {/* Interpretation */}
            <Box sx={{ bgcolor: tokens.accentBg, border: `1px solid ${tokens.accentBorder}`, borderRadius: '10px', p: 1.75 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Box sx={{ width: 3, height: 14, bgcolor: 'primary.main', borderRadius: '2px' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.accentText }}>Statistical Interpretation</Typography>
              </Stack>
              <Typography sx={{ fontSize: 11, color: tokens.textBody, lineHeight: 1.65 }}>{content.interpretation}</Typography>
            </Box>
          </Box>
        )}
      </Box>
    </>
  )
}

export default function AnalyticsPage() {
  const { mode, tokens } = useDesignMode()
  const allFactors = useMemo(() => getAllFactors(), [])
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SERIES)
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null)
  const [drawerCell, setDrawerCell] = useState<DrawerData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Stock series: fetched data keyed by `stock:<SYMBOL>`, plus in-flight and error state
  const [stockData, setStockData] = useState<Record<string, StockData>>({})
  const [loadingStocks, setLoadingStocks] = useState<string[]>([])
  const [stockError, setStockError] = useState<string | null>(null)

  // Ticker search inside the Add menu
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    const t = setTimeout(async () => {
      if (!q) {
        setSearchResults([])
        setSearching(false)
        return
      }
      setSearching(true)
      const results = await searchTickers(q)
      setSearchResults(results.slice(0, 6))
      setSearching(false)
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [query])

  const closeAddMenu = () => {
    setAddAnchor(null)
    setQuery('')
    setSearchResults([])
  }

  const addStock = async (result: SearchResult) => {
    const id = `${STOCK_PREFIX}${result.symbol}`
    closeAddMenu()
    if (selectedIds.includes(id)) return
    setStockError(null)
    setSelectedIds(ids => [...ids, id])
    setLoadingStocks(l => [...l, id])
    try {
      const pts = await fetchHistory(result.symbol, 'max')
      if (!pts.length) throw new Error('no data')
      const values = toFactorYearValues(toYearlyPrices(pts))
      if (values.filter(Number.isFinite).length < 4) throw new Error('insufficient overlap')
      const name = result.shortname && result.shortname !== result.symbol ? ` · ${result.shortname}` : ''
      setStockData(d => ({ ...d, [id]: { label: `${result.symbol}${name}`, values } }))
    } catch {
      // Remove the failed series and surface a brief inline notice
      setSelectedIds(ids => ids.filter(x => x !== id))
      setStockError(`Couldn't load ${result.symbol} — series removed`)
    } finally {
      setLoadingStocks(l => l.filter(x => x !== id))
    }
  }

  const series: SeriesInfo[] = useMemo(() =>
    selectedIds
      .map((id, idx) => {
        const color = tokens.factorColors[idx % tokens.factorColors.length]
        if (id.startsWith(STOCK_PREFIX)) {
          const s = stockData[id]
          if (!s) return null // still loading or failed
          return { id, label: s.label, unit: 'USD', values: s.values, color }
        }
        const f = allFactors.find(a => a.id === id)
        if (!f) return null
        return { id, label: getFactorMeta(id)?.label ?? id, unit: f.unit, values: f.values, color }
      })
      .filter((s): s is SeriesInfo => s !== null),
    [selectedIds, allFactors, stockData, tokens.factorColors]
  )

  const matrix = useMemo(
    () => series.map(a => series.map(b => {
      const [x, y] = finitePairs(a.values, b.values)
      return x.length >= 3 ? pearsonCorrelation(x, y).r : 0
    })),
    [series]
  )

  const available = allFactors.filter(f => !selectedIds.includes(f.id))

  const openDrawer = (ri: number, ci: number) => {
    setDrawerCell({ ri, ci })
    setDrawerOpen(true)
  }
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: 20 }}>Comparative Analysis</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.4 }}>
            Synchronized multi-series · hover any chart to sync all · 21Y annual · click a matrix cell for detail
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          {stockError && (
            <Typography sx={{ fontSize: 11, color: tokens.neg, fontWeight: 500 }}>{stockError}</Typography>
          )}
          <Box
            component="button"
            onClick={(e) => { setStockError(null); setAddAnchor(e.currentTarget) }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.9, borderRadius: '10px',
              border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: 'primary.main', fontFamily: 'inherit',
              boxShadow: mode === 'tradingview' ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
              '&:disabled': { color: 'text.disabled', cursor: 'default' },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Add Graph
          </Box>
        </Stack>
        <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={closeAddMenu}>
          {/* Ticker search */}
          <Box sx={{ px: 1.5, pt: 0.5, pb: 1, width: 280 }} onKeyDown={e => { if (e.key !== 'Escape') e.stopPropagation() }}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Search stock ticker (e.g. AAPL)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              slotProps={{
                input: {
                  sx: { fontSize: 13, borderRadius: '8px' },
                  endAdornment: searching ? <CircularProgress size={14} sx={{ ml: 1 }} /> : null,
                },
              }}
            />
          </Box>
          {searchResults.map(r => (
            <MenuItem key={r.symbol} onClick={() => addStock(r)} sx={{ fontSize: 13, gap: 0.75 }}>
              <Typography component="span" sx={{ fontSize: 13, fontWeight: 700 }}>{r.symbol}</Typography>
              <Typography component="span" sx={{ fontSize: 12, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.shortname}
              </Typography>
            </MenuItem>
          ))}
          {query.trim() !== '' && !searching && searchResults.length === 0 && (
            <Typography sx={{ px: 1.75, py: 0.75, fontSize: 12, color: 'text.disabled' }}>No tickers found</Typography>
          )}
          {available.length > 0 && [
            <Divider key="div" sx={{ my: 0.5 }} />,
            <ListSubheader key="hdr" sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '26px' }}>
              Factors
            </ListSubheader>,
            ...available.map(f => (
              <MenuItem
                key={f.id}
                onClick={() => { setSelectedIds(ids => [...ids, f.id]); closeAddMenu() }}
                sx={{ fontSize: 13 }}
              >
                {getFactorMeta(f.id)?.label ?? f.id}
              </MenuItem>
            )),
          ]}
        </Menu>
      </Stack>

      {/* Synchronized charts grid */}
      <Panel sx={{ p: 2.5, mb: 2.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Synchronized Time Series</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Hover to cross-highlight all series · {series.length} graphs</Typography>
        </Stack>
        {series.length === 0 && loadingStocks.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 4, textAlign: 'center' }}>
            No series selected — use “Add Graph” to add factors or stocks.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.25 }}>
            {series.map(s => (
              <MiniChart key={s.id} series={s} onRemove={() => setSelectedIds(ids => ids.filter(id => id !== s.id))} />
            ))}
            {loadingStocks.map(id => (
              <Box
                key={id}
                sx={{
                  bgcolor: tokens.insetBg, borderRadius: '10px', p: '12px 14px', minHeight: 142,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.disabled' }}>
                  Loading {id.slice(STOCK_PREFIX.length)}…
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Panel>

      {/* Relationship matrix */}
      <Panel sx={{ p: 2.75, mb: 2.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 2.25, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Relationship Matrix</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Pearson correlation · click any off-diagonal cell for detailed analysis</Typography>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
            <thead>
              <tr>
                <th style={{ width: 110 }} />
                {series.map(s => (
                  <th key={s.id} style={{ padding: '4px 6px' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textAlign: 'center', whiteSpace: 'nowrap' }}>{s.label}</Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, ri) => (
                <tr key={ri}>
                  <td style={{ padding: '4px 10px 4px 0' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, whiteSpace: 'nowrap' }}>{series[ri]?.label}</Typography>
                  </td>
                  {row.map((v, ci) => {
                    const diag = ri === ci
                    return (
                      <td key={ci} style={{ padding: 0 }}>
                        <Box
                          onClick={() => !diag && openDrawer(ri, ci)}
                          sx={{
                            width: 84, height: 44, bgcolor: tokens.corrColor(v), borderRadius: '7px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: diag ? tokens.corrDiagText : tokens.corrText(v),
                            cursor: diag ? 'default' : 'pointer', userSelect: 'none', transition: 'filter 0.15s',
                            border: v > -0.1 && v <= 0.1 ? `1px solid ${tokens.corrNeutralBorder}` : 'none',
                            '&:hover': diag ? {} : { filter: 'brightness(0.92)' },
                          }}
                        >
                          {diag ? '—' : v.toFixed(2)}
                        </Box>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
        {/* Legend */}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mt: 1.75, pt: 1.75, borderTop: '1px solid', borderColor: tokens.hairline, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>−1.0</Typography>
          <Stack direction="row" sx={{ gap: '2px' }}>
            {tokens.corrLegend.map((c, i) => (
              <Box key={i} sx={{ width: 20, height: 10, bgcolor: c, borderRadius: '2px', border: i === 3 ? `1px solid ${tokens.corrNeutralBorder}` : 'none' }} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>+1.0</Typography>
          <Typography sx={{ fontSize: 10, color: tokens.textFaint, ml: 1 }}>Diagonal = self-correlation (1.00)</Typography>
        </Stack>
      </Panel>

      <DetailDrawer open={drawerOpen} cell={drawerCell} series={series} onClose={closeDrawer} />
    </Box>
  )
}
