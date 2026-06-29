'use client'

import React, { useState, useMemo } from 'react'
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, Stack } from '@mui/material'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { getFactorMeta, zScore, toPctChange, minMaxScale } from '../lib/normalize'
import type { ChartSeries } from '../hooks/useFactorAnalysis'

export const FACTOR_COLORS = [
  '#5c8df6', '#f05454', '#4caf50', '#ff9800', '#c678dd',
  '#00bcd4', '#e91e63', '#8bc34a', '#ff5722', '#26c6da',
  '#ffc107', '#03a9f4', '#ea80fc', '#69f0ae', '#ff6d00',
]

type DisplayMode = 'zscore' | 'pct' | 'minmax'

const MODE_LABELS: Record<DisplayMode, string> = {
  zscore: 'Z-Score',
  pct: '% Change',
  minmax: 'Min-Max',
}

const MODE_AXIS_LABEL: Record<DisplayMode, string> = {
  zscore: 'σ from mean',
  pct: '% change from base year',
  minmax: 'Scaled 0 – 100',
}

function applyMode(values: number[], mode: DisplayMode): (number | null)[] {
  const clean = values.filter(v => !isNaN(v) && isFinite(v))
  if (!clean.length) return values.map(() => null)
  let normalized: number[]
  switch (mode) {
    case 'zscore': normalized = zScore(values); break
    case 'pct': normalized = toPctChange(values); break
    case 'minmax': normalized = minMaxScale(values); break
  }
  return normalized.map(v => (isNaN(v) || !isFinite(v) ? null : v))
}

function formatDisplay(v: number, mode: DisplayMode): string {
  if (mode === 'zscore') return `${v > 0 ? '+' : ''}${v.toFixed(2)}σ`
  if (mode === 'pct') return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
  return v.toFixed(1)
}

function formatRaw(v: number, unit: string): string {
  if (unit === '%') return `${v.toFixed(2)}%`
  if (unit === '$B') return `$${v.toFixed(1)}B`
  if (unit === '$T') return `$${v.toFixed(2)}T`
  if (unit.startsWith('$')) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (unit === '°F') return `${v.toFixed(1)}°F`
  if (unit === '¢/kWh') return `${v.toFixed(2)}¢/kWh`
  if (unit === 'pts') return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (unit === '$/oz' || unit === '$/bu' || unit === '$/bbl') return `$${v.toFixed(2)}`
  return v.toFixed(2)
}

interface TooltipEntry { name: string; value: number; color: string; dataKey: string }

function CustomTooltip({
  active, payload, label, mode, rawByKey, unitByKey,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  mode: DisplayMode
  rawByKey: Record<string, number[]>
  unitByKey: Record<string, string>
  yearIndex: Record<string, number>
}) {
  if (!active || !payload?.length) return null
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1.25, fontSize: '0.72rem', maxWidth: 280 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700 }}>
        {label}
      </Typography>
      {payload.map((entry) => {
        const rawArr = rawByKey[entry.dataKey]
        const yearIdx = payload[0] ? payload.indexOf(entry) : -1
        const rawVal = rawArr ? rawArr[payload.indexOf(entry)] : undefined
        const unit = unitByKey[entry.dataKey] ?? ''
        return (
          <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5, mb: 0.25 }}>
            <Typography variant="caption" sx={{ color: entry.color, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: entry.color }}>
                {formatDisplay(entry.value, mode)}
              </Typography>
              {rawVal != null && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.62rem' }}>
                  {formatRaw(rawVal, unit)}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Paper>
  )
}

interface FactorOverlayChartProps {
  series: ChartSeries
  symbol: string
  selectedFactors: string[]
}

export function FactorOverlayChart({ series, symbol, selectedFactors }: FactorOverlayChartProps) {
  const [mode, setMode] = useState<DisplayMode>('zscore')

  // Normalized values per series for the chosen mode
  const normalizedStock = useMemo(() => applyMode(series.stockRaw, mode), [series.stockRaw, mode])

  const normalizedFactors = useMemo(() => {
    const out: Record<string, (number | null)[]> = {}
    for (const fid of selectedFactors) {
      const raw = series.factorRaw[fid]
      if (raw?.length) out[fid] = applyMode(raw, mode)
    }
    return out
  }, [series.factorRaw, selectedFactors, mode])

  const chartData = useMemo(() => series.years.map((year, i) => {
    const row: Record<string, number | string | null> = { year: String(year) }
    row[symbol] = normalizedStock[i] ?? null
    for (const fid of selectedFactors) {
      const meta = getFactorMeta(fid)
      if (meta) row[meta.label] = normalizedFactors[fid]?.[i] ?? null
    }
    return row
  }), [series.years, symbol, normalizedStock, normalizedFactors, selectedFactors])

  // Build raw lookup maps for tooltip
  const rawByKey = useMemo(() => {
    const m: Record<string, number[]> = { [symbol]: series.stockRaw }
    for (const fid of selectedFactors) {
      const meta = getFactorMeta(fid)
      if (meta) m[meta.label] = series.factorRaw[fid] ?? []
    }
    return m
  }, [symbol, series, selectedFactors])

  const unitByKey = useMemo(() => {
    const m: Record<string, string> = { [symbol]: '$' }
    for (const fid of selectedFactors) {
      const meta = getFactorMeta(fid)
      if (meta) m[meta.label] = meta.unit
    }
    return m
  }, [symbol, selectedFactors])

  // Y-axis domain per mode
  const yDomain: [number | string, number | string] = useMemo(() => {
    if (mode === 'zscore') return [-3.5, 3.5]
    if (mode === 'minmax') return [0, 100]
    // pct: auto from data, pad 10%
    let min = 0, max = 0
    for (const row of chartData) {
      for (const v of Object.values(row)) {
        if (typeof v === 'number') { min = Math.min(min, v); max = Math.max(max, v) }
      }
    }
    return [Math.floor(min / 10) * 10 - 10, Math.ceil(max / 10) * 10 + 10]
  }, [mode, chartData])

  const yTickFormatter = (v: number) => {
    if (mode === 'zscore') return `${v.toFixed(1)}σ`
    if (mode === 'pct') return `${v}%`
    return `${v}`
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em', fontWeight: 600 }}>
            {MODE_AXIS_LABEL[mode].toUpperCase()}
          </Typography>
          {mode === 'zscore' && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem' }}>
              Each series normalized to its own mean & std — shape and timing are comparable
            </Typography>
          )}
          {mode === 'pct' && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem' }}>
              Cumulative % change from the first year in range — fast-growing series will dominate the axis
            </Typography>
          )}
          {mode === 'minmax' && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem' }}>
              Each series scaled to 0–100 based on its own min/max in this window
            </Typography>
          )}
        </Box>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v as DisplayMode)}
          size="small"
        >
          {(Object.keys(MODE_LABELS) as DisplayMode[]).map(m => (
            <ToggleButton key={m} value={m} sx={{ px: 1.5, py: 0.25, fontSize: '0.7rem' }}>
              {MODE_LABELS[m]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={yTickFormatter}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
            width={58}
          />
          <Tooltip
            content={
              <CustomTooltip
                mode={mode}
                rawByKey={rawByKey}
                unitByKey={unitByKey}
                yearIndex={{}}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
          <ReferenceLine y={mode === 'minmax' ? 50 : 0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />

          <Line
            type="monotone"
            dataKey={symbol}
            stroke="#ffffff"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 3, fill: '#ffffff' }}
          />

          {selectedFactors.map((fid, idx) => {
            const meta = getFactorMeta(fid)
            if (!meta) return null
            const color = FACTOR_COLORS[idx % FACTOR_COLORS.length]
            return (
              <Line
                key={fid}
                type="monotone"
                dataKey={meta.label}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={idx === 0 ? undefined : '4 2'}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 3, fill: color }}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  )
}
