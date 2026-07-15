'use client'

import React, { useMemo, useState } from 'react'
import {
  Box, Typography, ToggleButton, ToggleButtonGroup, Skeleton, Stack, Paper,
} from '@mui/material'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import type { MacroSeriesDef } from '../catalog'
import { useMacroSeries } from '../hooks/useMacroSeries'
import { toYoY, sliceYears } from '../lib/transform'
import { formatNumber } from '../../../utils/format'
import { useDesignMode } from '../../../app/ThemeRegistry'

const RANGES = [
  { label: '1Y', years: 1 },
  { label: '5Y', years: 5 },
  { label: '10Y', years: 10 },
  { label: '25Y', years: 25 },
  { label: 'Max', years: 0 },
] as const

function formatValue(v: number, unit: string): string {
  if (unit === '%') return `${v.toFixed(2)}%`
  if (unit === '$B') return `$${formatNumber(v, 0)}B`
  if (unit === 'thousands') return `${formatNumber(v, 0)}k`
  return formatNumber(v, v >= 1000 ? 0 : 2)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MacroTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1, fontSize: '0.75rem', minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
        {typeof value === 'number' ? formatValue(value, unit) : '—'}
      </Typography>
    </Paper>
  )
}

export function MacroSeriesChart({ def }: { def: MacroSeriesDef }) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart
  const [rangeYears, setRangeYears] = useState<number>(10)
  const [view, setView] = useState<'level' | 'yoy'>(def.yoy ? 'yoy' : 'level')
  const { points: allPoints, loading, error } = useMacroSeries(def.id)

  // Reset the view when switching to a series where YoY doesn't apply
  const effectiveView = def.yoy ? view : 'level'

  const points = useMemo(() => {
    const base = effectiveView === 'yoy' ? toYoY(allPoints) : allPoints
    return sliceYears(base, rangeYears)
  }, [allPoints, effectiveView, rangeYears])

  const unit = effectiveView === 'yoy' ? '%' : def.unit
  const first = points[0]?.value ?? 0
  const last = points[points.length - 1]?.value ?? 0
  const isPositive = last >= first
  const stroke = isPositive ? tokens.pos : tokens.neg

  const ticks = useMemo(() => {
    if (!points.length) return []
    const step = Math.ceil(points.length / 6)
    return points.filter((_, i) => i % step === 0).map(p => p.date)
  }, [points])

  const domain = useMemo(() => {
    if (!points.length) return ['auto', 'auto'] as const
    const vals = points.map(p => p.value)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = (max - min) * 0.05 || 1
    return [min - pad, max + pad] as const
  }, [points])

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{def.label}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>{def.id}</Typography>
            {points.length > 0 && (
              <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: stroke }}>
                {formatValue(last, unit)}
              </Typography>
            )}
          </Stack>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            {def.description} · {def.frequency} · FRED
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 1 }}>
          {def.yoy && (
            <ToggleButtonGroup value={effectiveView} exclusive size="small" onChange={(_, v) => v && setView(v)}>
              <ToggleButton value="level" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem' }}>Level</ToggleButton>
              <ToggleButton value="yoy" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem' }}>YoY %</ToggleButton>
            </ToggleButtonGroup>
          )}
          <ToggleButtonGroup value={rangeYears} exclusive size="small" onChange={(_, v) => v !== null && setRangeYears(v)}>
            {RANGES.map(r => (
              <ToggleButton key={r.label} value={r.years} sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem' }}>
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {loading ? (
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '10px' }} />
      ) : error || points.length === 0 ? (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary" sx={{ fontSize: 13 }}>
            {error ?? 'No data available'}
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={`macro-grad-${def.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', rangeYears === 1 ? { month: 'short', day: 'numeric' } : { month: 'short', year: '2-digit' })}
              tick={{ fontSize: 10, fill: ct.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={domain}
              tickFormatter={(v: number) => formatValue(v, unit)}
              tick={{ fontSize: 10, fill: ct.tick }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              content={<MacroTooltip unit={unit} />}
              cursor={ct.cursor ?? { stroke: 'rgba(148,163,184,0.4)', strokeWidth: 1 }}
            />
            {effectiveView === 'yoy' && <ReferenceLine y={0} stroke={ct.refLine} strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#macro-grad-${def.id})`}
              dot={false}
              activeDot={{ r: 3, fill: stroke }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Box>
  )
}
