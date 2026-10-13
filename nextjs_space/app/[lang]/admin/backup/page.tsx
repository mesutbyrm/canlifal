'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  Download,
  Settings,
  Users,
  Table2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  FileJson,
  FileCode,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react'

interface TableInfo {
  table: string
  count: number
}

type BackupStatus = 'idle' | 'loading' | 'success' | 'error'

export default function AdminBackupPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [tables, setTables] = useState<TableInfo[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [backupStatus, setBackupStatus] = useState<Record<string, BackupStatus>>({})
  const [backupMessages, setBackupMessages] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTables, setShowAllTables] = useState(false)
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())

  const isAdmin = session?.user && ['admin', 'yonetici'].includes((session.user as any).role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const fetchTables = useCallback(async () => {
    setTablesLoading(true)
    try {
      const res = await fetch('/api/admin/backup?type=tables')
      if (res.ok) {
        const data = await res.json()
        setTables(data.tables || [])
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    } finally {
      setTablesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchTables()
  }, [isAdmin, fetchTables])

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBackup = async (key: string, url: string, filename: string) => {
    setBackupStatus(prev => ({ ...prev, [key]: 'loading' }))
    setBackupMessages(prev => ({ ...prev, [key]: '' }))
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Bilinmeyen hata' }))
        throw new Error(err.error || 'İndirme başarısız')
      }
      const blob = await res.blob()
      downloadFile(blob, filename)
      setBackupStatus(prev => ({ ...prev, [key]: 'success' }))
      setBackupMessages(prev => ({ ...prev, [key]: 'İndirildi ✓' }))
      setTimeout(() => {
        setBackupStatus(prev => ({ ...prev, [key]: 'idle' }))
        setBackupMessages(prev => ({ ...prev, [key]: '' }))
      }, 3000)
    } catch (err: any) {
      setBackupStatus(prev => ({ ...prev, [key]: 'error' }))
      setBackupMessages(prev => ({ ...prev, [key]: err.message || 'Hata oluştu' }))
    }
  }

  const handleSQLExport = (tableName: string) => {
    const dateStr = new Date().toISOString().slice(0, 10)
    handleBackup(
      `sql_${tableName}`,
      `/api/admin/backup?type=sql&table=${encodeURIComponent(tableName)}`,
      `${tableName}_${dateStr}.sql`
    )
  }

  const handleBulkSQLExport = async () => {
    if (selectedTables.size === 0) return
    setBackupStatus(prev => ({ ...prev, bulk_sql: 'loading' }))
    setBackupMessages(prev => ({ ...prev, bulk_sql: `${selectedTables.size} tablo indiriliyor...` }))
    try {
      for (const tableName of selectedTables) {
        const dateStr = new Date().toISOString().slice(0, 10)
        const res = await fetch(`/api/admin/backup?type=sql&table=${encodeURIComponent(tableName)}`)
        if (res.ok) {
          const blob = await res.blob()
          downloadFile(blob, `${tableName}_${dateStr}.sql`)
        }
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 300))
      }
      setBackupStatus(prev => ({ ...prev, bulk_sql: 'success' }))
      setBackupMessages(prev => ({ ...prev, bulk_sql: `${selectedTables.size} tablo indirildi ✓` }))
      setTimeout(() => {
        setBackupStatus(prev => ({ ...prev, bulk_sql: 'idle' }))
        setBackupMessages(prev => ({ ...prev, bulk_sql: '' }))
      }, 3000)
    } catch (err: any) {
      setBackupStatus(prev => ({ ...prev, bulk_sql: 'error' }))
      setBackupMessages(prev => ({ ...prev, bulk_sql: err.message || 'Hata oluştu' }))
    }
  }

  const toggleSelectAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set())
    } else {
      setSelectedTables(new Set(filteredTables.map(t => t.table)))
    }
  }

  const toggleTable = (name: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const totalRows = tables.reduce((sum, t) => sum + Math.max(t.count, 0), 0)
  const filteredTables = tables.filter(t =>
    t.table.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const displayedTables = showAllTables ? filteredTables : filteredTables.slice(0, 20)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Yetkisiz Erişim</h2>
          <p className="text-purple-300">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    )
  }

  const StatusIcon = ({ statusKey }: { statusKey: string }) => {
    const s = backupStatus[statusKey]
    if (s === 'loading') return <Loader2 className="w-4 h-4 animate-spin" />
    if (s === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />
    if (s === 'error') return <AlertTriangle className="w-4 h-4 text-red-400" />
    return null
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <AdminBackButton />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-purple-400" />
              Site Yedekleme
            </h1>
            <p className="text-purple-300 text-sm mt-1">
              Veritabanı tablolarını SQL olarak indirin, platform ayarlarını ve kullanıcı verilerini yedekleyin
            </p>
          </div>
        </div>

        {/* Quick Backup Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Full DB Backup */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-purple-900/60 to-fuchsia-900/40 border border-purple-500/30 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Tam Veritabanı</h3>
                <p className="text-purple-400 text-xs">Tüm tablolar (JSON)</p>
              </div>
            </div>
            <p className="text-purple-300/70 text-xs mb-3">
              {tables.length} tablo, {totalRows.toLocaleString('tr-TR')} kayıt
            </p>
            <button
              onClick={() => handleBackup('full', '/api/admin/backup?type=full', `canlifal_full_backup_${new Date().toISOString().slice(0, 10)}.json`)}
              disabled={backupStatus.full === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors"
            >
              <StatusIcon statusKey="full" />
              {backupStatus.full === 'loading' ? 'İndiriliyor...' : <><Download className="w-4 h-4" /> İndir (JSON)</>}
            </button>
            {backupMessages.full && (
              <p className={`text-xs mt-2 ${backupStatus.full === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {backupMessages.full}
              </p>
            )}
          </motion.div>

          {/* Settings Backup */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-900/60 to-cyan-900/40 border border-blue-500/30 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Platform Ayarları</h3>
                <p className="text-blue-400 text-xs">Tüm ayar ve konfigürasyonlar</p>
              </div>
            </div>
            <p className="text-blue-300/70 text-xs mb-3">
              Platform ayarları + Site ayarları
            </p>
            <button
              onClick={() => handleBackup('settings', '/api/admin/backup?type=settings', `canlifal_settings_${new Date().toISOString().slice(0, 10)}.json`)}
              disabled={backupStatus.settings === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors"
            >
              <StatusIcon statusKey="settings" />
              {backupStatus.settings === 'loading' ? 'İndiriliyor...' : <><Download className="w-4 h-4" /> İndir (JSON)</>}
            </button>
            {backupMessages.settings && (
              <p className={`text-xs mt-2 ${backupStatus.settings === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {backupMessages.settings}
              </p>
            )}
          </motion.div>

          {/* Users Backup */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-emerald-900/60 to-teal-900/40 border border-emerald-500/30 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Kullanıcı Verileri</h3>
                <p className="text-emerald-400 text-xs">Tüm kullanıcı bilgileri</p>
              </div>
            </div>
            <p className="text-emerald-300/70 text-xs mb-3">
              İsim, e-posta, rol, bakiye, üyelik
            </p>
            <button
              onClick={() => handleBackup('users', '/api/admin/backup?type=users', `canlifal_users_${new Date().toISOString().slice(0, 10)}.json`)}
              disabled={backupStatus.users === 'loading'}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors"
            >
              <StatusIcon statusKey="users" />
              {backupStatus.users === 'loading' ? 'İndiriliyor...' : <><Download className="w-4 h-4" /> İndir (JSON)</>}
            </button>
            {backupMessages.users && (
              <p className={`text-xs mt-2 ${backupStatus.users === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {backupMessages.users}
              </p>
            )}
          </motion.div>

          {/* Bulk SQL Export */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-amber-900/60 to-orange-900/40 border border-amber-500/30 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <FileCode className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Toplu SQL İndir</h3>
                <p className="text-amber-400 text-xs">Seçili tabloları SQL olarak</p>
              </div>
            </div>
            <p className="text-amber-300/70 text-xs mb-3">
              {selectedTables.size} tablo seçili
            </p>
            <button
              onClick={handleBulkSQLExport}
              disabled={backupStatus.bulk_sql === 'loading' || selectedTables.size === 0}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors"
            >
              <StatusIcon statusKey="bulk_sql" />
              {backupStatus.bulk_sql === 'loading' ? 'İndiriliyor...' : <><Download className="w-4 h-4" /> SQL İndir ({selectedTables.size})</>}
            </button>
            {backupMessages.bulk_sql && (
              <p className={`text-xs mt-2 ${backupStatus.bulk_sql === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {backupMessages.bulk_sql}
              </p>
            )}
          </motion.div>
        </div>

        {/* Table List Section */}
        <div className="bg-[#1a0a2e]/80 border border-purple-500/20 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-purple-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Table2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Veritabanı Tabloları</h2>
                <span className="text-purple-400 text-sm">({tables.length} tablo)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                  <input
                    type="text"
                    placeholder="Tablo ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-purple-900/30 border border-purple-700/30 rounded-lg pl-9 pr-3 py-2 text-sm text-purple-100 placeholder-purple-400/50 w-56 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={fetchTables}
                  className="p-2 rounded-lg bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 transition"
                  title="Yenile"
                >
                  <RefreshCw className={`w-4 h-4 ${tablesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={toggleSelectAll}
                className="text-xs text-purple-400 hover:text-purple-300 underline"
              >
                {selectedTables.size === filteredTables.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
              {selectedTables.size > 0 && (
                <span className="text-xs text-amber-400">
                  {selectedTables.size} tablo seçili — Toplu SQL indir butonunu kullanın
                </span>
              )}
            </div>
          </div>

          {tablesLoading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span className="ml-3 text-purple-300">Tablolar yükleniyor...</span>
            </div>
          ) : (
            <>
              <div className="divide-y divide-purple-500/10">
                {displayedTables.map((t) => {
                  const statusKey = `sql_${t.table}`
                  const isSelected = selectedTables.has(t.table)
                  return (
                    <div
                      key={t.table}
                      className={`flex items-center justify-between px-5 py-3 hover:bg-purple-900/20 transition ${isSelected ? 'bg-purple-900/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTable(t.table)}
                          className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/30 text-purple-500 focus:ring-purple-500 cursor-pointer"
                        />
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <FileJson className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{t.table}</p>
                          <p className="text-purple-400/60 text-xs">
                            {t.count >= 0 ? `${t.count.toLocaleString('tr-TR')} kayıt` : 'Sayılamadı'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {backupMessages[statusKey] && (
                          <span className={`text-xs ${backupStatus[statusKey] === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                            {backupMessages[statusKey]}
                          </span>
                        )}
                        <button
                          onClick={() => handleSQLExport(t.table)}
                          disabled={backupStatus[statusKey] === 'loading'}
                          className="flex items-center gap-1.5 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg py-1.5 px-3 text-xs font-medium transition-colors"
                          title={`${t.table} tablosunu SQL olarak indir`}
                        >
                          {backupStatus[statusKey] === 'loading' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          SQL
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredTables.length > 20 && (
                <div className="p-4 text-center border-t border-purple-500/10">
                  <button
                    onClick={() => setShowAllTables(!showAllTables)}
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 mx-auto"
                  >
                    {showAllTables ? (
                      <><ChevronUp className="w-4 h-4" /> Daha az göster</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Tümünü göster ({filteredTables.length - 20} daha)</>
                    )}
                  </button>
                </div>
              )}

              {filteredTables.length === 0 && (
                <div className="p-10 text-center text-purple-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>"{searchQuery}" ile eşleşen tablo bulunamadı</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300/80">
              <p className="font-medium text-blue-300 mb-1">Yedekleme Bilgileri</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Tam Veritabanı (JSON)</strong>: Tüm tabloları tek bir JSON dosyasında indirir (her tablo max 10.000 kayıt)</li>
                <li><strong>Platform Ayarları</strong>: Platform ve site ayarlarını JSON olarak dışa aktarır</li>
                <li><strong>Kullanıcı Verileri</strong>: Tüm kullanıcı bilgilerini (isim, e-posta, rol, bakiye) JSON olarak indirir</li>
                <li><strong>SQL İndir</strong>: Tek tek tabloları INSERT INTO formatında SQL olarak indirir (max 50.000 kayıt)</li>
                <li><strong>Toplu SQL</strong>: Seçili tabloları ayrı ayrı SQL dosyaları olarak indirir</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
