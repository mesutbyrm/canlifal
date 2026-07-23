'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// ─── Types ───
interface GiftAnimationData {
  id: string
  senderName: string
  senderImage?: string | null
  giftIcon: string
  giftName: string
  giftPrice: number
  animation: string
  quantity?: number
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
  color: string
  emoji?: string
  rotation: number
}

interface ComboState {
  giftId: string
  senderName: string
  count: number
  giftIcon: string
  giftName: string
  lastTime: number
}

interface GiftAnimationOverlayProps {
  onTrigger?: (handler: (gift: GiftAnimationData) => void) => void
}

// ─── Particle Colors ───
const PARTICLE_COLORS = {
  coin: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#B8860B'],
  heart: ['#FF2D55', '#FF375F', '#FF6B6B', '#FF85A1', '#E91E63'],
  star: ['#FFD700', '#FFC107', '#FF9800', '#FFEB3B', '#FFF176'],
  sparkle: ['#E040FB', '#7C4DFF', '#448AFF', '#00BCD4', '#69F0AE'],
  fire: ['#FF5722', '#FF9800', '#FFC107', '#FF6D00', '#DD2C00'],
  galaxy: ['#7C4DFF', '#E040FB', '#00BCD4', '#1DE9B6', '#651FFF'],
  coffee: ['#795548', '#8D6E63', '#A1887F', '#D7CCC8', '#BCAAA4'],
}

// ─── Emojis per animation type ───
const ANIM_EMOJIS: Record<string, string[]> = {
  coin_single: ['🪙'],
  coin_spread_5: ['🪙', '💰'],
  coin_spread_10: ['🪙', '💰', '💎'],
  heart_rain: ['❤️', '💕', '💗', '💖', '💝'],
  star_burst: ['⭐', '✨', '🌟', '💫'],
  sparkle_burst: ['✨', '💎', '🔮', '👑', '🌸'],
  coffee_pour: ['☕', '🫖', '💨'],
  fire_burst: ['🔥', '💥', '⚡'],
  galaxy_explosion: ['🌌', '💫', '🪐', '⭐', '🌠'],
}

function getParticleConfig(animation: string, price: number): { count: number; colors: string[]; emojis: string[] } {
  const isExpensive = price >= 500
  const isMid = price >= 100

  if (animation === 'coffee_pour') return { count: 15, colors: PARTICLE_COLORS.coffee, emojis: ANIM_EMOJIS.coffee_pour }
  if (animation === 'heart_rain') return { count: isMid ? 25 : 15, colors: PARTICLE_COLORS.heart, emojis: ANIM_EMOJIS.heart_rain }
  if (animation === 'star_burst') return { count: isExpensive ? 35 : 20, colors: PARTICLE_COLORS.star, emojis: ANIM_EMOJIS.star_burst }
  if (animation.startsWith('coin_spread') || animation === 'coin_single') {
    const count = animation === 'coin_single' ? 5 : animation === 'coin_spread_5' ? 15 : 25
    return { count, colors: PARTICLE_COLORS.coin, emojis: ANIM_EMOJIS[animation] || ANIM_EMOJIS.coin_single }
  }
  // sparkle_burst (default for gül, taç, elmas, kristal, aslan, roket, galaksi)
  if (isExpensive) return { count: 40, colors: PARTICLE_COLORS.galaxy, emojis: ANIM_EMOJIS.galaxy_explosion }
  if (isMid) return { count: 25, colors: PARTICLE_COLORS.fire, emojis: ANIM_EMOJIS.fire_burst }
  return { count: 15, colors: PARTICLE_COLORS.sparkle, emojis: ANIM_EMOJIS.sparkle_burst }
}

function generateParticles(animation: string, price: number): Particle[] {
  const config = getParticleConfig(animation, price)
  return Array.from({ length: config.count }, (_, i) => ({
    id: Date.now() + i,
    x: 10 + Math.random() * 80,
    y: 15 + Math.random() * 60,
    size: 16 + Math.random() * 28,
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 2,
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
    rotation: Math.random() * 720 - 360,
  }))
}

// ─── Main Component ───
export default function GiftAnimationOverlay({ onTrigger }: GiftAnimationOverlayProps) {
  const [activeGift, setActiveGift] = useState<GiftAnimationData | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [combo, setCombo] = useState<ComboState | null>(null)
  const [giftQueue, setGiftQueue] = useState<GiftAnimationData[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [showFullscreenFlash, setShowFullscreenFlash] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Expose trigger function to parent
  const triggerGift = useCallback((gift: GiftAnimationData) => {
    setGiftQueue(prev => [...prev, gift])
  }, [])

  useEffect(() => {
    onTrigger?.(triggerGift)
  }, [onTrigger, triggerGift])

  // Process gift queue
  useEffect(() => {
    if (isAnimating || giftQueue.length === 0) return

    const nextGift = giftQueue[0]
    setGiftQueue(prev => prev.slice(1))
    setIsAnimating(true)

    // Combo detection
    setCombo(prev => {
      if (prev && prev.giftId === nextGift.id && prev.senderName === nextGift.senderName && (Date.now() - prev.lastTime) < 5000) {
        return { ...prev, count: prev.count + (nextGift.quantity || 1), lastTime: Date.now() }
      }
      return {
        giftId: nextGift.id,
        senderName: nextGift.senderName,
        count: nextGift.quantity || 1,
        giftIcon: nextGift.giftIcon,
        giftName: nextGift.giftName,
        lastTime: Date.now(),
      }
    })

    // Full-screen flash for expensive gifts
    if (nextGift.giftPrice >= 200) {
      setShowFullscreenFlash(true)
      setTimeout(() => setShowFullscreenFlash(false), 600)
    }

    setActiveGift(nextGift)
    setParticles(generateParticles(nextGift.animation, nextGift.giftPrice))

    // Clear combo after 5 seconds
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current)
    comboTimeoutRef.current = setTimeout(() => setCombo(null), 5000)

    // Duration based on price
    const duration = nextGift.giftPrice >= 500 ? 5000 : nextGift.giftPrice >= 100 ? 4000 : 3000
    timeoutRef.current = setTimeout(() => {
      setActiveGift(null)
      setParticles([])
      setTimeout(() => setIsAnimating(false), 300)
    }, duration)
  }, [giftQueue, isAnimating])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current)
    }
  }, [])

  const isExpensiveGift = activeGift && activeGift.giftPrice >= 200
  const isLuxuryGift = activeGift && activeGift.giftPrice >= 500

  return (
    <>
      {/* ─── Fullscreen Flash for expensive gifts ─── */}
      <AnimatePresence>
        {showFullscreenFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-[45] pointer-events-none"
            style={{
              background: isLuxuryGift
                ? 'radial-gradient(circle at center, rgba(233,30,99,0.5) 0%, rgba(156,39,176,0.3) 40%, transparent 70%)'
                : 'radial-gradient(circle at center, rgba(255,215,0,0.4) 0%, rgba(255,152,0,0.2) 40%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Particle System ─── */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
            animate={{
              opacity: [0, 1, 1, 0.6, 0],
              scale: [0, 1.2, 1, 0.8, 0],
              x: [`50%`, `${p.x}%`],
              y: [`50%`, `${p.y}%`],
              rotate: [0, p.rotation],
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
            className="absolute z-[46] pointer-events-none"
            style={{ left: 0, top: 0, fontSize: `${p.size}px` }}
          >
            {p.emoji ? (
              <span className="drop-shadow-lg">{p.emoji}</span>
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: `radial-gradient(circle, ${p.color}, ${p.color}88)`,
                  boxShadow: `0 0 ${p.size}px ${p.color}66`,
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ─── Center Gift Display ─── */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-[44] pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-center"
            >
              {/* Gift icon with glow */}
              <motion.div
                animate={isLuxuryGift
                  ? { scale: [1, 1.4, 1.1, 1.3, 1], rotate: [0, 10, -10, 5, 0] }
                  : { scale: [1, 1.25, 1], rotate: [0, 5, -5, 0] }
                }
                transition={{ repeat: isLuxuryGift ? 3 : 2, duration: isLuxuryGift ? 0.6 : 0.5 }}
                className="relative mb-3 flex justify-center"
              >
                {/* Glow ring behind gift */}
                {isExpensiveGift && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className={`w-40 h-40 rounded-full blur-2xl ${isLuxuryGift ? 'bg-pink-500/40' : 'bg-yellow-500/30'}`} />
                  </motion.div>
                )}

                {(activeGift.giftIcon || '🎁').startsWith('/') ? (
                  <Image
                    src={activeGift.giftIcon}
                    alt={activeGift.giftName || 'Hediye'}
                    width={isLuxuryGift ? 160 : 120}
                    height={isLuxuryGift ? 160 : 120}
                    className={`${isLuxuryGift ? 'w-40 h-40' : 'w-28 h-28'} object-contain relative z-10 drop-shadow-[0_0_30px_rgba(255,200,0,0.6)]`}
                  />
                ) : (
                  <span className={`relative z-10 ${isLuxuryGift ? 'text-[120px]' : 'text-[80px]'}`}>
                    {activeGift.giftIcon || '🎁'}
                  </span>
                )}
              </motion.div>

              {/* Sender info banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`flex items-center justify-center gap-3 backdrop-blur-xl px-5 py-2.5 rounded-2xl border ${
                  isLuxuryGift
                    ? 'bg-gradient-to-r from-pink-900/90 via-purple-900/90 to-pink-900/90 border-pink-400/50 shadow-[0_0_30px_rgba(236,72,153,0.3)]'
                    : isExpensiveGift
                      ? 'bg-gradient-to-r from-amber-900/90 to-yellow-900/90 border-yellow-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                      : 'bg-gradient-to-r from-purple-900/80 to-pink-900/80 border-pink-500/30'
                }`}
              >
                {activeGift.senderImage ? (
                  <Image
                    src={activeGift.senderImage}
                    alt=""
                    width={44}
                    height={44}
                    className={`w-11 h-11 rounded-full object-cover border-2 ${isLuxuryGift ? 'border-pink-400' : 'border-yellow-400'}`}
                  />
                ) : (
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                    isLuxuryGift
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-400'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500 border-yellow-400'
                  }`}>
                    <span className="text-white font-bold text-lg">{activeGift.senderName?.[0] || '?'}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-bold text-base leading-tight">{activeGift.senderName}</p>
                  <p className={`text-sm leading-tight ${
                    isLuxuryGift ? 'text-pink-300' : 'text-yellow-300'
                  }`}>
                    {activeGift.giftName} gönderdi ✨
                  </p>
                </div>
                {/* Jeton amount - visible to everyone */}
                <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1 border border-yellow-400/40 ml-1">
                  <span className="text-base">🪙</span>
                  <span className="text-yellow-300 font-extrabold text-base leading-none">
                    {activeGift.giftPrice * (activeGift.quantity || 1)}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Combo Counter ─── */}
      <AnimatePresence>
        {combo && combo.count > 1 && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute left-3 bottom-44 z-[47] pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10">
              {(combo.giftIcon || '🎁').startsWith('/') ? (
                <Image src={combo.giftIcon} alt="" width={32} height={32} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-2xl">{combo.giftIcon || '🎁'}</span>
              )}
              <div>
                <p className="text-white text-xs font-medium leading-tight">{combo.senderName}</p>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-xs">{combo.giftName}</span>
                  <motion.span
                    key={combo.count}
                    initial={{ scale: 2, color: '#FF2D55' }}
                    animate={{ scale: 1, color: '#FFD700' }}
                    className="text-lg font-black"
                  >
                    x{combo.count}
                  </motion.span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Side Gift Entry Banner (for smaller gifts, shows in chat area) ─── */}
      <AnimatePresence>
        {activeGift && activeGift.giftPrice < 200 && (
          <motion.div
            initial={{ x: -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="absolute left-2 bottom-32 z-[43] pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600/80 to-transparent backdrop-blur-sm rounded-full pl-2 pr-6 py-1.5">
              {activeGift.senderImage ? (
                <Image src={activeGift.senderImage} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-white/30" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center border border-white/30">
                  <span className="text-white text-xs font-bold">{activeGift.senderName?.[0]}</span>
                </div>
              )}
              <span className="text-white text-xs font-medium">{activeGift.senderName}</span>
              <span className="text-white/60 text-xs">gönderdi</span>
              {(activeGift.giftIcon || '🎁').startsWith('/') ? (
                <Image src={activeGift.giftIcon} alt="" width={24} height={24} className="w-6 h-6 object-contain" />
              ) : (
                <span className="text-lg">{activeGift.giftIcon || '🎁'}</span>
              )}
              <span className="flex items-center gap-0.5 text-yellow-300 text-xs font-bold">🪙{activeGift.giftPrice * (activeGift.quantity || 1)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Luxury Gift Spotlight Effect (500+) ─── */}
      <AnimatePresence>
        {activeGift && isLuxuryGift && (
          <>
            {/* Top spotlight beam */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0.3, 0.5, 0] }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 z-[43] pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg at 50% 0%, transparent 40%, rgba(255,215,0,0.1) 45%, rgba(255,215,0,0.2) 50%, rgba(255,215,0,0.1) 55%, transparent 60%)'
              }}
            />
            {/* Screen edge glow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 3, ease: 'easeInOut' }}
              className="absolute inset-0 z-[42] pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 60px rgba(236,72,153,0.4), inset 0 0 120px rgba(168,85,247,0.2)'
              }}
            />
          </>
        )}
      </AnimatePresence>
    </>
  )
}
