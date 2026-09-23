'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MarqueeSettings {
  chat_marquee_enabled: string
  chat_marquee_effect: string
  chat_marquee_speed: string
  chat_marquee_repeat: string
}

interface MarqueeItem {
  id: string
  text: string
  color?: string
  icon?: string
  type: 'announcement' | 'join'
}

interface ChatRoomMarqueeProps {
  joinEvents: { id: string; name: string; isVip: boolean; vipType?: string }[]
}

export default function ChatRoomMarquee({ joinEvents }: ChatRoomMarqueeProps) {
  const [settings, setSettings] = useState<MarqueeSettings>({
    chat_marquee_enabled: 'true',
    chat_marquee_effect: 'scroll-left',
    chat_marquee_speed: '10',
    chat_marquee_repeat: '0'
  })
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [items, setItems] = useState<MarqueeItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [passCount, setPassCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  // Fetch settings
  useEffect(() => {
    fetch('/api/public/announcement-settings')
      .then(r => r.json())
      .then(data => {
        if (data.chat_marquee_enabled) setSettings(prev => ({ ...prev, ...data }))
      })
      .catch(() => {})
  }, [])

  // Fetch active announcements
  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAnnouncements(data)
      })
      .catch(() => {})
    
    const interval = setInterval(() => {
      fetch('/api/announcements')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAnnouncements(data)
        })
        .catch(() => {})
    }, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  // Build items list from announcements + join events
  useEffect(() => {
    const newItems: MarqueeItem[] = []
    
    // Add site announcements
    announcements.forEach(a => {
      newItems.push({
        id: `ann-${a.id}`,
        text: a.message,
        color: a.color || 'gold',
        icon: '📢',
        type: 'announcement'
      })
    })
    
    // Add recent join events
    joinEvents.forEach(e => {
      const icon = e.isVip ? '⭐' : '➜'
      newItems.push({
        id: `join-${e.id}`,
        text: `${e.name} odaya giriş yaptı`,
        color: e.isVip ? 'gold' : 'white',
        icon,
        type: 'join'
      })
    })
    
    setItems(newItems)
  }, [announcements, joinEvents])

  // Cycle through items
  useEffect(() => {
    if (items.length <= 1) return
    const speed = Math.max(3, parseInt(settings.chat_marquee_speed) || 10)
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length)
    }, speed * 1000)
    return () => clearTimeout(timer)
  }, [currentIndex, items.length, settings.chat_marquee_speed])

  // Track passes for repeat limit
  useEffect(() => {
    if (currentIndex === 0 && items.length > 0) {
      setPassCount(prev => prev + 1)
    }
  }, [currentIndex, items.length])

  if (settings.chat_marquee_enabled !== 'true') return null
  if (items.length === 0) return null
  
  const repeatLimit = parseInt(settings.chat_marquee_repeat) || 0
  if (repeatLimit > 0 && passCount > repeatLimit) return null

  const effect = settings.chat_marquee_effect || 'scroll-left'
  const speed = Math.max(3, parseInt(settings.chat_marquee_speed) || 10)
  const currentItem = items[currentIndex] || items[0]
  if (!currentItem) return null

  const colorClass = currentItem.color === 'gold' ? 'text-yellow-300' 
    : currentItem.color === 'red' ? 'text-red-300'
    : currentItem.color === 'green' ? 'text-green-300'
    : currentItem.color === 'blue' ? 'text-blue-300'
    : 'text-white/80'

  return (
    <div className="relative z-10 mx-3 mb-1 overflow-hidden" ref={containerRef}>
      <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-purple-500/10 py-1 px-2 overflow-hidden" style={{ height: '24px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id + '-' + currentIndex}
            ref={textRef}
            className={`whitespace-nowrap text-[11px] font-medium ${colorClass} flex items-center gap-1`}
            style={{ willChange: 'transform, opacity' }}
            {...getAnimationProps(effect, speed)}
          >
            <span>{currentItem.icon}</span>
            <span>{currentItem.text}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function getAnimationProps(effect: string, speed: number) {
  switch (effect) {
    case 'scroll-left':
      return {
        initial: { x: '100%', opacity: 1 },
        animate: { x: '-100%', opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
        transition: { duration: speed, ease: 'linear' }
      }
    case 'scroll-right':
      return {
        initial: { x: '-100%', opacity: 1 },
        animate: { x: '100%', opacity: 1 },
        exit: { x: '100%', opacity: 0 },
        transition: { duration: speed, ease: 'linear' }
      }
    case 'bounce':
      return {
        initial: { x: '100%' },
        animate: { x: [' 100%', '-100%', '100%'] },
        exit: { opacity: 0 },
        transition: { duration: speed * 2, ease: 'easeInOut', repeat: 0 }
      }
    case 'fade-scroll':
      return {
        initial: { x: '80%', opacity: 0 },
        animate: { x: '-80%', opacity: [0, 1, 1, 1, 0] },
        exit: { opacity: 0 },
        transition: { duration: speed, ease: 'easeInOut' }
      }
    case 'typewriter':
      return {
        initial: { width: 0, opacity: 1, overflow: 'hidden' as const },
        animate: { width: 'auto', opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: speed * 0.6, ease: 'linear' }
      }
    default:
      return {
        initial: { x: '100%', opacity: 1 },
        animate: { x: '-100%', opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
        transition: { duration: speed, ease: 'linear' }
      }
  }
}
