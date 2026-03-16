'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { 
  Settings, Save, Loader2, 
  MessageCircle, Gamepad2, Users, Gift, BookOpen, 
  Sparkles, Home, User, LayoutDashboard, Crown,
  ArrowLeft, CheckCircle, Info, Shield, Star, Gem, Check
} from 'lucide-react'
import Link from 'next/link'

// User categories that can have announcement visibility settings
const USER_CATEGORIES = [
  { key: 'admin', nameTr: 'Admin', nameEn: 'Admin', icon: '👑', color: 'from-red-500 to-orange-500' },
  { key: 'moderator', nameTr: 'Moderatör', nameEn: 'Moderator', icon: '🛡️', color: 'from-blue-500 to-cyan-500' },
  { key: 'site_manager', nameTr: 'Site Yöneticisi', nameEn: 'Site Manager', icon: '⚙️', color: 'from-purple-500 to-pink-500' },
  { key: 'diamond', nameTr: 'Diamond Üye', nameEn: 'Diamond Member', icon: '💎', color: 'from-cyan-400 to-blue-400' },
  { key: 'gold', nameTr: 'Gold Üye', nameEn: 'Gold Member', icon: '🥇', color: 'from-yellow-400 to-amber-500' },
  { key: 'premium', nameTr: 'Premium Üye', nameEn: 'Premium Member', icon: '⭐', color: 'from-violet-500 to-purple-500' },
]

// Page sections
const SECTIONS = [
  { key: 'home', nameTr: 'Ana Sayfa', nameEn: 'Home', icon: <Home className="w-4 h-4" /> },
  { key: 'chat', nameTr: 'Fal Sohbet', nameEn: 'Fortune Chat', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'fortunes', nameTr: 'Fallar', nameEn: 'Fortunes', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'games', nameTr: 'Oyunlar', nameEn: 'Games', icon: <Gamepad2 className="w-4 h-4" /> },
  { key: 'social', nameTr: 'Sosyal', nameEn: 'Social', icon: <Users className="w-4 h-4" /> },
  { key: 'gifts', nameTr: 'Hediyeler', nameEn: 'Gifts', icon: <Gift className="w-4 h-4" /> },
  { key: 'blog', nameTr: 'Blog', nameEn: 'Blog', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'live-tellers', nameTr: 'Canlı Falcı', nameEn: 'Live Tellers', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'memberships', nameTr: 'Üyelik', nameEn: 'Memberships', icon: <Crown className="w-4 h-4" /> },
  { key: 'profile', nameTr: 'Profil', nameEn: 'Profile', icon: <User className="w-4 h-4" /> },
  { key: 'dashboard', nameTr: 'Panel', nameEn: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
]

// Type for per-category settings: { categoryKey: { sectionKey: boolean } }
type CategorySectionSettings = Record<string, Record<string, boolean>>

export default function AnnouncementSettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  
  // Initialize with all sections enabled for all categories
  const [settings, setSettings] = useState<CategorySectionSettings>(() => {
    const initial: CategorySectionSettings = {}
    USER_CATEGORIES.forEach(cat => {
      initial[cat.key] = {}
      SECTIONS.forEach(sec => {
        // Default: staff see everywhere, members see only home
        if (['admin', 'moderator', 'site_manager'].includes(cat.key)) {
          initial[cat.key][sec.key] = true
        } else {
          initial[cat.key][sec.key] = sec.key === 'home'
        }
      })
    })
    return initial
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin', 'moderator', 'site_manager'].includes((session.user as { role?: string }).role || '')) {
      router.push(`/${language}/login`)
      return
    }
    
    // Load existing settings
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
                  merged[catKey] = { ...merged[catKey], ...data.categorySettings[catKey] }
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
        [sectionKey]: !prev[categoryKey][sectionKey]
      }
    }))
    setSaveSuccess(false)
  }

  const toggleAllSections = (categoryKey: string, enabled: boolean) => {
    setSettings(prev => {
      const newCat: Record<string, boolean> = {}
      SECTIONS.forEach(sec => { newCat[sec.key] = enabled })
      return { ...prev, [categoryKey]: newCat }
    })
    setSaveSuccess(false)
  }

  const getEnabledCount = (categoryKey: string): number => {
    return Object.values(settings[categoryKey] || {}).filter(Boolean).length
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/announcement-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySettings: settings })
      })
      
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save announcement settings:', error)
    } finally {
      setSaving(false)
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
    <div className="min-h-screen bg-[#0a0118] text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 border-b border-fuchsia-500/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/${language}/admin`}
              className="p-2 rounded-lg bg-purple-800/30 border border-purple-500/30 hover:bg-purple-700/40 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-fuchsia-300" />
            </Link>
            <Settings className="w-6 h-6 text-fuchsia-400" />
            <h1 className="text-xl font-bold text-white">
              {language === 'tr' ? 'Giriş Duyurusu Ayarları' : 'Entry Announcement Settings'}
            </h1>
          </div>
          <p className="text-fuchsia-300/70 text-sm ml-12">
            {language === 'tr' 
              ? 'Her kullanıcı tipi için duyuruların hangi sayfalarda görüneceğini seçin' 
              : 'Select which pages will show announcements for each user type'}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-200 text-sm">
              {language === 'tr' 
                ? 'Her kullanıcı grubu için ayrı ayrı hangi sayfalarda giriş duyurusu gösterileceğini ayarlayabilirsiniz. Örneğin Gold üyeler sadece ana sayfada duyuru gösterebilir.' 
                : 'You can configure which pages show entry announcements for each user group separately. For example, Gold members can show announcements only on the homepage.'}
            </p>
          </div>
        </div>
      </div>

      {/* User Categories */}
      <div className="max-w-4xl mx-auto px-4 py-2 space-y-3">
        {USER_CATEGORIES.map((category, catIndex) => {
          const isExpanded = expandedCategory === category.key
          const enabledCount = getEnabledCount(category.key)
          const allEnabled = enabledCount === SECTIONS.length
          const noneEnabled = enabledCount === 0
          
          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.05 }}
              className="rounded-xl border border-purple-500/30 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.2) 0%, rgba(30, 10, 60, 0.4) 100%)'
              }}
            >
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.key)}
                className="w-full p-4 flex items-center gap-3 hover:bg-purple-900/20 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center text-xl shadow-lg`}>
                  {category.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">
                    {language === 'tr' ? category.nameTr : category.nameEn}
                  </p>
                  <p className="text-xs text-purple-300">
                    {enabledCount} / {SECTIONS.length} {language === 'tr' ? 'sayfa aktif' : 'pages active'}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  allEnabled 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : noneEnabled 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                }`}>
                  {allEnabled 
                    ? (language === 'tr' ? 'Tümü Açık' : 'All On')
                    : noneEnabled
                      ? (language === 'tr' ? 'Tümü Kapalı' : 'All Off')
                      : (language === 'tr' ? 'Özel' : 'Custom')
                  }
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="text-fuchsia-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </button>

              {/* Expanded Section Grid */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-purple-500/20 p-4"
                >
                  {/* Quick Actions */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => toggleAllSections(category.key, true)}
                      className="px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 text-xs font-medium hover:bg-green-600/30 transition-colors"
                    >
                      {language === 'tr' ? 'Tümünü Aç' : 'Enable All'}
                    </button>
                    <button
                      onClick={() => toggleAllSections(category.key, false)}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-600/30 transition-colors"
                    >
                      {language === 'tr' ? 'Tümünü Kapat' : 'Disable All'}
                    </button>
                  </div>

                  {/* Section Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {SECTIONS.map((section) => {
                      const isEnabled = settings[category.key]?.[section.key] ?? false
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
                            {language === 'tr' ? section.nameTr : section.nameEn}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Save Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0118] via-[#0a0118] to-transparent">
        <div className="max-w-4xl mx-auto flex justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${
              saveSuccess
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {language === 'tr' ? 'Kaydediliyor...' : 'Saving...'}
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                {language === 'tr' ? 'Kaydedildi!' : 'Saved!'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
