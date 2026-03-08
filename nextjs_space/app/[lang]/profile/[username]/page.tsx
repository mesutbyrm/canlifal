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
  Coffee,
  Sparkles,
  Play,
  Lock,
  Users,
  X,
  Loader2
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

  useEffect(() => {
    fetchProfile()
  }, [username])

  useEffect(() => {
    if (profile) {
      fetchPosts()
    }
  }, [profile, activeTab])

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
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'B'
    return num.toString()
  }

  const getPostThumbnail = (post: Post): string | null => {
    if (post.imageUrl) return post.imageUrl
    if (post.youtubeUrl) {
      const videoId = post.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^?&]+)/)?.[1]
      return videoId ? `https://i.ytimg.com/vi/CMEKPq-wYfI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCiulyySIOy3l9vvKoxBFp5nR9IxA` : null
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0118] flex items-center justify-center">
        <p className="text-gray-500">
          {language === 'tr' ? 'Kullanıcı bulunamadı' : 'User not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0118]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-[#0a0118] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-gray-800 dark:text-white" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">
            {profile.username || profile.name}
          </h1>
          <div className="flex items-center gap-2">
            <button className="p-1">
              <Share2 className="w-5 h-5 text-gray-800 dark:text-white" />
            </button>
            <button className="p-1">
              <MoreHorizontal className="w-5 h-5 text-gray-800 dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gradient-to-r from-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                {profile.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {/* Add story indicator */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#fe2c55] rounded-full flex items-center justify-center border-2 border-white dark:border-[#0a0118]">
              <span className="text-white text-lg">+</span>
            </div>
          </div>

          <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-white">
            {profile.name}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            @{profile.username || 'user'}
          </p>

          {profile.zodiacSign && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-lg">🇹🇷</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-6">
          <button
            onClick={handleShowFollowing}
            className="text-center"
          >
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {formatNumber(profile.followingCount)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'tr' ? 'Takipte' : 'Following'}
            </p>
          </button>
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />
          <button
            onClick={handleShowFollowers}
            className="text-center"
          >
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {formatNumber(profile.followerCount)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'tr' ? 'Takipçi' : 'Followers'}
            </p>
          </button>
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {formatNumber(profile.totalLikes)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'tr' ? 'Beğeniler' : 'Likes'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {profile.isOwnProfile ? (
            <>
              <Link
                href={`/${language}/settings`}
                className="flex-1 max-w-[150px] py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-semibold rounded-lg text-center"
              >
                {language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
              </Link>
              <button className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Bookmark className="w-5 h-5 text-gray-800 dark:text-white" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 max-w-[150px] py-2.5 font-semibold rounded-lg flex items-center justify-center gap-2 ${
                  profile.isFollowing
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white'
                    : 'bg-[#fe2c55] text-white'
                }`}
              >
                {followLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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
              <button className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <MessageCircle className="w-5 h-5 text-gray-800 dark:text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-12 z-30 bg-white dark:bg-[#0a0118] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-lg mx-auto flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-gray-800 dark:border-white text-gray-800 dark:text-white'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('fortunes')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'fortunes'
                ? 'border-gray-800 dark:border-white text-gray-800 dark:text-white'
                : 'border-transparent text-gray-400'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          {profile.isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-gray-800 dark:border-white text-gray-800 dark:text-white'
                  : 'border-transparent text-gray-400'
              }`}
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-lg mx-auto">
        {posts.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === 'fortunes'
                ? (language === 'tr' ? 'Henüz paylaşılan fal yok' : 'No shared fortunes yet')
                : (language === 'tr' ? 'Henüz paylaşım yok' : 'No posts yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
              const thumbnail = getPostThumbnail(post)
              const fortuneIcon = post.fortuneType ? FORTUNE_ICONS[post.fortuneType] : null

              return (
                <Link
                  key={post.id}
                  href={`/${language}/fal/${post.id}`}
                  className="relative aspect-square bg-gray-100 dark:bg-gray-800 group"
                >
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={post.content.slice(0, 50)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <span className="text-4xl">
                        {fortuneIcon || '🔮'}
                      </span>
                    </div>
                  )}

                  {/* Video indicator */}
                  {post.youtubeUrl && (
                    <div className="absolute top-2 right-2">
                      <Play className="w-5 h-5 text-white drop-shadow-lg" fill="white" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="w-5 h-5" fill="white" />
                      <span className="font-semibold">{formatNumber(post.likeCount)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="w-5 h-5" fill="white" />
                      <span className="font-semibold">{formatNumber(post.commentCount)}</span>
                    </div>
                  </div>

                  {/* View count for videos */}
                  {post.youtubeUrl && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                      <Play className="w-3 h-3" />
                      <span>{formatNumber(post.likeCount * 10)}</span>
                    </div>
                  )}

                  {/* Pinned indicator */}
                  {post.id === posts[0]?.id && (
                    <div className="absolute top-1 left-1 bg-[#fe2c55] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {language === 'tr' ? 'Sabitlendi' : 'Pinned'}
                    </div>
                  )}
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
              className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  {language === 'tr' ? 'Takipçiler' : 'Followers'}
                </h3>
                <button onClick={() => setShowFollowers(false)}>
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
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        onClick={() => setShowFollowers(false)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-gray-400">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                        </div>
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
              className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  {language === 'tr' ? 'Takip Edilenler' : 'Following'}
                </h3>
                <button onClick={() => setShowFollowing(false)}>
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
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        onClick={() => setShowFollowing(false)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-gray-400">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                        </div>
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
