'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Eye, Clock, ChevronRight, ChevronLeft, Tag, Crown } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { SITE_NAME, SITE_URL } from '@/lib/seo-config'

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
  isPremium: boolean
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

export default function CategoryPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [category, setCategory] = useState<BlogCategory | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [postsRes, catsRes] = await Promise.all([
          fetch(`/api/blog?category=${encodeURIComponent(slug)}&page=${page}&limit=12`),
          fetch('/api/blog/categories'),
        ])
        if (postsRes.ok) {
          const data = await postsRes.json()
          setPosts(data.posts || [])
          setPagination({ total: data.pagination?.total || 0, totalPages: data.pagination?.totalPages || 0 })
        }
        if (catsRes.ok) {
          const data = await catsRes.json()
          const cats = data.categories || []
          setCategories(cats)
          const found = cats.find((c: BlogCategory) => c.slug === slug)
          setCategory(found || null)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    fetchData()
  }, [slug, page])

  const formatDate = (d: string | null) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }
    catch { return '' }
  }

  const formatViews = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)

  if (!mounted) return null

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const catName = category?.nameTr || slug
  const catDesc = category?.descTr || ''

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${catName} - ${SITE_NAME} Blog`,
    description: catDesc || `${catName} kategorisindeki yazılar`,
    url: `${SITE_URL}/blog/kategori/${slug}`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: catName, item: `${SITE_URL}/blog/kategori/${slug}` },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <head>
        <title>{catName} - {SITE_NAME} Blog</title>
        <meta name="description" content={catDesc || `${catName} kategorisindeki en güncel yazılar`} />
        <meta property="og:title" content={`${catName} - ${SITE_NAME} Blog`} />
        <meta property="og:description" content={catDesc || `${catName} kategorisindeki en güncel yazılar`} />
        <link rel="canonical" href={`${SITE_URL}/blog/kategori/${slug}`} />
      </head>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href={`/blog`} className="hover:text-purple-400 transition">Blog</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-500">{catName}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{catName}</h1>
          </div>
          {catDesc && <p className="text-gray-400 text-lg mt-2">{catDesc}</p>}
          <p className="text-sm text-gray-500 mt-2">{pagination.total} yazı bulundu</p>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 && !loading ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <Tag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Bu kategoride henüz yazı yok</p>
            <Link href={`/blog`} className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">Tüm yazılara dön</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 group h-full">
                    {post.coverImage && (
                      <div className="relative aspect-video bg-gray-800">
                        <Image src={post.coverImage} alt={post.titleTr} fill className="object-cover group-hover:scale-105 transition duration-500" />
                        {post.isPremium && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/90 rounded-full text-[10px] font-bold text-black flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Premium
                          </div>
                        )}
                        {post.isFeatured && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600/90 rounded-full text-[10px] font-bold text-white">
                            Öne Çıkan
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <h2 className="text-white font-semibold line-clamp-2 mb-2 group-hover:text-purple-300 transition">{post.titleTr}</h2>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-4">{post.descTr}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
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
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Önceki
            </button>
            <span className="text-sm text-gray-400">
              Sayfa {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition disabled:opacity-30"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Other Categories */}
        {categories.length > 1 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-white mb-6">Diğer Kategoriler</h2>
            <div className="flex flex-wrap gap-3">
              {categories.filter(c => c.slug !== slug).map(c => (
                <Link
                  key={c.slug}
                  href={`/blog/kategori/${c.slug}`}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-purple-500/10 hover:border-purple-500/20 hover:text-purple-300 transition"
                >
                  {c.nameTr}
                  {c.postCount > 0 && <span className="ml-1.5 text-gray-500">({c.postCount})</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
