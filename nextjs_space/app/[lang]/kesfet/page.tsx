'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Search, Star, Filter, ArrowLeft, Users, Sparkles, MessageSquare,
  Wifi, ChevronDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TELLER_LEVELS } from '@/lib/teller-levels'

interface SearchResult {
  type: 'teller' | 'room' | 'fortune'
  id: string; name: string; avatar?: string | null; username?: string;
  rating?: number; isOnline?: boolean; specialties?: string[]; totalSessions?: number;
  tellerLevel?: string; pricePerSession?: number;
  slug?: string; owner?: string; description?: string | null;
  icon?: string; jetonCost?: number; nameEn?: string;
}

interface SpecialtyItem { name: string; count: number }

export default function KesfetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [specialty, setSpecialty] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [sortBy, setSortBy] = useState('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [tellers, setTellers] = useState<SearchResult[]>([])
  const [rooms, setRooms] = useState<SearchResult[]>([])
  const [fortunes, setFortunes] = useState<SearchResult[]>([])
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([])

  useEffect(() => { doSearch() }, [type, specialty, onlineOnly, minRating, sortBy])

  const doSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: query, type, sortBy,
        ...(specialty && { specialty }),
        ...(onlineOnly && { onlineOnly: 'true' }),
        ...(minRating > 0 && { minRating: String(minRating) }),
      })
      const res = await fetch(`/api/search/advanced?${params}`)
      const data = await res.json()
      setTellers(data.tellers || [])
      setRooms(data.rooms || [])
      setFortunes(data.fortunes || [])
      if (data.specialties) setSpecialties(data.specialties)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold">🔍 Keşfet</h1>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Falcı, oda veya fal türü ara..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-purple-400/50 focus:outline-none" />
        </div>
        <button onClick={doSearch} className="px-4 py-2.5 bg-purple-600/50 rounded-xl text-sm font-medium hover:bg-purple-600/70">
          Ara
        </button>
        <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl transition-all ${showFilters ? 'bg-purple-600/50 text-purple-200' : 'bg-white/5 text-gray-400'}`}>
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-4">
        {[{ key: 'all', label: 'Tümü' }, { key: 'teller', label: '⭐ Falcılar' }, { key: 'room', label: '💬 Odalar' }, { key: 'fortune', label: '🔮 Fal Türleri' }].map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${type === t.key ? 'bg-purple-600/50 text-white border border-purple-400/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
          {/* Specialties */}
          {specialties.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Uzmanlık Alanı</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setSpecialty('')} className={`px-2 py-1 rounded-lg text-[10px] ${!specialty ? 'bg-purple-600/50 text-white' : 'bg-white/5 text-gray-400'}`}>Tümü</button>
                {specialties.map(s => (
                  <button key={s.name} onClick={() => setSpecialty(s.name)} className={`px-2 py-1 rounded-lg text-[10px] ${specialty === s.name ? 'bg-purple-600/50 text-white' : 'bg-white/5 text-gray-400'}`}>
                    {s.name} ({s.count})
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={onlineOnly} onChange={e => setOnlineOnly(e.target.checked)} className="rounded" />
              Sadece çevrimiçi
            </label>
            <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white">
              <option value={0}>Min. puan: Yok</option>
              <option value={3}>⭐ 3+</option>
              <option value={4}>⭐ 4+</option>
              <option value={4.5}>⭐ 4.5+</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white">
              <option value="rating">Puana göre</option>
              <option value="sessions">Seansa göre</option>
              <option value="level">Seviyeye göre</option>
            </select>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
      ) : (
        <div className="space-y-6">
          {/* Falcılar */}
          {tellers.length > 0 && (type === 'all' || type === 'teller') && (
            <div>
              <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Falcılar ({tellers.length})</h2>
              <div className="space-y-2">
                {tellers.map((t, i) => {
                  const lvl = TELLER_LEVELS[(t.tellerLevel || 'bronze') as keyof typeof TELLER_LEVELS] || TELLER_LEVELS.bronze
                  return (
                    <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                            {t.avatar ? <Image src={t.avatar} alt={t.name} width={40} height={40} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center">{lvl.emoji}</div>}
                          </div>
                          {t.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-950" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1"><span className="text-sm font-bold">{t.name}</span> <span className="text-xs">{lvl.emoji}</span></div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400" />{(t.rating || 0).toFixed(1)}</span>
                            <span>{t.totalSessions} seans</span>
                            <span>{t.pricePerSession} J/dk</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Odalar */}
          {rooms.length > 0 && (type === 'all' || type === 'room') && (
            <div>
              <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-400" /> Sohbet Odaları ({rooms.length})</h2>
              <div className="space-y-2">
                {rooms.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Link href={`/sohbet/${r.slug}`} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between block">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-blue-400" /></div>
                        <div>
                          <p className="text-sm font-bold">{r.name}</p>
                          <p className="text-[10px] text-gray-500">{r.owner ? `${r.owner}` : ''}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Fal Türleri */}
          {fortunes.length > 0 && (type === 'all' || type === 'fortune') && (
            <div>
              <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> Fal Türleri ({fortunes.length})</h2>
              <div className="grid grid-cols-2 gap-2">
                {fortunes.map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Link href={`/fal/${f.slug}`} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center block">
                      <span className="text-2xl block mb-1">{f.icon || '🔮'}</span>
                      <p className="text-xs font-bold">{f.name}</p>
                      {f.jetonCost !== undefined && <p className="text-[10px] text-gray-500">{f.jetonCost} Jeton</p>}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {tellers.length === 0 && rooms.length === 0 && fortunes.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Sonuç bulunamadı</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
