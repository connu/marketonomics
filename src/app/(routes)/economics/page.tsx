'use client'

import React, { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Box, Typography, Stack, Autocomplete, TextField,
  Button, CircularProgress, Alert, ToggleButton, ToggleButtonGroup,
  IconButton, Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DownloadIcon from '@mui/icons-material/Download'
import ImageIcon from '@mui/icons-material/Image'
import SearchIcon from '@mui/icons-material/Search'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Skeleton } from '@mui/material'
import { searchTickers } from '../../../services/marketData'
import type { SearchResult } from '../../../services/marketData'
import { useFactorAnalysis } from '../../../features/analysis/hooks/useFactorAnalysis'
import { useDesignMode } from '../../ThemeRegistry'
import { FactorSelector } from '../../../features/analysis/components/FactorSelector'
import { ResearchSummary } from '../../../features/analysis/components/ResearchSummary'
import { getFactorMeta } from '../../../features/analysis/lib/normalize'
import { writeUrlParams } from '../../../utils/urlState'
import { downloadCsv } from '../../../utils/exportCsv'
import { exportChartPng } from '../../../utils/exportChart'
import { CopyLinkButton } from '../../../components/CopyLinkButton'

// Chart + stat components pull in recharts and the stats suite; load them as
// async chunks so the initial route bundle stays light.
const FactorOverlayChart = dynamic(
  () => import('../../../features/analysis/components/FactorOverlayChart').then(m => m.FactorOverlayChart),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={420} sx={{ borderRadius: '14px' }} /> }
)
const StatCardGrid = dynamic(
  () => import('../../../features/analysis/components/StatCardGrid').then(m => m.StatCardGrid),
  { ssr: false }
)
const NewsFeed = dynamic(
  () => import('../../../features/news/components/NewsFeed').then(m => m.NewsFeed),
  { ssr: false }
)

const YEAR_RANGES = [5, 10, 15, 20] as const

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

function EconomicsContent() {
  const { tokens } = useDesignMode()
  const theme = useTheme()
  const searchParams = useSearchParams()

  // Shared analyses arrive as ?symbol=AAPL&factors=gold,interest_rate&range=10.
  // useSearchParams resolves at render, so the factors/range seed initial state
  // directly and only the price fetch needs an effect.
  const urlState = useMemo(() => {
    const factors = (searchParams.get('factors')?.split(',') ?? []).filter(f => getFactorMeta(f))
    const rangeParam = Number(searchParams.get('range'))
    return {
      symbol: searchParams.get('symbol')?.trim().toUpperCase() || null,
      factors,
      yearRange: (YEAR_RANGES as readonly number[]).includes(rangeParam) ? rangeParam : 10,
    }
  // Only the values present on first render seed the page; later edits own the URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { state, setState, loadStock, realign, toggleFactor } = useFactorAnalysis({
    selectedFactors: urlState.factors,
    yearRange: urlState.yearRange,
  })
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Fetch the shared symbol's history on mount
  useEffect(() => {
    if (urlState.symbol) {
      loadStock(urlState.symbol, urlState.symbol, urlState.yearRange, urlState.factors)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the URL shareable as the analysis changes
  useEffect(() => {
    const active = state.symbol || state.selectedFactors.length
    writeUrlParams({
      symbol: state.symbol || null,
      factors: state.selectedFactors.join(',') || null,
      range: active ? String(state.yearRange) : null,
    })
  }, [state.symbol, state.selectedFactors, state.yearRange])

  const exportAlignedCsv = useCallback(() => {
    const aligned = state.aligned
    if (!aligned || !state.symbol) return
    downloadCsv(
      `${state.symbol}-factor-analysis.csv`,
      ['year', state.symbol, ...state.selectedFactors],
      aligned.years.map((y, i) => [
        y,
        aligned.stockPrices[i],
        ...state.selectedFactors.map(f => aligned.factorValues[f]?.[i] ?? ''),
      ])
    )
  }, [state.aligned, state.symbol, state.selectedFactors])

  const handleSearch = useCallback(async (query: string) => {
    setInputValue(query)
    if (query.length < 1) { setOptions([]); return }
    setSearching(true)
    try {
      const results = await searchTickers(query)
      setOptions(results)
    } catch {
      setOptions([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleLoad = useCallback(() => {
    if (!selected) return
    loadStock(selected.symbol, selected.longname || selected.shortname, state.yearRange, state.selectedFactors)
  }, [selected, loadStock, state.yearRange, state.selectedFactors])

  const handleYearRange = useCallback((newRange: number) => {
    setState(s => ({ ...s, yearRange: newRange, results: {} }))
    if (state.yearlyPrices.length) {
      realign(state.yearlyPrices, state.selectedFactors, newRange)
    }
  }, [state.yearlyPrices, state.selectedFactors, realign, setState])

  // Factor toggle — re-align from cached yearly prices, no network call
  useEffect(() => {
    if (!state.symbol || !state.yearlyPrices.length) return
    realign(state.yearlyPrices, state.selectedFactors, state.yearRange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedFactors])

  const rangeLabel = `${state.yearRange}Y`
  const firstFactor = state.selectedFactors[0]
  const sampleSize = state.aligned?.years.length ?? 0

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontSize: 20 }}>Relationship Explorer</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.4 }}>
          Analyze macroeconomic factor relationships · normalized overlay · statistical analysis
        </Typography>
      </Box>

      {/* Controls row */}
      <Panel sx={{ p: 1.5, mb: 1.75 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ alignItems: { md: 'center' } }}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={options}
            getOptionLabel={(o) => `${o.symbol} — ${o.shortname}`}
            filterOptions={(x) => x}
            loading={searching}
            inputValue={inputValue}
            value={selected}
            onInputChange={(_, v) => handleSearch(v)}
            onChange={(_, v) => setSelected(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search stock, ETF, or index (e.g. AAPL, NVDA, SPY)"
                size="small"
                slotProps={{
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {searching && <CircularProgress size={14} />}
                        {params.slotProps.input.endAdornment}
                      </>
                    ),
                  },
                  htmlInput: params.slotProps.htmlInput,
                  inputLabel: params.slotProps.inputLabel,
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.symbol}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{option.symbol}</Typography>
                  <Typography variant="caption" color="text.secondary">{option.longname || option.shortname} · {option.exchange}</Typography>
                </Box>
              </li>
            )}
          />

          {state.chartSeries && (
            <ToggleButtonGroup
              value={state.yearRange}
              exclusive
              onChange={(_, v) => v && handleYearRange(v)}
              size="small"
            >
              {YEAR_RANGES.map(y => (
                <ToggleButton key={y} value={y} sx={{ px: 1.5, py: 0.25, fontSize: '0.72rem' }}>
                  {y}Y
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          <Button
            variant="contained"
            disableElevation
            startIcon={state.loading ? <CircularProgress size={14} color="inherit" /> : <ShowChartIcon />}
            onClick={handleLoad}
            disabled={!selected || state.loading}
            sx={{ whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 600 }}
          >
            {state.loading ? 'Loading…' : 'Load Chart'}
          </Button>
        </Stack>
      </Panel>

      {/* Factor chips */}
      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mb: 2, minHeight: 30 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Overlays
        </Typography>
        {state.selectedFactors.map((fid, idx) => {
          const color = tokens.overlayFactorColors[idx % tokens.overlayFactorColors.length]
          const meta = getFactorMeta(fid)
          return (
            <Box
              key={fid}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.6, pl: 0.9, pr: 1.1, py: 0.5,
                borderRadius: '20px', bgcolor: color + '14', border: `1.5px solid ${color}38`,
                fontSize: 11, fontWeight: 500, color,
              }}
            >
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
              <span>{meta?.label ?? fid}</span>
              <Box
                component="button"
                onClick={() => toggleFactor(fid)}
                aria-label={`Remove ${meta?.label ?? fid} overlay`}
                sx={{
                  ml: 0.25, opacity: 0.55, fontSize: 10, cursor: 'pointer', lineHeight: 1,
                  background: 'none', border: 'none', p: 0, color: 'inherit', fontFamily: 'inherit',
                  '&:hover': { opacity: 1 }, '&:focus-visible': { opacity: 1 },
                }}
              >✕</Box>
            </Box>
          )
        })}
        {state.selectedFactors.length === 0 && (
          <Typography sx={{ fontSize: 11, color: tokens.textFaint, fontStyle: 'italic' }}>Select factors below to overlay</Typography>
        )}
      </Stack>

      {/* Error */}
      {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}

      {/* Hero chart */}
      {state.chartSeries ? (
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center', mb: 1, gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
              {state.symbol}
            </Typography>
            <Typography variant="caption" color="text.secondary">{state.companyName}</Typography>
            <Stack direction="row" sx={{ ml: 'auto', gap: 0.75 }}>
              <CopyLinkButton />
              <Tooltip title="Download aligned data (CSV)">
                <IconButton size="small" onClick={exportAlignedCsv} aria-label="Download aligned data as CSV" sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <DownloadIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export chart (PNG)">
                <IconButton
                  size="small"
                  onClick={() => void exportChartPng(chartRef.current, `${state.symbol}-chart.png`, theme.palette.background.paper)}
                  aria-label="Export chart as PNG"
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <ImageIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Box ref={chartRef}>
            <FactorOverlayChart
              series={state.chartSeries}
              symbol={state.symbol}
              selectedFactors={state.selectedFactors}
            />
          </Box>
        </Box>
      ) : !state.loading && (
        <Panel sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <SearchIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2">Search and load a stock to begin</Typography>
          </Box>
        </Panel>
      )}

      {/* Statistical analysis cards */}
      {state.chartSeries && state.aligned && firstFactor && state.aligned.factorValues[firstFactor] && (
        <StatCardGrid
          stockPrices={state.aligned.stockPrices}
          factorValues={state.aligned.factorValues[firstFactor]}
          years={state.aligned.years}
          factorId={firstFactor}
          symbol={state.symbol}
          rangeLabel={rangeLabel}
        />
      )}

      {/* Research summary */}
      {state.chartSeries && state.selectedFactors.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <ResearchSummary
            symbol={state.symbol}
            selectedFactors={state.selectedFactors}
            rangeLabel={rangeLabel}
            sampleSize={sampleSize}
          />
        </Box>
      )}

      {/* Latest headlines for the loaded ticker */}
      {state.chartSeries && state.symbol && (
        <Box sx={{ mb: 2.5 }}>
          <NewsFeed symbol={state.symbol} />
        </Box>
      )}

      {/* Factor selector */}
      <Panel sx={{ p: 2.5 }}>
        <FactorSelector selected={state.selectedFactors} onToggle={toggleFactor} />
      </Panel>
    </Box>
  )
}

export default function EconomicsPage() {
  // useSearchParams requires a Suspense boundary for the prerender pass.
  return (
    <Suspense fallback={<Skeleton variant="rounded" height={480} sx={{ borderRadius: '14px' }} />}>
      <EconomicsContent />
    </Suspense>
  )
}
