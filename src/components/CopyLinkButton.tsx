'use client'

import React, { useState } from 'react'
import { IconButton, Snackbar, Tooltip } from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'

/** Copies the current URL (which encodes the page's analysis state) to the clipboard. */
export function CopyLinkButton({ title = 'Copy shareable link' }: { title?: string }) {
  const [open, setOpen] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setOpen(true)
    } catch {
      // Clipboard unavailable (permissions/insecure context) — silently skip
    }
  }

  return (
    <>
      <Tooltip title={title}>
        <IconButton size="small" onClick={copy} aria-label={title} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <LinkIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
      <Snackbar
        open={open}
        autoHideDuration={2000}
        onClose={() => setOpen(false)}
        message="Link copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
