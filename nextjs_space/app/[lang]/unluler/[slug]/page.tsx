'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BadgeCheck, Calendar, Heart, MapPin, Star, Users,
  Instagram, Youtube, Music, Globe, ExternalLink, Trophy,
  UserCheck, Loader2, Share2, Film, Tv, MessageCircle, Play, Twitter,
  ChevronDown, ChevronUp, Newspaper, Send, Clock, MoreHorizontal
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface PostComment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; image: string | null }
}

interface CelebPost {
  id: string
  platform: string
  postType: string
  content: string | null
  mediaUrl: string | null
  externalUrl: string | null
  likeCount: number
  commentCount: number
  isLiked: boolean
  createdAt: string
  celebrity?: { name: string; slug: string; profileImage: string | null }
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
  haber: 'from-emerald-500 to-teal-600',
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  haber: 'Haber',
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
  futbol_kulubu: 'Futbol Kulübü',
  dizi: 'Dizi',
  film_yapim: 'Film',
  streaming: 'Platform',
  tiyatro: 'Tiyatro',
  konser: 'Konser',
  festival: 'Festival',
  etkinlik: 'Etkinlik',
  muzisyen: 'Müzisyen',
  diger: 'Diğer',
}

const CATEGORY_ICONS: Record<string, any> = {
  oyuncu: Film,
  sarkici: Music,
  futbolcu: Trophy,
  youtuber: Youtube,
  influencer: Instagram,
  yonetmen: Tv,
  futbol_kulubu: Trophy,
  dizi: Tv,
  film_yapim: Film,
  streaming: Globe,
  tiyatro: Star,
  konser: Music,
  festival: Star,
  etkinlik: Star,
  muzisyen: Music,
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

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'az önce'
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`
  if (diff < 604800) return `${Math.floor(diff / 86400)}g`
  if (diff < 2592000) return `${Math.floor(diff / 604800)}hf`
  return `${Math.floor(diff / 2592000)}ay`
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
  const [aboutOpen, setAboutOpen] = useState(false)
  const [totalLikes, setTotalLikes] = useState(0)
  // Comment states
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, PostComment[]>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({})

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
        ? `/api/celebrities/${params.slug}/posts?limit=50`
        : `/api/celebrities/${params.slug}/posts?platform=${platformFilter}&limit=50`
      const res = await fetch(url)
      const data = await res.json()
      const loadedPosts = data.posts || []
      setPosts(loadedPosts)
      const likes = loadedPosts.reduce((sum: number, p: CelebPost) => sum + p.likeCount, 0)
      setTotalLikes(likes)
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
      setTotalLikes(prev => data.liked ? prev + 1 : prev - 1)
    } catch {}
  }

  const toggleComments = async (postId: string) => {
    const isOpen = openComments[postId]
    setOpenComments(prev => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !comments[postId]) {
      setCommentLoading(prev => ({ ...prev, [postId]: true }))
      try {
        const res = await fetch(`/api/celebrities/${params?.slug}/posts/comments?postId=${postId}`)
        const data = await res.json()
        setComments(prev => ({ ...prev, [postId]: data.comments || [] }))
      } catch {}
      setCommentLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleSendComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim()
    if (!text || !session?.user) return
    setSendingComment(prev => ({ ...prev, [postId]: true }))
    try {
      const res = await fetch(`/api/celebrities/${params?.slug}/posts/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: text }),
      })
      const data = await res.json()
      if (data.comment) {
        setComments(prev => ({ ...prev, [postId]: [data.comment, ...(prev[postId] || [])] }))
        setCommentTexts(prev => ({ ...prev, [postId]: '' }))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
      }
    } catch {}
    setSendingComment(prev => ({ ...prev, [postId]: false }))
  }

  const handleSharePost = async (post: CelebPost) => {
    const shareUrl = post.externalUrl || `${window.location.origin}/unluler/${params?.slug}`
    const shareText = `${celebrity?.name}: ${post.content?.slice(0, 100) || 'Paylaşım'}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: celebrity?.name || '', text: shareText, url: shareUrl }) } catch {}
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  const handleFollow = async () => {
    if (!session?.user) { router.push('/giris'); return }
    if (!celebrity || followLoading) return
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/celebrities/${celebrity.slug}/follow`, { method: 'POST' })
      const data = await res.json()
      setFollowing(data.followed)
      setFollowerCount(data.followerCount)
    } catch (err) { console.error(err) }
    finally { setFollowLoading(false) }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: celebrity?.name, text: `${celebrity?.name} - CanlıFal`, url: window.location.href }) } catch {}
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  if (!celebrity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
          <p className="text-purple-300/50 text-lg mb-4">Ünlü bulunamadı</p>
          <Link href="/unluler" className="text-fuchsia-400 hover:text-fuchsia-300 text-sm">← Tüm Ünlülere Dön</Link>
        </div>
      </div>
    )
  }

  const CategoryIcon = CATEGORY_ICONS[celebrity.category] || Star
  const postPlatforms = new Set(posts.map(p => p.platform))
  const socialPlatforms = celebrity.socialLinks ? Object.keys(celebrity.socialLinks).filter(k => celebrity.socialLinks[k]) : []
  const allPlatforms = new Set([...postPlatforms, ...socialPlatforms.map(p => p === 'twitter' ? 'x' : p)])
  const availableTabs = PLATFORM_TABS.filter(tab => tab.value === 'all' || allPlatforms.has(tab.value))
  const hasAboutContent = celebrity.bio || celebrity.birthDate || celebrity.birthPlace || celebrity.zodiacSign || (celebrity.achievements && celebrity.achievements.length > 0)

  const PlatformIcon = ({ platform }: { platform: string }) => {
    const icons: Record<string, any> = { instagram: Instagram, x: Twitter, youtube: Youtube, tiktok: Play, haber: Newspaper }
    const Icon = icons[platform] || Globe
    return <Icon className="w-3 h-3 text-white" />
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Profile Header */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/20">
              {celebrity.profileImage ? (
                <Image src={celebrity.profileImage} alt={celebrity.name} width={96} height={96} className="object-cover w-full h-full" priority />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{celebrity.name.charAt(0)}</span>
                </div>
              )}
            </div>
            {celebrity.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-[#0a0014] rounded-full p-0.5">
                <BadgeCheck className="w-6 h-6 text-blue-400" />
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-white mt-3">{celebrity.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <CategoryIcon className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-sm text-purple-300/70">{CATEGORY_LABELS[celebrity.category] || celebrity.category}</span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-5 mt-5 w-full">
            <div className="text-center min-w-[60px]">
              <p className="text-lg font-bold text-white">{formatCount(posts.length)}</p>
              <p className="text-[11px] text-purple-400">Paylaşım</p>
            </div>
            <div className="w-px h-8 bg-purple-800/60" />
            <div className="text-center min-w-[60px]">
              <p className="text-lg font-bold text-white">{formatCount(followerCount)}</p>
              <p className="text-[11px] text-purple-400">Takipçi</p>
            </div>
            <div className="w-px h-8 bg-purple-800/60" />
            <div className="text-center min-w-[60px]">
              <p className="text-lg font-bold text-white">{formatCount(totalLikes)}</p>
              <p className="text-[11px] text-purple-400">Beğeni</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2 mt-4 w-full max-w-xs">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                following
                  ? 'bg-white/10 text-purple-200 border border-purple-500/30 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/30'
                  : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-600/30'
              }`}
            >
              {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : following ? <><UserCheck className="w-4 h-4" /> Takip Ediliyor</> : <><Heart className="w-4 h-4" /> Takip Et</>}
            </button>
            <button onClick={handleShare} className="w-11 h-11 rounded-lg bg-white/10 border border-purple-500/20 flex items-center justify-center text-purple-300 hover:bg-white/15 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Fan Club CTA */}
          <Link href={`/unluler/${celebrity.slug}/fan-kulubu`} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all text-sm">
            <Users className="w-4 h-4 text-fuchsia-400" />
            <span className="text-fuchsia-300 font-medium">Fan Kulübü</span>
          </Link>

          {/* Hakkında */}
          {hasAboutContent && (
            <div className="w-full mt-4">
              <button onClick={() => setAboutOpen(!aboutOpen)} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/10 hover:bg-white/8 transition-colors">
                <span className="text-sm font-medium text-purple-200 flex items-center gap-2"><Users className="w-4 h-4 text-fuchsia-400" /> Hakkında</span>
                {aboutOpen ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
              </button>
              <AnimatePresence>
                {aboutOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-4 py-3 space-y-3">
                      {celebrity.bio && <p className="text-sm text-purple-200/70 leading-relaxed whitespace-pre-line">{celebrity.bio}</p>}
                      <div className="flex flex-wrap gap-2">
                        {celebrity.birthDate && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-purple-500/10 text-purple-200"><Calendar className="w-3.5 h-3.5 text-fuchsia-400" />{formatDate(celebrity.birthDate)}</span>}
                        {celebrity.birthPlace && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-purple-500/10 text-purple-200"><MapPin className="w-3.5 h-3.5 text-fuchsia-400" />{celebrity.birthPlace}</span>}
                        {celebrity.zodiacSign && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-purple-500/10 text-purple-200"><Star className="w-3.5 h-3.5 text-yellow-400" />{celebrity.zodiacSign}</span>}
                      </div>
                      {celebrity.achievements && celebrity.achievements.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-purple-300/60 uppercase tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-yellow-400" /> Başarılar</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {celebrity.achievements.map((ach: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/15">⭐ {ach}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {celebrity.socialLinks && Object.keys(celebrity.socialLinks).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Object.entries(celebrity.socialLinks).map(([platform, url]) => {
                            if (!url) return null
                            const icons: Record<string, any> = { instagram: Instagram, youtube: Youtube, tiktok: Music, twitter: Twitter, website: Globe }
                            const colors: Record<string, string> = { instagram: 'text-pink-400', youtube: 'text-red-400', tiktok: 'text-cyan-400', twitter: 'text-blue-400', website: 'text-emerald-400' }
                            const Icon = icons[platform] || Globe
                            return <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-purple-500/10 flex items-center justify-center hover:bg-white/10 transition-colors"><Icon className={`w-4 h-4 ${colors[platform] || 'text-purple-300'}`} /></a>
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="sticky top-12 z-30 backdrop-blur-md border-b border-purple-900/30 mt-4">
        <div className="max-w-lg mx-auto flex items-center overflow-x-auto scrollbar-hide">
          {availableTabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button key={tab.value} onClick={() => setPlatformFilter(tab.value)} className={`flex-1 min-w-0 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors text-xs font-medium ${platformFilter === tab.value ? 'border-fuchsia-400 text-fuchsia-300' : 'border-transparent text-purple-500 hover:text-purple-300'}`}>
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Social Wall Feed */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {postsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" /></div>
        ) : posts.length > 0 ? (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl bg-white/5 border border-purple-500/10 backdrop-blur-sm overflow-hidden"
            >
              {/* Post Header */}
              <div className="flex items-center gap-3 p-3.5">
                <Link href={`/unluler/${celebrity.slug}`}>
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-fuchsia-500/40 flex-shrink-0">
                    {celebrity.profileImage ? (
                      <Image src={celebrity.profileImage} alt={celebrity.name} width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold">{celebrity.name.charAt(0)}</div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white truncate">{celebrity.name}</span>
                    {celebrity.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[post.platform] || 'from-gray-500 to-gray-700'}`}>
                      <PlatformIcon platform={post.platform} />
                      <span className="text-[9px] text-white font-medium">{PLATFORM_LABELS[post.platform] || post.platform}</span>
                    </div>
                    <span className="text-[10px] text-purple-400/50 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
                {post.externalUrl && (
                  <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-purple-400 hover:bg-white/10 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Media */}
              {post.mediaUrl && (
                <div className="relative aspect-square bg-purple-900/20">
                  <Image src={post.mediaUrl} alt={post.content || 'Paylaşım'} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" />
                </div>
              )}

              {/* Actions */}
              <div className="px-3.5 pt-2.5">
                <div className="flex items-center gap-4">
                  <button onClick={() => handleLikePost(post.id)} className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-pink-400' : 'text-purple-300/60 hover:text-pink-400'}`}>
                    <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="text-purple-300/60 hover:text-purple-200 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleSharePost(post)} className="text-purple-300/60 hover:text-purple-200 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                {/* Like count */}
                {post.likeCount > 0 && (
                  <p className="text-xs font-semibold text-white mt-1.5">{formatCount(post.likeCount)} beğeni</p>
                )}
              </div>

              {/* Content */}
              {post.content && (
                <div className="px-3.5 pb-1 mt-1">
                  <p className="text-sm text-purple-200/80 whitespace-pre-line break-words leading-relaxed">
                    <span className="font-semibold text-white mr-1.5">{celebrity.name}</span>
                    {post.content}
                  </p>
                </div>
              )}

              {/* Comment count toggle */}
              {post.commentCount > 0 && !openComments[post.id] && (
                <button onClick={() => toggleComments(post.id)} className="px-3.5 py-1 text-xs text-purple-400/50 hover:text-purple-300 transition-colors">
                  {post.commentCount} yorumun tümünü gör
                </button>
              )}

              {/* Comments */}
              <AnimatePresence>
                {openComments[post.id] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3.5 pb-2 space-y-2 max-h-48 overflow-y-auto">
                      {commentLoading[post.id] ? (
                        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" /></div>
                      ) : (comments[post.id] || []).length === 0 ? (
                        <p className="text-xs text-purple-400/40 py-2">Henüz yorum yok</p>
                      ) : (
                        (comments[post.id] || []).map(c => (
                          <div key={c.id} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-purple-700">
                              {c.user.image ? <Image src={c.user.image} alt="" width={24} height={24} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold">{c.user.name.charAt(0)}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-purple-200/80">
                                <span className="font-semibold text-white mr-1">{c.user.name}</span>
                                {c.content}
                              </p>
                              <span className="text-[10px] text-purple-400/40">{timeAgo(c.createdAt)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Comment input */}
                    {session?.user && (
                      <div className="px-3.5 pb-3 flex items-center gap-2 border-t border-purple-500/10 pt-2">
                        <input
                          type="text"
                          value={commentTexts[post.id] || ''}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(post.id) } }}
                          placeholder="Yorum yaz..."
                          className="flex-1 bg-transparent text-sm text-white placeholder-purple-400/40 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSendComment(post.id)}
                          disabled={!commentTexts[post.id]?.trim() || sendingComment[post.id]}
                          className="text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-30 transition-colors"
                        >
                          {sendingComment[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-1.5" />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-900/30 flex items-center justify-center">
              <Instagram className="w-8 h-8 text-purple-500/40" />
            </div>
            <p className="text-purple-300/50 text-sm">Henüz paylaşım yok</p>
          </div>
        )}
      </div>
    </div>
  )
}