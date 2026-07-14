'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { NextAppDirEmotionCacheProvider } from './registry'
import {
  DESIGN_MODE_ATTR,
  DESIGN_MODE_STORAGE_KEY,
  DESIGN_TOKENS,
  type DesignMode,
  type DesignTokens,
} from '../theme/tokens'

const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 700, letterSpacing: '-0.5px' },
  h5: { fontWeight: 700, letterSpacing: '-0.4px' },
  h6: { fontWeight: 700, letterSpacing: '-0.3px' },
}

const shape = { borderRadius: 12 }

// QuantView light theme — slate/blue palette from the design system.
const classicTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      dark: '#1d4ed8',
      light: '#93c5fd',
    },
    secondary: {
      main: '#0891b2',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0',
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
  },
  typography,
  shape,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#e2e8f0' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#f1f5f9' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: 3 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#94a3b8',
        },
      },
    },
  },
})

// QuantView dark theme — TradingView charting-platform palette.
const tradingViewTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2962ff',
      dark: '#1e4bd8',
      light: '#5b9cf6',
    },
    secondary: {
      main: '#26a69a',
    },
    background: {
      default: '#131722',
      paper: '#1e222d',
    },
    text: {
      primary: '#d1d4dc',
      secondary: '#787b86',
      disabled: '#565b66',
    },
    divider: '#2a2e39',
    success: { main: '#26a69a' },
    warning: { main: '#ff9800' },
    error: { main: '#ef5350' },
  },
  typography,
  shape,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#2a2e39' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#131722' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-thumb': { background: '#363a45', borderRadius: 3 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#787b86',
        },
      },
    },
  },
})

const THEMES: Record<DesignMode, typeof classicTheme> = {
  classic: classicTheme,
  tradingview: tradingViewTheme,
}

interface DesignModeContextValue {
  mode: DesignMode
  setMode: (mode: DesignMode) => void
  tokens: DesignTokens
}

const DesignModeContext = createContext<DesignModeContextValue>({
  mode: 'classic',
  setMode: () => {},
  tokens: DESIGN_TOKENS.classic,
})

/** Active design mode + setter + the mode's design tokens. */
export function useDesignMode(): DesignModeContextValue {
  return useContext(DesignModeContext)
}

// ---------------------------------------------------------------------------
// Design-mode store, consumed via useSyncExternalStore so SSR/hydration always
// renders the deterministic 'classic' snapshot, and the persisted mode is
// applied in a safe post-hydration re-render (no hydration mismatch).
// ---------------------------------------------------------------------------

let currentMode: DesignMode | null = null
const listeners = new Set<() => void>()

function readStoredMode(): DesignMode {
  try {
    const stored = window.localStorage.getItem(DESIGN_MODE_STORAGE_KEY)
    return stored === 'tradingview' || stored === 'classic' ? stored : 'classic'
  } catch {
    return 'classic' // localStorage unavailable — stay on the default mode
  }
}

function getModeSnapshot(): DesignMode {
  if (currentMode === null) currentMode = readStoredMode()
  return currentMode
}

function getModeServerSnapshot(): DesignMode {
  return 'classic'
}

function subscribeToMode(listener: () => void): () => void {
  listeners.add(listener)
  // Follow changes made from other tabs too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === DESIGN_MODE_STORAGE_KEY) {
      currentMode = readStoredMode()
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function setStoredMode(next: DesignMode) {
  currentMode = next
  try {
    window.localStorage.setItem(DESIGN_MODE_STORAGE_KEY, next)
  } catch {
    // persistence is best-effort
  }
  listeners.forEach(l => l())
}

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribeToMode, getModeSnapshot, getModeServerSnapshot)

  // Keep the <html data-design-mode> attribute in sync for globals.css.
  // (A pre-hydration inline script in layout.tsx sets it before first paint.)
  useEffect(() => {
    document.documentElement.setAttribute(DESIGN_MODE_ATTR, mode)
  }, [mode])

  const setMode = useCallback((next: DesignMode) => {
    setStoredMode(next)
  }, [])

  const contextValue = useMemo(
    () => ({ mode, setMode, tokens: DESIGN_TOKENS[mode] }),
    [mode, setMode]
  )

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <DesignModeContext.Provider value={contextValue}>
        <ThemeProvider theme={THEMES[mode]}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </DesignModeContext.Provider>
    </NextAppDirEmotionCacheProvider>
  )
}
