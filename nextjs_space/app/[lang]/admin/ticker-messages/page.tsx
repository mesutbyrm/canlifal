'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, GripVertical,
  Eye, EyeOff, MessageSquare, Loader2, Save
} from 'lucide-react'

interface TickerMessage {
  id: string
  text: string
  icon: string
  isActive: boolean
  sortOrder: number
  createdAt: string
}

export default function AdminTickerMessagesPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [messages, setMessages] = useState<TickerMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newIcon, setNewIcon] = useState('✨')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const isCosmic = true
  const bgMain = ''
  const cardBg = 'bg-[#1a0a2e]/80 border-purple-500/20'
  const textPrimary = 'text-white'
  const textSecondary = 'text-purple-200'
  const inputBg = 'bg-purple-900/30 border-purple-500/30 text-white placeholder-purple-300/50'
  const btnPrimary = 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white'
  const btnDanger = 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30'

  useEffect(() => {
    if ((session?.user as any)?.role !== 'admin') return
    fetchMessages()
  }, [session])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/ticker-messages')
      if (res.ok) setMessages(await res.json())
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newText.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/admin/ticker-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText, icon: newIcon }),
      })
      if (res.ok) {
        setNewText('')
        setNewIcon('✨')
        fetchMessages()
      }
    } catch (e) {
      console.error('Add error:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (msg: TickerMessage) => {
    setSaving(msg.id)
    try {
      await fetch(`/api/admin/ticker-messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !msg.isActive }),
      })
      fetchMessages()
    } catch (e) {
      console.error('Toggle error:', e)
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return
    setSaving(id)
    try {
      await fetch(`/api/admin/ticker-messages/${id}`, { method: 'DELETE' })
      fetchMessages()
    } catch (e) {
      console.error('Delete error:', e)
    } finally {
      setSaving(null)
    }
  }

  const handleEditSave = async (id: string) => {
    if (!editText.trim()) return
    setSaving(id)
    try {
      await fetch(`/api/admin/ticker-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText, icon: editIcon }),
      })
      setEditingId(null)
      fetchMessages()
    } catch (e) {
      console.error('Edit error:', e)
    } finally {
      setSaving(null)
    }
  }

  const startEdit = (msg: TickerMessage) => {
    setEditingId(msg.id)
    setEditText(msg.text)
    setEditIcon(msg.icon)
  }

  const commonIcons = ['✨', '🔮', '🌟', '💫', '🎁', '💰', '🎉', '📢', '❤️', '🔥', '⭐', '🌙', '💎', '🪬', '☕', '🃏']

  if ((session?.user as any)?.role !== 'admin') {
    return <div className={`${bgMain} min-h-screen flex items-center justify-center ${textPrimary}`}>Yetkisiz erişim</div>
  }

  return (
    <div className={`${bgMain} min-h-screen p-4 pb-24`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className={`p-2 rounded-lg ${cardBg} border`}>
            <ArrowLeft className="w-5 h-5 text-purple-300" />
          </button>
          <div>
            <h1 className={`text-xl font-bold ${textPrimary}`}>Kayan Yazı Yönetimi</h1>
            <p className={`text-sm ${textSecondary}`}>Ana sayfadaki sosyal bölümde kayan yazıları düzenleyin</p>
          </div>
        </div>

        {/* Add New Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${cardBg} border rounded-xl p-4 mb-6`}
        >
          <h2 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
            <Plus className="w-4 h-4 text-fuchsia-400" />
            Yeni Mesaj Ekle
          </h2>

          {/* Icon Picker */}
          <div className="mb-3">
            <label className={`text-xs ${textSecondary} mb-1 block`}>İkon Seçin</label>
            <div className="flex flex-wrap gap-2">
              {commonIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                    newIcon === icon
                      ? 'bg-fuchsia-600 ring-2 ring-fuchsia-400 scale-110'
                      : 'bg-purple-900/40 hover:bg-purple-900/60'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xl">{newIcon}</span>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Kayan yazı mesajını girin..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${btnPrimary} disabled:opacity-50 flex items-center gap-1.5`}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Ekle
            </button>
          </div>
        </motion.div>

        {/* Messages List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className={`${cardBg} border rounded-xl p-8 text-center`}>
              <MessageSquare className={`w-10 h-10 mx-auto mb-3 ${textSecondary} opacity-50`} />
              <p className={textSecondary}>Henüz kayan yazı mesajı eklenmemiş</p>
              <p className={`text-xs ${textSecondary} opacity-70 mt-1`}>Yukarıdan yeni mesaj ekleyebilirsiniz</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${cardBg} border rounded-xl p-3 flex items-center gap-3 ${!msg.isActive ? 'opacity-50' : ''}`}
                >
                  {editingId === msg.id ? (
                    /* Edit Mode */
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {commonIcons.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => setEditIcon(icon)}
                            className={`w-7 h-7 rounded flex items-center justify-center text-sm ${
                              editIcon === icon
                                ? 'bg-fuchsia-600 ring-1 ring-fuchsia-400'
                                : 'bg-purple-900/40 hover:bg-purple-900/60'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                          onKeyDown={(e) => e.key === 'Enter' && handleEditSave(msg.id)}
                        />
                        <button
                          onClick={() => handleEditSave(msg.id)}
                          disabled={saving === msg.id}
                          className="p-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-400"
                        >
                          {saving === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-gray-600/20 hover:bg-gray-600/40 text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <>
                      <span className="text-xl flex-shrink-0">{msg.icon}</span>
                      <span className={`flex-1 text-sm ${textPrimary} ${!msg.isActive ? 'line-through' : ''}`}>{msg.text}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(msg)}
                          disabled={saving === msg.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            msg.isActive
                              ? 'bg-green-600/20 hover:bg-green-600/40 text-green-400'
                              : 'bg-gray-600/20 hover:bg-gray-600/40 text-gray-400'
                          }`}
                          title={msg.isActive ? 'Gizle' : 'Göster'}
                        >
                          {saving === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : msg.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(msg)}
                          className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          disabled={saving === msg.id}
                          className={`p-1.5 rounded-lg ${btnDanger}`}
                          title="Sil"
                        >
                          {saving === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Info */}
        {messages.length > 0 && (
          <div className={`mt-4 p-3 rounded-lg bg-fuchsia-900/20 border border-fuchsia-500/20`}>
            <p className={`text-xs ${textSecondary}`}>
              💡 Aktif mesajlar ana sayfadaki "SOSYAL" kayan yazı bölümünde otomatik olarak gösterilir.
              Göz ikonuyla mesajları geçici olarak gizleyebilir, kalem ikonuyla düzenleyebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
