'use client'

import { useState, useEffect } from 'react'

const DEFAULT_ORDER = ['games', 'gifts', 'teller', 'social', 'chat']

export function useButtonOrder() {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch('/api/admin/button-order')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.order) && data.order.length > 0) {
            setOrder(data.order)
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
