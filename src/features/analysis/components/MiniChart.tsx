'use client'

import React, { useMemo } from 'react'
import { Box, Typography, Stack, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  ResponsiveContainer, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart,
} from 'recharts'
import { FACTOR_YEARS } from '../lib/normalize'
import { svgId, type SeriesInfo } from '../lib/series'
import { useDesignMode } from '../../../app/ThemeRegistry'

export function MiniChart({ series, onRemove }: { series: SeriesInfo; onRemove: () => void }) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart
  const gradientId = svgId('mini-grad', series.id)
  const data = useMemo(
    () => FACTOR_YEARS.map((year, i) => ({
      year,
      value: Number.isFinite(series.values[i]) ? series.values[i] : null,
    })),
    [series]
  )
  return (
    <Box
      sx={{
        bgcolor: tokens.insetBg, borderRadius: '10px', p: '12px 14px',
        transition: 'background 0.15s', position: 'relative',
        '&:hover': { background: tokens.insetHover }, '&:hover .rm-btn': { opacity: 1 },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: series.color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {series.label}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', ml: 'auto' }}>{series.unit}</Typography>
        <IconButton
          className="rm-btn"
          size="small"
          onClick={onRemove}
          aria-label={`Remove ${series.label} series`}
          sx={{ p: 0.25, opacity: 0, transition: 'opacity 0.15s', '&:focus-visible': { opacity: 1 } }}
        >
          <CloseIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Stack>
      <Box sx={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="analytics-sync" margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
            {ct.areaGradient && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              cursor={ct.cursor ?? true}
              contentStyle={ct.tooltip}
              labelStyle={ct.tooltipLabel}
            />
            {ct.areaGradient && (
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill={`url(#${gradientId})`}
                connectNulls={false}
                activeDot={false}
                legendType="none"
                tooltipType="none"
              />
            )}
            <Line type="monotone" dataKey="value" name={series.label} stroke={series.color} strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} fill={series.color} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
