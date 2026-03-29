'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, Plus, Trash2, Edit, Save, X, GripVertical, Eye, EyeOff, Link2, Type, Zap,
  Sparkles, ChevronDown, Palette, ArrowRight, ArrowLeft, ChevronUp, Settings2, Image as ImageIcon
} from 'lucide-react'

// All site links for the link picker
const SITE_LINKS = [
  { value: '/canli-falcilar', label: 'Canlı Falcılar' },
  { value: '/online-fal', label: 'Online Fal' },
  { value: '/fallar', label: 'Fallar (Ana Sayfa)' },
  { value: '/fallar/kahve-fali', label: 'Kahve Falı' },
  { value: '/fallar/tarot-fali', label: 'Tarot Falı' },
  { value: '/fallar/el-fali', label: 'El Falı' },
  { value: '/fallar/ruya-yorumu', label: 'Rüya Yorumu' },
  { value: '/fallar/ask-uyumu', label: 'Aşk Uyumu' },
  { value: '/fallar/burc-yorumu', label: 'Burç Yorumu' },
  { value: '/fallar/numeroloji', label: 'Numeroloji' },
  { value: '/fallar/melek-kartlari', label: 'Melek Kartları' },
  { value: '/fallar/aura-analizi', label: 'Aura Analizi' },
  { value: '/fallar/dogum-haritasi', label: 'Doğum Haritası' },
  { value: '/fallar/katina', label: 'Katina Falı' },
  { value: '/fallar/evet-hayir', label: 'Evet/Hayır' },
  { value: '/fallar/kursundokme', label: 'Kurşun Dökme' },
  { value: '/fallar/istihare', label: 'İstihare' },
  { value: '/sohbet', label: 'Sohbet Odaları' },
  { value: '/sohbet/video', label: 'Video Sohbet' },
  { value: '/sosyal', label: 'Sosyal' },
  { value: '/ruya', label: 'Rüya Tabiri' },
  { value: '/ruya-sozlugu', label: 'Rüya Sözlüğü' },
  { value: '/oyunlar', label: 'Oyunlar' },
  { value: '/blog', label: 'Blog' },
  { value: '/jeton', label: 'Jeton Satın Al' },
  { value: '/uyelik', label: 'Üyelik' },
  { value: '/siralama', label: 'Sıralama' },
  { value: '/profil', label: 'Profil' },
  { value: '/panel', label: 'Panel' },
  { value: '/iletisim', label: 'İletişim' },
  { value: '/hakkimizda', label: 'Hakkımızda' },
]

const EFFECTS = [
  { value: 'none', label: 'Efekt Yok' },
  { value: 'glow', label: 'Parıltı (Glow)' },
  { value: 'pulse', label: 'Nabız (Pulse)' },
  { value: 'rainbow', label: 'Gökkuşağı (Rainbow)' },
  { value: 'neon', label: 'Neon' },
  { value: 'typewriter', label: 'Daktilo (Typewriter)' },
  { value: 'bounce', label: 'Zıplama (Bounce)' },
]

const ICON_OPTIONS = ['🔮', '✨', '⭐', '🌟', '💫', '🎯', '🃏', '☕', '🤚', '💝', '🌙', '🔢', '👼', '🌈', '📊', '🎲', '🎰', '💎', '👑', '🎭', '🏆', '🎪', '💜', '🟣', '🔥', '⚡']

interface FortuneCard {
  id: string
  name: string
  icon: string
  image: string
  href: string
  isActive: boolean
  sortOrder: number
}

interface HeroItem {
  id: string
  icon: string
  title: string
  subtitle: string
  link: string
}

interface CustomText {
  id: string
  text: string
  effect: string
  color: string
}

interface TickerState {
  buttonText: string
  buttonIcon: string
  buttonLink: string
  buttonVisible: boolean
  scrollDirection: string
  scrollSpeed: number
  bgColor: string
  bgGradient: string
  onlineDisplay: string
  customTexts: CustomText[]
  textEffect: string
}

export default function HomepageCardsAdmin() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [tab, setTab] = useState<'cards' | 'hero' | 'ticker'>('cards')
  const [cards, setCards] = useState<FortuneCard[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Hero
  const [heroVisible, setHeroVisible] = useState(true)
  const [heroIcon, setHeroIcon] = useState('🔮')
  const [heroTitle, setHeroTitle] = useState('Canli Fal')
  const [heroSubtitle, setHeroSubtitle] = useState('Geleceğini keşfet, falına bak')
  const [heroLink, setHeroLink] = useState('/online-fal')
  const [heroItems, setHeroItems] = useState<HeroItem[]>([])

  // Ticker
  const [ticker, setTicker] = useState<TickerState>({
    buttonText: 'Canlı Falcı',
    buttonIcon: '✨',
    buttonLink: '/canli-falcilar',
    buttonVisible: true,
    scrollDirection: 'rtl',
    scrollSpeed: 20,
    bgColor: '',
    bgGradient: '',
    onlineDisplay: 'single',
    customTexts: [],
    textEffect: 'none',
  })

  // Modals
  const [showCardModal, setShowCardModal] = useState(false)
  const [showHeroItemModal, setShowHeroItemModal] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [editingCard, setEditingCard] = useState<FortuneCard | null>(null)
  const [editingHeroItem, setEditingHeroItem] = useState<HeroItem | null>(null)
  const [editingText, setEditingText] = useState<CustomText | null>(null)

  // Card form
  const [cardForm, setCardForm] = useState({ name: '', icon: '🔮', image: '', href: '/fallar', isActive: true, sortOrder: 0 })
  // Hero item form
  const [heroForm, setHeroForm] = useState({ icon: '✨', title: '', subtitle: '', link: '' })
  // Custom text form
  const [textForm, setTextForm] = useState({ text: '', effect: 'none', color: '#d946ef' })

  // Icon picker state
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      // Fetch ALL cards from admin API (includes inactive)
      const cardsRes = await fetch('/api/admin/homepage-fortune-cards')
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json()
        if (Array.isArray(cardsData)) {
          setCards(cardsData.map((c: any) => ({ ...c, isActive: c.isActive !== false, sortOrder: c.sortOrder || 0 })))
        }
      }
      // Fetch hero/ticker settings from public API
      const settingsRes = await fetch('/api/homepage-fortune-cards')
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data.hero) {
          setHeroVisible(data.hero.visible !== false)
          setHeroIcon(data.hero.icon || '🔮')
          setHeroTitle(data.hero.title || 'Canli Fal')
          setHeroSubtitle(data.hero.subtitle || '')
          setHeroLink(data.hero.link || '/online-fal')
          setHeroItems(Array.isArray(data.hero.items) ? data.hero.items : [])
        }
        if (data.ticker) {
          const t = data.ticker
          setTicker({
            buttonText: t.buttonText || 'Canlı Falcı',
            buttonIcon: t.buttonIcon || '✨',
            buttonLink: t.buttonLink || '/canli-falcilar',
            buttonVisible: t.buttonVisible !== 'false' && t.buttonVisible !== false,
            scrollDirection: t.scrollDirection || 'rtl',
            scrollSpeed: Number(t.scrollSpeed) || 20,
            bgColor: t.bgColor || '',
            bgGradient: t.bgGradient || '',
            onlineDisplay: t.onlineDisplay || 'single',
            customTexts: Array.isArray(t.customTexts) ? t.customTexts : [],
            textEffect: t.textEffect || 'none',
          })
        }
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Admin check
  const isAdmin = ['admin','yonetici','moderator','finans'].includes((session?.user as any)?.role)
  useEffect(() => {
    if (session && !isAdmin) router.push(`/`)
  }, [session, isAdmin, router, language])

  // Save helper
  const saveSetting = async (key: string, value: any) => {
    setSaving(true)
    try {
      await fetch('/api/admin/homepage-fortune-cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  // === CARD CRUD ===
  const openCardModal = (card?: FortuneCard) => {
    if (card) {
      setEditingCard(card)
      setCardForm({ name: card.name, icon: card.icon, image: card.image, href: card.href, isActive: card.isActive, sortOrder: card.sortOrder })
    } else {
      setEditingCard(null)
      setCardForm({ name: '', icon: '🔮', image: '', href: '/fallar', isActive: true, sortOrder: cards.length })
    }
    setShowCardModal(true)
  }

  const saveCard = async () => {
    setSaving(true)
    try {
      if (editingCard) {
        await fetch('/api/admin/homepage-fortune-cards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCard.id, ...cardForm }),
        })
      } else {
        await fetch('/api/admin/homepage-fortune-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardForm),
        })
      }
      await fetchData()
      setShowCardModal(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const deleteCard = async (id: string) => {
    if (!confirm('Bu kartı silmek istediğinize emin misiniz?')) return
    setSaving(true)
    try {
      await fetch('/api/admin/homepage-fortune-cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await fetchData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const toggleCardActive = async (card: FortuneCard) => {
    setSaving(true)
    try {
      await fetch('/api/admin/homepage-fortune-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, isActive: !card.isActive }),
      })
      await fetchData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  // === HERO ===
  const saveHero = async () => {
    await saveSetting('homepage_hero_visible', heroVisible ? 'true' : 'false')
    await saveSetting('homepage_hero_icon', heroIcon)
    await saveSetting('homepage_hero_title', heroTitle)
    await saveSetting('homepage_hero_subtitle', heroSubtitle)
    await saveSetting('homepage_hero_link', heroLink)
  }

  const toggleHeroVisible = async () => {
    const newVal = !heroVisible
    setHeroVisible(newVal)
    await saveSetting('homepage_hero_visible', newVal ? 'true' : 'false')
  }

  const openHeroItemModal = (item?: HeroItem) => {
    if (item) {
      setEditingHeroItem(item)
      setHeroForm({ icon: item.icon, title: item.title, subtitle: item.subtitle, link: item.link })
    } else {
      setEditingHeroItem(null)
      setHeroForm({ icon: '✨', title: '', subtitle: '', link: '' })
    }
    setShowHeroItemModal(true)
  }

  const saveHeroItem = async () => {
    let updated: HeroItem[]
    if (editingHeroItem) {
      updated = heroItems.map(i => i.id === editingHeroItem.id ? { ...editingHeroItem, ...heroForm } : i)
    } else {
      updated = [...heroItems, { id: Date.now().toString(), ...heroForm }]
    }
    setHeroItems(updated)
    await saveSetting('homepage_hero_items', updated)
    setShowHeroItemModal(false)
  }

  const deleteHeroItem = async (id: string) => {
    const updated = heroItems.filter(i => i.id !== id)
    setHeroItems(updated)
    await saveSetting('homepage_hero_items', updated)
  }

  // === TICKER ===
  const saveTickerButton = async () => {
    await saveSetting('ticker_button_text', ticker.buttonText)
    await saveSetting('ticker_button_icon', ticker.buttonIcon)
    await saveSetting('ticker_button_link', ticker.buttonLink)
    await saveSetting('ticker_button_visible', ticker.buttonVisible ? 'true' : 'false')
  }

  const saveTickerScroll = async () => {
    await saveSetting('ticker_scroll_direction', ticker.scrollDirection)
    await saveSetting('ticker_scroll_speed', String(ticker.scrollSpeed))
    await saveSetting('ticker_bg_color', ticker.bgColor)
    await saveSetting('ticker_bg_gradient', ticker.bgGradient)
    await saveSetting('ticker_online_display', ticker.onlineDisplay)
    await saveSetting('ticker_text_effect', ticker.textEffect)
  }

  const openTextModal = (ct?: CustomText) => {
    if (ct) {
      setEditingText(ct)
      setTextForm({ text: ct.text, effect: ct.effect, color: ct.color })
    } else {
      setEditingText(null)
      setTextForm({ text: '', effect: 'none', color: '#d946ef' })
    }
    setShowTextModal(true)
  }

  const saveCustomText = async () => {
    let updated: CustomText[]
    if (editingText) {
      updated = ticker.customTexts.map(t => t.id === editingText.id ? { ...editingText, ...textForm } : t)
    } else {
      updated = [...ticker.customTexts, { id: Date.now().toString(), ...textForm }]
    }
    setTicker(p => ({ ...p, customTexts: updated }))
    await saveSetting('ticker_custom_texts', updated)
    setShowTextModal(false)
  }

  const deleteCustomText = async (id: string) => {
    const updated = ticker.customTexts.filter(t => t.id !== id)
    setTicker(p => ({ ...p, customTexts: updated }))
    await saveSetting('ticker_custom_texts', updated)
  }

  // Shared styles
  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white/10 border border-fuchsia-500/30 text-white text-sm focus:outline-none focus:border-fuchsia-400'
  const labelCls = 'text-fuchsia-200 text-xs font-medium mb-1 block'
  const btnPrimary = 'px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-semibold hover:from-fuchsia-500 hover:to-purple-500 transition-all flex items-center gap-1.5'
  const btnSecondary = 'px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1'

  // Link picker component
  const LinkPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const [showDropdown, setShowDropdown] = useState(false)
    return (
      <div className="relative">
        <div className="flex gap-1">
          <input type="text" value={value} onChange={e => onChange(e.target.value)} className={`flex-1 ${inputCls}`} placeholder="/sayfa-yolu" />
          <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="px-2 py-2 rounded-lg bg-fuchsia-600/30 text-fuchsia-300 hover:bg-fuchsia-600/50 text-xs">
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-[#1a0a2e] border border-fuchsia-500/40 rounded-lg shadow-xl">
            {SITE_LINKS.map(link => (
              <button key={link.value} type="button" onClick={() => { onChange(link.value); setShowDropdown(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-fuchsia-600/30 transition-colors">
                <span className="text-fuchsia-400">{link.value}</span>
                <span className="ml-2 text-fuchsia-200/60">{link.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Icon picker inline
  const IconPicker = ({ value, onChange, pickerId }: { value: string; onChange: (v: string) => void; pickerId: string }) => (
    <div className="relative">
      <button type="button" onClick={() => setShowIconPicker(showIconPicker === pickerId ? null : pickerId)}
        className="px-3 py-2 rounded-lg bg-white/10 border border-fuchsia-500/30 text-xl hover:bg-white/20 transition-all">
        {value}
      </button>
      {showIconPicker === pickerId && (
        <div className="absolute z-50 mt-1 bg-[#1a0a2e] border border-fuchsia-500/40 rounded-lg p-2 shadow-xl grid grid-cols-6 gap-1 w-52">
          {ICON_OPTIONS.map(icon => (
            <button key={icon} type="button" onClick={() => { onChange(icon); setShowIconPicker(null) }}
              className={`text-xl p-1.5 rounded hover:bg-fuchsia-600/30 ${value === icon ? 'bg-fuchsia-600/50' : ''}`}>{icon}</button>
          ))}
        </div>
      )}
    </div>
  )

  if (loading) return <div className="min-h-screen  flex items-center justify-center"><div className="text-fuchsia-400 animate-pulse">Yükleniyor...</div></div>

  return (
    <div className="min-h-screen  p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-fuchsia-400" /> Anasayfa Yönetimi</h1>
          {saving && <span className="text-fuchsia-400 text-xs animate-pulse">Kaydediliyor...</span>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
          {[
            { key: 'cards' as const, label: 'Fal Kartları', icon: <LayoutGrid className="w-4 h-4" /> },
            { key: 'hero' as const, label: 'Hero Bölümü', icon: <Sparkles className="w-4 h-4" /> },
            { key: 'ticker' as const, label: 'Ticker & Kayan Yazı', icon: <Type className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg' : 'text-fuchsia-300 hover:bg-white/10'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* === CARDS TAB === */}
        {tab === 'cards' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-fuchsia-200/60 text-sm">Anasayfadaki fal kartlarını yönetin</p>
              <button onClick={() => openCardModal()} className={btnPrimary}><Plus className="w-4 h-4" /> Yeni Kart</button>
            </div>
            <div className="space-y-2">
              {cards.sort((a, b) => a.sortOrder - b.sortOrder).map(card => (
                <div key={card.id} className={`flex items-center gap-3 p-3 rounded-xl border ${card.isActive ? 'bg-white/5 border-fuchsia-500/30' : 'bg-white/[0.02] border-white/10 opacity-50'}`}>
                  <GripVertical className="w-4 h-4 text-fuchsia-500/40 flex-shrink-0" />
                  <span className="text-lg flex-shrink-0">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{card.name}</div>
                    <div className="text-fuchsia-300/50 text-xs truncate">{card.href}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleCardActive(card)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                      {card.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}
                    </button>
                    <button onClick={() => openCardModal(card)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all"><Edit className="w-4 h-4 text-fuchsia-300" /></button>
                    <button onClick={() => deleteCard(card.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && <div className="text-center text-fuchsia-300/50 py-8">Henüz kart eklenmemiş</div>}
            </div>
          </motion.div>
        )}

        {/* === HERO TAB === */}
        {tab === 'hero' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Main hero element */}
            <div className="bg-white/5 rounded-xl border border-fuchsia-500/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-fuchsia-400" /> Ana Hero Öğesi</h2>
                <button
                  onClick={toggleHeroVisible}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${heroVisible ? 'bg-fuchsia-600' : 'bg-white/20'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${heroVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {!heroVisible && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 text-yellow-300 text-xs flex items-center gap-2">
                  <Eye className="w-4 h-4 flex-shrink-0" /> Ana hero şu anda gizli. Anasayfada görünmüyor. Göstermek için toggle&apos;ı açın.
                </div>
              )}
              <div className={`grid grid-cols-2 gap-3 ${!heroVisible ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <label className={labelCls}>İkon</label>
                  <IconPicker value={heroIcon} onChange={setHeroIcon} pickerId="hero-main" />
                </div>
                <div>
                  <label className={labelCls}>Başlık</label>
                  <input type="text" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Alt Başlık</label>
                  <input type="text" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Link</label>
                  <LinkPicker value={heroLink} onChange={setHeroLink} />
                </div>
              </div>
              {heroVisible && <button onClick={saveHero} className={btnPrimary}><Save className="w-4 h-4" /> Hero Kaydet</button>}
            </div>

            {/* Extra hero buttons */}
            <div className="bg-white/5 rounded-xl border border-fuchsia-500/20 p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-white font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-fuchsia-400" /> Ek Hero Butonları</h2>
                <button onClick={() => openHeroItemModal()} className={btnSecondary}><Plus className="w-3.5 h-3.5" /> Ekle</button>
              </div>
              <div className="space-y-2">
                {heroItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-fuchsia-500/20">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{item.title}</div>
                      <div className="text-fuchsia-300/50 text-xs">{item.subtitle} → {item.link}</div>
                    </div>
                    <button onClick={() => openHeroItemModal(item)} className="p-1 hover:bg-white/10 rounded"><Edit className="w-3.5 h-3.5 text-fuchsia-300" /></button>
                    <button onClick={() => deleteHeroItem(item.id)} className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                ))}
                {heroItems.length === 0 && <p className="text-fuchsia-300/40 text-xs text-center py-3">Ek hero butonu yok</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* === TICKER TAB === */}
        {tab === 'ticker' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Ticker Button */}
            <div className="bg-white/5 rounded-xl border border-fuchsia-500/20 p-4 space-y-3">
              <h2 className="text-white font-semibold text-lg flex items-center gap-2 mb-1"><Type className="w-5 h-5 text-fuchsia-400" /> Ticker & Kayan Yazı</h2>
              <p className="text-fuchsia-200/50 text-xs">Kayan yazı çubuğunu tüm detaylarıyla özelleştirin</p>

              {/* Button settings */}
              <div className="flex items-center gap-3 mb-2">
                <label className="text-fuchsia-200 text-xs">Buton Görünür</label>
                <button onClick={() => setTicker(p => ({ ...p, buttonVisible: !p.buttonVisible }))} className={`w-10 h-5 rounded-full transition-all ${ticker.buttonVisible ? 'bg-green-500' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${ticker.buttonVisible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Buton İkonu</label>
                  <IconPicker value={ticker.buttonIcon} onChange={v => setTicker(p => ({ ...p, buttonIcon: v }))} pickerId="ticker-btn" />
                </div>
                <div>
                  <label className={labelCls}>Buton Metni</label>
                  <input type="text" value={ticker.buttonText} onChange={e => setTicker(p => ({ ...p, buttonText: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Buton Linki</label>
                  <LinkPicker value={ticker.buttonLink} onChange={v => setTicker(p => ({ ...p, buttonLink: v }))} />
                </div>
              </div>
              <button onClick={saveTickerButton} className={btnPrimary}><Save className="w-4 h-4" /> Buton Kaydet</button>
            </div>

            {/* Scroll settings */}
            <div className="bg-white/5 rounded-xl border border-fuchsia-500/20 p-4 space-y-4">
              <h3 className="text-fuchsia-300 text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4" /> Kayan Yazı Ayarları</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Kaydırma Yönü</label>
                  <div className="flex gap-1">
                    <button onClick={() => setTicker(p => ({ ...p, scrollDirection: 'rtl' }))} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${ticker.scrollDirection === 'rtl' ? 'bg-fuchsia-600 text-white' : 'bg-white/10 text-fuchsia-300'}`}>
                      <ArrowLeft className="w-3.5 h-3.5" /> Sağdan Sola
                    </button>
                    <button onClick={() => setTicker(p => ({ ...p, scrollDirection: 'ltr' }))} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${ticker.scrollDirection === 'ltr' ? 'bg-fuchsia-600 text-white' : 'bg-white/10 text-fuchsia-300'}`}>
                      Soldan Sağa <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Hız ({ticker.scrollSpeed}s)</label>
                  <input type="range" min={5} max={60} value={ticker.scrollSpeed} onChange={e => setTicker(p => ({ ...p, scrollSpeed: Number(e.target.value) }))} className="w-full accent-fuchsia-500" />
                </div>
                <div>
                  <label className={labelCls}>Arka Plan Rengi</label>
                  <div className="flex gap-1">
                    <input type="color" value={ticker.bgColor || '#0a0118'} onChange={e => setTicker(p => ({ ...p, bgColor: e.target.value }))} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                    <input type="text" value={ticker.bgColor} onChange={e => setTicker(p => ({ ...p, bgColor: e.target.value }))} className={`flex-1 ${inputCls}`} placeholder="#0a0118 veya boş" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Arka Plan Gradyanı</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { label: 'Yok', value: '' },
                      { label: 'Varsayılan Mor', value: 'linear-gradient(90deg, #0a0118, #1a0530, #0a0118)' },
                      { label: 'Gece Mavisi', value: 'linear-gradient(90deg, #020024, #090979, #020024)' },
                      { label: 'Ateş Kırmızı', value: 'linear-gradient(90deg, #1a0000, #4a0000, #1a0000)' },
                      { label: 'Okyanus', value: 'linear-gradient(90deg, #001219, #005f73, #001219)' },
                      { label: 'Altın', value: 'linear-gradient(90deg, #1a1000, #3d2b00, #1a1000)' },
                      { label: 'Yeşil Doğa', value: 'linear-gradient(90deg, #001a00, #004d00, #001a00)' },
                      { label: 'Pembe', value: 'linear-gradient(90deg, #1a0010, #4a0028, #1a0010)' },
                      { label: 'Koyu Siyah', value: 'linear-gradient(90deg, #000000, #111111, #000000)' },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTicker(p => ({ ...p, bgGradient: preset.value }))}
                        className={`relative rounded-lg p-1 text-center text-[10px] leading-tight border transition-all ${
                          ticker.bgGradient === preset.value
                            ? 'border-fuchsia-400 ring-1 ring-fuchsia-400/50'
                            : 'border-white/10 hover:border-fuchsia-500/40'
                        }`}
                      >
                        <div
                          className="h-6 rounded-md mb-0.5"
                          style={{ background: preset.value || '#0a0118' }}
                        />
                        <span className="text-fuchsia-200/80">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <details className="group">
                    <summary className="text-fuchsia-400/60 text-xs cursor-pointer hover:text-fuchsia-300 select-none">
                      ▸ Özel gradient yaz
                    </summary>
                    <input type="text" value={ticker.bgGradient} onChange={e => setTicker(p => ({ ...p, bgGradient: e.target.value }))} className={`${inputCls} mt-1`} placeholder="linear-gradient(90deg, #renk1, #renk2, #renk3)" />
                  </details>
                </div>
                <div>
                  <label className={labelCls}>Online Kullanıcı Gösterimi</label>
                  <select value={ticker.onlineDisplay} onChange={e => setTicker(p => ({ ...p, onlineDisplay: e.target.value }))} className={inputCls}>
                    <option value="single">Tekli Gösterim</option>
                    <option value="triple">Üçlü Gösterim</option>
                    <option value="hidden">Gizli</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Global Metin Efekti</label>
                  <select value={ticker.textEffect} onChange={e => setTicker(p => ({ ...p, textEffect: e.target.value }))} className={inputCls}>
                    {EFFECTS.map(ef => <option key={ef.value} value={ef.value}>{ef.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveTickerScroll} className={btnPrimary}><Save className="w-4 h-4" /> Ayarları Kaydet</button>
            </div>

            {/* Custom scrolling texts */}
            <div className="bg-white/5 rounded-xl border border-fuchsia-500/20 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-fuchsia-300 text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4" /> Özel Kayan Yazılar</h3>
                <button onClick={() => openTextModal()} className={btnSecondary}><Plus className="w-3.5 h-3.5" /> Ekle</button>
              </div>
              <div className="space-y-2">
                {ticker.customTexts.map(ct => (
                  <div key={ct.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-fuchsia-500/20">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ct.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{ct.text}</div>
                      <div className="text-fuchsia-300/50 text-xs">{EFFECTS.find(e => e.value === ct.effect)?.label || 'Efekt Yok'}</div>
                    </div>
                    <button onClick={() => openTextModal(ct)} className="p-1 hover:bg-white/10 rounded"><Edit className="w-3.5 h-3.5 text-fuchsia-300" /></button>
                    <button onClick={() => deleteCustomText(ct.id)} className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                ))}
                {ticker.customTexts.length === 0 && <p className="text-fuchsia-300/40 text-xs text-center py-3">Henüz özel kayan yazı eklenmemiş</p>}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* === MODALS === */}
      <AnimatePresence>
        {/* Card Modal */}
        {showCardModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCardModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold text-lg">{editingCard ? 'Kart Düzenle' : 'Yeni Kart'}</h3>
              <div><label className={labelCls}>Ad *</label><input type="text" value={cardForm.name} onChange={e => setCardForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Kahve Falı" /></div>
              <div className="flex gap-3">
                <div><label className={labelCls}>İkon</label><IconPicker value={cardForm.icon} onChange={v => setCardForm(p => ({ ...p, icon: v }))} pickerId="card-icon" /></div>
                <div className="flex-1"><label className={labelCls}>Sıra</label><input type="number" value={cardForm.sortOrder} onChange={e => setCardForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Görsel URL</label><input type="text" value={cardForm.image} onChange={e => setCardForm(p => ({ ...p, image: e.target.value }))} className={inputCls} placeholder="https://cdn.jotfor.ms/templates/screenshot/form-templates/upload-your-photo-form.png?v=4119624142&t=classic" /></div>
              <div><label className={labelCls}>Link</label><LinkPicker value={cardForm.href} onChange={v => setCardForm(p => ({ ...p, href: v }))} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveCard} disabled={!cardForm.name || saving} className={btnPrimary}><Save className="w-4 h-4" /> Kaydet</button>
                <button onClick={() => setShowCardModal(false)} className={btnSecondary}><X className="w-4 h-4" /> İptal</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Hero Item Modal */}
        {showHeroItemModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowHeroItemModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold text-lg">{editingHeroItem ? 'Hero Butonu Düzenle' : 'Yeni Hero Butonu'}</h3>
              <div className="flex gap-3">
                <div><label className={labelCls}>İkon</label><IconPicker value={heroForm.icon} onChange={v => setHeroForm(p => ({ ...p, icon: v }))} pickerId="hero-item-icon" /></div>
                <div className="flex-1"><label className={labelCls}>Başlık *</label><input type="text" value={heroForm.title} onChange={e => setHeroForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Tarot Falı" /></div>
              </div>
              <div><label className={labelCls}>Alt Başlık</label><input type="text" value={heroForm.subtitle} onChange={e => setHeroForm(p => ({ ...p, subtitle: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Link</label><LinkPicker value={heroForm.link} onChange={v => setHeroForm(p => ({ ...p, link: v }))} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveHeroItem} disabled={!heroForm.title || saving} className={btnPrimary}><Save className="w-4 h-4" /> Kaydet</button>
                <button onClick={() => setShowHeroItemModal(false)} className={btnSecondary}><X className="w-4 h-4" /> İptal</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Text Modal */}
        {showTextModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTextModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold text-lg">{editingText ? 'Yazı Düzenle' : 'Yeni Kayan Yazı'}</h3>
              <div><label className={labelCls}>Metin *</label><input type="text" value={textForm.text} onChange={e => setTextForm(p => ({ ...p, text: e.target.value }))} className={inputCls} placeholder="Hoş geldiniz!" /></div>
              <div><label className={labelCls}>Efekt</label>
                <select value={textForm.effect} onChange={e => setTextForm(p => ({ ...p, effect: e.target.value }))} className={inputCls}>
                  {EFFECTS.map(ef => <option key={ef.value} value={ef.value}>{ef.label}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Renk</label>
                <div className="flex gap-2">
                  <input type="color" value={textForm.color} onChange={e => setTextForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                  <input type="text" value={textForm.color} onChange={e => setTextForm(p => ({ ...p, color: e.target.value }))} className={`flex-1 ${inputCls}`} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveCustomText} disabled={!textForm.text || saving} className={btnPrimary}><Save className="w-4 h-4" /> Kaydet</button>
                <button onClick={() => setShowTextModal(false)} className={btnSecondary}><X className="w-4 h-4" /> İptal</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
