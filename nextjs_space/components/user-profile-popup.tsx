'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Users, MessageCircle, Crown, BadgeCheck } from 'lucide-react'
import { FOUNDER_LABEL, isFounderAccount } from '@/lib/founder'
import Image from 'next/image'
import { useLanguage } from '@/lib/language-context'
import FramedAvatar from './framed-avatar'

interface UserProfile {
  id: string
  name: string
  username: string | null
  image: string | null
  bio: string | null
  zodiacSign: string | null
  membership: string
  role?: string | null
  isFounder?: boolean | null
  specialBadges: string | null
  followerCount: number
  followingCount: number
  postCount: number
  profileFrame?: { id: string; name: string; imageUrl: string } | null
  adminAssignedFrame?: { id: string; name: string; imageUrl: string } | null
}

interface ProfilePopupContextType {
  openProfile: (userId: string) => void
  closeProfile: () => void
}

const ProfilePopupContext = createContext<ProfilePopupContextType>({
  openProfile: () => {},
  closeProfile: () => {}
})

export function useProfilePopup() {
  return useContext(ProfilePopupContext)
}

export function ProfilePopupProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const { language } = useLanguage()

  const openProfile = useCallback(async (userId: string) => {
    setVisible(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setProfile({
          id: data.id,
          name: data.name,
          username: data.username,
          image: data.image,
          bio: data.bio,
          zodiacSign: data.zodiacSign,
          membership: data.membership,
          role: data.role,
          isFounder: data.isFounder,
          specialBadges: data.specialBadges,
          followerCount: data.followerCount || 0,
          followingCount: data.followingCount || 0,
          postCount: data._count?.socialPosts || 0
        })
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const closeProfile = useCallback(() => {
    setVisible(false)
    setTimeout(() => setProfile(null), 300)
  }, [])

  const getMembershipColor = (m: string) => {
    if (m === 'gold') return 'text-yellow-400'
    if (m === 'premium') return 'text-purple-400'
    return 'text-gray-400'
  }

  const getMembershipLabel = (m: string) => {
    if (m === 'gold') return 'Gold'
    if (m === 'premium') return 'Premium'
    return 'Temel'
  }

  const zodiacEmojis: Record<string, string> = {
    aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
    leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
    sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓'
  }

  return (
    <ProfilePopupContext.Provider value={{ openProfile, closeProfile }}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 z-[9999] w-72 bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/50 overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600/30 to-pink-600/30 p-4 pb-12">
              <button
                onClick={closeProfile}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="-mt-10 px-4 flex justify-center">
              {loading ? (
                <div className="w-16 h-16 rounded-full animate-pulse bg-purple-700/50 border-3 border-purple-500" />
              ) : (
                <FramedAvatar
                  src={profile?.image}
                  alt={profile?.name || '?'}
                  size={64}
                  frameUrl={profile?.adminAssignedFrame?.imageUrl || profile?.profileFrame?.imageUrl}
                  fallbackInitial={profile?.name?.[0] || '?'}
                  borderColor="border-purple-500"
                />
              )}
            </div>

            {/* Content */}
            <div className="px-4 pb-4 pt-2 text-center">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-5 bg-purple-700/30 rounded animate-pulse mx-auto w-24" />
                  <div className="h-4 bg-purple-700/30 rounded animate-pulse mx-auto w-16" />
                </div>
              ) : profile ? (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="text-white font-bold text-base">{profile.name}</h3>
                    {profile.membership === 'gold' && <Crown className="w-4 h-4 text-yellow-400" />}
                    {profile.specialBadges && JSON.parse(profile.specialBadges).includes('verified') && (
                      <BadgeCheck className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  {profile.username && (
                    <p className="text-purple-400 text-xs">@{profile.username}</p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className={`text-xs font-medium ${isFounderAccount(profile) ? 'text-amber-400' : getMembershipColor(profile.membership)}`}>
                      {isFounderAccount(profile) ? FOUNDER_LABEL : getMembershipLabel(profile.membership)}
                    </span>
                    {profile.zodiacSign && (
                      <span className="text-xs text-purple-300">
                        {zodiacEmojis[profile.zodiacSign] || ''} {profile.zodiacSign}
                      </span>
                    )}
                  </div>
                  {profile.bio && (
                    <p className="text-purple-300 text-xs mt-2 line-clamp-2">{profile.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-purple-500/20">
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{profile.followerCount}</p>
                      <p className="text-purple-400 text-[10px]">{'Takipçi'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{profile.followingCount}</p>
                      <p className="text-purple-400 text-[10px]">{'Takip'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{profile.postCount}</p>
                      <p className="text-purple-400 text-[10px]">{'Gönderi'}</p>
                    </div>
                  </div>

                  {/* View Profile Link */}
                  <a
                    href={`/profil/${profile.username || profile.id}`}
                    className="mt-3 block w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                    onClick={closeProfile}
                  >
                    {'Profili Gör'}
                  </a>
                </>
              ) : (
                <p className="text-purple-400 text-xs">{'Profil bulunamadı'}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProfilePopupContext.Provider>
  )
}

// Helper component: wrap any username text to make it clickable
export function ClickableUsername({ userId, children, className }: { userId: string; children: ReactNode; className?: string }) {
  const { openProfile } = useProfilePopup()
  return (
    <span
      onClick={(e) => { e.stopPropagation(); openProfile(userId) }}
      className={`cursor-pointer hover:text-purple-300 transition-colors ${className || ''}`}
    >
      {children}
    </span>
  )
}
