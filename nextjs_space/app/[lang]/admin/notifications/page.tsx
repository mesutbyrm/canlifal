'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Clock, Users, BarChart3, ArrowLeft, Loader2,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2,
  Target, Tag, User, Globe, Calendar, Image as ImageIcon,
  Link as LinkIcon, Sparkles, Zap, Eye, ChevronLeft, ChevronRight,
  Copy, Radio, Gift, Star, TrendingUp, MousePointerClick
} from 'lucide-react'
import Link from 'next/link'

interface NotificationLog {
  id: string
  onesignalId: string | null
  title: string
  message: string
  url: string | null
  imageUrl: string | null
  targetType: string
  targetValue: string | null
  scheduledAt: string | null
  status: string
  recipientCount: number
  deliveredCount: number
  clickedCount: number
  errorMessage: string | null
  createdAt: string
}

interface Stats {
  subscribers: number
  totalSent: number
  totalDelivered: number
  totalClicked: number
  ctr: string
}

const QUICK_ACTIONS = [
  {
    id: 'teller_live',
    label: 'Falcı Canlıya Geçti',
    icon: <Radio className="w-5 h-5" />,
    color: 'from-red-500 to-pink-500',
    defaultTitle: '🔮 Canlı Fal Başladı!',
    defaultMessage: 'Falcınız şu anda canlı yayında! Hemen katılın ve falınızı baktırın.',
    defaultUrl: '/live-tellers',
  },
  {
    id: 'fortune_ready',
    label: 'Falınız Hazır',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-purple-500 to-violet-500',
    defaultTitle: '✨ Falınız Hazır!',
    defaultMessage: 'Fal yorumunuz tamamlandı. Hemen gelin ve detaylı yorumunuzu okuyun!',
    defaultUrl: '/dashboard',
  },
  {
    id: 'premium_offer',
    label: 'Premium Teklif',
    icon: <Gift className="w-5 h-5" />,
    color: 'from-amber-500 to-yellow-500',
    defaultTitle: '🌟 Özel Teklif!',
    defaultMessage: 'Premium üyelere özel indirim! Bu fırsatı kaçırmayın.',
    defaultUrl: '/memberships',
  },
  {
    id: 'inactive_reminder',
    label: 'Pasif Kullanıcı Hatırlatma',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500',
    defaultTitle: '💫 Sizi Özledik!',
    defaultMessage: 'Uzun zamandır görünmüyorsunuz. Yeni fallar ve özellikler sizi bekliyor!',
    defaultUrl: '/',
  },
]

const TARGET_TYPES = [
  { value: 'all', label: 'Tüm Kullanıcılar', icon: <Globe className="w-4 h-4" /> },
  { value: 'segment', label: 'Segmente Göre', icon: <Users className="w-4 h-4" /> },
  { value: 'tag', label: 'Etikete Göre', icon: <Tag className="w-4 h-4" /> },
  { value: 'player_id', label: 'Belirli Kullanıcı', icon: <User className="w-4 h-4" /> },
]

export default function AdminNotificationsPage() {
  const { data: session, status: sessionStatus } = useSession() || {}
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'quick'>('send')

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [targetType, setTargetType] = useState('all')
  const [targetValue, setTargetValue] = useState('')
  const [sendNow, setSendNow] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // History
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
  }, [sessionStatus, router])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const res = await fetch('/api/admin/notifications?action=stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error('Stats fetch error:', e)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // Fetch history
  const fetchHistory = useCallback(async (page: number) => {
    try {
      setLoadingHistory(true)
      const res = await fetch(`/api/admin/notifications?page=${page}&limit=15`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalPages(data.totalPages || 1)
        setHistoryPage(page)
      }
    } catch (e) {
      console.error('History fetch error:', e)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchStats()
      fetchHistory(1)
    }
  }, [sessionStatus, fetchStats, fetchHistory])

  // Send notification
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setSendResult({ success: false, message: 'Başlık ve mesaj zorunludur' })
      return
    }
    if (targetType !== 'all' && !targetValue.trim()) {
      setSendResult({ success: false, message: 'Hedef değeri giriniz' })
      return
    }

    setSending(true)
    setSendResult(null)

    try {
      let scheduledAt: string | undefined
      if (!sendNow && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          url: url.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          targetType,
          targetValue: targetType !== 'all' ? targetValue.trim() : undefined,
          scheduledAt,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSendResult({
          success: true,
          message: scheduledAt
            ? `✅ Bildirim planlandı! (${data.log?.recipientCount || 0} alıcı)`
            : `✅ Bildirim gönderildi! (${data.log?.recipientCount || 0} alıcı)`,
        })
        // Reset form
        setTitle('')
        setMessage('')
        setUrl('')
        setImageUrl('')
        setTargetType('all')
        setTargetValue('')
        setSendNow(true)
        setScheduledDate('')
        setScheduledTime('')
        // Refresh stats & history
        fetchStats()
        fetchHistory(1)
      } else {
        setSendResult({ success: false, message: data.error || 'Bildirim gönderilemedi' })
      }
    } catch (e) {
      setSendResult({ success: false, message: 'Bağlantı hatası' })
    } finally {
      setSending(false)
    }
  }

  // Quick action
  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    setTitle(action.defaultTitle)
    setMessage(action.defaultMessage)
    setUrl(action.defaultUrl)
    setTargetType('all')
    setTargetValue('')
    setSendNow(true)
    setActiveTab('send')
  }

  // Duplicate a notification
  const handleDuplicate = (log: NotificationLog) => {
    setTitle(log.title)
    setMessage(log.message)
    setUrl(log.url || '')
    setImageUrl(log.imageUrl || '')
    setTargetType(log.targetType as any)
    setTargetValue(log.targetValue || '')
    setSendNow(true)
    setActiveTab('send')
  }

  // Refresh OneSignal stats for a log
  const handleRefreshLog = async (id: string) => {
    setRefreshingId(id)
    try {
      const res = await fetch(`/api/admin/notifications?action=refresh&id=${id}`)
      if (res.ok) {
        const updated = await res.json()
        setLogs(prev => prev.map(l => l.id === id ? { ...l, deliveredCount: updated.deliveredCount, clickedCount: updated.clickedCount } : l))
      }
    } catch (e) {
      console.error('Refresh error:', e)
    } finally {
      setRefreshingId(null)
    }
  }

  // Cancel scheduled
  const handleCancel = async (id: string) => {
    if (!confirm('Bu planlanmış bildirimi iptal etmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLogs(prev => prev.map(l => l.id === id ? { ...l, status: 'cancelled' } : l))
        fetchStats()
      }
    } catch (e) {
      console.error('Cancel error:', e)
    }
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    sent: 'bg-green-500/20 text-green-400',
    scheduled: 'bg-blue-500/20 text-blue-400',
    failed: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-gray-500/20 text-gray-400',
  }

  const statusLabels: Record<string, string> = {
    sent: 'Gönderildi',
    scheduled: 'Planlandı',
    failed: 'Başarısız',
    cancelled: 'İptal Edildi',
  }

  const targetLabels: Record<string, string> = {
    all: 'Tüm Kullanıcılar',
    segment: 'Segment',
    tag: 'Etiket',
    player_id: 'Kullanıcı ID',
    quick_action: 'Hızlı Aksiyon',
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0118]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Bell className="w-6 h-6 text-purple-400" />
                Push Bildirim Yönetimi
              </h1>
              <p className="text-sm text-white/50">OneSignal entegrasyonu ile bildirim gönder ve yönet</p>
            </div>
          </div>
          <button
            onClick={() => { fetchStats(); fetchHistory(historyPage) }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            title="Yenile"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Toplam Abone',
              value: loadingStats ? '...' : (stats?.subscribers?.toLocaleString('tr-TR') || '0'),
              icon: <Users className="w-5 h-5" />,
              color: 'from-blue-500 to-cyan-500',
            },
            {
              label: 'Gönderilen',
              value: loadingStats ? '...' : (stats?.totalSent?.toLocaleString('tr-TR') || '0'),
              icon: <Send className="w-5 h-5" />,
              color: 'from-purple-500 to-violet-500',
            },
            {
              label: 'Teslim Edilen',
              value: loadingStats ? '...' : (stats?.totalDelivered?.toLocaleString('tr-TR') || '0'),
              icon: <CheckCircle className="w-5 h-5" />,
              color: 'from-green-500 to-emerald-500',
            },
            {
              label: 'Tıklama Oranı',
              value: loadingStats ? '...' : `%${stats?.ctr || '0'}`,
              icon: <MousePointerClick className="w-5 h-5" />,
              color: 'from-amber-500 to-orange-500',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 rounded-xl border border-white/10 p-4"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-white/50">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/5 rounded-xl p-1">
          {[
            { key: 'send', label: 'Bildirim Gönder', icon: <Send className="w-4 h-4" /> },
            { key: 'quick', label: 'Hızlı Aksiyonlar', icon: <Zap className="w-4 h-4" /> },
            { key: 'history', label: 'Geçmiş', icon: <Clock className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Send Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'send' && (
            <motion.div
              key="send"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Send Result */}
              {sendResult && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  sendResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {sendResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                  <span>{sendResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Send className="w-4 h-4 text-purple-400" />
                      Bildirim İçeriği
                    </h3>

                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Başlık *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Bildirim başlığı..."
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Mesaj *</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Bildirim mesajı..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none resize-none"
                        maxLength={500}
                      />
                      <p className="text-xs text-white/30 mt-1">{message.length}/500</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-white/60 mb-1 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Yönlendirme URL
                        </label>
                        <input
                          type="text"
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="/dashboard veya https://..."
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-white/60 mb-1 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Görsel URL (opsiyonel)
                        </label>
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={e => setImageUrl(e.target.value)}
                          placeholder="https://... .jpg/.png"
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Targeting */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      Hedefleme
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TARGET_TYPES.map(tt => (
                        <button
                          key={tt.value}
                          onClick={() => { setTargetType(tt.value); setTargetValue('') }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition border ${
                            targetType === tt.value
                              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {tt.icon}
                          <span className="truncate">{tt.label}</span>
                        </button>
                      ))}
                    </div>

                    {targetType !== 'all' && (
                      <div>
                        <label className="text-sm text-white/60 mb-1 block">
                          {targetType === 'segment' && 'Segment adı (ör: Active Users, Inactive Users)'}
                          {targetType === 'tag' && 'Etiket filtresi (ör: membership=gold veya premium)'}
                          {targetType === 'player_id' && 'Kullanıcı ID (virgülle ayırarak birden fazla)'}
                        </label>
                        <input
                          type="text"
                          value={targetValue}
                          onChange={e => setTargetValue(e.target.value)}
                          placeholder={
                            targetType === 'segment' ? 'Active Users' :
                            targetType === 'tag' ? 'membership=gold' :
                            'user_id_1, user_id_2'
                          }
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Scheduling */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      Zamanlama
                    </h3>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setSendNow(true)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
                          sendNow
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        Hemen Gönder
                      </button>
                      <button
                        onClick={() => setSendNow(false)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
                          !sendNow
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        İleri Tarihe Planla
                      </button>
                    </div>

                    {!sendNow && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-white/60 mb-1 block">Tarih</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={e => setScheduledDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-white/60 mb-1 block">Saat</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview & Send */}
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4 sticky top-24">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                      Önizleme
                    </h3>

                    {/* Preview card mimicking a push notification */}
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {title || 'Bildirim Başlığı'}
                          </p>
                          <p className="text-xs text-white/60 mt-1 line-clamp-3">
                            {message || 'Bildirim mesajı burada görünecek...'}
                          </p>
                        </div>
                      </div>
                      {imageUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden bg-white/5 aspect-[2/1]">
                          <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                        <span>canlifal.com</span>
                        <span>•</span>
                        <span>Şimdi</span>
                      </div>
                    </div>

                    {/* Target summary */}
                    <div className="text-sm text-white/50 space-y-1">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        <span>{TARGET_TYPES.find(t => t.value === targetType)?.label || 'Tümü'}</span>
                        {targetValue && <span className="text-purple-400">({targetValue})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{sendNow ? 'Hemen gönderilecek' : `${scheduledDate} ${scheduledTime}`}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={sending || !title.trim() || !message.trim()}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {sending ? 'Gönderiliyor...' : sendNow ? 'Bildirimi Gönder' : 'Bildirimi Planla'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions Tab */}
          {activeTab === 'quick' && (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-sm text-white/50">
                Fal platformuna özel hazır bildirim şablonları. Tıklayın, düzenleyin ve gönderin.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUICK_ACTIONS.map(action => (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickAction(action)}
                    className="bg-white/5 rounded-xl border border-white/10 p-5 text-left hover:bg-white/10 transition group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1">{action.label}</h4>
                        <p className="text-sm text-white/50 font-medium">{action.defaultTitle}</p>
                        <p className="text-xs text-white/40 mt-1 line-clamp-2">{action.defaultMessage}</p>
                      </div>
                      <Send className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition flex-shrink-0 mt-1" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {loadingHistory ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-white/40">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Henüz bildirim gönderilmemiş</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {logs.map(log => {
                      const ctr = log.deliveredCount > 0 ? ((log.clickedCount / log.deliveredCount) * 100).toFixed(1) : '0'
                      return (
                        <div
                          key={log.id}
                          className="bg-white/5 rounded-xl border border-white/10 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-sm truncate">{log.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[log.status] || 'bg-white/10 text-white/60'}`}>
                                  {statusLabels[log.status] || log.status}
                                </span>
                              </div>
                              <p className="text-xs text-white/50 line-clamp-2 mb-2">{log.message}</p>
                              <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {targetLabels[log.targetType] || log.targetType}
                                  {log.targetValue && <span className="text-purple-400">({log.targetValue})</span>}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {log.recipientCount} alıcı
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {log.deliveredCount} teslim
                                </span>
                                <span className="flex items-center gap-1">
                                  <MousePointerClick className="w-3 h-3" />
                                  {log.clickedCount} tıklama (%{ctr})
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(log.createdAt).toLocaleString('tr-TR')}
                                </span>
                              </div>
                              {log.errorMessage && (
                                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {log.errorMessage}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {log.onesignalId && log.status === 'sent' && (
                                <button
                                  onClick={() => handleRefreshLog(log.id)}
                                  disabled={refreshingId === log.id}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                                  title="İstatistikleri güncelle"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === log.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDuplicate(log)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                                title="Kopyala"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {log.status === 'scheduled' && (
                                <button
                                  onClick={() => handleCancel(log.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                  title="İptal et"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                      <button
                        onClick={() => fetchHistory(historyPage - 1)}
                        disabled={historyPage <= 1}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-white/50">
                        {historyPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => fetchHistory(historyPage + 1)}
                        disabled={historyPage >= totalPages}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
