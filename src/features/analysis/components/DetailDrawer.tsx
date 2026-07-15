'use client'

import React, { useMemo } from 'react'
import { Box, Typography, Stack, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  ResponsiveContainer, Line, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Scatter,
} from 'recharts'
import { pearsonCorrelation, crossCorrelation, linearRegression } from '../lib/math'
import { finitePairs, type SeriesInfo } from '../lib/series'
import { useDesignMode } from '../../../app/ThemeRegistry'

export interface DrawerData { ri: number; ci: number }

export function DetailDrawer({ open, cell, series, onClose }: {
  open: boolean
  cell: DrawerData | null
  series: SeriesInfo[]
  onClose: () => void
}) {
  const { tokens } = useDesignMode()
  const ct = tokens.chart
  const content = useMemo(() => {
    if (!cell) return null
    const rowS = series[cell.ri]
    const colS = series[cell.ci]
    if (!rowS || !colS) return null
    const [x, y] = finitePairs(colS.values, rowS.values)
    if (x.length < 3) return null
    const { r } = pearsonCorrelation(x, y)
    const reg = linearRegression(x, y)
    const points = x
      .map((xv, i) => ({ x: xv, y: y[i], reg: reg.intercept + reg.slope * xv }))
      .sort((a, b) => a.x - b.x)
    const xcorr = crossCorrelation(x, y, 2)
    const interpretation = `${rowS.label} and ${colS.label} show r = ${r.toFixed(3)} (R² = ${(r * r).toFixed(3)}) over ${x.length} annual observations. ${Math.abs(r) > 0.4 ? 'This is a statistically robust relationship suitable for factor-model inclusion.' : 'This relationship warrants further regime-conditional testing before production use.'}`
    return { rowS, colS, r, reg, points, xcorr, interpretation }
  }, [cell, series])

  return (
    <>
      {/* Overlay */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed', inset: 0, bgcolor: tokens.overlay, zIndex: 199,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer */}
      <Box
        sx={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: { xs: '100%', sm: 440 },
          bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', zIndex: 200,
          boxShadow: tokens.drawerShadow,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)', overflowY: 'auto',
        }}
      >
        {content && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                  Pairwise Analysis
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{content.rowS.label}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', my: 0.25 }}>vs</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{content.colS.label}</Typography>
              </Box>
              <IconButton onClick={onClose} size="small" aria-label="Close analysis drawer" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: tokens.insetBg }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>

            {/* Key metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2.25 }}>
              {[
                { label: 'Pearson r', val: content.r.toFixed(3), big: true },
                { label: 'R²', val: (content.r * content.r).toFixed(3), big: true },
                { label: 'Period', val: `${content.points.length}Y Annual`, big: false },
                { label: 'Observations', val: `${content.points.length} pts`, big: false },
              ].map(m => (
                <Box key={m.label} sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: m.big ? 1.75 : 1.5 }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.6 }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ fontSize: m.big ? 24 : 13, fontWeight: m.big ? 700 : 600, color: m.big ? tokens.textStrong : tokens.textBody, letterSpacing: m.big ? '-0.8px' : 0 }}>
                    {m.val}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Scatter + OLS */}
            <Box sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: 1.75, mb: 1.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, mb: 1.25 }}>Scatter Plot · OLS Regression</Typography>
              <Box sx={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={content.points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
                    <XAxis type="number" dataKey="x" name={content.colS.label} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" name={content.rowS.label} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} cursor={ct.scatterCursor} />
                    <Scatter dataKey="y" fill={tokens.accent} fillOpacity={0.5} />
                    <Line type="linear" dataKey="reg" stroke={tokens.neg} strokeWidth={2} dot={false} activeDot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Lag analysis */}
            <Box sx={{ bgcolor: tokens.insetBg, borderRadius: '10px', p: 1.75, mb: 1.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.textBody, mb: 1.25 }}>Cross-Correlation by Lag</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.6 }}>
                {content.xcorr.lags.map((lag, i) => {
                  const v = content.xcorr.correlations[i]
                  const isPeak = lag === content.xcorr.peakLag
                  return (
                    <Box key={lag} sx={{ textAlign: 'center', bgcolor: isPeak ? 'primary.main' : tokens.lagCellBg, borderRadius: '7px', p: '9px 4px', border: '1px solid', borderColor: isPeak ? 'primary.main' : 'divider' }}>
                      <Typography sx={{ fontSize: 9, color: isPeak ? tokens.peakLagSubtext : 'text.disabled', mb: 0.4, fontWeight: 500 }}>
                        {lag >= 0 ? '+' : ''}{lag}y
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: isPeak ? '#fff' : tokens.textBody }}>{v.toFixed(2)}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {/* Interpretation */}
            <Box sx={{ bgcolor: tokens.accentBg, border: `1px solid ${tokens.accentBorder}`, borderRadius: '10px', p: 1.75 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Box sx={{ width: 3, height: 14, bgcolor: 'primary.main', borderRadius: '2px' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.accentText }}>Statistical Interpretation</Typography>
              </Stack>
              <Typography sx={{ fontSize: 11, color: tokens.textBody, lineHeight: 1.65 }}>{content.interpretation}</Typography>
            </Box>
          </Box>
        )}
      </Box>
    </>
  )
}
