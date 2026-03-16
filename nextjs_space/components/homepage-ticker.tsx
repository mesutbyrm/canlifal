'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/lib/language-context'

interface CustomMessage {
  id: string
  text: string
  icon: string
}

interface TickerData {
  customMessages: CustomMessage[]
}

export default function HomepageTicker() {
  const { language } = useLanguage()
  const [data, setData] = useState<TickerData>({
    customMessages: [],
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRotating, setIsRotating] = useState(false)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/homepage-ticker')
        if (res.ok) {
          const json = await res.json()
          setData({
            customMessages: json.customMessages || [],
          })
        }
      } catch (e) {
        console.error('Ticker fetch error:', e)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const messages = data.customMessages

  // Rotation logic: show for 2 seconds, then rotate
  const rotate = useCallback(() => {
    if (messages.length <= 1) return
    setIsRotating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
      setIsRotating(false)
    }, 600)
  }, [messages.length])

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(rotate, 2600)
    return () => clearInterval(timer)
  }, [rotate, messages.length])

  // Don't render if no admin messages
  if (messages.length === 0) return null

  const safeIndex = currentIndex % Math.max(messages.length, 1)
  const currentMsg = messages[safeIndex]
  const nextIndex = (safeIndex + 1) % messages.length
  const nextMsg = messages[nextIndex]

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-[#1a0a2e] via-fuchsia-900/30 to-[#1a0a2e] border-b border-fuchsia-400/40 py-2 sm:py-2.5">
      <div className="flex items-center justify-center">
        {/* Announcement icon */}
        <div className="flex-shrink-0 pl-3 sm:pl-4 pr-2">
          <span className="text-xl sm:text-2xl">📢</span>
        </div>
        {/* 3D Cube Rotation Area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div
            className="cube-wrapper"
            style={{
              perspective: '400px',
              height: '36px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className="cube-face"
              style={{
                transformStyle: 'preserve-3d',
                transition: isRotating ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                transform: isRotating ? 'rotateX(-90deg)' : 'rotateX(0deg)',
                position: 'relative',
                height: '36px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Current face (front) */}
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(0deg) translateZ(18px)',
                }}
              >
                <TickerFace message={currentMsg} />
              </div>

              {/* Next face (bottom - comes up on rotation) */}
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(90deg) translateZ(18px)',
                }}
              >
                <TickerFace message={nextMsg} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TickerFace({
  message,
}: {
  message: { icon: string; text: string } | undefined
}) {
  if (!message) return null

  return (
    <div className="inline-flex items-center gap-2 sm:gap-3 whitespace-nowrap">
      <span className="text-lg sm:text-xl">{message.icon}</span>
      <span className="text-fuchsia-200 text-sm sm:text-base font-medium">{message.text}</span>
    </div>
  )
}
