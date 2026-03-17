'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BLOG_POSTS } from '@/lib/seo-config'
import { ArrowLeft, BookOpen, Calendar, ChevronRight } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

interface BlogPost {
  id: string
  slug: string
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  category: string
  keywords: string[]
  createdAt: string
}

const categoryColors: Record<string, string> = {
  'kahve-fali': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'tarot': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'burc': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'genel': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

const categoryNames: Record<string, Record<string, string>> = {
  'kahve-fali': { tr: 'Kahve Falı', en: 'Coffee Reading' },
  'tarot': { tr: 'Tarot', en: 'Tarot' },
  'burc': { tr: 'Burç', en: 'Horoscope' },
  'genel': { tr: 'Genel', en: 'General' },
}

export default function BlogPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const isTr = lang === 'tr'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/blog')
        if (res.ok) {
          const data = await res.json()
          setPosts(data.posts || [])
        }
      } catch (e) {
        console.error('Failed to fetch blog posts', e)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  // Merge DB posts with static fallback (static posts show only if DB returned none)
  const displayPosts = posts.length > 0 ? posts : BLOG_POSTS.map((p, i) => ({
    id: `static-${i}`,
    slug: p.slug,
    titleTr: p.titleTr,
    titleEn: p.titleEn,
    descTr: p.descTr,
    descEn: p.descEn,
    category: p.category,
    keywords: p.keywords,
    createdAt: '2025-01-01',
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              {isTr ? 'Blog' : 'Blog'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isTr ? 'Fal ve astroloji dünyasından yazılar' : 'Articles from the world of fortune telling & astrology'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-4">
            {displayPosts.map((post) => (
              <button
                key={post.slug}
                onClick={() => router.push(`/blog/${post.slug}`)}
                className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mb-2 ${categoryColors[post.category] || categoryColors.genel}`}>
                      {categoryNames[post.category]?.[lang] || post.category}
                    </span>
                    <h2 className="text-lg font-semibold text-white group-hover:text-purple-300 transition line-clamp-2">
                      {isTr ? post.titleTr : post.titleEn}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {isTr ? post.descTr : post.descEn}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '2025'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition mt-2 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
