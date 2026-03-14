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
    const interval = setInterval(fetchRooms, 10000)
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
      setCreateError(language === 'tr' ? 'Oda adı gerekli' : 'Room name is required')
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

  const bgColor = isFalclub ? 'falclub-starry-bg' : isFalci ? 'falci-starry-bg' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0a0118]'
  const cardBg = isFalclub ? 'bg-gradient-to-br from-[#2d1145]/80 to-[#1a0a2e]/80 border-fuchsia-500/30 hover:border-fuchsia-400/50'
    : isFalci ? 'bg-gradient-to-br from-[#2d1b4e]/80 to-[#1a0b2e]/80 border-indigo-500/30 hover:border-indigo-400/50'
    : isCosmic ? 'bg-white/10 border-blue-500/30 hover:border-blue-400/50'
    : 'bg-gradient-to-br from-[#2d1b4e]/80 to-[#1a0b2e]/80 border-purple-500/30 hover:border-purple-400/50'
  const titleColor = isFalclub ? 'text-fuchsia-200' : isFalci ? 'text-indigo-200' : isCosmic ? 'text-blue-200' : 'text-gold-300'
  const descColor = isFalclub ? 'text-fuchsia-200/80' : isFalci ? 'text-indigo-200/80' : isCosmic ? 'text-slate-300' : 'text-purple-200/70'
  const borderAccent = isFalclub ? 'border-fuchsia-500/20' : isFalci ? 'border-indigo-500/20' : isCosmic ? 'border-blue-500/20' : 'border-gold-500/20'
  const spinnerColor = isFalclub ? 'border-fuchsia-400' : isFalci ? 'border-indigo-400' : isCosmic ? 'border-blue-400' : 'border-gold-400'
  const msgCountColor = isFalclub ? 'text-fuchsia-300/70' : isFalci ? 'text-indigo-300/70' : isCosmic ? 'text-slate-400' : 'text-purple-300/70'
  const joinColor = isFalclub ? 'text-fuchsia-300 group-hover:text-fuchsia-200' : isFalci ? 'text-indigo-300 group-hover:text-indigo-200' : isCosmic ? 'text-amber-300 group-hover:text-amber-200' : 'text-gold-400 group-hover:text-gold-300'
  const sectionIconColor = isFalclub ? 'text-fuchsia-400' : isFalci ? 'text-indigo-400' : isCosmic ? 'text-blue-400' : 'text-gold-400'
  const hoverShadow = isFalclub ? 'hover:shadow-fuchsia-500/10' : isFalci ? 'hover:shadow-indigo-500/10' : isCosmic ? 'hover:shadow-blue-500/10' : 'hover:shadow-gold-500/10'
  const onlineBadgeBg = isFalclub ? 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/30'
    : isFalci ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
    : isCosmic ? 'bg-blue-500/20 text-blue-200 border-blue-500/30'
    : 'bg-purple-500/20 text-purple-200 border-purple-500/30'
  const modalBg = isFalclub ? 'bg-[#1a0a2e]' : isFalci ? 'bg-[#1a0b2e]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#1a0b2e]'
  const inputBg = isFalclub ? 'bg-fuchsia-900/30 border-fuchsia-500/30 text-white placeholder-fuchsia-300/40'
    : isFalci ? 'bg-indigo-900/30 border-indigo-500/30 text-white placeholder-indigo-300/40'
    : isCosmic ? 'bg-blue-900/30 border-blue-500/30 text-white placeholder-blue-300/40'
    : 'bg-purple-900/30 border-purple-500/30 text-white placeholder-purple-300/40'
  const btnPrimary = isFalclub ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white'
    : isFalci ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
    : isCosmic ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white'
    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'

  return (
    <div className={`min-h-screen ${bgColor} pt-14 pb-28 px-4`}>
      <div className="max-w-5xl mx-auto">
        {/* Section Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${sectionIconColor}`} />
                {language === 'tr' ? 'Fal Sohbet Odaları' : 'Fortune Chat Rooms'}
              </h1>
              <p className={`${descColor} text-sm mt-1`}>
                {language === 'tr' ? 'Sohbet odalarına katılın ve diğer kullanıcılarla konuşun' : 'Join chat rooms and talk with other users'}
              </p>
            </div>
            {session?.user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${btnPrimary}`}
              >
                <Plus className="w-4 h-4" />
                {language === 'tr' ? 'Oda Oluştur' : 'Create Room'}
              </button>
            )}
          </div>
        </motion.div>

        {/* Total Online Users Banner */}
        {totalOnline > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${onlineBadgeBg} text-sm font-medium`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              {language === 'tr'
                ? `Fal ve sohbette şuan ${totalOnline} çevrimiçi kullanıcı`
                : `${totalOnline} users online in fortune & chat`}
            </div>
          </motion.div>
        )}

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className={`w-10 h-10 border-4 ${spinnerColor} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className={`w-12 h-12 ${sectionIconColor} mx-auto mb-3 opacity-50`} />
            <p className={`${descColor} text-sm`}>
              {language === 'tr' ? 'Henüz sohbet odası yok' : 'No chat rooms yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/${language}/chat/${room.slug}`}>
                  <div className={`rounded-xl p-5 border ${cardBg} transition-all duration-300 hover:shadow-lg ${hoverShadow} group cursor-pointer h-full`}>
                    <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                      {room.icon}
                    </div>
                    <h2 className={`text-lg font-bold ${titleColor} mb-1.5`}>
                      {language === 'tr' ? room.nameTr : room.nameEn}
                    </h2>
                    <p className={`${descColor} text-sm mb-3`}>
                      {language === 'tr' ? room.descTr : room.descEn}
                    </p>
                    {room.owner && (
                      <p className={`${msgCountColor} text-xs mb-2`}>
                        {language === 'tr' ? 'Sahip' : 'Owner'}: {room.owner.name}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-400">
                        <Users className="w-4 h-4" />
                        <span>{room.onlineCount} {t('chat.online')}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${msgCountColor}`}>
                        <MessageCircle className="w-4 h-4" />
                        <span>{room.messageCount}</span>
                      </div>
                    </div>

                    {/* Recent Users */}
                    {room.recentUsers && room.recentUsers.length > 0 && (
                      <div className={`mt-3 pt-3 border-t ${borderAccent}`}>
                        <p className={`${msgCountColor} text-xs mb-2`}>
                          {language === 'tr' ? 'Son girenler:' : 'Recently joined:'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {room.recentUsers.map((user) => (
                            <div key={user.id} className="flex items-center gap-1.5 bg-white/5 rounded-full pl-1 pr-2.5 py-0.5">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center">
                                {user.image ? (
                                  <Image src={user.image} alt={user.name || ''} width={20} height={20} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[9px] font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
                                )}
                              </div>
                              <span className="text-white/80 text-[11px] truncate max-w-[60px]">
                                {user.name?.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!room.recentUsers || room.recentUsers.length === 0) && (
                      <div className={`mt-3 pt-3 border-t ${borderAccent}`}>
                        <span className={`${joinColor} flex items-center gap-2 font-medium text-sm`}>
                          {t('chat.join')}
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    )}
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
                  {language === 'tr' ? 'Yeni Oda Oluştur' : 'Create New Room'}
                </h2>
                <button onClick={() => setShowCreateModal(false)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon Selection */}
                <div>
                  <label className={`${descColor} text-sm block mb-2`}>
                    {language === 'tr' ? 'İkon Seç' : 'Select Icon'}
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
                    {language === 'tr' ? 'Oda Adı' : 'Room Name'}
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder={language === 'tr' ? 'Oda adını girin...' : 'Enter room name...'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none`}
                    maxLength={50}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`${descColor} text-sm block mb-1.5`}>
                    {language === 'tr' ? 'Açıklama' : 'Description'}
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder={language === 'tr' ? 'Oda açıklaması...' : 'Room description...'}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none resize-none`}
                    rows={3}
                    maxLength={200}
                  />
                </div>

                {/* Payment Type */}
                <div>
                  <label className={`${descColor} text-sm block mb-2`}>
                    {language === 'tr' ? `Ödeme Yöntemi (${roomCost} birim)` : `Payment Method (${roomCost} units)`}
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
                    ? (language === 'tr' ? 'Oluşturuluyor...' : 'Creating...')
                    : (language === 'tr' ? `Oda Oluştur (${roomCost} ${createForm.paymentType === 'jeton' ? 'Jeton' : 'CFC'})` : `Create Room (${roomCost} ${createForm.paymentType === 'jeton' ? 'Jeton' : 'CFC'})`)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
