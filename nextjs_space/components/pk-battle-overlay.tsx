'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Swords, Trophy, Timer, Crown, Flame, X } from 'lucide-react'

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
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate time left
  useEffect(() => {
    if (battle.status !== 'active' || !battle.startedAt) return

    const calcTimeLeft = () => {
      const started = new Date(battle.startedAt!).getTime()
      const elapsed = Math.floor((Date.now() - started) / 1000)
      const remaining = Math.max(0, battle.duration - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0 && battle.status === 'active') {
        onEnd?.()
      }
    }

    calcTimeLeft()
    timerRef.current = setInterval(calcTimeLeft, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [battle.startedAt, battle.duration, battle.status, onEnd])

  // Flash animation on score change
  useEffect(() => {
    if (battle.score1 > prevScore1) {
      setFlashSide('left')
      setTimeout(() => setFlashSide(null), 600)
    }
    if (battle.score2 > prevScore2) {
      setFlashSide('right')
      setTimeout(() => setFlashSide(null), 600)
    }
    setPrevScore1(battle.score1)
    setPrevScore2(battle.score2)
  }, [battle.score1, battle.score2, prevScore1, prevScore2])

  // Show result when completed
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
  const user1 = battle.user1
  const user2 = battle.user2

  const isMyStream1 = battle.stream1Id === currentStreamId

  // Determine winner
  const winner = battle.winnerId === battle.user1Id ? 'left' : 
                 battle.winnerId === battle.user2Id ? 'right' : null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
      {/* PK Header Bar */}
      <div className="pointer-events-auto mx-2 mt-14">
        <div className="relative rounded-xl bg-black/70 backdrop-blur-md border border-yellow-500/30 overflow-hidden">
          {/* VS Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10">
            <motion.div
              animate={battle.status === 'active' ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-0.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-b-lg shadow-lg"
            >
              <Swords className="w-3 h-3" />
              PK
            </motion.div>
          </div>

          {/* Timer */}
          {battle.status === 'active' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-5 z-10">
              <motion.div
                animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-black/60 text-yellow-400'
                }`}
              >
                <Timer className="w-3 h-3" />
                {formatTime(timeLeft)}
              </motion.div>
            </div>
          )}

          {/* Two sides */}
          <div className="flex items-center px-2 pt-6 pb-2">
            {/* Left - User 1 */}
            <div className={`flex-1 flex items-center gap-2 ${flashSide === 'left' ? 'animate-pulse' : ''}`}>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500 shrink-0">
                {user1?.image ? (
                  <Image src={user1.image} alt={user1.name || 'User'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user1?.name || '?')[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-400 truncate max-w-[70px]">{user1?.name || '...'}</p>
                <p className="text-sm font-black text-blue-300">
                  {battle.score1.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Right - User 2 */}
            <div className={`flex-1 flex items-center gap-2 justify-end ${flashSide === 'right' ? 'animate-pulse' : ''}`}>
              <div className="min-w-0 text-right">
                <p className="text-[10px] text-red-400 truncate max-w-[70px] ml-auto">{user2?.name || '...'}</p>
                <p className="text-sm font-black text-red-300">
                  {battle.score2.toLocaleString()}
                </p>
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-red-500 shrink-0">
                {user2?.image ? (
                  <Image src={user2.image} alt={user2.name || 'User'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user2?.name || '?')[0]}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 flex mx-2 mb-2 rounded-full overflow-hidden bg-gray-800">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-blue-400 relative"
              animate={{ width: `${score1Percent}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {score1Percent > score2Percent && (
                <motion.div
                  className="absolute right-0 top-0 bottom-0 w-1 bg-white/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </motion.div>
            <motion.div
              className="bg-gradient-to-r from-red-400 to-red-600 relative"
              animate={{ width: `${score2Percent}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {score2Percent > score1Percent && (
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-white/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
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
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="text-center px-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Winner announcement */}
              {winner ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="mb-4"
                  >
                    <Crown className="w-16 h-16 text-yellow-400 mx-auto" />
                  </motion.div>
                  <h2 className="text-3xl font-black text-white mb-2">PK KAZANANI!</h2>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-yellow-500">
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
                        {winner === 'left' ? battle.score1 : battle.score2} puan
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {battle.score1.toLocaleString()} - {battle.score2.toLocaleString()}
                  </div>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-black text-white mb-2">BERABERE!</h2>
                  <p className="text-gray-400">{battle.score1.toLocaleString()} - {battle.score2.toLocaleString()}</p>
                </>
              )}

              <button
                onClick={() => setShowResult(false)}
                className="mt-6 px-6 py-2 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition"
              >
                Kapat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
