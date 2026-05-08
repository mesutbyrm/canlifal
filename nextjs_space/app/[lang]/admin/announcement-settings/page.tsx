'use client'

import AdminBackButton from '@/components/admin-back-button'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { 
  Settings, Save, Loader2, 
  MessageCircle, Gamepad2, Users, Gift, BookOpen, 
  Sparkles, Home, User, LayoutDashboard, Crown,
  CheckCircle, Info, Check, ToggleLeft, ToggleRight, RefreshCw,
  Timer, Eye, Palette, Zap, Play, MapPin, Trophy, Mic, Share2, Star, PlusCircle, Trash2, Type,
  Upload, ImageIcon, X
} from 'lucide-react'
import Image from 'next/image'
import AnnouncementPageMockup, { PAGE_PLACEMENTS, PageType } from '@/components/admin/announcement-page-mockup'

// ── Sayfa Bazlı Konum Varsayılanları ──
type PagePlacementValue = { position: string; effect: string }
const DEFAULT_PAGE_PLACEMENTS: Record<PageType, PagePlacementValue> = {
  home: { position: 'over-streams', effect: 'fade' },
  voice: { position: 'below-announcement', effect: 'fade' },
  live: { position: 'over-video', effect: 'fade' },
  default: { position: 'top', effect: 'slide' },
}

// ── Geçiş Efekti Tanımları ──
const TRANSITION_EFFECTS = [
  { key: 'fade', label: '🌟 Belir & Kaybol', desc: 'Yumuşak geçişle belirir, kaybolur' },
  { key: 'slide', label: '⬇️ Yukarıdan Kayma', desc: 'Üstten aşağı kayarak gelir' },
  { key: 'slideLeft', label: '⬅️ Soldan Kayma', desc: 'Sol taraftan kayarak gelir' },
  { key: 'slideRight', label: '➡️ Sağdan Kayma', desc: 'Sağ taraftan kayarak gelir' },
  { key: 'flash', label: '⚡ Parlak Flash', desc: 'Parlak ışık efektiyle belirir' },
  { key: 'zoom', label: '🔍 Zoom Efekti', desc: 'Küçükten büyüyerek gelir' },
  { key: 'bounce', label: '🏀 Zıplama', desc: 'Zıplayarak yerine oturur' },
  { key: 'typewriter', label: '⌨️ Daktilo', desc: 'Harfleri tek tek yazar' },
  { key: 'glow', label: '💡 Neon Glow', desc: 'Neon ışıkla parlayarak belirir' },
  { key: 'shake', label: '📳 Titreme', desc: 'Titreşerek dikkat çeker' },
  { key: 'wave', label: '🌊 Dalga', desc: 'Dalga hareketi ile belirir' },
  { key: 'flipX', label: '🔄 Yatay Döndürme', desc: 'X ekseninde dönerek gelir' },
  { key: 'elastic', label: '🪀 Elastik', desc: 'Lastik gibi esneyerek yerine oturur' },
]

// ── Etkinlik Şablon Tipleri ──
const EVENT_TYPES = [
  { key: 'game_win', label: '🏆 Oyun Kazanma', desc: 'Oyun kazandığında duyuru', icon: Trophy, placeholder: '{user} SOS oyununda 1. oldu! Tebrikler! 🎉' },
  { key: 'gift_sent', label: '🎁 Hediye Gönderimi', desc: 'Hediye atıldığında duyuru', icon: Gift, placeholder: '{user} {gift} hediye etti! 💝' },
  { key: 'voice_room_join', label: '🎙️ Sesli Oda Girişi', desc: 'Sesli odaya girildiğinde duyuru', icon: Mic, placeholder: '{user} {room} sesli odasına katıldı! 🎤' },
  { key: 'social_post', label: '📝 Sosyal Paylaşım', desc: 'Paylaşım yapıldığında duyuru', icon: Share2, placeholder: '{user} sosyal alanda paylaşımda bulundu! 📢' },
  { key: 'fortune_reading', label: '🔮 Fal Baktırma', desc: 'Fal baktırdığında duyuru', icon: Star, placeholder: '{user} {fortune} baktırdı! ✨' },
]

interface EventTemplate {
  enabled: boolean
  messageTemplate: string
  transitionEffect: string
  duration: number
  maxPasses: number
  targetType: 'all' | 'groups'
  targetGroups: string[]
}

const DEFAULT_EVENT_TEMPLATE: EventTemplate = {
  enabled: false,
  messageTemplate: '',
  transitionEffect: 'fade',
  duration: 4,
  maxPasses: 1,
  targetType: 'all',
  targetGroups: []
}

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

// ── Takım Renkleri ──
const TEAM_COLORS_PREVIEW = [
  { key: 'default', name: 'Türkiye 🇹🇷', emoji: '🇹🇷', bg: 'linear-gradient(135deg, #c8102e 0%, #1a0000 50%, #c8102e 100%)', border: 'border-red-500/40', label: 'Varsayılan', sub: 'Takımı olmayan' },
  { key: 'Galatasaray', name: 'Galatasaray', emoji: '🦁', bg: 'linear-gradient(135deg, #cc0000 0%, #b8860b 50%, #cc0000 100%)', border: 'border-yellow-500/40', label: 'GS', sub: 'Kırmızı-Sarı' },
  { key: 'Fenerbahçe', name: 'Fenerbahçe', emoji: '🐤', bg: 'linear-gradient(135deg, #000066 0%, #b8860b 50%, #000066 100%)', border: 'border-blue-500/40', label: 'FB', sub: 'Lacivert-Sarı' },
  { key: 'Beşiktaş', name: 'Beşiktaş', emoji: '🦅', bg: 'linear-gradient(135deg, #1a1a1a 0%, #444 50%, #1a1a1a 100%)', border: 'border-white/30', label: 'BJK', sub: 'Siyah-Beyaz' },
  { key: 'Trabzonspor', name: 'Trabzonspor', emoji: '⚓', bg: 'linear-gradient(135deg, #660022 0%, #003366 50%, #660022 100%)', border: 'border-purple-500/40', label: 'TS', sub: 'Bordo-Mavi' },
  { key: 'Başakşehir', name: 'Başakşehir', emoji: '🏟️', bg: 'linear-gradient(135deg, #f26522 0%, #1a1a6e 50%, #f26522 100%)', border: 'border-orange-500/40', label: 'IBFK', sub: 'Turuncu-Lacivert' },
  { key: 'Adana Demirspor', name: 'Adana Demir', emoji: '⚽', bg: 'linear-gradient(135deg, #003da5 0%, #ff8c00 50%, #003da5 100%)', border: 'border-blue-400/40', label: 'ADS', sub: 'Mavi-Turuncu' },
  { key: 'Antalyaspor', name: 'Antalyaspor', emoji: '⚽', bg: 'linear-gradient(135deg, #cc0000 0%, #fff 50%, #cc0000 100%)', border: 'border-red-400/40', label: 'ANT', sub: 'Kırmızı-Beyaz' },
]

interface CategoryConfig {
  approved: boolean
  maxPasses: number
  sections: Record<string, boolean>
}

interface GiftAnnouncementSettings {
  enabled: boolean
  maxPasses: number
  expireMinutes: number
  minAmount: number
  selectedGiftTypes: string[]
}

interface GiftTypeOption {
  id: string
  name: string
  icon: string
  price: number
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
  
  // General announcement settings
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)
  const [announcementDuration, setAnnouncementDuration] = useState(2)
  const [announcementStyle, setAnnouncementStyle] = useState('fade')
  const [displayMode, setDisplayMode] = useState<'fullwidth' | 'box'>('fullwidth')
  const [boxPadding, setBoxPadding] = useState(25)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savedGeneral, setSavedGeneral] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'gifts' | 'placement' | 'events'>('general')
  
  // Event templates
  const [eventTemplates, setEventTemplates] = useState<Record<string, EventTemplate>>(() => {
    const initial: Record<string, EventTemplate> = {}
    EVENT_TYPES.forEach(et => { initial[et.key] = { ...DEFAULT_EVENT_TEMPLATE, messageTemplate: et.placeholder } })
    return initial
  })
  const [savingEvents, setSavingEvents] = useState(false)
  const [savedEvents, setSavedEvents] = useState(false)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  
  // Chat marquee settings
  const [marqueeEffect, setMarqueeEffect] = useState('scroll-left')
  const [marqueeSpeed, setMarqueeSpeed] = useState('10')
  const [marqueeRepeat, setMarqueeRepeat] = useState('0')
  const [marqueeEnabled, setMarqueeEnabled] = useState(true)
  const [savingMarquee, setSavingMarquee] = useState(false)
  const [savedMarquee, setSavedMarquee] = useState(false)

  // Page-specific placement settings
  const [pagePlacements, setPagePlacements] = useState<Record<PageType, PagePlacementValue>>(DEFAULT_PAGE_PLACEMENTS)
  const [savingPagePlacements, setSavingPagePlacements] = useState(false)
  const [savedPagePlacements, setSavedPagePlacements] = useState(false)

  // Announcement images (location & appearance)
  const [announcementBgImage, setAnnouncementBgImage] = useState('')
  const [announcementIconImage, setAnnouncementIconImage] = useState('')
  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

  const [settings, setSettings] = useState<AllSettings>(() => {
    const initial: AllSettings = {}
    USER_CATEGORIES.forEach(cat => {
      initial[cat.key] = getDefaultConfig(cat.key)
    })
    return initial
  })
  const [giftSettings, setGiftSettings] = useState<GiftAnnouncementSettings>({
    enabled: true, maxPasses: 2, expireMinutes: 3, minAmount: 1000, selectedGiftTypes: []
  })
  const [savingGift, setSavingGift] = useState(false)
  const [savedGift, setSavedGift] = useState(false)
  const [giftTypes, setGiftTypes] = useState<GiftTypeOption[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin', 'yonetici', 'moderator', 'finans', 'site_manager'].includes((session.user as { role?: string }).role || '')) {
      router.push(`/giris`)
      return
    }
    
    const loadSettings = async () => {
      try {
        // Load category settings
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
          if (data.giftAnnouncementSettings) {
            setGiftSettings(prev => ({ ...prev, ...data.giftAnnouncementSettings, selectedGiftTypes: data.giftAnnouncementSettings.selectedGiftTypes || [] }))
          }
        }
      } catch (error) {
        console.error('Failed to load announcement settings:', error)
      }

      // Load general platform settings for announcements
      try {
        const psRes = await fetch('/api/public/announcement-settings')
        if (psRes.ok) {
          const psData = await psRes.json()
          if (psData.entry_announcement_enabled !== undefined) setAnnouncementEnabled(psData.entry_announcement_enabled === 'true')
          if (psData.entry_announcement_duration) setAnnouncementDuration(parseInt(psData.entry_announcement_duration) || 2)
          if (psData.entry_announcement_style) setAnnouncementStyle(psData.entry_announcement_style)
          if (psData.entry_announcement_display_mode) setDisplayMode(psData.entry_announcement_display_mode as 'fullwidth' | 'box')
          if (psData.entry_announcement_box_padding) setBoxPadding(parseInt(psData.entry_announcement_box_padding) || 25)
          if (psData.chat_marquee_enabled !== undefined) setMarqueeEnabled(psData.chat_marquee_enabled === 'true')
          if (psData.chat_marquee_effect) setMarqueeEffect(psData.chat_marquee_effect)
          if (psData.chat_marquee_speed) setMarqueeSpeed(psData.chat_marquee_speed)
          if (psData.chat_marquee_repeat) setMarqueeRepeat(psData.chat_marquee_repeat)
          if (psData.announcement_bg_image) setAnnouncementBgImage(psData.announcement_bg_image)
          if (psData.announcement_icon_image) setAnnouncementIconImage(psData.announcement_icon_image)
          if (psData.announcement_page_placements) {
            try {
              const pp = JSON.parse(psData.announcement_page_placements)
              setPagePlacements(prev => ({ ...prev, ...pp }))
            } catch {}
          }
          if (psData.event_announcement_templates) {
            try {
              const et = JSON.parse(psData.event_announcement_templates)
              setEventTemplates(prev => {
                const merged = { ...prev }
                Object.keys(et).forEach(k => { merged[k] = { ...DEFAULT_EVENT_TEMPLATE, ...et[k] } })
                return merged
              })
            } catch {}
          }
        }
      } catch {}

      // Fetch gift types
      try {
        const gtRes = await fetch('/api/gifts/types')
        if (gtRes.ok) {
          const gtData = await gtRes.json()
          setGiftTypes(gtData.map((g: any) => ({ id: g.id, name: g.name, icon: g.icon, price: g.price })))
        }
      } catch {}
      finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [session, status, router, language])

  // Save general platform settings
  const saveGeneralSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
    } catch (error) {
      console.error('Failed to save setting:', error)
    }
  }

  const handleSaveGeneral = async () => {
    setSavingGeneral(true)
    try {
      await Promise.all([
        saveGeneralSetting('entry_announcement_enabled', announcementEnabled ? 'true' : 'false'),
        saveGeneralSetting('entry_announcement_duration', String(announcementDuration)),
        saveGeneralSetting('entry_announcement_style', announcementStyle),
        saveGeneralSetting('entry_announcement_display_mode', displayMode),
        saveGeneralSetting('entry_announcement_box_padding', String(boxPadding)),
      ])
      setSavedGeneral(true)
      setTimeout(() => setSavedGeneral(false), 3000)
    } catch (error) {
      console.error('Failed to save general settings:', error)
    } finally {
      setSavingGeneral(false)
    }
  }

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

  const handleSaveGiftSettings = async () => {
    setSavingGift(true)
    try {
      const res = await fetch('/api/admin/announcement-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftAnnouncementSettings: giftSettings })
      })
      if (res.ok) {
        setSavedGift(true)
        setTimeout(() => setSavedGift(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save gift settings:', error)
    } finally {
      setSavingGift(false)
    }
  }

  const triggerPreview = () => {
    setPreviewPlaying(false)
    setTimeout(() => setPreviewPlaying(true), 50)
    setTimeout(() => setPreviewPlaying(false), (announcementDuration * 1000) + 500)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  // Save event templates
  const handleSaveEvents = async () => {
    setSavingEvents(true)
    try {
      await saveGeneralSetting('event_announcement_templates', JSON.stringify(eventTemplates))
      setSavedEvents(true)
      setTimeout(() => setSavedEvents(false), 3000)
    } catch (error) {
      console.error('Failed to save event templates:', error)
    } finally {
      setSavingEvents(false)
    }
  }

  // Upload announcement image helper
  const handleAnnouncementImageUpload = async (file: File, type: 'bg' | 'icon') => {
    const setUploading = type === 'bg' ? setUploadingBg : setUploadingIcon
    const setImage = type === 'bg' ? setAnnouncementBgImage : setAnnouncementIconImage
    const settingKey = type === 'bg' ? 'announcement_bg_image' : 'announcement_icon_image'
    setUploading(true)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true })
      })
      if (!presignedRes.ok) throw new Error('Presigned URL alınamadı')
      const { uploadUrl, publicUrl } = await presignedRes.json()
      const signedHeadersMatch = uploadUrl.match(/X-Amz-SignedHeaders=([^&]+)/)
      const signedHeaders = signedHeadersMatch ? decodeURIComponent(signedHeadersMatch[1]) : 'host'
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (signedHeaders.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file })
      if (!uploadRes.ok) throw new Error('Yükleme başarısız')
      setImage(publicUrl)
      await saveGeneralSetting(settingKey, publicUrl)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  // Save page-specific placement settings
  const handleSavePagePlacements = async () => {
    setSavingPagePlacements(true)
    try {
      await saveGeneralSetting('announcement_page_placements', JSON.stringify(pagePlacements))
      setSavedPagePlacements(true)
      setTimeout(() => setSavedPagePlacements(false), 3000)
    } catch (error) {
      console.error('Failed to save page placements:', error)
    } finally {
      setSavingPagePlacements(false)
    }
  }

  // Save placement & marquee settings
  const handleSaveMarquee = async () => {
    setSavingMarquee(true)
    try {
      await Promise.all([
        saveGeneralSetting('entry_announcement_display_mode', displayMode),
        saveGeneralSetting('entry_announcement_box_padding', String(boxPadding)),
        saveGeneralSetting('chat_marquee_enabled', marqueeEnabled ? 'true' : 'false'),
        saveGeneralSetting('chat_marquee_effect', marqueeEffect),
        saveGeneralSetting('chat_marquee_speed', marqueeSpeed),
        saveGeneralSetting('chat_marquee_repeat', marqueeRepeat),
        saveGeneralSetting('announcement_bg_image', announcementBgImage),
        saveGeneralSetting('announcement_icon_image', announcementIconImage),
      ])
      setSavedMarquee(true)
      setTimeout(() => setSavedMarquee(false), 3000)
    } catch (error) {
      console.error('Failed to save marquee settings:', error)
    } finally {
      setSavingMarquee(false)
    }
  }

  const TABS = [
    { key: 'general' as const, label: '⚙️ Genel Ayarlar', icon: Settings },
    { key: 'placement' as const, label: '📍 Konum & Görünüm', icon: MapPin },
    { key: 'events' as const, label: '🎯 Etkinlik Şablonları', icon: Zap },
    { key: 'categories' as const, label: '👥 Kullanıcı Grupları', icon: Users },
    { key: 'gifts' as const, label: '🎁 Hediye Duyuruları', icon: Gift },
  ]

  return (
    <div className="min-h-screen text-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 border-b border-fuchsia-500/30 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <AdminBackButton variant="link" className="p-2 rounded-lg bg-purple-800/30 border border-purple-500/30 hover:bg-purple-700/40 transition-colors" label="" />
            <Settings className="w-6 h-6 text-fuchsia-400" />
            <h1 className="text-xl font-bold text-white">
              📢 Giriş Duyurusu Ayarları
            </h1>
          </div>
          <p className="text-fuchsia-300/70 text-sm ml-12">
            Duyuru geçiş efektleri, süre, konum, takım renkleri ve kullanıcı grupları — tek yerden yönetin
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-fuchsia-600/40 to-purple-600/40 border-fuchsia-500/50 text-white shadow-lg shadow-fuchsia-500/10'
                  : 'bg-purple-900/20 border-purple-500/20 text-purple-300 hover:border-purple-400/40 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════ TAB: GENEL AYARLAR ══════════════════════ */}
      {activeTab === 'general' && (
        <div className="max-w-5xl mx-auto px-4 space-y-5">
          {/* Master Toggle + Duration + Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">🔔 Duyuru Sistemi</h3>
                <p className="text-sm text-purple-400 mt-1">Giriş yapan kullanıcıların duyuru bandını kontrol edin</p>
              </div>
              <button
                onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                className="flex-shrink-0"
              >
                {announcementEnabled ? (
                  <ToggleRight className="w-10 h-10 text-green-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-500" />
                )}
              </button>
            </div>

            <div className={`space-y-5 transition-opacity ${announcementEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {/* Duration */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-fuchsia-400" />
                  <span className="text-sm text-purple-200">Ekranda Kalma Süresi:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAnnouncementDuration(Math.max(1, announcementDuration - 1))}
                      className="w-8 h-8 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center font-bold"
                    >−</button>
                    <input
                      type="number" min={1} max={10}
                      value={announcementDuration}
                      onChange={(e) => setAnnouncementDuration(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="w-14 h-8 rounded-lg bg-purple-900/50 border border-purple-500/30 text-white text-center text-sm focus:outline-none focus:border-fuchsia-400"
                    />
                    <button
                      onClick={() => setAnnouncementDuration(Math.min(10, announcementDuration + 1))}
                      className="w-8 h-8 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center font-bold"
                    >+</button>
                  </div>
                  <span className="text-xs text-purple-400">saniye</span>
                </div>
              </div>

              {/* Transition Style */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-fuchsia-400" />
                  <span className="text-sm text-purple-200 font-medium">Geçiş Efekti Seçin:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {TRANSITION_EFFECTS.map(effect => (
                    <button
                      key={effect.key}
                      onClick={() => setAnnouncementStyle(effect.key)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        announcementStyle === effect.key
                          ? 'bg-gradient-to-br from-fuchsia-600/30 to-purple-600/30 border-fuchsia-500/60 shadow-lg shadow-fuchsia-500/10'
                          : 'bg-purple-900/20 border-purple-500/20 hover:border-purple-400/40'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{effect.label}</div>
                      <div className="text-[10px] text-purple-400 mt-0.5">{effect.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-fuchsia-400" />
                    <span className="text-sm text-purple-200 font-medium">Canlı Önizleme</span>
                  </div>
                  <button
                    onClick={triggerPreview}
                    className="px-3 py-1.5 rounded-lg bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-medium hover:bg-fuchsia-600/50 transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Oynat
                  </button>
                </div>
                <div className="w-full h-14 rounded-xl overflow-hidden relative" style={{
                  background: 'linear-gradient(90deg, #1a0000, #c8102e, #e30a17, #c8102e, #1a0000)',
                  backgroundSize: '200% 100%',
                  animation: 'loginBannerBgShift 4s linear infinite'
                }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #e30a17, #ffffff, #e30a17, transparent)' }} />
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #e30a17, #ffffff, #e30a17, transparent)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-extrabold" style={{
                      background: 'linear-gradient(90deg, #ff4444, #ffffff, #e30a17, #ffffff, #ff4444)',
                      backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
                      animation: previewPlaying ? `announcePreview_${announcementStyle} ${announcementDuration}s ease-in-out forwards` : `announcePreview_${announcementStyle} 3s ease-in-out infinite`
                    }}>
                      🇹🇷 Kullanıcı Adı siteye giriş yaptı! 🇹🇷
                    </span>
                  </div>
                </div>
              </div>

              {/* Save General */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveGeneral}
                disabled={savingGeneral}
                className={`w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  savedGeneral
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white'
                }`}
              >
                {savingGeneral ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</>
                ) : savedGeneral ? (
                  <><CheckCircle className="w-4 h-4" /> Genel Ayarlar Kaydedildi!</>
                ) : (
                  <><Save className="w-4 h-4" /> Genel Ayarları Kaydet</>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Team Colors Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-5 h-5 text-fuchsia-400" />
              <h3 className="text-lg font-semibold text-white">🏟️ Takım Renkleri & Logo</h3>
            </div>
            <p className="text-xs text-purple-400 mb-4">Kullanıcının profil ayarlarında seçtiği takıma göre duyuru renkleri otomatik değişir. Takımı olmayan kullanıcılar için Türkiye 🇹🇷 milli takım renkleri kullanılır.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEAM_COLORS_PREVIEW.map(team => (
                <div key={team.key} className={`rounded-xl p-3 text-center border ${team.border} hover:scale-105 transition-transform cursor-default`} style={{ background: team.bg }}>
                  <div className="text-3xl mb-1">{team.emoji}</div>
                  <span className="text-xs text-white font-bold block">{team.name}</span>
                  <p className="text-[10px] text-white/60">{team.sub}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-400 mt-3 text-center">+ Samsunspor, Kayserispor, Sivasspor, Alanyaspor, Konyaspor ve daha fazlası...</p>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════ TAB: KONUM & GÖRÜNÜM ══════════════════════ */}
      {activeTab === 'placement' && (
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          {/* ── Banner Görüntüleme Modu ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-fuchsia-500/30 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(120, 20, 120, 0.2) 0%, rgba(40, 10, 60, 0.4) 100%)' }}>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1"><MapPin className="w-5 h-5 text-fuchsia-400" /> Banner Görüntüleme Modu</h3>
              <p className="text-xs text-purple-300 mb-4">Duyuruların nasıl görüneceğini seçin</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Full-width option */}
                <button onClick={() => setDisplayMode('fullwidth')} className={`p-4 rounded-xl border-2 transition-all text-left ${displayMode === 'fullwidth' ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-lg shadow-fuchsia-500/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
                  <div className="mb-3">
                    <div className="w-full h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 mb-1" />
                    <div className="w-full h-6 rounded bg-gradient-to-r from-fuchsia-500/30 to-purple-500/30 flex items-center justify-center">
                      <span className="text-[8px] text-fuchsia-300">Duyuru Metni</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 mt-1" />
                  </div>
                  <p className="font-semibold text-white text-sm">📐 Tam Genişlik</p>
                  <p className="text-[10px] text-purple-300 mt-1">Ekranın tamamını kaplar, klasik banner</p>
                </button>

                {/* Box mode option */}
                <button onClick={() => setDisplayMode('box')} className={`p-4 rounded-xl border-2 transition-all text-left ${displayMode === 'box' ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-lg shadow-fuchsia-500/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
                  <div className="mb-3 px-3">
                    <div className="w-full h-8 rounded-lg bg-gradient-to-r from-fuchsia-500/30 to-purple-500/30 border border-fuchsia-500/40 flex items-center justify-center shadow-md">
                      <span className="text-[8px] text-fuchsia-300">Duyuru Metni</span>
                    </div>
                  </div>
                  <p className="font-semibold text-white text-sm">📦 Kutu Modu</p>
                  <p className="text-[10px] text-purple-300 mt-1">Ortalanmış kart, kenarlardan boşluk</p>
                </button>
              </div>

              {/* Box padding slider */}
              {displayMode === 'box' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-200">Kenar Boşluğu (Sol/Sağ)</span>
                    <span className="text-sm font-mono text-fuchsia-400 bg-fuchsia-500/20 px-2 py-0.5 rounded">{boxPadding}px</span>
                  </div>
                  <input type="range" min="10" max="80" value={boxPadding} onChange={(e) => setBoxPadding(Number(e.target.value))} className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
                  <div className="flex justify-between text-[10px] text-purple-400 mt-1">
                    <span>10px</span><span>80px</span>
                  </div>
                  {/* Live preview */}
                  <div className="mt-3 border border-dashed border-purple-500/30 rounded-lg p-2 bg-black/30 relative overflow-hidden">
                    <p className="text-[10px] text-purple-400 mb-1 text-center">Önizleme</p>
                    <div className="relative" style={{ padding: `0 ${boxPadding}px` }}>
                      <div className="bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 rounded-lg py-2 px-3 text-center shadow-lg border border-fuchsia-500/30">
                        <span className="text-[10px] text-white">🏆 CanlıFal kullanıcısı SOS oyununda 1. oldu!</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ── Sayfa Bazlı Banner Konumları ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="rounded-xl border border-amber-500/30 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(120, 80, 20, 0.2) 0%, rgba(60, 40, 10, 0.4) 100%)' }}>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-amber-400" /> Sayfa Bazlı Banner Konumu
              </h3>
              <p className="text-xs text-amber-300/80 mb-5">Her sayfa türü için duyuru bandının nerede görüneceğini ve hangi efektle geleceğini görsel olarak seçin</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {(Object.keys(PAGE_PLACEMENTS) as PageType[]).map((pageType) => {
                  const cfg = PAGE_PLACEMENTS[pageType]
                  const current = pagePlacements[pageType] || DEFAULT_PAGE_PLACEMENTS[pageType]
                  return (
                    <div key={pageType} className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
                      <div className="mb-3">
                        <p className="text-base font-bold text-white">{cfg.label}</p>
                        <p className="text-[11px] text-amber-300/70">{cfg.desc}</p>
                      </div>

                      {/* Mockup buttons */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {cfg.options.map((opt) => (
                          <AnnouncementPageMockup
                            key={opt.key}
                            pageType={pageType}
                            position={opt.key}
                            effect={current.effect}
                            selected={current.position === opt.key}
                            onClick={() => setPagePlacements(prev => ({ ...prev, [pageType]: { ...prev[pageType], position: opt.key } }))}
                            label={opt.label}
                            desc={opt.desc}
                          />
                        ))}
                      </div>

                      {/* Effect selector */}
                      <div>
                        <label className="text-xs text-amber-200 block mb-1.5">✨ Geçiş Efekti</label>
                        <select
                          value={current.effect}
                          onChange={(e) => setPagePlacements(prev => ({ ...prev, [pageType]: { ...prev[pageType], effect: e.target.value } }))}
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/30 text-white text-xs focus:outline-none focus:border-amber-400"
                        >
                          {TRANSITION_EFFECTS.map(eff => (
                            <option key={eff.key} value={eff.key} className="bg-purple-950">{eff.label} — {eff.desc}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Save Page Placements */}
            <div className="border-t border-amber-500/20 p-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSavePagePlacements} disabled={savingPagePlacements} className={`w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${savedPagePlacements ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'}`}>
                {savingPagePlacements ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : savedPagePlacements ? <><CheckCircle className="w-4 h-4" /> Kaydedildi!</> : <><Save className="w-4 h-4" /> Sayfa Konumlarını Kaydet</>}
              </motion.button>
            </div>
          </motion.div>

          {/* ── Duyuru Görselleri ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-emerald-500/30 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20, 120, 80, 0.2) 0%, rgba(10, 60, 40, 0.4) 100%)' }}>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1"><ImageIcon className="w-5 h-5 text-emerald-400" /> Duyuru Görselleri</h3>
              <p className="text-xs text-emerald-300 mb-4">Banner arka plan resmi ve duyuru ikonu yükleyin</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Background Image Upload */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-black/20">
                  <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    🖼️ Arka Plan Görseli
                  </p>
                  <p className="text-[10px] text-purple-300 mb-3">Duyuru bannerı arkasında görünecek resim</p>
                  
                  {announcementBgImage ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-emerald-500/30 mb-2">
                      <img src={announcementBgImage} alt="Banner arka plan" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => { setAnnouncementBgImage(''); saveGeneralSetting('announcement_bg_image', '') }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg border-2 border-dashed border-emerald-500/30 bg-black/30 flex flex-col items-center justify-center mb-2">
                      <ImageIcon className="w-8 h-8 text-emerald-500/40 mb-1" />
                      <p className="text-[10px] text-purple-400">Henüz görsel yüklenmedi</p>
                    </div>
                  )}
                  
                  <input type="file" ref={bgInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAnnouncementImageUpload(f, 'bg'); e.target.value = '' }} />
                  <button 
                    onClick={() => bgInputRef.current?.click()} 
                    disabled={uploadingBg}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    {uploadingBg ? <><Loader2 className="w-3 h-3 animate-spin" /> Yükleniyor...</> : <><Upload className="w-3 h-3" /> {announcementBgImage ? 'Değiştir' : 'Görsel Yükle'}</>}
                  </button>
                </div>

                {/* Icon Image Upload */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-black/20">
                  <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    ✨ Duyuru İkonu
                  </p>
                  <p className="text-[10px] text-purple-300 mb-3">Duyuru metninin yanında görünecek ikon/logo</p>
                  
                  {announcementIconImage ? (
                    <div className="relative w-24 h-24 mx-auto rounded-xl overflow-hidden border border-emerald-500/30 mb-2">
                      <img src={announcementIconImage} alt="Duyuru ikonu" className="w-full h-full object-contain bg-black/50" />
                      <button 
                        onClick={() => { setAnnouncementIconImage(''); saveGeneralSetting('announcement_icon_image', '') }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-xl border-2 border-dashed border-emerald-500/30 bg-black/30 flex flex-col items-center justify-center mb-2">
                      <Sparkles className="w-6 h-6 text-emerald-500/40 mb-1" />
                      <p className="text-[10px] text-purple-400">Yok</p>
                    </div>
                  )}
                  
                  <input type="file" ref={iconInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAnnouncementImageUpload(f, 'icon'); e.target.value = '' }} />
                  <button 
                    onClick={() => iconInputRef.current?.click()} 
                    disabled={uploadingIcon}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    {uploadingIcon ? <><Loader2 className="w-3 h-3 animate-spin" /> Yükleniyor...</> : <><Upload className="w-3 h-3" /> {announcementIconImage ? 'Değiştir' : 'İkon Yükle'}</>}
                  </button>
                </div>
              </div>

              {/* Preview */}
              {(announcementBgImage || announcementIconImage) && (
                <div className="mt-4 p-3 rounded-lg border border-emerald-500/20 bg-black/30">
                  <p className="text-[10px] text-emerald-400 mb-2 text-center">Önizleme</p>
                  <div className="relative rounded-lg overflow-hidden py-3 px-4 flex items-center gap-3" style={{ background: announcementBgImage ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${announcementBgImage}) center/cover` : 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(236,72,153,0.4))' }}>
                    {announcementIconImage && (
                      <img src={announcementIconImage} alt="" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
                    )}
                    <span className="text-white text-xs font-medium">🏆 CanlıFal kullanıcısı büyük ödülü kazandı!</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Chat Marquee Ayarları ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-cyan-500/30 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20, 80, 120, 0.2) 0%, rgba(10, 30, 60, 0.4) 100%)' }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Type className="w-5 h-5 text-cyan-400" /> Sesli Oda Kayan Yazı</h3>
                  <p className="text-xs text-cyan-300 mt-0.5">Sesli sohbet odalarında kayan duyuru yazısı ayarları</p>
                </div>
                <button onClick={() => setMarqueeEnabled(!marqueeEnabled)} className="flex-shrink-0">
                  {marqueeEnabled ? <ToggleRight className="w-10 h-10 text-green-400" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
                </button>
              </div>

              {marqueeEnabled && (
                <div className="space-y-4">
                  {/* Marquee Effect */}
                  <div>
                    <label className="text-sm text-purple-200 block mb-2">Kayan Yazı Efekti</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'scroll-left', label: '⬅️ Sola Kayma', desc: 'Klasik sağdan sola' },
                        { key: 'scroll-right', label: '➡️ Sağa Kayma', desc: 'Soldan sağa' },
                        { key: 'bounce', label: '🏀 Zıplama', desc: 'İleri geri zıplama' },
                        { key: 'fade-scroll', label: '🌟 Solarak Kayma', desc: 'Kayarken solar' },
                        { key: 'typewriter', label: '⌨️ Daktilo', desc: 'Harf harf yazılır' },
                      ].map(eff => (
                        <button key={eff.key} onClick={() => setMarqueeEffect(eff.key)} className={`p-2.5 rounded-lg border text-left transition-all ${marqueeEffect === eff.key ? 'border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                          <p className="text-xs font-medium text-white">{eff.label}</p>
                          <p className="text-[10px] text-purple-400">{eff.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-purple-200">Hız (saniye)</label>
                      <span className="text-sm font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">{marqueeSpeed}s</span>
                    </div>
                    <input type="range" min="3" max="30" value={marqueeSpeed} onChange={(e) => setMarqueeSpeed(e.target.value)} className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    <div className="flex justify-between text-[10px] text-purple-400 mt-1"><span>3s (hızlı)</span><span>30s (yavaş)</span></div>
                  </div>

                  {/* Repeat */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-purple-200">Tekrar Sayısı</label>
                      <span className="text-sm font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">{marqueeRepeat === '0' ? '♾️ Sonsuz' : `${marqueeRepeat}x`}</span>
                    </div>
                    <input type="range" min="0" max="20" value={marqueeRepeat} onChange={(e) => setMarqueeRepeat(e.target.value)} className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    <div className="flex justify-between text-[10px] text-purple-400 mt-1"><span>0 = Sonsuz</span><span>20x</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Marquee */}
            <div className="border-t border-cyan-500/20 p-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveMarquee} disabled={savingMarquee} className={`w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${savedMarquee ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'}`}>
                {savingMarquee ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : savedMarquee ? <><CheckCircle className="w-4 h-4" /> Kaydedildi!</> : <><Save className="w-4 h-4" /> Konum & Görünüm Ayarlarını Kaydet</>}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════ TAB: ETKİNLİK ŞABLONLARI ══════════════════════ */}
      {activeTab === 'events' && (
        <div className="max-w-5xl mx-auto px-4 space-y-4">
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 mb-2">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 text-sm">Etkinlik şablonları ile oyun kazanma, hediye gönderimi gibi olaylar gerçekleştiğinde otomatik duyuru oluşturulur.</p>
              <p className="text-amber-300/70 text-xs mt-1">Kullanılabilir değişkenler: <code className="bg-black/30 px-1 rounded">{'{user}'}</code> <code className="bg-black/30 px-1 rounded">{'{game}'}</code> <code className="bg-black/30 px-1 rounded">{'{gift}'}</code> <code className="bg-black/30 px-1 rounded">{'{room}'}</code> <code className="bg-black/30 px-1 rounded">{'{fortune}'}</code></p>
            </div>
          </div>

          {EVENT_TYPES.map((eventType, idx) => {
            const template = eventTemplates[eventType.key] || { ...DEFAULT_EVENT_TEMPLATE }
            const IconComp = eventType.icon
            const isEnabled = template.enabled
            
            const updateTemplate = (field: string, value: any) => {
              setEventTemplates(prev => ({
                ...prev,
                [eventType.key]: { ...prev[eventType.key], [field]: value }
              }))
            }

            return (
              <motion.div key={eventType.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`rounded-xl border overflow-hidden transition-all ${isEnabled ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-white/10'}`} style={{ background: isEnabled ? 'linear-gradient(135deg, rgba(160, 100, 20, 0.15) 0%, rgba(60, 30, 10, 0.3) 100%)' : 'rgba(255,255,255,0.03)' }}>
                {/* Header */}
                <div className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow ${isEnabled ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-white/10'}`}>
                    <IconComp className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isEnabled ? 'text-white' : 'text-gray-400'}`}>{eventType.label}</p>
                    <p className="text-[10px] text-purple-400">{eventType.desc}</p>
                  </div>
                  <button onClick={() => updateTemplate('enabled', !isEnabled)} className="flex-shrink-0">
                    {isEnabled ? <ToggleRight className="w-9 h-9 text-green-400" /> : <ToggleLeft className="w-9 h-9 text-gray-500" />}
                  </button>
                </div>

                {/* Body */}
                {isEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-amber-500/20 p-4 space-y-4">
                    {/* Message Template */}
                    <div>
                      <label className="text-xs text-purple-200 block mb-1.5">Mesaj Şablonu</label>
                      <textarea value={template.messageTemplate} onChange={(e) => updateTemplate('messageTemplate', e.target.value)} placeholder={eventType.placeholder} rows={2} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-500/50 focus:outline-none focus:border-amber-500/50 resize-none" />
                      <p className="text-[10px] text-purple-500 mt-1">Örnek: {eventType.placeholder}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Transition Effect */}
                      <div>
                        <label className="text-xs text-purple-200 block mb-1.5">Geçiş Efekti</label>
                        <select value={template.transitionEffect} onChange={(e) => updateTemplate('transitionEffect', e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50">
                          {TRANSITION_EFFECTS.map(eff => (
                            <option key={eff.key} value={eff.key}>{eff.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="text-xs text-purple-200 block mb-1.5">Süre (saniye)</label>
                        <input type="number" min={2} max={15} value={template.duration} onChange={(e) => updateTemplate('duration', Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Max Passes */}
                      <div>
                        <label className="text-xs text-purple-200 block mb-1.5">Gösterim Sayısı</label>
                        <input type="number" min={1} max={10} value={template.maxPasses} onChange={(e) => updateTemplate('maxPasses', Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                      </div>

                      {/* Target Type */}
                      <div>
                        <label className="text-xs text-purple-200 block mb-1.5">Hedef Kitle</label>
                        <select value={template.targetType} onChange={(e) => updateTemplate('targetType', e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50">
                          <option value="all">🌐 Tüm Kullanıcılar</option>
                          <option value="groups">👥 Belirli Gruplar</option>
                        </select>
                      </div>
                    </div>

                    {/* Group checkboxes */}
                    {template.targetType === 'groups' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-black/20 border border-white/10">
                        <p className="text-xs text-purple-300 mb-2">Hangi gruplara gösterilsin?</p>
                        <div className="grid grid-cols-3 gap-2">
                          {USER_CATEGORIES.map(cat => {
                            const isSelected = (template.targetGroups || []).includes(cat.key)
                            return (
                              <button key={cat.key} onClick={() => {
                                const groups = template.targetGroups || []
                                updateTemplate('targetGroups', isSelected ? groups.filter((g: string) => g !== cat.key) : [...groups, cat.key])
                              }} className={`p-2 rounded-lg border text-left transition-all flex items-center gap-1.5 ${isSelected ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                                <span className="text-sm">{cat.icon}</span>
                                <span className="text-[10px] text-white truncate">{cat.nameTr}</span>
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )
          })}

          {/* Save Events */}
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveEvents} disabled={savingEvents} className={`w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${savedEvents ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'}`}>
            {savingEvents ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : savedEvents ? <><CheckCircle className="w-4 h-4" /> Kaydedildi!</> : <><Save className="w-4 h-4" /> Etkinlik Şablonlarını Kaydet</>}
          </motion.button>
        </div>
      )}

      {/* ══════════════════════ TAB: KULLANICI GRUPLARI ══════════════════════ */}
      {activeTab === 'categories' && (
        <div className="max-w-5xl mx-auto px-4 space-y-3">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3 mb-2">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200 text-sm">
              Her kullanıcı grubu için ayrı ayrı onay verebilir, duyurunun kaç kez geçeceğini belirleyebilir ve hangi sayfalarda gösterileceğini seçebilirsiniz.
            </p>
          </div>

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
                      <p className="font-semibold text-white">{category.nameTr}</p>
                      <p className="text-xs text-purple-300">
                        {config.approved ? '✅ Onaylı' : '❌ Onaysız'} · {enabledCount}/{SECTIONS.length} sayfa · {config.maxPasses}x geçiş
                      </p>
                    </div>
                  </button>
                  <button onClick={() => toggleApproved(category.key)} className="flex-shrink-0" title={config.approved ? 'Onayı Kaldır' : 'Onayla'}>
                    {config.approved ? <ToggleRight className="w-8 h-8 text-green-400" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
                  </button>
                  <button onClick={() => setExpandedCategory(isExpanded ? null : category.key)} className="flex-shrink-0">
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-fuchsia-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </motion.div>
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-purple-500/20 p-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-purple-200">Onay:</span>
                        <button onClick={() => toggleApproved(category.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${config.approved ? 'bg-green-600/20 border-green-500/30 text-green-300' : 'bg-red-600/20 border-red-500/30 text-red-300'}`}>
                          {config.approved ? '✅ Onaylı' : '❌ Onaysız'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-purple-300" />
                        <span className="text-sm text-purple-200">Geçiş Sayısı:</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setMaxPasses(category.key, config.maxPasses - 1)} className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold">−</button>
                          <input type="number" min={1} max={20} value={config.maxPasses} onChange={(e) => setMaxPasses(category.key, parseInt(e.target.value) || 1)} className="w-12 h-7 rounded-lg bg-purple-900/50 border border-purple-500/30 text-white text-center text-sm focus:outline-none focus:border-fuchsia-400" />
                          <button onClick={() => setMaxPasses(category.key, config.maxPasses + 1)} className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold">+</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleAllSections(category.key, true)} className="px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 text-xs font-medium hover:bg-green-600/30 transition-colors">Tümünü Aç</button>
                      <button onClick={() => toggleAllSections(category.key, false)} className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-600/30 transition-colors">Tümünü Kapat</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {SECTIONS.map((section) => {
                        const isEnabled = config.sections?.[section.key] ?? false
                        return (
                          <button key={section.key} onClick={() => toggleSection(category.key, section.key)} className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${isEnabled ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/50 hover:border-green-400' : 'bg-gray-900/30 border-gray-600/30 hover:border-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isEnabled ? 'bg-green-500/30 text-green-400' : 'bg-gray-700/30 text-gray-500'}`}>
                              {isEnabled ? <Check className="w-4 h-4" /> : section.icon}
                            </div>
                            <span className={`text-xs font-medium text-center ${isEnabled ? 'text-white' : 'text-gray-400'}`}>{section.nameTr}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="pt-2">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleSaveCategory(category.key)} disabled={isSaving} className={`w-full px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isSaved ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white'}`}>
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : isSaved ? <><CheckCircle className="w-4 h-4" /> Kaydedildi!</> : <><Save className="w-4 h-4" /> {category.nameTr} Ayarlarını Kaydet</>}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════ TAB: HEDİYE DUYURULARI ══════════════════════ */}
      {activeTab === 'gifts' && (
        <div className="max-w-5xl mx-auto px-4 py-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-pink-500/30 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(168, 28, 135, 0.2) 0%, rgba(60, 10, 60, 0.4) 100%)' }}
          >
            <div className="p-5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">🎁</div>
              <div className="flex-1">
                <p className="font-semibold text-white text-lg">Hediye Duyuruları</p>
                <p className="text-xs text-pink-300">Belirlenen kriterlere uyan hediyeler gönderildiğinde otomatik kayan duyuru oluşturulur</p>
              </div>
              <button onClick={() => setGiftSettings(prev => ({ ...prev, enabled: !prev.enabled }))} className="flex-shrink-0">
                {giftSettings.enabled ? <ToggleRight className="w-10 h-10 text-green-400" /> : <ToggleLeft className="w-10 h-10 text-gray-500" />}
              </button>
            </div>

            {giftSettings.enabled && (
              <div className="border-t border-pink-500/20 p-5 space-y-5">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-pink-300" />
                    <span className="text-sm text-pink-200">Geçiş Sayısı:</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setGiftSettings(prev => ({ ...prev, maxPasses: Math.max(1, prev.maxPasses - 1) }))} className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold">−</button>
                      <input type="number" min={1} max={10} value={giftSettings.maxPasses} onChange={(e) => setGiftSettings(prev => ({ ...prev, maxPasses: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))} className="w-12 h-7 rounded-lg bg-purple-900/50 border border-purple-500/30 text-white text-center text-sm focus:outline-none focus:border-fuchsia-400" />
                      <button onClick={() => setGiftSettings(prev => ({ ...prev, maxPasses: Math.min(10, prev.maxPasses + 1) }))} className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-pink-200">⏱️ Süre (dk):</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setGiftSettings(prev => ({ ...prev, expireMinutes: Math.max(1, prev.expireMinutes - 1) }))} className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold">−</button>
                      <input type="number" min={1} max={30} value={giftSettings.expireMinutes} onChange={(e) => setGiftSettings(prev => ({ ...prev, expireMinutes: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) }))} className="w-12 h-7 rounded-lg bg-purple-900/50 border border-purple-500/30 text-white text-center text-sm focus:outline-none focus:border-fuchsia-400" />
                      <button onClick={() => setGiftSettings(prev => ({ ...prev, expireMinutes: Math.min(30, prev.expireMinutes + 1) }))} className="w-7 h-7 rounded-lg bg-purple-800/40 border border-purple-500/30 text-purple-200 hover:bg-purple-700/50 transition-colors flex items-center justify-center text-sm font-bold">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-pink-200">💰 Min Jeton:</span>
                    <input type="number" min={0} max={100000} value={giftSettings.minAmount} onChange={(e) => setGiftSettings(prev => ({ ...prev, minAmount: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-20 h-7 rounded-lg bg-purple-900/50 border border-purple-500/30 text-white text-center text-sm focus:outline-none focus:border-fuchsia-400" />
                  </div>
                </div>

                {giftTypes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-pink-200">🎁 Duyuru Yapılacak Hediye Türleri:</span>
                      <button onClick={() => setGiftSettings(prev => ({ ...prev, selectedGiftTypes: prev.selectedGiftTypes.length === giftTypes.length ? [] : giftTypes.map(g => g.id) }))} className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
                        {giftSettings.selectedGiftTypes.length === giftTypes.length ? 'Tümünü Kaldır' : giftSettings.selectedGiftTypes.length === 0 ? '(Tümü seçili - filtre yok)' : 'Tümünü Seç'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {giftTypes.map(gt => {
                        const isSelected = giftSettings.selectedGiftTypes.length === 0 || giftSettings.selectedGiftTypes.includes(gt.id)
                        return (
                          <button
                            key={gt.id}
                            onClick={() => {
                              setGiftSettings(prev => {
                                let newSelected = [...prev.selectedGiftTypes]
                                if (newSelected.length === 0) { newSelected = giftTypes.filter(g => g.id !== gt.id).map(g => g.id) }
                                else if (newSelected.includes(gt.id)) { newSelected = newSelected.filter(id => id !== gt.id); if (newSelected.length === 0) newSelected = [] }
                                else { newSelected.push(gt.id); if (newSelected.length === giftTypes.length) newSelected = [] }
                                return { ...prev, selectedGiftTypes: newSelected }
                              })
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isSelected ? 'bg-fuchsia-600/40 border-fuchsia-400/60 text-white shadow-md shadow-fuchsia-500/20' : 'bg-purple-900/30 border-purple-600/30 text-purple-400 hover:border-purple-400/50'}`}
                          >
                            <span className="mr-1">{gt.icon}</span> {gt.name} ({gt.price}₺)
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-purple-400">
                      {giftSettings.selectedGiftTypes.length === 0 ? '✨ Tüm hediye türleri duyuru tetikler (filtre yok)' : `✅ ${giftSettings.selectedGiftTypes.length} hediye türü seçili`}
                    </p>
                  </div>
                )}

                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveGiftSettings} disabled={savingGift} className={`w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${savedGift ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white'}`}>
                  {savingGift ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : savedGift ? <><CheckCircle className="w-4 h-4" /> Kaydedildi!</> : <><Save className="w-4 h-4" /> Hediye Duyuru Ayarlarını Kaydet</>}
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      )}


      {/* CSS Animations */}
      <style jsx>{`
        @keyframes announcePreview_fade {
          0%, 100% { opacity: 0; }
          20%, 80% { opacity: 1; }
        }
        @keyframes announcePreview_slide {
          0% { opacity: 0; transform: translateY(-100%); }
          15%, 85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-100%); }
        }
        @keyframes announcePreview_slideLeft {
          0% { opacity: 0; transform: translateX(-100%); }
          15%, 85% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(100%); }
        }
        @keyframes announcePreview_slideRight {
          0% { opacity: 0; transform: translateX(100%); }
          15%, 85% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-100%); }
        }
        @keyframes announcePreview_flash {
          0% { opacity: 0; filter: brightness(3); transform: scale(1.2); }
          15%, 85% { opacity: 1; filter: brightness(1); transform: scale(1); }
          100% { opacity: 0; filter: brightness(3); transform: scale(1.2); }
        }
        @keyframes announcePreview_zoom {
          0% { opacity: 0; transform: scale(0.3); }
          15% { opacity: 1; transform: scale(1.05); }
          25%, 85% { transform: scale(1); opacity: 1; }
          100% { opacity: 0; transform: scale(0.3); }
        }
        @keyframes announcePreview_bounce {
          0% { opacity: 0; transform: translateY(-30px); }
          15% { opacity: 1; transform: translateY(4px); }
          25% { transform: translateY(-2px); }
          35%, 85% { transform: translateY(0); opacity: 1; }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes announcePreview_typewriter {
          0% { clip-path: inset(0 100% 0 0); opacity: 1; }
          50%, 85% { clip-path: inset(0 0 0 0); opacity: 1; }
          100% { clip-path: inset(0 0 0 100%); opacity: 0; }
        }
        @keyframes announcePreview_glow {
          0%, 100% { opacity: 0; text-shadow: none; }
          20% { opacity: 1; text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff; }
          50% { text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff; }
          80% { opacity: 1; text-shadow: 0 0 10px #00ffff; }
        }
        @keyframes announcePreview_shake {
          0%, 100% { opacity: 0; }
          10% { opacity: 1; transform: translateX(-3px); }
          20% { transform: translateX(3px); }
          30% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          50%, 85% { transform: translateX(0); opacity: 1; }
        }
        @keyframes announcePreview_wave {
          0%, 100% { opacity: 0; transform: translateY(5px) rotate(-1deg); }
          15% { opacity: 1; transform: translateY(-2px) rotate(1deg); }
          30% { transform: translateY(1px) rotate(-0.5deg); }
          60%, 85% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
        @keyframes announcePreview_flipX {
          0% { opacity: 0; transform: perspective(400px) rotateY(90deg); }
          15% { opacity: 1; transform: perspective(400px) rotateY(-10deg); }
          25% { transform: perspective(400px) rotateY(5deg); }
          35%, 85% { transform: perspective(400px) rotateY(0deg); opacity: 1; }
          100% { opacity: 0; transform: perspective(400px) rotateY(90deg); }
        }
        @keyframes announcePreview_elastic {
          0% { opacity: 0; transform: scaleX(0.3); }
          10% { opacity: 1; transform: scaleX(1.1); }
          20% { transform: scaleX(0.9); }
          30% { transform: scaleX(1.05); }
          40%, 85% { transform: scaleX(1); opacity: 1; }
          100% { opacity: 0; transform: scaleX(0.3); }
        }
        @keyframes loginBannerBgShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }

      `}</style>
    </div>
  )
}