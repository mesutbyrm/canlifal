'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, EyeOff, Plus, Pencil, Trash2,
  X, Loader2, ChevronUp, ChevronDown, ExternalLink, Home, Save, Sparkles, Type,
  Link2, Palette, Zap, Users, LayoutGrid
} from 'lucide-react'

interface FortuneCard {
  id: string; name: string; icon: string; image: string; href: string; isActive: boolean; sortOrder: number
}
interface HeroItem {
  id: string; icon: string; title: string; subtitle: string; link: string
}
interface CustomText {
  id: string; text: string; effect: string; color: string
}
interface TickerConfig {
  buttonText: string; buttonIcon: string; buttonLink: string; buttonVisible: string
  scrollDirection: string; scrollSpeed: string; bgColor: string; bgGradient: string
  customTexts: CustomText[]; onlineDisplay: string; textEffect: string
}

const SITE_LINKS = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/online-fal', label: 'Online Fal' },
  { href: '/canli-falcilar', label: 'Canlı Falcılar' },
  { href: '/fallar', label: 'Fallar' },
  { href: '/fallar/kahve-fali', label: 'Kahve Falı' },
  { href: '/fallar/tarot-fali', label: 'Tarot Falı' },
  { href: '/fallar/el-fali', label: 'El Falı' },
  { href: '/fallar/ruya-yorumu', label: 'Rüya Tabiri' },
  { href: '/fallar/ask-uyumu', label: 'Aşk Uyumu' },
  { href: '/fallar/burc-yorumu', label: 'Günlük Burç' },
  { href: '/fallar/numeroloji', label: 'Numeroloji' },
  { href: '/fallar/melek-kartlari', label: 'Melek Kartları' },
  { href: '/fallar/aura-analizi', label: 'Aura Okuma' },
  { href: '/fallar/dogum-haritasi', label: 'Doğum Haritası' },
  { href: '/fallar/katina', label: 'Katina Falı' },
  { href: '/fallar/evet-hayir', label: 'Evet/Hayır' },
  { href: '/fallar/istihare', label: 'İstihare' },
  { href: '/fallar/kursundokme', label: 'Kurşun Dökme' },
  { href: '/blog', label: 'Blog' },
  { href: '/ruya', label: 'Rüya' },
  { href: '/ruya-sozlugu', label: 'Rüya Sözlüğü' },
  { href: '/sohbet', label: 'Sohbet' },
  { href: '/sosyal', label: 'Sosyal' },
  { href: '/oyunlar', label: 'Oyunlar' },
  { href: '/hediyeler', label: 'Hediyeler' },
  { href: '/jeton', label: 'Jeton' },
  { href: '/siralama', label: 'Sıralama' },
  { href: '/uyelik', label: 'Üyelik' },
  { href: '/davet', label: 'Davet' },
  { href: '/falci-ol', label: 'Falcı Ol' },
  { href: '/astroloji-paneli', label: 'Astroloji Paneli' },
  { href: '/burc-uyumu', label: 'Burç Uyumu' },
]

const ICONS = ['\ud83d\udd2e','\u2615','\ud83c\udccf','\ud83c\udf19','\u2728','\u2764\ufe0f','\ud83e\uddff','\ud83e\udeac','\ud83d\udc7c','\ud83c\udf1f','\ud83d\udd22','\ud83e\udd1a','\ud83d\udcab','\ud83c\udf08','\ud83d\udc8e','\ud83e\udd8b','\ud83c\udfb4','\ud83d\udd6f\ufe0f','\u2b50','\ud83e\udde0','\ud83d\udc9c','\ud83c\udf38','\ud83c\udfad','\ud83d\udcff','\ud83d\ude80','\ud83c\udf1e','\ud83d\udca5','\ud83c\udfaf']
const EFFECTS = [
  { value: 'none', label: 'Normal' },
  { value: 'glow', label: 'Parlama (Glow)' },
  { value: 'pulse', label: 'Nabız (Pulse)' },
  { value: 'rainbow', label: 'Gökkuşağı (Rainbow)' },
  { value: 'neon', label: 'Neon Yanıp Sönme' },
  { value: 'typewriter', label: 'Daktilo Efekti' },
  { value: 'bounce', label: 'Zıplama' },
]
const DIRECTIONS = [
  { value: 'rtl', label: 'Sağdan Sola \u2190' },
  { value: 'ltr', label: 'Soldan Sağa \u2192' },
]
const ONLINE_DISPLAYS = [
  { value: 'single', label: 'Tek tek göster' },
  { value: 'triple', label: '3\'erli grupla' },
  { value: 'hidden', label: 'Gizle' },
]

function LinkPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showDropdown, setShowDropdown] = useState(false)
  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          placeholder="/online-fal"
        />
        <button
          type="button" onClick={() => setShowDropdown(!showDropdown)}
          className="px-3 py-2 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30 flex items-center gap-1"
        >
          <Link2 className="w-3.5 h-3.5" /> Seç
        </button>
      </div>
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-52 overflow-y-auto rounded-xl bg-[#1a0d30] border border-white/10 shadow-xl">
          {SITE_LINKS.map(link => (
            <button key={link.href} type="button" onClick={() => { onChange(link.href); setShowDropdown(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-fuchsia-600/20 transition-colors ${
                value === link.href ? 'bg-fuchsia-600/30 text-fuchsia-300' : 'text-gray-300'
              }`}
            >
              <span className="text-gray-500 text-xs mr-2">{link.href}</span>
              <span>{link.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {ICONS.map(icon => (
          <button key={icon} type="button" onClick={() => onChange(icon)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
              value === icon ? 'bg-fuchsia-600 ring-2 ring-fuchsia-400 scale-110' : 'bg-white/5 hover:bg-white/10'
            }`}
          >{icon}</button>
        ))}
      </div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" placeholder="Emoji"
      />
    </div>
  )
}

export default function AdminHomepageCardsPage() {
  const params = useParams()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [cards, setCards] = useState<FortuneCard[]>([])
  const [loading, setLoading] = useState(true)
  // Hero
  const [heroIcon, setHeroIcon] = useState('\ud83d\udd2e')
  const [heroTitle, setHeroTitle] = useState('Canli Fal')
  const [heroSubtitle, setHeroSubtitle] = useState('Gelece\u011fini ke\u015ffet, fal\u0131na bak')
  const [heroLink, setHeroLink] = useState('/online-fal')
  const [heroItems, setHeroItems] = useState<HeroItem[]>([])
  // Ticker
  const [ticker, setTicker] = useState<TickerConfig>({
    buttonText: 'Canl\u0131 Falc\u0131', buttonIcon: '\u2728', buttonLink: '/canli-falcilar', buttonVisible: 'true',
    scrollDirection: 'rtl', scrollSpeed: '20', bgColor: '', bgGradient: '',
    customTexts: [], onlineDisplay: 'single', textEffect: 'none',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  // Modals
  const [showCardModal, setShowCardModal] = useState(false)
  const [editingCard, setEditingCard] = useState<FortuneCard | null>(null)
  const [cardForm, setCardForm] = useState({ name: '', icon: '\ud83d\udd2e', image: '', href: '' })
  const [cardSaving, setCardSaving] = useState(false)
  const [showHeroModal, setShowHeroModal] = useState(false)
  const [editingHero, setEditingHero] = useState<HeroItem | null>(null)
  const [heroForm, setHeroForm] = useState({ icon: '\ud83d\udd2e', title: '', subtitle: '', link: '' })
  const [showTextModal, setShowTextModal] = useState(false)
  const [editingText, setEditingText] = useState<CustomText | null>(null)
  const [textForm, setTextForm] = useState({ text: '', effect: 'none', color: '#f0abfc' })
  const [activeTab, setActiveTab] = useState<'cards'|'hero'|'ticker'>('cards')

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/homepage-fortune-cards')
      if (res.ok) setCards(await res.json() || [])
    } catch {} finally { setLoading(false) }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/homepage-fortune-cards')
      if (!res.ok) return
      const data = await res.json()
      if (data.hero) {
        setHeroIcon(data.hero.icon || '\ud83d\udd2e')
        setHeroTitle(data.hero.title || 'Canli Fal')
        setHeroSubtitle(data.hero.subtitle || '')
        setHeroLink(data.hero.link || '/online-fal')
        setHeroItems(data.hero.items || [])
      }
      if (data.ticker) {
        setTicker(prev => ({
          ...prev,
          buttonText: data.ticker.buttonText || prev.buttonText,
          buttonIcon: data.ticker.buttonIcon || prev.buttonIcon,
          buttonLink: data.ticker.buttonLink || prev.buttonLink,
          buttonVisible: data.ticker.buttonVisible ?? 'true',
          scrollDirection: data.ticker.scrollDirection || 'rtl',
          scrollSpeed: data.ticker.scrollSpeed || '20',
          bgColor: data.ticker.bgColor || '',
          bgGradient: data.ticker.bgGradient || '',
          customTexts: data.ticker.customTexts || [],
          onlineDisplay: data.ticker.onlineDisplay || 'single',
          textEffect: data.ticker.textEffect || 'none',
        }))
      }
    } catch {}
  }, [])

  useEffect(() => { if (isAdmin) { fetchCards(); fetchSettings() } }, [isAdmin, fetchCards, fetchSettings])

  // Card CRUD
  const toggleCardVis = async (c: FortuneCard) => {
    setCards(p => p.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x))
    await fetch('/api/admin/homepage-fortune-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) })
  }
  const moveCard = async (idx: number, dir: 'up'|'down') => {
    const arr = [...cards]; const si = dir === 'up' ? idx - 1 : idx + 1
    if (si < 0 || si >= arr.length) return
    ;[arr[idx], arr[si]] = [arr[si], arr[idx]]; arr.forEach((c,i) => c.sortOrder = i); setCards(arr)
    await Promise.all([fetch('/api/admin/homepage-fortune-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: arr[idx].id, sortOrder: idx }) }), fetch('/api/admin/homepage-fortune-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: arr[si].id, sortOrder: si }) })])
  }
  const deleteCard = async (id: string) => { if (!confirm('Silmek istedi\u011finize emin misiniz?')) return; setCards(p => p.filter(c => c.id !== id)); await fetch(`/api/admin/homepage-fortune-cards?id=${id}`, { method: 'DELETE' }) }
  const openCardModal = (c?: FortuneCard) => { setEditingCard(c || null); setCardForm(c ? { name: c.name, icon: c.icon, image: c.image, href: c.href } : { name: '', icon: '\ud83d\udd2e', image: '', href: '' }); setShowCardModal(true) }
  const saveCard = async () => {
    if (!cardForm.name.trim()) return; setCardSaving(true)
    try { const p: any = { ...cardForm }; if (editingCard) p.id = editingCard.id; await fetch('/api/admin/homepage-fortune-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); await fetchCards(); setShowCardModal(false) } finally { setCardSaving(false) }
  }

  // Hero items
  const openHeroModal = (h?: HeroItem) => { setEditingHero(h || null); setHeroForm(h ? { icon: h.icon, title: h.title, subtitle: h.subtitle, link: h.link } : { icon: '\ud83d\udd2e', title: '', subtitle: '', link: '' }); setShowHeroModal(true) }
  const saveHeroItem = () => {
    if (!heroForm.title.trim()) return
    if (editingHero) {
      setHeroItems(p => p.map(h => h.id === editingHero.id ? { ...h, ...heroForm } : h))
    } else {
      setHeroItems(p => [...p, { id: Date.now().toString(), ...heroForm }])
    }
    setShowHeroModal(false)
  }
  const deleteHeroItem = (id: string) => setHeroItems(p => p.filter(h => h.id !== id))

  // Custom texts
  const openTextModal = (t?: CustomText) => { setEditingText(t || null); setTextForm(t ? { text: t.text, effect: t.effect, color: t.color } : { text: '', effect: 'none', color: '#f0abfc' }); setShowTextModal(true) }
  const saveCustomText = () => {
    if (!textForm.text.trim()) return
    if (editingText) {
      setTicker(p => ({ ...p, customTexts: p.customTexts.map(t => t.id === editingText.id ? { ...t, ...textForm } : t) }))
    } else {
      setTicker(p => ({ ...p, customTexts: [...p.customTexts, { id: Date.now().toString(), ...textForm }] }))
    }
    setShowTextModal(false)
  }
  const deleteCustomText = (id: string) => setTicker(p => ({ ...p, customTexts: p.customTexts.filter(t => t.id !== id) }))

  // Save all settings
  const saveSettings = async (section: string) => {
    setSaving(true)
    try {
      const settings: Record<string, any> = {}
      if (section === 'hero') {
        settings.homepage_hero_icon = heroIcon
        settings.homepage_hero_title = heroTitle
        settings.homepage_hero_subtitle = heroSubtitle
        settings.homepage_hero_link = heroLink
        settings.homepage_hero_items = heroItems
      } else if (section === 'ticker') {
        settings.ticker_button_text = ticker.buttonText
        settings.ticker_button_icon = ticker.buttonIcon
        settings.ticker_button_link = ticker.buttonLink
        settings.ticker_button_visible = ticker.buttonVisible
        settings.ticker_scroll_direction = ticker.scrollDirection
        settings.ticker_scroll_speed = ticker.scrollSpeed
        settings.ticker_bg_color = ticker.bgColor
        settings.ticker_bg_gradient = ticker.bgGradient
        settings.ticker_custom_texts = ticker.customTexts
        settings.ticker_online_display = ticker.onlineDisplay
        settings.ticker_text_effect = ticker.textEffect
      }
      await fetch('/api/admin/homepage-fortune-cards', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) })
      setSaved(section); setTimeout(() => setSaved(''), 2000)
    } finally { setSaving(false) }
  }

  if (!isAdmin) return <div className="min-h-screen bg-[#0a0118] flex items-center justify-center"><p className="text-red-400">Yetkisiz eri\u015fim</p></div>

  const inputCls = 'w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-fuchsia-500/50 focus:outline-none'
  const labelCls = 'text-gray-300 text-sm font-medium mb-1.5 block'
  const btnPrimary = 'flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors disabled:opacity-50'

  return (
    <div className="min-h-screen bg-[#0a0118] pt-20 px-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <a href={`/${lang}/admin`} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-white text-xl font-bold">Anasayfa Y\u00f6netimi</h1>
            <p className="text-gray-500 text-xs">Fal kartlar\u0131, hero b\u00f6l\u00fcm\u00fc ve ticker ayarlar\u0131</p>
          </div>
          <a href={`/${lang}`} target="_blank" className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> G\u00f6r\u00fcnt\u00fcle
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[{ key: 'cards' as const, label: 'Fal Kartlar\u0131', icon: <LayoutGrid className="w-4 h-4" /> },
            { key: 'hero' as const, label: 'Hero B\u00f6l\u00fcm\u00fc', icon: <Sparkles className="w-4 h-4" /> },
            { key: 'ticker' as const, label: 'Ticker & Kayan Yaz\u0131', icon: <Type className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-fuchsia-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}
            >{tab.icon} {tab.label}</button>
          ))}
        </div>

        {/* ========== CARDS TAB ========== */}
        {activeTab === 'cards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-fuchsia-400" /> Fal Kartlar\u0131</h2>
                <p className="text-gray-500 text-xs mt-1">{cards.filter(c => c.isActive).length} aktif / {cards.length} toplam</p>
              </div>
              <button onClick={() => openCardModal()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Yeni Kart</button>
            </div>
            {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" /></div> : cards.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-xl"><p className="text-gray-500 text-sm">Hen\u00fcz kart yok</p></div>
            ) : (
              <div className="space-y-2">
                {cards.map((card, idx) => (
                  <motion.div key={card.id} layout className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${card.isActive ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-red-500/5 border-red-500/15 opacity-60'}`}>
                    <span className="text-xl">{card.icon}</span>
                    {card.image && <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/30"><img src={card.image} alt="" className="w-full h-full object-cover" /></div>}
                    <div className="flex-1 min-w-0"><p className="text-white text-sm font-medium">{card.name}</p><p className="text-gray-600 text-[10px] truncate">{card.href}</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveCard(idx,'up')} disabled={idx===0} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveCard(idx,'down')} disabled={idx===cards.length-1} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleCardVis(card)} className={`p-1.5 rounded-lg border ${card.isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{card.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => openCardModal(card)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteCard(card.id)} className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== HERO TAB ========== */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2 mb-1"><Sparkles className="w-5 h-5 text-fuchsia-400" /> Hero B\u00f6l\u00fcm\u00fc</h2>
              <p className="text-gray-500 text-xs mb-4">Ana hero \u00f6\u011fesi + ek d\u00fc\u011fmeler ekleyebilirsiniz</p>
            </div>
            {/* Main hero */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
              <h3 className="text-fuchsia-300 text-sm font-semibold">Ana Hero \u00d6\u011fesi</h3>
              <div><label className={labelCls}>\u0130kon</label><IconPicker value={heroIcon} onChange={setHeroIcon} /></div>
              <div><label className={labelCls}>Ba\u015fl\u0131k</label><input type="text" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Alt Yaz\u0131</label><input type="text" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>T\u0131klama Linki</label><LinkPicker value={heroLink} onChange={setHeroLink} /></div>
            </div>
            {/* Extra hero items */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-fuchsia-300 text-sm font-semibold">Ek Hero D\u00fc\u011fmeleri</h3>
                <button onClick={() => openHeroModal()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30"><Plus className="w-3 h-3" /> Ekle</button>
              </div>
              {heroItems.length === 0 ? <p className="text-gray-600 text-xs">Hen\u00fcz ek d\u00fc\u011fme yok</p> : (
                <div className="space-y-2">
                  {heroItems.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-xl">{h.icon}</span>
                      <div className="flex-1 min-w-0"><p className="text-white text-sm font-medium">{h.title}</p><p className="text-gray-600 text-[10px] truncate">{h.subtitle} \u2022 {h.link}</p></div>
                      <button onClick={() => openHeroModal(h)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => deleteHeroItem(h.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Preview */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-gray-500 text-xs mb-3">\u00d6nizleme:</p>
              <div className="text-center py-3">
                <div className="text-4xl mb-1">{heroIcon}</div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-fuchsia-300 via-purple-200 to-fuchsia-300 bg-clip-text text-transparent">{heroTitle}</h3>
                <p className="text-fuchsia-300/70 text-xs mt-0.5">{heroSubtitle}</p>
                {heroItems.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {heroItems.map(h => (
                      <div key={h.id} className="px-3 py-1.5 rounded-full bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-200 text-xs flex items-center gap-1.5">
                        <span>{h.icon}</span><span>{h.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => saveSettings('hero')} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved === 'hero' ? 'Kaydedildi \u2713' : 'Hero Ayarlar\u0131n\u0131 Kaydet'}
            </button>
          </div>
        )}

        {/* ========== TICKER TAB ========== */}
        {activeTab === 'ticker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2 mb-1"><Type className="w-5 h-5 text-fuchsia-400" /> Ticker & Kayan Yaz\u0131</h2>
              <p className="text-gray-500 text-xs mb-4">Kayan yaz\u0131 \u00e7ubu\u011funu t\u00fcm detaylar\u0131yla \u00f6zelle\u015ftirin</p>
            </div>

            {/* Button settings */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
              <h3 className="text-fuchsia-300 text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4" /> Ticker Butonu</h3>
              <div className="flex items-center gap-3">
                <label className="text-gray-300 text-sm">G\u00f6r\u00fcn\u00fcr</label>
                <button onClick={() => setTicker(p => ({ ...p, buttonVisible: p.buttonVisible === 'true' ? 'false' : 'true' }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${ticker.buttonVisible === 'true' ? 'bg-fuchsia-600' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${ticker.buttonVisible === 'true' ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
              {ticker.buttonVisible === 'true' && (
                <>
                  <div><label className={labelCls}>Buton Metni</label><input type="text" value={ticker.buttonText} onChange={e => setTicker(p => ({...p, buttonText: e.target.value}))} className={inputCls} /></div>
                  <div><label className={labelCls}>Buton \u0130konu</label><IconPicker value={ticker.buttonIcon} onChange={v => setTicker(p => ({...p, buttonIcon: v}))} /></div>
                  <div><label className={labelCls}>Y\u00f6nlendirme Linki</label><LinkPicker value={ticker.buttonLink} onChange={v => setTicker(p => ({...p, buttonLink: v}))} /></div>
                </>
              )}
            </div>

            {/* Scroll settings */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
              <h3 className="text-fuchsia-300 text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4" /> Kayan Yaz\u0131 Ayarlar\u0131</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Kayma Y\u00f6n\u00fc</label>
                  <select value={ticker.scrollDirection} onChange={e => setTicker(p => ({...p, scrollDirection: e.target.value}))} className={inputCls}>
                    {DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>H\u0131z (saniye)</label>
                  <input type="number" value={ticker.scrollSpeed} onChange={e => setTicker(p => ({...p, scrollSpeed: e.target.value}))} className={inputCls} min="5" max="60" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Arkaplan Rengi (bo\u015f = varsay\u0131lan)</label>
                <div className="flex gap-2">
                  <input type="text" value={ticker.bgColor} onChange={e => setTicker(p => ({...p, bgColor: e.target.value}))} className={`flex-1 ${inputCls}`} placeholder="#0a0118 veya bo\u015f" />
                  <input type="color" value={ticker.bgColor || '#0a0118'} onChange={e => setTicker(p => ({...p, bgColor: e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Arkaplan Gradient (bo\u015f = varsay\u0131lan)</label>
                <input type="text" value={ticker.bgGradient} onChange={e => setTicker(p => ({...p, bgGradient: e.target.value}))} className={inputCls} placeholder="linear-gradient(90deg, #0a0118, #150828, #0a0118)" />
              </div>
            </div>

            {/* Online users display */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
              <h3 className="text-fuchsia-300 text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Online Ki\u015fi G\u00f6sterimi</h3>
              <div className="flex gap-2">
                {ONLINE_DISPLAYS.map(d => (
                  <button key={d.value} onClick={() => setTicker(p => ({...p, onlineDisplay: d.value}))}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${ticker.onlineDisplay === d.value ? 'bg-fuchsia-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}
                  >{d.label}</button>
                ))}
              </div>
            </div>

            {/* Custom scroll texts */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-fuchsia-300 text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4" /> \u00d6zel Kayan Yaz\u0131lar</h3>
                <button onClick={() => openTextModal()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs"><Plus className="w-3 h-3" /> Ekle</button>
              </div>
              {ticker.customTexts.length === 0 ? <p className="text-gray-600 text-xs">Hen\u00fcz \u00f6zel yaz\u0131 eklenmemi\u015f</p> : (
                <div className="space-y-2">
                  {ticker.customTexts.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-600/20 text-fuchsia-300">{EFFECTS.find(e => e.value === t.effect)?.label || t.effect}</span>
                      <span className="flex-1 text-white text-sm truncate" style={{color: t.color}}>{t.text}</span>
                      <button onClick={() => openTextModal(t)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => deleteCustomText(t.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Global text effect */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
              <h3 className="text-fuchsia-300 text-sm font-semibold">Genel Yaz\u0131 Efekti</h3>
              <div className="flex flex-wrap gap-2">
                {EFFECTS.map(e => (
                  <button key={e.value} onClick={() => setTicker(p => ({...p, textEffect: e.value}))}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${ticker.textEffect === e.value ? 'bg-fuchsia-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}
                  >{e.label}</button>
                ))}
              </div>
            </div>

            <button onClick={() => saveSettings('ticker')} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved === 'ticker' ? 'Kaydedildi \u2713' : 'Ticker Ayarlar\u0131n\u0131 Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* ===== CARD MODAL ===== */}
      <AnimatePresence>
        {showCardModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)'}} onClick={() => setShowCardModal(false)}>
            <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#150a2e] border border-white/10 p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">{editingCard ? 'Kart D\u00fczenle' : 'Yeni Kart'}</h3>
                <button onClick={() => setShowCardModal(false)} className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className={labelCls}>Ad *</label><input type="text" value={cardForm.name} onChange={e => setCardForm(p => ({...p, name: e.target.value}))} className={inputCls} placeholder="Kahve Fal\u0131" /></div>
                <div><label className={labelCls}>\u0130kon</label><IconPicker value={cardForm.icon} onChange={v => setCardForm(p => ({...p, icon: v}))} /></div>
                <div><label className={labelCls}>Resim URL</label><input type="text" value={cardForm.image} onChange={e => setCardForm(p => ({...p, image: e.target.value}))} className={inputCls} placeholder="https://i.etsystatic.com/29644749/r/il/d09cf7/6005869396/il_570xN.6005869396_hu7h.jpg" /></div>
                <div><label className={labelCls}>Link</label><LinkPicker value={cardForm.href} onChange={v => setCardForm(p => ({...p, href: v}))} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCardModal(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">\u0130ptal</button>
                <button onClick={saveCard} disabled={cardSaving || !cardForm.name.trim()} className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
                  {cardSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{editingCard ? 'G\u00fcncelle' : 'Ekle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO ITEM MODAL ===== */}
      <AnimatePresence>
        {showHeroModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)'}} onClick={() => setShowHeroModal(false)}>
            <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#150a2e] border border-white/10 p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">{editingHero ? 'D\u00fc\u011fme D\u00fczenle' : 'Yeni Hero D\u00fc\u011fmesi'}</h3>
                <button onClick={() => setShowHeroModal(false)} className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className={labelCls}>\u0130kon</label><IconPicker value={heroForm.icon} onChange={v => setHeroForm(p => ({...p, icon: v}))} /></div>
                <div><label className={labelCls}>Ba\u015fl\u0131k *</label><input type="text" value={heroForm.title} onChange={e => setHeroForm(p => ({...p, title: e.target.value}))} className={inputCls} placeholder="Tarot Fal\u0131" /></div>
                <div><label className={labelCls}>Alt Yaz\u0131</label><input type="text" value={heroForm.subtitle} onChange={e => setHeroForm(p => ({...p, subtitle: e.target.value}))} className={inputCls} placeholder="Kartlar yolunuzu ayd\u0131nlats\u0131n" /></div>
                <div><label className={labelCls}>T\u0131klama Linki</label><LinkPicker value={heroForm.link} onChange={v => setHeroForm(p => ({...p, link: v}))} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowHeroModal(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">\u0130ptal</button>
                <button onClick={saveHeroItem} disabled={!heroForm.title.trim()} className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-50">
                  {editingHero ? 'G\u00fcncelle' : 'Ekle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CUSTOM TEXT MODAL ===== */}
      <AnimatePresence>
        {showTextModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)'}} onClick={() => setShowTextModal(false)}>
            <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#150a2e] border border-white/10 p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">{editingText ? 'Yaz\u0131 D\u00fczenle' : 'Yeni Kayan Yaz\u0131'}</h3>
                <button onClick={() => setShowTextModal(false)} className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className={labelCls}>Yaz\u0131 \u0130\u00e7eri\u011fi *</label><input type="text" value={textForm.text} onChange={e => setTextForm(p => ({...p, text: e.target.value}))} className={inputCls} placeholder="\ud83d\udd2e Bug\u00fcn fal\u0131na bakt\u0131r!" /></div>
                <div><label className={labelCls}>Efekt</label>
                  <select value={textForm.effect} onChange={e => setTextForm(p => ({...p, effect: e.target.value}))} className={inputCls}>
                    {EFFECTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Yaz\u0131 Rengi</label>
                  <div className="flex gap-2">
                    <input type="text" value={textForm.color} onChange={e => setTextForm(p => ({...p, color: e.target.value}))} className={`flex-1 ${inputCls}`} />
                    <input type="color" value={textForm.color} onChange={e => setTextForm(p => ({...p, color: e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowTextModal(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">\u0130ptal</button>
                <button onClick={saveCustomText} disabled={!textForm.text.trim()} className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-50">
                  {editingText ? 'G\u00fcncelle' : 'Ekle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
