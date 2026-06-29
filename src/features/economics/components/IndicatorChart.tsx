'use client'

import React, { useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Stack,
} from '@mui/material'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { Indicator, IndicatorQuote } from '../types/indicator'
import { useIndicatorHistory } from '../hooks/useIndicators'
import { formatNumber } from '../../../utils/format'

const RANGES = ['1mo', '3mo', '6mo', '1y', '2y', '5y'] as const
type Range = (typeof RANGES)[number]

interface IndicatorChartProps {
  indicator: Indicator
  quote: IndicatorQuote | undefined
}

function formatXAxis(dateStr: string, range: Range): string {
  const d = new Date(dateStr)
  if (range === '1mo' || range === '3mo') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function formatYAxis(value: number): string {
  if (value >= 100_000) return `${(value / 1000).toFixed(0)}k`
  if (value >= 10_000) return formatNumber(value, 0)
  if (value >= 1_000) return formatNumber(value, 0)
  return value.toFixed(2)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <Paper
      variant="outlined"
      sx={{ px: 1.5, py: 1, fontSize: '0.75rem', minWidth: 120 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
        {unit === '%' ? `${value?.toFixed(2)}%` : formatNumber(value, 2)}
      </Typography>
    </Paper>
  )
}

export function IndicatorChart({ indicator, quote }: IndicatorChartProps) {
  const [range, setRange] = React.useState<Range>('1y')
  const { history, loading } = useIndicatorHistory(indicator.symbol, range)

  const firstClose = history[0]?.close ?? 0
  const isPositive = history.length > 1
    ? history[history.length - 1].close >= firstClose
    : (quote?.change ?? 0) >= 0
  const stroke = isPositive ? '#4caf50' : '#f44336'
  const fill = isPositive ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.12)'

  const ticks = useMemo(() => {
    if (!history.length) return []
    const step = Math.ceil(history.length / 6)
    return history.filter((_, i) => i % step === 0).map((p) => p.date)
  }, [history])

  const domain = useMemo(() => {
    if (!history.length) return ['auto', 'auto'] as const
    const closes = history.map((p) => p.close)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const pad = (max - min) * 0.05
    return [min - pad, max + pad] as const
  }, [history])

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {indicator.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {indicator.description}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={range}
          exclusive
          onChange={(_, v) => v && setRange(v)}
          size="small"
        >
          {RANGES.map((r) => (
            <ToggleButton key={r} value={r} sx={{ px: 1.5, py: 0.25, fontSize: '0.7rem' }}>
              {r}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {loading ? (
        <Skeleton variant="rectangular" height={300} />
      ) : history.length === 0 ? (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={`grad-${indicator.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(v) => formatXAxis(v, range)}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={domain}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              content={<CustomTooltip unit={indicator.unit} />}
              cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
            />
            <ReferenceLine y={firstClose} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="close"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#grad-${indicator.symbol})`}
              dot={false}
              activeDot={{ r: 3, fill: stroke }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Paper>
  )
}
