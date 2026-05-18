'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Eye, EyeOff, ExternalLink, ArrowUp, ArrowDown, Loader2, Check, Music2 } from 'lucide-react'
import AdminBackButton from '@/components/admin-back-button'

interface TikTokVideo {
  id: string
  tiktokUrl: string
  tiktokId: string | null
  title: string | null
  authorName: string | null
  thumbnailUrl: string | null
  embedHtml: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export default function AdminTikTokVideosPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [videos, setVideos] = useState<TikTokVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris')
    if (status === 'authenticated') fetchVideos()
  }, [status])

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/admin/tiktok-videos')
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos || [])
      }
    } catch {} finally { setLoading(false) }
  }

  const addVideo = async () => {
    if (!newUrl.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tiktok-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiktokUrl: newUrl.trim() }),
      })
      if (res.ok) {
        setNewUrl('')
        setAddSuccess(true)
        setTimeout(() => setAddSuccess(false), 2000)
        fetchVideos()
      } else {
        const data = await res.json()
        setError(data.error || 'Eklenemedi')
      }
    } catch { setError('Bir hata oluştu') }
    finally { setAdding(false) }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/tiktok-videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    fetchVideos()
  }

  const deleteVideo = async (id: string) => {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return
    await fetch(`/api/admin/tiktok-videos?id=${id}`, { method: 'DELETE' })
    fetchVideos()
  }

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const idx = videos.findIndex(v => v.id === id)
    if (idx < 0) return
    const newOrder = direction === 'up' ? Math.max(0, videos[idx].sortOrder - 1) : videos[idx].sortOrder + 1
    await fetch('/api/admin/tiktok-videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sortOrder: newOrder }),
    })
    fetchVideos()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
    </div>
  )

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <AdminBackButton />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-red-600">
              <Music2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">TikTok Videoları</h1>
              <p className="text-fuchsia-300 text-sm">Ana sayfada gösterilecek TikTok videolarını yönetin</p>
            </div>
          </div>
        </motion.div>

        {/* Add new video */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-5 border border-purple-500/20 mb-6"
        >
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-fuchsia-400" />
            Yeni TikTok Videosu Ekle
          </h3>
          <div className="flex gap-3">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@kullanici/video/123456789"
              className="flex-1 px-4 py-3 bg-deep-purple-900/60 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/60 focus:outline-none focus:border-fuchsia-500/50 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addVideo()}
            />
            <button
              onClick={addVideo}
              disabled={adding || !newUrl.trim()}
              className="px-5 py-3 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 text-sm transition-all"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : addSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {adding ? 'Ekleniyor...' : addSuccess ? 'Eklendi!' : 'Ekle'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <p className="text-purple-400/60 text-xs mt-2">TikTok video linkini yapıştırın. Başlık ve kapak görseli otomatik çekilecektir.</p>
        </motion.div>

        {/* Video list */}
        <div className="space-y-3">
          <AnimatePresence>
            {videos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-xl p-4 border transition-all ${
                  video.isActive
                    ? 'bg-deep-purple-800/40 border-purple-500/20'
                    : 'bg-deep-purple-900/30 border-purple-500/10 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  {video.thumbnailUrl && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/50">
                      <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm line-clamp-2">
                      {video.title || 'Başlıksız Video'}
                    </p>
                    {video.authorName && (
                      <p className="text-fuchsia-300 text-xs mt-1">@{video.authorName}</p>
                    )}
                    <p className="text-purple-400/60 text-xs mt-1 truncate">{video.tiktokUrl}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => moveOrder(video.id, 'up')} className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 hover:text-white transition-colors" title="Yukarı">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveOrder(video.id, 'down')} className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 hover:text-white transition-colors" title="Aşağı">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(video.id, video.isActive)} className={`p-1.5 rounded-lg transition-colors ${video.isActive ? 'hover:bg-yellow-800/30 text-green-400' : 'hover:bg-green-800/30 text-yellow-400'}`} title={video.isActive ? 'Gizle' : 'Göster'}>
                      {video.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <a href={video.tiktokUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 hover:text-white transition-colors" title="TikTok'ta aç">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => deleteVideo(video.id)} className="p-1.5 rounded-lg hover:bg-red-800/30 text-red-400 hover:text-red-300 transition-colors" title="Sil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {videos.length === 0 && (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
              <p className="text-purple-300/60">Henüz TikTok videosu eklenmemiş</p>
              <p className="text-purple-400/40 text-sm mt-1">Yukarıdan bir TikTok video linki ekleyerek başlayın</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
