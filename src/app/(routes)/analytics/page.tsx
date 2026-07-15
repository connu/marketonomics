'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Stack, Menu, MenuItem, TextField,
  CircularProgress, Divider, ListSubheader, Skeleton, IconButton, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DownloadIcon from '@mui/icons-material/Download'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { getAllFactors, getFactorMeta, FACTOR_YEARS, toYearlyPrices, toFactorYearValues } from '../../../features/analysis/lib/normalize'
import { pearsonCorrelation } from '../../../features/analysis/lib/math'
import { finitePairs, type SeriesInfo } from '../../../features/analysis/lib/series'
import { searchTickers, fetchHistory, type SearchResult } from '../../../services/marketData'
import { fetchMacroSeries } from '../../../services/macroData'
import { toYoY, toAnnual } from '../../../features/macro/lib/transform'
import { MACRO_SERIES, getMacroDef, type MacroSeriesDef } from '../../../features/macro/catalog'
import { useDesignMode } from '../../ThemeRegistry'
import type { DrawerData } from '../../../features/analysis/components/DetailDrawer'
import { writeUrlParams } from '../../../utils/urlState'
import { downloadCsv } from '../../../utils/exportCsv'
import { CopyLinkButton } from '../../../components/CopyLinkButton'

// Chart-heavy components load as async chunks so recharts stays out of the
// route's initial bundle.
const MiniChart = dynamic(
  () => import('../../../features/analysis/components/MiniChart').then(m => m.MiniChart),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={142} sx={{ borderRadius: '10px' }} /> }
)
const DetailDrawer = dynamic(
  () => import('../../../features/analysis/components/DetailDrawer').then(m => m.DetailDrawer),
  { ssr: false }
)

// Default series mirror the design (equity + AI + rates + inflation + oil + gold),
// mapped onto the app's real factor dataset.
const DEFAULT_SERIES = ['sp500', 'ai_investment', 'interest_rate', 'inflation_cpi', 'oil_wti', 'gold']

// Dynamically fetched series are keyed by prefix in selectedIds:
//   stock:<SYMBOL> — Yahoo price history · macro:<FRED_ID> — live FRED series
const STOCK_PREFIX = 'stock:'
const MACRO_PREFIX = 'macro:'

const isFetched = (id: string) => id.startsWith(STOCK_PREFIX) || id.startsWith(MACRO_PREFIX)

interface DynamicSeries {
  label: string
  unit: string
  values: number[] // aligned to FACTOR_YEARS (NaN where the series has no data)
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

async function loadStockSeries(symbol: string, shortname?: string): Promise<DynamicSeries> {
  const pts = await fetchHistory(symbol, 'max')
  if (!pts.length) throw new Error('no data')
  const values = toFactorYearValues(toYearlyPrices(pts))
  if (values.filter(Number.isFinite).length < 4) throw new Error('insufficient overlap')
  const name = shortname && shortname !== symbol ? ` · ${shortname}` : ''
  return { label: `${symbol}${name}`, unit: 'USD', values }
}

async function loadMacroSeries(def: MacroSeriesDef): Promise<DynamicSeries> {
  const res = await fetchMacroSeries(def.id)
  if (!res || !res.points.length) throw new Error('no data')
  // YoY % is the meaningful annual view for level series like CPI or M2
  const points = def.yoy ? toYoY(res.points) : res.points
  const values = toFactorYearValues(toAnnual(points))
  if (values.filter(Number.isFinite).length < 4) throw new Error('insufficient overlap')
  return {
    label: def.yoy ? `${def.label} YoY` : def.label,
    unit: def.yoy ? '%' : def.unit,
    values,
  }
}

function AnalyticsContent() {
  const { mode, tokens } = useDesignMode()
  const searchParams = useSearchParams()
  const allFactors = useMemo(() => getAllFactors(), [])

  // Seed the selection from ?series= so shared links restore on first render
  // (useSearchParams is available at render time — no setState in an effect).
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const param = searchParams.get('series')
    if (!param) return DEFAULT_SERIES
    const ids = param.split(',').filter(id =>
      isFetched(id) || allFactors.some(f => f.id === id)
    )
    return ids.length ? ids : DEFAULT_SERIES
  })

  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null)
  const [drawerCell, setDrawerCell] = useState<DrawerData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Fetched series (stock: / macro:) keyed by prefixed id
  const [dynamicData, setDynamicData] = useState<Record<string, DynamicSeries>>({})
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const inFlight = useRef<Set<string>>(new Set())

  // Ticker search inside the Add menu
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Enriches stock labels with the name from the search result that added them
  const shortnameHints = useRef<Record<string, string>>({})

  // One fetch pipeline for every prefixed id, whether it arrived from the URL
  // or from the Add menu: anything selected without data gets loaded once.
  useEffect(() => {
    for (const id of selectedIds) {
      if (!isFetched(id) || dynamicData[id] || inFlight.current.has(id)) continue
      const isStock = id.startsWith(STOCK_PREFIX)
      const rawId = id.slice(id.indexOf(':') + 1)
      const def = isStock ? null : getMacroDef(rawId)
      if (!isStock && !def) continue
      const symbol = rawId.toUpperCase()
      const label = isStock ? symbol : def!.label

      inFlight.current.add(id)
      void (isStock ? loadStockSeries(symbol, shortnameHints.current[id]) : loadMacroSeries(def!))
        .then(loaded => setDynamicData(d => ({ ...d, [id]: loaded })))
        .catch(() => {
          // Drop the failed series and surface a brief inline notice
          setSelectedIds(ids => ids.filter(x => x !== id))
          setSeriesError(`Couldn't load ${label} — series removed`)
        })
        .finally(() => inFlight.current.delete(id))
    }
  }, [selectedIds, dynamicData])

  useEffect(() => {
    const q = query.trim()
    const t = setTimeout(async () => {
      if (!q) {
        setSearchResults([])
        setSearching(false)
        return
      }
      setSearching(true)
      try {
        const results = await searchTickers(q)
        setSearchResults(results.slice(0, 6))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [query])

  // Keep the URL shareable; the default selection stays clean (no query string)
  useEffect(() => {
    const isDefault = selectedIds.join(',') === DEFAULT_SERIES.join(',')
    writeUrlParams({ series: isDefault ? null : selectedIds.join(',') })
  }, [selectedIds])

  const closeAddMenu = () => {
    setAddAnchor(null)
    setQuery('')
    setSearchResults([])
  }

  const addStock = (result: SearchResult) => {
    const id = `${STOCK_PREFIX}${result.symbol}`
    closeAddMenu()
    if (selectedIds.includes(id)) return
    if (result.shortname) shortnameHints.current[id] = result.shortname
    setSeriesError(null)
    setSelectedIds(ids => [...ids, id])
  }

  const addMacro = (def: MacroSeriesDef) => {
    const id = `${MACRO_PREFIX}${def.id}`
    closeAddMenu()
    if (selectedIds.includes(id)) return
    setSeriesError(null)
    setSelectedIds(ids => [...ids, id])
  }

  const series: SeriesInfo[] = useMemo(() =>
    selectedIds
      .map((id, idx) => {
        const color = tokens.factorColors[idx % tokens.factorColors.length]
        if (isFetched(id)) {
          const s = dynamicData[id]
          if (!s) return null // still loading or failed
          return { id, label: s.label, unit: s.unit, values: s.values, color }
        }
        const f = allFactors.find(a => a.id === id)
        if (!f) return null
        return { id, label: getFactorMeta(id)?.label ?? id, unit: f.unit, values: f.values, color }
      })
      .filter((s): s is SeriesInfo => s !== null),
    [selectedIds, allFactors, dynamicData, tokens.factorColors]
  )

  // Anything selected but not yet resolved is in flight — derived, not stored.
  const loadingIds = selectedIds.filter(id => isFetched(id) && !dynamicData[id])

  // Pearson is symmetric — compute the upper triangle once and mirror it.
  const matrix = useMemo(() => {
    const n = series.length
    const m: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
    for (let ri = 0; ri < n; ri++) {
      for (let ci = ri; ci < n; ci++) {
        const [x, y] = finitePairs(series[ri].values, series[ci].values)
        const r = x.length >= 3 ? pearsonCorrelation(x, y).r : 0
        m[ri][ci] = r
        m[ci][ri] = r
      }
    }
    return m
  }, [series])

  const available = allFactors.filter(f => !selectedIds.includes(f.id))
  const availableMacro = MACRO_SERIES.filter(s => !selectedIds.includes(`${MACRO_PREFIX}${s.id}`))

  const exportSeriesCsv = () => {
    if (!series.length) return
    downloadCsv(
      'comparative-analysis.csv',
      ['year', ...series.map(s => s.label)],
      FACTOR_YEARS.map((y, i) => [y, ...series.map(s => (Number.isFinite(s.values[i]) ? s.values[i] : ''))])
    )
  }

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
            Synchronized multi-series · hover any chart to sync all · {FACTOR_YEARS.length}Y annual · click a matrix cell for detail
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          {seriesError && (
            <Typography sx={{ fontSize: 11, color: tokens.neg, fontWeight: 500 }}>{seriesError}</Typography>
          )}
          <CopyLinkButton />
          <Tooltip title="Download all series (CSV)">
            <IconButton size="small" onClick={exportSeriesCsv} aria-label="Download all series as CSV" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <DownloadIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Box
            component="button"
            onClick={(e) => { setSeriesError(null); setAddAnchor(e.currentTarget) }}
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
                  endAdornment: searching ? <CircularProgress size={14} sx={{ ml: 1 }} aria-label="Searching tickers" /> : null,
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
          {availableMacro.length > 0 && [
            <Divider key="mdiv" sx={{ my: 0.5 }} />,
            <ListSubheader key="mhdr" sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '26px' }}>
              Live Macro (FRED)
            </ListSubheader>,
            ...availableMacro.map(s => (
              <MenuItem key={s.id} onClick={() => addMacro(s)} sx={{ fontSize: 13, gap: 0.75 }}>
                {s.yoy ? `${s.label} YoY` : s.label}
                <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled' }}>{s.id}</Typography>
              </MenuItem>
            )),
          ]}
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
        {series.length === 0 && loadingIds.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 4, textAlign: 'center' }}>
            No series selected — use “Add Graph” to add factors, stocks, or live macro data.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.25 }}>
            {series.map(s => (
              <MiniChart key={s.id} series={s} onRemove={() => setSelectedIds(ids => ids.filter(id => id !== s.id))} />
            ))}
            {loadingIds.map(id => (
              <Box
                key={id}
                sx={{
                  bgcolor: tokens.insetBg, borderRadius: '10px', p: '12px 14px', minHeight: 142,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.disabled' }}>
                  Loading {id.slice(id.indexOf(':') + 1)}…
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
                          role={diag ? undefined : 'button'}
                          tabIndex={diag ? undefined : 0}
                          aria-label={diag ? undefined : `Open ${series[ri]?.label} vs ${series[ci]?.label} analysis, r = ${v.toFixed(2)}`}
                          onKeyDown={e => {
                            if (!diag && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              openDrawer(ri, ci)
                            }
                          }}
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

export default function AnalyticsPage() {
  // useSearchParams requires a Suspense boundary for the prerender pass.
  return (
    <Suspense fallback={<Skeleton variant="rounded" height={480} sx={{ borderRadius: '14px' }} />}>
      <AnalyticsContent />
    </Suspense>
  )
}
