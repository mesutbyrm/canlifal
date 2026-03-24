'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, Search, Check, X, Clock, Coins, CreditCard, 
  User, ChevronDown, AlertCircle, Plus, TrendingUp,
  DollarSign, Users
} from 'lucide-react'

interface PaymentNotification {
  id: string
  userId: string
  username: string
  paymentMethod: string
  amount: number
  transactionId: string | null
  senderName: string | null
  notes: string | null
  status: string
  jetonLoaded: number | null
  processedBy: string | null
  processedAt: string | null
  createdAt: string
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  totalJetonLoaded: number
  totalAmountReceived: number
}

interface UserSearchResult {
  id: string
  name: string
  username: string | null
  email: string
  jetonBalance: number
}

export default function AdminCreditsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Process modal
  const [processModal, setProcessModal] = useState<PaymentNotification | null>(null)
  const [jetonAmount, setJetonAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Manual load modal
  const [showManualLoad, setShowManualLoad] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [manualJetonAmount, setManualJetonAmount] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      router.push(`/giris`)
      return
    }
    fetchNotifications()
  }, [session, status, statusFilter])

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/admin/payments?status=${statusFilter}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([])
      return
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.users || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  const handleProcess = async (action: 'approve' | 'reject') => {
    if (!processModal) return
    if (action === 'approve' && (!jetonAmount || parseInt(jetonAmount) < 1)) {
      alert('Lütfen geçerli bir jeton miktarı girin')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: processModal.id,
          action,
          jetonAmount: action === 'approve' ? parseInt(jetonAmount) : undefined
        })
      })

      if (res.ok) {
        setProcessModal(null)
        setJetonAmount('')
        fetchNotifications()
      } else {
        const data = await res.json()
        alert(data.error || 'Bir hata oluştu')
      }
    } catch (err) {
      console.error('Process error:', err)
      alert('Bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  // Direct reject without opening modal
  const handleReject = async (notif: PaymentNotification) => {
    if (!confirm('Bu ödeme bildirimini reddetmek istediğinize emin misiniz?')) return
    
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notif.id,
          action: 'reject'
        })
      })

      if (res.ok) {
        fetchNotifications()
      } else {
        const data = await res.json()
        alert(data.error || 'Bir hata oluştu')
      }
    } catch (err) {
      console.error('Reject error:', err)
      alert('Bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  const handleManualLoad = async () => {
    if (!selectedUser || !manualJetonAmount || parseInt(manualJetonAmount) < 1) {
      alert('Lütfen kullanıcı seçin ve geçerli bir miktar girin')
      return
    }

    setManualLoading(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          jetonAmount: parseInt(manualJetonAmount),
          reason: manualReason
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message)
        setShowManualLoad(false)
        setSelectedUser(null)
        setManualJetonAmount('')
        setManualReason('')
        setUserSearch('')
        fetchNotifications()
      } else {
        const data = await res.json()
        alert(data.error || 'Bir hata oluştu')
      }
    } catch (err) {
      console.error('Manual load error:', err)
      alert('Bir hata oluştu')
    } finally {
      setManualLoading(false)
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'papara': 'Papara',
      'bank_transfer': 'Banka Havalesi',
      'credit_card': 'Kredi Kartı'
    }
    return labels[method] || method
  }

  // Calculate jeton amount based on payment amount
  const calculateJetonAmount = (amount: number): number => {
    // Jeton paketleri - fiyat ve jeton miktarları
    const packages = [
      { minAmount: 2250, jetons: 5000 },
      { minAmount: 950, jetons: 2000 },
      { minAmount: 500, jetons: 1000 },
      { minAmount: 250, jetons: 500 },
      { minAmount: 100, jetons: 200 },
    ]
    
    // En uygun paketi bul
    for (const pkg of packages) {
      if (amount >= pkg.minAmount) {
        return pkg.jetons
      }
    }
    
    // 100 TL altı için orantılı hesapla (1 TL = 2 jeton)
    return Math.floor(amount * 2)
  }

  // Get jeton package info for display
  const getJetonPackageInfo = (amount: number): string => {
    if (amount >= 2250) return '2.250₺+ → 5.000 Jeton'
    if (amount >= 950) return '950₺+ → 2.000 Jeton'
    if (amount >= 500) return '500₺+ → 1.000 Jeton'
    if (amount >= 250) return '250₺+ → 500 Jeton'
    if (amount >= 100) return '100₺+ → 200 Jeton'
    return `${amount}₺ → ${Math.floor(amount * 2)} Jeton (orantılı)`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Bekliyor</span>
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Onaylandı</span>
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> Reddedildi</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">{status}</span>
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-fuchsia-400 flex items-center gap-3">
              <Coins className="w-8 h-8" />
              Jeton Yükleme Yönetimi
            </h1>
            <p className="text-purple-300 mt-1">Ödeme bildirimleri ve jeton yüklemeleri</p>
          </div>
          <button
            onClick={() => setShowManualLoad(true)}
            className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Manuel Jeton Yükle
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Bekleyen</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Check className="w-5 h-5" />
                <span className="text-sm">Onaylı</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <X className="w-5 h-5" />
                <span className="text-sm">Reddedilen</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            </div>
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-fuchsia-400 mb-2">
                <Coins className="w-5 h-5" />
                <span className="text-sm">Yüklenen Jeton</span>
              </div>
              <p className="text-2xl font-bold text-fuchsia-400">{stats.totalJetonLoaded.toLocaleString()}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Toplam Gelir</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.totalAmountReceived.toLocaleString()} ₺</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s 
                  ? 'bg-fuchsia-600 text-white' 
                  : 'bg-fuchsia-900/30 text-fuchsia-300 hover:bg-fuchsia-900/50'
              }`}
            >
              {s === 'all' ? 'Tümü' : s === 'pending' ? 'Bekleyen' : s === 'approved' ? 'Onaylı' : 'Reddedilen'}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-purple-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Ödeme bildirimi bulunamadı</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-xl p-4 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-fuchsia-600/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-fuchsia-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{notif.username}</p>
                        <p className="text-xs text-purple-400">{new Date(notif.createdAt).toLocaleString('tr-TR')}</p>
                      </div>
                      {getStatusBadge(notif.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-purple-400 mb-1">Ödeme Yöntemi</p>
                        <p className="text-white font-medium">{getPaymentMethodLabel(notif.paymentMethod)}</p>
                      </div>
                      <div>
                        <p className="text-purple-400 mb-1">Tutar</p>
                        <p className="text-white font-medium">{notif.amount} ₺</p>
                      </div>
                      {notif.transactionId && (
                        <div>
                          <p className="text-purple-400 mb-1">İşlem No</p>
                          <p className="text-white font-medium">{notif.transactionId}</p>
                        </div>
                      )}
                      {notif.senderName && (
                        <div>
                          <p className="text-purple-400 mb-1">Gönderen Adı</p>
                          <p className="text-white font-medium">{notif.senderName}</p>
                        </div>
                      )}
                    </div>
                    
                    {notif.notes && (
                      <div className="mt-3">
                        <p className="text-purple-400 text-sm mb-1">Not</p>
                        <p className="text-white text-sm bg-purple-900/30 rounded-lg p-2">{notif.notes}</p>
                      </div>
                    )}
                    
                    {notif.status === 'approved' && notif.jetonLoaded && (
                      <div className="mt-3 flex items-center gap-2 text-green-400">
                        <Coins className="w-4 h-4" />
                        <span className="text-sm">{notif.jetonLoaded} jeton yüklendi - {notif.processedBy}</span>
                      </div>
                    )}
                  </div>
                  
                  {notif.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      {/* Show package info */}
                      <div className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                        📦 {getJetonPackageInfo(notif.amount)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setProcessModal(notif); setJetonAmount(String(calculateJetonAmount(notif.amount))); }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Onayla
                        </button>
                        <button
                          onClick={() => handleReject(notif)}
                          disabled={processing}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reddet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Process Modal */}
      <AnimatePresence>
        {processModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setProcessModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-fuchsia-400 mb-4">Ödemeyi Onayla</h3>
              
              <div className="space-y-4">
                <div className="bg-fuchsia-900/30 rounded-lg p-4">
                  <p className="text-purple-300 text-sm">Kullanıcı: <span className="text-white font-medium">{processModal.username}</span></p>
                  <p className="text-purple-300 text-sm">Tutar: <span className="text-white font-medium">{processModal.amount} ₺</span></p>
                  <p className="text-purple-300 text-sm">Yöntem: <span className="text-white font-medium">{getPaymentMethodLabel(processModal.paymentMethod)}</span></p>
                </div>
                
                {/* Jeton Paketleri Bilgisi */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm font-medium mb-2">📦 Jeton Paketleri:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-yellow-300">
                    <span>100₺ → 200 Jeton</span>
                    <span>250₺ → 500 Jeton</span>
                    <span>500₺ → 1.000 Jeton</span>
                    <span>950₺ → 2.000 Jeton</span>
                    <span className="col-span-2">2.250₺ → 5.000 Jeton</span>
                  </div>
                  <p className="text-green-400 text-sm mt-2 font-medium">
                    ✓ Önerilen: {calculateJetonAmount(processModal.amount).toLocaleString()} Jeton
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-purple-300 mb-2">Yüklenecek Jeton Miktarı</label>
                  <input
                    type="number"
                    value={jetonAmount}
                    onChange={(e) => setJetonAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500 text-lg font-bold"
                    placeholder="Jeton miktarı"
                  />
                  <p className="text-xs text-purple-400 mt-1">İsterseniz farklı bir miktar girebilirsiniz</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setProcessModal(null)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => handleProcess('approve')}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Onayla & Yükle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Load Modal */}
      <AnimatePresence>
        {showManualLoad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowManualLoad(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-fuchsia-400 mb-4 flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Manuel Jeton Yükle
              </h3>
              
              <div className="space-y-4">
                {/* User Search */}
                <div>
                  <label className="block text-sm text-purple-300 mb-2">Kullanıcı Ara</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                      placeholder="Kullanıcı adı veya email"
                    />
                  </div>
                  
                  {searchResults.length > 0 && !selectedUser && (
                    <div className="mt-2 bg-fuchsia-900/50 border border-fuchsia-500/30 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => { setSelectedUser(user); setUserSearch(''); setSearchResults([]); }}
                          className="w-full px-4 py-3 hover:bg-fuchsia-800/50 flex items-center gap-3 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-fuchsia-600/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-fuchsia-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.username || user.name}</p>
                            <p className="text-xs text-purple-400">{user.email} • {user.jetonBalance} jeton</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected User */}
                {selectedUser && (
                  <div className="bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-fuchsia-600/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-fuchsia-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{selectedUser.username || selectedUser.name}</p>
                        <p className="text-xs text-purple-400">Mevcut: {selectedUser.jetonBalance} jeton</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 hover:bg-fuchsia-800/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-purple-400" />
                    </button>
                  </div>
                )}
                
                {/* Jeton Amount */}
                <div>
                  <label className="block text-sm text-purple-300 mb-2">Jeton Miktarı</label>
                  <input
                    type="number"
                    value={manualJetonAmount}
                    onChange={(e) => setManualJetonAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                    placeholder="Yüklenecek jeton"
                  />
                </div>
                
                {/* Reason */}
                <div>
                  <label className="block text-sm text-purple-300 mb-2">Açıklama (Opsiyonel)</label>
                  <textarea
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500 resize-none"
                    placeholder="Yükleme sebebi..."
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowManualLoad(false); setSelectedUser(null); setManualJetonAmount(''); setManualReason(''); }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleManualLoad}
                    disabled={manualLoading || !selectedUser || !manualJetonAmount}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  >
                    {manualLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
                    Jeton Yükle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
