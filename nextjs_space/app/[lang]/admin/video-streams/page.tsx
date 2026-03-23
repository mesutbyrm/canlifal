'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
import AdminBackButton from '@/components/admin-back-button'
  ArrowLeft,
  Video,
  Users,
  Heart,
  MessageCircle,
  Gift,
  Coins,
  Loader2,
  Trash2,
  StopCircle,
  Radio,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react'

interface VideoStream {
  id: string
  title: string | null
  status: string
  viewerCount: number
  likeCount: number
  createdAt: string
  endedAt: string | null
  user: { id: string; name: string; email: string; image: string | null }
  _count: { viewers: number; comments: number; likes: number; gifts: number }
  totalGifts: number
  totalCredits: number
  broadcasterEarnings: number
}

export default function AdminVideoStreamsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [streams, setStreams] = useState<VideoStream[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'live' | 'ended'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'admin') {
      router.push(`/`)
      return
    }
    fetchStreams()
  }, [session, status, filter])

  const fetchStreams = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/video-streams?status=${filter}`)
      if (res.ok) {
        setStreams(await res.json())
      }
    } catch (e) {
      console.error('Fetch streams error:', e)
    }
    setLoading(false)
  }

  const handleEndStream = async (streamId: string) => {
    setActionLoading(streamId)
    try {
      const res = await fetch('/api/admin/video-streams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, action: 'end' })
      })
      if (res.ok) {
        fetchStreams()
      }
    } catch (e) {
      console.error('End stream error:', e)
    }
    setActionLoading(null)
  }

  const handleDeleteStream = async (streamId: string) => {
    setActionLoading(streamId)
    try {
      const res = await fetch('/api/admin/video-streams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId })
      })
      if (res.ok) {
        setShowDeleteModal(null)
        fetchStreams()
      }
    } catch (e) {
      console.error('Delete stream error:', e)
    }
    setActionLoading(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDuration = (start: string, end: string | null) => {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const diffMs = endDate.getTime() - startDate.getTime()
    const minutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}${' saat'} ${minutes % 60}${' dk'}`
    }
    return `${minutes} ${'dk'}`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const liveStreams = streams.filter(s => s.status === 'live')
  const endedStreams = streams.filter(s => s.status === 'ended')

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <AdminBackButton variant="link" className="text-purple-400 hover:text-purple-300" label="" />
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Video className="w-7 h-7 text-red-500" />
              {'Canlı Yayın Yönetimi'}
            </h1>
          </div>
          <button onClick={fetchStreams} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
            <RefreshCw className="w-4 h-4" />
            {'Yenile'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-red-600/20 to-red-900/20 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-red-400" />
              <span className="text-red-300 text-sm">{'Canlı'}</span>
            </div>
            <p className="text-2xl font-bold text-white">{liveStreams.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-purple-400" />
              <span className="text-purple-300 text-sm">{'Toplam'}</span>
            </div>
            <p className="text-2xl font-bold text-white">{streams.length}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 text-sm">{'Toplam Hediye'}</span>
            </div>
            <p className="text-2xl font-bold text-white">{streams.reduce((sum, s) => sum + s.totalCredits, 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-400" />
              <span className="text-green-300 text-sm">{'Toplam İzleyici'}</span>
            </div>
            <p className="text-2xl font-bold text-white">{streams.reduce((sum, s) => sum + s._count.viewers, 0)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'live', 'ended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
              }`}
            >
              {f === 'all' ? ('Tümü') :
               f === 'live' ? ('Canlı') :
               ('Biten')}
            </button>
          ))}
        </div>

        {/* Streams List */}
        {streams.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
            <p className="text-purple-300">{'Henüz yayın yok'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {streams.map(stream => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Broadcaster Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-500/30">
                    {stream.user.image ? (
                      <Image src={stream.user.image} alt={stream.user.name} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Stream Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {stream.status === 'live' && (
                        <span className="flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded animate-pulse">
                          <Radio className="w-3 h-3" /> LIVE
                        </span>
                      )}
                      <h3 className="text-white font-semibold truncate">
                        {stream.title || ('Canlı Yayın')}
                      </h3>
                    </div>
                    <p className="text-purple-300 text-sm">@{stream.user.name}</p>
                    <p className="text-purple-400/60 text-xs">{stream.user.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-purple-300">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(stream.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 text-purple-300">
                        <Eye className="w-3.5 h-3.5" />
                        {getDuration(stream.createdAt, stream.endedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-purple-300">
                        <Users className="w-4 h-4" />
                        <span>{stream._count.viewers}</span>
                      </div>
                      <p className="text-purple-400/60 text-xs">{'İzleyici'}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-pink-400">
                        <Heart className="w-4 h-4" />
                        <span>{stream.likeCount}</span>
                      </div>
                      <p className="text-purple-400/60 text-xs">{'Beğeni'}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-blue-400">
                        <MessageCircle className="w-4 h-4" />
                        <span>{stream._count.comments}</span>
                      </div>
                      <p className="text-purple-400/60 text-xs">{'Yorum'}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Coins className="w-4 h-4" />
                        <span>{stream.totalCredits}</span>
                      </div>
                      <p className="text-purple-400/60 text-xs">{'Hediye'}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-green-400">
                        <Gift className="w-4 h-4" />
                        <span>{stream.broadcasterEarnings}</span>
                      </div>
                      <p className="text-purple-400/60 text-xs">{'Kazanç'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {stream.status === 'live' && (
                      <button
                        onClick={() => handleEndStream(stream.id)}
                        disabled={actionLoading === stream.id}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                      >
                        {actionLoading === stream.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <StopCircle className="w-4 h-4" />
                        )}
                        {'Bitir'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(stream.id)}
                      className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded-lg text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="md:hidden grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-purple-500/20">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-purple-300 text-sm">
                      <Users className="w-3.5 h-3.5" />
                      <span>{stream._count.viewers}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-pink-400 text-sm">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{stream.likeCount}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-400 text-sm">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{stream._count.comments}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-yellow-400 text-sm">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{stream.totalCredits}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-400 text-sm">
                      <Gift className="w-3.5 h-3.5" />
                      <span>{stream.broadcasterEarnings}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-deep-purple-900 rounded-xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{'Yayını Sil'}</h3>
                  <p className="text-purple-300 text-sm">{'Bu işlem geri alınamaz'}</p>
                </div>
              </div>
              <p className="text-purple-300 mb-6 text-sm">
                {'Tüm yorumlar, beğeniler ve hediyeler de silinecek. Emin misiniz?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 bg-white/10 text-white py-2.5 rounded-lg"
                >
                  {'İptal'}
                </button>
                <button
                  onClick={() => handleDeleteStream(showDeleteModal)}
                  disabled={actionLoading === showDeleteModal}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  {actionLoading === showDeleteModal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {'Sil'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
