'use client'

import React from 'react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Box,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { Holding } from '../types/holding'
import { formatCurrency, formatPercent } from '../../../utils/format'

interface HoldingRow extends Holding {
  marketValue: number
  gainLossDollar: number
  gainLossPercent: number
  weight: number
}

function computeRows(holdings: Holding[]): HoldingRow[] {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.currentPrice * h.shares,
    0
  )
  return holdings.map((h) => {
    const marketValue = h.currentPrice * h.shares
    const costBasis = h.purchasePrice * h.shares
    const gainLossDollar = marketValue - costBasis
    const gainLossPercent = costBasis > 0 ? (gainLossDollar / costBasis) * 100 : 0
    const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0
    return { ...h, marketValue, gainLossDollar, gainLossPercent, weight }
  })
}

type SortKey = 'ticker' | 'company' | 'marketValue' | 'gainLossPercent' | 'weight'

interface HoldingTableProps {
  holdings: Holding[]
  onEdit: (holding: Holding) => void
  onDelete: (id: string) => void
}

export function HoldingTable({ holdings, onEdit, onDelete }: HoldingTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('marketValue')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')

  const rows = React.useMemo(() => {
    const computed = computeRows(holdings)
    return [...computed].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [holdings, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (holdings.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No holdings yet. Add your first position to get started.
        </Typography>
      </Box>
    )
  }

  const col = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <TableCell align={align}>
      <TableSortLabel
        active={sortKey === key}
        direction={sortKey === key ? sortDir : 'desc'}
        onClick={() => handleSort(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {col('ticker', 'Ticker', 'left')}
            {col('company', 'Company', 'left')}
            <TableCell align="right">Shares</TableCell>
            <TableCell align="right">Avg Cost</TableCell>
            <TableCell align="right">Price</TableCell>
            {col('marketValue', 'Mkt Value')}
            {col('gainLossPercent', 'Gain/Loss')}
            <TableCell align="right">Sector</TableCell>
            {col('weight', 'Weight')}
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {row.ticker}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{row.company}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{row.shares.toLocaleString()}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatCurrency(row.purchasePrice)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatCurrency(row.currentPrice)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(row.marketValue)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  color={row.gainLossDollar >= 0 ? 'success.main' : 'error.main'}
                  sx={{ fontWeight: 500 }}
                >
                  {formatCurrency(row.gainLossDollar)}
                  <br />
                  <Typography
                    component="span"
                    variant="caption"
                    color={row.gainLossDollar >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatPercent(row.gainLossPercent)}
                  </Typography>
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip label={row.sector} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{row.weight.toFixed(1)}%</Typography>
              </TableCell>
              <TableCell align="center">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(row.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
