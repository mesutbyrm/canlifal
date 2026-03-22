'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Plus, Trash2, Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Info } from 'lucide-react'

const AD_PROVIDERS = [
  { id: 'google_adsense', name: 'Google AdSense', description: 'Web siteleri i\u00e7in en pop\u00fcler reklam a\u011f\u0131. Banner, metin ve video reklamlar\u0131 destekler.', fields: ['adCode', 'adUnitId'], placeholders: { adCode: 'AdSense reklam kodu (script tag)', adUnitId: 'ca-pub-XXXXXXX / slot-XXXXX' } },
  { id: 'google_admob', name: 'Google AdMob', description: 'Mobil uygulamalar i\u00e7in Google reklam a\u011f\u0131. \u00d6d\u00fcll\u00fc video reklamlar\u0131 destekler.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'ca-app-pub-XXXXXXX', adUnitId: 'ca-app-pub-XXXXXXX/XXXXXXXXXX' } },
  { id: 'unity_ads', name: 'Unity Ads', description: 'Oyun ve uygulama i\u00e7in \u00f6d\u00fcll\u00fc video reklamlar\u0131.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'Unity Game ID', adUnitId: 'Rewarded Video Ad Unit' } },
  { id: 'facebook_audience', name: 'Facebook Audience Network', description: 'Meta reklam a\u011f\u0131 \u00fczerinden g\u00f6sterilen reklamlar.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'Facebook App ID', adUnitId: 'Placement ID' } },
  { id: 'applovin', name: 'AppLovin MAX', description: 'Y\u00fcksek eCPM ile \u00f6d\u00fcll\u00fc reklamlar.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'AppLovin SDK Key', adUnitId: 'Ad Unit ID' } },
  { id: 'ironsource', name: 'IronSource', description: 'Oyun i\u00e7i reklam mediasyonu ve \u00f6d\u00fcll\u00fc videolar.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'App Key', adUnitId: 'Placement Name' } },
  { id: 'vungle', name: 'Vungle (Liftoff)', description: 'Y\u00fcksek kaliteli video reklamlar.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'Vungle App ID', adUnitId: 'Placement ID' } },
  { id: 'chartboost', name: 'Chartboost', description: 'Oyun odakl\u0131 reklam a\u011f\u0131.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'App ID', adUnitId: 'Ad Location' } },
  { id: 'adcolony', name: 'AdColony', description: 'HD video reklamlar ve instant-play teknolojisi.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'App ID', adUnitId: 'Zone ID' } },
  { id: 'tapjoy', name: 'Tapjoy', description: '\u00d6d\u00fcll\u00fc reklamlar ve offerwall.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'SDK Key', adUnitId: 'Placement Name' } },
  { id: 'mintegral', name: 'Mintegral', description: 'Global reklam a\u011f\u0131, \u00f6d\u00fcll\u00fc video ve interstitial.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'App ID', adUnitId: 'Unit ID' } },
  { id: 'inmobi', name: 'InMobi', description: 'Mobil reklam a\u011f\u0131, banner ve video.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'Account ID', adUnitId: 'Placement ID' } },
  { id: 'startio', name: 'Start.io', description: 'Mobil reklam platformu.', fields: ['appId', 'adUnitId'], placeholders: { appId: 'App ID', adUnitId: 'Ad Tag' } },
  { id: 'custom', name: '\u00d6zel Reklam Kodu', description: 'Kendi reklam kodunuzu yap\u0131\u015ft\u0131r\u0131n.', fields: ['adCode'], placeholders: { adCode: 'Reklam HTML/JS kodu' } },
]

interface AdNetwork {
  id: string
  name: string
  provider: string
  adCode: string | null
  adUnitId: string | null
  appId: string | null
  isActive: boolean
  sortOrder: number
}

export default function AdNetworksPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [networks, setNetworks] = useState<AdNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchNetworks()
  }, [])

  const fetchNetworks = async () => {
    try {
      const res = await fetch('/api/admin/ad-networks')
      if (res.ok) {
        const data = await res.json()
        setNetworks(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!selectedProvider) return
    const providerInfo = AD_PROVIDERS.find(p => p.id === selectedProvider)
    if (!providerInfo) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/ad-networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: providerInfo.name,
          provider: selectedProvider,
          isActive: false,
          sortOrder: networks.length,
        }),
      })
      if (res.ok) {
        await fetchNetworks()
        setShowAdd(false)
        setSelectedProvider('')
        setMessage('Reklam a\u011f\u0131 eklendi')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (network: AdNetwork) => {
    const form = editForm[network.id] || {}
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ad-networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...network,
          ...form,
          provider: network.provider,
        }),
      })
      if (res.ok) {
        await fetchNetworks()
        setEditForm(prev => { const n = { ...prev }; delete n[network.id]; return n })
        setMessage('Kaydedildi')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (network: AdNetwork) => {
    // If activating, deactivate all others first
    if (!network.isActive) {
      for (const n of networks) {
        if (n.id !== network.id && n.isActive) {
          await fetch('/api/admin/ad-networks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...n, isActive: false }),
          })
        }
      }
    }
    await fetch('/api/admin/ad-networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...network, isActive: !network.isActive }),
    })
    await fetchNetworks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu reklam a\u011f\u0131n\u0131 silmek istedi\u011finize emin misiniz?')) return
    try {
      await fetch(`/api/admin/ad-networks?id=${id}`, { method: 'DELETE' })
      await fetchNetworks()
      setMessage('Silindi')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const getProviderInfo = (provider: string) => AD_PROVIDERS.find(p => p.id === provider)
  const existingProviders = networks.map(n => n.provider)

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
            <Monitor className="w-8 h-8 text-gold-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Reklam A\u011f\u0131 Y\u00f6netimi</h1>
              <p className="text-purple-300 text-sm">Reklam a\u011flar\u0131n\u0131 yap\u0131land\u0131r\u0131n. Sadece bir a\u011f ayn\u0131 anda aktif olabilir.</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ekle
          </button>
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

        {/* Add New */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-4"
            >
              <h3 className="text-white font-medium mb-3">Yeni Reklam A\u011f\u0131 Ekle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-h-[300px] overflow-y-auto">
                {AD_PROVIDERS.filter(p => !existingProviders.includes(p.id)).map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selectedProvider === provider.id
                        ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                        : 'border-purple-500/30 bg-deep-purple-900/30 text-purple-200 hover:border-purple-400/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{provider.name}</div>
                    <div className="text-xs mt-1 opacity-70">{provider.description}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAdd}
                  disabled={!selectedProvider || saving}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-black rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Ekleniyor...' : 'Ekle'}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setSelectedProvider('') }}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg transition-colors"
                >
                  \u0130ptal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Network List */}
        <div className="space-y-3">
          {networks.length === 0 && (
            <div className="text-center py-12 text-purple-300">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Hen\u00fcz reklam a\u011f\u0131 eklenmemi\u015f</p>
              <p className="text-sm mt-1 text-purple-400">Yukar\u0131daki &quot;Ekle&quot; butonuyla ba\u015flay\u0131n</p>
            </div>
          )}

          {networks.map((network) => {
            const providerInfo = getProviderInfo(network.provider)
            const isExpanded = expandedId === network.id
            const form = editForm[network.id] || {}

            return (
              <motion.div
                key={network.id}
                layout
                className={`bg-deep-purple-900/50 border rounded-xl overflow-hidden transition-colors ${
                  network.isActive ? 'border-green-500/50' : 'border-purple-500/30'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : network.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${network.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <div>
                      <span className="text-white font-medium">{network.name}</span>
                      {network.isActive && <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Aktif</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(network) }}
                      className={`p-1.5 rounded-lg transition-colors ${network.isActive ? 'text-green-400 hover:bg-green-500/20' : 'text-gray-400 hover:bg-purple-500/20'}`}
                      title={network.isActive ? 'Devre d\u0131\u015f\u0131 b\u0131rak' : 'Aktif et'}
                    >
                      {network.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-purple-300" /> : <ChevronDown className="w-5 h-5 text-purple-300" />}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-purple-500/20"
                    >
                      <div className="p-4 space-y-4">
                        {providerInfo && (
                          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-300">{providerInfo.description}</p>
                          </div>
                        )}

                        {/* Fields based on provider */}
                        {providerInfo?.fields.includes('adCode') && (
                          <div>
                            <label className="block text-sm text-purple-300 mb-1.5">Reklam Kodu (HTML/JS)</label>
                            <textarea
                              value={form.adCode ?? network.adCode ?? ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [network.id]: { ...prev[network.id], adCode: e.target.value } }))}
                              className="w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-lg p-3 text-white text-sm font-mono min-h-[120px] focus:border-gold-500 focus:outline-none"
                              placeholder={providerInfo.placeholders.adCode || ''}
                            />
                          </div>
                        )}

                        {providerInfo?.fields.includes('appId') && (
                          <div>
                            <label className="block text-sm text-purple-300 mb-1.5">App / SDK ID</label>
                            <input
                              type="text"
                              value={form.appId ?? network.appId ?? ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [network.id]: { ...prev[network.id], appId: e.target.value } }))}
                              className="w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-lg p-3 text-white text-sm focus:border-gold-500 focus:outline-none"
                              placeholder={providerInfo.placeholders.appId || ''}
                            />
                          </div>
                        )}

                        {providerInfo?.fields.includes('adUnitId') && (
                          <div>
                            <label className="block text-sm text-purple-300 mb-1.5">Reklam Birimi ID</label>
                            <input
                              type="text"
                              value={form.adUnitId ?? network.adUnitId ?? ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, [network.id]: { ...prev[network.id], adUnitId: e.target.value } }))}
                              className="w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-lg p-3 text-white text-sm focus:border-gold-500 focus:outline-none"
                              placeholder={providerInfo.placeholders.adUnitId || ''}
                            />
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => handleDelete(network.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Sil
                          </button>
                          <button
                            onClick={() => handleSave(network)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-black rounded-lg font-medium text-sm transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
