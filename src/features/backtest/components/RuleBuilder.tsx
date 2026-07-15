'use client'

import React, { useEffect, useState } from 'react'
import {
  Box, Stack, Typography, Autocomplete, TextField, Button, CircularProgress,
  Select, MenuItem, Chip, FormControl, InputLabel,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { searchTickers, type SearchResult } from '../../../services/marketData'
import { MACRO_SERIES, getMacroDef } from '../../macro/catalog'
import type { BacktestConfig, BacktestInterval, BacktestRange, EntryRule, MacroFilter } from '../types'

const RULE_LABELS: Record<EntryRule['type'], string> = {
  buyAndHold: 'Buy & Hold',
  smaCross: 'SMA Crossover',
  priceAboveSma: 'Price Above SMA',
}

interface RuleBuilderProps {
  running: boolean
  onRun: (cfg: BacktestConfig) => void
}

export function RuleBuilder({ running, onRun }: RuleBuilderProps) {
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)

  const [range, setRange] = useState<BacktestRange>('10y')
  const [interval, setInterval_] = useState<BacktestInterval>('1wk')
  const [ruleType, setRuleType] = useState<EntryRule['type']>('smaCross')
  const [fast, setFast] = useState(10)
  const [slow, setSlow] = useState(40)
  const [period, setPeriod] = useState(30)

  const [filters, setFilters] = useState<MacroFilter[]>([])
  const [filterSeries, setFilterSeries] = useState('FEDFUNDS')
  const [filterDirection, setFilterDirection] = useState<MacroFilter['direction']>('falling')

  useEffect(() => {
    const q = inputValue.trim()
    const t = setTimeout(async () => {
      if (!q) {
        setOptions([])
        setSearching(false)
        return
      }
      setSearching(true)
      try {
        const results = await searchTickers(q)
        setOptions(results)
      } catch {
        setOptions([])
      } finally {
        setSearching(false)
      }
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [inputValue])

  const addFilter = () => {
    if (filters.some(f => f.seriesId === filterSeries && f.direction === filterDirection)) return
    setFilters(f => [...f, { seriesId: filterSeries, direction: filterDirection }])
  }

  const buildRule = (): EntryRule => {
    switch (ruleType) {
      case 'buyAndHold': return { type: 'buyAndHold' }
      case 'smaCross': return { type: 'smaCross', fast: Math.max(2, fast), slow: Math.max(3, slow) }
      case 'priceAboveSma': return { type: 'priceAboveSma', period: Math.max(2, period) }
    }
  }

  const canRun = Boolean(selected) && !running && (ruleType !== 'smaCross' || fast < slow)

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ alignItems: { md: 'center' }, mb: 1.5 }}>
        <Autocomplete
          sx={{ flex: 1, minWidth: 220 }}
          options={options}
          getOptionLabel={o => `${o.symbol} — ${o.shortname}`}
          filterOptions={x => x}
          loading={searching}
          inputValue={inputValue}
          value={selected}
          onInputChange={(_, v) => setInputValue(v)}
          onChange={(_, v) => setSelected(v)}
          renderInput={params => (
            <TextField
              {...params}
              placeholder="Ticker to backtest (e.g. SPY, AAPL)"
              size="small"
              slotProps={{
                input: {
                  ...params.slotProps.input,
                  endAdornment: (
                    <>
                      {searching && <CircularProgress size={14} aria-label="Searching tickers" />}
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

        <FormControl size="small" sx={{ minWidth: 92 }}>
          <InputLabel id="bt-range-label">Range</InputLabel>
          <Select labelId="bt-range-label" label="Range" value={range} onChange={e => setRange(e.target.value as BacktestRange)}>
            <MenuItem value="5y">5 years</MenuItem>
            <MenuItem value="10y">10 years</MenuItem>
            <MenuItem value="max">Max</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 96 }}>
          <InputLabel id="bt-interval-label">Bars</InputLabel>
          <Select labelId="bt-interval-label" label="Bars" value={interval} onChange={e => setInterval_(e.target.value as BacktestInterval)}>
            <MenuItem value="1wk">Weekly</MenuItem>
            <MenuItem value="1mo">Monthly</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="bt-rule-label">Strategy</InputLabel>
          <Select labelId="bt-rule-label" label="Strategy" value={ruleType} onChange={e => setRuleType(e.target.value as EntryRule['type'])}>
            {(Object.keys(RULE_LABELS) as EntryRule['type'][]).map(t => (
              <MenuItem key={t} value={t}>{RULE_LABELS[t]}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {ruleType === 'smaCross' && (
          <>
            <TextField
              size="small" type="number" label="Fast SMA" value={fast}
              onChange={e => setFast(Number(e.target.value))}
              error={fast >= slow}
              sx={{ width: 90 }}
              slotProps={{ htmlInput: { min: 2, max: 200 } }}
            />
            <TextField
              size="small" type="number" label="Slow SMA" value={slow}
              onChange={e => setSlow(Number(e.target.value))}
              error={fast >= slow}
              sx={{ width: 90 }}
              slotProps={{ htmlInput: { min: 3, max: 400 } }}
            />
          </>
        )}
        {ruleType === 'priceAboveSma' && (
          <TextField
            size="small" type="number" label="SMA Period" value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { min: 2, max: 400 } }}
          />
        )}

        <Button
          variant="contained"
          disableElevation
          startIcon={running ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
          onClick={() => selected && onRun({ symbol: selected.symbol, range, interval, rule: buildRule(), filters })}
          disabled={!canRun}
          sx={{ whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 600 }}
        >
          {running ? 'Running…' : 'Run Backtest'}
        </Button>
      </Stack>

      {/* Macro condition filters */}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Macro Filters
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={filterSeries} onChange={e => setFilterSeries(e.target.value)} sx={{ fontSize: 12 }} aria-label="Macro filter series">
            {MACRO_SERIES.map(s => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>{s.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select value={filterDirection} onChange={e => setFilterDirection(e.target.value as MacroFilter['direction'])} sx={{ fontSize: 12 }} aria-label="Macro filter direction">
            <MenuItem value="rising" sx={{ fontSize: 12 }}>rising</MenuItem>
            <MenuItem value="falling" sx={{ fontSize: 12 }}>falling</MenuItem>
          </Select>
        </FormControl>
        <Button size="small" onClick={addFilter} sx={{ textTransform: 'none', fontSize: 12 }}>+ Add filter</Button>
        {filters.map((f, i) => (
          <Chip
            key={`${f.seriesId}-${f.direction}`}
            size="small"
            label={`hold while ${getMacroDef(f.seriesId)?.label ?? f.seriesId} ${f.direction}`}
            onDelete={() => setFilters(fs => fs.filter((_, j) => j !== i))}
            sx={{ fontSize: 11 }}
          />
        ))}
        {filters.length === 0 && (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>
            none — optionally gate the strategy on live FRED data (e.g. hold only while Fed Funds falling)
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
