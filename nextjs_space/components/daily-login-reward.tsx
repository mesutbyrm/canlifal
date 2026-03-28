'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Gift, X, Sparkles, Flame, Coins } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STREAK_REWARDS = [
  { day: 1, xp: 10, jeton: 0 },
  { day: 2, xp: 15, jeton: 0 },
  { day: 3, xp: 20, jeton: 1 },
  { day: 4, xp: 25, jeton: 0 },
  { day: 5, xp: 30, jeton: 2 },
  { day: 6, xp: 40, jeton: 0 },
  { day: 7, xp: 50, jeton: 5 },
]

export default function DailyLoginReward() {
  // Popup disabled by admin request — all first-visit popups turned off
  return null
}

function DailyLoginReward_DISABLED() {
  const { data: session } = useSession() || {}
  const [show, setShow] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [streak, setStreak] = useState(0)
  const [reward, setReward] = useState({ xp: 0, jeton: 0 })
  const [loading, setLoading] = useState(false)
  const [canClaim, setCanClaim] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    checkStatus()
  }, [session])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/daily-login')
      if (!res.ok) return
      const data = await res.json()
      if (data.canClaim) {
        setStreak(data.currentStreak)
        setCanClaim(true)
        // Show popup after 1 second delay
        setTimeout(() => setShow(true), 1000)
      }
    } catch (e) { console.error(e) }
  }

  const claimReward = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/daily-login', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setReward({ xp: data.xpEarned, jeton: data.jetonEarned })
        setStreak(data.streak)
        setClaimed(true)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (!session?.user || !show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={() => { if (claimed) setShow(false) }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-gradient-to-br from-[#1a0a2e] to-[#0f0520] border border-fuchsia-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-fuchsia-500/20"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-fuchsia-400" />
              <h3 className="text-white font-bold text-lg">Günlük Ödül</h3>
            </div>
            <button onClick={() => setShow(false)} className="text-purple-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!claimed ? (
            <>
              {/* Streak display */}
              <div className="flex items-center justify-center gap-1 mb-4">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300 font-semibold">{streak} gün seri</span>
              </div>

              {/* Reward days */}
              <div className="grid grid-cols-7 gap-1 mb-5">
                {STREAK_REWARDS.map((r, i) => {
                  const dayNum = i + 1
                  const isToday = dayNum === ((streak % 7) + 1)
                  const isPast = dayNum <= (streak % 7)
                  return (
                    <div
                      key={dayNum}
                      className={`text-center p-1.5 rounded-lg text-xs ${
                        isToday
                          ? 'bg-fuchsia-600/50 border border-fuchsia-400 ring-2 ring-fuchsia-400/50'
                          : isPast
                            ? 'bg-green-900/30 border border-green-700/30'
                            : 'bg-purple-900/30 border border-purple-700/30'
                      }`}
                    >
                      <span className={`block font-bold ${isToday ? 'text-fuchsia-200' : isPast ? 'text-green-300' : 'text-purple-400'}`}>
                        {dayNum}
                      </span>
                      <span className={`block text-[10px] ${isToday ? 'text-fuchsia-300' : 'text-purple-500'}`}>
                        +{r.xp}
                      </span>
                      {r.jeton > 0 && (
                        <span className="block text-[10px] text-yellow-400">+{r.jeton}J</span>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={claimReward}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Gift className="w-5 h-5" /> Ödülü Al
              </button>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-4"
            >
              <Sparkles className="w-12 h-12 text-fuchsia-400 mx-auto mb-3" />
              <h4 className="text-white font-bold text-xl mb-2">Tebrikler!</h4>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="bg-fuchsia-900/40 px-4 py-2 rounded-lg">
                  <span className="text-fuchsia-300 font-bold">+{reward.xp} XP</span>
                </div>
                {reward.jeton > 0 && (
                  <div className="bg-yellow-900/40 px-4 py-2 rounded-lg">
                    <span className="text-yellow-300 font-bold">+{reward.jeton} Jeton</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 text-orange-300">
                <Flame className="w-4 h-4" />
                <span className="text-sm">{streak} gün seri!</span>
              </div>
              <button
                onClick={() => setShow(false)}
                className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
              >
                Kapat
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
