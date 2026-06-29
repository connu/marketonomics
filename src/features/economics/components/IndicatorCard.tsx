'use client'

import React from 'react'
import { Card, CardActionArea, CardContent, Typography, Skeleton, Box } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { Indicator, IndicatorQuote } from '../types/indicator'
import { formatNumber, formatPercent } from '../../../utils/format'

interface IndicatorCardProps {
  indicator: Indicator
  quote: IndicatorQuote | undefined
  loading: boolean
  selected: boolean
  onClick: () => void
}

function formatPrice(price: number, unit: string): string {
  if (unit === '%') return `${price.toFixed(2)}%`
  if (price >= 10_000) return formatNumber(price, 0)
  if (price >= 1_000) return formatNumber(price, 2)
  if (price >= 100) return formatNumber(price, 2)
  return formatNumber(price, 4)
}

export function IndicatorCard({
  indicator,
  quote,
  loading,
  selected,
  onClick,
}: IndicatorCardProps) {
  const positive = quote ? quote.change >= 0 : false
  const colorKey = indicator.invertColor
    ? positive ? 'error.main' : 'success.main'
    : positive ? 'success.main' : 'error.main'

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: selected ? 'primary.main' : 'divider',
        transition: 'border-color 0.15s',
        height: '100%',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
            {indicator.label}
          </Typography>
          {loading || !quote ? (
            <>
              <Skeleton width="60%" height={32} sx={{ mt: 0.5 }} />
              <Skeleton width="40%" height={20} />
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.25, fontFamily: 'monospace' }}>
                {formatPrice(quote.price, indicator.unit)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                {positive ? (
                  <TrendingUpIcon sx={{ fontSize: 14, color: colorKey }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 14, color: colorKey }} />
                )}
                <Typography variant="caption" color={colorKey} sx={{ fontWeight: 500 }}>
                  {formatPercent(quote.changePercent)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({positive ? '+' : ''}{formatPrice(quote.change, indicator.unit)})
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
