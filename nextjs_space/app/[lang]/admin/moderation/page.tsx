'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Trash2, AlertTriangle, Ban, CheckCircle, Loader2, MessageSquare, Image as ImageIcon, User } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  content: string
  postType: string
  createdAt: string
  imageUrl?: string
  user: { id: string; name: string; username: string; image?: string }
  _count: { comments: number; likes: number }
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; username: string; image?: string }
  post: { id: string; content: string }
}

export default function AdminModerationPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/moderation')
      const data = await res.json()
      if (data.posts) setPosts(data.posts)
      if (data.comments) setComments(data.comments)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if ((session?.user as any)?.role !== 'admin') {
      router.push('/')
      return
    }
    fetchData()
  }, [session, router, fetchData])

  const handleAction = async (action: string, targetId: string, reason?: string) => {
    setActionLoading(targetId)
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetId, reason })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'İşlem başarıyla uygulandı' })
        fetchData()
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'İşlem başarısız' })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] to-[#1a0533] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              İçerik Moderasyonu
            </h1>
            <p className="text-sm text-purple-400">Kullanıcı içeriklerini yönet ve denetle</p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'posts' as const, label: 'Paylaşımlar', icon: ImageIcon, count: posts.length },
            { key: 'comments' as const, label: 'Yorumlar', icon: MessageSquare, count: comments.length }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-white/5 text-purple-300 hover:bg-white/10'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" /></div>
        ) : activeTab === 'posts' ? (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-purple-400">Paylaşım bulunamadı</div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm">
                      {post.user.image ? (
                        <img loading="lazy" src={post.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        post.user.name?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{post.user.name}</span>
                        <span className="text-xs text-purple-400">@{post.user.username}</span>
                        <span className="text-xs text-purple-500">{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <p className="text-sm text-purple-200 mb-2 line-clamp-3">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-purple-400">
                        <span>❤️ {post._count.likes}</span>
                        <span>\ud83d\udcac {post._count.comments}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const reason = prompt('Silme sebebi (opsiyonel):')
                          handleAction('delete_post', post.id, reason || undefined)
                        }}
                        disabled={actionLoading === post.id}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                        title="İçeriği sil"
                      >
                        {actionLoading === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Uyarı sebebi:')
                          if (reason) handleAction('warn_user', post.user.id, reason)
                        }}
                        className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition"
                        title="Kullanıcıyı uyar"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-12 text-purple-400">Yorum bulunamadı</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm">
                      {comment.user.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user.name}</span>
                        <span className="text-xs text-purple-400">@{comment.user.username}</span>
                      </div>
                      <p className="text-sm text-purple-200 mb-1">{comment.content}</p>
                      <p className="text-xs text-purple-500">Gönderi: {comment.post.content.substring(0, 60)}...</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAction('delete_comment', comment.id)}
                        disabled={actionLoading === comment.id}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                        title="Yorumu sil"
                      >
                        {actionLoading === comment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Uyarı sebebi:')
                          if (reason) handleAction('warn_user', comment.user.id, reason)
                        }}
                        className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition"
                        title="Kullanıcıyı uyar"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
