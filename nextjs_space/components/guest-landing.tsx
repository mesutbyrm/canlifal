'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { Sparkles, Video, MessageCircle, Share2, Gamepad2, BookOpen, Moon, Star, Users, Eye, Radio, Zap } from 'lucide-react'

interface SectionCounts {
  [key: string]: number
}

const LANDING_BUTTONS = [
  { key: 'fortunes', label: 'Falına Bak', icon: Sparkles, href: '/fallar', color: 'from-purple-600 to-fuchsia-600', activeText: 'kişi fal bakıyor', emoji: '🔮' },
  { key: 'live_tellers', label: 'Canlı Fal Bak', icon: Eye, href: '/canli-falcilar', color: 'from-pink-600 to-rose-600', activeText: 'kişi canlı falda', emoji: '👁️' },
  { key: 'live_streams', label: 'Canlı Yayın Falcıları', icon: Radio, href: '/sohbet/video', color: 'from-red-600 to-orange-600', activeText: 'kişi yayın izliyor', emoji: '📺' },
  { key: 'chat', label: 'Sohbet Et', icon: MessageCircle, href: '/sohbet', color: 'from-blue-600 to-indigo-600', activeText: 'kişi sohbet ediyor', emoji: '💬' },
  { key: 'social', label: 'Paylaşım Yap', icon: Share2, href: '/sosyal', color: 'from-emerald-600 to-teal-600', activeText: 'kişi paylaşım yapıyor', emoji: '📢' },
  { key: 'games', label: 'Oyun Oyna', icon: Gamepad2, href: '/oyunlar', color: 'from-amber-600 to-yellow-600', activeText: 'kişi oyun oynuyor', emoji: '🎮' },
  { key: 'blog', label: 'Blog', icon: BookOpen, href: '/blog', color: 'from-violet-600 to-purple-600', activeText: 'kişi blog okuyor', emoji: '📖' },
  { key: 'dreams', label: 'Rüya Tabiri', icon: Moon, href: '/ruya', color: 'from-indigo-600 to-blue-600', activeText: 'kişi rüya bakıyor', emoji: '🌙' },
  { key: 'bana_ozel', label: 'Bana Özel', icon: Star, href: '/fallar', color: 'from-fuchsia-600 to-pink-600', activeText: 'kişi fal bakıyor', emoji: '⭐' },
]

// Blinking text component
function BlinkingCount({ count, text }: { count: number; text: string }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    if (count <= 0) return
    const timer = setInterval(() => setVisible(v => !v), 800)
    return () => clearInterval(timer)
  }, [count])

  if (count <= 0) return null

  return (
    <span 
      className="text-[11px] font-bold transition-opacity duration-300"
      style={{ 
        color: '#FFD700',
        textShadow: '0 0 8px rgba(255, 215, 0, 0.8), 0 0 16px rgba(255, 215, 0, 0.4)',
        opacity: visible ? 1 : 0.2 
      }}
    >
      🔥 Şuan {count} {text}
    </span>
  )
}

export default function GuestLanding() {
  const [counts, setCounts] = useState<SectionCounts>({})
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/presence/sections')
        if (res.ok) {
          const data = await res.json()
          setCounts(data.counts || {})
          setTotal(data.total || 0)
        }
      } catch {}
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 20000)
    return () => clearInterval(interval)
  }, [])

  // Stars rendered with useMemo to avoid hydration issues
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${(i * 17 + 7) % 100}%`,
      top: `${(i * 23 + 13) % 100}%`,
      delay: `${(i * 0.7) % 5}s`,
      opacity: 0.3 + (i % 5) * 0.15,
      dur: `${2 + (i % 4)}s`,
      size: i % 7 === 0 ? 'w-1 h-1' : 'w-0.5 h-0.5',
    }))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#120525] to-[#0a0118] relative overflow-hidden">
      {/* Animated Stars */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {stars.map((s) => (
          <div
            key={s.id}
            className={`absolute ${s.size} bg-white rounded-full`}
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              opacity: s.opacity,
              animation: `twinkle ${s.dur} ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            left: '10%', top: '20%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-48 h-48 rounded-full"
          style={{
            right: '5%', top: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{ x: [0, -30, 20, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-20 pb-32 px-4 max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-3"
          >
            🔮
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-300 via-fuchsia-200 to-purple-300 bg-clip-text text-transparent mb-2">
            Canli Fal
          </h1>
          <p className="text-purple-300/80 text-sm">Geleceğini keşfet, kaderini oku</p>
          
          {/* Total online */}
          {total > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/30"
            >
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">{total} kişi online</span>
            </motion.div>
          )}
        </motion.div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 gap-3">
          {LANDING_BUTTONS.map((btn, i) => {
            const Icon = btn.icon
            const count = counts[btn.key] || 0
            return (
              <motion.div
                key={btn.key}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
              >
                <Link href={`/tr${btn.href}`} className="block">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${btn.color} p-4 shadow-lg border border-white/10`}
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl">
                          {btn.emoji}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-base">{btn.label}</h3>
                          <BlinkingCount count={count} text={btn.activeText} />
                        </div>
                      </div>
                      <Zap className="w-5 h-5 text-white/60" />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Register CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-8 text-center"
        >
          <Link href="/tr/kayit-ol">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg shadow-xl"
              style={{ boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}
            >
              <Sparkles className="w-5 h-5" />
              Hemen Ücretsiz Kayıt Ol
            </motion.div>
          </Link>
          <p className="text-purple-400/60 text-xs mt-3">Kayıt ol ve tüm özelliklerin keyfini çıkar</p>
        </motion.div>

        {/* Login link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-4 text-center"
        >
          <Link href="/tr/giris" className="text-purple-300/70 text-sm hover:text-purple-200 underline underline-offset-2">
            Zaten hesabın var mı? Giriş Yap
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
