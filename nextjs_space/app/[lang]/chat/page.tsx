'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { MessageCircle, Users, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useSiteTheme } from '@/lib/theme-context'

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
}

export default function ChatRoomsPage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)

  const isFalclub = theme === 'falclub'
  const isFalci = theme === 'falci'
  const isCosmic = theme === 'cosmic'

  useEffect(() => {
    fetchRooms()
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

  // Theme-based colors
  const bgColor = isFalclub
    ? 'falclub-starry-bg'
    : isFalci
    ? 'falci-starry-bg'
    : isCosmic
    ? 'bg-[#0a1628]'
    : 'bg-[#0a0118]'

  const cardBg = isFalclub
    ? 'bg-gradient-to-br from-[#2d1145]/80 to-[#1a0a2e]/80 border-fuchsia-500/30 hover:border-fuchsia-400/50'
    : isFalci
    ? 'bg-gradient-to-br from-[#2d1b4e]/80 to-[#1a0b2e]/80 border-indigo-500/30 hover:border-indigo-400/50'
    : isCosmic
    ? 'bg-white/10 border-blue-500/30 hover:border-blue-400/50'
    : 'bg-gradient-to-br from-[#2d1b4e]/80 to-[#1a0b2e]/80 border-purple-500/30 hover:border-purple-400/50'

  const titleColor = isFalclub
    ? 'text-fuchsia-200'
    : isFalci
    ? 'text-indigo-200'
    : isCosmic
    ? 'text-blue-200'
    : 'text-gold-300'

  const accentColor = isFalclub
    ? 'text-fuchsia-300'
    : isFalci
    ? 'text-indigo-300'
    : isCosmic
    ? 'text-amber-300'
    : 'text-gold-400'

  const descColor = isFalclub
    ? 'text-fuchsia-200/80'
    : isFalci
    ? 'text-indigo-200/80'
    : isCosmic
    ? 'text-slate-300'
    : 'text-purple-200/70'

  const borderAccent = isFalclub
    ? 'border-fuchsia-500/20'
    : isFalci
    ? 'border-indigo-500/20'
    : isCosmic
    ? 'border-blue-500/20'
    : 'border-gold-500/20'

  const spinnerColor = isFalclub
    ? 'border-fuchsia-400'
    : isFalci
    ? 'border-indigo-400'
    : isCosmic
    ? 'border-blue-400'
    : 'border-gold-400'

  const msgCountColor = isFalclub
    ? 'text-fuchsia-300/70'
    : isFalci
    ? 'text-indigo-300/70'
    : isCosmic
    ? 'text-slate-400'
    : 'text-purple-300/70'

  const joinColor = isFalclub
    ? 'text-fuchsia-300 group-hover:text-fuchsia-200'
    : isFalci
    ? 'text-indigo-300 group-hover:text-indigo-200'
    : isCosmic
    ? 'text-amber-300 group-hover:text-amber-200'
    : 'text-gold-400 group-hover:text-gold-300'

  const sectionIconColor = isFalclub
    ? 'text-fuchsia-400'
    : isFalci
    ? 'text-indigo-400'
    : isCosmic
    ? 'text-blue-400'
    : 'text-gold-400'

  const hoverShadow = isFalclub
    ? 'hover:shadow-fuchsia-500/10'
    : isFalci
    ? 'hover:shadow-indigo-500/10'
    : isCosmic
    ? 'hover:shadow-blue-500/10'
    : 'hover:shadow-gold-500/10'

  return (
    <div className={`min-h-screen ${bgColor} pt-14 pb-28 px-4`}>
      <div className="max-w-5xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-3 pb-4"
        >
          <h1 className={`text-xl font-bold text-white flex items-center gap-2`}>
            <Sparkles className={`w-5 h-5 ${sectionIconColor}`} />
            {language === 'tr' ? 'Fal Sohbet Odaları' : 'Fortune Chat Rooms'}
          </h1>
          <p className={`${descColor} text-sm mt-1`}>
            {language === 'tr' ? 'Sohbet odalarına katılın ve diğer kullanıcılarla konuşun' : 'Join chat rooms and talk with other users'}
          </p>
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
                    {/* Room Icon */}
                    <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                      {room.icon}
                    </div>
                    
                    {/* Room Name */}
                    <h2 className={`text-lg font-bold ${titleColor} mb-1.5`}>
                      {language === 'tr' ? room.nameTr : room.nameEn}
                    </h2>
                    
                    {/* Room Description */}
                    <p className={`${descColor} text-sm mb-3`}>
                      {language === 'tr' ? room.descTr : room.descEn}
                    </p>
                    
                    {/* Stats */}
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

                    {/* Join Button */}
                    <div className={`mt-3 pt-3 border-t ${borderAccent}`}>
                      <span className={`${joinColor} flex items-center gap-2 font-medium text-sm`}>
                        {t('chat.join')}
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
