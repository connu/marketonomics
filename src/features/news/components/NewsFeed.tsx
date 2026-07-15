'use client'

import React, { useEffect, useState } from 'react'
import { Box, Typography, Stack, Skeleton, Link as MuiLink } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Panel } from '../../../components/layout/Panel'
import { useDesignMode } from '../../../app/ThemeRegistry'
import { fetchNews, type NewsItem } from '../../../services/newsData'

function relativeTime(iso: string): string {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

export function NewsFeed({ symbol }: { symbol: string }) {
  const { tokens } = useDesignMode()
  // `loading` is derived (fetched key lags the requested symbol) so the effect
  // never calls setState synchronously.
  const [result, setResult] = useState<{ key: string; items: NewsItem[] }>({ key: '', items: [] })

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    fetchNews(symbol)
      .then(news => { if (!cancelled) setResult({ key: symbol, items: news }) })
      .catch(() => { if (!cancelled) setResult({ key: symbol, items: [] }) })
    return () => { cancelled = true }
  }, [symbol])

  if (!symbol) return null

  const loading = result.key !== symbol
  const items = loading ? [] : result.items

  return (
    <Panel sx={{ p: 2.5 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 1.75 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Latest Headlines</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>{symbol}</Typography>
        <Typography sx={{ fontSize: 10, color: 'text.disabled', ml: 'auto' }}>Yahoo Finance RSS · 15 min cache</Typography>
      </Stack>

      {loading ? (
        <Stack sx={{ gap: 1 }}>
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: '8px' }} />)}
        </Stack>
      ) : items.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 1.5 }}>
          No recent headlines for this symbol.
        </Typography>
      ) : (
        <Box>
          {items.map((item, i) => (
            <Box
              key={`${item.link}-${i}`}
              sx={{
                py: 1.1, px: 1.25, borderRadius: '8px', mb: 0.25,
                '&:hover': { bgcolor: tokens.insetHover },
              }}
            >
              <MuiLink
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ fontSize: 12.5, fontWeight: 600, color: tokens.textBody, display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}
              >
                {item.title}
                <OpenInNewIcon sx={{ fontSize: 11, opacity: 0.5, flexShrink: 0, alignSelf: 'center' }} />
              </MuiLink>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline' }}>
                {item.pubDate && (
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }}>{relativeTime(item.pubDate)}</Typography>
                )}
                {item.summary && (
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.summary}
                  </Typography>
                )}
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Panel>
  )
}
