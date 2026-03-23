'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { Save, Loader2, ToggleLeft, ToggleRight, Coins, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminBackButton from '@/components/admin-back-button'

interface BanaOzelItem {
  id: string
  slug: string
  nameTr: string
  nameEn: string
  icon: string
  jetonCost: number
  category: string
  isActive: boolean
  sortOrder: number
}

export default function AdminBanaOzelPage() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const params = useParams()
  const lang = params?.lang || 'tr'
  const [items, setItems] = useState<BanaOzelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/admin/bana-ozel')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {
      console.error('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (item: BanaOzelItem, updates: Partial<BanaOzelItem>) => {
    setSaving(item.id)
    try {
      const res = await fetch('/api/admin/bana-ozel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ...updates }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i))
        setMessage('Kaydedildi ✅')
        setTimeout(() => setMessage(''), 2000)
      }
    } catch {
      setMessage('Hata oluştu ❌')
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = (item: BanaOzelItem) => {
    handleUpdate(item, { isActive: !item.isActive })
  }

  const handleCostChange = (item: BanaOzelItem, cost: number) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, jetonCost: cost } : i))
  }

  const handleSaveCost = (item: BanaOzelItem) => {
    handleUpdate(item, { jetonCost: item.jetonCost })
  }

  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-[#0a0118] text-white">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AdminBackButton variant="link" className="p-2 rounded-lg bg-purple-900/30 border border-purple-500/30 hover:bg-purple-800/40 transition-colors" label="" />
          <div>
            <h1 className="text-xl font-bold text-white">🔮 Bana Özel Yönetimi</h1>
            <p className="text-fuchsia-300/70 text-sm">Tüm içerikleri yönetin, jeton fiyatlarını belirleyin</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-green-900/30 border border-green-400/30 text-green-300 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  item.isActive
                    ? 'bg-purple-900/20 border-purple-500/30'
                    : 'bg-gray-900/30 border-gray-600/30 opacity-60'
                }`}
              >
                {/* Icon */}
                <span className="text-xl w-8 text-center">{item.icon}</span>
                
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.nameTr}</p>
                  <p className="text-fuchsia-300/50 text-xs truncate">{item.slug}</p>
                </div>

                {/* Category badge */}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-800/40 border border-purple-500/30 text-fuchsia-300">
                  {item.category}
                </span>

                {/* Jeton cost input */}
                <div className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  <input
                    type="number"
                    value={item.jetonCost}
                    onChange={(e) => handleCostChange(item, parseInt(e.target.value) || 0)}
                    className="w-14 bg-purple-900/30 border border-purple-500/30 rounded-lg px-2 py-1 text-yellow-300 text-sm text-center focus:outline-none focus:border-fuchsia-400"
                    min={0}
                  />
                  <button
                    onClick={() => handleSaveCost(item)}
                    disabled={saving === item.id}
                    className="p-1 rounded-lg bg-purple-800/30 hover:bg-purple-700/40 transition-colors"
                  >
                    {saving === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 text-fuchsia-300 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-fuchsia-300" />
                    )}
                  </button>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(item)}
                  className="p-1"
                >
                  {item.isActive ? (
                    <ToggleRight className="w-7 h-7 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-500" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
