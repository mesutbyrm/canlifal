'use client'

import AdminBackButton from '@/components/admin-back-button'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Palette,
  Save,
  Loader2,
  Check,
  Wand2,
  Globe,
  Sparkles,
  Star,
  Eye,
  EyeOff,
  Settings2,
  Sun,
  Moon
} from 'lucide-react'

interface ThemeConfig {
  id: string
  name: string
  nameTr: string
  description: string
  descriptionTr: string
  enabled: boolean
  isDefault: boolean
  icon: React.ReactNode
  previewColors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
}

const THEMES: ThemeConfig[] = [
  {
    id: 'mystical',
    name: 'Mystical',
    nameTr: 'Mistik',
    description: 'Classic purple and gold mystical theme',
    descriptionTr: 'Klasik mor ve altın mistik tema',
    enabled: true,
    isDefault: true,
    icon: <Wand2 className="w-6 h-6" />,
    previewColors: {
      primary: '#7c3aed',
      secondary: '#a855f7',
      background: '#0a0118',
      text: '#faf5ff',
      accent: '#d97706'
    }
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    nameTr: 'Kozmik',
    description: 'Dark space theme with blue and amber accents',
    descriptionTr: 'Mavi ve amber vurgulu karanlık uzay teması',
    enabled: true,
    isDefault: false,
    icon: <Sparkles className="w-6 h-6" />,
    previewColors: {
      primary: '#3b82f6',
      secondary: '#1e3a8a',
      background: '#0a1628',
      text: '#e2e8f0',
      accent: '#fcd34d'
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    nameTr: 'Facebook',
    description: 'Clean blue and white social media style',
    descriptionTr: 'Temiz mavi ve beyaz sosyal medya tarzı',
    enabled: true,
    isDefault: false,
    icon: <Globe className="w-6 h-6" />,
    previewColors: {
      primary: '#1877f2',
      secondary: '#166fe5',
      background: '#f0f2f5',
      text: '#1c1e21',
      accent: '#1877f2'
    }
  },
  {
    id: 'falci',
    name: 'Falcı',
    nameTr: 'Falcı',
    description: 'Premium purple starry theme with white cards',
    descriptionTr: 'Premium mor yıldızlı tema, beyaz kartlar ile',
    enabled: true,
    isDefault: false,
    icon: <Star className="w-6 h-6" />,
    previewColors: {
      primary: '#4f46e5',
      secondary: '#818cf8',
      background: '#1a0a2e',
      text: '#1f2937',
      accent: '#6366f1'
    }
  },
  {
    id: 'falclub',
    name: 'FalClub',
    nameTr: 'FalClub',
    description: 'Premium neon pink mystical theme with glow effects',
    descriptionTr: 'Premium neon pembe mistik tema, parlama efektleri ile',
    enabled: true,
    isDefault: false,
    icon: <Sparkles className="w-6 h-6" />,
    previewColors: {
      primary: '#d946ef',
      secondary: '#ec4899',
      background: '#0f0520',
      text: '#ffffff',
      accent: '#f0abfc'
    }
  }
]

export default function AdminThemesPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [themes, setThemes] = useState<ThemeConfig[]>(THEMES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [defaultTheme, setDefaultTheme] = useState('mystical')
  const [enabledThemes, setEnabledThemes] = useState<string[]>(['mystical', 'cosmic', 'facebook', 'falci', 'falclub'])
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      router.push(`/giris`)
      return
    }
    fetchThemeSettings()
  }, [session, status])

  const fetchThemeSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.default_theme) {
          setDefaultTheme(data.default_theme)
        }
        if (data.enabled_themes) {
          try {
            const parsed = JSON.parse(data.enabled_themes)
            if (Array.isArray(parsed)) {
              setEnabledThemes(parsed)
            }
          } catch {
            // Keep default enabled themes
          }
        }
        if (data.color_mode === 'light' || data.color_mode === 'dark') {
          setColorMode(data.color_mode)
        }
      }
    } catch (err) {
      console.error('Fetch theme settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Save default theme
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_theme', value: defaultTheme })
      })

      // Save enabled themes
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'enabled_themes', value: JSON.stringify(enabledThemes) })
      })

      // Save color mode
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'color_mode', value: colorMode })
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save theme settings error:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleTheme = (themeId: string) => {
    if (themeId === defaultTheme) {
      alert('Varsayılan tema devre dışı bırakılamaz!')
      return
    }
    setEnabledThemes(prev => 
      prev.includes(themeId) 
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    )
  }

  const setAsDefault = (themeId: string) => {
    if (!enabledThemes.includes(themeId)) {
      setEnabledThemes(prev => [...prev, themeId])
    }
    setDefaultTheme(themeId)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton variant="link" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6" label="Admin Paneli" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <Palette className="w-8 h-8 text-purple-400" />
                {'Tema Yönetimi'}
              </h1>
              <p className="text-purple-300 mt-2">
                {'Site temalarını yönetin, aktif/pasif yapın ve varsayılan temayı seçin'}
              </p>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : saved ? (
                <Check className="w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saved 
                ? ('Kaydedildi!') 
                : ('Tümünü Kaydet')}
            </button>
          </div>
        </motion.div>

        {/* Default Theme Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 rounded-xl border border-purple-500/30 p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Settings2 className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                {'Varsayılan Tema'}
              </h3>
              <p className="text-purple-400">
                {'Yeni kullanıcılar ve misafirler için varsayılan tema'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-purple-500/30 text-purple-200 rounded-lg font-medium">
                {THEMES.find(t => t.id === defaultTheme)?.['nameTr'] || defaultTheme}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Color Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 rounded-xl border border-purple-500/30 p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              {colorMode === 'dark' ? (
                <Moon className="w-6 h-6 text-purple-400" />
              ) : (
                <Sun className="w-6 h-6 text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                Renk Modu
              </h3>
              <p className="text-purple-400 text-sm">
                Sitenin açık veya koyu temada görünmesini kontrol edin
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setColorMode('dark')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  colorMode === 'dark'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                }`}
              >
                <Moon className="w-4 h-4" />
                Koyu
              </button>
              <button
                onClick={() => setColorMode('light')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  colorMode === 'light'
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                    : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                }`}
              >
                <Sun className="w-4 h-4" />
                Açık
              </button>
            </div>
          </div>
        </motion.div>

        {/* Theme Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {THEMES.map((theme, index) => {
            const isEnabled = enabledThemes.includes(theme.id)
            const isDefault = defaultTheme === theme.id

            return (
              <motion.div
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isEnabled 
                    ? 'bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 border-purple-500/30' 
                    : 'bg-gradient-to-br from-gray-900/50 to-gray-950/50 border-gray-700/30 opacity-60'
                }`}
              >
                {/* Theme Preview */}
                <div 
                  className="h-32 relative flex items-center justify-center gap-3"
                  style={{ background: theme.previewColors.background }}
                >
                  {/* Preview circles */}
                  <div 
                    className="w-12 h-12 rounded-full shadow-lg"
                    style={{ background: theme.previewColors.primary }}
                  />
                  <div 
                    className="w-10 h-10 rounded-full shadow-lg"
                    style={{ background: theme.previewColors.secondary }}
                  />
                  <div 
                    className="w-8 h-8 rounded-full shadow-lg"
                    style={{ background: theme.previewColors.accent }}
                  />

                  {/* Status badges */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {isDefault && (
                      <span className="px-3 py-1 bg-yellow-500/90 text-black text-xs font-bold rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {'VARSAYILAN'}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      isEnabled 
                        ? 'bg-green-500/90 text-white' 
                        : 'bg-red-500/90 text-white'
                    }`}>
                      {isEnabled 
                        ? ('AKTİF') 
                        : ('PASİF')}
                    </span>
                  </div>
                </div>

                {/* Theme Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700/20 text-gray-500'
                      }`}>
                        {theme.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {theme.nameTr}
                        </h3>
                        <p className="text-sm text-purple-400">
                          {theme.descriptionTr}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-purple-400">
                      {'Renkler:'}
                    </span>
                    <div className="flex gap-1">
                      {Object.values(theme.previewColors).map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border border-white/20"
                          style={{ background: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTheme(theme.id)}
                      className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        isEnabled
                          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          {'Devre Dışı Bırak'}
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          {'Etkinleştir'}
                        </>
                      )}
                    </button>
                    
                    {!isDefault && (
                      <button
                        onClick={() => setAsDefault(theme.id)}
                        className="flex-1 py-2 px-4 rounded-lg bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Star className="w-4 h-4" />
                        {'Varsayılan Yap'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-blue-900/30 border border-blue-500/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sun className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-blue-300 font-medium mb-2">
                {'Tema Ayarları Hakkında'}
              </h4>
              <ul className="text-blue-200/80 text-sm space-y-1">
                <li>• {'Varsayılan tema, yeni kullanıcılar ve giriş yapmamış ziyaretçiler için uygulanır.'}
                </li>
                <li>• {'Devre dışı bırakılan temalar, kullanıcı ayarlarında görünmez.'}
                </li>
                <li>• {'Varsayılan tema devre dışı bırakılamaz.'}
                </li>
                <li>• {'Giriş yapmış kullanıcılar kendi tercihlerini korur.'}
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
