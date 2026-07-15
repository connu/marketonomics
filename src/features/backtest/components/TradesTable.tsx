'use client'

import React from 'react'
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { useDesignMode } from '../../../app/ThemeRegistry'
import type { Trade } from '../types'

const MAX_ROWS = 25

export function TradesTable({ trades }: { trades: Trade[] }) {
  const { tokens } = useDesignMode()
  if (!trades.length) return null
  const shown = trades.slice(-MAX_ROWS)
  return (
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>
        Trades{trades.length > MAX_ROWS ? ` · last ${MAX_ROWS} of ${trades.length}` : ` · ${trades.length}`}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& td, & th': { fontSize: 11, py: 0.6, borderColor: 'divider' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.disabled' }}>#</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.disabled' }}>Entry</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.disabled' }}>Exit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: 'text.disabled' }}>Return</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((t, i) => (
              <TableRow key={`${t.entryDate}-${i}`}>
                <TableCell sx={{ color: 'text.disabled' }}>{trades.length - shown.length + i + 1}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{t.entryDate}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{t.exitDate}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace', color: t.returnPct >= 0 ? tokens.pos : tokens.neg }}>
                  {t.returnPct >= 0 ? '+' : ''}{(t.returnPct * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
