'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, BookOpen, Search, ChevronDown, RefreshCw, Filter } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  balance_adjust: 'Bakiye Düzenleme',
  withdrawal_approve: 'Çekim Onayı',
  withdrawal_reject: 'Çekim Reddi',
  withdrawal_complete: 'Çekim Tamamlama',
  feature_toggle: 'Feature Flag Güncelleme',
  feature_delete: 'Feature Flag Silme',
  user_ban: 'Kullanıcı Banlama',
  config_change: 'Yapılandırma Değişikliği',
}

const CATEGORY_LABELS: Record<string, string> = {
  gift_send: 'Hediye Gönderme',
  gift_receive: 'Hediye Alma',
  withdrawal: 'Para Çekme',
  purchase: 'Satın Alma',
  fortune_session: 'Fal Oturumu',
  daily_bonus: 'Günlük Bonus',
  commission: 'Komisyon',
  admin_adjust: 'Admin Düzenleme',
  refund: 'İade',
  game: 'Oyun',
  room_create: 'Oda Oluşturma',
  song_request: 'Şarkı İsteği',
  tip: 'Bahşiş',
  membership: 'Üyelik',
}

interface AuditEntry {
  id: string
  actorId: string
  actorRole: string | null
  actorIp: string | null
  action: string
  targetType: string | null
  targetId: string | null
  before: any
  after: any
  description: string | null
  metadata: any
  createdAt: string
}

interface LedgerEntry {
  id: string
  transactionId: string
  accountType: string
  accountId: string
  direction: string
  amount: number
  currency: string
  balanceBefore: number
  balanceAfter: number
  category: string
  description: string | null
  referenceType: string | null
  referenceId: string | null
  metadata: any
  actorId: string | null
  createdAt: string
}

export default function AuditPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'audit' | 'ledger'>('audit')

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditCursor, setAuditCursor] = useState<string | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilter, setAuditFilter] = useState('')

  // Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [ledgerCursor, setLedgerCursor] = useState<string | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [ledgerCategory, setLedgerCategory] = useState('')
  const [ledgerTotal, setLedgerTotal] = useState(0)

  const role = (session?.user as any)?.role
  const isAdmin = role === 'admin' || role === 'yonetici'

  // Fetch audit logs
  const fetchAudit = useCallback(async (reset = false) => {
    setAuditLoading(true)
    try {
      const params = new URLSearchParams()
      if (auditFilter) params.set('action', auditFilter)
      if (!reset && auditCursor) params.set('cursor', auditCursor)
      params.set('limit', '30')

      const res = await fetch(`/api/admin/audit-logs?${params}`)
      const json = await res.json()
      if (json.success) {
        setAuditLogs(reset ? json.data : [...auditLogs, ...json.data])
        setAuditCursor(json.nextCursor)
      }
    } catch (e) {
      console.error('Audit fetch error:', e)
    } finally {
      setAuditLoading(false)
    }
  }, [auditFilter, auditCursor, auditLogs])

  // Fetch ledger
  const fetchLedger = useCallback(async (reset = false) => {
    setLedgerLoading(true)
    try {
      const params = new URLSearchParams()
      if (ledgerAccountId) params.set('accountId', ledgerAccountId)
      if (ledgerCategory) params.set('category', ledgerCategory)
      if (!reset && ledgerCursor) params.set('cursor', ledgerCursor)
      params.set('limit', '30')

      const res = await fetch(`/api/admin/ledger?${params}`)
      const json = await res.json()
      if (json.success) {
        setLedgerEntries(reset ? json.data : [...ledgerEntries, ...json.data])
        setLedgerCursor(json.nextCursor)
        setLedgerTotal(json.total)
      }
    } catch (e) {
      console.error('Ledger fetch error:', e)
    } finally {
      setLedgerLoading(false)
    }
  }, [ledgerAccountId, ledgerCategory, ledgerCursor, ledgerEntries])

  useEffect(() => {
    if (isAdmin && activeTab === 'audit') fetchAudit(true)
  }, [isAdmin, activeTab, auditFilter])

  useEffect(() => {
    if (isAdmin && activeTab === 'ledger') fetchLedger(true)
  }, [isAdmin, activeTab, ledgerAccountId, ledgerCategory])

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Denetim & Finansal Defter</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Denetim Kaydı
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ledger'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Finansal Defter
          </button>
        </div>

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              <select
                value={auditFilter}
                onChange={(e) => { setAuditFilter(e.target.value); setAuditCursor(null) }}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm İşlemler</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => fetchAudit(true)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Table */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-4 py-3 text-left">Tarih</th>
                    <th className="px-4 py-3 text-left">İşlem</th>
                    <th className="px-4 py-3 text-left">Aktör</th>
                    <th className="px-4 py-3 text-left">Hedef</th>
                    <th className="px-4 py-3 text-left">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-900/50 text-purple-300">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                        {log.actorId.slice(0, 8)}...
                        {log.actorRole && <span className="ml-1 text-gray-500">({log.actorRole})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {log.targetType && <span className="text-gray-500">{log.targetType}</span>}
                        {log.targetId && <span className="ml-1 font-mono">{log.targetId.slice(0, 8)}...</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && !auditLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Denetim kaydı bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {auditCursor && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => fetchAudit(false)}
                  disabled={auditLoading}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {auditLoading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Ledger Tab */}
        {activeTab === 'ledger' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Hesap ID (userId)"
                  value={ledgerAccountId}
                  onChange={(e) => { setLedgerAccountId(e.target.value); setLedgerCursor(null) }}
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm w-48"
                />
              </div>
              <select
                value={ledgerCategory}
                onChange={(e) => { setLedgerCategory(e.target.value); setLedgerCursor(null) }}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm Kategoriler</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => fetchLedger(true)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <span className="text-gray-500 text-sm self-center ml-2">
                Toplam: {ledgerTotal.toLocaleString('tr-TR')} kayıt
              </span>
            </div>

            {/* Table */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-3 py-3 text-left">Tarih</th>
                    <th className="px-3 py-3 text-left">TX</th>
                    <th className="px-3 py-3 text-left">Hesap</th>
                    <th className="px-3 py-3 text-right">Tutar</th>
                    <th className="px-3 py-3 text-left">Kategori</th>
                    <th className="px-3 py-3 text-right">Önceki</th>
                    <th className="px-3 py-3 text-right">Sonra</th>
                    <th className="px-3 py-3 text-left">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-3 py-3 text-gray-300 whitespace-nowrap text-xs">
                        {new Date(entry.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">
                        {entry.transactionId.slice(0, 12)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className="text-gray-500">{entry.accountType}</span>
                        <br />
                        <span className="font-mono text-gray-400">{entry.accountId === 'PLATFORM' ? 'PLATFORM' : entry.accountId.slice(0, 8) + '...'}</span>
                      </td>
                      <td className={`px-3 py-3 text-right font-mono font-medium ${
                        entry.direction === 'debit' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {entry.direction === 'debit' ? '-' : '+'}{entry.amount.toLocaleString('tr-TR')}
                        <span className="text-gray-500 text-xs ml-1">{entry.currency}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-300">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-500 font-mono text-xs">
                        {entry.balanceBefore.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-400 font-mono text-xs">
                        {entry.balanceAfter.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-3 text-gray-300 max-w-xs truncate text-xs">
                        {entry.description || (entry.referenceType ? `${entry.referenceType}#${entry.referenceId?.slice(0, 8)}` : '-')}
                      </td>
                    </tr>
                  ))}
                  {ledgerEntries.length === 0 && !ledgerLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Defter kaydı bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {ledgerCursor && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => fetchLedger(false)}
                  disabled={ledgerLoading}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {ledgerLoading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
