'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown } from 'lucide-react'

interface OnlineEvent {
  id: string
  userId: string
  username: string | null
  avatarUrl: string | null
  effectId: string | null
  effectUrl: string | null
  effectType: string | null
  durationMs: number
  animationType: string
  tier: string
  createdAt: string
}

const POLL_MS = 8000

/**
 * Gold üyelerin çevrimiçi olma anında ekranda akan giriş kartı.
 * Global feed: /api/presence/online-events?since=...
 * Her kart id'ye göre dedup edilir ve YALNIZ BİR KEZ oynatılır.
 */
export default function OnlineEntranceCards() {
  const [current, setCurrent] = useState<OnlineEvent | null>(null)
  const queueRef = useRef<OnlineEvent[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const sinceRef = useRef<string | null>(null)
  const playingRef = useRef(false)
  // §8: kullanıcı başkalarının giriş efektlerini kapatabilir (sunucu tercihi)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/me/vip-preferences')
        if (!res.ok) return
        const json = await res.json()
        const prefs = json?.data?.preferences || json?.preferences
        if (alive && prefs?.muteOthersEntrance) setMuted(true)
      } catch {
        /* oturum yoksa sessizce geç */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const playNext = useCallback(() => {
    if (playingRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    playingRef.current = true
    setCurrent(next)
    const ms = Math.min(15000, Math.max(1500, next.durationMs || 4000))
    setTimeout(() => {
      setCurrent(null)
      playingRef.current = false
      // Kısa bir nefes payi, sonra sıradaki kart
      setTimeout(playNext, 400)
    }, ms)
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : ''
        const res = await fetch(`/api/presence/online-events${qs}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data?.serverNow) sinceRef.current = data.serverNow

        const events: OnlineEvent[] = Array.isArray(data?.events) ? data.events : []
        for (const ev of events) {
          if (!ev?.id || seenRef.current.has(ev.id)) continue
          seenRef.current.add(ev.id)
          queueRef.current.push(ev)
        }
        // Bellek sınırı: dedup seti şişmesin
        if (seenRef.current.size > 500) {
          seenRef.current = new Set(Array.from(seenRef.current).slice(-200))
        }
        // Kuyruk birikmesin (çok kullanıcılı anlarda)
        if (queueRef.current.length > 8) {
          queueRef.current = queueRef.current.slice(-8)
        }
        playNext()
      } catch {
        /* sessizce yok say */
      }
    }

    poll()
    const t = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [playNext])

  const anim = current?.animationType || 'slide_lr'
  const duration = Math.min(15, Math.max(1.5, (current?.durationMs || 4000) / 1000))

  const variants =
    anim === 'slide_rl'
      ? { initial: { x: '110vw', opacity: 0 }, animate: { x: '-110vw', opacity: 1 }, exit: { opacity: 0 } }
      : anim === 'fade'
      ? { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } }
      : { initial: { x: '-110vw', opacity: 0 }, animate: { x: '110vw', opacity: 1 }, exit: { opacity: 0 } }

  // ── BÖLÜM 20 §8/§9: 5 kademe için renk/rozet (sunucudan gelen tier'a göre) ──
  const TIER_STYLE: Record<string, { label: string; border: string; bg: string; chip: string; chipText: string }> = {
    gold: {
      label: 'GOLD', border: 'rgba(250, 204, 21, 0.55)',
      bg: 'linear-gradient(90deg, rgba(120,53,15,0.85), rgba(202,138,4,0.75), rgba(120,53,15,0.85))',
      chip: 'rgba(250,204,21,0.9)', chipText: '#000',
    },
    premium: {
      label: 'PREMIUM', border: 'rgba(168, 85, 247, 0.55)',
      bg: 'linear-gradient(90deg, rgba(59,7,100,0.85), rgba(126,34,206,0.75), rgba(59,7,100,0.85))',
      chip: 'rgba(192,132,252,0.95)', chipText: '#1a0033',
    },
    diamond: {
      label: 'DIAMOND', border: 'rgba(34, 211, 238, 0.6)',
      bg: 'linear-gradient(90deg, rgba(8,51,68,0.88), rgba(8,145,178,0.75), rgba(8,51,68,0.88))',
      chip: 'rgba(103,232,249,0.95)', chipText: '#00303a',
    },
    svip: {
      label: 'SVIP', border: 'rgba(244, 63, 94, 0.6)',
      bg: 'linear-gradient(90deg, rgba(76,5,25,0.9), rgba(190,18,60,0.8), rgba(180,83,9,0.85))',
      chip: 'rgba(251,113,133,0.95)', chipText: '#2b0010',
    },
  }
  const tierKey = (current?.tier || 'gold').toLowerCase()
  const tierStyle = TIER_STYLE[tierKey] || null

  if (muted) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[95] flex justify-center overflow-hidden">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: anim === 'fade' ? 0.5 : duration, ease: 'linear' }}
            className="flex items-center gap-3 rounded-full border px-4 py-2 shadow-2xl backdrop-blur-md"
            style={{
              borderColor: tierStyle?.border || 'rgba(168, 85, 247, 0.5)',
              background:
                tierStyle?.bg ||
                'linear-gradient(90deg, rgba(59,7,100,0.85), rgba(126,34,206,0.75), rgba(59,7,100,0.85))',
            }}
          >
            {current.effectUrl && current.effectType === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.effectUrl} alt="" className="h-10 w-10 object-contain" />
            )}

            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white/40 bg-black/30">
              {current.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.avatarUrl}
                  alt={current.username || 'kullanici'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                  {(current.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap">
              {tierStyle && (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: tierStyle.chip, color: tierStyle.chipText }}
                >
                  <Crown className="h-3 w-3" />
                  {tierStyle.label}
                </span>
              )}
              <span className="text-sm font-semibold text-white drop-shadow">
                {current.username || 'Bir kullanıcı'}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-300">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                ONLINE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
