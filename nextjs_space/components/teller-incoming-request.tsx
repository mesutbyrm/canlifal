'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Clock, User, Sparkles, X } from 'lucide-react'

interface PendingSession {
  id: string
  fortuneType: string
  creditsCharged: number
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

const FORTUNE_TYPE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot', en: 'Tarot Reading' },
  astrology: { tr: 'Astroloji', en: 'Astrology' },
  palmistry: { tr: 'El Falı', en: 'Palm Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  general: { tr: 'Genel Danışmanlık', en: 'General Consultation' },
  dream: { tr: 'Rüya Tabiri', en: 'Dream Reading' },
  love: { tr: 'Aşk Falı', en: 'Love Fortune' },
}

export default function TellerIncomingRequest() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguage()
  
  const [pendingRequest, setPendingRequest] = useState<PendingSession | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dismissedSessions, setDismissedSessions] = useState<Set<string>>(new Set())
  
  const audioRef = useRef<AudioContext | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Play notification sound
  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2)
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [])

  // Check for pending sessions (for fortune tellers)
  const checkPendingRequests = useCallback(async () => {
    if (!session?.user) return
    
    try {
      const res = await fetch('/api/fortune-tellers/sessions?status=pending')
      if (!res.ok) return
      
      const data = await res.json()
      
      if (data.sessions && data.sessions.length > 0) {
        // Find first non-dismissed session
        const newRequest = data.sessions.find((s: PendingSession) => !dismissedSessions.has(s.id))
        
        if (newRequest && (!pendingRequest || pendingRequest.id !== newRequest.id)) {
          setPendingRequest(newRequest)
          setIsVisible(true)
          playSound()
        }
      } else {
        setPendingRequest(null)
        setIsVisible(false)
      }
    } catch (error) {
      console.error('Error checking pending requests:', error)
    }
  }, [session, dismissedSessions, pendingRequest, playSound])

  useEffect(() => {
    // Only run for fortune tellers on their dashboard
    if (!session?.user || !pathname?.includes('/live-tellers/dashboard')) return
    
    checkPendingRequests()
    pollIntervalRef.current = setInterval(checkPendingRequests, 3000)
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [session, pathname, checkPendingRequests])

  // Handle accept
  const handleAccept = async () => {
    if (!pendingRequest || isProcessing) return
    setIsProcessing(true)
    
    try {
      const res = await fetch(`/api/fortune-tellers/sessions/${pendingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      })
      
      if (res.ok) {
        const data = await res.json()
        setIsVisible(false)
        setPendingRequest(null)
        // Redirect to live room
        router.push(`/${language}/live-room/${pendingRequest.id}`)
      }
    } catch (error) {
      console.error('Error accepting session:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle reject
  const handleReject = async () => {
    if (!pendingRequest || isProcessing) return
    setIsProcessing(true)
    
    try {
      const res = await fetch(`/api/fortune-tellers/sessions/${pendingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })
      
      if (res.ok) {
        setDismissedSessions(prev => new Set([...prev, pendingRequest.id]))
        setIsVisible(false)
        setPendingRequest(null)
      }
    } catch (error) {
      console.error('Error rejecting session:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle wait/later
  const handleWait = () => {
    if (!pendingRequest) return
    setDismissedSessions(prev => new Set([...prev, pendingRequest.id]))
    setIsVisible(false)
  }

  if (!isVisible || !pendingRequest) return null

  const userName = pendingRequest.user.name || (language === 'tr' ? 'Misafir' : 'Guest')
  const fortuneTypeName = FORTUNE_TYPE_NAMES[pendingRequest.fortuneType]?.[language] || pendingRequest.fortuneType

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gradient-to-br from-deep-purple-900 to-deep-purple-950 rounded-2xl p-6 mx-4 max-w-sm w-full border border-purple-500/30 shadow-2xl"
        >
          {/* Animated ring */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden">
              {pendingRequest.user.image ? (
                <img
                  src={pendingRequest.user.image}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
          </div>

          {/* User info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">
              {language === 'tr' ? 'Canlı Fal İsteği' : 'Live Fortune Request'}
            </h2>
            <p className="text-purple-200 text-lg">
              <span className="text-gold-400 font-semibold">{userName}</span>
              {language === 'tr' 
                ? ' sizinle canlı fal için bağlanmak istiyor'
                : ' wants to connect for a live fortune reading'
              }
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 text-purple-300">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span>{fortuneTypeName}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-purple-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(pendingRequest.createdAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Accept */}
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Phone className="w-5 h-5" />
              {language === 'tr' ? 'Kabul Et' : 'Accept'}
            </button>
            
            {/* Wait */}
            <button
              onClick={handleWait}
              disabled={isProcessing}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Clock className="w-5 h-5" />
              {language === 'tr' ? 'Beklet' : 'Wait'}
            </button>
            
            {/* Reject */}
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <PhoneOff className="w-5 h-5" />
              {language === 'tr' ? 'Reddet' : 'Reject'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
