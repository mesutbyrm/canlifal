'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, MessageCircle, Sparkles, Heart, Gamepad2, Users, BookOpen, Tv, Gift, UserPlus, Star } from 'lucide-react'
import Link from 'next/link'

interface Activity {
  id: string
  userName: string
  userAvatar: string | null
  activityType: string
  detail: string
  targetUrl: string | null
  createdAt: string
}

const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  fortune_read: { icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-purple-400' },
  chat_join: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-blue-400' },
  dream_shared: { icon: <Eye className="w-3.5 h-3.5" />, color: 'text-indigo-400' },
  stream_started: { icon: <Tv className="w-3.5 h-3.5" />, color: 'text-red-400' },
  gift_sent: { icon: <Gift className="w-3.5 h-3.5" />, color: 'text-yellow-400' },
  signup: { icon: <UserPlus className="w-3.5 h-3.5" />, color: 'text-green-400' },
  blog_read: { icon: <BookOpen className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
  comment: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  follow: { icon: <Heart className="w-3.5 h-3.5" />, color: 'text-pink-400' },
  game_played: { icon: <Gamepad2 className="w-3.5 h-3.5" />, color: 'text-orange-400' },
  live_session: { icon: <Users className="w-3.5 h-3.5" />, color: 'text-fuchsia-400' },
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'az önce'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} saat önce`
  return `${Math.floor(hours / 24)} gün önce`
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities')
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setVisible(data.visible ?? false)
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchActivities()
    intervalRef.current = setInterval(fetchActivities, 30000) // refresh every 30s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!mounted || !visible || activities.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400/50 animate-ping" />
        </div>
        <h3 className="text-xs font-semibold text-purple-300/80 uppercase tracking-wider">
          Canlı Aktiviteler
        </h3>
      </div>

      <div className="relative rounded-xl bg-white/5 backdrop-blur-sm border border-purple-500/10 overflow-hidden">
        <div className="max-h-[200px] overflow-y-auto scrollbar-hide">
          <AnimatePresence initial={false}>
            {activities.map((activity, idx) => {
              const iconConfig = ACTIVITY_ICONS[activity.activityType] || { icon: <Star className="w-3.5 h-3.5" />, color: 'text-gray-400' }

              const content = (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  className={`flex items-center gap-2.5 px-3 py-2 ${
                    idx !== activities.length - 1 ? 'border-b border-purple-500/5' : ''
                  } hover:bg-white/5 transition-colors group`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {activity.userAvatar ? (
                      <img
                        src={activity.userAvatar}
                        alt={activity.userName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-500/20"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600/40 to-indigo-600/40 flex items-center justify-center text-[10px] font-bold text-white/80 ring-1 ring-purple-500/20">
                        {activity.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`flex-shrink-0 ${iconConfig.color}`}>
                    {iconConfig.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">
                      <span className="font-semibold text-white/90">{activity.userName}</span>
                      {' '}
                      <span className="text-gray-400">{activity.detail}</span>
                    </p>
                  </div>

                  {/* Time */}
                  <span className="flex-shrink-0 text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
                    {timeAgo(activity.createdAt)}
                  </span>
                </motion.div>
              )

              if (activity.targetUrl) {
                return (
                  <Link key={activity.id} href={activity.targetUrl} className="block">
                    {content}
                  </Link>
                )
              }
              return content
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
