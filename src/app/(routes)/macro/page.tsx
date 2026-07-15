'use client'

import React, { useMemo, useState } from 'react'
import { Box, Typography, Stack, Skeleton, Chip } from '@mui/material'
import dynamic from 'next/dynamic'
import { Panel } from '../../../components/layout/Panel'
import { useIndicators } from '../../../features/economics/hooks/useIndicators'
import { INDICATORS, type Indicator } from '../../../features/economics/types/indicator'
import { CategorySection } from '../../../features/economics/components/CategorySection'
import {
  MACRO_SERIES, MACRO_CATEGORY_ORDER, MACRO_CATEGORY_LABELS, getMacroDef,
} from '../../../features/macro/catalog'
import { WatchlistPanel } from '../../../features/watchlist/components/WatchlistPanel'

const MacroSeriesChart = dynamic(
  () => import('../../../features/macro/components/MacroSeriesChart').then(m => m.MacroSeriesChart),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={340} sx={{ borderRadius: '10px' }} /> }
)
const IndicatorChart = dynamic(
  () => import('../../../features/economics/components/IndicatorChart').then(m => m.IndicatorChart),
  { ssr: false, loading: () => <Skeleton variant="rounded" height={380} sx={{ borderRadius: '10px' }} /> }
)

const MARKET_CATEGORIES: Indicator['category'][] = ['equity', 'volatility', 'rates', 'commodities', 'currency', 'crypto']

export default function MacroPage() {
  const { quotes, loading, lastUpdated } = useIndicators()
  const [selectedSymbol, setSelectedSymbol] = useState<string>('^GSPC')
  const [selectedMacro, setSelectedMacro] = useState<string>('CPIAUCSL')

  const selectedIndicator = useMemo(
    () => INDICATORS.find(i => i.symbol === selectedSymbol) ?? INDICATORS[0],
    [selectedSymbol]
  )
  const selectedMacroDef = getMacroDef(selectedMacro) ?? MACRO_SERIES[0]

  return (
    <Box>
      {/* Page header */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: 20 }}>Live Macro</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.4 }}>
            Monthly US macro data from FRED · live market quotes, auto-refreshed every 60s
          </Typography>
        </Box>
        {lastUpdated && (
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            Quotes updated {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, gap: 2.5, alignItems: 'start' }}>
        {/* Main column */}
        <Box sx={{ minWidth: 0 }}>
          {/* FRED macro explorer */}
          <Panel sx={{ p: 2.5, mb: 2.5 }}>
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mb: 2.25 }}>
              {MACRO_CATEGORY_ORDER.map(cat => (
                <React.Fragment key={cat}>
                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'center', ml: cat === MACRO_CATEGORY_ORDER[0] ? 0 : 1 }}>
                    {MACRO_CATEGORY_LABELS[cat]}
                  </Typography>
                  {MACRO_SERIES.filter(s => s.category === cat).map(s => (
                    <Chip
                      key={s.id}
                      label={s.label}
                      size="small"
                      onClick={() => setSelectedMacro(s.id)}
                      color={selectedMacro === s.id ? 'primary' : 'default'}
                      variant={selectedMacro === s.id ? 'filled' : 'outlined'}
                      sx={{ fontSize: 11 }}
                    />
                  ))}
                </React.Fragment>
              ))}
            </Stack>
            <MacroSeriesChart def={selectedMacroDef} />
          </Panel>

          {/* Live markets */}
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>Live Markets</Typography>
            <Box sx={{ mb: 2.5 }}>
              <IndicatorChart indicator={selectedIndicator} quote={quotes[selectedIndicator.symbol]} />
            </Box>
            {MARKET_CATEGORIES.map(cat => {
              const inds = INDICATORS.filter(i => i.category === cat)
              if (!inds.length) return null
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  indicators={inds}
                  quotes={quotes}
                  loading={loading}
                  selected={selectedSymbol}
                  onSelect={setSelectedSymbol}
                />
              )
            })}
          </Panel>
        </Box>

        {/* Watchlist rail */}
        <WatchlistPanel />
      </Box>
    </Box>
  )
}
