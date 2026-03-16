'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { 
  Settings, Save, Loader2, Eye, EyeOff, 
  MessageCircle, Gamepad2, Users, Gift, BookOpen, 
  Sparkles, Home, User, LayoutDashboard, Crown,
  ArrowLeft, CheckCircle, Info
} from 'lucide-react'
import Link from 'next/link'

interface SectionSetting {
  key: string
  nameTr: string
  nameEn: string
  icon: React.ReactNode
  enabled: boolean
}

export default function AnnouncementSettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [sections, setSections] = useState<SectionSetting[]>([
    { key: 'home', nameTr: 'Ana Sayfa', nameEn: 'Home', icon: <Home className="w-5 h-5" />, enabled: true },
    { key: 'chat', nameTr: 'Fal Sohbet', nameEn: 'Fortune Chat', icon: <MessageCircle className="w-5 h-5" />, enabled: true },
    { key: 'fortunes', nameTr: 'Fallar', nameEn: 'Fortunes', icon: <Sparkles className="w-5 h-5" />, enabled: true },
    { key: 'games', nameTr: 'Oyun Merkezi', nameEn: 'Game Center', icon: <Gamepad2 className="w-5 h-5" />, enabled: true },
    { key: 'social', nameTr: 'Sosyal', nameEn: 'Social', icon: <Users className="w-5 h-5" />, enabled: true },
    { key: 'gifts', nameTr: 'Hediyeler', nameEn: 'Gifts', icon: <Gift className="w-5 h-5" />, enabled: true },
    { key: 'blog', nameTr: 'Blog', nameEn: 'Blog', icon: <BookOpen className="w-5 h-5" />, enabled: true },
    { key: 'live-tellers', nameTr: 'Canlı Falcı', nameEn: 'Live Tellers', icon: <Sparkles className="w-5 h-5" />, enabled: true },
    { key: 'memberships', nameTr: 'Üyelik', nameEn: 'Memberships', icon: <Crown className="w-5 h-5" />, enabled: true },
    { key: 'profile', nameTr: 'Profil', nameEn: 'Profile', icon: <User className="w-5 h-5" />, enabled: false },
    { key: 'dashboard', nameTr: 'Panel', nameEn: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, enabled: false },
  ])

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
          if (data.sections) {
            setSections(prev => prev.map(s => ({
              ...s,
              enabled: data.sections[s.key] !== false
            })))
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

  const toggleSection = (key: string) => {
    setSections(prev => prev.map(s => 
      s.key === key ? { ...s, enabled: !s.enabled } : s
    ))
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const sectionsObj: Record<string, boolean> = {}
      sections.forEach(s => { sectionsObj[s.key] = s.enabled })
      
      const res = await fetch('/api/admin/announcement-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: sectionsObj })
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
    <div className="min-h-screen bg-[#0a0118] text-white">
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
              ? 'VIP ve yetkili kullanıcıların giriş duyurularının hangi sayfalarda gösterileceğini ayarlayın' 
              : 'Configure which pages will show entry announcements for VIP and authorized users'}
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
                ? 'Gold, Diamond, Premium üyeler ve Admin, Moderatör, Site Yöneticisi rolündeki kullanıcıların giriş duyuruları aktif edilen sayfalarda gösterilir.' 
                : 'Entry announcements for Gold, Diamond, Premium members and Admin, Moderator, Site Manager roles are shown on enabled pages.'}
            </p>
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((section, index) => (
            <motion.button
              key={section.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleSection(section.key)}
              className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                section.enabled
                  ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/50 hover:border-green-400/70'
                  : 'bg-gray-900/30 border-gray-600/30 hover:border-gray-500/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                section.enabled
                  ? 'bg-green-600/30 text-green-400'
                  : 'bg-gray-700/30 text-gray-500'
              }`}>
                {section.icon}
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${
                  section.enabled ? 'text-white' : 'text-gray-400'
                }`}>
                  {language === 'tr' ? section.nameTr : section.nameEn}
                </p>
                <p className={`text-xs ${
                  section.enabled ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {section.enabled 
                    ? (language === 'tr' ? 'Duyuru açık' : 'Announcements on')
                    : (language === 'tr' ? 'Duyuru kapalı' : 'Announcements off')}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                section.enabled
                  ? 'bg-green-500/30'
                  : 'bg-gray-700/30'
              }`}>
                {section.enabled 
                  ? <Eye className="w-4 h-4 text-green-400" />
                  : <EyeOff className="w-4 h-4 text-gray-500" />
                }
              </div>
            </motion.button>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
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
