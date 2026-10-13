'use client'

import { useEffect, useState } from 'react'

interface GoogleAdProps {
  slot: 'header' | 'sidebar' | 'footer' | 'inline' | 'rewarded'
  className?: string
}

export default function GoogleAd({ slot, className = '' }: GoogleAdProps) {
  const [adCode, setAdCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAdCode = async () => {
      try {
        const res = await fetch('/api/settings/ads')
        const settings = await res.json()
        
        const slotKey = `ads_${slot}`
        if (settings[slotKey]) {
          setAdCode(settings[slotKey])
        }
      } catch (error) {
        console.error('Failed to fetch ad settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAdCode()
  }, [slot])

  useEffect(() => {
    // Try to refresh ads when code changes
    if (adCode && typeof window !== 'undefined' && (window as any).adsbygoogle) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      } catch (e) {
        // Ads might already be loaded
      }
    }
  }, [adCode])

  if (isLoading || !adCode) {
    return null
  }

  return (
    <div 
      className={`google-ad ${className}`}
      dangerouslySetInnerHTML={{ __html: adCode }}
    />
  )
}
