'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Search, ArrowLeft, Star, MessageCircle, Radio, Sparkles, TrendingUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface SearchResult {
  type: 'teller' | 'room' | 'fortune'
  id: string; name: string; avatar?: string | null; slug?: string
}

interface TellerItem {
  id: string
  displayName: string
  avatar: string | null
  specialties: string[]
  rating: number
  isOnline: boolean
}

export default function KesfetPage() {
  const router = useRouter()
  const { data: session } = useSession() || {}
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tellers, setTellers] = useState<TellerItem[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fortune-tellers?sort=top_rated')
      const data = await res.json()
      setTellers((data?.tellers || []).slice(0, 20))
    } catch {}
    setLoading(false)
  }

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search/advanced?q=${encodeURIComponent(q)}&type=all`)
      const data = await res.json()
      const results: SearchResult[] = []
      if (data.tellers) data.tellers.forEach((t: any) => results.push({ type: 'teller', id: t.id, name: t.name, avatar: t.avatar }))
      if (data.rooms) data.rooms.forEach((r: any) => results.push({ type: 'room', id: r.id, name: r.name, slug: r.slug }))
      if (data.fortunes) data.fortunes.forEach((f: any) => results.push({ type: 'fortune', id: f.id, name: f.name, slug: f.slug }))
      setSearchResults(results.slice(0, 10))
    } catch {}
    setSearching(false)
  }, [])

  const onQueryChange = (val: string) => {
    setQuery(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (val.trim()) {
      setShowSearch(true)
      searchTimeout.current = setTimeout(() => handleSearch(val), 400)
    } else {
      setShowSearch(false)
      setSearchResults([])
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white pb-24">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-40 bg-[#0a0118]/95 backdrop-blur-lg border-b border-purple-500/10 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-300/50" />
              <input
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="Merak ettiğini ara"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-purple-500/20 rounded-full text-sm text-white placeholder-fuchsia-300/40 focus:border-fuchsia-400/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {showSearch && (query.trim()) && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-4 right-4 mt-2 bg-[#1a0030] border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl z-50"
              >
                {searching ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-fuchsia-400" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map(r => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        href={r.type === 'teller' ? `/canli-falcilar/${r.id}` : r.type === 'room' ? `/sohbet/${r.slug}` : `/fal/${r.slug}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                        onClick={() => { setShowSearch(false); setQuery('') }}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm">
                          {r.type === 'teller' ? '⭐' : r.type === 'room' ? '💬' : '🔮'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-[10px] text-fuchsia-300/50">
                            {r.type === 'teller' ? 'Falcı' : r.type === 'room' ? 'Sohbet Odası' : 'Fal Türü'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-fuchsia-300/50 text-sm">Sonuç bulunamadı</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { href: '/fallar', icon: Sparkles, label: 'Fallar', gradient: 'from-fuchsia-500 to-purple-600' },
            { href: '/canli-falcilar', icon: Star, label: 'Falcılar', gradient: 'from-amber-500 to-orange-600' },
            { href: '/sohbet', icon: MessageCircle, label: 'Sohbet', gradient: 'from-blue-500 to-indigo-600' },
            { href: '/trendler', icon: TrendingUp, label: 'Trendler', gradient: 'from-orange-500 to-red-600' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-purple-500/10 hover:border-purple-400/30 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-medium text-fuchsia-200/80">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Top Tellers */}
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" />
          En İyi Falcılar
        </h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
          </div>
        ) : tellers.length === 0 ? (
          <div className="text-center py-20 text-fuchsia-300/40">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Henüz falcı yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tellers.map((teller, i) => (
              <motion.div
                key={teller.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/canli-falcilar/${teller.id}`} className="block p-3 rounded-2xl bg-white/5 border border-purple-500/10 hover:border-purple-400/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 p-[2px] flex-shrink-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118] relative">
                        {teller.avatar ? (
                          <Image src={teller.avatar} alt={teller.displayName} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-purple-700 to-fuchsia-800">
                            {teller.displayName[0]}
                          </div>
                        )}
                      </div>
                      {teller.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0a0118]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{teller.displayName}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[11px] text-amber-300/80">{teller.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                  </div>
                  {teller.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {teller.specialties.slice(0, 2).map((s, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-fuchsia-200/70">{s}</span>
                      ))}
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
