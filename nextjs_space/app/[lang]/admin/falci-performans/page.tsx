'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Search, Star, TrendingUp, Users, Award, Crown, Shield,
  ArrowUpDown, ArrowLeft, Eye, Wifi, WifiOff, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { TELLER_LEVELS } from '@/lib/teller-levels'

interface TellerData {
  id: string; userId: string; displayName: string; avatar: string | null; username: string | null; email: string;
  tellerLevel: string; levelPoints: number; rating: number; totalSessions: number; totalReviews: number;
  totalEarnings: number; isOnline: boolean; isVerified: boolean; isActive: boolean; isBanned: boolean;
  isFrozen: boolean; specialties: string[]; createdAt: string; lastActiveAt: string | null;
}

interface Stats {
  levelCounts: { bronze: number; silver: number; gold: number; diamond: number };
  avgRating: number; totalSessions: number; totalEarnings: number; onlineCount: number; total: number;
}

export default function TellerPerformancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tellers, setTellers] = useState<TellerData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [sortBy, setSortBy] = useState('levelPoints')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [levelFilter, setLevelFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      router.push('/giris'); return
    }
    fetchData()
  }, [session, status, sortBy, sortDir, levelFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/teller-performance?sortBy=${sortBy}&sortDir=${sortDir}&level=${levelFilter}&q=${searchQ}`)
      const data = await res.json()
      setTellers(data.tellers || [])
      setStats(data.stats || null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const handleSearch = () => { fetchData() }

  const levelInfo = (lvl: string) => TELLER_LEVELS[lvl as keyof typeof TELLER_LEVELS] || TELLER_LEVELS.bronze

  if (status === 'loading') return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold">Falcı Performans Tablosu</h1>
          <p className="text-xs text-gray-400">Tüm falcıların seviye, puan ve seans bilgileri</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-500/20 rounded-xl p-4">
            <Users className="w-5 h-5 text-purple-400 mb-1" />
            <p className="text-xs text-gray-400">Toplam Falcı</p>
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-green-400">{stats.onlineCount} çevrimiçi</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border border-yellow-500/20 rounded-xl p-4">
            <Star className="w-5 h-5 text-yellow-400 mb-1" />
            <p className="text-xs text-gray-400">Ort. Puan</p>
            <p className="text-xl font-bold">{stats.avgRating.toFixed(1)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-500/20 rounded-xl p-4">
            <TrendingUp className="w-5 h-5 text-green-400 mb-1" />
            <p className="text-xs text-gray-400">Toplam Seans</p>
            <p className="text-xl font-bold">{stats.totalSessions.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-500/20 rounded-xl p-4">
            <Award className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-xs text-gray-400">Toplam Kazanç</p>
            <p className="text-xl font-bold">{stats.totalEarnings.toLocaleString()} J</p>
          </div>
        </div>
      )}

      {/* Level distribution */}
      {stats && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setLevelFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            levelFilter === 'all' ? 'bg-purple-600/50 text-purple-200 border border-purple-400/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
            Tümü ({stats.total})
          </button>
          {(['diamond','gold','silver','bronze'] as const).map(lvl => {
            const info = TELLER_LEVELS[lvl]
            return (
              <button key={lvl} onClick={() => setLevelFilter(lvl)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                levelFilter === lvl ? 'bg-purple-600/50 text-purple-200 border border-purple-400/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
                {info.emoji} {info.name} ({stats.levelCounts[lvl]})
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Falcı ara (isim, kullanıcı adı, email)" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-purple-400/50 focus:outline-none" />
        </div>
        <button onClick={handleSearch} className="px-4 py-2.5 bg-purple-600/50 rounded-xl text-sm font-medium hover:bg-purple-600/70 transition-all">Ara</button>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {[{ key: 'levelPoints', label: 'Puan' }, { key: 'rating', label: 'Yıldız' }, { key: 'totalSessions', label: 'Seans' }, { key: 'totalEarnings', label: 'Kazanç' }, { key: 'totalReviews', label: 'Yorum' }].map(s => (
          <button key={s.key} onClick={() => handleSort(s.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              sortBy === s.key ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}>
            {s.label} {sortBy === s.key && <ArrowUpDown className="w-3 h-3" />}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
      ) : tellers.length === 0 ? (
        <p className="text-center text-gray-500 py-20">Falcı bulunamadı</p>
      ) : (
        <div className="space-y-2">
          {tellers.map((t, i) => {
            const lvl = levelInfo(t.tellerLevel)
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                        {t.avatar ? <Image src={t.avatar} alt={t.displayName} width={40} height={40} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-lg">{lvl.emoji}</div>}
                      </div>
                      {t.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-950" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">{t.displayName}</span>
                        <span className="text-xs" title={`${lvl.name} - ${t.levelPoints} puan`}>{lvl.emoji}</span>
                        {t.isVerified && <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                        {t.isBanned && <span className="text-[9px] bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded">Banlı</span>}
                        {t.isFrozen && <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">Dondurulmuş</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>@{t.username || '—'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400" />{t.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>{t.totalSessions} seans</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: lvl.color }}>{t.levelPoints} puan</p>
                    <p className="text-[10px] text-gray-500">{t.totalEarnings.toLocaleString()} J kazanç</p>
                  </div>
                </div>
                {/* Specialties */}
                {t.specialties.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.specialties.slice(0, 4).map((s, si) => (
                      <span key={si} className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {t.specialties.length > 4 && <span className="text-[9px] text-gray-500">+{t.specialties.length - 4}</span>}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
