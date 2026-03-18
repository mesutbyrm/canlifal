'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Moon, Eye, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, Loader2 } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

interface Dream {
  id: string
  title: string
  slug: string
  summary: string | null
  keywords: string[]
  views: number
  createdAt: string
}

export default function RuyaPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = (params?.lang as string) || 'tr'

  const [dreams, setDreams] = useState<Dream[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '')
  const [currentPage, setCurrentPage] = useState(1)
  const [sort, setSort] = useState<'popular' | 'newest'>('popular')
  const [generating, setGenerating] = useState(false)
  const [generatedDream, setGeneratedDream] = useState<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const fetchDreams = useCallback(async (search = '', page = 1, sortBy = 'popular') => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), sort: sortBy })
      if (search) qs.set('search', search)
      const res = await fetch(`/api/dreams?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setDreams(data.dreams || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (e) {
      console.error('Failed to fetch dreams', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDreams(searchQuery, currentPage, sort)
  }, [currentPage, sort, fetchDreams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchDreams(searchQuery, 1, sort)
  }

  const handleAiGenerate = async () => {
    if (!searchQuery.trim() || generating) return
    setGenerating(true)
    setGeneratedDream(null)
    try {
      const res = await fetch('/api/dreams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.dream) {
          router.push(`/${lang}/ruya/${data.dream.slug}`)
        }
      }
    } catch (e) {
      console.error('AI generation error', e)
    } finally {
      setGenerating(false)
    }
  }

  const popularKeywords = [
    'Yılan', 'Köpek', 'Kedi', 'Altın', 'Su', 'Ateş', 'Bebçek', 'Araba',
    'Ölüm', 'Düğün', 'Uçmak', 'Diş', 'Kan', 'Para', 'Ev', 'Deniz',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 via-purple-900/10 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-300 text-sm font-medium">Rüya Tabirleri Ansiklopedisi</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Rüyanızda Ne Gördünüz?
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto mb-6">
            Binlerce rüya tabiri ve yorumu arasında arayın. Bulamadığınız rüyayı yapay zeka anında yorumlasın.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Örneğin: Yılan görmek, Uçmak, Altın bulmak..."
                className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm md:text-base"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
              >
                Ara
              </button>
            </div>
          </form>

          {/* Popular Keywords */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {popularKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => {
                  setSearchQuery(kw)
                  setCurrentPage(1)
                  fetchDreams(kw, 1, sort)
                }}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* Sort & Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-sm">
            {loading ? 'Yükleniyor...' : `${total} rüya tabiri bulundu`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setSort('popular'); setCurrentPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sort === 'popular'
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Popüler
            </button>
            <button
              onClick={() => { setSort('newest'); setCurrentPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sort === 'newest'
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Yeni
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-12">
            <Moon className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'Bu rüya henüz yorumlanmamış' : 'Henüz rüya tabiri eklenmemiş'}
            </h3>
            {searchQuery && (
              <>
                <p className="text-gray-400 mb-6">
                  “{searchQuery}” için yapay zeka ile anında rüya tabiri oluşturabilirsiniz.
                </p>
                <button
                  onClick={handleAiGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {generating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Yapay Zeka Yorumluyor...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> AI ile Rüya Tabiri Oluştur</>
                  )}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {dreams.map((dream) => (
                <button
                  key={dream.id}
                  onClick={() => router.push(`/${lang}/ruya/${dream.slug}`)}
                  className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm md:text-base group-hover:text-indigo-300 transition-colors truncate">
                        {dream.title}
                      </h3>
                      {dream.summary && (
                        <p className="text-gray-500 text-xs md:text-sm mt-1 line-clamp-2">
                          {dream.summary}
                        </p>
                      )}
                      {dream.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {dream.keywords.slice(0, 4).map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs flex-shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                      {dream.views}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* AI Generate Button when search has results */}
            {searchQuery && dreams.length > 0 && (
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-xs mb-2">Aradığınızı bulamadınız mı?</p>
                <button
                  onClick={handleAiGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-sm hover:bg-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Oluşturuluyor...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> AI ile “{searchQuery}” Tabiri Oluştur</>
                  )}
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-gray-400 text-sm px-3">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
