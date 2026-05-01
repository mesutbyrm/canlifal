'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Mic, MicOff, VideoOff, Crown, Wifi, WifiOff } from 'lucide-react'

export interface GridParticipant {
  id: string
  userId: string
  name: string
  image: string | null
  isHost: boolean
  isMuted: boolean
  isVideoOff: boolean
  isConnecting?: boolean
  isDisconnected?: boolean
}

interface StreamVideoGridProps {
  participants: GridParticipant[]
  videoRefs: Map<string, HTMLDivElement | null>
  onSetVideoRef: (userId: string, el: HTMLDivElement | null) => void
  hostMirror?: boolean // Mirror host video (front camera)
  className?: string
}

// Dynamic grid layout for 1-5 participants (host + max 4 guests)
export default function StreamVideoGrid({
  participants,
  videoRefs,
  onSetVideoRef,
  hostMirror = false,
  className = '',
}: StreamVideoGridProps) {
  const count = participants.length

  // Grid configuration based on participant count
  const getGridClass = () => {
    switch (count) {
      case 1:
        return 'grid-cols-1 grid-rows-1'
      case 2:
        return 'grid-cols-2 grid-rows-1'
      case 3:
        return 'grid-cols-2 grid-rows-2' // host takes left column full height
      case 4:
        return 'grid-cols-2 grid-rows-2'
      case 5:
        return 'grid-cols-3 grid-rows-2' // host wide on top
      default:
        return 'grid-cols-2 grid-rows-2'
    }
  }

  const getItemClass = (index: number) => {
    if (count === 1) return 'col-span-1 row-span-1'
    if (count === 3 && index === 0) return 'col-span-1 row-span-2' // host full height left
    if (count === 5 && index === 0) return 'col-span-3 row-span-1' // host full width top
    return 'col-span-1 row-span-1'
  }

  return (
    <div className={`grid gap-1 w-full h-full ${getGridClass()} ${className}`}>
      <AnimatePresence mode="popLayout">
        {participants.map((p, index) => (
          <motion.div
            key={p.userId}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-gray-900 rounded-xl overflow-hidden ${getItemClass(index)}`}
          >
            {/* Video container */}
            <div
              ref={(el) => onSetVideoRef(p.userId, el)}
              className="w-full h-full bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              style={{
                transform: p.isHost && hostMirror ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* Video off overlay */}
            {p.isVideoOff && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 to-black/90 flex flex-col items-center justify-center">
                {p.image ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500/50 mb-2">
                    <Image src={p.image} alt="" width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-2 border-2 border-purple-400/50">
                    <span className="text-white text-xl font-bold">{p.name?.[0] || '?'}</span>
                  </div>
                )}
                <VideoOff className="w-5 h-5 text-white/40 mt-1" />
              </div>
            )}

            {/* Connecting overlay */}
            {(p.isConnecting || p.isDisconnected) && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                {p.image ? (
                  <Image src={p.image} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover mb-2" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-2">
                    <span className="text-white font-bold">{p.name?.[0]}</span>
                  </div>
                )}
                <p className="text-white/60 text-xs mt-1">
                  {p.isDisconnected ? 'Yeniden bağlanıyor...' : 'Bağlanıyor...'}
                </p>
                <div className="mt-2 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Name badge */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                {p.image ? (
                  <Image src={p.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[7px] font-bold">{p.name?.[0]}</span>
                  </div>
                )}
                <p className="text-white text-[10px] font-medium truncate">{p.name}</p>
                {p.isHost && (
                  <div className="w-4 h-4 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-2.5 h-2.5 text-yellow-400" />
                  </div>
                )}
                {p.isMuted && (
                  <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Connection status dot */}
            <div className="absolute top-2 right-2 z-10">
              <span className={`text-[8px] ${
                p.isDisconnected ? 'text-red-400' :
                p.isConnecting ? 'text-yellow-400' :
                'text-green-400'
              }`}>●</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
