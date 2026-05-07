'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Swords, Timer, Crown, Flame, Trophy, Zap } from 'lucide-react'

interface PKUser {
  id: string
  name: string | null
  image: string | null
}

export interface PKBattleData {
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

interface PKBattleViewProps {
  battle: PKBattleData
  currentStreamId: string
  onMyVideoRef: (el: HTMLDivElement | null) => void
}

export default function PKBattleView({ battle, currentStreamId, onMyVideoRef }: PKBattleViewProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [prevScore1, setPrevScore1] = useState(battle.score1)
  const [prevScore2, setPrevScore2] = useState(battle.score2)
  const [flashSide, setFlashSide] = useState<'left' | 'right' | null>(null)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [scorePopup, setScorePopup] = useState<{ side: 'left' | 'right'; amount: number } | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const opponentTrtcRef = useRef<any>(null)
  const opponentVideoRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  const isStream1 = currentStreamId === battle.stream1Id
  const myUser = isStream1 ? battle.user1 : battle.user2
  const opponentUser = isStream1 ? battle.user2 : battle.user1
  const myScore = isStream1 ? battle.score1 : battle.score2
  const opponentScore = isStream1 ? battle.score2 : battle.score1
  const opponentStreamId = isStream1 ? battle.stream2Id : battle.stream1Id

  // Timer
  useEffect(() => {
    if (battle.status !== 'active' || !battle.startedAt) return
    const calcTimeLeft = () => {
      const started = new Date(battle.startedAt!).getTime()
      const elapsed = Math.floor((Date.now() - started) / 1000)
      setTimeLeft(Math.max(0, battle.duration - elapsed))
    }
    calcTimeLeft()
    timerRef.current = setInterval(calcTimeLeft, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [battle.startedAt, battle.duration, battle.status])

  // Score change flash + popup
  useEffect(() => {
    const s1diff = battle.score1 - prevScore1
    const s2diff = battle.score2 - prevScore2
    
    if (s1diff > 0) {
      const side = isStream1 ? 'left' : 'right'
      setFlashSide(side)
      setScorePopup({ side, amount: s1diff })
      setTimeout(() => { setFlashSide(null); setScorePopup(null) }, 1200)
    }
    if (s2diff > 0) {
      const side = isStream1 ? 'right' : 'left'
      setFlashSide(side)
      setScorePopup({ side, amount: s2diff })
      setTimeout(() => { setFlashSide(null); setScorePopup(null) }, 1200)
    }
    setPrevScore1(battle.score1)
    setPrevScore2(battle.score2)
  }, [battle.score1, battle.score2, prevScore1, prevScore2, isStream1])

  // Show result
  useEffect(() => {
    if (battle.status === 'completed') setShowResult(true)
  }, [battle.status])

  // Join opponent stream via TRTC
  useEffect(() => {
    if (!opponentStreamId || battle.status === 'completed') return
    mountedRef.current = true
    let trtcInstance: any = null

    const joinOpponent = async () => {
      try {
        const { createTRTCInstance, fetchTRTCCredentials, enterRoom, startRemoteVideo, getTRTCEvent } = await import('@/lib/trtc-client')
        const TRTCModule = (await import('trtc-sdk-v5')).default
        
        trtcInstance = await createTRTCInstance()
        opponentTrtcRef.current = trtcInstance

        const EVENT = await getTRTCEvent()

        trtcInstance.on(EVENT.REMOTE_VIDEO_AVAILABLE, async ({ userId }: { userId: string }) => {
          if (opponentVideoRef.current && mountedRef.current) {
            await startRemoteVideo(trtcInstance, userId, opponentVideoRef.current)
            if (mountedRef.current) setOpponentConnected(true)
          }
        })

        trtcInstance.on(EVENT.REMOTE_AUDIO_AVAILABLE, async ({ userId }: { userId: string }) => {
          try {
            await trtcInstance.startRemoteAudio({ userId })
          } catch {}
        })

        const roomId = `stream_${opponentStreamId}`
        const viewerId = `pk_viewer_${Date.now()}`
        const credentials = await fetchTRTCCredentials(viewerId, roomId)
        await enterRoom(trtcInstance, credentials, roomId, 'audience', 'live')
        console.log('🎮 PK: Joined opponent TRTC channel:', roomId)
      } catch (err) {
        console.error('PK: Failed to join opponent:', err)
      }
    }

    joinOpponent()

    return () => {
      mountedRef.current = false
      if (trtcInstance) {
        import('@/lib/trtc-client').then(({ exitRoom }) => {
          exitRoom(trtcInstance).catch(() => {})
        })
        opponentTrtcRef.current = null
      }
    }
  }, [opponentStreamId, battle.status])

  const totalScore = myScore + opponentScore
  const myPercent = totalScore > 0 ? (myScore / totalScore) * 100 : 50
  const opponentPercent = totalScore > 0 ? (opponentScore / totalScore) * 100 : 50

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const isUrgent = timeLeft <= 30 && timeLeft > 0
  const isCritical = timeLeft <= 10 && timeLeft > 0

  const winner = battle.winnerId === battle.user1Id
    ? (isStream1 ? 'left' : 'right')
    : battle.winnerId === battle.user2Id
      ? (isStream1 ? 'right' : 'left')
      : null

  const myVideoRefCallback = useCallback((el: HTMLDivElement | null) => {
    onMyVideoRef(el)
  }, [onMyVideoRef])

  return (
    <div className="absolute inset-0 flex flex-col bg-black z-[2]">
      {/* ═════ PK SCORE BAR - Enhanced ═════ */}
      <div className="relative flex-shrink-0 bg-black">
        {/* User info row */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          {/* My side */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-cyan-400 shrink-0">
              {myUser?.image ? (
                <Image src={myUser.image} alt="" width={28} height={28} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-cyan-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {(myUser?.name || '?')[0]}
                </div>
              )}
            </div>
            <span className="text-white/80 text-xs font-medium truncate max-w-[60px]">{myUser?.name || '...'}</span>
          </div>

          {/* VS / Timer center */}
          <div className="flex flex-col items-center">
            <motion.div
              animate={battle.status === 'active' ? { scale: [1, 1.15, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1"
            >
              <Swords className="w-4 h-4 text-red-500" />
              <span className="text-red-400 text-xs font-black">PK</span>
            </motion.div>
            {battle.status === 'active' && (
              <motion.div
                animate={isCritical ? { scale: [1, 1.2, 1], color: ['#ef4444', '#ffffff', '#ef4444'] } : isUrgent ? { scale: [1, 1.08, 1] } : {}}
                transition={{ repeat: Infinity, duration: isCritical ? 0.4 : 0.8 }}
                className={`flex items-center gap-0.5 text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded-full ${
                  isCritical ? 'bg-red-600/80 text-white' :
                  isUrgent ? 'bg-red-600/40 text-red-300' :
                  'bg-white/10 text-white/70'
                }`}
              >
                <Timer className="w-3 h-3" />
                {formatTime(timeLeft)}
              </motion.div>
            )}
          </div>

          {/* Opponent side */}
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-medium truncate max-w-[60px]">{opponentUser?.name || '...'}</span>
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-pink-400 shrink-0">
              {opponentUser?.image ? (
                <Image src={opponentUser.image} alt="" width={28} height={28} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-pink-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {(opponentUser?.name || '?')[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Score numbers */}
        <div className="flex items-center justify-between px-4 pb-1">
          <div className="flex items-center gap-1.5">
            <motion.span
              key={myScore}
              initial={{ scale: 1.5, color: '#06b6d4' }}
              animate={{ scale: 1, color: myScore >= opponentScore ? '#06b6d4' : '#06b6d488' }}
              className="text-xl font-black"
            >
              {myScore.toLocaleString()}
            </motion.span>
            {myScore > opponentScore && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-0.5 bg-cyan-500/20 rounded-full px-1.5 py-0.5"
              >
                <Flame className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] font-bold text-cyan-400">LEAD</span>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {opponentScore > myScore && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-0.5 bg-pink-500/20 rounded-full px-1.5 py-0.5"
              >
                <span className="text-[9px] font-bold text-pink-400">LEAD</span>
                <Flame className="w-3 h-3 text-pink-400" />
              </motion.div>
            )}
            <motion.span
              key={opponentScore}
              initial={{ scale: 1.5, color: '#ec4899' }}
              animate={{ scale: 1, color: opponentScore >= myScore ? '#ec4899' : '#ec489988' }}
              className="text-xl font-black"
            >
              {opponentScore.toLocaleString()}
            </motion.span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex h-2 mx-2 mb-1 rounded-full overflow-hidden bg-gray-800/80">
          <motion.div
            className="bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 relative"
            animate={{ width: `${myPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {myPercent > opponentPercent && (
              <motion.div
                className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-sm"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
          </motion.div>
          <motion.div
            className="bg-gradient-to-r from-pink-300 via-pink-400 to-pink-600 relative"
            animate={{ width: `${opponentPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {opponentPercent > myPercent && (
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-2 bg-white/50 blur-sm"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* ═════ SPLIT SCREEN VIDEOS ═════ */}
      <div className="flex-1 flex relative min-h-0">
        {/* Left - My stream */}
        <div className={`flex-1 relative bg-gray-900 overflow-hidden border-r border-white/5 ${
          flashSide === 'left' ? 'ring-2 ring-cyan-400/80 ring-inset' : ''
        }`}>
          <div
            ref={myVideoRefCallback}
            className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />
          {/* Score popup */}
          <AnimatePresence>
            {scorePopup?.side === 'left' && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], y: -60, scale: [0.5, 1.3, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 text-cyan-400 text-2xl font-black"
              >
                +{scorePopup.amount}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center VS Badge */}
        {battle.status === 'active' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/50 border-2 border-white/20"
            >
              <Swords className="w-5 h-5 text-white" />
            </motion.div>
          </div>
        )}

        {/* Right - Opponent stream */}
        <div className={`flex-1 relative bg-gray-900 overflow-hidden ${
          flashSide === 'right' ? 'ring-2 ring-pink-400/80 ring-inset' : ''
        }`}>
          <div
            ref={opponentVideoRef}
            className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {!opponentConnected && battle.status === 'active' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-500 mb-3">
                {opponentUser?.image ? (
                  <Image src={opponentUser.image} alt={opponentUser.name || ''} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-pink-600 flex items-center justify-center text-white text-xl font-bold">
                    {(opponentUser?.name || '?')[0]}
                  </div>
                )}
              </div>
              <p className="text-white/60 text-xs">Bağlanıyor...</p>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="mt-2 w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full"
              />
            </div>
          )}

          {/* Score popup */}
          <AnimatePresence>
            {scorePopup?.side === 'right' && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], y: -60, scale: [0.5, 1.3, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 text-pink-400 text-2xl font-black"
              >
                +{scorePopup.amount}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═════ PK RESULT OVERLAY ═════ */}
      <AnimatePresence>
        {showResult && battle.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.3, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center px-8"
              onClick={e => e.stopPropagation()}
            >
              {winner ? (
                <>
                  {/* Crown with sparkle effects */}
                  <motion.div className="relative mb-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Crown className="w-20 h-20 text-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                    </motion.div>
                    {/* Sparkle particles */}
                    {[...Array(6)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [0, (Math.random() - 0.5) * 100], y: [0, (Math.random() - 0.5) * 80] }}
                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                        className="absolute top-1/2 left-1/2 text-xl"
                      >
                        ✨
                      </motion.span>
                    ))}
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 mb-4"
                  >
                    PK KAZANANI!
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-4 mb-4"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-yellow-500 shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                        {(winner === 'left' ? myUser : opponentUser)?.image ? (
                          <Image src={(winner === 'left' ? myUser : opponentUser)!.image!} alt="Winner" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-yellow-600 flex items-center justify-center text-white text-2xl font-bold">
                            {((winner === 'left' ? myUser : opponentUser)?.name || '?')[0]}
                          </div>
                        )}
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1"
                      >
                        <Trophy className="w-4 h-4 text-white" />
                      </motion.div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">
                        {(winner === 'left' ? myUser : opponentUser)?.name}
                      </p>
                      <p className="text-xl text-white font-semibold">
                        {(winner === 'left' ? myScore : opponentScore).toLocaleString()} puan
                      </p>
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-center gap-3 text-gray-400 text-base">
                    <span className="text-cyan-400 font-bold">{myScore.toLocaleString()}</span>
                    <span className="text-white/30">vs</span>
                    <span className="text-pink-400 font-bold">{opponentScore.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Swords className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-3xl font-black text-white mb-3">BERABERE!</h2>
                  <div className="flex items-center justify-center gap-3 text-lg">
                    <span className="text-cyan-400 font-bold">{myScore.toLocaleString()}</span>
                    <span className="text-white/30">-</span>
                    <span className="text-pink-400 font-bold">{opponentScore.toLocaleString()}</span>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowResult(false)}
                className="mt-6 px-8 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition border border-white/10"
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
