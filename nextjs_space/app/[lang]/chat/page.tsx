'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { MessageCircle, Users, Sparkles, Video, Radio, Play, ChevronRight } from 'lucide-react'

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
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 10000) // Refresh every 10s
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

  return (
    <div className="min-h-screen bg-[#0a0118] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Sohbet' : 'Chat'}
          </h1>
          <p className="text-purple-300">
            {language === 'tr' ? 'Görüntülü sohbet ve yazılı odalar' : 'Video chat and text rooms'}
          </p>
        </motion.div>

        {/* TikTok Style Video Chat Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <Link href={`/${language}/chat/video`}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 p-1">
              <div className="bg-[#0a0118] rounded-xl p-6 relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                
                <div className="relative flex items-center gap-6">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center relative">
                      <Video className="w-10 h-10 text-white" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <Radio className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-white">
                        {language === 'tr' ? 'Canlı Video Sohbet' : 'Live Video Chat'}
                      </h2>
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                        CANLI
                      </span>
                    </div>
                    <p className="text-purple-200 mb-3">
                      {language === 'tr' 
                        ? 'TikTok tarzı canlı yayınlara katıl veya kendi yayınını başlat!'
                        : 'Join TikTok-style live streams or start your own!'}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-pink-400">
                        <Play className="w-4 h-4" />
                        <span className="text-sm">{language === 'tr' ? 'İzle' : 'Watch'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-purple-400">
                        <Radio className="w-4 h-4" />
                        <span className="text-sm">{language === 'tr' ? 'Yayın Başlat' : 'Go Live'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{language === 'tr' ? 'Sohbet Et' : 'Chat'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="w-8 h-8 text-white/50" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Text Chat Rooms Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gold-400" />
            {language === 'tr' ? 'Yazılı Sohbet Odaları' : 'Text Chat Rooms'}
          </h2>
        </motion.div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/${language}/chat/${room.slug}`}>
                  <div className="bg-gradient-to-br from-[#2d1b4e]/80 to-[#1a0b2e]/80 rounded-xl p-6 border border-gold-500/20 hover:border-gold-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10 group cursor-pointer h-full">
                    {/* Room Icon */}
                    <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">
                      {room.icon}
                    </div>
                    
                    {/* Room Name */}
                    <h2 className="text-xl font-serif text-gold-300 mb-2">
                      {language === 'tr' ? room.nameTr : room.nameEn}
                    </h2>
                    
                    {/* Room Description */}
                    <p className="text-purple-200/70 text-sm mb-4">
                      {language === 'tr' ? room.descTr : room.descEn}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-400">
                        <Users className="w-4 h-4" />
                        <span>{room.onlineCount} {t('chat.online')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-purple-300/70">
                        <MessageCircle className="w-4 h-4" />
                        <span>{room.messageCount}</span>
                      </div>
                    </div>

                    {/* Join Button */}
                    <div className="mt-4 pt-4 border-t border-gold-500/20">
                      <span className="text-gold-400 group-hover:text-gold-300 flex items-center gap-2">
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
