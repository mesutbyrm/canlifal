'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Calendar, ChevronLeft, ChevronRight,
  Clock, Eye, Loader2, Search
} from 'lucide-react'

interface BlogPost {
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
  descTr: string
  icon: string
  color: string
  postCount: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const CATEGORY_ICONS: Record<string, string> = {
  'Cpu': '\ud83d\udcbb', 'Heart': '\u2764\ufe0f', 'Sparkles': '\u2728', 'UtensilsCrossed': '\ud83c\udf7d\ufe0f',
  'Plane': '\u2708\ufe0f', 'TrendingUp': '\ud83d\udcb0', 'GraduationCap': '\ud83c\udf93', 'HeartHandshake': '\ud83d\udc91',
  'Baby': '\ud83d\udc76', 'Gamepad2': '\ud83c\udfae', 'Clapperboard': '\ud83c\udfac', 'Star': '\u2b50', 'Moon': '\ud83c\udf19',
  'BookOpen': '\ud83d\udcda',
}

export default function BlogCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [category, setCategory] = useState<BlogCategory | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const [postsRes, catsRes] = await Promise.all([
        fetch(`/api/blog?category=${encodeURIComponent(slug)}&page=${page}&limit=12`),
        fetch('/api/blog/categories'),
      ])
      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(data.posts || [])
        setPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 })
      }
      if (catsRes.ok) {
        const data = await catsRes.json()
        const found = (data.categories || []).find((c: BlogCategory) => c.slug === slug)
        if (found) setCategory(found)
      }
    } catch (e) {
      console.error('Category fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const formatDate = (date: string | null) => {
    if (!date) return ''
    try { return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
  }

  const formatViews = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
      {/* Schema markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category?.nameTr || slug,
        description: category?.descTr || '',
        url: typeof window !== 'undefined' ? window.location.href : '',
      }) }} />

      <div className="max-w-7xl mx-auto px-4 py-6 pb-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href={`/${lang}/blog`} className="hover:text-purple-400 transition">Blog</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{category?.nameTr || slug}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{CATEGORY_ICONS[category?.icon || ''] || '\ud83d\udcc4'}</span>
            <h1 className="text-3xl font-bold text-white">{category?.nameTr || slug}</h1>
          </div>
          {category?.descTr && (
            <p className="text-gray-400 max-w-2xl">{category.descTr}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">{pagination.total} yaz\u0131 bulundu</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Bu kategoride hen\u00fcz yaz\u0131 yok</p>
            <Link href={`/${lang}/blog`} className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">T\u00fcm yaz\u0131lara d\u00f6n</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={`/${lang}/blog/${post.slug}`} className="block group">
                    <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all h-full">
                      {post.coverImage ? (
                        <div className="relative aspect-video bg-gray-800">
                          <Image src={post.coverImage} alt={post.titleTr} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-indigo-900/20 flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-purple-500/20" />
                        </div>
                      )}
                      <div className="p-4">
                        <h2 className="text-sm font-semibold text-white group-hover:text-purple-300 transition line-clamp-2">{post.titleTr}</h2>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.descTr}</p>
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime} dk</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(post.views)}</span>
                          </div>
                          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => fetchPosts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchPosts(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                        pageNum === pagination.page
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => fetchPosts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
