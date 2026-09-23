'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, useEffect, useState } from 'react'

export default function SessionProviderWrapper({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="min-h-screen bg-transparent" />
  }

  return <SessionProvider>{children}</SessionProvider>
}
