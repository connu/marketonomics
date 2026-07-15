'use client'

import React, { useEffect, useState } from 'react'
import { Box, Typography, Stack, Collapse, Skeleton } from '@mui/material'
import { getFactorMeta } from '../lib/normalize'
import type { StatCard, StatColors } from '../lib/statCards'
import { runStatCards } from '../lib/statsClient'
import { useDesignMode } from '../../../app/ThemeRegistry'
import type { DesignTokens } from '../../../theme/tokens'

function statColors(tokens: DesignTokens): StatColors {
  return { pos: tokens.pos, neg: tokens.neg, neu: tokens.neutral, blue: tokens.accent }
}

function CardView({ card }: { card: StatCard }) {
  const { tokens } = useDesignMode()
  const [open, setOpen] = useState(false)
  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: '12px', p: '16px 18px', boxShadow: tokens.cardShadow,
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: tokens.cardShadowHover, transform: 'translateY(-1px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {card.name}
        </Typography>
        <Box
          component="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${card.name} details`}
          sx={{ fontSize: 10, color: 'primary.main', background: 'none', border: 'none', cursor: 'pointer', p: 0, fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          {open ? 'Collapse ↙' : 'Expand ↗'}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: card.resultColor, letterSpacing: '-0.5px', mb: 0.6, lineHeight: 1.1 }}>
        {card.result}
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.55 }}>
        {card.explanation}
      </Typography>
      <Collapse in={open}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: tokens.hairline }}>
          <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
            Rolling Window Breakdown
          </Typography>
          {card.bars.length === 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Not enough data points.</Typography>
          )}
          {card.bars.map((b, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', width: 24, flexShrink: 0 }}>{b.label}</Typography>
              <Box sx={{ flex: 1, bgcolor: tokens.trackBg, borderRadius: '3px', height: 5, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: b.pct, bgcolor: b.color, borderRadius: '3px' }} />
              </Box>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: tokens.textBody, width: 38, textAlign: 'right' }}>{b.val}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

interface StatCardGridProps {
  stockPrices: number[]
  factorValues: number[]
  years: number[]
  factorId: string
  symbol: string
  rangeLabel: string
}

export function StatCardGrid({ stockPrices, factorValues, years, factorId, symbol, rangeLabel }: StatCardGridProps) {
  const { tokens } = useDesignMode()
  const meta = getFactorMeta(factorId)
  const factorLabel = meta?.label ?? factorId

  const hasEnoughData =
    factorValues.filter(v => !isNaN(v) && isFinite(v)).length >= 4 && stockPrices.length >= 4

  // Identifies one computation's inputs, so `computing` can be derived from a
  // key mismatch rather than set synchronously inside the effect.
  const requestKey = `${symbol}|${factorLabel}|${tokens.accent}|${years.join(',')}|${stockPrices.join(',')}|${factorValues.join(',')}`

  // Computed in the stats Web Worker so the 10-method suite (incl. the
  // 500-path Monte Carlo) never blocks paint on the main thread.
  const [result, setResult] = useState<{ key: string; cards: StatCard[] }>({ key: '', cards: [] })

  useEffect(() => {
    if (!hasEnoughData) return
    let stale = false
    runStatCards(factorValues, stockPrices, years, factorLabel, symbol, statColors(tokens))
      .then(cards => { if (!stale) setResult({ key: requestKey, cards }) })
      .catch(() => { if (!stale) setResult({ key: requestKey, cards: [] }) })
    return () => { stale = true }
  }, [requestKey, hasEnoughData, factorValues, stockPrices, years, factorLabel, symbol, tokens])

  if (!hasEnoughData) return null

  const computing = result.key !== requestKey
  const cards = computing ? [] : result.cards

  if (!computing && !cards.length) return null

  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 1.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Statistical Analysis</Typography>
        <Box sx={{ fontSize: 11, color: 'primary.main', px: 1, py: '2px', bgcolor: tokens.accentBg, borderRadius: '5px', fontWeight: 500 }}>
          {symbol} vs {factorLabel}
        </Box>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 'auto' }}>{rangeLabel} · annual data</Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.25 }}>
        {cards.length
          ? cards.map(c => <CardView key={c.name} card={c} />)
          : Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} variant="rounded" height={118} sx={{ borderRadius: '12px' }} />
            ))}
      </Box>
    </Box>
  )
}
