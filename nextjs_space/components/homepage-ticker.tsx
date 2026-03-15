'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/lib/language-context'
import { Sparkles, Circle } from 'lucide-react'

interface CustomMessage {
  id: string
  text: string
  icon: string
}

interface TickerData {
  onlineCount: number
  customMessages: CustomMessage[]
}

export default function HomepageTicker() {
  const { language } = useLanguage()
  const [data, setData] = useState<TickerData>({
    onlineCount: 0,
    customMessages: [],
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/homepage-ticker')
        if (res.ok) {
          const json = await res.json()
          setData({
            onlineCount: json.onlineCount || 0,
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

  // Default messages if no custom ones
  const defaultMessages: CustomMessage[] = language === 'tr'
    ? [
        { id: 'def1', icon: '🔮', text: 'Falcı platformuna hoş geldiniz!' },
        { id: 'def2', icon: '✨', text: 'Canlı yayınlara katılın' },
        { id: 'def3', icon: '🌟', text: 'Jeton satın alarak hediye gönderin' },
        { id: 'def4', icon: '💫', text: 'Fallarınızı paylaşın' },
      ]
    : [
        { id: 'def1', icon: '🔮', text: 'Welcome to the fortune platform!' },
        { id: 'def2', icon: '✨', text: 'Join live streams' },
        { id: 'def3', icon: '🌟', text: 'Buy jetons to send gifts' },
        { id: 'def4', icon: '💫', text: 'Share your fortunes' },
      ]

  const messages = data.customMessages.length > 0 ? data.customMessages : defaultMessages

  // Rotation logic: show for 2 seconds, then rotate
  const rotate = useCallback(() => {
    if (messages.length <= 1) return
    setIsRotating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
      setIsRotating(false)
    }, 600) // rotation animation duration
  }, [messages.length])

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(rotate, 2600) // 2s display + 0.6s animation
    return () => clearInterval(timer)
  }, [rotate, messages.length])

  const safeIndex = currentIndex % Math.max(messages.length, 1)
  const currentMsg = messages[safeIndex]
  const nextIndex = (safeIndex + 1) % messages.length
  const nextMsg = messages[nextIndex]

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-[#1a0a2e] via-fuchsia-900/30 to-[#1a0a2e] border-b border-fuchsia-400/40 py-1.5">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 px-3 py-0.5 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-[10px] font-bold rounded-r-full flex items-center gap-1 shadow-lg z-10">
          <Sparkles className="w-3 h-3" />
          {language === 'tr' ? 'SOSYAL' : 'SOCIAL'}
        </div>

        {/* 3D Cube Rotation Area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div
            className="cube-wrapper"
            style={{
              perspective: '400px',
              height: '28px',
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
                height: '28px',
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
                  transform: 'rotateX(0deg) translateZ(14px)',
                }}
              >
                <TickerFace
                  message={currentMsg}
                  onlineCount={data.onlineCount}
                  language={language}
                  mounted={mounted}
                />
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
                  transform: 'rotateX(90deg) translateZ(14px)',
                }}
              >
                <TickerFace
                  message={nextMsg}
                  onlineCount={data.onlineCount}
                  language={language}
                  mounted={mounted}
                />
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
  onlineCount,
  language,
  mounted,
}: {
  message: { icon: string; text: string } | undefined
  onlineCount: number
  language: string
  mounted: boolean
}) {
  if (!message) return null

  return (
    <div className="inline-flex items-center gap-2 whitespace-nowrap">
      {/* Online count badge */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-900/40 rounded-full border border-green-500/30">
        <Circle className="w-2 h-2 text-green-400 fill-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-bold">
          {mounted ? onlineCount : 0}
        </span>
        <span className="text-green-300 text-[10px]">
          {language === 'tr' ? 'online' : 'online'}
        </span>
      </div>

      {/* Divider */}
      <span className="text-fuchsia-500/50">│</span>

      {/* Message */}
      <span className="text-lg">{message.icon}</span>
      <span className="text-fuchsia-200 text-sm font-medium">{message.text}</span>
    </div>
  )
}
