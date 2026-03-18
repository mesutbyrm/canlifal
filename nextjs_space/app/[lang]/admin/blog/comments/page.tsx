'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, CheckCircle, XCircle, Trash2, User, Loader2, Filter } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

interface Comment {
  id: string; postId: string; userId: string; userName: string; content: string
  isApproved: boolean; createdAt: string; postTitle: string; postSlug: string; parentId: string | null
}

export default function AdminCommentsPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all')
  const [acting, setActing] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/blog/comments?status=${filter}&limit=100`)
      const data = await res.json()
      setComments(data.comments || [])
      setTotal(data.total || 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchComments() }, [fetchComments])

  const handleAction = async (commentId: string, action: 'approve' | 'reject' | 'delete') => {
    setActing(commentId)
    try {
      await fetch('/api/admin/blog/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action }),
      })
      await fetchComments()
    } catch (e) { console.error(e) }
    setActing(null)
  }

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href={`/${lang}/admin/blog`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-green-400" /> Yorum Yönetimi
              </h1>
              <p className="text-sm text-gray-500">{total} yorum</p>
            </div>
          </div>
          <Link href={`/${lang}/admin/blog/analytics`} className="text-xs text-purple-400 hover:text-purple-300">Analitik →</Link>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-gray-500" />
          {(['all', 'approved', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs transition ${filter === f ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {f === 'all' ? 'Tümü' : f === 'approved' ? 'Onaylı' : 'Bekleyen'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : comments.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Henüz yorum yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map(c => (
              <div key={c.id} className={`p-4 rounded-xl border ${c.isApproved ? 'bg-white/5 border-white/10' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-medium text-white">
                        <User className="w-3.5 h-3.5 text-purple-400" /> {c.userName}
                      </span>
                      <span className="text-[10px] text-gray-500">{fmtDate(c.createdAt)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.isApproved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {c.isApproved ? 'Onaylı' : 'Bekliyor'}
                      </span>
                      {c.parentId && <span className="text-[10px] text-gray-500">yanıt</span>}
                    </div>
                    <p className="text-sm text-gray-300 mb-2 whitespace-pre-wrap">{c.content}</p>
                    <p className="text-[10px] text-gray-500">
                      Yazı: <Link href={`/${lang}/blog/${c.postSlug}`} className="text-purple-400 hover:text-purple-300">{c.postTitle}</Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!c.isApproved && (
                      <button
                        onClick={() => handleAction(c.id, 'approve')}
                        disabled={acting === c.id}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition"
                        title="Onayla"
                      >
                        {acting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}
                    {c.isApproved && (
                      <button
                        onClick={() => handleAction(c.id, 'reject')}
                        disabled={acting === c.id}
                        className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition"
                        title="Reddet"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(c.id, 'delete')}
                      disabled={acting === c.id}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
