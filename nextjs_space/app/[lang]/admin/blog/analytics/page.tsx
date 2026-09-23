'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, BarChart3, Eye, Heart, MessageCircle, Bookmark, FileText, TrendingUp, Clock, Star, Crown, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

interface Overview {
  totalPosts: number; publishedPosts: number; draftPosts: number; aiPosts: number; premiumPosts: number
  totalViews: number; totalLikes: number; totalComments: number; totalFavorites: number
}
interface TopPost { id: string; slug: string; titleTr: string; views: number; likes: number; category: string; isPublished: boolean }
interface CatStat { slug: string; nameTr: string; postCount: number; totalViews: number }
interface RecentComment { id: string; postId: string; userName: string; content: string; isApproved: boolean; createdAt: string; postTitle: string }
interface ScheduledPost { id: string; slug: string; titleTr: string; scheduledAt: string; category: string }

export default function BlogAnalyticsPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [topByViews, setTopByViews] = useState<TopPost[]>([])
  const [topByLikes, setTopByLikes] = useState<TopPost[]>([])
  const [categoryStats, setCategoryStats] = useState<CatStat[]>([])
  const [recentComments, setRecentComments] = useState<RecentComment[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])

  useEffect(() => {
    fetch('/api/admin/blog/analytics')
      .then(r => r.json())
      .then(data => {
        setOverview(data.overview)
        setTopByViews(data.topByViews || [])
        setTopByLikes(data.topByLikes || [])
        setCategoryStats(data.categoryStats || [])
        setRecentComments(data.recentComments || [])
        setScheduledPosts(data.scheduledPosts || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 flex items-center justify-center"><LoadingSpinner /></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/admin/blog`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-purple-400" /> Blog Analitik</h1>
            <p className="text-sm text-gray-500">Tüm blog performans metrikleri</p>
          </div>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {[
              { icon: FileText, label: 'Toplam Yazı', value: overview.totalPosts, color: 'purple' },
              { icon: Eye, label: 'Toplam Görüntülenme', value: overview.totalViews, color: 'blue' },
              { icon: Heart, label: 'Toplam Beğeni', value: overview.totalLikes, color: 'red' },
              { icon: MessageCircle, label: 'Toplam Yorum', value: overview.totalComments, color: 'green' },
              { icon: Bookmark, label: 'Toplam Favori', value: overview.totalFavorites, color: 'yellow' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <item.icon className={`w-5 h-5 mb-2 text-${item.color}-400`} />
                <p className="text-2xl font-bold text-white">{fmt(item.value)}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Sub stats */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-lg font-bold text-green-400">{overview.publishedPosts}</p>
              <p className="text-xs text-gray-400">Yayında</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20 text-center">
              <p className="text-lg font-bold text-gray-400">{overview.draftPosts}</p>
              <p className="text-xs text-gray-400">Taslak</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <p className="text-lg font-bold text-purple-400">{overview.aiPosts}</p>
              <p className="text-xs text-gray-400">AI Üretimi</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <p className="text-lg font-bold text-yellow-400">{overview.premiumPosts}</p>
              <p className="text-xs text-gray-400">Premium</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top by Views */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400" /> En Çok Görüntülenen</h3>
            <div className="space-y-2">
              {topByViews.slice(0, 7).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/3 hover:bg-white/5 transition">
                  <span className="text-xs text-gray-500 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.titleTr}</p>
                  </div>
                  <span className="text-xs text-blue-400 font-medium">{fmt(p.views)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top by Likes */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /> En Çok Beğenilen</h3>
            <div className="space-y-2">
              {topByLikes.slice(0, 7).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/3 hover:bg-white/5 transition">
                  <span className="text-xs text-gray-500 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.titleTr}</p>
                  </div>
                  <span className="text-xs text-red-400 font-medium">{fmt(p.likes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-400" /> Kategori Dağılımı</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryStats.filter(c => c.postCount > 0).map(cat => (
              <div key={cat.slug} className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-sm font-medium text-white">{cat.nameTr}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{cat.postCount} yazı</span>
                  <span className="text-xs text-blue-400">{fmt(cat.totalViews)} görüntülenme</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Comments */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-400" /> Son Yorumlar</h3>
              <Link href={`/admin/blog/comments`} className="text-xs text-purple-400 hover:text-purple-300">Tümünü Gör</Link>
            </div>
            <div className="space-y-3">
              {recentComments.slice(0, 5).map(c => (
                <div key={c.id} className="p-3 rounded-lg bg-white/3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white">{c.userName}</span>
                    <span className="text-[10px] text-gray-500">{fmtDate(c.createdAt)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.isApproved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {c.isApproved ? 'Onaylı' : 'Bekliyor'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-2">{c.content}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{c.postTitle}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Posts */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-400" /> Zamanlanmış Yazılar</h3>
            {scheduledPosts.length === 0 ? (
              <p className="text-sm text-gray-500">Zamanlanmış yazı yok</p>
            ) : (
              <div className="space-y-2">
                {scheduledPosts.map(p => (
                  <div key={p.id} className="p-3 rounded-lg bg-white/3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{p.titleTr}</p>
                      <p className="text-[10px] text-gray-500">{p.category}</p>
                    </div>
                    <span className="text-xs text-orange-400 flex-shrink-0">{fmtDate(p.scheduledAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
