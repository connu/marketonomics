'use client'

import React from 'react'
import { Box } from '@mui/material'
import { useDesignMode } from '../../app/ThemeRegistry'

/** Rounded bordered surface used across pages (same look as the per-page Panel helpers). */
export function Panel({ children, sx }: { children: React.ReactNode; sx?: object }) {
  const { tokens } = useDesignMode()
  return (
    <Box
      sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        borderRadius: '14px', boxShadow: tokens.panelShadow, ...sx,
      }}
    >
      {children}
    </Box>
  )
}
