'use client'

import React from 'react'
import { Box } from '@mui/material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDesignMode } from '../../app/ThemeRegistry'
import type { DesignMode } from '../../theme/tokens'

const NAV_ITEMS = [
  { label: 'Relationship Explorer', href: '/economics' },
  { label: 'Comparative Analysis', href: '/analytics' },
  { label: 'Live Macro', href: '/macro' },
  { label: 'Strategy Lab', href: '/lab' },
]

const MODE_OPTIONS: { value: DesignMode; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'tradingview', label: 'TradingView' },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { mode, setMode, tokens: t } = useDesignMode()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top navigation */}
      <Box
        component="nav"
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: { xs: 2, md: 3.5 },
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: t.navShadow,
        }}
      >
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 28, height: 28, bgcolor: t.brandBg, borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <polyline points="1,11 4,7 7,9 10,4 14,6" stroke="white" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
          <Box component="span" sx={{ fontSize: 14, fontWeight: 700, color: t.textStrong, letterSpacing: '-0.4px' }}>
            QuantView
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: 10, fontWeight: 600, color: 'text.disabled', px: 0.75, py: '1px',
              bgcolor: t.navPillBg, borderRadius: '4px', letterSpacing: '0.4px', textTransform: 'uppercase',
              display: { xs: 'none', sm: 'inline' },
            }}
          >
            Terminal
          </Box>
        </Box>

        {/* Page tabs */}
        <Box sx={{ display: 'flex', bgcolor: t.navPillBg, borderRadius: '10px', p: '3px', gap: '2px', overflowX: 'auto', maxWidth: { xs: '55vw', md: 'none' }, mx: 1 }}>
          {NAV_ITEMS.map(({ label, href }) => {
            const active = pathname.startsWith(href)
            return (
              <Box
                key={href}
                component={Link}
                href={href}
                sx={{
                  px: 1.6, py: 0.6, borderRadius: '7px', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
                  color: active ? t.activeTabText : t.inactiveTabText,
                  bgcolor: active ? t.activeTabBg : 'transparent',
                  boxShadow: active ? t.tabShadow : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Box>
            )
          })}
        </Box>

        {/* Design mode toggle + live status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', bgcolor: t.navPillBg, borderRadius: '8px', p: '2px', gap: '2px' }}>
            {MODE_OPTIONS.map(({ value, label }) => {
              const active = mode === value
              return (
                <Box
                  key={value}
                  component="button"
                  onClick={() => setMode(value)}
                  aria-pressed={active}
                  title={`Switch to the ${label} design`}
                  sx={{
                    border: 'none', fontFamily: 'inherit', px: 1.1, py: 0.55, borderRadius: '6px',
                    fontSize: 10.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    letterSpacing: '0.2px', whiteSpace: 'nowrap',
                    color: active ? t.activeTabText : t.inactiveTabText,
                    bgcolor: active ? t.activeTabBg : 'transparent',
                    boxShadow: active ? t.tabShadow : 'none',
                  }}
                >
                  {label}
                </Box>
              )
            })}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.liveDot, boxShadow: `0 0 0 2px ${t.liveRing}` }} />
            <Box component="span" sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 500 }}>
              Live · 2004–2025
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{ px: { xs: 2, md: 3.5 }, py: 3, maxWidth: 1600, mx: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}
