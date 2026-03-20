'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Phone, PhoneOff, Clock, User, Radio, X, Video } from 'lucide-react'

interface CoBroadcastInvite {
  id: string
  streamId: string
  status: string
  invitedAt: string
  broadcaster: {
    id: string
    name: string | null
    image: string | null
  }
  streamTitle: string | null
  streamCategory: string | null
}

const CATEGORY_NAMES: Record<string, { tr: string; en: string; icon: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading', icon: '☕' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Reading', icon: '🎴' },
  astrology: { tr: 'Burç Yorumu', en: 'Astrology', icon: '⭐' },
  palm: { tr: 'El Falı', en: 'Palm Reading', icon: '🖐️' },
  dream: { tr: 'Rüya Yorumu', en: 'Dream Reading', icon: '🌙' },
  love: { tr: 'Aşk Falı', en: 'Love Fortune', icon: '💕' },
  katina: { tr: 'Katina Falı', en: 'Katina Cards', icon: '🃏' },
  numerology: { tr: 'Numeroloji', en: 'Numerology', icon: '🔢' },
  chat: { tr: 'Sohbet', en: 'Chat', icon: '💬' },
  music: { tr: 'Müzik', en: 'Music', icon: '🎵' },
  hangout: { tr: 'Muhabbet', en: 'Hangout', icon: '🎭' },
}

export default function CoBroadcastInviteModal() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguage()
  
  const [pendingInvite, setPendingInvite] = useState<CoBroadcastInvite | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dismissedInvites, setDismissedInvites] = useState<Set<string>>(new Set())
  
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
      
      // Different tone for co-broadcast invite
      oscillator.frequency.setValueAtTime(600, ctx.currentTime)
      oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.15)
      oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.3)
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.6)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [])

  // Check for pending invitations
  const checkPendingInvites = useCallback(async () => {
    if (!session?.user) return
    
    try {
      const res = await fetch('/api/user/co-broadcast-invites')
      if (!res.ok) return
      
      const invites: CoBroadcastInvite[] = await res.json()
      
      if (invites && invites.length > 0) {
        // Find first non-dismissed invite
        const newInvite = invites.find((inv) => !dismissedInvites.has(inv.id))
        
        if (newInvite && (!pendingInvite || pendingInvite.id !== newInvite.id)) {
          setPendingInvite(newInvite)
          setIsVisible(true)
          playSound()
        }
      } else {
        // No pending invites
        if (pendingInvite && !dismissedInvites.has(pendingInvite.id)) {
          // Invite was cancelled or expired
          setPendingInvite(null)
          setIsVisible(false)
        }
      }
    } catch (error) {
      console.error('Error checking co-broadcast invites:', error)
    }
  }, [session, dismissedInvites, pendingInvite, playSound])

  useEffect(() => {
    // Don't show during active broadcast/viewing or in video pages
    if (!session?.user) return
    if (pathname?.includes('/sohbet/video/')) return
    if (pathname?.includes('/canli-oda/')) return
    
    checkPendingInvites()
    pollIntervalRef.current = setInterval(checkPendingInvites, 10000)
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [session, pathname, checkPendingInvites])

  // Handle accept
  const handleAccept = async () => {
    if (!pendingInvite || isProcessing) return
    setIsProcessing(true)
    
    try {
      const res = await fetch(`/api/video-streams/${pendingInvite.streamId}/co-broadcast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      })
      
      if (res.ok) {
        setIsVisible(false)
        setPendingInvite(null)
        // Redirect to broadcast page as co-host
        router.push(`/sohbet/video/broadcast/${pendingInvite.streamId}?cohost=true`)
      }
    } catch (error) {
      console.error('Error accepting co-broadcast:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle reject
  const handleReject = async () => {
    if (!pendingInvite || isProcessing) return
    setIsProcessing(true)
    
    try {
      await fetch(`/api/video-streams/${pendingInvite.streamId}/co-broadcast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      })
    } catch (error) {
      console.error('Error rejecting co-broadcast:', error)
    } finally {
      setDismissedInvites(prev => new Set([...prev, pendingInvite.id]))
      setIsVisible(false)
      setPendingInvite(null)
      setIsProcessing(false)
    }
  }

  // Handle wait/later
  const handleWait = () => {
    if (!pendingInvite) return
    setDismissedInvites(prev => new Set([...prev, pendingInvite.id]))
    setIsVisible(false)
  }

  if (!isVisible || !pendingInvite) return null

  const broadcasterName = pendingInvite.broadcaster.name || ('Yayıncı')
  const categoryInfo = CATEGORY_NAMES[pendingInvite.streamCategory || 'chat'] || { tr: 'Canlı Yayın', en: 'Live Stream', icon: '📺' }

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
          className="bg-gradient-to-br from-deep-purple-900 to-pink-900/90 rounded-2xl p-6 mx-4 max-w-sm w-full border border-pink-500/30 shadow-2xl"
        >
          {/* Animated ring */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-pink-500 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full border-4 border-pink-500 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden">
              {pendingInvite.broadcaster.image ? (
                <Image
                  src={pendingInvite.broadcaster.image}
                  alt={broadcasterName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            {/* LIVE badge */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#fe2c55] px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
          </div>

          {/* Invite info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">
              {'Ortak Yayın Daveti!'}
            </h2>
            <p className="text-pink-200 text-lg">
              <span className="text-pink-300 font-semibold">{broadcasterName}</span>
              {' sizi canlı yayına davet ediyor'
              }
            </p>
            {/* Category badge */}
            <div className="flex items-center justify-center gap-2 mt-3 text-pink-200">
              <span className="text-xl">{categoryInfo.icon}</span>
              <span>{categoryInfo.tr}</span>
            </div>
            {pendingInvite.streamTitle && (
              <p className="text-purple-300 text-sm mt-2 truncate">
                "{pendingInvite.streamTitle}"
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2 text-purple-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(pendingInvite.invitedAt).toLocaleTimeString('tr-TR', {
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
              <Video className="w-5 h-5" />
              {'Kabul Et'}
            </button>
            
            {/* Wait */}
            <button
              onClick={handleWait}
              disabled={isProcessing}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Clock className="w-5 h-5" />
              {'Beklet'}
            </button>
            
            {/* Reject */}
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <PhoneOff className="w-5 h-5" />
              {'Reddet'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
