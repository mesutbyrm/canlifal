'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, Users,
  X, ChevronDown, ChevronUp, Shield, Volume2, VolumeX,
  Eye, EyeOff, Crown, Loader2
} from 'lucide-react'

export interface GuestInfo {
  id: string
  odId: string // co-broadcaster record id
  odUserId: string // actual userId
  name: string
  image: string | null
  isMuted: boolean
  isVideoOff: boolean
  status: string // 'active' | 'requested' | 'invited'
}

interface PendingRequest {
  id: string
  userId: string
  name: string
  image: string | null
}

interface HostControlPanelProps {
  streamId: string
  guests: GuestInfo[]
  pendingRequests: PendingRequest[]
  maxGuests: number
  onAcceptRequest: (userId: string) => void
  onRejectRequest: (userId: string) => void
  onMuteGuest: (userId: string) => void
  onUnmuteGuest: (userId: string) => void
  onVideoOffGuest: (userId: string) => void
  onVideoOnGuest: (userId: string) => void
  onKickGuest: (userId: string) => void
  onInviteViewer: () => void
  onClose: () => void
  isVisible: boolean
}

export default function HostControlPanel({
  streamId,
  guests,
  pendingRequests,
  maxGuests,
  onAcceptRequest,
  onRejectRequest,
  onMuteGuest,
  onUnmuteGuest,
  onVideoOffGuest,
  onVideoOnGuest,
  onKickGuest,
  onInviteViewer,
  onClose,
  isVisible,
}: HostControlPanelProps) {
  const [expandedGuest, setExpandedGuest] = useState<string | null>(null)
  const [kickConfirm, setKickConfirm] = useState<string | null>(null)

  const activeGuests = guests.filter(g => g.status === 'active')

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 bottom-0 w-[300px] sm:w-[340px] z-40 flex flex-col"
        >
          <div className="flex-1 bg-black/80 backdrop-blur-xl border-l border-purple-500/20 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-bold text-sm">Yayıncı Kontrolleri</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative">
                    <UserPlus className="w-4 h-4 text-yellow-400" />
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                      {pendingRequests.length}
                    </span>
                  </div>
                  <span className="text-yellow-400 text-xs font-semibold">Katılma İstekleri</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2">
                      {req.image ? (
                        <Image src={req.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{req.name?.[0]}</span>
                        </div>
                      )}
                      <span className="text-white text-xs font-medium flex-1 truncate">{req.name}</span>
                      <button
                        onClick={() => onAcceptRequest(req.userId)}
                        className="px-2.5 py-1 bg-green-500/80 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        Kabul
                      </button>
                      <button
                        onClick={() => onRejectRequest(req.userId)}
                        className="px-2.5 py-1 bg-red-500/60 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        Reddet
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Guests */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-white/80 text-xs font-semibold">Misafirler</span>
                </div>
                <span className="text-white/40 text-[10px]">{activeGuests.length}/{maxGuests}</span>
              </div>

              {activeGuests.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-xs">Henüz misafir yok</p>
                  <p className="text-white/30 text-[10px] mt-1">İzleyiciler katılma isteği gönderebilir</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeGuests.map(guest => (
                    <div key={guest.odUserId} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {/* Guest Header */}
                      <div className="flex items-center gap-2 p-2.5">
                        {guest.image ? (
                          <Image src={guest.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{guest.name?.[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{guest.name}</p>
                          <p className="text-green-400 text-[10px]">● Yayında</p>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => guest.isMuted ? onUnmuteGuest(guest.odUserId) : onMuteGuest(guest.odUserId)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              guest.isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                            title={guest.isMuted ? 'Sesi Aç' : 'Sesini Kapat'}
                          >
                            {guest.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => guest.isVideoOff ? onVideoOnGuest(guest.odUserId) : onVideoOffGuest(guest.odUserId)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              guest.isVideoOff ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                            title={guest.isVideoOff ? 'Kamerayı Aç' : 'Kamerayı Kapat'}
                          >
                            {guest.isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                          </button>
                          {kickConfirm === guest.odUserId ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { onKickGuest(guest.odUserId); setKickConfirm(null) }}
                                className="px-2 py-1 bg-red-500 text-white text-[9px] font-bold rounded-md"
                              >
                                Evet
                              </button>
                              <button
                                onClick={() => setKickConfirm(null)}
                                className="px-2 py-1 bg-white/10 text-white text-[9px] rounded-md"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setKickConfirm(guest.odUserId)}
                              className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-red-500/30 hover:text-red-400 transition-colors"
                              title="Yayından At"
                            >
                              <PhoneOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Action */}
            {activeGuests.length < maxGuests && (
              <div className="px-4 py-3 border-t border-white/10">
                <button
                  onClick={onInviteViewer}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <UserPlus className="w-4 h-4" />
                  İzleyici Davet Et
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
