'use client'

import { useState, useCallback } from 'react'
import { Search, Users, Shield, Radio, Crown, Building2, Star, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useUserAdminModal } from '@/components/admin/user-admin-modal-provider'

const SEARCH_TYPES = [
  { key: 'all', label: 'Tümü', icon: Search },
  { key: 'user', label: 'Kullanıcı', icon: Users },
  { key: 'agency', label: 'Ajans', icon: Building2 },
  { key: 'teller', label: 'Falcı', icon: Star },
  { key: 'broadcaster', label: 'Yayıncı', icon: Radio },
  { key: 'vip', label: 'VIP', icon: Crown },
]

interface SearchResult {
  id: string
  name?: string
  username?: string
  email?: string
  image?: string
  role?: string
  membership?: string
  canBroadcast?: boolean
  isBanned?: boolean
  isFrozen?: boolean
  lastActiveAt?: string
  resultType: string
  // Agency
  status?: string
  totalMembers?: number
  level?: string
  // Teller
  displayName?: string
  isActive?: boolean
  isVerified?: boolean
  rating?: number
  userId?: string
  user?: { name: string; image?: string }
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { openUserAdmin } = useUserAdminModal()

  const doSearch = useCallback(async () => {
    if (query.length < 2) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/admin/global-search?q=${encodeURIComponent(query)}&type=${type}&limit=50`)
      const json = await res.json()
      if (json.success) setResults(json.data.results)
    } catch { /* */ }
    setLoading(false)
  }, [query, type])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">🔎 Global Arama</h1>
            <p className="text-sm text-gray-400">Kullanıcı, ajans, falcı ve yayıncı arayın</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="İsim, kullanıcı adı, e-posta veya ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500/50"
            />
          </div>
          <button
            onClick={doSearch}
            disabled={query.length < 2 || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            Ara
          </button>
        </div>

        {/* Type filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {SEARCH_TYPES.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  type === t.key
                    ? 'bg-fuchsia-600 text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
          </div>
        ) : results.length === 0 && searched ? (
          <div className="text-center py-16 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Sonuç bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map(r => (
              <button
                key={`${r.resultType}-${r.id}`}
                onClick={() => {
                  if (r.resultType === 'user') openUserAdmin(r.id)
                  else if (r.resultType === 'teller' && r.userId) openUserAdmin(r.userId)
                }}
                className="w-full flex items-center gap-3 p-3 bg-gray-900/80 border border-gray-800/60 rounded-xl hover:border-fuchsia-500/30 transition-all text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                  {(r.image || r.user?.image) ? (
                    <Image src={r.image || r.user?.image || ''} alt="" width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      {r.resultType === 'agency' ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white overflow-hidden text-ellipsis whitespace-nowrap">
                      {r.resultType === 'teller' ? (r.displayName || r.user?.name) : (r.name || 'Adsız')}
                    </span>
                    {r.isBanned && <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[9px] rounded">BANLI</span>}
                    {r.isFrozen && <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] rounded">DONDURULMUŞ</span>}
                  </div>
                  <div className="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                    {r.resultType === 'user' && <>{r.username && `@${r.username}`} {r.email && `· ${r.email}`} {r.role && `· ${r.role}`}</>}
                    {r.resultType === 'agency' && <>Üye: {r.totalMembers} · Seviye: {r.level} · Durum: {r.status}</>}
                    {r.resultType === 'teller' && <>⭐ {r.rating?.toFixed(1)} {r.isVerified ? '· ✅' : ''} {r.isActive ? '· Aktif' : '· Pasif'}</>}
                  </div>
                </div>
                {/* Type badge */}
                <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                  r.resultType === 'user' ? 'bg-blue-500/20 text-blue-300' :
                  r.resultType === 'agency' ? 'bg-emerald-500/20 text-emerald-300' :
                  'bg-purple-500/20 text-purple-300'
                }`}>
                  {r.resultType === 'user' ? 'Kullanıcı' : r.resultType === 'agency' ? 'Ajans' : 'Falcı'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
