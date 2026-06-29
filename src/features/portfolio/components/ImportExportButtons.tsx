'use client'

import React from 'react'
import { Button } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'

interface ImportExportButtonsProps {
  onExport: () => void
}

export function ImportExportButtons({ onExport }: ImportExportButtonsProps) {
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<DownloadIcon />}
      onClick={onExport}
    >
      Export JSON
    </Button>
  )
}
