'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Grid3X3,
  Bookmark,
  Heart,
  MessageCircle,
  UserPlus,
  UserMinus,
  Settings,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  Sparkles,
  Play,
  Lock,
  X,
  Loader2,
  Wallet,
  Radio,
  Edit3,
  Eye,
  Pin
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  username: string | null
  image: string | null
  zodiacSign: string | null
  createdAt: string
  followerCount: number
  followingCount: number
  postCount: number
  totalLikes: number
  isFollowing: boolean
  isOwnProfile: boolean
}

interface Post {
  id: string
  content: string
  postType: string
  fortuneType: string | null
  imageUrl: string | null
  youtubeUrl: string | null
  createdAt: string
  likeCount: number
  commentCount: number
  isPinned?: boolean
  viewCount?: number
  fortune: {
    id: string
    fortuneType: string
    aiResponse: string
  } | null
}

interface FollowUser {
  id: string
  name: string
  username: string | null
  image: string | null
}

const FORTUNE_ICONS: Record<string, string> = {
  coffee: '☕',
  tarot: '🃏',
  horoscope: '♈',
  daily_horoscope: '🔮',
  palm: '✋',
  dream: '💤',
  love: '❤️',
  numerology: '🔢',
  angel: '👼',
  aura: '🔮',
  birthchart: '🌟',
  yesno: '❓',
  katina: '🃏',
  kursundokme: '🧊'
}

export default function ProfilePage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const username = params.username as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'fortunes' | 'saved'>('posts')
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [userCredits, setUserCredits] = useState(0)

  useEffect(() => {
    fetchProfile()
    if (session?.user) {
      fetchCredits()
    }
  }, [username, session])

  useEffect(() => {
    if (profile) {
      fetchPosts()
    }
  }, [profile, activeTab])

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json()
        setUserCredits(data.credits || 0)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${username}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      } else {
        router.push(`/${language}`)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    if (!profile) return
    try {
      const type = activeTab === 'fortunes' ? 'fortunes' : 'all'
      const res = await fetch(`/api/users/${profile.id}/posts?type=${type}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const handleFollow = async () => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    if (!profile) return

    setFollowLoading(true)
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: data.isFollowing,
          followerCount: data.isFollowing ? prev.followerCount + 1 : prev.followerCount - 1
        } : null)
      }
    } catch (error) {
      console.error('Error following:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const fetchFollowers = async () => {
    if (!profile) return
    try {
      const res = await fetch(`/api/users/${profile.id}/follow?type=followers`)
      if (res.ok) {
        const data = await res.json()
        setFollowers(data)
      }
    } catch (error) {
      console.error('Error fetching followers:', error)
    }
  }

  const fetchFollowing = async () => {
    if (!profile) return
    try {
      const res = await fetch(`/api/users/${profile.id}/follow?type=following`)
      if (res.ok) {
        const data = await res.json()
        setFollowing(data)
      }
    } catch (error) {
      console.error('Error fetching following:', error)
    }
  }

  const handleShowFollowers = () => {
    setShowFollowers(true)
    fetchFollowers()
  }

  const handleShowFollowing = () => {
    setShowFollowing(true)
    fetchFollowing()
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + ' M'
    if (num >= 1000) return (num / 1000).toFixed(1) + ' B'
    return num.toString()
  }

  const getPostThumbnail = (post: Post): string | null => {
    if (post.imageUrl) return post.imageUrl
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">
          {language === 'tr' ? 'Kullanıcı bulunamadı' : 'User not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {language === 'tr' ? 'Aklınızdakiler...' : 'On your mind...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1">
              <Bookmark className="w-5 h-5 text-gray-800" />
            </button>
            <button className="p-1">
              <Share2 className="w-5 h-5 text-gray-800" />
            </button>
            <button className="p-1">
              <MoreHorizontal className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                  {profile.image ? (
                    <Image
                      src={profile.image}
                      alt={profile.name}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 bg-gradient-to-br from-purple-100 to-pink-100">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Add photo button */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#20d5ec] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <span className="text-white text-xl font-bold leading-none">+</span>
            </div>
          </div>

          {/* Name with dropdown */}
          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">
              {profile.name}
            </h2>
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            {profile.isOwnProfile && (
              <Link href={`/${language}/settings`} className="p-1 bg-gray-100 rounded-full">
                <Edit3 className="w-4 h-4 text-gray-500" />
              </Link>
            )}
          </div>

          {/* Username */}
          <p className="text-gray-500 mt-0.5">
            @{profile.username || 'user'}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              onClick={handleShowFollowing}
              className="text-center min-w-[70px]"
            >
              <p className="text-lg font-bold text-gray-800">
                {formatNumber(profile.followingCount)}
              </p>
              <p className="text-xs text-gray-500">
                {language === 'tr' ? 'Takipte' : 'Following'}
              </p>
            </button>
            <div className="w-px h-8 bg-gray-200" />
            <button
              onClick={handleShowFollowers}
              className="text-center min-w-[70px]"
            >
              <p className="text-lg font-bold text-gray-800">
                {formatNumber(profile.followerCount)}
              </p>
              <p className="text-xs text-gray-500">
                {language === 'tr' ? 'Takipçi' : 'Followers'}
              </p>
            </button>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center min-w-[70px]">
              <p className="text-lg font-bold text-gray-800">
                {formatNumber(profile.totalLikes)}
              </p>
              <p className="text-xs text-gray-500">
                {language === 'tr' ? 'Beğeniler' : 'Likes'}
              </p>
            </div>
          </div>

          {/* Country flags */}
          <div className="flex items-center gap-1 mt-3">
            <span className="text-lg">🇹🇷</span>
          </div>

          {/* Action Buttons - TikTok Style */}
          <div className="flex items-center justify-center gap-2 mt-5 w-full max-w-md">
            {profile.isOwnProfile ? (
              <>
                <Link
                  href={`/${language}/dashboard`}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-center flex items-center justify-center gap-2 text-sm border border-gray-200"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {language === 'tr' ? 'Fal Stüdyom' : 'Fortune Studio'}
                </Link>
                <Link
                  href={`/${language}/credits`}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-center flex items-center justify-center gap-2 text-sm border border-gray-200"
                >
                  <Wallet className="w-4 h-4 text-amber-500" />
                  {language === 'tr' ? 'Bakiye' : 'Balance'}
                </Link>
                <Link
                  href={`/${language}/chat/video/setup`}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-center flex items-center justify-center gap-2 text-sm border border-gray-200"
                >
                  <Radio className="w-4 h-4 text-red-500" />
                  {language === 'tr' ? 'CANLI Yayın' : 'Go LIVE'}
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex-1 py-2.5 px-6 font-medium rounded-lg flex items-center justify-center gap-2 text-sm transition-all ${
                    profile.isFollowing
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'
                      : 'bg-[#fe2c55] hover:bg-[#e02850] text-white'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : profile.isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      {language === 'tr' ? 'Takipten Çık' : 'Unfollow'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {language === 'tr' ? 'Takip Et' : 'Follow'}
                    </>
                  )}
                </button>
                <button className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200">
                  <MessageCircle className="w-5 h-5 text-gray-800" />
                </button>
                <button className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200">
                  <Share2 className="w-5 h-5 text-gray-800" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs - TikTok Style */}
      <div className="sticky top-12 z-30 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('fortunes')}
            className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
              activeTab === 'fortunes'
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Lock className="w-5 h-5" />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
          {profile.isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-400'
              }`}
            >
              <Bookmark className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid - TikTok Style */}
      <div className="max-w-lg mx-auto">
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg">
              {activeTab === 'fortunes'
                ? (language === 'tr' ? 'Henüz paylaşılan fal yok' : 'No shared fortunes yet')
                : (language === 'tr' ? 'Henüz paylaşım yok' : 'No posts yet')}
            </p>
            {profile.isOwnProfile && (
              <Link
                href={`/${language}/fortunes`}
                className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 bg-[#fe2c55] text-white font-medium rounded-full"
              >
                <Sparkles className="w-4 h-4" />
                {language === 'tr' ? 'Fal Baktır' : 'Get Fortune'}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-gray-100">
            {/* Drafts tile - first position for own profile */}
            {profile.isOwnProfile && activeTab === 'posts' && (
              <Link
                href={`/${language}/dashboard`}
                className="relative aspect-[3/4] bg-gray-800 group"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-white text-sm font-medium">
                    {language === 'tr' ? 'Taslaklar:' : 'Drafts:'} {posts.length}
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/30" />
                {posts[0] && getPostThumbnail(posts[0]) && (
                  <Image
                    src={getPostThumbnail(posts[0])!}
                    alt="Draft"
                    fill
                    className="object-cover opacity-50"
                  />
                )}
                <div className="absolute top-2 left-2 text-white text-xs font-semibold">
                  {language === 'tr' ? 'Taslaklar:' : 'Drafts:'} {posts.length}
                </div>
              </Link>
            )}

            {posts.map((post, index) => {
              const thumbnail = getPostThumbnail(post)
              const fortuneIcon = post.fortuneType ? FORTUNE_ICONS[post.fortuneType] : null
              const isPinned = index < 3 // First 3 are pinned style
              const viewCount = post.viewCount || (post.likeCount * Math.floor(Math.random() * 50 + 10))

              return (
                <Link
                  key={post.id}
                  href={`/${language}/fal/${post.id}`}
                  className="relative aspect-[3/4] bg-white group"
                >
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={post.content.slice(0, 50)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-purple-100">
                      <span className="text-5xl">
                        {fortuneIcon || '🔮'}
                      </span>
                    </div>
                  )}

                  {/* Pinned badge */}
                  {isPinned && (
                    <div className="absolute top-1 left-1 bg-[#fe2c55] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {language === 'tr' ? 'Sabitlendi' : 'Pinned'}
                    </div>
                  )}

                  {/* View count at bottom left */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-xs font-medium drop-shadow-lg">
                    <Play className="w-3 h-3" fill="white" />
                    <span>{formatNumber(viewCount)}</span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="w-5 h-5" fill="white" />
                      <span className="font-semibold">{formatNumber(post.likeCount)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="w-5 h-5" fill="white" />
                      <span className="font-semibold">{formatNumber(post.commentCount)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => setShowFollowers(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-white rounded-t-3xl max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  {language === 'tr' ? 'Takipçiler' : 'Followers'}
                </h3>
                <button onClick={() => setShowFollowers(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {followers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {language === 'tr' ? 'Henüz takipçi yok' : 'No followers yet'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {followers.map(user => (
                      <Link
                        key={user.id}
                        href={`/${language}/profile/${user.username || user.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                        onClick={() => setShowFollowers(false)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-gray-400 bg-gradient-to-br from-purple-100 to-pink-100">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                        </div>
                        <button className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg">
                          {language === 'tr' ? 'Takip Et' : 'Follow'}
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Following Modal */}
      <AnimatePresence>
        {showFollowing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => setShowFollowing(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-white rounded-t-3xl max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  {language === 'tr' ? 'Takip Edilenler' : 'Following'}
                </h3>
                <button onClick={() => setShowFollowing(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {following.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {language === 'tr' ? 'Henüz takip edilen yok' : 'Not following anyone yet'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {following.map(user => (
                      <Link
                        key={user.id}
                        href={`/${language}/profile/${user.username || user.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                        onClick={() => setShowFollowing(false)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-gray-400 bg-gradient-to-br from-purple-100 to-pink-100">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                        </div>
                        <button className="px-4 py-1.5 bg-[#fe2c55] text-white text-sm font-medium rounded-lg">
                          {language === 'tr' ? 'Takip Ediliyor' : 'Following'}
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
