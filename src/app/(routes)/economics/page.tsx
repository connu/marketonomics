'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Box, Typography, Stack, Paper, Autocomplete, TextField,
  Button, CircularProgress, Alert, ToggleButton, ToggleButtonGroup,
  Divider,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import { searchTickers } from '../../../services/marketData'
import type { SearchResult } from '../../../services/marketData'
import { useFactorAnalysis } from '../../../features/analysis/hooks/useFactorAnalysis'
import type { MethodId } from '../../../features/analysis/hooks/useFactorAnalysis'
import { FactorOverlayChart } from '../../../features/analysis/components/FactorOverlayChart'
import { FactorSelector } from '../../../features/analysis/components/FactorSelector'
import { AnalysisPanel } from '../../../features/analysis/components/AnalysisPanel'

const YEAR_RANGES = [5, 10, 15, 20] as const

export default function EconomicsPage() {
  const { state, setState, loadStock, realign, toggleFactor, computeResults } = useFactorAnalysis()
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

  // Year range change — re-align from cached yearly prices, no network call
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

  // Auto-run analysis whenever aligned data or active method changes with factors selected
  useEffect(() => {
    if (state.aligned && state.selectedFactors.length > 0) {
      computeResults(state.activeMethod)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.aligned, state.activeMethod])

  const handleMethodChange = useCallback((method: MethodId) => {
    computeResults(method)
  }, [computeResults])

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4">Economic Factor Analysis</Typography>
          <Typography variant="body2" color="text.secondary">
            Overlay 20 years of macro data on any stock · run statistical analysis locally
          </Typography>
        </Box>
      </Stack>

      {/* Stock search */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
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
          <Button
            variant="contained"
            startIcon={state.loading ? <CircularProgress size={14} color="inherit" /> : <ShowChartIcon />}
            onClick={handleLoad}
            disabled={!selected || state.loading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {state.loading ? 'Loading…' : 'Load Chart'}
          </Button>
        </Stack>
      </Paper>

      {/* Year range selector */}
      {state.chartSeries && (
        <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            YEAR RANGE
          </Typography>
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
          <Typography variant="caption" color="text.disabled">
            {state.chartSeries.years[0]} – {state.chartSeries.years[state.chartSeries.years.length - 1]}
            {' '}({state.chartSeries.years.length} data points)
          </Typography>
        </Stack>
      )}

      {/* Error */}
      {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}

      {/* Chart */}
      {state.chartSeries ? (
        <Box sx={{ mb: 3 }}>
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
        <Paper
          variant="outlined"
          sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, bgcolor: 'action.hover' }}
        >
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <SearchIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2">Search and load a stock to begin</Typography>
          </Box>
        </Paper>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Factor selector */}
      <FactorSelector selected={state.selectedFactors} onToggle={toggleFactor} />

      {/* Math analysis panel */}
      {state.chartSeries && state.selectedFactors.length > 0 && state.aligned && (
        <AnalysisPanel
          selectedFactors={state.selectedFactors}
          results={state.results}
          activeMethod={state.activeMethod}
          years={state.aligned.years}
          stockRaw={state.chartSeries.stockRaw}
          onMethodChange={handleMethodChange}
        />
      )}
    </Box>
  )
}
