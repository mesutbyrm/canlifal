'use client'

/**
 * BÖLÜM 20 — §27/§28 Üyelik karşılaştırma ekranı.
 * Tamamen backend güdümlü: /api/memberships/comparison + /api/me/membership.
 * Admin panelindeki her değişiklik burada otomatik yansır (hardcode YOK).
 */

import { Fragment, useEffect, useState } from 'react'
import { Loader2, Lock, Infinity as InfinityIcon, Check, Crown } from 'lucide-react'

interface TierDef {
  key: string
  name: string
  nameEn?: string | null
  rank: number
  color?: string | null
  gradient?: string | null
  icon?: string | null
  description?: string | null
  discoveryWeight?: number
}

interface Cell {
  status: 'available' | 'unlimited' | 'limited' | 'locked'
  display: string
  enabled: boolean
  limit?: number | null
}

interface FeatureRow {
  key: string
  name: string
  nameEn?: string | null
  category: string
  description?: string | null
  unit?: string | null
  cells: Record<string, Cell>
}

const CATEGORY_LABELS: Record<string, string> = {
  profile: 'Profil & Görünüm',
  entrance: 'Giriş Efektleri',
  message: 'Mesaj & Sohbet',
  privacy: 'Gizlilik',
  discovery: 'Keşfet & Görünürlük',
  room: 'Odalar',
  event: 'Etkinlikler',
  support: 'Destek',
  progression: 'Seviye & Sezon',
}

export default function MembershipComparison({
  isDark = true,
  onSelectTier,
}: {
  isDark?: boolean
  onSelectTier?: (tierKey: string) => void
}) {
  const [tiers, setTiers] = useState<TierDef[]>([])
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTier, setActiveTier] = useState<string>('')
  const [mine, setMine] = useState<any>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/memberships/comparison')
        const json = await res.json()
        const data = json?.data || json
        if (!alive) return
        setTiers(data.tiers || [])
        setFeatures(data.features || [])
        setCategories(data.categories || [])
      } catch (e) {
        console.error('[MembershipComparison] karşılaştırma alınamadı', e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    ;(async () => {
      try {
        const res = await fetch('/api/me/membership')
        if (!res.ok) return
        const json = await res.json()
        const data = json?.data || json
        if (!alive) return
        setMine(data)
        if (data?.membership_level) setActiveTier(data.membership_level)
      } catch {
        /* oturum yoksa sessizce geç */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!activeTier && tiers.length) setActiveTier(tiers[0].key)
  }, [tiers, activeTier])

  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500'
  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
  const rowAlt = isDark ? 'bg-white/[0.02]' : 'bg-gray-50'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  if (!tiers.length) return null

  const active = tiers.find((t) => t.key === activeTier) || tiers[0]
  const myTier = mine?.membership_level as string | undefined
  const myRank = tiers.find((t) => t.key === myTier)?.rank ?? -1

  const renderCell = (cell?: Cell) => {
    if (!cell || cell.status === 'locked') {
      return <Lock className="w-4 h-4 mx-auto text-gray-500" aria-label="Kilitli" />
    }
    if (cell.status === 'unlimited') {
      return <InfinityIcon className="w-4 h-4 mx-auto text-emerald-400" aria-label="Sınırsız" />
    }
    if (cell.status === 'limited') {
      return <span className="text-sm font-semibold text-cyan-300">{cell.display}</span>
    }
    return <Check className="w-4 h-4 mx-auto text-emerald-400" aria-label="Dahil" />
  }

  return (
    <div className="space-y-6">
      {/* Mevcut üyelik durumu */}
      {mine && (
        <div className={`rounded-2xl border p-4 ${cardBg}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Crown className="w-5 h-5 text-amber-400" />
            <span className={`font-semibold ${textPrimary}`}>
              Mevcut üyeliğiniz: {tiers.find((t) => t.key === myTier)?.name || 'Basic'}
            </span>
            {mine.expires_at ? (
              <span className={`text-sm ${textMuted}`}>
                Bitiş: {new Date(mine.expires_at).toLocaleDateString('tr-TR')}
                {typeof mine.days_remaining === 'number' ? ` • ${mine.days_remaining} gün kaldı` : ''}
              </span>
            ) : (
              <span className={`text-sm ${textMuted}`}>Süresiz</span>
            )}
          </div>
        </div>
      )}

      {/* Kademe sekmeleri */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tiers.map((t) => {
          const selected = t.key === activeTier
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTier(t.key)}
              className={`shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                selected
                  ? 'text-white border-transparent shadow-lg'
                  : isDark
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              style={selected ? { background: t.gradient || t.color || '#6366f1' } : undefined}
            >
              <span className="mr-1">{t.icon}</span>
              {t.name}
              {t.key === myTier && <span className="ml-2 text-[10px] uppercase opacity-80">mevcut</span>}
            </button>
          )
        })}
      </div>

      {/* Seçili kademe özeti */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className={`text-xl font-bold ${textPrimary}`}>
              {active.icon} {active.name}
            </h3>
            {active.description && <p className={`mt-1 text-sm max-w-2xl ${textMuted}`}>{active.description}</p>}
          </div>
          {onSelectTier && active.rank > myRank && (
            <button
              type="button"
              onClick={() => onSelectTier(active.key)}
              className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg"
              style={{ background: active.gradient || active.color || '#6366f1' }}
            >
              {active.name}&apos;e yükselt
            </button>
          )}
        </div>
      </div>

      {/* Karşılaştırma tablosu */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className={isDark ? 'bg-white/5' : 'bg-gray-100'}>
                <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Özellik</th>
                {tiers.map((t) => (
                  <th key={t.key} className={`px-3 py-3 text-center font-semibold ${textPrimary}`}>
                    <span className="block text-base">{t.icon}</span>
                    <span className="block text-xs">{t.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <Fragment key={`cat-${cat}`}>
                  <tr>
                    <td
                      colSpan={tiers.length + 1}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                        isDark ? 'bg-white/[0.06] text-amber-300' : 'bg-gray-100 text-amber-700'
                      }`}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </td>
                  </tr>
                  {features
                    .filter((f) => f.category === cat)
                    .map((f, i) => (
                      <tr key={f.key} className={i % 2 === 1 ? rowAlt : ''}>
                        <td className={`px-4 py-2.5 ${textPrimary}`}>
                          <span className="font-medium">{f.name}</span>
                          {f.unit && <span className={`ml-1 text-xs ${textMuted}`}>({f.unit})</span>}
                        </td>
                        {tiers.map((t) => (
                          <td key={t.key} className="px-3 py-2.5 text-center">
                            {renderCell(f.cells?.[t.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`flex flex-wrap gap-4 text-xs ${textMuted}`}>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> Dahil
        </span>
        <span className="flex items-center gap-1">
          <InfinityIcon className="w-3.5 h-3.5 text-emerald-400" /> Sınırsız
        </span>
        <span className="flex items-center gap-1">
          <span className="text-cyan-300 font-semibold">12</span> Sayı = limit
        </span>
        <span className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> Bu kademede yok
        </span>
      </div>
    </div>
  )
}
