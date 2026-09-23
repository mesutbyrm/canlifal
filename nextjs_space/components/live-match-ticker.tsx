'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Trophy, Filter, Volume2, VolumeX, X, ChevronDown,
  AlertCircle, Check
} from 'lucide-react'

interface FootballMatch {
  id: number
  homeTeam: { name: string; crest: string; shortName: string; id: number }
  awayTeam: { name: string; crest: string; shortName: string; id: number }
  score: {
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  status: string
  matchday: number | null
  utcDate: string
  competition: {
    id: number; name: string; code: string; emblem: string;
    flag?: string; localName?: string; country?: string
  }
}

interface MatchEvent {
  type: 'goal' | 'red_card' | 'yellow_card' | 'substitution' | 'halftime' | 'kickoff' | 'fulltime' | 'penalty'
  matchId: number
  text: string
  icon: string
  timestamp: number
}

const STATUS_MAP: Record<string, { label: string; color: string; live: boolean }> = {
  SCHEDULED: { label: 'Planlandı', color: 'text-gray-400', live: false },
  TIMED: { label: 'Saati Belli', color: 'text-cyan-400', live: false },
  IN_PLAY: { label: 'Devam Ediyor', color: 'text-red-400', live: true },
  PAUSED: { label: 'Durakladı', color: 'text-yellow-400', live: true },
  HALFTIME: { label: 'Devre Arası', color: 'text-orange-400', live: true },
  FINISHED: { label: 'Bitti', color: 'text-green-400', live: false },
  SUSPENDED: { label: 'Ertelendi', color: 'text-red-300', live: false },
  POSTPONED: { label: 'Ertelendi', color: 'text-gray-400', live: false },
  CANCELLED: { label: 'İptal', color: 'text-gray-500', live: false },
  AWARDED: { label: 'Hükmen', color: 'text-yellow-300', live: false },
  LIVE: { label: 'CANLI', color: 'text-red-400', live: true },
}

const EVENT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  goal: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-300' },
  red_card: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-300' },
  yellow_card: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-300' },
  penalty: { bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/50', text: 'text-fuchsia-300' },
  halftime: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-300' },
  kickoff: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300' },
  fulltime: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300' },
  substitution: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-300' },
}

const STORAGE_KEY_LEAGUES = 'cfc_football_leagues'
const STORAGE_KEY_SOUND = 'cfc_football_sound'
const STORAGE_KEY_ALERTS = 'cfc_football_alerts'

function getStoredLeagues(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const v = localStorage.getItem(STORAGE_KEY_LEAGUES)
    return v ? JSON.parse(v) : []
  } catch { return [] }
}
function setStoredLeagues(codes: string[]) {
  try { localStorage.setItem(STORAGE_KEY_LEAGUES, JSON.stringify(codes)) } catch {}
}
function getStoredSound(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(STORAGE_KEY_SOUND) === 'true' } catch { return false }
}
function setStoredSound(v: boolean) {
  try { localStorage.setItem(STORAGE_KEY_SOUND, v ? 'true' : 'false') } catch {}
}
function getStoredAlerts(): string[] {
  if (typeof window === 'undefined') return ['goal', 'red_card', 'fulltime']
  try {
    const v = localStorage.getItem(STORAGE_KEY_ALERTS)
    return v ? JSON.parse(v) : ['goal', 'red_card', 'fulltime']
  } catch { return ['goal', 'red_card', 'fulltime'] }
}
function setStoredAlerts(types: string[]) {
  try { localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(types)) } catch {}
}

export default function LiveMatchTicker() {
  const [matches, setMatches] = useState<FootballMatch[]>([])
  const [filteredLeagues, setFilteredLeagues] = useState<string[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [alertTypes, setAlertTypes] = useState<string[]>(['goal', 'red_card', 'fulltime'])
  const [showFilter, setShowFilter] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<MatchEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPausedRef = useRef(false)
  const prevMatchesRef = useRef<Map<number, FootballMatch>>(new Map())
  const goalAudioRef = useRef<HTMLAudioElement | null>(null)

  // Load preferences from localStorage
  useEffect(() => {
    setFilteredLeagues(getStoredLeagues())
    setSoundEnabled(getStoredSound())
    setAlertTypes(getStoredAlerts())
    // Create goal audio
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRlYGAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTIGAACAgICAgICBgIOAf3+Bf4OBfX2Af4WFfHh7f4uMfnN1f4uWiHVxeYuZk3xzeImXl4h6eIGOkpKEfHuBi46Rh4F8f4WIjIqEgX9/goSGhoWDgYGBgoODg4ODg4KCgoKCgoKCgoKCgoKCgoKCgoODg4OCgoKCgoGBgYGBgYGBgYGBgYGBgYGBgYKCgoKCgoODg4ODg4ODg4ODg4ODgoKCgoKCgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgQ==')
      audio.volume = 0.7
      goalAudioRef.current = audio
    } catch {}
  }, [])

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/football?action=matches')
      if (!res.ok) return
      const data = await res.json()
      const newMatches: FootballMatch[] = data.matches || []

      // Detect events by comparing with previous state
      const prevMap = prevMatchesRef.current
      const events: MatchEvent[] = []

      for (const m of newMatches) {
        const prev = prevMap.get(m.id)
        if (!prev) {
          // New match appeared as LIVE
          if (['IN_PLAY', 'LIVE'].includes(m.status) && prev === undefined && prevMap.size > 0) {
            events.push({
              type: 'kickoff',
              matchId: m.id,
              text: `⚽ Maç başladı! ${m.homeTeam.shortName || m.homeTeam.name} vs ${m.awayTeam.shortName || m.awayTeam.name}`,
              icon: '🏟️',
              timestamp: Date.now(),
            })
          }
          continue
        }
        const prevHome = prev.score.fullTime.home ?? 0
        const prevAway = prev.score.fullTime.away ?? 0
        const newHome = m.score.fullTime.home ?? 0
        const newAway = m.score.fullTime.away ?? 0

        // Goal detected
        if (newHome > prevHome || newAway > prevAway) {
          const scorer = newHome > prevHome ? (m.homeTeam.shortName || m.homeTeam.name) : (m.awayTeam.shortName || m.awayTeam.name)
          events.push({
            type: 'goal',
            matchId: m.id,
            text: `⚽ GOL! ${scorer} — ${m.homeTeam.shortName || m.homeTeam.name} ${newHome}-${newAway} ${m.awayTeam.shortName || m.awayTeam.name}`,
            icon: '⚽',
            timestamp: Date.now(),
          })
        }
        // Halftime detected
        if (m.status === 'HALFTIME' && prev.status !== 'HALFTIME') {
          events.push({
            type: 'halftime',
            matchId: m.id,
            text: `⏸️ Devre arası: ${m.homeTeam.shortName || m.homeTeam.name} ${newHome}-${newAway} ${m.awayTeam.shortName || m.awayTeam.name}`,
            icon: '⏸️',
            timestamp: Date.now(),
          })
        }
        // Fulltime detected
        if (m.status === 'FINISHED' && prev.status !== 'FINISHED') {
          events.push({
            type: 'fulltime',
            matchId: m.id,
            text: `🏁 Maç bitti: ${m.homeTeam.shortName || m.homeTeam.name} ${newHome}-${newAway} ${m.awayTeam.shortName || m.awayTeam.name}`,
            icon: '🏁',
            timestamp: Date.now(),
          })
        }
      }

      // Update prev map
      const newMap = new Map<number, FootballMatch>()
      for (const m of newMatches) newMap.set(m.id, m)
      prevMatchesRef.current = newMap

      setMatches(newMatches)
      setLoading(false)

      // Show events
      if (events.length > 0) {
        for (const event of events) {
          if (!alertTypes.includes(event.type)) continue
          setCurrentEvent(event)
          if (soundEnabled && event.type === 'goal' && goalAudioRef.current) {
            try { goalAudioRef.current.currentTime = 0; goalAudioRef.current.play() } catch {}
          }
          await new Promise(r => setTimeout(r, 3000))
          setCurrentEvent(null)
          await new Promise(r => setTimeout(r, 300))
        }
      }
    } catch {
      setLoading(false)
    }
  }, [soundEnabled, alertTypes])

  useEffect(() => {
    fetchMatches()
    const interval = setInterval(fetchMatches, 60000) // Poll every 60s
    return () => clearInterval(interval)
  }, [fetchMatches])

  // Auto-scroll
  useEffect(() => {
    const displayed = getDisplayedMatches()
    if (displayed.length < 2) return
    const el = scrollRef.current
    if (!el) return
    let animId: number
    let lastTime = 0
    const speed = 0.4
    const tick = (time: number) => {
      if (!scrollPausedRef.current && lastTime) {
        const delta = time - lastTime
        const px = speed * (delta / 16.67)
        el.scrollLeft += px
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0
        }
      }
      lastTime = time
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, filteredLeagues])

  const getDisplayedMatches = useCallback(() => {
    if (filteredLeagues.length === 0) return matches
    return matches.filter(m => filteredLeagues.includes(m.competition?.code))
  }, [matches, filteredLeagues])

  const displayedMatches = getDisplayedMatches()
  const liveCount = matches.filter(m => STATUS_MAP[m.status]?.live).length
  const totalCount = matches.length

  // Get unique competitions from matches
  const competitions = Array.from(
    new Map(matches.map(m => [m.competition?.code, m.competition])).values()
  ).filter(Boolean)

  const toggleLeague = (code: string) => {
    const newLeagues = filteredLeagues.includes(code)
      ? filteredLeagues.filter(c => c !== code)
      : [...filteredLeagues, code]
    setFilteredLeagues(newLeagues)
    setStoredLeagues(newLeagues)
  }

  const toggleSound = () => {
    const newVal = !soundEnabled
    setSoundEnabled(newVal)
    setStoredSound(newVal)
  }

  const toggleAlert = (type: string) => {
    const newAlerts = alertTypes.includes(type)
      ? alertTypes.filter(t => t !== type)
      : [...alertTypes, type]
    setAlertTypes(newAlerts)
    setStoredAlerts(newAlerts)
  }

  if (loading && matches.length === 0) return null
  if (matches.length === 0) return null

  const alertOptions = [
    { key: 'goal', label: '⚽ Gol', emoji: '⚽' },
    { key: 'red_card', label: '🟥 Kırmızı Kart', emoji: '🟥' },
    { key: 'yellow_card', label: '🟨 Sarı Kart', emoji: '🟨' },
    { key: 'halftime', label: '⏸️ Devre Arası', emoji: '⏸️' },
    { key: 'fulltime', label: '🏁 Maç Sonu', emoji: '🏁' },
    { key: 'kickoff', label: '🏟️ Maç Başlangıcı', emoji: '🏟️' },
    { key: 'penalty', label: '🎯 Penaltı', emoji: '🎯' },
    { key: 'substitution', label: '🔄 Oyuncu Değişikliği', emoji: '🔄' },
  ]

  return (
    <div className="mb-1">
      {/* Event Banner */}
      <AnimatePresence>
        {currentEvent && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`mb-2 p-3 rounded-xl border backdrop-blur-sm ${EVENT_STYLES[currentEvent.type]?.bg || 'bg-white/10'} ${EVENT_STYLES[currentEvent.type]?.border || 'border-white/20'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">{currentEvent.icon}</span>
              <p className={`text-sm font-bold flex-1 ${EVENT_STYLES[currentEvent.type]?.text || 'text-white'}`}>
                {currentEvent.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="canlidark-section-title flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-emerald-400" />
          Canlı Maçlar
          {liveCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-red-300 bg-red-500/20 animate-pulse">
              {liveCount} canlı
            </span>
          )}
          <span className="text-[9px] text-purple-400/50 ml-1">({totalCount} maç)</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              soundEnabled ? 'bg-green-500/20 border border-green-500/40' : 'bg-white/5 border border-purple-500/15'
            }`}
            title={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-green-400" /> : <VolumeX className="w-3.5 h-3.5 text-purple-400/50" />}
          </button>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              showFilter || filteredLeagues.length > 0 ? 'bg-fuchsia-500/20 border border-fuchsia-500/40' : 'bg-white/5 border border-purple-500/15'
            }`}
            title="Lig filtrele"
          >
            <Filter className="w-3.5 h-3.5 text-fuchsia-300" />
            {filteredLeagues.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-fuchsia-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                {filteredLeagues.length}
              </span>
            )}
          </button>
          <Link href="/futbol" className="canlidark-section-link text-xs">Tümü</Link>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="p-3 rounded-xl bg-white/5 border border-purple-500/15 backdrop-blur-sm">
              {/* League Filter */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Ligler</p>
                  {filteredLeagues.length > 0 && (
                    <button
                      onClick={() => { setFilteredLeagues([]); setStoredLeagues([]) }}
                      className="text-[9px] text-fuchsia-400 hover:text-fuchsia-300"
                    >
                      Tümünü Göster
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {competitions.map((comp: any) => {
                    const isSelected = filteredLeagues.length === 0 || filteredLeagues.includes(comp.code)
                    return (
                      <button
                        key={comp.code}
                        onClick={() => toggleLeague(comp.code)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-medium border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200'
                            : 'bg-white/5 border-white/10 text-gray-500'
                        }`}
                      >
                        <span>{comp.flag || '⚽'}</span>
                        <span>{comp.localName || comp.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Alert Settings */}
              <div className="mb-2">
                <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-2">Bildirim Tercihleri</p>
                <div className="flex flex-wrap gap-1.5">
                  {alertOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => toggleAlert(opt.key)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-medium border transition-all flex items-center gap-1 ${
                        alertTypes.includes(opt.key)
                          ? 'bg-green-500/20 border-green-500/40 text-green-300'
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-purple-500/10">
                <span className="text-[10px] text-purple-300">🔊 Gol sesi</span>
                <button
                  onClick={toggleSound}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    soundEnabled ? 'bg-green-500' : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                    animate={{ left: soundEnabled ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Ticker */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide pb-1"
        onMouseEnter={() => { scrollPausedRef.current = true }}
        onMouseLeave={() => { scrollPausedRef.current = false }}
        onTouchStart={() => { scrollPausedRef.current = true }}
        onTouchEnd={() => { scrollPausedRef.current = false }}
      >
        {displayedMatches.length === 0 ? (
          <div className="w-full text-center py-4">
            <p className="text-xs text-purple-400/50">Seçili liglerde maç bulunamadı</p>
          </div>
        ) : (
          displayedMatches.map((match) => {
            const statusInfo = STATUS_MAP[match.status] || { label: match.status, color: 'text-gray-400', live: false }
            const isLive = statusInfo.live
            const isFinished = match.status === 'FINISHED'
            const time = new Date(match.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            const homeScore = match.score.fullTime.home
            const awayScore = match.score.fullTime.away

            return (
              <Link key={match.id} href="/futbol" className="flex-shrink-0 w-[210px]">
                <div className={`p-3 rounded-xl border backdrop-blur-sm h-full transition-all ${
                  isLive
                    ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : isFinished
                      ? 'bg-emerald-500/5 border-emerald-500/15'
                      : 'bg-white/5 border-purple-500/15'
                }`}>
                  {/* Competition + Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] text-purple-400/60 truncate flex items-center gap-1 max-w-[60%]">
                      <span>{match.competition?.flag || '⚽'}</span>
                      {match.competition?.localName || match.competition?.name || 'Maç'}
                    </span>
                    {isLive ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-red-400 bg-red-500/20 animate-pulse flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {statusInfo.label}
                      </span>
                    ) : isFinished ? (
                      <span className="text-[8px] text-green-400/70">Bitti</span>
                    ) : (
                      <span className="text-[8px] text-cyan-400">{time}</span>
                    )}
                  </div>

                  {/* Teams + Score */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {match.homeTeam.crest && (
                        <div className="w-5 h-5 flex-shrink-0">
                          <Image src={match.homeTeam.crest} alt={match.homeTeam.shortName} width={20} height={20} className="object-contain" />
                        </div>
                      )}
                      <span className="text-[10px] text-white font-medium truncate">{match.homeTeam.shortName || match.homeTeam.name}</span>
                    </div>
                    <span className={`text-sm font-bold mx-1 tabular-nums ${
                      isLive ? 'text-red-400' : isFinished ? 'text-green-300' : 'text-white/60'
                    }`}>
                      {homeScore ?? '-'} : {awayScore ?? '-'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-[10px] text-white font-medium truncate text-right">{match.awayTeam.shortName || match.awayTeam.name}</span>
                      {match.awayTeam.crest && (
                        <div className="w-5 h-5 flex-shrink-0">
                          <Image src={match.awayTeam.crest} alt={match.awayTeam.shortName} width={20} height={20} className="object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
