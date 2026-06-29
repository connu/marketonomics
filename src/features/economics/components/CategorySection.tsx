'use client'

import React from 'react'
import { Box, Grid, Typography } from '@mui/material'
import { Indicator, IndicatorQuote, CATEGORY_LABELS } from '../types/indicator'
import { IndicatorCard } from './IndicatorCard'

interface CategorySectionProps {
  category: Indicator['category']
  indicators: Indicator[]
  quotes: Record<string, IndicatorQuote>
  loading: boolean
  selected: string | null
  onSelect: (symbol: string) => void
}

export function CategorySection({
  category,
  indicators,
  quotes,
  loading,
  selected,
  onSelect,
}: CategorySectionProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: '0.12em', mb: 1, display: 'block' }}
      >
        {CATEGORY_LABELS[category]}
      </Typography>
      <Grid container spacing={1.5}>
        {indicators.map((ind) => (
          <Grid key={ind.symbol} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <IndicatorCard
              indicator={ind}
              quote={quotes[ind.symbol]}
              loading={loading}
              selected={selected === ind.symbol}
              onClick={() => onSelect(ind.symbol)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
