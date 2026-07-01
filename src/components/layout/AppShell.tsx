'use client'

import React from 'react'
import { Box } from '@mui/material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Relationship Explorer', href: '/economics' },
  { label: 'Comparative Analysis', href: '/analytics' },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()

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
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 28, height: 28, bgcolor: '#0f172a', borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <polyline points="1,11 4,7 7,9 10,4 14,6" stroke="white" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
          <Box component="span" sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px' }}>
            QuantView
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: 10, fontWeight: 600, color: 'text.disabled', px: 0.75, py: '1px',
              bgcolor: '#f1f5f9', borderRadius: '4px', letterSpacing: '0.4px', textTransform: 'uppercase',
              display: { xs: 'none', sm: 'inline' },
            }}
          >
            Terminal
          </Box>
        </Box>

        {/* Page tabs */}
        <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', borderRadius: '10px', p: '3px', gap: '2px' }}>
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
                  color: active ? '#0f172a' : '#64748b',
                  bgcolor: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Box>
            )
          })}
        </Box>

        {/* Live status */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 0 2px #bbf7d0' }} />
          <Box component="span" sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 500 }}>
            Live · 2004–2024
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
