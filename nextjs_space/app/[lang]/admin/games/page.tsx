'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import AdminBackButton from '@/components/admin-back-button'
import {
  Gamepad2, Plus, Edit2, Trash2, Save, X, Loader2, Eye, EyeOff,
  ChevronUp, ChevronDown, Settings, Users, DoorOpen, Percent,
  RefreshCw, XCircle, Clock, Coins, FileJson, Upload, BookOpen,
  Copy, Check, AlertCircle, Search, Code
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

interface GameRoom {
  id: string
  gameType: string
  player1Id: string
  player2Id: string | null
  player1Name: string
  player2Name: string
  isAI: boolean
  betAmount: number
  betCurrency: string
  status: string
  viewerCount: number
  chatCount: number
  createdAt: string
  updatedAt: string
}

interface GameSettings {
  commissionRate: number
  minBetAmount: number
  maxBetAmount: number
  allowedCurrencies: string[]
  turnTimerOptions: number[]
  gamesEnabled: boolean
}

type TabType = 'games' | 'rooms' | 'settings' | 'guide'

const GAME_TYPE_LABELS: Record<string, string> = {
  xox: '❌ XOX', tombala: '🎱 Tombala', tavla: '🎲 Tavla',
  pisti: '🃏 Pişti', sayi_tahmin: '🔢 Sayı Tahmin', zar: '🎲 Zar',
  okey: '🀄 Okey', okey101: '🀄 101 Okey', yuzbirokey: '🀄 Yüzbir Okey',
  sos: '🔤 SOS'
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  waiting: { label: 'Bekliyor', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  active: { label: 'Aktif', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  completed: { label: 'Bitti', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  cancelled: { label: 'İptal', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function AdminGamesPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  const [activeTab, setActiveTab] = useState<TabType>('games')

  // Games state
  const [games, setGames] = useState<MiniGame[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingGame, setEditingGame] = useState<MiniGame | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGame, setNewGame] = useState({
    slug: '', title: '', description: '', icon: '🎮',
    entryFee: 0, minReward: 1, maxReward: 10, sortOrder: 0, config: '{}'
  })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Rooms state
  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [roomsTotal, setRoomsTotal] = useState(0)
  const [roomsPage, setRoomsPage] = useState(1)
  const [roomsTotalPages, setRoomsTotalPages] = useState(1)
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomStatusFilter, setRoomStatusFilter] = useState('all')
  const [roomTypeFilter, setRoomTypeFilter] = useState('all')
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [typeCountMap, setTypeCountMap] = useState<Record<string, number>>({})
  const [closingRoom, setClosingRoom] = useState<string | null>(null)

  // Settings state
  const [settings, setSettings] = useState<GameSettings>({
    commissionRate: 10, minBetAmount: 0, maxBetAmount: 10000,
    allowedCurrencies: ['FREE', 'CFC', 'JETON'], turnTimerOptions: [0, 10, 15, 20],
    gamesEnabled: true,
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Copy helper
  const [copiedText, setCopiedText] = useState('')

  const showMsg = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
    else { setError(msg); setTimeout(() => setError(''), 4000) }
  }

  // ==================== GAMES TAB ====================
  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/games')
      if (res.ok) setGames(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const role = (session?.user as any)?.role
    if (role && ['admin','yonetici','moderator','finans'].includes(role)) {
      fetchGames()
    }
  }, [session, fetchGames])

  const handleAddGame = async () => {
    if (!newGame.slug.trim() || !newGame.title.trim()) return
    setSaving('add')
    try {
      let config = {}
      try { config = JSON.parse(newGame.config) } catch {}
      const res = await fetch('/api/admin/games', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGame, config }),
      })
      if (res.ok) {
        setNewGame({ slug: '', title: '', description: '', icon: '🎮', entryFee: 0, minReward: 1, maxReward: 10, sortOrder: 0, config: '{}' })
        setShowAddForm(false)
        fetchGames()
        showMsg('Oyun eklendi', 'success')
      }
    } catch (e) { showMsg('Hata oluştu', 'error') }
    finally { setSaving(null) }
  }

  const handleUpdateGame = async (game: MiniGame) => {
    setSaving(game.id)
    try {
      const res = await fetch('/api/admin/games', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      })
      if (res.ok) { setEditingGame(null); fetchGames(); showMsg('Güncellendi', 'success') }
    } catch (e) { showMsg('Güncelleme hatası', 'error') }
    finally { setSaving(null) }
  }

  const handleToggleActive = async (game: MiniGame) => handleUpdateGame({ ...game, isActive: !game.isActive })

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Bu oyunu silmek istediğinize emin misiniz?')) return
    setSaving(id)
    try {
      const res = await fetch('/api/admin/games', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) { fetchGames(); showMsg('Oyun silindi', 'success') }
    } catch (e) { showMsg('Silme hatası', 'error') }
    finally { setSaving(null) }
  }

  const handleSortOrder = async (game: MiniGame, dir: 'up' | 'down') => {
    handleUpdateGame({ ...game, sortOrder: dir === 'up' ? game.sortOrder - 1 : game.sortOrder + 1 })
  }

  // ==================== ROOMS TAB ====================
  const fetchRooms = useCallback(async (page = 1) => {
    setRoomsLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20', status: roomStatusFilter, gameType: roomTypeFilter })
      const res = await fetch(`/api/admin/games/rooms?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
        setRoomsTotal(data.total || 0)
        setRoomsTotalPages(data.totalPages || 1)
        setRoomsPage(data.page || 1)
        setStatusCounts(data.statusCounts || {})
        setTypeCountMap(data.typeCountMap || {})
      }
    } catch (e) { console.error(e) }
    finally { setRoomsLoading(false) }
  }, [roomStatusFilter, roomTypeFilter])

  useEffect(() => {
    if (activeTab === 'rooms') fetchRooms(1)
  }, [activeTab, roomStatusFilter, roomTypeFilter, fetchRooms])

  const handleCloseRoom = async (roomId: string) => {
    if (!confirm('Bu odayı kapatmak istediğinize emin misiniz? Bahisler iade edilecek.')) return
    setClosingRoom(roomId)
    try {
      const res = await fetch('/api/admin/games/rooms', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      })
      if (res.ok) { fetchRooms(roomsPage); showMsg('Oda kapatıldı', 'success') }
    } catch (e) { showMsg('Hata oluştu', 'error') }
    finally { setClosingRoom(null) }
  }

  // ==================== SETTINGS TAB ====================
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin/games/settings')
      if (res.ok) setSettings(await res.json())
    } catch (e) { console.error(e) }
    finally { setSettingsLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === 'settings') fetchSettings()
  }, [activeTab, fetchSettings])

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/admin/games/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) showMsg('Ayarlar kaydedildi', 'success')
      else showMsg('Kaydetme hatası', 'error')
    } catch (e) { showMsg('Hata oluştu', 'error') }
    finally { setSettingsSaving(false) }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(''), 2000)
  }

  const userRole = (session?.user as any)?.role
  if (userRole && !['admin','yonetici','moderator','finans'].includes(userRole)) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-400">Yetkisiz erişim</p></div>
  }

  const TABS: { id: TabType; label: string; icon: any }[] = [
    { id: 'games', label: 'Oyunlar', icon: Gamepad2 },
    { id: 'rooms', label: 'Açık Odalar', icon: DoorOpen },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
    { id: 'guide', label: 'Rehber', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdminBackButton />
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Oyun Merkezi Yönetimi
            </h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && <div className="max-w-5xl mx-auto px-4 mt-3"><div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm flex items-center gap-2"><Check className="w-4 h-4" />{success}</div></div>}
      {error && <div className="max-w-5xl mx-auto px-4 mt-3"><div className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div></div>}

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">

        {/* ==================== GAMES TAB ==================== */}
        {activeTab === 'games' && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Yeni Oyun
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="rounded-2xl border bg-white/5 border-white/10 p-4 space-y-3">
                <h3 className="text-lg font-semibold text-amber-400">➕ Yeni Oyun Ekle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InputField label="Slug (benzersiz)" value={newGame.slug} onChange={v => setNewGame({ ...newGame, slug: v })} placeholder="ornek-oyun" />
                  <InputField label="Başlık" value={newGame.title} onChange={v => setNewGame({ ...newGame, title: v })} placeholder="Oyun Adı" />
                  <div className="md:col-span-2">
                    <InputField label="Açıklama" value={newGame.description} onChange={v => setNewGame({ ...newGame, description: v })} placeholder="Oyun açıklaması" />
                  </div>
                  <InputField label="İkon (emoji)" value={newGame.icon} onChange={v => setNewGame({ ...newGame, icon: v })} />
                  <NumField label="Giriş Ücreti (CFC)" value={newGame.entryFee} onChange={v => setNewGame({ ...newGame, entryFee: v })} />
                  <NumField label="Min Ödül" value={newGame.minReward} onChange={v => setNewGame({ ...newGame, minReward: v })} />
                  <NumField label="Max Ödül" value={newGame.maxReward} onChange={v => setNewGame({ ...newGame, maxReward: v })} />
                  <NumField label="Sıralama" value={newGame.sortOrder} onChange={v => setNewGame({ ...newGame, sortOrder: v })} />
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">Config (JSON)</label>
                    <textarea
                      value={newGame.config}
                      onChange={e => setNewGame({ ...newGame, config: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm h-20 font-mono focus:outline-none focus:border-indigo-500/50"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5">İptal</button>
                  <button onClick={handleAddGame} disabled={saving === 'add'} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
                    {saving === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Game List */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
            ) : games.length === 0 ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
                <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Henüz oyun eklenmemiş</p>
              </div>
            ) : (
              <div className="space-y-3">
                {games.sort((a, b) => a.sortOrder - b.sortOrder).map(game => (
                  <div key={game.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:border-indigo-500/30 transition-all">
                    {editingGame?.id === game.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <InputField label="Başlık" value={editingGame.title} onChange={v => setEditingGame({ ...editingGame, title: v })} />
                          <InputField label="İkon" value={editingGame.icon} onChange={v => setEditingGame({ ...editingGame, icon: v })} />
                          <div className="md:col-span-2">
                            <InputField label="Açıklama" value={editingGame.description} onChange={v => setEditingGame({ ...editingGame, description: v })} />
                          </div>
                          <NumField label="Giriş Ücreti" value={editingGame.entryFee} onChange={v => setEditingGame({ ...editingGame, entryFee: v })} />
                          <NumField label="Min Ödül" value={editingGame.minReward} onChange={v => setEditingGame({ ...editingGame, minReward: v })} />
                          <NumField label="Max Ödül" value={editingGame.maxReward} onChange={v => setEditingGame({ ...editingGame, maxReward: v })} />
                          <NumField label="Sıralama" value={editingGame.sortOrder} onChange={v => setEditingGame({ ...editingGame, sortOrder: v })} />
                          <div className="md:col-span-2">
                            <label className="text-xs text-gray-400 mb-1 block">Config (JSON)</label>
                            <textarea
                              value={typeof editingGame.config === 'string' ? editingGame.config : JSON.stringify(editingGame.config, null, 2)}
                              onChange={e => {
                                try { setEditingGame({ ...editingGame, config: JSON.parse(e.target.value) }) }
                                catch { setEditingGame({ ...editingGame, config: e.target.value }) }
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm h-24 font-mono focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingGame(null)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4 text-gray-400" /></button>
                          <button onClick={() => handleUpdateGame(editingGame)} disabled={saving === game.id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
                            {saving === game.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Güncelle
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-3xl">{game.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold truncate">{game.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${game.isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                {game.isActive ? 'Aktif' : 'Pasif'}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">{game.slug}</span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{game.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-amber-400">💰 Giriş: {game.entryFee}</span>
                              <span className="text-xs text-green-400">🎁 Ödül: {game.minReward}-{game.maxReward}</span>
                              <span className="text-xs text-gray-500">📋 Sıra: {game.sortOrder}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button onClick={() => handleSortOrder(game, 'up')} className="p-1.5 rounded-lg hover:bg-white/5" title="Yukarı"><ChevronUp className="w-4 h-4 text-gray-400" /></button>
                          <button onClick={() => handleSortOrder(game, 'down')} className="p-1.5 rounded-lg hover:bg-white/5" title="Aşağı"><ChevronDown className="w-4 h-4 text-gray-400" /></button>
                          <button onClick={() => handleToggleActive(game)} className="p-1.5 rounded-lg hover:bg-white/5">{game.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}</button>
                          <button onClick={() => setEditingGame(game)} className="p-1.5 rounded-lg hover:bg-white/5"><Edit2 className="w-4 h-4 text-amber-400" /></button>
                          <button onClick={() => handleDeleteGame(game.id)} disabled={saving === game.id} className="p-1.5 rounded-lg hover:bg-red-500/20">
                            {saving === game.id ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ==================== ROOMS TAB ==================== */}
        {activeTab === 'rooms' && (
          <>
            {/* Room Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['waiting', 'active', 'completed', 'cancelled'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setRoomStatusFilter(roomStatusFilter === s ? 'all' : s)}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    roomStatusFilter === s ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl font-bold">{statusCounts[s] || 0}</div>
                  <div className="text-xs text-gray-400">{STATUS_LABELS[s].label}</div>
                </button>
              ))}
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Oyun Tipi:</span>
              <button onClick={() => setRoomTypeFilter('all')} className={`px-3 py-1 rounded-full text-xs transition ${roomTypeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Tümü</button>
              {Object.entries(GAME_TYPE_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setRoomTypeFilter(roomTypeFilter === key ? 'all' : key)} className={`px-3 py-1 rounded-full text-xs transition ${roomTypeFilter === key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {label} {typeCountMap[key] ? `(${typeCountMap[key]})` : ''}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">{roomsTotal} oda bulundu</span>
              <button onClick={() => fetchRooms(roomsPage)} className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">
                <RefreshCw className="w-4 h-4" /> Yenile
              </button>
            </div>

            {/* Room list */}
            {roomsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
            ) : rooms.length === 0 ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
                <DoorOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Bu filtrelerde oda bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map(room => (
                  <div key={room.id} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{GAME_TYPE_LABELS[room.gameType] || room.gameType}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_LABELS[room.status]?.color || 'bg-gray-500/20 text-gray-400'}`}>
                          {STATUS_LABELS[room.status]?.label || room.status}
                        </span>
                        {room.isAI && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">🤖 AI</span>}
                        {room.betAmount > 0 && <span className="text-xs text-amber-400">💰 {room.betAmount} {room.betCurrency}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {room.player1Name} vs {room.player2Name} • 👁 {room.viewerCount} izleyici • 💬 {room.chatCount} mesaj
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5 font-mono">{room.id}</div>
                    </div>
                    {['active', 'waiting'].includes(room.status) && (
                      <button
                        onClick={() => handleCloseRoom(room.id)}
                        disabled={closingRoom === room.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs border border-red-500/30 shrink-0"
                      >
                        {closingRoom === room.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Kapat
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {roomsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => { setRoomsPage(p => Math.max(1, p - 1)); fetchRooms(Math.max(1, roomsPage - 1)) }} disabled={roomsPage <= 1} className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30">← Önceki</button>
                <span className="text-sm text-gray-400">Sayfa {roomsPage} / {roomsTotalPages}</span>
                <button onClick={() => { setRoomsPage(p => Math.min(roomsTotalPages, p + 1)); fetchRooms(Math.min(roomsTotalPages, roomsPage + 1)) }} disabled={roomsPage >= roomsTotalPages} className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30">Sonraki →</button>
              </div>
            )}
          </>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === 'settings' && (
          <>
            {settingsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
            ) : (
              <div className="space-y-6">
                {/* Commission */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-lg">Komisyon Ayarları</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Komisyon Oranı (%)</label>
                      <input
                        type="number" min={0} max={50}
                        value={settings.commissionRate}
                        onChange={e => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                      <p className="text-xs text-gray-600 mt-1">Bahisli oyunlarda kazanandan alınan komisyon</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Min Bahis Miktarı</label>
                      <input
                        type="number" min={0}
                        value={settings.minBetAmount}
                        onChange={e => setSettings({ ...settings, minBetAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Max Bahis Miktarı</label>
                      <input
                        type="number" min={0}
                        value={settings.maxBetAmount}
                        onChange={e => setSettings({ ...settings, maxBetAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Currencies & Timers */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-lg">Para Birimi & Zamanlayıcı</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">İzin Verilen Para Birimleri</label>
                      <div className="flex items-center gap-3 mt-1">
                        {['FREE', 'CFC', 'JETON'].map(c => (
                          <label key={c} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={settings.allowedCurrencies.includes(c)}
                              onChange={e => {
                                if (e.target.checked) setSettings({ ...settings, allowedCurrencies: [...settings.allowedCurrencies, c] })
                                else setSettings({ ...settings, allowedCurrencies: settings.allowedCurrencies.filter(x => x !== c) })
                              }}
                              className="w-4 h-4 accent-indigo-500"
                            />
                            <span className="text-gray-300">{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Hamle Zamanlayıcısı Seçenekleri (sn)</label>
                      <input
                        value={settings.turnTimerOptions.join(', ')}
                        onChange={e => setSettings({ ...settings, turnTimerOptions: e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v)) })}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                        placeholder="0, 10, 15, 20"
                      />
                    </div>
                  </div>
                </div>

                {/* Global Toggle */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gamesEnabled}
                      onChange={e => setSettings({ ...settings, gamesEnabled: e.target.checked })}
                      className="w-5 h-5 accent-indigo-500"
                    />
                    <div>
                      <span className="font-medium">Oyun Merkezi Aktif</span>
                      <p className="text-xs text-gray-500">Kapatırsanız oyun sayfaları erişime kapanır</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-all"
                >
                  {settingsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Ayarları Kaydet
                </button>
              </div>
            )}
          </>
        )}

        {/* ==================== GUIDE TAB ==================== */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">Oyun Sistemi Hakkında</h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Platformda iki tür oyun sistemi vardır:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-amber-400 mb-2">🎰 Mini Oyunlar (MiniGame)</h4>
                  <p className="text-xs text-gray-400">Tek kişilik şans oyunları: Fal Çarkı, Tarot Seç, Hafıza Oyunu, Şans Kutusu vb. Giriş ücreti, min/max ödül ve JSON config ile yönetilir.</p>
                </div>
                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-green-400 mb-2">🎮 Çok Oyunculu (GameRoom)</h4>
                  <p className="text-xs text-gray-400">PvP/AI oyunlar: XOX, Tombala, Tavla, Pişti, Okey, SOS, Zar vb. Bahis sistemi, komisyon, oda yönetimi ile çalışır.</p>
                </div>
              </div>
            </div>

            {/* How to add external game */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-lg">Dışarıdan Oyun Ekleme Rehberi</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-indigo-300 mb-2">Adım 1: Oyun Tipini Belirleyin</h4>
                  <p className="text-sm text-gray-400">Eklemek istediğiniz oyun tek kişilik mi (mini oyun) yoksa çok oyunculu mu (PvP)? Buna göre entegrasyon yöntemi değişir.</p>
                </div>

                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-indigo-300 mb-2">Adım 2: Mini Oyun Ekleme (Tek Kişilik)</h4>
                  <ol className="text-sm text-gray-400 space-y-2 list-decimal ml-4">
                    <li><strong className="text-gray-300">Oyunlar sekmesinden</strong> &quot;Yeni Oyun&quot; butonuna tıklayın</li>
                    <li><strong className="text-gray-300">Slug</strong> alanına benzersiz bir ID verin (ör: &quot;rulet&quot;, &quot;slot-makinesi&quot;)</li>
                    <li><strong className="text-gray-300">Config JSON&apos;a</strong> oyun ayarlarını yazın (ör: ödül tablosu, olasılıklar)</li>
                    <li>Oyun sayfasını oluşturun: <code className="text-xs bg-white/10 px-1 rounded">app/[lang]/oyunlar/[slug]/page.tsx</code></li>
                    <li>Oyun mantığını yazın ve <code className="text-xs bg-white/10 px-1 rounded">/api/games/play</code> API&apos;sini kullanın</li>
                  </ol>
                </div>

                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-indigo-300 mb-2">Adım 3: Çok Oyunculu Oyun Ekleme (PvP)</h4>
                  <ol className="text-sm text-gray-400 space-y-2 list-decimal ml-4">
                    <li><strong className="text-gray-300">game-logic.ts</strong> dosyasına oyunun init ve move fonksiyonlarını ekleyin</li>
                    <li><strong className="text-gray-300">VALID_TYPES</strong> dizisine yeni oyun tipini ekleyin (<code className="text-xs bg-white/10 px-1 rounded">app/api/games/room/route.ts</code>)</li>
                    <li>Oyun sayfası oluşturun: <code className="text-xs bg-white/10 px-1 rounded">app/[lang]/oyunlar/[oyun-adi]/page.tsx</code></li>
                    <li>Mevcut oda API&apos;lerini kullanın - yeni API yazmanıza gerek yok</li>
                  </ol>
                </div>

                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-indigo-300 mb-2">Adım 4: JSON Config Kullanımı</h4>
                  <p className="text-sm text-gray-400 mb-2">Her oyun için özel ayarları Config JSON alanında saklayabilirsiniz:</p>
                  <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-green-300 overflow-x-auto">
                    <pre>{`{
  "prizes": [100, 200, 500, 1000, 5000],
  "spinCost": 10,
  "dailyLimit": 5,
  "bonusMultiplier": 2,
  "customRules": {
    "maxPlayers": 4,
    "timeLimit": 120
  }
}`}</pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Bu JSON verisi oyun sayfasında <code className="bg-white/10 px-1 rounded">fetch(&apos;/api/games?slug=oyun-slug&apos;)</code> ile çekilebilir.</p>
                </div>

                <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                  <h4 className="font-semibold text-indigo-300 mb-2">📁 Dosya Yapısı</h4>
                  <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                    <pre>{`app/
  [lang]/
    oyunlar/
      page.tsx          ← Ana oyunlar sayfası
      xox/page.tsx      ← XOX oyun sayfası
      tavla/page.tsx    ← Tavla oyun sayfası
      yeni-oyun/page.tsx ← Yeni oyununuzun sayfası
  api/
    games/
      room/route.ts     ← Oda oluşturma/listeleme
      room/[roomId]/    ← Oda detay/hamle
      play/route.ts     ← Mini oyun oynama
lib/
  game-logic.ts         ← Tüm oyun mantıkları`}</pre>
                  </div>
                </div>

                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                  <h4 className="font-semibold text-amber-400 mb-2">⚡ Hızlı İpucu</h4>
                  <p className="text-sm text-gray-300">Dışarıdan bulduğunuz bir HTML5/JS oyunu eklemek istiyorsanız, oyun dosyalarını <code className="bg-white/10 px-1 rounded">public/games/oyun-adi/</code> klasörüne koyun ve bir iframe ile yükleyin. Bahis sistemiyle entegre etmek için yukarıdaki API&apos;leri kullanabilirsiniz.</p>
                  <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-green-300 mt-2 overflow-x-auto">
                    <pre>{`// Örnek iframe entegrasyonu
<iframe 
  src="/games/yeni-oyun/index.html"
  className="w-full h-[600px] rounded-xl"
  sandbox="allow-scripts allow-same-origin"
/>`}</pre>
                  </div>
                </div>

                <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
                  <h4 className="font-semibold text-indigo-400 mb-2">🔗 İlgili Dosya Yolları</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Oyun Mantığı', path: 'lib/game-logic.ts' },
                      { label: 'Oda API', path: 'app/api/games/room/route.ts' },
                      { label: 'Hamle API', path: 'app/api/games/room/[roomId]/route.ts' },
                      { label: 'Mini Oyun API', path: 'app/api/games/play/route.ts' },
                      { label: 'Oyunlar Sayfası', path: 'app/[lang]/oyunlar/page.tsx' },
                      { label: 'Admin Oyun API', path: 'app/api/admin/games/route.ts' },
                    ].map(item => (
                      <div key={item.path} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs text-gray-400">{item.label}</span>
                          <p className="text-xs font-mono text-gray-300">{item.path}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.path, item.path)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          {copiedText === item.path ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper components
function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
        placeholder={placeholder}
      />
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
      />
    </div>
  )
}
