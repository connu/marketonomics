'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Box, Typography, Stack, Autocomplete, TextField,
  Button, CircularProgress, Alert, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import { searchTickers } from '../../../services/marketData'
import type { SearchResult } from '../../../services/marketData'
import { useFactorAnalysis } from '../../../features/analysis/hooks/useFactorAnalysis'
import { FactorOverlayChart, FACTOR_COLORS } from '../../../features/analysis/components/FactorOverlayChart'
import { FactorSelector } from '../../../features/analysis/components/FactorSelector'
import { StatCardGrid } from '../../../features/analysis/components/StatCardGrid'
import { ResearchSummary } from '../../../features/analysis/components/ResearchSummary'
import { getFactorMeta } from '../../../features/analysis/lib/normalize'

const YEAR_RANGES = [5, 10, 15, 20] as const

function Panel({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...sx,
      }}
    >
      {children}
    </Box>
  )
}

export default function EconomicsPage() {
  const { state, setState, loadStock, realign, toggleFactor } = useFactorAnalysis()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    setInputValue(query)
    if (query.length < 1) { setOptions([]); return }
    setSearching(true)
    const results = await searchTickers(query)
    setOptions(results)
    setSearching(false)
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
          const color = FACTOR_COLORS[idx % FACTOR_COLORS.length]
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
              <Box component="span" onClick={() => toggleFactor(fid)} sx={{ ml: 0.25, opacity: 0.55, fontSize: 10, cursor: 'pointer', lineHeight: 1, '&:hover': { opacity: 1 } }}>✕</Box>
            </Box>
          )
        })}
        {state.selectedFactors.length === 0 && (
          <Typography sx={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>Select factors below to overlay</Typography>
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
          </Stack>
          <FactorOverlayChart
            series={state.chartSeries}
            symbol={state.symbol}
            selectedFactors={state.selectedFactors}
          />
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

      {/* Factor selector */}
      <Panel sx={{ p: 2.5 }}>
        <FactorSelector selected={state.selectedFactors} onToggle={toggleFactor} />
      </Panel>
    </Box>
  )
}
