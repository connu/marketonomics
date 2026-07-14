'use client'

import React from 'react'
import {
  Box, Typography, Paper, Tabs, Tab, Chip, Stack, Divider,
  Table, TableBody, TableCell, TableRow, LinearProgress,
} from '@mui/material'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, LineChart, Line, ScatterChart, Scatter,
} from 'recharts'
import { getFactorMeta } from '../lib/normalize'
import { useDesignMode } from '../../../app/ThemeRegistry'
import type { ChartTokens, DesignTokens } from '../../../theme/tokens'
import type { MethodId } from '../hooks/useFactorAnalysis'
import { METHOD_LABELS } from '../hooks/useFactorAnalysis'
import type {
  AnalysisResult, CrossCorrelationResult, LinearRegressionResult,
  RollingCorrelationResult, MonteCarloResult,
  ElasticityResult,
} from '../lib/math'

const METHODS: MethodId[] = [
  'pearson', 'spearman', 'crossCorrelation', 'linearRegression',
  'rollingCorrelation', 'granger', 'cointegration', 'monteCarlo',
  'elasticity', 'mutualInfo',
]

interface AnalysisPanelProps {
  selectedFactors: string[]
  results: Record<string, AnalysisResult>
  activeMethod: MethodId
  years: number[]
  stockRaw: number[]
  onMethodChange: (m: MethodId) => void
}

function pChip(pValue: number) {
  const color = pValue < 0.01 ? 'success' : pValue < 0.05 ? 'warning' : 'error'
  const label = pValue < 0.01 ? 'p < 0.01 **' : pValue < 0.05 ? 'p < 0.05 *' : `p = ${pValue.toFixed(3)}`
  return <Chip label={label} size="small" color={color} variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
}

function rBar(r: number, t: DesignTokens) {
  const pct = Math.abs(r) * 100
  const color = Math.abs(r) > 0.7 ? t.pos : Math.abs(r) > 0.4 ? t.warn : t.neg
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.disabledBackground', '& .MuiLinearProgress-bar': { bgcolor: color } }}
      />
      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color, minWidth: 42 }}>
        {r.toFixed(3)}
      </Typography>
    </Box>
  )
}

function CrossCorrChart({ result, color }: { result: CrossCorrelationResult; color: string }) {
  const { tokens } = useDesignMode()
  const ct: ChartTokens = tokens.chart
  const data = result.lags.map((lag, i) => ({ lag, r: result.correlations[i] }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
        <XAxis dataKey="lag" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} label={{ value: 'Lag (years)', position: 'insideBottom', offset: -4, fontSize: 9, fill: ct.tick }} />
        <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : v)} contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} />
        <ReferenceLine y={0} stroke={ct.refLine} />
        <Bar dataKey="r" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LinRegChart({ result, factorLabel, years, factorVals, color }: {
  result: LinearRegressionResult; factorLabel: string; years: number[]; factorVals: number[]; color: string
}) {
  const { tokens } = useDesignMode()
  const ct: ChartTokens = tokens.chart
  const data = years.map((y, i) => ({ year: String(y), actual: result.predictions[i] !== undefined ? factorVals[i] : 0, predicted: result.predictions[i] ?? 0 }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
        <XAxis dataKey="actual" name={factorLabel} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <YAxis dataKey="predicted" name="Stock Price" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <Tooltip cursor={ct.scatterCursor} contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} />
        <Scatter data={data} fill={color} opacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

function RollingCorrChart({ result, color }: { result: RollingCorrelationResult; color: string }) {
  const { tokens } = useDesignMode()
  const ct: ChartTokens = tokens.chart
  const data = result.years.map((y, i) => ({ year: String(y), r: isNaN(result.correlations[i]) ? null : result.correlations[i] }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
        <XAxis dataKey="year" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => (typeof v === 'number' ? v?.toFixed(3) : v)} contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} />
        <ReferenceLine y={0} stroke={ct.refLine} />
        <Line type="monotone" dataKey="r" stroke={color} strokeWidth={1.5} dot={false} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function MonteCarloChart({ result }: { result: MonteCarloResult }) {
  const { tokens } = useDesignMode()
  const ct: ChartTokens = tokens.chart
  const xLabels = Array.from({ length: result.years + 1 }, (_, i) => i)
  const data = xLabels.map(t => {
    return { t: `+${t}y`, sample1: result.paths[0]?.[t], sample2: result.paths[1]?.[t], sample3: result.paths[2]?.[t] }
  })
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${v?.toFixed(0)}`} tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} width={60} />
        <Tooltip formatter={(v) => (typeof v === 'number' ? `$${v.toFixed(2)}` : v)} contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} />
        <Line type="monotone" dataKey="sample1" stroke={tokens.accent} strokeWidth={1} dot={false} strokeOpacity={0.6} />
        <Line type="monotone" dataKey="sample2" stroke={tokens.pos} strokeWidth={1} dot={false} strokeOpacity={0.6} />
        <Line type="monotone" dataKey="sample3" stroke={tokens.warn} strokeWidth={1} dot={false} strokeOpacity={0.6} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ElasticityChart({ result, color }: { result: ElasticityResult; color: string }) {
  const { tokens } = useDesignMode()
  const ct: ChartTokens = tokens.chart
  const data = result.years.map((y, i) => ({ year: String(y), e: result.pointElasticities[i] }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray={ct.gridDash} stroke={ct.grid} />
        <XAxis dataKey="year" tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: ct.tick }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : v)} contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} />
        <ReferenceLine y={0} stroke={ct.refLine} />
        <Bar dataKey="e" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function FactorResult({
  factorId, result, idx, years, factorVals,
}: {
  factorId: string; result: AnalysisResult; idx: number; years: number[]; factorVals: number[]
}) {
  const { tokens } = useDesignMode()
  const meta = getFactorMeta(factorId)
  const color = tokens.overlayFactorColors[idx % tokens.overlayFactorColors.length]
  if (!meta) return null

  const renderVisual = () => {
    switch (result.method) {
      case 'crossCorrelation': return <CrossCorrChart result={result} color={color} />
      case 'linearRegression': return <LinRegChart result={result} factorLabel={meta.label} years={years} factorVals={factorVals} color={color} />
      case 'rollingCorrelation': return <RollingCorrChart result={result} color={color} />
      case 'monteCarlo': return <MonteCarloChart result={result} />
      case 'elasticity': return <ElasticityChart result={result} color={color} />
      default: return null
    }
  }

  const renderStats = () => {
    switch (result.method) {
      case 'pearson': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Pearson r</TableCell><TableCell sx={{ border: 0 }}>{rBar(result.r, tokens)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>R²</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{(result.r**2).toFixed(4)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Significance</TableCell><TableCell sx={{ border: 0 }}>{pChip(result.pValue)}</TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'spearman': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Spearman ρ</TableCell><TableCell sx={{ border: 0 }}>{rBar(result.rho, tokens)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Significance</TableCell><TableCell sx={{ border: 0 }}>{pChip(result.pValue)}</TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'crossCorrelation': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Peak Lag</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.peakLag} year(s)</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Peak r</TableCell><TableCell sx={{ border: 0 }}>{rBar(result.peakCorrelation, tokens)}</TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'linearRegression': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Slope</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.slope.toFixed(4)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Intercept</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.intercept.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>R²</TableCell><TableCell sx={{ border: 0 }}>{rBar(Math.sqrt(result.r2), tokens)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Significance</TableCell><TableCell sx={{ border: 0 }}>{pChip(result.pValue)}</TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'granger': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Factor → Stock F</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.fStat.toFixed(3)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Significance</TableCell><TableCell sx={{ border: 0 }}>{pChip(result.pValue)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Causality</TableCell><TableCell sx={{ fontSize: '0.72rem', border: 0 }}>
              {result.xCausesY ? <Chip label="Factor → Stock ✓" size="small" color="success" sx={{ mr: 0.5, fontSize: '0.6rem', height: 18 }} /> : null}
              {result.yCausesX ? <Chip label="Stock → Factor ✓" size="small" color="info" sx={{ fontSize: '0.6rem', height: 18 }} /> : null}
              {!result.xCausesY && !result.yCausesX ? <Chip label="None detected" size="small" color="default" sx={{ fontSize: '0.6rem', height: 18 }} /> : null}
            </TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'cointegration': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>ADF Statistic</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.adfStatistic.toFixed(4)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Critical (5%)</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.criticalValue95}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Result</TableCell><TableCell sx={{ border: 0 }}>
              <Chip label={result.cointegrated ? 'Cointegrated ✓' : 'Not Cointegrated'} size="small" color={result.cointegrated ? 'success' : 'error'} sx={{ fontSize: '0.6rem', height: 18 }} />
            </TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'monteCarlo': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Base Price</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>${result.baseValue.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Median ({result.years}y)</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>${result.median.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>10th / 90th pct</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>${result.p10.toFixed(2)} – ${result.p90.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Avg Annual Return</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.meanReturn.toFixed(2)}%</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Annual Volatility</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.volatility.toFixed(2)}%</TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'elasticity': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Mean Elasticity</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.meanElasticity.toFixed(4)}</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Type</TableCell><TableCell sx={{ border: 0 }}>
              <Chip label={Math.abs(result.meanElasticity) > 1 ? 'Elastic |E|>1' : 'Inelastic |E|<1'} size="small" color={Math.abs(result.meanElasticity) > 1 ? 'warning' : 'default'} sx={{ fontSize: '0.6rem', height: 18 }} />
            </TableCell></TableRow>
          </TableBody>
        </Table>
      )
      case 'mutualInfo': return (
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Mutual Information</TableCell><TableCell sx={{ fontSize: '0.78rem', fontFamily: 'monospace', border: 0 }}>{result.mi.toFixed(4)} nats</TableCell></TableRow>
            <TableRow><TableCell sx={{ color: 'text.secondary', fontSize: '0.72rem', border: 0 }}>Normalized MI</TableCell><TableCell sx={{ border: 0 }}>{rBar(result.normalizedMI, tokens)}</TableCell></TableRow>
          </TableBody>
        </Table>
      )
      default: return null
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderLeft: `3px solid ${color}` }}>
      <Typography variant="caption" sx={{ color, fontWeight: 700, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
        {meta.label} ({meta.unit})
      </Typography>
      {renderStats()}
      {renderVisual() && <Box sx={{ mt: 1.5 }}>{renderVisual()}</Box>}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', lineHeight: 1.5 }}>
        {result.interpretation}
      </Typography>
    </Paper>
  )
}

export function AnalysisPanel({
  selectedFactors, results, activeMethod, years, onMethodChange,
}: AnalysisPanelProps) {
  if (!selectedFactors.length) return null

  const hasResults = Object.keys(results).length > 0

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 3 }} />
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em', mb: 1.5, display: 'block' }}>
        Mathematical Analysis
      </Typography>

      <Tabs
        value={activeMethod}
        onChange={(_, v) => onMethodChange(v as MethodId)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontSize: '0.72rem', minWidth: 80, py: 0.75 } }}
      >
        {METHODS.map(m => (
          <Tab key={m} label={METHOD_LABELS[m]} value={m} />
        ))}
      </Tabs>

      {!hasResults ? (
        <Box sx={{ textAlign: 'center', py: 3, color: 'text.disabled' }}>
          <Typography variant="body2">
            Select a method above to run the analysis on selected factors vs stock price.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {selectedFactors.map((fid, idx) => {
            const result = results[fid]
            if (!result) return null
            // Pass through raw factor data via result (use predictions for regression, raw otherwise)
            const factorVals = years.map(() => 0)
            return (
              <FactorResult
                key={fid}
                factorId={fid}
                result={result}
                idx={idx}
                years={years}
                factorVals={factorVals}
              />
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
