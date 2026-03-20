'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Moon, Eye, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, Loader2, Heart, PenLine, Star, Share2, CheckCircle, Coins, BarChart3 } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { useSession } from 'next-auth/react'
import { DREAM_CATEGORIES } from '@/lib/dream-categories'

interface Dream {
  id: string
  title: string
  slug: string
  summary: string | null
  keywords: string[]
  category: string
  views: number
  createdAt: string
}

interface FavoriteDream {
  id: string
  createdAt: string
  dream: {
    id: string
    title: string
    slug: string
    summary: string | null
    views: number
    keywords: string[]
  }
}

interface Recommendation {
  id: string
  title: string
  slug: string
  summary: string | null
  views: number
}

export default function RuyaPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'

  const [tab, setTab] = useState<'search' | 'favorites' | 'interpret'>('search')
  const [dreams, setDreams] = useState<Dream[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '')
  const [currentPage, setCurrentPage] = useState(1)
  const [sort, setSort] = useState<'popular' | 'newest'>('popular')
  const [category, setCategory] = useState('tumu')
  const [generating, setGenerating] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteDream[]>([])
  const [favLoading, setFavLoading] = useState(false)

  // Interpret
  const [dreamText, setDreamText] = useState('')
  const [interpretation, setInterpretation] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [sharedToSocial, setSharedToSocial] = useState(false)
  const [jetonInfo, setJetonInfo] = useState<{ spent?: number; balance?: number; isPersonalized?: boolean } | null>(null)
  const [interpretError, setInterpretError] = useState('')

  // Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const fetchDreams = useCallback(async (search = '', page = 1, sortBy = 'popular', cat = 'tumu') => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), sort: sortBy })
      if (search) qs.set('search', search)
      if (cat && cat !== 'tumu') qs.set('category', cat)
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
    fetchDreams(searchQuery, currentPage, sort, category)
  }, [currentPage, sort, category, fetchDreams])

  // Fetch recommendations
  useEffect(() => {
    fetch('/api/dreams/recommendations')
      .then(r => r.json())
      .then(d => setRecommendations(d.recommendations || []))
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchDreams(searchQuery, 1, sort, category)
  }

  const handleAiGenerate = async () => {
    if (!searchQuery.trim() || generating) return
    setGenerating(true)
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

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    if (!session?.user) return
    setFavLoading(true)
    try {
      const res = await fetch('/api/dreams/favorites')
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
      }
    } catch (e) {
      console.error('Favorites fetch error', e)
    } finally {
      setFavLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (tab === 'favorites') fetchFavorites()
  }, [tab, fetchFavorites])

  // Interpret dream (personalized)
  const handleInterpret = async () => {
    if (!dreamText.trim() || interpreting) return
    if (!session?.user) {
      router.push(`/${lang}/giris`)
      return
    }
    setInterpreting(true)
    setInterpretation('')
    setSharedToSocial(false)
    setJetonInfo(null)
    setInterpretError('')
    try {
      const res = await fetch('/api/dreams/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamText: dreamText.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setInterpretation(data.interpretation || '')
        if (data.sharedToSocial) setSharedToSocial(true)
        setJetonInfo({ spent: data.jetonSpent, balance: data.jetonBalance, isPersonalized: data.isPersonalized })
      } else if (res.status === 402) {
        const err = await res.json().catch(() => ({}))
        setInterpretError(err.error || 'Yetersiz jeton.')
      } else {
        const err = await res.json().catch(() => ({}))
        setInterpretation(err.error || 'Bir hata oluştu.')
      }
    } catch (e) {
      console.error('Interpret error', e)
      setInterpretation('Bağlantı hatası oluştu.')
    } finally {
      setInterpreting(false)
    }
  }

  const popularKeywords = [
    'Yılan', 'Köpek', 'Kedi', 'Altın', 'Su', 'Ateş', 'Bebek', 'Araba',
    'Ölüm', 'Düğün', 'Uçmak', 'Diş', 'Kan', 'Para', 'Ev', 'Deniz',
  ]

  const getCatIcon = (val: string) => DREAM_CATEGORIES.find(c => c.value === val)?.icon || '💭'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 overflow-x-hidden">
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

          {/* Tab Buttons */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setTab('search')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === 'search'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" /> Ara
            </button>
            <button
              onClick={() => setTab('interpret')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === 'interpret'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <PenLine className="w-4 h-4" /> Rüyanı Yaz
            </button>
            {session?.user && (
              <button
                onClick={() => setTab('favorites')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === 'favorites'
                    ? 'bg-pink-600 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Heart className="w-4 h-4" /> Favoriler
              </button>
            )}
            <button
              onClick={() => router.push(`/${lang}/ruya-trendleri`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
            >
              <BarChart3 className="w-4 h-4" /> Trendler
            </button>
          </div>

          {/* Search Box - only in search tab */}
          {tab === 'search' && (
            <>
              <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Örneğin: Yılan görmek, Uçmak, Altın bulmak..."
                    className="w-full pl-10 md:pl-12 pr-20 md:pr-28 py-3 md:py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    Ara
                  </button>
                </div>
              </form>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {popularKeywords.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => {
                      setSearchQuery(kw)
                      setCurrentPage(1)
                      fetchDreams(kw, 1, sort, category)
                    }}
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4 pb-12">

        {/* ===== SEARCH TAB ===== */}
        {tab === 'search' && (
          <>
            {/* Category Filter */}
            <div className="mb-4 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 pb-2 min-w-max">
                {DREAM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => { setCategory(cat.value); setCurrentPage(1) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      category === cat.value
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>

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
              <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : dreams.length === 0 ? (
              <div className="text-center py-12">
                <Moon className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchQuery ? 'Bu rüya henüz yorumlanmamış' : 'Henüz rüya tabiri eklenmemiş'}
                </h3>
                {searchQuery && (
                  <>
                    <p className="text-gray-400 mb-6">
                      &ldquo;{searchQuery}&rdquo; için yapay zeka ile anında rüya tabiri oluşturabilirsiniz.
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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{getCatIcon(dream.category)}</span>
                            <h3 className="text-white font-medium text-sm md:text-base group-hover:text-indigo-300 transition-colors truncate">
                              {dream.title}
                            </h3>
                          </div>
                          {dream.summary && (
                            <p className="text-gray-500 text-xs md:text-sm mt-1 line-clamp-2">{dream.summary}</p>
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
                        <><Sparkles className="w-4 h-4" /> AI ile &ldquo;{searchQuery}&rdquo; Tabiri Oluştur</>
                      )}
                    </button>
                  </div>
                )}

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
          </>
        )}

        {/* ===== INTERPRET TAB (Kişiselleştirilmiş Rüya Yorumu) ===== */}
        {tab === 'interpret' && (
          <div className="max-w-2xl mx-auto">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Kişiselleştirilmiş Rüya Yorumu</h2>
                  <p className="text-gray-400 text-xs">Burcunuza ve rüya geçmişinize göre özel yorum</p>
                </div>
              </div>

              {/* Jeton info */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 text-xs">Bu işlem <strong>5 jeton</strong> harcar. Burcunuz, yükselen burcunuz ve rüya günlüğünüzden kişiselleştirilmiş yorum alırsınız.</span>
              </div>

              <textarea
                value={dreamText}
                onChange={(e) => setDreamText(e.target.value)}
                placeholder="Rüyanızda neler gördüğünüzü detaylıca anlatın... Örneğin: Dün gece rüyamda yüksek bir dağın tepesinde uçtuğumu gördüm. Aşağıda mavi bir deniz vardı ve..."
                rows={6}
                maxLength={3000}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-gray-600 text-xs">{dreamText.length}/3000</span>
                <button
                  onClick={handleInterpret}
                  disabled={!dreamText.trim() || dreamText.trim().length < 10 || interpreting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                >
                  {interpreting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Yorumlanıyor...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Rüyamı Yorumla (5 ₳)</>
                  )}
                </button>
              </div>
            </div>

            {/* Jeton Error */}
            {interpretError && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{interpretError}</p>
                <button
                  onClick={() => router.push(`/${lang}/jeton`)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors"
                >
                  <Coins className="w-4 h-4" /> Jeton Satın Al
                </button>
              </div>
            )}

            {/* Interpretation Result */}
            {interpretation && (
              <div className="mt-6 p-6 rounded-2xl bg-white/[0.03] border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">Kişiselleştirilmiş Rüya Yorumunuz</h3>
                  {jetonInfo?.isPersonalized && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px]">
                      ✨ Kişiselleştirilmiş
                    </span>
                  )}
                </div>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {interpretation}
                </div>
                {jetonInfo && (
                  <div className="mt-4 flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <Coins className="w-4 h-4" />
                    <span>{jetonInfo.spent} jeton harcandı. Kalan bakiye: {jetonInfo.balance} jeton</span>
                  </div>
                )}
                {sharedToSocial && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Rüya yorumunuz otomatik olarak sosyal akışınızda paylaşıldı!</span>
                    <button onClick={() => router.push(`/${lang}/sosyal`)} className="ml-auto text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> Görüntüle
                    </button>
                  </div>
                )}
              </div>
            )}

            {!session?.user && (
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-sm">Rüyanızı yorumlatmak için <button onClick={() => router.push(`/${lang}/giris`)} className="text-indigo-400 hover:underline">giriş yapın</button></p>
              </div>
            )}
          </div>
        )}

        {/* ===== FAVORITES TAB ===== */}
        {tab === 'favorites' && session?.user && (
          <>
            {favLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-pink-500/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Henüz favoriniz yok</h3>
                <p className="text-gray-400 mb-4">Rüya tabirlerinde kalp ikonuna tıklayarak favorilerinize ekleyebilirsiniz.</p>
                <button
                  onClick={() => setTab('search')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors"
                >
                  <Search className="w-4 h-4" /> Rüya Tabiri Ara
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {favorites.map((fav) => (
                  <button
                    key={fav.id}
                    onClick={() => router.push(`/${lang}/ruya/${fav.dream.slug}`)}
                    className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-pink-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm md:text-base group-hover:text-pink-300 transition-colors truncate">
                          <Heart className="w-3.5 h-3.5 inline mr-1.5 text-pink-400 fill-pink-400" />
                          {fav.dream.title}
                        </h3>
                        {fav.dream.summary && (
                          <p className="text-gray-500 text-xs md:text-sm mt-1 line-clamp-2">{fav.dream.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs flex-shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                        {fav.dream.views}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Smart Recommendations */}
        {tab === 'search' && recommendations.length > 0 && !loading && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              {session?.user ? 'Size Özel Öneriler' : 'Popüler Rüya Tabirleri'}
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              {session?.user ? 'İlgi alanlarınıza göre seçilmiş rüya tabirleri' : 'En çok okunan rüya tabirleri'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.slice(0, 6).map((rec) => (
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
      </div>
    </div>
  )
}
