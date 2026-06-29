'use client'

import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { getAllFactors, CATEGORY_ORDER, CATEGORY_LABELS } from '../lib/normalize'
import { FACTOR_COLORS } from './FactorOverlayChart'

interface FactorSelectorProps {
  selected: string[]
  onToggle: (id: string) => void
}

const CATEGORY_CHIP_COLORS: Record<string, string> = {
  monetary: '#ff9800',
  market: '#5c8df6',
  commodity: '#ffd700',
  tech: '#c678dd',
  macro: '#4caf50',
  climate: '#00bcd4',
}

export function FactorSelector({ selected, onToggle }: FactorSelectorProps) {
  const allFactors = getAllFactors()
  const byCategory = Object.fromEntries(
    CATEGORY_ORDER.map(cat => [cat, allFactors.filter(f => f.category === cat)])
  )

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em', mb: 1.5, display: 'block' }}>
        Select Factors to Overlay {selected.length > 0 && `(${selected.length} selected)`}
      </Typography>
      {CATEGORY_ORDER.map(cat => {
        const factors = byCategory[cat]
        if (!factors?.length) return null
        return (
          <Box key={cat} sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                color: CATEGORY_CHIP_COLORS[cat],
                fontWeight: 700,
                letterSpacing: '0.1em',
                display: 'block',
                mb: 0.75,
              }}
            >
              {CATEGORY_LABELS[cat]}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {factors.map(factor => {
                const isSelected = selected.includes(factor.id)
                const selIdx = selected.indexOf(factor.id)
                const color = isSelected ? FACTOR_COLORS[selIdx % FACTOR_COLORS.length] : undefined
                return (
                  <Chip
                    key={factor.id}
                    label={factor.label}
                    size="small"
                    variant={isSelected ? 'filled' : 'outlined'}
                    onClick={() => onToggle(factor.id)}
                    sx={{
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      borderColor: isSelected ? color : 'divider',
                      bgcolor: isSelected ? color + '33' : 'transparent',
                      color: isSelected ? color : 'text.secondary',
                      fontWeight: isSelected ? 700 : 400,
                      '&:hover': {
                        bgcolor: isSelected ? color + '44' : 'action.hover',
                        borderColor: color ?? CATEGORY_CHIP_COLORS[cat],
                      },
                      transition: 'all 0.15s',
                    }}
                  />
                )
              })}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
