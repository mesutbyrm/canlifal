'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  User,
  MessageCircle,
  Settings,
  LogOut,
  X,
  Sparkles,
  Wallet,
  Radio,
  ChevronUp,
  Crown
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface UserProfile {
  id: string
  name: string
  username: string | null
  image: string | null
  credits: number
  membership: string
}

export default function FloatingProfile() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Don't show on these pages
  const hiddenPaths = ['/giris', '/kayit-ol', '/canli-oda', '/canli-falcilar/panel', '/mesajlar', '/sohbet/video']
  const shouldHide = hiddenPaths.some(path => pathname.includes(path))

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile()
      fetchUnreadCount()
    }
  }, [status])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        const total = data.conversations.reduce((sum: number, conv: any) => sum + conv.unreadCount, 0)
        setUnreadMessages(total + data.requests.length)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  if (status !== 'authenticated' || shouldHide || !session?.user) {
    return null
  }

  const user = session.user

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30 flex items-center justify-center overflow-hidden border-2 border-purple-400/30"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {profile?.image || user.image ? (
          <Image
            src={profile?.image || user.image || ''}
            alt="Profile"
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-purple-700 to-pink-700">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        {/* Unread badge */}
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed bottom-24 right-6 z-50 w-72 bg-[#0a0118] border border-purple-800 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-4 border-b border-purple-800">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/profil/${profile?.username || user.id}`}
                    onClick={() => setIsOpen(false)}
                    className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-400/50"
                  >
                    {profile?.image || user.image ? (
                      <Image
                        src={profile?.image || user.image || ''}
                        alt="Profile"
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-purple-700 to-pink-700">
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{user.name}</p>
                    <p className="text-sm text-purple-400 truncate">@{profile?.username || 'user'}</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-purple-800/50 rounded-full"
                  >
                    <X className="w-5 h-5 text-purple-400" />
                  </button>
                </div>

                {/* Credits */}
                <div className="mt-3 flex items-center justify-between bg-purple-900/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold-400" />
                    <span className="text-purple-200 text-sm">{'CFC'}</span>
                  </div>
                  <span className="text-gold-400 font-semibold">{profile?.credits || 0}</span>
                </div>

                {/* Membership badge */}
                {profile?.membership && profile.membership !== 'basic' && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Crown className="w-4 h-4 text-gold-400" />
                    <span className="text-gold-400 capitalize">{profile.membership}</span>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <Link
                  href={`/profil/${profile?.username || user.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-purple-200 hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5 text-purple-400" />
                  <span>{'Profilim'}</span>
                </Link>

                <Link
                  href={`/mesajlar`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-purple-200 hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <MessageCircle className="w-5 h-5 text-purple-400" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </div>
                  <span>{'Mesajlar'}</span>
                </Link>

                <Link
                  href={`/panel`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-purple-200 hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>{'Fallarım'}</span>
                </Link>

                <Link
                  href={`/jeton`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-purple-200 hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <Wallet className="w-5 h-5 text-purple-400" />
                  <span>{'CFC Al'}</span>
                </Link>

                <Link
                  href={`/sohbet/video/setup`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-purple-200 hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <Radio className="w-5 h-5 text-pink-400" />
                  <span>{'Canlı Yayın'}</span>
                </Link>

                <div className="border-t border-purple-800 my-2" />

                <Link
                  href={`/ayarlar`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-purple-200 hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>{'Ayarlar'}</span>
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    signOut({ callbackUrl: `/giris` })
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{'Çıkış Yap'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
