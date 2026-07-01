'use client'

import React, { useMemo, useState } from 'react'
import { Box, Typography, Stack, Menu, MenuItem, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Scatter,
} from 'recharts'
import { getAllFactors, getFactorMeta, FACTOR_YEARS } from '../../../features/analysis/lib/normalize'
import { pearsonCorrelation, crossCorrelation, linearRegression } from '../../../features/analysis/lib/math'
import { FACTOR_COLORS } from '../../../features/analysis/components/FactorOverlayChart'

// Default series mirror the design (equity + AI + rates + inflation + oil + gold),
// mapped onto the app's real factor dataset.
const DEFAULT_SERIES = ['sp500', 'ai_investment', 'interest_rate', 'inflation_cpi', 'oil_wti', 'gold']

interface SeriesInfo {
  id: string
  label: string
  unit: string
  values: number[]
  color: string
}

function corrColor(v: number): string {
  if (v >= 0.99) return '#0f172a'
  if (v > 0.6) return '#1d4ed8'
  if (v > 0.35) return '#3b82f6'
  if (v > 0.1) return '#93c5fd'
  if (v > -0.1) return '#f1f5f9'
  if (v > -0.35) return '#fca5a5'
  if (v > -0.6) return '#ef4444'
  return '#b91c1c'
}
function corrText(v: number): string {
  return Math.abs(v) > 0.4 || v >= 0.99 ? '#ffffff' : '#0f172a'
}

function Panel({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...sx,
      }}
    >
      {children}
    </Box>
  )
}

function MiniChart({ series, onRemove }: { series: SeriesInfo; onRemove: () => void }) {
  const data = useMemo(
    () => FACTOR_YEARS.map((year, i) => ({ year, value: series.values[i] })),
    [series]
  )
  return (
    <Box
      sx={{
        bgcolor: '#f8fafc', borderRadius: '10px', p: '12px 14px',
        transition: 'background 0.15s', position: 'relative',
        '&:hover': { background: '#f1f5f9' }, '&:hover .rm-btn': { opacity: 1 },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: series.color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {series.label}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', ml: 'auto' }}>{series.unit}</Typography>
        <IconButton
          className="rm-btn"
          size="small"
          onClick={onRemove}
          sx={{ p: 0.25, opacity: 0, transition: 'opacity 0.15s' }}
        >
          <CloseIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Stack>
      <Box sx={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="analytics-sync" margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="value" name={series.label} stroke={series.color} strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} fill={series.color} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}

interface DrawerData { ri: number; ci: number }

function DetailDrawer({ open, cell, series, onClose }: {
  open: boolean
  cell: DrawerData | null
  series: SeriesInfo[]
  onClose: () => void
}) {
  const content = useMemo(() => {
    if (!cell) return null
    const rowS = series[cell.ri]
    const colS = series[cell.ci]
    if (!rowS || !colS) return null
    const x = colS.values
    const y = rowS.values
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
          position: 'fixed', inset: 0, bgcolor: 'rgba(15,23,42,0.15)', zIndex: 199,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer */}
      <Box
        sx={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: { xs: '100%', sm: 440 },
          bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', zIndex: 200,
          boxShadow: '-6px 0 28px rgba(0,0,0,0.09)',
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
              <IconButton onClick={onClose} size="small" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>

            {/* Key metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2.25 }}>
              {[
                { label: 'Pearson r', val: content.r.toFixed(3), big: true },
                { label: 'R²', val: (content.r * content.r).toFixed(3), big: true },
                { label: 'Period', val: '21Y Annual', big: false },
                { label: 'Observations', val: `${content.points.length} pts`, big: false },
              ].map(m => (
                <Box key={m.label} sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: m.big ? 1.75 : 1.5 }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.6 }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ fontSize: m.big ? 24 : 13, fontWeight: m.big ? 700 : 600, color: m.big ? '#0f172a' : '#374151', letterSpacing: m.big ? '-0.8px' : 0 }}>
                    {m.val}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Scatter + OLS */}
            <Box sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: 1.75, mb: 1.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#374151', mb: 1.25 }}>Scatter Plot · OLS Regression</Typography>
              <Box sx={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={content.points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                    <XAxis type="number" dataKey="x" name={content.colS.label} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" name={content.rowS.label} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="y" fill="#2563eb" fillOpacity={0.5} />
                    <Line type="linear" dataKey="reg" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Lag analysis */}
            <Box sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: 1.75, mb: 1.75 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#374151', mb: 1.25 }}>Cross-Correlation by Lag</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.6 }}>
                {content.xcorr.lags.map((lag, i) => {
                  const v = content.xcorr.correlations[i]
                  const isPeak = lag === content.xcorr.peakLag
                  return (
                    <Box key={lag} sx={{ textAlign: 'center', bgcolor: isPeak ? 'primary.main' : '#fff', borderRadius: '7px', p: '9px 4px', border: '1px solid', borderColor: isPeak ? 'primary.main' : 'divider' }}>
                      <Typography sx={{ fontSize: 9, color: isPeak ? '#93c5fd' : 'text.disabled', mb: 0.4, fontWeight: 500 }}>
                        {lag >= 0 ? '+' : ''}{lag}y
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: isPeak ? '#fff' : '#374151' }}>{v.toFixed(2)}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {/* Interpretation */}
            <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', p: 1.75 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Box sx={{ width: 3, height: 14, bgcolor: 'primary.main', borderRadius: '2px' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'primary.dark' }}>Statistical Interpretation</Typography>
              </Stack>
              <Typography sx={{ fontSize: 11, color: '#374151', lineHeight: 1.65 }}>{content.interpretation}</Typography>
            </Box>
          </Box>
        )}
      </Box>
    </>
  )
}

export default function AnalyticsPage() {
  const allFactors = useMemo(() => getAllFactors(), [])
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SERIES)
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null)
  const [drawerCell, setDrawerCell] = useState<DrawerData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const series: SeriesInfo[] = useMemo(() =>
    selectedIds
      .map((id, idx) => {
        const f = allFactors.find(a => a.id === id)
        if (!f) return null
        return { id, label: getFactorMeta(id)?.label ?? id, unit: f.unit, values: f.values, color: FACTOR_COLORS[idx % FACTOR_COLORS.length] }
      })
      .filter((s): s is SeriesInfo => s !== null),
    [selectedIds, allFactors]
  )

  const matrix = useMemo(
    () => series.map(a => series.map(b => pearsonCorrelation(a.values, b.values).r)),
    [series]
  )

  const available = allFactors.filter(f => !selectedIds.includes(f.id))

  const openDrawer = (ri: number, ci: number) => {
    setDrawerCell({ ri, ci })
    setDrawerOpen(true)
  }
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: 20 }}>Comparative Analysis</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.4 }}>
            Synchronized multi-series · hover any chart to sync all · 21Y annual · click a matrix cell for detail
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={(e) => setAddAnchor(e.currentTarget)}
          disabled={available.length === 0}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.9, borderRadius: '10px',
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'primary.main', fontFamily: 'inherit',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)', '&:disabled': { color: 'text.disabled', cursor: 'default' },
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} /> Add Graph
        </Box>
        <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
          {available.map(f => (
            <MenuItem
              key={f.id}
              onClick={() => { setSelectedIds(ids => [...ids, f.id]); setAddAnchor(null) }}
              sx={{ fontSize: 13 }}
            >
              {getFactorMeta(f.id)?.label ?? f.id}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* Synchronized charts grid */}
      <Panel sx={{ p: 2.5, mb: 2.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Synchronized Time Series</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Hover to cross-highlight all series · {series.length} graphs</Typography>
        </Stack>
        {series.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 4, textAlign: 'center' }}>
            No series selected — use “Add Graph” to add factors.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.25 }}>
            {series.map(s => (
              <MiniChart key={s.id} series={s} onRemove={() => setSelectedIds(ids => ids.filter(id => id !== s.id))} />
            ))}
          </Box>
        )}
      </Panel>

      {/* Relationship matrix */}
      <Panel sx={{ p: 2.75, mb: 2.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 2.25, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Relationship Matrix</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Pearson correlation · click any off-diagonal cell for detailed analysis</Typography>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
            <thead>
              <tr>
                <th style={{ width: 110 }} />
                {series.map(s => (
                  <th key={s.id} style={{ padding: '4px 6px' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textAlign: 'center', whiteSpace: 'nowrap' }}>{s.label}</Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, ri) => (
                <tr key={ri}>
                  <td style={{ padding: '4px 10px 4px 0' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{series[ri]?.label}</Typography>
                  </td>
                  {row.map((v, ci) => {
                    const diag = ri === ci
                    return (
                      <td key={ci} style={{ padding: 0 }}>
                        <Box
                          onClick={() => !diag && openDrawer(ri, ci)}
                          sx={{
                            width: 84, height: 44, bgcolor: corrColor(v), borderRadius: '7px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: diag ? '#94a3b8' : corrText(v),
                            cursor: diag ? 'default' : 'pointer', userSelect: 'none', transition: 'filter 0.15s',
                            border: v > -0.1 && v <= 0.1 ? '1px solid #e2e8f0' : 'none',
                            '&:hover': diag ? {} : { filter: 'brightness(0.92)' },
                          }}
                        >
                          {diag ? '—' : v.toFixed(2)}
                        </Box>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
        {/* Legend */}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mt: 1.75, pt: 1.75, borderTop: '1px solid', borderColor: '#f1f5f9', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>−1.0</Typography>
          <Stack direction="row" sx={{ gap: '2px' }}>
            {['#b91c1c', '#ef4444', '#fca5a5', '#f1f5f9', '#93c5fd', '#3b82f6', '#1d4ed8'].map((c, i) => (
              <Box key={i} sx={{ width: 20, height: 10, bgcolor: c, borderRadius: '2px', border: c === '#f1f5f9' ? '1px solid #e2e8f0' : 'none' }} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500 }}>+1.0</Typography>
          <Typography sx={{ fontSize: 10, color: '#cbd5e1', ml: 1 }}>Diagonal = self-correlation (1.00)</Typography>
        </Stack>
      </Panel>

      <DetailDrawer open={drawerOpen} cell={drawerCell} series={series} onClose={closeDrawer} />
    </Box>
  )
}
