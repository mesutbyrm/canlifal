'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, Calendar, Heart, MapPin, Star, Users,
  Instagram, Youtube, Music, Globe, ExternalLink, Trophy,
  UserCheck, Loader2, Share2, Film, Tv, MessageCircle, Play, Twitter
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface CelebPost {
  id: string
  platform: string
  postType: string
  content: string | null
  mediaUrl: string | null
  likeCount: number
  commentCount: number
  isLiked: boolean
  createdAt: string
}

const PLATFORM_TABS = [
  { value: 'all', label: 'Tümü', icon: Globe },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'x', label: 'X', icon: Twitter },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'tiktok', label: 'TikTok', icon: Play },
]

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-600',
  x: 'from-gray-600 to-gray-800',
  youtube: 'from-red-500 to-red-700',
  tiktok: 'from-cyan-400 to-pink-500',
}

interface Celebrity {
  id: string
  name: string
  slug: string
  category: string
  bio: string | null
  profileImage: string | null
  coverImage: string | null
  isVerified: boolean
  followerCount: number
  birthDate: string | null
  birthPlace: string | null
  zodiacSign: string | null
  socialLinks: any
  achievements: string[]
  isFollowed: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  oyuncu: 'Oyuncu',
  sarkici: 'Şarkıcı',
  futbolcu: 'Futbolcu',
  youtuber: 'YouTuber',
  influencer: 'Influencer',
  yonetmen: 'Yönetmen',
  diger: 'Diğer',
}

const CATEGORY_ICONS: Record<string, any> = {
  oyuncu: Film,
  sarkici: Music,
  futbolcu: Trophy,
  youtuber: Youtube,
  influencer: Instagram,
  yonetmen: Tv,
  diger: Star,
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toString()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

const SOCIAL_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  instagram: { icon: Instagram, color: 'from-pink-500 to-purple-600', label: 'Instagram' },
  youtube: { icon: Youtube, color: 'from-red-500 to-red-700', label: 'YouTube' },
  tiktok: { icon: Music, color: 'from-gray-800 to-black', label: 'TikTok' },
  twitter: { icon: Globe, color: 'from-blue-400 to-blue-600', label: 'X (Twitter)' },
  website: { icon: Globe, color: 'from-emerald-500 to-teal-600', label: 'Web Sitesi' },
}

export default function CelebrityProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [posts, setPosts] = useState<CelebPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('all')

  useEffect(() => {
    if (!params?.slug) return
    fetch(`/api/celebrities/${params.slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.celebrity) {
          setCelebrity(data.celebrity)
          setFollowing(data.celebrity.isFollowed)
          setFollowerCount(data.celebrity.followerCount)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params?.slug])

  const loadPosts = useCallback(async () => {
    if (!params?.slug) return
    setPostsLoading(true)
    try {
      const url = platformFilter === 'all'
        ? `/api/celebrities/${params.slug}/posts?limit=20`
        : `/api/celebrities/${params.slug}/posts?platform=${platformFilter}&limit=20`
      const res = await fetch(url)
      const data = await res.json()
      setPosts(data.posts || [])
    } catch { setPosts([]) }
    setPostsLoading(false)
  }, [params?.slug, platformFilter])

  useEffect(() => { loadPosts() }, [loadPosts])

  const handleLikePost = async (postId: string) => {
    if (!session?.user) { router.push('/giris'); return }
    if (!params?.slug) return
    try {
      const res = await fetch(`/api/celebrities/${params.slug}/posts/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        isLiked: data.liked,
        likeCount: data.liked ? p.likeCount + 1 : p.likeCount - 1,
      } : p))
    } catch {}
  }

  const handleFollow = async () => {
    if (!session?.user) {
      router.push('/giris')
      return
    }
    if (!celebrity || followLoading) return
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/celebrities/${celebrity.slug}/follow`, { method: 'POST' })
      const data = await res.json()
      setFollowing(data.followed)
      setFollowerCount(data.followerCount)
    } catch (err) {
      console.error(err)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: celebrity?.name,
          text: `${celebrity?.name} - CanlıFal Ünlü Profili`,
          url: window.location.href,
        })
      } catch {}
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
          <p className="text-purple-300/50 text-lg mb-4">Ünlü bulunamadı</p>
          <Link href="/unluler" className="text-fuchsia-400 hover:text-fuchsia-300 text-sm">
            ← Tüm Ünlülere Dön
          </Link>
        </div>
      </div>
    )
  }

  const CategoryIcon = CATEGORY_ICONS[celebrity.category] || Star

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] pb-24">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 md:h-80">
        {celebrity.coverImage ? (
          <Image
            src={celebrity.coverImage}
            alt={`${celebrity.name} kapak`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/60 via-fuchsia-900/40 to-pink-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0014] via-[#0a0014]/50 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-16 left-4 z-10">
          <button
            onClick={() => router.push('/unluler')}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Share button */}
        <div className="absolute top-16 right-4 z-10">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center sm:items-end gap-4"
        >
          {/* Profile Image */}
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-[#0a0014] shadow-xl shadow-fuchsia-500/20">
              {celebrity.profileImage ? (
                <Image
                  src={celebrity.profileImage}
                  alt={celebrity.name}
                  width={144}
                  height={144}
                  className="object-cover w-full h-full"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{celebrity.name.charAt(0)}</span>
                </div>
              )}
            </div>
            {celebrity.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-[#0a0014] rounded-full p-1">
                <BadgeCheck className="w-7 h-7 text-blue-400" />
              </div>
            )}
          </div>

          {/* Name & Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{celebrity.name}</h1>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-purple-300/70">
              <span className="flex items-center gap-1">
                <CategoryIcon className="w-4 h-4 text-fuchsia-400" />
                {CATEGORY_LABELS[celebrity.category] || celebrity.category}
              </span>
              {celebrity.zodiacSign && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  {celebrity.zodiacSign}
                </span>
              )}
            </div>
          </div>

          {/* Follow Button & Stats */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{formatCount(followerCount)}</div>
              <div className="text-xs text-purple-300/50">Takipçi</div>
            </div>
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                following
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/30'
                  : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-600/30'
              }`}
            >
              {followLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : following ? (
                <><UserCheck className="w-4 h-4" /> Takip Ediliyor</>
              ) : (
                <><Heart className="w-4 h-4" /> Takip Et</>
              )}
            </button>
          </div>
        </motion.div>

        {/* Bio Section */}
        {celebrity.bio && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 p-5 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-fuchsia-400" />
              Hakkında
            </h2>
            <p className="text-purple-200/70 leading-relaxed whitespace-pre-line">{celebrity.bio}</p>
          </motion.div>
        )}

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {celebrity.birthDate && (
            <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm">
              <Calendar className="w-5 h-5 text-fuchsia-400 mb-2" />
              <div className="text-xs text-purple-400/60">Doğum Tarihi</div>
              <div className="text-sm text-white font-medium mt-0.5">{formatDate(celebrity.birthDate)}</div>
            </div>
          )}
          {celebrity.birthPlace && (
            <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm">
              <MapPin className="w-5 h-5 text-fuchsia-400 mb-2" />
              <div className="text-xs text-purple-400/60">Doğum Yeri</div>
              <div className="text-sm text-white font-medium mt-0.5">{celebrity.birthPlace}</div>
            </div>
          )}
          {celebrity.zodiacSign && (
            <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm">
              <Star className="w-5 h-5 text-yellow-400 mb-2" />
              <div className="text-xs text-purple-400/60">Burç</div>
              <div className="text-sm text-white font-medium mt-0.5">{celebrity.zodiacSign}</div>
            </div>
          )}
        </motion.div>

        {/* Achievements */}
        {celebrity.achievements && celebrity.achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-5 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Başarılar
            </h2>
            <div className="flex flex-wrap gap-2">
              {celebrity.achievements.map((ach: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-sm bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                >
                  ⭐ {ach}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Fan Club CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-4"
        >
          <Link
            href={`/unluler/${celebrity.slug}/fan-kulubu`}
            className="block p-5 rounded-2xl bg-gradient-to-r from-fuchsia-600/20 via-purple-600/15 to-pink-600/20 border border-fuchsia-500/20 backdrop-blur-sm hover:border-fuchsia-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-fuchsia-600/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    Fan Kulübü
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/30 text-fuchsia-300">YENİ</span>
                  </h3>
                  <p className="text-purple-300/60 text-sm">Tartışmalara katıl, duvarına yaz</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-fuchsia-400/50 group-hover:text-fuchsia-400 transition-colors" />
            </div>
          </Link>
        </motion.div>

        {/* Social Posts Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-5 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-fuchsia-400" />
            Sosyal Medya Paylaşımları
          </h2>

          {/* Platform Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
            {PLATFORM_TABS.map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.value}
                  onClick={() => setPlatformFilter(tab.value)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    platformFilter === tab.value
                      ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                      : 'bg-white/5 text-purple-300/70 border border-purple-500/10 hover:bg-white/10'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Posts Grid */}
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-xl overflow-hidden bg-white/5 border border-purple-500/10 hover:border-fuchsia-500/20 transition-all">
                  {post.mediaUrl && (
                    <div className="relative w-full h-40">
                      <Image src={post.mediaUrl} alt={post.content || 'Paylaşım'} fill className="object-cover" sizes="300px" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-br ${PLATFORM_COLORS[post.platform] || 'from-gray-500 to-gray-700'} flex items-center justify-center shadow-lg`}>
                        {post.platform === 'instagram' && <Instagram className="w-3.5 h-3.5 text-white" />}
                        {post.platform === 'x' && <Twitter className="w-3.5 h-3.5 text-white" />}
                        {post.platform === 'youtube' && <Youtube className="w-3.5 h-3.5 text-white" />}
                        {post.platform === 'tiktok' && <Play className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    {post.content && (
                      <p className="text-sm text-purple-200/80 line-clamp-3 mb-2">{post.content}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            post.isLiked ? 'text-pink-400' : 'text-purple-400/50 hover:text-pink-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-pink-400' : ''}`} />
                          {post.likeCount > 0 && <span>{post.likeCount > 999 ? `${(post.likeCount / 1000).toFixed(1)}K` : post.likeCount}</span>}
                        </button>
                        <span className="flex items-center gap-1 text-xs text-purple-400/50">
                          <MessageCircle className="w-4 h-4" />
                          {post.commentCount > 0 && post.commentCount}
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-400/40">
                        {new Date(post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Instagram className="w-10 h-10 text-purple-500/30 mx-auto mb-2" />
              <p className="text-purple-300/50 text-sm">Bu platformda henüz paylaşım yok</p>
            </div>
          )}
        </motion.div>

        {/* Social Links */}
        {celebrity.socialLinks && Object.keys(celebrity.socialLinks).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 p-5 rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm"
          >
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-fuchsia-400" />
              Sosyal Medya
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(celebrity.socialLinks).map(([platform, url]) => {
                if (!url) return null
                const social = SOCIAL_ICONS[platform]
                if (!social) return null
                const SocialIcon = social.icon
                return (
                  <a
                    key={platform}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-purple-500/10 hover:border-fuchsia-500/30 hover:bg-white/10 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${social.color} flex items-center justify-center`}>
                      <SocialIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{social.label}</div>
                      <div className="text-xs text-purple-400/50 truncate max-w-[180px]">{(url as string).replace(/https?:\/\/(www\.)?/, '')}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-purple-400/30 ml-auto group-hover:text-fuchsia-400 transition-colors" />
                  </a>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
