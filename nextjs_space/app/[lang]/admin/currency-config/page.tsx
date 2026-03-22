'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, Save, ArrowLeft, Sparkles, Gem, CircleDot } from 'lucide-react'

interface CurrencyConfigItem {
  id: string
  area: string
  areaName: string
  currencyType: string
  cost: number
  isActive: boolean
}

const AREA_GROUPS = [
  {
    title: '\u2728 Fal T\u00fcrleri',
    description: 'Hangi para birimi ile fal bakt\u0131r\u0131laca\u011f\u0131n\u0131 se\u00e7in',
    prefix: 'fortune_',
  },
  {
    title: '\ud83c\udfae Canl\u0131 & Hediye Alanlar\u0131',
    description: 'Canl\u0131 seans, hediye ve oyun alanlar\u0131 i\u00e7in para birimi',
    prefix: 'live_,chat_,game_,stream_',
  },
]

export default function CurrencyConfigPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [configs, setConfigs] = useState<CurrencyConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editedConfigs, setEditedConfigs] = useState<Record<string, Partial<CurrencyConfigItem>>>({})

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/currency-config')
      if (res.ok) {
        const data = await res.json()
        setConfigs(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (area: string, field: string, value: any) => {
    setEditedConfigs(prev => ({
      ...prev,
      [area]: { ...prev[area], [field]: value },
    }))
  }

  const getConfigValue = (config: CurrencyConfigItem, field: keyof CurrencyConfigItem) => {
    const edited = editedConfigs[config.area]
    if (edited && field in edited) return edited[field as string]
    return config[field]
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const updatedConfigs = configs.map(c => {
        const edited = editedConfigs[c.area] || {}
        return { ...c, ...edited }
      })

      const res = await fetch('/api/admin/currency-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: updatedConfigs }),
      })

      if (res.ok) {
        const data = await res.json()
        setConfigs(data)
        setEditedConfigs({})
        setMessage('T\u00fcm ayarlar kaydedildi')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(editedConfigs).length > 0

  const getGroupConfigs = (group: typeof AREA_GROUPS[0]) => {
    const prefixes = group.prefix.split(',')
    return configs.filter(c => prefixes.some(p => c.area.startsWith(p)))
  }

  const getCurrencyIcon = (type: string) => {
    switch (type) {
      case 'cfc': return <Sparkles className="w-4 h-4 text-gold-500" />
      case 'jeton': return <Gem className="w-4 h-4 text-blue-400" />
      case 'free': return <CircleDot className="w-4 h-4 text-green-400" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-deep-purple-975 to-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-purple-975 to-[#0a0118] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-gold-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Jeton / CFC Y\u00f6netimi</h1>
              <p className="text-purple-300 text-sm">Her alan i\u00e7in hangi para biriminin kullan\u0131laca\u011f\u0131n\u0131 ve maliyeti belirleyin</p>
            </div>
          </div>
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-black rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Kaydediliyor...' : 'T\u00fcm\u00fcn\u00fc Kaydet'}
            </button>
          )}
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg text-sm"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-4 p-3 bg-deep-purple-900/50 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-500" />
            <span className="text-sm text-purple-200"><strong className="text-gold-400">CFC</strong> \u2014 Fal kredisi (t\u00fcm fal t\u00fcrleri, Bana \u00d6zel)</span>
          </div>
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-purple-200"><strong className="text-blue-400">Jeton</strong> \u2014 Canl\u0131 falc\u0131, yay\u0131n, hediye, oyun</span>
          </div>
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-green-400" />
            <span className="text-sm text-purple-200"><strong className="text-green-400">\u00dccretsiz</strong> \u2014 Hi\u00e7bir ücret al\u0131nmaz</span>
          </div>
        </div>

        {/* Config Groups */}
        {AREA_GROUPS.map((group) => {
          const groupConfigs = getGroupConfigs(group)
          if (groupConfigs.length === 0) return null

          return (
            <div key={group.title} className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">{group.title}</h2>
                <p className="text-sm text-purple-300">{group.description}</p>
              </div>

              <div className="space-y-2">
                {groupConfigs.map((config) => {
                  const currencyType = getConfigValue(config, 'currencyType') as string
                  const cost = getConfigValue(config, 'cost') as number

                  return (
                    <div
                      key={config.id}
                      className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      {/* Area Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getCurrencyIcon(currencyType)}
                          <span className="text-white font-medium">{config.areaName}</span>
                        </div>
                        <span className="text-xs text-purple-400 mt-0.5 block">{config.area}</span>
                      </div>

                      {/* Currency Type Selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-purple-300 whitespace-nowrap">Para Birimi:</label>
                        <select
                          value={currencyType}
                          onChange={(e) => handleChange(config.area, 'currencyType', e.target.value)}
                          className="bg-deep-purple-900 border border-purple-500/30 rounded-lg px-3 py-1.5 text-white text-sm focus:border-gold-500 focus:outline-none"
                        >
                          <option value="cfc">CFC</option>
                          <option value="jeton">Jeton</option>
                          <option value="free">\u00dccretsiz</option>
                        </select>
                      </div>

                      {/* Cost Input */}
                      {currencyType !== 'free' && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-purple-300 whitespace-nowrap">\u00dccret:</label>
                          <input
                            type="number"
                            min="0"
                            value={cost}
                            onChange={(e) => handleChange(config.area, 'cost', parseInt(e.target.value) || 0)}
                            className="w-20 bg-deep-purple-900 border border-purple-500/30 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:border-gold-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Save Button (bottom) */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-4 flex justify-center"
          >
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-black rounded-xl font-bold shadow-lg shadow-gold-500/30 transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Kaydediliyor...' : 'De\u011fi\u015fiklikleri Kaydet'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
