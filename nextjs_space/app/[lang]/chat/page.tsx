'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { MessageCircle, Users, Sparkles } from 'lucide-react'

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
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Sohbet Odaları' : 'Chat Rooms'}
          </h1>
          <p className="text-purple-300">
            {language === 'tr' ? 'Diğer kullanıcılarla sohbet edin ve deneyimlerinizi paylaşın' : 'Chat with others and share your experiences'}
          </p>
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
