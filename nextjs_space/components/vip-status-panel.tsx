'use client'

/**
 * BÖLÜM 20B — §18 VIP sezon/XP, §19 sıralama + üyelik geçmişi + otomatik yenileme + özel ID/ünvan.
 * Tamamen backend güdümlü: /api/me/vip-xp, /api/vip/leaderboard,
 * /api/me/membership-history, /api/me/vip-identity.
 * Jeton/CFC ekonomisiyle hiçbir ilişkisi yoktur.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, Trophy, History, IdCard, RefreshCw, Check } from 'lucide-react'

interface XpSummary {
  xp: number
  level: number
  next_level_at: number | null
  progress: number
  today_by_source?: Record<string, number>
  ledger: Array<{ id: string; source: string; amount: number; createdAt: string; note?: string | null }>
}

interface LeaderRow {
  rank: number
  userId: string | null
  name: string
  avatar?: string | null
  tier: string
  xp: number
  level: number
  anonymous?: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  login: 'Günlük giriş',
  voice_room: 'Sesli oda',
  event: 'Etkinlik',
  social: 'Sosyal',
  stream: 'Yayın',
  achievement: 'Başarım',
  admin: 'Yönetici',
}

export default function VipStatusPanel({ isDark = true }: { isDark?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [xp, setXp] = useState<XpSummary | null>(null)
  const [board, setBoard] = useState<LeaderRow[]>([])
  const [selfRow, setSelfRow] = useState<LeaderRow | null>(null)
  const [history, setHistory] = useState<any>(null)
  const [identity, setIdentity] = useState<any>(null)
  const [busy, setBusy] = useState<string>('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [customId, setCustomId] = useState('')
  const [title, setTitle] = useState('')

  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500'
  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'

  const loadAll = useCallback(async () => {
    const pick = (j: any) => j?.data ?? j
    try {
      const [xpRes, boardRes, histRes, idRes] = await Promise.all([
        fetch('/api/me/vip-xp').catch(() => null),
        fetch('/api/vip/leaderboard?limit=10').catch(() => null),
        fetch('/api/me/membership-history').catch(() => null),
        fetch('/api/me/vip-identity').catch(() => null),
      ])
      if (xpRes?.ok) setXp(pick(await xpRes.json()))
      if (boardRes?.ok) {
        const d = pick(await boardRes.json())
        setBoard(d?.rows || [])
        setSelfRow(d?.self || null)
      }
      if (histRes?.ok) setHistory(pick(await histRes.json()))
      if (idRes?.ok) {
        const d = pick(await idRes.json())
        setIdentity(d)
        setCustomId(d?.custom_user_id || '')
        setTitle(d?.title || '')
      }
    } catch (e) {
      console.error('[VipStatusPanel] veri alınamadı', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const claimDaily = async () => {
    setBusy('daily')
    setMsg(null)
    try {
      const res = await fetch('/api/me/vip-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daily_login' }),
      })
      const json = await res.json()
      const d = json?.data ?? json
      if (res.ok && d?.claimed) {
        setMsg({ type: 'ok', text: `Günlük giriş puanı alındı: +${d.amount} XP` })
      } else {
        setMsg({ type: 'err', text: 'Günlük giriş puanı bugün zaten alınmış.' })
      }
      await loadAll()
    } catch {
      setMsg({ type: 'err', text: 'İşlem tamamlanamadı.' })
    } finally {
      setBusy('')
    }
  }

  const toggleAutoRenew = async (value: boolean) => {
    setBusy('renew')
    setMsg(null)
    try {
      const res = await fetch('/api/me/membership-history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_renew: value }),
      })
      if (res.ok) {
        setMsg({ type: 'ok', text: value ? 'Otomatik yenileme açıldı.' : 'Otomatik yenileme kapatıldı.' })
        await loadAll()
      } else {
        const j = await res.json().catch(() => null)
        setMsg({ type: 'err', text: j?.error?.message || 'Aktif üyelik kaydı bulunamadı.' })
      }
    } catch {
      setMsg({ type: 'err', text: 'İşlem tamamlanamadı.' })
    } finally {
      setBusy('')
    }
  }

  const saveIdentity = async () => {
    setBusy('identity')
    setMsg(null)
    try {
      const body: Record<string, string> = {}
      if (identity?.can_set_custom_id) body.custom_user_id = customId.trim()
      if (identity?.can_set_title) body.title = title.trim()
      const res = await fetch('/api/me/vip-identity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => null)
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Kimlik bilgileriniz güncellendi.' })
        await loadAll()
      } else {
        setMsg({ type: 'err', text: j?.error?.message || 'Güncelleme yapılamadı.' })
      }
    } catch {
      setMsg({ type: 'err', text: 'İşlem tamamlanamadı.' })
    } finally {
      setBusy('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    )
  }

  const dailyClaimed = !!(xp?.today_by_source?.login && xp.today_by_source.login > 0)

  if (!xp && !board.length) return null

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm ${
            msg.type === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/15 text-red-300 border border-red-500/30'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* VIP sezon puanı */}
        {xp && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}>
                <Sparkles className="w-4 h-4 text-amber-400" /> VIP Sezon Puanı
              </h3>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300">
                Seviye {xp.level}
              </span>
            </div>
            <div className={`text-2xl font-extrabold ${textPrimary}`}>{xp.xp.toLocaleString('tr-TR')} XP</div>
            <div className={`mt-1 text-xs ${textMuted}`}>
              {xp.next_level_at
                ? `Sonraki seviye için ${(xp.next_level_at - xp.xp).toLocaleString('tr-TR')} XP`
                : 'En yüksek seviyedesiniz'}
            </div>
            <div className={`mt-3 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-pink-500"
                style={{ width: `${Math.round((xp.progress || 0) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={claimDaily}
              disabled={busy === 'daily' || dailyClaimed}
              className="mt-4 w-full px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-pink-500 disabled:opacity-50"
            >
              {dailyClaimed ? 'Günlük giriş puanı alındı' : busy === 'daily' ? 'İşleniyor…' : 'Günlük giriş puanını al'}
            </button>
            {!!xp.ledger?.length && (
              <ul className={`mt-4 space-y-1.5 text-xs ${textMuted}`}>
                {xp.ledger.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>{SOURCE_LABELS[r.source] || r.source}</span>
                    <span className="text-emerald-400 font-semibold">+{r.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* VIP sıralaması */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h3 className={`font-bold flex items-center gap-2 mb-3 ${textPrimary}`}>
            <Trophy className="w-4 h-4 text-amber-400" /> VIP Sıralaması
          </h3>
          {board.length ? (
            <ol className="space-y-2">
              {board.map((r) => (
                <li key={`${r.rank}-${r.userId || 'anon'}`} className="flex items-center gap-3 text-sm">
                  <span className={`w-6 text-center font-bold ${r.rank <= 3 ? 'text-amber-400' : textMuted}`}>{r.rank}</span>
                  <span className={`flex-1 truncate ${textPrimary}`}>{r.name}</span>
                  <span className={`text-xs ${textMuted}`}>Sv.{r.level}</span>
                  <span className="text-xs font-semibold text-cyan-300">{r.xp.toLocaleString('tr-TR')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={`text-sm ${textMuted}`}>Henüz sıralama oluşmadı.</p>
          )}
          {selfRow && (
            <div className={`mt-3 pt-3 border-t text-sm flex items-center gap-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <span className="w-6 text-center font-bold text-pink-400">{selfRow.rank}</span>
              <span className={`flex-1 truncate ${textPrimary}`}>Sizin sıranız</span>
              <span className="text-xs font-semibold text-cyan-300">{selfRow.xp.toLocaleString('tr-TR')}</span>
            </div>
          )}
        </div>

        {/* Üyelik geçmişi + otomatik yenileme */}
        {history && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <h3 className={`font-bold flex items-center gap-2 mb-3 ${textPrimary}`}>
              <History className="w-4 h-4 text-amber-400" /> Üyelik Geçmişi
            </h3>
            <div className={`text-sm ${textPrimary}`}>
              Mevcut: <span className="font-semibold">{history.current?.tier || 'basic'}</span>
              {typeof history.current?.days_remaining === 'number' && (
                <span className={`ml-2 text-xs ${textMuted}`}>{history.current.days_remaining} gün kaldı</span>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber-500"
                checked={!!history.current?.auto_renew}
                disabled={busy === 'renew'}
                onChange={(e) => toggleAutoRenew(e.target.checked)}
              />
              <span className={textPrimary}>
                <RefreshCw className="inline w-3.5 h-3.5 mr-1 text-amber-400" />
                Otomatik yenileme
              </span>
            </label>
            {!!history.grants?.length && (
              <ul className={`mt-4 space-y-1.5 text-xs ${textMuted}`}>
                {history.grants.slice(0, 5).map((g: any) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span>
                      {g.tierKey} • {g.source === 'gift' ? 'hediye' : g.change === 'renewal' ? 'yenileme' : 'değişim'}
                    </span>
                    <span>{g.startsAt ? new Date(g.startsAt).toLocaleDateString('tr-TR') : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Özel ID + ünvan */}
        {identity && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <h3 className={`font-bold flex items-center gap-2 mb-3 ${textPrimary}`}>
              <IdCard className="w-4 h-4 text-amber-400" /> Özel Kimlik
            </h3>
            {identity.can_set_custom_id || identity.can_set_title ? (
              <div className="space-y-3">
                {identity.can_set_custom_id && (
                  <div>
                    <label className={`block text-xs mb-1 ${textMuted}`}>Özel kullanıcı ID (4-20 karakter)</label>
                    <input
                      value={customId}
                      onChange={(e) => setCustomId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm border ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                      placeholder="ornek_id"
                    />
                  </div>
                )}
                {identity.can_set_title && (
                  <div>
                    <label className={`block text-xs mb-1 ${textMuted}`}>Ünvan (2-24 karakter)</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm border ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                      placeholder="Kahin"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={saveIdentity}
                  disabled={busy === 'identity'}
                  className="w-full px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 disabled:opacity-50"
                >
                  {busy === 'identity' ? 'Kaydediliyor…' : (
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" /> Kaydet
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <p className={`text-sm ${textMuted}`}>
                Özel kullanıcı ID ve ünvan hakkı Diamond ve üstü üyeliklerde açılır.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
