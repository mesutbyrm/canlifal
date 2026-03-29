'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Eye, EyeOff, Users, Settings, Activity, Sparkles, MessageCircle, Tv, Gift, UserPlus, BookOpen, Gamepad2, Heart, Star } from 'lucide-react'
import Link from 'next/link'

interface FeedConfig {
  id: string
  isEnabled: boolean
  maxItems: number
  visibleToGuests: boolean
  visibleToBasic: boolean
  visibleToPremium: boolean
  visibleToGold: boolean
  visibleToDiamond: boolean
  visibleToModerator: boolean
  visibleToAdmin: boolean
  specificUserIds: string | null
}

interface RecentActivity {
  id: string
  userName: string
  activityType: string
  detail: string
  createdAt: string
}

const ACTIVITY_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  fortune_read: { label: 'Fal Bakt\u0131rma', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
  chat_join: { label: 'Sohbete Kat\u0131lma', icon: <MessageCircle className="w-4 h-4 text-blue-400" /> },
  dream_shared: { label: 'R\u00fcya Payla\u015f\u0131m\u0131', icon: <Eye className="w-4 h-4 text-indigo-400" /> },
  stream_started: { label: 'Yay\u0131n Ba\u015flatma', icon: <Tv className="w-4 h-4 text-red-400" /> },
  gift_sent: { label: 'Hediye G\u00f6nderme', icon: <Gift className="w-4 h-4 text-yellow-400" /> },
  signup: { label: 'Kay\u0131t Olma', icon: <UserPlus className="w-4 h-4 text-green-400" /> },
  blog_read: { label: 'Blog Okuma', icon: <BookOpen className="w-4 h-4 text-cyan-400" /> },
  comment: { label: 'Yorum Yapma', icon: <MessageCircle className="w-4 h-4 text-emerald-400" /> },
  follow: { label: 'Takip Etme', icon: <Heart className="w-4 h-4 text-pink-400" /> },
  game_played: { label: 'Oyun Oynama', icon: <Gamepad2 className="w-4 h-4 text-orange-400" /> },
  live_session: { label: 'Canl\u0131 Seans', icon: <Users className="w-4 h-4 text-fuchsia-400" /> },
}

export default function ActivityFeedAdminPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [config, setConfig] = useState<FeedConfig | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const role = (session?.user as any)?.role
  const isAdmin = role && ['admin', 'yonetici', 'moderator'].includes(role)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity-feed')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        setRecentActivities(data.recentActivities || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchConfig()
    else setLoading(false)
  }, [isAdmin, fetchConfig])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/activity-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Yetkisiz eri\u015fim</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!config) return null

  const groups = [
    { key: 'visibleToGuests' as const, label: 'Kay\u0131ts\u0131z Kullan\u0131c\u0131lar', emoji: '\ud83d\udc64', desc: 'Giri\u015f yapmam\u0131\u015f ziyaret\u00e7iler' },
    { key: 'visibleToBasic' as const, label: 'Basic \u00dcyeler', emoji: '\u2b50', desc: 'Temel \u00fcyelik' },
    { key: 'visibleToPremium' as const, label: 'Premium \u00dcyeler', emoji: '\ud83d\udc8e', desc: 'Premium \u00fcyelik' },
    { key: 'visibleToGold' as const, label: 'Gold \u00dcyeler', emoji: '\ud83e\udd47', desc: 'Gold \u00fcyelik' },
    { key: 'visibleToDiamond' as const, label: 'Diamond \u00dcyeler', emoji: '\ud83d\udc8e', desc: 'Diamond \u00fcyelik' },
    { key: 'visibleToModerator' as const, label: 'Moderat\u00f6rler', emoji: '\ud83d\udee1\ufe0f', desc: 'Moderat\u00f6r rol\u00fc' },
    { key: 'visibleToAdmin' as const, label: 'Y\u00f6neticiler', emoji: '\ud83d\udc51', desc: 'Admin & Y\u00f6netici' },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Canl\u0131 Aktivite Ak\u0131\u015f\u0131
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Sitede kim ne yap\u0131yor b\u00f6l\u00fcm\u00fcn\u00fc y\u00f6netin</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable */}
        <div className="rounded-xl bg-white/5 border border-purple-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-white">Aktivite Ak\u0131\u015f\u0131</p>
                <p className="text-xs text-gray-400">Ana sayfada canl\u0131 aktivite g\u00f6sterimi</p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.isEnabled ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                config.isEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Max items */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs text-gray-400">G\u00f6sterilecek max aktivite:</label>
            <select
              value={config.maxItems}
              onChange={(e) => setConfig({ ...config, maxItems: parseInt(e.target.value) })}
              className="bg-white/10 border border-purple-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {[5, 10, 15, 20, 30, 50].map(n => (
                <option key={n} value={n} className="bg-gray-900">{n} adet</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visibility Groups */}
        <div className="rounded-xl bg-white/5 border border-purple-500/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-400" />
            <p className="text-sm font-semibold text-white">Kimler G\u00f6rs\u00fcn?</p>
          </div>

          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.key}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{group.emoji}</span>
                  <div>
                    <p className="text-sm text-white font-medium">{group.label}</p>
                    <p className="text-[10px] text-gray-500">{group.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfig({ ...config, [group.key]: !config[group.key] })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config[group.key]
                      ? 'bg-purple-600/30 text-purple-300'
                      : 'bg-gray-700/30 text-gray-500'
                  }`}
                >
                  {config[group.key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Specific Users */}
        <div className="rounded-xl bg-white/5 border border-purple-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm font-semibold text-white">Belirli Kullan\u0131c\u0131lar</p>
              <p className="text-[10px] text-gray-400">Sadece bu kullan\u0131c\u0131lar g\u00f6rs\u00fcn (bo\u015f b\u0131rak\u0131l\u0131rsa herkes i\u00e7in ge\u00e7erli)</p>
            </div>
          </div>
          <textarea
            value={config.specificUserIds || ''}
            onChange={(e) => setConfig({ ...config, specificUserIds: e.target.value || null })}
            placeholder="Kullan\u0131c\u0131 ID'lerini virg\u00fclle ay\u0131r\u0131n: id1, id2, id3"
            className="w-full bg-white/5 border border-purple-500/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px] resize-none"
          />
        </div>

        {/* Recent Activities Preview */}
        {recentActivities.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-purple-500/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-green-400" />
              <p className="text-sm font-semibold text-white">Son Aktiviteler</p>
            </div>
            <div className="space-y-1">
              {recentActivities.map((a) => {
                const typeInfo = ACTIVITY_TYPE_LABELS[a.activityType] || { label: a.activityType, icon: <Star className="w-4 h-4 text-gray-400" /> }
                return (
                  <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 text-xs">
                    {typeInfo.icon}
                    <span className="font-medium text-white">{a.userName}</span>
                    <span className="text-gray-400 truncate flex-1">{a.detail}</span>
                    <span className="text-gray-600 text-[10px] flex-shrink-0">
                      {new Date(a.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <span className="text-green-300">\u2713</span> Kaydedildi!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Kaydet
            </>
          )}
        </button>
      </div>
    </div>
  )
}
