'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Trophy, Calendar, Target, Users, Loader2,
  ChevronRight, Star, Clock, Flame, Shield,
  ArrowUpDown, Medal
} from 'lucide-react'

interface Match {
  id: number
  competition: { name: string; emblem: string }
  homeTeam: { name: string; crest: string; shortName: string }
  awayTeam: { name: string; crest: string; shortName: string }
  score: { fullTime: { home: number | null; away: number | null }; halfTime: { home: number | null; away: number | null } }
  status: string
  utcDate: string
  matchday: number
}

interface Standing {
  position: number
  team: { name: string; crest: string; shortName: string; id: number }
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

interface Scorer {
  player: { name: string; nationality: string; section: string }
  team: { name: string; crest: string; shortName: string }
  goals: number
  assists: number | null
  playedMatches: number
}

const COMPETITIONS = [
  { code: 'BSA', name: 'Süper Lig', flag: '🇹🇷' },
  { code: 'PL', name: 'Premier Lig', flag: '🇬🇧' },
  { code: 'PD', name: 'La Liga', flag: '🇪🇸' },
  { code: 'SA', name: 'Serie A', flag: '🇮🇹' },
  { code: 'BL1', name: 'Bundesliga', flag: '🇩🇪' },
  { code: 'FL1', name: 'Ligue 1', flag: '🇫🇷' },
  { code: 'CL', name: 'Şampiyonlar Ligi', flag: '⭐' },
]

type TabType = 'matches' | 'standings' | 'scorers'

function formatMatchTime(utcDate: string): string {
  const d = new Date(utcDate)
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' })
}

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'LIVE': case 'IN_PLAY': case 'PAUSED': case 'HALFTIME':
      return { label: 'CANLI', color: 'text-red-400 bg-red-500/20' }
    case 'FINISHED': return { label: 'Bitti', color: 'text-green-400 bg-green-500/10' }
    case 'TIMED': case 'SCHEDULED': return { label: 'Planlandı', color: 'text-blue-400 bg-blue-500/10' }
    case 'POSTPONED': return { label: 'Ertelendi', color: 'text-yellow-400 bg-yellow-500/10' }
    case 'CANCELLED': return { label: 'İptal', color: 'text-gray-400 bg-gray-500/10' }
    default: return { label: status, color: 'text-purple-400 bg-purple-500/10' }
  }
}

export default function FutbolPage() {
  const [tab, setTab] = useState<TabType>('matches')
  const [competition, setCompetition] = useState('BSA')
  const [matches, setMatches] = useState<Match[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [loading, setLoading] = useState(true)
  const [competitionInfo, setCompetitionInfo] = useState<any>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/football?action=competition-matches&competition=${competition}`)
      const data = await res.json()
      setMatches(data.matches || [])
      setCompetitionInfo(data.competition)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [competition])

  const fetchStandings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/football?action=standings&competition=${competition}`)
      const data = await res.json()
      const total = data.standings?.find((s: any) => s.type === 'TOTAL')
      setStandings(total?.table || [])
      setCompetitionInfo(data.competition)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [competition])

  const fetchScorers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/football?action=scorers&competition=${competition}`)
      const data = await res.json()
      setScorers(data.scorers || [])
      setCompetitionInfo(data.competition)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [competition])

  useEffect(() => {
    if (tab === 'matches') fetchMatches()
    else if (tab === 'standings') fetchStandings()
    else if (tab === 'scorers') fetchScorers()
  }, [tab, competition, fetchMatches, fetchStandings, fetchScorers])

  // Sort matches: live first, then upcoming, then finished
  const sortedMatches = [...matches].sort((a, b) => {
    const liveStatuses = ['LIVE', 'IN_PLAY', 'PAUSED', 'HALFTIME']
    const aLive = liveStatuses.includes(a.status) ? 0 : a.status === 'TIMED' || a.status === 'SCHEDULED' ? 1 : 2
    const bLive = liveStatuses.includes(b.status) ? 0 : b.status === 'TIMED' || b.status === 'SCHEDULED' ? 1 : 2
    if (aLive !== bLive) return aLive - bLive
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/30 via-emerald-900/20 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Futbol</h1>
                <p className="text-emerald-400/60 text-sm">Canlı skorlar, puan durumu ve istatistikler</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Competition Selector */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {COMPETITIONS.map(comp => (
            <button
              key={comp.code}
              onClick={() => setCompetition(comp.code)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                competition === comp.code
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-white/5 text-purple-300/60 hover:bg-white/10 border border-purple-500/10'
              }`}
            >
              <span>{comp.flag}</span>
              <span>{comp.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="flex border-b border-purple-500/10">
          {[
            { key: 'matches' as const, label: 'Maçlar', icon: Calendar },
            { key: 'standings' as const, label: 'Puan Durumu', icon: ArrowUpDown },
            { key: 'scorers' as const, label: 'Gol Krallığı', icon: Target },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                tab === t.key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-purple-400/50 hover:text-purple-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : (
          <>
            {/* Matches Tab */}
            {tab === 'matches' && (
              <div className="space-y-3">
                {sortedMatches.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-14 h-14 text-purple-500/20 mx-auto mb-3" />
                    <p className="text-purple-300/40">Bu lig için maç bulunamadı</p>
                  </div>
                ) : (
                  sortedMatches.slice(0, 30).map((match, i) => {
                    const status = getStatusLabel(match.status)
                    const isLive = ['LIVE', 'IN_PLAY', 'PAUSED', 'HALFTIME'].includes(match.status)
                    const isFinished = match.status === 'FINISHED'
                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`p-4 rounded-2xl border backdrop-blur-sm ${
                          isLive
                            ? 'bg-red-500/5 border-red-500/20 ring-1 ring-red-500/10'
                            : 'bg-white/5 border-purple-500/10'
                        }`}
                      >
                        {/* Date & Status */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-purple-400/40">
                            {formatMatchDate(match.utcDate)} • Hafta {match.matchday}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color} ${
                            isLive ? 'animate-pulse' : ''
                          }`}>
                            {isLive && '● '}{status.label}
                          </span>
                        </div>

                        {/* Teams & Score */}
                        <div className="flex items-center justify-between">
                          {/* Home */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white/10 p-1.5 flex-shrink-0">
                              {match.homeTeam.crest && (
                                <Image src={match.homeTeam.crest} alt={match.homeTeam.name} width={28} height={28} className="object-contain w-full h-full" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-white truncate">{match.homeTeam.shortName || match.homeTeam.name}</span>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-2 px-4 flex-shrink-0">
                            {isFinished || isLive ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${isLive ? 'text-red-400' : 'text-white'}`}>
                                  {match.score.fullTime.home ?? '-'}
                                </span>
                                <span className="text-purple-400/40 text-lg">:</span>
                                <span className={`text-2xl font-bold ${isLive ? 'text-red-400' : 'text-white'}`}>
                                  {match.score.fullTime.away ?? '-'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-emerald-400">
                                {formatMatchTime(match.utcDate)}
                              </span>
                            )}
                          </div>

                          {/* Away */}
                          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                            <span className="text-sm font-medium text-white truncate text-right">{match.awayTeam.shortName || match.awayTeam.name}</span>
                            <div className="w-10 h-10 rounded-lg bg-white/10 p-1.5 flex-shrink-0">
                              {match.awayTeam.crest && (
                                <Image src={match.awayTeam.crest} alt={match.awayTeam.name} width={28} height={28} className="object-contain w-full h-full" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Half-time for live/finished */}
                        {(isLive || isFinished) && match.score.halfTime.home !== null && (
                          <div className="text-center mt-2">
                            <span className="text-[10px] text-purple-400/30">
                              İY: {match.score.halfTime.home} - {match.score.halfTime.away}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })
                )}
              </div>
            )}

            {/* Standings Tab */}
            {tab === 'standings' && (
              <div>
                {standings.length === 0 ? (
                  <div className="text-center py-16">
                    <Trophy className="w-14 h-14 text-purple-500/20 mx-auto mb-3" />
                    <p className="text-purple-300/40">Puan durumu bulunamadı</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden border border-purple-500/10 bg-white/5 backdrop-blur-sm">
                    {/* Header */}
                    <div className="grid grid-cols-[40px_1fr_40px_40px_40px_40px_50px_50px_50px] gap-1 px-4 py-3 bg-white/5 text-[10px] text-purple-400/50 font-medium">
                      <span>#</span>
                      <span>Takım</span>
                      <span className="text-center">O</span>
                      <span className="text-center">G</span>
                      <span className="text-center">B</span>
                      <span className="text-center">M</span>
                      <span className="text-center">Av</span>
                      <span className="text-center">AG</span>
                      <span className="text-center font-bold">P</span>
                    </div>
                    {/* Rows */}
                    {standings.map((s, i) => (
                      <motion.div
                        key={s.team.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`grid grid-cols-[40px_1fr_40px_40px_40px_40px_50px_50px_50px] gap-1 px-4 py-2.5 items-center border-t border-purple-500/5 hover:bg-white/5 transition-colors ${
                          i < 4 ? 'border-l-2 border-l-emerald-500/50' :
                          i >= standings.length - 3 ? 'border-l-2 border-l-red-500/50' : ''
                        }`}
                      >
                        <span className={`text-xs font-bold ${
                          i === 0 ? 'text-yellow-400' : i < 4 ? 'text-emerald-400' : i >= standings.length - 3 ? 'text-red-400' : 'text-purple-400/50'
                        }`}>
                          {s.position}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded flex-shrink-0 bg-white/10 p-0.5">
                            {s.team.crest && (
                              <Image src={s.team.crest} alt={s.team.name} width={20} height={20} className="object-contain w-full h-full" />
                            )}
                          </div>
                          <span className="text-xs text-white font-medium truncate">{s.team.shortName || s.team.name}</span>
                        </div>
                        <span className="text-xs text-purple-300/60 text-center">{s.playedGames}</span>
                        <span className="text-xs text-green-400/80 text-center">{s.won}</span>
                        <span className="text-xs text-yellow-400/60 text-center">{s.draw}</span>
                        <span className="text-xs text-red-400/60 text-center">{s.lost}</span>
                        <span className="text-xs text-purple-300/40 text-center">{s.goalsFor}-{s.goalsAgainst}</span>
                        <span className={`text-xs text-center ${s.goalDifference > 0 ? 'text-green-400/60' : s.goalDifference < 0 ? 'text-red-400/60' : 'text-purple-400/40'}`}>
                          {s.goalDifference > 0 ? '+' : ''}{s.goalDifference}
                        </span>
                        <span className="text-xs font-bold text-white text-center">{s.points}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scorers Tab */}
            {tab === 'scorers' && (
              <div className="space-y-2">
                {scorers.length === 0 ? (
                  <div className="text-center py-16">
                    <Target className="w-14 h-14 text-purple-500/20 mx-auto mb-3" />
                    <p className="text-purple-300/40">Gol krallığı verileri bulunamadı</p>
                  </div>
                ) : (
                  scorers.map((scorer, i) => (
                    <motion.div
                      key={`${scorer.player.name}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-purple-500/10 hover:bg-white/8 transition-colors"
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        i === 1 ? 'bg-gray-400/20 text-gray-300' :
                        i === 2 ? 'bg-amber-600/20 text-amber-500' :
                        'bg-white/5 text-purple-400/50'
                      }`}>
                        {i < 3 ? <Medal className="w-4 h-4" /> : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{scorer.player.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-4 h-4 rounded flex-shrink-0">
                            {scorer.team.crest && (
                              <Image src={scorer.team.crest} alt={scorer.team.name} width={16} height={16} className="object-contain" />
                            )}
                          </div>
                          <span className="text-xs text-purple-400/50 truncate">{scorer.team.shortName || scorer.team.name}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-emerald-400">{scorer.goals}</div>
                        <div className="text-[10px] text-purple-400/40">{scorer.playedMatches} maç</div>
                      </div>
                      {scorer.assists != null && (
                        <div className="text-right flex-shrink-0 pl-2 border-l border-purple-500/10">
                          <div className="text-sm font-medium text-blue-400">{scorer.assists}</div>
                          <div className="text-[10px] text-purple-400/40">asist</div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
