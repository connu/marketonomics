'use client'

import React, { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { usePortfolio } from '../../../features/portfolio/hooks/usePortfolio'
import { HoldingTable } from '../../../features/portfolio/components/HoldingTable'
import { HoldingForm } from '../../../features/portfolio/components/HoldingForm'
import { ImportExportButtons } from '../../../features/portfolio/components/ImportExportButtons'
import { Holding } from '../../../features/portfolio/types/holding'

export default function PortfolioPage() {
  const { holdings, addHolding, updateHolding, deleteHolding, exportHoldings } =
    usePortfolio()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Holding | null>(null)

  function handleEdit(holding: Holding) {
    setEditTarget(holding)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditTarget(null)
  }

  function handleFormSubmit(data: Omit<Holding, 'id'>) {
    if (editTarget) {
      updateHolding(editTarget.id, data)
    } else {
      addHolding(data)
    }
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
      >
        <Typography variant="h4">Portfolio</Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <ImportExportButtons onExport={exportHoldings} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
          >
            Add Holding
          </Button>
        </Stack>
      </Stack>

      <HoldingTable holdings={holdings} onEdit={handleEdit} onDelete={deleteHolding} />

      <HoldingForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editTarget}
      />
    </Box>
  )
}
