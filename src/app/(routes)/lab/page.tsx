'use client'

import React, { useRef } from 'react'
import { Box, Typography, Alert, Skeleton, IconButton, Tooltip, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import dynamic from 'next/dynamic'
import ScienceIcon from '@mui/icons-material/Science'
import DownloadIcon from '@mui/icons-material/Download'
import ImageIcon from '@mui/icons-material/Image'
import { Panel } from '../../../components/layout/Panel'
import { RuleBuilder } from '../../../features/backtest/components/RuleBuilder'
import { BacktestStatTiles } from '../../../features/backtest/components/BacktestStatTiles'
import { useBacktest } from '../../../features/backtest/hooks/useBacktest'
import { downloadCsv } from '../../../utils/exportCsv'
import { exportChartPng } from '../../../utils/exportChart'

const EquityCurveChart = dynamic(
  () => import('../../../features/backtest/components/EquityCurveChart').then(m => m.EquityCurveChart),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={350} sx={{ borderRadius: '10px' }} /> }
)
const MonteCarloPanel = dynamic(
  () => import('../../../features/backtest/components/MonteCarloPanel').then(m => m.MonteCarloPanel),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={240} sx={{ borderRadius: '10px' }} /> }
)
const TradesTable = dynamic(
  () => import('../../../features/backtest/components/TradesTable').then(m => m.TradesTable),
  { ssr: false }
)

export default function LabPage() {
  const theme = useTheme()
  const { result, ranConfig, monteCarlo, running, error, run } = useBacktest()
  const chartRef = useRef<HTMLDivElement>(null)

  const exportEquityCsv = () => {
    if (!result || !ranConfig) return
    downloadCsv(
      `${ranConfig.symbol}-backtest.csv`,
      ['date', 'strategy_equity', 'buy_and_hold', 'in_market'],
      result.dates.map((d, i) => [d, result.equity[i].toFixed(4), result.benchmark[i].toFixed(4), result.position[i] ? 1 : 0])
    )
  }

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontSize: 20 }}>Strategy Lab</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.4 }}>
          Backtest simple rules against real price history · optional live-macro filters · signals apply to the next bar (no lookahead)
        </Typography>
      </Box>

      {/* Rule builder */}
      <Panel sx={{ p: 2, mb: 2 }}>
        <RuleBuilder running={running} onRun={run} />
      </Panel>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && ranConfig ? (
        <>
          <Box sx={{ mb: 2 }}>
            <BacktestStatTiles stats={result.stats} />
          </Box>
          <Panel sx={{ p: 2.5, mb: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 0.75, mb: -3.5, position: 'relative', zIndex: 1 }}>
              <Tooltip title="Download equity curve (CSV)">
                <IconButton size="small" onClick={exportEquityCsv} aria-label="Download equity curve as CSV" sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <DownloadIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export chart (PNG)">
                <IconButton
                  size="small"
                  onClick={() => void exportChartPng(chartRef.current, `${ranConfig.symbol}-backtest.png`, theme.palette.background.paper)}
                  aria-label="Export equity curve as PNG"
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <ImageIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box ref={chartRef}>
              <EquityCurveChart result={result} symbol={ranConfig.symbol} />
            </Box>
          </Panel>
          {monteCarlo && (
            <Panel sx={{ p: 2.5, mb: 2 }}>
              <MonteCarloPanel mc={monteCarlo} />
            </Panel>
          )}
          {result.trades.length > 0 && ranConfig.rule.type !== 'buyAndHold' && (
            <Panel sx={{ p: 2.5, mb: 2 }}>
              <TradesTable trades={result.trades} />
            </Panel>
          )}
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 2 }}>
            Educational tool — past performance and simulated projections do not predict future results.
            Fills at bar close, no transaction costs, dividends not reinvested.
          </Typography>
        </>
      ) : !running && !error && (
        <Panel sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <ScienceIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2">Pick a ticker and a strategy, then run a backtest</Typography>
            <Typography variant="caption">e.g. SPY · 10 years · weekly · SMA 10/40 crossover</Typography>
          </Box>
        </Panel>
      )}
    </Box>
  )
}
