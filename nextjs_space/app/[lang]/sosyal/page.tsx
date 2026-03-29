'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Heart, MessageCircle, Share2, Send, Trash2, User, Coffee, Moon, Star, Sparkles, X, Twitter, Facebook, Link2, Check, ImagePlus, Loader2, Youtube, ExternalLink, Eye, Radio, Hand, Flame, Sun, Gem, Hash, CircleDot } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import YouTubeSearchModal from '@/components/youtube-search-modal'
import ShareCard from '@/components/share-card'
import FramedAvatar from '@/components/framed-avatar'

interface SocialPost {
  id: string
  userId: string
  content: string
  imageUrl?: string
  youtubeUrl?: string
  postType: 'fortune' | 'text' | 'horoscope'
  fortuneType?: string
  isAuto?: boolean
  isPublic: boolean
  createdAt: string
  fortuneCount?: number
  viewCount?: number
  user: {
    id: string
    name: string
    image?: string
    role?: string
    membership?: string
    profileFrame?: { imageUrl: string } | null
    adminAssignedFrame?: { imageUrl: string } | null
  }
  comments: Comment[]
  likes: { userId: string }[]
  _count: {
    comments: number
    likes: number
  }
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
    image?: string
    role?: string
    membership?: string
    profileFrame?: { imageUrl: string } | null
    adminAssignedFrame?: { imageUrl: string } | null
  }
}

function getSocialEffectClass(user: { role?: string; membership?: string }): string {
  if (!user) return ''
  if (user.role === 'admin') return 'effect-glitch'
  const m = user.membership?.toLowerCase()
  if (m === 'diamond') return 'effect-neon-glow'
  if (m === 'gold') return 'effect-neon-flicker'
  if (m === 'premium') return 'effect-blink'
  return ''
}

const FORTUNE_ICONS: Record<string, any> = {
  coffee: Coffee,
  tarot: Star,
  dream: Moon,
  horoscope: Sparkles,
  daily_horoscope: Sun,
  palm: Hand,
  love: Heart,
  numerology: Hash,
  angel: Sparkles,
  aura: CircleDot,
  birthchart: Sun,
  yesno: Gem,
  katina: Star,
  kursundokme: Flame,
  istikhara: Moon,
  askuyumu: Heart,
  // Bana Özel slugs
  'gunluk-tarot': Star,
  'gunluk-burc': Sparkles,
  'yildizname': Star,
  'ask-uyumu': Heart,
  'para-kariyer': Gem,
  'sansli-sayilar': Hash,
  'evren-mesaj': Sparkles,
  'gunluk-kehanet': CircleDot,
  '3-kart-tarot': Star,
  '7-kart-tarot': Star,
  'kahve-fali': Coffee,
  'ruya-yorumu': Moon,
  'nazar-analizi': CircleDot,
  'ask-fali': Heart,
  'gelecek-kehaneti': Sparkles,
  'haftalik-burc': Sparkles,
  'ay-burcu': Moon,
  'yukselen-burc': Sun,
  'enerji-analizi': Flame,
  'spiritüel-rehber': Sparkles,
  'gizli-mesaj': CircleDot,
  'iliski-gelecegi': Heart,
  'ruh-esi': Heart,
  'gizli-duygular': Star,
  'kader-yorumu': Star,
  'sans-kapisi': Gem,
  'astro-tavsiye': Sparkles,
  'astro-enerji': Sparkles,
  'karmik-bag': CircleDot,
  'evren-uyari': Flame,
  default: Sparkles
}

const FORTUNE_IMAGES: Record<string, string> = {
  coffee: '/fortunes/coffee.webp',
  tarot: '/fortunes/tarot.webp',
  horoscope: '/fortunes/horoscope.webp',
  daily_horoscope: '/fortunes/horoscope.webp',
  palm: '/fortunes/palm.webp',
  dream: '/fortunes/dream.webp',
  love: '/fortunes/love.webp',
  numerology: '/fortunes/numerology.webp',
  angel: '/fortunes/angel.webp',
  aura: '/fortunes/aura.webp',
  birthchart: '/fortunes/birthchart.webp',
  yesno: '/fortunes/yesno.webp',
  katina: '/fortunes/katina.webp',
  kursundokme: '/fortunes/dream.webp',
  istikhara: '/fortunes/angel.webp',
  askuyumu: '/fortunes/love.webp',
  // Bana Özel slugs
  'gunluk-tarot': '/fortunes/tarot.webp',
  'gunluk-burc': '/fortunes/horoscope.webp',
  'yildizname': '/fortunes/birthchart.webp',
  'ask-uyumu': '/fortunes/love.webp',
  'para-kariyer': '/fortunes/numerology.webp',
  'sansli-sayilar': '/fortunes/numerology.webp',
  'evren-mesaj': '/fortunes/angel.webp',
  'gunluk-kehanet': '/fortunes/aura.webp',
  '3-kart-tarot': '/fortunes/tarot.webp',
  '7-kart-tarot': '/fortunes/tarot.webp',
  'kahve-fali': '/fortunes/coffee.webp',
  'ruya-yorumu': '/fortunes/dream.webp',
  'nazar-analizi': '/fortunes/aura.webp',
  'ask-fali': '/fortunes/love.webp',
  'gelecek-kehaneti': '/fortunes/aura.webp',
  'haftalik-burc': '/fortunes/horoscope.webp',
  'ay-burcu': '/fortunes/horoscope.webp',
  'yukselen-burc': '/fortunes/horoscope.webp',
  'enerji-analizi': '/fortunes/aura.webp',
  'spiritüel-rehber': '/fortunes/angel.webp',
  'gizli-mesaj': '/fortunes/angel.webp',
  'iliski-gelecegi': '/fortunes/love.webp',
  'ruh-esi': '/fortunes/love.webp',
  'gizli-duygular': '/fortunes/love.webp',
  'kader-yorumu': '/fortunes/birthchart.webp',
  'sans-kapisi': '/fortunes/yesno.webp',
  'astro-tavsiye': '/fortunes/horoscope.webp',
  'astro-enerji': '/fortunes/horoscope.webp',
  'karmik-bag': '/fortunes/aura.webp',
  'evren-uyari': '/fortunes/angel.webp'
}

const FORTUNE_LABELS: Record<string, Record<string, string>> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Fortune' },
  tarot: { tr: 'Tarot', en: 'Tarot' },
  dream: { tr: 'Rüya Yorumu', en: 'Dream' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope' },
  palm: { tr: 'El Falı', en: 'Palm Reading' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  aura: { tr: 'Aura Analizi', en: 'Aura' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart' },
  istikhara: { tr: 'İstihare', en: 'Istikhara' },
  katina: { tr: 'Katina Falı', en: 'Katina' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring' },
  yesno: { tr: 'Evet/Hayır', en: 'Yes/No' },
  love: { tr: 'Aşk Falı', en: 'Love Fortune' },
  text: { tr: 'Paylaşım', en: 'Post' },
  // Bana Özel slugs
  'gunluk-tarot': { tr: 'Günlük Tarot Kartı', en: 'Daily Tarot Card' },
  'gunluk-burc': { tr: 'Günlük Burç Yorumu', en: 'Daily Horoscope' },
  'yildizname': { tr: 'Yıldızname Yorumu', en: 'Star Chart Reading' },
  'ask-uyumu': { tr: 'Aşk Uyumu Analizi', en: 'Love Compatibility' },
  'para-kariyer': { tr: 'Para ve Kariyer Falı', en: 'Money & Career Reading' },
  'sansli-sayilar': { tr: 'Günün Şanslı Sayıları', en: 'Lucky Numbers' },
  'evren-mesaj': { tr: 'Evrenin Sana Mesajı', en: 'Universe Message' },
  'gunluk-kehanet': { tr: 'Günlük Kehanet', en: 'Daily Prophecy' },
  '3-kart-tarot': { tr: '3 Kart Tarot Açılımı', en: '3 Card Tarot Spread' },
  '7-kart-tarot': { tr: '7 Kart Tarot Açılımı', en: '7 Card Tarot Spread' },
  'kahve-fali': { tr: 'Kahve Falı Yorumu', en: 'Coffee Reading' },
  'ruya-yorumu': { tr: 'Rüya Yorumu', en: 'Dream Interpretation' },
  'nazar-analizi': { tr: 'Nazar Analizi', en: 'Evil Eye Analysis' },
  'ask-fali': { tr: 'Aşk Falı', en: 'Love Fortune' },
  'gelecek-kehaneti': { tr: 'Gelecek Kehaneti', en: 'Future Prophecy' },
  'haftalik-burc': { tr: 'Haftalık Burç Yorumu', en: 'Weekly Horoscope' },
  'ay-burcu': { tr: 'Ay Burcu Yorumu', en: 'Moon Sign Reading' },
  'yukselen-burc': { tr: 'Yükselen Burç Analizi', en: 'Rising Sign Analysis' },
  'enerji-analizi': { tr: 'Günün Enerji Analizi', en: 'Daily Energy Analysis' },
  'spiritüel-rehber': { tr: 'Spiritüel Rehber Mesajı', en: 'Spiritual Guide Message' },
  'gizli-mesaj': { tr: 'Evrenin Gizli Mesajı', en: 'Hidden Universe Message' },
  'iliski-gelecegi': { tr: 'İlişki Geleceği Analizi', en: 'Relationship Future' },
  'ruh-esi': { tr: 'Ruh Eşi Analizi', en: 'Soulmate Analysis' },
  'gizli-duygular': { tr: 'Gizli Duygular Falı', en: 'Hidden Feelings Reading' },
  'kader-yorumu': { tr: 'Kader Yorumu', en: 'Destiny Reading' },
  'sans-kapisi': { tr: 'Şans Kapısı Falı', en: 'Gate of Fortune' },
  'astro-tavsiye': { tr: 'Günün Astro Tavsiyesi', en: 'Daily Astro Advice' },
  'astro-enerji': { tr: 'Astrolojik Enerji Yorumu', en: 'Astrological Energy' },
  'karmik-bag': { tr: 'Karmik Bağ Analizi', en: 'Karmic Bond Analysis' },
  'evren-uyari': { tr: 'Evrenin Bugünkü Uyarısı', en: "Today's Universe Warning" }
}

export default function SocialPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [shareModal, setShareModal] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string | null>(null)
  const [selectedYoutubeThumbnail, setSelectedYoutubeThumbnail] = useState<string | null>(null)
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/social/posts')
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Handle scroll to post from notification
  useEffect(() => {
    if (!loading && posts.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const postId = params.get('postId')
      if (postId) {
        setHighlightedPostId(postId)
        setTimeout(() => {
          const postElement = document.getElementById(`post-${postId}`)
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
        setTimeout(() => {
          setHighlightedPostId(null)
          window.history.replaceState({}, '', `/sosyal`)
        }, 3000)
      }
    }
  }, [loading, posts, language])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true
        })
      })
      if (!presignedRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': file.type,
          'Content-Disposition': 'attachment'
        },
        body: file
      })
      if (!uploadRes.ok) throw new Error('Failed to upload image')
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })
      if (!urlRes.ok) throw new Error('Failed to get image URL')
      const { url } = await urlRes.json()
      return url
    } catch (error) {
      console.error('Image upload error:', error)
      return null
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleYoutubeSelect = (videoUrl: string, videoTitle: string, thumbnail: string) => {
    setSelectedYoutubeUrl(videoUrl)
    setSelectedYoutubeThumbnail(thumbnail)
    if (!newPostContent.trim() && videoTitle) {
      setNewPostContent(videoTitle)
    }
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearYoutubeSelection = () => {
    setSelectedYoutubeUrl(null)
    setSelectedYoutubeThumbnail(null)
  }

  const extractYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedYoutubeUrl && !selectedImage) || posting) return
    setPosting(true)
    try {
      let imageUrl = null
      if (selectedImage) {
        setUploadingImage(true)
        imageUrl = await uploadImage(selectedImage)
        setUploadingImage(false)
      }
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent,
          postType: 'text',
          imageUrl,
          youtubeUrl: selectedYoutubeUrl
        })
      })
      if (res.ok) {
        setNewPostContent('')
        setSelectedImage(null)
        setImagePreview(null)
        setSelectedYoutubeUrl(null)
        setSelectedYoutubeThumbnail(null)
        fetchPosts()
      }
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setPosting(false)
      setUploadingImage(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!session?.user) return
    try {
      const res = await fetch(`/api/social/posts/${postId}/likes`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              _count: { ...post._count, likes: data.likeCount },
              likes: data.liked
                ? [...post.likes, { userId: session.user!.id }]
                : post.likes.filter(l => l.userId !== session.user!.id)
            }
          }
          return post
        }))
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleComment = async (postId: string) => {
    const content = newComment[postId]
    if (!content?.trim() || !session?.user) return
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        const comment = await res.json()
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), comment],
              _count: { ...post._count, comments: post._count.comments + 1 }
            }
          }
          return post
        }))
        setNewComment({ ...newComment, [postId]: '' })
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/social/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId))
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const handleShare = (platform: string, post: SocialPost) => {
    const url = `${window.location.origin}/fal/${post.id}`
    const fortuneLabel = FORTUNE_LABELS[post.fortuneType || 'text']?.[language] || ''
    const shortText = post.content.substring(0, 80) + (post.content.length > 80 ? '...' : '')
    const tiktokText = `${fortuneLabel} ${shortText} #canlifal #fal #keşfet #fortune #tarot #burç`
    const text = `${fortuneLabel}: ${post.content.substring(0, 100)}` + (post.content.length > 100 ? '...' : '')

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
        break
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
        break
      case 'tiktok':
        navigator.clipboard.writeText(tiktokText + '\n\n' + url)
        alert('📋 TikTok için metin kopyalandı!\n\nTikTok uygulamasını açın ve bu metni yapıştırın.')
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        break
    }
    setShareModal(null)
  }

  const isLiked = (post: SocialPost) => {
    return session?.user?.id && post.likes.some(l => l.userId === session.user!.id)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Şimdi'
    if (mins < 60) return `${mins} ${'dk'}`
    if (hours < 24) return `${hours} ${'saat'}`
    if (days < 7) return `${days} ${'gün'}`
    return date.toLocaleDateString('tr-TR')
  }

  return (
    <div className="min-h-screen falclub-starry-bg relative overflow-hidden">
      {/* Animated Stars */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <div className="pt-2 pb-24 sm:pb-28 px-3 sm:px-4 relative z-10">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
          {/* Page Header */}
          <div className="text-center py-1 sm:py-2">
            <h1 className="falclub-section-title justify-center text-lg sm:text-xl">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
              {'SOSYAL AKIŞ'}
            </h1>
            <p className="text-fuchsia-300/60 text-xs sm:text-sm mt-0.5 sm:mt-1">
              {'Fallarını paylaş, keşfet ve etkileşimde bulun'}
            </p>
          </div>

          {/* Create Post Card */}
          {session?.user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="falclub-card p-4 sm:p-5"
            >
              <div className="flex gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 falclub-icon-circle">
                  {session.user.image ? (
                    <Image src={session.user.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center text-white font-bold text-base sm:text-lg">
                      {session.user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={textareaRef}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={selectedYoutubeUrl
                      ? ('Video hakkında bir şeyler yaz...')
                      : ('Ne düşünüyorsun? ✨')}
                    className="w-full bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl p-3 outline-none text-white placeholder-fuchsia-300/50 resize-none text-sm sm:text-base focus:border-fuchsia-400/40 transition-colors"
                    rows={4}
                    maxLength={6000}
                  />

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-fuchsia-500/30">
                      <Image src={imagePreview} alt="Preview" width={400} height={300} className="w-full max-h-64 object-cover" />
                      <button
                        onClick={() => {
                          setSelectedImage(null)
                          setImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* YouTube Preview */}
                  {selectedYoutubeUrl && selectedYoutubeThumbnail && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-fuchsia-500/30">
                      <div className="relative aspect-video">
                        <Image src={selectedYoutubeThumbnail} alt="YouTube Video" fill className="object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={clearYoutubeSelection}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded text-xs text-white">
                        <Youtube className="w-3 h-3 text-red-500" />
                        YouTube
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-fuchsia-500/20">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!!selectedYoutubeUrl}
                        className="p-1.5 sm:p-2 text-fuchsia-300/70 hover:text-fuchsia-200 hover:bg-fuchsia-500/15 rounded-lg transition-colors disabled:opacity-40"
                        title={'Resim ekle'}
                      >
                        <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => setYoutubeModalOpen(true)}
                        disabled={!!selectedImage}
                        className="p-1.5 sm:p-2 text-fuchsia-300/70 hover:text-red-400 hover:bg-fuchsia-500/15 rounded-lg transition-colors disabled:opacity-40"
                        title={'YouTube video ekle'}
                      >
                        <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <span className="text-[10px] sm:text-xs text-fuchsia-400/40 hidden sm:inline">
                        {newPostContent.length}/6000
                      </span>
                    </div>
                    <button
                      onClick={handleCreatePost}
                      disabled={(!newPostContent.trim() && !selectedYoutubeUrl && !selectedImage) || posting || uploadingImage}
                      className="falclub-btn !px-3 sm:!px-5 !py-1.5 sm:!py-2 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 disabled:opacity-40"
                    >
                      {(posting || uploadingImage) ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                      {uploadingImage
                        ? ('Yükleniyor...')
                        : ('Paylaş')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Posts Feed */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-16 gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-fuchsia-300/60 text-xs sm:text-sm">{'Yükleniyor...'}</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="falclub-card p-6 sm:p-8 text-center">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-fuchsia-400/50 mx-auto mb-2 sm:mb-3" />
              <p className="text-fuchsia-300/70 text-sm sm:text-base">
                {'Henüz paylaşım yok'}
              </p>
              <p className="text-fuchsia-400/40 text-xs sm:text-sm mt-1">
                {'İlk paylaşımı sen yap!'}
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="space-y-4 sm:space-y-5"
            >
              <AnimatePresence>
                {posts.map((post, index) => {
                  const IconComponent = FORTUNE_ICONS[post.fortuneType || 'default'] || FORTUNE_ICONS.default
                  const isHighlighted = highlightedPostId === post.id

                  return (
                    <motion.div
                      key={post.id}
                      id={`post-${post.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: isHighlighted ? [1, 1.02, 1] : 1,
                        boxShadow: isHighlighted ? ['0 0 0 rgba(217, 70, 239, 0)', '0 0 25px rgba(217, 70, 239, 0.6)', '0 0 0 rgba(217, 70, 239, 0)'] : 'none'
                      }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        delay: index * 0.03,
                        scale: { duration: 1.5, repeat: isHighlighted ? 2 : 0 },
                        boxShadow: { duration: 1.5, repeat: isHighlighted ? 2 : 0 }
                      }}
                      className={`falclub-card overflow-hidden ${
                        isHighlighted ? 'ring-2 ring-fuchsia-400' : ''
                      }`}
                    >
                      {/* Post Header */}
                      <div className="p-3 sm:p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/profil/${post.user.id}`} className="flex items-center gap-2 sm:gap-3 group min-w-0 flex-1">
                            <FramedAvatar
                              src={post.user.image}
                              alt={post.user.name || ''}
                              size={44}
                              frameUrl={post.user.adminAssignedFrame?.imageUrl || post.user.profileFrame?.imageUrl}
                              fallbackInitial={post.user.name?.charAt(0) || '?'}
                              borderColor="border-fuchsia-500/50"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-white font-medium group-hover:text-fuchsia-300 transition-colors text-xs sm:text-sm truncate ${getSocialEffectClass(post.user)}`} data-text={post.user.name}>{post.user.name}</p>
                              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-fuchsia-400/60 flex-wrap">
                                <span>{formatDate(post.createdAt)}</span>
                                {post.fortuneType && (
                                  <>
                                    <span className="text-fuchsia-500/40">•</span>
                                    <span className="flex items-center gap-1 text-fuchsia-300/70 truncate">
                                      {FORTUNE_IMAGES[post.fortuneType] ? (
                                        <span className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden flex-shrink-0 border border-fuchsia-500/30">
                                          <Image src={FORTUNE_IMAGES[post.fortuneType]} alt={FORTUNE_LABELS[post.fortuneType]?.[language] || post.fortuneType} fill className="object-cover" />
                                        </span>
                                      ) : (
                                        <IconComponent className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{FORTUNE_LABELS[post.fortuneType]?.[language] || post.fortuneType}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Link>
                          {(session?.user?.id === post.userId || session?.user?.role === 'admin') && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-fuchsia-400/30 hover:text-red-400 p-1 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Post Content */}
                      <div
                        className="px-3 sm:px-4 pb-2 sm:pb-3 cursor-pointer"
                        onClick={() => router.push(`/profil/${post.user.id}`)}
                      >
                        {(() => {
                          const charLimit = 250;
                          const needsTruncate = post.content.length > charLimit && !expandedContent[post.id];
                          if (needsTruncate) {
                            return (
                              <div>
                                <p className="text-purple-100/90 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                                  {post.content.substring(0, charLimit)}...
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setExpandedContent({ ...expandedContent, [post.id]: true }); }}
                                  className="text-fuchsia-400 text-xs sm:text-sm font-medium mt-1 hover:text-fuchsia-300 transition-colors"
                                >
                                  {'devamını oku'}
                                </button>
                              </div>
                            );
                          }
                          return <p className="text-purple-100/90 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{post.content}</p>;
                        })()}

                        {/* Post Image */}
                        {post.imageUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-fuchsia-500/20" onClick={(e) => e.stopPropagation()}>
                            <Image
                              src={post.imageUrl}
                              alt="Post image"
                              width={600}
                              height={400}
                              className="w-full max-h-96 object-cover"
                            />
                          </div>
                        )}

                        {/* YouTube Video Embed */}
                        {post.youtubeUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-fuchsia-500/20" onClick={(e) => e.stopPropagation()}>
                            <div className="relative aspect-video bg-black">
                              <iframe
                                src={`https://www.youtube.com/embed/${extractYoutubeId(post.youtubeUrl)}?rel=0`}
                                title="YouTube video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                              />
                            </div>
                          </div>
                        )}

                        {/* Auto-shared badge */}
                        {post.isAuto && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1 text-xs text-fuchsia-300/70 bg-fuchsia-500/10 px-2.5 py-1 rounded-full border border-fuchsia-500/20">
                              <Sparkles className="w-3 h-3" />
                              {'Otomatik paylaşıldı'}
                            </div>
                            {post.fortuneCount && post.fortuneCount > 0 && (
                              <div className="inline-flex items-center gap-1 text-xs text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                <User className="w-3 h-3" />
                                {`Bu kullanıcı ile birlikte ${post.fortuneCount} kişi bu fala baktırdı`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-fuchsia-500/15 flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-5">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 sm:gap-1.5 transition-colors text-xs sm:text-sm ${
                              isLiked(post) ? 'text-pink-400' : 'text-fuchsia-400/60 hover:text-pink-400'
                            }`}
                          >
                            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked(post) ? 'fill-current' : ''}`} />
                            <span>{post._count.likes}</span>
                          </button>
                          <button
                            onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                            className="flex items-center gap-1 sm:gap-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 transition-colors text-xs sm:text-sm"
                          >
                            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>{post._count.comments}</span>
                          </button>
                          {(post.postType === 'fortune' || post.fortuneType) && (
                            <div className="flex items-center gap-1 sm:gap-1.5 text-fuchsia-400/40 text-xs sm:text-sm">
                              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span>{post.viewCount || 0}</span>
                            </div>
                          )}
                          <button
                            onClick={() => setShareModal(post.id)}
                            className="flex items-center gap-1 sm:gap-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 transition-colors text-xs sm:text-sm"
                          >
                            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShareCard postId={post.id} trigger={
                            <span className="flex items-center gap-1 text-[10px] sm:text-xs text-fuchsia-400/40 hover:text-fuchsia-300 transition-colors cursor-pointer">
                              🎨 Kart
                            </span>
                          } />
                          <Link
                            href={`/fal/${post.id}`}
                            className="flex items-center gap-1 text-[10px] sm:text-xs text-fuchsia-400/40 hover:text-fuchsia-300 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {'Detay'}
                          </Link>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <AnimatePresence>
                        {expandedPost === post.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-fuchsia-500/15 overflow-hidden"
                          >
                            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                              {post.comments?.map(comment => (
                                <div key={comment.id} className="flex gap-2">
                                  <Link href={`/profil/${comment.user.id}`} className="flex-shrink-0">
                                    <FramedAvatar
                                      src={comment.user.image}
                                      alt={comment.user.name || ''}
                                      size={32}
                                      frameUrl={comment.user.adminAssignedFrame?.imageUrl || comment.user.profileFrame?.imageUrl}
                                      fallbackInitial={comment.user.name?.charAt(0) || '?'}
                                      borderColor="border-fuchsia-500/30"
                                    />
                                  </Link>
                                  <div className="bg-fuchsia-500/10 border border-fuchsia-500/15 rounded-xl p-2 sm:p-2.5 flex-1 min-w-0">
                                    <Link href={`/profil/${comment.user.id}`} className={`text-[10px] sm:text-xs text-fuchsia-300 font-medium hover:text-fuchsia-200 ${getSocialEffectClass(comment.user)}`} data-text={comment.user.name}>{comment.user.name}</Link>
                                    <p className="text-xs sm:text-sm text-purple-100/80 mt-0.5 break-words">{comment.content}</p>
                                  </div>
                                </div>
                              ))}

                              {session?.user && (
                                <div className="flex gap-2">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm flex-shrink-0 border border-fuchsia-500/30 overflow-hidden">
                                    {session.user.image ? (
                                      <Image src={session.user.image} alt="" width={32} height={32} className="rounded-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-fuchsia-700 to-purple-700 flex items-center justify-center">
                                        {session.user.name?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 flex gap-1.5 sm:gap-2 min-w-0">
                                    <input
                                      type="text"
                                      value={newComment[post.id] || ''}
                                      onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                                      placeholder={'Yorum yaz...'}
                                      className="flex-1 min-w-0 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-fuchsia-400/40 outline-none focus:border-fuchsia-400/50 transition-colors"
                                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                    />
                                    <button
                                      onClick={() => handleComment(post.id)}
                                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-fuchsia-500/20 text-fuchsia-300 rounded-xl hover:bg-fuchsia-500/30 border border-fuchsia-500/20 transition-colors flex-shrink-0"
                                    >
                                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Share Modal */}
                      <AnimatePresence>
                        {shareModal === post.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShareModal(null)}
                          >
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              onClick={(e) => e.stopPropagation()}
                              className="falclub-card p-6 max-w-sm w-full"
                            >
                              <div className="flex justify-between items-center mb-5">
                                <h3 className="falclub-section-title text-base">
                                  <Share2 className="w-4 h-4" />
                                  {'Paylaş'}
                                </h3>
                                <button onClick={() => setShareModal(null)} className="text-fuchsia-400/50 hover:text-fuchsia-300 transition-colors">
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => handleShare('tiktok', post)}
                                  className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#00f2ea]/15 to-[#ff0050]/15 text-white rounded-xl hover:from-[#00f2ea]/25 hover:to-[#ff0050]/25 col-span-2 font-semibold border border-fuchsia-500/20 transition-colors"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                  </svg>
                                  TikTok
                                </button>
                                <button
                                  onClick={() => handleShare('twitter', post)}
                                  className="flex items-center justify-center gap-2 p-3 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-xl hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/20 transition-colors"
                                >
                                  <Twitter className="w-5 h-5" />
                                  Twitter
                                </button>
                                <button
                                  onClick={() => handleShare('facebook', post)}
                                  className="flex items-center justify-center gap-2 p-3 bg-[#4267B2]/10 text-[#4267B2] rounded-xl hover:bg-[#4267B2]/20 border border-[#4267B2]/20 transition-colors"
                                >
                                  <Facebook className="w-5 h-5" />
                                  Facebook
                                </button>
                                <button
                                  onClick={() => handleShare('whatsapp', post)}
                                  className="flex items-center justify-center gap-2 p-3 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-colors"
                                >
                                  <MessageCircle className="w-5 h-5" />
                                  WhatsApp
                                </button>
                                <button
                                  onClick={() => handleShare('copy', post)}
                                  className="flex items-center justify-center gap-2 p-3 bg-fuchsia-500/10 text-fuchsia-300 rounded-xl hover:bg-fuchsia-500/20 border border-fuchsia-500/20 transition-colors"
                                >
                                  {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                                  {copied ? ('Kopyalandı') : ('Link Kopyala')}
                                </button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Login Prompt */}
          {!session?.user && (
            <div className="falclub-card p-6 sm:p-8 text-center">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-fuchsia-400/50 mx-auto mb-2 sm:mb-3" />
              <p className="text-fuchsia-300/70 text-sm sm:text-base mb-3 sm:mb-4">
                {'Paylaşım yapmak ve etkileşimde bulunmak için giriş yapın'}
              </p>
              <Link
                href={`/giris`}
                className="falclub-btn inline-block text-sm sm:text-base"
              >
                {'Giriş Yap'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* YouTube Search Modal */}
      <YouTubeSearchModal
        isOpen={youtubeModalOpen}
        onClose={() => setYoutubeModalOpen(false)}
        onSelect={handleYoutubeSelect}
        language={language}
      />
    </div>
  )
}
