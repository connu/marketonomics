'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Typography,
  Box,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Holding, HoldingFormData } from '../types/holding'
import { searchTickers, fetchQuote, SearchResult } from '../../../services/marketData'

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
  'Communication Services',
  'Other',
]

const EMPTY_FORM: HoldingFormData = {
  company: '',
  ticker: '',
  shares: '',
  purchasePrice: '',
  currentPrice: '',
  sector: '',
  industry: '',
}

interface HoldingFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Holding, 'id'>) => void
  initialData?: Holding | null
}

function parsePositiveNumber(value: string): number | null {
  const n = parseFloat(value)
  return isFinite(n) && n > 0 ? n : null
}

export function HoldingForm({ open, onClose, onSubmit, initialData }: HoldingFormProps) {
  const [form, setForm] = useState<HoldingFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof HoldingFormData, string>>>({})

  const [searchOptions, setSearchOptions] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteFetched, setQuoteFetched] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setForm({
        company: initialData.company,
        ticker: initialData.ticker,
        shares: String(initialData.shares),
        purchasePrice: String(initialData.purchasePrice),
        currentPrice: String(initialData.currentPrice),
        sector: initialData.sector,
        industry: initialData.industry,
      })
      setQuoteFetched(true)
    } else {
      setForm(EMPTY_FORM)
      setQuoteFetched(false)
    }
    setErrors({})
    setSearchOptions([])
    setQuoteError(null)
    setSearchInput('')
  }, [initialData, open])

  useEffect(() => {
    if (!searchInput || searchInput.length < 1) {
      setSearchOptions([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      const results = await searchTickers(searchInput)
      setSearchOptions(results)
      setSearchLoading(false)
    }, 300)
  }, [searchInput])

  const refreshPrice = useCallback(async (symbol: string) => {
    if (!symbol) return
    setQuoteLoading(true)
    setQuoteError(null)
    const quote = await fetchQuote(symbol)
    if (quote) {
      setForm((prev) => ({
        ...prev,
        currentPrice: String(quote.regularMarketPrice),
        company: prev.company || quote.longName || quote.shortName,
      }))
      setQuoteFetched(true)
    } else {
      setQuoteError(`Could not fetch price for ${symbol}`)
    }
    setQuoteLoading(false)
  }, [])

  const handleTickerSelect = useCallback(
    async (_: React.SyntheticEvent, value: SearchResult | null) => {
      if (!value) return
      setForm((prev) => ({
        ...prev,
        ticker: value.symbol,
        company: value.longname || value.shortname,
      }))
      setErrors((prev) => ({ ...prev, ticker: undefined, company: undefined }))
      await refreshPrice(value.symbol)
    },
    [refreshPrice]
  )

  const set = (field: keyof HoldingFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof HoldingFormData, string>> = {}
    if (!form.company.trim()) next.company = 'Required'
    if (!form.ticker.trim()) next.ticker = 'Required'
    if (parsePositiveNumber(form.shares) === null) next.shares = 'Must be a positive number'
    if (parsePositiveNumber(form.purchasePrice) === null)
      next.purchasePrice = 'Must be a positive number'
    if (parsePositiveNumber(form.currentPrice) === null)
      next.currentPrice = 'Must be a positive number'
    if (!form.sector) next.sector = 'Required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSubmit({
      company: form.company.trim(),
      ticker: form.ticker.trim().toUpperCase(),
      shares: parsePositiveNumber(form.shares)!,
      purchasePrice: parsePositiveNumber(form.purchasePrice)!,
      currentPrice: parsePositiveNumber(form.currentPrice)!,
      sector: form.sector,
      industry: form.industry.trim(),
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialData ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Ticker search */}
          <Grid size={12}>
            <Autocomplete<SearchResult>
              options={searchOptions}
              loading={searchLoading}
              inputValue={searchInput}
              onInputChange={(_, v) => setSearchInput(v)}
              onChange={handleTickerSelect}
              filterOptions={(x) => x}
              getOptionLabel={(o) => `${o.symbol} — ${o.shortname}`}
              isOptionEqualToValue={(a, b) => a.symbol === b.symbol}
              noOptionsText={searchInput.length < 1 ? 'Type to search…' : 'No results'}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.symbol}>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', fontWeight: 600, mr: 1, minWidth: 70 }}
                  >
                    {option.symbol}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {option.shortname}
                  </Typography>
                  <Chip
                    label={option.quoteType}
                    size="small"
                    sx={{ ml: 'auto', fontSize: '0.65rem' }}
                  />
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Ticker or Company"
                  size="small"
                  error={!!errors.ticker}
                  helperText={errors.ticker ?? (quoteError ?? undefined)}
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      endAdornment: (
                        <>
                          {searchLoading && <CircularProgress size={14} />}
                          {params.slotProps.input.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
          </Grid>

          {/* Company name (editable, pre-filled from search) */}
          <Grid size={8}>
            <TextField
              label="Company Name"
              value={form.company}
              onChange={set('company')}
              error={!!errors.company}
              helperText={errors.company}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Ticker"
              value={form.ticker}
              onChange={set('ticker')}
              error={!!errors.ticker}
              fullWidth
              size="small"
              sx={{ '& input': { textTransform: 'uppercase' } }}
            />
          </Grid>

          {/* Price row */}
          <Grid size={4}>
            <TextField
              label="Shares"
              value={form.shares}
              onChange={set('shares')}
              error={!!errors.shares}
              helperText={errors.shares}
              fullWidth
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Purchase Price ($)"
              value={form.purchasePrice}
              onChange={set('purchasePrice')}
              error={!!errors.purchasePrice}
              helperText={errors.purchasePrice}
              fullWidth
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Current Price ($)"
              value={form.currentPrice}
              onChange={set('currentPrice')}
              error={!!errors.currentPrice}
              helperText={errors.currentPrice}
              fullWidth
              size="small"
              type="number"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {quoteLoading ? (
                        <CircularProgress size={14} />
                      ) : (
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => refreshPrice(form.ticker)}
                          disabled={!form.ticker}
                          title="Refresh live price"
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                },
                htmlInput: { min: 0, step: 'any' },
              }}
            />
          </Grid>

          {/* Sector / Industry */}
          <Grid size={6}>
            <TextField
              label="Sector"
              value={form.sector}
              onChange={set('sector')}
              error={!!errors.sector}
              helperText={errors.sector}
              fullWidth
              size="small"
              select
            >
              {SECTORS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              label="Industry"
              value={form.industry}
              onChange={set('industry')}
              fullWidth
              size="small"
              placeholder="e.g. Semiconductors"
            />
          </Grid>

          {quoteFetched && (
            <Grid size={12}>
              <Typography variant="caption" color="success.main">
                Live price fetched from Yahoo Finance
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {initialData ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
