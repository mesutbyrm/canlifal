'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Settings, Share2, Grid3X3, Bookmark, Heart, Eye,
  Camera, ChevronRight, Sparkles, Edit3, Plus, X,
  Pin, PinOff, BookmarkPlus, BookmarkMinus, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'

interface UserProfile {
  id: string
  name: string
  username: string | null
  email: string
  image: string | null
  bio: string | null
  credits: number
  followersCount: number
  followingCount: number
  likesCount: number
  postsCount: number
  fortunesCount: number
}

interface Post {
  id: string
  imageUrl: string | null
  content: string
  viewCount: number
  isPinned?: boolean
  _count: { likes: number }
}

interface Fortune {
  id: string
  fortuneType: string
  inputData: string
  aiResponse: string
  language: string
  viewCount: number
  isSaved: boolean
  isPinned: boolean
  pinnedAt: string | null
  createdAt: string
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
  aura: '🌈',
  birthchart: '🌟',
  yesno: '❓',
  katina: '🎴',
  kursundokme: '🧊',
  istikhara: '🌙'
}

const FORTUNE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Reading' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope' },
  daily_horoscope: { tr: 'Günlük Burç', en: 'Daily Horoscope' },
  palm: { tr: 'El Falı', en: 'Palm Reading' },
  dream: { tr: 'Rüya Tabiri', en: 'Dream Interpretation' },
  love: { tr: 'Aşk Falı', en: 'Love Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart' },
  yesno: { tr: 'Evet/Hayır', en: 'Yes/No Oracle' },
  katina: { tr: 'Katina Falı', en: 'Katina Reading' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring' },
  istikhara: { tr: 'İstihare', en: 'Istikhara' }
}

export default function ProfilePage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [fortunes, setFortunes] = useState<Fortune[]>([])
  const [savedFortunes, setSavedFortunes] = useState<Fortune[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'fortunes' | 'saved'>('posts')
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [showLikersModal, setShowLikersModal] = useState(false)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [likers, setLikers] = useState<FollowUser[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${language}/login`)
      return
    }
    
    if (session?.user?.id) {
      fetchProfile()
      fetchPosts()
      fetchFortunes()
    }
  }, [session, status, language])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/social/posts?myPosts=true&limit=30')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (e) {
      console.error('Posts fetch error:', e)
    }
  }

  const fetchFortunes = async () => {
    try {
      const res = await fetch('/api/user/fortunes')
      if (res.ok) {
        const data = await res.json()
        setFortunes(data.fortunes || [])
      }
      
      const savedRes = await fetch('/api/user/fortunes?saved=true')
      if (savedRes.ok) {
        const data = await savedRes.json()
        setSavedFortunes(data.fortunes || [])
      }
    } catch (e) {
      console.error('Fortunes fetch error:', e)
    }
  }

  const fetchFollowers = async () => {
    setModalLoading(true)
    try {
      const res = await fetch('/api/user/followers')
      if (res.ok) {
        const data = await res.json()
        setFollowers(data.followers || [])
      }
    } catch (e) {
      console.error('Followers fetch error:', e)
    } finally {
      setModalLoading(false)
    }
  }

  const fetchFollowing = async () => {
    setModalLoading(true)
    try {
      const res = await fetch('/api/user/following')
      if (res.ok) {
        const data = await res.json()
        setFollowing(data.following || [])
      }
    } catch (e) {
      console.error('Following fetch error:', e)
    } finally {
      setModalLoading(false)
    }
  }

  const fetchLikers = async () => {
    setModalLoading(true)
    try {
      const res = await fetch('/api/user/likers')
      if (res.ok) {
        const data = await res.json()
        setLikers(data.likers || [])
      }
    } catch (e) {
      console.error('Likers fetch error:', e)
    } finally {
      setModalLoading(false)
    }
  }

  const handleFortuneAction = async (fortuneId: string, action: 'save' | 'unsave' | 'pin' | 'unpin') => {
    setActionLoading(fortuneId + action)
    try {
      const res = await fetch(`/api/user/fortunes/${fortuneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (res.ok) {
        fetchFortunes()
      } else {
        const data = await res.json()
        if (data.error) alert(data.error)
      }
    } catch (e) {
      console.error('Fortune action error:', e)
    } finally {
      setActionLoading(null)
    }
  }

  const openFollowersModal = () => {
    setShowFollowersModal(true)
    fetchFollowers()
  }

  const openFollowingModal = () => {
    setShowFollowingModal(true)
    fetchFollowing()
  }

  const openLikersModal = () => {
    setShowLikersModal(true)
    fetchLikers()
  }

  const pinnedFortunes = fortunes.filter(f => f.isPinned)

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session?.user) return null

  const UserListModal = ({ 
    show, 
    onClose, 
    title, 
    users, 
    loading 
  }: { 
    show: boolean
    onClose: () => void
    title: string
    users: FollowUser[]
    loading: boolean
  }) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1a0a2e] rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-purple-900/50">
              <h3 className="text-white font-semibold text-lg">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map(user => (
                    <Link
                      key={user.id}
                      href={`/${language}/profile/${user.username || user.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-900/30 transition-colors"
                      onClick={onClose}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                        {user.image ? (
                          <Image src={user.image} alt={user.name} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-purple-400 text-sm">@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">{language === 'tr' ? 'Henüz kimse yok' : 'No one yet'}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className="min-h-screen bg-[#0a0118] pb-32 pt-6">
      {/* Profile Info */}
      <div className="px-4">
        {/* Avatar - Centered */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Rainbow border */}
            <div 
              className="w-28 h-28 rounded-full p-1"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 25%, #8b5cf6 50%, #3b82f6 75%, #f59e0b 100%)',
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118] p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                  {profile?.image || session.user.image ? (
                    <Image
                      src={profile?.image || session.user.image || ''}
                      alt="Profile"
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {(profile?.name || session.user.name)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Camera button */}
            <Link 
              href={`/${language}/settings`}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-[#0a0118]"
            >
              <Camera className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>

        {/* Name */}
        <h1 className="text-white text-2xl font-bold text-center mt-4">
          {profile?.name || session.user.name}
        </h1>

        {/* Username */}
        <p className="text-purple-400 text-center mt-1">
          @{profile?.username || (profile?.name || session.user.name)?.toLowerCase().replace(/\s+/g, '')}
        </p>

        {/* Bio or Add Bio */}
        <div className="text-center mt-2">
          {profile?.bio ? (
            <p className="text-gray-300 text-sm px-8">{profile.bio}</p>
          ) : (
            <Link href={`/${language}/settings`} className="text-purple-400 text-sm italic">
              + {language === 'tr' ? 'Bio ekle' : 'Add bio'}
            </Link>
          )}
        </div>

        {/* Stats Row - Clickable */}
        <div className="flex items-center justify-center gap-6 mt-5">
          <button onClick={openFollowingModal} className="text-center hover:opacity-80 transition-opacity">
            <p className="text-white text-xl font-bold">{profile?.followingCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Takipte' : 'Following'}</p>
          </button>
          <div className="w-px h-8 bg-gray-700" />
          <button onClick={openFollowersModal} className="text-center hover:opacity-80 transition-opacity">
            <p className="text-white text-xl font-bold">{profile?.followersCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Takipçi' : 'Followers'}</p>
          </button>
          <div className="w-px h-8 bg-gray-700" />
          <button onClick={openLikersModal} className="text-center hover:opacity-80 transition-opacity">
            <p className="text-white text-xl font-bold">{profile?.likesCount || 0}</p>
            <p className="text-gray-400 text-xs">{language === 'tr' ? 'Beğeniler' : 'Likes'}</p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 px-2">
          <Link 
            href={`/${language}/dashboard`}
            className="flex-1 bg-purple-600/80 hover:bg-purple-600 text-white font-semibold py-3 rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span className="leading-tight">{language === 'tr' ? 'İstatistikler' : 'Statistics'}</span>
          </Link>
          <Link 
            href={`/${language}/settings`}
            className="flex-1 border border-purple-500/50 hover:border-purple-400 text-white font-semibold py-3 rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>{language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}</span>
          </Link>
        </div>
      </div>

      {/* Pinned Fortunes */}
      {pinnedFortunes.length > 0 && (
        <div className="mt-6 px-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Pin className="w-4 h-4 text-purple-400" />
            {language === 'tr' ? 'Sabitlenmiş Fallar' : 'Pinned Fortunes'}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {pinnedFortunes.map(fortune => (
              <Link
                key={fortune.id}
                href={`/${language}/dashboard?fortune=${fortune.id}`}
                className="flex-shrink-0 w-32 bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-xl p-3 border border-purple-700/50"
              >
                <div className="text-2xl mb-2">{FORTUNE_ICONS[fortune.fortuneType] || '🔮'}</div>
                <p className="text-white text-xs font-medium truncate">
                  {FORTUNE_NAMES[fortune.fortuneType]?.[language as 'tr' | 'en'] || fortune.fortuneType}
                </p>
                <p className="text-purple-400 text-[10px] mt-1">
                  {format(new Date(fortune.createdAt), 'dd MMM', { locale: language === 'tr' ? tr : enUS })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'posts' ? 'border-b-2 border-white text-white' : 'text-gray-500'
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('fortunes')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'fortunes' ? 'border-b-2 border-white text-white' : 'text-gray-500'
          }`}
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'saved' ? 'border-b-2 border-white text-white' : 'text-gray-500'
          }`}
        >
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Content Grid */}
      <div className="px-0.5 pt-0.5">
        {activeTab === 'posts' && (
          <>
            {posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${language}/fal/${post.id}`}
                    className="relative aspect-[3/4] bg-[#1a1a1a] overflow-hidden group"
                  >
                    {post.isPinned && (
                      <div className="absolute top-1 left-1 z-10 bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        {language === 'tr' ? 'Sabitlendi' : 'Pinned'}
                      </div>
                    )}
                    {post.imageUrl ? (
                      <Image
                        src={post.imageUrl}
                        alt="Post"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white text-sm">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white text-sm">
                        <Heart className="w-4 h-4" />
                        <span>{post._count?.likes || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-white text-xl font-semibold">
                  {language === 'tr' ? 'Henüz paylaşım yok' : 'No posts yet'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {language === 'tr' ? 'Fal paylaşımlarınız burada görünecek' : 'Your fortune posts will appear here'}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'fortunes' && (
          <>
            {fortunes.length > 0 ? (
              <div className="px-4 py-4 space-y-3">
                {fortunes.map((fortune) => (
                  <div
                    key={fortune.id}
                    className="bg-gradient-to-br from-purple-900/40 to-pink-900/20 rounded-xl p-4 border border-purple-700/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{FORTUNE_ICONS[fortune.fortuneType] || '🔮'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-semibold">
                            {FORTUNE_NAMES[fortune.fortuneType]?.[language as 'tr' | 'en'] || fortune.fortuneType}
                          </h4>
                          {fortune.isPinned && (
                            <span className="bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                              {language === 'tr' ? 'Sabitlendi' : 'Pinned'}
                            </span>
                          )}
                        </div>
                        <p className="text-purple-400 text-sm mt-0.5">
                          {format(new Date(fortune.createdAt), 'dd MMMM yyyy, HH:mm', { locale: language === 'tr' ? tr : enUS })}
                        </p>
                        <p className="text-gray-300 text-sm mt-2 line-clamp-2">
                          {fortune.aiResponse.substring(0, 150)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-700/30">
                      <Link
                        href={`/${language}/dashboard?fortune=${fortune.id}`}
                        className="text-purple-400 text-sm font-medium hover:text-purple-300"
                      >
                        {language === 'tr' ? 'Detayları Gör' : 'View Details'} →
                      </Link>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFortuneAction(fortune.id, fortune.isSaved ? 'unsave' : 'save')}
                          disabled={actionLoading === fortune.id + (fortune.isSaved ? 'unsave' : 'save')}
                          className={`p-2 rounded-lg transition-colors ${
                            fortune.isSaved 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                          }`}
                        >
                          {actionLoading === fortune.id + (fortune.isSaved ? 'unsave' : 'save') ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : fortune.isSaved ? (
                            <BookmarkMinus className="w-4 h-4" />
                          ) : (
                            <BookmarkPlus className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleFortuneAction(fortune.id, fortune.isPinned ? 'unpin' : 'pin')}
                          disabled={actionLoading === fortune.id + (fortune.isPinned ? 'unpin' : 'pin')}
                          className={`p-2 rounded-lg transition-colors ${
                            fortune.isPinned 
                              ? 'bg-pink-500 text-white' 
                              : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                          }`}
                        >
                          {actionLoading === fortune.id + (fortune.isPinned ? 'unpin' : 'pin') ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : fortune.isPinned ? (
                            <PinOff className="w-4 h-4" />
                          ) : (
                            <Pin className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-white text-xl font-semibold">
                  {language === 'tr' ? 'Fallarınız' : 'Your Fortunes'}
                </p>
                <p className="text-gray-500 text-sm mt-1 text-center px-8">
                  {language === 'tr' ? 'Baktırdığınız fallar burada görünecek' : 'Your fortune readings will appear here'}
                </p>
                <Link
                  href={`/${language}/fortunes`}
                  className="mt-4 px-6 py-2 bg-[#fe2c55] text-white font-semibold rounded-md"
                >
                  {language === 'tr' ? 'Fal Baktır' : 'Get Fortune'}
                </Link>
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && (
          <>
            {savedFortunes.length > 0 ? (
              <div className="px-4 py-4 space-y-3">
                {savedFortunes.map((fortune) => (
                  <div
                    key={fortune.id}
                    className="bg-gradient-to-br from-purple-900/40 to-pink-900/20 rounded-xl p-4 border border-purple-700/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{FORTUNE_ICONS[fortune.fortuneType] || '🔮'}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold">
                          {FORTUNE_NAMES[fortune.fortuneType]?.[language as 'tr' | 'en'] || fortune.fortuneType}
                        </h4>
                        <p className="text-purple-400 text-sm mt-0.5">
                          {format(new Date(fortune.createdAt), 'dd MMMM yyyy', { locale: language === 'tr' ? tr : enUS })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleFortuneAction(fortune.id, 'unsave')}
                        disabled={actionLoading === fortune.id + 'unsave'}
                        className="p-2 rounded-lg bg-purple-500 text-white"
                      >
                        {actionLoading === fortune.id + 'unsave' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BookmarkMinus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <Link
                      href={`/${language}/dashboard?fortune=${fortune.id}`}
                      className="block mt-3 text-purple-400 text-sm font-medium hover:text-purple-300"
                    >
                      {language === 'tr' ? 'Detayları Gör' : 'View Details'} →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
                  <Bookmark className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-white text-xl font-semibold">
                  {language === 'tr' ? 'Kaydedilenler' : 'Saved'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {language === 'tr' ? 'Kaydettiğiniz fallar burada görünecek' : 'Your saved fortunes will appear here'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <UserListModal
        show={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title={language === 'tr' ? 'Takipçiler' : 'Followers'}
        users={followers}
        loading={modalLoading}
      />
      <UserListModal
        show={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title={language === 'tr' ? 'Takip Edilenler' : 'Following'}
        users={following}
        loading={modalLoading}
      />
      <UserListModal
        show={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        title={language === 'tr' ? 'Beğenenler' : 'Likers'}
        users={likers}
        loading={modalLoading}
      />
    </div>
  )
}
