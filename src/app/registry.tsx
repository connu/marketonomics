'use client'

import React, { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import createCache, { Options as CacheOptions } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'

interface RegistryProps {
  options: Omit<CacheOptions, 'insertionPoint'>
  children: React.ReactNode
}

export function NextAppDirEmotionCacheProvider({ options, children }: RegistryProps) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache(options)
    cache.compat = true
    const prevInsert = cache.insert.bind(cache)
    let inserted: string[] = []
    cache.insert = (...args) => {
      const serialized = args[1]
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name)
      }
      return prevInsert(...args)
    }
    return {
      cache,
      flush() {
        const prevInserted = inserted
        inserted = []
        return prevInserted
      },
    }
  })

  useServerInsertedHTML(() => {
    const names = flush()
    if (names.length === 0) return null
    let styles = ''
    for (const name of names) {
      styles += cache.inserted[name]
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return <CacheProvider value={cache}>{children}</CacheProvider>
}
