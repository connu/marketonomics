'use client'

import React, { useMemo, useState } from 'react'
import { Box, Typography, Stack, Collapse } from '@mui/material'
import { getFactorMeta } from '../lib/normalize'
import {
  pearsonCorrelation, spearmanCorrelation, crossCorrelation,
  linearRegression, rollingCorrelation, grangerCausality,
  cointegrationTest, monteCarlo, elasticityAnalysis, mutualInformation,
} from '../lib/math'

interface Bar { label: string; val: string; pct: string; color: string }
interface StatCard {
  name: string
  result: string
  resultColor: string
  explanation: string
  bars: Bar[]
}

const POS = '#16a34a'
const NEG = '#dc2626'
const NEU = '#64748b'
const BLUE = '#2563eb'

function firstSentence(text: string): string {
  const i = text.indexOf('. ')
  return i === -1 ? text : text.slice(0, i + 1)
}

// Build the "rolling window breakdown" mini-bars from a real rolling correlation series.
function rollingBars(x: number[], y: number[], years: number[]): Bar[] {
  const window = Math.min(5, Math.max(3, Math.floor(x.length / 2)))
  const roll = rollingCorrelation(x, y, years, window)
  const valid = roll.correlations
    .map((r, i) => ({ r, year: roll.years[i] }))
    .filter(d => !isNaN(d.r))
    .slice(-5)
  return valid.map(d => ({
    label: `'${String(d.year).slice(2)}`,
    val: d.r.toFixed(2),
    pct: `${Math.min(Math.max(Math.abs(d.r) * 80 + 12, 6), 96)}%`,
    color: d.r > 0 ? BLUE : NEG,
  }))
}

function computeCards(x: number[], y: number[], years: number[], factorLabel: string, symbol: string): StatCard[] {
  const bars = rollingBars(x, y, years)
  const pear = pearsonCorrelation(x, y)
  const spear = spearmanCorrelation(x, y)
  const xcorr = crossCorrelation(x, y, Math.min(5, Math.floor(x.length / 3)))
  const reg = linearRegression(x, y)
  const roll = rollingCorrelation(x, y, years, Math.min(5, Math.floor(x.length / 2)))
  const rollRecent = roll.correlations.filter(v => !isNaN(v)).slice(-1)[0] ?? 0
  const gr = grangerCausality(x, y, Math.min(2, Math.floor(x.length / 5)))
  const coint = cointegrationTest(x, y)
  const mc = monteCarlo(y, 500, Math.min(10, Math.max(3, Math.floor(x.length / 2))))
  const elas = elasticityAnalysis(x, y, years)
  const mi = mutualInformation(x, y, Math.min(5, Math.floor(Math.sqrt(x.length))))

  const sign = (v: number) => (v > 0.3 ? POS : v < -0.3 ? NEG : NEU)

  return [
    { name: 'Pearson Correlation', result: pear.r.toFixed(3), resultColor: sign(pear.r), explanation: firstSentence(pear.interpretation), bars },
    { name: 'Spearman Correlation', result: spear.rho.toFixed(3), resultColor: sign(spear.rho), explanation: firstSentence(spear.interpretation), bars },
    { name: 'Cross Correlation', result: `${xcorr.peakCorrelation.toFixed(3)} @ ${xcorr.peakLag >= 0 ? '+' : ''}${xcorr.peakLag}y`, resultColor: Math.abs(xcorr.peakCorrelation) > 0.3 ? BLUE : NEU, explanation: firstSentence(xcorr.interpretation), bars },
    { name: 'Linear Regression', result: `R² = ${reg.r2.toFixed(3)}`, resultColor: reg.r2 > 0.25 ? POS : NEU, explanation: `OLS explains ${(reg.r2 * 100).toFixed(1)}% of variance in ${symbol}. Slope ${reg.slope.toFixed(4)} per unit of ${factorLabel}.`, bars },
    { name: 'Rolling Correlation', result: `${rollRecent.toFixed(3)} (${roll.window}y)`, resultColor: Math.abs(rollRecent) > 0.3 ? BLUE : NEU, explanation: firstSentence(roll.interpretation), bars },
    { name: 'Granger Causality', result: `p = ${gr.pValue.toFixed(4)}`, resultColor: gr.pValue < 0.05 ? POS : NEU, explanation: firstSentence(gr.interpretation), bars },
    { name: 'Cointegration', result: coint.cointegrated ? 'Cointegrated' : 'Not Cointegrated', resultColor: coint.cointegrated ? POS : NEU, explanation: firstSentence(coint.interpretation), bars },
    { name: 'Monte Carlo', result: `σ = ${mc.volatility.toFixed(1)}%`, resultColor: NEU, explanation: firstSentence(mc.interpretation), bars },
    { name: 'Elasticity', result: `${elas.meanElasticity.toFixed(3)}`, resultColor: NEU, explanation: firstSentence(elas.interpretation), bars },
    { name: 'Mutual Information', result: `${mi.normalizedMI.toFixed(3)} NMI`, resultColor: mi.normalizedMI > 0.3 ? BLUE : NEU, explanation: firstSentence(mi.interpretation), bars },
  ]
}

function CardView({ card }: { card: StatCard }) {
  const [open, setOpen] = useState(false)
  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: '12px', p: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.09)', transform: 'translateY(-1px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {card.name}
        </Typography>
        <Box
          component="button"
          onClick={() => setOpen(o => !o)}
          sx={{ fontSize: 10, color: 'primary.main', background: 'none', border: 'none', cursor: 'pointer', p: 0, fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          {open ? 'Collapse ↙' : 'Expand ↗'}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: card.resultColor, letterSpacing: '-0.5px', mb: 0.6, lineHeight: 1.1 }}>
        {card.result}
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.55 }}>
        {card.explanation}
      </Typography>
      <Collapse in={open}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: '#f1f5f9' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
            Rolling Window Breakdown
          </Typography>
          {card.bars.length === 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Not enough data points.</Typography>
          )}
          {card.bars.map((b, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', width: 24, flexShrink: 0 }}>{b.label}</Typography>
              <Box sx={{ flex: 1, bgcolor: '#f1f5f9', borderRadius: '3px', height: 5, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: b.pct, bgcolor: b.color, borderRadius: '3px' }} />
              </Box>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#374151', width: 38, textAlign: 'right' }}>{b.val}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

interface StatCardGridProps {
  stockPrices: number[]
  factorValues: number[]
  years: number[]
  factorId: string
  symbol: string
  rangeLabel: string
}

export function StatCardGrid({ stockPrices, factorValues, years, factorId, symbol, rangeLabel }: StatCardGridProps) {
  const meta = getFactorMeta(factorId)
  const factorLabel = meta?.label ?? factorId
  const cards = useMemo(() => {
    const x = factorValues.filter(v => !isNaN(v) && isFinite(v))
    if (x.length < 4 || stockPrices.length < 4) return []
    return computeCards(factorValues, stockPrices, years, factorLabel, symbol)
  }, [factorValues, stockPrices, years, factorLabel, symbol])

  if (!cards.length) return null

  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 1.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Statistical Analysis</Typography>
        <Box sx={{ fontSize: 11, color: 'primary.main', px: 1, py: '2px', bgcolor: '#eff6ff', borderRadius: '5px', fontWeight: 500 }}>
          {symbol} vs {factorLabel}
        </Box>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', ml: 'auto' }}>{rangeLabel} · annual data</Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1.25 }}>
        {cards.map(c => <CardView key={c.name} card={c} />)}
      </Box>
    </Box>
  )
}
