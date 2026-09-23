'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, ArrowLeft, Coffee, Moon, Star, Sparkles, Twitter, Facebook, Link2, Check, Send, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import InstagramShare from '@/components/instagram-share'
import { format } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'

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

interface Post {
  id: string
  userId: string
  content: string
  imageUrl?: string
  youtubeUrl?: string
  postType: string
  fortuneType?: string
  isAuto?: boolean
  isPublic: boolean
  createdAt: string
  viewCount?: number
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

const FORTUNE_ICONS: Record<string, any> = {
  coffee: Coffee,
  tarot: Star,
  dream: Moon,
  horoscope: Sparkles,
  default: Sparkles
}

interface Props {
  post: Post
  lang: string
  fortuneLabel: string
}

export default function FortuneDetailClient({ post, lang, fortuneLabel }: Props) {
  const { data: session } = useSession() || {}
  const [isLiked, setIsLiked] = useState(post.likes.some(l => l.userId === session?.user?.id))
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [viewCount, setViewCount] = useState(post.viewCount || 0)
  const [comments, setComments] = useState(post.comments)
  const [newComment, setNewComment] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const viewTrackedRef = useRef(false)

  const FortuneIcon = FORTUNE_ICONS[post.fortuneType || 'default'] || FORTUNE_ICONS.default
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${baseUrl}/fal/${post.id}`

  // Track view when page loads (only once)
  useEffect(() => {
    if (!viewTrackedRef.current && (post.postType === 'fortune' || post.fortuneType)) {
      viewTrackedRef.current = true
      fetch(`/api/social/posts/${post.id}/view`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.viewCount !== undefined) {
            setViewCount(data.viewCount)
          }
        })
        .catch(() => {})
    }
  }, [post.id, post.postType, post.fortuneType])

  const handleLike = async () => {
    if (!session?.user) return
    try {
      const res = await fetch(`/api/social/posts/${post.id}/likes`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.liked)
        setLikeCount(prev => data.liked ? prev + 1 : prev - 1)
      }
    } catch (e) {}
  }

  const handleComment = async () => {
    if (!session?.user || !newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [...prev, comment])
        setNewComment('')
      }
    } catch (e) {}
    setSubmitting(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareTwitter = () => {
    const text = lang === 'tr' 
      ? `${fortuneLabel} - Canlifal'da keşfet!` 
      : `${fortuneLabel} - Discover on Canlifal!`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0a2e] to-[#0a0118]">
      {/* Header */}
      <header className="sticky top-0 z-50 /95 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/sosyal`} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <FortuneIcon className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white font-semibold">{fortuneLabel}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 rounded-2xl border border-purple-500/20 overflow-hidden"
        >
          {/* Author Info */}
          <Link 
            href={`/profil/${post.user.id}`}
            className="p-4 flex items-center gap-3 border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors"
          >
            {post.user.image ? (
              <Image
                src={post.user.image}
                alt={post.user.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{post.user.name[0]}</span>
              </div>
            )}
            <div className="flex-1">
              <p className="text-white font-semibold hover:text-purple-300 transition-colors">{post.user.name}</p>
              <p className="text-white/50 text-sm">
                {format(new Date(post.createdAt), 'd MMMM yyyy, HH:mm', { locale: lang === 'tr' ? tr : enUS })}
              </p>
            </div>
          </Link>

          {/* Image */}
          {post.imageUrl && (
            <div className="relative aspect-video bg-black/30">
              <Image
                src={post.imageUrl}
                alt={fortuneLabel}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}

          {/* YouTube Embed */}
          {post.youtubeUrl && (
            <div className="relative aspect-video bg-black">
              <iframe
                src={post.youtubeUrl.replace('watch?v=', 'embed/')}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                title={fortuneLabel}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            <div className="text-white/90 text-base leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-purple-500/10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-white/60 hover:text-red-400'
                }`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm">{likeCount}</span>
              </button>
              <div className="flex items-center gap-2 text-white/60">
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm">{comments.length}</span>
              </div>
              {(post.postType === 'fortune' || post.fortuneType) && (
                <div className="flex items-center gap-2 text-white/50">
                  <Eye className="w-6 h-6" />
                  <span className="text-sm">{viewCount}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShareOpen(!shareOpen)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>

          {/* Share Options */}
          {shareOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 pb-4 flex items-center gap-3"
            >
              <button
                onClick={handleShareTwitter}
                className="flex items-center gap-2 bg-[#1DA1F2] text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                <Twitter className="w-4 h-4" /> Twitter
              </button>
              <button
                onClick={handleShareFacebook}
                className="flex items-center gap-2 bg-[#4267B2] text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                <Facebook className="w-4 h-4" /> Facebook
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
                {copied ? (lang === 'tr' ? 'Kopyalandı!' : 'Copied!') : (lang === 'tr' ? 'Link Kopyala' : 'Copy Link')}
              </button>
              <InstagramShare
                sharerName={post.user.name || 'Kullanıcı'}
                resultMessage={post.content}
                fortuneType={post.fortuneType || 'fortune-detail'}
                trigger={
                  <button className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                  </button>
                }
              />
            </motion.div>
          )}
        </motion.article>

        {/* Comments Section */}
        <section className="mt-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {lang === 'tr' ? 'Yorumlar' : 'Comments'} ({comments.length})
          </h2>

          {/* Comment Input */}
          {session?.user ? (
            <div className="flex items-center gap-3 mb-6">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold">{session.user.name?.[0]}</span>
                </div>
              )}
              <div className="flex-1 flex items-center bg-white/5 rounded-full overflow-hidden border border-purple-500/20">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder={lang === 'tr' ? 'Yorum yaz...' : 'Write a comment...'}
                  className="flex-1 bg-transparent text-white px-4 py-2.5 text-sm focus:outline-none"
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-2 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-center">
              <p className="text-white/60 text-sm mb-2">
                {lang === 'tr' ? 'Yorum yapmak için giriş yapın' : 'Sign in to comment'}
              </p>
              <Link
                href={`/giris`}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                {lang === 'tr' ? 'Giriş Yap' : 'Sign In'}
              </Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 bg-white/5 rounded-xl p-3"
              >
                <Link href={`/profil/${comment.user.id}`} className="flex-shrink-0">
                  {comment.user.image ? (
                    <Image
                      src={comment.user.image}
                      alt={comment.user.name}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover hover:ring-2 hover:ring-gold-400 transition-all"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:ring-2 hover:ring-gold-400 transition-all">
                      <span className="text-white font-bold text-sm">{comment.user.name[0]}</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/profil/${comment.user.id}`} className="text-white font-medium text-sm hover:text-gold-400 transition-colors">{comment.user.name}</Link>
                    <p className="text-white/40 text-xs">
                      {format(new Date(comment.createdAt), 'd MMM, HH:mm', { locale: lang === 'tr' ? tr : enUS })}
                    </p>
                  </div>
                  <p className="text-white/80 text-sm mt-1">{comment.content}</p>
                </div>
              </motion.div>
            ))}

            {comments.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">
                  {lang === 'tr' ? 'Henüz yorum yok. İlk yorumu sen yap!' : 'No comments yet. Be the first!'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Related Fortunes CTA */}
        <section className="mt-8 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 text-center border border-purple-500/20">
          <h3 className="text-white font-semibold text-lg mb-2">
            {lang === 'tr' ? 'Sen de falını baktır!' : 'Get your fortune reading!'}
          </h3>
          <p className="text-white/60 text-sm mb-4">
            {lang === 'tr' 
              ? 'Ücretsiz fal hizmetlerimizi keşfet ve geleceğini öğren'
              : 'Discover our free fortune services and learn your future'}
          </p>
          <Link
            href={`/fallar`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-5 h-5" />
            {lang === 'tr' ? 'Falları Keşfet' : 'Explore Fortunes'}
          </Link>
        </section>
      </main>
    </div>
  )
}
