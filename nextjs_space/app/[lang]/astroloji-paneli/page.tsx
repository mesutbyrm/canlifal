'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Star, Moon, Sun, Loader2, Sparkles, Calendar, MapPin, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const ZODIAC_SIGNS = [
  { id: 'koc', name: 'Koç', symbol: '♈' },
  { id: 'boga', name: 'Boğa', symbol: '♉' },
  { id: 'ikizler', name: 'İkizler', symbol: '♊' },
  { id: 'yengec', name: 'Yengeç', symbol: '♋' },
  { id: 'aslan', name: 'Aslan', symbol: '♌' },
  { id: 'basak', name: 'Başak', symbol: '♍' },
  { id: 'terazi', name: 'Terazi', symbol: '♎' },
  { id: 'akrep', name: 'Akrep', symbol: '♏' },
  { id: 'yay', name: 'Yay', symbol: '♐' },
  { id: 'oglak', name: 'Oğlak', symbol: '♑' },
  { id: 'kova', name: 'Kova', symbol: '♒' },
  { id: 'balik', name: 'Balık', symbol: '♓' },
]

interface PanelData {
  dailyForecast: string
  weeklyForecast: string
  luckyNumbers: number[]
  luckyColor: string
  luckyDay: string
  moodEnergy: string
  careerAdvice: string
  loveAdvice: string
  healthAdvice: string
  planetaryInfluences: string
}

export default function AstrologyPanelPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [panel, setPanel] = useState<PanelData | null>(null)
  const [error, setError] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [sunSign, setSunSign] = useState('')
  const [risingSign, setRisingSign] = useState('')
  const [moonSign, setMoonSign] = useState('')
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) fetchPanel()
  }, [session])

  const fetchPanel = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/astrology-panel')
      if (res.ok) {
        const data = await res.json()
        if (data.panel) {
          setPanel(data.panel)
          setHasProfile(true)
        }
        if (data.birthDate) setBirthDate(data.birthDate)
        if (data.birthTime) setBirthTime(data.birthTime)
        if (data.birthPlace) setBirthPlace(data.birthPlace)
        if (data.sunSign) setSunSign(data.sunSign)
        if (data.risingSign) setRisingSign(data.risingSign)
        if (data.moonSign) setMoonSign(data.moonSign)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const generatePanel = async () => {
    if (!sunSign) {
      setError('Lütfen en azından güneş burcunuzu seçin.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/astrology-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, birthTime, birthPlace, sunSign, risingSign, moonSign })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Hata oluştu')
      }
      const data = await res.json()
      setPanel(data)
      setHasProfile(true)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  if (!session?.user) return null

  const InfoCard = ({ icon, title, content, gradient }: { icon: React.ReactNode, title: string, content: string, gradient: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${gradient} border border-purple-700/30 rounded-2xl p-5`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <p className="text-purple-200 text-sm leading-relaxed whitespace-pre-line">{content}</p>
    </motion.div>
  )

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-fuchsia-600/20 px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-fuchsia-300 text-sm font-medium">Astroloji Paneli</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Kişisel Astroloji Paneliniz
          </h1>
          <p className="text-purple-300 text-sm">
            Doğum bilgilerinize göre günlük astroloji analiziniz
          </p>
        </div>

        {/* Setup Form */}
        {!hasProfile && !loading && (
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">Doğum Bilgileriniz</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-purple-300 text-sm mb-1 block">Doğum Tarihi</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-purple-900/40 border border-purple-700/40 rounded-xl text-white text-sm focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-purple-300 text-sm mb-1 block">Doğum Saati</label>
                <input
                  type="time"
                  value={birthTime}
                  onChange={e => setBirthTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-purple-900/40 border border-purple-700/40 rounded-xl text-white text-sm focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-purple-300 text-sm mb-1 block">Doğum Yeri</label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={e => setBirthPlace(e.target.value)}
                  placeholder="Ör: İstanbul"
                  className="w-full px-3 py-2.5 bg-purple-900/40 border border-purple-700/40 rounded-xl text-white text-sm placeholder-purple-500 focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
            </div>

            <h4 className="text-purple-300 text-sm font-medium mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-400" /> Güneş Burcu *
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-4">
              {ZODIAC_SIGNS.map(sign => (
                <button
                  key={sign.id}
                  onClick={() => setSunSign(sign.id === sunSign ? '' : sign.id)}
                  className={`p-2 rounded-lg text-center transition-all text-xs ${
                    sunSign === sign.id
                      ? 'bg-fuchsia-600/50 border-fuchsia-400 border text-white'
                      : 'bg-purple-900/30 border border-purple-700/30 text-purple-300 hover:bg-purple-800/40'
                  }`}
                >
                  <span className="text-lg block">{sign.symbol}</span>
                  <span>{sign.name}</span>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-purple-300 text-sm mb-1 block flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-orange-400" /> Yükselen Burç
                </label>
                <select
                  value={risingSign}
                  onChange={e => setRisingSign(e.target.value)}
                  className="w-full px-3 py-2.5 bg-purple-900/40 border border-purple-700/40 rounded-xl text-white text-sm focus:border-fuchsia-500 focus:outline-none"
                >
                  <option value="">Seçiniz (Opsiyonel)</option>
                  {ZODIAC_SIGNS.map(s => <option key={s.id} value={s.id}>{s.symbol} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-purple-300 text-sm mb-1 block flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-blue-400" /> Ay Burcu
                </label>
                <select
                  value={moonSign}
                  onChange={e => setMoonSign(e.target.value)}
                  className="w-full px-3 py-2.5 bg-purple-900/40 border border-purple-700/40 rounded-xl text-white text-sm focus:border-fuchsia-500 focus:outline-none"
                >
                  <option value="">Seçiniz (Opsiyonel)</option>
                  {ZODIAC_SIGNS.map(s => <option key={s.id} value={s.id}>{s.symbol} {s.name}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              onClick={generatePanel}
              disabled={loading || !sunSign}
              className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Panelimi Oluştur
            </button>
          </div>
        )}

        {loading && !panel && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400 mx-auto mb-4" />
            <p className="text-purple-300">Astroloji paneliniz hazırlanıyor...</p>
          </div>
        )}

        {/* Panel Content */}
        {panel && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={generatePanel}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-fuchsia-300 hover:text-fuchsia-200 bg-fuchsia-900/30 px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
              </button>
            </div>

            {/* Lucky Info */}
            <div className="bg-gradient-to-r from-fuchsia-900/30 to-purple-900/30 border border-fuchsia-700/30 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-purple-400 text-xs mb-1">Şans Sayıları</p>
                  <p className="text-white font-bold">{panel.luckyNumbers.join(', ')}</p>
                </div>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Şans Rengi</p>
                  <p className="text-white font-bold">{panel.luckyColor}</p>
                </div>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Şans Günü</p>
                  <p className="text-white font-bold">{panel.luckyDay}</p>
                </div>
              </div>
            </div>

            <InfoCard
              icon={<Sun className="w-5 h-5 text-yellow-400" />}
              title="Günlük Tahmin"
              content={panel.dailyForecast}
              gradient="bg-yellow-900/10"
            />
            <InfoCard
              icon={<Calendar className="w-5 h-5 text-blue-400" />}
              title="Haftalık Bakış"
              content={panel.weeklyForecast}
              gradient="bg-blue-900/10"
            />
            <InfoCard
              icon={<Sparkles className="w-5 h-5 text-fuchsia-400" />}
              title="Enerji & Ruh Hali"
              content={panel.moodEnergy}
              gradient="bg-fuchsia-900/10"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <InfoCard
                icon={<Star className="w-5 h-5 text-pink-400" />}
                title="Aşk & İlişkiler"
                content={panel.loveAdvice}
                gradient="bg-pink-900/10"
              />
              <InfoCard
                icon={<Sparkles className="w-5 h-5 text-green-400" />}
                title="Kariyer & İş"
                content={panel.careerAdvice}
                gradient="bg-green-900/10"
              />
            </div>

            <InfoCard
              icon={<Moon className="w-5 h-5 text-cyan-400" />}
              title="Sağlık"
              content={panel.healthAdvice}
              gradient="bg-cyan-900/10"
            />
            <InfoCard
              icon={<Star className="w-5 h-5 text-indigo-400" />}
              title="Gezegen Etkileri"
              content={panel.planetaryInfluences}
              gradient="bg-indigo-900/10"
            />
          </div>
        )}
      </div>
    </div>
  )
}
