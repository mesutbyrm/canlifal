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
  Sparkles,
  Play,
  X,
  Loader2,
  Camera,
  Check
} from 'lucide-react'
import { TierAvatarWrapper, TierNameBadge, TierBadge, type MembershipTier } from '@/components/tier-badge'
import ProfileAchievements from '@/components/profile-achievements'
import ProfileSpecialBadges, { SpecialBadgeType } from '@/components/profile-special-badges'
import { ProfileBackground, ProfileEffect } from '@/components/profile-effects'
import { Trophy } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  username: string | null
  image: string | null
  bio: string | null
  zodiacSign: string | null
  createdAt: string
  membership: string
  membershipExpiresAt: string | null
  followerCount: number
  followingCount: number
  postCount: number
  totalLikes: number
  isFollowing: boolean
  isOwnProfile: boolean
  specialBadges?: SpecialBadgeType[]
  profileEffect?: ProfileEffect
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
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [username])

  useEffect(() => {
    if (profile) {
      fetchPosts()
      setBioText(profile.bio || '')
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

  const handleSaveBio = async () => {
    if (!profile?.isOwnProfile) return
    setSavingBio(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bioText })
      })
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, bio: bioText } : null)
        setEditingBio(false)
      }
    } catch (error) {
      console.error('Error saving bio:', error)
    } finally {
      setSavingBio(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.isOwnProfile) return

    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalıdır' : 'File size must be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true })
      })

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, cloud_storage_path } = await presignedRes.json()
      const url = new URL(uploadUrl)
      const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') || ''
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (signedHeaders.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file })
      if (!uploadRes.ok) throw new Error('Failed to upload file')

      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })

      if (urlRes.ok) {
        const { url: imageUrl } = await urlRes.json()
        const saveRes = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl })
        })
        if (saveRes.ok) {
          setProfile(prev => prev ? { ...prev, image: imageUrl } : null)
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert(language === 'tr' ? 'Yükleme başarısız oldu' : 'Upload failed')
    } finally {
      setUploadingImage(false)
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
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <p className="text-gray-400">
          {language === 'tr' ? 'Kullanıcı bulunamadı' : 'User not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Header spacer */}
      <div className="h-2" />

      {/* Profile Section */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Avatar with Tier Effects */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <TierAvatarWrapper tier={(profile.membership || 'faluser') as MembershipTier} size="lg">
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt={profile.name}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-purple-300 bg-gradient-to-br from-purple-900 to-pink-900">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </TierAvatarWrapper>
            {/* Edit photo button - only for own profile */}
            {profile.isOwnProfile && (
              <label className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-[#0a0118] cursor-pointer hover:opacity-80 transition-opacity z-30">
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>

          {/* Name with Tier Effect */}
          <h2 className="mt-4 text-xl font-bold">
            <TierNameBadge 
              tier={(profile.membership || 'faluser') as MembershipTier} 
              name={profile.name} 
            />
          </h2>

          {/* Username */}
          <p className="text-purple-400 mt-0.5">
            @{profile.username || 'user'}
          </p>

          {/* Membership Badge */}
          {profile.membership && profile.membership !== 'faluser' && (
            <div className="mt-2">
              <TierBadge 
                tier={(profile.membership || 'faluser') as MembershipTier} 
                size="sm" 
                showLabel 
              />
            </div>
          )}

          {/* Special Badges - VIP, Beta Tester, etc. */}
          {profile.specialBadges && profile.specialBadges.length > 0 && (
            <ProfileSpecialBadges 
              badges={profile.specialBadges.map(type => ({ type }))} 
              size="sm" 
            />
          )}

          {/* Bio Section */}
          <div className="mt-3 w-full max-w-xs text-center">
            {profile.isOwnProfile && editingBio ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value.slice(0, 150))}
                  placeholder={language === 'tr' ? 'Kendinizi tanıtın...' : 'Tell us about yourself...'}
                  className="w-full bg-purple-900/30 border border-purple-700 rounded-lg px-3 py-2 text-white text-sm placeholder-purple-400 focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                  maxLength={150}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-400">{bioText.length}/150</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingBio(false); setBioText(profile.bio || '') }}
                      className="px-3 py-1 text-purple-300 text-sm hover:text-white"
                    >
                      {language === 'tr' ? 'İptal' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 flex items-center gap-1"
                    >
                      {savingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      {language === 'tr' ? 'Kaydet' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => profile.isOwnProfile && setEditingBio(true)}
                className={`text-sm text-purple-200 ${profile.isOwnProfile ? 'cursor-pointer hover:text-white' : ''}`}
              >
                {profile.bio || (profile.isOwnProfile ? (
                  <span className="text-purple-400 italic">
                    {language === 'tr' ? '+ Bio ekle' : '+ Add bio'}
                  </span>
                ) : null)}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <button
              onClick={handleShowFollowing}
              className="text-center min-w-[70px]"
            >
              <p className="text-lg font-bold text-white">
                {formatNumber(profile.followingCount)}
              </p>
              <p className="text-xs text-purple-400">
                {language === 'tr' ? 'Takipte' : 'Following'}
              </p>
            </button>
            <div className="w-px h-8 bg-purple-800" />
            <button
              onClick={handleShowFollowers}
              className="text-center min-w-[70px]"
            >
              <p className="text-lg font-bold text-white">
                {formatNumber(profile.followerCount)}
              </p>
              <p className="text-xs text-purple-400">
                {language === 'tr' ? 'Takipçi' : 'Followers'}
              </p>
            </button>
            <div className="w-px h-8 bg-purple-800" />
            <div className="text-center min-w-[70px]">
              <p className="text-lg font-bold text-white">
                {formatNumber(profile.totalLikes)}
              </p>
              <p className="text-xs text-purple-400">
                {language === 'tr' ? 'Beğeniler' : 'Likes'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2 mt-5 w-full max-w-md">
            {profile.isOwnProfile ? (
              <>
                <Link
                  href={`/${language}/dashboard`}
                  className="flex-1 py-2.5 px-4 bg-purple-900/50 hover:bg-purple-800/50 text-purple-200 font-medium rounded-lg text-center flex items-center justify-center gap-2 text-sm border border-purple-700"
                >
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  {language === 'tr' ? 'İstatistikler' : 'Statistics'}
                </Link>
                <Link
                  href={`/${language}/settings`}
                  className="flex-1 py-2.5 px-4 bg-purple-900/50 hover:bg-purple-800/50 text-purple-200 font-medium rounded-lg text-center flex items-center justify-center gap-2 text-sm border border-purple-700"
                >
                  <Settings className="w-4 h-4 text-gold-400" />
                  {language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
                </Link>
              </>
            ) : (
              <>
                {/* Follow/Unfollow Button with Icon */}
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center justify-center gap-2 py-2.5 px-6 font-medium rounded-lg text-sm transition-all ${
                    profile.isFollowing
                      ? 'bg-purple-900/50 hover:bg-red-900/50 text-purple-200 border border-purple-700 hover:border-red-500 hover:text-red-400 group'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : profile.isFollowing ? (
                    <>
                      <UserMinus className="w-5 h-5 group-hover:text-red-400" />
                      <span className="group-hover:hidden">{language === 'tr' ? 'Takip Ediliyor' : 'Following'}</span>
                      <span className="hidden group-hover:inline">{language === 'tr' ? 'Takibi Bırak' : 'Unfollow'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      {language === 'tr' ? 'Takip Et' : 'Follow'}
                    </>
                  )}
                </button>
                {/* Message Button */}
                <Link
                  href={`/${language}/messages/${profile.id}`}
                  className="py-2.5 px-4 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg border border-purple-700 flex items-center justify-center"
                >
                  <MessageCircle className="w-5 h-5 text-purple-300" />
                </Link>

              </>
            )}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="px-4">
          <ProfileAchievements userId={profile.id} isOwnProfile={profile.isOwnProfile} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-12 z-30 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-900/30 mt-4">
        <div className="max-w-lg mx-auto flex items-center">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-purple-400'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('fortunes')}
            className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
              activeTab === 'fortunes'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-purple-400'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          {profile.isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-purple-400'
              }`}
            >
              <Bookmark className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-lg mx-auto">
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-purple-400 text-lg">
              {activeTab === 'fortunes'
                ? (language === 'tr' ? 'Henüz paylaşılan fal yok' : 'No shared fortunes yet')
                : (language === 'tr' ? 'Henüz paylaşım yok' : 'No posts yet')}
            </p>
            {profile.isOwnProfile && (
              <Link
                href={`/${language}/fortunes`}
                className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full"
              >
                <Sparkles className="w-4 h-4" />
                {language === 'tr' ? 'Fal Baktır' : 'Get Fortune'}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-purple-900/30">
            {posts.map((post, index) => {
              const thumbnail = getPostThumbnail(post)
              const fortuneIcon = post.fortuneType ? FORTUNE_ICONS[post.fortuneType] : null
              const isPinned = index < 3
              const viewCount = post.viewCount || 0

              return (
                <Link
                  key={post.id}
                  href={`/${language}/fal/${post.id}`}
                  className="relative aspect-[3/4] bg-[#0a0118] group"
                >
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={post.content.slice(0, 50)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-purple-900/50">
                      <span className="text-5xl">
                        {fortuneIcon || '🔮'}
                      </span>
                    </div>
                  )}

                  {/* Pinned badge */}
                  {isPinned && (
                    <div className="absolute top-1 left-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {language === 'tr' ? 'Sabitlendi' : 'Pinned'}
                    </div>
                  )}

                  {/* View count */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-xs font-medium drop-shadow-lg">
                    <Play className="w-3 h-3" fill="white" />
                    <span>{formatNumber(viewCount)}</span>
                  </div>

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
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            onClick={() => setShowFollowers(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-[#0a0118] border-t border-purple-800 rounded-t-3xl max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-purple-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {language === 'tr' ? 'Takipçiler' : 'Followers'}
                </h3>
                <button onClick={() => setShowFollowers(false)} className="p-1 hover:bg-purple-900 rounded-full">
                  <X className="w-6 h-6 text-purple-400" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {followers.length === 0 ? (
                  <p className="text-center text-purple-400 py-8">
                    {language === 'tr' ? 'Henüz takipçi yok' : 'No followers yet'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {followers.map(user => (
                      <Link
                        key={user.id}
                        href={`/${language}/profile/${user.username || user.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-purple-900/50 rounded-xl transition-colors"
                        onClick={() => setShowFollowers(false)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-900">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-purple-300 bg-gradient-to-br from-purple-800 to-pink-800">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-sm text-purple-400">@{user.username || 'user'}</p>
                        </div>
                        <button className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg">
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
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            onClick={() => setShowFollowing(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-[#0a0118] border-t border-purple-800 rounded-t-3xl max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-purple-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {language === 'tr' ? 'Takip Edilenler' : 'Following'}
                </h3>
                <button onClick={() => setShowFollowing(false)} className="p-1 hover:bg-purple-900 rounded-full">
                  <X className="w-6 h-6 text-purple-400" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {following.length === 0 ? (
                  <p className="text-center text-purple-400 py-8">
                    {language === 'tr' ? 'Henüz takip edilen yok' : 'Not following anyone yet'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {following.map(user => (
                      <Link
                        key={user.id}
                        href={`/${language}/profile/${user.username || user.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-purple-900/50 rounded-xl transition-colors"
                        onClick={() => setShowFollowing(false)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-900">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-purple-300 bg-gradient-to-br from-purple-800 to-pink-800">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-sm text-purple-400">@{user.username || 'user'}</p>
                        </div>
                        <button className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg">
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
