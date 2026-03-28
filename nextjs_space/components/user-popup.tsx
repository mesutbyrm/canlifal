'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { X, Sparkles, ChevronRight, Users, Home, Radio, LogIn } from 'lucide-react'
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
  icon?: string
  description: string | null
  activeUsers?: number
}

interface PopupData {
  id: string
  title: string
  message: string
  buttons: PopupButton[]
  popupType: string
  maxShowCount: number
  showOnRefresh: boolean
  showDelaySeconds: number
  lastSentAt: string
  liveStreams?: LiveStream[]
  chatRooms?: ChatRoom[]
}

const DEFAULT_QUICK_ACTIONS: PopupButton[] = [
  { label: '\u{1F31F} Günlük Burcunuz', href: '/fallar/burc-yorumu', color: 'from-purple-600 to-fuchsia-600' },
  { label: '\u{1F4AC} Sohbet Et', href: '/sohbet', color: 'from-blue-600 to-indigo-600' },
  { label: '\u{1F3AE} Oyun Oyna', href: '/oyunlar', color: 'from-amber-600 to-yellow-600' },
  { label: '\u{1F4FA} Canlı Yayına Git', href: '/sohbet/video', color: 'from-red-600 to-orange-600' },
]

const POLL_INTERVAL = 5000 // 5 seconds

// Helper: get show count for a popup from localStorage
function getPopupShowCount(popupId: string): number {
  try {
    const data = JSON.parse(localStorage.getItem('popup_show_counts') || '{}')
    return data[popupId] || 0
  } catch { return 0 }
}

// Helper: increment show count
function incrementPopupShowCount(popupId: string) {
  try {
    const data = JSON.parse(localStorage.getItem('popup_show_counts') || '{}')
    data[popupId] = (data[popupId] || 0) + 1
    localStorage.setItem('popup_show_counts', JSON.stringify(data))
  } catch { /* ignore */ }
}

// Helper: check session-level visibility (showOnRefresh=false means once per session)
function isShownThisSession(popupId: string): boolean {
  try {
    const data = JSON.parse(sessionStorage.getItem('popup_session_shown') || '{}')
    return !!data[popupId]
  } catch { return false }
}

function markShownThisSession(popupId: string) {
  try {
    const data = JSON.parse(sessionStorage.getItem('popup_session_shown') || '{}')
    data[popupId] = true
    sessionStorage.setItem('popup_session_shown', JSON.stringify(data))
  } catch { /* ignore */ }
}

// Filter popups based on display rules
function filterVisiblePopups(popups: PopupData[]): PopupData[] {
  return popups.filter(p => {
    // Check maxShowCount (0 = unlimited)
    if (p.maxShowCount > 0 && getPopupShowCount(p.id) >= p.maxShowCount) return false
    // Check showOnRefresh — if false and already shown this session, skip
    if (!p.showOnRefresh && isShownThisSession(p.id)) return false
    return true
  })
}

export default function UserPopup() {
  // Popup disabled by admin request — all first-visit popups turned off
  return null
}

function UserPopup_DISABLED() {
  const [popups, setPopups] = useState<PopupData[]>([])
  const [visiblePopups, setVisiblePopups] = useState<PopupData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [showDefault, setShowDefault] = useState(false)
  const [delayPassed, setDelayPassed] = useState(false)
  const lastSeenTimeRef = useRef<string | null>(null)
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession() || {}
  const isGuest = sessionStatus === 'unauthenticated'
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstLoad = useRef(true)
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null)

  const shouldShowDefault = useCallback(() => {
    // Default popup only shows once per session
    try {
      if (sessionStorage.getItem('default_popup_shown')) return false
    } catch { /* ignore */ }
    return true
  }, [])

  const fetchPopups = useCallback(async (since?: string) => {
    try {
      const url = since ? `/api/popups?since=${encodeURIComponent(since)}` : '/api/popups'
      const res = await fetch(url)
      if (res.ok) {
        const data: PopupData[] = await res.json()
        if (data.length > 0) {
          const filtered = filterVisiblePopups(data)
          if (filtered.length > 0) {
            setPopups(data)
            setVisiblePopups(filtered)
            setShowDefault(false)
            setDismissed(false)
            setCurrentIdx(0)
            // Handle delay — use the first popup's delay setting
            const delaySec = filtered[0]?.showDelaySeconds ?? 1
            setDelayPassed(false)
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
            delayTimerRef.current = setTimeout(() => setDelayPassed(true), delaySec * 1000)
          } else if (isFirstLoad.current && shouldShowDefault()) {
            setShowDefault(true)
            setDelayPassed(true)
          }
          // Track the latest lastSentAt
          const latestTime = data.reduce((max: string, p: PopupData) => {
            return p.lastSentAt > max ? p.lastSentAt : max
          }, data[0].lastSentAt)
          lastSeenTimeRef.current = latestTime
        } else if (isFirstLoad.current && shouldShowDefault()) {
          setShowDefault(true)
          setDelayPassed(true)
        }
      } else if (isFirstLoad.current && shouldShowDefault()) {
        setShowDefault(true)
        setDelayPassed(true)
      }
    } catch {
      if (isFirstLoad.current && shouldShowDefault()) {
        setShowDefault(true)
        setDelayPassed(true)
      }
    }
    isFirstLoad.current = false
  }, [shouldShowDefault])

  // Initial fetch + polling
  useEffect(() => {
    if (sessionStatus === 'loading') return

    const initTimer = setTimeout(() => {
      fetchPopups()
    }, 1500)

    pollRef.current = setInterval(() => {
      if (lastSeenTimeRef.current) {
        fetchPopups(lastSeenTimeRef.current)
      } else {
        fetchPopups()
      }
    }, POLL_INTERVAL)

    return () => {
      clearTimeout(initTimer)
      if (pollRef.current) clearInterval(pollRef.current)
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
    }
  }, [sessionStatus, fetchPopups])

  const handleDismiss = useCallback(() => {
    // Track show counts and session visibility for each visible popup
    visiblePopups.forEach(p => {
      incrementPopupShowCount(p.id)
      markShownThisSession(p.id)
    })
    // Mark default popup as shown this session
    try { sessionStorage.setItem('default_popup_shown', '1') } catch { /* ignore */ }
    setDismissed(true)
  }, [visiblePopups])

  const handleButtonClick = useCallback((href: string) => {
    handleDismiss()
    router.push(`/tr${href}`)
  }, [handleDismiss, router])

  const currentPopup = visiblePopups[currentIdx]
  const isVisible = !dismissed && delayPassed && (visiblePopups.length > 0 || showDefault)

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
                {currentPopup ? currentPopup.title : 'Hoş Geldiniz! \u{1F52E}'}
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

          {/* Content */}
          <div className="px-4 pb-4 space-y-2">
            {/* Ana Sayfaya Git - always shown at top */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => handleButtonClick('/')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 transition-all shadow-md"
            >
              <span className="text-white font-medium text-sm flex items-center gap-2">
                <Home className="w-4 h-4" />
                🏠 Ana Sayfaya Git
              </span>
              <ChevronRight className="w-4 h-4 text-white/70" />
            </motion.button>

            {/* Live Streams - top 3 */}
            {currentPopup?.popupType === 'live_streams' && currentPopup.liveStreams && currentPopup.liveStreams.length > 0 && (
              <div className="space-y-2 mb-1">
                {currentPopup.liveStreams.slice(0, 3).map((stream) => (
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

            {/* Chat Rooms - top 2 by active users */}
            {currentPopup?.popupType === 'chat_rooms' && currentPopup.chatRooms && currentPopup.chatRooms.length > 0 && (
              <div className="space-y-2 mb-1">
                {currentPopup.chatRooms.slice(0, 2).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleButtonClick(`/sohbet/${room.slug}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-900/30 border border-blue-500/30 hover:bg-blue-900/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{room.icon || '\u{1F4AC}'} {room.name}</p>
                      {room.description && (
                        <p className="text-blue-300/60 text-[10px] truncate mt-0.5">{room.description}</p>
                      )}
                    </div>
                    {room.activeUsers !== undefined && room.activeUsers > 0 && (
                      <div className="flex items-center gap-1 text-green-400 text-xs ml-2 flex-shrink-0">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <Users className="w-3 h-3" />
                        {room.activeUsers}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Buttons */}
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

            {/* Google Login - for guests */}
            {isGuest && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => handleButtonClick('/giris')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all shadow-md"
              >
                <span className="text-white font-medium text-sm flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Giriş Yap / Üye Ol
                </span>
                <ChevronRight className="w-4 h-4 text-white/70" />
              </motion.button>
            )}

            {/* Multiple popups navigation */}
            {visiblePopups.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {visiblePopups.map((_, i) => (
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
