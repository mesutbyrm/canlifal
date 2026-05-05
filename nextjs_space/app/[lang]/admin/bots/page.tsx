'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Bot, Search, Filter, ToggleLeft, ToggleRight, Users, Activity, MapPin, Clock, Sparkles, ChevronLeft, ChevronDown, ChevronUp, Eye, EyeOff, RefreshCw, User, Zap, Heart, Smile, Shield, Play, Pause, Radio, MessageCircle } from 'lucide-react'

const PERSONALITY_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  shy: { label: 'Utangaç', emoji: '😳', color: 'text-blue-400' },
  aggressive: { label: 'Agresif', emoji: '🔥', color: 'text-red-400' },
  funny: { label: 'Komik', emoji: '😂', color: 'text-yellow-400' },
  flirty: { label: 'Flörtöz', emoji: '💕', color: 'text-pink-400' },
  serious: { label: 'Ciddi', emoji: '📚', color: 'text-purple-400' }
}

const PERSONALITY_ICONS: Record<string, any> = {
  shy: Shield,
  aggressive: Zap,
  funny: Smile,
  flirty: Heart,
  serious: User
}

interface BotData {
  id: string
  name: string
  username: string | null
  image: string | null
  bio: string | null
  zodiacSign: string | null
  createdAt: string
  lastActiveAt: string | null
  botProfile: {
    id: string
    personality: string
    age: number
    city: string
    interests: string | null
    activityLevel: string
    activeHoursStart: number
    activeHoursEnd: number
    isActive: boolean
    lastActionAt: string | null
    totalActions: number
  } | null
}

export default function AdminBotsPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const lang = params?.lang || 'tr'

  const [bots, setBots] = useState<BotData[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPersonality, setFilterPersonality] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set())
  const [expandedBot, setExpandedBot] = useState<string | null>(null)
  // Simulation states
  const [simStatus, setSimStatus] = useState<any>(null)
  const [simRunning, setSimRunning] = useState(false)
  const [simAutoInterval, setSimAutoInterval] = useState<NodeJS.Timeout | null>(null)
  const [simLog, setSimLog] = useState<Array<{ time: string; actions: any[] }>>([])
  const [simAutoActive, setSimAutoActive] = useState(false)

  const fetchBots = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterPersonality) params.set('personality', filterPersonality)
      if (filterActive) params.set('active', filterActive)

      const res = await fetch(`/api/admin/bots?${params}`)
      if (res.ok) {
        const data = await res.json()
        setBots(data.bots)
        setStats(data.stats)
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [search, filterPersonality, filterActive])

  useEffect(() => { fetchBots() }, [fetchBots])

  const toggleBot = async (botIds: string[], active: boolean) => {
    await fetch('/api/admin/bots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_active', botIds, isActive: active })
    })
    fetchBots()
  }

  const toggleAll = async (active: boolean) => {
    await fetch('/api/admin/bots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_all', isActive: active })
    })
    fetchBots()
  }

  const toggleSelectBot = (id: string) => {
    setSelectedBots(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedBots.size === bots.length) setSelectedBots(new Set())
    else setSelectedBots(new Set(bots.map(b => b.id)))
  }

  // Simulation functions
  const fetchSimStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bots/simulate')
      if (res.ok) setSimStatus(await res.json())
    } catch {}
  }, [])

  useEffect(() => { fetchSimStatus() }, [fetchSimStatus])

  const runSimCycle = async () => {
    setSimRunning(true)
    try {
      const res = await fetch('/api/admin/bots/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (res.ok) {
        const data = await res.json()
        const timeStr = new Date().toLocaleTimeString('tr-TR')
        setSimLog(prev => [{ time: timeStr, actions: data.actions || [] }, ...prev].slice(0, 20))
        fetchSimStatus()
      }
    } catch {} finally {
      setSimRunning(false)
    }
  }

  const toggleAutoSim = () => {
    if (simAutoActive) {
      if (simAutoInterval) clearInterval(simAutoInterval)
      setSimAutoInterval(null)
      setSimAutoActive(false)
    } else {
      runSimCycle() // Run immediately
      const interval = setInterval(runSimCycle, 30000) // Every 30 seconds
      setSimAutoInterval(interval)
      setSimAutoActive(true)
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => { if (simAutoInterval) clearInterval(simAutoInterval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simAutoInterval])

  if (!session?.user?.role || !['admin', 'yonetici'].includes(session.user.role)) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Yetkisiz erişim</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/${lang}/admin`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Bot className="w-7 h-7 text-purple-400" />
          <h1 className="text-2xl font-bold">AI Bot Yönetimi</h1>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-purple-400">{stats.total}</div>
              <div className="text-xs text-gray-400">Toplam Bot</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
              <div className="text-xs text-gray-400">Aktif Bot</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">{stats.total - stats.active}</div>
              <div className="text-xs text-gray-400">Pasif Bot</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">{Object.keys(stats.personalityStats).length}</div>
              <div className="text-xs text-gray-400">Kişilik Tipi</div>
            </div>
          </div>
        )}

        {/* Personality Distribution */}
        {stats?.personalityStats && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Kişilik Dağılımı</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.personalityStats).map(([key, count]) => {
                const p = PERSONALITY_MAP[key] || { label: key, emoji: '❓', color: 'text-gray-400' }
                return (
                  <div key={key} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span>{p.emoji}</span>
                    <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{count as number}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Simulation Control Panel */}
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-4 border border-indigo-500/20 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
              <Radio className="w-4 h-4" /> Simülasyon Kontrol Paneli
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={runSimCycle}
                disabled={simRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 hover:bg-indigo-500/30 transition disabled:opacity-50"
              >
                {simRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {simRunning ? 'Çalışıyor...' : 'Tek Döngü'}
              </button>
              <button
                onClick={toggleAutoSim}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition ${
                  simAutoActive
                    ? 'bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                {simAutoActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {simAutoActive ? 'Otomatik: AÇIK (30sn)' : 'Otomatik Başlat'}
              </button>
            </div>
          </div>

          {/* Live Status */}
          {simStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="bg-black/20 rounded-lg px-3 py-2">
                <div className="text-lg font-bold text-green-400">{simStatus.currentlyInRooms || 0}</div>
                <div className="text-[10px] text-gray-500">Odalarda Aktif</div>
              </div>
              <div className="bg-black/20 rounded-lg px-3 py-2">
                <div className="text-lg font-bold text-blue-400">{simStatus.activeBots || 0}</div>
                <div className="text-[10px] text-gray-500">Toplam Aktif Bot</div>
              </div>
              <div className="bg-black/20 rounded-lg px-3 py-2">
                <div className="text-lg font-bold text-yellow-400">{simStatus.messagesLastHour || 0}</div>
                <div className="text-[10px] text-gray-500">Son 1 Saat Mesaj</div>
              </div>
              <div className="bg-black/20 rounded-lg px-3 py-2">
                <div className="text-lg font-bold text-purple-400">{simStatus.presences?.length || 0}</div>
                <div className="text-[10px] text-gray-500">Aktif Presence</div>
              </div>
            </div>
          )}

          {/* Active Bots in Rooms */}
          {simStatus?.presences?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 mb-1">Odalardaki Botlar:</p>
              <div className="flex flex-wrap gap-1.5">
                {simStatus.presences.map((p: any, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-gray-300">
                    {PERSONALITY_MAP[p.personality]?.emoji || '🤖'} {p.bot} → {p.room}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Action Log */}
          {simLog.length > 0 && (
            <div className="max-h-32 overflow-y-auto">
              <p className="text-[10px] text-gray-500 mb-1">Son Aksiyonlar:</p>
              <div className="space-y-1">
                {simLog.map((entry, i) => (
                  <div key={i}>
                    {entry.actions.map((a: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="text-gray-600">{entry.time}</span>
                        <span className={
                          a.action === 'join' ? 'text-green-400' :
                          a.action === 'leave' ? 'text-red-400' :
                          'text-blue-400'
                        }>
                          {a.action === 'join' ? '→ Giriş' : a.action === 'leave' ? '← Çıkış' : '💬 Mesaj'}
                        </span>
                        <span className="text-white/70 font-medium">{a.bot}</span>
                        <span className="text-gray-600">@{a.room}</span>
                        {a.message && <span className="text-gray-500 truncate max-w-[150px]">"{a.message}"</span>}
                      </div>
                    ))}
                    {entry.actions.length === 0 && (
                      <div className="text-[10px] text-gray-600">{entry.time} — Aksiyon yok</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Bot ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={filterPersonality}
            onChange={e => setFilterPersonality(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="">Tüm Kişilikler</option>
            {Object.entries(PERSONALITY_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
          <button onClick={() => fetchBots()} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={selectAll} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition">
            {selectedBots.size === bots.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
          </button>
          {selectedBots.size > 0 && (
            <>
              <button
                onClick={() => toggleBot(Array.from(selectedBots), true)}
                className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/30 transition"
              >
                <Eye className="w-3 h-3 inline mr-1" /> Seçilenleri Aktif Et ({selectedBots.size})
              </button>
              <button
                onClick={() => toggleBot(Array.from(selectedBots), false)}
                className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition"
              >
                <EyeOff className="w-3 h-3 inline mr-1" /> Seçilenleri Pasif Et ({selectedBots.size})
              </button>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/30 transition"
            >
              <ToggleRight className="w-3 h-3 inline mr-1" /> Hepsini Aktif Et
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition"
            >
              <ToggleLeft className="w-3 h-3 inline mr-1" /> Hepsini Pasif Et
            </button>
          </div>
        </div>

        {/* Bot List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {bots.map((bot) => {
              const profile = bot.botProfile
              const p = PERSONALITY_MAP[profile?.personality || ''] || { label: '?', emoji: '❓', color: 'text-gray-400' }
              const PIcon = PERSONALITY_ICONS[profile?.personality || ''] || User
              const isExpanded = expandedBot === bot.id
              const isSelected = selectedBots.has(bot.id)
              let interests: string[] = []
              try { interests = profile?.interests ? JSON.parse(profile.interests) : [] } catch {}

              return (
                <motion.div
                  key={bot.id}
                  layout
                  className={`bg-white/5 rounded-xl border transition-all ${
                    isSelected ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10'
                  } ${profile?.isActive ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedBot(isExpanded ? null : bot.id)}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelectBot(bot.id) }}
                      className="w-4 h-4 rounded accent-purple-500 flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    />

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {bot.image ? (
                        <img src={bot.image} alt={bot.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-purple-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{bot.name}</span>
                        <span className="text-[10px] text-gray-500">@{bot.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className={p.color}>{p.emoji} {p.label}</span>
                        <span>•</span>
                        <span>{profile?.city}</span>
                        <span>•</span>
                        <span>{profile?.age} yaş</span>
                        {bot.zodiacSign && <><span>•</span><span>{bot.zodiacSign}</span></>}
                      </div>
                    </div>

                    {/* Status & Toggle */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        profile?.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {profile?.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBot([bot.id], !profile?.isActive) }}
                        className="p-1 rounded hover:bg-white/10 transition"
                      >
                        {profile?.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                          {/* Bio */}
                          {bot.bio && (
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase">Biyografi</span>
                              <p className="text-sm text-gray-300">{bot.bio}</p>
                            </div>
                          )}

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                                <PIcon className="w-3 h-3" /> Kişilik
                              </div>
                              <span className={`text-sm font-medium ${p.color}`}>{p.emoji} {p.label}</span>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                                <Activity className="w-3 h-3" /> Aktivite
                              </div>
                              <span className="text-sm font-medium">
                                {profile?.activityLevel === 'high' ? '🔥 Yüksek' : profile?.activityLevel === 'low' ? '💤 Düşük' : '⚡ Orta'}
                              </span>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                                <Clock className="w-3 h-3" /> Aktif Saatler
                              </div>
                              <span className="text-sm font-medium">{profile?.activeHoursStart}:00 - {profile?.activeHoursEnd}:00</span>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                                <Sparkles className="w-3 h-3" /> Toplam Aksiyon
                              </div>
                              <span className="text-sm font-medium">{profile?.totalActions || 0}</span>
                            </div>
                          </div>

                          {/* Interests */}
                          {interests.length > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase">İlgi Alanları</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {interests.map((int, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300">
                                    {int}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}

        {!loading && bots.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Hiç bot bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
