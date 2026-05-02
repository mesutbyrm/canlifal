'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Mic, MicOff, VideoOff, Crown, Plus, Eye } from 'lucide-react'

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
  maxSlots?: number // Total grid slots (e.g., 9 for 3x3, 12 for 4x3)
  videoRefs: Map<string, HTMLDivElement | null>
  onSetVideoRef: (userId: string, el: HTMLDivElement | null) => void
  onRequestJoin?: () => void // Called when viewer taps empty "Talep" slot
  hostMirror?: boolean
  className?: string
  isHost?: boolean // Is the current user the host (shows different empty slot behavior)
  hasRequested?: boolean // Has the viewer already sent a join request
}

// TikTok/Tango style grid layout with empty "Talep" slots
export default function StreamVideoGrid({
  participants,
  maxSlots = 9,
  videoRefs,
  onSetVideoRef,
  onRequestJoin,
  hostMirror = false,
  className = '',
  isHost = false,
  hasRequested = false,
}: StreamVideoGridProps) {
  const host = participants.find(p => p.isHost)
  const guests = participants.filter(p => !p.isHost)
  const guestSlots = maxSlots - 1 // Slots available for guests (minus host)

  // Determine grid columns based on maxSlots
  const getCols = () => {
    if (maxSlots <= 4) return 2
    if (maxSlots <= 9) return 3
    return 4
  }
  const cols = getCols()

  // Host takes larger space (2 cols if 3-col grid, or 2 cols in 4-col grid)
  const hostColSpan = cols >= 3 ? 2 : 1
  const hostRowSpan = 2

  return (
    <div className={`w-full h-full flex flex-col gap-1 ${className}`}>
      {/* Top row: Host (large) + first guest slots */}
      <div className="flex-1 flex gap-1" style={{ minHeight: 0 }}>
        {/* Host slot */}
        <div className="relative flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-cyan-500/30" 
          style={{ width: `${(hostColSpan / cols) * 100}%` }}
        >
          {host ? (
            <>
              {/* Host video container */}
              <div
                ref={(el) => onSetVideoRef(host.userId, el)}
                className="w-full h-full bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
                style={{ transform: hostMirror ? 'scaleX(-1)' : 'none' }}
              />

              {/* Video off overlay - show profile photo */}
              {host.isVideoOff && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-cyan-500/50 mb-2">
                    {host.image ? (
                      <Image src={host.image} alt="" width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">{host.name?.[0] || '?'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* "Davet sahibi" label - top left */}
              <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
                  <span className="text-[10px]">🔒</span>
                  <span className="text-white text-[10px] font-medium">Davet sahibi</span>
                </div>
              </div>

              {/* Host name badge - bottom */}
              <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                  {host.image ? (
                    <Image src={host.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[7px] font-bold">{host.name?.[0]}</span>
                    </div>
                  )}
                  <p className="text-white text-[10px] font-bold truncate">{host.name}</p>
                  {host.isMuted && <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/30 text-sm">Host</span>
            </div>
          )}
        </div>

        {/* First column of guest slots (next to host) */}
        <div className="flex-1 flex flex-col gap-1" style={{ minHeight: 0 }}>
          {Array.from({ length: hostRowSpan }).map((_, i) => {
            const guest = guests[i]
            return (
              <div key={guest?.userId || `empty-top-${i}`} className="flex-1 min-h-0">
                {guest ? (
                  <GuestSlot
                    guest={guest}
                    onSetVideoRef={onSetVideoRef}
                  />
                ) : (
                  <EmptySlot
                    onRequestJoin={onRequestJoin}
                    isHost={isHost}
                    hasRequested={hasRequested}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Additional column if 4-col grid */}
        {cols >= 4 && (
          <div className="flex-1 flex flex-col gap-1" style={{ minHeight: 0 }}>
            {Array.from({ length: hostRowSpan }).map((_, i) => {
              const guestIdx = hostRowSpan + i
              const guest = guests[guestIdx]
              return (
                <div key={guest?.userId || `empty-top-extra-${i}`} className="flex-1 min-h-0">
                  {guest ? (
                    <GuestSlot
                      guest={guest}
                      onSetVideoRef={onSetVideoRef}
                    />
                  ) : (
                    <EmptySlot
                      onRequestJoin={onRequestJoin}
                      isHost={isHost}
                      hasRequested={hasRequested}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Remaining rows of guest slots */}
      {(() => {
        const topGuestsCount = cols >= 4 ? hostRowSpan * 2 : hostRowSpan
        const remainingSlots = guestSlots - topGuestsCount
        if (remainingSlots <= 0) return null

        const rows: number[][] = []
        let slotIdx = topGuestsCount
        while (slotIdx < guestSlots) {
          const row: number[] = []
          for (let c = 0; c < cols && slotIdx < guestSlots; c++) {
            row.push(slotIdx)
            slotIdx++
          }
          rows.push(row)
        }

        return rows.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex gap-1" style={{ flex: '0 0 auto', height: `${100 / (Math.ceil(guestSlots / cols) + hostRowSpan) * 100 / 100}%`, minHeight: '80px' }}>
            {row.map((si) => {
              const guest = guests[si]
              return (
                <div key={guest?.userId || `empty-${si}`} className="flex-1 min-h-0">
                  {guest ? (
                    <GuestSlot
                      guest={guest}
                      onSetVideoRef={onSetVideoRef}
                    />
                  ) : (
                    <EmptySlot
                      onRequestJoin={onRequestJoin}
                      isHost={isHost}
                      hasRequested={hasRequested}
                    />
                  )}
                </div>
              )
            })}
            {/* Fill remaining cols if row is not full */}
            {row.length < cols && Array.from({ length: cols - row.length }).map((_, fi) => (
              <div key={`fill-${rowIdx}-${fi}`} className="flex-1" />
            ))}
          </div>
        ))
      })()}
    </div>
  )
}

// Guest slot with profile photo, viewer count, mute indicator
function GuestSlot({
  guest,
  onSetVideoRef,
}: {
  guest: GridParticipant
  onSetVideoRef: (userId: string, el: HTMLDivElement | null) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden"
    >
      {/* Video container */}
      <div
        ref={(el) => onSetVideoRef(guest.userId, el)}
        className="w-full h-full bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
      />

      {/* Profile photo overlay (when video is off or always for profile-style) */}
      {guest.isVideoOff && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
            {guest.image ? (
              <Image src={guest.image} alt="" width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <span className="text-white text-xl font-bold">{guest.name?.[0] || '?'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connecting/Disconnected overlay */}
      {(guest.isConnecting || guest.isDisconnected) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 mb-2">
            {guest.image ? (
              <Image src={guest.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold">{guest.name?.[0]}</span>
              </div>
            )}
          </div>
          <p className="text-white/60 text-[10px]">
            {guest.isDisconnected ? 'Bağlantı koptu...' : 'Bağlanıyor...'}
          </p>
          <div className="mt-1 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Viewer count - top left */}
      {typeof guest.viewerCount === 'number' && guest.viewerCount > 0 && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
            <Eye className="w-3 h-3 text-green-400" />
            <span className="text-white text-[10px] font-bold">
              {guest.viewerCount >= 1000 ? `${(guest.viewerCount / 1000).toFixed(1)}K` : guest.viewerCount}
            </span>
          </div>
        </div>
      )}

      {/* Name + mute badge - bottom */}
      <div className="absolute bottom-1 left-1 right-1 z-10">
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
          {guest.image ? (
            <Image src={guest.image} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[6px] font-bold">{guest.name?.[0]}</span>
            </div>
          )}
          <p className="text-white text-[9px] font-medium truncate flex-1">{guest.name}</p>
          {guest.isMuted ? (
            <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
          ) : (
            <span className="flex-shrink-0">➕</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Empty slot with "Talep" button
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
      className="w-full h-full bg-gray-800/80 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700/80 transition-colors border border-white/5"
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
          <Plus className="w-7 h-7 text-white/40 mb-1" />
          <span className="text-white/40 text-xs font-medium">
            {isHost ? 'Boş' : 'Talep'}
          </span>
        </>
      )}
    </motion.div>
  )
}
