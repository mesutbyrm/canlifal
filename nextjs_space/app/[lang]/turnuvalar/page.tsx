'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Trophy, Crown, Star, Medal, Coins, ArrowLeft, Calendar, Award,
  Flame, Target, Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TournamentEntry {
  userId: string
  score: number
  rank: number
  user: { id: string; name: string; username: string | null; image: string | null }
}

interface Tournament {
  id: string; type: string; title: string; description: string;
  weekStart: string; weekEnd: string; status: string;
  rewards: { rank: number; prize: number }[];
  leaderboard: TournamentEntry[];
  myEntry: { userId: string; score: number; rank: number | null } | null;
}

export default function TurnuvalarPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => { setTournaments(d.tournaments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    jeton_spend: { icon: <Coins className="w-5 h-5" />, color: 'text-yellow-400' },
    fortune_count: { icon: <Sparkles className="w-5 h-5" />, color: 'text-purple-400' },
    session_count: { icon: <Target className="w-5 h-5" />, color: 'text-blue-400' },
    gift_sent: { icon: <Award className="w-5 h-5" />, color: 'text-pink-400' },
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-400">{rank}</span>
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

  // Hafta sonu ne kadar kaldı
  const getTimeLeft = (weekEnd: string) => {
    const end = new Date(weekEnd)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return 'Bitti'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return `${days}g ${hours}s kaldı`
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-400" /> Haftalık Turnuvalar</h1>
          <p className="text-xs text-gray-400">Her hafta en iyiler ödüllendirilir!</p>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Henüz aktif turnuva yok</p>
        </div>
      ) : (
        <>
          {/* Tab selector */}
          <div className="flex gap-2 mb-6">
            {tournaments.map((t, i) => {
              const ti = typeIcons[t.type] || typeIcons.jeton_spend
              return (
                <button key={t.id} onClick={() => setActiveTab(i)}
                  className={`flex-1 p-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    activeTab === i ? 'bg-purple-600/50 text-white border border-purple-400/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
                  <span className={ti.color}>{ti.icon}</span>
                  {t.title}
                </button>
              )
            })}
          </div>

          {/* Active tournament */}
          {tournaments[activeTab] && (() => {
            const t = tournaments[activeTab]
            const ti = typeIcons[t.type] || typeIcons.jeton_spend
            return (
              <div className="space-y-4">
                {/* Header card */}
                <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 border border-purple-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={ti.color}>{ti.icon}</span>
                      <h2 className="text-lg font-bold">{t.title}</h2>
                    </div>
                    <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {getTimeLeft(t.weekEnd)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{t.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" /> {formatDate(t.weekStart)} - {formatDate(t.weekEnd)}
                  </div>
                  {/* Rewards */}
                  {t.rewards.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {t.rewards.map(r => (
                        <div key={r.rank} className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                          <span className="text-xs">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span>
                          <p className="text-xs font-bold text-yellow-400">{r.prize} J</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* My position */}
                {t.myEntry && (
                  <div className="bg-white/5 border border-purple-500/20 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Senin Sıralaman</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-purple-400">#{t.myEntry.rank || '—'}</span>
                        <span className="text-sm text-white">{session?.user?.name}</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-400">{t.myEntry.score.toLocaleString()} {t.type === 'jeton_spend' ? 'jeton' : 'fal'}</span>
                    </div>
                  </div>
                )}

                {/* Leaderboard */}
                <div>
                  <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" /> Sıralama
                  </h3>
                  {t.leaderboard.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">Henüz katılımcı yok</p>
                  ) : (
                    <div className="space-y-2">
                      {t.leaderboard.map((e, i) => (
                        <motion.div key={e.userId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                            e.userId === session?.user?.id ? 'bg-purple-600/20 border border-purple-400/30' : 'bg-white/5 border border-white/10'}`}>
                          <div className="flex items-center gap-3">
                            {rankIcon(e.rank)}
                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                              {e.user.image ? <Image src={e.user.image} alt="" width={32} height={32} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-xs">👤</div>}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{e.user.name}</p>
                              {e.user.username && <p className="text-[10px] text-gray-500">@{e.user.username}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-yellow-400">{e.score.toLocaleString()}</p>
                            <p className="text-[9px] text-gray-500">{t.type === 'jeton_spend' ? 'jeton' : 'fal'}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
