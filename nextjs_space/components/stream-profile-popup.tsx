'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, UserCheck, Gift, MessageCircle, Crown, BadgeCheck, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import FramedAvatar from './framed-avatar'

interface StreamProfilePopupProps {
  userId: string | null
  onClose: () => void
  onSendGift?: (userId: string) => void
}

interface UserProfile {
  id: string
  name: string
  username: string | null
  image: string | null
  bio: string | null
  zodiacSign: string | null
  membership: string
  specialBadges: string | null
  followerCount: number
  followingCount: number
  profileFrame?: { id: string; name: string; imageUrl: string } | null
  adminAssignedFrame?: { id: string; name: string; imageUrl: string } | null
}

export default function StreamProfilePopup({ userId, onClose, onSendGift }: StreamProfilePopupProps) {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setProfile(null)
    setIsFollowing(false)

    // Fetch profile
    fetch(`/api/users/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile({
            id: data.id,
            name: data.name,
            username: data.username,
            image: data.image,
            bio: data.bio,
            zodiacSign: data.zodiacSign,
            membership: data.membership || 'basic',
            specialBadges: data.specialBadges,
            followerCount: data.followerCount || data._count?.followers || 0,
            followingCount: data.followingCount || data._count?.following || 0,
            profileFrame: data.profileFrame,
            adminAssignedFrame: data.adminAssignedFrame,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Check follow status
    if (session?.user?.id && session.user.id !== userId) {
      fetch(`/api/user/${userId}/follow-status`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setIsFollowing(data.isFollowing)
        })
        .catch(() => {})
    }
  }, [userId, session?.user?.id])

  const handleFollow = async () => {
    if (!userId || !session?.user?.id || followLoading) return
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/user/${userId}/follow`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsFollowing(data.following ?? !isFollowing)
        if (profile) {
          setProfile(prev => prev ? {
            ...prev,
            followerCount: data.following
              ? prev.followerCount + 1
              : Math.max(0, prev.followerCount - 1)
          } : null)
        }
      }
    } catch {}
    setFollowLoading(false)
  }

  const isSelf = session?.user?.id === userId

  const zodiacEmojis: Record<string, string> = {
    aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
    leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
    sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓'
  }

  if (!userId) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xs mx-4 mb-4 sm:mb-0 bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/50 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header gradient */}
          <div className="h-16 bg-gradient-to-r from-purple-600/40 via-pink-600/30 to-cyan-600/30" />

          {/* Avatar */}
          <div className="-mt-8 flex justify-center">
            {loading ? (
              <div className="w-16 h-16 rounded-full animate-pulse bg-purple-700/50 border-2 border-purple-500" />
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
                <div className="h-3 bg-purple-700/30 rounded animate-pulse mx-auto w-16" />
              </div>
            ) : profile ? (
              <>
                {/* Name + badges */}
                <div className="flex items-center justify-center gap-1">
                  <h3 className="text-white font-bold text-base">{profile.name}</h3>
                  {profile.membership === 'gold' && <Crown className="w-4 h-4 text-yellow-400" />}
                  {profile.specialBadges && (() => { try { return JSON.parse(profile.specialBadges!).includes('verified') } catch { return false } })() && (
                    <BadgeCheck className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                {profile.username && (
                  <p className="text-purple-400 text-xs">@{profile.username}</p>
                )}

                {/* Zodiac */}
                {profile.zodiacSign && (
                  <p className="text-purple-300 text-[11px] mt-0.5">
                    {zodiacEmojis[profile.zodiacSign] || ''} {profile.zodiacSign}
                  </p>
                )}

                {/* Bio */}
                {profile.bio && (
                  <p className="text-purple-200/60 text-xs mt-1.5 line-clamp-2">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-purple-500/20">
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">{profile.followerCount}</p>
                    <p className="text-purple-400 text-[10px]">Takipçi</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">{profile.followingCount}</p>
                    <p className="text-purple-400 text-[10px]">Takip</p>
                  </div>
                </div>

                {/* Action buttons */}
                {!isSelf && session?.user && (
                  <div className="flex gap-2 mt-3">
                    {/* Follow button */}
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isFollowing
                          ? 'bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:bg-red-600/20 hover:border-red-500/30 hover:text-red-300'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isFollowing ? (
                        <><UserCheck className="w-3.5 h-3.5" /> Takipte</>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5" /> Takip Et</>
                      )}
                    </button>

                    {/* Gift button */}
                    {onSendGift && (
                      <button
                        onClick={() => { onSendGift(profile.id); onClose() }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 text-white rounded-lg text-xs font-medium transition-all"
                      >
                        <Gift className="w-3.5 h-3.5" /> Hediye
                      </button>
                    )}
                  </div>
                )}

                {/* View full profile */}
                <a
                  href={`/${language}/profil/${profile.username || profile.id}`}
                  className="mt-2 flex items-center justify-center gap-1 text-purple-400 hover:text-purple-300 text-[11px] transition-colors"
                  onClick={onClose}
                >
                  <ExternalLink className="w-3 h-3" /> Profili Gör
                </a>
              </>
            ) : (
              <p className="text-purple-400 text-xs py-4">Profil bulunamadı</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
