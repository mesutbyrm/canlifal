'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Plus, Trash2, X, ToggleLeft, ToggleRight, Save } from 'lucide-react'

interface EffectRuleItem {
  id: string
  key: string
  name: string
  description: string | null
  effectType: string
  effectRefId: string | null
  conditionType: string
  threshold: number
  conditionValue: string | null
  isActive: boolean
  priority: number
}

const EFFECT_TYPES = [
  { value: 'entrance', label: 'Giriş Efekti' },
  { value: 'name_effect', label: 'İsim Efekti' },
  { value: 'chat_bubble', label: 'Sohbet Balonu' },
  { value: 'mic_frame', label: 'Mikrofon Çerçevesi' },
  { value: 'badge', label: 'Rozet' },
  { value: 'avatar_accessory', label: 'Avatar Aksesuarı' },
]
const CONDITION_TYPES = [
  { value: 'level', label: 'Seviye' },
  { value: 'supporter_level', label: 'Destekçi Seviyesi' },
  { value: 'membership', label: 'Üyelik' },
  { value: 'spend_threshold', label: 'Harcama Eşiği' },
  { value: 'manual', label: 'Manuel' },
]
const typeLabel = (v: string, list: { value: string; label: string }[]) => list.find(x => x.value === v)?.label || v

const emptyRule = { key: '', name: '', description: '', effectType: 'entrance', effectRefId: '', conditionType: 'level', threshold: 0, conditionValue: '', isActive: true, priority: 0 }

export default function AdminEffectRulesPage() {
  const [rules, setRules] = useState<EffectRuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<any>(emptyRule)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message }); setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/effect-rules')
      const data = await res.json()
      setRules(data.data || [])
    } catch { showToast('error', 'Kurallar yüklenemedi') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { fetchRules() }, [fetchRules])

  const createRule = async () => {
    if (!form.key || !form.name) { showToast('error', 'key ve ad zorunlu'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/effect-rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, threshold: Number(form.threshold) || 0, priority: Number(form.priority) || 0 }),
      })
      const data = await res.json()
      if (res.ok) {
        setRules(prev => [...prev, data.data])
        setForm(emptyRule); setShowNew(false)
        showToast('success', 'Kural oluşturuldu')
      } else { showToast('error', data.error?.message || data.error || 'Hata') }
    } catch { showToast('error', 'Oluşturulamadı') }
    finally { setSaving(false) }
  }

  const toggleActive = async (r: EffectRuleItem) => {
    try {
      const res = await fetch(`/api/admin/effect-rules/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !r.isActive }),
      })
      if (res.ok) setRules(prev => prev.map(x => x.id === r.id ? { ...x, isActive: !x.isActive } : x))
    } catch { showToast('error', 'Güncellenemedi') }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return
    try {
      await fetch(`/api/admin/effect-rules/${id}`, { method: 'DELETE' })
      setRules(prev => prev.filter(x => x.id !== id))
      showToast('success', 'Silindi')
    } catch { showToast('error', 'Silinemedi') }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <AdminBackButton />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-purple-400" />
            <h1 className="text-2xl font-bold">Efekt Kuralları</h1>
          </div>
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">
            {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showNew ? 'İptal' : 'Yeni Kural'}
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-4">Kurallar; seviye, destekçi seviyesi, üyelik veya harcama eşiğine göre kozmetik efektlerin (giriş, isim, rozet vb.) otomatik atanmasını tanımlar. Mevcut kozmetik tabloları değiştirmez, yalnızca çözümleme kuralı sağlar.</p>

        <AnimatePresence>
          {showNew && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} placeholder="KURAL_ANAHTARI" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Görünen ad" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Açıklama (opsiyonel)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={form.effectType} onChange={e => setForm({ ...form, effectType: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                    {EFFECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input value={form.effectRefId} onChange={e => setForm({ ...form, effectRefId: e.target.value })} placeholder="Efekt referans ID (opsiyonel)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={form.conditionType} onChange={e => setForm({ ...form, conditionType: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                    {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} placeholder="Eşik" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} placeholder="Öncelik" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <input value={form.conditionValue} onChange={e => setForm({ ...form, conditionValue: e.target.value })} placeholder="Koşul değeri (opsiyonel, örn. üyelik tipi)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                <button onClick={createRule} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Kural bulunamadı.</div>
        ) : (
          <div className="space-y-2">
            {rules.map(r => (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{r.name}</span>
                    <span className="text-xs text-gray-500">{r.key}</span>
                  </div>
                  <p className="text-xs text-gray-400">{typeLabel(r.effectType, EFFECT_TYPES)} • {typeLabel(r.conditionType, CONDITION_TYPES)} ≥ {r.threshold} • öncelik {r.priority}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(r)} title={r.isActive ? 'Aktif' : 'Pasif'}>
                    {r.isActive ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7 text-gray-600" />}
                  </button>
                  <button onClick={() => deleteRule(r.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
