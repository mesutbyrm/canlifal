'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/language-context'
import { MessageCircle, Users, Sparkles, Video, Radio, Play, ChevronRight, Plus, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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

interface LiveStream {
  id: string
  title: string | null
  viewerCount: number
  likeCount: number
  user: {
    id: string
    name: string
    image: string | null
  }
}

interface StreamViewer {
  id: string
  name: string
  image: string | null
  hasGifted: boolean
  totalGiftAmount: number
}

export default function ChatRoomsPage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [selectedStream, setSelectedStream] = useState<string | null>(null)
  const [streamViewers, setStreamViewers] = useState<StreamViewer[]>([])
  const [loadingViewers, setLoadingViewers] = useState(false)

  useEffect(() => {
    fetchRooms()
    fetchLiveStreams()
    const interval = setInterval(() => {
      fetchRooms()
      fetchLiveStreams()
    }, 10000)
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

  const fetchLiveStreams = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) {
        const data = await res.json()
        setLiveStreams(data)
      }
    } catch (error) {
      console.error('Error fetching live streams:', error)
    }
  }

  const fetchViewers = async (streamId: string) => {
    setLoadingViewers(true)
    try {
      const res = await fetch(`/api/video-streams/${streamId}/viewers`)
      if (res.ok) {
        const data = await res.json()
        setStreamViewers(data)
      }
    } catch (error) {
      console.error('Error fetching viewers:', error)
    } finally {
      setLoadingViewers(false)
    }
  }

  const handleStreamClick = (streamId: string) => {
    if (selectedStream === streamId) {
      // Navigate to stream
      router.push(`/${language}/chat/video`)
    } else {
      setSelectedStream(streamId)
      fetchViewers(streamId)
    }
  }

  const handleStartStream = () => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    router.push(`/${language}/chat/video`)
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
            {language === 'tr' ? 'Canlı yayınlar ve sohbet odaları' : 'Live streams and chat rooms'}
          </p>
        </motion.div>

        {/* Live Streams Stories Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            {language === 'tr' ? 'Canlı Yayınlar' : 'Live Streams'}
          </h2>
          
          {/* Stories Style Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {/* Start Stream Button */}
            <button
              onClick={handleStartStream}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 p-0.5">
                <div className="w-full h-full rounded-full bg-[#0a0118] flex items-center justify-center">
                  <Plus className="w-8 h-8 text-white" />
                </div>
              </div>
              <span className="text-white text-xs mt-2 text-center max-w-[80px] truncate">
                {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
              </span>
            </button>

            {/* Live Streamers */}
            {liveStreams.map((stream) => (
              <button
                key={stream.id}
                onClick={() => handleStreamClick(stream.id)}
                className={`flex-shrink-0 flex flex-col items-center transition-transform ${
                  selectedStream === stream.id ? 'scale-110' : ''
                }`}
              >
                <div className="relative">
                  {/* Rainbow border animation */}
                  <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 animate-pulse">
                    <div className="w-full h-full rounded-full bg-[#0a0118] p-0.5">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {stream.user.image ? (
                          <Image
                            src={stream.user.image}
                            alt={stream.user.name}
                            width={72}
                            height={72}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {stream.user.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* CANLI badge */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
                    CANLI
                  </div>
                </div>
                <span className="text-white text-xs mt-3 text-center max-w-[80px] truncate">
                  {stream.user.name}
                </span>
                <span className="text-purple-400 text-[10px] flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {stream.viewerCount}
                </span>
              </button>
            ))}

            {liveStreams.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-4">
                <p className="text-purple-400/60 text-sm">
                  {language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Selected Stream Viewers Box */}
        {selectedStream && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-[#2d1b4e]/80 to-[#1a0b2e]/80 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  {language === 'tr' ? 'İzleyenler' : 'Viewers'}
                </h3>
                <button
                  onClick={() => router.push(`/${language}/chat/video`)}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3" />
                  {language === 'tr' ? 'Yayına Katıl' : 'Join Stream'}
                </button>
              </div>

              {loadingViewers ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : streamViewers.length === 0 ? (
                <p className="text-purple-400/60 text-sm text-center py-4">
                  {language === 'tr' ? 'Henüz izleyici yok' : 'No viewers yet'}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {streamViewers.map((viewer) => (
                    <div
                      key={viewer.id}
                      className={`flex flex-col items-center p-3 rounded-xl ${
                        viewer.hasGifted
                          ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full overflow-hidden mb-2 ${
                        viewer.hasGifted
                          ? 'ring-2 ring-yellow-400'
                          : ''
                      }`}>
                        {viewer.image ? (
                          <Image
                            src={viewer.image}
                            alt={viewer.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {viewer.name?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-white text-xs text-center truncate max-w-full">
                        {viewer.name}
                      </span>
                      {viewer.hasGifted && (
                        <span className="text-yellow-400 text-[10px] mt-1">
                          🎁 {viewer.totalGiftAmount}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

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
