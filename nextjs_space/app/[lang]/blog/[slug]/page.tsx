'use client'

import { useParams, useRouter } from 'next/navigation'
import { SITE_NAME, SITE_URL } from '@/lib/seo-config'
import { addInternalLinks } from '@/lib/auto-linker'
import { ArrowLeft, BookOpen, Calendar, Tag, Clock, Eye, ChevronRight, Share2, Heart, ThumbsUp, User, Bookmark, MessageCircle, Send, Reply, Trash2, Facebook, Loader2, Check, Copy, LinkIcon, Crown, Lock } from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingSpinner from '@/components/loading-spinner'
import RelatedContentLinks from '@/components/related-content-links'

interface BlogPost {
  id: string
  slug: string
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  contentTr: string
  contentEn: string
  category: string
  keywords: string[]
  metaDescription: string
  coverImage: string
  readTime: number
  views: number
  likes: number
  authorName: string
  isPremium: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

interface RelatedPost {
  id: string
  slug: string
  titleTr: string
  descTr: string
  category: string
  coverImage: string
  readTime: number
  views: number
  publishedAt: string | null
  createdAt: string
}

interface BlogCategory {
  id: string
  slug: string
  nameTr: string
}

interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  parentId: string | null
  createdAt: string
}

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Interactions
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [replies, setReplies] = useState<Comment[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [replyText, setReplyText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // Share
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const [postRes, relatedRes, catsRes] = await Promise.all([
          fetch(`/api/blog?slug=${encodeURIComponent(slug)}`),
          fetch(`/api/blog/related?slug=${encodeURIComponent(slug)}&limit=4`),
          fetch('/api/blog/categories'),
        ])
        if (postRes.ok) {
          const data = await postRes.json()
          if (data.post) {
            setPost(data.post)
            setLikesCount(data.post.likes || 0)
          }
        }
        if (relatedRes.ok) {
          const data = await relatedRes.json()
          setRelatedPosts(data.posts || [])
        }
        if (catsRes.ok) {
          const data = await catsRes.json()
          setCategories(data.categories || [])
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchPost()
  }, [slug])

  // Fetch interactions (liked/favorited status)
  useEffect(() => {
    if (!post?.id) return
    fetch(`/api/blog/interactions?postId=${post.id}`)
      .then(r => r.json())
      .then(data => {
        setLiked(data.liked || false)
        setFavorited(data.favorited || false)
        if (data.likesCount !== undefined) setLikesCount(data.likesCount)
      })
      .catch(() => {})
  }, [post?.id])

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!post?.id) return
    setCommentLoading(true)
    try {
      const res = await fetch(`/api/blog/comments?postId=${post.id}`)
      const data = await res.json()
      setComments(data.comments || [])
      setReplies(data.replies || [])
      setCommentTotal(data.total || 0)
    } catch (e) { console.error(e) }
    setCommentLoading(false)
  }, [post?.id])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Like toggle
  const handleLike = async () => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    if (likeLoading || !post) return
    setLikeLoading(true)
    try {
      const res = await fetch('/api/blog/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setLiked(data.liked)
        setLikesCount(prev => data.liked ? prev + 1 : Math.max(0, prev - 1))
      }
    } catch (e) { console.error(e) }
    setLikeLoading(false)
  }

  // Favorite toggle
  const handleFavorite = async () => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    if (favLoading || !post) return
    setFavLoading(true)
    try {
      const res = await fetch('/api/blog/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      })
      const data = await res.json()
      if (res.ok) setFavorited(data.favorited)
    } catch (e) { console.error(e) }
    setFavLoading(false)
  }

  // Submit comment
  const handleSubmitComment = async (parentId?: string) => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    const text = parentId ? replyText : commentText
    if (!text.trim() || !post) return
    setCommentSubmitting(true)
    try {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content: text.trim(), parentId: parentId || null }),
      })
      if (res.ok) {
        if (parentId) { setReplyText(''); setReplyTo(null) }
        else setCommentText('')
        await fetchComments()
      } else {
        const d = await res.json()
        alert(d.error || 'Hata')
      }
    } catch (e) { console.error(e) }
    setCommentSubmitting(false)
  }

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/blog/comments?id=${commentId}`, { method: 'DELETE' })
      if (res.ok) await fetchComments()
    } catch (e) { console.error(e) }
  }

  // Share helpers
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/blog/${slug}`
  const shareTitle = post?.titleTr || ''

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, url: shareUrl }) } catch {}
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const shareToTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  const shareToFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  const shareToWhatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank')
  const shareToTelegram = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')

  const formatDate = (date: string | null) => {
    if (!date) return ''
    try { return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
  }

  const timeAgo = (date: string) => {
    const now = Date.now()
    const d = new Date(date).getTime()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Az önce'
    if (mins < 60) return `${mins} dk önce`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} saat önce`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} gün önce`
    return formatDate(date)
  }

  const formatViews = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  const getCategoryName = (catSlug: string) => categories.find(c => c.slug === catSlug)?.nameTr || catSlug

  const getRepliesForComment = (commentId: string) => replies.filter(r => r.parentId === commentId)

  const currentUserId = (session?.user as any)?.id
  const isAdmin = ((session?.user as any)?.role || '').toLowerCase() === 'admin'

  if (!mounted) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Yazı bulunamadı</p>
          <Link href={`/${lang}/blog`} className="text-purple-400 hover:text-purple-300">Blog&apos;a Dön</Link>
        </div>
      </div>
    )
  }

  const title = post.titleTr
  const desc = post.metaDescription || post.descTr
  const content = addInternalLinks(post.contentTr || '')
  const publishDate = post.publishedAt || post.createdAt

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    image: post.coverImage || undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: publishDate,
    dateModified: post.updatedAt || post.createdAt,
    author: { '@type': 'Person', name: post.authorName },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    keywords: post.keywords.join(', '),
    wordCount: content.replace(/<[^>]*>/g, '').split(/\s+/).length,
    articleSection: getCategoryName(post.category),
    commentCount: commentTotal,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: likesCount,
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: getCategoryName(post.category), item: `${SITE_URL}/blog/kategori/${post.category}` },
      { '@type': 'ListItem', position: 4, name: title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400 mb-6 overflow-hidden">
          <Link href={`/${lang}/blog`} className="hover:text-purple-400 transition flex-shrink-0">Blog</Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <Link href={`/${lang}/blog/kategori/${post.category}`} className="hover:text-purple-400 transition flex-shrink-0">
            {getCategoryName(post.category)}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-gray-500 truncate min-w-0">{title}</span>
        </nav>

        {/* Cover Image */}
        {(post.coverImage || '/hero_background.webp') && (
          <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 bg-gray-800">
            <Image
              src={post.coverImage || '/hero_background.webp'}
              alt={`${title} - ${getCategoryName(post.category)} | ${SITE_NAME}`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Link
              href={`/${lang}/blog/kategori/${post.category}`}
              className="px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 hover:bg-purple-500/30 transition"
            >
              {getCategoryName(post.category)}
            </Link>
            {post.isPremium && (
              <span className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4 break-words">{title}</h1>
          <p className="text-gray-400 text-sm md:text-lg break-words">{post.descTr}</p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-3 mt-5 pt-5 border-t border-white/10">
            <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-400 flex-wrap">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4 flex-shrink-0" /><span className="truncate max-w-[120px]">{post.authorName}</span></span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><Calendar className="w-4 h-4 flex-shrink-0" />{formatDate(publishDate)}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-4 h-4 flex-shrink-0" />{post.readTime} dk</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><Eye className="w-4 h-4 flex-shrink-0" />{formatViews(post.views)}</span>
            </div>
            {/* Interaction buttons - header */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  liked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-red-400' : ''}`} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>
              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  favorited ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 border border-white/10'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${favorited ? 'fill-yellow-400' : ''}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white/5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 border border-white/10 transition"
                >
                  <Share2 className="w-4 h-4" /> Paylaş
                </button>
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2"
                    >
                      {typeof navigator !== 'undefined' && !!navigator.share && (
                        <button onClick={() => { handleNativeShare(); setShowShareMenu(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition">
                          <Share2 className="w-4 h-4 text-purple-400" /> Paylaş (Cihaz)
                        </button>
                      )}
                      <button onClick={() => { shareToTwitter(); setShowShareMenu(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition">
                        <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        X (Twitter)
                      </button>
                      <button onClick={() => { shareToFacebook(); setShowShareMenu(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition">
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                      </button>
                      <button onClick={() => { shareToWhatsapp(); setShowShareMenu(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition">
                        <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </button>
                      <button onClick={() => { shareToTelegram(); setShowShareMenu(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition">
                        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        Telegram
                      </button>
                      <div className="border-t border-white/10 my-1"></div>
                      <button onClick={() => { handleCopyLink(); setShowShareMenu(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4 text-gray-400" />}
                        {copied ? 'Kopyalandı!' : 'Linki Kopyala'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Article Content */}
        {post.isPremium && !session?.user ? (
          <div className="relative">
            <article
              className="prose prose-invert prose-purple max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-h1:text-2xl prose-h1:mt-10 prose-h1:mb-4
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-strong:text-white
                prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300
                prose-li:text-gray-300
                prose-blockquote:border-purple-500 prose-blockquote:bg-purple-500/5 prose-blockquote:rounded-lg prose-blockquote:p-4
                prose-img:rounded-xl max-h-[300px] overflow-hidden"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent" />
            <div className="relative -mt-8 p-8 rounded-2xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 text-center">
              <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">Premium İçerik</h3>
              <p className="text-gray-400 mb-5">Bu yazının tamamını okumak için giriş yapın veya üye olun.</p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`/${lang}/giris`}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition"
                >
                  Giriş Yap
                </Link>
                <Link
                  href={`/${lang}/kayit-ol`}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/20 transition"
                >
                  Üye Ol
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <article
            className="prose prose-invert prose-purple max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-h1:text-2xl prose-h1:mt-10 prose-h1:mb-4
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-strong:text-white
              prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300
              prose-li:text-gray-300
              prose-blockquote:border-purple-500 prose-blockquote:bg-purple-500/5 prose-blockquote:rounded-lg prose-blockquote:p-4
              prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        {/* Tags */}
        {post.keywords.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5"><Tag className="w-4 h-4" /> Etiketler</p>
            <div className="flex flex-wrap gap-2">
              {post.keywords.map(kw => (
                <span key={kw} className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-default">
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interaction Bar */}
        <div className="mt-8 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm text-gray-300">Bu yazıyı beğendiniz mi?</span>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  liked
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-red-400' : ''}`} />
                <span className="hidden sm:inline">{liked ? 'Beğenildi' : 'Beğen'}</span> {likesCount > 0 && `(${likesCount})`}
              </button>
              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  favorited
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-yellow-500/10 hover:text-yellow-300 hover:border-yellow-500/20'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${favorited ? 'fill-yellow-400' : ''}`} />
                <span className="hidden sm:inline">{favorited ? 'Kaydedildi' : 'Kaydet'}</span>
              </button>
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition"
              >
                <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Paylaş</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <section className="mt-12" id="yorumlar">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            Yorumlar {commentTotal > 0 && <span className="text-sm font-normal text-gray-500">({commentTotal})</span>}
          </h3>

          {/* Comment Input */}
          <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
            {session?.user ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-300">{(session.user as any).name || 'Kullanıcı'}</span>
                </div>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Düşüncelerinizi paylaşın..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 resize-none focus:outline-none focus:border-purple-500/50 transition"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">{commentText.length}/2000</span>
                  <button
                    onClick={() => handleSubmitComment()}
                    disabled={commentSubmitting || !commentText.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gönder
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-3">Yorum yapmak için giriş yapın</p>
                <Link href={`/${lang}/giris`} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition">
                  Giriş Yap
                </Link>
              </div>
            )}
          </div>

          {/* Comments List */}
          {commentLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Henüz yorum yok. İlk yorumu siz yapın!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      {comment.userAvatar ? (
                        <img loading="lazy" src={comment.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{comment.userName}</span>
                        <span className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap break-words overflow-hidden">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {session?.user && (
                          <button
                            onClick={() => { setReplyTo(replyTo?.id === comment.id ? null : comment); setReplyText('') }}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-400 transition"
                          >
                            <Reply className="w-3.5 h-3.5" /> Yanıtla
                          </button>
                        )}
                        {(comment.userId === currentUserId || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Sil
                          </button>
                        )}
                      </div>

                      {/* Reply Form */}
                      {replyTo?.id === comment.id && (
                        <div className="mt-3 flex gap-2">
                          <input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder={`@${comment.userName} yanıtla...`}
                            maxLength={2000}
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                            onKeyDown={e => e.key === 'Enter' && !commentSubmitting && handleSubmitComment(comment.id)}
                          />
                          <button
                            onClick={() => handleSubmitComment(comment.id)}
                            disabled={commentSubmitting || !replyText.trim()}
                            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Replies */}
                      {getRepliesForComment(comment.id).length > 0 && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-purple-500/20">
                          {getRepliesForComment(comment.id).map(reply => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                {reply.userAvatar ? (
                                  <img loading="lazy" src={reply.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <User className="w-3 h-3 text-purple-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium text-white">{reply.userName}</span>
                                  <span className="text-[10px] text-gray-500">{timeAgo(reply.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">{reply.content}</p>
                                {(reply.userId === currentUserId || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-400 mt-1 transition"
                                  >
                                    <Trash2 className="w-3 h-3" /> Sil
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12">
            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" /> Benzer Yazılar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPosts.map((rp, i) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/${lang}/blog/${rp.slug}`} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all group">
                    {rp.coverImage ? (
                      <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                        <Image src={rp.coverImage} alt={rp.titleTr} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-20 rounded-lg flex-shrink-0 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-purple-500/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white group-hover:text-purple-300 transition line-clamp-2">{rp.titleTr}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rp.descTr}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rp.readTime} dk</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(rp.views)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Related Fortune Links */}
      <div className="max-w-4xl mx-auto px-4">
        <RelatedContentLinks
          currentSlug=""
          relatedSlugs={['kahve-fali', 'tarot-fali', 'ruya-yorumu', 'burc-yorumu', 'ruya-sozlugu', 'numeroloji']}
          introText="Fal ve astroloji dünyasını keşfetmeye devam edin. Online fal baktırın, rüya tabirlerinizi öğrenin ve günlük burç yorumlarınızı okuyun."
        />
      </div>

      {/* Click outside to close share menu */}
      {showShareMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
      )}
    </div>
  )
}
