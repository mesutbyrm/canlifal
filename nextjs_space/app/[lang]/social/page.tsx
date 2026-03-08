'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Heart, MessageCircle, Share2, Send, Trash2, User, Coffee, Moon, Star, Sparkles, X, Twitter, Facebook, Link2, Check, ImagePlus, Loader2, Youtube, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import YouTubeSearchModal from '@/components/youtube-search-modal'

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
  user: {
    id: string
    name: string
    image?: string
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
  }
}

const FORTUNE_ICONS: Record<string, any> = {
  coffee: Coffee,
  tarot: Star,
  dream: Moon,
  horoscope: Sparkles,
  default: Sparkles
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
  text: { tr: 'Paylaşım', en: 'Post' }
}

export default function SocialPage() {
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        // Scroll to post after a short delay
        setTimeout(() => {
          const postElement = document.getElementById(`post-${postId}`)
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
        // Clear highlight after animation
        setTimeout(() => {
          setHighlightedPostId(null)
          // Clean URL
          window.history.replaceState({}, '', `/${language}/social`)
        }, 3000)
      }
    }
  }, [loading, posts, language])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalıdır' : 'File size must be less than 5MB')
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
      // Get presigned URL
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
      
      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': file.type,
          'Content-Disposition': 'attachment'
        },
        body: file
      })
      
      if (!uploadRes.ok) throw new Error('Failed to upload image')
      
      // Get public URL
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
    // Set video title as default content if empty
    if (!newPostContent.trim() && videoTitle) {
      setNewPostContent(videoTitle)
    }
    // Focus on textarea after selection
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    // Clear image if YouTube is selected
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearYoutubeSelection = () => {
    setSelectedYoutubeUrl(null)
    setSelectedYoutubeThumbnail(null)
  }

  // Extract video ID from YouTube URL
  const extractYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const handleCreatePost = async () => {
    // Allow posting if there's content, YouTube video, or image
    if ((!newPostContent.trim() && !selectedYoutubeUrl && !selectedImage) || posting) return
    setPosting(true)
    
    try {
      let imageUrl = null
      
      // Upload image if selected
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
      const res = await fetch(`/api/social/posts/${postId}/likes`, {
        method: 'POST'
      })
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
      const res = await fetch(`/api/social/posts/${postId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId))
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const handleShare = (platform: string, post: SocialPost) => {
    // Use SEO-friendly fortune detail page URL
    const url = `${window.location.origin}/${language}/fal/${post.id}`
    // TikTok-friendly short text (under 150 chars with hashtags)
    const fortuneLabel = FORTUNE_LABELS[post.fortuneType || 'text']?.[language] || ''
    const shortText = post.content.substring(0, 80) + (post.content.length > 80 ? '...' : '')
    const tiktokText = `${fortuneLabel} ${shortText} #falci #fal #keşfet #fortune #tarot #burç`
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
        // TikTok doesn't have direct share URL, copy text for manual paste
        navigator.clipboard.writeText(tiktokText + '\n\n' + url)
        alert(language === 'tr' 
          ? '📋 TikTok için metin kopyalandı!\n\nTikTok uygulamasını açın ve bu metni yapıştırın.' 
          : '📋 Text copied for TikTok!\n\nOpen TikTok app and paste this text.')
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

    if (mins < 1) return language === 'tr' ? 'Şimdi' : 'Just now'
    if (mins < 60) return `${mins} ${language === 'tr' ? 'dk' : 'min'}`
    if (hours < 24) return `${hours} ${language === 'tr' ? 'saat' : 'h'}`
    if (days < 7) return `${days} ${language === 'tr' ? 'gün' : 'd'}`
    return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Sosyal Akış' : 'Social Feed'}
          </h1>
          <p className="text-purple-300">
            {language === 'tr'
              ? 'Fal yorumlarını paylaş, yorum yap ve beğen'
              : 'Share fortunes, comment and like'}
          </p>
        </motion.div>

        {/* Create Post */}
        {session?.user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a0b2e]/80 border border-purple-500/20 rounded-xl p-4 mb-6"
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-gold-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {session.user.image ? (
                  <Image src={session.user.image} alt="" width={40} height={40} className="rounded-full" />
                ) : (
                  session.user.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={selectedYoutubeUrl 
                    ? (language === 'tr' ? 'Video hakkında bir şeyler yaz...' : 'Write something about this video...')
                    : (language === 'tr' ? 'Ne düşünüyorsun?' : "What's on your mind?")}
                  className="w-full bg-transparent border-none outline-none text-white placeholder-purple-400/50 resize-none"
                  rows={3}
                  maxLength={6000}
                />
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative mt-3 rounded-lg overflow-hidden">
                    <Image 
                      src={imagePreview} 
                      alt="Preview" 
                      width={400} 
                      height={300} 
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null)
                        setImagePreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* YouTube Preview */}
                {selectedYoutubeUrl && selectedYoutubeThumbnail && (
                  <div className="relative mt-3 rounded-lg overflow-hidden bg-black/30">
                    <div className="relative aspect-video">
                      <Image 
                        src={selectedYoutubeThumbnail} 
                        alt="YouTube Video" 
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={clearYoutubeSelection}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      <Youtube className="w-3 h-3 text-red-500" />
                      YouTube
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-3">
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
                      className="p-2 text-purple-400 hover:text-gold-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={language === 'tr' ? 'Resim ekle' : 'Add image'}
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setYoutubeModalOpen(true)}
                      disabled={!!selectedImage}
                      className="p-2 text-purple-400 hover:text-red-500 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={language === 'tr' ? 'YouTube video ekle' : 'Add YouTube video'}
                    >
                      <Youtube className="w-5 h-5" />
                    </button>
                    <span className="text-xs text-purple-400/50">
                      {newPostContent.length}/6000
                    </span>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={(!newPostContent.trim() && !selectedYoutubeUrl && !selectedImage) || posting || uploadingImage}
                    className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-[#1a0b2e] font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {(posting || uploadingImage) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {uploadingImage 
                      ? (language === 'tr' ? 'Yükleniyor...' : 'Uploading...') 
                      : (language === 'tr' ? 'Paylaş' : 'Post')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Posts Feed */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-purple-400">
            {language === 'tr' ? 'Henüz paylaşım yok' : 'No posts yet'}
          </div>
        ) : (
          <div className="space-y-4">
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
                      boxShadow: isHighlighted ? ['0 0 0 rgba(212, 175, 55, 0)', '0 0 20px rgba(212, 175, 55, 0.5)', '0 0 0 rgba(212, 175, 55, 0)'] : 'none'
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      delay: index * 0.05,
                      scale: { duration: 1.5, repeat: isHighlighted ? 2 : 0 },
                      boxShadow: { duration: 1.5, repeat: isHighlighted ? 2 : 0 }
                    }}
                    className={`bg-[#1a0b2e]/80 border rounded-xl overflow-hidden ${
                      isHighlighted 
                        ? 'border-gold-500 ring-2 ring-gold-500/50' 
                        : 'border-purple-500/20'
                    }`}
                  >
                    {/* Post Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-gold-500 flex items-center justify-center text-white font-bold">
                            {post.user.image ? (
                              <Image src={post.user.image} alt="" width={40} height={40} className="rounded-full" />
                            ) : (
                              post.user.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{post.user.name}</p>
                            <div className="flex items-center gap-2 text-xs text-purple-400">
                              <span>{formatDate(post.createdAt)}</span>
                              {post.fortuneType && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <IconComponent className="w-3 h-3" />
                                    {FORTUNE_LABELS[post.fortuneType]?.[language] || post.fortuneType}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {(session?.user?.id === post.userId || session?.user?.role === 'admin') && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-400/50 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-3">
                      <p className="text-purple-100 whitespace-pre-wrap">{post.content}</p>
                      
                      {/* Post Image */}
                      {post.imageUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden">
                          <Image 
                            src={post.imageUrl} 
                            alt="Post image" 
                            width={600} 
                            height={400} 
                            className="w-full max-h-96 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* YouTube Video Embed */}
                      {post.youtubeUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden">
                          <div className="relative aspect-video bg-black rounded-lg">
                            <iframe
                              src={`https://www.youtube.com/embed/${extractYoutubeId(post.youtubeUrl)}?rel=0`}
                              title="YouTube video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute inset-0 w-full h-full rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Auto-shared badge with fortune count */}
                      {post.isAuto && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1 text-xs text-purple-400/70 bg-purple-500/10 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            {language === 'tr' ? 'Otomatik paylaşıldı' : 'Auto-shared'}
                          </div>
                          {post.fortuneCount && post.fortuneCount > 0 && (
                            <div className="inline-flex items-center gap-1 text-xs text-gold-400/80 bg-gold-500/10 px-2 py-1 rounded-full">
                              <User className="w-3 h-3" />
                              {language === 'tr' 
                                ? `Bu kullanıcı ile birlikte ${post.fortuneCount} kişi bu fala baktırdı`
                                : `${post.fortuneCount} people including this user viewed this fortune`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 border-t border-purple-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-2 transition-colors ${
                            isLiked(post) ? 'text-red-400' : 'text-purple-400 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isLiked(post) ? 'fill-current' : ''}`} />
                          <span>{post._count.likes}</span>
                        </button>
                        <button
                          onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                          className="flex items-center gap-2 text-purple-400 hover:text-gold-400 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span>{post._count.comments}</span>
                        </button>
                        <button
                          onClick={() => setShareModal(post.id)}
                          className="flex items-center gap-2 text-purple-400 hover:text-gold-400 transition-colors"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                      {/* View Fortune Link for SEO */}
                      <Link
                        href={`/${language}/fal/${post.id}`}
                        className="flex items-center gap-1 text-xs text-purple-400/70 hover:text-gold-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {language === 'tr' ? 'Detay' : 'Details'}
                      </Link>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {expandedPost === post.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-purple-500/10 overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {/* Existing Comments */}
                            {post.comments?.map(comment => (
                              <div key={comment.id} className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-white text-sm flex-shrink-0">
                                  {comment.user.image ? (
                                    <Image src={comment.user.image} alt="" width={32} height={32} className="rounded-full" />
                                  ) : (
                                    comment.user.name?.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="bg-purple-500/10 rounded-lg p-2 flex-1">
                                  <p className="text-xs text-gold-400 font-medium">{comment.user.name}</p>
                                  <p className="text-sm text-purple-100">{comment.content}</p>
                                </div>
                              </div>
                            ))}

                            {/* Add Comment */}
                            {session?.user && (
                              <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-white text-sm flex-shrink-0">
                                  {session.user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 flex gap-2">
                                  <input
                                    type="text"
                                    value={newComment[post.id] || ''}
                                    onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                                    placeholder={language === 'tr' ? 'Yorum yaz...' : 'Write a comment...'}
                                    className="flex-1 bg-purple-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-400/50 outline-none focus:ring-1 focus:ring-gold-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                  />
                                  <button
                                    onClick={() => handleComment(post.id)}
                                    className="px-3 py-2 bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30"
                                  >
                                    <Send className="w-4 h-4" />
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
                          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                          onClick={() => setShareModal(null)}
                        >
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl p-6 max-w-sm w-full"
                          >
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-serif text-gold-400">
                                {language === 'tr' ? 'Paylaş' : 'Share'}
                              </h3>
                              <button onClick={() => setShareModal(null)} className="text-purple-400">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleShare('tiktok', post)}
                                className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#00f2ea]/20 to-[#ff0050]/20 text-white rounded-lg hover:from-[#00f2ea]/30 hover:to-[#ff0050]/30 col-span-2 font-semibold"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                                TikTok
                              </button>
                              <button
                                onClick={() => handleShare('twitter', post)}
                                className="flex items-center justify-center gap-2 p-3 bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/30"
                              >
                                <Twitter className="w-5 h-5" />
                                Twitter
                              </button>
                              <button
                                onClick={() => handleShare('facebook', post)}
                                className="flex items-center justify-center gap-2 p-3 bg-[#4267B2]/20 text-[#4267B2] rounded-lg hover:bg-[#4267B2]/30"
                              >
                                <Facebook className="w-5 h-5" />
                                Facebook
                              </button>
                              <button
                                onClick={() => handleShare('whatsapp', post)}
                                className="flex items-center justify-center gap-2 p-3 bg-[#25D366]/20 text-[#25D366] rounded-lg hover:bg-[#25D366]/30"
                              >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                              </button>
                              <button
                                onClick={() => handleShare('copy', post)}
                                className="flex items-center justify-center gap-2 p-3 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30"
                              >
                                {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                                {copied ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Link Kopyala' : 'Copy Link')}
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
          <div className="text-center py-8">
            <p className="text-purple-400 mb-4">
              {language === 'tr'
                ? 'Paylaşım yapmak ve etkileşimde bulunmak için giriş yapın'
                : 'Login to post and interact'}
            </p>
            <Link
              href={`/${language}/login`}
              className="inline-block px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-[#1a0b2e] font-semibold rounded-lg"
            >
              {language === 'tr' ? 'Giriş Yap' : 'Login'}
            </Link>
          </div>
        )}
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
