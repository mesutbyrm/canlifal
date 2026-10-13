'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { LogIn, LogOut } from 'lucide-react'

interface JoinEvent {
  id: string
  name: string
  image?: string | null
  type: 'join' | 'leave'
  timestamp: number
}

export function useJoinToasts() {
  const [events, setEvents] = useState<JoinEvent[]>([])
  const counterRef = useRef(0)

  const addJoinEvent = useCallback((name: string, image?: string | null) => {
    const id = `join-${++counterRef.current}-${Date.now()}`
    setEvents(prev => [...prev.slice(-4), { id, name, image, type: 'join', timestamp: Date.now() }])
  }, [])

  const addLeaveEvent = useCallback((name: string, image?: string | null) => {
    const id = `leave-${++counterRef.current}-${Date.now()}`
    setEvents(prev => [...prev.slice(-4), { id, name, image, type: 'leave', timestamp: Date.now() }])
  }, [])

  // Auto-remove after 3 seconds
  useEffect(() => {
    if (events.length === 0) return
    const timer = setInterval(() => {
      const now = Date.now()
      setEvents(prev => prev.filter(e => now - e.timestamp < 3000))
    }, 500)
    return () => clearInterval(timer)
  }, [events.length])

  return { events, addJoinEvent, addLeaveEvent }
}

export default function StreamJoinToast({ events }: { events: JoinEvent[] }) {
  return (
    <div className="fixed top-20 left-3 z-[60] flex flex-col gap-1.5 pointer-events-none max-w-[200px]">
      <AnimatePresence mode="popLayout">
        {events.map(event => (
          <motion.div
            key={event.id}
            layout
            initial={{ opacity: 0, x: -60, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-md border ${
              event.type === 'join'
                ? 'bg-green-500/20 border-green-500/30'
                : 'bg-red-500/15 border-red-500/20'
            }`}
          >
            {/* Avatar */}
            <div className={`w-6 h-6 rounded-full flex-shrink-0 overflow-hidden border ${
              event.type === 'join' ? 'border-green-400/50' : 'border-red-400/40'
            }`}>
              {event.image ? (
                <Image src={event.image} alt="" width={24} height={24} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold text-white ${
                  event.type === 'join'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : 'bg-gradient-to-br from-red-500 to-pink-600'
                }`}>
                  {event.name?.[0] || '?'}
                </div>
              )}
            </div>

            {/* Icon */}
            {event.type === 'join' ? (
              <LogIn className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : (
              <LogOut className="w-3 h-3 text-red-400/70 flex-shrink-0" />
            )}

            {/* Name */}
            <span className={`text-[10px] font-medium truncate ${
              event.type === 'join' ? 'text-green-300' : 'text-red-300/70'
            }`}>
              {event.name}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
