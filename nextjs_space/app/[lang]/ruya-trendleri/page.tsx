'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, MessageCircle, Eye, Moon, ArrowLeft, Flame, Users, CheckCircle, XCircle, Tag, ChevronRight } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { getCategoryLabel, getCategoryIcon } from '@/lib/dream-categories'

interface TrendData {
  trendingDreams: Array<{ id: string; title: string; slug: string; summary: string | null; category: string; keywords: string[]; views: number; recentViews: number }>
  mostDiscussed: Array<{ id: string; title: string; slug: string; summary: string | null; category: string; commentCount: number }>
  trendingKeywords: Array<{ keyword: string; count: number }>
  categoryStats: Array<{ category: string; count: number; totalViews: number }>
  zodiacTrends: Array<{ zodiacSign: string; category: string; viewCount: number }>
  moodStats: Array<{ mood: string; count: number }>
  experienceStats: { totalExperiences: number; cameTrue: number; didNotComeTrue: number }
  period: number
}

const moodEmojis: Record<string, string> = {
  happy: '😊 Mutlu',
  sad: '😢 Üzgün',
  scared: '😨 Korkmuş',
  confused: '🤔 Kafası Karışık',
  neutral: '😐 Nötr',
}

const zodiacEmojis: Record<string, string> = {
  'Koç': '♈', 'Boğa': '♉', 'İkizler': '♊', 'Yengeç': '♋',
  'Aslan': '♌', 'Başak': '♍', 'Terazi': '♎', 'Akrep': '♏',
  'Yay': '♐', 'Oğlak': '♑', 'Kova': '♒', 'Balık': '♓',
}

export default function RuyaTrendleriPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'

  const [data, setData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dreams/trends?period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <button onClick={() => router.push(`/`)} className="hover:text-gray-300 transition-colors">Ana Sayfa</button>
          <ChevronRight className="w-3 h-3" />
          <button onClick={() => router.push(`/ruya`)} className="hover:text-gray-300 transition-colors">Rüya Tabirleri</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-indigo-400">Trendler</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-300 text-sm font-medium">Rüya Trend Analizi</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Topluluk Rüya Trendleri</h1>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto">
            Topluluğumuzda en çok görülen rüyalar, popüler semboller ve burçlara göre rüya eğilimleri
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Son {p} Gün
            </button>
          ))}
        </div>

        {data && (
          <div className="grid gap-6">
            {/* Trending Dreams */}
            {data.trendingDreams.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  Trend Rüya Tabirleri
                </h2>
                <div className="grid gap-3">
                  {data.trendingDreams.map((dream, idx) => (
                    <button
                      key={dream.id}
                      onClick={() => router.push(`/ruya/${dream.slug}`)}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          idx < 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getCategoryIcon(dream.category)}</span>
                            <h3 className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                              {dream.title}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {dream.recentViews}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {dream.views}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Two column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trending Keywords */}
              {data.trendingKeywords.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-indigo-400" />
                    Popüler Semboller
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {data.trendingKeywords.map((kw, i) => (
                      <button
                        key={kw.keyword}
                        onClick={() => router.push(`/ruya?q=${encodeURIComponent(kw.keyword)}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
                      >
                        {i < 3 && <Flame className="w-3 h-3 text-orange-400" />}
                        {kw.keyword}
                        <span className="text-gray-600">({kw.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Distribution */}
              {data.categoryStats.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Kategori Dağılımı
                  </h2>
                  <div className="space-y-3">
                    {data.categoryStats.map((cat) => {
                      const maxCount = data.categoryStats[0]?.count || 1
                      const pct = Math.round((cat.count / maxCount) * 100)
                      return (
                        <button
                          key={cat.category}
                          onClick={() => router.push(`/ruya?category=${cat.category}`)}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-300 text-sm group-hover:text-indigo-300 transition-colors">
                              {getCategoryIcon(cat.category)} {getCategoryLabel(cat.category)}
                            </span>
                            <span className="text-gray-500 text-xs">{cat.count} tabir · {cat.totalViews} görüntülenme</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Zodiac Trends */}
              {data.zodiacTrends.length > 0 && (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-400" />
                    Burçlara Göre Rüya Eğilimleri
                  </h2>
                  <div className="space-y-2">
                    {/* Group by zodiac */}
                    {Object.entries(
                      data.zodiacTrends.reduce((acc, z) => {
                        if (!acc[z.zodiacSign]) acc[z.zodiacSign] = []
                        acc[z.zodiacSign].push({ category: z.category, count: z.viewCount })
                        return acc
                      }, {} as Record<string, Array<{ category: string; count: number }>>)
                    ).slice(0, 6).map(([sign, cats]) => (
                      <div key={sign} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <span className="text-lg">{zodiacEmojis[sign] || '⭐'}</span>
                        <span className="text-white text-sm font-medium w-16">{sign}</span>
                        <div className="flex flex-wrap gap-1">
                          {cats.slice(0, 3).map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px]">
                              {getCategoryIcon(c.category)} {getCategoryLabel(c.category)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Stats + Mood */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-pink-400" />
                  Topluluk Deneyimleri
                </h2>

                {data.experienceStats.totalExperiences > 0 && (
                  <div className="mb-4">
                    <p className="text-gray-400 text-xs mb-2">
                      {data.experienceStats.totalExperiences} kişi rüya deneyimini paylaştı
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>{data.experienceStats.cameTrue} gerçekleşti</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-red-400 text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>{data.experienceStats.didNotComeTrue} gerçekleşmedi</span>
                      </div>
                    </div>
                  </div>
                )}

                {data.moodStats.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs mb-2 font-medium">Rüya Günlüğü Ruh Halleri</p>
                    <div className="flex flex-wrap gap-2">
                      {data.moodStats.map((m) => (
                        <span key={m.mood} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs">
                          {moodEmojis[m.mood] || m.mood} ({m.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Most Discussed */}
            {data.mostDiscussed.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  En Çok Tartışılan Rüyalar
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.mostDiscussed.map((dream) => (
                    <button
                      key={dream.id}
                      onClick={() => router.push(`/ruya/${dream.slug}`)}
                      className="text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getCategoryIcon(dream.category)}</span>
                        <h3 className="text-white text-sm font-medium group-hover:text-blue-300 transition-colors truncate flex-1">
                          {dream.title}
                        </h3>
                        <span className="flex items-center gap-1 text-blue-400 text-xs">
                          <MessageCircle className="w-3.5 h-3.5" /> {dream.commentCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/ruya`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Rüya Tabirleri
          </button>
        </div>
      </div>
    </div>
  )
}
