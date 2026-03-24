'use client'

import AdminBackButton from '@/components/admin-back-button'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Clock, Users, BarChart3, ArrowLeft, Loader2,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2,
  Target, Tag, User, Globe, Calendar, Image as ImageIcon,
  Link as LinkIcon, Sparkles, Zap, Eye, ChevronLeft, ChevronRight,
  Copy, Radio, Gift, Star, TrendingUp, MousePointerClick,
  Upload, X, ChevronDown, Search
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
    defaultUrl: '/canli-falcilar',
  },
  {
    id: 'fortune_ready',
    label: 'Falınız Hazır',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-purple-500 to-violet-500',
    defaultTitle: '✨ Falınız Hazır!',
    defaultMessage: 'Fal yorumunuz tamamlandı. Hemen gelin ve detaylı yorumunuzu okuyun!',
    defaultUrl: '/panel',
  },
  {
    id: 'premium_offer',
    label: 'Premium Teklif',
    icon: <Gift className="w-5 h-5" />,
    color: 'from-amber-500 to-yellow-500',
    defaultTitle: '🌟 Özel Teklif!',
    defaultMessage: 'Premium üyelere özel indirim! Bu fırsatı kaçırmayın.',
    defaultUrl: '/uyelik',
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
  {
    id: 'daily_horoscope',
    label: 'Günlük Burç Yorumu',
    icon: <Star className="w-5 h-5" />,
    color: 'from-indigo-500 to-blue-500',
    defaultTitle: '⭐ Günlük Burç Yorumunuz Hazır!',
    defaultMessage: 'Bugün yıldızlar sizin için ne söylüyor? Günlük burç yorumunuzu okuyun.',
    defaultUrl: '/fallar',
  },
  {
    id: 'new_teller',
    label: 'Yeni Falcı Duyurusu',
    icon: <User className="w-5 h-5" />,
    color: 'from-teal-500 to-cyan-500',
    defaultTitle: '🌙 Yeni Falcımız Aramıza Katıldı!',
    defaultMessage: 'Deneyimli falcımız artık platformda. Hemen profilini incele ve randevu al!',
    defaultUrl: '/canli-falcilar',
  },
  {
    id: 'credit_bonus',
    label: 'Jeton Bonusu',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'from-yellow-500 to-orange-500',
    defaultTitle: '🪙 Bonus Jeton Fırsatı!',
    defaultMessage: 'Bugüne özel jeton yükleme kampanyası! %50 bonus jeton kazanma şansı.',
    defaultUrl: '/uyelik',
  },
  {
    id: 'weekend_event',
    label: 'Hafta Sonu Etkinliği',
    icon: <Calendar className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-500',
    defaultTitle: '🎉 Hafta Sonu Özel Etkinlik!',
    defaultMessage: 'Bu hafta sonu canlı yayınlarda özel fal etkinliği! Kaçırmayın.',
    defaultUrl: '/canli-falcilar',
  },
  {
    id: 'social_engagement',
    label: 'Sosyal Paylaşım Teşvik',
    icon: <Users className="w-5 h-5" />,
    color: 'from-violet-500 to-fuchsia-500',
    defaultTitle: '💬 Topluluğa Katılın!',
    defaultMessage: 'Fal deneyimlerinizi paylaşın, diğer üyelerle etkileşime geçin!',
    defaultUrl: '/sosyal',
  },
  {
    id: 'maintenance',
    label: 'Bakım Bildirimi',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'from-gray-500 to-slate-500',
    defaultTitle: '🔧 Planlı Bakım Bildirimi',
    defaultMessage: 'Kısa süreli bakım çalışması yapılacaktır. Anlayışınız için teşekkürler.',
    defaultUrl: '/',
  },
]

const TARGET_TYPES = [
  { value: 'all', label: 'Tüm Kullanıcılar', icon: <Globe className="w-4 h-4" /> },
  { value: 'segment', label: 'Segmente Göre', icon: <Users className="w-4 h-4" /> },
  { value: 'tag', label: 'Etikete Göre', icon: <Tag className="w-4 h-4" /> },
  { value: 'player_id', label: 'Belirli Kullanıcı', icon: <User className="w-4 h-4" /> },
]

const URL_OPTIONS = [
  { value: '', label: 'URL seçiniz (opsiyonel)' },
  { value: '/', label: 'Ana Sayfa — /' },
  { value: '/panel', label: 'Panel — /panel' },
  { value: '/fallar', label: 'Fallar — /fallar' },
  { value: '/canli-falcilar', label: 'Canlı Falcılar — /canli-falcilar' },
  { value: '/sosyal', label: 'Sosyal — /sosyal' },
  { value: '/uyelik', label: 'Üyelik — /uyelik' },
  { value: '/oyunlar', label: 'Oyunlar — /oyunlar' },
  { value: '/siralama', label: 'Sıralama — /siralama' },
  { value: '/mesajlar', label: 'Mesajlar — /mesajlar' },
  { value: '/profil', label: 'Profil — /profil' },
]

const TAG_OPTIONS = [
  { value: '', label: 'Etiket seçiniz...' },
  { value: 'membership=premium', label: 'Premium Üyeler' },
  { value: 'membership=gold', label: 'Gold Üyeler' },
  { value: 'membership=basic', label: 'Basic Üyeler' },
  { value: 'role=fortune_teller', label: 'Falcılar' },
  { value: 'role=admin', label: 'Adminler' },
  { value: 'has_credits=true', label: 'CFC\'si Olanlar' },
  { value: 'has_credits=false', label: 'CFC\'si Olmayanlar' },
  { value: 'active_last_7d=true', label: 'Son 7 Gün Aktif' },
  { value: 'active_last_30d=true', label: 'Son 30 Gün Aktif' },
  { value: 'inactive_7d=true', label: '7+ Gündür Pasif' },
  { value: 'inactive_30d=true', label: '30+ Gündür Pasif' },
]

interface SearchUser {
  id: string
  name: string
  username: string | null
  email: string
  image: string | null
  role: string
}

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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('upload')

  // User search for autocomplete
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<SearchUser[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [urlCustomMode, setUrlCustomMode] = useState(false)

  // History
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/giris')
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

  // Handle image upload
  // User search for autocomplete
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setUserSearchResults([])
      return
    }
    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setUserSearchResults(data.users || [])
      }
    } catch (err) {
      console.error('User search error:', err)
    } finally {
      setSearchingUsers(false)
    }
  }, [])

  // Debounced user search
  useEffect(() => {
    if (targetType !== 'player_id') return
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearchQuery, targetType, searchUsers])

  // Update targetValue when selectedUsers changes
  useEffect(() => {
    if (targetType === 'player_id') {
      setTargetValue(selectedUsers.map(u => u.id).join(', '))
    }
  }, [selectedUsers, targetType])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setSendResult({ success: false, message: 'Sadece görsel dosyalar yüklenebilir' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSendResult({ success: false, message: 'Görsel 5MB\'dan küçük olmalıdır' })
      return
    }

    setUploadingImage(true)
    try {
      // Get presigned URL
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true,
        }),
      })

      if (!presignRes.ok) throw new Error('Yükleme URL\'si alınamadı')

      const { uploadUrl, cloud_storage_path } = await presignRes.json()

      // Check if signed headers require Content-Disposition
      const urlObj = new URL(uploadUrl)
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || ''
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment'
      }

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      })

      if (!uploadRes.ok) throw new Error('Görsel yüklenemedi')

      // Get the public URL
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true }),
      })
      if (!urlRes.ok) throw new Error('Görsel URL\'si alınamadı')

      const { url: publicUrl } = await urlRes.json()
      setImageUrl(publicUrl)
    } catch (err: any) {
      setSendResult({ success: false, message: err.message || 'Görsel yükleme hatası' })
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

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
            <AdminBackButton className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" />
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

                    {/* Redirect URL */}
                    <div>
                      <label className="text-sm text-white/60 mb-1 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Yönlendirme URL (opsiyonel)
                      </label>
                      {urlCustomMode ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="/ozel-sayfa veya https://..."
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => { setUrlCustomMode(false); setUrl('') }}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition text-xs"
                          >
                            Liste
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <select
                              value={url}
                              onChange={e => setUrl(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
                            >
                              {URL_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setUrlCustomMode(true)}
                            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition text-xs whitespace-nowrap"
                          >
                            Özel URL
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-white/30 mt-1">Bildirime tıklanınca açılacak sayfa</p>
                    </div>

                    {/* Image Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-white/60 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Görsel (opsiyonel)
                        </label>
                        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => setImageMode('upload')}
                            className={`px-2.5 py-1 rounded-md text-xs transition ${
                              imageMode === 'upload'
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                          >
                            Yükle
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageMode('url')}
                            className={`px-2.5 py-1 rounded-md text-xs transition ${
                              imageMode === 'url'
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                          >
                            URL
                          </button>
                        </div>
                      </div>

                      {imageMode === 'url' ? (
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={e => setImageUrl(e.target.value)}
                          placeholder="https://... .jpg/.png"
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      ) : (
                        <div className="space-y-2">
                          {!imageUrl ? (
                            <label className={`flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed transition cursor-pointer ${
                              uploadingImage
                                ? 'border-purple-500/40 bg-purple-500/5'
                                : 'border-white/20 bg-white/5 hover:border-purple-500/40 hover:bg-purple-500/5'
                            }`}>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                              />
                              {uploadingImage ? (
                                <>
                                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-1" />
                                  <span className="text-xs text-purple-400">Yükleniyor...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-white/40 mb-1" />
                                  <span className="text-xs text-white/40">Görsel yüklemek için tıklayın</span>
                                  <span className="text-xs text-white/25 mt-0.5">JPG, PNG — Maks 5MB</span>
                                </>
                              )}
                            </label>
                          ) : (
                            <div className="relative rounded-lg overflow-hidden bg-white/5 border border-white/10">
                              <div className="relative aspect-[2/1]">
                                <img
                                  src={imageUrl}
                                  alt="Bildirim görseli"
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setImageUrl('')}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-500/80 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
                          onClick={() => { setTargetType(tt.value); setTargetValue(''); setSelectedUsers([]); setUserSearchQuery(''); setShowUserDropdown(false) }}
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

                    {targetType === 'segment' && (
                      <div>
                        <label className="text-sm text-white/60 mb-1 block">
                          Segment adı (ör: Active Users, Inactive Users)
                        </label>
                        <input
                          type="text"
                          value={targetValue}
                          onChange={e => setTargetValue(e.target.value)}
                          placeholder="Active Users"
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {targetType === 'tag' && (
                      <div>
                        <label className="text-sm text-white/60 mb-1 block">Etiket filtresi</label>
                        <div className="relative">
                          <select
                            value={targetValue}
                            onChange={e => setTargetValue(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
                          >
                            {TAG_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {targetType === 'player_id' && (
                      <div>
                        <label className="text-sm text-white/60 mb-1 block">Kullanıcı Ara</label>
                        {/* Selected users chips */}
                        {selectedUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedUsers.map(u => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs"
                              >
                                {u.image ? (
                                  <img loading="lazy" src={u.image} alt="" className="w-4 h-4 rounded-full" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                <span className="max-w-[120px] truncate">{u.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedUsers(prev => prev.filter(su => su.id !== u.id))}
                                  className="hover:text-red-400 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Search input */}
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                              type="text"
                              value={userSearchQuery}
                              onChange={e => {
                                setUserSearchQuery(e.target.value)
                                setShowUserDropdown(true)
                              }}
                              onFocus={() => setShowUserDropdown(true)}
                              placeholder="İsim, kullanıcı adı veya e-posta yazın..."
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none"
                            />
                            {searchingUsers && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
                            )}
                          </div>
                          {/* Dropdown results */}
                          {showUserDropdown && userSearchQuery.length >= 1 && (
                            <div className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                              {userSearchResults.length === 0 && !searchingUsers ? (
                                <div className="px-4 py-3 text-sm text-white/40">Kullanıcı bulunamadı</div>
                              ) : (
                                userSearchResults.map(user => {
                                  const isSelected = selectedUsers.some(su => su.id === user.id)
                                  return (
                                    <button
                                      key={user.id}
                                      type="button"
                                      disabled={isSelected}
                                      onClick={() => {
                                        if (!isSelected) {
                                          setSelectedUsers(prev => [...prev, user])
                                          setUserSearchQuery('')
                                          setShowUserDropdown(false)
                                          setUserSearchResults([])
                                        }
                                      }}
                                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                                        isSelected
                                          ? 'opacity-40 cursor-not-allowed bg-white/5'
                                          : 'hover:bg-white/10 cursor-pointer'
                                      }`}
                                    >
                                      {user.image ? (
                                        <img loading="lazy" src={user.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                          <User className="w-4 h-4 text-purple-400" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-white">{user.name}</p>
                                        <p className="text-xs text-white/40 truncate">
                                          {user.username ? `@${user.username}` : user.email}
                                          {user.role !== 'user' && (
                                            <span className="ml-1 text-purple-400">• {user.role}</span>
                                          )}
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                      )}
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-white/30 mt-1">
                          {selectedUsers.length > 0
                            ? `${selectedUsers.length} kullanıcı seçildi`
                            : 'Kullanıcı aramak için yazmaya başlayın'
                          }
                        </p>
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
                          <img loading="lazy" src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      )}
                      {url && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-purple-400/70">
                          <LinkIcon className="w-3 h-3" />
                          <span className="truncate">{url}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
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
                              <p className="text-xs text-white/50 line-clamp-2 mb-1">{log.message}</p>
                              {log.url && (
                                <p className="text-xs text-purple-400/60 mb-1 flex items-center gap-1 truncate">
                                  <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                  {log.url}
                                </p>
                              )}
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
