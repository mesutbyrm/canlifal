'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Swords, Trophy, Timer, Crown, Flame, Zap } from 'lucide-react'

interface PKUser {
  id: string
  name: string | null
  image: string | null
}

interface PKBattleData {
  id: string
  stream1Id: string
  stream2Id: string
  user1Id: string
  user2Id: string
  score1: number
  score2: number
  status: string
  duration: number
  startedAt: string | null
  endedAt: string | null
  winnerId: string | null
  user1?: PKUser | null
  user2?: PKUser | null
}

interface PKBattleOverlayProps {
  battle: PKBattleData
  currentStreamId: string
  onEnd?: () => void
}

export default function PKBattleOverlay({ battle, currentStreamId, onEnd }: PKBattleOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [prevScore1, setPrevScore1] = useState(battle.score1)
  const [prevScore2, setPrevScore2] = useState(battle.score2)
  const [flashSide, setFlashSide] = useState<'left' | 'right' | null>(null)
  const [scorePopup, setScorePopup] = useState<{ side: 'left' | 'right'; amount: number } | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (battle.status !== 'active' || !battle.startedAt) return
    const calcTimeLeft = () => {
      const started = new Date(battle.startedAt!).getTime()
      const elapsed = Math.floor((Date.now() - started) / 1000)
      const remaining = Math.max(0, battle.duration - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0 && battle.status === 'active') onEnd?.()
    }
    calcTimeLeft()
    timerRef.current = setInterval(calcTimeLeft, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [battle.startedAt, battle.duration, battle.status, onEnd])

  useEffect(() => {
    const s1diff = battle.score1 - prevScore1
    const s2diff = battle.score2 - prevScore2
    if (s1diff > 0) {
      setFlashSide('left')
      setScorePopup({ side: 'left', amount: s1diff })
      setTimeout(() => { setFlashSide(null); setScorePopup(null) }, 1000)
    }
    if (s2diff > 0) {
      setFlashSide('right')
      setScorePopup({ side: 'right', amount: s2diff })
      setTimeout(() => { setFlashSide(null); setScorePopup(null) }, 1000)
    }
    setPrevScore1(battle.score1)
    setPrevScore2(battle.score2)
  }, [battle.score1, battle.score2, prevScore1, prevScore2])

  useEffect(() => {
    if (battle.status === 'completed') setShowResult(true)
  }, [battle.status])

  const totalScore = battle.score1 + battle.score2
  const score1Percent = totalScore > 0 ? (battle.score1 / totalScore) * 100 : 50
  const score2Percent = totalScore > 0 ? (battle.score2 / totalScore) * 100 : 50

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const isUrgent = timeLeft <= 30 && timeLeft > 0
  const isCritical = timeLeft <= 10 && timeLeft > 0
  const user1 = battle.user1
  const user2 = battle.user2
  const winner = battle.winnerId === battle.user1Id ? 'left' : battle.winnerId === battle.user2Id ? 'right' : null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
      {/* PK Header Bar */}
      <div className="pointer-events-auto mx-2 mt-14">
        <div className="relative rounded-2xl bg-black/80 backdrop-blur-lg border border-yellow-500/20 overflow-hidden shadow-lg">
          {/* VS Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10">
            <motion.div
              animate={battle.status === 'active' ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-0.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-b-lg shadow-lg shadow-red-500/30"
            >
              <Swords className="w-3 h-3" />
              PK
            </motion.div>
          </div>

          {/* Timer */}
          {battle.status === 'active' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-5 z-10">
              <motion.div
                animate={isCritical ? { scale: [1, 1.2, 1], backgroundColor: ['#dc2626', '#ef4444', '#dc2626'] } : isUrgent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: isCritical ? 0.3 : 0.6 }}
                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isCritical ? 'bg-red-600 text-white shadow-lg shadow-red-500/50' :
                  isUrgent ? 'bg-red-600/80 text-white' :
                  'bg-black/60 text-yellow-400'
                }`}
              >
                <Timer className="w-3 h-3" />
                {formatTime(timeLeft)}
              </motion.div>
            </div>
          )}

          {/* Two sides */}
          <div className="flex items-center px-3 pt-7 pb-2">
            {/* Left - User 1 */}
            <div className={`flex-1 flex items-center gap-2 ${flashSide === 'left' ? 'animate-pulse' : ''}`}>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-cyan-500 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                {user1?.image ? (
                  <Image src={user1.image} alt={user1.name || 'User'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user1?.name || '?')[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-cyan-300 truncate max-w-[70px] font-medium">{user1?.name || '...'}</p>
                <motion.p
                  key={battle.score1}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-base font-black text-cyan-400"
                >
                  {battle.score1.toLocaleString()}
                </motion.p>
                {battle.score1 > battle.score2 && totalScore > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                    <span className="text-[8px] text-orange-400 font-bold">LEAD</span>
                  </div>
                )}
              </div>
              {/* Score popup */}
              <AnimatePresence>
                {scorePopup?.side === 'left' && (
                  <motion.span
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -30, scale: [0.5, 1.2, 1] }}
                    className="absolute left-12 -top-2 text-cyan-400 text-sm font-black"
                  >
                    +{scorePopup.amount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Right - User 2 */}
            <div className={`flex-1 flex items-center gap-2 justify-end ${flashSide === 'right' ? 'animate-pulse' : ''}`}>
              {/* Score popup */}
              <AnimatePresence>
                {scorePopup?.side === 'right' && (
                  <motion.span
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -30, scale: [0.5, 1.2, 1] }}
                    className="absolute right-12 -top-2 text-pink-400 text-sm font-black"
                  >
                    +{scorePopup.amount}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="min-w-0 text-right">
                <p className="text-[10px] text-pink-300 truncate max-w-[70px] ml-auto font-medium">{user2?.name || '...'}</p>
                <motion.p
                  key={battle.score2}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-base font-black text-pink-400"
                >
                  {battle.score2.toLocaleString()}
                </motion.p>
                {battle.score2 > battle.score1 && totalScore > 0 && (
                  <div className="flex items-center gap-0.5 justify-end">
                    <span className="text-[8px] text-orange-400 font-bold">LEAD</span>
                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                  </div>
                )}
              </div>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-pink-500 shrink-0 shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                {user2?.image ? (
                  <Image src={user2.image} alt={user2.name || 'User'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-pink-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user2?.name || '?')[0]}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 flex mx-3 mb-2 rounded-full overflow-hidden bg-gray-800/80">
            <motion.div
              className="bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 relative"
              animate={{ width: `${score1Percent}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {score1Percent > score2Percent && (
                <motion.div
                  className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-sm"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}
            </motion.div>
            <motion.div
              className="bg-gradient-to-r from-pink-300 via-pink-400 to-pink-600 relative"
              animate={{ width: `${score2Percent}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {score2Percent > score1Percent && (
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-2 bg-white/50 blur-sm"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* PK Result Overlay */}
      <AnimatePresence>
        {showResult && battle.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.8 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center px-6"
              onClick={e => e.stopPropagation()}
            >
              {winner ? (
                <>
                  <motion.div className="relative mb-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Crown className="w-20 h-20 text-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                    </motion.div>
                    {[...Array(6)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [0, (Math.random() - 0.5) * 80], y: [0, (Math.random() - 0.5) * 60] }}
                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                        className="absolute top-1/2 left-1/2 text-xl"
                      >
                        ✨
                      </motion.span>
                    ))}
                  </motion.div>
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 mb-3">PK KAZANANI!</h2>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                      {(winner === 'left' ? user1 : user2)?.image ? (
                        <Image src={(winner === 'left' ? user1 : user2)!.image!} alt="Winner" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-yellow-600 flex items-center justify-center text-white text-xl font-bold">
                          {((winner === 'left' ? user1 : user2)?.name || '?')[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-400">
                        {(winner === 'left' ? user1 : user2)?.name}
                      </p>
                      <p className="text-lg text-white">
                        {(winner === 'left' ? battle.score1 : battle.score2).toLocaleString()} puan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-gray-400 text-sm">
                    <span className="text-cyan-400 font-bold">{battle.score1.toLocaleString()}</span>
                    <span className="text-white/30">vs</span>
                    <span className="text-pink-400 font-bold">{battle.score2.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-black text-white mb-2">BERABERE!</h2>
                  <p className="text-gray-400">{battle.score1.toLocaleString()} - {battle.score2.toLocaleString()}</p>
                </>
              )}
              <button onClick={() => setShowResult(false)} className="mt-6 px-8 py-2.5 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition border border-white/10">
                Kapat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
