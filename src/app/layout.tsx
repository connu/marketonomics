import React from 'react'
import { ThemeRegistry } from './ThemeRegistry'
import { AppShell } from '../components/layout/AppShell'
import type { Metadata } from 'next'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './globals.css'

// Runs before first paint: applies the persisted design mode as a data attribute
// on <html> so globals.css can paint the correct background immediately, without
// any hydration mismatch (the attribute is covered by suppressHydrationWarning).
const designModeInitScript = `try{var m=localStorage.getItem('qv-design-mode');document.documentElement.setAttribute('data-design-mode',m==='tradingview'?'tradingview':'classic')}catch(e){}`

export const metadata: Metadata = {
  title: 'QuantView Terminal',
  description: 'Macro factor relationship explorer & comparative analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: designModeInitScript }} />
      </head>
      <body>
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  )
}
