'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, Typography, Stack, IconButton, TextField, CircularProgress, MenuItem, MenuList,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import StarIcon from '@mui/icons-material/Star'
import { Panel } from '../../../components/layout/Panel'
import { useDesignMode } from '../../../app/ThemeRegistry'
import { searchTickers, type SearchResult, type QuoteData } from '../../../services/marketData'
import { useWatchlist } from '../hooks/useWatchlist'
import { useWatchlistQuotes } from '../hooks/useWatchlistQuotes'
import { formatNumber, formatPercent } from '../../../utils/format'
import type { WatchlistItem } from '../store'

/** Dependency-free sparkline: a plain SVG polyline of the 3-month closes. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const points = useMemo(() => {
    if (values.length < 2) return ''
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    return values
      .map((v, i) => `${((i / (values.length - 1)) * 64).toFixed(1)},${(18 - ((v - min) / span) * 16 + 1).toFixed(1)}`)
      .join(' ')
  }, [values])
  if (!points) return <Box sx={{ width: 64, height: 20 }} />
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function WatchlistRow({ item, quote, spark, onRemove }: {
  item: WatchlistItem
  quote: QuoteData | undefined
  spark: number[] | undefined
  onRemove: () => void
}) {
  const { tokens } = useDesignMode()
  const positive = (quote?.regularMarketChange ?? 0) >= 0
  const color = positive ? tokens.pos : tokens.neg
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center', gap: 1, py: 0.9, px: 1.25, borderRadius: '8px',
        '&:hover': { bgcolor: tokens.insetHover }, '&:hover .wl-rm': { opacity: 1 },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{item.symbol}</Typography>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </Typography>
      </Box>
      <Sparkline values={spark ?? []} color={color} />
      <Box sx={{ textAlign: 'right', width: 74, flexShrink: 0 }}>
        {quote ? (
          <>
            <Typography sx={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
              {formatNumber(quote.regularMarketPrice, quote.regularMarketPrice >= 1000 ? 0 : 2)}
            </Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color }}>
              {formatPercent(quote.regularMarketChangePercent)}
            </Typography>
          </>
        ) : (
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
        )}
      </Box>
      <IconButton
        className="wl-rm"
        size="small"
        onClick={onRemove}
        aria-label={`Remove ${item.symbol} from watchlist`}
        sx={{ p: 0.25, opacity: { xs: 1, md: 0 }, transition: 'opacity 0.15s', '&:focus-visible': { opacity: 1 } }}
      >
        <CloseIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Stack>
  )
}

export function WatchlistPanel() {
  const { tokens } = useDesignMode()
  const { items, add, remove, isFull } = useWatchlist()
  const { quotes, sparks } = useWatchlistQuotes(items.map(i => i.symbol))

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    const t = setTimeout(async () => {
      if (!q) {
        setResults([])
        setSearching(false)
        return
      }
      setSearching(true)
      try {
        const found = await searchTickers(q)
        setResults(found.slice(0, 5))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [query])

  const addResult = (r: SearchResult) => {
    add(r.symbol, r.shortname || r.symbol)
    setQuery('')
    setResults([])
  }

  return (
    <Panel sx={{ p: 2, position: { lg: 'sticky' }, top: { lg: 76 } }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <StarIcon sx={{ fontSize: 15, color: tokens.warn }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Watchlist</Typography>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', ml: 'auto' }}>
          {items.length ? `${items.length} symbols · 60s refresh` : ''}
        </Typography>
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder={isFull ? 'Watchlist full (20 max)' : 'Add ticker (e.g. AAPL)…'}
        value={query}
        disabled={isFull}
        onChange={e => setQuery(e.target.value)}
        slotProps={{
          input: {
            sx: { fontSize: 12, borderRadius: '8px' },
            endAdornment: searching ? <CircularProgress size={13} aria-label="Searching tickers" /> : null,
          },
        }}
        sx={{ mb: 1 }}
      />
      {results.length > 0 && (
        <MenuList dense sx={{ py: 0, mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
          {results.map(r => (
            <MenuItem key={r.symbol} onClick={() => addResult(r)} sx={{ fontSize: 12, gap: 0.75 }}>
              <Typography component="span" sx={{ fontSize: 12, fontWeight: 700 }}>{r.symbol}</Typography>
              <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.shortname}
              </Typography>
            </MenuItem>
          ))}
        </MenuList>
      )}

      {items.length === 0 ? (
        <Typography sx={{ fontSize: 11, color: 'text.disabled', py: 2, textAlign: 'center' }}>
          No symbols yet — search above to add stocks, ETFs, or indices.
        </Typography>
      ) : (
        <Box>
          {items.map(item => (
            <WatchlistRow
              key={item.symbol}
              item={item}
              quote={quotes[item.symbol]}
              spark={sparks[item.symbol]}
              onRemove={() => remove(item.symbol)}
            />
          ))}
        </Box>
      )}
    </Panel>
  )
}
