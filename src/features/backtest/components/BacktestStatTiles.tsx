'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { useDesignMode } from '../../../app/ThemeRegistry'
import type { BacktestStats } from '../types'

const pct = (v: number, decimals = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`

export function BacktestStatTiles({ stats }: { stats: BacktestStats }) {
  const { tokens } = useDesignMode()
  const signColor = (v: number) => (v > 0 ? tokens.pos : v < 0 ? tokens.neg : tokens.neutral)

  const tiles = [
    { label: 'Total Return', val: pct(stats.totalReturn), color: signColor(stats.totalReturn), sub: `${stats.years.toFixed(1)}y tested` },
    { label: 'CAGR', val: pct(stats.cagr), color: signColor(stats.cagr), sub: `benchmark ${pct(stats.benchmarkCagr)}` },
    { label: 'Max Drawdown', val: pct(stats.maxDrawdown), color: tokens.neg, sub: `benchmark ${pct(stats.benchmarkMaxDrawdown)}` },
    { label: 'Sharpe', val: stats.sharpe.toFixed(2), color: stats.sharpe > 1 ? tokens.pos : tokens.neutral, sub: 'rf ≈ 0' },
    { label: 'Win Rate', val: `${(stats.winRate * 100).toFixed(0)}%`, color: stats.winRate > 0.5 ? tokens.pos : tokens.neutral, sub: `${stats.nTrades} trades` },
    { label: 'Exposure', val: `${(stats.exposure * 100).toFixed(0)}%`, color: tokens.neutral, sub: 'time in market' },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr', lg: 'repeat(6, 1fr)' }, gap: 1 }}>
      {tiles.map(t => (
        <Box key={t.label} sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: 1.5 }}>
          <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.5 }}>
            {t.label}
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: t.color, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            {t.val}
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.4 }}>{t.sub}</Typography>
        </Box>
      ))}
    </Box>
  )
}
