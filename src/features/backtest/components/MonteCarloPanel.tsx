'use client'

import React, { useMemo } from 'react'
import { Box, Typography, Stack } from '@mui/material'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useDesignMode } from '../../../app/ThemeRegistry'
import type { MonteCarloResult } from '../../analysis/lib/math'

function quantile(sorted: number[], q: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))
  return sorted[idx]
}

export function MonteCarloPanel({ mc }: { mc: MonteCarloResult }) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart

  // Per-year percentile band from the stored sample paths
  const data = useMemo(() => {
    const horizon = mc.paths[0]?.length ?? 0
    return Array.from({ length: horizon }, (_, t) => {
      const vals = mc.paths.map(p => p[t]).sort((a, b) => a - b)
      return {
        year: t,
        band: [quantile(vals, 0.1), quantile(vals, 0.9)] as [number, number],
        median: quantile(vals, 0.5),
      }
    })
  }, [mc])

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Monte Carlo Projection</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
          {mc.nSimulations} simulations · {mc.years}y horizon · from the strategy&apos;s own return distribution
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1.5, alignItems: 'stretch' }}>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
              <XAxis dataKey="year" tickFormatter={(v: number) => `+${v}y`} tick={{ fontSize: 10, fill: ct.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: ct.tick }} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => v.toFixed(0)} />
              <Tooltip
                cursor={ct.cursor ?? true}
                contentStyle={ct.tooltip}
                labelStyle={ct.tooltipLabel}
                labelFormatter={(v) => `+${v} years`}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  if (name === 'band') {
                    const [lo, hi] = value as [number, number]
                    return [`${lo.toFixed(0)} – ${hi.toFixed(0)}`, 'p10–p90']
                  }
                  return [Number(value).toFixed(0), 'median']
                }}
              />
              <Area dataKey="band" stroke="none" fill={tokens.accent} fillOpacity={0.14} activeDot={false} />
              <Line type="monotone" dataKey="median" stroke={tokens.accent} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, alignContent: 'start' }}>
          {[
            { label: 'Median (final)', val: mc.median },
            { label: '90th pct', val: mc.p90 },
            { label: '10th pct', val: mc.p10 },
            { label: 'Volatility', val: null, text: `${mc.volatility.toFixed(1)}%/y` },
          ].map(t => (
            <Box key={t.label} sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: 1.5 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.5 }}>
                {t.label}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.textStrong }}>
                {t.text ?? t.val?.toFixed(0)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
