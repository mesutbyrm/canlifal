'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Shield, Save, Loader2, Check, Lock, Users } from 'lucide-react'

interface RoleItem {
  id: string
  key: string
  name: string
  description: string | null
  level: number
  isSystem: boolean
  permissions: string[]
}

interface PermissionItem {
  id?: string
  key: string
  name: string
  group: string | null
}

const GROUP_LABELS: Record<string, string> = {
  finance: '💰 Finans',
  content: '📝 İçerik',
  moderation: '🛡️ Moderasyon',
  system: '⚙️ Sistem',
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles')
      const json = await res.json()
      if (res.ok) {
        const rs: RoleItem[] = json.data?.roles || []
        setRoles(rs)
        setPermissions(json.data?.permissions || [])
        if (rs.length > 0) {
          setSelectedId(rs[0].id)
          setDraft(rs[0].permissions)
        }
      } else {
        showToast('error', json.error || 'Veriler yüklenemedi')
      }
    } catch {
      showToast('error', 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const selected = roles.find((r) => r.id === selectedId) || null

  const selectRole = (r: RoleItem) => {
    setSelectedId(r.id)
    setDraft(r.permissions)
  }

  const togglePerm = (key: string) => {
    setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const save = async () => {
    if (!selected) return
    setSavingId(selected.id)
    try {
      const res = await fetch(`/api/admin/roles/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: draft }),
      })
      const json = await res.json()
      if (res.ok) {
        setRoles((prev) => prev.map((r) => (r.id === selected.id ? { ...r, permissions: json.data.permissions } : r)))
        showToast('success', `${selected.name} yetkileri kaydedildi`)
      } else {
        showToast('error', json.error || 'Kaydedilemedi')
      }
    } catch {
      showToast('error', 'Kaydedilemedi')
    }
    setSavingId(null)
  }

  const groups = Array.from(new Set(permissions.map((p) => p.group || 'system')))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />

        <div className="flex items-center gap-3 mb-8 mt-4">
          <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-400/25">
            <Shield className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Rol &amp; Yetki Yönetimi</h1>
            <p className="text-sm text-slate-400">Her rol için izinleri düzenleyin</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rol listesi */}
            <div className="space-y-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedId === r.id
                      ? 'bg-purple-500/15 border-purple-400/40 shadow-lg shadow-purple-900/20'
                      : 'bg-slate-900/60 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-300" />
                      {r.name}
                    </span>
                    {r.isSystem && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                    <span className="font-mono">{r.key}</span>
                    <span>seviye {r.level}</span>
                    <span>{r.permissions.length} yetki</span>
                  </div>
                </button>
              ))}
              {roles.length === 0 && (
                <p className="text-sm text-slate-400 p-4">Henüz rol tanımlanmamış.</p>
              )}
            </div>

            {/* Yetki matrisi */}
            <div className="lg:col-span-2">
              {selected ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 md:p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                      <p className="text-xs text-slate-400 font-mono">{selected.key}</p>
                    </div>
                    <button
                      onClick={save}
                      disabled={savingId === selected.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      {savingId === selected.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Kaydet
                    </button>
                  </div>

                  {(selected.key === 'admin' || selected.key === 'yonetici') && (
                    <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 text-amber-200 text-xs">
                      Bu rol her zaman tam erişime sahiptir; buradaki değişiklikler kayıt amaçlıdır ve erişimi
                      kısıtlamaz.
                    </div>
                  )}

                  <div className="space-y-6">
                    {groups.map((g) => (
                      <div key={g}>
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">
                          {GROUP_LABELS[g] || g}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {permissions
                            .filter((p) => (p.group || 'system') === g)
                            .map((p) => {
                              const on = draft.includes(p.key)
                              return (
                                <button
                                  key={p.key}
                                  onClick={() => togglePerm(p.key)}
                                  className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                                    on
                                      ? 'bg-emerald-500/10 border-emerald-400/30'
                                      : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                      on ? 'bg-emerald-500' : 'bg-slate-700'
                                    }`}
                                  >
                                    {on && <Check className="w-3 h-3 text-white" />}
                                  </span>
                                  <span>
                                    <span className="block text-sm text-white">{p.name}</span>
                                    <span className="block text-[11px] text-slate-500 font-mono">{p.key}</span>
                                  </span>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-400">
                  Bir rol seçin
                </div>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div
            className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm text-white shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}
