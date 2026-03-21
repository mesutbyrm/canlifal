'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, MessageCircle, Gamepad2, Radio, Star, ChevronRight, Users } from 'lucide-react'
import Image from 'next/image'

interface PopupButton {
  label: string
  href: string
  color?: string
}

interface LiveStream {
  id: string
  title: string
  viewerCount: number
  user: { name: string; image: string | null }
}

interface ChatRoom {
  id: string
  name: string
  slug: string
  description: string | null
}

interface PopupData {
  id: string
  title: string
  message: string
  buttons: PopupButton[]
  popupType: string
  liveStreams?: LiveStream[]
  chatRooms?: ChatRoom[]
}

const DEFAULT_QUICK_ACTIONS: PopupButton[] = [
  { label: '🌟 Günlük Burcunuz', href: '/fallar/burc-yorumu', color: 'from-purple-600 to-fuchsia-600' },
  { label: '💬 Sohbet Et', href: '/sohbet', color: 'from-blue-600 to-indigo-600' },
  { label: '🎮 Oyun Oyna', href: '/oyunlar', color: 'from-amber-600 to-yellow-600' },
  { label: '📺 Canlı Yayına Git', href: '/sohbet/video', color: 'from-red-600 to-orange-600' },
]

export default function UserPopup() {
  const [popups, setPopups] = useState<PopupData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [showDefault, setShowDefault] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissedAt = sessionStorage.getItem('popup_dismissed')
    if (dismissedAt) {
      setDismissed(true)
      return
    }

    const fetchPopups = async () => {
      try {
        const res = await fetch('/api/popups')
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0) {
            setPopups(data)
          } else {
            // Show default quick actions popup
            setShowDefault(true)
          }
        } else {
          setShowDefault(true)
        }
      } catch {
        setShowDefault(true)
      }
    }
    // Small delay so page loads first
    const timer = setTimeout(fetchPopups, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    sessionStorage.setItem('popup_dismissed', Date.now().toString())
  }, [])

  const handleButtonClick = useCallback((href: string) => {
    handleDismiss()
    router.push(`/tr${href}`)
  }, [handleDismiss, router])

  const currentPopup = popups[currentIdx]
  const isVisible = !dismissed && (popups.length > 0 || showDefault)

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-sm bg-gradient-to-b from-[#1a0a2e] to-[#0f0520] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 0 40px rgba(147,51,234,0.3)' }}
        >
          {/* Header */}
          <div className="relative px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-bold text-base">
                {currentPopup ? currentPopup.title : 'Hoş Geldiniz! 🔮'}
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Message */}
          {(currentPopup?.message || !currentPopup) && (
            <p className="px-4 text-purple-200/80 text-sm mb-3">
              {currentPopup ? currentPopup.message : 'Bugün sizi neler bekliyor?'}
            </p>
          )}

          {/* Content based on popup type */}
          <div className="px-4 pb-4 space-y-2">
            {/* Admin popup with live streams */}
            {currentPopup?.popupType === 'live_streams' && currentPopup.liveStreams && currentPopup.liveStreams.length > 0 && (
              <div className="space-y-2 mb-3">
                {currentPopup.liveStreams.map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => handleButtonClick(`/sohbet/video?watch=${stream.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-red-900/30 border border-red-500/30 hover:bg-red-900/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-red-900/50 flex-shrink-0 relative">
                      {stream.user.image ? (
                        <Image src={stream.user.image} alt={stream.user.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-red-300"><Radio className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{stream.user.name}</p>
                      <p className="text-red-300/70 text-xs truncate">{stream.title || 'Canlı Yayın'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-red-400 text-xs">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <Users className="w-3 h-3" />
                      {stream.viewerCount}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Admin popup with chat rooms */}
            {currentPopup?.popupType === 'chat_rooms' && currentPopup.chatRooms && currentPopup.chatRooms.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {currentPopup.chatRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleButtonClick(`/sohbet/${room.slug}`)}
                    className="p-2.5 rounded-xl bg-blue-900/30 border border-blue-500/30 hover:bg-blue-900/50 transition-colors text-left"
                  >
                    <p className="text-white text-sm font-medium truncate">💬 {room.name}</p>
                    {room.description && (
                      <p className="text-blue-300/60 text-[10px] truncate mt-0.5">{room.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Buttons */}
            {(currentPopup ? currentPopup.buttons : DEFAULT_QUICK_ACTIONS).map((btn, i) => {
              const colorClass = btn.color || 'from-purple-600 to-fuchsia-600'
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  onClick={() => handleButtonClick(btn.href)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r ${colorClass} hover:brightness-110 transition-all shadow-md`}
                >
                  <span className="text-white font-medium text-sm">{btn.label}</span>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </motion.button>
              )
            })}

            {/* Multiple popups navigation */}
            {popups.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {popups.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIdx ? 'bg-purple-400' : 'bg-purple-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
