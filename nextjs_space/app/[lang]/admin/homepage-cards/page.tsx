'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, EyeOff, Plus, Pencil, Trash2,
  X, Loader2, ChevronUp, ChevronDown, ExternalLink, Home, Save, Sparkles, Type
} from 'lucide-react'

interface FortuneCard {
  id: string
  name: string
  icon: string
  image: string
  href: string
  isActive: boolean
  sortOrder: number
}

interface HeroSettings {
  icon: string
  title: string
  subtitle: string
  link: string
}

interface TickerSettings {
  buttonText: string
  buttonIcon: string
}

const POPULAR_ICONS = [
  '🔮', '☕', '🃏', '🌙', '✨', '❤️', '🧿', '🪬',
  '👼', '🌟', '🔢', '🤚', '💫', '🌈', '💎', '🦋',
  '🎴', '🕯️', '⭐', '🧠', '💜', '🌸', '🎭', '📿',
]

export default function AdminHomepageCardsPage() {
  const params = useParams()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [cards, setCards] = useState<FortuneCard[]>([])
  const [loading, setLoading] = useState(true)
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({ icon: '🔮', title: 'Canli Fal', subtitle: 'Geleceğini keşfet, falına bak', link: '/online-fal' })
  const [tickerSettings, setTickerSettings] = useState<TickerSettings>({ buttonText: 'Canlı Falcı', buttonIcon: '✨' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Card modal
  const [showModal, setShowModal] = useState(false)
  const [editingCard, setEditingCard] = useState<FortuneCard | null>(null)
  const [modalForm, setModalForm] = useState({ name: '', icon: '🔮', image: '', href: '' })
  const [modalSaving, setModalSaving] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState<'cards' | 'hero' | 'ticker'>('cards')

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/homepage-fortune-cards')
      if (res.ok) {
        const data = await res.json()
        setCards(data || [])
      }
    } catch (e) {
      console.error('Fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/homepage-fortune-cards')
      if (res.ok) {
        const data = await res.json()
        if (data.hero) setHeroSettings(data.hero)
        if (data.ticker) setTickerSettings(data.ticker)
      }
    } catch (e) {
      console.error('Settings fetch error', e)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchCards()
      fetchSettings()
    }
  }, [isAdmin, fetchCards, fetchSettings])

  const toggleVisibility = async (card: FortuneCard) => {
    const newActive = !card.isActive
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, isActive: newActive } : c))
    await fetch('/api/admin/homepage-fortune-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: card.id, isActive: newActive }),
    })
  }

  const moveCard = async (idx: number, dir: 'up' | 'down') => {
    const newCards = [...cards]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newCards.length) return
    ;[newCards[idx], newCards[swapIdx]] = [newCards[swapIdx], newCards[idx]]
    newCards.forEach((c, i) => (c.sortOrder = i))
    setCards(newCards)
    // Save both
    await Promise.all([
      fetch('/api/admin/homepage-fortune-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newCards[idx].id, sortOrder: idx }),
      }),
      fetch('/api/admin/homepage-fortune-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newCards[swapIdx].id, sortOrder: swapIdx }),
      }),
    ])
  }

  const deleteCard = async (id: string) => {
    if (!confirm('Bu kartı silmek istediğinize emin misiniz?')) return
    setCards(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/admin/homepage-fortune-cards?id=${id}`, { method: 'DELETE' })
  }

  const openModal = (card?: FortuneCard) => {
    if (card) {
      setEditingCard(card)
      setModalForm({ name: card.name, icon: card.icon, image: card.image, href: card.href })
    } else {
      setEditingCard(null)
      setModalForm({ name: '', icon: '🔮', image: '', href: '' })
    }
    setShowModal(true)
  }

  const saveCard = async () => {
    if (!modalForm.name.trim()) return
    setModalSaving(true)
    try {
      const payload: any = { ...modalForm }
      if (editingCard) payload.id = editingCard.id
      await fetch('/api/admin/homepage-fortune-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await fetchCards()
      setShowModal(false)
    } finally {
      setModalSaving(false)
    }
  }

  const saveHeroTickerSettings = async () => {
    setSavingSettings(true)
    try {
      await fetch('/api/admin/homepage-fortune-cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            homepage_hero_icon: heroSettings.icon,
            homepage_hero_title: heroSettings.title,
            homepage_hero_subtitle: heroSettings.subtitle,
            homepage_hero_link: heroSettings.link,
            ticker_button_text: tickerSettings.buttonText,
            ticker_button_icon: tickerSettings.buttonIcon,
          },
        }),
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } finally {
      setSavingSettings(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <p className="text-red-400">Yetkisiz erişim</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] pt-20 px-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <a
            href={`/${lang}/admin`}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-white text-xl font-bold">Anasayfa Kartları & Ayarları</h1>
            <p className="text-gray-500 text-xs">Fal kartlarını, hero bölümünü ve ticker butonunu yönetin</p>
          </div>
          <a
            href={`/${lang}`}
            target="_blank"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ana Sayfayı Gör
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'cards' as const, label: 'Fal Kartları', icon: <Home className="w-4 h-4" /> },
            { key: 'hero' as const, label: 'Hero Bölümü', icon: <Sparkles className="w-4 h-4" /> },
            { key: 'ticker' as const, label: 'Ticker Butonu', icon: <Type className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* CARDS TAB */}
        {activeTab === 'cards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Home className="w-5 h-5 text-fuchsia-400" />
                  Fal Kartları
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                  {cards.filter(c => c.isActive).length} aktif / {cards.length} toplam kart
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Yeni Kart
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                <p className="text-gray-500 text-sm">Henüz kart eklenmemiş</p>
                <button
                  onClick={() => openModal()}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg text-sm hover:bg-fuchsia-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" /> İlk Kartı Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      card.isActive
                        ? 'bg-white/[0.03] border-white/[0.08]'
                        : 'bg-red-500/5 border-red-500/15 opacity-60'
                    }`}
                  >
                    <span className="text-xl">{card.icon}</span>
                    {card.image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/30">
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{card.name}</p>
                      <p className="text-gray-600 text-[10px] truncate">{card.href}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveCard(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveCard(idx, 'down')}
                        disabled={idx === cards.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleVisibility(card)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          card.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {card.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openModal(card)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCard(card.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HERO TAB */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                Hero Bölümü Ayarları
              </h2>
              <p className="text-gray-500 text-xs mb-4">Ana sayfadaki üst kısımdaki ikon, başlık ve alt yazı</p>
            </div>

            {/* Hero Icon */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Hero İkonu</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {POPULAR_ICONS.slice(0, 16).map(icon => (
                  <button
                    key={icon}
                    onClick={() => setHeroSettings(prev => ({ ...prev, icon }))}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                      heroSettings.icon === icon
                        ? 'bg-fuchsia-600 ring-2 ring-fuchsia-400 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={heroSettings.icon}
                onChange={e => setHeroSettings(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                placeholder="Emoji veya metin"
              />
            </div>

            {/* Hero Title */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Hero Başlık</label>
              <input
                type="text"
                value={heroSettings.title}
                onChange={e => setHeroSettings(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                placeholder="Canli Fal"
              />
            </div>

            {/* Hero Subtitle */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Hero Alt Yazı</label>
              <input
                type="text"
                value={heroSettings.subtitle}
                onChange={e => setHeroSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                placeholder="Geleceğini keşfet, falına bak"
              />
            </div>

            {/* Hero Link */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Hero Tıklama Linki</label>
              <input
                type="text"
                value={heroSettings.link}
                onChange={e => setHeroSettings(prev => ({ ...prev, link: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                placeholder="/online-fal"
              />
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-gray-500 text-xs mb-3">Önizleme:</p>
              <div className="text-center py-3">
                <div className="text-4xl mb-1">{heroSettings.icon}</div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-fuchsia-300 via-purple-200 to-fuchsia-300 bg-clip-text text-transparent">
                  {heroSettings.title}
                </h3>
                <p className="text-fuchsia-300/70 text-xs mt-0.5">{heroSettings.subtitle}</p>
              </div>
            </div>

            <button
              onClick={saveHeroTickerSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settingsSaved ? 'Kaydedildi ✓' : 'Kaydet'}
            </button>
          </div>
        )}

        {/* TICKER TAB */}
        {activeTab === 'ticker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2 mb-4">
                <Type className="w-5 h-5 text-fuchsia-400" />
                Ticker Butonu Ayarları
              </h2>
              <p className="text-gray-500 text-xs mb-4">Kayan yazı çubuğundaki "Canlı Falcı" butonu metni ve ikonu</p>
            </div>

            {/* Ticker Button Icon */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Buton İkonu</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {POPULAR_ICONS.slice(0, 12).map(icon => (
                  <button
                    key={icon}
                    onClick={() => setTickerSettings(prev => ({ ...prev, buttonIcon: icon }))}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                      tickerSettings.buttonIcon === icon
                        ? 'bg-fuchsia-600 ring-2 ring-fuchsia-400 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={tickerSettings.buttonIcon}
                onChange={e => setTickerSettings(prev => ({ ...prev, buttonIcon: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>

            {/* Ticker Button Text */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Buton Metni</label>
              <input
                type="text"
                value={tickerSettings.buttonText}
                onChange={e => setTickerSettings(prev => ({ ...prev, buttonText: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                placeholder="Canlı Falcı"
              />
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-gray-500 text-xs mb-3">Önizleme:</p>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-fuchsia-700/90 to-purple-700/90 text-white text-sm font-bold rounded">
                <span>{tickerSettings.buttonIcon}</span>
                <span>{tickerSettings.buttonText}</span>
              </div>
            </div>

            <button
              onClick={saveHeroTickerSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settingsSaved ? 'Kaydedildi ✓' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* CARD MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[#150a2e] border border-white/10 p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">
                  {editingCard ? 'Kartı Düzenle' : 'Yeni Kart Ekle'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Card Name */}
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1.5 block">Kart Adı *</label>
                  <input
                    type="text"
                    value={modalForm.name}
                    onChange={e => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    placeholder="Kahve Falı"
                  />
                </div>

                {/* Card Icon */}
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1.5 block">İkon</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {POPULAR_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setModalForm(prev => ({ ...prev, icon }))}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          modalForm.icon === icon
                            ? 'bg-fuchsia-600 ring-2 ring-fuchsia-400 scale-110'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={modalForm.icon}
                    onChange={e => setModalForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    placeholder="Emoji veya metin"
                  />
                </div>

                {/* Card Image URL */}
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1.5 block">Resim URL</label>
                  <input
                    type="text"
                    value={modalForm.image}
                    onChange={e => setModalForm(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    placeholder="https://cdn.pixabay.com/photo/2015/03/04/22/35/avatar-659651_1280.png veya /fortunes/..."
                  />
                  {modalForm.image && (
                    <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden bg-purple-900/30">
                      <img src={modalForm.image} alt="Önizleme" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Card Link */}
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1.5 block">Link (href)</label>
                  <input
                    type="text"
                    value={modalForm.href}
                    onChange={e => setModalForm(prev => ({ ...prev, href: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    placeholder="/fallar/kahve-fali"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={saveCard}
                  disabled={modalSaving || !modalForm.name.trim()}
                  className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {modalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingCard ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
