'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Swords, Timer, Crown, X } from 'lucide-react'
import {
  fetchAgoraToken,
  createAgoraClient,
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
} from '@/lib/agora-client'

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
  /** Called with the div element for the current stream's video */
  onMyVideoRef: (el: HTMLDivElement | null) => void
}

export default function PKBattleView({ battle, currentStreamId, onMyVideoRef }: PKBattleViewProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [prevScore1, setPrevScore1] = useState(battle.score1)
  const [prevScore2, setPrevScore2] = useState(battle.score2)
  const [flashSide, setFlashSide] = useState<'left' | 'right' | null>(null)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const opponentClientRef = useRef<IAgoraRTCClient | null>(null)
  const opponentVideoRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const myVideoCallbackRef = useRef<((el: HTMLDivElement | null) => void) | null>(null)

  // Determine sides
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

  // Flash animation on score change
  useEffect(() => {
    if (battle.score1 > prevScore1) {
      setFlashSide(isStream1 ? 'left' : 'right')
      setTimeout(() => setFlashSide(null), 600)
    }
    if (battle.score2 > prevScore2) {
      setFlashSide(isStream1 ? 'right' : 'left')
      setTimeout(() => setFlashSide(null), 600)
    }
    setPrevScore1(battle.score1)
    setPrevScore2(battle.score2)
  }, [battle.score1, battle.score2, prevScore1, prevScore2, isStream1])

  // Show result on completion
  useEffect(() => {
    if (battle.status === 'completed') setShowResult(true)
  }, [battle.status])

  // Join the opponent's Agora channel
  useEffect(() => {
    if (!opponentStreamId || battle.status === 'completed') return
    mountedRef.current = true
    let client: IAgoraRTCClient | null = null

    const joinOpponent = async () => {
      try {
        client = await createAgoraClient('audience')
        opponentClientRef.current = client

        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
          await client!.subscribe(user, mediaType)
          if (mediaType === 'video' && opponentVideoRef.current) {
            user.videoTrack?.play(opponentVideoRef.current)
            if (mountedRef.current) setOpponentConnected(true)
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play()
          }
        })

        client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
          if (mediaType === 'video') user.videoTrack?.stop()
        })

        const channelName = `stream_${opponentStreamId}`
        const { token, uid, appId } = await fetchAgoraToken(channelName, 'audience')
        await client.join(appId, channelName, token, uid)
        console.log('🎮 PK: Joined opponent channel:', channelName)
      } catch (err) {
        console.error('PK: Failed to join opponent:', err)
      }
    }

    joinOpponent()

    return () => {
      mountedRef.current = false
      if (client) {
        client.leave().catch(() => {})
        opponentClientRef.current = null
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

  const winner = battle.winnerId === battle.user1Id
    ? (isStream1 ? 'left' : 'right')
    : battle.winnerId === battle.user2Id
      ? (isStream1 ? 'right' : 'left')
      : null

  // WIN multiplier
  const winMultiplier = (() => {
    if (totalScore === 0) return null
    const ratio = Math.max(myScore, opponentScore) / Math.max(1, Math.min(myScore, opponentScore))
    return Math.min(Math.floor(ratio), 99)
  })()

  // Ref callback for my video container
  const myVideoRefCallback = useCallback((el: HTMLDivElement | null) => {
    onMyVideoRef(el)
  }, [onMyVideoRef])

  return (
    <div className="absolute inset-0 flex flex-col bg-black z-[2]">
      {/* ===== PK SCORE BAR at top ===== */}
      <div className="relative flex-shrink-0">
        {/* Colored progress bar */}
        <div className="flex h-1.5">
          <motion.div
            className="bg-gradient-to-r from-cyan-500 to-cyan-400"
            animate={{ width: `${myPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
          <motion.div
            className="bg-gradient-to-r from-pink-400 to-pink-500"
            animate={{ width: `${opponentPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>

        {/* Score numbers + timer */}
        <div className="flex items-center justify-between px-3 py-1 bg-black/80">
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-black ${myScore >= opponentScore ? 'text-cyan-400' : 'text-cyan-400/50'}`}>
              {myScore}
            </span>
            {myScore > opponentScore && winMultiplier && winMultiplier > 1 && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-1 rounded">
                WIN x{winMultiplier}
              </span>
            )}
          </div>

          {battle.status === 'active' && (
            <motion.div
              animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isUrgent ? 'bg-red-600 text-white' : 'bg-white/10 text-white/80'
              }`}
            >
              <span className="text-pink-400">💎</span>
              {formatTime(timeLeft)}
            </motion.div>
          )}

          <div className="flex items-center gap-1.5">
            {opponentScore > myScore && winMultiplier && winMultiplier > 1 && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-1 rounded">
                WIN x{winMultiplier}
              </span>
            )}
            <span className={`text-lg font-black ${opponentScore >= myScore ? 'text-pink-400' : 'text-pink-400/50'}`}>
              {opponentScore}
            </span>
          </div>
        </div>
      </div>

      {/* ===== SIDE BY SIDE VIDEOS ===== */}
      <div className="flex-1 flex relative min-h-0">
        {/* Left - Current stream host */}
        <div className={`flex-1 relative bg-gray-900 overflow-hidden border-r border-white/10 ${
          flashSide === 'left' ? 'ring-2 ring-cyan-400 ring-inset' : ''
        }`}>
          <div
            ref={myVideoRefCallback}
            className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Name badge */}
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
            {myUser?.image && (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-cyan-400">
                <Image src={myUser.image} alt="" width={20} height={20} className="w-full h-full object-cover" />
              </div>
            )}
            <span className="text-white text-[10px] font-medium truncate max-w-[60px]">
              {myUser?.name || '...'}
            </span>
          </div>
        </div>

        {/* Right - Opponent stream */}
        <div className={`flex-1 relative bg-gray-900 overflow-hidden ${
          flashSide === 'right' ? 'ring-2 ring-pink-400 ring-inset' : ''
        }`}>
          <div
            ref={opponentVideoRef}
            className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Loading state */}
          {!opponentConnected && battle.status === 'active' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-500 mb-2">
                {opponentUser?.image ? (
                  <Image src={opponentUser.image} alt={opponentUser.name || ''} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-pink-600 flex items-center justify-center text-white text-lg font-bold">
                    {(opponentUser?.name || '?')[0]}
                  </div>
                )}
              </div>
              <p className="text-white/60 text-xs">Bağlanıyor...</p>
            </div>
          )}

          {/* Name badge */}
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="text-white text-[10px] font-medium truncate max-w-[60px]">
              {opponentUser?.name || '...'}
            </span>
            {opponentUser?.image && (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-pink-400">
                <Image src={opponentUser.image} alt="" width={20} height={20} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Center VS badge */}
        {battle.status === 'active' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/40"
            >
              <Swords className="w-4 h-4 text-white" />
            </motion.div>
          </div>
        )}
      </div>

      {/* ===== PK RESULT OVERLAY ===== */}
      <AnimatePresence>
        {showResult && battle.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center px-6"
              onClick={e => e.stopPropagation()}
            >
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
                      {(winner === 'left' ? myUser : opponentUser)?.image ? (
                        <Image src={(winner === 'left' ? myUser : opponentUser)!.image!} alt="Winner" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-yellow-600 flex items-center justify-center text-white text-xl font-bold">
                          {((winner === 'left' ? myUser : opponentUser)?.name || '?')[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-400">
                        {(winner === 'left' ? myUser : opponentUser)?.name}
                      </p>
                      <p className="text-lg text-white">
                        {winner === 'left' ? myScore : opponentScore} puan
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {myScore} - {opponentScore}
                  </div>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-black text-white mb-2">BERABERE!</h2>
                  <p className="text-gray-400">{myScore} - {opponentScore}</p>
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
