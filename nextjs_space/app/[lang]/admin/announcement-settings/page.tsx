'use client'

import AdminBackButton from '@/components/admin-back-button'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { 
  Settings, Save, Loader2, 
  MessageCircle, Gamepad2, Users, Gift, BookOpen, 
  Sparkles, Home, User, LayoutDashboard, Crown,
  ArrowLeft, CheckCircle, Info, Check, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

const USER_CATEGORIES = [
  { key: 'admin', nameTr: 'Admin', icon: '👑', color: 'from-red-500 to-orange-500' },
  { key: 'moderator', nameTr: 'Moderatör', icon: '🛡️', color: 'from-blue-500 to-cyan-500' },
  { key: 'site_manager', nameTr: 'Site Yöneticisi', icon: '⚙️', color: 'from-purple-500 to-pink-500' },
  { key: 'diamond', nameTr: 'Diamond Üye', icon: '💎', color: 'from-cyan-400 to-blue-400' },
  { key: 'gold', nameTr: 'Gold Üye', icon: '🥇', color: 'from-yellow-400 to-amber-500' },
  { key: 'premium', nameTr: 'Premium Üye', icon: '⭐', color: 'from-violet-500 to-purple-500' },
]

const SECTIONS = [
  { key: 'home', nameTr: 'Ana Sayfa', icon: <Home className="w-4 h-4" /> },
  { key: 'chat', nameTr: 'Fal Sohbet', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'fortunes', nameTr: 'Fallar', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'games', nameTr: 'Oyunlar', icon: <Gamepad2 className="w-4 h-4" /> },
  { key: 'social', nameTr: 'Sosyal', icon: <Users className="w-4 h-4" /> },
  { key: 'gifts', nameTr: 'Hediyeler', icon: <Gift className="w-4 h-4" /> },
  { key: 'blog', nameTr: 'Blog', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'live-tellers', nameTr: 'Canlı Falcı', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'memberships', nameTr: 'Üyelik', icon: <Crown className="w-4 h-4" /> },
  { key: 'profile', nameTr: 'Profil', icon: <User className="w-4 h-4" /> },
  { key: 'dashboard', nameTr: 'Panel', icon: <LayoutDashboard className="w-4 h-4" /> },
]

interface CategoryConfig {
  approved: boolean
  maxPasses: number
  sections: Record<string, boolean>
}

type AllSettings = Record<string, CategoryConfig>

function getDefaultConfig(catKey: string): CategoryConfig {
  const isStaff = ['admin', 'moderator', 'site_manager'].includes(catKey)
  const sections: Record<string, boolean> = {}
  SECTIONS.forEach(sec => { sections[sec.key] = isStaff ? true : sec.key === 'home' })
  return { approved: true, maxPasses: 1, sections }
}

export default function AnnouncementSettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState<string | null>(null)
  const [savedCategory, setSavedCategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<AllSettings>(() => {
    const initial: AllSettings = {}
    USER_CATEGORIES.forEach(cat => {
      initial[cat.key] = getDefaultConfig(cat.key)
    })
    return initial
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin', 'moderator', 'site_manager'].includes((session.user as { role?: string }).role || '')) {
      router.push(`/giris`)
      return
    }
    
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/announcement-sections')
        if (res.ok) {
          const data = await res.json()
          if (data.categorySettings) {
            setSettings(prev => {
              const merged = { ...prev }
              Object.keys(data.categorySettings).forEach(catKey => {
                if (merged[catKey]) {
                  merged[catKey] = data.categorySettings[catKey]
                }
              })
              return merged
            })
          }
        }
      } catch (error) {
        console.error('Failed to load announcement settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [session, status, router, language])

  const toggleSection = (categoryKey: string, sectionKey: string) => {
    setSettings(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        sections: {
          ...prev[categoryKey].sections,
          [sectionKey]: !prev[categoryKey].sections[sectionKey]
        }
      }
    }))
  }

  const toggleAllSections = (categoryKey: string, enabled: boolean) => {
    setSettings(prev => {
      const newSections: Record<string, boolean> = {}
      SECTIONS.forEach(sec => { newSections[sec.key] = enabled })
      return { ...prev, [categoryKey]: { ...prev[categoryKey], sections: newSections } }
    })
  }

  const toggleApproved = (categoryKey: string) => {
    setSettings(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        approved: !prev[categoryKey].approved
      }
    }))
  }

  const setMaxPasses = (categoryKey: string, value: number) => {
    const clamped = Math.max(1, Math.min(20, value))
    setSettings(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        maxPasses: clamped
      }
    }))
  }

  const getEnabledCount = (categoryKey: string): number => {
    return Object.values(settings[categoryKey]?.sections || {}).filter(Boolean).length
  }

  const handleSaveCategory = async (categoryKey: string) => {
    setSavingCategory(categoryKey)
    try {
      const res = await fetch('/api/admin/announcement-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryKey, categoryConfig: settings[categoryKey] })
      })
      
      if (res.ok) {
        setSavedCategory(categoryKey)
        setTimeout(() => setSavedCategory(null), 3000)
      }
    } catch (error) {
      console.error('Failed to save announcement settings:', error)
    } finally {
      setSavingCategory(null)
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
    <div className="min-h-screen bg-[#0a0118] text-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 border-b border-fuchsia-500/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <AdminBackButton variant="link" className="p-2 rounded-lg bg-purple-800/30 border border-purple-500/30 hover:bg-purple-700/40 transition-colors" label="" />
            <Settings className="w-6 h-6 text-fuchsia-400" />
            <h1 className="text-xl font-bold text-white">
              Giriş Duyurusu Ayarları
            </h1>
          </div>
          <p className="text-fuchsia-300/70 text-sm ml-12">
            Her kullanıcı tipi için duyuru onayı, gösterim sayısı ve hangi sayfalarda görüneceğini ayarlayın
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-blue-200 text-sm">
            Her kullanıcı grubu için ayrı ayrı onay verebilir, duyurunun kaç kez geçeceğini belirleyebilir ve hangi sayfalarda gösterileceğini seçebilirsiniz. Her grubun kendi Kaydet butonu vardır.
          </p>
        </div>
      </div>

      {/* User Categories */}
      <div className="max-w-4xl mx-auto px-4 py-2 space-y-3">
        {USER_CATEGORIES.map((category, catIndex) => {
          const isExpanded = expandedCategory === category.key
          const enabledCount = getEnabledCount(category.key)
          const config = settings[category.key]
          const isSaving = savingCategory === category.key
          const isSaved = savedCategory === category.key
          
          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.05 }}
              className={`rounded-xl border overflow-hidden ${
                config.approved 
                  ? 'border-purple-500/30' 
                  : 'border-red-500/30 opacity-75'
              }`}
              style={{
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.2) 0%, rgba(30, 10, 60, 0.4) 100%)'
              }}
            >
              {/* Category Header */}
              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.key)}
                  className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center text-xl shadow-lg`}>
                    {category.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">
                      {category.nameTr}
                    </p>
                    <p className="text-xs text-purple-300">
                      {config.approved ? '✅ Onaylı' : '❌ Onaysız'} · {enabledCount}/{SECTIONS.length} sayfa · {config.maxPasses}x geçiş
                    </p>
                  </div>
                </button>

                {/* Approve Toggle */}
                <button
                  onClick={() => toggleApproved(category.key)}
                  className="flex-shrink-0"
                  title={config.approved ? 'Onayı Kaldır' : 'Onayla'}
                >
                  {config.approved ? (
                    <ToggleRight className="w-8 h-8 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-500" />
                  )}
                </button>

                {/* Expand Arrow */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.key)}
                  className="flex-shrink-0"
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="text-fuchsia-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-purple-500/20 p-4 space-y-4"
                >
                  {/* Onay + Gösterim Sayısı Row */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Onay Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-purple-200">Onay:</span>
                      <button
                        onClick={() => toggleApproved(category.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          config.approved
                            ? 'bg-green-600/20 border-green-500/30 text-green-300'
                            : 'bg-red-600/20 border-red-500/30 text-red-300'
                        }`}
                      >
                        {config.approved ? '✅ Onaylı' : '❌ Onaysız'}
                      </button>
                    </div>

                    {/* Gösterim Sayısı */}
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-purple-300" />
                      <span className="text-sm text-purple-200">Geçiş Sayısı:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setMaxPasses(category.key, config.maxPasses - 1)}
                          className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={config.maxPasses}
                          onChange={(e) => setMaxPasses(category.key, parseInt(e.target.value) || 1)}
                          className="w-12 h-7 rounded-lg bg-purple-900/50 border border-purple-500/30 text-white text-center text-sm focus:outline-none focus:border-fuchsia-400"
                        />
                        <button
                          onClick={() => setMaxPasses(category.key, config.maxPasses + 1)}
                          className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllSections(category.key, true)}
                      className="px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 text-xs font-medium hover:bg-green-600/30 transition-colors"
                    >
                      Tümünü Aç
                    </button>
                    <button
                      onClick={() => toggleAllSections(category.key, false)}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-600/30 transition-colors"
                    >
                      Tümünü Kapat
                    </button>
                  </div>

                  {/* Section Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {SECTIONS.map((section) => {
                      const isEnabled = config.sections?.[section.key] ?? false
                      return (
                        <button
                          key={section.key}
                          onClick={() => toggleSection(category.key, section.key)}
                          className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                            isEnabled
                              ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/50 hover:border-green-400'
                              : 'bg-gray-900/30 border-gray-600/30 hover:border-gray-500'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isEnabled ? 'bg-green-500/30 text-green-400' : 'bg-gray-700/30 text-gray-500'
                          }`}>
                            {isEnabled ? <Check className="w-4 h-4" /> : section.icon}
                          </div>
                          <span className={`text-xs font-medium text-center ${
                            isEnabled ? 'text-white' : 'text-gray-400'
                          }`}>
                            {section.nameTr}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Per-Category Save Button */}
                  <div className="pt-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSaveCategory(category.key)}
                      disabled={isSaving}
                      className={`w-full px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isSaved
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                          : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : isSaved ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Kaydedildi!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {category.nameTr} Ayarlarını Kaydet
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
