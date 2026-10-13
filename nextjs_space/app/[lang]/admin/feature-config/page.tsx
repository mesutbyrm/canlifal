'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Save, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, Check, AlertCircle, ChevronDown, ChevronRight,
  Flag, Sliders, Edit2, X
} from 'lucide-react'

interface FeatureFlagItem {
  id: string
  key: string
  enabled: boolean
  description: string | null
  platform: string
  percentage: number
  metadata: any
  createdAt: string
  updatedAt: string
}

interface RemoteConfigItem {
  id: string
  key: string
  value: any
  valueType: string
  group: string
  description: string | null
  platform: string
  createdAt: string
  updatedAt: string
}

export default function FeatureConfigPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [flags, setFlags] = useState<FeatureFlagItem[]>([])
  const [configs, setConfigs] = useState<RemoteConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'flags' | 'config'>('flags')
  const [showNewFlag, setShowNewFlag] = useState(false)
  const [showNewConfig, setShowNewConfig] = useState(false)
  const [newFlag, setNewFlag] = useState({ key: '', description: '', platform: 'all', enabled: false })
  const [newConfig, setNewConfig] = useState({ key: '', value: '', group: 'general', description: '', platform: 'all', valueType: 'json' })
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [flagsRes, configsRes] = await Promise.all([
        fetch('/api/admin/feature-flags'),
        fetch('/api/admin/remote-config'),
      ])
      const flagsData = await flagsRes.json()
      const configsData = await configsRes.json()
      setFlags(flagsData.data || [])
      setConfigs(configsData.data || [])
    } catch (e) {
      showToast('error', 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Feature Flag işlemleri ──
  const toggleFlag = async (flag: FeatureFlagItem) => {
    setSaving(flag.id)
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      })
      if (res.ok) {
        setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f))
        showToast('success', `${flag.key} ${!flag.enabled ? 'açıldı' : 'kapatıldı'}`)
      }
    } catch { showToast('error', 'Güncellenemedi') }
    setSaving(null)
  }

  const createFlag = async () => {
    if (!newFlag.key) return
    setSaving('new-flag')
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlag),
      })
      const data = await res.json()
      if (res.ok) {
        setFlags(prev => [...prev, data.data])
        setNewFlag({ key: '', description: '', platform: 'all', enabled: false })
        setShowNewFlag(false)
        showToast('success', 'Bayrak oluşturuldu')
      } else {
        showToast('error', data.error || 'Hata')
      }
    } catch { showToast('error', 'Oluşturulamadı') }
    setSaving(null)
  }

  const deleteFlag = async (flagId: string) => {
    if (!confirm('Bu bayrağı silmek istediğinizden emin misiniz?')) return
    try {
      await fetch(`/api/admin/feature-flags/${flagId}`, { method: 'DELETE' })
      setFlags(prev => prev.filter(f => f.id !== flagId))
      showToast('success', 'Silindi')
    } catch { showToast('error', 'Silinemedi') }
  }

  // ── Remote Config işlemleri ──
  const createConfig = async () => {
    if (!newConfig.key) return
    setSaving('new-config')
    try {
      let parsedValue: any = newConfig.value
      try { parsedValue = JSON.parse(newConfig.value) } catch {}
      const res = await fetch('/api/admin/remote-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newConfig, value: parsedValue }),
      })
      const data = await res.json()
      if (res.ok) {
        setConfigs(prev => [...prev, data.data])
        setNewConfig({ key: '', value: '', group: 'general', description: '', platform: 'all', valueType: 'json' })
        setShowNewConfig(false)
        showToast('success', 'Config oluşturuldu')
      } else {
        showToast('error', data.error || 'Hata')
      }
    } catch { showToast('error', 'Oluşturulamadı') }
    setSaving(null)
  }

  const updateConfigValue = async (cfg: RemoteConfigItem, newValue: string) => {
    setSaving(cfg.id)
    try {
      let parsedValue: any = newValue
      try { parsedValue = JSON.parse(newValue) } catch {}
      const res = await fetch(`/api/admin/remote-config/${cfg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: parsedValue }),
      })
      if (res.ok) {
        setConfigs(prev => prev.map(c => c.id === cfg.id ? { ...c, value: parsedValue } : c))
        showToast('success', `${cfg.key} güncellendi`)
      }
    } catch { showToast('error', 'Güncellenemedi') }
    setSaving(null)
  }

  const deleteConfig = async (configId: string) => {
    if (!confirm('Bu config değerini silmek istediğinizden emin misiniz?')) return
    try {
      await fetch(`/api/admin/remote-config/${configId}`, { method: 'DELETE' })
      setConfigs(prev => prev.filter(c => c.id !== configId))
      showToast('success', 'Silindi')
    } catch { showToast('error', 'Silinemedi') }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  const configGroups = Array.from(new Set(configs.map(c => c.group))).sort()

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <AdminBackButton />

        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-7 h-7 text-purple-400" />
          <h1 className="text-2xl font-bold">Özellik Bayrakları & Uzak Yapılandırma</h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('flags')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'flags' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Flag className="w-4 h-4" />
            Feature Flags ({flags.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'config' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Remote Config ({configs.length})
          </button>
        </div>

        {/* ─── Feature Flags Tab ─── */}
        {activeTab === 'flags' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-400 text-sm">Client uygulamalar açılışta <code className="text-purple-300">GET /api/config</code> ile bu bayrakları çeker.</p>
              <button
                onClick={() => setShowNewFlag(!showNewFlag)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
              >
                {showNewFlag ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showNewFlag ? 'İptal' : 'Yeni Bayrak'}
              </button>
            </div>

            {/* Yeni bayrak formu */}
            <AnimatePresence>
              {showNewFlag && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={newFlag.key}
                        onChange={e => setNewFlag({ ...newFlag, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                        placeholder="BAYRAK_ADI (örn: PHONE_LOGIN_ENABLED)"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        value={newFlag.description}
                        onChange={e => setNewFlag({ ...newFlag, description: e.target.value })}
                        placeholder="Açıklama"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        value={newFlag.platform}
                        onChange={e => setNewFlag({ ...newFlag, platform: e.target.value })}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="all">Tüm platformlar</option>
                        <option value="web">Sadece Web</option>
                        <option value="mobile">Sadece Mobil</option>
                        <option value="ios">Sadece iOS</option>
                        <option value="android">Sadece Android</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newFlag.enabled}
                          onChange={e => setNewFlag({ ...newFlag, enabled: e.target.checked })}
                          className="rounded"
                        />
                        Aktif
                      </label>
                      <button
                        onClick={createFlag}
                        disabled={!newFlag.key || saving === 'new-flag'}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
                      >
                        {saving === 'new-flag' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Oluştur
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bayrak listesi */}
            <div className="space-y-2">
              {flags.map(flag => (
                <div key={flag.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
                  <button
                    onClick={() => toggleFlag(flag)}
                    disabled={saving === flag.id}
                    className="flex-shrink-0"
                  >
                    {saving === flag.id ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : flag.enabled ? (
                      <ToggleRight className="w-7 h-7 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-gray-500" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-purple-300">{flag.key}</code>
                      {flag.platform !== 'all' && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{flag.platform}</span>
                      )}
                      {flag.percentage < 100 && (
                        <span className="text-xs bg-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded">{flag.percentage}%</span>
                      )}
                    </div>
                    {flag.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{flag.description}</p>}
                  </div>
                  <button
                    onClick={() => deleteFlag(flag.id)}
                    className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {flags.length === 0 && (
                <p className="text-center text-gray-500 py-8">Henüz bayrak yok. Seed çalıştırın veya yukarıdan ekleyin.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Remote Config Tab ─── */}
        {activeTab === 'config' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-400 text-sm">Seviye eşikleri, PK süreleri, oda limitleri gibi değerler. JSON formatında saklanır.</p>
              <button
                onClick={() => setShowNewConfig(!showNewConfig)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
              >
                {showNewConfig ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showNewConfig ? 'İptal' : 'Yeni Config'}
              </button>
            </div>

            {/* Yeni config formu */}
            <AnimatePresence>
              {showNewConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={newConfig.key}
                        onChange={e => setNewConfig({ ...newConfig, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        placeholder="key (örn: pk_durations)"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        value={newConfig.group}
                        onChange={e => setNewConfig({ ...newConfig, group: e.target.value })}
                        placeholder="Grup (örn: pk, gifts, rooms)"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        value={newConfig.description}
                        onChange={e => setNewConfig({ ...newConfig, description: e.target.value })}
                        placeholder="Açıklama"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={newConfig.value}
                      onChange={e => setNewConfig({ ...newConfig, value: e.target.value })}
                      placeholder='JSON değer — örn: {"maxLevel": 100}'
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={createConfig}
                        disabled={!newConfig.key || !newConfig.value || saving === 'new-config'}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
                      >
                        {saving === 'new-config' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Oluştur
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Config listesi — gruplara göre */}
            {configGroups.map(group => (
              <div key={group} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  {group}
                </h3>
                <div className="space-y-2">
                  {configs.filter(c => c.group === group).map(cfg => (
                    <ConfigRow
                      key={cfg.id}
                      cfg={cfg}
                      saving={saving}
                      onUpdate={(val) => updateConfigValue(cfg, val)}
                      onDelete={() => deleteConfig(cfg.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {configs.length === 0 && (
              <p className="text-center text-gray-500 py-8">Henüz config yok. Seed çalıştırın veya yukarıdan ekleyin.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Config satır bileşeni ───
function ConfigRow({
  cfg,
  saving,
  onUpdate,
  onDelete,
}: {
  cfg: RemoteConfigItem
  saving: string | null
  onUpdate: (val: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')

  const startEdit = () => {
    setEditVal(JSON.stringify(cfg.value, null, 2))
    setEditing(true)
  }

  const saveEdit = () => {
    onUpdate(editVal)
    setEditing(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-purple-300">{cfg.key}</code>
            {cfg.platform !== 'all' && (
              <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{cfg.platform}</span>
            )}
          </div>
          {cfg.description && <p className="text-xs text-gray-500 mt-0.5">{cfg.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={editing ? saveEdit : startEdit}
            disabled={saving === cfg.id}
            className="text-gray-400 hover:text-purple-400 transition-colors"
          >
            {saving === cfg.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editing ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Edit2 className="w-4 h-4" />
            )}
          </button>
          {editing && (
            <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          rows={4}
          className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono"
        />
      ) : (
        <pre className="mt-2 text-xs text-gray-400 bg-gray-800/50 rounded p-2 overflow-x-auto max-h-24">
          {JSON.stringify(cfg.value, null, 2)}
        </pre>
      )}
    </div>
  )
}
