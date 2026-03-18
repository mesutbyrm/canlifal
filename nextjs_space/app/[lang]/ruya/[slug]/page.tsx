'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Moon, Eye, Calendar, Tag, ChevronRight, Share2 } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import Head from 'next/head'

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

export default function DreamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const slug = params?.slug as string

  const [dream, setDream] = useState<Dream | null>(null)
  const [similar, setSimilar] = useState<SimilarDream[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    const fetchDream = async () => {
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
    }
    fetchDream()
  }, [slug])

  // Update document title on client
  useEffect(() => {
    if (dream) {
      document.title = `${dream.title} - Rüya Tabiri | Canlifal`
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc && dream.metaDescription) {
        metaDesc.setAttribute('content', dream.metaDescription)
      }
    }
  }, [dream])

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

  // JSON-LD structured data
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{dream.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {dream.views + 1} görüntülenme
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
