'use client'

import { useState, useEffect } from 'react'

const DEFAULT_ORDER = ['games', 'gifts', 'teller', 'social', 'chat', 'bana-ozel']

export function useButtonOrder() {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch('/api/admin/button-order')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.order) && data.order.length > 0) {
            // Append any new default buttons not in saved order
            const merged = [...data.order]
            for (const key of DEFAULT_ORDER) {
              if (!merged.includes(key)) merged.push(key)
            }
            setOrder(merged)
          }
        }
      } catch {
        // Use default
      }
    }
    fetchOrder()
  }, [])

  return order
}
