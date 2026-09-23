'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Mic, MicOff, VideoOff, Crown, Plus, Eye, Camera, CameraOff } from 'lucide-react'

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
  viewerCount?: number
}

interface StreamVideoGridProps {
  participants: GridParticipant[]
  maxSlots?: number
  videoRefs: Map<string, HTMLDivElement | null>
  onSetVideoRef: (userId: string, el: HTMLDivElement | null) => void
  onRequestJoin?: () => void
  onParticipantClick?: (participant: GridParticipant) => void
  hostMirror?: boolean
  className?: string
  isHost?: boolean
  hasRequested?: boolean
}

/**
 * Dynamic TikTok Live style grid:
 * 1 person  → full screen
 * 2 people  → 50/50 side by side
 * 3 people  → top: 2, bottom: 1 (full width)
 * 4 people  → 2x2 grid
 * 5 people  → top: 2, bottom: 3
 * 6 people  → 3x2 grid (2 rows of 3)
 * 7+ people → 3-col grid with remaining rows
 */
export default function StreamVideoGrid({
  participants,
  maxSlots = 9,
  videoRefs,
  onSetVideoRef,
  onRequestJoin,
  onParticipantClick,
  hostMirror = false,
  className = '',
  isHost = false,
  hasRequested = false,
}: StreamVideoGridProps) {
  const count = participants.length
  const emptySlots = Math.max(0, Math.min(maxSlots, 6) - count)

  // Determine layout rows based on participant count
  const getLayout = (): number[][] => {
    const allItems = [
      ...participants.map((_, i) => i),
      ...Array.from({ length: emptySlots }, (_, i) => -(i + 1)), // negative = empty
    ]
    const total = allItems.length

    if (total <= 1) return [allItems]
    if (total === 2) return [allItems] // 1 row, 2 cols
    if (total === 3) return [allItems.slice(0, 2), allItems.slice(2)] // 2 top, 1 bottom
    if (total === 4) return [allItems.slice(0, 2), allItems.slice(2, 4)] // 2x2
    if (total === 5) return [allItems.slice(0, 2), allItems.slice(2, 5)] // 2 top, 3 bottom
    if (total === 6) return [allItems.slice(0, 3), allItems.slice(3, 6)] // 3x2
    // 7+: fill 3-col rows
    const rows: number[][] = []
    for (let i = 0; i < total; i += 3) {
      rows.push(allItems.slice(i, i + 3))
    }
    return rows
  }

  const layout = getLayout()

  return (
    <div className={`w-full h-full flex flex-col gap-1 ${className}`}>
      {layout.map((row, rowIdx) => (
        <div key={rowIdx} className="flex-1 flex gap-1" style={{ minHeight: 0 }}>
          {row.map((itemIdx) => {
            if (itemIdx < 0) {
              // Empty slot
              return (
                <div key={`empty-${itemIdx}`} className="flex-1 min-h-0">
                  <EmptySlot
                    onRequestJoin={onRequestJoin}
                    isHost={isHost}
                    hasRequested={hasRequested}
                  />
                </div>
              )
            }
            const p = participants[itemIdx]
            if (!p) return null
            return (
              <div key={p.userId} className="flex-1 min-h-0">
                <ParticipantSlot
                  participant={p}
                  onSetVideoRef={onSetVideoRef}
                  mirror={p.isHost && hostMirror}
                  onClick={() => onParticipantClick?.(p)}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Single participant video slot
function ParticipantSlot({
  participant: p,
  onSetVideoRef,
  mirror,
  onClick,
}: {
  participant: GridParticipant
  onSetVideoRef: (userId: string, el: HTMLDivElement | null) => void
  mirror: boolean
  onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden"
    >
      {/* Video container */}
      <div
        ref={(el) => onSetVideoRef(p.userId, el)}
        className="w-full h-full bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
      />

      {/* Video off overlay */}
      {p.isVideoOff && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center">
          <div className={`rounded-full overflow-hidden border-2 mb-2 ${
            p.isHost ? 'w-20 h-20 border-cyan-500/50' : 'w-16 h-16 border-white/20'
          }`}>
            {p.image ? (
              <Image src={p.image} alt="" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{p.name?.[0] || '?'}</span>
              </div>
            )}
          </div>
          <CameraOff className="w-4 h-4 text-white/30 mt-1" />
        </div>
      )}

      {/* Connecting/Disconnected overlay */}
      {(p.isConnecting || p.isDisconnected) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 mb-2">
            {p.image ? (
              <Image src={p.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold">{p.name?.[0]}</span>
              </div>
            )}
          </div>
          <p className="text-white/60 text-[10px]">
            {p.isDisconnected ? 'Bağlantı koptu...' : 'Bağlanıyor...'}
          </p>
          <div className="mt-1 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Host badge - top left */}
      {p.isHost && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-300 text-[10px] font-semibold">Host</span>
          </div>
        </div>
      )}

      {/* Viewer count - top right (if available) */}
      {typeof p.viewerCount === 'number' && p.viewerCount > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            <Eye className="w-3 h-3 text-green-400" />
            <span className="text-white text-[10px] font-bold">
              {p.viewerCount >= 1000 ? `${(p.viewerCount / 1000).toFixed(1)}K` : p.viewerCount}
            </span>
          </div>
        </div>
      )}

      {/* Name + audio/video status - bottom (clickable for profile) */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
          {p.image ? (
            <Image src={p.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[7px] font-bold">{p.name?.[0]}</span>
            </div>
          )}
          <p className="text-white text-[10px] font-medium truncate flex-1">{p.name}</p>
          {/* Mic status */}
          {p.isMuted ? (
            <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
          ) : (
            <Mic className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
          {/* Camera status */}
          {p.isVideoOff && (
            <VideoOff className="w-3 h-3 text-red-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Empty slot with join request
function EmptySlot({
  onRequestJoin,
  isHost,
  hasRequested,
}: {
  onRequestJoin?: () => void
  isHost: boolean
  hasRequested: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full bg-gray-800/60 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700/60 transition-colors border border-dashed border-white/10"
      onClick={() => {
        if (!isHost && onRequestJoin && !hasRequested) {
          onRequestJoin()
        }
      }}
    >
      {hasRequested ? (
        <>
          <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-1.5">
            <span className="text-green-400 text-lg">✓</span>
          </div>
          <span className="text-green-400 text-xs font-medium">Bekleniyor</span>
        </>
      ) : (
        <>
          <Plus className="w-7 h-7 text-white/30 mb-1" />
          <span className="text-white/30 text-xs font-medium">
            {isHost ? 'Boş' : 'Katıl'}
          </span>
        </>
      )}
    </motion.div>
  )
}
