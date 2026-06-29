'use client'

import React, { useState } from 'react'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import BarChartIcon from '@mui/icons-material/BarChart'
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot'
import SearchIcon from '@mui/icons-material/Search'
import PublicIcon from '@mui/icons-material/Public'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DRAWER_WIDTH = 220

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Portfolio', href: '/portfolio', icon: <AccountBalanceWalletIcon /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChartIcon /> },
  { label: 'Simulation', href: '/simulation', icon: <ScatterPlotIcon /> },
  { label: 'Fundamentals', href: '/fundamentals', icon: <SearchIcon /> },
  { label: 'Economics', href: '/economics', icon: <PublicIcon /> },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const drawer = (
    <Box>
      <Toolbar>
        <Typography
          variant="h6"
          color="primary"
          sx={{ fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}
        >
          QuantLab
        </Typography>
      </Toolbar>
      <Divider />
      <List dense>
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active = pathname === href
          return (
            <ListItem key={href} disablePadding>
              <ListItemButton
                component={Link}
                href={href}
                selected={active}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.dark',
                    '& .MuiListItemIcon-root': { color: 'primary.light' },
                    '& .MuiListItemText-primary': { color: 'primary.light', fontWeight: 600 },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: theme.zIndex.drawer + 1, display: { md: 'none' } }}
        elevation={0}
        variant="outlined"
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
            QuantLab
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: { xs: 8, md: 0 },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        {!isMobile && <Toolbar />}
        {children}
      </Box>
    </Box>
  )
}
