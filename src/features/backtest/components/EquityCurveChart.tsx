'use client'

import React, { useMemo } from 'react'
import { Box, Typography, Stack } from '@mui/material'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useDesignMode } from '../../../app/ThemeRegistry'
import type { BacktestResult } from '../types'

export function EquityCurveChart({ result, symbol }: { result: BacktestResult; symbol: string }) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart

  const { data, yMax } = useMemo(() => {
    const top = Math.max(...result.equity, ...result.benchmark) * 1.04
    return {
      yMax: top,
      data: result.dates.map((date, i) => ({
        date,
        equity: result.equity[i],
        benchmark: result.benchmark[i],
        // Vertical band marking bars where the strategy is in the market
        held: result.position[i] ? top : null,
      })),
    }
  }, [result])

  const ticks = useMemo(() => {
    const step = Math.ceil(data.length / 7)
    return data.filter((_, i) => i % step === 0).map(d => d.date)
  }, [data])

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Equity Curve · start = 100</Typography>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 14, height: 3, bgcolor: tokens.accent, borderRadius: 1 }} />
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Strategy</Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 14, height: 3, bgcolor: tokens.neutral, borderRadius: 1 }} />
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Buy &amp; hold {symbol}</Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 14, height: 10, bgcolor: tokens.accent, opacity: 0.09, border: `1px solid ${tokens.accentBorder}` }} />
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>In market</Typography>
        </Stack>
      </Stack>
      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              tick={{ fontSize: 10, fill: ct.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 10, fill: ct.tick }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip
              cursor={ct.cursor ?? true}
              contentStyle={ct.tooltip}
              labelStyle={ct.tooltipLabel}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) =>
                name === 'held' ? [undefined, undefined] : [Number(value).toFixed(1), name === 'equity' ? 'Strategy' : 'Buy & hold']}
            />
            <Area
              type="stepAfter"
              dataKey="held"
              stroke="none"
              fill={tokens.accent}
              fillOpacity={0.07}
              connectNulls={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
            />
            <Line type="monotone" dataKey="benchmark" stroke={tokens.neutral} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="equity" stroke={tokens.accent} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
