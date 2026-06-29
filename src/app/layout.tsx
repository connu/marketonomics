import React from 'react'
import { ThemeRegistry } from './ThemeRegistry'
import { AppShell } from '../components/layout/AppShell'
import type { Metadata } from 'next'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

export const metadata: Metadata = {
  title: 'QuantLab',
  description: 'Quantitative Portfolio Research Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  )
}
