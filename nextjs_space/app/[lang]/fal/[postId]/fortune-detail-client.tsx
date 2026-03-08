'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, ArrowLeft, Coffee, Moon, Star, Sparkles, Twitter, Facebook, Link2, Check, Send } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
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
  const [comments, setComments] = useState(post.comments)
  const [newComment, setNewComment] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const FortuneIcon = FORTUNE_ICONS[post.fortuneType || 'default'] || FORTUNE_ICONS.default
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${baseUrl}/${lang}/fal/${post.id}`

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
      ? `${fortuneLabel} - Falcı'da keşfet!` 
      : `${fortuneLabel} - Discover on Falci!`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0a2e] to-[#0a0118]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/${lang}/social`} className="text-white/70 hover:text-white">
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
          <div className="p-4 flex items-center gap-3 border-b border-purple-500/10">
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
            <div>
              <p className="text-white font-semibold">{post.user.name}</p>
              <p className="text-white/50 text-sm">
                {format(new Date(post.createdAt), 'd MMMM yyyy, HH:mm', { locale: lang === 'tr' ? tr : enUS })}
              </p>
            </div>
          </div>

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
            <div className="flex items-center gap-6">
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
                href={`/${lang}/login`}
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
                {comment.user.image ? (
                  <Image
                    src={comment.user.image}
                    alt={comment.user.name}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{comment.user.name[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{comment.user.name}</p>
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
            href={`/${lang}/fortunes`}
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
