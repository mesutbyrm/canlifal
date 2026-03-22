'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  BookOpen, Calendar, ChevronRight, Clock, Eye, Search, TrendingUp,
  Star, ArrowRight, Flame, Award, Loader2, ChevronLeft
} from 'lucide-react'

interface BlogPost {
  id: string
  slug: string
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  category: string
  keywords: string[]
  coverImage: string
  readTime: number
  views: number
  likes: number
  isFeatured: boolean
  isTrending: boolean
  isEditorPick: boolean
  authorName: string
  publishedAt: string | null
  createdAt: string
}

interface BlogCategory {
  id: string
  slug: string
  nameTr: string
  nameEn: string
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
  'Cpu': '💻', 'Heart': '❤️', 'Sparkles': '✨', 'UtensilsCrossed': '🍽️',
  'Plane': '✈️', 'TrendingUp': '💰', 'GraduationCap': '🎓', 'HeartHandshake': '💑',
  'Baby': '👶', 'Gamepad2': '🎮', 'Clapperboard': '🎬', 'Star': '⭐', 'Moon': '🌙',
  'BookOpen': '📚',
}

export default function BlogPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([])
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([])
  const [editorPicks, setEditorPicks] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSlide, setActiveSlide] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' })
      if (search) params.set('search', search)

      const [postsRes, catsRes, featRes, trendRes, editorRes] = await Promise.all([
        fetch(`/api/blog?${params}`),
        fetch('/api/blog/categories'),
        fetch('/api/blog?featured=true&limit=5'),
        fetch('/api/blog?trending=true&limit=6'),
        fetch('/api/blog?editorPick=true&limit=4'),
      ])

      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(data.posts || [])
        setPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 })
      }
      if (catsRes.ok) {
        const data = await catsRes.json()
        setCategories(data.categories || [])
      }
      if (featRes.ok) {
        const data = await featRes.json()
        setFeaturedPosts(data.posts || [])
      }
      if (trendRes.ok) {
        const data = await trendRes.json()
        setTrendingPosts(data.posts || [])
      }
      if (editorRes.ok) {
        const data = await editorRes.json()
        setEditorPicks(data.posts || [])
      }
    } catch (e) {
      console.error('Blog fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-slide for featured posts
  useEffect(() => {
    if (featuredPosts.length <= 1) return
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featuredPosts.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [featuredPosts.length])

  const handleSearch = () => {
    fetchData(1, searchQuery)
  }

  const formatDate = (date: string | null) => {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return '' }
  }

  const formatViews = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 py-6 pb-28">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-purple-400" />
              Blog
            </h1>
            <p className="text-gray-400 mt-1">Güncel haberler, rehberler ve ipuçları</p>
          </div>
          <div className="flex items-center gap-2 max-w-md w-full md:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Blog'da ara..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50"
            />
            <button onClick={handleSearch} className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Bar - only categories with posts */}
        {categories.filter(c => c.postCount > 0).length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.filter(c => c.postCount > 0).map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex-shrink-0"
                >
                  <Link
                    href={`/${lang}/blog/kategori/${cat.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all group whitespace-nowrap"
                  >
                    <span className="text-sm font-medium text-gray-300 group-hover:text-purple-300 transition">{cat.nameTr}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">{cat.postCount}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Featured Slider */}
            {featuredPosts.length > 0 && (
              <section className="mb-10">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-white/10">
                  <div className="relative min-h-[280px] md:min-h-[360px]">
                    {featuredPosts.map((post, i) => (
                      <div
                        key={post.id}
                        className={`absolute inset-0 transition-opacity duration-700 ${i === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                      >
                        {post.coverImage && (
                          <div className="absolute inset-0">
                            <Image src={post.coverImage} alt={post.titleTr} fill className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
                          </div>
                        )}
                        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 text-xs font-medium bg-purple-500/30 text-purple-200 rounded-full border border-purple-500/30">
                              <Flame className="w-3 h-3 inline mr-1" />Öne Çıkan
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(post.publishedAt || post.createdAt)}</span>
                          </div>
                          <Link href={`/${lang}/blog/${post.slug}`}>
                            <h2 className="text-2xl md:text-3xl font-bold text-white hover:text-purple-300 transition mb-2 line-clamp-2">
                              {post.titleTr}
                            </h2>
                          </Link>
                          <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-2xl">{post.descTr}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.readTime} dk</span>
                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatViews(post.views)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Slider dots */}
                  {featuredPosts.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                      {featuredPosts.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeSlide ? 'bg-purple-400 w-6' : 'bg-white/30'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Categories Grid removed - now shown as top bar */}

            {/* Trending Posts */}
            {trendingPosts.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-400" /> Trend İçerikler
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendingPosts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={`/${lang}/blog/${post.slug}`} className="block group">
                        <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all">
                          {post.coverImage ? (
                            <div className="relative aspect-video bg-gray-800">
                              <Image src={post.coverImage} alt={post.titleTr} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-3 left-3">
                                <span className="px-2 py-1 text-xs font-medium bg-red-500/80 text-white rounded-full flex items-center gap-1">
                                  <Flame className="w-3 h-3" />Trend
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                              <TrendingUp className="w-12 h-12 text-purple-500/30" />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition line-clamp-2">{post.titleTr}</h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.descTr}</p>
                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime} dk</span>
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(post.views)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Editor's Picks */}
            {editorPicks.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" /> Editörün Seçtikleri
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editorPicks.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={`/${lang}/blog/${post.slug}`} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-white/10 transition-all group">
                        {post.coverImage ? (
                          <div className="relative w-24 h-24 md:w-32 md:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                            <Image src={post.coverImage} alt={post.titleTr} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-24 h-24 md:w-32 md:h-24 rounded-lg flex-shrink-0 bg-gradient-to-br from-amber-900/30 to-purple-900/30 flex items-center justify-center">
                            <Award className="w-8 h-8 text-amber-500/30" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                              Editör Seçimi
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition line-clamp-2">{post.titleTr}</h3>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.descTr}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime} dk</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(post.views)}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* All Posts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" /> Son Yazılar
                </h2>
                <span className="text-sm text-gray-400">{pagination.total} yazı</span>
              </div>
              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Henüz blog yazısı yok</p>
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
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                  {categories.find(c => c.slug === post.category)?.nameTr || post.category}
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition line-clamp-2">{post.titleTr}</h3>
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
                        onClick={() => fetchData(pagination.page - 1, searchQuery)}
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
                            onClick={() => fetchData(pageNum, searchQuery)}
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
                        onClick={() => fetchData(pagination.page + 1, searchQuery)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
