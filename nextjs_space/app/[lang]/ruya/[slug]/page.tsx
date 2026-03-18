'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Moon, Eye, Calendar, Tag, ChevronRight, Heart, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { useSession } from 'next-auth/react'

interface Dream {
  id: string
  title: string
  slug: string
  content: string
  summary: string | null
  keywords: string[]
  metaDescription: string | null
  views: number
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

interface SimilarDream {
  id: string
  title: string
  slug: string
  summary: string | null
  views: number
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; image: string | null; username: string | null }
}

interface Recommendation {
  id: string
  title: string
  slug: string
  summary: string | null
  views: number
}

export default function DreamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string

  const [dream, setDream] = useState<Dream | null>(null)
  const [similar, setSimilar] = useState<SimilarDream[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Favorites
  const [isFavorited, setIsFavorited] = useState(false)
  const [favCount, setFavCount] = useState(0)
  const [favLoading, setFavLoading] = useState(false)

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const fetchDream = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const res = await fetch(`/api/dreams/${encodeURIComponent(slug)}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setDream(data.dream)
        setSimilar(data.similar || [])
      }
    } catch (e) {
      console.error('Failed to fetch dream', e)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchDream() }, [fetchDream])

  // Record view for recommendations
  useEffect(() => {
    if (slug && session?.user) {
      fetch(`/api/dreams/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {})
    }
  }, [slug, session])

  // Fetch favorite status
  useEffect(() => {
    if (!slug) return
    fetch(`/api/dreams/${encodeURIComponent(slug)}/favorite`)
      .then(r => r.json())
      .then(d => { setIsFavorited(d.isFavorited); setFavCount(d.count) })
      .catch(() => {})
  }, [slug])

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!slug) return
    setCommentLoading(true)
    try {
      const res = await fetch(`/api/dreams/${encodeURIComponent(slug)}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
        setCommentTotal(data.total || 0)
      }
    } catch (e) {
      console.error('Comments fetch error', e)
    } finally {
      setCommentLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Fetch recommendations
  useEffect(() => {
    fetch('/api/dreams/recommendations')
      .then(r => r.json())
      .then(d => setRecommendations(d.recommendations || []))
      .catch(() => {})
  }, [])

  // Update document title
  useEffect(() => {
    if (dream) {
      document.title = `${dream.title} - Rüya Tabiri | Canlifal`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc && dream.metaDescription) {
        metaDesc.setAttribute('content', dream.metaDescription)
      }
    }
  }, [dream])

  const toggleFavorite = async () => {
    if (!session?.user) {
      router.push(`/${lang}/login`)
      return
    }
    setFavLoading(true)
    try {
      const res = await fetch(`/api/dreams/${encodeURIComponent(slug)}/favorite`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsFavorited(data.isFavorited)
        setFavCount(data.count)
      }
    } catch (e) {
      console.error('Favorite toggle error', e)
    } finally {
      setFavLoading(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) {
      router.push(`/${lang}/login`)
      return
    }
    if (!commentText.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    try {
      const res = await fetch(`/api/dreams/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [data.comment, ...prev])
        setCommentTotal(prev => prev + 1)
        setCommentText('')
      }
    } catch (e) {
      console.error('Comment submit error', e)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/dreams/${encodeURIComponent(slug)}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        setCommentTotal(prev => prev - 1)
      }
    } catch (e) {
      console.error('Comment delete error', e)
    }
  }

  // Share functions
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://canlifal.com/${lang}/ruya/${slug}`
  const shareTitle = dream?.title || 'Rüya Tabiri'

  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' - ' + shareUrl)}`, '_blank')
  }
  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }
  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
  }
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {})
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (notFound || !dream) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Moon className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Rüya Tabiri Bulunamadı</h2>
          <p className="text-gray-400 mb-4">Aradığınız rüya tabiri mevcut değil.</p>
          <button
            onClick={() => router.push(`/${lang}/ruya`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tüm Rüya Tabirleri
          </button>
        </div>
      </div>
    )
  }

  const formattedDate = new Date(dream.createdAt).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: dream.title,
    description: dream.metaDescription || dream.summary || '',
    datePublished: dream.createdAt,
    dateModified: dream.updatedAt,
    author: { '@type': 'Organization', name: 'Canlifal' },
    publisher: { '@type': 'Organization', name: 'Canlifal' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://canlifal.com/${lang}/ruya/${dream.slug}`,
    },
    keywords: dream.keywords.join(', '),
  }

  const currentUserId = (session?.user as any)?.id
  const isAdmin = (session?.user as any)?.role === 'admin'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <button onClick={() => router.push(`/${lang}`)} className="hover:text-gray-300 transition-colors">Ana Sayfa</button>
          <ChevronRight className="w-3 h-3" />
          <button onClick={() => router.push(`/${lang}/ruya`)} className="hover:text-gray-300 transition-colors">Rüya Tabirleri</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400 truncate max-w-[200px]">{dream.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{dream.title}</h1>
            </div>
            {/* Favorite button */}
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all flex-shrink-0 ${
                isFavorited
                  ? 'bg-pink-500/20 border border-pink-500/40 text-pink-400'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-pink-400 hover:border-pink-500/30'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-pink-400' : ''}`} />
              <span>{favCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {dream.views + 1} görüntülenme
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> {commentTotal} yorum
            </span>
            {dream.isAiGenerated && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px]">
                AI Yorumu
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        {dream.summary && (
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15 mb-6">
            <p className="text-indigo-200 text-sm leading-relaxed">{dream.summary}</p>
          </div>
        )}

        {/* Content */}
        <article
          className="prose prose-invert prose-indigo max-w-none
            prose-headings:text-white prose-headings:font-semibold
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-sm
            prose-li:text-gray-300 prose-li:text-sm
            prose-strong:text-indigo-300
            prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
          "
          dangerouslySetInnerHTML={{ __html: dream.content }}
        />

        {/* Keywords */}
        {dream.keywords.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-xs font-medium">Etiketler</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dream.keywords.map((kw, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/${lang}/ruya?q=${encodeURIComponent(kw)}`)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Social Share Buttons */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-gray-500 text-xs font-medium mb-3">Bu tabiri paylaşın</p>
          <div className="flex items-center gap-2">
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 text-xs hover:bg-green-600/30 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button
              onClick={shareTwitter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs hover:bg-sky-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter
            </button>
            <button
              onClick={shareFacebook}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs hover:bg-blue-600/30 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Kopyala
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            Yorumlar ({commentTotal})
          </h2>

          {/* Comment form */}
          <form onSubmit={submitComment} className="mb-6">
            <div className="flex gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={session?.user ? 'Yorumunuzu yazın...' : 'Yorum yapmak için giriş yapın'}
                rows={3}
                maxLength={1000}
                disabled={!session?.user}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm resize-none disabled:opacity-50"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-600 text-xs">{commentText.length}/1000</span>
              <button
                type="submit"
                disabled={!session?.user || !commentText.trim() || commentSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gönder
              </button>
            </div>
          </form>

          {/* Comments list */}
          {commentLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {comment.user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">{comment.user.name}</span>
                        {comment.user.username && (
                          <span className="text-gray-600 text-xs ml-1">@{comment.user.username}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs">
                        {new Date(comment.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {(currentUserId === comment.user.id || isAdmin) && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Similar Dreams */}
        {similar.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white mb-4">Benzer Rüya Tabirleri</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similar.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/${lang}/ruya/${s.slug}`)}
                  className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group"
                >
                  <h3 className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                    {s.title}
                  </h3>
                  {s.summary && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{s.summary}</p>
                  )}
                  <div className="flex items-center gap-1 text-gray-600 text-[10px] mt-2">
                    <Eye className="w-3 h-3" /> {s.views}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white mb-1">Size Özel Öneriler</h2>
            <p className="text-gray-500 text-xs mb-4">İlgi alanlarınıza göre seçilmiş rüya tabirleri</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.filter(r => r.id !== dream.id).slice(0, 6).map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => router.push(`/${lang}/ruya/${rec.slug}`)}
                  className="text-left p-3 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all group"
                >
                  <h3 className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                    {rec.title}
                  </h3>
                  {rec.summary && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{rec.summary}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/${lang}/ruya`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Tüm Rüya Tabirleri
          </button>
        </div>
      </div>
    </div>
  )
}
