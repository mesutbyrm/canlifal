'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2, Save,
  Eye, EyeOff, Gamepad2, ChevronUp, ChevronDown, Settings
} from 'lucide-react'

interface MiniGame {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  isActive: boolean
  entryFee: number
  minReward: number
  maxReward: number
  sortOrder: number
  config: any
  createdAt: string
}

export default function AdminGamesPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [games, setGames] = useState<MiniGame[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingGame, setEditingGame] = useState<MiniGame | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGame, setNewGame] = useState({
    slug: '', title: '', description: '', icon: '🎮',
    entryFee: 0, minReward: 1, maxReward: 10, sortOrder: 0, config: '{}'
  })

  const bgMain = 'bg-[#0a0118]'
  const cardBg = 'bg-[#1a0a2e]/80 border-purple-500/20'
  const textPrimary = 'text-white'
  const textSecondary = 'text-purple-200'
  const inputBg = 'bg-purple-900/30 border-purple-500/30 text-white placeholder-purple-300/50'
  const btnPrimary = 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white'
  const btnDanger = 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30'

  useEffect(() => {
    if ((session?.user as any)?.role !== 'admin') return
    fetchGames()
  }, [session])

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/admin/games')
      if (res.ok) setGames(await res.json())
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newGame.slug.trim() || !newGame.title.trim()) return
    setSaving('add')
    try {
      let config = {}
      try { config = JSON.parse(newGame.config) } catch {}
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGame, config }),
      })
      if (res.ok) {
        setNewGame({ slug: '', title: '', description: '', icon: '🎮', entryFee: 0, minReward: 1, maxReward: 10, sortOrder: 0, config: '{}' })
        setShowAddForm(false)
        fetchGames()
      }
    } catch (e) {
      console.error('Add error:', e)
    } finally {
      setSaving(null)
    }
  }

  const handleUpdate = async (game: MiniGame) => {
    setSaving(game.id)
    try {
      const res = await fetch('/api/admin/games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      })
      if (res.ok) {
        setEditingGame(null)
        fetchGames()
      }
    } catch (e) {
      console.error('Update error:', e)
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = async (game: MiniGame) => {
    handleUpdate({ ...game, isActive: !game.isActive })
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'tr' ? 'Bu oyunu silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this game?')) return
    setSaving(id)
    try {
      const res = await fetch('/api/admin/games', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) fetchGames()
    } catch (e) {
      console.error('Delete error:', e)
    } finally {
      setSaving(null)
    }
  }

  const handleSortOrder = async (game: MiniGame, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? game.sortOrder - 1 : game.sortOrder + 1
    handleUpdate({ ...game, sortOrder: newOrder })
  }

  if ((session?.user as any)?.role !== 'admin') {
    return (
      <div className={`min-h-screen ${bgMain} flex items-center justify-center`}>
        <p className="text-red-400 text-lg">Yetkisiz erişim / Unauthorized</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgMain} ${textPrimary}`}>
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0118]/90 border-b border-purple-500/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/admin`)} className="p-2 rounded-lg hover:bg-purple-500/20 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              {language === 'tr' ? 'Oyun Merkezi Yönetimi' : 'Game Center Management'}
            </h1>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${btnPrimary} text-sm font-medium transition-all hover:scale-105`}
          >
            <Plus className="w-4 h-4" />
            {language === 'tr' ? 'Yeni Oyun' : 'New Game'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-2xl border ${cardBg} p-4 space-y-3 overflow-hidden`}
            >
              <h3 className="text-lg font-semibold text-amber-400">
                {language === 'tr' ? '➕ Yeni Oyun Ekle' : '➕ Add New Game'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>Slug (benzersiz)</label>
                  <input
                    value={newGame.slug}
                    onChange={e => setNewGame({ ...newGame, slug: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                    placeholder="ornek-oyun"
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Başlık' : 'Title'}</label>
                  <input
                    value={newGame.title}
                    onChange={e => setNewGame({ ...newGame, title: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                    placeholder="Oyun Adı"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Açıklama' : 'Description'}</label>
                  <input
                    value={newGame.description}
                    onChange={e => setNewGame({ ...newGame, description: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                    placeholder="Oyun açıklaması"
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>İkon (emoji)</label>
                  <input
                    value={newGame.icon}
                    onChange={e => setNewGame({ ...newGame, icon: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Giriş Ücreti (Jeton)' : 'Entry Fee'}</label>
                  <input
                    type="number"
                    value={newGame.entryFee}
                    onChange={e => setNewGame({ ...newGame, entryFee: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Min Ödül' : 'Min Reward'}</label>
                  <input
                    type="number"
                    value={newGame.minReward}
                    onChange={e => setNewGame({ ...newGame, minReward: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Max Ödül' : 'Max Reward'}</label>
                  <input
                    type="number"
                    value={newGame.maxReward}
                    onChange={e => setNewGame({ ...newGame, maxReward: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Sıralama' : 'Sort Order'}</label>
                  <input
                    type="number"
                    value={newGame.sortOrder}
                    onChange={e => setNewGame({ ...newGame, sortOrder: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`text-xs ${textSecondary} mb-1 block`}>Config (JSON)</label>
                  <textarea
                    value={newGame.config}
                    onChange={e => setNewGame({ ...newGame, config: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm h-20`}
                    placeholder='{"key": "value"}'
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm text-purple-300 hover:bg-purple-500/20 transition">
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving === 'add'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary} text-sm font-medium transition-all`}
                >
                  {saving === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : games.length === 0 ? (
          <div className={`rounded-2xl border ${cardBg} p-8 text-center`}>
            <Gamepad2 className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className={textSecondary}>{language === 'tr' ? 'Henüz oyun eklenmemiş' : 'No games added yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.sort((a, b) => a.sortOrder - b.sortOrder).map(game => (
              <motion.div
                key={game.id}
                layout
                className={`rounded-2xl border ${cardBg} p-4 transition-all hover:border-purple-400/40`}
              >
                {editingGame?.id === game.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Başlık' : 'Title'}</label>
                        <input
                          value={editingGame.title}
                          onChange={e => setEditingGame({ ...editingGame, title: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary} mb-1 block`}>İkon</label>
                        <input
                          value={editingGame.icon}
                          onChange={e => setEditingGame({ ...editingGame, icon: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Açıklama' : 'Description'}</label>
                        <input
                          value={editingGame.description}
                          onChange={e => setEditingGame({ ...editingGame, description: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Giriş Ücreti' : 'Entry Fee'}</label>
                        <input
                          type="number"
                          value={editingGame.entryFee}
                          onChange={e => setEditingGame({ ...editingGame, entryFee: Number(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Min Ödül' : 'Min Reward'}</label>
                        <input
                          type="number"
                          value={editingGame.minReward}
                          onChange={e => setEditingGame({ ...editingGame, minReward: Number(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Max Ödül' : 'Max Reward'}</label>
                        <input
                          type="number"
                          value={editingGame.maxReward}
                          onChange={e => setEditingGame({ ...editingGame, maxReward: Number(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary} mb-1 block`}>{language === 'tr' ? 'Sıralama' : 'Sort Order'}</label>
                        <input
                          type="number"
                          value={editingGame.sortOrder}
                          onChange={e => setEditingGame({ ...editingGame, sortOrder: Number(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={`text-xs ${textSecondary} mb-1 block`}>Config (JSON)</label>
                        <textarea
                          value={typeof editingGame.config === 'string' ? editingGame.config : JSON.stringify(editingGame.config, null, 2)}
                          onChange={e => {
                            try {
                              setEditingGame({ ...editingGame, config: JSON.parse(e.target.value) })
                            } catch {
                              setEditingGame({ ...editingGame, config: e.target.value })
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm h-20`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingGame(null)} className="px-3 py-1.5 rounded-lg text-sm text-purple-300 hover:bg-purple-500/20 transition">
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdate(editingGame)}
                        disabled={saving === game.id}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg ${btnPrimary} text-sm font-medium`}
                      >
                        {saving === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {language === 'tr' ? 'Güncelle' : 'Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-3xl">{game.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white truncate">{game.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${game.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {game.isActive ? (language === 'tr' ? 'Aktif' : 'Active') : (language === 'tr' ? 'Pasif' : 'Inactive')}
                          </span>
                        </div>
                        <p className={`text-xs ${textSecondary} truncate`}>{game.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-amber-400">💰 {language === 'tr' ? 'Giriş' : 'Fee'}: {game.entryFee}</span>
                          <span className="text-xs text-green-400">🎁 {language === 'tr' ? 'Ödül' : 'Reward'}: {game.minReward}-{game.maxReward}</span>
                          <span className="text-xs text-purple-300">📋 {language === 'tr' ? 'Sıra' : 'Order'}: {game.sortOrder}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button onClick={() => handleSortOrder(game, 'up')} className="p-1.5 rounded-lg hover:bg-purple-500/20 transition" title="Yukarı">
                        <ChevronUp className="w-4 h-4 text-purple-300" />
                      </button>
                      <button onClick={() => handleSortOrder(game, 'down')} className="p-1.5 rounded-lg hover:bg-purple-500/20 transition" title="Aşağı">
                        <ChevronDown className="w-4 h-4 text-purple-300" />
                      </button>
                      <button onClick={() => handleToggleActive(game)} className="p-1.5 rounded-lg hover:bg-purple-500/20 transition" title={game.isActive ? 'Devre dışı bırak' : 'Aktifleştir'}>
                        {game.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}
                      </button>
                      <button onClick={() => setEditingGame(game)} className="p-1.5 rounded-lg hover:bg-purple-500/20 transition" title="Düzenle">
                        <Edit2 className="w-4 h-4 text-amber-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        disabled={saving === game.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition"
                        title="Sil"
                      >
                        {saving === game.id ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
