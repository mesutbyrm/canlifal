'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/language-context'
import { MessageCircle, Users, Sparkles, Plus, X, Coins } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useSiteTheme } from '@/lib/theme-context'

interface RecentUser {
  id: string
  name: string | null
  image: string | null
}

interface ChatRoom {
  id: string
  slug: string
  nameEn: string
  nameTr: string
  descEn: string
  descTr: string
  icon: string
  messageCount: number
  onlineCount: number
  ownerId?: string | null
  owner?: { id: string; name: string | null; username: string | null } | null
  recentUsers: RecentUser[]
}

const ROOM_ICONS = ['🔮', '⭐', '🌙', '💬', '❤️', '🌟', '🔥', '🌌', '🧧', '🎭', '🎵', '🌺', '🦋', '👑', '💎', '🌈']

export default function ChatRoomsPage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', icon: '💬', paymentType: 'jeton' as 'jeton' | 'cfc' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [roomCost, setRoomCost] = useState(100)

  const isFalclub = theme === 'falclub'
  const isFalci = theme === 'falci'
  const isCosmic = theme === 'cosmic'

  useEffect(() => {
    fetchRooms()
    fetchRoomCost()
    // Daha sık güncelleme - 5 saniyede bir
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/chat/rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoomCost = async () => {
    try {
      const res = await fetch('/api/settings/public?key=chat_room_creation_cost')
      if (res.ok) {
        const data = await res.json()
        if (data.value) setRoomCost(parseInt(data.value))
      }
    } catch (e) { console.error(e) }
  }

  const handleCreateRoom = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Oda adı gerekli')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/chat/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setShowCreateModal(false)
        setCreateForm({ name: '', description: '', icon: '💬', paymentType: 'jeton' })
        fetchRooms()
      } else {
        setCreateError(data.message || data.error || 'Error creating room')
      }
    } catch (error) {
      console.error(error)
      setCreateError('Bir hata oluştu')
    } finally {
      setCreating(false)
    }
  }

  const totalOnline = rooms.reduce((sum, r) => sum + r.onlineCount, 0)

  const bgColor = isFalclub ? 'falclub-starry-bg' : isFalci ? 'falci-starry-bg' : isCosmic ? '' : ''
  const cardBg = isFalclub ? 'bg-gradient-to-br from-[#2d1145]/90 to-[#1a0a2e]/90 border-fuchsia-500/30 hover:border-fuchsia-400/60'
    : isFalci ? 'bg-gradient-to-br from-[#2d1b4e]/90 to-[#1a0b2e]/90 border-indigo-500/30 hover:border-indigo-400/60'
    : isCosmic ? 'bg-white/10 border-blue-500/30 hover:border-blue-400/60'
    : 'bg-gradient-to-br from-[#2d1b4e]/90 to-[#1a0b2e]/90 border-purple-500/30 hover:border-purple-400/60'
  const titleColor = isFalclub ? 'text-fuchsia-100' : isFalci ? 'text-indigo-100' : isCosmic ? 'text-blue-100' : 'text-gold-200'
  const descColor = isFalclub ? 'text-fuchsia-200/70' : isFalci ? 'text-indigo-200/70' : isCosmic ? 'text-slate-300' : 'text-purple-200/60'
  const borderAccent = isFalclub ? 'border-fuchsia-500/20' : isFalci ? 'border-indigo-500/20' : isCosmic ? 'border-blue-500/20' : 'border-gold-500/20'
  const spinnerColor = isFalclub ? 'border-fuchsia-400' : isFalci ? 'border-indigo-400' : isCosmic ? 'border-blue-400' : 'border-gold-400'
  const msgCountColor = isFalclub ? 'text-fuchsia-300/60' : isFalci ? 'text-indigo-300/60' : isCosmic ? 'text-slate-400' : 'text-purple-300/60'
  const joinColor = isFalclub ? 'text-fuchsia-300 group-hover:text-fuchsia-200' : isFalci ? 'text-indigo-300 group-hover:text-indigo-200' : isCosmic ? 'text-amber-300 group-hover:text-amber-200' : 'text-gold-400 group-hover:text-gold-300'
  const sectionIconColor = isFalclub ? 'text-fuchsia-400' : isFalci ? 'text-indigo-400' : isCosmic ? 'text-blue-400' : 'text-gold-400'
  const hoverShadow = isFalclub ? 'hover:shadow-fuchsia-500/20' : isFalci ? 'hover:shadow-indigo-500/20' : isCosmic ? 'hover:shadow-blue-500/20' : 'hover:shadow-gold-500/20'
  const onlineBadgeBg = isFalclub ? 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/30'
    : isFalci ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
    : isCosmic ? 'bg-blue-500/20 text-blue-200 border-blue-500/30'
    : 'bg-purple-500/20 text-purple-200 border-purple-500/30'
  const modalBg = isFalclub ? 'bg-purple-950/95' : isFalci ? 'bg-purple-950/95' : isCosmic ? '' : 'bg-purple-950/95'
  const inputBg = isFalclub ? 'bg-fuchsia-900/30 border-fuchsia-500/30 text-white placeholder-fuchsia-300/40'
    : isFalci ? 'bg-indigo-900/30 border-indigo-500/30 text-white placeholder-indigo-300/40'
    : isCosmic ? 'bg-blue-900/30 border-blue-500/30 text-white placeholder-blue-300/40'
    : 'bg-purple-900/30 border-purple-500/30 text-white placeholder-purple-300/40'
  const btnPrimary = isFalclub ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white'
    : isFalci ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
    : isCosmic ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white'
    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'

  return (
    <div className={`min-h-screen ${bgColor} pt-14 pb-28 px-3 sm:px-4`}>
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-3 pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${sectionIconColor}`} />
                {'Fal Sohbet Odaları'}
              </h1>
              <p className={`${descColor} text-xs sm:text-sm mt-1`}>
                {'Sohbet odalarına katılın ve diğer kullanıcılarla konuşun'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Total Online Badge */}
              {totalOnline > 0 && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${onlineBadgeBg} text-xs sm:text-sm font-medium`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="hidden sm:inline">
                    {`${totalOnline} çevrimiçi`}
                  </span>
                  <span className="sm:hidden">{totalOnline}</span>
                </div>
              )}
              {session?.user && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${btnPrimary}`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{'Oda Oluştur'}</span>
                  <span className="sm:hidden">{'Oluştur'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className={`w-10 h-10 border-4 ${spinnerColor} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className={`w-12 h-12 ${sectionIconColor} mx-auto mb-3 opacity-50`} />
            <p className={`${descColor} text-sm`}>
              {'Henüz sohbet odası yok'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
            {rooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/sohbet/${room.slug}`}>
                  <div className={`relative rounded-xl sm:rounded-2xl p-3 sm:p-4 border ${cardBg} transition-all duration-300 hover:shadow-xl ${hoverShadow} hover:scale-[1.02] group cursor-pointer h-full flex flex-col`}>
                    
                    {/* Online Count Badge - Üstte belirgin */}
                    <div className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 z-10">
                      <div className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg ${
                        room.onlineCount > 0 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : 'bg-gray-600/80 text-gray-300'
                      }`}>
                        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                          {room.onlineCount > 0 && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          )}
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 ${room.onlineCount > 0 ? 'bg-white' : 'bg-gray-400'}`} />
                        </span>
                        <span>{room.onlineCount}</span>
                        <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform text-center">
                      {room.icon}
                    </div>

                    {/* Room Name */}
                    <h2 className={`text-sm sm:text-base font-bold ${titleColor} mb-1 line-clamp-2 text-center`}>
                      {room.nameTr}
                    </h2>

                    {/* Description - sadece büyük ekranlarda */}
                    <p className={`${descColor} text-[10px] sm:text-xs mb-2 line-clamp-2 text-center hidden sm:block flex-1`}>
                      {room.descTr}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs mt-auto">
                      <div className={`flex items-center gap-1 ${msgCountColor}`}>
                        <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>{room.messageCount}</span>
                      </div>
                      {room.owner && (
                        <div className={`${msgCountColor} truncate max-w-[60px] sm:max-w-[80px]`}>
                          @{room.owner.username || room.owner.name?.split(' ')[0]}
                        </div>
                      )}
                    </div>

                    {/* Recent Users - sadece büyük ekranlarda */}
                    {room.recentUsers && room.recentUsers.length > 0 && (
                      <div className={`mt-2 sm:mt-3 pt-2 sm:pt-3 border-t ${borderAccent} hidden sm:block`}>
                        <div className="flex items-center justify-center -space-x-2">
                          {room.recentUsers.slice(0, 4).map((user) => (
                            <div key={user.id} className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-[#1a0a2e] flex items-center justify-center">
                              {user.image ? (
                                <Image src={user.image} alt={user.name || ''} width={24} height={24} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                          {room.recentUsers.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#1a0a2e] flex items-center justify-center">
                              <span className="text-[8px] font-bold text-white/70">+{room.recentUsers.length - 4}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Join CTA - mobilde küçük */}
                    <div className={`mt-2 pt-2 border-t ${borderAccent} sm:hidden`}>
                      <span className={`${joinColor} flex items-center justify-center gap-1 font-medium text-[10px]`}>
                        {'Katıl'}
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-2xl p-6 w-full max-w-md border ${borderAccent}`}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className={`w-5 h-5 ${sectionIconColor}`} />
                  {'Yeni Oda Oluştur'}
                </h2>
                <button onClick={() => setShowCreateModal(false)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon Selection */}
                <div>
                  <label className={`${descColor} text-sm block mb-2`}>
                    {'İkon Seç'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setCreateForm({ ...createForm, icon })}
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          createForm.icon === icon ? 'bg-white/20 scale-110' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Name */}
                <div>
                  <label className={`${descColor} text-sm block mb-1.5`}>
                    {'Oda Adı'}
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder={'Oda adını girin...'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none`}
                    maxLength={50}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`${descColor} text-sm block mb-1.5`}>
                    {'Açıklama'}
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder={'Oda açıklaması...'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none resize-none`}
                    rows={3}
                    maxLength={200}
                  />
                </div>

                {/* Payment Type */}
                <div>
                  <label className={`${descColor} text-sm block mb-2`}>
                    {`Ödeme Yöntemi (${roomCost} birim)`}
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCreateForm({ ...createForm, paymentType: 'jeton' })}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        createForm.paymentType === 'jeton'
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      {roomCost} Jeton
                    </button>
                    <button
                      onClick={() => setCreateForm({ ...createForm, paymentType: 'cfc' })}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        createForm.paymentType === 'cfc'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      {roomCost} CFC
                    </button>
                  </div>
                </div>

                {createError && (
                  <p className="text-red-400 text-sm">{createError}</p>
                )}

                <button
                  onClick={handleCreateRoom}
                  disabled={creating}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${btnPrimary} disabled:opacity-50`}
                >
                  {creating
                    ? ('Oluşturuluyor...')
                    : (`Oda Oluştur (${roomCost} ${createForm.paymentType === 'jeton' ? 'Jeton' : 'CFC'})`)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}