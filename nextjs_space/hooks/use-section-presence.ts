'use client'

import { useState, useEffect, useCallback } from 'react'

interface SectionCounts {
  games: number
  fortunes: number
  social: number
  chat: number
  gifts: number
}

const DEFAULT_COUNTS: SectionCounts = {
  games: 0,
  fortunes: 0,
  social: 0,
  chat: 0,
  gifts: 0,
}

export function useSectionPresence(pollInterval = 30000) {
  const [counts, setCounts] = useState<SectionCounts>(DEFAULT_COUNTS)
  const [total, setTotal] = useState(0)

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/presence/sections')
      if (res.ok) {
        const data = await res.json()
        setCounts(data.counts || DEFAULT_COUNTS)
        setTotal(data.total || 0)
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, pollInterval)
    return () => clearInterval(interval)
  }, [fetchCounts, pollInterval])

  return { counts, total }
}
